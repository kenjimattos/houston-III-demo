export enum Permission {
  // Jobs (Vagas)
  JOBS_READ = "vagas.select",
  JOBS_CREATE = "vagas.insert",
  JOBS_UPDATE = "vagas.update",
  JOBS_DELETE = "vagas.delete",

  // Members (Membros)
  MEMBERS_READ = "membros.select",
  MEMBERS_ADD = "membros.insert",
  MEMBERS_UPDATE = "membros.update",
  MEMBERS_REMOVE = "membros.delete",

  // Doctors (Médicos)
  DOCTORS_READ = "medicos.select",
  DOCTORS_ADD = "medicos.insert",
  DOCTORS_UPDATE = "medicos.update",
  DOCTORS_REMOVE = "medicos.delete",

  // Pre-registered doctors (Médicos Pré-cadastro)
  PRE_REGISTERED_DOCTORS_READ = "medicos_precadastro.select",
  PRE_REGISTERED_DOCTORS_ADD = "medicos_precadastro.insert",
  PRE_REGISTERED_DOCTORS_UPDATE = "medicos_precadastro.update",
  PRE_REGISTERED_DOCTORS_REMOVE = "medicos_precadastro.delete",

  // Groups (Grupos)
  GROUP_READ = "grupos.select",
  GROUP_ADD = "grupos.insert",
  GROUP_UPDATE = "grupos.update",
  GROUP_REMOVE = "grupos.delete",

  // Roles
  ROLES_READ = "roles.select",
  ROLES_ADD = "roles.insert",
  ROLES_UPDATE = "roles.update",
  ROLES_REMOVE = "roles.delete",

  // Hospitais (alternative naming)
  HOSPITAIS_READ = "hospitais.select",
  HOSPITAIS_ADD = "hospitais.insert",
  HOSPITAIS_UPDATE = "hospitais.update",
  HOSPITAIS_REMOVE = "hospitais.delete",

  // Reports (Relatórios)
  REPORTS_READ = "relatorios.select",
  REPORTS_ADD = "relatorios.insert",
  REPORTS_UPDATE = "relatorios.update",
  REPORTS_REMOVE = "relatorios.delete",

  // Candidaturas
  CANDIDATURAS_READ = "candidaturas.select",
  CANDIDATURAS_ADD = "candidaturas.insert",
  CANDIDATURAS_UPDATE = "candidaturas.update",
  CANDIDATURAS_REMOVE = "candidaturas.delete",
  CANDIDATURAS_OLD = "candidaturas.old",

  // Pagamentos
  PAGAMENTOS_READ = "pagamentos.select",
  PAGAMENTOS_ADD = "pagamentos.insert",
  PAGAMENTOS_UPDATE = "pagamentos.update",
  PAGAMENTOS_REMOVE = "pagamentos.delete",
}
