-- Altera as funções de paginação de SECURITY DEFINER para SECURITY INVOKER
-- Isso permite que as funções sejam executadas com os privilégios do usuário que as chama,
-- respeitando melhor as políticas RLS aplicadas às views/tabelas consultadas

-- Alterar função get_applications_paginated para SECURITY INVOKER
ALTER FUNCTION get_applications_paginated(
    integer, integer, uuid[], uuid[], uuid[], date, date, numeric, numeric,
    uuid[], uuid[], uuid[], text, uuid[], text[], text[], uuid[], text, text
) SECURITY INVOKER;

-- Alterar função get_vagas_paginated para SECURITY INVOKER
ALTER FUNCTION get_vagas_paginated(
    integer, integer, uuid[], uuid[], uuid[], date, date, numeric, numeric,
    uuid[], uuid[], uuid[], text, uuid[], text[], text[], uuid[], text, text
) SECURITY INVOKER;