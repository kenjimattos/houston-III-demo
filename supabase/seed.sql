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
-- demo_group_id       = 22222222-2222-4222-8222-222222222222
-- demo_hospital_id    = 33333333-3333-4333-8333-333333333333
-- demo_especialidade  = 44444444-4444-4444-8444-444444444444
-- demo_setor_id       = 55555555-5555-4555-8555-555555555555
-- demo_periodo_id     = 66666666-6666-4666-8666-666666666666
-- demo_tipo_vaga_id   = 77777777-7777-4777-8777-777777777777
-- demo_forma_rec_id   = 88888888-8888-4888-8888-888888888888
-- demo_vaga_id        = 99999999-9999-4999-8999-999999999999
-- demo_identity_id    = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa

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
-- Perfil e vínculo de escalista do usuário demo
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
  'astronauta',
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

INSERT INTO houston.user_roles (user_id, role, grupo_ids, hospital_ids, setor_ids)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'administrador',
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
-- Vaga demo para popular dashboards/listagens
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
  forma_recebimento_id
)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  NOW(),
  NOW(),
  '11111111-1111-4111-8111-111111111111',
  (CURRENT_DATE + 2),
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  (CURRENT_DATE + 30),
  '07:00:00',
  '19:00:00',
  1800,
  'Plantão de demonstração para portfólio.',
  'aberta',
  0,
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888'
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
  forma_recebimento_id = EXCLUDED.forma_recebimento_id;

COMMIT;
