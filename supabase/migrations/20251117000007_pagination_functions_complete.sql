-- =====================================================================================
-- Migration: 20251117000007_pagination_functions_complete.sql
-- Description: Complete pagination functions with all corrections applied
-- Consolidates:
--   - 20251110150210_fix_get_applications_paginated_function.sql
--   - 20251110150310_fix_get_vagas_paginated_function.sql
--   - 20251110150910_completely_fix_get_applications_paginated.sql (FINAL)
--   - 20251110151010_fix_get_vagas_paginated_function.sql (FINAL)
--   - 20251110151610_fix_function_get_paginated.sql
-- =====================================================================================

-- Migration: Completely fix get_applications_paginated function
-- Created: 2025-10-21
-- Description: Remove completamente todas as versões da função e recria uma nova versão corrigida

-- Remove todas as versões da função usando schema específico
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop todas as versões da função get_applications_paginated
    FOR r IN 
        SELECT 'DROP FUNCTION IF EXISTS ' || 
               n.nspname || '.' || 
               p.proname || '(' || 
               pg_get_function_identity_arguments(p.oid) || ');' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_applications_paginated'
          AND n.nspname = 'public'
    LOOP
        EXECUTE r.drop_statement;
    END LOOP;
END $$;

-- Recriar a função com a assinatura corrigida
DROP FUNCTION IF EXISTS get_applications_paginated(
  integer,
  integer,
  uuid [],
  uuid [],
  uuid [],
  date,
  date,
  numeric,
  numeric,
  uuid [],
  uuid [],
  uuid [],
  text,
  uuid [],
  text [],
  text [],
  uuid []
);
CREATE OR REPLACE FUNCTION get_applications_paginated(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10,
    hospital_ids uuid [] DEFAULT NULL,
    specialty_ids uuid [] DEFAULT NULL,
    sector_ids uuid [] DEFAULT NULL,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL,
    min_value numeric DEFAULT NULL,
    max_value numeric DEFAULT NULL,
    period_ids uuid [] DEFAULT NULL,
    type_ids uuid [] DEFAULT NULL,
    group_ids uuid [] DEFAULT NULL,
    search_text text DEFAULT NULL,
    doctor_ids uuid [] DEFAULT NULL,
    application_status_filter text [] DEFAULT NULL,
    -- Valores: ['PENDENTE', 'APROVADO', 'REPROVADO']
    job_status_filter text [] DEFAULT NULL,
    -- Valores: ['aberta', 'fechada', 'cancelada', 'anunciada']
    grade_ids uuid [] DEFAULT NULL,
    order_by text DEFAULT 'candidatura_createdate',
    -- Valores: 'candidatura_createdate', 'vaga_createdate', 'vaga_data', 'vaga_valor', 'medico_primeiro_nome', 'hospital_nome', 'setor_nome', 'especialidade_nome', 'vaga_periodo_nome', 'vaga_status', 'candidatura_status'
    order_direction text DEFAULT 'DESC' -- Valores: 'ASC', 'DESC'
  ) RETURNS TABLE(data jsonb, pagination jsonb) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE validated_page integer;
validated_size integer;
total_count bigint;
offset_value integer;
validated_order_by text;
validated_order_direction text;
order_clause text;
BEGIN validated_page := CASE
  WHEN page_number < 1 THEN 1
  ELSE page_number
END;
validated_size := CASE
  WHEN page_size < 1 THEN 10
  WHEN page_size > 100 THEN 100
  ELSE page_size
END;
-- Validação dos parâmetros de ordenação
validated_order_by := CASE
  WHEN order_by IN (
    'candidatura_createdate',
    'vaga_createdate',
    'vaga_data',
    'vaga_valor',
    'medico_primeiro_nome',
    'hospital_nome',
    'setor_nome',
    'especialidade_nome',
    'vaga_periodo_nome',
    'vaga_status',
    'candidatura_status'
  ) THEN order_by
  ELSE 'candidatura_createdate'
END;
validated_order_direction := CASE
  WHEN UPPER(order_direction) IN ('ASC', 'DESC') THEN UPPER(order_direction)
  ELSE 'DESC'
