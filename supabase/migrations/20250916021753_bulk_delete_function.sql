
CREATE OR REPLACE FUNCTION excluir_vagas_lote(vagas_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Verificar se pelo menos um UUID foi fornecido
    IF array_length(vagas_ids, 1) IS NULL OR array_length(vagas_ids, 1) = 0 THEN
        RETURN 0;
    END IF;

    -- Excluir as vagas e contar quantas foram excluídas
    DELETE FROM vagas
    WHERE vagas_id = ANY(vagas_ids);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Retornar quantidade excluída
    RETURN deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, re-lançar com mensagem mais clara
        RAISE EXCEPTION 'Erro ao excluir vagas: %', SQLERRM;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION excluir_vagas_lote(UUID[]) IS 'Função para excluir múltiplas vagas em uma operação, evitando problemas de URL muito longa no cliente Supabase';