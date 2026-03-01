-- =====================================================================================
-- Migration: 20251117000006_rls_policies_complete.sql
-- Description: RLS Policies Complete - Padrão RBAC Consistente
-- Data: 2025-11-17
-- =====================================================================================
--
-- Descrição:
-- Políticas RLS completas para todas as tabelas seguindo padrão RBAC consistente
--
-- Incorpora melhorias de:
-- - 20251118190856_refactor_rls_policies_rbac_pattern.sql
--
-- IMPORTANTE: Esta migration define políticas RLS refinadas que seguem o padrão
-- RBAC do Houston, garantindo controle de acesso granular por permissões, grupos,
-- hospitais e setores.
-- =====================================================================================

-- ============================================================================
-- TABELA: medicos
-- ============================================================================
DROP POLICY IF EXISTS "Enable escalista and astronauta users update medicos data" ON public.medicos;
DROP POLICY IF EXISTS "Enable escalista users read all data" ON public.medicos;
DROP POLICY IF EXISTS "Enable medico users update their own data only" ON public.medicos;
DROP POLICY IF EXISTS "Enable medicos users insert their own data only" ON public.medicos;
DROP POLICY IF EXISTS "Enable medicos users to view their own data only" ON public.medicos;
DROP POLICY IF EXISTS "medicos_delete_policy" ON public.medicos;
DROP POLICY IF EXISTS "medicos_insert_policy" ON public.medicos;
DROP POLICY IF EXISTS "medicos_select_policy" ON public.medicos;
DROP POLICY IF EXISTS "medicos_update_policy" ON public.medicos;

CREATE POLICY "medicos_delete_policy" ON public.medicos
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = id
  );

CREATE POLICY "medicos_insert_policy" ON public.medicos
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = id
  );

CREATE POLICY "medicos_select_policy" ON public.medicos
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize_simple('medicos.select'::houston.app_permission)
  );

CREATE POLICY "medicos_update_policy" ON public.medicos
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = id
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = id
  );

-- ============================================================================
-- TABELA: medicos_precadastro
-- ============================================================================
DROP POLICY IF EXISTS "medicos_precadastro_delete_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_insert_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_select_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "medicos_precadastro_update_policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Insert policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Select policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Update policy" ON public.medicos_precadastro;

-- Unificando permissões: medicos_precadastro agora usa permissões 'medicos.*'
CREATE POLICY "medicos_precadastro_delete_policy" ON public.medicos_precadastro
  FOR DELETE TO authenticated
  USING (
    houston.authorize_simple('medicos.delete'::houston.app_permission)
  );

CREATE POLICY "medicos_precadastro_insert_policy" ON public.medicos_precadastro
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize_simple('medicos.insert'::houston.app_permission)
  );

CREATE POLICY "medicos_precadastro_select_policy" ON public.medicos_precadastro
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize_simple('medicos.select'::houston.app_permission)
  );

CREATE POLICY "medicos_precadastro_update_policy" ON public.medicos_precadastro
  FOR UPDATE TO authenticated
  USING (
    houston.authorize_simple('medicos.update'::houston.app_permission)
  )
  WITH CHECK (
    houston.authorize_simple('medicos.update'::houston.app_permission)
  );

-- ============================================================================
-- TABELA: equipes
-- ============================================================================
DROP POLICY IF EXISTS "Delete policy" ON public.equipes;
DROP POLICY IF EXISTS "Insert policy" ON public.equipes;
DROP POLICY IF EXISTS "Read policy" ON public.equipes;
DROP POLICY IF EXISTS "Update policy" ON public.equipes;

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

-- ============================================================================
-- TABELA: equipes_medicos
-- ============================================================================
DROP POLICY IF EXISTS "Delete policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "Insert policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "Read policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "Update policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_delete_policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_insert_policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_select_policy" ON public.equipes_medicos;
DROP POLICY IF EXISTS "equipes_medicos_update_policy" ON public.equipes_medicos;

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

-- ============================================================================
-- TABELA: medicos_favoritos
-- ============================================================================
DROP POLICY IF EXISTS "medicos_favoritos_grupo_policy" ON public.medicos_favoritos;

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
  
