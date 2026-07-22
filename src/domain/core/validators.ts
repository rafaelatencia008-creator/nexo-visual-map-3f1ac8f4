/**
 * Validadores relacionais e estruturais — funções puras.
 *
 * Recebem coleções por parâmetro (nunca acessam storage) e devolvem
 * `true`/`false` ou uma lista de problemas encontrados.
 */

import { containsForbiddenKey } from "./common";
import type { Case } from "./case";
import type { Person } from "./person";
import type { Assignment, CasePerson, Relationship } from "./assignment";
import { isMinor } from "./person";
import { isCase } from "./case";
import { isPerson } from "./person";
import {
  isAssignment,
  isCasePerson,
  isRelationship,
} from "./assignment";
import type { ProfessionalProfile } from "./professional";

// ---- CasePerson ------------------------------------------------------------

export function validateCasePerson(
  cp: unknown,
  ctx: { cases: readonly Case[]; persons: readonly Person[] },
): { ok: true; value: CasePerson } | { ok: false; reason: string } {
  if (containsForbiddenKey(cp)) return { ok: false, reason: "forbidden_key" };
  if (!isCasePerson(cp)) return { ok: false, reason: "shape_invalid" };
  const c = ctx.cases.find((x) => x.id === cp.caseId);
  if (!c) return { ok: false, reason: "case_not_found" };
  const p = ctx.persons.find((x) => x.id === cp.personId);
  if (!p) return { ok: false, reason: "person_not_found" };
  if (c.organizationId !== cp.organizationId)
    return { ok: false, reason: "organization_mismatch" };
  if (p.organizationId !== cp.organizationId)
    return { ok: false, reason: "person_organization_mismatch" };
  // Criança/adolescente exige `restrictedByDefault: true`.
  if (isMinor(p) && !cp.restrictedByDefault)
    return { ok: false, reason: "minor_must_be_restricted" };
  return { ok: true, value: cp };
}

// ---- Relationship ----------------------------------------------------------

export function validateRelationship(
  r: unknown,
  ctx: { cases: readonly Case[]; persons: readonly Person[] },
): { ok: true; value: Relationship } | { ok: false; reason: string } {
  if (containsForbiddenKey(r)) return { ok: false, reason: "forbidden_key" };
  if (!isRelationship(r)) return { ok: false, reason: "shape_invalid" };
  if (r.fromPersonId === r.toPersonId) return { ok: false, reason: "self_relationship" };
  const c = ctx.cases.find((x) => x.id === r.caseId);
  if (!c) return { ok: false, reason: "case_not_found" };
  if (c.organizationId !== r.organizationId)
    return { ok: false, reason: "organization_mismatch" };
  const from = ctx.persons.find((x) => x.id === r.fromPersonId);
  const to = ctx.persons.find((x) => x.id === r.toPersonId);
  if (!from || !to) return { ok: false, reason: "person_not_found" };
  if (from.organizationId !== r.organizationId || to.organizationId !== r.organizationId)
    return { ok: false, reason: "person_organization_mismatch" };
  return { ok: true, value: r };
}

// ---- Assignment ------------------------------------------------------------

export function validateAssignment(
  a: unknown,
  ctx: {
    cases: readonly Case[];
    professionalProfiles: readonly ProfessionalProfile[];
  },
): { ok: true; value: Assignment } | { ok: false; reason: string } {
  if (containsForbiddenKey(a)) return { ok: false, reason: "forbidden_key" };
  if (!isAssignment(a)) return { ok: false, reason: "shape_invalid" };
  const c = ctx.cases.find((x) => x.id === a.caseId);
  if (!c) return { ok: false, reason: "case_not_found" };
  const prof = ctx.professionalProfiles.find((x) => x.id === a.professionalProfileId);
  if (!prof) return { ok: false, reason: "professional_not_found" };
  if (c.organizationId !== a.organizationId)
    return { ok: false, reason: "organization_mismatch" };
  if (prof.organizationId !== a.organizationId)
    return { ok: false, reason: "professional_organization_mismatch" };
  return { ok: true, value: a };
}

// ---- Case ------------------------------------------------------------------

export function validateCase(v: unknown): { ok: true; value: Case } | { ok: false; reason: string } {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isCase(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}

// ---- Person ----------------------------------------------------------------

export function validatePerson(v: unknown): { ok: true; value: Person } | { ok: false; reason: string } {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isPerson(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}
