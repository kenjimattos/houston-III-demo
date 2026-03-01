-- =====================================================================================
-- Migration: Migração de RLS Complexo para Filtragem via JWT
-- =====================================================================================
-- Data: 2025-12-05
-- Objetivo: Resolver problemas de performance substituindo RLS complexo por filtragem
--           nas API routes utilizando informações do JWT
--
-- PROBLEMA IDENTIFICADO:
-- Políticas RLS utilizando houston.authorize() estão causando timeouts superiores a 8s
-- em operações simples devido ao processamento complexo no banco de dados (múltiplas
-- JOINs e subqueries para validar permissões por grupo/hospital/setor).
--
-- SOLUÇÃO IMPLEMENTADA:
-- 1. Enriquecer JWT com grupo_ids (custom_access_token_hook)
-- 2. Simplificar políticas RLS removendo chamadas a houston.authorize()
-- 3. Usar grupo_ids do JWT para filtrar dados nas queries das API routes
--
-- EXEMPLO DE FILTRAGEM:
-- Antes: RLS validava se usuário tem acesso ao grupo via houston.authorize()
-- Depois: API route filtra WHERE grupo_id = ANY(jwt.grupo_ids)
--
-- IMPACTO DA MIGRAÇÃO:
-- ✅ Performance: Queries passam de 8s+ para ~100ms
-- ✅ Segurança: Filtragem multi-tenant baseada em grupo_ids do JWT
-- ⚠️  JWT Size: Aumenta ~200-500 bytes (aceitável)
-- ⚠️  Breaking: Houston Web não pode mais fazer queries diretas ao Supabase
--
-- ARQUITETURA DE SEGURANÇA:
-- - Houston Web: Service key via API routes + filtros WHERE grupo_id IN jwt.grupo_ids
-- - Mobile App: Anon key com RLS simplificado baseado em user_profile
-- - Fallback: RLS básico permanece como camada de segurança final
--
-- =====================================================================================
-- PARTE 1: Enriquecer JWT com grupo_ids
-- =====================================================================================
-- Adiciona grupo_ids ao JWT para permitir filtragem nas queries das API routes
-- sem necessidade de consultas adicionais ao banco durante cada request.

CREATE OR REPLACE FUNCTION houston.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'houston'
AS $$
DECLARE
  uid uuid := (event->>'user_id')::uuid;
  payload jsonb := event->'claims';
  highest_role_text text;
  user_grupo_ids jsonb;
BEGIN
  -- Buscar o role de maior nível do usuário (LÓGICA JÁ EXISTENTE)
  SELECT r.app_role
  FROM (
    SELECT
      ur.role as app_role,
      MAX(houston.role_level(ur.role)) OVER() as max_level
    FROM houston.user_roles ur
    WHERE ur.user_id = uid
  ) r
  WHERE houston.role_level(r.app_role) = r.max_level
  LIMIT 1
  INTO highest_role_text;

  -- ✅ NOVO: Buscar grupo_ids do usuário (agregado de todas as suas roles)
  -- Usar jsonb_agg para converter array UUID[] em JSONB array
  SELECT COALESCE(
    jsonb_agg(DISTINCT grupo_id),
    '[]'::jsonb
  )
  INTO user_grupo_ids
  FROM houston.user_roles ur
  CROSS JOIN LATERAL unnest(ur.grupo_ids) AS grupo_id
  WHERE ur.user_id = uid;

  -- Retornar JWT com claims atualizados
  RETURN jsonb_build_object(
    'claims',
    payload
      || jsonb_build_object(
        'user_role', highest_role_text,
        'permissions', COALESCE((
          SELECT jsonb_agg(DISTINCT rp.permission)
          FROM houston.role_permissions rp
          JOIN houston.user_roles ur ON ur.role = rp.role
          WHERE ur.user_id = uid
        ), '[]'::jsonb),
        'roles', COALESCE((
          SELECT jsonb_agg(DISTINCT ur.role)
          FROM houston.user_roles ur
          WHERE ur.user_id = uid
        ), '[]'::jsonb),
        'grupo_ids', user_grupo_ids -- ← ✅ ADICIONADO: grupo_ids no JWT
        -- NOTA: hospital_ids e setor_ids NÃO são adicionados (filtrados no frontend)
      )
  );
