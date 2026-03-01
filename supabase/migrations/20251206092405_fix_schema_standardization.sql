-- =====================================================================================
-- Migration: Padronização de Schema e Suporte para API Routes
-- =====================================================================================
-- Data: 2025-12-06
-- Objetivo: Padronizar tipos de dados e preparar schema para refatoração de API routes
--
-- CONTEXTO:
-- Com a migração para API routes (que utilizam grupo_ids do JWT para filtragem),
-- várias inconsistências de schema precisam ser corrigidas para garantir
-- compatibilidade e manutenibilidade.
--
-- PRINCIPAIS ALTERAÇÕES:
-- 1. Padronização: updated_by de TEXT para UUID em todas as tabelas
-- 2. Views: Renomeação de colunas para snake_case consistente
-- 3. Funções: Atualização de funções paginadas para usar novos nomes de colunas
-- 4. Sistema: Criação de UUIDs especiais para operações automáticas
--
-- UUIDS ESPECIAIS DO SISTEMA:
-- aaaaaaaa-0000-aaaa-eeee-000000000001 → Vaga Expirada (sistema automático)
-- aaaaaaaa-0000-aa00-0eee-000000000002 → Auto Reprovação (trigger)
-- aaaaaaaa-0000-aaaa-cccc-000000000003 → Vaga Cancelada (API route)
--
-- =====================================================================================

-- =====================================================================================
-- PARTE 1: Preparação - Remover Defaults e Dependências
-- =====================================================================================

-- 1.1 Remover default value da coluna updated_by da tabela vagas
ALTER TABLE vagas
ALTER COLUMN updated_by DROP DEFAULT;

-- 1.2 Remover views que dependem da coluna updated_by antes de alterar tipo
-- Estas views serão recriadas após a alteração com novos nomes de colunas
DROP VIEW IF EXISTS vw_vagas_candidaturas;
DROP VIEW IF EXISTS vw_plantoes_pagamentos;

-- =====================================================================================
-- PARTE 2: Migração de Dados - Converter TEXT para UUID
-- =====================================================================================
-- Converter valores textuais legados (ex: "Sistema - Vaga Expirada") para UUIDs
-- especiais que representam operações automáticas do sistema.
UPDATE candidaturas
SET updated_by = CASE
  -- Vaga expirada / Sistema
  WHEN updated_by ILIKE '%expirada%' OR updated_by ILIKE '%sistema%' THEN 'aaaaaaaa-0000-aaaa-eeee-000000000001'
  -- Auto reprovacao
  WHEN updated_by ILIKE '%reprov%' OR updated_by ILIKE '%auto%' THEN 'aaaaaaaa-0000-aa00-0eee-000000000002'
  -- Vaga cancelada
  WHEN updated_by ILIKE '%cancel%' THEN 'aaaaaaaa-0000-aaaa-cccc-000000000003'
  -- Qualquer outro texto do sistema
  ELSE 'aaaaaaaa-0000-aaaa-eeee-000000000001'
END
WHERE updated_by IS NOT NULL
  AND updated_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =====================================================================================
-- PARTE 3: Alteração de Schema - updated_by TEXT → UUID
-- =====================================================================================
-- Altera o tipo da coluna updated_by de TEXT para UUID, aplicando mapeamento
-- para valores textuais legados.

ALTER TABLE candidaturas
ALTER COLUMN updated_by TYPE uuid USING
  CASE
    -- Se já é UUID válido, manter
    WHEN updated_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN updated_by::uuid
    -- Mapeamento de textos do sistema para UUIDs especiais
    WHEN updated_by ILIKE '%expirada%' OR updated_by ILIKE '%sistema%' THEN 'aaaaaaaa-0000-aaaa-eeee-000000000001'::uuid
    WHEN updated_by ILIKE '%reprov%' OR updated_by ILIKE '%auto%' THEN 'aaaaaaaa-0000-aa00-0eee-000000000002'::uuid
    WHEN updated_by ILIKE '%cancel%' THEN 'aaaaaaaa-0000-aaaa-cccc-000000000003'::uuid
    -- Fallback para qualquer outro texto
    ELSE 'aaaaaaaa-0000-aaaa-eeee-000000000001'::uuid
  END;

-- =====================================================================================
-- PARTE 4: Atualização de Funções do Sistema
-- =====================================================================================
-- Atualizar funções que usavam texto para updated_by, agora utilizando UUIDs especiais.