-- ============================================================================
-- TABELA: escalistas
-- ============================================================================
DROP POLICY IF EXISTS "escalista_policy" ON public.escalistas; -- Política ALL duplicada
DROP POLICY IF EXISTS "escalista_select_houston_rbac" ON public.escalistas;
DROP POLICY IF EXISTS "escalistas_select_policy" ON public.escalistas;
DROP POLICY IF EXISTS "escalista_update_houston_rbac" ON public.escalistas;
DROP POLICY IF EXISTS "escalistas_update_policy" ON public.escalistas;
DROP POLICY IF EXISTS "escalista_insert_houston_rbac" ON public.escalistas;
DROP POLICY IF EXISTS "escalistas_insert_policy" ON public.escalistas;
DROP POLICY IF EXISTS "escalista_delete_houston_rbac" ON public.escalistas;
DROP POLICY IF EXISTS "escalistas_delete_policy" ON public.escalistas;

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

-- ============================================================================
-- TABELA: grupos
-- ============================================================================
DROP POLICY IF EXISTS "Enable full acess to astronauta user" ON public.grupos;
DROP POLICY IF EXISTS "Enable read to medico users" ON public.grupos;
DROP POLICY IF EXISTS "escalista_read_own_grupo" ON public.grupos;
DROP POLICY IF EXISTS "grupos_select_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_insert_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_update_policy" ON public.grupos;
DROP POLICY IF EXISTS "grupos_delete_policy" ON public.grupos;

CREATE POLICY "grupos_select_policy" ON public.grupos
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
    OR houston.group_authorization('grupos.select'::houston.app_permission, id)
  );

CREATE POLICY "grupos_insert_policy" ON public.grupos
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize_simple('grupos.insert'::houston.app_permission)
  );

CREATE POLICY "grupos_update_policy" ON public.grupos
  FOR UPDATE TO authenticated
  USING (
    houston.group_authorization('grupos.update'::houston.app_permission, id)
  )
  WITH CHECK (
    houston.group_authorization('grupos.update'::houston.app_permission, id)
  );

CREATE POLICY "grupos_delete_policy" ON public.grupos
  FOR DELETE TO authenticated
  USING (
    houston.authorize_simple('grupos.delete'::houston.app_permission)
  );

-- ============================================================================
-- TABELA: hospitais
-- ============================================================================
DROP POLICY IF EXISTS "Enable full acess to astronauta users" ON public.hospitais;
DROP POLICY IF EXISTS "Enable insert to escalista users" ON public.hospitais;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.hospitais;
DROP POLICY IF EXISTS "Enable update to escalista users" ON public.hospitais;
DROP POLICY IF EXISTS "hospitais_delete_policy" ON public.hospitais;
DROP POLICY IF EXISTS "hospitais_insert_policy" ON public.hospitais;
DROP POLICY IF EXISTS "hospitais_select_policy" ON public.hospitais;
DROP POLICY IF EXISTS "hospitais_update_policy" ON public.hospitais;

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

-- ============================================================================
-- TABELA: vagas
-- ============================================================================
DROP POLICY IF EXISTS "vagas_delete_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_insert_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_select_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_update_policy" ON public.vagas;

CREATE POLICY "vagas_delete_policy" ON public.vagas
  FOR DELETE TO authenticated
  USING (
    houston.authorize('vagas.delete'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "vagas_insert_policy" ON public.vagas
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('vagas.insert'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "vagas_select_policy" ON public.vagas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
    OR houston.authorize('vagas.select'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "vagas_update_policy" ON public.vagas
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('vagas.update'::houston.app_permission, hospital_id, setor_id, grupo_id)
  )
  WITH CHECK (
    houston.authorize('vagas.update'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

-- ============================================================================
-- TABELA: candidaturas
-- ============================================================================
DROP POLICY IF EXISTS "candidaturas_delete_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_insert_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_select_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_update_policy" ON public.candidaturas;

CREATE POLICY "candidaturas_delete_policy" ON public.candidaturas
  FOR DELETE TO authenticated
  USING (
    -- REVOLUNA: Apenas próprias candidaturas
    (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
    )
    OR
    -- HOUSTON: Por grupo/hospital/setor
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = candidaturas.vaga_id
          AND houston.authorize(
            'candidaturas.delete'::houston.app_permission,
            v.hospital_id, v.setor_id, v.grupo_id
          )
      )
    )
  );

CREATE POLICY "candidaturas_insert_policy" ON public.candidaturas
  FOR INSERT TO authenticated
  WITH CHECK (
    -- REVOLUNA: Apenas próprias candidaturas
    (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
    )
    OR
    -- HOUSTON: Por grupo/hospital/setor
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = candidaturas.vaga_id
          AND houston.authorize(
            'candidaturas.insert'::houston.app_permission,
            v.hospital_id, v.setor_id, v.grupo_id
          )
      )
    )
  );

CREATE POLICY "candidaturas_select_policy" ON public.candidaturas
  FOR SELECT TO authenticated
  USING (
    -- REVOLUNA: Próprias + colegas
    (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (
        (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
        OR pode_ver_candidatura_colega(id)
      )
    )
    OR
    -- HOUSTON: Por grupo/hospital/setor
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = candidaturas.vaga_id
          AND houston.authorize(
            'candidaturas.select'::houston.app_permission,
            v.hospital_id, v.setor_id, v.grupo_id
          )
      )
    )
  );

