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
-- demo_grade_janfeb   = abababab-abab-4aba-8aba-abababababab
-- demo_recor_janfeb   = acacacac-acac-4aca-8aca-acacacacacac
-- demo_grade_marco    = adadadad-adad-4ada-8ada-adadadadadad
-- demo_recor_marco    = aeaeaeae-aeae-4aea-8aea-aeaeaeaeaeae
-- demo_medico_shadow  = 9cd29712-91b5-492f-86ff-41e38c7b03d5

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
  '9cd29712-91b5-492f-86ff-41e38c7b03d5',
  'authenticated',
  'authenticated',
  'medico.shadow@houston.local',
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
  '{"email":"medico.shadow@houston.local","display_name":"Medico Precadastro","platform_origin":"portfolio-mock","data":{"display_name":"Medico Precadastro","platform_origin":"portfolio-mock","phone":"00000000000"}}'::jsonb,
  false,
  NOW(),
  NOW(),
  '5500000000000',
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
  '1001',
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
  '1002',
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
  '1003',
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
  '1004',
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

-- Médico técnico "shadow" para suportar candidaturas de pré-cadastro
-- (exigência do modelo: medico_id não nulo + medico_precadastro_id)
INSERT INTO public.medicos (
  id,
  rqe,
  genero,
  cpf,
  rg,
  crm,
  nome_faculdade,
  tipo_faculdade,
  primeiro_nome,
  sobrenome,
  email,
  telefone,
  data_nascimento,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  pais,
  cep,
  created_at,
  update_at,
  update_by,
  delete_at,
  status,
  total_plantoes,
  especialidade_id,
  ano_termino_especializacao,
  ano_formatura,
  tracking_privacy,
  especialidade_nome
)
VALUES (
  '9cd29712-91b5-492f-86ff-41e38c7b03d5',
  'N/A',
  'N/A',
  '00000000000',
  '000000000',
  'CRM-SHADOW-PRECAD',
  'N/A',
  'N/A',
  'Medico',
  'Precadastro',
  'medico.shadow@houston.local',
  '5500000000000',
  DATE '1990-01-01',
  'N/A',
  '0',
  'N/A',
  'São Paulo',
  'SP',
  'Brasil',
  '00000-000',
  NOW(),
  NOW(),
  'seed',
  NULL,
  'ativo',
  0,
  '44444444-4444-4444-8444-444444444444',
  NULL,
  NULL,
  false,
  'Clínica Geral (Demo)'
)
ON CONFLICT (id) DO UPDATE
SET
  crm = EXCLUDED.crm,
  primeiro_nome = EXCLUDED.primeiro_nome,
  sobrenome = EXCLUDED.sobrenome,
  email = EXCLUDED.email,
  telefone = EXCLUDED.telefone,
  status = EXCLUDED.status,
  especialidade_id = EXCLUDED.especialidade_id,
  update_at = NOW(),
  update_by = EXCLUDED.update_by;

-- Vínculo dos médicos fictícios no corpo clínico do grupo demo
-- Estrutura esperada: medico_id = médico shadow + medico_precadastro_id preenchido
INSERT INTO public.equipes_medicos (
  equipe_id,
  medico_id,
  grupo_id,
  updated_by,
  updated_at,
  medico_precadastro_id
)
SELECT
  NULL,
  '9cd29712-91b5-492f-86ff-41e38c7b03d5',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  NOW(),
  v.medico_precadastro_id
FROM (
  VALUES
    ('f1111111-1111-4111-8111-111111111111'::uuid),
    ('f2222222-2222-4222-8222-222222222222'::uuid),
    ('f3333333-3333-4333-8333-333333333333'::uuid),
    ('f4444444-4444-4444-8444-444444444444'::uuid)
) AS v(medico_precadastro_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.equipes_medicos em
  WHERE em.grupo_id = '22222222-2222-4222-8222-222222222222'::uuid
    AND em.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid
    AND em.medico_precadastro_id = v.medico_precadastro_id
    AND em.equipe_id IS NULL
);

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
            "assignedVagas":[]
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
            "assignedVagas":[]
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
            "assignedVagas":[]
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