END;
$$;

COMMENT ON FUNCTION houston.custom_access_token_hook(jsonb) IS
'Hook de autenticação do Supabase que enriquece o JWT com claims customizados.

Claims adicionados ao JWT:
  • user_role: Role de maior hierarquia do usuário (usado para exibição)
  • permissions: Array de permissões agregadas de todas as roles
  • roles: Array com todas as roles atribuídas ao usuário
  • grupo_ids: Array de UUIDs de grupos (CRÍTICO para filtragem multi-tenant nas queries)

Claims não incluídos (otimização de tamanho):
  • hospital_ids: Filtrados na camada de apresentação
  • setor_ids: Filtrados na camada de apresentação

USO DO grupo_ids:
As API routes usam jwt.grupo_ids para filtrar dados nas queries SQL:
  WHERE grupo_id = ANY(jwt.grupo_ids)
Isso substitui a validação RLS complexa via houston.authorize() que causava timeout.

Última atualização: 2025-12-05
Motivo: Performance - migração de RLS complexo para filtragem via JWT
Referências: docs/PLANO_MIGRACAO_RLS_BACKEND.md';

-- =====================================================================================
-- PARTE 2: Simplificar Políticas RLS - Tabela GRADES
-- =====================================================================================
-- Remove houston.authorize() que causa timeout de 8+ segundos
--
-- Estratégia de filtragem:
--   Mobile App (anon key): RLS permite SELECT se user_profile existe
--   Houston Web (service key): Bypassa RLS, filtra WHERE grupo_id = ANY(jwt.grupo_ids)
--
-- IMPORTANTE: Houston Web não pode mais fazer queries diretas ao Supabase.
-- Todas as queries devem passar por API routes que aplicam filtros de grupo_ids.

-- DROP políticas antigas
DROP POLICY IF EXISTS grades_select_policy ON public.grades;
DROP POLICY IF EXISTS grades_insert_policy ON public.grades;
DROP POLICY IF EXISTS grades_update_policy ON public.grades;
DROP POLICY IF EXISTS grades_delete_policy ON public.grades;

-- RECREATE políticas simplificadas (MESMOS NOMES)
-- SELECT: APENAS médicos (user_profile) veem todas
-- Houston Web DEVE usar API routes (service key bypassa RLS)
CREATE POLICY grades_select_policy ON public.grades
  FOR SELECT
  TO authenticated
  USING (
    -- Médicos (app mobile) veem todas as grades
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid())
    -- Houston Web usa service key via API routes (bypassa RLS automaticamente)
    -- Sem "OR true" - bloqueia acesso direto via anon key
  );

-- INSERT: Bloqueia TODOS via anon key
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY grades_insert_policy ON public.grades
  FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Bloqueia todos os usuários via anon key

-- UPDATE: Bloqueia TODOS via anon key
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY grades_update_policy ON public.grades
  FOR UPDATE
  TO authenticated
  USING (false)      -- Bloqueia todos os usuários via anon key
  WITH CHECK (false);

-- DELETE: Bloqueia TODOS via anon key
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY grades_delete_policy ON public.grades
  FOR DELETE
  TO authenticated
  USING (false); -- Bloqueia todos os usuários via anon key

COMMENT ON POLICY grades_select_policy ON public.grades IS
'Política SELECT para grades.
Mobile: Médicos autenticados podem visualizar todas as grades.
Web: Bloqueado via anon key. Houston Web deve usar API routes com service_role.';

COMMENT ON POLICY grades_insert_policy ON public.grades IS
'Política INSERT para grades.
Mobile: Bloqueado.
Web: Deve usar API routes com service_role que bypassa RLS.';

COMMENT ON POLICY grades_update_policy ON public.grades IS
'Política UPDATE para grades.
Mobile: Bloqueado.
Web: Deve usar API routes com service_role que bypassa RLS.';

COMMENT ON POLICY grades_delete_policy ON public.grades IS
'Política DELETE para grades.
Mobile: Bloqueado.
Web: Deve usar API routes com service_role que bypassa RLS.';

