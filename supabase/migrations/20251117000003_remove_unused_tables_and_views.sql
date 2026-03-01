-- =====================================================================================
-- Migration: 20251117000003_remove_unused_tables_and_views.sql
-- Description: Remove unused tables and views from the database
-- Consolidates: 20251110144810_removing_unused_tables_and_views.sql
-- =====================================================================================

-- Remove views
DROP VIEW IF EXISTS "public"."vw_candidaturas_pendentes" CASCADE;
DROP VIEW IF EXISTS "public"."vw_candidaturas_por_dia" CASCADE;
DROP VIEW IF EXISTS "public"."vw_dashboard_metrics" CASCADE;
DROP VIEW IF EXISTS "public"."vw_distribuicao_especialidades" CASCADE;
DROP VIEW IF EXISTS "public"."vw_grupo_nome" CASCADE;
DROP VIEW IF EXISTS "public"."vw_ocupacao_plantoes" CASCADE;
DROP VIEW IF EXISTS "public"."vw_todas_candidaturas" CASCADE;
DROP VIEW IF EXISTS "public"."vw_usuarios_por_dia" CASCADE;
DROP VIEW IF EXISTS "public"."vw_vagas_dias_contagem" CASCADE;
DROP VIEW IF EXISTS "public"."vw_vagas_especialidade" CASCADE;
DROP VIEW IF EXISTS "public"."vw_vagas_grade_info" CASCADE;
DROP VIEW IF EXISTS "public"."vw_vagas_por_mes" CASCADE;

DROP MATERIALIZED VIEW IF EXISTS vw_vagas_disponiveis CASCADE;

-- Remove tables
DROP TABLE IF EXISTS "public"."carteira_digital" CASCADE;
DROP TABLE IF EXISTS "public"."local_medico" CASCADE;
DROP TABLE IF EXISTS "public"."local" CASCADE;
DROP TABLE IF EXISTS "public"."sistema_logs" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_documentos" CASCADE;
DROP TABLE IF EXISTS "public"."validacao_documentos" CASCADE;
