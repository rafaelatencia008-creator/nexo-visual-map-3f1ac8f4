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

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

/** Ano bissexto (regra gregoriana). */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) return false;
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

/** Dias no mês (1-12). Retorna 0 para mês inválido. */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 0;
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  const max = daysInMonth(year, month);
  return day >= 1 && day <= max;
}

export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== "string") return false;
  const m = ISO_DATE_RE.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return isValidCalendarDate(y, mo, d);
}

export function isIsoDateTime(v: unknown): v is IsoDateTime {
  if (typeof v !== "string") return false;
  const m = ISO_DATETIME_RE.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidCalendarDate(y, mo, d)) return false;
  const h = Number(m[4]);
  const min = Number(m[5]);
  const s = Number(m[6]);
  if (h > 23 || min > 59 || s > 59) return false;
  // m[7] fração (já limitada a 1-3 dígitos pelo regex); nada a validar aqui.
  const tz = m[8];
  if (tz !== "Z") {
    const oh = Number(m[10]);
    const om = Number(m[11]);
    if (oh > 23 || om > 59) return false;
  }
  return true;
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
