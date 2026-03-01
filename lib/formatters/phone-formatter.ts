/**
 * Utilitários de Formatação de Telefone
 *
 * Conjunto de funções utilitárias para formatação, validação e manipulação
 * de números de telefone no padrão brasileiro. Oferece suporte completo
 * para telefones fixos (10 dígitos) e celulares (11 dígitos).
 *
 * Padrões suportados:
 * - Telefone fixo: (XX) XXXX-XXXX (10 dígitos)
 * - Telefone celular: (XX) XXXXX-XXXX (11 dígitos)
 *
 * Funcionalidades:
 * - Formatação para exibição
 * - Formatação progressiva durante digitação
 * - Remoção de formatação para armazenamento
 * - Validação de formato brasileiro
 */

/**
 * Formata um número de telefone para exibição
 *
 * Recebe um número de telefone (formatado ou não) e retorna
 * no padrão brasileiro adequado baseado na quantidade de dígitos.
 *
 * @param phone - Número de telefone (com ou sem formatação)
 * @returns Telefone formatado no padrão brasileiro ou string original se inválido
 *
 * @example
 * formatPhoneDisplay("11999887766") // "(11) 99988-7766"
 * formatPhoneDisplay("1133334444") // "(11) 3333-4444"
 * formatPhoneDisplay("(11) 99988-7766") // "(11) 99988-7766"
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return "";
  const numbers = phone.replace(/\D/g, "");

  if (numbers.length === 11) {
    // Formato celular: (XX) XXXXX-XXXX
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (numbers.length === 10) {
    // Formato fixo: (XX) XXXX-XXXX
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone; // Retorna original se não atender aos padrões
};

/**
 * Formata número de telefone durante a digitação
 *
 * Aplica formatação progressiva conforme o usuário digita, fornecendo
 * feedback visual imediato. Detecta automaticamente se é telefone fixo
 * ou celular baseado na quantidade de dígitos.
 *
 * @param value - Valor digitado pelo usuário
 * @returns Telefone formatado progressivamente
 *
 * @example
 * formatPhoneNumber("11") // "(11"
 * formatPhoneNumber("119") // "(11) 9"
 * formatPhoneNumber("1199988") // "(11) 99988"
 * formatPhoneNumber("11999887766") // "(11) 99988-7766"
 */
export const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length <= 10) {
    // Formatação para telefone fixo (até 10 dígitos)
    return numbers.replace(
      /(\d{2})(\d{4})(\d{0,4})/,
      (_, area, first, second) => {
        if (second) return `(${area}) ${first}-${second}`;
        if (first) return `(${area}) ${first}`;
        if (area) return `(${area}`;
        return numbers;
      }
    );
  } else {
    // Formatação para telefone celular (11 dígitos)
    return numbers.replace(
      /(\d{2})(\d{5})(\d{0,4})/,
      (_, area, first, second) => {
        if (second) return `(${area}) ${first}-${second}`;
        if (first) return `(${area}) ${first}`;
        if (area) return `(${area}`;
        return numbers;
      }
    );
  }
};

/**
 * Remove formatação do telefone, deixando apenas números
 *
 * Utilitário para preparar números de telefone para armazenamento
 * em banco de dados ou envio para APIs, removendo toda formatação
 * e deixando apenas os dígitos numéricos.
 *
 * @param value - Telefone formatado
 * @returns Apenas os números do telefone
 *
 * @example
 * unformatPhoneNumber("(11) 99988-7766") // "11999887766"
 * unformatPhoneNumber("11 99988-7766") // "11999887766"
 * unformatPhoneNumber("abc11def99988ghi7766") // "11999887766"
 */
export const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

/**
 * Valida formato de telefone brasileiro
 *
 * Verifica se o número de telefone está no formato brasileiro válido,
 * aceitando tanto telefones fixos (10 dígitos) quanto celulares (11 dígitos).
 *
 * @param phone - Telefone a ser validado (formatado ou não)
 * @returns Mensagem de erro ou string vazia se válido
 *
 * @example
 * validatePhone("(11) 99988-7766") // ""
 * validatePhone("(11) 3333-4444") // ""
 * validatePhone("123") // "Telefone deve ter 10 ou 11 dígitos"
 * validatePhone("") // ""
 */
export const validatePhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, "");

  if (phone && numbers.length !== 10 && numbers.length !== 11) {
    return "Telefone deve ter 10 ou 11 dígitos";
  }
  return "";
};
