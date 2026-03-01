-- =====================================================================================
-- Migration: 20251117000012_user_creation_refactor.sql
-- Description: Refatoração do sistema de criação de usuários
--   - Remove dependência de user_profile para escalistas/astronautas
--   - Padroniza triggers e funções de criação de usuários
--   - Integra com houston.user_roles
-- =====================================================================================

-- =========================================================================
-- FASE 1: LIMPEZA - Remover dados e objetos antigos
-- =========================================================================

-- Remover usuários escalistas e astronautas da tabela user_profile (legado)
DELETE FROM public.user_profile WHERE role IN ('escalista', 'astronauta');

-- Remover trigger antigo de sincronização de usuários
DROP TRIGGER IF EXISTS auth_user_sync_insert ON auth.users;

-- Remover função antiga de sincronização
DROP FUNCTION IF EXISTS public.sync_user_profile();

-- Remover triggers antigos de criação de escalista
DROP TRIGGER IF EXISTS auth_users_criar_escalista_trigger ON auth.users;
DROP TRIGGER IF EXISTS activate_escalista_on_email_confirmation ON auth.users;

-- Remover função antiga de criação de escalista
DROP FUNCTION IF EXISTS public.criar_escalista_from_auth();

-- =========================================================================
-- FASE 2: CRIAR NOVA FUNÇÃO DE CRIAÇÃO DE USUÁRIOS
-- =========================================================================

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

    -- -- Adicionar prefixo 55 se não existir
    -- IF user_phone IS NOT NULL AND user_phone NOT LIKE '55%' THEN
    --   user_phone := '55' || user_phone;
    -- END IF;

    -- Extrair group_id de forma segura (suporta formato aninhado e direto)
    BEGIN
      group_id := COALESCE(
        (user_metadata->'data'->>'group_id')::uuid,
        (user_metadata->>'group_id')::uuid,
        NULL
      );
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE NOTICE 'TRIGGER DEBUG: group_id inválido para usuário %', NEW.id;
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
    INSERT INTO houston.user_roles (
      user_id,
      role,
      group_ids,
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
      group_ids = CASE WHEN group_id IS NOT NULL THEN ARRAY[group_id] ELSE '{}'::uuid[] END;

    RAISE NOTICE 'TRIGGER DEBUG: Escalista criado/atualizado com sucesso para usuário %', NEW.id;

  ELSE
    RAISE NOTICE 'TRIGGER DEBUG: Usuário % não é escalista (platform_origin não é houston)', NEW.id;

    -- Usuário comum (app mobile) - mantém na user_profile
    INSERT INTO public.user_profile (
      id,
      created_at,
      role,
      displayname,
      platform
    ) VALUES (
      NEW.id,
      NOW(),
      'signup',
      COALESCE(user_metadata->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(user_metadata->>'platform', 'mobile')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================================
-- FASE 3: CRIAR TRIGGERS PADRONIZADOS
-- =========================================================================

-- Trigger principal: criação de usuário
CREATE TRIGGER users_1_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_from_auth();

-- Trigger secundário: ativação de escalista após confirmação de email
CREATE TRIGGER users_2_ativar_escalista
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION activate_escalista_on_confirmation();

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
