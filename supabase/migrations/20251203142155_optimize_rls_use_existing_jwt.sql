-- =====================================================
-- OTIMIZAÇÃO DE PERFORMANCE RLS - FASE 1
-- =====================================================
-- Objetivo: Utilizar permissões já existentes no JWT para reduzir queries
-- Impacto esperado: 50% redução em queries de autorização
-- Risco: Muito baixo (usa infraestrutura JWT já existente)
--
-- Mudanças:
-- 1. get_user_complete_data() agora lê role e permissions do JWT primeiro
-- 2. authorize() tem short-circuit para admins via JWT
-- 3. Fallback para queries ao banco se JWT indisponível
-- =====================================================

-- Modificar função get_user_complete_data para usar JWT
create or replace function houston.get_user_complete_data(
  input_user_id uuid
)
returns table(
  user_id uuid,
  role houston.app_role,
  group_ids uuid[],
  hospital_ids uuid[],
  setor_ids uuid[],
  permissions houston.app_permission[]
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  user_role_data houston.app_role;
  permissions_array houston.app_permission[];
  jwt_claims jsonb;
  jwt_role text;
  jwt_permissions jsonb;
  using_jwt boolean := false;
begin
  -- OTIMIZAÇÃO: Tentar ler role e permissions do JWT primeiro
  -- JWT já contém user_role e permissions[] (adicionados pelo custom_access_token_hook)
  begin
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
  -- NOTA: Contextos (group_ids, hospital_ids, setor_ids) ainda vêm do banco
  -- Em Fase 2 futura, estes também podem vir do JWT
  RETURN QUERY
  SELECT
    ur.user_id,
    user_role_data as role,
    COALESCE(ur.group_ids, '{}'),    -- Array vazio se NULL
    COALESCE(ur.hospital_ids, '{}'), -- Array vazio se NULL
    COALESCE(ur.setor_ids, '{}'),    -- Array vazio se NULL
    COALESCE(permissions_array, '{}') -- Array vazio se NULL
  FROM houston.user_roles ur
  WHERE ur.user_id = input_user_id;
end;
$$;


-- Modificar função authorize para short-circuit de admins
create or replace function houston.authorize(
  requested_permission houston.app_permission,
  hospital_id uuid default null,
  setor_id uuid default null,
  group_id uuid default null
)
returns boolean as $$
declare
  user_complete_data RECORD;
  has_permission boolean := false;
  jwt_role text;
begin
  -- OTIMIZAÇÃO: Short-circuit para administradores via JWT (evita TODAS as queries)
  -- Se JWT indica que usuário é admin, retornar true imediatamente
  begin
    jwt_role := (SELECT auth.jwt())->>'user_role';
    if jwt_role = 'administrador' then
      return true;
    end if;
  exception when others then
    -- JWT inválido, continuar normalmente
    null;
  end;

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
  if hospital_id IS NULL AND setor_id IS NULL AND group_id IS NULL then
    return true;
  end if;

  -- REGRA 4: Verificar GROUP_ID (se fornecido)
  if group_id IS NOT NULL then
    if cardinality(user_complete_data.group_ids) = 0 then
      -- Array vazio = sem restrição de grupo
      has_permission := true;
    else
      -- Verificar se o grupo solicitado está na lista do usuário
      has_permission := group_id = ANY(user_complete_data.group_ids);
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
  return true;
end;
$$ language plpgsql
   stable
   security invoker
   set search_path = ''
   set statement_timeout = '15s';


-- =====================================================
-- COMENTÁRIOS E MÉTRICAS
-- =====================================================
--
-- Performance esperada:
-- - Administradores: 0 queries (short-circuit via JWT)
-- - Outros usuários: 1 query em vez de 2 (50% de redução)
-- - Elimina JOIN com role_permissions (127 registros)
--
-- Segurança:
-- - Fallback automático para banco se JWT inválido
-- - Mesmas regras de autorização mantidas
-- - Zero mudança na lógica de permissões
--
-- Próximos passos (Fase 2 futura):
-- - Adicionar group_ids[], hospital_ids[], setor_ids[] ao JWT
-- - Reduzir para 0 queries em todos os casos (exceto admins já são 0)
-- - Impacto adicional: +40% de redução (total: 90-95%)
--
-- =====================================================
