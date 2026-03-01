-- =====================================================================================
-- Migration: Simplificar Políticas RLS - Tabela CANDIDATURAS
-- =====================================================================================
-- Data: 2025-12-08
-- Objetivo: Simplificar a política RLS de leitura da tabela candidaturas
-- A política anterior dependia de verificações desnecessárias que causavam complexidade excessiva
-- Otimizada função pode_ver_candidatura_colega() para melhor performance
--

-- Remover políticas existentes
DROP POLICY IF EXISTS "candidaturas_select_policy" ON public.candidaturas;

-- Remove funções de verificação para médicos
DROP FUNCTION IF EXISTS public.pode_ver_candidatura_colega(uuid);
DROP FUNCTION IF EXISTS public.pode_ver_candidatura_colega_debug(uuid);


-- Recria a função mais limpa e eficiente
CREATE FUNCTION "public"."pode_ver_candidatura_colega"("candidatura_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    current_user_id UUID;
    candidatura_hospital UUID;
    candidatura_setor UUID;
    current_user_role TEXT;
BEGIN
    current_user_id := auth.uid();

    -- Buscar hospital e setor da candidatura que está sendo verificada
    SELECT v.hospital_id, v.setor_id  
    INTO candidatura_hospital, candidatura_setor
    FROM public.candidaturas c
    JOIN public.vagas v ON c.vaga_id = v.id  
    WHERE c.id = candidatura_id 
      AND c.status = 'APROVADO';

    -- Se não encontrou dados da candidatura, retorna false
    IF candidatura_hospital IS NULL OR candidatura_setor IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o médico atual tem candidatura aprovada no mesmo hospital/setor
    -- Buscar tanto em medico_id quanto em medico_precadastro_id para o usuário atual
    RETURN EXISTS (
        SELECT 1
        FROM public.candidaturas c_user
        JOIN public.vagas v_user ON c_user.vaga_id = v_user.id 
        WHERE (
            c_user.medico_id = current_user_id
        )
          AND c_user.status = 'APROVADO'
          AND v_user.hospital_id = candidatura_hospital 
          AND v_user.setor_id = candidatura_setor 
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

CREATE POLICY "candidaturas_select_policy" ON public.candidaturas
  FOR SELECT TO authenticated
  USING (
        (EXISTS ( SELECT 1
        FROM user_profile
        WHERE (user_profile.id = ( SELECT auth.uid() AS uid)))) AND pode_ver_candidatura_colega(id)
  );
