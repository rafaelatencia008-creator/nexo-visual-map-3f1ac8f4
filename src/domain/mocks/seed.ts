/**
 * Seed oficial estável para os mocks. Determinístico, sem PII, sem dado
 * de pessoa real. IDs prefixados por `_seed_`.
 */

import { buildDomainId } from "../core/ids";
import type { IsoDate, IsoDateTime } from "../core/common";
import type { EntityMetadata } from "../core/common";
import type { Organization } from "../core/organization";
import type { User, Membership } from "../core/access";
import type { ProfessionalProfile, Credential } from "../core/professional";
import type { Case } from "../core/case";
import type { Person } from "../core/person";
import type { CasePerson, Relationship, Assignment } from "../core/assignment";
import {
  validateOrganization,
  validateUser,
  validateMembership,
  validateProfessionalProfile,
  validateCredential,
  validateCase,
  validatePerson,
  validateCasePerson,
  validateRelationship,
  validateAssignment,
} from "../core/validators";
import { containsForbiddenKey } from "../core/common";
import type { MockDomainSnapshot } from "./types";

const T0: IsoDateTime = "2026-01-01T00:00:00.000Z" as IsoDateTime;
const D0: IsoDate = "2026-01-01" as IsoDate;

function metaAt(t: IsoDateTime): EntityMetadata {
  return { createdAt: t, updatedAt: t, version: 1 };
}

// ---- Organizações ----------------------------------------------------------
export const SEED_ORG_ALFA_ID = buildDomainId("organization", "seed_alfa");
export const SEED_ORG_BETA_ID = buildDomainId("organization", "seed_beta");

// ---- Users -----------------------------------------------------------------
export const SEED_USER_1_ID = buildDomainId("user", "seed_1");
export const SEED_USER_2_ID = buildDomainId("user", "seed_2");
export const SEED_USER_3_ID = buildDomainId("user", "seed_3");

// ---- Memberships -----------------------------------------------------------
export const SEED_MEM_ALFA_OWNER_ID = buildDomainId("membership", "seed_alfa_owner");
export const SEED_MEM_ALFA_SUSPENDED_ID = buildDomainId(
  "membership",
  "seed_alfa_suspended",
);
export const SEED_MEM_BETA_OWNER_ID = buildDomainId("membership", "seed_beta_owner");
export const SEED_MEM_BETA_PROF_ID = buildDomainId("membership", "seed_beta_prof");

// ---- ProfessionalProfile ---------------------------------------------------
export const SEED_PROF_ALFA_ID = buildDomainId("professionalProfile", "seed_alfa");
export const SEED_PROF_BETA_ID = buildDomainId("professionalProfile", "seed_beta");

// ---- Credentials -----------------------------------------------------------
export const SEED_CRED_ALFA_ID = buildDomainId("credential", "seed_alfa");
export const SEED_CRED_BETA_ID = buildDomainId("credential", "seed_beta");

// ---- Cases -----------------------------------------------------------------
export const SEED_CASE_ALFA_1_ID = buildDomainId("case", "seed_alfa_1");
export const SEED_CASE_ALFA_2_ID = buildDomainId("case", "seed_alfa_2");
export const SEED_CASE_ALFA_3_ID = buildDomainId("case", "seed_alfa_3");
export const SEED_CASE_BETA_1_ID = buildDomainId("case", "seed_beta_1");
export const SEED_CASE_BETA_2_ID = buildDomainId("case", "seed_beta_2");
export const SEED_CASE_BETA_3_ID = buildDomainId("case", "seed_beta_3");

// ---- Persons ---------------------------------------------------------------
export const SEED_PERSON_ALFA_1_ID = buildDomainId("person", "seed_alfa_1");
export const SEED_PERSON_ALFA_2_ID = buildDomainId("person", "seed_alfa_2");
export const SEED_PERSON_BETA_1_ID = buildDomainId("person", "seed_beta_1");
export const SEED_PERSON_BETA_2_ID = buildDomainId("person", "seed_beta_2");

