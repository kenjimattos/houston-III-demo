-- =====================================================================================
-- Migration: 20251117000005_escalista_architecture_refactor.sql
-- Description: Refactor escalista architecture - remove user_profile dependency, 
--              add status management, and update related functions
-- Consolidates:
--   - 20251110145510_add_escalista_status_and_triggers.sql
--   - 20251110145710_escalista_remove_user_profile_dependency.sql
--   - 20251110145810_fix_criar_escalista_function.sql
--   - 20251110145910_fix_get_current_user_grupo_id_table_name.sql
--   - 20251110151510_fix_function_get_current_user_group_id.sql (FINAL VERSION)
-- =====================================================================================

-- =========================================================================
-- PART 1: Add status field and enum
-- =========================================================================

-- Add status field to escalistas table
ALTER TABLE public.escalistas 
ADD COLUMN IF NOT EXISTS escalista_status character varying NOT NULL DEFAULT 'ativo';

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_escalista_status ON public.escalistas USING btree (escalista_status);

-- Create enum for status (optional, for validation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalista_status_enum') THEN
        CREATE TYPE escalista_status_enum AS ENUM ('pendente', 'ativo', 'inativo', 'suspenso');
    END IF;
END $$;

-- Update existing escalistas to 'ativo' status
UPDATE public.escalistas 
SET escalista_status = 'ativo' 
WHERE update_by IS NOT NULL;

-- =========================================================================
-- PART 2: Remove user_profile dependency - Restructure primary key
-- =========================================================================

-- 1. Drop views that depend on escalista structure

-- 2. Drop policies that depend on escalista structure
DROP POLICY IF EXISTS escalista_read_own_grupo ON public.grupos;
DROP POLICY IF EXISTS vagas_recorrencias_escalista_policy ON public.vagas_recorrencias;
DROP POLICY IF EXISTS escalista_policy ON public.escalistas;

-- 3. Drop dependent constraints
ALTER TABLE public.medicos_favoritos DROP CONSTRAINT IF EXISTS fk_medicos_favoritos_escalista;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_escalista_fkey;

-- 4. Drop escalista table constraints
ALTER TABLE public.escalistas DROP CONSTRAINT IF EXISTS escalista_escalista_auth_id_fkey;
ALTER TABLE public.escalistas DROP CONSTRAINT IF EXISTS escalista_pkey;
ALTER TABLE public.escalistas DROP CONSTRAINT IF EXISTS "escalista_id-de-escalista_key";

-- 5. Drop indexes
DROP INDEX IF EXISTS idx_escalista_nome;
DROP INDEX IF EXISTS idx_escalista_grupo;

-- 6. Migrate data: use auth_id as new id
ALTER TABLE public.escalistas ADD COLUMN id_temp uuid;

-- Update referencing tables first
UPDATE public.medicos_favoritos 
SET escalista_id = e.auth_id
FROM public.escalistas e
WHERE medicos_favoritos.escalista_id = e.id;

UPDATE public.vagas 
SET escalista_id = e.auth_id
FROM public.escalistas e
WHERE vagas.escalista_id = e.id;

-- Copy auth_id to temp column
UPDATE public.escalistas SET id_temp = auth_id;

-- Drop policies that depend on escalistas.auth_id column
DROP POLICY IF EXISTS "Enable escalista users read all data" ON public.medicos;
DROP POLICY IF EXISTS "Insert policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Update policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "vagas_update_policy" ON public.vagas;
DROP POLICY IF EXISTS vagas_recorrencia_escalista_policy ON public.vagas_recorrencias;

-- Drop old columns
ALTER TABLE public.escalistas DROP COLUMN IF EXISTS auth_id;
ALTER TABLE public.escalistas DROP COLUMN IF EXISTS id;

-- Rename temp column to id
ALTER TABLE public.escalistas RENAME COLUMN id_temp TO id;

-- 7. Set id as NOT NULL and create primary key
ALTER TABLE public.escalistas ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.escalistas ADD CONSTRAINT escalista_pkey PRIMARY KEY (id);

-- 8. Create foreign key to auth.users
ALTER TABLE public.escalistas 
ADD CONSTRAINT escalista_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 9. Recreate indexes
CREATE INDEX idx_escalista_nome ON public.escalistas USING btree (nome);
CREATE INDEX idx_escalista_grupo ON public.escalistas USING btree (grupo_id);
CREATE INDEX idx_escalista_id ON public.escalistas USING btree (id);

-- 10. Recreate constraints for referencing tables
ALTER TABLE public.medicos_favoritos 
ADD CONSTRAINT fk_medicos_favoritos_escalista 
FOREIGN KEY (escalista_id) REFERENCES public.escalistas(id) ON DELETE CASCADE;

ALTER TABLE public.vagas
ADD CONSTRAINT vagas_vagas_escalista_fkey 
FOREIGN KEY (escalista_id) REFERENCES escalistas(id) 
ON UPDATE CASCADE ON DELETE SET DEFAULT;

-- =========================================================================
-- PART 3: Update functions - FINAL VERSIONS
-- =========================================================================

-- Function: get_current_user_grupo_id() - FINAL VERSION
CREATE OR REPLACE FUNCTION public.get_current_user_grupo_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_user_id UUID;
    grupo_id_result UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT grupo_id INTO grupo_id_result
    FROM escalistas
    WHERE id = current_user_id;
    
    IF grupo_id_result IS NOT NULL THEN
        RETURN grupo_id_result;
    END IF;

    RETURN NULL;
END;
$function$;

-- Function: criar_escalista_from_auth() - FINAL VERSION
CREATE OR REPLACE FUNCTION public.criar_escalista_from_auth()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_phone varchar;
  user_metadata jsonb;
  display_name text;
  group_id uuid;
BEGIN
  RAISE NOTICE 'TRIGGER DEBUG: criar_escalista_from_auth() executada para usuário %', NEW.id;
  
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  RAISE NOTICE 'TRIGGER DEBUG: Metadados do usuário: %', user_metadata;
  
  IF user_metadata->>'platform_origin' = 'houston' OR 
     user_metadata->'data'->>'platform_origin' = 'houston' THEN
    
    RAISE NOTICE 'TRIGGER DEBUG: Usuário identificado como escalista (platform_origin=houston)';
    
    display_name := COALESCE(
      user_metadata->'data'->>'display_name',
      user_metadata->>'display_name',
      split_part(NEW.email, '@', 1)
    );
    
    user_phone := COALESCE(
      user_metadata->'data'->>'phone',
      user_metadata->>'phone',
      '(00) 00000-0000'
    );
    
    IF user_phone IS NOT NULL AND user_phone NOT LIKE '55%' THEN
      user_phone := '55' || user_phone;
    END IF;

    group_id := COALESCE(
      (user_metadata->'data'->>'group_id')::uuid,
      (user_metadata->>'group_id')::uuid,
      NULL
    );
    
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
      
    -- Add to houston.user_roles if not exists
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: activate_escalista_on_confirmation()
CREATE OR REPLACE FUNCTION activate_escalista_on_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    log_prefix TEXT := '[ACTIVATE_ESCALISTA]';
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE '%: Verificando confirmação de email: %', log_prefix, NEW.email;
    
    IF NEW.invited_at IS NOT NULL 
       AND OLD.email_confirmed_at IS NULL 
       AND NEW.email_confirmed_at IS NOT NULL THEN
        
        RAISE NOTICE '%: Email confirmado, ativando escalista...', log_prefix;
        
        UPDATE public.escalistas 
        SET 
            escalista_status = 'ativo',
            update_at = CURRENT_TIMESTAMP
        WHERE email = NEW.email 
          AND escalista_status = 'pendente';
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        IF affected_rows > 0 THEN
            RAISE NOTICE '%: Escalista ativado: %', log_prefix, NEW.email;
        ELSE
            RAISE NOTICE '%: Nenhum escalista pendente encontrado para: %', log_prefix, NEW.email;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '%: Erro ao ativar escalista: %', log_prefix, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- PART 4: Create triggers
-- =========================================================================

-- Remove old triggers if they exist

-- Trigger: Create escalista from auth.users
CREATE TRIGGER auth_users_criar_escalista_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_escalista_from_auth();

-- Trigger: Activate escalista on email confirmation
CREATE TRIGGER activate_escalista_on_email_confirmation
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION activate_escalista_on_confirmation();

-- =========================================================================
-- PART 5: Recreate policies with new structure
-- =========================================================================

-- Policy: escalista can read/write own data
CREATE POLICY escalista_policy ON public.escalistas 
TO authenticated 
USING (
    CASE
        WHEN (public.get_current_user_grupo_id() IS NULL) THEN true
        ELSE (grupo_id = public.get_current_user_grupo_id())
    END
);

-- Policy: escalista can read own grupo
CREATE POLICY escalista_read_own_grupo ON public.grupos
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM public.escalistas e
    WHERE e.id = auth.uid() 
    AND e.grupo_id = grupos.id
  )
);

