-- Migration: add_generalista_and_reindex_especialidades
-- Description: Adiciona especialidade Generalista e reordena especialidade_index em ordem alfabética
-- Date: 2025-10-10

-- Inserir a especialidade Generalista
INSERT INTO especialidades (especialidade_id, especialidade_nome, especialidade_index)
VALUES (
  gen_random_uuid(),
  'Generalista',
  99  -- Valor temporário, será atualizado abaixo
);

-- Atualizar os índices de todas as especialidades em ordem alfabética
-- Usando uma subconsulta com ROW_NUMBER para gerar os índices ordenados
WITH especialidades_ordenadas AS (
  SELECT 
    especialidade_id,
    ROW_NUMBER() OVER (ORDER BY especialidade_nome) - 1 AS novo_index
  FROM especialidades
)
UPDATE especialidades
SET especialidade_index = eo.novo_index
FROM especialidades_ordenadas eo
WHERE especialidades.especialidade_id = eo.especialidade_id;