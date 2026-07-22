/**
 * Fixtures mínimas para testes de contrato. Sem PII. IDs determinísticos.
 * Timestamps fixos. Não alimentam telas.
 */

import { buildDomainId } from "./ids";
import type { EntityMetadata, IsoDate, IsoDateTime } from "./common";
import type { Organization } from "./organization";
import type { ProfessionalProfile, Credential } from "./professional";
import type { Case } from "./case";
import type { Person } from "./person";
import type { Assignment, CasePerson, Relationship } from "./assignment";
import type { User, Membership } from "./access";

const T0 = "2026-01-01T00:00:00.000Z" as IsoDateTime;
const D0 = "2026-01-01" as IsoDate;

const meta = (): EntityMetadata => ({ createdAt: T0, updatedAt: T0, version: 1 });

// ---- Organizações ----------------------------------------------------------

export const ORG_INDIVIDUAL_ID = buildDomainId("organization", "demo_individual");
export const ORG_TEAM_ID = buildDomainId("organization", "demo_team");

export const orgIndividualFixture: Organization = {
  id: ORG_INDIVIDUAL_ID,
  kind: "individual",
  displayName: "Organização de demonstração — individual",
  status: "active",
  metadata: meta(),
};

export const orgTeamFixture: Organization = {
  id: ORG_TEAM_ID,
  kind: "equipe",
  displayName: "Organização de demonstração — equipe",
  status: "active",
  metadata: meta(),
};

// ---- User e Membership -----------------------------------------------------

export const USER_ID = buildDomainId("user", "demo_neutral");
export const MEMBERSHIP_ID = buildDomainId("membership", "demo_001");

export const userFixture: User = {
  id: USER_ID,
  status: "active",
  displayLabel: "Usuário neutro de demonstração",
  metadata: meta(),
};

export const membershipFixture: Membership = {
  id: MEMBERSHIP_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  userId: USER_ID,
  role: "proprietario",
  status: "active",
  metadata: meta(),
};

// ---- Perfil profissional ---------------------------------------------------

export const PROF_ID = buildDomainId("professionalProfile", "demo_001");

export const professionalProfileFixture: ProfessionalProfile = {
  id: PROF_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  userId: USER_ID,
  area: "psicologia",
  status: "active",
  metadata: meta(),
};

// ---- Credential ------------------------------------------------------------

export const CREDENTIAL_ID = buildDomainId("credential", "demo_001");

export const credentialFixture: Credential = {
  id: CREDENTIAL_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  professionalProfileId: PROF_ID,
  status: "not_informed",
  metadata: meta(),
};

// ---- Casos -----------------------------------------------------------------

export const CASE_001_ID = buildDomainId("case", "demo_001");
export const CASE_002_ID = buildDomainId("case", "demo_002");

export const case001Fixture: Case = {
  id: CASE_001_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  reference: "Caso de demonstração 001",
  title: "Caso fictício de triagem",
  status: "draft",
  confidentiality: "standard",
  conflictCheck: "not_reviewed",
  objectDefined: false,
  deadlineStatus: "not_reviewed",
  metadata: meta(),
};

export const case002Fixture: Case = {
  id: CASE_002_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  reference: "Caso de demonstração 002",
  title: "Caso fictício pronto para triagem",
  status: "draft",
  confidentiality: "restricted",
  conflictCheck: "no_conflict",
  objectDefined: true,
  deadlineStatus: "reviewed",
  metadata: meta(),
};

// ---- Pessoas ---------------------------------------------------------------

export const PERSON_A_ID = buildDomainId("person", "demo_A");
export const PERSON_B_ID = buildDomainId("person", "demo_B");
export const PERSON_C_ID = buildDomainId("person", "demo_C");

export const personAFixture: Person = {
  id: PERSON_A_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  displayLabel: "Pessoa A",
  ageClassification: "adult",
  metadata: meta(),
};

export const personBFixture: Person = {
  id: PERSON_B_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  displayLabel: "Pessoa B",
  ageClassification: "adult",
  metadata: meta(),
};

export const personCFixture: Person = {
  id: PERSON_C_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  displayLabel: "Pessoa C",
  ageClassification: "child",
  metadata: meta(),
};

// ---- Vínculos --------------------------------------------------------------

export const CASE_PERSON_A_ID = buildDomainId("casePerson", "demo_A");
export const CASE_PERSON_B_ID = buildDomainId("casePerson", "demo_B");
export const CASE_PERSON_C_ID = buildDomainId("casePerson", "demo_C");

export const casePersonAFixture: CasePerson = {
  id: CASE_PERSON_A_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  personId: PERSON_A_ID,
  role: "applicant",
  restrictedByDefault: false,
  metadata: meta(),
};

export const casePersonBFixture: CasePerson = {
  id: CASE_PERSON_B_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  personId: PERSON_B_ID,
  role: "respondent",
  restrictedByDefault: false,
  metadata: meta(),
};

export const casePersonCFixture: CasePerson = {
  id: CASE_PERSON_C_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  personId: PERSON_C_ID,
  role: "child_or_adolescent",
  restrictedByDefault: true,
  metadata: meta(),
};

export const RELATIONSHIP_ID = buildDomainId("relationship", "demo_001");

export const relationshipFixture: Relationship = {
  id: RELATIONSHIP_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  fromPersonId: PERSON_A_ID,
  toPersonId: PERSON_C_ID,
  type: "parent_child",
  metadata: meta(),
};

export const ASSIGNMENT_ID = buildDomainId("assignment", "demo_001");

export const assignmentFixture: Assignment = {
  id: ASSIGNMENT_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  professionalProfileId: PROF_ID,
  role: "lead_professional",
  status: "active",
  startedOn: D0,
  metadata: meta(),
};

// ---- Coleções agregadas ----------------------------------------------------

export const DOMAIN_FIXTURES = {
  organizations: [orgIndividualFixture, orgTeamFixture] as const,
  users: [userFixture] as const,
  memberships: [membershipFixture] as const,
  professionalProfiles: [professionalProfileFixture] as const,
  credentials: [credentialFixture] as const,
  cases: [case001Fixture, case002Fixture] as const,
  persons: [personAFixture, personBFixture, personCFixture] as const,
  casePersons: [casePersonAFixture, casePersonBFixture, casePersonCFixture] as const,
  relationships: [relationshipFixture] as const,
  assignments: [assignmentFixture] as const,
} as const;