-- 4.1 Função: atualizar_status_vagas_expiradas
-- Executa automaticamente para cancelar/fechar vagas expiradas e reprovar candidaturas
DROP FUNCTION IF EXISTS public.atualizar_status_vagas_expiradas();
CREATE FUNCTION public.atualizar_status_vagas_expiradas()
RETURNS TABLE(vagas_canceladas integer, vagas_fechadas integer, candidaturas_reprovadas_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
    vagas_canceladas INT := 0;
    vagas_fechadas INT := 0;
    candidaturas_reprovadas_count INT := 0;
    sistema_vaga_expirada UUID := 'aaaaaaaa-0000-aaaa-eeee-000000000001'::uuid;
BEGIN
    -- 1. Cancelar vagas abertas que já passaram da data
    UPDATE vagas
    SET
        status = 'cancelada',
        updated_at = NOW(),
        updated_by = sistema_vaga_expirada
    WHERE
        data < CURRENT_DATE
        AND status = 'aberta';

    GET DIAGNOSTICS vagas_canceladas = ROW_COUNT;

    -- 2. Fechar vagas anunciadas que já passaram da data
    UPDATE vagas
    SET
        status = 'fechada',
        updated_at = NOW(),
        updated_by = sistema_vaga_expirada
    WHERE
        data < CURRENT_DATE
        AND status = 'anunciada';

    GET DIAGNOSTICS vagas_fechadas = ROW_COUNT;

    -- 3. Reprovar candidaturas pendentes de vagas expiradas
    UPDATE candidaturas
    SET
        status = 'REPROVADO',
        updated_at = NOW(),
        updated_by = sistema_vaga_expirada
    WHERE
        status = 'PENDENTE'
        AND vaga_id IN (
            SELECT id
            FROM vagas
            WHERE data < CURRENT_DATE
            AND status IN ('fechada', 'cancelada')
        );

    GET DIAGNOSTICS candidaturas_reprovadas_count = ROW_COUNT;

    -- Retornar resultados
    RETURN QUERY SELECT
        vagas_canceladas,
        vagas_fechadas,
        candidaturas_reprovadas_count;
END;
$$;

-- 4.2 Função: reprovar_candidaturas_ao_cancelar_vaga
-- Trigger que reprova automaticamente candidaturas quando vaga é cancelada
-- NOTA: Com a refatoração para API routes, esta lógica será movida para o backend,
--       mas o trigger permanece como fallback para operações diretas no banco.
CREATE OR REPLACE FUNCTION public.reprovar_candidaturas_ao_cancelar_vaga()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    sistema_vaga_cancelada UUID := 'aaaaaaaa-0000-aaaa-cccc-000000000003'::uuid;
BEGIN
    IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
        UPDATE candidaturas
        SET status = 'REPROVADO',
            updated_at = now(),
            updated_by = sistema_vaga_cancelada
        WHERE vaga_id = NEW.id
        AND status IN ('PENDENTE', 'APROVADO');
    END IF;
    RETURN NEW;
END;
$$;

-- 4.3 Função: atualizar_vagas_status
-- Trigger principal que fecha vaga e reprova outras candidaturas quando uma é aprovada
-- IMPORTANTE: Com API routes, a aprovação passa a ser feita via backend que usa
--             service_role e preenche updated_by com o UUID do escalista responsável.
CREATE OR REPLACE FUNCTION public.atualizar_vagas_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Atualiza o status da vaga para 'fechada' quando a candidatura for 'APROVADO'
    IF NEW.status = 'APROVADO' THEN
        -- Validar que updated_by está preenchido
        IF NEW.updated_by IS NULL THEN
            RAISE EXCEPTION 'updated_by nao pode ser NULL ao aprovar candidatura. Candidatura ID: %', NEW.id;
        END IF;

        -- 1. Atualiza o status da vaga para 'fechada' COM updated_by do usuario que aprovou
        UPDATE vagas
        SET status = 'fechada',
            updated_at = NOW(),
            updated_by = NEW.updated_by
        WHERE id = NEW.vaga_id;

        -- 2. Reprova todas as demais candidaturas para a mesma vaga
        -- Usa o mesmo updated_by do usuario que aprovou
        UPDATE candidaturas
        SET status = 'REPROVADO',
            updated_at = NOW(),
            updated_by = NEW.updated_by
        WHERE vaga_id = NEW.vaga_id
        AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

-- 4.4 Função: aprovacao_automatica_favoritos
-- Trigger que aprova automaticamente candidaturas de médicos favoritos
-- NOTA: Com API routes, esta lógica pode ser movida para o backend para melhor controle,
--       mas o trigger permanece como automação no banco de dados.
CREATE OR REPLACE FUNCTION public.aprovacao_automatica_favoritos()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verifica se existe uma relação de favorito entre o médico e o grupo da vaga
    IF EXISTS (
        SELECT 1
        FROM public.medicos_favoritos mf
        INNER JOIN public.vagas v ON v.id = NEW.vaga_id
        WHERE mf.medico_id = NEW.medico_id
        AND mf.grupo_id = v.grupo_id
    ) THEN
        -- Se o médico é favorito do grupo, aprova automaticamente
        NEW.status := 'APROVADO';
        NEW.data_confirmacao := CURRENT_DATE;
        NEW.updated_at := NOW();
        -- Manter o updated_by que veio no INSERT (não sobrescrever)

        -- Fechar a vaga usando o updated_by da candidatura (com fallback para UUID do sistema)
        UPDATE public.vagas
        SET status = 'fechada',
            updated_at = NOW(),
            updated_by = COALESCE(NEW.updated_by, 'aaaaaaaa-0000-aaaa-eeee-000000000001'::uuid)
        WHERE id = NEW.vaga_id;

        -- Reprovar outras candidaturas pendentes usando o updated_by da candidatura
        UPDATE public.candidaturas
        SET status = 'REPROVADO',
            updated_at = NOW(),
            updated_by = COALESCE(NEW.updated_by, 'aaaaaaaa-0000-aaaa-eeee-000000000001'::uuid)
        WHERE vaga_id = NEW.vaga_id
        AND id != NEW.id;

    END IF;

    RETURN NEW;
END;
$function$;

-- =====================================================================================
-- PARTE 5: Documentação dos UUIDs Especiais
-- =====================================================================================

COMMENT ON COLUMN candidaturas.updated_by IS
'UUID do usuário ou sistema que fez a última atualização.

UUIDs especiais do sistema:
  • aaaaaaaa-0000-aaaa-eeee-000000000001 → Vaga Expirada (cron job automático)
  • aaaaaaaa-0000-aa00-0eee-000000000002 → Auto Reprovação (trigger interno)
  • aaaaaaaa-0000-aaaa-cccc-000000000003 → Vaga Cancelada (API route)

Para operações via API routes, este campo contém o UUID do escalista que executou a ação.';

COMMENT ON COLUMN vagas.updated_by IS
'UUID do usuário ou sistema que fez a última atualização.

UUIDs especiais do sistema:
  • aaaaaaaa-0000-aaaa-eeee-000000000001 → Vaga Expirada (cron job automático)
  • aaaaaaaa-0000-aa00-0eee-000000000002 → Auto Reprovação (trigger interno)
  • aaaaaaaa-0000-aaaa-cccc-000000000003 → Vaga Cancelada (API route)

Para operações via API routes, este campo contém o UUID do escalista que executou a ação.';

-- =====================================================================================
-- PARTE 6: Recriar View vw_vagas_candidaturas com Padronização
-- =====================================================================================
-- CONTEXTO:
-- Renomear colunas para seguir padrão snake_case consistente, facilitando uso nas
-- API routes que filtram por grupo_ids do JWT.
--
-- MUDANÇAS DE NOMENCLATURA:
--   vaga_periodo → periodo_id
--   vaga_periodo_nome → periodo_nome
--   vaga_tipo → tipos_vaga_id
--   vaga_tipo_nome → tipos_vaga_nome
--   vaga_formarecebimento → forma_recebimento_id
--   vaga_formarecebimento_nome → forma_recebimento_nome
-- =====================================================================================
CREATE VIEW vw_vagas_candidaturas
WITH (security_invoker = on)
AS
SELECT
    row_number() OVER (ORDER BY combined_data.vaga_id, combined_data.effective_medico_id, combined_data.candidatura_id) AS idx,
    combined_data.vaga_id,
    combined_data.vaga_data,
    combined_data.vaga_createdate,
    combined_data.vaga_status,
    combined_data.vaga_valor,
    combined_data.vaga_horainicio,
    combined_data.vaga_horafim,
    combined_data.vaga_datapagamento,
    combined_data.periodo_id,
    combined_data.periodo_nome,
    combined_data.tipos_vaga_id,
    combined_data.tipos_vaga_nome,
    combined_data.forma_recebimento_id,
    combined_data.forma_recebimento_nome,
    combined_data.vaga_observacoes,
    combined_data.hospital_id,
    combined_data.hospital_nome,
    combined_data.hospital_estado,
    combined_data.hospital_lat,
    combined_data.hospital_log,
    combined_data.hospital_end,
    combined_data.hospital_avatar,
    combined_data.especialidade_id,
    combined_data.especialidade_nome,
    combined_data.setor_id,
    combined_data.setor_nome,
    combined_data.escalista_id,
    combined_data.escalista_nome,
    combined_data.escalista_email,
    combined_data.escalista_telefone,
    combined_data.grupo_id,
    combined_data.grupo_nome,
    combined_data.candidatura_id,
    combined_data.total_candidaturas,
    combined_data.candidatura_status,
    combined_data.candidatura_createdate,
    combined_data.candidatura_updateby,
    combined_data.candidatura_updatedat,
    combined_data.effective_medico_id AS medico_id,
    combined_data.medico_primeiro_nome,
    combined_data.medico_sobrenome,
    combined_data.medico_crm,
    combined_data.medico_cpf,
    combined_data.medico_estado,
    combined_data.medico_email,
    combined_data.medico_telefone,
    combined_data.medico_precadastro_id,
    combined_data.recorrencia_id,
    combined_data.vaga_salva,
    combined_data.checkin,
    combined_data.checkout,
    combined_data.pagamento_valor,
    combined_data.grade_id,
    combined_data.grade_nome,
    combined_data.grade_cor
FROM (
    SELECT
        v.id AS vaga_id,
        v.data AS vaga_data,
        v.created_at AS vaga_createdate,
        v.status AS vaga_status,
        v.valor AS vaga_valor,
        v.hora_inicio AS vaga_horainicio,
        v.hora_fim AS vaga_horafim,
        v.data_pagamento AS vaga_datapagamento,
        v.periodo_id AS periodo_id,
        p.nome AS periodo_nome,
        v.tipos_vaga_id AS tipos_vaga_id,
        t.nome AS tipos_vaga_nome,
        v.forma_recebimento_id AS forma_recebimento_id,
        f.forma_recebimento AS forma_recebimento_nome,
        v.observacoes AS vaga_observacoes,
        v.hospital_id,
        h.nome AS hospital_nome,
        h.estado AS hospital_estado,
        h.latitude AS hospital_lat,
        h.longitude AS hospital_log,
        h.endereco_formatado AS hospital_end,
        h.avatar AS hospital_avatar,
        v.especialidade_id,
        e.nome AS especialidade_nome,
        v.setor_id,
        s.nome AS setor_nome,
        v.escalista_id,
        esc.nome AS escalista_nome,
        esc.email AS escalista_email,
        esc.telefone AS escalista_telefone,
        v.grupo_id,
        g.nome AS grupo_nome,
        c.id AS candidatura_id,
        COALESCE(candidatura_counts.total_count, 0) AS total_candidaturas,
        c.status AS candidatura_status,
        c.created_at AS candidatura_createdate,
        c.updated_by AS candidatura_updateby,
        c.updated_at AS candidatura_updatedat,
        CASE
            WHEN ((c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (c.medico_precadastro_id IS NOT NULL))
            THEN c.medico_precadastro_id
            ELSE vm.medico_id
        END AS effective_medico_id,
        COALESCE(m.primeiro_nome, (mp.primeiro_nome)::text) AS medico_primeiro_nome,
        COALESCE(m.sobrenome, (mp.sobrenome)::text) AS medico_sobrenome,
        COALESCE(m.crm, (mp.crm)::text) AS medico_crm,
        COALESCE(m.cpf, (mp.cpf)::text) AS medico_cpf,
        COALESCE(m.estado, mp.estado) AS medico_estado,
        COALESCE(m.email, (mp.email)::text) AS medico_email,
        COALESCE(m.telefone, (mp.telefone)::text) AS medico_telefone,
        c.medico_precadastro_id,
        v.recorrencia_id,
        CASE
            WHEN ((vs.medico_id IS NOT NULL) OR (vsp.medico_id IS NOT NULL))
            THEN true
            ELSE false
        END AS vaga_salva,
        COALESCE(cc.checkin, ccp.checkin) AS checkin,
        COALESCE(cc.checkout, ccp.checkout) AS checkout,
        pg.valor AS pagamento_valor,
        v.grade_id,
        gr.nome AS grade_nome,
        gr.cor AS grade_cor
    FROM vagas v
    JOIN hospitais h ON (v.hospital_id = h.id)
    JOIN especialidades e ON (v.especialidade_id = e.id)
    JOIN setores s ON (v.setor_id = s.id)
    LEFT JOIN escalistas esc ON (v.escalista_id = esc.id)
    LEFT JOIN grupos g ON (v.grupo_id = g.id)
    LEFT JOIN periodos p ON (v.periodo_id = p.id)
    LEFT JOIN tipos_vaga t ON (v.tipos_vaga_id = t.id)
    LEFT JOIN formas_recebimento f ON (v.forma_recebimento_id = f.id)
    LEFT JOIN grades gr ON (v.grade_id = gr.id)
    LEFT JOIN (
        SELECT candidaturas.vaga_id, candidaturas.medico_id
        FROM candidaturas
        WHERE ((candidaturas.medico_id IS NOT NULL) AND (candidaturas.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))
        UNION ALL
        SELECT candidaturas.vaga_id, candidaturas.medico_precadastro_id AS medico_id
        FROM candidaturas
        WHERE ((candidaturas.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (candidaturas.medico_precadastro_id IS NOT NULL))
        UNION ALL
        SELECT vagas_salvas.vaga_id, vagas_salvas.medico_id
        FROM vagas_salvas
        WHERE (vagas_salvas.medico_id IS NOT NULL)
    ) vm ON (vm.vaga_id = v.id)
    LEFT JOIN (
        SELECT candidaturas.vaga_id, (count(*))::integer AS total_count
        FROM candidaturas
        GROUP BY candidaturas.vaga_id
    ) candidatura_counts ON (candidatura_counts.vaga_id = v.id)
    LEFT JOIN candidaturas c ON (
        (c.vaga_id = v.id) AND (
            ((c.medico_id = vm.medico_id) AND (c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)) OR
            ((c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (c.medico_precadastro_id = vm.medico_id))
        )
    )
    LEFT JOIN medicos m ON ((c.medico_id = m.id) AND (c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))
    LEFT JOIN medicos_precadastro mp ON (c.medico_precadastro_id = mp.id)
    LEFT JOIN vagas_salvas vs ON ((vs.vaga_id = v.id) AND (vs.medico_id = vm.medico_id))
    LEFT JOIN vagas_salvas vsp ON ((vsp.vaga_id = v.id) AND (vsp.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))
    LEFT JOIN checkin_checkout cc ON ((cc.vaga_id = v.id) AND (cc.medico_id = vm.medico_id))
    LEFT JOIN checkin_checkout ccp ON (
        (ccp.vaga_id = v.id) AND (ccp.medico_id =
            CASE
                WHEN (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
                THEN c.medico_precadastro_id
                ELSE vm.medico_id
            END
        )
    )
    LEFT JOIN pagamentos pg ON (pg.candidatura_id = c.id)
) combined_data;

-- =====================================================================================
-- PARTE 7: Atualizar Funções Paginadas
-- =====================================================================================
-- CONTEXTO:
-- Com a renomeação das colunas na view vw_vagas_candidaturas, as funções paginadas
-- precisam ser atualizadas para usar os novos nomes de colunas.
--
-- Estas funções são usadas pelas API routes para retornar dados paginados, com
-- filtragem por grupo_ids do JWT para isolamento multi-tenant.
-- =====================================================================================

-- 7.1 Função: get_applications_paginated
-- Busca candidaturas paginadas com filtros (usado pelas API routes)

-- Remove todas as versões existentes da função
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'DROP FUNCTION IF EXISTS ' ||
               n.nspname || '.' ||
               p.proname || '(' ||
               pg_get_function_identity_arguments(p.oid) || ');' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_applications_paginated'
          AND n.nspname = 'public'
    LOOP
        EXECUTE r.drop_statement;
    END LOOP;
END $$;

-- Recriar a função com as colunas corretas
CREATE OR REPLACE FUNCTION get_applications_paginated(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10,
    hospital_ids uuid [] DEFAULT NULL,
    specialty_ids uuid [] DEFAULT NULL,
    sector_ids uuid [] DEFAULT NULL,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL,
    min_value numeric DEFAULT NULL,
    max_value numeric DEFAULT NULL,
    period_ids uuid [] DEFAULT NULL,
    type_ids uuid [] DEFAULT NULL,
    group_ids uuid [] DEFAULT NULL,
    search_text text DEFAULT NULL,
    doctor_ids uuid [] DEFAULT NULL,
    application_status_filter text [] DEFAULT NULL,
    job_status_filter text [] DEFAULT NULL,
    grade_ids uuid [] DEFAULT NULL,
    order_by text DEFAULT 'candidatura_createdate',
    order_direction text DEFAULT 'DESC'
  ) RETURNS TABLE(data jsonb, pagination jsonb) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE validated_page integer;
validated_size integer;
total_count bigint;
offset_value integer;
validated_order_by text;
validated_order_direction text;
order_clause text;
BEGIN validated_page := CASE
  WHEN page_number < 1 THEN 1
  ELSE page_number
END;
validated_size := CASE
  WHEN page_size < 1 THEN 10
  WHEN page_size > 100 THEN 100
  ELSE page_size
END;
-- Validação dos parâmetros de ordenação
validated_order_by := CASE
  WHEN order_by IN (
    'candidatura_createdate',
    'vaga_createdate',
    'vaga_data',
    'vaga_valor',
    'medico_primeiro_nome',
    'hospital_nome',
    'setor_nome',
    'especialidade_nome',
    'periodo_nome',
    'vaga_status',
    'candidatura_status'
  ) THEN order_by
  ELSE 'candidatura_createdate'
END;
validated_order_direction := CASE
  WHEN UPPER(order_direction) IN ('ASC', 'DESC') THEN UPPER(order_direction)
  ELSE 'DESC'
END;
offset_value := (validated_page - 1) * validated_size;
-- Contagem total de candidaturas (não agrupadas)
SELECT COUNT(*) INTO total_count
FROM vw_vagas_candidaturas v
WHERE v.candidatura_id IS NOT NULL
  AND (
    hospital_ids IS NULL
    OR v.hospital_id = ANY(hospital_ids)
  )
  AND (
    specialty_ids IS NULL
    OR v.especialidade_id = ANY(specialty_ids)
  )
  AND (
    sector_ids IS NULL
    OR v.setor_id = ANY(sector_ids)
  )
  AND (
    period_ids IS NULL
    OR v.periodo_id = ANY(period_ids)
  )
  AND (
    type_ids IS NULL
    OR v.tipos_vaga_id = ANY(type_ids)
  )
  AND (
    group_ids IS NULL
    OR v.grupo_id = ANY(group_ids)
  )
  AND (
    start_date IS NULL
    OR v.candidatura_createdate >= start_date
  )
  AND (
    end_date IS NULL
    OR v.candidatura_createdate <= end_date
  )
  AND (
    min_value IS NULL
    OR v.vaga_valor >= min_value
  )
  AND (
    max_value IS NULL
    OR v.vaga_valor <= max_value
  )
  AND (
    doctor_ids IS NULL
    OR v.medico_id = ANY(doctor_ids)
  )
  AND (
    application_status_filter IS NULL
    OR v.candidatura_status = ANY(application_status_filter)
  )
  AND (
    job_status_filter IS NULL
    OR v.vaga_status = ANY(job_status_filter)
  )
  AND (
    grade_ids IS NULL
    OR v.grade_id = ANY(grade_ids)
  )
  AND (
    search_text IS NULL
    OR v.hospital_nome ILIKE '%' || search_text || '%'
    OR v.especialidade_nome ILIKE '%' || search_text || '%'
    OR v.vaga_observacoes ILIKE '%' || search_text || '%'
    OR v.setor_nome ILIKE '%' || search_text || '%'
  );
RETURN QUERY
SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'candidatura_id',
        v.candidatura_id,
        'candidatura_status',
        v.candidatura_status,
        'candidatura_createdate',
        v.candidatura_createdate,
        'vaga_salva',
        v.vaga_salva,
        'vaga',
        jsonb_build_object(
          'vaga_id',
          v.vaga_id,
          'vaga_data',
          v.vaga_data,
          'vaga_horainicio',
          v.vaga_horainicio,
          'vaga_horafim',
          v.vaga_horafim,
          'vaga_valor',
          v.vaga_valor,
          'vaga_status',
          v.vaga_status,
          'vaga_observacoes',
          v.vaga_observacoes,
          'vaga_datapagamento',
          v.vaga_datapagamento,
          'total_candidaturas',
          v.total_candidaturas,
          'vaga_createdate',
          v.vaga_createdate,
          'periodo_id',
          v.periodo_id,
          'periodo_nome',
          v.periodo_nome,
          'tipos_vaga_id',
          v.tipos_vaga_id,
          'tipos_vaga_nome',
          v.tipos_vaga_nome
        ),
        'medico',
        jsonb_build_object(
          'medico_id',
          v.medico_id,
          'medico_primeiro_nome',
          v.medico_primeiro_nome,
          'medico_sobrenome',
          v.medico_sobrenome,
          'medico_crm',
          v.medico_crm,
          'medico_estado',
          v.medico_estado,
          'medico_email',
          v.medico_email,
          'medico_telefone',
          v.medico_telefone
        ),
        'hospital',
        jsonb_build_object(
          'hospital_id',
          v.hospital_id,
          'hospital_nome',
          v.hospital_nome,
          'hospital_estado',
          v.hospital_estado,
          'hospital_lat',
          v.hospital_lat,
          'hospital_log',
          v.hospital_log,
          'hospital_end',
          v.hospital_end,
          'hospital_avatar',
          v.hospital_avatar
        ),
        'especialidade',
        jsonb_build_object(
          'especialidade_id',
          v.especialidade_id,
          'especialidade_nome',
          v.especialidade_nome
        ),
        'setor',
        jsonb_build_object(
          'setor_id',
          v.setor_id,
          'setor_nome',
          v.setor_nome
        ),
        'escalista',
        jsonb_build_object(
          'escalista_id',
          v.escalista_id,
          'escalista_nome',
          v.escalista_nome,
          'escalista_email',
          v.escalista_email,
          'escalista_telefone',
          v.escalista_telefone
        ),
        'grupo',
        jsonb_build_object(
          'grupo_id',
          v.grupo_id,
          'grupo_nome',
          v.grupo_nome
        ),
        'grade',
        jsonb_build_object(
          'grade_id',
          v.grade_id,
          'grade_nome',
          v.grade_nome,
          'grade_cor',
          v.grade_cor
        )
      )
    ),
    '[]'::jsonb
  ) AS data,
  jsonb_build_object(
    'current_page',
    validated_page,
    'page_size',
    validated_size,
    'total_count',
    total_count,
    'total_pages',
    CASE
      WHEN total_count = 0 THEN 0
      ELSE CEIL(total_count::numeric / validated_size::numeric)::integer
    END,
    'has_previous',
    validated_page > 1,
    'has_next',
    validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer,
    'previous_page',
    CASE
      WHEN validated_page > 1 THEN validated_page - 1
      ELSE NULL
    END,
    'next_page',
    CASE
      WHEN validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer THEN validated_page + 1
      ELSE NULL
    END
  ) AS pagination
FROM (
    SELECT *
    FROM vw_vagas_candidaturas v
    WHERE v.candidatura_id IS NOT NULL
      AND (
        hospital_ids IS NULL
        OR v.hospital_id = ANY(hospital_ids)
      )
      AND (
        specialty_ids IS NULL
        OR v.especialidade_id = ANY(specialty_ids)
      )
      AND (
        sector_ids IS NULL
        OR v.setor_id = ANY(sector_ids)
      )
      AND (
        period_ids IS NULL
        OR v.periodo_id = ANY(period_ids)
      )
      AND (
        type_ids IS NULL
        OR v.tipos_vaga_id = ANY(type_ids)
      )
      AND (
        group_ids IS NULL
        OR v.grupo_id = ANY(group_ids)
      )
      AND (
        start_date IS NULL
        OR v.candidatura_createdate >= start_date
      )
      AND (
        end_date IS NULL
        OR v.candidatura_createdate <= end_date
      )
      AND (
        min_value IS NULL
        OR v.vaga_valor >= min_value
      )
      AND (
        max_value IS NULL
        OR v.vaga_valor <= max_value
      )
      AND (
        doctor_ids IS NULL
        OR v.medico_id = ANY(doctor_ids)
      )
      AND (
        application_status_filter IS NULL
        OR v.candidatura_status = ANY(application_status_filter)
      )
      AND (
        job_status_filter IS NULL
        OR v.vaga_status = ANY(job_status_filter)
      )
      AND (
        grade_ids IS NULL
        OR v.grade_id = ANY(grade_ids)
      )
      AND (
        search_text IS NULL
        OR v.hospital_nome ILIKE '%' || search_text || '%'
        OR v.especialidade_nome ILIKE '%' || search_text || '%'
        OR v.vaga_observacoes ILIKE '%' || search_text || '%'
        OR v.setor_nome ILIKE '%' || search_text || '%'
      )
    ORDER BY CASE
        WHEN validated_order_by = 'candidatura_createdate'
        AND validated_order_direction = 'DESC' THEN v.candidatura_createdate
      END DESC,
      CASE
        WHEN validated_order_by = 'candidatura_createdate'
        AND validated_order_direction = 'ASC' THEN v.candidatura_createdate
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_createdate'
        AND validated_order_direction = 'DESC' THEN v.vaga_createdate
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_createdate'
        AND validated_order_direction = 'ASC' THEN v.vaga_createdate
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_data'
        AND validated_order_direction = 'DESC' THEN v.vaga_data
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_data'
        AND validated_order_direction = 'ASC' THEN v.vaga_data
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_valor'
        AND validated_order_direction = 'DESC' THEN v.vaga_valor
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_valor'
        AND validated_order_direction = 'ASC' THEN v.vaga_valor
      END ASC,
      CASE
        WHEN validated_order_by = 'medico_primeiro_nome'
        AND validated_order_direction = 'DESC' THEN v.medico_primeiro_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'medico_primeiro_nome'
        AND validated_order_direction = 'ASC' THEN v.medico_primeiro_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'hospital_nome'
        AND validated_order_direction = 'DESC' THEN v.hospital_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'hospital_nome'
        AND validated_order_direction = 'ASC' THEN v.hospital_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'setor_nome'
        AND validated_order_direction = 'DESC' THEN v.setor_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'setor_nome'
        AND validated_order_direction = 'ASC' THEN v.setor_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'especialidade_nome'
        AND validated_order_direction = 'DESC' THEN v.especialidade_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'especialidade_nome'
        AND validated_order_direction = 'ASC' THEN v.especialidade_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'periodo_nome'
        AND validated_order_direction = 'DESC' THEN v.periodo_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'periodo_nome'
        AND validated_order_direction = 'ASC' THEN v.periodo_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_status'
        AND validated_order_direction = 'DESC' THEN v.vaga_status
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_status'
        AND validated_order_direction = 'ASC' THEN v.vaga_status
      END ASC,
      CASE
        WHEN validated_order_by = 'candidatura_status'
        AND validated_order_direction = 'DESC' THEN v.candidatura_status
      END DESC,
      CASE
        WHEN validated_order_by = 'candidatura_status'
        AND validated_order_direction = 'ASC' THEN v.candidatura_status
      END ASC
    LIMIT validated_size OFFSET offset_value
  ) v;
END;
$$;

GRANT EXECUTE ON FUNCTION get_applications_paginated(
    integer,
    integer,
    uuid [],
    uuid [],
    uuid [],
    date,
    date,
    numeric,
    numeric,
    uuid [],
    uuid [],
    uuid [],
    text,
    uuid [],
    text [],
    text [],
    uuid [],
    text,
    text
  ) TO authenticated;

COMMENT ON FUNCTION get_applications_paginated IS
'Busca candidaturas paginadas (não agrupadas) com filtros opcionais.

IMPORTANTE: Esta função é utilizada pelas API routes que aplicam filtragem por
grupo_ids do JWT para garantir isolamento multi-tenant.

Filtros disponíveis:
  • Arrays de IDs: hospital_ids[], specialty_ids[], sector_ids[], period_ids[],
    type_ids[], group_ids[], doctor_ids[], grade_ids[]
  • Status: application_status_filter[PENDENTE,APROVADO,REPROVADO],
    job_status_filter[aberta,fechada,cancelada,anunciada]
  • Intervalo: start_date, end_date, min_value, max_value
  • Texto: search_text (busca em hospital, especialidade, setor, observações)

Ordenação: order_by, order_direction (ASC/DESC)

Retorna cada candidatura separadamente com informações da vaga e médico associados.';

-- 7.2 Função: get_vagas_paginated
-- Busca vagas paginadas agrupadas por vaga_id (usado pelas API routes)

-- Remove todas as versões existentes da função
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'DROP FUNCTION IF EXISTS ' ||
               n.nspname || '.' ||
               p.proname || '(' ||
               pg_get_function_identity_arguments(p.oid) || ');' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_vagas_paginated'
          AND n.nspname = 'public'
    LOOP
        EXECUTE r.drop_statement;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_vagas_paginated(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10,
    hospital_ids uuid [] DEFAULT NULL,
    specialty_ids uuid [] DEFAULT NULL,
    sector_ids uuid [] DEFAULT NULL,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL,
    min_value numeric DEFAULT NULL,
    max_value numeric DEFAULT NULL,
    period_ids uuid [] DEFAULT NULL,
    type_ids uuid [] DEFAULT NULL,
    group_ids uuid [] DEFAULT NULL,
    search_text text DEFAULT NULL,
    doctor_ids uuid [] DEFAULT NULL,
    application_status_filter text [] DEFAULT NULL,
    job_status_filter text [] DEFAULT NULL,
    grade_ids uuid [] DEFAULT NULL,
    order_by text DEFAULT 'vaga_data',
    order_direction text DEFAULT 'DESC'
  ) RETURNS TABLE(data jsonb, pagination jsonb) LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE validated_page integer;
validated_size integer;
total_count bigint;
offset_value integer;
validated_order_by text;
validated_order_direction text;
order_clause text;
BEGIN validated_page := CASE
  WHEN page_number < 1 THEN 1
  ELSE page_number
END;
validated_size := CASE
  WHEN page_size < 1 THEN 10
  WHEN page_size > 100 THEN 100
  ELSE page_size
END;
-- Validação dos parâmetros de ordenação
validated_order_by := CASE
  WHEN order_by IN (
    'vaga_data',
    'vaga_createdate',
    'vaga_valor',
    'hospital_nome',
    'setor_nome',
    'especialidade_nome',
    'periodo_nome',
    'vaga_status',
    'total_candidaturas'
  ) THEN order_by
  ELSE 'vaga_createdate'
END;
validated_order_direction := CASE
  WHEN UPPER(order_direction) IN ('ASC', 'DESC') THEN UPPER(order_direction)
  ELSE 'DESC'
END;
offset_value := (validated_page - 1) * validated_size;
WITH vagas_filtradas AS (
  SELECT DISTINCT v.vaga_id
  FROM vw_vagas_candidaturas v
  WHERE 1 = 1
    AND (
      hospital_ids IS NULL
      OR v.hospital_id = ANY(hospital_ids)
    )
    AND (
      specialty_ids IS NULL
      OR v.especialidade_id = ANY(specialty_ids)
    )
    AND (
      sector_ids IS NULL
      OR v.setor_id = ANY(sector_ids)
    )
    AND (
      period_ids IS NULL
      OR v.periodo_id = ANY(period_ids)
    )
    AND (
      type_ids IS NULL
      OR v.tipos_vaga_id = ANY(type_ids)
    )
    AND (
      group_ids IS NULL
      OR v.grupo_id = ANY(group_ids)
    )
    AND (
      start_date IS NULL
      OR v.vaga_data >= start_date
    )
    AND (
      end_date IS NULL
      OR v.vaga_data <= end_date
    )
    AND (
      min_value IS NULL
      OR v.vaga_valor >= min_value
    )
    AND (
      max_value IS NULL
      OR v.vaga_valor <= max_value
    )
    AND (
      doctor_ids IS NULL
      OR v.medico_id = ANY(doctor_ids)
    )
    AND (
      application_status_filter IS NULL
      OR v.candidatura_status = ANY(application_status_filter)
    )
    AND (
      job_status_filter IS NULL
      OR v.vaga_status = ANY(job_status_filter)
    )
    AND (
      grade_ids IS NULL
      OR v.grade_id = ANY(grade_ids)
    )
    AND (
      search_text IS NULL
      OR v.hospital_nome ILIKE '%' || search_text || '%'
      OR v.especialidade_nome ILIKE '%' || search_text || '%'
      OR v.vaga_observacoes ILIKE '%' || search_text || '%'
      OR v.setor_nome ILIKE '%' || search_text || '%'
    )
)
SELECT COUNT(*) INTO total_count
FROM vagas_filtradas;
RETURN QUERY WITH vagas_agrupadas AS (
  SELECT v.vaga_id,
    (array_agg(v.vaga_data)) [1] AS vaga_data,
    (array_agg(v.vaga_horainicio)) [1] AS vaga_horainicio,
    (array_agg(v.vaga_horafim)) [1] AS vaga_horafim,
    (array_agg(v.vaga_valor)) [1] AS vaga_valor,
    (array_agg(v.vaga_status)) [1] AS vaga_status,
    (array_agg(v.vaga_observacoes)) [1] AS vaga_observacoes,
    (array_agg(v.vaga_datapagamento)) [1] AS vaga_datapagamento,
    (array_agg(v.total_candidaturas)) [1] AS total_candidaturas,
    (array_agg(v.vaga_createdate)) [1] AS vaga_createdate,
    (array_agg(v.periodo_id)) [1] AS periodo_id,
    (array_agg(v.periodo_nome)) [1] AS periodo_nome,
    (array_agg(v.tipos_vaga_id)) [1] AS tipos_vaga_id,
    (array_agg(v.tipos_vaga_nome)) [1] AS tipos_vaga_nome,
    (array_agg(v.hospital_id)) [1] AS hospital_id,
    (array_agg(v.hospital_nome)) [1] AS hospital_nome,
    (array_agg(v.hospital_estado)) [1] AS hospital_estado,
    (array_agg(v.hospital_lat)) [1] AS hospital_lat,
    (array_agg(v.hospital_log)) [1] AS hospital_log,
    (array_agg(v.hospital_end)) [1] AS hospital_end,
    (array_agg(v.hospital_avatar)) [1] AS hospital_avatar,
    (array_agg(v.especialidade_id)) [1] AS especialidade_id,
    (array_agg(v.especialidade_nome)) [1] AS especialidade_nome,
    (array_agg(v.setor_id)) [1] AS setor_id,
    (array_agg(v.setor_nome)) [1] AS setor_nome,
    (array_agg(v.escalista_id)) [1] AS escalista_id,
    (array_agg(v.escalista_nome)) [1] AS escalista_nome,
    (array_agg(v.escalista_email)) [1] AS escalista_email,
    (array_agg(v.escalista_telefone)) [1] AS escalista_telefone,
    (array_agg(v.grupo_id)) [1] AS grupo_id,
    (array_agg(v.grupo_nome)) [1] AS grupo_nome,
    (array_agg(v.grade_id)) [1] AS grade_id,
    (array_agg(v.grade_nome)) [1] AS grade_nome,
    (array_agg(v.grade_cor)) [1] AS grade_cor,
    array_agg(
      CASE
        WHEN v.candidatura_id IS NOT NULL THEN jsonb_build_object(
          'candidatura_id',
          v.candidatura_id,
          'candidatura_status',
          v.candidatura_status,
          'candidatura_createdate',
          v.candidatura_createdate,
          'vaga_salva',
          v.vaga_salva,
          'medico_id',
          v.medico_id,
          'medico_primeiro_nome',
          v.medico_primeiro_nome,
          'medico_sobrenome',
          v.medico_sobrenome,
          'medico_crm',
          v.medico_crm,
          'medico_estado',
          v.medico_estado,
          'medico_email',
          v.medico_email,
          'medico_telefone',
          v.medico_telefone
        )
        ELSE NULL
      END
      ORDER BY v.candidatura_createdate DESC
    ) FILTER (
      WHERE v.candidatura_id IS NOT NULL
    ) AS candidaturas_list
  FROM vw_vagas_candidaturas v
  WHERE 1 = 1
    AND (
      hospital_ids IS NULL
      OR v.hospital_id = ANY(hospital_ids)
    )
    AND (
      specialty_ids IS NULL
      OR v.especialidade_id = ANY(specialty_ids)
    )
    AND (
      sector_ids IS NULL
      OR v.setor_id = ANY(sector_ids)
    )
    AND (
      period_ids IS NULL
      OR v.periodo_id = ANY(period_ids)
    )
    AND (
      type_ids IS NULL
      OR v.tipos_vaga_id = ANY(type_ids)
    )
    AND (
      group_ids IS NULL
      OR v.grupo_id = ANY(group_ids)
    )
    AND (
      start_date IS NULL
      OR v.vaga_data >= start_date
    )
    AND (
      end_date IS NULL
      OR v.vaga_data <= end_date
    )
    AND (
      min_value IS NULL
      OR v.vaga_valor >= min_value
    )
    AND (
      max_value IS NULL
      OR v.vaga_valor <= max_value
    )
    AND (
      doctor_ids IS NULL
      OR v.medico_id = ANY(doctor_ids)
    )
    AND (
      application_status_filter IS NULL
      OR v.candidatura_status = ANY(application_status_filter)
    )
    AND (
      job_status_filter IS NULL
      OR v.vaga_status = ANY(job_status_filter)
    )
    AND (
      grade_ids IS NULL
      OR v.grade_id = ANY(grade_ids)
    )
    AND (
      search_text IS NULL
      OR v.hospital_nome ILIKE '%' || search_text || '%'
      OR v.especialidade_nome ILIKE '%' || search_text || '%'
      OR v.vaga_observacoes ILIKE '%' || search_text || '%'
      OR v.setor_nome ILIKE '%' || search_text || '%'
    )
  GROUP BY v.vaga_id
  ORDER BY CASE
      WHEN validated_order_by = 'vaga_data'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_data)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_data'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_data)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'vaga_valor'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_valor)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_valor'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_valor)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'hospital_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.hospital_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'hospital_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.hospital_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'setor_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.setor_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'setor_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.setor_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'especialidade_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.especialidade_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'especialidade_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.especialidade_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'periodo_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.periodo_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'periodo_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.periodo_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'vaga_status'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_status)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_status'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_status)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'total_candidaturas'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.total_candidaturas)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'total_candidaturas'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.total_candidaturas)) [1]
    END ASC
  LIMIT validated_size OFFSET offset_value
)
SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'vaga_id',
        v.vaga_id,
        'vaga_data',
        v.vaga_data,
        'vaga_horainicio',
        v.vaga_horainicio,
        'vaga_horafim',
        v.vaga_horafim,
        'vaga_valor',
        v.vaga_valor,
        'vaga_status',
        v.vaga_status,
        'vaga_observacoes',
        v.vaga_observacoes,
        'vaga_datapagamento',
        v.vaga_datapagamento,
        'total_candidaturas',
        v.total_candidaturas,
        'vaga_createdate',
        v.vaga_createdate,
        'periodo_id',
        v.periodo_id,
        'periodo_nome',
        v.periodo_nome,
        'tipos_vaga_id',
        v.tipos_vaga_id,
        'tipos_vaga_nome',
        v.tipos_vaga_nome,
        'hospital',
        jsonb_build_object(
          'hospital_id',
          v.hospital_id,
          'hospital_nome',
          v.hospital_nome,
          'hospital_estado',
          v.hospital_estado,
          'hospital_lat',
          v.hospital_lat,
          'hospital_log',
          v.hospital_log,
          'hospital_end',
          v.hospital_end,
          'hospital_avatar',
          v.hospital_avatar
        ),
        'especialidade',
        jsonb_build_object(
          'especialidade_id',
          v.especialidade_id,
          'especialidade_nome',
          v.especialidade_nome
        ),
        'setor',
        jsonb_build_object(
          'setor_id',
          v.setor_id,
          'setor_nome',
          v.setor_nome
        ),
        'escalista',
        jsonb_build_object(
          'escalista_id',
          v.escalista_id,
          'escalista_nome',
          v.escalista_nome,
          'escalista_email',
          v.escalista_email,
          'escalista_telefone',
          v.escalista_telefone
        ),
        'grupo',
        jsonb_build_object(
          'grupo_id',
          v.grupo_id,
          'grupo_nome',
          v.grupo_nome
        ),
        'candidaturas',
        COALESCE(
          array_to_json(v.candidaturas_list)::jsonb,
          '[]'::jsonb
        ),
        'grade',
        jsonb_build_object(
          'grade_id',
          v.grade_id,
          'grade_nome',
          v.grade_nome,
          'grade_cor',
          v.grade_cor
        )
      )
      ORDER BY CASE
          WHEN validated_order_by = 'vaga_data'
          AND validated_order_direction = 'DESC' THEN v.vaga_data
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_data'
          AND validated_order_direction = 'ASC' THEN v.vaga_data
        END ASC,
        CASE
          WHEN validated_order_by = 'vaga_valor'
          AND validated_order_direction = 'DESC' THEN v.vaga_valor
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_valor'
          AND validated_order_direction = 'ASC' THEN v.vaga_valor
        END ASC,
        CASE
          WHEN validated_order_by = 'hospital_nome'
          AND validated_order_direction = 'DESC' THEN v.hospital_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'hospital_nome'
          AND validated_order_direction = 'ASC' THEN v.hospital_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'setor_nome'
          AND validated_order_direction = 'DESC' THEN v.setor_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'setor_nome'
          AND validated_order_direction = 'ASC' THEN v.setor_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'especialidade_nome'
          AND validated_order_direction = 'DESC' THEN v.especialidade_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'especialidade_nome'
          AND validated_order_direction = 'ASC' THEN v.especialidade_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'periodo_nome'
          AND validated_order_direction = 'DESC' THEN v.periodo_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'periodo_nome'
          AND validated_order_direction = 'ASC' THEN v.periodo_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'vaga_status'
          AND validated_order_direction = 'DESC' THEN v.vaga_status
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_status'
          AND validated_order_direction = 'ASC' THEN v.vaga_status
        END ASC,
        CASE
          WHEN validated_order_by = 'total_candidaturas'
          AND validated_order_direction = 'DESC' THEN v.total_candidaturas
        END DESC,
        CASE
          WHEN validated_order_by = 'total_candidaturas'
          AND validated_order_direction = 'ASC' THEN v.total_candidaturas
        END ASC
    ),
    '[]'::jsonb
  ) AS data,
  jsonb_build_object(
    'current_page',
    validated_page,
    'page_size',
    validated_size,
    'total_count',
    total_count,
    'total_pages',
    CASE
      WHEN total_count = 0 THEN 0
      ELSE CEIL(total_count::numeric / validated_size::numeric)::integer
    END,
    'has_previous',
    validated_page > 1,
    'has_next',
    validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer,
    'previous_page',
    CASE
      WHEN validated_page > 1 THEN validated_page - 1
      ELSE NULL
    END,
    'next_page',
    CASE
      WHEN validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer THEN validated_page + 1
      ELSE NULL
    END
  ) AS pagination
