-- =============================================================================
-- Houston III Portfolio Seed (sanitized)
-- =============================================================================
-- Credenciais de acesso demo:
--   email: demo@houston.local
--   senha: demo123456
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- IDs fixos para manter a seed idempotente
-- -----------------------------------------------------------------------------
-- demo_user_id        = 11111111-1111-4111-8111-111111111111
-- mock_coord_user_id  = 12121212-1212-4121-8121-121212121212
-- mock_escal_user_id  = 13131313-1313-4131-8131-131313131313
-- demo_group_id       = 22222222-2222-4222-8222-222222222222
-- demo_hospital_id    = 33333333-3333-4333-8333-333333333333
-- demo_especialidade  = 44444444-4444-4444-8444-444444444444
-- demo_setor_id       = 55555555-5555-4555-8555-555555555555
-- demo_periodo_id     = 66666666-6666-4666-8666-666666666666
-- demo_tipo_vaga_id   = 77777777-7777-4777-8777-777777777777
-- demo_forma_rec_id   = 88888888-8888-4888-8888-888888888888
-- demo_vaga_id        = 99999999-9999-4999-8999-999999999999
-- demo_identity_id    = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
-- demo_grade_id       = bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
-- demo_recorrencia_id = cccccccc-cccc-4ccc-8ccc-cccccccccccc
-- demo_vaga_grade_1   = dddddddd-dddd-4ddd-8ddd-dddddddddddd
-- demo_vaga_grade_2   = eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee
-- demo_medico_pre_1   = f1111111-1111-4111-8111-111111111111
-- demo_medico_pre_2   = f2222222-2222-4222-8222-222222222222
-- demo_medico_pre_3   = f3333333-3333-4333-8333-333333333333
-- demo_medico_pre_4   = f4444444-4444-4444-8444-444444444444

-- -----------------------------------------------------------------------------
-- Catálogos mínimos
-- -----------------------------------------------------------------------------
INSERT INTO public.grupos (id, nome, responsavel, telefone, email, created_at, updated_at)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'Grupo Demo Portfolio',
  'Admin Demo',
  '11990000000',
  'contato@houston.local',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  responsavel = EXCLUDED.responsavel,
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  updated_at = NOW();

INSERT INTO public.especialidades (id, created_at, nome, index)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  NOW(),
  'Clínica Geral (Demo)',
  1
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  index = EXCLUDED.index;

INSERT INTO public.setores (id, nome, created_at, updated_at)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  'Pronto Atendimento (Demo)',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  updated_at = NOW();

INSERT INTO public.periodos (id, created_at, nome, updated_at)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  NOW(),
  'Diurno',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  updated_at = NOW();

INSERT INTO public.tipos_vaga (id, created_at, nome, updated_at)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  NOW(),
  'Plantão',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  updated_at = NOW();

INSERT INTO public.formas_recebimento (id, created_at, forma_recebimento)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  NOW(),
  'Pessoa Jurídica'
)
ON CONFLICT (id) DO UPDATE
SET
  forma_recebimento = EXCLUDED.forma_recebimento;

