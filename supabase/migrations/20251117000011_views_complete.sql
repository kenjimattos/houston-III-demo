-- =====================================================================================
-- Migration: 20251117000011_views_complete.sql
-- Description: Complete views with all corrections and final table/column names
-- Consolidates:
--   - 20251110150010_add_ids_to_vw_folha_pagamento.sql
--   - 20251110150410_add_total_candidaturas_to_vw_vagas_candidaturas.sql
--   - 20251110150510_fix_views.sql
--   - 20251110151110_fix_vw_vagas_candidaturas.sql (FINAL)
--   - 20251113012513_recriar_vw_vagas_abertas.sql (FINAL)
-- =====================================================================================

-- This migration creates a new schema and a view similar to vw_vagas_candidaturas
-- but only for vagas with status 'aberta' and without candidaturas data

-- Create view for open vagas
create or replace view public.vw_vagas_abertas
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
    v.periodo_id AS vaga_periodo,
    p.nome AS vaga_periodo_nome,
    v.tipos_vaga_id AS vaga_tipo,
    t.nome AS vaga_tipo_nome,
    v.forma_recebimento_id AS vaga_formarecebimento,
    f.forma_recebimento AS vaga_formarecebimento_nome,
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

-- 9. Recriar view vw_vagas_candidaturas com coluna vaga_id corrigida

CREATE OR REPLACE VIEW public.vw_vagas_candidaturas with (security_invoker = on)
AS
SELECT
  row_number() OVER (
    ORDER BY
      combined_data.vaga_id,
      combined_data.effective_medico_id,
      combined_data.candidatura_id
  ) AS idx,
  combined_data.vaga_id,
  combined_data.vaga_data,
  combined_data.vaga_createdate,
  combined_data.vaga_status,
  combined_data.vaga_valor,
  combined_data.vaga_horainicio,
  combined_data.vaga_horafim,
  combined_data.vaga_datapagamento,
  combined_data.vaga_periodo,
  combined_data.vaga_periodo_nome,
  combined_data.vaga_tipo,
  combined_data.vaga_tipo_nome,
  combined_data.vaga_formarecebimento,
  combined_data.vaga_formarecebimento_nome,
  combined_data.vaga_observacoes,
  combined_data.hospital_id,
  combined_data.hospital_nome,
  combined_data.hospital_estado,
  combined_data.hospital_lat,
  combined_data.hospital_log,
  combined_data.hospital_end,
  combined_data.hospital_avatar,
  combined_data.especialidade_id,
  combined_data.especialidade_nome,
  combined_data.setor_id,
  combined_data.setor_nome,
  combined_data.escalista_id,
  combined_data.escalista_nome,
  combined_data.escalista_email,
  combined_data.escalista_telefone,
  combined_data.grupo_id,
  combined_data.grupo_nome,
  combined_data.candidatura_id,
  combined_data.total_candidaturas,
  combined_data.candidatura_status,
  combined_data.candidatura_createdate,
  combined_data.candidatura_updateby,
  combined_data.candidatura_updatedat,
  combined_data.effective_medico_id AS medico_id,
  combined_data.medico_primeiro_nome,
  combined_data.medico_sobrenome,
  combined_data.medico_crm,
  combined_data.medico_cpf,
  combined_data.medico_estado,
  combined_data.medico_email,
  combined_data.medico_telefone,
  combined_data.medico_precadastro_id,
  combined_data.recorrencia_id,
  combined_data.vaga_salva,
  combined_data.medico_favorito,
  combined_data.checkin,
  combined_data.checkout,
  combined_data.pagamento_valor,
  combined_data.grade_id,
  combined_data.grade_nome,
  combined_data.grade_cor