FROM vagas_agrupadas v;
END;
$$;

GRANT EXECUTE ON FUNCTION get_vagas_paginated(
    integer,
    integer,
    uuid [],
    uuid [],
    uuid [],
    date,
    date,
    numeric,
    numeric,
    uuid [],
    uuid [],
    uuid [],
    text,
    uuid [],
    text [],
    text [],
    uuid [],
    text,
    text
  ) TO authenticated;

COMMENT ON FUNCTION get_vagas_paginated IS
'Busca vagas agrupadas por vaga_id com filtros opcionais.

IMPORTANTE: Esta função é utilizada pelas API routes que aplicam filtragem por
grupo_ids do JWT para garantir isolamento multi-tenant.

Filtros disponíveis:
  • Arrays de IDs: hospital_ids[], specialty_ids[], sector_ids[], period_ids[],
    type_ids[], group_ids[], doctor_ids[], grade_ids[]
  • Status: application_status_filter[PENDENTE,APROVADO,REPROVADO],
    job_status_filter[aberta,fechada,cancelada,anunciada]
  • Intervalo: start_date, end_date, min_value, max_value
  • Texto: search_text (busca em hospital, especialidade, setor, observações)

Ordenação: order_by, order_direction (ASC/DESC)

Retorna vagas agrupadas com todas as candidaturas compactadas em array, resultando
em menos páginas totais comparado a get_applications_paginated.';