CREATE POLICY "candidaturas_update_policy" ON public.candidaturas
  FOR UPDATE TO authenticated
  USING (
    -- REVOLUNA: Apenas próprias candidaturas
    (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
    )
    OR
    -- HOUSTON: Por grupo/hospital/setor
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = candidaturas.vaga_id
          AND houston.authorize(
            'candidaturas.update'::houston.app_permission,
            v.hospital_id, v.setor_id, v.grupo_id
          )
      )
    )
  )
  WITH CHECK (
    -- REVOLUNA: Apenas próprias candidaturas
    (
      EXISTS (SELECT 1 FROM user_profile WHERE user_profile.id = (SELECT auth.uid()))
      AND (SELECT auth.uid()) IN (medico_id, medico_precadastro_id)
    )
    OR
    -- HOUSTON: Por grupo/hospital/setor
    (
      EXISTS (
        SELECT 1 FROM vagas v
        WHERE v.id = candidaturas.vaga_id
          AND houston.authorize(
            'candidaturas.update'::houston.app_permission,
            v.hospital_id, v.setor_id, v.grupo_id
          )
      )
    )
  );

-- ============================================================================
-- TABELA: checkin_checkout
-- ============================================================================
DROP POLICY IF EXISTS "Enable medico users full access to their own data" ON public.checkin_checkout;
DROP POLICY IF EXISTS "Enable read access to escalista users" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_delete_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_insert_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_select_policy" ON public.checkin_checkout;
DROP POLICY IF EXISTS "checkin_checkout_update_policy" ON public.checkin_checkout;

