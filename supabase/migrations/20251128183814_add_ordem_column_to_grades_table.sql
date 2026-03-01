-- Adicionar campo ordem à tabela grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
-- Criar índice composto para melhor performance em queries ordenadas
CREATE INDEX IF NOT EXISTS idx_grades_ordem 
ON grades(grupo_id, hospital_id, ordem);
-- Inicializar valores de ordem baseado na data de criação
-- (grades mais antigas primeiro)
WITH ranked_grades AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY grupo_id, hospital_id 
      ORDER BY created_at ASC
    ) - 1 AS initial_ordem
  FROM grades
)
UPDATE grades
SET ordem = ranked_grades.initial_ordem
FROM ranked_grades
WHERE grades.id = ranked_grades.id;
-- Comentário na coluna
COMMENT ON COLUMN grades.ordem IS 'Ordem de exibição da grade dentro do hospital ( 0-based index)';