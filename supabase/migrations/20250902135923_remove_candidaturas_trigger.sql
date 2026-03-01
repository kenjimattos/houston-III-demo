-- Esta migração remove trigger e função que servia para manter a antiga coluna medicos_id atualizada
-- Esta coluna foi removida para dar lugar a nova coluna medico_id a fim de manter a padronização do nome da coluna com o restante do banco de dados

drop trigger "candidaturas_2_sync_medico_id" on "candidaturas";
drop function sync_candidaturas_medico_id();

-- Agora vamos renomear os demais triggers da tabela candidaturas para manter a organização

alter trigger "candidaturas_3_auto_aprovar_favoritos" on "candidaturas" rename to "candidaturas_2_auto_aprovar_favoritos";
alter trigger "candidaturas_4_atualizar_contador_vagas" on "candidaturas" rename to "candidaturas_3_atualizar_contador_vagas";
alter trigger "candidaturas_5_fechar_vaga_ao_aprovar" on "candidaturas" rename to "candidaturas_4_fechar_vaga_ao_aprovar";
alter trigger "candidaturas_6_contar_plantoes_medico" on "candidaturas" rename to "candidaturas_5_contar_plantoes_medico";
