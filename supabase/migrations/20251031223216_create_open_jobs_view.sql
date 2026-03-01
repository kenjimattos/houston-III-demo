-- This migration creates a new schema and a view similar to vw_vagas_candidaturas
-- but only for vagas with status 'aberta' and without candidaturas data

-- Create view for open vagas
create or replace view public.vw_vagas_abertas as
SELECT
    row_number() OVER (ORDER BY v.vagas_id) AS idx,
    v.vagas_id,
    v.vagas_data,
    v.vagas_createdate,
    v.vagas_status,
    v.vagas_valor,
    v.vagas_horainicio,
    v.vagas_horafim,
    v.vagas_datapagamento,
    v.vagas_periodo,
    p.periodo AS vagas_periodo_nome,
    v.vagas_tipo,
    t.tipo AS vagas_tipo_nome,
    v.vagas_formarecebimento,
    f.forma_recebimento AS vagas_formarecebimento_nome,
    v.vagas_observacoes,
    h.hospital_id,
    h.hospital_nome,
    h.hospital_estado,
    h.latitude AS hospital_lat,
    h.longitude AS hospital_log,
    h.endereco_formatado AS hospital_end,
    h.hospital_avatar,
    e.especialidade_id,
    e.especialidade_nome,
    s.setor_id,
    s.setor_nome,
    esc.escalista_id,
    esc.escalista_nome,
    esc.escalista_email,
    esc.escalista_telefone,
    g.grupo_id,
    g.grupo_nome
FROM vagas v
    JOIN hospital h ON v.vagas_hospital = h.hospital_id
    JOIN especialidades e ON v.vaga_especialidade = e.especialidade_id
    JOIN setores s ON v.vagas_setor = s.setor_id
    LEFT JOIN escalista esc ON v.vagas_escalista = esc.escalista_id
    LEFT JOIN grupo g ON v.grupo_id = g.grupo_id
    LEFT JOIN periodo p ON v.vagas_periodo = p.periodo_id
    LEFT JOIN tipovaga t ON v.vagas_tipo = t.id
    LEFT JOIN formas_recebimento f ON v.vagas_formarecebimento = f.id
WHERE v.vagas_status = 'aberta';

-- Grant access to anon role
grant select on public.vw_vagas_abertas to anon;
