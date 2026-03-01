-- =====================================================================================
-- Migration: 20251121000002_mobile_app_utility_functions.sql
-- Description: Atualização de funções utilitárias do app mobile
--   - Corrige nomes de tabelas e colunas após padronização de schema
--   - get_cpf: medico_cpf -> cpf
--   - get_crm: nova função
--   - update_phone_forotp: codigosdearea -> codigos_area, colunas padronizadas
-- =====================================================================================

-- =========================================================================
-- FUNÇÃO: get_cpf
-- Verifica se um CPF já está cadastrado na tabela medicos
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    exists_flag BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.medicos
        WHERE cpf = cpf_input
    ) INTO exists_flag;

    RETURN exists_flag;
END;
$function$;

-- =========================================================================
-- FUNÇÃO: get_crm
-- Verifica se um CRM já está cadastrado na tabela medicos
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_crm(crm_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    exists_flag BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.medicos
        WHERE crm = crm_input
    ) INTO exists_flag;

    RETURN exists_flag;
END;
$function$;

-- =========================================================================
-- FUNÇÃO: update_phone_forotp
-- Atualiza o telefone do usuário para uso com OTP
-- Corrigido para usar nomes de tabelas/colunas padronizados
-- =========================================================================

CREATE OR REPLACE FUNCTION public.update_phone_forotp(user_id uuid, areacodeindex integer, telefone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    areacode TEXT;
BEGIN
    -- Buscar código de área na tabela (nomes padronizados)
    SELECT codigo INTO areacode
    FROM codigos_area
    WHERE index = areacodeindex;

    -- Remover o símbolo + do código de área
    areacode := REPLACE(areacode, '+', '');

    -- Atualiza auth.users
    UPDATE auth.users
    SET phone = areacode || telefone,
        raw_app_meta_data = jsonb_set(
            COALESCE(raw_app_meta_data, '{}'::jsonb),
            '{providers}',
            '["email", "phone"]'::jsonb
        ),
        updated_at = NOW(),
        phone_confirmed_at = NOW()
    WHERE id = user_id;

    -- Cria entrada em auth.identities
    INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        updated_at,
        last_sign_in_at,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        user_id,
        user_id,
        jsonb_build_object(
            'sub', user_id,
            'phone', areacode || telefone,
            'email_verified', false,
            'phone_verified', true
        ),
        'phone',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
        identity_data = EXCLUDED.identity_data,
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro: %', SQLERRM;
END;
$function$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