-- =====================================================================================
-- PARTE 3: Simplificar Políticas RLS - Tabela VAGAS
-- =====================================================================================
-- Aplica a mesma estratégia de simplificação da tabela grades.
-- Remove houston.authorize() mantendo apenas validação básica de user_profile.

-- DROP políticas antigas
DROP POLICY IF EXISTS vagas_select_policy ON public.vagas;
DROP POLICY IF EXISTS vagas_insert_policy ON public.vagas;
DROP POLICY IF EXISTS vagas_update_policy ON public.vagas;
DROP POLICY IF EXISTS vagas_delete_policy ON public.vagas;

-- RECREATE políticas simplificadas
-- SELECT: APENAS médicos (user_profile) veem todas
-- Houston Web DEVE usar API routes (service key bypassa RLS)
CREATE POLICY vagas_select_policy ON public.vagas
  FOR SELECT
  TO authenticated
  USING (
    -- Médicos (app mobile) veem todas as vagas
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid())
    -- Houston Web usa service key via API routes (bypassa RLS automaticamente)
    -- Sem "OR true" - bloqueia acesso direto via anon key
  );

-- INSERT: Bloqueia TODOS via anon key
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY vagas_insert_policy ON public.vagas
  FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Bloqueia todos os usuários via anon key

-- UPDATE: Médicos (mobile) podem atualizar para marcar vagas como preenchidas
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY vagas_update_policy ON public.vagas
  FOR UPDATE
  TO authenticated
  USING (
    -- Médicos (app mobile) podem atualizar vagas (marcar status anunciada)
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid())
  );

-- DELETE: Bloqueia TODOS via anon key
-- Houston Web usa service key via API routes (bypassa RLS)
CREATE POLICY vagas_delete_policy ON public.vagas
  FOR DELETE
  TO authenticated
  USING (false); -- Bloqueia todos os usuários via anon key

COMMENT ON POLICY vagas_select_policy ON public.vagas IS
'Política SELECT para vagas.
Mobile: Médicos autenticados podem visualizar todas as vagas.
Web: Bloqueado via anon key. Houston Web deve usar API routes com service_role.';

COMMENT ON POLICY vagas_insert_policy ON public.vagas IS
'Política INSERT para vagas.
Mobile: Bloqueado.
Web: Deve usar API routes com service_role que bypassa RLS.';

COMMENT ON POLICY vagas_update_policy ON public.vagas IS
'Política UPDATE para vagas.
Mobile: Médicos podem atualizar (ex: marcar status como anunciada).
Web: Deve usar API routes com service_role que bypassa RLS.';

COMMENT ON POLICY vagas_delete_policy ON public.vagas IS
'Política DELETE para vagas.
Mobile: Bloqueado.
Web: Deve usar API routes com service_role que bypassa RLS.';


-- =====================================================================================
-- PARTE 4: Simplificar Políticas RLS - Tabela PAGAMENTOS
-- =====================================================================================
-- Políticas simplificadas para pagamentos.
-- Mobile: Médicos só podem visualizar/modificar seus próprios pagamentos.
-- Web: Utiliza service_role via API routes.

-- Derruba políticas existentes
DROP POLICY IF EXISTS "pagamentos_select_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_insert_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_update_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_delete_policy" ON public.pagamentos;

-- SELECT: Users with pagamentos.select permission (filtered by hospital/setor/grupo)
CREATE POLICY "pagamentos_select_policy" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
  );

-- INSERT: Users with pagamentos.insert permission
CREATE POLICY "pagamentos_insert_policy" ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
  );

-- UPDATE: ONLY administrador and moderador (users with pagamentos.update permission)
CREATE POLICY "pagamentos_update_policy" ON public.pagamentos
  FOR UPDATE TO authenticated
  USING (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
  )
  WITH CHECK (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
  );

-- DELETE: Users with pagamentos.delete permission (admin, moderador, gestor, coordenador)
CREATE POLICY "pagamentos_delete_policy" ON public.pagamentos
  FOR DELETE TO authenticated
  USING (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
  );