-- =====================================================================================
-- PARTE 8: Recriar View vw_plantoes_pagamentos com Padronização
-- =====================================================================================
-- CONTEXTO:
-- Corrige nomenclatura e adiciona grupo_id para permitir filtragem nas API routes.
--
-- CORREÇÕES:
--   plantao_id → id (padronização)
--   Adiciona coluna grupo_id da tabela vagas (necessário para filtragem JWT)
-- =====================================================================================
CREATE VIEW vw_plantoes_pagamentos
WITH (security_invoker = on)
AS
SELECT
    row_number() OVER (ORDER BY v.id, c.id) AS idx,
    c.id AS id,
    c.id AS candidatura_id,
    v.id AS vaga_id,
    COALESCE(m.id, mp.id) AS medico_id,
    h.id AS hospital_id,
    s.id AS setor_id,
    e.id AS especialidade_id,
    esc.id AS escalista_id,
    v.grupo_id AS grupo_id,
    v.data AS vaga_data,
    v.hora_inicio AS vaga_horainicio,
    v.hora_fim AS vaga_horafim,
    v.valor AS vaga_valor,
    v.status AS vaga_status,
    h.nome AS hospital_nome,
    s.nome AS setor_nome,
    e.nome AS especialidade_nome,
    esc.nome AS escalista_nome,
    COALESCE(m.primeiro_nome, (mp.primeiro_nome)::text) AS medico_primeiro_nome,
    COALESCE(m.sobrenome, (mp.sobrenome)::text) AS medico_sobrenome,
    concat(COALESCE(m.primeiro_nome, (mp.primeiro_nome)::text), ' ', COALESCE(m.sobrenome, (mp.sobrenome)::text)) AS medico_nome,
    COALESCE(m.cpf, (mp.cpf)::text) AS medico_cpf,
    COALESCE(m.crm, (mp.crm)::text) AS medico_crm,
    cc.id AS checkin_id,
    cc.checkin AS checkin_hora,
    cc.checkin_status,
    cc.checkin_justificativa,
    cc.checkin_aprovado_por,
    cc.checkin_aprovado_em,
    esc_checkin.nome AS checkin_aprovado_por_nome,
    cc.checkout AS checkout_hora,
    cc.checkout_status,
    cc.checkout_justificativa,
    cc.checkout_aprovado_por,
    cc.checkout_aprovado_em,
    esc_checkout.nome AS checkout_aprovado_por_nome,
    pg.id AS pagamento_id,
    pg.status AS pagamento_status,
    pg.valor AS pagamento_valor,
    pg.autorizado_por,
    pg.autorizado_em,
    esc_pag.nome AS autorizado_por_nome,
    pg.pago_em,
    pg.pago_por,
    esc_pago.nome AS pago_por_nome
