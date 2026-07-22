/**
 * Tipos comuns do domínio — datas ISO, metadados persistíveis e helpers
 * de segurança estrutural (chaves proibidas / allow-list).
 *
 * Puro TypeScript.
 */

import type { OrganizationId, CaseId } from "./ids";

// ---- Datas ISO -------------------------------------------------------------

export type IsoDate = string & { readonly __brand: "IsoDate" };
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

export function isValidVersion(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

// ---- Metadados persistíveis (allow-list estrita) --------------------------

export type EntityMetadata = {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
};

export const ENTITY_METADATA_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "createdAt",
  "updatedAt",
  "version",
]);

export function isEntityMetadata(v: unknown): v is EntityMetadata {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  if (!hasOnlyAllowedKeys(m, ENTITY_METADATA_ALLOWED_KEYS)) return false;
  return isIsoDateTime(m.createdAt) && isIsoDateTime(m.updatedAt) && isValidVersion(m.version);
}

// ---- Escopos ---------------------------------------------------------------

export type OrganizationScoped = {
  organizationId: OrganizationId;
};

export type CaseScoped = OrganizationScoped & {
  caseId: CaseId;
};

// ---- Segurança estrutural --------------------------------------------------

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
 * Percorre recursivamente objetos e arrays procurando por chaves proibidas
 * (senha, token, segredo…). Protegido contra referências circulares por
 * `WeakSet` de nós já visitados.
 */
export function containsForbiddenKey(v: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (!v || typeof v !== "object") return false;
  if (seen.has(v as object)) return false;
  seen.add(v as object);
  if (Array.isArray(v)) {
    for (const item of v) {
      if (containsForbiddenKey(item, seen)) return true;
    }
    return false;
  }
  const obj = v as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (containsForbiddenKey(obj[key], seen)) return true;
  }
  return false;
}

export function hasOnlyAllowedKeys(v: unknown, allowed: ReadonlySet<string>): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (!allowed.has(key)) return false;
  }
  return true;
}