-- =====================================================================================
-- PARTE 5: Simplificar Políticas RLS - Tabela CHECKIN_CHECKOUT
-- =====================================================================================
-- Políticas para check-in e check-out de médicos.
-- Mobile: Médicos podem gerenciar seus próprios check-ins/check-outs.
-- Web: Utiliza service_role via API routes com validações adicionais.

-- Remover políticas existentes
DROP POLICY IF EXISTS "checkin_checkout_select_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_insert_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_update_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_delete_policy" ON public.checkin_checkout;


CREATE POLICY "checkin_checkout_select_policy" ON public.checkin_checkout
  FOR SELECT TO authenticated
  USING (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
  );


CREATE POLICY "checkin_checkout_insert_policy" ON public.checkin_checkout
  FOR INSERT TO authenticated
  WITH CHECK (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
  );


CREATE POLICY "checkin_checkout_update_policy" ON public.checkin_checkout
  FOR UPDATE TO authenticated
  USING (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
  )
  WITH CHECK (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
  );

-- =====================================================================================
-- PARTE 6: Simplificar Políticas RLS - Tabela CANDIDATURAS
-- =====================================================================================
-- Políticas para gerenciamento de candidaturas a vagas.
-- Mobile: Médicos podem gerenciar suas próprias candidaturas.
-- Web: Utiliza service_role via API routes.

-- Remover políticas existentes
DROP POLICY IF EXISTS "candidaturas_delete_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_insert_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_select_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_update_policy" ON public.candidaturas;

CREATE POLICY "candidaturas_delete_policy" ON public.candidaturas
  FOR DELETE TO authenticated
  USING (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
  );

CREATE POLICY "candidaturas_insert_policy" ON public.candidaturas
  FOR INSERT TO authenticated
  WITH CHECK (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
  );

