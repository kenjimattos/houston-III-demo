-- ============================================
-- FASE 3: Sistema de Chat - Tabelas Principais
-- Schema: houston
-- ============================================

-- 1. Tabela de Conversas
CREATE TABLE IF NOT EXISTS houston.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
  name VARCHAR(255),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  zapster_group_id TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

-- 2. Tabela de Participantes da Conversa
CREATE TABLE IF NOT EXISTS houston.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES houston.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  medico_id UUID REFERENCES public.medicos(id),
  phone_number VARCHAR(20) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  
  UNIQUE(conversation_id, phone_number)
);

-- 3. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS houston.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES houston.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_phone VARCHAR(20) NOT NULL,
  content TEXT,
  message_type VARCHAR(30) DEFAULT 'text' CHECK (message_type IN (
  'text', 'image', 'audio', 'video', 'file', 'document', 'location', 
  'shift_offer', 'shift_response', 'system',  'sticker', 'contact', 'interactive', 'template'
)),
  reply_to_id UUID REFERENCES houston.chat_messages(id),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'sending' CHECK (status IN (
    'sending', 'sent', 'delivered', 'read', 'failed'
  )),
  whatsapp_message_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 4. Tabela de Ofertas de Plantão
CREATE TABLE IF NOT EXISTS houston.chat_shift_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id),
  message_id UUID REFERENCES houston.chat_messages(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_medico_id UUID REFERENCES public.medicos(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'expired', 'cancelled'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 5. Tabela de Contatos (agenda pessoal do usuário)
CREATE TABLE IF NOT EXISTS houston.chat_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  linked_user_id UUID REFERENCES auth.users(id),
  linked_medico_id UUID REFERENCES public.medicos(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(owner_id, phone_number)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON houston.chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_zapster_group ON houston.chat_conversations(zapster_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON houston.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON houston.chat_conversations(type);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON houston.chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON houston.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_medico ON houston.chat_participants(medico_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_phone ON houston.chat_participants(phone_number);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON houston.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON houston.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON houston.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_id ON houston.chat_messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON houston.chat_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_chat_shift_offers_vaga ON houston.chat_shift_offers(vaga_id);
CREATE INDEX IF NOT EXISTS idx_chat_shift_offers_sender ON houston.chat_shift_offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_shift_offers_recipient ON houston.chat_shift_offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_shift_offers_status ON houston.chat_shift_offers(status);

CREATE INDEX IF NOT EXISTS idx_chat_contacts_owner ON houston.chat_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_phone ON houston.chat_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_medico ON houston.chat_contacts(linked_medico_id);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_favorite ON houston.chat_contacts(owner_id, is_favorite) WHERE is_favorite = TRUE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE houston.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE houston.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE houston.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE houston.chat_shift_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE houston.chat_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_conversations
CREATE POLICY "conversations_select" ON houston.chat_conversations
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT conversation_id FROM houston.chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_insert" ON houston.chat_conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON houston.chat_conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Políticas para chat_participants (simplificadas para evitar recursão)
CREATE POLICY "participants_select" ON houston.chat_participants
  FOR SELECT USING (true);

CREATE POLICY "participants_insert" ON houston.chat_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "participants_update" ON houston.chat_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "participants_delete" ON houston.chat_participants
  FOR DELETE USING (user_id = auth.uid());

-- Políticas para chat_messages
CREATE POLICY "messages_select" ON houston.chat_messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM houston.chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "messages_insert" ON houston.chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Políticas para chat_messages
CREATE POLICY "messages_update" ON houston.chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM houston.chat_participants WHERE user_id = auth.uid())
  );

-- Políticas para chat_shift_offers
CREATE POLICY "shift_offers_select" ON houston.chat_shift_offers
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "shift_offers_insert" ON houston.chat_shift_offers
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "shift_offers_update" ON houston.chat_shift_offers
  FOR UPDATE USING (recipient_id = auth.uid());

-- Políticas para chat_contacts
CREATE POLICY "contacts_all" ON houston.chat_contacts
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- PERMISSÕES PARA ROLES DO SUPABASE
-- ============================================

-- Grant usage no schema houston para os roles
GRANT USAGE ON SCHEMA houston TO authenticated;
GRANT USAGE ON SCHEMA houston TO anon;
GRANT USAGE ON SCHEMA houston TO service_role;

-- Grant permissões nas tabelas de chat
GRANT ALL ON houston.chat_conversations TO authenticated;
GRANT ALL ON houston.chat_conversations TO anon;
GRANT ALL ON houston.chat_conversations TO service_role;

GRANT ALL ON houston.chat_participants TO authenticated;
GRANT ALL ON houston.chat_participants TO anon;
GRANT ALL ON houston.chat_participants TO service_role;

GRANT ALL ON houston.chat_messages TO authenticated;
GRANT ALL ON houston.chat_messages TO anon;
GRANT ALL ON houston.chat_messages TO service_role;

GRANT ALL ON houston.chat_shift_offers TO authenticated;
GRANT ALL ON houston.chat_shift_offers TO anon;
GRANT ALL ON houston.chat_shift_offers TO service_role;

GRANT ALL ON houston.chat_contacts TO authenticated;
GRANT ALL ON houston.chat_contacts TO anon;
GRANT ALL ON houston.chat_contacts TO service_role;

-- ============================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================

CREATE OR REPLACE FUNCTION houston.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON houston.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION houston.update_updated_at_column();

CREATE TRIGGER update_chat_contacts_updated_at
  BEFORE UPDATE ON houston.chat_contacts
  FOR EACH ROW EXECUTE FUNCTION houston.update_updated_at_column();

-- Trigger para atualizar last_message na conversa
CREATE OR REPLACE FUNCTION houston.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE houston.chat_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'sticker' THEN '🎁 Sticker'
      WHEN NEW.message_type = 'contact' THEN '📞 Contato'
      WHEN NEW.message_type = 'interactive' THEN '🔄 Interativo'
      WHEN NEW.message_type = 'template' THEN '📄 Modelo'
      WHEN NEW.message_type = 'image' THEN '📷 Imagem'
      WHEN NEW.message_type = 'audio' THEN '🎵 Áudio'
      WHEN NEW.message_type = 'video' THEN '🎬 Vídeo'
      WHEN NEW.message_type = 'file' THEN '📄 Arquivo'
      WHEN NEW.message_type = 'document' THEN '📄 Documento'
      WHEN NEW.message_type = 'shift_offer' THEN '📋 Oferta de Plantão'
      ELSE NEW.content
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON houston.chat_messages
  FOR EACH ROW EXECUTE FUNCTION houston.update_conversation_last_message();

-- Trigger para incrementar unread_count dos outros participantes
CREATE OR REPLACE FUNCTION houston.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar para todos os participantes, exceto o remetente.
  -- Verifica tanto por sender_id (mensagens internas) quanto por sender_phone (mensagens do webhook)
  UPDATE houston.chat_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND (
      -- Se sender_id existe, excluir esse user_id
      NEW.sender_id IS NULL
      OR user_id IS NULL
      OR user_id != NEW.sender_id
    )
    AND (
      -- Se sender_phone existe, excluir esse phone_number (normalizado)
      NEW.sender_phone IS NULL
      OR NEW.sender_phone = ''
      OR phone_number IS NULL
      OR phone_number = ''
      OR REPLACE(phone_number, '+', '') != REPLACE(COALESCE(NEW.sender_phone, ''), '+', '')
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_unread_on_new_message
  AFTER INSERT ON houston.chat_messages
  FOR EACH ROW EXECUTE FUNCTION houston.increment_unread_count();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE houston.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE houston.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE houston.chat_shift_offers;


-- ============================================
-- STORAGE BUCKET PARA ARQUIVOS DO CHAT
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Política de storage para chat-files
CREATE POLICY "chat_files_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files');

CREATE POLICY "chat_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "chat_files_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[2]);