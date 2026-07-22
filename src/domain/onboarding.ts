/**
 * Domínio do Onboarding (Etapas 1-5).
 *
 * LV-07.1.1: `Perfil`, `WorkMode` e `Role` foram movidos para
 * `src/domain/shared/work-context.ts`. Este arquivo passa a reexportá-los
 * para preservar 100% da API pública consumida por hooks, rotas e testes.
 */

export {
  PERFIS,
  WORK_MODES,
  ROLES,
  isPerfil,
  isWorkMode,
  isRole,
} from "./shared/work-context";
export type { Perfil, WorkMode, Role } from "./shared/work-context";

import type { Perfil, WorkMode, Role } from "./shared/work-context";

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

export function isPrimaryUse(v: unknown): v is PrimaryUse {
  return typeof v === "string" && (PRIMARY_USES as readonly string[]).includes(v);
}
export function isStartPage(v: unknown): v is StartPage {
  return typeof v === "string" && (START_PAGES as readonly string[]).includes(v);
}
export function isTheme(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system" || v === "keep";
}