-- Policy: escalista can access vagas_recorrencias
CREATE POLICY vagas_recorrencias_escalista_policy ON public.vagas_recorrencias
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE user_profile.id = auth.uid()
    AND user_profile.role = 'astronauta'
  ))
  OR
  (created_by = auth.uid())
  OR
  (EXISTS (
    SELECT 1
    FROM public.vagas v
    JOIN public.escalistas e ON e.grupo_id = v.grupo_id
    WHERE v.recorrencia_id = vagas_recorrencias.id
    AND e.id = auth.uid()
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE user_profile.id = auth.uid() 
    AND user_profile.role = 'astronauta'
  )) 
  OR 
  (EXISTS (
    SELECT 1 
    FROM public.escalistas e
    WHERE e.id = auth.uid()
  ))
);

-- =========================================================================
-- PART 6: Grant permissions
-- =========================================================================

GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT SELECT ON auth.users TO postgres, service_role;
GRANT INSERT, UPDATE, SELECT ON public.escalistas TO postgres, service_role;
GRANT INSERT, UPDATE, SELECT ON public.user_profile TO postgres, service_role;

GRANT USAGE ON SCHEMA houston TO anon, authenticated, service_role;
GRANT ALL ON houston.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON houston.user_roles TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA houston
GRANT ALL ON TABLES TO service_role;

