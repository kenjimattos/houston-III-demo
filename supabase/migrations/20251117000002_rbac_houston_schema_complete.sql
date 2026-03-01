-- =====================================================
-- MIGRAÇÃO CONSOLIDADA: RBAC Houston Schema Complete
-- Data: 2025-11-17
-- =====================================================
--
-- Descrição:
-- Schema RBAC completo com todas as correções aplicadas
--
-- Arquivos Originais Consolidados:
-- 20251110144610_applying_rbac_schema_houston.sql
-- 20251110150710_enable_rls_on_users_roles_and_roles_permissions.sql  
-- 20251110150810_populate_user_roles_with_current_escalista_data.sql
-- 20251110151210_fix_permission_function.sql
-- 20251110151310_change_get_applications_paginated_security.sql
-- 20251110152410_standardize_permissions_enums.sql
-- 20251110152610_fix_policies_after_enum_update.sql
-- 20251110152810_fix_role_permissions_rows.sql
-- 20251114141659_add_storage_buckets_permissions_and_policies.sql
-- 20251117162331_fix_group_authorization.sql
-- 20251117193919_fix_authorize_functions.sql
-- 20251117195333_fix_role_permissions.sql
--
-- IMPORTANTE: Esta migração já incorpora TODAS as correções
-- das migrações originais. Não será necessário aplicar fixes.
-- =====================================================

/*
  Este script SQL implementa um sistema de controle de acesso baseado em funções (RBAC) para o schema "houston".

  Principais componentes:
  - Criação do schema "houston" e dos tipos ENUM "app_role" (funções) e "app_permission" (permissões).
  - Tabela "role_permissions": associa funções às permissões específicas.
  - Inserção das permissões para cada função (administrador, moderador, gestor, coordenador, escalista).
  - Tabela "user_roles": vincula usuários (referenciados pelo UUID do auth.users) às funções.
  - Função "role_level": retorna o nível hierárquico de cada função.
  - Função "custom_access_token_hook": adiciona a função do usuário aos claims do token de autenticação.
  - Configuração de permissões e políticas de acesso para o Supabase Auth Admin.
  - Função "authorize": verifica se o usuário autenticado possui a permissão solicitada, baseada em sua função.
  - Política de acesso: permite que usuários autenticados deletem registros em "public.vagas" apenas se autorizados.

  Observações:
  - O sistema facilita a gestão de permissões granulares por função.
  - As funções e permissões são facilmente extensíveis para novos papéis ou ações.
  - O uso de funções e políticas garante segurança e flexibilidade na autorização de operações.
*/
create schema if not exists houston;

create type houston.app_role as enum (
      'administrador',
      'moderador',
      'gestor',
      'coordenador',
      'escalista'
);
-- Enums padronizados seguindo convenção do Supabase (select, insert, update, delete)
create type houston.app_permission as enum (
      -- Vagas
      'vagas.select',
      'vagas.insert',
      'vagas.update',
      'vagas.delete',

      -- Membros
      'membros.select',
      'membros.insert',
      'membros.update',
      'membros.delete',

      -- Médicos (cadastro "ativo")
      'medicos.select',
      'medicos.insert',
      'medicos.update',
      'medicos.delete',

      -- Grupos
      'grupos.select',
      'grupos.insert',
      'grupos.update',
      'grupos.delete',

      -- Roles (permissões dos usuários)
      'roles.select',
      'roles.insert',
      'roles.update',
      'roles.delete',

      -- Candidaturas
      'candidaturas.select',
      'candidaturas.insert',
      'candidaturas.update',
      'candidaturas.delete',

      -- Hospitais
      'hospitais.select',
      'hospitais.insert',
      'hospitais.update',
      'hospitais.delete',

      -- Relatórios
      'relatorios.select',
      'relatorios.insert',
      'relatorios.update',
      'relatorios.delete'
    );


create table houston.role_permissions (
    role houston.app_role not null,
    permission houston.app_permission not null,
    primary key (role, permission)
);

-- =====================================================
-- PERMISSÕES POR ROLE (VERSÃO FINAL PADRONIZADA)
-- =====================================================

