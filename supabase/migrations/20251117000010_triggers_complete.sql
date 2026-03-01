-- =====================================================================================
-- Migration: 20251117000010_triggers_complete.sql
-- Description: Complete triggers with column name corrections
-- Consolidates:
--   - 20251110151910_fix_triggers_column_names.sql (FINAL)
--   - Triggers from 20251110145510 (escalista status - already in migration 05)
-- =====================================================================================

-- Migration: Corrigir nomenclatura de colunas nos triggers
-- Data: 2025-10-31
-- Descrição: Corrige triggers que usam nomenclatura antiga (vagas_id → vaga_id)
-- Issue: Triggers não funcionavam corretamente após refatoração da nomenclatura

-- ============================================
-- 1. Corrigir trigger: atualizar_vagas_status
-- ============================================
-- Este trigger atualiza o status da vaga para 'fechada' quando uma candidatura é aprovada
-- e reprova automaticamente todas as outras candidaturas para a mesma vaga

CREATE OR REPLACE FUNCTION public.atualizar_vagas_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Atualiza o status da vaga para 'fechada' quando a candidatura for 'APROVADO'
    IF NEW.status = 'APROVADO' THEN
        -- 1. Atualiza o status da vaga para 'fechada'
        UPDATE vagas
        SET status = 'fechada'
        WHERE id = NEW.vaga_id;  -- CORRIGIDO: vagas_id → vaga_id

        -- 2. Reprova todas as demais candidaturas para a mesma vaga
        UPDATE candidaturas
        SET status = 'REPROVADO',
            updated_at = NOW(),
            updated_by = 'SISTEMA_AUTO_REPROVACAO'
        WHERE vaga_id = NEW.vaga_id  -- CORRIGIDO: vagas_id → vaga_id
        AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

-- ============================================
-- 2. Corrigir trigger: update_total_candidaturas
-- ============================================
-- Este trigger mantém o contador de candidaturas atualizado na tabela vagas

CREATE OR REPLACE FUNCTION public.update_total_candidaturas()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vagas
        SET total_candidaturas = total_candidaturas + 1
        WHERE id = NEW.vaga_id;  -- CORRIGIDO: vagas_id → vaga_id
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            UPDATE public.vagas
            SET total_candidaturas = GREATEST(total_candidaturas - 1, 0)
            WHERE id = OLD.vaga_id;  -- CORRIGIDO: vagas_id → vaga_id
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar vagas durante exclusão: %', SQLERRM;
        END;
    END IF;
    RETURN NULL;
END;
$function$;
