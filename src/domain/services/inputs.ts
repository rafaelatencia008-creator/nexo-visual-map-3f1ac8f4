/**
 * DTOs de entrada — separados das entidades persistidas.
 *
 * Nenhum DTO permite `id`, `organizationId`, `metadata`, `createdAt`,
 * `updatedAt` ou `version`. `expectedVersion` aparece somente em DTOs de
 * atualização de entidades persistíveis, preparando concorrência otimista.
 * Não inclui PII (CPF, CNPJ, e-mail, telefone, endereço, número CNJ etc.).
 */

import type {
  AssignmentId,
  CaseId,
  CasePersonId,
  CredentialId,
  MembershipId,
  PersonId,
  ProfessionalProfileId,
  RelationshipId,
  UserId,
} from "../core/ids";
import type {
  CaseStatus,
  ConfidentialityLevel,
  ConflictCheckStatus,
  DeadlineStatus,
} from "../core/case";
import type { AgeClassification } from "../core/person";
import type {
  AssignmentRole,
  AssignmentStatus,
  CasePersonRole,
  RelationshipType,
} from "../core/assignment";
import type {
  CredentialStatus,
  ProfessionalStatus,
} from "../core/professional";
import type { MembershipStatus } from "../core/access";
import type { OrganizationStatus } from "../core/organization";
import type { IsoDate } from "../core/common";
import type { Perfil, Role, WorkMode } from "../shared/work-context";

// ---- Organization ----------------------------------------------------------

export type UpdateOrganizationInput = Readonly<{
  displayName?: string;
  kind?: WorkMode;
  status?: OrganizationStatus;
  expectedVersion: number;
}>;

// ---- Membership ------------------------------------------------------------

export type CreateMembershipInput = Readonly<{
  userId: UserId;
  role: Role;
}>;

export type ChangeMembershipRoleInput = Readonly<{
  membershipId: MembershipId;
  role: Role;
  expectedVersion: number;
}>;

export type ChangeMembershipStatusInput = Readonly<{
  membershipId: MembershipId;
  status: MembershipStatus;
  expectedVersion: number;
}>;

export type MembershipFilter = Readonly<{
  roles?: readonly Role[];
  statuses?: readonly MembershipStatus[];
}>;

// ---- ProfessionalProfile ---------------------------------------------------

export type CreateProfessionalProfileInput = Readonly<{
  userId: UserId;
  area: Perfil;
}>;

export type UpdateProfessionalProfileInput = Readonly<{
  area?: Perfil;
  status?: ProfessionalStatus;
  expectedVersion: number;
}>;

export type ProfessionalProfileFilter = Readonly<{
  areas?: readonly Perfil[];
  statuses?: readonly ProfessionalStatus[];
}>;

// ---- Credential ------------------------------------------------------------

export type CreateCredentialInput = Readonly<{
  professionalProfileId: ProfessionalProfileId;
}>;

export type UpdateCredentialStatusInput = Readonly<{
  credentialId: CredentialId;
  status: CredentialStatus;
  expectedVersion: number;
}>;

// ---- Case ------------------------------------------------------------------

export type CreateCaseInput = Readonly<{
  reference: string;
  title: string;
  confidentiality: ConfidentialityLevel;
}>;

export type UpdateCaseInput = Readonly<{
  title?: string;
  confidentiality?: ConfidentialityLevel;
  objectDefined?: boolean;
  deadlineStatus?: DeadlineStatus;
  conflictCheck?: ConflictCheckStatus;
  expectedVersion: number;
}>;

export type ChangeCaseStatusInput = Readonly<{
  caseId: CaseId;
  status: CaseStatus;
  expectedVersion: number;
}>;

export type CaseFilter = Readonly<{
  statuses?: readonly CaseStatus[];
  confidentiality?: readonly ConfidentialityLevel[];
  search?: string;
}>;

export const CASE_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "title",
  "reference",
  "status",
] as const;
export type CaseSortField = (typeof CASE_SORT_FIELDS)[number];

// ---- Person ----------------------------------------------------------------

export type CreatePersonInput = Readonly<{
  displayLabel: string;
  ageClassification: AgeClassification;
}>;

export type UpdatePersonInput = Readonly<{
  displayLabel?: string;
  ageClassification?: AgeClassification;
  expectedVersion: number;
}>;

export type PersonFilter = Readonly<{
  ageClassifications?: readonly AgeClassification[];
  search?: string;
}>;

// ---- CasePerson ------------------------------------------------------------

export type CreateCasePersonInput = Readonly<{
  caseId: CaseId;
  personId: PersonId;
  role: CasePersonRole;
  restrictedByDefault: boolean;
}>;

export type UpdateCasePersonInput = Readonly<{
  casePersonId: CasePersonId;
  role?: CasePersonRole;
  restrictedByDefault?: boolean;
  expectedVersion: number;
}>;

// ---- Relationship ----------------------------------------------------------

export type CreateRelationshipInput = Readonly<{
  caseId: CaseId;
  fromPersonId: PersonId;
  toPersonId: PersonId;
  type: RelationshipType;
}>;

export type UpdateRelationshipInput = Readonly<{
  relationshipId: RelationshipId;
  type?: RelationshipType;
  expectedVersion: number;
}>;

// ---- Assignment ------------------------------------------------------------

export type CreateAssignmentInput = Readonly<{
  caseId: CaseId;
  professionalProfileId: ProfessionalProfileId;
  role: AssignmentRole;
  startedOn: IsoDate;
  section?: string;
}>;

export type UpdateAssignmentInput = Readonly<{
  assignmentId: AssignmentId;
  role?: AssignmentRole;
  section?: string;
  endedOn?: IsoDate;
  expectedVersion: number;
}>;

export type ChangeAssignmentStatusInput = Readonly<{
  assignmentId: AssignmentId;
  status: AssignmentStatus;
  expectedVersion: number;
}>;