-- Inserir permissões conforme definição final do sistema
insert into houston.role_permissions (role, permission) values
    -- ========================================
    -- ADMINISTRADOR (32 permissões)
    -- ========================================
    ('administrador', 'vagas.select'),
    ('administrador', 'vagas.insert'),
    ('administrador', 'vagas.update'),
    ('administrador', 'vagas.delete'),
    ('administrador', 'membros.select'),
    ('administrador', 'membros.insert'),
    ('administrador', 'membros.update'),
    ('administrador', 'membros.delete'),
    ('administrador', 'medicos.select'),
    ('administrador', 'medicos.insert'),
    ('administrador', 'medicos.update'),
    ('administrador', 'medicos.delete'),
    ('administrador', 'grupos.select'),
    ('administrador', 'grupos.insert'),
    ('administrador', 'grupos.update'),
    ('administrador', 'grupos.delete'),
    ('administrador', 'roles.select'),
    ('administrador', 'roles.insert'),
    ('administrador', 'roles.update'),
    ('administrador', 'roles.delete'),
    ('administrador', 'candidaturas.update'),
    ('administrador', 'candidaturas.delete'),
    ('administrador', 'candidaturas.insert'),
    ('administrador', 'candidaturas.select'),
    ('administrador', 'hospitais.update'),
    ('administrador', 'hospitais.delete'),
    ('administrador', 'hospitais.insert'),
    ('administrador', 'hospitais.select'),
    ('administrador', 'relatorios.update'),
    ('administrador', 'relatorios.delete'),
    ('administrador', 'relatorios.insert'),
    ('administrador', 'relatorios.select'),

    -- ========================================
    -- MODERADOR (27 permissões)
    -- ========================================
    ('moderador', 'vagas.select'),
    ('moderador', 'vagas.insert'),
    ('moderador', 'vagas.update'),
    ('moderador', 'vagas.delete'),
    ('moderador', 'membros.select'),
    ('moderador', 'membros.insert'),
    ('moderador', 'membros.update'),
    ('moderador', 'membros.delete'),
    ('moderador', 'medicos.select'),
    ('moderador', 'medicos.insert'),
    ('moderador', 'medicos.update'),
    ('moderador', 'medicos.delete'),
    ('moderador', 'grupos.select'),
    ('moderador', 'grupos.update'),
    ('moderador', 'roles.select'),
    ('moderador', 'roles.update'),
    ('moderador', 'candidaturas.update'),
    ('moderador', 'candidaturas.delete'),
    ('moderador', 'candidaturas.insert'),
    ('moderador', 'candidaturas.select'),
    ('moderador', 'hospitais.update'),
    ('moderador', 'hospitais.insert'),
    ('moderador', 'hospitais.select'),
    ('moderador', 'hospitais.delete'),
    ('moderador', 'relatorios.update'),
    ('moderador', 'relatorios.delete'),
    ('moderador', 'relatorios.insert'),
    ('moderador', 'relatorios.select'),

    -- ========================================
    -- GESTOR (26 permissões)
    -- ========================================
    ('gestor', 'vagas.select'),
    ('gestor', 'vagas.insert'),
    ('gestor', 'vagas.update'),
    ('gestor', 'vagas.delete'),
    ('gestor', 'membros.select'),
    ('gestor', 'membros.insert'),
    ('gestor', 'membros.update'),
    ('gestor', 'membros.delete'),
    ('gestor', 'medicos.select'),
    ('gestor', 'medicos.insert'),
    ('gestor', 'medicos.update'),
    ('gestor', 'medicos.delete'),
    ('gestor', 'grupos.select'),
    ('gestor', 'grupos.update'),
    ('gestor', 'roles.select'),
    ('gestor', 'roles.update'),
    ('gestor', 'candidaturas.update'),
    ('gestor', 'candidaturas.delete'),
    ('gestor', 'candidaturas.insert'),
    ('gestor', 'candidaturas.select'),
    ('gestor', 'hospitais.update'),
    ('gestor', 'hospitais.insert'),
    ('gestor', 'hospitais.select'),
    ('gestor', 'relatorios.update'),
    ('gestor', 'relatorios.delete'),
    ('gestor', 'relatorios.insert'),
    ('gestor', 'relatorios.select'),

    -- ========================================
    -- COORDENADOR (21 permissões)
    -- ========================================
    ('coordenador', 'vagas.select'),
    ('coordenador', 'vagas.insert'),
    ('coordenador', 'vagas.update'),
    ('coordenador', 'vagas.delete'),
    ('coordenador', 'membros.select'),
    ('coordenador', 'membros.insert'),
    ('coordenador', 'membros.update'),
    ('coordenador', 'membros.delete'),
    ('coordenador', 'medicos.select'),
    ('coordenador', 'medicos.insert'),
    ('coordenador', 'medicos.update'),
    ('coordenador', 'medicos.delete'),
    ('coordenador', 'grupos.select'),
    ('coordenador', 'roles.select'),
    ('coordenador', 'roles.update'),
    ('coordenador', 'candidaturas.select'),
    ('coordenador', 'candidaturas.insert'),
    ('coordenador', 'candidaturas.update'),
    ('coordenador', 'candidaturas.delete'),
    ('coordenador', 'hospitais.select'),
    ('coordenador', 'hospitais.insert'),
    ('coordenador', 'hospitais.update'),

    -- ========================================
    -- ESCALISTA (15 permissões)
    -- ========================================
    ('escalista', 'vagas.select'),
    ('escalista', 'vagas.insert'),
    ('escalista', 'vagas.update'),
    ('escalista', 'vagas.delete'),
    ('escalista', 'membros.select'),
    ('escalista', 'medicos.select'),
    ('escalista', 'medicos.insert'),
    ('escalista', 'medicos.update'),
    ('escalista', 'grupos.select'),
    ('escalista', 'roles.select'),
    ('escalista', 'candidaturas.update'),
    ('escalista', 'candidaturas.delete'),
    ('escalista', 'candidaturas.insert'),
    ('escalista', 'candidaturas.select'),
    ('escalista', 'hospitais.update'),
    ('escalista', 'hospitais.insert'),
    ('escalista', 'hospitais.select');