END;
offset_value := (validated_page - 1) * validated_size;
-- Contagem total de candidaturas (não agrupadas)
SELECT COUNT(*) INTO total_count
FROM vw_vagas_candidaturas v
WHERE v.candidatura_id IS NOT NULL
  AND (
    hospital_ids IS NULL
    OR v.hospital_id = ANY(hospital_ids)
  )
  AND (
    specialty_ids IS NULL
    OR v.especialidade_id = ANY(specialty_ids)
  )
  AND (
    sector_ids IS NULL
    OR v.setor_id = ANY(sector_ids)
  )
  AND (
    period_ids IS NULL
    OR v.vaga_periodo = ANY(period_ids)
  )
  AND (
    type_ids IS NULL
    OR v.vaga_tipo = ANY(type_ids)
  )
  AND (
    group_ids IS NULL
    OR v.grupo_id = ANY(group_ids)
  )
  AND (
    start_date IS NULL
    OR v.candidatura_createdate >= start_date
  )
  AND (
    end_date IS NULL
    OR v.candidatura_createdate <= end_date
  )
  AND (
    min_value IS NULL
    OR v.vaga_valor >= min_value
  )
  AND (
    max_value IS NULL
    OR v.vaga_valor <= max_value
  ) -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
  AND (
    doctor_ids IS NULL
    OR v.medico_id = ANY(doctor_ids)
  ) -- Filtro por status das candidaturas
  AND (
    application_status_filter IS NULL
    OR v.candidatura_status = ANY(application_status_filter)
  ) -- Filtro por status das vagas
  AND (
    job_status_filter IS NULL
    OR v.vaga_status = ANY(job_status_filter)
  ) -- Filtro por grades
  AND (
    grade_ids IS NULL
    OR v.grade_id = ANY(grade_ids)
  )
  AND (
    search_text IS NULL
    OR v.hospital_nome ILIKE '%' || search_text || '%'
    OR v.especialidade_nome ILIKE '%' || search_text || '%'
    OR v.vaga_observacoes ILIKE '%' || search_text || '%'
    OR v.setor_nome ILIKE '%' || search_text || '%'
  );
RETURN QUERY
SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'candidatura_id',
        v.candidatura_id,
        'candidatura_status',
        v.candidatura_status,
        'candidatura_createdate',
        v.candidatura_createdate,
        'vaga_salva',
        v.vaga_salva,
        'vaga',
        jsonb_build_object(
          'vaga_id',
          v.vaga_id,
          'vaga_data',
          v.vaga_data,
          'vaga_horainicio',
          v.vaga_horainicio,
          'vaga_horafim',
          v.vaga_horafim,
          'vaga_valor',
          v.vaga_valor,
          'vaga_status',
          v.vaga_status,
          'vaga_observacoes',
          v.vaga_observacoes,
          'vaga_datapagamento',
          v.vaga_datapagamento,
          'total_candidaturas',
          v.total_candidaturas,
          'vaga_createdate',
          v.vaga_createdate,
          'vaga_periodo',
          v.vaga_periodo,
          'vaga_periodo_nome',
          v.vaga_periodo_nome,
          'vaga_tipo',
          v.vaga_tipo,
          'vaga_tipo_nome',
          v.vaga_tipo_nome
        ),
        'medico',
        jsonb_build_object(
          'medico_id',
          v.medico_id,
          'medico_primeiro_nome',
          v.medico_primeiro_nome,
          'medico_sobrenome',
          v.medico_sobrenome,
          'medico_crm',
          v.medico_crm,
          'medico_estado',
          v.medico_estado,
          'medico_email',
          v.medico_email,
          'medico_telefone',
          v.medico_telefone
        ),
        'hospital',
        jsonb_build_object(
          'hospital_id',
          v.hospital_id,
          'hospital_nome',
          v.hospital_nome,
          'hospital_estado',
          v.hospital_estado,
          'hospital_lat',
          v.hospital_lat,
          'hospital_log',
          v.hospital_log,
          'hospital_end',
          v.hospital_end,
          'hospital_avatar',
          v.hospital_avatar
        ),
        'especialidade',
        jsonb_build_object(
          'especialidade_id',
          v.especialidade_id,
          'especialidade_nome',
          v.especialidade_nome
        ),
        'setor',
        jsonb_build_object(
          'setor_id',
          v.setor_id,
          'setor_nome',
          v.setor_nome
        ),
        'escalista',
        jsonb_build_object(
          'escalista_id',
          v.escalista_id,
          'escalista_nome',
          v.escalista_nome,
          'escalista_email',
          v.escalista_email,
          'escalista_telefone',
          v.escalista_telefone
        ),
        'grupo',
        jsonb_build_object(
          'grupo_id',
          v.grupo_id,
          'grupo_nome',
          v.grupo_nome
        ),
        'grade',
        jsonb_build_object(
          'grade_id',
          v.grade_id,
          'grade_nome',
          v.grade_nome,
          'grade_cor',
          v.grade_cor
        )
      )
    ),
    '[]'::jsonb
  ) AS data,
  jsonb_build_object(
    'current_page',
    validated_page,
    'page_size',
    validated_size,
    'total_count',
    total_count,
    'total_pages',
    CASE
      WHEN total_count = 0 THEN 0
      ELSE CEIL(total_count::numeric / validated_size::numeric)::integer
    END,
    'has_previous',
    validated_page > 1,
    'has_next',
    validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer,
    'previous_page',
    CASE
      WHEN validated_page > 1 THEN validated_page - 1
      ELSE NULL
    END,
    'next_page',
    CASE
      WHEN validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer THEN validated_page + 1
      ELSE NULL
    END
  ) AS pagination
