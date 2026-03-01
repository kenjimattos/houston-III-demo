export function isValidCRM(crm: string): boolean {
  // Remove caracteres não numéricos
  const crmClean = crm.replace(/\D/g, "");

  // CRM deve ter entre 5 e 6 dígitos
  if (crmClean.length < 5 || crmClean.length > 6) {
    return false;
  }

  // Verifica se contém apenas números
  return /^\d+$/.test(crmClean);
}