-- Tabela de papéis por usuário agora suporta múltiplos grupos e hospitais via arrays
create table houston.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role houston.app_role not null,
  group_ids uuid[] not null default '{}'::uuid[],      -- grupos associados ao papel
  hospital_ids uuid[] not null default '{}'::uuid[],   -- hospitais associados ao papel
  setor_ids uuid[] null default '{}'::uuid[],
  primary key (user_id, role)
);
create index idx_user_roles_user_id on houston.user_roles(user_id);
create index idx_user_roles_group_ids on houston.user_roles using gin (group_ids);
create index idx_user_roles_hospital_ids on houston.user_roles using gin (hospital_ids);
create index idx_user_roles_setor_ids on houston.user_roles using gin (setor_ids);

create or replace function houston.role_level(role houston.app_role) 
returns int 
language plpgsql
as $$
begin
  case role
    when 'administrador' then return 4;
    when 'moderador' then return 3;
    when 'gestor' then return 2;
    when 'coordenador' then return 1;
    when 'escalista' then return 0;
    else return -1;
  end case;
end;
$$;

-- Create the auth hook function
create or replace function houston.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, houston
as $$
declare
  uid uuid := (event->>'user_id')::uuid;
  payload jsonb := event->'claims';
  highest_role_text text;
begin
  select r.app_role
  from (
     select ur.role as app_role,
            max(houston.role_level(ur.role)) over() as max_level
     from houston.user_roles ur
     where ur.user_id = uid
  ) r
  where houston.role_level(r.app_role) = r.max_level
  limit 1
  into highest_role_text;

  -- Opcional: agregar arrays de group_ids / hospital_ids
  -- CUIDADO: pode explodir tamanho do JWT se muitos
  return jsonb_build_object(
    'claims',
    payload
      || jsonb_build_object(
            'user_role', highest_role_text,
            'permissions', coalesce((
               select jsonb_agg(distinct rp.permission) from houston.role_permissions rp
               join houston.user_roles ur on ur.role = rp.role
               where ur.user_id = uid
            ), '[]'::jsonb),
            'roles', coalesce((
               select jsonb_agg(distinct ur.role) from houston.user_roles ur where ur.user_id = uid
            ), '[]'::jsonb)
         )
  );
end;
$$;

grant usage on schema public to supabase_auth_admin, authenticated;
grant usage on schema houston to supabase_auth_admin, authenticated;

grant execute
  on function houston.custom_access_token_hook
  to supabase_auth_admin, authenticated;

revoke execute
  on function houston.custom_access_token_hook
  from authenticated, anon, public;


grant all
  on table houston.user_roles
  to supabase_auth_admin, authenticated;

create policy "Allow auth admin to read user roles" ON houston.user_roles
as permissive for select
to supabase_auth_admin, authenticated
using (true);
-- =============================================================================
-- FUNÇÃO: authorize_simple (BACKWARD COMPATIBILITY)
-- =============================================================================
-- Propósito: Versão simplificada da função authorize para compatibilidade
-- Parâmetros: requested_permission apenas
-- Retorna: boolean
-- Uso: Para códigos existentes que só verificam permissão básica
-- =============================================================================

