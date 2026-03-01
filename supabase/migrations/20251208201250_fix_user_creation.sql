-- =====================================================================================
-- Migration: Fix User Creation
-- =====================================================================================
-- Data: 2025-12-08
-- Objetivo: Corrigir preenchimento da tabela user_profile na criação de usuários médicos
-- A função preenchia incorretamente a tabela escalistas na criação de usuários do app mobile
-- a tabela não possui coluna update_by, o que causava falha na inserção.

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
      role
    ) VALUES (
      NEW.id,
      NOW(),
      'signup'
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

ATUALIZADO (2025-12-08): Corrigido preenchimento da tabela user_profile na criação de usuários médicos.';

-- Recriar o trigger
CREATE TRIGGER users_1_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_from_auth();