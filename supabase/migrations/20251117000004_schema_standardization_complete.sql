-- =====================================================================================
-- Migration: 20251117000004_schema_standardization_complete.sql
-- Description: Padronização completa de schema - snake_case, pluralização e timestamptz
-- Consolidates: 8 migration files relacionadas a padronização de schema
--   - 20251110144910_rename_tables_snake_case.sql
--   - 20251110145310_refactorando_bd.sql (BASE - 1824 lines)
--   - 20251110145410_rename_tables_to_plural.sql
--   - 20251110145610_fix_table_and_column_names.sql
--   - 20251110150610_fix_database_structure.sql
--   - 20251110152710_fix_fk_on_tables.sql
--   - 20251110152910_fix_default_value_on_vagas.sql
--   - 20251117143500_add_unique_constraints_to_medicos_precadastro.sql
--
-- Adicionalmente:
--   - Configura timezone do database para America/Sao_Paulo
--   - Converte colunas timestamp (sem timezone) para timestamptz nas tabelas:
--     * candidaturas: created_at, updated_at
--     * checkin_checkout: checkin, checkout, created_at, updated_at
--     * medicos: created_at, delete_at
-- =====================================================================================

-- =========================================================================
-- CONFIGURAÇÃO INICIAL: TIMEZONE
-- =========================================================================
-- Define o timezone do database para America/Sao_Paulo
-- Isso garante que todas as branches criadas herdem essa configuração
ALTER DATABASE postgres SET timezone = 'America/Sao_Paulo';

-- =========================================================================
-- FASE 0: PREPARAÇÃO - DROP de todas as dependências
-- =========================================================================

-- Drop views que ainda existem e serão recriadas em 20251117000011_views_complete.sql
-- (outras views já foram removidas na migração 03)
DROP VIEW IF EXISTS public.vw_vagas_candidaturas CASCADE;
DROP VIEW IF EXISTS public.vw_vagas_abertas CASCADE;
DROP VIEW IF EXISTS public.vw_folha_pagamento CASCADE;
DROP VIEW IF EXISTS public.vagas_completo CASCADE;

-- Drop todas as Foreign Keys que serão recriadas
ALTER TABLE public.vagas_beneficio DROP CONSTRAINT IF EXISTS vagas_beneficio_beneficio_id_fkey;
ALTER TABLE public.vagas_requisito DROP CONSTRAINT IF EXISTS vagas_requisito_requisito_tipo_id_fkey;
ALTER TABLE public.equipes DROP CONSTRAINT IF EXISTS fk_grupo_id;
ALTER TABLE public.equipes_medicos DROP CONSTRAINT IF EXISTS equipes_medicos_grupo_id_fkey;
ALTER TABLE public.escalista DROP CONSTRAINT IF EXISTS escalista_grupo_id_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_grupo_id_fkey;
ALTER TABLE public.medicos_favoritos DROP CONSTRAINT IF EXISTS medicos_favoritos_grupo_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_grupo_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_hospital_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_hospital_id_fkey;
ALTER TABLE public.hospital_geofencing DROP CONSTRAINT IF EXISTS hospital_geofencing_hospital_id_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_setor_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_setor_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_periodo_fkey;
ALTER TABLE public.vagas_requisito DROP CONSTRAINT IF EXISTS vagas_requisito_requisito_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_recorrencia_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_escalista_fkey;
ALTER TABLE public.medicos_favoritos DROP CONSTRAINT IF EXISTS fk_medicos_favoritos_escalista;
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_vagas_id_fkey;
ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_vagas_id_fkey;
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_vagas_id_fkey;
ALTER TABLE public.vagas_beneficio DROP CONSTRAINT IF EXISTS vagas_beneficio_vaga_id_fkey;
ALTER TABLE public.vagas_requisito DROP CONSTRAINT IF EXISTS vagas_requisito_vagas_id_fkey;
ALTER TABLE public.vagas_salvas DROP CONSTRAINT IF EXISTS vagas_salvas_vagas_id_fkey;
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_candidaturas_id_fkey;
ALTER TABLE public.escalista DROP CONSTRAINT IF EXISTS escalista_escalista_auth_id_fkey;
ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_especialidade_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vaga_especialidade_fkey;
ALTER TABLE public.medicos_precadastro DROP CONSTRAINT IF EXISTS medicos_precadastro_medico_especialidade_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_especialidade_id_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_formarecebimento_fkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_tipo_fkey;
ALTER TABLE public.equipes_medicos DROP CONSTRAINT IF EXISTS equipes_medicos_equipes_id_fkey;
ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_medico_id_fkey;
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS fk_medico_precadastro_candidaturas;
ALTER TABLE public.equipes_medicos DROP CONSTRAINT IF EXISTS fk_medico_precadastro;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS fk_vagas_grade;

-- Drop todos os índices que serão recriados
DROP INDEX IF EXISTS idx_beneficio_nome;
DROP INDEX IF EXISTS idx_grupo_nome;
DROP INDEX IF EXISTS idx_hospital_nome;
DROP INDEX IF EXISTS idx_setor_nome;
DROP INDEX IF EXISTS idx_escalista_nome;
DROP INDEX IF EXISTS idx_medico_cpf;
DROP INDEX IF EXISTS idx_medico_crm;
DROP INDEX IF EXISTS idx_medico_localidade;
DROP INDEX IF EXISTS idx_medico_nome;
DROP INDEX IF EXISTS idx_medicos_cpf;
DROP INDEX IF EXISTS idx_medicos_crm;
DROP INDEX IF EXISTS idx_medicos_email;
DROP INDEX IF EXISTS idx_medicos_especialidade;
DROP INDEX IF EXISTS idx_medicos_status;
DROP INDEX IF EXISTS idx_vaga_escalista;
DROP INDEX IF EXISTS idx_vaga_hospital;
DROP INDEX IF EXISTS idx_vaga_periodo;
DROP INDEX IF EXISTS idx_vaga_setor;
DROP INDEX IF EXISTS idx_vagas_especialidade;
DROP INDEX IF EXISTS idx_vagas_hospital;
DROP INDEX IF EXISTS idx_vagas_status;
DROP INDEX IF EXISTS idx_candidatura_status;
DROP INDEX IF EXISTS idx_candidaturas_status;
DROP INDEX IF EXISTS idx_medicos_precadastro_cpf;
DROP INDEX IF EXISTS idx_medicos_precadastro_crm;
DROP INDEX IF EXISTS idx_medicos_precadastro_nome;

-- =========================================================================
-- FASE 1: RENOMEAR TABELAS PARA SNAKE_CASE
-- =========================================================================

ALTER TABLE IF EXISTS public."bannerMKT" RENAME TO banner_mkt;
ALTER TABLE IF EXISTS public."codigosdearea" RENAME TO codigos_de_area;
ALTER TABLE IF EXISTS public."estadosBrasil" RENAME TO estados_brasil;
ALTER TABLE IF EXISTS public."tipovaga" RENAME TO tipo_vaga;
ALTER TABLE IF EXISTS public."whatsappnumber" RENAME TO whatsapp_number;

-- =========================================================================
-- FASE 2: RENOMEAR TODAS AS COLUNAS (POR TABELA)
-- =========================================================================

