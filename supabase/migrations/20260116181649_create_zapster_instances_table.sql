-- Migration: create_zapster_instances_table
-- Description: Tabela para armazenar instâncias Zapster por grupo
-- Nota: Permissões controladas via API route, não via RLS

-- Criar tabela de instâncias Zapster no schema houston
CREATE TABLE houston.zapster_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  zapster_instance_id TEXT NOT NULL UNIQUE,
  instance_name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'offline')),
  phone_number TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_grupo_instance UNIQUE(grupo_id)
);

-- Índices para performance
CREATE INDEX idx_zapster_instances_grupo_id ON houston.zapster_instances(grupo_id);
CREATE INDEX idx_zapster_instances_status ON houston.zapster_instances(status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION houston.update_zapster_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_zapster_instances_updated_at
  BEFORE UPDATE ON houston.zapster_instances
  FOR EACH ROW
  EXECUTE FUNCTION houston.update_zapster_instances_updated_at();

-- Grants para permitir acesso via Supabase client
GRANT SELECT, INSERT, UPDATE, DELETE ON houston.zapster_instances TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE houston.zapster_instances IS 'Armazena instâncias Zapster/WhatsApp por grupo. Permissões controladas via API route.';
COMMENT ON COLUMN houston.zapster_instances.grupo_id IS 'ID do grupo que possui esta instância';
COMMENT ON COLUMN houston.zapster_instances.zapster_instance_id IS 'ID da instância na API Zapster';
COMMENT ON COLUMN houston.zapster_instances.instance_name IS 'Nome da instância (para identificação)';
COMMENT ON COLUMN houston.zapster_instances.status IS 'Status da conexão: connected, disconnected, offline';
COMMENT ON COLUMN houston.zapster_instances.phone_number IS 'Número de telefone conectado à instância';
COMMENT ON COLUMN houston.zapster_instances.metadata IS 'Metadados adicionais da instância Zapster';