FROM (
    SELECT *
    FROM vw_vagas_candidaturas v
    WHERE v.candidatura_id IS NOT NULL
      AND (
        hospital_ids IS NULL
        OR v.hospital_id = ANY(hospital_ids)
      )
      AND (
        specialty_ids IS NULL
        OR v.especialidade_id = ANY(specialty_ids)
      )
      AND (
        sector_ids IS NULL
        OR v.setor_id = ANY(sector_ids)
      )
      AND (
        period_ids IS NULL
        OR v.vaga_periodo = ANY(period_ids)
      )
      AND (
        type_ids IS NULL
        OR v.vaga_tipo = ANY(type_ids)
      )
      AND (
        group_ids IS NULL
        OR v.grupo_id = ANY(group_ids)
      )
      AND (
        start_date IS NULL
        OR v.candidatura_createdate >= start_date
      )
      AND (
        end_date IS NULL
        OR v.candidatura_createdate <= end_date
      )
      AND (
        min_value IS NULL
        OR v.vaga_valor >= min_value
      )
      AND (
        max_value IS NULL
        OR v.vaga_valor <= max_value
      ) -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
      AND (
        doctor_ids IS NULL
        OR v.medico_id = ANY(doctor_ids)
      ) -- Filtro por status das candidaturas
      AND (
        application_status_filter IS NULL
        OR v.candidatura_status = ANY(application_status_filter)
      ) -- Filtro por status das vagas
      AND (
        job_status_filter IS NULL
        OR v.vaga_status = ANY(job_status_filter)
      ) -- Filtro por grades
      AND (
        grade_ids IS NULL
        OR v.grade_id = ANY(grade_ids)
      )
      AND (
        search_text IS NULL
        OR v.hospital_nome ILIKE '%' || search_text || '%'
        OR v.especialidade_nome ILIKE '%' || search_text || '%'
        OR v.vaga_observacoes ILIKE '%' || search_text || '%'
        OR v.setor_nome ILIKE '%' || search_text || '%'
      )
    ORDER BY CASE
        WHEN validated_order_by = 'candidatura_createdate'
        AND validated_order_direction = 'DESC' THEN v.candidatura_createdate
      END DESC,
      CASE
        WHEN validated_order_by = 'candidatura_createdate'
        AND validated_order_direction = 'ASC' THEN v.candidatura_createdate
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_createdate'
        AND validated_order_direction = 'DESC' THEN v.vaga_createdate
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_createdate'
        AND validated_order_direction = 'ASC' THEN v.vaga_createdate
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_data'
        AND validated_order_direction = 'DESC' THEN v.vaga_data
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_data'
        AND validated_order_direction = 'ASC' THEN v.vaga_data
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_valor'
        AND validated_order_direction = 'DESC' THEN v.vaga_valor
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_valor'
        AND validated_order_direction = 'ASC' THEN v.vaga_valor
      END ASC,
      CASE
        WHEN validated_order_by = 'medico_primeiro_nome'
        AND validated_order_direction = 'DESC' THEN v.medico_primeiro_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'medico_primeiro_nome'
        AND validated_order_direction = 'ASC' THEN v.medico_primeiro_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'hospital_nome'
        AND validated_order_direction = 'DESC' THEN v.hospital_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'hospital_nome'
        AND validated_order_direction = 'ASC' THEN v.hospital_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'setor_nome'
        AND validated_order_direction = 'DESC' THEN v.setor_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'setor_nome'
        AND validated_order_direction = 'ASC' THEN v.setor_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'especialidade_nome'
        AND validated_order_direction = 'DESC' THEN v.especialidade_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'especialidade_nome'
        AND validated_order_direction = 'ASC' THEN v.especialidade_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_periodo_nome'
        AND validated_order_direction = 'DESC' THEN v.vaga_periodo_nome
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_periodo_nome'
        AND validated_order_direction = 'ASC' THEN v.vaga_periodo_nome
      END ASC,
      CASE
        WHEN validated_order_by = 'vaga_status'
        AND validated_order_direction = 'DESC' THEN v.vaga_status
      END DESC,
      CASE
        WHEN validated_order_by = 'vaga_status'
        AND validated_order_direction = 'ASC' THEN v.vaga_status
      END ASC,
      CASE
        WHEN validated_order_by = 'candidatura_status'
        AND validated_order_direction = 'DESC' THEN v.candidatura_status
      END DESC,
      CASE
        WHEN validated_order_by = 'candidatura_status'
        AND validated_order_direction = 'ASC' THEN v.candidatura_status
      END ASC
    LIMIT validated_size OFFSET offset_value
  ) v;