-- 2.1. user_profile
ALTER TABLE public.user_profile RENAME COLUMN "areacodeIndex" TO areacode_index;
ALTER TABLE public.user_profile RENAME COLUMN "UFindex" TO uf_index;
ALTER TABLE public.user_profile RENAME COLUMN "specialtyIndex" TO specialty_index;

-- 2.2. estados_brasil
ALTER TABLE public.estados_brasil RENAME COLUMN "Nome" TO nome;
ALTER TABLE public.estados_brasil RENAME COLUMN "Sigla" TO sigla;
ALTER TABLE public.estados_brasil RENAME COLUMN "Lista" TO lista;

-- 2.3. codigos_de_area
ALTER TABLE public.codigos_de_area RENAME COLUMN "Index" TO index;
ALTER TABLE public.codigos_de_area RENAME COLUMN "País" TO pais;
ALTER TABLE public.codigos_de_area RENAME COLUMN "Código" TO codigo;
ALTER TABLE public.codigos_de_area RENAME COLUMN "Formato" TO formato;
ALTER TABLE public.codigos_de_area RENAME COLUMN "Caracteres Máx" TO caracteres_max;
ALTER TABLE public.codigos_de_area RENAME COLUMN "Lista" TO lista;

-- Refatorar constraint
ALTER TABLE public.codigos_de_area DROP CONSTRAINT IF EXISTS codigosdearea_pkey;
ALTER TABLE public.codigos_de_area ADD CONSTRAINT codigosdearea_pkey PRIMARY KEY (pais);

-- 2.4. banner_mkt
ALTER TABLE public.banner_mkt RENAME COLUMN "page index" TO page_index;
ALTER TABLE public.banner_mkt RENAME COLUMN "URL" TO "url";

-- 2.5. beneficio_tipo
ALTER TABLE public.beneficio_tipo DROP CONSTRAINT IF EXISTS beneficio_tipo_pkey;
ALTER TABLE public.beneficio_tipo DROP CONSTRAINT IF EXISTS beneficio_tipo_beneficio_id_key;
ALTER TABLE public.beneficio_tipo DROP CONSTRAINT IF EXISTS beneficio_tipo_beneficio_nome_key;

ALTER TABLE public.beneficio_tipo RENAME COLUMN beneficio_id TO id;
ALTER TABLE public.beneficio_tipo RENAME COLUMN beneficio_nome TO nome;

ALTER TABLE public.beneficio_tipo ADD CONSTRAINT beneficio_tipo_pkey PRIMARY KEY (id);
ALTER TABLE public.beneficio_tipo ADD CONSTRAINT beneficio_tipo_beneficio_id_key UNIQUE (id);
ALTER TABLE public.beneficio_tipo ADD CONSTRAINT beneficio_tipo_beneficio_nome_key UNIQUE (nome);

ALTER TABLE public.beneficio_tipo ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 2.6. especialidades
ALTER TABLE public.especialidades RENAME COLUMN especialidade_id TO id;
ALTER TABLE public.especialidades RENAME COLUMN especialidade_created_at TO created_at;
ALTER TABLE public.especialidades RENAME COLUMN especialidade_index TO index;
ALTER TABLE public.especialidades RENAME COLUMN especialidade_nome TO nome;

ALTER TABLE public.especialidades ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Sao_Paulo';

-- 2.7. grupo
ALTER TABLE public.grupo RENAME COLUMN grupo_id TO id;
ALTER TABLE public.grupo RENAME COLUMN grupo_nome TO nome;
ALTER TABLE public.grupo RENAME COLUMN grupo_responsavel TO responsavel;
ALTER TABLE public.grupo RENAME COLUMN grupo_telefone TO telefone;
ALTER TABLE public.grupo RENAME COLUMN grupo_email TO email;
ALTER TABLE public.grupo RENAME COLUMN grupo_createdate TO created_at;

ALTER TABLE public.grupo ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Sao_Paulo';
ALTER TABLE public.grupo ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS grupo_pkey;
ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS grupo_grupo_nome_key;
ALTER TABLE public.grupo ADD CONSTRAINT grupo_pkey PRIMARY KEY (id);
ALTER TABLE public.grupo ADD CONSTRAINT grupo_grupo_nome_key UNIQUE (nome);

-- 2.8. hospital
ALTER TABLE public.hospital RENAME COLUMN hospital_id TO id;
ALTER TABLE public.hospital RENAME COLUMN hospital_nome TO nome;
ALTER TABLE public.hospital RENAME COLUMN hospital_logradouro TO logradouro;
ALTER TABLE public.hospital RENAME COLUMN hospital_numero TO numero;
ALTER TABLE public.hospital RENAME COLUMN hospital_cidade TO cidade;
ALTER TABLE public.hospital RENAME COLUMN hospital_bairro TO bairro;
ALTER TABLE public.hospital RENAME COLUMN hospital_estado TO estado;
ALTER TABLE public.hospital RENAME COLUMN hospital_pais TO pais;
ALTER TABLE public.hospital RENAME COLUMN hospital_cep TO cep;
ALTER TABLE public.hospital RENAME COLUMN hospital_avatar TO avatar;

ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hospital DROP CONSTRAINT IF EXISTS hospital_pkey;
ALTER TABLE public.hospital ADD CONSTRAINT hospital_pkey PRIMARY KEY (id);

-- 2.9. setores
ALTER TABLE public.setores RENAME COLUMN setor_id TO id;
ALTER TABLE public.setores RENAME COLUMN setor_nome TO nome;

ALTER TABLE public.setores DROP CONSTRAINT IF EXISTS setores_pkey;
ALTER TABLE public.setores ADD CONSTRAINT setores_pkey PRIMARY KEY (id);

-- 2.10. periodo
ALTER TABLE public.periodo RENAME COLUMN periodo_id TO id;

ALTER TABLE public.periodo DROP CONSTRAINT IF EXISTS periodo_pkey;
ALTER TABLE public.periodo ADD CONSTRAINT periodo_pkey PRIMARY KEY (id);

-- 2.11. requisito_tipo
ALTER TABLE public.requisito_tipo RENAME COLUMN requisito_id TO id;
ALTER TABLE public.requisito_tipo RENAME COLUMN requisito_nome TO nome;

ALTER TABLE public.requisito_tipo DROP CONSTRAINT IF EXISTS requisito_tipo_pkey;
ALTER TABLE public.requisito_tipo ADD CONSTRAINT requisito_tipo_pkey PRIMARY KEY (id);

-- 2.12. vagas_recorrencia
ALTER TABLE public.vagas_recorrencia RENAME COLUMN recorrencia_id TO id;

ALTER TABLE public.vagas_recorrencia DROP CONSTRAINT IF EXISTS vagas_recorrencia_pkey;
ALTER TABLE public.vagas_recorrencia ADD CONSTRAINT vagas_recorrencia_pkey PRIMARY KEY (id);

-- 2.13. escalista
ALTER TABLE public.escalista RENAME COLUMN escalista_id TO id;
ALTER TABLE public.escalista RENAME COLUMN escalista_auth_id TO auth_id;
ALTER TABLE public.escalista RENAME COLUMN escalista_nome TO nome;
ALTER TABLE public.escalista RENAME COLUMN escalista_telefone TO telefone;
ALTER TABLE public.escalista RENAME COLUMN escalista_email TO email;
ALTER TABLE public.escalista RENAME COLUMN escalista_createdate TO created_at;
ALTER TABLE public.escalista RENAME COLUMN escalista_updateat TO update_at;
ALTER TABLE public.escalista RENAME COLUMN escalista_updateby TO update_by;

