-- =====================================================================================
-- Migration: 20251128210231_remove_nonstandard_trigger.sql
-- Description: Remove nonstandard trigger on grades table
-- This migration removes the trigger 'trigger_grades_updated_at' from the 'grades' table
-- as part of the schema standardization process.
-- created_at, updated_at columns should be managed by frontend.
-- Date: 2025-11-28 21:02:31
-- =====================================================================================


DROP TRIGGER IF EXISTS trigger_grades_updated_at ON grades;
DROP FUNCTION IF EXISTS handle_grades_updated_at();