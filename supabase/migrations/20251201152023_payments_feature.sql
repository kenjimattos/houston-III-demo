-- =====================================================================================
-- Migration: payments_feature
-- Description: Sistema completo de pagamentos - permissões, schema, RLS, triggers, view e RPCs
-- Epic #390: Sistema de Pagamentos
-- =====================================================================================

-- =========================================================================
-- FASE 1: ENUM PERMISSIONS
-- =========================================================================
-- IMPORTANTE: ALTER TYPE ADD VALUE nao pode ser usado na mesma transacao
-- que utiliza os novos valores.

-- Pagamentos permissions
ALTER TYPE houston.app_permission ADD VALUE IF NOT EXISTS 'pagamentos.select';
ALTER TYPE houston.app_permission ADD VALUE IF NOT EXISTS 'pagamentos.insert';
ALTER TYPE houston.app_permission ADD VALUE IF NOT EXISTS 'pagamentos.update';
ALTER TYPE houston.app_permission ADD VALUE IF NOT EXISTS 'pagamentos.delete';


-- IMPORTANTE: Commit para que os novos valores do ENUM fiquem disponíveis
COMMIT;

-- =========================================================================
-- FASE 2: ROLE PERMISSIONS DATA
-- =========================================================================

-- Administrador: ALL permissions (SELECT, INSERT, UPDATE, DELETE)
INSERT INTO houston.role_permissions (role, permission) VALUES
  ('administrador', 'pagamentos.select'),
  ('administrador', 'pagamentos.insert'),
  ('administrador', 'pagamentos.update'),
  ('administrador', 'pagamentos.delete')
ON CONFLICT DO NOTHING;

-- Moderador: ALL permissions (SELECT, INSERT, UPDATE, DELETE)
INSERT INTO houston.role_permissions (role, permission) VALUES
  ('moderador', 'pagamentos.select'),
  ('moderador', 'pagamentos.insert'),
  ('moderador', 'pagamentos.update'),
  ('moderador', 'pagamentos.delete')
ON CONFLICT DO NOTHING;

-- Gestor: SELECT, INSERT, UPDATE, DELETE (com UPDATE para autorizar pagamentos e bypass de checkin/checkout retroativo)
INSERT INTO houston.role_permissions (role, permission) VALUES
  ('gestor', 'pagamentos.select'),
  ('gestor', 'pagamentos.insert'),
  ('gestor', 'pagamentos.update')
ON CONFLICT DO NOTHING;

-- Coordenador: SELECT, INSERT, UPDATE, DELETE (com UPDATE para autorizar pagamentos e bypass de checkin/checkout retroativo)
INSERT INTO houston.role_permissions (role, permission) VALUES
  ('coordenador', 'pagamentos.select'),
  ('coordenador', 'pagamentos.insert'),
  ('coordenador', 'pagamentos.update')
ON CONFLICT DO NOTHING;

-- Escalista: SELECT, INSERT only (NO UPDATE, NO DELETE)
INSERT INTO houston.role_permissions (role, permission) VALUES
  ('escalista', 'pagamentos.select'),
  ('escalista', 'pagamentos.insert')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- FASE 3: SCHEMA CHANGES - checkin_checkout
-- =========================================================================

-- Permitir NULL na coluna checkin (gestor pode criar registro sem preencher checkin)
ALTER TABLE public.checkin_checkout ALTER COLUMN checkin DROP NOT NULL;

-- Add status and approval columns
ALTER TABLE public.checkin_checkout
ADD COLUMN IF NOT EXISTS checkin_status text DEFAULT 'PENDENTE',
ADD COLUMN IF NOT EXISTS checkout_status text DEFAULT 'PENDENTE',
ADD COLUMN IF NOT EXISTS checkin_aprovado_por uuid,
ADD COLUMN IF NOT EXISTS checkin_aprovado_em timestamptz,
ADD COLUMN IF NOT EXISTS checkout_aprovado_por uuid,
ADD COLUMN IF NOT EXISTS checkout_aprovado_em timestamptz,
ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- Add check constraints for status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkin_status_check'
    ) THEN
        ALTER TABLE public.checkin_checkout
        ADD CONSTRAINT checkin_status_check CHECK (
            checkin_status = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'REJEITADO'::text])
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkout_status_check'
    ) THEN
        ALTER TABLE public.checkin_checkout
        ADD CONSTRAINT checkout_status_check CHECK (
            checkout_status = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'REJEITADO'::text])
        );
    END IF;
