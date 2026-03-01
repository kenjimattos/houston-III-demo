-- ============================================================================
-- MIGRATION: Remoção de Índices Duplicados e Não Utilizados
-- ============================================================================
-- Data: 2025-12-04
-- Ambiente: Staging → Production
--
-- IMPORTANTE: Esta migration foi ajustada baseada em dados REAIS de produção
-- Apenas índices com 0 scans OU comprovadamente duplicados são removidos
-- ============================================================================

-- ============================================================================
-- FASE 1: Índices Duplicados (SEGUROS para remover)
-- ============================================================================
--
-- Benefícios:
-- - Recupera ~200 kB de espaço
-- - Reduz overhead em INSERT/UPDATE/DELETE
-- - Melhora performance do planejador
--
-- ============================================================================

-- ============================================================================
-- Tabela: medicos (2 índices duplicados - 0 scans em produção)
-- ============================================================================

-- idx_medico_cpf é redundante - medicos_medico_cpf_key (UNIQUE) já existe
-- Produção: 0 scans
DROP INDEX IF EXISTS public.idx_medico_cpf;

-- idx_medico_crm é redundante - medicos_medico_crm_key (UNIQUE) já existe
-- Produção: 0 scans
DROP INDEX IF EXISTS public.idx_medico_crm;

-- ============================================================================
-- Tabela: vagas (1 índice duplicado - 1 scan apenas em produção)
-- ============================================================================

-- idx_vaga_hospital é redundante - idx_vagas_hospital (372k+ scans) é o correto
-- Produção: 1 scan apenas (praticamente não usado)
DROP INDEX IF EXISTS public.idx_vaga_hospital;

-- ============================================================================
-- Tabela: beneficios (UNIQUE constraint redundante com PK)
-- ============================================================================

-- beneficio_tipo_beneficio_id_key é redundante com beneficio_tipo_pkey
-- Produção: 0 scans
-- Não pode dropar índice diretamente - é associado a uma UNIQUE constraint
ALTER TABLE public.beneficios DROP CONSTRAINT IF EXISTS beneficio_tipo_beneficio_id_key;

-- ============================================================================
-- Tabela: checkin_checkout (UNIQUE constraint redundante com PK)
-- ============================================================================

-- checkin_checkout_index_key é redundante com checkin_checkout_pkey
-- Produção: 0 scans
ALTER TABLE public.checkin_checkout DROP CONSTRAINT IF EXISTS checkin_checkout_index_key;

-- ============================================================================
-- Tabela: checkin_checkout_nofitications (UNIQUE constraint redundante com PK)
-- ============================================================================

-- checkin_checkout_nofitications_id_key é redundante com _pkey
-- Produção: 0 scans
ALTER TABLE public.checkin_checkout_nofitications DROP CONSTRAINT IF EXISTS checkin_checkout_nofitications_id_key;

-- ============================================================================
-- Tabela: clean_hospital (UNIQUE constraint redundante com PK)
-- ============================================================================

-- clean_hospital_id_key é redundante com clean_hospital_pkey
-- Produção: 0 scans
ALTER TABLE public.clean_hospital DROP CONSTRAINT IF EXISTS clean_hospital_id_key;

-- ============================================================================
-- Tabela: equipes_medicos (UNIQUE constraint redundante com PK)
-- ============================================================================

-- equipes_medicos_id_key é redundante com equipes_medicos_pkey
-- Produção: 0 scans
ALTER TABLE public.equipes_medicos DROP CONSTRAINT IF EXISTS equipes_medicos_id_key;

-- ============================================================================
-- Tabela: notifications (UNIQUE constraint redundante com PK)
-- ============================================================================

-- notifications_id_key é redundante com notifications_pkey
-- Produção: 0 scans
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_id_key;

-- ============================================================================
-- FASE 2: Índices Não Utilizados (0 scans CONFIRMADOS em produção)
-- ============================================================================
--
-- Benefícios:
-- - Recupera ~900 kB de espaço adicional
-- - Reduz overhead em INSERT/UPDATE/DELETE
-- - Simplifica decisões do planejador
--
-- NOTA: Índices com scans > 0 foram MANTIDOS (mesmo que baixos)
-- ============================================================================

-- ============================================================================
-- Índice GIN Grande Nunca Usado (Alta Prioridade)
-- ============================================================================

-- Índice GIN grande (896 kB em produção) e NUNCA usado
-- Produção: 0 scans
DROP INDEX IF EXISTS public.idx_grades_configuracao;

-- ============================================================================
-- Índices em Médicos (0 scans em produção)
-- ============================================================================

-- Busca por localidade (cidade, estado) não é usada
-- Produção: 0 scans
DROP INDEX IF EXISTS public.idx_medico_localidade;

-- ============================================================================
-- Índices em Vagas Benefício (0 scans em produção)
-- ============================================================================

-- UNIQUE index redundante com PK
-- Produção: 0 scans
DROP INDEX IF EXISTS public.vagas_beneficio_Index_key;

-- ============================================================================
-- ÍNDICES MANTIDOS (Usado em produção - NÃO remover)
-- ============================================================================
--
-- Os seguintes índices foram identificados em staging como "não utilizados"
-- mas em PRODUÇÃO estão sendo ATIVAMENTE usados:
--
-- ✅ idx_grupo_nome             - 54.577 scans   (MANTIDO)
-- ✅ idx_beneficio_nome          - 60.288 scans   (MANTIDO)
-- ✅ idx_hospital_nome           - 59.983 scans   (MANTIDO)
-- ✅ idx_setor_nome              - 68.380 scans   (MANTIDO)
-- ✅ idx_escalista_nome          - 484 scans      (MANTIDO)
-- ✅ idx_escalista_grupo         - 93 scans       (MANTIDO)
-- ✅ idx_medicos_favoritos_escalista - 413 scans  (MANTIDO)
-- ✅ idx_medicos_precadastro_*   - 133-493 scans  (MANTIDO)
-- ✅ idx_medicos_status          - 3 scans        (MANTIDO)
-- ✅ idx_grades_especialidade_id - 4 scans        (MANTIDO)
-- ✅ vagas_Index_key             - 175 scans      (MANTIDO)
--
-- LIÇÃO APRENDIDA: Staging != Produção
-- Sempre validar com dados reais antes de remover índices!
-- ============================================================================

-- ============================================================================
-- ÍNDICES NÃO ENCONTRADOS EM PRODUÇÃO (já foram removidos anteriormente)
-- ============================================================================
--
-- Os seguintes índices não existem em produção:
-- - pagamentos_candidatura_id_key
-- - idx_user_roles_group_ids
-- - idx_user_roles_hospital_ids
-- - idx_user_roles_setor_ids
-- - idx_checkin_checkout_status
-- - idx_pagamentos_status
-- - idx_pagamentos_candidatura
--
-- Não é necessário incluí-los nesta migration
-- ============================================================================

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
--
-- Resumo:
-- - 9 índices/constraints removidos (todos com 0-1 scans)
-- - ~1 MB de espaço recuperado
-- - 15+ índices MANTIDOS por estarem em uso ativo em produção
--
-- Próximo passo: Monitorar performance após aplicação
-- ============================================================================
