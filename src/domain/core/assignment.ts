/**
 * Vínculos: CasePerson, Relationship, Assignment.
 */

import {
  isAssignmentId,
  isCaseId,
  isCasePersonId,
  isOrganizationId,
  isPersonId,
  isProfessionalProfileId,
  isRelationshipId,
  type AssignmentId,
  type CaseId,
  type CasePersonId,
  type OrganizationId,
  type PersonId,
  type ProfessionalProfileId,
  type RelationshipId,
} from "./ids";
import {
  isEntityMetadata,
  hasOnlyAllowedKeys,
  isIsoDate,
  type EntityMetadata,
  type IsoDate,
} from "./common";

// ---- CasePerson ------------------------------------------------------------

export const CASE_PERSON_ROLES = [
  "evaluated_person",
  "child_or_adolescent",
  "parent",
  "guardian",
  "applicant",
  "respondent",
  "witness",
  "informant",
  "technical_contact",
  "other",
] as const;
export type CasePersonRole = (typeof CASE_PERSON_ROLES)[number];

export type CasePerson = {
  id: CasePersonId;
  organizationId: OrganizationId;
  caseId: CaseId;
  personId: PersonId;
  role: CasePersonRole;
  restrictedByDefault: boolean;
  metadata: EntityMetadata;
};

const ROLE_SET = new Set<string>(CASE_PERSON_ROLES);

export const CASE_PERSON_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "personId",
  "role",
  "restrictedByDefault",
  "metadata",
]);

export function isCasePerson(v: unknown): v is CasePerson {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_PERSON_ALLOWED_KEYS)) return false;
  const cp = v as Record<string, unknown>;
  return (
    isCasePersonId(cp.id) &&
    isOrganizationId(cp.organizationId) &&
    isCaseId(cp.caseId) &&
    isPersonId(cp.personId) &&
    typeof cp.role === "string" &&
    ROLE_SET.has(cp.role) &&
    typeof cp.restrictedByDefault === "boolean" &&
    isEntityMetadata(cp.metadata)
  );
}

// ---- Relationship ----------------------------------------------------------

export const RELATIONSHIP_TYPES = [
  "parent_child",
  "spouse",
  "former_spouse",
  "guardian",
  "sibling",
  "extended_family",
  "affective_bond",
  "professional",
  "other",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type Relationship = {
  id: RelationshipId;
  organizationId: OrganizationId;
  caseId: CaseId;
  fromPersonId: PersonId;
  toPersonId: PersonId;
  type: RelationshipType;
  metadata: EntityMetadata;
};

const REL_SET = new Set<string>(RELATIONSHIP_TYPES);

export const RELATIONSHIP_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "fromPersonId",
  "toPersonId",
  "type",
  "metadata",
]);

export function isRelationship(v: unknown): v is Relationship {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, RELATIONSHIP_ALLOWED_KEYS)) return false;
  const r = v as Record<string, unknown>;
  return (
    isRelationshipId(r.id) &&
    isOrganizationId(r.organizationId) &&
    isCaseId(r.caseId) &&
    isPersonId(r.fromPersonId) &&
    isPersonId(r.toPersonId) &&
    r.fromPersonId !== r.toPersonId &&
    typeof r.type === "string" &&
    REL_SET.has(r.type) &&
    isEntityMetadata(r.metadata)
  );
}

// ---- Assignment ------------------------------------------------------------

export const ASSIGNMENT_ROLES = [
  "lead_professional",
  "co_professional",
  "reviewer",
  "collaborator",
  "read_only",
] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export const ASSIGNMENT_STATUSES = ["active", "suspended", "concluded", "cancelled"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export type Assignment = {
  id: AssignmentId;
  organizationId: OrganizationId;
  caseId: CaseId;
  professionalProfileId: ProfessionalProfileId;
  role: AssignmentRole;
  status: AssignmentStatus;
  section?: string;
  startedOn: IsoDate;
  endedOn?: IsoDate;
  metadata: EntityMetadata;
};

const ASSIGN_ROLE_SET = new Set<string>(ASSIGNMENT_ROLES);
const ASSIGN_STATUS_SET = new Set<string>(ASSIGNMENT_STATUSES);

export const ASSIGNMENT_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "professionalProfileId",
  "role",
  "status",
  "section",
  "startedOn",
  "endedOn",
  "metadata",
]);

export function isAssignment(v: unknown): v is Assignment {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, ASSIGNMENT_ALLOWED_KEYS)) return false;
  const a = v as Record<string, unknown>;
  if (!isAssignmentId(a.id)) return false;
  if (!isOrganizationId(a.organizationId)) return false;
  if (!isCaseId(a.caseId)) return false;
  if (!isProfessionalProfileId(a.professionalProfileId)) return false;
  if (typeof a.role !== "string" || !ASSIGN_ROLE_SET.has(a.role)) return false;
  if (typeof a.status !== "string" || !ASSIGN_STATUS_SET.has(a.status)) return false;
  if (a.section !== undefined && typeof a.section !== "string") return false;
  if (!isIsoDate(a.startedOn)) return false;
  if (a.endedOn !== undefined && !isIsoDate(a.endedOn)) return false;
  if (!isEntityMetadata(a.metadata)) return false;
  return true;
}