END $$;

-- Add FK for checkin_aprovado_por (aponta para escalistas.id que é o auth.uid())
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkin_checkout_checkin_aprovado_por_fkey'
    ) THEN
        ALTER TABLE public.checkin_checkout
        ADD CONSTRAINT checkin_checkout_checkin_aprovado_por_fkey
        FOREIGN KEY (checkin_aprovado_por) REFERENCES public.escalistas(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- Add FK for checkout_aprovado_por (aponta para escalistas.id que é o auth.uid())
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkin_checkout_checkout_aprovado_por_fkey'
    ) THEN
        ALTER TABLE public.checkin_checkout
        ADD CONSTRAINT checkin_checkout_checkout_aprovado_por_fkey
        FOREIGN KEY (checkout_aprovado_por) REFERENCES public.escalistas(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- Add UNIQUE constraint for vaga_id + medico_id (prevent duplicate checkins)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkin_checkout_vaga_medico_unique'
    ) THEN
        ALTER TABLE public.checkin_checkout
        ADD CONSTRAINT checkin_checkout_vaga_medico_unique UNIQUE (vaga_id, medico_id);
    END IF;
END $$;

-- =========================================================================
-- FASE 4: SCHEMA CHANGES - pagamentos
-- =========================================================================

-- Drop existing policies FIRST (they depend on medicos_id column)
DROP POLICY IF EXISTS "pagamentos_select_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_insert_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_update_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_delete_policy" ON public.pagamentos;

-- Add status and authorization columns
ALTER TABLE public.pagamentos
ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDENTE',
ADD COLUMN IF NOT EXISTS autorizado_por uuid,
ADD COLUMN IF NOT EXISTS autorizado_em timestamptz,
ADD COLUMN IF NOT EXISTS pago_em timestamptz,
ADD COLUMN IF NOT EXISTS pago_por uuid,
ADD COLUMN IF NOT EXISTS medicos_id uuid;

-- Remove unused column (policies already dropped above)
-- NOTE: medicos_id is kept for backwards compatibility with seed data
ALTER TABLE public.pagamentos DROP COLUMN IF EXISTS created_by;

-- Add check constraint for payment status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_status_check'
    ) THEN
        ALTER TABLE public.pagamentos
        ADD CONSTRAINT pagamentos_status_check CHECK (
            status = ANY (ARRAY['PENDENTE'::text, 'AUTORIZADO'::text, 'PAGO'::text])
        );
    END IF;
END $$;

-- Add FK for autorizado_por (aponta para escalistas.id que é o auth.uid())
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_autorizado_por_fkey'
    ) THEN
        ALTER TABLE public.pagamentos
        ADD CONSTRAINT pagamentos_autorizado_por_fkey
        FOREIGN KEY (autorizado_por) REFERENCES public.escalistas(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- Add FK for pago_por (aponta para escalistas.id que é o auth.uid())
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_pago_por_fkey'
    ) THEN
        ALTER TABLE public.pagamentos
        ADD CONSTRAINT pagamentos_pago_por_fkey
        FOREIGN KEY (pago_por) REFERENCES public.escalistas(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- Add UNIQUE constraint for candidatura_id (prevent duplicate payments)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_candidatura_unique'
    ) THEN
        ALTER TABLE public.pagamentos
        ADD CONSTRAINT pagamentos_candidatura_unique UNIQUE (candidatura_id);
    END IF;
END $$;

-- =========================================================================
-- FASE 5: RLS POLICIES - pagamentos
-- =========================================================================

-- NOTE: Policies were already dropped in FASE 4 before dropping medicos_id column

