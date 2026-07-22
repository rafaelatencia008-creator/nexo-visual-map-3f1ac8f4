/**
 * Tipos comuns do domínio — datas ISO e metadados persistíveis.
 *
 * Puro TypeScript. Nenhum acesso a Date global fora dos validadores.
 */

import type { OrganizationId, CaseId } from "./ids";

/** Data ISO no formato `YYYY-MM-DD`. */
export type IsoDate = string & { readonly __brand: "IsoDate" };

/** Datetime ISO 8601 completo, ex.: `2026-08-05T14:00:00.000Z`. */
export type IsoDateTime = string & { readonly __brand: "IsoDateTime" };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== "string" || !ISO_DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

export function isIsoDateTime(v: unknown): v is IsoDateTime {
  if (typeof v !== "string" || !ISO_DATETIME_RE.test(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

/** Versão de entidade: inteiro positivo (>= 1). */
export function isValidVersion(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

/**
 * Metadados comuns a toda entidade persistível futura. Não implicam
 * banco: apenas descrevem o contrato.
 */
export type EntityMetadata = {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
};

export function isEntityMetadata(v: unknown): v is EntityMetadata {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  return isIsoDateTime(m.createdAt) && isIsoDateTime(m.updatedAt) && isValidVersion(m.version);
}

/** Entidade que pertence a uma organização. */
export type OrganizationScoped = {
  organizationId: OrganizationId;
};

/** Entidade que pertence a um caso (e portanto a uma organização). */
export type CaseScoped = OrganizationScoped & {
  caseId: CaseId;
};

/** Chaves que jamais podem aparecer em qualquer contrato do domínio. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "password",
  "senha",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
]);

/**
 * Verifica se um objeto contém alguma chave proibida (senha, token, segredo…).
 * Verificação rasa — a fundação não aceita esses campos em NENHUM nível raiz.
 */
export function containsForbiddenKey(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
  }
  return false;
}

/**
 * Verifica se um objeto contém apenas chaves permitidas. Usado para
 * validação estrita — rejeita propriedades desconhecidas.
 */
export function hasOnlyAllowedKeys(v: unknown, allowed: ReadonlySet<string>): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (!allowed.has(key)) return false;
  }
  return true;
}