create or replace function houston.authorize_simple(
  requested_permission houston.app_permission
)
returns boolean as $$
begin
  -- Chama a função principal sem contexto (só verifica permissão básica)
  return houston.authorize(requested_permission, NULL::uuid, NULL::uuid, NULL::uuid);
end;
$$ language plpgsql
   stable
   security invoker
   set search_path = ''
   set statement_timeout = '10s';

grant execute
  on function houston.authorize_simple(houston.app_permission)
  to supabase_auth_admin, authenticated;
revoke execute
  on function houston.authorize_simple(houston.app_permission)
  from public;

grant all on  houston.role_permissions  to supabase_auth_admin, authenticated;




-- =====================================================
-- FUNÇÕES AVANÇADAS DE AUTORIZAÇÃO (VERSÃO FINAL)
-- =====================================================

CREATE OR REPLACE FUNCTION houston.group_authorization(requested_permission houston.app_permission, group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET statement_timeout TO '15s'
AS $function$
DECLARE 
  user_complete_data RECORD;
  current_user_id uuid;
BEGIN
  -- 📝 Log inicial
  current_user_id := auth.uid();
  RAISE LOG 'group_authorization INICIADO - user_id: %, permission: %, group_id: %', 
    current_user_id, requested_permission, group_id;

  -- ✅ Buscar dados completos do usuário autenticado
  SELECT * INTO user_complete_data 
  FROM houston.get_user_complete_data(current_user_id) 
  LIMIT 1;

  -- 📝 Log dos dados do usuário
  RAISE LOG 'group_authorization DADOS_USER - encontrado: %, role: %, groups: %, permissions: %', 
    (user_complete_data.user_id IS NOT NULL), 
    COALESCE(user_complete_data.role::text, 'NULL'),
    COALESCE(array_length(user_complete_data.group_ids, 1), 0),
    COALESCE(array_length(user_complete_data.permissions, 1), 0);

  -- ✅ Se usuário não encontrado ou dados inválidos
  IF user_complete_data.user_id IS NULL THEN 
    RAISE LOG 'group_authorization RESULTADO: FALSE - usuário não encontrado';
    RETURN false;
  END IF;

  -- ✅ Administrador e Gestor têm acesso total
  IF user_complete_data.role IN ('administrador') THEN
    RAISE LOG 'group_authorization RESULTADO: TRUE - role admin: %', user_complete_data.role;
    RETURN true;
  END IF;

  -- ✅ Verificar se tem a permissão básica solicitada
  IF NOT (requested_permission = ANY(user_complete_data.permissions)) THEN
    RAISE LOG 'group_authorization RESULTADO: FALSE - sem permissão básica. Tem: %, Precisa: %', 
      user_complete_data.permissions, requested_permission;
    RETURN false; -- Não tem a permissão básica
  END IF;

  -- 📝 Log da verificação de permissão básica
  RAISE LOG 'group_authorization PERMISSÃO_OK - usuário tem permissão: %', requested_permission;

  -- ✅ Verificar se pertence ao grupo específico
  -- Se array de grupos está vazio, permite acesso a qualquer grupo
  IF cardinality(user_complete_data.group_ids) = 0 THEN
    RAISE LOG 'group_authorization RESULTADO: TRUE - array grupos vazio (sem restrições)';
    RETURN true; -- Sem restrições de grupo
  END IF;

  -- 📝 Log da verificação de grupo
  RAISE LOG 'group_authorization VERIFICANDO_GRUPO - user_groups: %, target_group: %', 
    user_complete_data.group_ids, group_id;

  -- ✅ Verificar se o group_id está nos grupos do usuário
  IF group_id = ANY(user_complete_data.group_ids) THEN
    RAISE LOG 'group_authorization RESULTADO: TRUE - usuário pertence ao grupo: %', group_id;
    RETURN true; -- Usuário pertence ao grupo
  END IF;

  -- ✅ Se chegou até aqui, não tem acesso
  RAISE LOG 'group_authorization RESULTADO: FALSE - usuário NÃO pertence ao grupo. User_groups: %, Target: %', 
    user_complete_data.group_ids, group_id;
  RETURN false;
END;
$function$;
-- =====================================================
-- FUNÇÕES AUTHORIZE - VERSÃO FINAL
-- =====================================================

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
begin
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
    -- Administradores e Gestores têm TODAS as permissões do sistema
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
  
  -- Retornar dados completos do usuário
  RETURN QUERY
  SELECT 
    ur.user_id,
    ur.role,
    COALESCE(ur.group_ids, '{}'),    -- Array vazio se NULL
    COALESCE(ur.hospital_ids, '{}'), -- Array vazio se NULL
    COALESCE(ur.setor_ids, '{}'),    -- Array vazio se NULL
    COALESCE(permissions_array, '{}') -- Array vazio se NULL
  FROM houston.user_roles ur
  WHERE ur.user_id = input_user_id;
end;
$$;


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
begin
  -- Buscar dados completos do usuário autenticado
  SELECT * INTO user_complete_data 
  FROM houston.get_user_complete_data(auth.uid())
  LIMIT 1;
  
  -- Se usuário não encontrado ou sem dados, negar acesso
  if user_complete_data.user_id IS NULL then
    return false;
  end if;

  -- REGRA 1: Administrador têm acesso TOTAL
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

  -- REGRA 5: Verificar HOSPITAL_ID (se fornecido)
  if hospital_id IS NOT NULL then
    if cardinality(user_complete_data.hospital_ids) = 0 then
      -- Array vazio = sem restrição de hospital
      has_permission := true;
    else
      -- Verificar se o hospital solicitado está na lista do usuário
      has_permission := hospital_id = ANY(user_complete_data.hospital_ids);
    end if;
    
    -- Se falhou na verificação de hospital, negar acesso
    if NOT has_permission then
      return false;
    end if;
  end if;

  -- REGRA 6: Verificar SETOR_ID (se fornecido)
  if setor_id IS NOT NULL then
    if cardinality(user_complete_data.setor_ids) = 0 then
      -- Array vazio = sem restrição de setor
      has_permission := true;
    else
      -- Verificar se o setor solicitado está na lista do usuário
      has_permission := setor_id = ANY(user_complete_data.setor_ids);
    end if;
    
    -- Se falhou na verificação de setor, negar acesso
    if NOT has_permission then
      return false;
    end if;
  end if;

  -- Se passou por todas as verificações, autorizar acesso
  return true;
end;
$$ language plpgsql 
   stable 
   security invoker 
   set search_path = ''
   set statement_timeout = '15s';

-- =====================================================
-- RLS NAS TABELAS HOUSTON
-- =====================================================

-- Habilitar RLS nas tabelas do schema houston
ALTER TABLE houston.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houston.role_permissions ENABLE ROW LEVEL SECURITY;

-- Baseado em: 38-50-RBAC-Refatoracao/20251110152610_fix_policies_after_enum_update.sql

CREATE POLICY user_role_read_policy ON houston.user_roles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (houston.authorize_simple('roles.select'::houston.app_permission));

CREATE POLICY user_role_insert_policy ON houston.user_roles
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (houston.authorize_simple('roles.insert'::houston.app_permission));

CREATE POLICY user_role_update_policy ON houston.user_roles
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (houston.authorize_simple('roles.update'::houston.app_permission))
WITH CHECK (houston.authorize_simple('roles.update'::houston.app_permission));

CREATE POLICY user_role_delete_policy ON houston.user_roles
AS PERMISSIVE FOR DELETE
TO authenticated
USING (houston.authorize_simple('roles.delete'::houston.app_permission));

-- =====================================================
-- POPULAÇÃO DA TABELA USER_ROLES COM ESCALISTAS EXISTENTES
-- =====================================================
-- Migra todos os escalistas existentes para a tabela houston.user_roles
-- Baseado em: 20251110150810_populate_user_roles_with_current_escalista_data.sql

-- Temporariamente desabilitar RLS para esta operação
SET row_security = off;

-- Inserir todos os escalistas na tabela houston.user_roles
INSERT INTO houston.user_roles (
    user_id,
    role,
    group_ids,
    hospital_ids,
    setor_ids
)
SELECT
    e.escalista_auth_id as user_id,
    'escalista'::houston.app_role as role,
    CASE
        WHEN e.grupo_id IS NOT NULL THEN ARRAY[e.grupo_id::uuid]
        ELSE ARRAY[]::uuid[]
    END as group_ids,
    ARRAY[]::uuid[] as hospital_ids,
    ARRAY[]::uuid[] as setor_ids
FROM public.escalista e
WHERE e.escalista_auth_id IS NOT NULL
  AND EXISTS (
    -- Validar se o user_id existe na tabela auth.users
    SELECT 1 FROM auth.users u
    WHERE u.id = e.escalista_auth_id
  )
  AND NOT EXISTS (
    -- Evitar duplicatas caso a migração seja executada novamente
    SELECT 1 FROM houston.user_roles ur
    WHERE ur.user_id = e.escalista_auth_id AND ur.role = 'escalista'
  );

-- Reabilitar RLS
SET row_security = on;