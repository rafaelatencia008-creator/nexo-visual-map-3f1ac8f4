/**
 * Camada compartilhada: enums do "contexto de trabalho" que aparecem
 * simultaneamente no onboarding, na sessão e no domínio oficial.
 *
 * Fonte única de verdade. `src/domain/onboarding.ts` e `src/domain/core/*`
 * apenas importam e reexportam daqui — não redefinem valores.
 *
 * Puro TypeScript. Nenhum React, storage ou rede.
 */

// ---- Perfis profissionais ---------------------------------------------------

export const PERFIS = ["psicologia", "servico-social", "multi", "outro"] as const;
export type Perfil = (typeof PERFIS)[number];

export function isPerfil(v: unknown): v is Perfil {
  return typeof v === "string" && (PERFIS as readonly string[]).includes(v);
}

// ---- Forma de trabalho / tipo de organização --------------------------------

export const WORK_MODES = ["individual", "equipe", "institucional"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export function isWorkMode(v: unknown): v is WorkMode {
  return typeof v === "string" && (WORK_MODES as readonly string[]).includes(v);
}

// ---- Papel organizacional (Membership.role) ---------------------------------

export const ROLES = [
  "proprietario",
  "administrador",
  "profissional",
  "revisor",
  "colaborador",
  "leitura",
] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