INSERT INTO public.hospitais (
  id,
  nome,
  logradouro,
  numero,
  cidade,
  bairro,
  estado,
  pais,
  cep,
  latitude,
  longitude,
  endereco_formatado,
  avatar,
  created_at,
  updated_at
)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  'Hospital Demo Central',
  'Av. Paulista',
  '1000',
  'São Paulo',
  'Bela Vista',
  'SP',
  'Brasil',
  '01310-100',
  -23.561414,
  -46.656364,
  'Av. Paulista, 1000, Bela Vista, São Paulo - SP, 01310-100, Brasil',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  logradouro = EXCLUDED.logradouro,
  numero = EXCLUDED.numero,
  cidade = EXCLUDED.cidade,
  bairro = EXCLUDED.bairro,
  estado = EXCLUDED.estado,
  pais = EXCLUDED.pais,
  cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  endereco_formatado = EXCLUDED.endereco_formatado,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Usuário demo de autenticação (Supabase Auth)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'demo@houston.local',
  crypt('demo123456', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email":"demo@houston.local","display_name":"Demo Admin","platform_origin":"houston","data":{"display_name":"Demo Admin","platform_origin":"houston","phone":"11990000000"}}'::jsonb,
  false,
  NOW(),
  NOW(),
  '5511990000000',
  NOW(),
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL,
  false
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW(),
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW(),
  phone = EXCLUDED.phone,
  phone_confirmed_at = NOW();

-- Usuários mock (somente visualização de dados; não serão usados para login)
-- Observação: não inserimos auth.identities para estes usuários.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '12121212-1212-4121-8121-121212121212',
  'authenticated',
  'authenticated',
  'mock.coordenador@houston.local',
  crypt('mock-only-no-login', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email":"mock.coordenador@houston.local","display_name":"Mock Coordenador","platform_origin":"portfolio-mock","data":{"display_name":"Mock Coordenador","platform_origin":"portfolio-mock","phone":"11991111111"}}'::jsonb,
  false,
  NOW(),
  NOW(),
  '5511991111111',
  NOW(),
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL,
  false
), (
  '00000000-0000-0000-0000-000000000000',
  '13131313-1313-4131-8131-131313131313',
  'authenticated',
  'authenticated',
  'mock.escalista@houston.local',
  crypt('mock-only-no-login', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email":"mock.escalista@houston.local","display_name":"Mock Escalista","platform_origin":"portfolio-mock","data":{"display_name":"Mock Escalista","platform_origin":"portfolio-mock","phone":"11992222222"}}'::jsonb,
  false,
  NOW(),
  NOW(),
  '5511992222222',
  NOW(),
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL,
  false
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW(),
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW(),
  phone = EXCLUDED.phone,
  phone_confirmed_at = NOW();

DELETE FROM auth.identities WHERE user_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  id
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"demo@houston.local","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW(),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO UPDATE
SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Perfis e vínculos (demo + usuários mock)
-- -----------------------------------------------------------------------------
INSERT INTO public.user_profile (
  id,
  created_at,
  role,
  profilepicture,
  displayname,
  gender,
  areacode_index,
  uf_index,
  specialty_index,
  fcm_token,
  platform,
  apn_token
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  NOW(),
  'gestor',
  NULL,
  'Demo Admin',
  'Dr.',
  0,
  23,
  0,
  NULL,
  'web',
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  displayname = EXCLUDED.displayname,
  platform = EXCLUDED.platform;

INSERT INTO public.user_profile (
  id,
  created_at,
  role,
  profilepicture,
  displayname,
  gender,
  areacode_index,
  uf_index,
  specialty_index,
  fcm_token,
  platform,
  apn_token
)
VALUES (
  '12121212-1212-4121-8121-121212121212',
  NOW(),
  'coordenador',
  NULL,
  'Mock Coordenador',
  'Dr.',
  0,
  23,
  0,
  NULL,
  'web',
  NULL
), (
  '13131313-1313-4131-8131-131313131313',
  NOW(),
  'escalista',
  NULL,
  'Mock Escalista',
  'Dr.',
  0,
  23,
  0,
  NULL,
  'web',
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  displayname = EXCLUDED.displayname,
  platform = EXCLUDED.platform;

INSERT INTO public.escalistas (
  id,
  nome,
  telefone,
  email,
  grupo_id,
  created_at,
  update_at,
  update_by,
  escalista_status
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Demo Admin',
  '5511990000000',
  'demo@houston.local',
  '22222222-2222-4222-8222-222222222222',
  NOW(),
  NOW(),
  '11111111-1111-4111-8111-111111111111',
  'ativo'
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  grupo_id = EXCLUDED.grupo_id,
  update_at = NOW(),
  update_by = EXCLUDED.update_by,
  escalista_status = EXCLUDED.escalista_status;

INSERT INTO public.escalistas (
  id,
  nome,
  telefone,
  email,
  grupo_id,
  created_at,
  update_at,
  update_by,
  escalista_status
)
VALUES (
  '12121212-1212-4121-8121-121212121212',
  'Mock Coordenador',
  '5511991111111',
  'mock.coordenador@houston.local',
  '22222222-2222-4222-8222-222222222222',
  NOW(),
  NOW(),
  '11111111-1111-4111-8111-111111111111',
  'ativo'
), (
  '13131313-1313-4131-8131-131313131313',
  'Mock Escalista',
  '5511992222222',
  'mock.escalista@houston.local',
  '22222222-2222-4222-8222-222222222222',
  NOW(),
  NOW(),
  '11111111-1111-4111-8111-111111111111',
  'ativo'
)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  grupo_id = EXCLUDED.grupo_id,
  update_at = NOW(),
  update_by = EXCLUDED.update_by,
  escalista_status = EXCLUDED.escalista_status;

DELETE FROM houston.user_roles
WHERE user_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND role <> 'gestor';

INSERT INTO houston.user_roles (user_id, role, grupo_ids, hospital_ids, setor_ids)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'gestor',
  ARRAY['22222222-2222-4222-8222-222222222222']::uuid[],
  ARRAY['33333333-3333-4333-8333-333333333333']::uuid[],
  ARRAY['55555555-5555-4555-8555-555555555555']::uuid[]
)
ON CONFLICT (user_id, role) DO UPDATE
SET
  grupo_ids = EXCLUDED.grupo_ids,
  hospital_ids = EXCLUDED.hospital_ids,
  setor_ids = EXCLUDED.setor_ids;

DELETE FROM houston.user_roles
WHERE user_id = '12121212-1212-4121-8121-121212121212'::uuid
  AND role <> 'coordenador';

INSERT INTO houston.user_roles (user_id, role, grupo_ids, hospital_ids, setor_ids)
VALUES (
  '12121212-1212-4121-8121-121212121212',
  'coordenador',
  ARRAY['22222222-2222-4222-8222-222222222222']::uuid[],
  ARRAY['33333333-3333-4333-8333-333333333333']::uuid[],
  ARRAY['55555555-5555-4555-8555-555555555555']::uuid[]
)
ON CONFLICT (user_id, role) DO UPDATE
SET
  grupo_ids = EXCLUDED.grupo_ids,
  hospital_ids = EXCLUDED.hospital_ids,
  setor_ids = EXCLUDED.setor_ids;

DELETE FROM houston.user_roles
WHERE user_id = '13131313-1313-4131-8131-131313131313'::uuid
  AND role <> 'escalista';

INSERT INTO houston.user_roles (user_id, role, grupo_ids, hospital_ids, setor_ids)
VALUES (
  '13131313-1313-4131-8131-131313131313',
  'escalista',
  ARRAY['22222222-2222-4222-8222-222222222222']::uuid[],
  ARRAY['33333333-3333-4333-8333-333333333333']::uuid[],
  ARRAY['55555555-5555-4555-8555-555555555555']::uuid[]
)
ON CONFLICT (user_id, role) DO UPDATE
SET
  grupo_ids = EXCLUDED.grupo_ids,
  hospital_ids = EXCLUDED.hospital_ids,
  setor_ids = EXCLUDED.setor_ids;

-- -----------------------------------------------------------------------------
-- Médicos fictícios (pré-cadastro) para visualização em selects/listas
-- -----------------------------------------------------------------------------
INSERT INTO public.medicos_precadastro (
  id,
  primeiro_nome,
  sobrenome,
  crm,
  cpf,
  email,
  telefone,
  especialidade_id,
  created_by,
  created_at,
  estado
)
VALUES (
  'f1111111-1111-4111-8111-111111111111',
  'Ana',
  'Carvalho',
  'CRM-DEMO-1001',
  '11111111101',
  'ana.carvalho.demo@houston.local',
  '11981110001',
  '44444444-4444-4444-8444-444444444444',
  '12121212-1212-4121-8121-121212121212',
  NOW(),
  'SP'
), (
  'f2222222-2222-4222-8222-222222222222',
  'Bruno',
  'Mendes',
  'CRM-DEMO-1002',
  '11111111102',
  'bruno.mendes.demo@houston.local',
  '11981110002',
  '44444444-4444-4444-8444-444444444444',
  '12121212-1212-4121-8121-121212121212',
  NOW(),
  'SP'
), (
  'f3333333-3333-4333-8333-333333333333',
  'Camila',
  'Rocha',
  'CRM-DEMO-1003',
  '11111111103',
  'camila.rocha.demo@houston.local',
  '11981110003',
  '44444444-4444-4444-8444-444444444444',
  '12121212-1212-4121-8121-121212121212',
  NOW(),
  'SP'
), (
  'f4444444-4444-4444-8444-444444444444',
  'Diego',
  'Almeida',
  'CRM-DEMO-1004',
  '11111111104',
  'diego.almeida.demo@houston.local',
  '11981110004',
  '44444444-4444-4444-8444-444444444444',
  '12121212-1212-4121-8121-121212121212',
  NOW(),
  'SP'
)
ON CONFLICT (id) DO UPDATE
SET
  primeiro_nome = EXCLUDED.primeiro_nome,
  sobrenome = EXCLUDED.sobrenome,
  crm = EXCLUDED.crm,
  cpf = EXCLUDED.cpf,
  email = EXCLUDED.email,
  telefone = EXCLUDED.telefone,
  especialidade_id = EXCLUDED.especialidade_id,
  created_by = EXCLUDED.created_by,
  estado = EXCLUDED.estado;

-- -----------------------------------------------------------------------------
-- Grade demo + plantões gerados por grade
-- -----------------------------------------------------------------------------
INSERT INTO public.grades (
  id,
  grupo_id,
  nome,
  especialidade_id,
  setor_id,
  hospital_id,
  cor,
  horario_inicial,
  configuracao,
  ordem,
  created_at,
  updated_at,
  created_by,
  updated_by
)
VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Grade Clínica Geral - Semana Demo',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  '#0EA5E9',
  7,
  '{
    "lineNames": {"0":"Semana Principal"},
    "selectedDays": {"0":[true,false,true,false,true,false,false]},
    "slotsByDay": {
      "0": {
        "0": [
          {
            "id":"slot-demo-seg-1",
            "startHour":7,
            "endHour":19,
            "vagasCount":1,
            "lineIndex":0,
            "rowIndex":0,
            "assignedVagas":[
              {"medicoId":"f1111111-1111-4111-8111-111111111111","medicoNome":"Ana Carvalho"}
            ]
          }
        ],
        "1": [],
        "2": [
          {
            "id":"slot-demo-qua-1",
            "startHour":7,
            "endHour":19,
            "vagasCount":1,
            "lineIndex":0,
            "rowIndex":0,
            "assignedVagas":[
              {"medicoId":"f2222222-2222-4222-8222-222222222222","medicoNome":"Bruno Mendes"}
            ]
          }
        ],
        "3": [],
        "4": [
          {
            "id":"slot-demo-sex-1",
            "startHour":7,
            "endHour":19,
            "vagasCount":1,
            "lineIndex":0,
            "rowIndex":0,
            "assignedVagas":[
              {"medicoId":"f3333333-3333-4333-8333-333333333333","medicoNome":"Camila Rocha"}
            ]
          }
        ],
        "5": [],
        "6": []
      }
    },
    "weekStartHours": {"0":7},
    "dayRowCounts": {"0":{"0":1,"2":1,"4":1}},
    "tipoCalculo":"valor_hora",
    "valorPorHora":160,
    "diasPagamento":"30dias",
    "formaRecebimento":"88888888-8888-4888-8888-888888888888",
    "tipoVaga":"77777777-7777-4777-8777-777777777777",
    "observacoesPadrao":"Plantões gerados automaticamente a partir da grade demo."
  ,
    "slots": [
      {"id":"slot-demo-seg-1","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0},
      {"id":"slot-demo-qua-1","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0},
      {"id":"slot-demo-sex-1","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0}
    ]
  }'::jsonb,
  0,
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  '12121212-1212-4121-8121-121212121212'
)
ON CONFLICT (id) DO UPDATE
SET
  grupo_id = EXCLUDED.grupo_id,
  nome = EXCLUDED.nome,
  especialidade_id = EXCLUDED.especialidade_id,
  setor_id = EXCLUDED.setor_id,
  hospital_id = EXCLUDED.hospital_id,
  cor = EXCLUDED.cor,
  horario_inicial = EXCLUDED.horario_inicial,
  configuracao = EXCLUDED.configuracao,
  ordem = EXCLUDED.ordem,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by;

INSERT INTO public.vagas_recorrencias (
  id,
  created_at,
  updated_at,
  created_by,
  data_inicio,
  data_fim,
  dias_semana,
  observacoes
)
VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  CURRENT_DATE,
  CURRENT_DATE + 30,
  ARRAY[1,3,5],
  'Recorrência demo vinculada à grade de Clínica Geral.'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  created_by = EXCLUDED.created_by,
  data_inicio = EXCLUDED.data_inicio,
  data_fim = EXCLUDED.data_fim,
  dias_semana = EXCLUDED.dias_semana,
  observacoes = EXCLUDED.observacoes;

-- -----------------------------------------------------------------------------
-- Vagas demo para popular dashboards/listagens
-- -----------------------------------------------------------------------------
INSERT INTO public.vagas (
  id,
  created_at,
  updated_at,
  updated_by,
  data,
  hospital_id,
  especialidade_id,
  setor_id,
  periodo_id,
  escalista_id,
  tipos_vaga_id,
  data_pagamento,
  hora_inicio,
  hora_fim,
  valor,
  observacoes,
  status,
  total_candidaturas,
  grupo_id,
  forma_recebimento_id,
  recorrencia_id,
  grade_id
)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  (CURRENT_DATE + 2),
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '12121212-1212-4121-8121-121212121212',
  '77777777-7777-4777-8777-777777777777',
  (CURRENT_DATE + 30),
  '07:00:00',
  '19:00:00',
  1800,
  'Plantão de demonstração para portfólio.',
  'aberta',
  0,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  data = EXCLUDED.data,
  hospital_id = EXCLUDED.hospital_id,
  especialidade_id = EXCLUDED.especialidade_id,
  setor_id = EXCLUDED.setor_id,
  periodo_id = EXCLUDED.periodo_id,
  escalista_id = EXCLUDED.escalista_id,
  tipos_vaga_id = EXCLUDED.tipos_vaga_id,
  data_pagamento = EXCLUDED.data_pagamento,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fim = EXCLUDED.hora_fim,
  valor = EXCLUDED.valor,
  observacoes = EXCLUDED.observacoes,
  status = EXCLUDED.status,
  total_candidaturas = EXCLUDED.total_candidaturas,
  grupo_id = EXCLUDED.grupo_id,
  forma_recebimento_id = EXCLUDED.forma_recebimento_id,
  recorrencia_id = EXCLUDED.recorrencia_id,
  grade_id = EXCLUDED.grade_id;

INSERT INTO public.vagas (
  id,
  created_at,
  updated_at,
  updated_by,
  data,
  hospital_id,
  especialidade_id,
  setor_id,
  periodo_id,
  escalista_id,
  tipos_vaga_id,
  data_pagamento,
  hora_inicio,
  hora_fim,
  valor,
  observacoes,
  status,
  total_candidaturas,
  grupo_id,
  forma_recebimento_id,
  recorrencia_id,
  grade_id
)
VALUES (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  NOW(),
  NOW(),
  '13131313-1313-4131-8131-131313131313',
  (CURRENT_DATE + 3),
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '13131313-1313-4131-8131-131313131313',
  '77777777-7777-4777-8777-777777777777',
  (CURRENT_DATE + 33),
  '07:00:00',
  '19:00:00',
  1900,
  'Plantão demo criado a partir da grade (linha 1).',
  'aberta',
  0,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  data = EXCLUDED.data,
  hospital_id = EXCLUDED.hospital_id,
  especialidade_id = EXCLUDED.especialidade_id,
  setor_id = EXCLUDED.setor_id,
  periodo_id = EXCLUDED.periodo_id,
  escalista_id = EXCLUDED.escalista_id,
  tipos_vaga_id = EXCLUDED.tipos_vaga_id,
  data_pagamento = EXCLUDED.data_pagamento,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fim = EXCLUDED.hora_fim,
  valor = EXCLUDED.valor,
  observacoes = EXCLUDED.observacoes,
  status = EXCLUDED.status,
  total_candidaturas = EXCLUDED.total_candidaturas,
  grupo_id = EXCLUDED.grupo_id,
  forma_recebimento_id = EXCLUDED.forma_recebimento_id,
  recorrencia_id = EXCLUDED.recorrencia_id,
  grade_id = EXCLUDED.grade_id;

INSERT INTO public.vagas (
  id,
  created_at,
  updated_at,
  updated_by,
  data,
  hospital_id,
  especialidade_id,
  setor_id,
  periodo_id,
  escalista_id,
  tipos_vaga_id,
  data_pagamento,
  hora_inicio,
  hora_fim,
  valor,
  observacoes,
  status,
  total_candidaturas,
  grupo_id,
  forma_recebimento_id,
  recorrencia_id,
  grade_id
)
VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  NOW(),
  NOW(),
  '13131313-1313-4131-8131-131313131313',
  (CURRENT_DATE + 5),
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '13131313-1313-4131-8131-131313131313',
  '77777777-7777-4777-8777-777777777777',
  (CURRENT_DATE + 35),
  '07:00:00',
  '19:00:00',
  1900,
  'Plantão demo criado a partir da grade (linha 2).',
  'aberta',
  0,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  data = EXCLUDED.data,
  hospital_id = EXCLUDED.hospital_id,
  especialidade_id = EXCLUDED.especialidade_id,
  setor_id = EXCLUDED.setor_id,
  periodo_id = EXCLUDED.periodo_id,
  escalista_id = EXCLUDED.escalista_id,
  tipos_vaga_id = EXCLUDED.tipos_vaga_id,
  data_pagamento = EXCLUDED.data_pagamento,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fim = EXCLUDED.hora_fim,
  valor = EXCLUDED.valor,
  observacoes = EXCLUDED.observacoes,
  status = EXCLUDED.status,
  total_candidaturas = EXCLUDED.total_candidaturas,
  grupo_id = EXCLUDED.grupo_id,
  forma_recebimento_id = EXCLUDED.forma_recebimento_id,
  recorrencia_id = EXCLUDED.recorrencia_id,
  grade_id = EXCLUDED.grade_id;

COMMIT;
