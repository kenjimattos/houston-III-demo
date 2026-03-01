-- =====================================================================================
-- Migration: Padronização Completa da Gestão de Grupos
-- =====================================================================================
-- Data: 2025-12-07
-- Objetivo: Padronizar e consolidar toda a gestão de grupos no sistema
--
-- CONTEXTO:
-- Com a refatoração para API routes usando filtragem via JWT (migração 20251205),
-- identificamos inconsistências na gestão de grupos:
-- 1. Nomenclatura mista: JWT usa "grupo_ids" mas banco usava "group_ids"
-- 2. Múltiplas funções de autorização: authorize(), authorize_simple(), group_authorization()
-- 3. Manutenção complexa: 3 funções com lógica sobreposta
--
-- PROBLEMAS RESOLVIDOS:
-- ❌ Código misturava inglês (group_ids) e português (grupo_ids)
-- ❌ Confusão entre coluna do banco e claim do JWT
-- ❌ 3 funções de autorização (authorize, authorize_simple, group_authorization)
-- ❌ Wrapper functions desnecessárias (authorize_simple era só wrapper de authorize)
-- ❌ 33 ocorrências de funções redundantes em políticas RLS
--
-- SOLUÇÃO UNIFICADA:
-- 1. ✅ Renomear houston.user_roles.group_ids → grupo_ids
-- 2. ✅ Consolidar em UMA função: houston.authorize()
-- 3. ✅ Remover funções wrapper: authorize_simple() e group_authorization()
-- 4. ✅ Atualizar TODAS as políticas RLS para usar authorize() diretamente
-- 5. ✅ Documentar padrões de uso consistentes
--
-- IMPACTO:
-- ✅ Nomenclatura padronizada: "grupo_ids" em todo lugar
-- ✅ Função única de autorização: houston.authorize()
-- ✅ Manutenção simplificada: 1 função em vez de 3
-- ✅ Performance idêntica: mesma lógica, menos overhead
-- ⚠️  Breaking: authorize_simple() e group_authorization() não existem mais
--
-- =====================================================================================
-- PARTE 1: Renomear Coluna na Tabela houston.user_roles
-- =====================================================================================

ALTER TABLE houston.user_roles
  RENAME COLUMN group_ids TO grupo_ids;

-- =====================================================================================
-- PARTE 2: Remover Políticas RLS e Funções Antigas
-- =====================================================================================
-- Remove políticas RLS que utilizam houston.authorize() com o parâmetro antigo
-- Serão recriadas nas partes seguintes com a assinatura atualizada

-- Políticas de tabelas do sistema
DROP POLICY IF EXISTS "equipes_delete_policy" ON equipes;
DROP POLICY IF EXISTS "equipes_insert_policy" ON equipes;
DROP POLICY IF EXISTS "equipes_select_policy" ON equipes;
DROP POLICY IF EXISTS "equipes_update_policy" ON equipes;
DROP POLICY IF EXISTS "equipes_medicos_delete_policy" ON equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_insert_policy" ON equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_select_policy" ON equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_update_policy" ON equipes_medicos;
DROP POLICY IF EXISTS "medicos_favoritos_delete_policy" ON medicos_favoritos;
DROP POLICY IF EXISTS "medicos_favoritos_insert_policy" ON medicos_favoritos;
DROP POLICY IF EXISTS "medicos_favoritos_select_policy" ON medicos_favoritos;
DROP POLICY IF EXISTS "medicos_favoritos_update_policy" ON medicos_favoritos;
DROP POLICY IF EXISTS "escalistas_select_policy" ON escalistas;
DROP POLICY IF EXISTS "escalistas_update_policy" ON escalistas;
DROP POLICY IF EXISTS "escalistas_insert_policy" ON escalistas;
DROP POLICY IF EXISTS "escalistas_delete_policy" ON escalistas;
DROP POLICY IF EXISTS "hospitais_delete_policy" ON hospitais;
DROP POLICY IF EXISTS "hospitais_insert_policy" ON hospitais;
DROP POLICY IF EXISTS "hospitais_select_policy" ON hospitais;
DROP POLICY IF EXISTS "hospitais_update_policy" ON hospitais;
DROP POLICY IF EXISTS "vagas_beneficios_delete_policy" ON vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_insert_policy" ON vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_select_policy" ON vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_update_policy" ON vagas_beneficios;
DROP POLICY IF EXISTS "vagas_recorrencias_delete_policy" ON vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_select_policy" ON vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_update_policy" ON vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_requisitos_delete_policy" ON vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_insert_policy" ON vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_select_policy" ON vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_update_policy" ON vagas_requisitos;
DROP POLICY IF EXISTS "vagas_salvas_select_policy" ON vagas_salvas;

