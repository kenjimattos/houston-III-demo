-- Altera a FK updated_by da tabela grades para SET NULL on delete
-- Isso permite que usuários sejam deletados sem bloquear por causa dessa referência

ALTER TABLE public.grades
DROP CONSTRAINT grades_updated_by_fkey;

ALTER TABLE public.grades
ADD CONSTRAINT grades_updated_by_fkey
FOREIGN KEY (updated_by) REFERENCES auth.users(id)
ON DELETE SET NULL;