ALTER TABLE public.escalista ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Sao_Paulo';
ALTER TABLE public.escalista ALTER COLUMN update_at TYPE timestamptz USING update_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.escalista DROP CONSTRAINT IF EXISTS escalista_pkey;
ALTER TABLE public.escalista ADD CONSTRAINT escalista_pkey PRIMARY KEY (id);
ALTER TABLE public.escalista ADD CONSTRAINT escalista_id_key UNIQUE (id);

-- 2.14. medicos
ALTER TABLE public.medicos RENAME COLUMN medico_rqe TO rqe;
ALTER TABLE public.medicos RENAME COLUMN medico_genero TO genero;
ALTER TABLE public.medicos RENAME COLUMN medico_cpf TO cpf;
ALTER TABLE public.medicos RENAME COLUMN medico_rg TO rg;
ALTER TABLE public.medicos RENAME COLUMN medico_crm TO crm;
ALTER TABLE public.medicos RENAME COLUMN medico_nomedafaculdade TO nome_faculdade;
ALTER TABLE public.medicos RENAME COLUMN medico_tipofaculdade TO tipo_faculdade;
ALTER TABLE public.medicos RENAME COLUMN medico_primeironome TO primeiro_nome;
ALTER TABLE public.medicos RENAME COLUMN medico_sobrenome TO sobrenome;
ALTER TABLE public.medicos RENAME COLUMN medico_email TO email;
ALTER TABLE public.medicos RENAME COLUMN medico_telefone TO telefone;
ALTER TABLE public.medicos RENAME COLUMN medico_datanascimento TO data_nascimento;
ALTER TABLE public.medicos RENAME COLUMN medico_logradouro TO logradouro;
ALTER TABLE public.medicos RENAME COLUMN medico_numero TO numero;
ALTER TABLE public.medicos RENAME COLUMN medico_bairro TO bairro;
ALTER TABLE public.medicos RENAME COLUMN medico_cidade TO cidade;
ALTER TABLE public.medicos RENAME COLUMN medico_estado TO estado;
ALTER TABLE public.medicos RENAME COLUMN medico_pais TO pais;
ALTER TABLE public.medicos RENAME COLUMN medico_cep TO cep;
ALTER TABLE public.medicos RENAME COLUMN medico_updateat TO update_at;
ALTER TABLE public.medicos RENAME COLUMN medico_updateby TO update_by;
ALTER TABLE public.medicos RENAME COLUMN medico_deleteat TO delete_at;
ALTER TABLE public.medicos RENAME COLUMN medico_status TO status;
ALTER TABLE public.medicos RENAME COLUMN medico_totalplantoes TO total_plantoes;
ALTER TABLE public.medicos RENAME COLUMN medico_especialidade TO especialidade_id;
ALTER TABLE public.medicos RENAME COLUMN medico_anoterminoespecializacao TO ano_termino_especializacao;
ALTER TABLE public.medicos RENAME COLUMN medico_anoformatura TO ano_formatura;

-- Converter colunas timestamp para timestamptz (com timezone America/Sao_Paulo)
ALTER TABLE public.medicos
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.medicos
  ALTER COLUMN delete_at TYPE timestamptz
  USING delete_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_cpf_key;
ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_crm_key;
ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_email_key;
ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_rg_key;
ALTER TABLE public.medicos DROP CONSTRAINT IF EXISTS medicos_medico_status_check;

ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_cpf_key UNIQUE (cpf);
ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_crm_key UNIQUE (crm);
ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_email_key UNIQUE (email);
ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_rg_key UNIQUE (rg);
ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_status_check CHECK (
    status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'suspenso'::text])
);

-- 2.15. vagas
ALTER TABLE public.vagas RENAME COLUMN vagas_id TO id;
ALTER TABLE public.vagas RENAME COLUMN vagas_createdate TO created_at;
ALTER TABLE public.vagas RENAME COLUMN vagas_updateat TO updated_at;
ALTER TABLE public.vagas RENAME COLUMN vagas_updateby TO updated_by;
ALTER TABLE public.vagas RENAME COLUMN vagas_deleteat TO deleted_at;
ALTER TABLE public.vagas RENAME COLUMN vagas_data TO data;
ALTER TABLE public.vagas RENAME COLUMN vagas_hospital TO hospital_id;
ALTER TABLE public.vagas RENAME COLUMN vaga_especialidade TO especialidade_id;
ALTER TABLE public.vagas RENAME COLUMN vagas_setor TO setor_id;
ALTER TABLE public.vagas RENAME COLUMN vagas_periodo TO periodo_id;
ALTER TABLE public.vagas RENAME COLUMN vagas_escalista TO escalista_id;
ALTER TABLE public.vagas RENAME COLUMN vagas_tipo TO tipo_id;
ALTER TABLE public.vagas RENAME COLUMN vagas_datapagamento TO data_pagamento;
ALTER TABLE public.vagas RENAME COLUMN vagas_horainicio TO hora_inicio;
ALTER TABLE public.vagas RENAME COLUMN vagas_horafim TO hora_fim;
ALTER TABLE public.vagas RENAME COLUMN vagas_valor TO valor;
ALTER TABLE public.vagas RENAME COLUMN vagas_observacoes TO observacoes;
ALTER TABLE public.vagas RENAME COLUMN vagas_status TO status;
ALTER TABLE public.vagas RENAME COLUMN vagas_totalcandidaturas TO total_candidaturas;
ALTER TABLE public.vagas RENAME COLUMN vagas_formarecebimento TO forma_recebimento_id;
ALTER TABLE public.vagas RENAME COLUMN "Index" TO "index";

ALTER TABLE public.vagas ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Sao_Paulo';
ALTER TABLE public.vagas ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Sao_Paulo';
ALTER TABLE public.vagas ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_pkey;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_valor_check;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_vagas_status_check;

ALTER TABLE public.vagas ADD CONSTRAINT vagas_pkey PRIMARY KEY (id);
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_valor_check CHECK (((valor)::numeric > (0)::numeric));
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_status_check CHECK (
    (status)::text = ANY (ARRAY[
        ('aberta'::character varying)::text,
        ('fechada'::character varying)::text,
        ('cancelada'::character varying)::text,
        ('anunciada'::character varying)::text
    ])
);

-- 2.16. candidaturas
ALTER TABLE public.candidaturas RENAME COLUMN candidaturas_id TO id;
ALTER TABLE public.candidaturas RENAME COLUMN candidaturas_updateat TO updated_at;
ALTER TABLE public.candidaturas RENAME COLUMN candidaturas_updateby TO updated_by;
ALTER TABLE public.candidaturas RENAME COLUMN candidatura_status TO status;
ALTER TABLE public.candidaturas RENAME COLUMN candidatos_dataconfirmacao TO data_confirmacao;
ALTER TABLE public.candidaturas RENAME COLUMN candidatos_createdate TO created_at;
ALTER TABLE public.candidaturas RENAME COLUMN vagas_id TO vaga_id;