CREATE POLICY "checkin_checkout_delete_policy" ON public.checkin_checkout
  FOR DELETE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = checkin_checkout.vaga_id
          AND houston.authorize('relatorios.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "checkin_checkout_insert_policy" ON public.checkin_checkout
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = checkin_checkout.vaga_id
          AND houston.authorize('relatorios.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "checkin_checkout_select_policy" ON public.checkin_checkout
  FOR SELECT TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = checkin_checkout.vaga_id
          AND houston.authorize('relatorios.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "checkin_checkout_update_policy" ON public.checkin_checkout
  FOR UPDATE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = checkin_checkout.vaga_id
          AND houston.authorize('relatorios.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  )
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (SELECT auth.uid()) = medico_id
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = checkin_checkout.vaga_id
          AND houston.authorize('relatorios.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- ============================================================================
-- TABELA: grades
-- ============================================================================
DROP POLICY IF EXISTS "astronauts_can_delete_grades" ON public.grades;
DROP POLICY IF EXISTS "astronauts_can_insert_grades" ON public.grades;
DROP POLICY IF EXISTS "astronauts_can_select_grades" ON public.grades;
DROP POLICY IF EXISTS "astronauts_can_update_grades" ON public.grades;
DROP POLICY IF EXISTS "grades_delete_by_group" ON public.grades;
DROP POLICY IF EXISTS "grades_insert_by_group" ON public.grades;
DROP POLICY IF EXISTS "grades_select_by_group" ON public.grades;
DROP POLICY IF EXISTS "grades_update_by_group" ON public.grades;
DROP POLICY IF EXISTS "grades_delete_policy" ON public.grades;
DROP POLICY IF EXISTS "grades_insert_policy" ON public.grades;
DROP POLICY IF EXISTS "grades_select_policy" ON public.grades;
DROP POLICY IF EXISTS "grades_update_policy" ON public.grades;

CREATE POLICY "grades_delete_policy" ON public.grades
  FOR DELETE TO authenticated
  USING (
    houston.authorize('vagas.delete'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "grades_insert_policy" ON public.grades
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize('vagas.insert'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "grades_select_policy" ON public.grades
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    OR houston.authorize('vagas.select'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

CREATE POLICY "grades_update_policy" ON public.grades
  FOR UPDATE TO authenticated
  USING (
    houston.authorize('vagas.update'::houston.app_permission, hospital_id, setor_id, grupo_id)
  )
  WITH CHECK (
    houston.authorize('vagas.update'::houston.app_permission, hospital_id, setor_id, grupo_id)
  );

-- ============================================================================
-- TABELA: pagamentos
-- ============================================================================
DROP POLICY IF EXISTS "Enable medico user full access to their own data" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_escalista_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_delete_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_insert_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_select_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_update_policy" ON public.pagamentos;

CREATE POLICY "pagamentos_delete_policy" ON public.pagamentos
  FOR DELETE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('relatorios.delete'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "pagamentos_insert_policy" ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('relatorios.insert'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "pagamentos_select_policy" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('relatorios.select'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

CREATE POLICY "pagamentos_update_policy" ON public.pagamentos
  FOR UPDATE TO authenticated
  USING (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('relatorios.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  )
  WITH CHECK (
    (
      (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
      AND (auth.uid() = medico_id OR (SELECT auth.uid()) = medicos_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = pagamentos.vaga_id
          AND houston.authorize('relatorios.update'::houston.app_permission, v.hospital_id, v.setor_id, v.grupo_id)
      )
    )
  );

-- ============================================================================
-- TABELA: vagas_beneficio
-- ============================================================================
DROP POLICY IF EXISTS "Enable full access to astronauta users" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficio_escalista_policy" ON public.vagas_beneficios; -- Política ALL duplicada
DROP POLICY IF EXISTS "vagas_beneficios_escalista_policy" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_delete_policy" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_insert_policy" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_select_policy" ON public.vagas_beneficios;
DROP POLICY IF EXISTS "vagas_beneficios_update_policy" ON public.vagas_beneficios;

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

-- ============================================================================
-- TABELA: vagas_recorrencia
-- ============================================================================
DROP POLICY IF EXISTS "Enable full access to astronauta users" ON public.vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_escalista_policy" ON public.vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_delete_policy" ON public.vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_insert_policy" ON public.vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_select_policy" ON public.vagas_recorrencias;
DROP POLICY IF EXISTS "vagas_recorrencias_update_policy" ON public.vagas_recorrencias;

-- Nota: vagas_recorrencias não tem referência direta a vaga
-- Usaremos a relação inversa (vagas tem recorrencia_id)
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

CREATE POLICY "vagas_recorrencias_insert_policy" ON public.vagas_recorrencias
  FOR INSERT TO authenticated
  WITH CHECK (
    houston.authorize_simple('vagas.insert'::houston.app_permission)
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

-- ============================================================================
-- TABELA: vagas_requisito
-- ============================================================================
DROP POLICY IF EXISTS "Enable full access to astronauta users" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisito_escalista_policy" ON public.vagas_requisitos; -- Política ALL duplicada
DROP POLICY IF EXISTS "vagas_requisitos_escalista_policy" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_delete_policy" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_insert_policy" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_select_policy" ON public.vagas_requisitos;
DROP POLICY IF EXISTS "vagas_requisitos_update_policy" ON public.vagas_requisitos;

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

-- ============================================================================
-- TABELA: vagas_salvas
-- ============================================================================
DROP POLICY IF EXISTS "Enable medico users full access to their own data" ON public.vagas_salvas;
DROP POLICY IF EXISTS "Enable read to astronauta and escalista users" ON public.vagas_salvas;
DROP POLICY IF EXISTS "vagas_salvas_delete_policy" ON public.vagas_salvas;
DROP POLICY IF EXISTS "vagas_salvas_insert_policy" ON public.vagas_salvas;
DROP POLICY IF EXISTS "vagas_salvas_select_policy" ON public.vagas_salvas;
DROP POLICY IF EXISTS "vagas_salvas_update_policy" ON public.vagas_salvas;

CREATE POLICY "vagas_salvas_delete_policy" ON public.vagas_salvas
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = medico_id
  );

CREATE POLICY "vagas_salvas_insert_policy" ON public.vagas_salvas
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = medico_id
  );

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

CREATE POLICY "vagas_salvas_update_policy" ON public.vagas_salvas
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = medico_id
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.user_profile WHERE user_profile.id = (SELECT auth.uid())))
    AND (SELECT auth.uid()) = medico_id
  );

-- ============================================================================
-- LIMPEZA: Migrar permissões medicos_precadastro.* para medicos.*
-- ============================================================================

-- Remover as permissões antigas 'medicos_precadastro.*' da tabela role_permissions
DELETE FROM houston.role_permissions
WHERE permission::text IN (
  'medicos_precadastro.delete',
  'medicos_precadastro.insert',
  'medicos_precadastro.select',
  'medicos_precadastro.update'
);

-- ============================================================================
-- NOTA: Enums obsoletos 'medicos_precadastro.*'
-- ============================================================================

-- Os valores do enum 'medicos_precadastro.*' não são mais utilizados após esta migração.
-- PostgreSQL não permite remover valores de enum dentro de uma transação (que é o caso
-- das migrations do Supabase), então os valores permanecerão no enum mas não serão usados.
--
-- Valores obsoletos (não causam problemas, apenas ficam no enum sem uso):
--   - medicos_precadastro.delete
--   - medicos_precadastro.insert
--   - medicos_precadastro.select
--   - medicos_precadastro.update
--
-- Caso queira removê-los manualmente no futuro (fora de uma migration):
--   ALTER TYPE houston.app_permission DROP VALUE 'medicos_precadastro.delete';
--   ALTER TYPE houston.app_permission DROP VALUE 'medicos_precadastro.insert';
--   ALTER TYPE houston.app_permission DROP VALUE 'medicos_precadastro.select';
--   ALTER TYPE houston.app_permission DROP VALUE 'medicos_precadastro.update';

-- =====================================================================================
-- STORAGE RLS POLICIES
-- =====================================================================================
-- NOTA: RLS já está habilitado em storage.objects por padrão

-- =====================================================================================
-- REMOVER TODAS AS POLÍTICAS ANTIGAS DE STORAGE
-- =====================================================================================

-- Políticas antigas de profilepictures
DROP POLICY IF EXISTS "Allow users to full access to their own folder onl 1mzryse_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to full access to their own folder onl 1mzryse_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to full access to their own folder onl 1mzryse_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to full access to their own folder onl 1mzryse_3" ON storage.objects;
DROP POLICY IF EXISTS "Give read access to astronautas 1mzryse_0" ON storage.objects;

-- Políticas antigas de carteira-digital
DROP POLICY IF EXISTS "Enable delete to escalista users 1wc8v7_0" ON storage.objects;
DROP POLICY IF EXISTS "Enable full acess to astronauta users 1a9pyda_0" ON storage.objects;
DROP POLICY IF EXISTS "Enable full acess to astronauta users 1a9pyda_1" ON storage.objects;
DROP POLICY IF EXISTS "Enable full acess to astronauta users 1a9pyda_2" ON storage.objects;
DROP POLICY IF EXISTS "Enable full acess to astronauta users 1a9pyda_3" ON storage.objects;
DROP POLICY IF EXISTS "Enable read and insert to escalista users 1a9pyda_0" ON storage.objects;
DROP POLICY IF EXISTS "Enable read and insert to escalista users 1a9pyda_1" ON storage.objects;

-- Políticas antigas de avatarhospitais
DROP POLICY IF EXISTS "Enable read to authenticated users 1wc8v7_0" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to astronauta users 1wc8v7_0" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to astronauta users 1wc8v7_1" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to astronauta users 1wc8v7_2" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to astronauta users 1wc8v7_3" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to escalista users 1wc8v7_0" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to escalista users 1wc8v7_1" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to escalista users 1wc8v7_2" ON storage.objects;
DROP POLICY IF EXISTS "Give full access to escalista users 1wc8v7_3" ON storage.objects;

-- Políticas antigas de documentos_medicos (bucket que não existe mais)
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar documentos" ON storage.objects;

-- =====================================================================================
-- BUCKET: avatarhospitais
-- Políticas: authenticated pode inserir/deletar com permissão RBAC, public pode ler
-- =====================================================================================

CREATE POLICY "avatarhospitais_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatarhospitais');

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

  -- =====================================================================================
  -- BUCKET: carteira-digital
  -- Políticas: usuário pode gerenciar sua própria pasta OU ter permissão RBAC
  -- =====================================================================================

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
-- BUCKET: profilepictures
-- Políticas: usuário só pode gerenciar sua própria pasta
-- =====================================================================================

CREATE POLICY "profilepictures_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profilepictures'
  AND (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
);

CREATE POLICY "profilepictures_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profilepictures'
  AND (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
);

-- =====================================================================================
-- BUCKET: bannersmarketing
-- Sem políticas RLS - acesso controlado apenas pela configuração do bucket (public)
-- =====================================================================================

-- Comentários sobre a estrutura de pastas esperada:
-- - avatarhospitais: arquivos na raiz ou organizados por hospital_id
-- - carteira-digital: organizados por user_id (auth.uid())
-- - profilepictures: organizados por user_id (auth.uid())
-- - bannersmarketing: arquivos públicos na raiz

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