FROM (
  SELECT DISTINCT
    v.id AS vaga_id,
    v.data AS vaga_data,
    v.created_at AS vaga_createdate,
    v.status AS vaga_status,
    v.valor AS vaga_valor,
    v.hora_inicio AS vaga_horainicio,
    v.hora_fim AS vaga_horafim,
    v.data_pagamento AS vaga_datapagamento,
    v.periodo_id AS vaga_periodo,
    p.nome AS vaga_periodo_nome,
    v.tipos_vaga_id AS vaga_tipo,
    t.nome AS vaga_tipo_nome,
    v.forma_recebimento_id AS vaga_formarecebimento,
    f.forma_recebimento AS vaga_formarecebimento_nome,
    v.observacoes AS vaga_observacoes,
    v.hospital_id,
    h.nome AS hospital_nome,
    h.estado AS hospital_estado,
    h.latitude AS hospital_lat,
    h.longitude AS hospital_log,
    h.endereco_formatado AS hospital_end,
    h.avatar AS hospital_avatar,
    v.especialidade_id,
    e.nome AS especialidade_nome,
    v.setor_id,
    s.nome AS setor_nome,
    v.escalista_id,
    esc.nome AS escalista_nome,
    esc.email AS escalista_email,
    esc.telefone AS escalista_telefone,
    v.grupo_id,
    g.nome AS grupo_nome,
    c.id AS candidatura_id,
    count_candidaturas_total(v.id) AS total_candidaturas,
    c.status AS candidatura_status,
    c.created_at AS candidatura_createdate,
    c.updated_by AS candidatura_updateby,
    c.updated_at AS candidatura_updatedat,
    CASE
      WHEN c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
      AND c.medico_precadastro_id IS NOT NULL THEN c.medico_precadastro_id
      ELSE vm.medico_id
    END AS effective_medico_id,
    COALESCE(
      m.primeiro_nome,
      mp.primeiro_nome::text
    ) AS medico_primeiro_nome,
    COALESCE(m.sobrenome, mp.sobrenome::text) AS medico_sobrenome,
    COALESCE(m.crm, mp.crm::text) AS medico_crm,
    COALESCE(m.cpf, mp.cpf::text) AS medico_cpf,
    COALESCE(m.estado, mp.estado) AS medico_estado,
    COALESCE(m.email, mp.email::text) AS medico_email,
    COALESCE(m.telefone, mp.telefone::text) AS medico_telefone,
    c.medico_precadastro_id,
    v.recorrencia_id,
    CASE
      WHEN vs.medico_id IS NOT NULL
      OR vsp.medico_id IS NOT NULL THEN true
      ELSE false
    END AS vaga_salva,
    current_user_is_favorito(v.grupo_id) AS medico_favorito,
    COALESCE(cc.checkin, ccp.checkin) AS checkin,
    COALESCE(cc.checkout, ccp.checkout) AS checkout,
    pg.valor AS pagamento_valor,
    v.grade_id,
    gr.nome AS grade_nome,
    gr.cor AS grade_cor
  FROM
    vagas v
    JOIN hospitais h ON v.hospital_id = h.id
    JOIN especialidades e ON v.especialidade_id = e.id
    JOIN setores s ON v.setor_id = s.id
    LEFT JOIN escalistas esc ON v.escalista_id = esc.id
    LEFT JOIN grupos g ON v.grupo_id = g.id
    LEFT JOIN periodos p ON v.periodo_id = p.id
    LEFT JOIN tipos_vaga t ON v.tipos_vaga_id = t.id
    LEFT JOIN formas_recebimento f ON v.forma_recebimento_id = f.id
    LEFT JOIN grades gr ON v.grade_id = gr.id
    LEFT JOIN (
      SELECT
        candidaturas.vaga_id,
        candidaturas.medico_id
      FROM
        candidaturas
      WHERE
        candidaturas.medico_id IS NOT NULL
        AND candidaturas.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
      UNION
      SELECT
        candidaturas.vaga_id,
        candidaturas.medico_precadastro_id AS medico_id
      FROM
        candidaturas
      WHERE
        candidaturas.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
        AND candidaturas.medico_precadastro_id IS NOT NULL
      UNION
      SELECT
        vagas_salvas.vaga_id AS vaga_id,
        vagas_salvas.medico_id
      FROM
        vagas_salvas
      WHERE
        vagas_salvas.medico_id IS NOT NULL
    ) vm ON vm.vaga_id = v.id
    LEFT JOIN candidaturas c ON c.vaga_id = v.id
    AND (
      c.medico_id = vm.medico_id
      AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
      OR c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
      AND c.medico_precadastro_id = vm.medico_id
    )
    LEFT JOIN medicos m ON c.medico_id = m.id
    AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
    LEFT JOIN medicos_precadastro mp ON c.medico_precadastro_id = mp.id
    LEFT JOIN vagas_salvas vs ON vs.vaga_id = v.id
    AND vs.medico_id = vm.medico_id
    LEFT JOIN vagas_salvas vsp ON vsp.vaga_id = v.id
    AND vsp.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
    LEFT JOIN checkin_checkout cc ON cc.vaga_id = v.id
    AND cc.medico_id = vm.medico_id
    LEFT JOIN checkin_checkout ccp ON ccp.vaga_id = v.id
    AND ccp.medico_id = CASE
      WHEN c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid THEN c.medico_precadastro_id
      ELSE vm.medico_id
    END
    LEFT JOIN pagamentos pg ON pg.candidatura_id = c.id
) combined_data;