-- SELECT: Users with pagamentos.select permission (filtered by hospital/setor/grupo)
CREATE POLICY "pagamentos_select_policy" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('pagamentos.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- INSERT: Users with pagamentos.insert permission
CREATE POLICY "pagamentos_insert_policy" ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('pagamentos.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- UPDATE: ONLY administrador and moderador (users with pagamentos.update permission)
CREATE POLICY "pagamentos_update_policy" ON public.pagamentos
  FOR UPDATE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  )
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- DELETE: Users with pagamentos.delete permission (admin, moderador, gestor, coordenador)
CREATE POLICY "pagamentos_delete_policy" ON public.pagamentos
  FOR DELETE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('pagamentos.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- =========================================================================
-- FASE 6: RLS POLICIES - checkin_checkout
-- =========================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "checkin_checkout_select_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_insert_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_update_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_delete_policy" ON public.checkin_checkout;


CREATE POLICY "checkin_checkout_select_policy" ON public.checkin_checkout
  FOR SELECT
  USING (
    (
      -- Medico can see their own checkins
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR
    (
      -- Houston users with permission
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = checkin_checkout.vaga_id
        AND houston.authorize('pagamentos.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );


CREATE POLICY "checkin_checkout_insert_policy" ON public.checkin_checkout
  FOR INSERT
  WITH CHECK (
    (
      -- Medico can insert their own checkins
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR
    (
      -- Houston users with permission
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = checkin_checkout.vaga_id
        AND houston.authorize('pagamentos.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );


CREATE POLICY "checkin_checkout_update_policy" ON public.checkin_checkout
  FOR UPDATE
  USING (
    (
      -- Medico can update their own checkins
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR
    (
      -- Houston users with UPDATE permission (only admin/moderador)
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = checkin_checkout.vaga_id
        AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  )
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = checkin_checkout.vaga_id
        AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );


CREATE POLICY "checkin_checkout_delete_policy" ON public.checkin_checkout
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vagas v
      WHERE v.id = checkin_checkout.vaga_id
      AND houston.authorize('pagamentos.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

-- =========================================================================
-- FASE 7: TRIGGERS - validate_checkin_timing / validate_checkout_timing
-- =========================================================================

-- Atualizar função validate_checkin_timing (permite admin/moderador bypass)
CREATE OR REPLACE FUNCTION validate_checkin_timing()
RETURNS TRIGGER AS $$
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
    is_admin_or_moderator BOOLEAN;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função validate_checkout_timing (permite admin/moderador bypass)
CREATE OR REPLACE FUNCTION validate_checkout_timing()
RETURNS TRIGGER AS $$
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
    is_admin_or_moderator BOOLEAN;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários explicativos
COMMENT ON FUNCTION validate_checkin_timing() IS
'Valida o timing do check-in. Permite:
- Dentro da janela (15min antes/depois do início): sem justificativa
- Fora da janela mas durante plantão: com justificativa
- Admin/moderador com permissão checkin_checkout.update: com justificativa (mesmo retroativo)
- Bloqueia médicos tentando check-in muito cedo ou depois do plantão';

COMMENT ON FUNCTION validate_checkout_timing() IS
'Valida o timing do checkout. Permite:
- Dentro da janela (15min antes/depois do fim): sem justificativa
- Fora da janela: com justificativa
- Admin/moderador com permissão checkin_checkout.update: com justificativa (mesmo retroativo)
- Bloqueia médicos tentando checkout muito cedo';

-- =========================================================================
-- FASE 8: VIEW - vw_plantoes_pagamentos
-- =========================================================================

CREATE OR REPLACE VIEW public.vw_plantoes_pagamentos
WITH (security_invoker = on)
AS
SELECT
    row_number() OVER (ORDER BY v.id, c.id) AS idx,
    c.id AS plantao_id,
    c.id AS candidatura_id,
    v.id AS vaga_id,
    COALESCE(m.id, mp.id) AS medico_id,
    h.id AS hospital_id,
    s.id AS setor_id,
    e.id AS especialidade_id,
    esc.id AS escalista_id,
    v.data AS vaga_data,
    v.hora_inicio AS vaga_horainicio,
    v.hora_fim AS vaga_horafim,
    v.valor AS vaga_valor,
    v.status AS vaga_status,
    h.nome AS hospital_nome,
    s.nome AS setor_nome,
    e.nome AS especialidade_nome,
    esc.nome AS escalista_nome,
    COALESCE(m.primeiro_nome, mp.primeiro_nome::text) AS medico_primeiro_nome,
    COALESCE(m.sobrenome, mp.sobrenome::text) AS medico_sobrenome,
    CONCAT(
        COALESCE(m.primeiro_nome, mp.primeiro_nome::text),
        ' ',
        COALESCE(m.sobrenome, mp.sobrenome::text)
    ) AS medico_nome,
    COALESCE(m.cpf, mp.cpf::text) AS medico_cpf,
    COALESCE(m.crm, mp.crm::text) AS medico_crm,
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
JOIN vagas v ON c.vaga_id = v.id
JOIN hospitais h ON v.hospital_id = h.id
JOIN setores s ON v.setor_id = s.id
JOIN especialidades e ON v.especialidade_id = e.id
LEFT JOIN escalistas esc ON v.escalista_id = esc.id
LEFT JOIN medicos m ON c.medico_id = m.id
    AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
LEFT JOIN medicos_precadastro mp ON c.medico_precadastro_id = mp.id
LEFT JOIN checkin_checkout cc ON cc.vaga_id = v.id
    AND cc.medico_id = COALESCE(NULLIF(c.medico_id, '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid), c.medico_precadastro_id)
LEFT JOIN pagamentos pg ON pg.candidatura_id = c.id
LEFT JOIN escalistas esc_pag ON pg.autorizado_por = esc_pag.id
LEFT JOIN escalistas esc_pago ON pg.pago_por = esc_pago.id
LEFT JOIN escalistas esc_checkin ON cc.checkin_aprovado_por = esc_checkin.id
LEFT JOIN escalistas esc_checkout ON cc.checkout_aprovado_por = esc_checkout.id
WHERE
    v.status = 'fechada'
    AND c.status = 'APROVADO'
    AND v.data <= CURRENT_DATE;

-- Grant access to authenticated users
GRANT SELECT ON public.vw_plantoes_pagamentos TO authenticated;

-- =========================================================================
-- FASE 9: INDEXES
-- =========================================================================

-- Index for checkin_checkout lookups
CREATE INDEX IF NOT EXISTS idx_checkin_checkout_vaga_medico
ON public.checkin_checkout(vaga_id, medico_id);

-- Index for checkin_checkout status filtering
CREATE INDEX IF NOT EXISTS idx_checkin_checkout_status
ON public.checkin_checkout(checkin_status, checkout_status);

-- Index for pagamentos status filtering
CREATE INDEX IF NOT EXISTS idx_pagamentos_status
ON public.pagamentos(status);

-- Index for pagamentos candidatura lookup
CREATE INDEX IF NOT EXISTS idx_pagamentos_candidatura
ON public.pagamentos(candidatura_id);

-- Index for vagas date and status (used in view WHERE clause)
CREATE INDEX IF NOT EXISTS idx_vagas_data_status
ON public.vagas(data, status);

-- =========================================================================
-- FASE 10: RPC FUNCTIONS
-- =========================================================================

-- Função para autorizar pagamento (bypassa problema de RLS no retorno)
CREATE OR REPLACE FUNCTION public.autorizar_pagamento(
  p_pagamento_id uuid,
  p_user_id uuid,
  p_timestamp timestamptz DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem permissão (usando a mesma lógica do RLS)
  IF NOT EXISTS (
    SELECT 1 FROM pagamentos pg
    JOIN vagas v ON v.id = pg.vaga_id
    WHERE pg.id = p_pagamento_id
    AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para autorizar este pagamento';
  END IF;

  -- Executar o update
  UPDATE pagamentos
  SET
    status = 'AUTORIZADO',
    autorizado_por = p_user_id,
    autorizado_em = p_timestamp
  WHERE id = p_pagamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;
END;
$$;

-- Função para marcar como pago
CREATE OR REPLACE FUNCTION public.marcar_pagamento_pago(
  p_pagamento_id uuid,
  p_user_id uuid,
  p_timestamp timestamptz DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM pagamentos pg
    JOIN vagas v ON v.id = pg.vaga_id
    WHERE pg.id = p_pagamento_id
    AND houston.authorize('pagamentos.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para marcar este pagamento como pago';
  END IF;

  -- Executar o update
  UPDATE pagamentos
  SET
    status = 'PAGO',
    pago_em = p_timestamp,
    pago_por = p_user_id
  WHERE id = p_pagamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;
END;
$$;