-- Políticas de storage
DROP POLICY IF EXISTS "avatarhospitais_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatarhospitais_delete" ON storage.objects;
DROP POLICY IF EXISTS "carteira_digital_select" ON storage.objects;
DROP POLICY IF EXISTS "carteira_digital_insert" ON storage.objects;
DROP POLICY IF EXISTS "carteira_digital_delete" ON storage.objects;

-- Remove função antiga com assinatura que usa group_id
DROP FUNCTION IF EXISTS houston.authorize(
  houston.app_permission,
  uuid,
  uuid,
  uuid
);

-- =====================================================================================
-- PARTE 3: Recriar Função houston.authorize() com grupo_ids
-- =====================================================================================
-- IMPORTANTE: Esta função ainda é usada por RLS em tabelas que NÃO foram migradas
-- para API routes. Tabelas como vagas, grades, candidaturas já usam RLS simplificado
-- e filtragem via API routes (ver migração 20251205).
--
-- Esta função valida permissões baseadas em:
--   - requested_permission: Permissão solicitada (ex: vagas.select)
--   - hospital_id, setor_id, grupo_id: Contextos opcionais para filtrar acesso

CREATE FUNCTION houston.authorize(
  requested_permission houston.app_permission,
  hospital_id uuid DEFAULT NULL,
  setor_id uuid DEFAULT NULL,
  grupo_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  user_complete_data RECORD;
  has_permission boolean := false;
  jwt_role text;
BEGIN
  -- OTIMIZAÇÃO: Short-circuit para administradores via JWT
  -- Administradores têm acesso total sem necessidade de verificação adicional
  BEGIN
    jwt_role := (SELECT auth.jwt())->>'user_role';
    IF jwt_role = 'administrador' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- JWT inválido ou ausente, continuar com verificação normal
    NULL;
  END;

  -- Buscar dados completos do usuário autenticado
  -- (agora com 1 query em vez de 2, graças ao JWT)
  SELECT * INTO user_complete_data
  FROM houston.get_user_complete_data((SELECT auth.uid()))
  LIMIT 1;

  -- Se usuário não encontrado ou sem dados, negar acesso
  if user_complete_data.user_id IS NULL then
    return false;
  end if;

  -- REGRA 1: Administrador têm acesso TOTAL
  -- (já verificado acima via JWT, mas mantido para fallback)
  if user_complete_data.role IN ('administrador') then
    return true;
  end if;

  -- REGRA 2: Verificar se usuário tem a permissão básica solicitada
  if NOT (requested_permission = ANY(user_complete_data.permissions)) then
    return false; -- Não tem a permissão básica, negar acesso
  end if;

  -- REGRA 3: Se chegou até aqui, tem a permissão básica
  -- Agora verificar restrições de contexto (grupo, hospital, setor)

  -- Se nenhum contexto foi fornecido, autorizar (só verificou permissão básica)
  if hospital_id IS NULL AND setor_id IS NULL AND grupo_id IS NULL then
    return true;
  end if;

  -- REGRA 4: Verificar GRUPO_ID (se fornecido)
  if grupo_id IS NOT NULL then
    if cardinality(user_complete_data.grupo_ids) = 0 then
      -- Array vazio = sem restrição de grupo
      has_permission := true;
    else
      -- Verificar se o grupo solicitado está na lista do usuário
      has_permission := grupo_id = ANY(user_complete_data.grupo_ids);
    end if;

    -- Se falhou na verificação de grupo, negar acesso
    if NOT has_permission then
      return false;
    end if;
  end if;

  -- REGRA 5: Verificar HOSPITAL_ID
  -- Se hospital_ids está VAZIO: usuário pode ver TODOS os hospitais (sem filtro)
  -- Se hospital_ids está PREENCHIDO: usar como filtro (só pode ver esses hospitais)
  if cardinality(user_complete_data.hospital_ids) > 0 then
    -- Usuário tem restrição de hospital: verificar se tem acesso ao hospital solicitado
    if hospital_id IS NOT NULL then
      -- hospital_id foi fornecido: verificar se está na lista permitida
      has_permission := hospital_id = ANY(user_complete_data.hospital_ids);
      if NOT has_permission then
        return false;
      end if;
    end if;
    -- Se hospital_id é NULL, não há verificação necessária (queries sem filtro de hospital)
  end if;
  -- Se hospital_ids está vazio, não há restrição: usuário pode ver todos os hospitais

  -- REGRA 6: Verificar SETOR_ID
  -- Se setor_ids está VAZIO: usuário pode ver TODOS os setores (sem filtro)
  -- Se setor_ids está PREENCHIDO: usar como filtro (só pode ver esses setores)
  if cardinality(user_complete_data.setor_ids) > 0 then
    -- Usuário tem restrição de setor: verificar se tem acesso ao setor solicitado
    if setor_id IS NOT NULL then
      -- setor_id foi fornecido: verificar se está na lista permitida
      has_permission := setor_id = ANY(user_complete_data.setor_ids);
      if NOT has_permission then
        return false;
      end if;
    end if;
    -- Se setor_id é NULL, não há verificação necessária (queries sem filtro de setor)
  end if;
  -- Se setor_ids está vazio, não há restrição: usuário pode ver todos os setores

  -- Se passou por todas as verificações, autorizar acesso
  RETURN true;
END;
$$ LANGUAGE plpgsql
   STABLE
   SECURITY INVOKER
   SET search_path = ''
   SET statement_timeout = '15s';

COMMENT ON FUNCTION houston.authorize IS
'Função de autorização baseada em permissões e contextos (grupo, hospital, setor).

IMPORTANTE: Esta função é usada principalmente para RLS em tabelas que NÃO foram
migradas para API routes. Tabelas principais (vagas, grades, candidaturas) usam
RLS simplificado + filtragem via API routes com grupo_ids do JWT.

Parâmetros:
  • requested_permission: Permissão necessária (ex: vagas.select)
  • hospital_id: Contexto de hospital (opcional)
  • setor_id: Contexto de setor (opcional)
  • grupo_id: Contexto de grupo (opcional, agora padronizado)

Retorna true se o usuário autenticado tem a permissão solicitada e acesso aos
contextos fornecidos.';

-- =====================================================================================
-- PARTE 4: Recriar Função houston.get_user_complete_data() com grupo_ids
-- =====================================================================================
-- Busca dados completos do usuário autenticado, incluindo role, permissões e contextos.
-- Utiliza JWT quando possível para evitar queries desnecessárias ao banco.

DROP FUNCTION IF EXISTS houston.get_user_complete_data(uuid);

CREATE FUNCTION houston.get_user_complete_data(
  input_user_id uuid
)
RETURNS TABLE(
  user_id uuid,
  role houston.app_role,
  grupo_ids uuid[],
  hospital_ids uuid[],
  setor_ids uuid[],
  permissions houston.app_permission[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $$
DECLARE
  user_role_data houston.app_role;
  permissions_array houston.app_permission[];
  jwt_claims jsonb;
  jwt_role text;
  jwt_permissions jsonb;
  using_jwt boolean := false;
BEGIN
  -- OTIMIZAÇÃO: Tentar ler role e permissions do JWT primeiro
  -- JWT já contém user_role e permissions[] (adicionados pelo custom_access_token_hook)
  BEGIN
    jwt_claims := (SELECT auth.jwt());
    jwt_role := jwt_claims->>'user_role';
    jwt_permissions := jwt_claims->'permissions';

    -- Se JWT tem role e permissions válidos, usar eles (evita 1 query)
    if jwt_role is not null and jwt_permissions is not null then
      user_role_data := jwt_role::houston.app_role;
      permissions_array := array(
        select jsonb_array_elements_text(jwt_permissions)::houston.app_permission
      );
      using_jwt := true;
    end if;
  exception when others then
    -- JWT inválido ou ausente, usar fallback ao banco
    using_jwt := false;
  end;

  -- FALLBACK: Se JWT não disponível, buscar role e permissions do banco
  if not using_jwt then
    -- Buscar role do usuário na tabela user_roles
    SELECT ur.role INTO user_role_data
    FROM houston.user_roles ur
    WHERE ur.user_id = input_user_id
    LIMIT 1;

    -- Se usuário não encontrado, retornar resultado vazio
    if user_role_data IS NULL then
      return;
    end if;

    -- Buscar permissões baseadas no role do usuário
    if user_role_data IN ('administrador') then
      -- Administradores têm TODAS as permissões do sistema
      SELECT array_agg(DISTINCT rp.permission)
      INTO permissions_array
      FROM houston.role_permissions rp;
    else
      -- Outros roles têm apenas permissões específicas do seu role
      SELECT array_agg(DISTINCT rp.permission)
      INTO permissions_array
      FROM houston.role_permissions rp
      WHERE rp.role = user_role_data;
    end if;
  end if;

  -- Retornar dados completos do usuário
  -- NOTA: Role e permissions podem vir do JWT (otimização)
  -- Contextos (grupo_ids, hospital_ids, setor_ids) sempre vêm do banco
  RETURN QUERY
  SELECT
    ur.user_id,
    user_role_data AS role,
    COALESCE(ur.grupo_ids, '{}'),     -- ✅ Agora padronizado como grupo_ids
    COALESCE(ur.hospital_ids, '{}'),
    COALESCE(ur.setor_ids, '{}'),
    COALESCE(permissions_array, '{}')
  FROM houston.user_roles ur
  WHERE ur.user_id = input_user_id;
END;
$$;

COMMENT ON FUNCTION houston.get_user_complete_data IS
'Busca dados completos do usuário autenticado para validação de autorização.

OTIMIZAÇÃO: Tenta ler role e permissions do JWT primeiro (adicionados pelo
custom_access_token_hook), evitando queries desnecessárias ao banco.

Retorna:
  • user_id: UUID do usuário
  • role: Role de maior hierarquia
  • grupo_ids: Array de grupos acessíveis (PADRONIZADO)
  • hospital_ids: Array de hospitais acessíveis
  • setor_ids: Array de setores acessíveis
  • permissions: Array de permissões agregadas

Usado principalmente pela função houston.authorize() para validação de RLS.';

-- =====================================================================================
-- PARTE 5: Recriar Políticas RLS
-- =====================================================================================
-- Recria todas as políticas RLS que foram removidas na Parte 2, agora usando
-- houston.authorize() com o parâmetro grupo_id padronizado.

-- 5.1 Políticas para tabela EQUIPES
CREATE POLICY "equipes_delete_policy" ON public.equipes
  FOR DELETE TO authenticated
  USING (
    houston.authorize('medicos.delete'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_insert_policy" ON public.equipes
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('medicos.insert'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_select_policy" ON public.equipes
  FOR SELECT TO authenticated
  USING (
    houston.authorize('medicos.select'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_update_policy" ON public.equipes
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  )
  WITH CHECK (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  );

-- 5.2 Políticas para tabela EQUIPES_MEDICOS
CREATE POLICY "equipes_medicos_delete_policy" ON public.equipes_medicos
  FOR DELETE TO authenticated
  USING (
    houston.authorize('medicos.delete'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_medicos_insert_policy" ON public.equipes_medicos
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('medicos.insert'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_medicos_select_policy" ON public.equipes_medicos
  FOR SELECT TO authenticated
  USING (
    houston.authorize('medicos.select'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "equipes_medicos_update_policy" ON public.equipes_medicos
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  )
  WITH CHECK (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  );

-- 5.3 Políticas para tabela MEDICOS_FAVORITOS
CREATE POLICY "medicos_favoritos_delete_policy" ON public.medicos_favoritos
  FOR DELETE TO authenticated
  USING (
    houston.authorize('medicos.delete'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "medicos_favoritos_insert_policy" ON public.medicos_favoritos
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('medicos.insert'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "medicos_favoritos_select_policy" ON public.medicos_favoritos
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR
    houston.authorize('medicos.select'::houston.app_permission, NULL, NULL, grupo_id)
  );

CREATE POLICY "medicos_favoritos_update_policy" ON public.medicos_favoritos
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  )
  WITH CHECK (
    houston.authorize('medicos.update'::houston.app_permission, NULL, NULL, grupo_id)
  );

-- 5.4 Políticas para tabela ESCALISTAS
CREATE POLICY "escalistas_select_policy" ON public.escalistas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
    OR houston.authorize('membros.select'::houston.app_permission, NULL::uuid, NULL::uuid, grupo_id)
  );

CREATE POLICY "escalistas_update_policy" ON public.escalistas
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('membros.update'::houston.app_permission, NULL::uuid, NULL::uuid, grupo_id)
  )
  WITH CHECK (
    houston.authorize('membros.update'::houston.app_permission, NULL::uuid, NULL::uuid, grupo_id)
  );

CREATE POLICY "escalistas_insert_policy" ON public.escalistas
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('membros.insert'::houston.app_permission, NULL::uuid, NULL::uuid, grupo_id)
  );

CREATE POLICY "escalistas_delete_policy" ON public.escalistas
  FOR DELETE TO authenticated
  USING (
    houston.authorize('membros.delete'::houston.app_permission, NULL::uuid, NULL::uuid, grupo_id)
  );

-- 5.5 Políticas para tabela HOSPITAIS
CREATE POLICY "hospitais_delete_policy" ON public.hospitais
  FOR DELETE TO authenticated
  USING (
    houston.authorize('hospitais.update'::houston.app_permission, id, NULL, NULL)
  );

CREATE POLICY "hospitais_insert_policy" ON public.hospitais
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('hospitais.update'::houston.app_permission, id, NULL, NULL)
  );

CREATE POLICY "hospitais_select_policy" ON public.hospitais
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize('hospitais.update'::houston.app_permission, id, NULL, NULL)
  );

CREATE POLICY "hospitais_update_policy" ON public.hospitais
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('hospitais.update'::houston.app_permission, id, NULL, NULL)
  )
  WITH CHECK (
    houston.authorize('hospitais.update'::houston.app_permission, id, NULL, NULL)
  );

-- 5.6 Políticas para tabela VAGAS_BENEFICIOS
CREATE POLICY "vagas_beneficios_delete_policy" ON public.vagas_beneficios
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_beneficios.vaga_id
        AND houston.authorize('vagas.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_beneficios_insert_policy" ON public.vagas_beneficios
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_beneficios.vaga_id
        AND houston.authorize('vagas.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_beneficios_select_policy" ON public.vagas_beneficios
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_beneficios.vaga_id
        AND houston.authorize('vagas.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_beneficios_update_policy" ON public.vagas_beneficios
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_beneficios.vaga_id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_beneficios.vaga_id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );


-- 5.7 Políticas para tabela VAGAS_RECORRENCIAS
CREATE POLICY "vagas_recorrencias_delete_policy" ON public.vagas_recorrencias
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.recorrencia_id = vagas_recorrencias.id
        AND houston.authorize('vagas.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      LIMIT 1
    )
  );

CREATE POLICY "vagas_recorrencias_select_policy" ON public.vagas_recorrencias
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.recorrencia_id = vagas_recorrencias.id
        AND houston.authorize('vagas.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      LIMIT 1
    )
  );

CREATE POLICY "vagas_recorrencias_update_policy" ON public.vagas_recorrencias
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.recorrencia_id = vagas_recorrencias.id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.recorrencia_id = vagas_recorrencias.id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      LIMIT 1
    )
  );

-- 5.8 Políticas para tabela VAGAS_REQUISITOS
CREATE POLICY "vagas_requisitos_delete_policy" ON public.vagas_requisitos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_requisitos.vaga_id
        AND houston.authorize('vagas.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_requisitos_insert_policy" ON public.vagas_requisitos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_requisitos.vaga_id
        AND houston.authorize('vagas.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_requisitos_select_policy" ON public.vagas_requisitos
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_requisitos.vaga_id
        AND houston.authorize('vagas.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

CREATE POLICY "vagas_requisitos_update_policy" ON public.vagas_requisitos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_requisitos.vaga_id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = vagas_requisitos.vaga_id
        AND houston.authorize('vagas.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
    )
  );

-- 5.9 Políticas para tabela VAGAS_SALVAS
CREATE POLICY "vagas_salvas_select_policy" ON public.vagas_salvas
  FOR SELECT TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = vagas_salvas.vaga_id
          AND houston.authorize('vagas.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );


-- 5.10 Políticas para Storage - AVATARHOSPITAIS
CREATE POLICY "avatarhospitais_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatarhospitais'
  AND houston.authorize('hospitais.insert'::houston.app_permission)
);

CREATE POLICY "avatarhospitais_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatarhospitais'
  AND houston.authorize('hospitais.delete'::houston.app_permission)
);

-- 5.11 Políticas para Storage - CARTEIRA_DIGITAL
CREATE POLICY "carteira_digital_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'carteira-digital');

CREATE POLICY "carteira_digital_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'carteira-digital'
  AND (
    (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
    OR houston.authorize('medicos.insert'::houston.app_permission)
  )
);

CREATE POLICY "carteira_digital_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'carteira-digital'
  AND (
    (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
    OR houston.authorize('medicos.delete'::houston.app_permission)
  )
);

-- =====================================================================================
-- PARTE 6: Atualizar Políticas RLS - Substituir authorize_simple
-- =====================================================================================
-- Políticas que usavam authorize_simple() agora usam authorize() diretamente.
-- Padrão: authorize_simple('perm') → authorize('perm')
-- =====================================================================================

-- 6.1 Políticas de MEDICOS
DROP POLICY IF EXISTS "medicos_select_policy" ON public.medicos;
CREATE POLICY "medicos_select_policy" ON public.medicos
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize('medicos.select'::houston.app_permission)
  );

-- 6.2 Políticas de MEDICOS_PRECADASTRO
DROP POLICY IF EXISTS "medicos_precadastro_delete_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_insert_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_select_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_update_policy" ON public.medicos_precadastro;

CREATE POLICY "medicos_precadastro_delete_policy" ON public.medicos_precadastro
  FOR DELETE TO authenticated
  USING (houston.authorize('medicos.delete'::houston.app_permission));

CREATE POLICY "medicos_precadastro_insert_policy" ON public.medicos_precadastro
  FOR INSERT TO authenticated
  WITH CHECK (houston.authorize('medicos.insert'::houston.app_permission));

CREATE POLICY "medicos_precadastro_select_policy" ON public.medicos_precadastro
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize('medicos.select'::houston.app_permission)
  );

CREATE POLICY "medicos_precadastro_update_policy" ON public.medicos_precadastro
  FOR UPDATE TO authenticated
  USING (houston.authorize('medicos.update'::houston.app_permission))
  WITH CHECK (houston.authorize('medicos.update'::houston.app_permission));

-- 6.3 Políticas de VAGAS_RECORRENCIAS (INSERT)
DROP POLICY IF EXISTS "vagas_recorrencias_insert_policy" ON public.vagas_recorrencias;
CREATE POLICY "vagas_recorrencias_insert_policy" ON public.vagas_recorrencias
  FOR INSERT TO authenticated
  WITH CHECK (houston.authorize('vagas.insert'::houston.app_permission));

-- =====================================================================================
-- PARTE 7: Atualizar Funções que Usam group_ids
-- =====================================================================================
-- Atualizar funções que ainda faziam referência à coluna antiga group_ids.
-- Após renomear a coluna para grupo_ids, estas funções precisam ser atualizadas.
--
-- NOTA: A função criar_escalista_from_auth() foi descontinuada e substituída por
-- create_user_from_auth() na migration 20251121171652. Portanto, atualizamos apenas
-- a versão mais recente (create_user_from_auth).
-- =====================================================================================

-- 7.1 Atualizar função create_user_from_auth()
-- Esta função é a versão atual que substitui criar_escalista_from_auth()
-- Insere/atualiza registros na tabela houston.user_roles com grupo_ids

-- Derrubar o trigger antes de atualizar a função
DROP TRIGGER IF EXISTS users_1_criar_usuario ON auth.users;

-- Derrubar a função antiga
DROP FUNCTION IF EXISTS public.create_user_from_auth();

CREATE OR REPLACE FUNCTION public.create_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_phone varchar;
  user_metadata jsonb;
  display_name text;
  group_id uuid;
  platform_origin text;
BEGIN
  RAISE NOTICE 'TRIGGER DEBUG: create_user_from_auth() executada para usuário %', NEW.id;

  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  RAISE NOTICE 'TRIGGER DEBUG: Metadados do usuário: %', user_metadata;

  -- Verificar platform_origin (suporta formato aninhado e direto)
  platform_origin := COALESCE(
    user_metadata->>'platform',
    user_metadata->'data'->>'platform'
  );

  IF platform_origin = 'houston' THEN
    RAISE NOTICE 'TRIGGER DEBUG: Usuário identificado como escalista (platform=houston)';

    -- Extrair nome (suporta formato aninhado e direto, com fallback para email)
    display_name := COALESCE(
      user_metadata->'data'->>'display_name',
      user_metadata->>'display_name',
      user_metadata->'data'->>'name',
      user_metadata->>'name',
      split_part(NEW.email, '@', 1)
    );

    -- Extrair telefone (suporta formato aninhado e direto)
    user_phone := COALESCE(
      user_metadata->'data'->>'phone',
      user_metadata->>'phone',
      '(00) 00000-0000'
    );

    -- Extrair group_id de forma segura (suporta formato aninhado e direto)
    -- Busca tanto 'group_id' (inglês) quanto 'grupo_id' (português) nos metadados
    BEGIN
      group_id := COALESCE(
        (user_metadata->'data'->>'grupo_id')::uuid,
        (user_metadata->>'grupo_id')::uuid,
        (user_metadata->'data'->>'group_id')::uuid,
        (user_metadata->>'group_id')::uuid,
        NULL
      );
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE NOTICE 'TRIGGER DEBUG: grupo_id/group_id inválido para usuário %', NEW.id;
      group_id := NULL;
    END;

    -- Criar escalista
    INSERT INTO public.escalistas (
      id,
      nome,
      telefone,
      email,
      grupo_id,
      escalista_status,
      created_at,
      update_at,
      update_by
    )
    VALUES (
      NEW.id,
      display_name,
      user_phone,
      NEW.email,
      group_id,
      CASE
        WHEN NEW.email_confirmed_at IS NOT NULL THEN 'ativo'
        ELSE 'pendente'
      END,
      NOW(),
      NOW(),
      NEW.id
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = display_name,
      telefone = user_phone,
      email = NEW.email,
      grupo_id = group_id,
      update_at = NOW();

    -- Adicionar role em houston.user_roles
    -- ✅ CORRIGIDO: Usar grupo_ids em vez de group_ids
    INSERT INTO houston.user_roles (
      user_id,
      role,
      grupo_ids,
      hospital_ids,
      setor_ids
    ) VALUES (
      NEW.id,
      'escalista',
      CASE WHEN group_id IS NOT NULL THEN ARRAY[group_id] ELSE '{}'::uuid[] END,
      '{}',
      '{}'
    )
    ON CONFLICT (user_id, role) DO UPDATE SET
      grupo_ids = CASE WHEN group_id IS NOT NULL THEN ARRAY[group_id] ELSE '{}'::uuid[] END;

    RAISE NOTICE 'TRIGGER DEBUG: Escalista criado/atualizado com sucesso para usuário %', NEW.id;

  ELSE
    RAISE NOTICE 'TRIGGER DEBUG: Usuário % não é escalista (platform_origin não é houston)', NEW.id;

    -- Usuário comum (app mobile) - mantém na user_profile
    INSERT INTO public.user_profile (
      id,
      created_at,
      updated_at,
      role
    ) VALUES (
      NEW.id,
      NOW(),
      NOW(),
      'medico'
    )
    ON CONFLICT (id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_user_from_auth IS
'Trigger function unificada para criar usuários automaticamente quando inseridos em auth.users.

COMPORTAMENTO:
- Se platform=houston: cria registro em escalistas + houston.user_roles
- Caso contrário: cria registro em user_profile (médicos do app mobile)

ATUALIZADO (2025-12-07): Corrigido para usar grupo_ids (padrão português) em vez de group_ids.';

-- Recriar o trigger
CREATE TRIGGER users_1_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_from_auth();

-- =====================================================================================
-- PARTE 8: Remover Políticas RLS que Usam Funções Wrapper
-- =====================================================================================
-- IMPORTANTE: Drop das políticas ANTES de dropar as funções wrapper.
-- Estas políticas serão recriadas logo depois usando houston.authorize() diretamente.
-- =====================================================================================

-- 7.1 Políticas de HOUSTON.USER_ROLES (usam authorize_simple)
DROP POLICY IF EXISTS "user_role_read_policy" ON houston.user_roles;
DROP POLICY IF EXISTS "user_role_insert_policy" ON houston.user_roles;
DROP POLICY IF EXISTS "user_role_update_policy" ON houston.user_roles;
DROP POLICY IF EXISTS "user_role_delete_policy" ON houston.user_roles;

-- 7.2 Políticas de GRUPOS (usam group_authorization)
DROP POLICY IF EXISTS "grupos_select_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_insert_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_update_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_delete_policy" ON public.grupos;

-- =====================================================================================
-- PARTE 9: Remover Funções Wrapper Obsoletas
-- =====================================================================================
-- IMPORTANTE: Agora que TODAS as políticas que usavam estas funções foram removidas,
-- podemos dropar as funções com segurança.
--
-- Com a consolidação, estas funções não são mais necessárias:
-- - authorize_simple() era apenas wrapper de authorize(..., NULL, NULL, NULL)
-- - group_authorization() era apenas wrapper de authorize(..., NULL, NULL, group_id)
--
-- Consolidamos tudo em uma única função: houston.authorize()
-- =====================================================================================

DROP FUNCTION IF EXISTS houston.authorize_simple(houston.app_permission);
DROP FUNCTION IF EXISTS houston.group_authorization(houston.app_permission, uuid);

-- =====================================================================================
-- PARTE 10: Recriar Políticas RLS com houston.authorize()
-- =====================================================================================
-- Agora que as funções wrapper foram removidas, recriar as políticas usando
-- houston.authorize() diretamente.
-- =====================================================================================

-- 10.1 Políticas de HOUSTON.USER_ROLES
CREATE POLICY "user_role_read_policy" ON houston.user_roles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (houston.authorize('roles.select'::houston.app_permission));

CREATE POLICY "user_role_insert_policy" ON houston.user_roles
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (houston.authorize('roles.insert'::houston.app_permission));

CREATE POLICY "user_role_update_policy" ON houston.user_roles
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (houston.authorize('roles.update'::houston.app_permission))
  WITH CHECK (houston.authorize('roles.update'::houston.app_permission));

CREATE POLICY "user_role_delete_policy" ON houston.user_roles
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (houston.authorize('roles.delete'::houston.app_permission));

-- 10.2 Políticas de GRUPOS
CREATE POLICY "grupos_select_policy" ON public.grupos
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
    OR houston.authorize('grupos.select'::houston.app_permission, NULL, NULL, id)
  );

CREATE POLICY "grupos_insert_policy" ON public.grupos
  FOR INSERT TO authenticated
  WITH CHECK (houston.authorize('grupos.insert'::houston.app_permission));

CREATE POLICY "grupos_update_policy" ON public.grupos
  FOR UPDATE TO authenticated
  USING (houston.authorize('grupos.update'::houston.app_permission, NULL, NULL, id))
  WITH CHECK (houston.authorize('grupos.update'::houston.app_permission, NULL, NULL, id));

CREATE POLICY "grupos_delete_policy" ON public.grupos
  FOR DELETE TO authenticated
  USING (houston.authorize('grupos.delete'::houston.app_permission));

-- =====================================================================================
-- PARTE 11: Documentação e Comentários Finais
-- =====================================================================================

COMMENT ON FUNCTION houston.authorize IS
'Função ÚNICA de autorização baseada em permissões e contextos.

CONSOLIDAÇÃO (2025-12-07):
Anteriormente tínhamos 3 funções:
  - authorize_simple(perm) → REMOVIDA (use authorize(perm))
  - group_authorization(perm, group_id) → REMOVIDA (use authorize(perm, NULL, NULL, group_id))
  - authorize(perm, hospital_id, setor_id, grupo_id) → MANTIDA (função única)

PADRÕES DE USO:
  • Verificar só permissão básica:
    authorize(''vagas.select'')

  • Verificar permissão + grupo:
    authorize(''grupos.update'', NULL, NULL, grupo_id)

  • Verificar permissão + hospital:
    authorize(''hospitais.update'', hospital_id, NULL, NULL)

  • Verificar permissão + todos contextos:
    authorize(''vagas.delete'', hospital_id, setor_id, grupo_id)

REGRAS DE VALIDAÇÃO:
  1. Administradores têm acesso TOTAL (short-circuit via JWT)
  2. Verifica se usuário tem a permissão básica solicitada
  3. Se nenhum contexto fornecido, autoriza (só validou permissão)
  4. Valida grupo_id se fornecido (array vazio = sem restrição)
  5. Valida hospital_id se fornecido (array vazio = sem restrição)
  6. Valida setor_id se fornecido (array vazio = sem restrição)

Parâmetros:
  • requested_permission: Permissão necessária (ex: vagas.select)
  • hospital_id: Contexto de hospital (opcional, NULL = não verificar)
  • setor_id: Contexto de setor (opcional, NULL = não verificar)
  • grupo_id: Contexto de grupo (opcional, NULL = não verificar)

Retorna true se o usuário autenticado tem a permissão solicitada e acesso aos
contextos fornecidos.';

-- =====================================================================================
-- FIM DA MIGRAÇÃO - Padronização Completa da Gestão de Grupos
-- =====================================================================================
--
-- RESUMO DO QUE FOI FEITO:
-- ✅ Renomeada coluna: houston.user_roles.group_ids → grupo_ids
-- ✅ Atualizada função: houston.authorize() para usar grupo_ids
-- ✅ Atualizada função: houston.get_user_complete_data() para retornar grupo_ids
-- ✅ Atualizada função: public.create_user_from_auth() para usar grupo_ids
-- ✅ Atualizadas 10 políticas que usavam authorize_simple():
--    • medicos, medicos_precadastro, vagas_recorrencias, houston.user_roles
-- ✅ Atualizadas 4 políticas que usavam group_authorization():
--    • grupos (select, insert, update, delete)
-- ✅ Removidas funções wrapper: authorize_simple() e group_authorization()
-- ✅ Documentação completa da função consolidada
--
-- TOTAL: 14 políticas RLS atualizadas + 3 funções atualizadas + 2 funções removidas
--
-- NOTAS IMPORTANTES:
-- • A função criar_escalista_from_auth() foi descontinuada na migration 20251121171652
--   e substituída por create_user_from_auth(), por isso não foi incluída nesta correção.
--
-- BENEFÍCIOS:
-- ✅ Nomenclatura padronizada em português ("grupo_ids")
-- ✅ Função única de autorização (manutenção simplificada)
-- ✅ Código mais limpo e consistente
-- ✅ Mesma performance (lógica idêntica, menos overhead de funções wrapper)
--
-- BREAKING CHANGES:
-- ⚠️  houston.authorize_simple() não existe mais → use houston.authorize()
-- ⚠️  houston.group_authorization() não existe mais → use houston.authorize()
--
-- =====================================================================================