// ---- CasePersons -----------------------------------------------------------
export const SEED_CP_ALFA_1_ID = buildDomainId("casePerson", "seed_alfa_1");
export const SEED_CP_ALFA_2_ID = buildDomainId("casePerson", "seed_alfa_2");
export const SEED_CP_BETA_1_ID = buildDomainId("casePerson", "seed_beta_1");

// ---- Relationships ---------------------------------------------------------
export const SEED_REL_ALFA_1_ID = buildDomainId("relationship", "seed_alfa_1");

// ---- Assignments -----------------------------------------------------------
export const SEED_ASSIGN_ALFA_1_ID = buildDomainId("assignment", "seed_alfa_1");
export const SEED_ASSIGN_BETA_1_ID = buildDomainId("assignment", "seed_beta_1");

// ---- Builder ---------------------------------------------------------------

export function buildSeedSnapshot(): MockDomainSnapshot {
  const meta = metaAt(T0);

  const organizations: Organization[] = [
    {
      id: SEED_ORG_ALFA_ID,
      kind: "individual",
      displayName: "Organização Demonstração Alfa",
      status: "active",
      metadata: meta,
    },
    {
      id: SEED_ORG_BETA_ID,
      kind: "equipe",
      displayName: "Organização Demonstração Beta",
      status: "active",
      metadata: meta,
    },
  ];

  const users: User[] = [
    {
      id: SEED_USER_1_ID,
      status: "active",
      displayLabel: "Usuário Demonstração 1",
      metadata: meta,
    },
    {
      id: SEED_USER_2_ID,
      status: "active",
      displayLabel: "Usuário Demonstração 2",
      metadata: meta,
    },
    {
      id: SEED_USER_3_ID,
      status: "active",
      displayLabel: "Usuário Demonstração 3",
      metadata: meta,
    },
  ];

  const memberships: Membership[] = [
    {
      id: SEED_MEM_ALFA_OWNER_ID,
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_1_ID,
      role: "proprietario",
      status: "active",
      metadata: meta,
    },
    {
      id: SEED_MEM_ALFA_SUSPENDED_ID,
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_2_ID,
      role: "colaborador",
      status: "suspended",
      metadata: meta,
    },
    {
      id: SEED_MEM_BETA_OWNER_ID,
      organizationId: SEED_ORG_BETA_ID,
      userId: SEED_USER_2_ID,
      role: "proprietario",
      status: "active",
      metadata: meta,
    },
    {
      id: SEED_MEM_BETA_PROF_ID,
      organizationId: SEED_ORG_BETA_ID,
      userId: SEED_USER_3_ID,
      role: "profissional",
      status: "active",
      metadata: meta,
    },
  ];

  const professionalProfiles: ProfessionalProfile[] = [
    {
      id: SEED_PROF_ALFA_ID,
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_1_ID,
      area: "psicologia",
      status: "active",
      metadata: meta,
    },
    {
      id: SEED_PROF_BETA_ID,
      organizationId: SEED_ORG_BETA_ID,
      userId: SEED_USER_3_ID,
      area: "servico-social",
      status: "active",
      metadata: meta,
    },
  ];

  const credentials: Credential[] = [
    {
      id: SEED_CRED_ALFA_ID,
      organizationId: SEED_ORG_ALFA_ID,
      professionalProfileId: SEED_PROF_ALFA_ID,
      status: "verified",
      metadata: meta,
    },
    {
      id: SEED_CRED_BETA_ID,
      organizationId: SEED_ORG_BETA_ID,
      professionalProfileId: SEED_PROF_BETA_ID,
      status: "pending",
      metadata: meta,
    },
  ];

  const cases: Case[] = [
    {
      id: SEED_CASE_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      reference: "REF-ALFA-001",
      title: "Caso Demonstração Alfa 001",
      status: "draft",
      confidentiality: "standard",
      conflictCheck: "not_reviewed",
      objectDefined: false,
      deadlineStatus: "not_reviewed",
      metadata: meta,
    },
    {
      id: SEED_CASE_ALFA_2_ID,
      organizationId: SEED_ORG_ALFA_ID,
      reference: "REF-ALFA-002",
      title: "Caso Demonstração Alfa 002",
      status: "active",
      confidentiality: "restricted",
      conflictCheck: "no_conflict",
      objectDefined: true,
      deadlineStatus: "reviewed",
      metadata: meta,
    },
    {
      id: SEED_CASE_ALFA_3_ID,
      organizationId: SEED_ORG_ALFA_ID,
      reference: "REF-ALFA-003",
      title: "Caso Demonstração Alfa 003",
      status: "completed",
      confidentiality: "high",
      conflictCheck: "no_conflict",
      objectDefined: true,
      deadlineStatus: "reviewed",
      metadata: meta,
    },
    {
      id: SEED_CASE_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      reference: "REF-BETA-001",
      title: "Caso Demonstração Beta 001",
      status: "draft",
      confidentiality: "standard",
      conflictCheck: "not_reviewed",
      objectDefined: false,
      deadlineStatus: "not_reviewed",
      metadata: meta,
    },
    {
      id: SEED_CASE_BETA_2_ID,
      organizationId: SEED_ORG_BETA_ID,
      reference: "REF-BETA-002",
      title: "Caso Demonstração Beta 002",
      status: "triage",
      confidentiality: "restricted",
      conflictCheck: "no_conflict",
      objectDefined: true,
      deadlineStatus: "reviewed",
      metadata: meta,
    },
    {
      id: SEED_CASE_BETA_3_ID,
      organizationId: SEED_ORG_BETA_ID,
      reference: "REF-BETA-003",
      title: "Caso Demonstração Beta 003",
      status: "drafting",
      confidentiality: "standard",
      conflictCheck: "no_conflict",
      objectDefined: true,
      deadlineStatus: "reviewed",
      metadata: meta,
    },
  ];

  const persons: Person[] = [
    {
      id: SEED_PERSON_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      displayLabel: "Pessoa Alfa 1",
      ageClassification: "adult",
      metadata: meta,
    },
    {
      id: SEED_PERSON_ALFA_2_ID,
      organizationId: SEED_ORG_ALFA_ID,
      displayLabel: "Pessoa Alfa 2",
      ageClassification: "adolescent",
      metadata: meta,
    },
    {
      id: SEED_PERSON_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      displayLabel: "Pessoa Beta 1",
      ageClassification: "adult",
      metadata: meta,
    },
    {
      id: SEED_PERSON_BETA_2_ID,
      organizationId: SEED_ORG_BETA_ID,
      displayLabel: "Pessoa Beta 2",
      ageClassification: "child",
      metadata: meta,
    },
  ];

  const casePersons: CasePerson[] = [
    {
      id: SEED_CP_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      personId: SEED_PERSON_ALFA_1_ID,
      role: "applicant",
      restrictedByDefault: false,
      metadata: meta,
    },
    {
      id: SEED_CP_ALFA_2_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      personId: SEED_PERSON_ALFA_2_ID,
      role: "child_or_adolescent",
      restrictedByDefault: true,
      metadata: meta,
    },
    {
      id: SEED_CP_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      caseId: SEED_CASE_BETA_2_ID,
      personId: SEED_PERSON_BETA_1_ID,
      role: "respondent",
      restrictedByDefault: false,
      metadata: meta,
    },
  ];

  const relationships: Relationship[] = [
    {
      id: SEED_REL_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      fromPersonId: SEED_PERSON_ALFA_1_ID,
      toPersonId: SEED_PERSON_ALFA_2_ID,
      type: "parent_child",
      metadata: meta,
    },
  ];

  const assignments: Assignment[] = [
    {
      id: SEED_ASSIGN_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      professionalProfileId: SEED_PROF_ALFA_ID,
      role: "lead_professional",
      status: "active",
      startedOn: D0,
      metadata: meta,
    },
    {
      id: SEED_ASSIGN_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      caseId: SEED_CASE_BETA_2_ID,
      professionalProfileId: SEED_PROF_BETA_ID,
      role: "co_professional",
      status: "active",
      startedOn: D0,
      metadata: meta,
    },
  ];

  return {
    organizations,
    users,
    memberships,
    professionalProfiles,
    credentials,
    cases,
    persons,
    casePersons,
    relationships,
    assignments,
  };
}