END;
$$;
GRANT EXECUTE ON FUNCTION get_applications_paginated(
    integer,
    integer,
    uuid [],
    uuid [],
    uuid [],
    date,
    date,
    numeric,
    numeric,
    uuid [],
    uuid [],
    uuid [],
    text,
    uuid [],
    text [],
    text [],
    uuid [],
    text,
    text
  ) TO authenticated;
COMMENT ON FUNCTION get_applications_paginated IS 'Busca candidaturas individuais (não agrupadas) com filtros opcionais usando arrays em snake_case. Filtros disponíveis: hospital_ids[], specialty_ids[], sector_ids[], period_ids[], type_ids[], group_ids[], doctor_ids[], application_status_filter[PENDENTE,APROVADO,REPROVADO], job_status_filter[aberta,fechada,cancelada,anunciada], grade_ids[], além de filtros de data, valor e texto. Parâmetros de ordenação: order_by[candidatura_createdate,vaga_createdate,vaga_data,vaga_valor,medico_primeiro_nome,hospital_nome,setor_nome,especialidade_nome,vaga_periodo_nome,vaga_status,candidatura_status], order_direction[ASC,DESC]. Retorna cada candidatura separadamente com informações completas da vaga e médico associados.';
-- Add comment
COMMENT ON FUNCTION get_applications_paginated IS 'Busca candidaturas individuais com filtros opcionais usando os campos corretos da view vw_vagas_candidaturas. Versão corrigida que funciona com a estrutura atual da view.';
-- =====================================================================================
-- get_vagas_paginated - FINAL VERSION
-- =====================================================================================

-- Migration: Fix get_vagas_paginated function
-- Created: 2025-10-21
-- Description: Corrige a função get_vagas_paginated para usar os campos corretos da view vw_vagas_candidaturas

-- Remove todas as versões da função get_vagas_paginated
DO $$
DECLARE
    r RECORD;
BEGIN
  
    FOR r IN 
        SELECT 'DROP FUNCTION IF EXISTS ' || 
               n.nspname || '.' || 
               p.proname || '(' || 
               pg_get_function_identity_arguments(p.oid) || ');' as drop_statement
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_vagas_paginated'
          AND n.nspname = 'public'
    LOOP
        EXECUTE r.drop_statement;
    END LOOP;
END $$;
-- drop function if exists get_vagas_paginated(integer, integer, uuid[], uuid[], uuid[], date, date, numeric, numeric, uuid[], uuid[], uuid[], text, uuid[], text[], text[], uuid[]);


