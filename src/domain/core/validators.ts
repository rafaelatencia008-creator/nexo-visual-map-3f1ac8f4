/**
 * Validadores relacionais e estruturais — funções puras.
 * Recebem coleções por parâmetro; nada acessa storage ou rede.
 */

import { containsForbiddenKey } from "./common";
import type { Case } from "./case";
import { isCase } from "./case";
import type { Person } from "./person";
import { isMinor, isPerson } from "./person";
import type { Assignment, CasePerson, Relationship } from "./assignment";
import { isAssignment, isCasePerson, isRelationship } from "./assignment";
import type { Credential, ProfessionalProfile } from "./professional";
import { isCredential, isProfessionalProfile } from "./professional";
import type { Organization } from "./organization";
import { isOrganization } from "./organization";
import type { Membership, User } from "./access";
import { isMembership, isUser } from "./access";

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; reason: string };
type Result<T> = Ok<T> | Err;

// ---- Organization ----------------------------------------------------------

export function validateOrganization(v: unknown): Result<Organization> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isOrganization(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}

// ---- User ------------------------------------------------------------------

export function validateUser(v: unknown): Result<User> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isUser(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}

// ---- Membership ------------------------------------------------------------

export function validateMembership(
  v: unknown,
  ctx: { users: readonly User[]; organizations: readonly Organization[] },
): Result<Membership> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isMembership(v)) return { ok: false, reason: "shape_invalid" };
  const org = ctx.organizations.find((o) => o.id === v.organizationId);
  if (!org) return { ok: false, reason: "organization_not_found" };
  const user = ctx.users.find((u) => u.id === v.userId);
  if (!user) return { ok: false, reason: "user_not_found" };
  return { ok: true, value: v };
}

// ---- ProfessionalProfile ---------------------------------------------------

export function validateProfessionalProfile(v: unknown): Result<ProfessionalProfile> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isProfessionalProfile(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}

// ---- Credential ------------------------------------------------------------

export function validateCredential(
  v: unknown,
  ctx: { professionalProfiles: readonly ProfessionalProfile[] },
): Result<Credential> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isCredential(v)) return { ok: false, reason: "shape_invalid" };
  const prof = ctx.professionalProfiles.find((p) => p.id === v.professionalProfileId);
  if (!prof) return { ok: false, reason: "professional_not_found" };
  if (prof.organizationId !== v.organizationId)
    return { ok: false, reason: "organization_mismatch" };
  return { ok: true, value: v };
}

// ---- CasePerson ------------------------------------------------------------

export function validateCasePerson(
  cp: unknown,
  ctx: { cases: readonly Case[]; persons: readonly Person[] },
): Result<CasePerson> {
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
  if (isMinor(p) && !cp.restrictedByDefault)
    return { ok: false, reason: "minor_must_be_restricted" };
  return { ok: true, value: cp };
}

// ---- Relationship ----------------------------------------------------------

export function validateRelationship(
  r: unknown,
  ctx: { cases: readonly Case[]; persons: readonly Person[] },
): Result<Relationship> {
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
): Result<Assignment> {
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

export function validateCase(v: unknown): Result<Case> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isCase(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}

// ---- Person ----------------------------------------------------------------

export function validatePerson(v: unknown): Result<Person> {
  if (containsForbiddenKey(v)) return { ok: false, reason: "forbidden_key" };
  if (!isPerson(v)) return { ok: false, reason: "shape_invalid" };
  return { ok: true, value: v };
}