-- -----------------------------------------------------------------------------
-- Grade Janeiro/Fevereiro 2026 + plantões preenchidos (sem conflito por médico)
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
  'abababab-abab-4aba-8aba-abababababab',
  '22222222-2222-4222-8222-222222222222',
  'Grade Jan/Fev 2026 - Clínica Geral',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  '#16A34A',
  7,
  '{
    "lineNames":{"0":"Jan-Fev 2026"},
    "selectedDays":{"0":[true,false,true,false,true,false,false]},
    "slotsByDay":{
      "0":{
        "0":[{"id":"janfeb-seg","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[{"medicoId":"f1111111-1111-4111-8111-111111111111","medicoNome":"Ana Carvalho"}]}],
        "1":[],
        "2":[{"id":"janfeb-qua","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[{"medicoId":"f2222222-2222-4222-8222-222222222222","medicoNome":"Bruno Mendes"}]}],
        "3":[],
        "4":[{"id":"janfeb-sex","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[{"medicoId":"f3333333-3333-4333-8333-333333333333","medicoNome":"Camila Rocha"}]}],
        "5":[],
        "6":[]
      }
    },
    "weekStartHours":{"0":7},
    "dayRowCounts":{"0":{"0":1,"2":1,"4":1}},
    "tipoCalculo":"valor_hora",
    "valorPorHora":170,
    "diasPagamento":"30dias",
    "formaRecebimento":"88888888-8888-4888-8888-888888888888",
    "tipoVaga":"77777777-7777-4777-8777-777777777777",
    "observacoesPadrao":"Plantões de janeiro e fevereiro de 2026."
  }'::jsonb,
  1,
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  '12121212-1212-4121-8121-121212121212'
)
ON CONFLICT (id) DO UPDATE
SET
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
  'acacacac-acac-4aca-8aca-acacacacacac',
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  DATE '2026-01-01',
  DATE '2026-02-28',
  ARRAY[1,3,5],
  'Recorrência da grade Jan/Fev 2026.'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  data_inicio = EXCLUDED.data_inicio,
  data_fim = EXCLUDED.data_fim,
  dias_semana = EXCLUDED.dias_semana,
  observacoes = EXCLUDED.observacoes;

WITH jan_fev_datas AS (
  SELECT
    d::date AS data_plantao,
    ROW_NUMBER() OVER (ORDER BY d::date) AS rn
  FROM generate_series(DATE '2026-01-01', DATE '2026-02-28', INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) IN (1, 3, 5)
),
escala AS (
  SELECT
    data_plantao,
    CASE ((rn - 1) % 4)
      WHEN 0 THEN 'f1111111-1111-4111-8111-111111111111'::uuid
      WHEN 1 THEN 'f2222222-2222-4222-8222-222222222222'::uuid
      WHEN 2 THEN 'f3333333-3333-4333-8333-333333333333'::uuid
      ELSE 'f4444444-4444-4444-8444-444444444444'::uuid
    END AS medico_precadastro_id
  FROM jan_fev_datas
),
vagas_base AS (
  SELECT
    data_plantao,
    medico_precadastro_id,
    (
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 21, 12)
    )::uuid AS vaga_id
  FROM escala
)
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
SELECT
  vaga_id,
  NOW(),
  NOW(),
  '13131313-1313-4131-8131-131313131313',
  data_plantao,
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '13131313-1313-4131-8131-131313131313',
  '77777777-7777-4777-8777-777777777777',
  (data_plantao + 30),
  '07:00:00',
  '19:00:00',
  1700,
  'Plantão preenchido da grade Jan/Fev 2026.',
  'fechada',
  1,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'acacacac-acac-4aca-8aca-acacacacacac',
  'abababab-abab-4aba-8aba-abababababab'
FROM vagas_base
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  data = EXCLUDED.data,
  data_pagamento = EXCLUDED.data_pagamento,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fim = EXCLUDED.hora_fim,
  valor = EXCLUDED.valor,
  observacoes = EXCLUDED.observacoes,
  status = EXCLUDED.status,
  total_candidaturas = EXCLUDED.total_candidaturas,
  recorrencia_id = EXCLUDED.recorrencia_id,
  grade_id = EXCLUDED.grade_id;

WITH jan_fev_datas AS (
  SELECT
    d::date AS data_plantao,
    ROW_NUMBER() OVER (ORDER BY d::date) AS rn
  FROM generate_series(DATE '2026-01-01', DATE '2026-02-28', INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) IN (1, 3, 5)
),
escala AS (
  SELECT
    data_plantao,
    CASE ((rn - 1) % 4)
      WHEN 0 THEN 'f1111111-1111-4111-8111-111111111111'::uuid
      WHEN 1 THEN 'f2222222-2222-4222-8222-222222222222'::uuid
      WHEN 2 THEN 'f3333333-3333-4333-8333-333333333333'::uuid
      ELSE 'f4444444-4444-4444-8444-444444444444'::uuid
    END AS medico_precadastro_id
  FROM jan_fev_datas
),
candidaturas_base AS (
  SELECT
    data_plantao,
    medico_precadastro_id,
    (
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-janfeb-vaga-' || data_plantao::text), 21, 12)
    )::uuid AS vaga_id,
    (
      substr(md5('demo-janfeb-candidatura-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-janfeb-candidatura-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-janfeb-candidatura-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-janfeb-candidatura-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-janfeb-candidatura-' || data_plantao::text), 21, 12)
    )::uuid AS candidatura_id
  FROM escala
)
INSERT INTO public.candidaturas (
  id,
  created_at,
  data_confirmacao,
  medico_id,
  vaga_id,
  status,
  updated_at,
  updated_by,
  vaga_valor,
  medico_precadastro_id
)
SELECT
  candidatura_id,
  NOW(),
  data_plantao,
  '9cd29712-91b5-492f-86ff-41e38c7b03d5',
  vaga_id,
  'APROVADO',
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  1700,
  medico_precadastro_id
FROM candidaturas_base
ON CONFLICT (id) DO UPDATE
SET
  data_confirmacao = EXCLUDED.data_confirmacao,
  status = EXCLUDED.status,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  vaga_valor = EXCLUDED.vaga_valor,
  medico_precadastro_id = EXCLUDED.medico_precadastro_id;

-- -----------------------------------------------------------------------------
-- Grade Março 2026 + vagas (parte preenchida com médicos, sem conflito)
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
  'adadadad-adad-4ada-8ada-adadadadadad',
  '22222222-2222-4222-8222-222222222222',
  'Grade Março 2026 - Clínica Geral',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  '#F97316',
  7,
  '{
    "lineNames":{"0":"Março 2026"},
    "selectedDays":{"0":[true,false,true,false,true,false,false]},
    "slotsByDay":{
      "0":{
        "0":[{"id":"marco-seg","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[]}],
        "1":[],
        "2":[{"id":"marco-qua","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[]}],
        "3":[],
        "4":[{"id":"marco-sex","startHour":7,"endHour":19,"vagasCount":1,"lineIndex":0,"rowIndex":0,"assignedVagas":[]}],
        "5":[],
        "6":[]
      }
    },
    "weekStartHours":{"0":7},
    "dayRowCounts":{"0":{"0":1,"2":1,"4":1}},
    "tipoCalculo":"valor_hora",
    "valorPorHora":175,
    "diasPagamento":"30dias",
    "formaRecebimento":"88888888-8888-4888-8888-888888888888",
    "tipoVaga":"77777777-7777-4777-8777-777777777777",
    "observacoesPadrao":"Plantões de março de 2026 para demonstração."
  }'::jsonb,
  2,
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  '12121212-1212-4121-8121-121212121212'
)
ON CONFLICT (id) DO UPDATE
SET
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
  'aeaeaeae-aeae-4aea-8aea-aeaeaeaeaeae',
  NOW(),
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  DATE '2026-03-01',
  DATE '2026-03-31',
  ARRAY[1,3,5],
  'Recorrência da grade Março 2026.'
)
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  data_inicio = EXCLUDED.data_inicio,
  data_fim = EXCLUDED.data_fim,
  dias_semana = EXCLUDED.dias_semana,
  observacoes = EXCLUDED.observacoes;

WITH marco_datas AS (
  SELECT
    d::date AS data_plantao,
    ROW_NUMBER() OVER (ORDER BY d::date) AS rn
  FROM generate_series(DATE '2026-03-01', DATE '2026-03-31', INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) IN (1, 3, 5)
),
vagas_marco AS (
  SELECT
    data_plantao,
    rn,
    (
      substr(md5('demo-marco-vaga-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 21, 12)
    )::uuid AS vaga_id
  FROM marco_datas
)
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
SELECT
  vaga_id,
  NOW(),
  NOW(),
  '13131313-1313-4131-8131-131313131313',
  data_plantao,
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '13131313-1313-4131-8131-131313131313',
  '77777777-7777-4777-8777-777777777777',
  (data_plantao + 30),
  '07:00:00',
  '19:00:00',
  1750,
  'Plantão de março de 2026.',
  CASE WHEN (rn % 2) = 1 THEN 'fechada' ELSE 'aberta' END,
  CASE WHEN (rn % 2) = 1 THEN 1 ELSE 0 END,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'aeaeaeae-aeae-4aea-8aea-aeaeaeaeaeae',
  'adadadad-adad-4ada-8ada-adadadadadad'
FROM vagas_marco
ON CONFLICT (id) DO UPDATE
SET
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  data = EXCLUDED.data,
  data_pagamento = EXCLUDED.data_pagamento,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fim = EXCLUDED.hora_fim,
  valor = EXCLUDED.valor,
  observacoes = EXCLUDED.observacoes,
  status = EXCLUDED.status,
  total_candidaturas = EXCLUDED.total_candidaturas,
  recorrencia_id = EXCLUDED.recorrencia_id,
  grade_id = EXCLUDED.grade_id;

WITH marco_datas AS (
  SELECT
    d::date AS data_plantao,
    ROW_NUMBER() OVER (ORDER BY d::date) AS rn
  FROM generate_series(DATE '2026-03-01', DATE '2026-03-31', INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) IN (1, 3, 5)
),
escala AS (
  SELECT
    data_plantao,
    rn,
    CASE (((rn - 1) % 4))
      WHEN 0 THEN 'f1111111-1111-4111-8111-111111111111'::uuid
      WHEN 1 THEN 'f2222222-2222-4222-8222-222222222222'::uuid
      WHEN 2 THEN 'f3333333-3333-4333-8333-333333333333'::uuid
      ELSE 'f4444444-4444-4444-8444-444444444444'::uuid
    END AS medico_precadastro_id
  FROM marco_datas
  WHERE (rn % 2) = 1
),
candidaturas_marco AS (
  SELECT
    data_plantao,
    medico_precadastro_id,
    (
      substr(md5('demo-marco-vaga-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-marco-vaga-' || data_plantao::text), 21, 12)
    )::uuid AS vaga_id,
    (
      substr(md5('demo-marco-candidatura-' || data_plantao::text), 1, 8) || '-' ||
      substr(md5('demo-marco-candidatura-' || data_plantao::text), 9, 4) || '-4' ||
      substr(md5('demo-marco-candidatura-' || data_plantao::text), 14, 3) || '-a' ||
      substr(md5('demo-marco-candidatura-' || data_plantao::text), 18, 3) || '-' ||
      substr(md5('demo-marco-candidatura-' || data_plantao::text), 21, 12)
    )::uuid AS candidatura_id
  FROM escala
)
INSERT INTO public.candidaturas (
  id,
  created_at,
  data_confirmacao,
  medico_id,
  vaga_id,
  status,
  updated_at,
  updated_by,
  vaga_valor,
  medico_precadastro_id
)
SELECT
  candidatura_id,
  NOW(),
  data_plantao,
  '9cd29712-91b5-492f-86ff-41e38c7b03d5',
  vaga_id,
  'APROVADO',
  NOW(),
  '12121212-1212-4121-8121-121212121212',
  1750,
  medico_precadastro_id
FROM candidaturas_marco
ON CONFLICT (id) DO UPDATE
SET
  data_confirmacao = EXCLUDED.data_confirmacao,
  status = EXCLUDED.status,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  vaga_valor = EXCLUDED.vaga_valor,
  medico_precadastro_id = EXCLUDED.medico_precadastro_id;

COMMIT;
