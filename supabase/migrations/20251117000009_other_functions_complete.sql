-- =====================================================================================
-- Migration: 20251117000009_other_functions_complete.sql
-- Description: Other utility functions - count_candidaturas_total
-- =====================================================================================

-- Drop and recreate count_candidaturas_total function with corrected column name
DROP FUNCTION IF EXISTS public.count_candidaturas_total(uuid);

CREATE OR REPLACE FUNCTION public.count_candidaturas_total(vaga_id_param uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM candidaturas
  WHERE vaga_id = vaga_id_param;
$function$;