// ---- Validação -------------------------------------------------------------

export type SeedValidationIssue = Readonly<{
  entity: string;
  id: string;
  reason: string;
}>;

export function validateMockDomainSeed(
  seed: MockDomainSnapshot,
): readonly SeedValidationIssue[] {
  const issues: SeedValidationIssue[] = [];

  if (containsForbiddenKey(seed)) {
    issues.push({ entity: "seed", id: "-", reason: "forbidden_key" });
    return issues;
  }

  const dup = <T extends { id: string }>(
    entity: string,
    items: readonly T[],
  ): void => {
    const seen = new Set<string>();
    for (const it of items) {
      if (seen.has(it.id)) issues.push({ entity, id: it.id, reason: "duplicate_id" });
      seen.add(it.id);
    }
  };

  dup("organization", seed.organizations);
  dup("user", seed.users);
  dup("membership", seed.memberships);
  dup("professionalProfile", seed.professionalProfiles);
  dup("credential", seed.credentials);
  dup("case", seed.cases);
  dup("person", seed.persons);
  dup("casePerson", seed.casePersons);
  dup("relationship", seed.relationships);
  dup("assignment", seed.assignments);

  for (const o of seed.organizations) {
    const r = validateOrganization(o);
    if (!r.ok) issues.push({ entity: "organization", id: o.id, reason: r.reason });
  }
  for (const u of seed.users) {
    const r = validateUser(u);
    if (!r.ok) issues.push({ entity: "user", id: u.id, reason: r.reason });
  }
  for (const m of seed.memberships) {
    const r = validateMembership(m, {
      users: seed.users,
      organizations: seed.organizations,
    });
    if (!r.ok) issues.push({ entity: "membership", id: m.id, reason: r.reason });
  }
  for (const p of seed.professionalProfiles) {
    const r = validateProfessionalProfile(p);
    if (!r.ok) issues.push({ entity: "professionalProfile", id: p.id, reason: r.reason });
  }
  for (const c of seed.credentials) {
    const r = validateCredential(c, {
      professionalProfiles: seed.professionalProfiles,
    });
    if (!r.ok) issues.push({ entity: "credential", id: c.id, reason: r.reason });
  }
  for (const c of seed.cases) {
    const r = validateCase(c);
    if (!r.ok) issues.push({ entity: "case", id: c.id, reason: r.reason });
  }
  for (const p of seed.persons) {
    const r = validatePerson(p);
    if (!r.ok) issues.push({ entity: "person", id: p.id, reason: r.reason });
  }
  for (const cp of seed.casePersons) {
    const r = validateCasePerson(cp, {
      cases: seed.cases,
      persons: seed.persons,
    });
    if (!r.ok) issues.push({ entity: "casePerson", id: cp.id, reason: r.reason });
  }
  for (const rel of seed.relationships) {
    const r = validateRelationship(rel, {
      cases: seed.cases,
      persons: seed.persons,
    });
    if (!r.ok) issues.push({ entity: "relationship", id: rel.id, reason: r.reason });
  }
  for (const a of seed.assignments) {
    const r = validateAssignment(a, {
      cases: seed.cases,
      professionalProfiles: seed.professionalProfiles,
    });
    if (!r.ok) issues.push({ entity: "assignment", id: a.id, reason: r.reason });
  }

  return issues;
}
