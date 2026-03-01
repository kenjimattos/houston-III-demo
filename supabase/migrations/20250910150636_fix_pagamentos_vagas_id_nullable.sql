-- Correção para permitir que vagas_id na tabela pagamentos aceite NULL
-- Isso é necessário para que ON DELETE SET NULL funcione corretamente
-- quando uma vaga for excluída

-- Remove a constraint NOT NULL da coluna vagas_id na tabela pagamentos
ALTER TABLE "public"."pagamentos" ALTER COLUMN "vagas_id" DROP NOT NULL;