CREATE OR REPLACE FUNCTION get_vagas_paginated(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10,
    hospital_ids uuid [] DEFAULT NULL,
    specialty_ids uuid [] DEFAULT NULL,
    sector_ids uuid [] DEFAULT NULL,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL,
    min_value numeric DEFAULT NULL,
    max_value numeric DEFAULT NULL,
    period_ids uuid [] DEFAULT NULL,
    type_ids uuid [] DEFAULT NULL,
    group_ids uuid [] DEFAULT NULL,
    search_text text DEFAULT NULL,
    doctor_ids uuid [] DEFAULT NULL,
    application_status_filter text [] DEFAULT NULL,
    -- Valores: ['PENDENTE', 'APROVADO', 'REPROVADO']
    job_status_filter text [] DEFAULT NULL,
    -- Valores: ['aberta', 'fechada', 'cancelada', 'anunciada']
    grade_ids uuid [] DEFAULT NULL,
    order_by text DEFAULT 'vaga_data',
    -- Valores: 'vaga_createdate', 'vaga_data', 'vaga_valor', 'hospital_nome', 'setor_nome', 'especialidade_nome', 'vaga_periodo_nome', 'vaga_status', 'total_candidaturas'
    order_direction text DEFAULT 'DESC' -- Valores: 'ASC', 'DESC'
  ) RETURNS TABLE(data jsonb, pagination jsonb) LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE validated_page integer;
validated_size integer;
total_count bigint;
offset_value integer;
validated_order_by text;
validated_order_direction text;
order_clause text;
BEGIN validated_page := CASE
  WHEN page_number < 1 THEN 1
  ELSE page_number
END;
validated_size := CASE
  WHEN page_size < 1 THEN 10
  WHEN page_size > 100 THEN 100
  ELSE page_size
END;
-- Validação dos parâmetros de ordenação
validated_order_by := CASE
  WHEN order_by IN (
    'vaga_data',
    'vaga_createdate',
    'vaga_valor',
    'hospital_nome',
    'setor_nome',
    'especialidade_nome',
    'vaga_periodo_nome',
    'vaga_status',
    'total_candidaturas'
  ) THEN order_by
  ELSE 'vaga_createdate'
END;
validated_order_direction := CASE
  WHEN UPPER(order_direction) IN ('ASC', 'DESC') THEN UPPER(order_direction)
  ELSE 'DESC'