-- Renomear vagas_valor para vaga_valor (alinhamento com remoto)
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_vagas_valor_check;
ALTER TABLE public.candidaturas RENAME COLUMN vagas_valor TO vaga_valor;

-- Converter colunas timestamp para timestamptz (com timezone America/Sao_Paulo)
ALTER TABLE public.candidaturas
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.candidaturas
  ALTER COLUMN updated_at TYPE timestamptz
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_pkey;
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidatura_status_check;

ALTER TABLE public.candidaturas ADD CONSTRAINT candidaturas_pkey PRIMARY KEY (id);
ALTER TABLE public.candidaturas ADD CONSTRAINT candidatura_status_check CHECK (
    status = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'REPROVADO'::text])
);
-- Recriar check constraint com nome correto
ALTER TABLE public.candidaturas ADD CONSTRAINT candidaturas_vaga_valor_check CHECK (((vaga_valor)::numeric > (0)::numeric));

-- 2.17. checkin_checkout
ALTER TABLE public.checkin_checkout RENAME COLUMN index TO id;
ALTER TABLE public.checkin_checkout RENAME COLUMN vagas_id TO vaga_id;

-- Converter colunas timestamp para timestamptz (com timezone America/Sao_Paulo)
ALTER TABLE public.checkin_checkout
  ALTER COLUMN checkin TYPE timestamptz
  USING checkin AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.checkin_checkout
  ALTER COLUMN checkout TYPE timestamptz
  USING checkout AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.checkin_checkout
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.checkin_checkout
  ALTER COLUMN updated_at TYPE timestamptz
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_pkey;
ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_index_key;
ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_vagas_id_key;

ALTER TABLE public.checkin_checkout ADD CONSTRAINT checkin_checkout_pkey PRIMARY KEY (id);
ALTER TABLE public.checkin_checkout ADD CONSTRAINT checkin_checkout_index_key UNIQUE (id);
ALTER TABLE public.checkin_checkout ADD CONSTRAINT checkin_checkout_vagas_id_key UNIQUE (vaga_id);

-- 2.18. pagamentos
ALTER TABLE public.pagamentos RENAME COLUMN pagamento_id TO id;
ALTER TABLE public.pagamentos RENAME COLUMN vagas_id TO vaga_id;

-- Renomear candidaturas_id para candidatura_id (alinhamento com remoto)
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_candidaturas_id_fkey;
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_candidaturas_id_key;
ALTER TABLE public.pagamentos RENAME COLUMN candidaturas_id TO candidatura_id;

-- 2.19. vagas_beneficio
ALTER TABLE public.vagas_beneficio RENAME COLUMN "Index" TO id;
ALTER TABLE public.vagas_beneficio RENAME COLUMN vagas_id TO vaga_id;
ALTER TABLE public.vagas_beneficio RENAME COLUMN beneficio_id TO beneficio_tipo_id;

ALTER TABLE public.vagas_beneficio DROP CONSTRAINT IF EXISTS vagas_beneficio_pkey;
ALTER TABLE public.vagas_beneficio ADD CONSTRAINT vagas_beneficio_pkey PRIMARY KEY (id);

-- 2.20. vagas_requisito
ALTER TABLE public.vagas_requisito RENAME COLUMN requisito_id TO requisito_tipo_id;
ALTER TABLE public.vagas_requisito RENAME COLUMN vagas_id TO vaga_id;

-- 2.21. vagas_salvas
ALTER TABLE public.vagas_salvas RENAME COLUMN vagas_id TO vaga_id;

-- 2.21. equipes_medicos
-- Renomear equipes_id para equipe_id (alinhamento com remoto)
ALTER TABLE public.equipes_medicos DROP CONSTRAINT IF EXISTS equipes_medicos_equipes_id_fkey;
ALTER TABLE public.equipes_medicos RENAME COLUMN equipes_id TO equipe_id;

-- 2.22. equipes
ALTER TABLE public.equipes RENAME COLUMN equipes_id TO id;

ALTER TABLE public.equipes DROP CONSTRAINT IF EXISTS equipes_pkey;
ALTER TABLE public.equipes ADD CONSTRAINT equipes_pkey PRIMARY KEY (id);

-- 2.22. medicos_precadastro
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_primeironome TO primeiro_nome;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_sobrenome TO sobrenome;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_crm TO crm;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_cpf TO cpf;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_email TO email;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_telefone TO telefone;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_especialidade TO especialidade_id;
ALTER TABLE public.medicos_precadastro RENAME COLUMN medico_estado TO estado;

-- =========================================================================
-- FASE 3: PLURALIZAR TABELAS
-- =========================================================================

-- Dropar políticas antigas antes de renomear tabelas
DROP POLICY IF EXISTS "Enable full access to astronauta user" ON public.escalista;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.escalista;
DROP POLICY IF EXISTS "escalista_policy" ON public.escalista;

DROP POLICY IF EXISTS "Enable full acess to astronauta user" ON public.grupo;
DROP POLICY IF EXISTS "Enable read to medico users" ON public.grupo;
DROP POLICY IF EXISTS "escalista_read_own_grupo" ON public.grupo;

DROP POLICY IF EXISTS "Enable full acess to astronauta users" ON public.hospital;
DROP POLICY IF EXISTS "Enable insert to escalista users" ON public.hospital;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.hospital;
DROP POLICY IF EXISTS "Enable update to escalista users" ON public.hospital;

DROP POLICY IF EXISTS "Enable escalista and astronauta users update medicos data" ON public.medicos;
DROP POLICY IF EXISTS "Enable escalista users read all data" ON public.medicos;
DROP POLICY IF EXISTS "Enable medico users update their own data only" ON public.medicos;
DROP POLICY IF EXISTS "Enable medicos users insert their own data only" ON public.medicos;
DROP POLICY IF EXISTS "Enable medicos users to view their own data only" ON public.medicos;

DROP POLICY IF EXISTS "Insert policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Select policy" ON public.medicos_precadastro;
DROP POLICY IF EXISTS "Update policy" ON public.medicos_precadastro;

DROP POLICY IF EXISTS "vagas_delete_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_insert_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_select_policy" ON public.vagas;
DROP POLICY IF EXISTS "vagas_update_policy" ON public.vagas;

DROP POLICY IF EXISTS "candidaturas_delete_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_insert_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_select_policy" ON public.candidaturas;
DROP POLICY IF EXISTS "candidaturas_update_policy" ON public.candidaturas;

-- Renomear tabelas para plural
ALTER TABLE IF EXISTS public.hospital RENAME TO hospitais;
ALTER TABLE IF EXISTS public.grupo RENAME TO grupos;
ALTER TABLE IF EXISTS public.periodo RENAME TO periodos;
ALTER TABLE IF EXISTS public.escalista RENAME TO escalistas;
ALTER TABLE IF EXISTS public.tipo_vaga RENAME TO tipos_vaga;

-- Renomear tabelas removendo sufixo _tipo (alinhamento com remoto)
ALTER TABLE IF EXISTS public.beneficio_tipo RENAME TO beneficios;
ALTER TABLE IF EXISTS public.requisito_tipo RENAME TO requisitos;

