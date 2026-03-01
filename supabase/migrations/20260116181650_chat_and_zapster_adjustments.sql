-- Migration: chat_and_zapster_adjustments
-- Description: Ajustes nas tabelas de chat e adição de grupo_id em chat_conversations
-- ============================================================================

-- ============================================================================
-- 1. AJUSTES NA TABELA chat_participants
-- ============================================================================

-- Permitir NULL em phone_number (para participantes internos sem WhatsApp)
ALTER TABLE houston.chat_participants
ALTER COLUMN phone_number DROP NOT NULL;

-- Remover constraint UNIQUE antiga (conversation_id, phone_number)
ALTER TABLE houston.chat_participants
DROP CONSTRAINT IF EXISTS chat_participants_conversation_id_phone_number_key;

-- Criar índices únicos parciais (permitem NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_participants_conv_phone
ON houston.chat_participants(conversation_id, phone_number)
WHERE phone_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_participants_conv_user
ON houston.chat_participants(conversation_id, user_id)
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 2. AJUSTES NA TABELA chat_messages
-- ============================================================================

-- Permitir NULL em sender_phone (para mensagens internas)
ALTER TABLE houston.chat_messages
ALTER COLUMN sender_phone DROP NOT NULL;

-- ============================================================================
-- 3. ADICIONAR grupo_id NA TABELA chat_conversations
-- ============================================================================

-- Adicionar coluna grupo_id para isolar conversas por grupo
ALTER TABLE houston.chat_conversations
ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE;

-- Índice para busca por grupo
CREATE INDEX IF NOT EXISTS idx_chat_conversations_grupo_id
ON houston.chat_conversations(grupo_id);

-- Comentário
COMMENT ON COLUMN houston.chat_conversations.grupo_id IS 'ID do grupo ao qual esta conversa pertence (para isolamento por instância WhatsApp)';

-- ============================================================================
-- 4. ADICIONAR chat_participants AO REALTIME
-- ============================================================================

-- Para atualizar badge de mensagens não lidas em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE houston.chat_participants;
