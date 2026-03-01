export const formatCRM = (value: string) => {
  // Remove todos os caracteres não numéricos
  const numbersOnly = value.replace(/\D/g, "");

  // Limita o CRM entre 5 e 6 dígitos
  const limitedCRM = numbersOnly.slice(0, 6);

  return limitedCRM;
};