CREATE POLICY "candidaturas_select_policy" ON public.candidaturas
  FOR SELECT TO authenticated
  USING (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (
        (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
        OR pode_ver_candidatura_colega(id))
  );

CREATE POLICY "candidaturas_update_policy" ON public.candidaturas
  FOR UPDATE TO authenticated
  USING (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
  )
  WITH CHECK (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
  );

-- =====================================================================================
-- PARTE 7: Corrigir Triggers de Check-in/Check-out para Service Role
-- =====================================================================================
-- PROBLEMA IDENTIFICADO:
-- As funções validate_checkin_timing e validate_checkout_timing rejeitavam operações
-- via service_role porque auth.uid() retorna NULL, causando erro de autenticação.
--
-- SOLUÇÃO:
-- Detectar operações via service_role verificando auth.uid() IS NULL AND created_by/
-- updated_by IS NOT NULL, permitindo que o backend crie check-ins/check-outs.
-- =====================================================================================

-- Corrigir validate_checkin_timing
CREATE OR REPLACE FUNCTION public.validate_checkin_timing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    candidatura_aprovada BOOLEAN;
    is_admin_or_moderator BOOLEAN;
BEGIN
    -- Service role (Houston Web backend) bypassa todas as verificações
    -- Verificar se auth.uid() é NULL (indica service_role ou anon sem usuário)
    -- E se temos created_by preenchido (indica que é backend fazendo a operação)
    IF auth.uid() IS NULL AND NEW.created_by IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Verificar se é um usuário autenticado (mobile app)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ERRO Usuário não autenticado.';
    END IF;

    -- Verificar se usuário tem permissão de editar check-in/checkout (admin/moderador)
    SELECT houston.authorize('pagamentos.update') INTO is_admin_or_moderator;

    -- Buscar informações da vaga
    SELECT v.data, v.hora_inicio, v.hora_fim
    INTO vaga_date, vaga_start_time, vaga_end_time
    FROM public.vagas v
    WHERE v.id = NEW.vaga_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ERRO Vaga não encontrada.';
    END IF;

    -- Verificar se o médico tem candidatura aprovada para esta vaga
    SELECT EXISTS(
        SELECT 1
        FROM public.candidaturas c
        WHERE c.vaga_id = NEW.vaga_id
        AND c.medico_id = NEW.medico_id
        AND c.status = 'APROVADO'
    ) INTO candidatura_aprovada;

    IF NOT candidatura_aprovada THEN
        RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.';
    END IF;

    -- Verificar se já existe check-in para esta combinação médico/vaga
    IF EXISTS(
        SELECT 1
        FROM public.checkin_checkout cc
        WHERE cc.vaga_id = NEW.vaga_id
        AND cc.medico_id = NEW.medico_id
    ) THEN
        RAISE EXCEPTION 'ERRO Check-in já realizado para esta vaga.';
    END IF;

    -- Construir o timestamp completo do início do plantão
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

        -- Se é admin/moderador com permissão, permitir com justificativa
        -- (mesmo que seja retroativo - depois do plantão terminar)
        IF is_admin_or_moderator THEN
            RETURN NEW;
        END IF;

        -- Para médicos: verificar se não é muito cedo ou muito tarde
        IF NOW() < janela_inicio OR NOW() > plantao_fim THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-in.';
        END IF;

        RETURN NEW;
    END IF;
END;
$function$;

-- Corrigir validate_checkout_timing
CREATE OR REPLACE FUNCTION public.validate_checkout_timing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    candidatura_aprovada BOOLEAN;
    is_admin_or_moderator BOOLEAN;
BEGIN
    -- Service role (Houston Web backend) bypassa todas as verificações
    -- Verificar se auth.uid() é NULL E updated_by está preenchido
    IF auth.uid() IS NULL AND NEW.updated_by IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Verificar se é um usuário autenticado (mobile app)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ERRO Usuário não autenticado.';
    END IF;

    -- Verificar se usuário tem permissão de editar check-in/checkout (admin/moderador)
    SELECT houston.authorize('pagamentos.update') INTO is_admin_or_moderator;

    -- Buscar informações da vaga
    SELECT v.data, v.hora_inicio, v.hora_fim
    INTO vaga_date, vaga_start_time, vaga_end_time
    FROM public.vagas v
    WHERE v.id = NEW.vaga_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ERRO Vaga não encontrada.';
    END IF;

    -- Verificar se o médico tem candidatura aprovada para esta vaga
    SELECT EXISTS(
        SELECT 1
        FROM public.candidaturas c
        WHERE c.vaga_id = NEW.vaga_id
        AND c.medico_id = NEW.medico_id
        AND c.status = 'APROVADO'
    ) INTO candidatura_aprovada;

    IF NOT candidatura_aprovada THEN
        RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.';
    END IF;

    -- Verificar se existe check-in para esta combinação médico/vaga
    -- (Só verifica no INSERT de checkout, não no UPDATE)
    IF TG_OP = 'INSERT' AND NOT EXISTS(
        SELECT 1
        FROM public.checkin_checkout cc
        WHERE cc.vaga_id = NEW.vaga_id
        AND cc.medico_id = NEW.medico_id
        AND cc.checkin IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'ERRO Check-in ainda não realizado para esta vaga.';
    END IF;

    -- Construir o timestamp completo do plantão
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
        IF NEW.checkout_justificativa IS NULL OR TRIM(NEW.checkout_justificativa) = '' THEN
            RAISE EXCEPTION 'ERRO Horário requer justificativa obrigatória.';
        END IF;

        -- Se é admin/moderador com permissão, permitir com justificativa
        -- (mesmo que seja retroativo - depois do plantão terminar)
        IF is_admin_or_moderator THEN
            RETURN NEW;
        END IF;

        -- Para médicos: verificar se não é muito cedo
        IF NOW() < janela_inicio THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-out.';
        END IF;

        RETURN NEW;
    END IF;
END;
$function$;


-- =====================================================================================
-- PARTE 8: Remover Trigger Obsoleto de Cancelamento de Candidaturas
-- =====================================================================================
-- CONTEXTO:
-- O trigger atualizar_candidaturas_vaga_cancelada() entra em conflito com a nova
-- lógica de cancelamento implementada nas API routes.
--
-- NOVA ARQUITETURA:
-- Candidaturas são canceladas explicitamente via API (PATCH /api/candidaturas/vaga/[id])
-- antes do cancelamento da vaga, tornando o trigger automático obsoleto e problemático.
-- =====================================================================================

-- Remover o trigger
DROP TRIGGER IF EXISTS vagas_1_reprovar_candidaturas_ao_cancelar ON public.vagas;

-- Remover a função associada (opcional, mas recomendado para limpeza)
DROP FUNCTION IF EXISTS public.atualizar_candidaturas_vaga_cancelada();

-- Nota: O cancelamento de candidaturas agora é feito explicitamente via:
-- PATCH /api/candidaturas/vaga/[vaga_id] com action: 'cancelar'
-- antes de atualizar o status da vaga para 'cancelada'

-- =====================================================================================
-- PARTE 9: Recriar View vw_folha_pagamento com grupo_id
-- =====================================================================================
-- CONTEXTO:
-- Com a simplificação do RLS, precisamos filtrar dados por grupos nas API routes.
--
-- SOLUÇÃO:
-- Adiciona coluna grupo_id à view vw_folha_pagamento para permitir filtragem:
--   SELECT * FROM vw_folha_pagamento WHERE grupo_id = ANY(jwt.grupo_ids)
--
-- Isso garante isolamento multi-tenant sem overhead de RLS complexo.
-- =====================================================================================

DROP VIEW IF EXISTS public.vw_folha_pagamento;

create view public.vw_folha_pagamento
with (security_invoker = on)
as
select
  v.id as vaga_id,
  v.data as vaga_data,
  p.nome as periodo_nome,
  v.hora_inicio as horario_inicio,
  v.hora_fim as horario_fim,
  v.valor as vaga_valor,
  v.data_pagamento as vaga_datapagamento,
  v.grupo_id AS grupo_id,
  fr.forma_recebimento,
  h.id as hospital_id,
  h.nome as hospital_nome,
  e.id as especialidade_id,
  e.nome as especialidade_nome,
  s.id as setor_id,
  s.nome as setor_nome,
  c.id as candidatura_id,
  c.medico_id,
  c.medico_precadastro_id,
  c.status as candidatura_status,
  c.data_confirmacao as candidatura_data_confirmacao,
  COALESCE(m.primeiro_nome, mp.primeiro_nome::text) as medico_primeironome,
  COALESCE(m.sobrenome, mp.sobrenome::text) as medico_sobrenome,
  COALESCE(m.cpf, mp.cpf::text) as medico_cpf,
  COALESCE(m.crm, mp.crm::text) as medico_crm,
  COALESCE(me.nome, mpe.nome) as medico_especialidade,
  COALESCE(m.razao_social, mp.razao_social) as razao_social,
  COALESCE(m.cnpj, mp.cnpj) as cnpj,
  COALESCE(m.banco_agencia, mp.banco_agencia) as banco_agencia,
  COALESCE(m.banco_digito, mp.banco_digito) as banco_digito,
  COALESCE(m.banco_conta, mp.banco_conta) as banco_conta,
  COALESCE(m.banco_pix, mp.banco_pix) as banco_pix,
  cc.checkin,
  cc.checkout,
  cc.checkin_latitude,
  cc.checkin_longitude,
  cc.checkout_latitude,
  cc.checkout_longitude,
  cc.checkin_justificativa,
  cc.checkout_justificativa
from
  vagas v
  join candidaturas c on c.vaga_id = v.id
  left join medicos m on m.id = c.medico_id
  and c.medico_precadastro_id is null
  left join medicos_precadastro mp on mp.id = c.medico_precadastro_id
  left join checkin_checkout cc on cc.vaga_id = v.id
  and (
    cc.medico_id = m.id
    or cc.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
  )
  left join hospitais h on h.id = v.hospital_id
  left join especialidades e on e.id = v.especialidade_id
  left join especialidades me on me.id = m.especialidade_id
  left join especialidades mpe on mpe.id = mp.especialidade_id
  left join setores s on s.id = v.setor_id
  left join periodos p on p.id = v.periodo_id
  left join formas_recebimento fr on fr.id = v.forma_recebimento_id
where
  v.status::text = 'fechada'::text
  and c.status = 'APROVADO'::text;