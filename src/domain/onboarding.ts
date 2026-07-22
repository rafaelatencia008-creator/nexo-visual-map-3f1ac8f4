/**
 * Domínio do Onboarding (Etapa 5) — apenas enums, tipos e validadores.
 * NENHUM texto livre entra aqui. Só enums + IDs fictícios centralizados.
 */

export const PERFIS = ["psicologia", "servico-social", "multi", "outro"] as const;
export type Perfil = (typeof PERFIS)[number];

export const WORK_MODES = ["individual", "equipe", "institucional"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const PRIMARY_USES = [
  "processos",
  "documentos",
  "entrevistas",
  "laudos",
  "fluxo-completo",
] as const;
export type PrimaryUse = (typeof PRIMARY_USES)[number];

export const START_PAGES = ["dashboard", "processos", "agenda", "pendencias"] as const;
export type StartPage = (typeof START_PAGES)[number];

export const ROLES = [
  "proprietario",
  "administrador",
  "profissional",
  "revisor",
  "colaborador",
  "leitura",
] as const;
export type Role = (typeof ROLES)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  psicologia: "Psicologia",
  "servico-social": "Serviço Social",
  multi: "Equipe multiprofissional",
  outro: "Outro perfil",
};

export const PERFIL_DESC: Record<Perfil, string> = {
  psicologia: "Atendimento e avaliação psicológica em contexto pericial.",
  "servico-social": "Estudo social, parecer técnico e visitas domiciliares.",
  multi: "Atuação conjunta entre profissionais de áreas distintas.",
  outro: "Outra atuação profissional relacionada à perícia.",
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  individual: "Trabalho individual",
  equipe: "Trabalho em equipe",
  institucional: "Ambiente institucional",
};

export const WORK_MODE_DESC: Record<WorkMode, string> = {
  individual: "Um espaço pessoal para organizar os próprios trabalhos.",
  equipe: "Um espaço demonstrativo para atuação conjunta e revisão.",
  institucional: "Um ambiente demonstrativo com estrutura de organização e permissões.",
};

export const PRIMARY_USE_LABEL: Record<PrimaryUse, string> = {
  processos: "Organizar processos",
  documentos: "Gerenciar documentos",
  entrevistas: "Conduzir entrevistas e diligências",
  laudos: "Elaborar laudos",
  "fluxo-completo": "Utilizar o fluxo completo",
};

export const START_PAGE_LABEL: Record<StartPage, string> = {
  dashboard: "Dashboard",
  processos: "Processos",
  agenda: "Agenda",
  pendencias: "Pendências",
};

export const START_PAGE_PATH: Record<StartPage, string> = {
  dashboard: "/app",
  processos: "/app/processos",
  agenda: "/app/agenda",
  pendencias: "/app/pendencias",
};

export const ROLE_LABEL: Record<Role, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  profissional: "Profissional",
  revisor: "Revisor",
  colaborador: "Colaborador",
  leitura: "Somente leitura",
};

export type ThemePref = "light" | "dark" | "system" | "keep";

export type OnboardingDraft = {
  version: 1;
  perfil?: Perfil;
  workMode?: WorkMode;
  contextId?: string;
  primaryUse?: PrimaryUse;
  startPage?: StartPage;
  theme?: ThemePref;
};

export type OnboardingResult = {
  perfil: Perfil;
  workMode: WorkMode;
  contextId: string;
  role: Role;
  primaryUse: PrimaryUse;
  startPage: StartPage;
  theme: ThemePref;
};

export const ONBOARDING_STEPS = [
  { key: "perfil", label: "Perfil", path: "/onboarding/perfil" },
  { key: "forma-de-trabalho", label: "Trabalho", path: "/onboarding/forma-de-trabalho" },
  { key: "contexto", label: "Contexto", path: "/onboarding/contexto" },
  { key: "preferencias", label: "Preferências", path: "/onboarding/preferencias" },
  { key: "revisao", label: "Revisão", path: "/onboarding/revisao" },
] as const;

export function isPerfil(v: unknown): v is Perfil {
  return typeof v === "string" && (PERFIS as readonly string[]).includes(v);
}
export function isWorkMode(v: unknown): v is WorkMode {
  return typeof v === "string" && (WORK_MODES as readonly string[]).includes(v);
}
export function isPrimaryUse(v: unknown): v is PrimaryUse {
  return typeof v === "string" && (PRIMARY_USES as readonly string[]).includes(v);
}
export function isStartPage(v: unknown): v is StartPage {
  return typeof v === "string" && (START_PAGES as readonly string[]).includes(v);
}
export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
export function isTheme(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system" || v === "keep";
}
