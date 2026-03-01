-- =====================================================================================
-- Migration: Fix user_roles RLS Policy Security Issue
-- Created: 2025-12-07
-- =====================================================================================
--
-- PROBLEMA IDENTIFICADO:
-- A política "Allow auth admin to read user roles" estava permitindo que QUALQUER
-- usuário autenticado lesse TODOS os registros de houston.user_roles, ignorando
-- completamente a verificação de permissões da política user_role_read_policy.
--
-- CAUSA:
-- A política usava: TO supabase_auth_admin, authenticated
-- Como ambas as políticas são PERMISSIVE, elas funcionam com lógica OR:
--   - Política 1: using (true) → sempre permite para authenticated
--   - Política 2: usando authorize_simple('roles.select') → verificação ignorada!
--
-- SOLUÇÃO:
-- Remover 'authenticated' da política "Allow auth admin to read user roles", deixando
-- apenas supabase_auth_admin (necessário para o custom_access_token_hook funcionar).
--
-- IMPACTO:
-- - supabase_auth_admin: continua com acesso total (necessário para auth hook)
-- - authenticated: agora PRECISA ter permissão 'roles.select' (via user_role_read_policy)
-- =====================================================================================

-- Drop da política existente que está muito permissiva
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON houston.user_roles;

-- Recriar a política APENAS para supabase_auth_admin
-- Isso é necessário para que o custom_access_token_hook consiga ler user_roles
-- durante o processo de login/refresh do token JWT
CREATE POLICY "Allow auth admin to read user roles" ON houston.user_roles
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

-- =====================================================================================
-- VERIFICAÇÃO DE SEGURANÇA
-- =====================================================================================
-- Após esta migração:
--
-- 1. supabase_auth_admin (serviço interno):
--    ✅ Pode ler todos os registros via política "Allow auth admin to read user roles"
--    ✅ Necessário para houston.custom_access_token_hook() funcionar
--
-- 2. Usuários authenticated:
--    ✅ Só podem ler se houston.authorize_simple('roles.select') retornar true
--    ✅ Verificação de permissões agora funciona corretamente via user_role_read_policy
--    ❌ Sem permissão 'roles.select', não conseguem ler
--
-- 3. Políticas ativas na tabela houston.user_roles para SELECT:
--    - "Allow auth admin to read user roles" → TO supabase_auth_admin USING (true)
--    - "user_role_read_policy" → TO authenticated USING (authorize_simple('roles.select'))
-- =====================================================================================