FROM candidaturas c
JOIN vagas v ON (c.vaga_id = v.id)
JOIN hospitais h ON (v.hospital_id = h.id)
JOIN setores s ON (v.setor_id = s.id)
JOIN especialidades e ON (v.especialidade_id = e.id)
LEFT JOIN escalistas esc ON (v.escalista_id = esc.id)
LEFT JOIN medicos m ON ((c.medico_id = m.id) AND (c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))
LEFT JOIN medicos_precadastro mp ON (c.medico_precadastro_id = mp.id)
LEFT JOIN checkin_checkout cc ON (
    (cc.vaga_id = v.id) AND
    (cc.medico_id = COALESCE(NULLIF(c.medico_id, '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid), c.medico_precadastro_id))
)
LEFT JOIN pagamentos pg ON (pg.candidatura_id = c.id)
LEFT JOIN escalistas esc_pag ON (pg.autorizado_por = esc_pag.id)
LEFT JOIN escalistas esc_pago ON (pg.pago_por = esc_pago.id)
LEFT JOIN escalistas esc_checkin ON (cc.checkin_aprovado_por = esc_checkin.id)
LEFT JOIN escalistas esc_checkout ON (cc.checkout_aprovado_por = esc_checkout.id)
WHERE (v.status = 'fechada')
  AND (c.status = 'APROVADO')
  AND (v.data <= CURRENT_DATE);