-- Pluralizar tabelas de relacionamento (alinhamento com remoto)
ALTER TABLE IF EXISTS public.vagas_beneficio RENAME TO vagas_beneficios;
ALTER TABLE IF EXISTS public.vagas_recorrencia RENAME TO vagas_recorrencias;
ALTER TABLE IF EXISTS public.vagas_requisito RENAME TO vagas_requisitos;

-- Correções de nomes de tabelas
ALTER TABLE IF EXISTS public.codigos_de_area RENAME TO codigos_area;

-- Ajustar nome de coluna em vagas
ALTER TABLE IF EXISTS public.vagas RENAME COLUMN tipo_id TO tipos_vaga_id;

-- Renomear colunas de FK após pluralização (alinhamento com remoto)
-- vagas_beneficios: beneficio_tipo_id → beneficio_id
ALTER TABLE public.vagas_beneficios DROP CONSTRAINT IF EXISTS vagas_beneficio_beneficio_id_fkey;
ALTER TABLE public.vagas_beneficios RENAME COLUMN beneficio_tipo_id TO beneficio_id;

-- vagas_requisitos: requisito_tipo_id → requisito_id
ALTER TABLE public.vagas_requisitos DROP CONSTRAINT IF EXISTS vagas_requisito_requisito_id_fkey;
ALTER TABLE public.vagas_requisitos RENAME COLUMN requisito_tipo_id TO requisito_id;

-- Renomear colunas após pluralização das tabelas (alinhamento com remoto)
-- 3.1. periodos
ALTER TABLE public.periodos RENAME COLUMN periodo TO nome;
ALTER TABLE public.periodos ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3.2. tipos_vaga
ALTER TABLE public.tipos_vaga RENAME COLUMN tipo TO nome;
ALTER TABLE public.tipos_vaga ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3.3. setores
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- =========================================================================
-- FASE 4: RECRIAR ÍNDICES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_beneficio_nome ON public.beneficios USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_grupo_nome ON public.grupos USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_hospital_nome ON public.hospitais USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_setor_nome ON public.setores USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_escalista_nome ON public.escalistas USING btree (nome);

CREATE INDEX IF NOT EXISTS idx_medico_cpf ON public.medicos USING btree (cpf);
CREATE INDEX IF NOT EXISTS idx_medico_crm ON public.medicos USING btree (crm);
CREATE INDEX IF NOT EXISTS idx_medico_localidade ON public.medicos USING btree (cidade, estado);
CREATE INDEX IF NOT EXISTS idx_medico_nome ON public.medicos USING btree (primeiro_nome, sobrenome);
CREATE INDEX IF NOT EXISTS idx_medicos_cpf ON public.medicos USING btree (cpf);
CREATE INDEX IF NOT EXISTS idx_medicos_crm ON public.medicos USING btree (crm);
CREATE INDEX IF NOT EXISTS idx_medicos_email ON public.medicos USING btree (email);
CREATE INDEX IF NOT EXISTS idx_medicos_especialidade ON public.medicos USING btree (especialidade_id);
CREATE INDEX IF NOT EXISTS idx_medicos_status ON public.medicos USING btree (status);

CREATE INDEX IF NOT EXISTS idx_vaga_escalista ON public.vagas USING btree (escalista_id);
CREATE INDEX IF NOT EXISTS idx_vaga_hospital ON public.vagas USING btree (hospital_id);
CREATE INDEX IF NOT EXISTS idx_vaga_periodo ON public.vagas USING btree (data, periodo_id);
CREATE INDEX IF NOT EXISTS idx_vaga_setor ON public.vagas USING btree (setor_id);
CREATE INDEX IF NOT EXISTS idx_vagas_especialidade ON public.vagas USING btree (especialidade_id);
CREATE INDEX IF NOT EXISTS idx_vagas_hospital ON public.vagas USING btree (hospital_id);
CREATE INDEX IF NOT EXISTS idx_vagas_status ON public.vagas USING btree (status);

CREATE INDEX IF NOT EXISTS idx_candidatura_status ON public.candidaturas USING btree (vaga_id, status);
CREATE INDEX IF NOT EXISTS idx_candidaturas_status ON public.candidaturas USING btree (status);

CREATE INDEX IF NOT EXISTS idx_medicos_precadastro_cpf ON public.medicos_precadastro USING btree (cpf);
CREATE INDEX IF NOT EXISTS idx_medicos_precadastro_crm ON public.medicos_precadastro USING btree (crm);
CREATE INDEX IF NOT EXISTS idx_medicos_precadastro_nome ON public.medicos_precadastro USING btree (primeiro_nome, sobrenome);

-- =========================================================================
-- FASE 5: RECRIAR FOREIGN KEYS (COM CASCADE)
-- =========================================================================

