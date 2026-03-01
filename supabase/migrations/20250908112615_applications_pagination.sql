CREATE OR REPLACE FUNCTION get_applications_paginated(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10,
    hospital_ids uuid[] DEFAULT NULL,
    specialty_ids uuid[] DEFAULT NULL,
    sector_ids uuid[] DEFAULT NULL,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL,
    min_value numeric DEFAULT NULL,
    max_value numeric DEFAULT NULL,
    period_ids uuid[] DEFAULT NULL,
    type_ids uuid[] DEFAULT NULL,
    group_ids uuid[] DEFAULT NULL,
    search_text text DEFAULT NULL,
    doctor_ids uuid[] DEFAULT NULL,
    application_status_filter text[] DEFAULT NULL, -- Valores: ['PENDENTE', 'APROVADO', 'REPROVADO']
    job_status_filter text[] DEFAULT NULL, -- Valores: ['aberta', 'fechada', 'cancelada', 'anunciada']
    grade_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
    data jsonb,
    pagination jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    validated_page integer;
    validated_size integer;
    total_count bigint;
    offset_value integer;
BEGIN
    validated_page := CASE WHEN page_number < 1 THEN 1 ELSE page_number END;
    validated_size := CASE 
        WHEN page_size < 1 THEN 10
        WHEN page_size > 100 THEN 100
        ELSE page_size
    END;
    
    offset_value := (validated_page - 1) * validated_size;
    
    -- Contagem total de candidaturas (não agrupadas)
    SELECT COUNT(*) INTO total_count 
    FROM vw_vagas_candidaturas v
    WHERE v.candidaturas_id IS NOT NULL
        AND (hospital_ids IS NULL OR v.hospital_id = ANY(hospital_ids))
        AND (specialty_ids IS NULL OR v.especialidade_id = ANY(specialty_ids))
        AND (sector_ids IS NULL OR v.setor_id = ANY(sector_ids))
        AND (period_ids IS NULL OR v.vagas_periodo = ANY(period_ids))
        AND (type_ids IS NULL OR v.vagas_tipo = ANY(type_ids))
        AND (group_ids IS NULL OR v.grupo_id = ANY(group_ids))
        AND (start_date IS NULL OR v.vagas_data >= start_date)
        AND (end_date IS NULL OR v.vagas_data <= end_date)
        AND (min_value IS NULL OR v.vagas_valor >= min_value)
        AND (max_value IS NULL OR v.vagas_valor <= max_value)
        -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
        AND (doctor_ids IS NULL OR v.medico_id = ANY(doctor_ids))
        -- Filtro por status das candidaturas
        AND (application_status_filter IS NULL OR v.candidatura_status = ANY(application_status_filter))
        -- Filtro por status das vagas
        AND (job_status_filter IS NULL OR v.vagas_status = ANY(job_status_filter))
        -- Filtro por grades
        AND (grade_ids IS NULL OR v.grade_id = ANY(grade_ids))
        AND (
            search_text IS NULL OR 
            v.hospital_nome ILIKE '%' || search_text || '%' OR
            v.especialidade_nome ILIKE '%' || search_text || '%' OR
            v.vagas_observacoes ILIKE '%' || search_text || '%' OR
            v.setor_nome ILIKE '%' || search_text || '%'
        );
    
    RETURN QUERY
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'candidatura_id', v.candidaturas_id,
                    'candidatura_status', v.candidatura_status,
                    'candidatos_createdate', v.candidatos_createdate,
                    'vaga_salva', v.vaga_salva,
                    'medico_favorito', v.medico_favorito,
                    'vaga', jsonb_build_object(
                        'vagas_id', v.vagas_id,
                        'vagas_data', v.vagas_data,
                        'vagas_horainicio', v.vagas_horainicio,
                        'vagas_horafim', v.vagas_horafim,
                        'vagas_valor', v.vagas_valor,
                        'vagas_status', v.vagas_status,
                        'vagas_observacoes', v.vagas_observacoes,
                        'vagas_datapagamento', v.vagas_datapagamento,
                        'total_candidaturas', v.total_candidaturas,
                        'vagas_createdate', v.vagas_createdate,
                        'vagas_periodo', v.vagas_periodo,
                        'vagas_periodo_nome', v.vagas_periodo_nome,
                        'vagas_tipo', v.vagas_tipo,
                        'vagas_tipo_nome', v.vagas_tipo_nome
                    ),
                    'medico', jsonb_build_object(
                        'medico_id', v.medico_id,
                        'medico_primeironome', v.medico_primeironome,
                        'medico_sobrenome', v.medico_sobrenome,
                        'medico_crm', v.medico_crm,
                        'medico_estado', v.medico_estado,
                        'medico_email', v.medico_email,
                        'medico_telefone', v.medico_telefone
                    ),
                    'hospital', jsonb_build_object(
                        'hospital_id', v.hospital_id,
                        'hospital_nome', v.hospital_nome,
                        'hospital_estado', v.hospital_estado,
                        'hospital_lat', v.hospital_lat,
                        'hospital_log', v.hospital_log,
                        'hospital_end', v.hospital_end,
                        'hospital_avatar', v.hospital_avatar
                    ),
                    'especialidade', jsonb_build_object(
                        'especialidade_id', v.especialidade_id,
                        'especialidade_nome', v.especialidade_nome
                    ),
                    'setor', jsonb_build_object(
                        'setor_id', v.setor_id,
                        'setor_nome', v.setor_nome
                    ),
                    'escalista', jsonb_build_object(
                        'escalista_id', v.escalista_id,
                        'escalista_nome', v.escalista_nome,
                        'escalista_email', v.escalista_email,
                        'escalista_telefone', v.escalista_telefone
                    ),
                    'grupo', jsonb_build_object(
                        'grupo_id', v.grupo_id,
                        'grupo_nome', v.grupo_nome
                    ),
                    'grade', jsonb_build_object(
                        'grade_id', v.grade_id,
                        'grade_nome', v.grade_nome,
                        'grade_cor', v.grade_cor
                    )
                )
                ORDER BY v.candidatos_createdate DESC
            ),
            '[]'::jsonb
        ) as data,
        jsonb_build_object(
            'current_page', validated_page,
            'page_size', validated_size,
            'total_count', total_count,
            'total_pages', CASE 
                WHEN total_count = 0 THEN 0
                ELSE CEIL(total_count::numeric / validated_size::numeric)::integer
            END,
            'has_previous', validated_page > 1,
            'has_next', validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer,
            'previous_page', CASE WHEN validated_page > 1 THEN validated_page - 1 ELSE null END,
            'next_page', CASE 
                WHEN validated_page < CEIL(total_count::numeric / validated_size::numeric)::integer 
                THEN validated_page + 1 
                ELSE null 
            END
        ) as pagination
    FROM (
        SELECT *
        FROM vw_vagas_candidaturas v
        WHERE v.candidaturas_id IS NOT NULL
            AND (hospital_ids IS NULL OR v.hospital_id = ANY(hospital_ids))
            AND (specialty_ids IS NULL OR v.especialidade_id = ANY(specialty_ids))
            AND (sector_ids IS NULL OR v.setor_id = ANY(sector_ids))
            AND (period_ids IS NULL OR v.vagas_periodo = ANY(period_ids))
            AND (type_ids IS NULL OR v.vagas_tipo = ANY(type_ids))
            AND (group_ids IS NULL OR v.grupo_id = ANY(group_ids))
            AND (start_date IS NULL OR v.vagas_data >= start_date)
            AND (end_date IS NULL OR v.vagas_data <= end_date)
            AND (min_value IS NULL OR v.vagas_valor >= min_value)
            AND (max_value IS NULL OR v.vagas_valor <= max_value)
            -- Filtro por médicos (incluindo médicos regulares e pré-cadastro)
            AND (doctor_ids IS NULL OR v.medico_id = ANY(doctor_ids))
            -- Filtro por status das candidaturas
            AND (application_status_filter IS NULL OR v.candidatura_status = ANY(application_status_filter))
            -- Filtro por status das vagas
            AND (job_status_filter IS NULL OR v.vagas_status = ANY(job_status_filter))
            -- Filtro por grades
            AND (grade_ids IS NULL OR v.grade_id = ANY(grade_ids))
            AND (
                search_text IS NULL OR 
                v.hospital_nome ILIKE '%' || search_text || '%' OR
                v.especialidade_nome ILIKE '%' || search_text || '%' OR
                v.vagas_observacoes ILIKE '%' || search_text || '%' OR
                v.setor_nome ILIKE '%' || search_text || '%'
            )
        ORDER BY v.candidatos_createdate DESC
        LIMIT validated_size
        OFFSET offset_value
    ) v;
END;
$$;

GRANT EXECUTE ON FUNCTION get_applications_paginated(integer, integer, uuid[], uuid[], uuid[], date, date, numeric, numeric, uuid[], uuid[], uuid[], text, uuid[], text[], text[], uuid[]) TO authenticated;

COMMENT ON FUNCTION get_applications_paginated IS 'Busca candidaturas individuais (não agrupadas) com filtros opcionais usando arrays em snake_case. Filtros disponíveis: hospital_ids[], specialty_ids[], sector_ids[], period_ids[], type_ids[], group_ids[], doctor_ids[], application_status_filter[PENDENTE,APROVADO,REPROVADO], job_status_filter[aberta,fechada,cancelada,anunciada], grade_ids[], além de filtros de data, valor e texto. Retorna cada candidatura separadamente com informações completas da vaga e médico associados.';
