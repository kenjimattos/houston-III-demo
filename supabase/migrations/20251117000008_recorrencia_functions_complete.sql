-- =====================================================================================
-- Migration: 20251117000008_recorrencia_functions_complete.sql
-- Description: Complete recorrencia functions with all corrections applied
-- Consolidates:
--   - 20251110150110_fix_editar_vagas_recorrencia_functions.sql
--   - 20251110152010_fix_recorrencia_functions_column_names.sql
--   - 20251110152110_fix_gerar_editar_vagas_recorrentes.sql
--   - 20251110152210_fix_deletar_vagas_recorrencia.sql
--   - 20251110152310_fix_function_old_column_names.sql (FINAL VERSION)
-- =====================================================================================

-- Migration: Corrigir nomes de colunas antigos em funções
-- 
-- Esta migration corrige as referências a nomes de colunas antigos nas funções do sistema
--
-- Funções corrigidas:
-- check_candidatura_access
-- atualizar_candidaturas_vaga_cancelada  
-- pode_ver_candidatura_colega
-- pode_ver_candidatura_colega_debug
-- validate_checkin_timing
-- excluir_vagas_lote
-- validate_checkout_timing
-- aprovacao_automatica_favoritos

CREATE OR REPLACE FUNCTION public.check_candidatura_access(candidatura_id uuid, vaga_id uuid, medico_id uuid DEFAULT NULL::uuid, medico_precadastro_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    current_user_id UUID := auth.uid();
    user_role TEXT;
    user_grupo_id INTEGER := get_current_user_grupo_id();
    is_medico BOOLEAN := FALSE;
    is_medico_precadastro BOOLEAN := FALSE;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Busca informações do usuário
    SELECT up.role,
           EXISTS(SELECT 1 FROM medicos m WHERE m.id = up.id),
           EXISTS(SELECT 1 FROM medicos_precadastro mp WHERE mp.id = up.id)
    INTO user_role, is_medico, is_medico_precadastro
    FROM user_profile up 
    WHERE up.id = current_user_id;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica acesso por grupo
    IF user_grupo_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM vagas v
            WHERE v.id = vaga_id  -- Parâmetro específico
            AND v.grupo_id = user_grupo_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Verifica acesso para médicos 'free'
    IF user_role = 'free' AND (is_medico OR is_medico_precadastro) THEN
        -- Próprias candidaturas
        IF (is_medico AND medico_id = current_user_id) OR
           (is_medico_precadastro AND medico_precadastro_id = current_user_id) THEN
            RETURN TRUE;
        END IF;
        
        -- Pode ver candidatura de colega
        IF pode_ver_candidatura_colega(candidatura_id) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$function$;


CREATE OR REPLACE FUNCTION public.atualizar_candidaturas_vaga_cancelada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verificar se o status da vaga foi alterado para 'cancelada'
    IF NEW.status = 'cancelada' AND (OLD.status IS NULL OR OLD.status != 'cancelada') THEN
        -- Atualizar todas as candidaturas pendentes associadas a esta vaga para 'REPROVADO'
        UPDATE public.candidaturas
        SET 
            status = 'REPROVADO',
            updated_at = now(),
            updated_by = 'Sistema: Vaga Cancelada'
        WHERE 
            vaga_id = NEW.id
            AND status = 'PENDENTE';
    END IF;
    
    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.pode_ver_candidatura_colega(candidatura_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_user_id UUID;
    candidatura_hospital UUID;
    candidatura_setor UUID;
    current_user_role TEXT;
BEGIN
    current_user_id := auth.uid();

    -- Se não há usuário autenticado, retorna false
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o usuário tem role 'free'
    SELECT role INTO current_user_role
    FROM public.user_profile
    WHERE id = current_user_id;

    IF current_user_role != 'free' THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o usuário está na tabela médicos OU médicos_precadastro
    IF NOT EXISTS (
        SELECT 1 FROM public.medicos WHERE id = current_user_id
        UNION
        SELECT 1 FROM public.medicos_precadastro WHERE id = current_user_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- Buscar hospital e setor da candidatura que está sendo verificada
    SELECT v.hospital_id, v.setor_id  -- Corrigido: vagas_hospital → hospital_id, vagas_setor → setor_id
    INTO candidatura_hospital, candidatura_setor
    FROM public.candidaturas c
    JOIN public.vagas v ON c.vaga_id = v.id  -- Corrigido: vagas_id → vaga_id, vagas_id → id
    WHERE c.id = candidatura_id  -- Corrigido: candidaturas_id → id
      AND c.status = 'APROVADO';  -- Corrigido: candidatura_status → status

    -- Se não encontrou dados da candidatura, retorna false
    IF candidatura_hospital IS NULL OR candidatura_setor IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o médico atual tem candidatura aprovada no mesmo hospital/setor
    -- Buscar tanto em medico_id quanto em medico_precadastro_id para o usuário atual
    RETURN EXISTS (
        SELECT 1
        FROM public.candidaturas c_user
        JOIN public.vagas v_user ON c_user.vaga_id = v_user.id  -- Corrigido: vagas_id → vaga_id, vagas_id → id
        WHERE (
            c_user.medico_id = current_user_id OR
            c_user.medico_precadastro_id = current_user_id
        )
          AND c_user.status = 'APROVADO'  -- Corrigido: candidatura_status → status
          AND v_user.hospital_id = candidatura_hospital  -- Corrigido: vagas_hospital → hospital_id
          AND v_user.setor_id = candidatura_setor  -- Corrigido: vagas_setor → setor_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pode_ver_candidatura_colega_debug(candidatura_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      current_user_id UUID;
      candidatura_hospital UUID;
      candidatura_setor UUID;
      current_user_role TEXT;
      user_in_medicos BOOLEAN;
      user_in_precadastro BOOLEAN;
      found_candidatura BOOLEAN;
      found_user_candidatura BOOLEAN;
      debug_info TEXT;
  BEGIN
      current_user_id := auth.uid();
      debug_info := 'User ID: ' || COALESCE(current_user_id::text, 'NULL');

      -- Verificar role
      SELECT role INTO current_user_role
      FROM public.user_profile  -- Adicionado schema
      WHERE id = current_user_id;

      debug_info := debug_info || ' | Role: ' || COALESCE(current_user_role, 'NULL');

      -- Verificar se está nas tabelas
      SELECT EXISTS(SELECT 1 FROM public.medicos WHERE id = current_user_id) INTO user_in_medicos;  -- Adicionado schema
      SELECT EXISTS(SELECT 1 FROM public.medicos_precadastro WHERE id = current_user_id) INTO user_in_precadastro;  -- Adicionado schema

      debug_info := debug_info || ' | In medicos: ' || user_in_medicos || ' | In precadastro: ' || user_in_precadastro;

      -- Buscar dados da candidatura
      SELECT v.hospital_id, v.setor_id  -- Corrigido: vagas_hospital → hospital_id, vagas_setor → setor_id
      INTO candidatura_hospital, candidatura_setor
      FROM public.candidaturas c  -- Adicionado schema
      JOIN public.vagas v ON c.vaga_id = v.id  -- Corrigido: vagas_id = vagas_id → vaga_id = id
      WHERE c.id = candidatura_id  -- Corrigido: candidaturas_id → id
        AND c.status = 'APROVADO';  -- Corrigido: candidatura_status → status

      found_candidatura := (candidatura_hospital IS NOT NULL AND candidatura_setor IS NOT NULL);
      debug_info := debug_info || ' | Found candidatura: ' || found_candidatura;
      debug_info := debug_info || ' | Hospital: ' || COALESCE(candidatura_hospital::text, 'NULL');
      debug_info := debug_info || ' | Setor: ' || COALESCE(candidatura_setor::text, 'NULL');

      -- Buscar candidatura do usuário no mesmo hospital/setor
      SELECT EXISTS(
          SELECT 1
          FROM public.candidaturas c_user  -- Adicionado schema
          JOIN public.vagas v_user ON c_user.vaga_id = v_user.id  -- Corrigido: vagas_id = vagas_id → vaga_id = id
          WHERE (
              c_user.medico_id = current_user_id OR
              c_user.medico_precadastro_id = current_user_id
          )
            AND c_user.status = 'APROVADO'  -- Corrigido: candidatura_status → status
            AND v_user.hospital_id = candidatura_hospital  -- Corrigido: vagas_hospital → hospital_id
            AND v_user.setor_id = candidatura_setor  -- Corrigido: vagas_setor → setor_id
      ) INTO found_user_candidatura;

      debug_info := debug_info || ' | User has candidatura in same hospital/setor: ' || found_user_candidatura;

      RETURN debug_info;
  EXCEPTION
      WHEN OTHERS THEN
          RETURN 'ERROR: ' || SQLERRM;
  END;
  $function$;


CREATE OR REPLACE FUNCTION public.validate_checkin_timing()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    current_role TEXT;
    candidatura_aprovada BOOLEAN;
BEGIN
    -- Verificar o role atual do usuário
    SELECT auth.role() INTO current_role;
    
    -- Só aplicar verificação de conflito para usuários authenticated
    -- Roles de serviço podem trabalhar sem amarras
    IF current_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Verificar se é um usuário autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ERRO Usuário não autenticado.';
    END IF;

    -- Buscar informações da vaga
    SELECT v.data, v.hora_inicio, v.hora_fim
    INTO vaga_date, vaga_start_time, vaga_end_time
    FROM public.vagas v  -- Adicionado schema
    WHERE v.id = NEW.vaga_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ERRO Vaga não encontrado.';
    END IF;

    -- Verificar se o médico tem candidatura aprovada para esta vaga
    SELECT EXISTS(
        SELECT 1 
        FROM public.candidaturas c  -- Adicionado schema
        WHERE c.vaga_id = NEW.vaga_id  -- Corrigido: vagas_id → vaga_id
        AND c.medico_id = NEW.medico_id 
        AND c.status = 'APROVADO'
    ) INTO candidatura_aprovada;

    IF NOT candidatura_aprovada THEN
        RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.';
    END IF;

    -- Verificar se já existe check-in para esta combinação médico/vaga
    IF EXISTS(
        SELECT 1 
        FROM public.checkin_checkout cc  -- Adicionado schema
        WHERE cc.vaga_id = NEW.vaga_id 
        AND cc.medico_id = NEW.medico_id
    ) THEN
        RAISE EXCEPTION 'ERRO Check-in já realizado para esta vaga.';
    END IF;

    -- Construir o timestamp completo do início do plantão
    -- Convertendo para timestamp with timezone usando timezone local
    plantao_inicio := (vaga_date::TIMESTAMP + vaga_start_time::TIME);
    plantao_fim := (vaga_date::TIMESTAMP + vaga_end_time::TIME);

    -- Definir janela de check-in (15 minutos antes até 15 minutos depois)
    janela_inicio := plantao_inicio - INTERVAL '15 minutes';
    janela_fim := plantao_inicio + INTERVAL '15 minutes';

    -- Verificar se está dentro da janela permitida
    IF NOW() BETWEEN janela_inicio AND janela_fim THEN
        -- Dentro da janela: permitir sem justificativa
        RETURN NEW;
    ELSE
        -- Fora da janela: exigir justificativa
        IF NEW.checkin_justificativa IS NULL OR TRIM(NEW.checkin_justificativa) = '' THEN
            RAISE EXCEPTION 'ERRO Horário requer justificativa obrigatória.';
        END IF;
        
        -- Verificar se não é muito cedo (antes da janela permitida)
        IF NOW() < janela_inicio OR NOW() > plantao_fim THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-in.';
        END IF;
        
        RETURN NEW;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.excluir_vagas_lote(vagas_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Verificar se pelo menos um UUID foi fornecido
    IF array_length(vaga_ids, 1) IS NULL OR array_length(vaga_ids, 1) = 0 THEN
        RETURN 0;
    END IF;

    -- Excluir as vagas e contar quantas foram excluídas
    DELETE FROM public.vagas  -- Adicionado schema
    WHERE id = ANY(vaga_ids);  -- Corrigido: vagas_id → id

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Retornar quantidade excluída
    RETURN deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, re-lançar com mensagem mais clara
        RAISE EXCEPTION 'Erro ao excluir vagas: %', SQLERRM;
END;
$function$;


CREATE OR REPLACE FUNCTION public.validate_checkout_timing()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    current_role TEXT;
    candidatura_aprovada BOOLEAN;
BEGIN
    -- Verificar o role atual do usuário
    SELECT auth.role() INTO current_role;
    
    -- Só aplicar verificação de conflito para usuários authenticated
    -- Roles de serviço podem trabalhar sem amarras
    IF current_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Verificar se é um usuário autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ERRO Usuário não autenticado.';
    END IF;

    -- Buscar informações da vaga
    SELECT v.data, v.hora_inicio, v.hora_fim
    INTO vaga_date, vaga_start_time, vaga_end_time
    FROM public.vagas v  -- Adicionado schema
    WHERE v.id = NEW.vaga_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ERRO Vaga não encontrado.';
    END IF;

    -- Verificar se o médico tem candidatura aprovada para esta vaga
    SELECT EXISTS(
        SELECT 1 
        FROM public.candidaturas c  -- Adicionado schema
        WHERE c.vaga_id = NEW.vaga_id  -- Corrigido: vagas_id → vaga_id
        AND c.medico_id = NEW.medico_id 
        AND c.status = 'APROVADO'
    ) INTO candidatura_aprovada;

    IF NOT candidatura_aprovada THEN
        RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.';
    END IF;

    -- Verificar se existe check-in para esta combinação médico/vaga
    IF NOT EXISTS(
        SELECT 1 
        FROM public.checkin_checkout cc  -- Adicionado schema
        WHERE cc.vaga_id = NEW.vaga_id 
        AND cc.medico_id = NEW.medico_id
    ) THEN
        RAISE EXCEPTION 'ERRO Check-in ainda não realizado para esta vaga.';
    END IF;

    -- Construir o timestamp completo do início do plantão
    -- Convertendo para timestamp with timezone usando timezone local
    plantao_inicio := (vaga_date::TIMESTAMP + vaga_start_time::TIME);
    plantao_fim := (vaga_date::TIMESTAMP + vaga_end_time::TIME);

    -- Definir janela de check-out (15 minutos antes até 15 minutos depois do final)
    janela_inicio := plantao_fim - INTERVAL '15 minutes';
    janela_fim := plantao_fim + INTERVAL '15 minutes';

    -- Verificar se está dentro da janela permitida
    IF NOW() BETWEEN janela_inicio AND janela_fim THEN
        -- Dentro da janela: permitir sem justificativa
        RETURN NEW;
    ELSE
        -- Fora da janela: exigir justificativa
        IF NEW.checkout_justificativa IS NULL OR TRIM(NEW.checkout_justificativa) = '' THEN  -- Corrigido: checkin_justificativa → checkout_justificativa
            RAISE EXCEPTION 'ERRO Horário requer justificativa obrigatória.';
        END IF;
        
        -- Verificar se não é muito cedo (antes da janela permitida)
        IF NOW() < janela_inicio THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-out.';
        END IF;
        
        RETURN NEW;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.aprovacao_automatica_favoritos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verifica se existe uma relação de favorito entre o médico e o grupo da vaga
    IF EXISTS (
        SELECT 1 
        FROM public.medicos_favoritos mf  -- Adicionado schema
        INNER JOIN public.vagas v ON v.id = NEW.vaga_id  -- Corrigido: vagas_id → vaga_id, adicionado schema
        WHERE mf.medico_id = NEW.medico_id 
        AND mf.grupo_id = v.grupo_id
    ) THEN
        -- Se o médico é favorito do grupo, aprova automaticamente
        NEW.status := 'APROVADO';
        NEW.data_confirmacao := CURRENT_DATE;
        NEW.updated_at := NOW();
        NEW.updated_by := auth.uid();
        
        -- Fechar a vaga
        UPDATE public.vagas  -- Adicionado schema
        SET status = 'fechada',
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = NEW.vaga_id;  -- Corrigido: vagas_id → vaga_id
        
        -- Reprovar outras candidaturas pendentes
        UPDATE public.candidaturas  -- Adicionado schema
        SET status = 'REPROVADO',
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE vaga_id = NEW.vaga_id  -- Corrigido: vagas_id → vaga_id
        AND id != NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$function$;


