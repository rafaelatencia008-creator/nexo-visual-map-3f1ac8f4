/**
 * Fixtures mínimas — servem SOMENTE para testes de contrato do domínio.
 *
 * NÃO usam CPF/CNPJ/telefone/e-mail/nome real. Nenhum dado real de menores.
 * Nenhum ID aleatório: todos determinísticos.
 *
 * Estes fixtures NÃO alimentam as telas — as telas continuam usando
 * `src/lib/mock/data.ts` até LV-07.3/LV-08.
 */

import { buildDomainId } from "./ids";
import type {
  AssignmentId,
  CaseId,
  CasePersonId,
  MembershipId,
  OrganizationId,
  PersonId,
  ProfessionalProfileId,
  RelationshipId,
  UserId,
} from "./ids";
import type { EntityMetadata, IsoDate, IsoDateTime } from "./common";
import type { Organization } from "./organization";
import type { ProfessionalProfile } from "./professional";
import type { Case } from "./case";
import type { Person } from "./person";
import type { Assignment, CasePerson, Relationship } from "./assignment";

// Timestamps fixos — nunca gerados em runtime.
const T0 = "2026-01-01T00:00:00.000Z" as IsoDateTime;
const D0 = "2026-01-01" as IsoDate;

const meta = (): EntityMetadata => ({
  createdAt: T0,
  updatedAt: T0,
  version: 1,
});

// ---- Organizações ----------------------------------------------------------

export const ORG_INDIVIDUAL_ID = buildDomainId("organization", "demo_individual") as OrganizationId;
export const ORG_TEAM_ID = buildDomainId("organization", "demo_team") as OrganizationId;

export const orgIndividualFixture: Organization = {
  id: ORG_INDIVIDUAL_ID,
  kind: "individual",
  displayName: "Organização de demonstração — individual",
  status: "active",
  metadata: meta(),
};

export const orgTeamFixture: Organization = {
  id: ORG_TEAM_ID,
  kind: "team",
  displayName: "Organização de demonstração — equipe",
  status: "active",
  metadata: meta(),
};

// ---- Usuário e membership --------------------------------------------------

export const USER_ID = buildDomainId("user", "demo_neutral") as UserId;
export const MEMBERSHIP_ID = buildDomainId("membership", "demo_001") as MembershipId;

// ---- Perfil profissional ---------------------------------------------------

export const PROF_ID = buildDomainId("professionalProfile", "demo_001") as ProfessionalProfileId;

export const professionalProfileFixture: ProfessionalProfile = {
  id: PROF_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  userId: USER_ID,
  area: "psychology",
  status: "active",
  metadata: meta(),
};

// ---- Casos -----------------------------------------------------------------

export const CASE_001_ID = buildDomainId("case", "demo_001") as CaseId;
export const CASE_002_ID = buildDomainId("case", "demo_002") as CaseId;

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

export const PERSON_A_ID = buildDomainId("person", "demo_A") as PersonId;
export const PERSON_B_ID = buildDomainId("person", "demo_B") as PersonId;
export const PERSON_C_ID = buildDomainId("person", "demo_C") as PersonId;

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

export const CASE_PERSON_A_ID = buildDomainId("casePerson", "demo_A") as CasePersonId;
export const CASE_PERSON_B_ID = buildDomainId("casePerson", "demo_B") as CasePersonId;
export const CASE_PERSON_C_ID = buildDomainId("casePerson", "demo_C") as CasePersonId;

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
  restrictedByDefault: true, // menor → obrigatório
  metadata: meta(),
};

export const RELATIONSHIP_ID = buildDomainId("relationship", "demo_001") as RelationshipId;

export const relationshipFixture: Relationship = {
  id: RELATIONSHIP_ID,
  organizationId: ORG_INDIVIDUAL_ID,
  caseId: CASE_002_ID,
  fromPersonId: PERSON_A_ID,
  toPersonId: PERSON_C_ID,
  type: "parent_child",
  metadata: meta(),
};

export const ASSIGNMENT_ID = buildDomainId("assignment", "demo_001") as AssignmentId;

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
  professionalProfiles: [professionalProfileFixture] as const,
  cases: [case001Fixture, case002Fixture] as const,
  persons: [personAFixture, personBFixture, personCFixture] as const,
  casePersons: [casePersonAFixture, casePersonBFixture, casePersonCFixture] as const,
  relationships: [relationshipFixture] as const,
  assignments: [assignmentFixture] as const,
} as const;

// Placeholder para chaves que os testes vão procurar — devem ser undefined.
export const FIXTURES_PII_PROBE: Record<string, undefined> = {};
