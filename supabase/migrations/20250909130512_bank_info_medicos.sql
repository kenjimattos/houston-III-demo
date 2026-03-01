-- O relatório de folha de pagamento do Houston necessita de informações bancárias dos médicos.
-- Este script adiciona as colunas necessárias nas tabelas de médicos e cria uma view para
-- facilitar a geração do relatório de folha de pagamento.
-- Cria políticas de segurança para permitir que usuários possam atualizar essas informações.

-- Adicionar colunas financeiras na tabela medicos
ALTER TABLE public.medicos
ADD COLUMN razao_social TEXT,
ADD COLUMN cnpj TEXT,
ADD COLUMN banco_agencia TEXT,
ADD COLUMN banco_digito TEXT,
ADD COLUMN banco_conta TEXT,
ADD COLUMN banco_pix TEXT;

-- Adicionar colunas financeiras na tabela medicos_precadastro
ALTER TABLE public.medicos_precadastro
ADD COLUMN razao_social TEXT,
ADD COLUMN cnpj TEXT,
ADD COLUMN banco_agencia TEXT,
ADD COLUMN banco_digito TEXT,
ADD COLUMN banco_conta TEXT,
ADD COLUMN banco_pix TEXT;

-- Adicionar política de UPDATE para escalistas e astronautas na tabela medicos
CREATE POLICY "Enable escalista and astronauta users update medicos data"
ON "public"."medicos"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (( SELECT EXISTS( SELECT 1 FROM user_profile 
           WHERE user_profile.id = auth.uid() 
           AND user_profile.role IN ('escalista', 'astronauta'))));

-- Criar view para folha de pagamento
CREATE OR REPLACE VIEW public.vw_folha_pagamento WITH (security_invoker = on) AS
SELECT
    -- Dados da vaga
    v.vagas_id AS vagas_id,
    v.vagas_data AS vagas_data,
    p.periodo AS periodo_nome,
    v.vagas_horainicio AS horario_inicio,
    v.vagas_horafim AS horario_fim,
    v.vagas_valor AS vagas_valor,
    v.vagas_datapagamento AS vagas_datapagamento,
    fr.forma_recebimento AS forma_recebimento,
    
    -- Dados do hospital
    h.hospital_nome AS hospital_nome,
    
    -- Dados da especialidade da vaga
    e.especialidade_nome AS vagas_especialidade,
    
    -- Dados do setor
    s.setor_nome AS setor_nome,
    
    -- Dados da candidatura
    c.candidaturas_id AS candidaturas_id,
    c.medico_id,
    c.medico_precadastro_id,
    c.candidatura_status,
    c.candidatos_dataconfirmacao AS candidatos_dataconfirmacao,
    
    -- Dados do médico (usando COALESCE para priorizar médico regular ou pré-cadastrado)
    COALESCE(m.medico_primeironome, mp.medico_primeironome) AS medico_primeironome,
    COALESCE(m.medico_sobrenome, mp.medico_sobrenome) AS medico_sobrenome,
    COALESCE(m.medico_cpf, mp.medico_cpf) AS medico_cpf,
    COALESCE(m.medico_crm, mp.medico_crm) AS medico_crm,
    COALESCE(me.especialidade_nome, mpe.especialidade_nome) AS medico_especialidade,
    
    -- Dados bancários do médico (médicos regulares ou pré-cadastrados)
    COALESCE(m.razao_social, mp.razao_social) AS razao_social,
    COALESCE(m.cnpj, mp.cnpj) AS cnpj,
    COALESCE(m.banco_agencia, mp.banco_agencia) AS banco_agencia,
    COALESCE(m.banco_digito, mp.banco_digito) AS banco_digito,
    COALESCE(m.banco_conta, mp.banco_conta) AS banco_conta,
    COALESCE(m.banco_pix, mp.banco_pix) AS banco_pix,
    
    -- Dados de checkin/checkout
    cc.checkin,
    cc.checkout,
    cc.checkin_latitude,
    cc.checkin_longitude,
    cc.checkout_latitude,
    cc.checkout_longitude,
    cc.checkin_justificativa,
    cc.checkout_justificativa
    
FROM public.vagas v
INNER JOIN public.candidaturas c ON c.vagas_id = v.vagas_id
LEFT JOIN public.medicos m ON m.id = c.medico_id AND c.medico_precadastro_id IS NULL
LEFT JOIN public.medicos_precadastro mp ON mp.id = c.medico_precadastro_id
LEFT JOIN public.checkin_checkout cc ON cc.vagas_id = v.vagas_id AND (cc.medico_id = m.id OR cc.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5')
LEFT JOIN public.hospital h ON h.hospital_id = v.vagas_hospital
LEFT JOIN public.especialidades e ON e.especialidade_id = v.vaga_especialidade
LEFT JOIN public.especialidades me ON me.especialidade_id = m.medico_especialidade
LEFT JOIN public.especialidades mpe ON mpe.especialidade_id = mp.medico_especialidade
LEFT JOIN public.setores s ON s.setor_id = v.vagas_setor
LEFT JOIN public.periodo p ON p.periodo_id = v.vagas_periodo
LEFT JOIN public.formas_recebimento fr ON fr.id = v.vagas_formarecebimento
WHERE 
    v.vagas_status = 'fechada'
    AND c.candidatura_status = 'APROVADO';