-- =========================================================================
-- PART 7: Migrate existing escalistas to houston.user_roles
-- =========================================================================

-- Migration: Populate user_roles with current escalista data
-- Created: 2025-10-21
-- Description: Migra todos os escalistas existentes para a tabela houston.user_roles

-- Temporariamente desabilitar RLS para esta migration
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
    e.id as user_id,
    'escalista'::houston.app_role as role,
    CASE 
        WHEN e.grupo_id IS NOT NULL THEN ARRAY[e.grupo_id::uuid]
        ELSE ARRAY[]::uuid[]
    END as group_ids,
    ARRAY[]::uuid[] as hospital_ids,
    ARRAY[]::uuid[] as setor_ids
FROM public.escalistas e
WHERE e.escalista_status = 'ativo'
  AND EXISTS (
    -- Validar se o user_id existe na tabela users
    SELECT 1 FROM auth.users u 
    WHERE u.id = e.id
  )
  AND NOT EXISTS (
    -- Evitar duplicatas caso a migração seja executada novamente
    SELECT 1 FROM houston.user_roles ur 
    WHERE ur.user_id = e.id AND ur.role = 'escalista'
  );

-- Caso você queira inserir dados específicos manualmente, use esta sintaxe:
-- INSERT INTO houston.user_roles (user_id, role, group_ids, hospital_ids, setor_ids) 
-- VALUES 
--     ('08d174ab-43c8-4222-bea2-20a926eb7214'::uuid, 'escalista'::houston.app_role, ARRAY['3e21c0a7-2002-43b1-9c78-181596ea5470'::uuid], ARRAY[]::uuid[], ARRAY[]::uuid[]);

-- Reabilitar RLS
SET row_security = on;