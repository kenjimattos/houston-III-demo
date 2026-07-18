-- Remove gen_random_uuid() defaults from foreign key columns
-- These defaults are dangerous: if omitted on insert, they create references to non-existent records

ALTER TABLE public.notifications
  ALTER COLUMN recipient_id DROP DEFAULT;

-- escalistas.auth_id foi removida/renomeada para id no refactor 20251117000005;
-- só existe em bancos criados antes dele
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escalistas' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE public.escalistas ALTER COLUMN auth_id DROP DEFAULT;
  END IF;
END $$;

ALTER TABLE public.vagas
  ALTER COLUMN hospital_id DROP DEFAULT,
  ALTER COLUMN periodo_id DROP DEFAULT,
  ALTER COLUMN tipos_vaga_id DROP DEFAULT,
  ALTER COLUMN setor_id DROP DEFAULT,
  ALTER COLUMN especialidade_id DROP DEFAULT;

ALTER TABLE public.vagas_requisitos
  ALTER COLUMN vaga_id DROP DEFAULT;
