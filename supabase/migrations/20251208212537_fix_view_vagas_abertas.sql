-- =====================================================================================
-- Migration: Fix view vw_vagas_abertas
-- =====================================================================================
-- Data: 2025-12-08
-- Objetivo: Padronizar nomes de colunas na view vw_vagas_abertas
-- Para manter consistência com outras views do banco de dados, renomeamos as colunas
-- para o padrão snake_case: periodo_id, tipos_vaga_id, formarecebimento_id
--

drop view if exists public.vw_vagas_abertas;
create view public.vw_vagas_abertas
as
SELECT
    row_number() OVER (ORDER BY v.id) AS idx,
    v.id AS vaga_id,
    v.data AS vaga_data,
    v.created_at AS vaga_createdate,
    v.status AS vaga_status,
    v.valor AS vaga_valor,
    v.hora_inicio AS vaga_horainicio,
    v.hora_fim AS vaga_horafim,
    v.data_pagamento AS vaga_datapagamento,
    v.periodo_id AS periodo_id,
    p.nome AS periodo_nome,
    v.tipos_vaga_id AS tipos_vaga_id,
    t.nome AS tipos_vaga_nome,
    v.forma_recebimento_id AS formarecebimento_id,
    f.forma_recebimento AS formarecebimento_nome,
    v.observacoes AS vaga_observacoes,
    h.id AS hospital_id,
    h.nome AS hospital_nome,
    h.estado AS hospital_estado,
    h.latitude AS hospital_lat,
    h.longitude AS hospital_log,
    h.endereco_formatado AS hospital_end,
    h.avatar AS hospital_avatar,
    e.id AS especialidade_id,
    e.nome AS especialidade_nome,
    s.id AS setor_id,
    s.nome AS setor_nome,
    esc.id AS escalista_id,
    esc.nome AS escalista_nome,
    esc.email AS escalista_email,
    esc.telefone AS escalista_telefone,
    g.id AS grupo_id,
    g.nome AS grupo_nome
FROM vagas v
    JOIN hospitais h ON v.hospital_id = h.id
    JOIN especialidades e ON v.especialidade_id = e.id
    JOIN setores s ON v.setor_id = s.id
    LEFT JOIN escalistas esc ON v.escalista_id = esc.id
    LEFT JOIN grupos g ON v.grupo_id = g.id
    LEFT JOIN periodos p ON v.periodo_id = p.id
    LEFT JOIN tipos_vaga t ON v.tipos_vaga_id = t.id
    LEFT JOIN formas_recebimento f ON v.forma_recebimento_id = f.id
WHERE v.status = 'aberta';