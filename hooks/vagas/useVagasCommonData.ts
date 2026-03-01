"use client";

// Função para converter string de data do banco em Date local (evita problema de timezone)
function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString || typeof dateString !== 'string') return new Date();

  // Se a string já tem horário, usar Date normal
  if (dateString.includes('T') || dateString.includes(' ')) {
    return new Date(dateString);
  }

  // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback para Date normal
  return new Date(dateString);
}

export function useVagasCommonData() {
  // Função para analisar dados comuns das vagas selecionadas
  const getCommonDataFromSelectedVagas = async (
    selectedVagas: string[],
    fetchVagasData?: (vagaIds: string[]) => Promise<any[]>
  ) => {
    if (selectedVagas.length === 0) return {};

    try {
      let selectedVagasData: any[] = [];

      // Se foi fornecida uma função para buscar dados, usar ela
      // Isso é útil para a página de vagas que precisa buscar dados atualizados
      if (fetchVagasData) {
        const freshData = await fetchVagasData(selectedVagas);

        if (!freshData || freshData.length === 0) {
          return {};
        }

        // Agrupar dados por vaga_id
        const vagasCompletas = Object.values(
          freshData.reduce((acc, vaga) => {
            if (!acc[vaga.vaga_id]) {
              acc[vaga.vaga_id] = {
                ...vaga,
                candidaturas: [],
              };
            }

            // Adicionar candidatura se existir
            if (vaga.candidatura_status && vaga.medico_id) {
              const candidaturaExistente = acc[vaga.vaga_id].candidaturas.find(
                (c: any) => c.candidatura_id === vaga.candidatura_id
              );

              if (!candidaturaExistente) {
                acc[vaga.vaga_id].candidaturas.push({
                  candidatura_id: vaga.candidatura_id,
                  candidatura_status: vaga.candidatura_status,
                  medico_id: vaga.medico_id,
                });
              }
            }

            return acc;
          }, {} as Record<string, any>)
        );

        selectedVagasData = vagasCompletas;
      } else {
        // Para uso direto com dados já carregados (ex: página de escala)
        // Esta função será chamada com os dados já disponíveis
        return {};
      }

      if (selectedVagasData.length === 0) return {};

      const commonData: any = {};
      const firstVaga: any = selectedVagasData[0];

      // Importante: Remover campos que não devem ser considerados para comparação comum
      selectedVagasData.forEach((vaga: any) => {
        delete vaga.medico_id;
      });

      // Lista de campos para comparar
      const fieldsToCompare = [
        "hospital_id",
        "hospital_nome",
        "especialidade_id",
        "especialidade_nome",
        "setor_id",
        "setor_nome",
        "vaga_valor",
        "vagas_horainicio",
        "vagas_horafim",
        "periodo_id",
        "periodo_nome",
        "forma_recebimento_id",
        "tipos_vaga_id",
        "vaga_status",
        "vagas_observacoes",
        "vaga_data",
        "grupo_id",
        "vagas_escalista",
        "escalista_id",
        "grade_id",
      ];

      // Para cada campo, verificar se o valor é igual em todas as vagas
      fieldsToCompare.forEach((field) => {
        const firstValue = firstVaga[field];

        // Verificar se TODAS as vagas têm exatamente o mesmo valor
        const allSame = selectedVagasData.every(
          (vaga: any) => vaga[field] === firstValue
        );

        // Só incluir se:
        // 1. Todas têm o mesmo valor
        // 2. O valor não é vazio/nulo (com exceção especial para horários)
        // 3. Para campos opcionais como período, garantir que não é um valor padrão inconsistente
        if (
          allSame &&
          firstValue !== null &&
          firstValue !== undefined &&
          (firstValue !== "" || field === 'vagas_horainicio' || field === 'vagas_horafim')
        ) {
          // Validação adicional para campos específicos
          if (field === 'periodo_id' || field === 'periodo_nome') {
            // Para período, verificar se realmente todas as vagas têm o mesmo valor válido
            const todosOsValores = selectedVagasData.map((vaga: any) => vaga[field]);

            // Para periodo_id (UUID), verificar apenas null/undefined
            // Para periodo_nome (string), verificar null/undefined/vazio
            const isValidValue = field === 'periodo_id'
              ? (val: any) => val !== null && val !== undefined
              : (val: any) => val !== null && val !== undefined && val !== "";

            const todosValidos = todosOsValores.every(isValidValue);

            if (todosValidos && allSame) {
              commonData[field] = firstValue;
            }
          } else if (field === 'vagas_horainicio' || field === 'vagas_horafim') {
            // Para campos de horário, aceitar valores válidos incluindo "00:00"
            if (firstValue !== null && firstValue !== undefined) {
              commonData[field] = firstValue;
            }
          } else {
            commonData[field] = firstValue;
          }
        }
      });

      // Verificar prazo de pagamento comum baseado na diferença entre datas
      const prazosCalculados = selectedVagasData.map((vaga: any) => {
        const dataPagamentoStr = vaga.vaga_datapagamento ?? "";
        const dataPlantaoStr = vaga.vaga_data ?? "";

        if (dataPagamentoStr && dataPlantaoStr) {
          const dataPagamento = parseLocalDate(dataPagamentoStr);
          const dataPlantao = parseLocalDate(dataPlantaoStr);
          const diffMs = dataPagamento.getTime() - dataPlantao.getTime();
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

          if (diffDias === 1) {
            return 'vista';
          } else if (diffDias === 30) {
            return '30dias';
          } else if (diffDias === 45) {
            return '45dias';
          } else if (diffDias === 60) {
            return '60dias';
          } else {
            return 'data_fechamento';
          }
        }
        return null;
      }).filter(Boolean);

      // Se todas as vagas têm o mesmo prazo calculado, incluir nos dados comuns
      if (prazosCalculados.length === selectedVagasData.length &&
        prazosCalculados.every(prazo => prazo === prazosCalculados[0])) {
        commonData.prazo_pagamento_comum = prazosCalculados[0];

        // Se for data_fechamento, incluir a data também
        if (prazosCalculados[0] === 'data_fechamento') {
          const primeiraVaga: any = selectedVagasData[0];
          if (primeiraVaga.vaga_datapagamento) {
            commonData.data_fechamento_comum = parseLocalDate(primeiraVaga.vaga_datapagamento);
          }
        }
      }

      // Verificar médico designado comum - só se TODAS tiverem o mesmo médico aprovado
      const medicosAprovados = selectedVagasData.map((vaga: any) => {
        const candidaturaAprovada = vaga.candidaturas?.find((c: any) => c.candidatura_status === 'APROVADO');
        return candidaturaAprovada?.medico_id || null;
      });

      // Verificar se todas as vagas têm médico aprovado e se é o mesmo médico
      const primeiroMedico = medicosAprovados[0];
      const todasTêmMedicoAprovado = medicosAprovados.every(medico => medico !== null && medico !== undefined);
      const todasTêmMesmoMedico = medicosAprovados.every(medico => medico === primeiroMedico);

      if (todasTêmMedicoAprovado && todasTêmMesmoMedico && primeiroMedico) {
        commonData.medico_designado = primeiroMedico;
      }

      return commonData;
    } catch (error) {
      console.error('Erro ao buscar dados das vagas selecionadas:', error);
      return {};
    }
  };

  // Versão simplificada para dados já carregados (página de escala)
  const getCommonDataFromLoadedVagas = (selectedVagas: string[], allVagasData: any[]) => {
    const selectedVagasData = allVagasData.filter((vaga: any) =>
      selectedVagas.includes(vaga.vaga_id)
    );

    if (selectedVagasData.length === 0) return {};

    const commonData: any = {};
    const firstVaga: any = selectedVagasData[0];

    // Lista de campos para comparar
    const fieldsToCompare = [
      'hospital_id', 'hospital_nome',
      'especialidade_id', 'especialidade_nome',
      'setor_id', 'setor_nome',
      'vaga_valor', 'vagas_horainicio', 'vagas_horafim',
      'periodo_id', 'periodo_nome',
      'forma_recebimento_id', 'tipos_vaga_id',
      'vaga_status', 'vagas_observacoes',
      'vaga_data', 'vaga_datapagamento', 'grupo_id', 'vagas_escalista', 'escalista_id',
      'grade_id'
    ];

    // Para cada campo, verificar se o valor é igual em todas as vagas
    fieldsToCompare.forEach(field => {
      const firstValue = firstVaga[field];

      // Verificar se TODAS as vagas têm exatamente o mesmo valor
      const allSame = selectedVagasData.every((vaga: any) => vaga[field] === firstValue);

      // Só incluir se:
      // 1. Todas têm o mesmo valor
      // 2. O valor não é vazio/nulo (com exceção especial para horários)
      // 3. Para campos opcionais como período, garantir que não é um valor padrão inconsistente
      if (
        allSame &&
        firstValue !== null &&
        firstValue !== undefined &&
        (firstValue !== "" || field === 'vagas_horainicio' || field === 'vagas_horafim')
      ) {
        // Validação adicional para campos específicos
        if (field === 'periodo_id' || field === 'periodo_nome') {
          // Para período, verificar se realmente todas as vagas têm o mesmo valor válido
          const todosOsValores = selectedVagasData.map((vaga: any) => vaga[field]);

          // Para periodo_id (UUID), verificar apenas null/undefined
          // Para periodo_nome (string), verificar null/undefined/vazio
          const isValidValue = field === 'periodo_id'
            ? (val: any) => val !== null && val !== undefined
            : (val: any) => val !== null && val !== undefined && val !== "";

          const todosValidos = todosOsValores.every(isValidValue);

          if (todosValidos && allSame) {
            commonData[field] = firstValue;
          }
        } else if (field === 'vagas_horainicio' || field === 'vagas_horafim') {
          // Para campos de horário, aceitar valores válidos incluindo "00:00"
          if (firstValue !== null && firstValue !== undefined) {
            commonData[field] = firstValue;
          }
        } else {
          commonData[field] = firstValue;
        }
      }
    });

    // Verificar escalista comum - incluir escalista_id no fieldsToCompare já resolve
    // Verificar médico designado comum - só se TODAS tiverem o mesmo médico aprovado
    const medicosAprovados = selectedVagasData.map((vaga: any) => {
      const candidaturaAprovada = vaga.candidaturas?.find((c: any) => c.candidatura_status === 'APROVADO');
      return candidaturaAprovada?.medico_id || null;
    });

    // Verificar se todas as vagas têm médico aprovado e se é o mesmo médico
    const primeiroMedico = medicosAprovados[0];
    const todasTêmMedicoAprovado = medicosAprovados.every(medico => medico !== null && medico !== undefined);
    const todasTêmMesmoMedico = medicosAprovados.every(medico => medico === primeiroMedico);

    if (todasTêmMedicoAprovado && todasTêmMesmoMedico && primeiroMedico) {
      commonData.medico_designado = primeiroMedico;
    }

    // Importante: Remover medico_id dos dados comuns se existir, pois pode vir da view
    // mas não deveria ser considerado como campo comum para edição em lote
    delete commonData.medico_id;

    // Verificar prazo de pagamento comum baseado na diferença entre datas
    if (commonData.vaga_data && commonData.vaga_datapagamento) {
      // Se todas as vagas têm a mesma data do plantão e data de pagamento,
      // calculamos o prazo baseado na diferença
      const dataPlantao = parseLocalDate(commonData.vaga_data);
      const dataPagamento = parseLocalDate(commonData.vaga_datapagamento);
      const diffMs = dataPagamento.getTime() - dataPlantao.getTime();
      const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDias === 1) {
        commonData.prazo_pagamento_comum = 'vista';
      } else if (diffDias === 30) {
        commonData.prazo_pagamento_comum = '30dias';
      } else if (diffDias === 45) {
        commonData.prazo_pagamento_comum = '45dias';
      } else if (diffDias === 60) {
        commonData.prazo_pagamento_comum = '60dias';
      } else {
        commonData.prazo_pagamento_comum = 'data_fechamento';
        commonData.data_fechamento_comum = commonData.vaga_datapagamento;
      }
    } else {
      // Se não há datas comuns, verificar se todas têm o mesmo prazo calculado
      const prazosCalculados = selectedVagasData.map((vaga: any) => {
        if (!vaga.vaga_data || !vaga.vaga_datapagamento) return null;

        const dataPlantao = parseLocalDate(vaga.vaga_data);
        const dataPagamento = parseLocalDate(vaga.vaga_datapagamento);
        const diffMs = dataPagamento.getTime() - dataPlantao.getTime();
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDias === 1) return { prazo: 'vista' };
        if (diffDias === 30) return { prazo: '30dias' };
        if (diffDias === 45) return { prazo: '45dias' };
        if (diffDias === 60) return { prazo: '60dias' };
        return { prazo: 'data_fechamento', dataFechamento: vaga.vaga_datapagamento };
      }).filter(Boolean);

      if (prazosCalculados.length === selectedVagasData.length && prazosCalculados.length > 0) {
        const primeiroPrazo = prazosCalculados[0];
        if (primeiroPrazo) {
          const todosTêmMesmoPrazo = prazosCalculados.every(p => p?.prazo === primeiroPrazo.prazo);

          if (todosTêmMesmoPrazo) {
            commonData.prazo_pagamento_comum = primeiroPrazo.prazo;
            if (primeiroPrazo.prazo === 'data_fechamento') {
              // Verificar se todas têm a mesma data de fechamento
              const datasIguais = prazosCalculados.every(p => p?.dataFechamento === primeiroPrazo.dataFechamento);
              if (datasIguais) {
                commonData.data_fechamento_comum = primeiroPrazo.dataFechamento;
              }
            }
          }
        }
      }
    }

    return commonData;
  };

  return {
    getCommonDataFromSelectedVagas,
    getCommonDataFromLoadedVagas,
  };
}