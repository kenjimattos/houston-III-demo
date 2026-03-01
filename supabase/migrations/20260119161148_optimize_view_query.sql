-- ============================================================================
-- Migration: Otimizar queries na view Vw_vagas_candidaturas
-- Data: 2026-01-19
-- Problema: Timeout nas queries da view vw_vagas_candidaturas em queries feitas pelo app
--
-- Causa raiz: A função pode_ver_candidatura_colega é chamada para CADA linha
-- da tabela candidaturas (3000+), e cada chamada faz 2 queries adicionais,
-- resultando em ~6000 queries por request = timeout.
--
-- Solução: Criar nova função com:
--   1. STABLE marker para caching dentro da mesma query
--   2. LIMIT 1 no EXISTS para parar na primeira correspondência
--   3. Índices específicos para as queries da função
-- ============================================================================

-- ===========================================
-- PARTE 1: Criar índices de suporte
-- ===========================================

-- Índice para buscar candidaturas por médico e status (usado na verificação)
CREATE INDEX IF NOT EXISTS idx_candidaturas_medico_status
ON public.candidaturas(medico_id, status);

-- Índice para buscar candidaturas por status e vaga (usado na primeira query)
CREATE INDEX IF NOT EXISTS idx_candidaturas_status_vaga
ON public.candidaturas(status, vaga_id);

-- Índice para buscar vagas por hospital e setor (usado no JOIN)
CREATE INDEX IF NOT EXISTS idx_vagas_hospital_setor
ON public.vagas(hospital_id, setor_id);


-- ===========================================
-- PARTE 2: Função otimizada
-- ===========================================

DROP POLICY IF EXISTS candidaturas_select_policy ON public.candidaturas;

DROP FUNCTION IF EXISTS pode_ver_candidatura_colega;

CREATE OR REPLACE FUNCTION public.filtrar_candidaturas(candidatura_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- IMPORTANTE: Indica que a função retorna mesmo resultado para mesmos inputs na mesma transação
        -- Isso permite ao PostgreSQL cachear resultados e evitar re-execuções desnecessárias
AS $function$
DECLARE
    current_user_id UUID;
    candidatura_hospital UUID;
    candidatura_setor UUID;
BEGIN
    current_user_id := auth.uid();

    -- Se não há usuário autenticado, retorna false imediatamente
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Buscar hospital e setor da candidatura que está sendo verificada
    -- Apenas candidaturas APROVADAS podem ser vistas por colegas
    SELECT v.hospital_id, v.setor_id
    INTO candidatura_hospital, candidatura_setor
    FROM public.candidaturas c
    JOIN public.vagas v ON c.vaga_id = v.id
    WHERE c.id = candidatura_id
      AND c.status = 'APROVADO';

    -- Se não encontrou dados ou candidatura não é aprovada, retorna false
    IF candidatura_hospital IS NULL OR candidatura_setor IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o médico atual tem candidatura aprovada no mesmo hospital/setor
    -- LIMIT 1 garante que a query para assim que encontrar um match
    RETURN EXISTS (
        SELECT 1
        FROM public.candidaturas c_user
        JOIN public.vagas v_user ON c_user.vaga_id = v_user.id
        WHERE c_user.medico_id = current_user_id
          AND c_user.status = 'APROVADO'
          AND v_user.hospital_id = candidatura_hospital
          AND v_user.setor_id = candidatura_setor
        LIMIT 1
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$;

CREATE POLICY "candidaturas_select_policy" ON public.candidaturas
  FOR SELECT TO authenticated
  USING (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (
        (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
        OR filtrar_candidaturas(id))
  );

-- ===========================================
-- PARTE 3: Documentação
-- ===========================================

COMMENT ON FUNCTION public.filtrar_candidaturas(uuid) IS
'Verifica se o usuário atual pode ver uma candidatura de colega.

REGRA DE NEGÓCIO:
Um médico pode ver candidaturas de colegas se ambos têm candidaturas
APROVADAS no mesmo hospital E setor.

OTIMIZAÇÕES (v2 - 2026-01-19):
- STABLE: Permite caching de resultados dentro da mesma query
- LIMIT 1: Para execução assim que encontra match
- Índices dedicados para as queries internas

PROBLEMA ORIGINAL:
A função era chamada ~3000 vezes por request (uma para cada candidatura),
cada chamada fazendo 2 queries = ~6000 queries = timeout de 8+ segundos.';