-- escalistas
ALTER TABLE public.escalistas ADD CONSTRAINT escalista_escalista_auth_id_fkey
    FOREIGN KEY (auth_id) REFERENCES user_profile (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.escalistas ADD CONSTRAINT escalista_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- medicos
ALTER TABLE public.medicos ADD CONSTRAINT medicos_medico_especialidade_fkey
    FOREIGN KEY (especialidade_id) REFERENCES especialidades (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- vagas
ALTER TABLE public.vagas ADD CONSTRAINT vagas_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_recorrencia_id_fkey
    FOREIGN KEY (recorrencia_id) REFERENCES vagas_recorrencias (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vaga_especialidade_fkey
    FOREIGN KEY (especialidade_id) REFERENCES especialidades (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_escalista_fkey
    FOREIGN KEY (escalista_id) REFERENCES escalistas (id) ON UPDATE CASCADE ON DELETE SET DEFAULT;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_hospital_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitais (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_periodo_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_setor_fkey
    FOREIGN KEY (setor_id) REFERENCES setores (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_formarecebimento_fkey
    FOREIGN KEY (forma_recebimento_id) REFERENCES formas_recebimento (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_vagas_tipo_fkey
    FOREIGN KEY (tipos_vaga_id) REFERENCES tipos_vaga (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.vagas ADD CONSTRAINT fk_vagas_grade
    FOREIGN KEY (grade_id) REFERENCES grades (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- candidaturas
ALTER TABLE public.candidaturas ADD CONSTRAINT candidaturas_vaga_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.candidaturas ADD CONSTRAINT fk_medico_precadastro_candidaturas
    FOREIGN KEY (medico_precadastro_id) REFERENCES medicos_precadastro (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- checkin_checkout
ALTER TABLE public.checkin_checkout ADD CONSTRAINT checkin_checkout_vagas_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.checkin_checkout ADD CONSTRAINT checkin_checkout_medico_id_fkey
    FOREIGN KEY (medico_id) REFERENCES medicos (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- pagamentos
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_candidatura_id_fkey
    FOREIGN KEY (candidatura_id) REFERENCES candidaturas (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_vaga_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON UPDATE CASCADE ON DELETE CASCADE;
-- Recriar unique constraint
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_candidatura_id_key UNIQUE (candidatura_id);

-- vagas_beneficios (nome da tabela corrigido)
ALTER TABLE public.vagas_beneficios ADD CONSTRAINT vagas_beneficios_beneficio_id_fkey
    FOREIGN KEY (beneficio_id) REFERENCES beneficios (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.vagas_beneficios ADD CONSTRAINT vagas_beneficio_vaga_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- vagas_requisitos (nome da tabela corrigido)
ALTER TABLE public.vagas_requisitos ADD CONSTRAINT vagas_requisitos_requisito_id_fkey
    FOREIGN KEY (requisito_id) REFERENCES requisitos (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.vagas_requisitos ADD CONSTRAINT vagas_requisito_vaga_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- vagas_salvas
ALTER TABLE public.vagas_salvas ADD CONSTRAINT vagas_salvas_vaga_id_fkey
    FOREIGN KEY (vaga_id) REFERENCES vagas (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- grades
ALTER TABLE public.grades ADD CONSTRAINT grades_especialidade_id_fkey
    FOREIGN KEY (especialidade_id) REFERENCES especialidades (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.grades ADD CONSTRAINT grades_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.grades ADD CONSTRAINT grades_setor_id_fkey
    FOREIGN KEY (setor_id) REFERENCES setores (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.grades ADD CONSTRAINT grades_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitais (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- medicos_favoritos
ALTER TABLE public.medicos_favoritos ADD CONSTRAINT fk_medicos_favoritos_escalista
    FOREIGN KEY (escalista_id) REFERENCES escalistas (id) ON DELETE CASCADE;
ALTER TABLE public.medicos_favoritos ADD CONSTRAINT medicos_favoritos_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- medicos_precadastro
ALTER TABLE public.medicos_precadastro ADD CONSTRAINT medicos_precadastro_medico_especialidade_fkey
    FOREIGN KEY (especialidade_id) REFERENCES especialidades (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- equipes
ALTER TABLE public.equipes ADD CONSTRAINT fk_grupo_id
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE;
-- Adiciona constraint única composta por (nome, grupo_id)
ALTER TABLE public.equipes ADD CONSTRAINT equipes_nome_grupo_id_key
  UNIQUE (nome, grupo_id);

-- equipes_medicos
ALTER TABLE public.equipes_medicos ADD CONSTRAINT equipes_medicos_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.equipes_medicos ADD CONSTRAINT equipes_medicos_equipe_id_fkey
    FOREIGN KEY (equipe_id) REFERENCES equipes (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.equipes_medicos ADD CONSTRAINT fk_medico_precadastro
    FOREIGN KEY (medico_precadastro_id) REFERENCES medicos_precadastro (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- hospital_geofencing
ALTER TABLE public.hospital_geofencing ADD CONSTRAINT hospital_geofencing_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitais (id) ON DELETE CASCADE;

-- =========================================================================
-- FASE 6: RECRIAR UNIQUE CONSTRAINTS
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS medicos_precadastro_crm_key
    ON public.medicos_precadastro (crm)
    WHERE crm IS NOT NULL AND crm != 'Não informado';

CREATE UNIQUE INDEX IF NOT EXISTS medicos_precadastro_cpf_key
    ON public.medicos_precadastro (cpf)
    WHERE cpf IS NOT NULL AND cpf != 'Não informado';

CREATE UNIQUE INDEX IF NOT EXISTS medicos_precadastro_email_key
    ON public.medicos_precadastro (email)
    WHERE email IS NOT NULL AND email != 'Não informado';

CREATE UNIQUE INDEX IF NOT EXISTS medicos_precadastro_telefone_key
    ON public.medicos_precadastro (telefone)
    WHERE telefone IS NOT NULL AND telefone != 'Não informado';

-- Hospitais: Tornar coordenadas obrigatórias e adicionar unique constraints
ALTER TABLE public.hospitais ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE public.hospitais ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE public.hospitais ALTER COLUMN endereco_formatado SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hospitais_nome_key
    ON public.hospitais (nome);

CREATE UNIQUE INDEX IF NOT EXISTS hospitais_endereco_formatado_key
    ON public.hospitais (endereco_formatado);

CREATE UNIQUE INDEX IF NOT EXISTS hospitais_lat_lng_key
    ON public.hospitais (latitude, longitude);

-- =========================================================================
-- FASE 7: DEFINIR VALORES DEFAULT
-- =========================================================================

ALTER TABLE public.vagas ALTER COLUMN escalista_id SET DEFAULT 'cf37ce09-e25d-4c67-b319-3e50d1cc964b'::uuid;
ALTER TABLE public.vagas ALTER COLUMN updated_by SET DEFAULT 'cf37ce09-e25d-4c67-b319-3e50d1cc964b'::uuid;

-- =========================================================================
-- FASE 8: FUNÇÕES
-- =========================================================================

CREATE OR REPLACE FUNCTION update_especialidade_nome()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    SELECT esp.nome INTO NEW.especialidade_nome
    FROM public.especialidades esp
    WHERE esp.id = NEW.especialidade_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION cleanup_medicos_precadastro()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE equipes_medicos
  SET medico_id = NEW.id, medico_precadastro_id = NULL
  WHERE medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'
    AND medico_precadastro_id IN (
      SELECT id FROM medicos_precadastro
      WHERE (crm = NEW.crm AND estado = NEW.estado)
         OR (NEW.cpf IS NOT NULL AND cpf IS NOT NULL
           AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') =
               REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), ' ', ''))
    );

  UPDATE candidaturas
  SET medico_id = NEW.id, medico_precadastro_id = NULL
  WHERE medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'
    AND medico_precadastro_id IN (
      SELECT id FROM medicos_precadastro
      WHERE (crm = NEW.crm AND estado = NEW.estado)
         OR (NEW.cpf IS NOT NULL AND cpf IS NOT NULL
           AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') =
               REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), ' ', ''))
    );

  DELETE FROM medicos_precadastro WHERE crm = NEW.crm AND estado = NEW.estado;

  IF NEW.cpf IS NOT NULL THEN
    DELETE FROM medicos_precadastro
    WHERE cpf IS NOT NULL
      AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') =
          REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), ' ', '');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION atualizar_candidaturas_vaga_cancelada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'cancelada' AND (OLD.status IS NULL OR OLD.status != 'cancelada') THEN
        UPDATE public.candidaturas
        SET status = 'REPROVADO', updated_at = now(), updated_by = 'Sistema: Vaga Cancelada'
        WHERE vaga_id = NEW.id AND status = 'PENDENTE';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION verificar_conflito_antes_candidatura()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    medico_userid uuid;
    conflito_encontrado boolean := false;
    vaga_data date;
    vaga_inicio time;
    vaga_fim time;
    vaga_conflitante_info text;
    current_user_id uuid;
    current_user_role text;
    vaga_inicio_ts timestamp;
    vaga_fim_ts timestamp;
BEGIN
    current_user_id := auth.uid();
    RAISE NOTICE 'Usuário atual: %', current_user_id;

    SELECT role INTO current_user_role FROM user_profile WHERE id = current_user_id;

    SELECT
        CASE WHEN NEW.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND NEW.medico_precadastro_id IS NOT NULL
            THEN NEW.medico_precadastro_id ELSE NEW.medico_id END,
        v.data, v.hora_inicio, v.hora_fim
    INTO medico_userid, vaga_data, vaga_inicio, vaga_fim
    FROM vagas v WHERE v.id = NEW.vaga_id;

    vaga_inicio_ts := vaga_data + vaga_inicio;
    IF vaga_fim <= vaga_inicio THEN
        vaga_fim_ts := (vaga_data + INTERVAL '1 day') + vaga_fim;
    ELSE
        vaga_fim_ts := vaga_data + vaga_fim;
    END IF;

    IF vaga_data < CURRENT_DATE AND current_user_role = 'free' THEN
        RAISE EXCEPTION 'CANDIDATURA BLOQUEADA: Não é possível se candidatar em vaga com data passada. Data da vaga: %', vaga_data;
    END IF;

    SELECT
        EXISTS (
            SELECT 1 FROM candidaturas c JOIN vagas v ON c.vaga_id = v.id
            WHERE ((c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
                OR (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid))
            AND c.status = 'APROVADO'
            AND ((v.data + v.hora_inicio,
                 CASE WHEN v.hora_fim <= v.hora_inicio THEN (v.data + INTERVAL '1 day') + v.hora_fim ELSE v.data + v.hora_fim END
                ) OVERLAPS (vaga_inicio_ts, vaga_fim_ts))
        ),
        (SELECT 'Plantão já aprovado: ' || v.data || ' das ' || v.hora_inicio || ' às ' || v.hora_fim ||
                CASE WHEN v.hora_fim <= v.hora_inicio THEN ' (madrugada)' ELSE '' END
            FROM candidaturas c JOIN vagas v ON c.vaga_id = v.id
            WHERE ((c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
                OR (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid))
            AND c.status = 'APROVADO'
            AND ((v.data + v.hora_inicio,
                 CASE WHEN v.hora_fim <= v.hora_inicio THEN (v.data + INTERVAL '1 day') + v.hora_fim ELSE v.data + v.hora_fim END
                ) OVERLAPS (vaga_inicio_ts, vaga_fim_ts))
            LIMIT 1)
    INTO conflito_encontrado, vaga_conflitante_info;

    IF conflito_encontrado THEN
        RAISE EXCEPTION 'CONFLITO DE HORÁRIO DETECTADO: %', vaga_conflitante_info;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION verificar_conflito_vaga_designada(
    p_medico_id UUID,
    p_data date,
    p_hora_inicio time,
    p_hora_fim time
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  medico_userid uuid;
  conflito_encontrado boolean := false;
  vaga_data date;
  vaga_inicio time;
  vaga_fim time;
  vaga_conflitante_info text;
  vaga_inicio_ts timestamp;
  vaga_fim_ts timestamp;
BEGIN
  medico_userid := p_medico_id;
  vaga_data := p_data;
  vaga_inicio := p_hora_inicio;
  vaga_fim := p_hora_fim;

  -- CONVERTER para timestamps considerando turnos noturnos
  vaga_inicio_ts := vaga_data + vaga_inicio;

  -- Se hora fim <= hora início, é turno noturno (vai para o dia seguinte)
  IF vaga_fim <= vaga_inicio THEN
      vaga_fim_ts := (vaga_data + INTERVAL '1 day') + vaga_fim;
  ELSE
      vaga_fim_ts := vaga_data + vaga_fim;
  END IF;

  -- Verificar conflitos de horário considerando medico_id e medico_precadastro_id
  SELECT
      EXISTS (
          SELECT 1
          FROM candidaturas c
          JOIN vagas v ON c.vaga_id = v.id
          WHERE (
              -- Para médicos normais
              (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
              OR
              -- Para médicos pré-cadastrados
              (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
          )
          AND c.status = 'APROVADO'
          AND (
              -- Usar OVERLAPS com timestamps calculados
              (v.data + v.hora_inicio,
               CASE
                   WHEN v.hora_fim <= v.hora_inicio
                   THEN (v.data + INTERVAL '1 day') + v.hora_fim
                   ELSE v.data + v.hora_fim
               END
              ) OVERLAPS
              (vaga_inicio_ts, vaga_fim_ts)
          )
      ),
      (
          SELECT 'Plantão já aprovado: ' || v.data || ' das ' || v.hora_inicio || ' às ' || v.hora_fim ||
                 CASE WHEN v.hora_fim <= v.hora_inicio THEN ' (madrugada)' ELSE '' END
          FROM candidaturas c
          JOIN vagas v ON c.vaga_id = v.id
          WHERE (
              -- Para médicos normais
              (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
              OR
              -- Para médicos pré-cadastrados
              (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
          )
          AND c.status = 'APROVADO'
          AND (
              (v.data + v.hora_inicio,
               CASE
                   WHEN v.hora_fim <= v.hora_inicio
                   THEN (v.data + INTERVAL '1 day') + v.hora_fim
                   ELSE v.data + v.hora_fim
               END
              ) OVERLAPS
              (vaga_inicio_ts, vaga_fim_ts)
          )
          LIMIT 1
      )
  INTO conflito_encontrado, vaga_conflitante_info;

  -- Bloquear se houver conflito de horário
  IF conflito_encontrado THEN
      RAISE EXCEPTION 'CONFLITO DE HORÁRIO DETECTADO: %', vaga_conflitante_info;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION aprovacao_automatica_favoritos()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM medicos_favoritos mf INNER JOIN vagas v ON v.id = NEW.vaga_id
        WHERE mf.medico_id = NEW.medico_id AND mf.grupo_id = v.grupo_id
    ) THEN
        NEW.status := 'APROVADO';
        NEW.data_confirmacao := CURRENT_DATE;
        NEW.updated_at := NOW();
        NEW.updated_by := auth.uid();

        UPDATE vagas SET status = 'fechada', updated_at = NOW(), updated_by = auth.uid() WHERE id = NEW.vaga_id;
        UPDATE candidaturas SET status = 'REPROVADO', updated_at = NOW(), updated_by = auth.uid()
        WHERE vaga_id = NEW.vaga_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION update_total_candidaturas()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vagas SET total_candidaturas = total_candidaturas + 1 WHERE id = NEW.vaga_id;
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            UPDATE public.vagas SET total_candidaturas = GREATEST(total_candidaturas - 1, 0) WHERE id = OLD.vaga_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar vagas durante exclusão: %', SQLERRM;
        END;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION atualizar_vagas_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.status = 'APROVADO' THEN
        UPDATE vagas SET status = 'fechada' WHERE id = NEW.vaga_id;
        UPDATE candidaturas SET status = 'REPROVADO', updated_at = NOW(), updated_by = 'SISTEMA_AUTO_REPROVACAO'
        WHERE vaga_id = NEW.vaga_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION update_total_plantoes_medico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'CONFIRMADO' THEN
        UPDATE medicos SET total_plantoes = total_plantoes + 1 WHERE medico_id = NEW.medico_id;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION validate_checkin_timing()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    current_role TEXT;
    candidatura_aprovada BOOLEAN;
BEGIN
    SELECT auth.role() INTO current_role;
    IF current_role = 'service_role' THEN RETURN NEW; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ERRO Usuário não autenticado.'; END IF;

    SELECT v.data, v.hora_inicio, v.hora_fim INTO vaga_date, vaga_start_time, vaga_end_time
    FROM vagas v WHERE v.id = NEW.vaga_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ERRO Vaga não encontrado.'; END IF;

    SELECT EXISTS(SELECT 1 FROM candidaturas c WHERE c.vaga_id = NEW.vaga_id AND c.medico_id = NEW.medico_id AND c.status = 'APROVADO')
    INTO candidatura_aprovada;
    IF NOT candidatura_aprovada THEN RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.'; END IF;

    IF EXISTS(SELECT 1 FROM checkin_checkout cc WHERE cc.vaga_id = NEW.vaga_id AND cc.medico_id = NEW.medico_id) THEN
        RAISE EXCEPTION 'ERRO Check-in já realizado para esta vaga.';
    END IF;

    plantao_inicio := (vaga_date::TIMESTAMP + vaga_start_time::TIME);
    plantao_fim := (vaga_date::TIMESTAMP + vaga_end_time::TIME);
    janela_inicio := plantao_inicio - INTERVAL '15 minutes';
    janela_fim := plantao_inicio + INTERVAL '15 minutes';

    IF NOW() BETWEEN janela_inicio AND janela_fim THEN
        RETURN NEW;
    ELSE
        IF NEW.checkin_justificativa IS NULL OR TRIM(NEW.checkin_justificativa) = '' THEN
            RAISE EXCEPTION 'ERRO Horário requer justificativa obrigatória.';
        END IF;
        IF NOW() < janela_inicio OR NOW() > plantao_fim THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-in.';
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION validate_checkout_timing()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    vaga_start_time TIME;
    vaga_end_time TIME;
    vaga_date DATE;
    plantao_inicio TIMESTAMP;
    janela_inicio TIMESTAMP;
    plantao_fim TIMESTAMP;
    janela_fim TIMESTAMP;
    current_role TEXT;
    candidatura_aprovada BOOLEAN;
BEGIN
    SELECT auth.role() INTO current_role;
    IF current_role = 'service_role' THEN RETURN NEW; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ERRO Usuário não autenticado.'; END IF;

    SELECT v.data, v.hora_inicio, v.hora_fim INTO vaga_date, vaga_start_time, vaga_end_time
    FROM vagas v WHERE v.id = NEW.vaga_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ERRO Vaga não encontrado.'; END IF;

    SELECT EXISTS(SELECT 1 FROM candidaturas c WHERE c.vaga_id = NEW.vaga_id AND c.medico_id = NEW.medico_id AND c.status = 'APROVADO')
    INTO candidatura_aprovada;
    IF NOT candidatura_aprovada THEN RAISE EXCEPTION 'ERRO Médico não possui candidatura aprovada para esta vaga.'; END IF;

    IF NOT EXISTS(SELECT 1 FROM checkin_checkout cc WHERE cc.vaga_id = NEW.vaga_id AND cc.medico_id = NEW.medico_id) THEN
        RAISE EXCEPTION 'ERRO Check-in ainda não realizado para esta vaga.';
    END IF;

    plantao_inicio := (vaga_date::TIMESTAMP + vaga_start_time::TIME);
    plantao_fim := (vaga_date::TIMESTAMP + vaga_end_time::TIME);
    janela_inicio := plantao_fim - INTERVAL '15 minutes';
    janela_fim := plantao_fim + INTERVAL '15 minutes';

    IF NOW() BETWEEN janela_inicio AND janela_fim THEN
        RETURN NEW;
    ELSE
        IF NEW.checkin_justificativa IS NULL OR TRIM(NEW.checkin_justificativa) = '' THEN
            RAISE EXCEPTION 'ERRO Horário requer justificativa obrigatória.';
        END IF;
        IF NOW() < janela_inicio THEN
            RAISE EXCEPTION 'ERRO Horário não permitido para fazer Check-out.';
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION handle_grades_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$function$;

-- =========================================================================
-- FASE 9: TRIGGERS
-- =========================================================================

DROP TRIGGER IF EXISTS candidaturas_1_verificar_conflito_horario ON candidaturas;
CREATE TRIGGER candidaturas_1_verificar_conflito_horario
    BEFORE INSERT ON candidaturas FOR EACH ROW EXECUTE FUNCTION verificar_conflito_antes_candidatura();

DROP TRIGGER IF EXISTS candidaturas_2_auto_aprovar_favoritos ON candidaturas;
CREATE TRIGGER candidaturas_2_auto_aprovar_favoritos
    BEFORE INSERT ON candidaturas FOR EACH ROW EXECUTE FUNCTION aprovacao_automatica_favoritos();

DROP TRIGGER IF EXISTS candidaturas_3_atualizar_contador_vagas ON candidaturas;
CREATE TRIGGER candidaturas_3_atualizar_contador_vagas
    AFTER INSERT OR DELETE ON candidaturas FOR EACH ROW EXECUTE FUNCTION update_total_candidaturas();

DROP TRIGGER IF EXISTS candidaturas_4_fechar_vaga_ao_aprovar ON candidaturas;
CREATE TRIGGER candidaturas_4_fechar_vaga_ao_aprovar
    AFTER INSERT OR UPDATE ON candidaturas FOR EACH ROW WHEN (NEW.status = 'APROVADO'::text)
    EXECUTE FUNCTION atualizar_vagas_status();

DROP TRIGGER IF EXISTS candidaturas_5_contar_plantoes_medico ON candidaturas;
CREATE TRIGGER candidaturas_5_contar_plantoes_medico
    AFTER UPDATE ON candidaturas FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_total_plantoes_medico();

DROP TRIGGER IF EXISTS checkin_checkout_1_validar_timing ON checkin_checkout;
CREATE TRIGGER checkin_checkout_1_validar_timing
    BEFORE INSERT ON checkin_checkout FOR EACH ROW EXECUTE FUNCTION validate_checkin_timing();

DROP TRIGGER IF EXISTS checkin_checkout_2_validar_timing ON checkin_checkout;
CREATE TRIGGER checkin_checkout_2_validar_timing
    BEFORE UPDATE ON checkin_checkout FOR EACH ROW EXECUTE FUNCTION validate_checkout_timing();

DROP TRIGGER IF EXISTS trigger_grades_updated_at ON grades;
CREATE TRIGGER trigger_grades_updated_at
    BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION handle_grades_updated_at();

DROP TRIGGER IF EXISTS especialidades_1_setar_coluna_nome ON medicos;
CREATE TRIGGER especialidades_1_setar_coluna_nome
    BEFORE INSERT OR UPDATE ON medicos FOR EACH ROW EXECUTE FUNCTION update_especialidade_nome();

DROP TRIGGER IF EXISTS medicos_1_cleanup_precadastro ON medicos;
CREATE TRIGGER medicos_1_cleanup_precadastro
    AFTER INSERT ON medicos FOR EACH ROW EXECUTE FUNCTION cleanup_medicos_precadastro();

DROP TRIGGER IF EXISTS vagas_1_reprovar_candidaturas_ao_cancelar ON vagas;
CREATE TRIGGER vagas_1_reprovar_candidaturas_ao_cancelar
    AFTER UPDATE OF status ON vagas FOR EACH ROW EXECUTE FUNCTION atualizar_candidaturas_vaga_cancelada();

-- =====================================================
-- AJUSTAR FOREIGN KEY: grades.created_by -> auth.users
-- =====================================================

-- Remover constraint antiga
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_created_by_fkey;

-- Recriar com ON DELETE SET NULL e ON UPDATE CASCADE
ALTER TABLE public.grades
  ADD CONSTRAINT grades_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
-- NOTA: Todas as views foram movidas para 20251117000011_views_complete.sql
-- para garantir que referenciem os nomes corretos das tabelas após
-- todas as transformações de schema terem sido aplicadas.