END;
offset_value := (validated_page - 1) * validated_size;
WITH vagas_filtradas AS (
  SELECT DISTINCT v.vaga_id
  FROM vw_vagas_candidaturas v
  WHERE 1 = 1
    AND (
      hospital_ids IS NULL
      OR v.hospital_id = ANY(hospital_ids)
    )
    AND (
      specialty_ids IS NULL
      OR v.especialidade_id = ANY(specialty_ids)
    )
    AND (
      sector_ids IS NULL
      OR v.setor_id = ANY(sector_ids)
    )
    AND (
      period_ids IS NULL
      OR v.vaga_periodo = ANY(period_ids)
    )
    AND (
      type_ids IS NULL
      OR v.vaga_tipo = ANY(type_ids)
    )
    AND (
      group_ids IS NULL
      OR v.grupo_id = ANY(group_ids)
    )
    AND (
      start_date IS NULL
      OR v.vaga_data >= start_date
    )
    AND (
      end_date IS NULL
      OR v.vaga_data <= end_date
    )
    AND (
      min_value IS NULL
      OR v.vaga_valor >= min_value
    )
    AND (
      max_value IS NULL
      OR v.vaga_valor <= max_value
    ) -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
    AND (
      doctor_ids IS NULL
      OR v.medico_id = ANY(doctor_ids)
    ) -- Filtro por status das candidaturas
    AND (
      application_status_filter IS NULL
      OR v.candidatura_status = ANY(application_status_filter)
    ) -- Filtro por status das vagas
    AND (
      job_status_filter IS NULL
      OR v.vaga_status = ANY(job_status_filter)
    ) -- Filtro por grades
    AND (
      grade_ids IS NULL
      OR v.grade_id = ANY(grade_ids)
    )
    AND (
      search_text IS NULL
      OR v.hospital_nome ILIKE '%' || search_text || '%'
      OR v.especialidade_nome ILIKE '%' || search_text || '%'
      OR v.vaga_observacoes ILIKE '%' || search_text || '%'
      OR v.setor_nome ILIKE '%' || search_text || '%'
    )
)
SELECT COUNT(*) INTO total_count
FROM vagas_filtradas;
RETURN QUERY WITH vagas_agrupadas AS (
  SELECT v.vaga_id,
    (array_agg(v.vaga_data)) [1] AS vaga_data,
    (array_agg(v.vaga_horainicio)) [1] AS vaga_horainicio,
    (array_agg(v.vaga_horafim)) [1] AS vaga_horafim,
    (array_agg(v.vaga_valor)) [1] AS vaga_valor,
    (array_agg(v.vaga_status)) [1] AS vaga_status,
    (array_agg(v.vaga_observacoes)) [1] AS vaga_observacoes,
    (array_agg(v.vaga_datapagamento)) [1] AS vaga_datapagamento,
    (array_agg(v.total_candidaturas)) [1] AS total_candidaturas,
    (array_agg(v.vaga_createdate)) [1] AS vaga_createdate,
    (array_agg(v.vaga_periodo)) [1] AS vaga_periodo,
    (array_agg(v.vaga_periodo_nome)) [1] AS vaga_periodo_nome,
    (array_agg(v.vaga_tipo)) [1] AS vaga_tipo,
    (array_agg(v.vaga_tipo_nome)) [1] AS vaga_tipo_nome,
    (array_agg(v.hospital_id)) [1] AS hospital_id,
    (array_agg(v.hospital_nome)) [1] AS hospital_nome,
    (array_agg(v.hospital_estado)) [1] AS hospital_estado,
    (array_agg(v.hospital_lat)) [1] AS hospital_lat,
    (array_agg(v.hospital_log)) [1] AS hospital_log,
    (array_agg(v.hospital_end)) [1] AS hospital_end,
    (array_agg(v.hospital_avatar)) [1] AS hospital_avatar,
    (array_agg(v.especialidade_id)) [1] AS especialidade_id,
    (array_agg(v.especialidade_nome)) [1] AS especialidade_nome,
    (array_agg(v.setor_id)) [1] AS setor_id,
    (array_agg(v.setor_nome)) [1] AS setor_nome,
    (array_agg(v.escalista_id)) [1] AS escalista_id,
    (array_agg(v.escalista_nome)) [1] AS escalista_nome,
    (array_agg(v.escalista_email)) [1] AS escalista_email,
    (array_agg(v.escalista_telefone)) [1] AS escalista_telefone,
    (array_agg(v.grupo_id)) [1] AS grupo_id,
    (array_agg(v.grupo_nome)) [1] AS grupo_nome,
    (array_agg(v.grade_id)) [1] AS grade_id,
    (array_agg(v.grade_nome)) [1] AS grade_nome,
    (array_agg(v.grade_cor)) [1] AS grade_cor,
    array_agg(
      CASE
        WHEN v.candidatura_id IS NOT NULL THEN jsonb_build_object(
          'candidatura_id',
          v.candidatura_id,
          'candidatura_status',
          v.candidatura_status,
          'candidatura_createdate',
          v.candidatura_createdate,
          'vaga_salva',
          v.vaga_salva,
          'medico_id',
          v.medico_id,
          'medico_primeiro_nome',
          v.medico_primeiro_nome,
          'medico_sobrenome',
          v.medico_sobrenome,
          'medico_crm',
          v.medico_crm,
          'medico_estado',
          v.medico_estado,
          'medico_email',
          v.medico_email,
          'medico_telefone',
          v.medico_telefone
        )
        ELSE NULL
      END
      ORDER BY v.candidatura_createdate DESC
    ) FILTER (
      WHERE v.candidatura_id IS NOT NULL
    ) AS candidaturas_list
  FROM vw_vagas_candidaturas v
  WHERE 1 = 1
    AND (
      hospital_ids IS NULL
      OR v.hospital_id = ANY(hospital_ids)
    )
    AND (
      specialty_ids IS NULL
      OR v.especialidade_id = ANY(specialty_ids)
    )
    AND (
      sector_ids IS NULL
      OR v.setor_id = ANY(sector_ids)
    )
    AND (
      period_ids IS NULL
      OR v.vaga_periodo = ANY(period_ids)
    )
    AND (
      type_ids IS NULL
      OR v.vaga_tipo = ANY(type_ids)
    )
    AND (
      group_ids IS NULL
      OR v.grupo_id = ANY(group_ids)
    )
    AND (
      start_date IS NULL
      OR v.vaga_data >= start_date
    )
    AND (
      end_date IS NULL
      OR v.vaga_data <= end_date
    )
    AND (
      min_value IS NULL
      OR v.vaga_valor >= min_value
    )
    AND (
      max_value IS NULL
      OR v.vaga_valor <= max_value
    ) -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
    AND (
      doctor_ids IS NULL
      OR v.medico_id = ANY(doctor_ids)
    ) -- Filtro por status das candidaturas
    AND (
      application_status_filter IS NULL
      OR v.candidatura_status = ANY(application_status_filter)
    ) -- Filtro por status das vagas
    AND (
      job_status_filter IS NULL
      OR v.vaga_status = ANY(job_status_filter)
    ) -- Filtro por grades
    AND (
      grade_ids IS NULL
      OR v.grade_id = ANY(grade_ids)
    )
    AND (
      search_text IS NULL
      OR v.hospital_nome ILIKE '%' || search_text || '%'
      OR v.especialidade_nome ILIKE '%' || search_text || '%'
      OR v.vaga_observacoes ILIKE '%' || search_text || '%'
      OR v.setor_nome ILIKE '%' || search_text || '%'
    )
  GROUP BY v.vaga_id
  ORDER BY CASE
      WHEN validated_order_by = 'vaga_data'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_data)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_data'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_data)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'vaga_valor'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_valor)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_valor'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_valor)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'hospital_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.hospital_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'hospital_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.hospital_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'setor_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.setor_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'setor_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.setor_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'especialidade_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.especialidade_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'especialidade_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.especialidade_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'vaga_periodo_nome'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_periodo_nome)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_periodo_nome'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_periodo_nome)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'vaga_status'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.vaga_status)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'vaga_status'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.vaga_status)) [1]
    END ASC,
    CASE
      WHEN validated_order_by = 'total_candidaturas'
      AND validated_order_direction = 'DESC' THEN (array_agg(v.total_candidaturas)) [1]
    END DESC,
    CASE
      WHEN validated_order_by = 'total_candidaturas'
      AND validated_order_direction = 'ASC' THEN (array_agg(v.total_candidaturas)) [1]
    END ASC
  LIMIT validated_size OFFSET offset_value
)
SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'vaga_id',
        v.vaga_id,
        'vaga_data',
        v.vaga_data,
        'vaga_horainicio',
        v.vaga_horainicio,
        'vaga_horafim',
        v.vaga_horafim,
        'vaga_valor',
        v.vaga_valor,
        'vaga_status',
        v.vaga_status,
        'vaga_observacoes',
        v.vaga_observacoes,
        'vaga_datapagamento',
        v.vaga_datapagamento,
        'total_candidaturas',
        v.total_candidaturas,
        'vaga_createdate',
        v.vaga_createdate,
        'vaga_periodo',
        v.vaga_periodo,
        'vaga_periodo_nome',
        v.vaga_periodo_nome,
        'vaga_tipo',
        v.vaga_tipo,
        'vaga_tipo_nome',
        v.vaga_tipo_nome,
        'hospital',
        jsonb_build_object(
          'hospital_id',
          v.hospital_id,
          'hospital_nome',
          v.hospital_nome,
          'hospital_estado',
          v.hospital_estado,
          'hospital_lat',
          v.hospital_lat,
          'hospital_log',
          v.hospital_log,
          'hospital_end',
          v.hospital_end,
          'hospital_avatar',
          v.hospital_avatar
        ),
        'especialidade',
        jsonb_build_object(
          'especialidade_id',
          v.especialidade_id,
          'especialidade_nome',
          v.especialidade_nome
        ),
        'setor',
        jsonb_build_object(
          'setor_id',
          v.setor_id,
          'setor_nome',
          v.setor_nome
        ),
        'escalista',
        jsonb_build_object(
          'escalista_id',
          v.escalista_id,
          'escalista_nome',
          v.escalista_nome,
          'escalista_email',
          v.escalista_email,
          'escalista_telefone',
          v.escalista_telefone
        ),
        'grupo',
        jsonb_build_object(
          'grupo_id',
          v.grupo_id,
          'grupo_nome',
          v.grupo_nome
        ),
        'candidaturas',
        COALESCE(
          array_to_json(v.candidaturas_list)::jsonb,
          '[]'::jsonb
        ),
        'grade',
        jsonb_build_object(
          'grade_id',
          v.grade_id,
          'grade_nome',
          v.grade_nome,
          'grade_cor',
          v.grade_cor
        )
      )
      ORDER BY CASE
          WHEN validated_order_by = 'vaga_data'
          AND validated_order_direction = 'DESC' THEN v.vaga_data
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_data'
          AND validated_order_direction = 'ASC' THEN v.vaga_data
        END ASC,
        CASE
          WHEN validated_order_by = 'vaga_valor'
          AND validated_order_direction = 'DESC' THEN v.vaga_valor
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_valor'
          AND validated_order_direction = 'ASC' THEN v.vaga_valor
        END ASC,
        CASE
          WHEN validated_order_by = 'hospital_nome'
          AND validated_order_direction = 'DESC' THEN v.hospital_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'hospital_nome'
          AND validated_order_direction = 'ASC' THEN v.hospital_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'setor_nome'
          AND validated_order_direction = 'DESC' THEN v.setor_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'setor_nome'
          AND validated_order_direction = 'ASC' THEN v.setor_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'especialidade_nome'
          AND validated_order_direction = 'DESC' THEN v.especialidade_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'especialidade_nome'
          AND validated_order_direction = 'ASC' THEN v.especialidade_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'vaga_periodo_nome'
          AND validated_order_direction = 'DESC' THEN v.vaga_periodo_nome
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_periodo_nome'
          AND validated_order_direction = 'ASC' THEN v.vaga_periodo_nome
        END ASC,
        CASE
          WHEN validated_order_by = 'vaga_status'
          AND validated_order_direction = 'DESC' THEN v.vaga_status
        END DESC,
        CASE
          WHEN validated_order_by = 'vaga_status'
          AND validated_order_direction = 'ASC' THEN v.vaga_status
        END ASC,
        CASE
          WHEN validated_order_by = 'total_candidaturas'
          AND validated_order_direction = 'DESC' THEN v.total_candidaturas
        END DESC,
        CASE
          WHEN validated_order_by = 'total_candidaturas'
          AND validated_order_direction = 'ASC' THEN v.total_candidaturas
        END ASC
    ),
    '[]'::jsonb
  ) AS data,
  jsonb_build_object(
    'current_page',
    validated_page,
    'page_size',
    validated_size,
    'total_count',
    total_count,
    'total_pages',
    CASE
      WHEN total_count = 0 THEN 0
      ELSE CEIL(total_count::numeric / validated_size::numeric)::integer
    END,
    'has_previous',
    validated_page > 1,
    'has_next',
    validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer,
    'previous_page',
    CASE
      WHEN validated_page > 1 THEN validated_page - 1
      ELSE NULL
    END,
    'next_page',
    CASE
      WHEN validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer THEN validated_page + 1
      ELSE NULL
    END
  ) AS pagination
FROM vagas_agrupadas v;
END;
$$;
GRANT EXECUTE ON FUNCTION get_vagas_paginated(
    integer,
    integer,
    uuid [],
    uuid [],
    uuid [],
    date,
    date,
    numeric,
    numeric,
    uuid [],
    uuid [],
    uuid [],
    text,
    uuid [],
    text [],
    text [],
    uuid [],
    text,
    text
  ) TO authenticated;
COMMENT ON FUNCTION get_vagas_paginated IS 'Busca vagas agrupadas por vaga_id com filtros opcionais usando arrays em snake_case. Filtros disponíveis: hospital_ids[], specialty_ids[], sector_ids[], period_ids[], type_ids[], group_ids[], doctor_ids[], application_status_filter[PENDENTE,APROVADO,REPROVADO], job_status_filter[aberta,fechada,cancelada,anunciada], grade_ids[], além de filtros de data, valor e texto. Parâmetros de ordenação: order_by[vaga_createdate,vaga_data,vaga_valor,hospital_nome,setor_nome,especialidade_nome,vaga_periodo_nome,vaga_status,total_candidaturas], order_direction[ASC,DESC]. Todas as candidaturas são compactadas em array por vaga, resultando em menos páginas totais';