-- Migration: Add hospital_id, especialidade_id, and setor_id columns to vw_folha_pagamento view
-- Date: 2025-10-10

-- Drop the existing view
DROP VIEW IF EXISTS public.vw_folha_pagamento;

create view public.vw_folha_pagamento
with (security_invoker = on)
as
select
  v.id as vaga_id,
  v.data as vaga_data,
  p.nome as periodo_nome,
  v.hora_inicio as horario_inicio,
  v.hora_fim as horario_fim,
  v.valor as vaga_valor,
  v.data_pagamento as vaga_datapagamento,
  fr.forma_recebimento,
  h.id as hospital_id,
  h.nome as hospital_nome,
  e.id as especialidade_id,
  e.nome as especialidade_nome,
  s.id as setor_id,
  s.nome as setor_nome,
  c.id as candidatura_id,
  c.medico_id,
  c.medico_precadastro_id,
  c.status as candidatura_status,
  c.data_confirmacao as candidatura_data_confirmacao,
  COALESCE(m.primeiro_nome, mp.primeiro_nome::text) as medico_primeironome,
  COALESCE(m.sobrenome, mp.sobrenome::text) as medico_sobrenome,
  COALESCE(m.cpf, mp.cpf::text) as medico_cpf,
  COALESCE(m.crm, mp.crm::text) as medico_crm,
  COALESCE(me.nome, mpe.nome) as medico_especialidade,
  COALESCE(m.razao_social, mp.razao_social) as razao_social,
  COALESCE(m.cnpj, mp.cnpj) as cnpj,
  COALESCE(m.banco_agencia, mp.banco_agencia) as banco_agencia,
  COALESCE(m.banco_digito, mp.banco_digito) as banco_digito,
  COALESCE(m.banco_conta, mp.banco_conta) as banco_conta,
  COALESCE(m.banco_pix, mp.banco_pix) as banco_pix,
  cc.checkin,
  cc.checkout,
  cc.checkin_latitude,
  cc.checkin_longitude,
  cc.checkout_latitude,
  cc.checkout_longitude,
  cc.checkin_justificativa,
  cc.checkout_justificativa
from
  vagas v
  join candidaturas c on c.vaga_id = v.id
  left join medicos m on m.id = c.medico_id
  and c.medico_precadastro_id is null
  left join medicos_precadastro mp on mp.id = c.medico_precadastro_id
  left join checkin_checkout cc on cc.vaga_id = v.id
  and (
    cc.medico_id = m.id
    or cc.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
  )
  left join hospitais h on h.id = v.hospital_id
  left join especialidades e on e.id = v.especialidade_id
  left join especialidades me on me.id = m.especialidade_id
  left join especialidades mpe on mpe.id = mp.especialidade_id
  left join setores s on s.id = v.setor_id
  left join periodos p on p.id = v.periodo_id
  left join formas_recebimento fr on fr.id = v.forma_recebimento_id
where
  v.status::text = 'fechada'::text
  and c.status = 'APROVADO'::text;