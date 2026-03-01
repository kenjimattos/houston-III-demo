-- Recreate vw_vagas_candidaturas view to add medico_cpf column
-- This migration adds medico_cpf from the medicos and medicos_precadastro tables

drop view if exists "public"."vw_vagas_candidaturas";

create view "public"."vw_vagas_candidaturas"
with (security_invoker = on) as
SELECT row_number() OVER (ORDER BY combined_data.vagas_id, combined_data.effective_medico_id, combined_data.candidaturas_id) AS idx,
    combined_data.vagas_id,
    combined_data.vagas_data,
    combined_data.vagas_createdate,
    combined_data.vagas_status,
    combined_data.vagas_valor,
    combined_data.vagas_horainicio,
    combined_data.vagas_horafim,
    combined_data.vagas_datapagamento,
    combined_data.vagas_periodo,
    combined_data.vagas_periodo_nome,
    combined_data.vagas_tipo,
    combined_data.vagas_tipo_nome,
    combined_data.vagas_formarecebimento,
    combined_data.vagas_formarecebimento_nome,
    combined_data.vagas_observacoes,
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
    combined_data.candidaturas_id,
    combined_data.total_candidaturas,
    combined_data.candidatura_status,
    combined_data.candidatos_createdate,
    combined_data.candidaturas_updateby,
    combined_data.candidaturas_updateat,
    combined_data.effective_medico_id AS medico_id,
    combined_data.medico_primeironome,
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
   FROM ( SELECT DISTINCT v.vagas_id,
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
            g.grupo_nome,
            c.candidaturas_id,
            count_candidaturas_total(v.vagas_id) AS total_candidaturas,
            c.candidatura_status,
            c.candidatos_createdate,
            c.candidaturas_updateby,
            c.candidaturas_updateat,
                CASE
                    WHEN ((c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (c.medico_precadastro_id IS NOT NULL)) THEN c.medico_precadastro_id
                    ELSE vm.medico_id
                END AS effective_medico_id,
            COALESCE(m.medico_primeironome, (mp.medico_primeironome)::text) AS medico_primeironome,
            COALESCE(m.medico_sobrenome, (mp.medico_sobrenome)::text) AS medico_sobrenome,
            COALESCE(m.medico_crm, (mp.medico_crm)::text) AS medico_crm,
            COALESCE(m.medico_cpf, mp.medico_cpf) AS medico_cpf,
            COALESCE(m.medico_estado, mp.medico_estado) AS medico_estado,
            COALESCE(m.medico_email, (mp.medico_email)::text) AS medico_email,
            COALESCE(m.medico_telefone, (mp.medico_telefone)::text) AS medico_telefone,
            c.medico_precadastro_id,
            v.recorrencia_id,
                CASE
                    WHEN ((vs.medico_id IS NOT NULL) OR (vsp.medico_id IS NOT NULL)) THEN true
                    ELSE false
                END AS vaga_salva,
            current_user_is_favorito(v.grupo_id) AS medico_favorito,
            COALESCE(cc.checkin, ccp.checkin) AS checkin,
            COALESCE(cc.checkout, ccp.checkout) AS checkout,
            pg.valor AS pagamento_valor,
            v.grade_id,
            gr.nome AS grade_nome,
            gr.cor AS grade_cor
           FROM ((((((((((((((((((vagas v
             JOIN hospital h ON ((v.vagas_hospital = h.hospital_id)))
             JOIN especialidades e ON ((v.vaga_especialidade = e.especialidade_id)))
             JOIN setores s ON ((v.vagas_setor = s.setor_id)))
             LEFT JOIN escalista esc ON ((v.vagas_escalista = esc.escalista_id)))
             LEFT JOIN grupo g ON ((v.grupo_id = g.grupo_id)))
             LEFT JOIN periodo p ON ((v.vagas_periodo = p.periodo_id)))
             LEFT JOIN tipovaga t ON ((v.vagas_tipo = t.id)))
             LEFT JOIN formas_recebimento f ON ((v.vagas_formarecebimento = f.id)))
             LEFT JOIN grades gr ON ((v.grade_id = gr.id)))
             LEFT JOIN ( SELECT candidaturas.vagas_id,
                    candidaturas.medico_id
                   FROM candidaturas
                  WHERE ((candidaturas.medico_id IS NOT NULL) AND (candidaturas.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))
                UNION
                 SELECT candidaturas.vagas_id,
                    candidaturas.medico_precadastro_id AS medico_id
                   FROM candidaturas
                  WHERE ((candidaturas.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (candidaturas.medico_precadastro_id IS NOT NULL))
                UNION
                 SELECT vagas_salvas.vagas_id,
                    vagas_salvas.medico_id
                   FROM vagas_salvas
                  WHERE (vagas_salvas.medico_id IS NOT NULL)) vm ON ((vm.vagas_id = v.vagas_id)))
             LEFT JOIN candidaturas c ON (((c.vagas_id = v.vagas_id) AND (((c.medico_id = vm.medico_id) AND (c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)) OR ((c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) AND (c.medico_precadastro_id = vm.medico_id))))))
             LEFT JOIN medicos m ON (((c.medico_id = m.id) AND (c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))))
             LEFT JOIN medicos_precadastro mp ON ((c.medico_precadastro_id = mp.id)))
             LEFT JOIN vagas_salvas vs ON (((vs.vagas_id = v.vagas_id) AND (vs.medico_id = vm.medico_id))))
             LEFT JOIN vagas_salvas vsp ON (((vsp.vagas_id = v.vagas_id) AND (vsp.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid))))
             LEFT JOIN checkin_checkout cc ON (((cc.vagas_id = v.vagas_id) AND (cc.medico_id = vm.medico_id))))
             LEFT JOIN checkin_checkout ccp ON (((ccp.vagas_id = v.vagas_id) AND (ccp.medico_id =
                CASE
                    WHEN (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid) THEN c.medico_precadastro_id
                    ELSE vm.medico_id
                END))))
             LEFT JOIN pagamentos pg ON ((pg.candidaturas_id = c.candidaturas_id)))) combined_data;