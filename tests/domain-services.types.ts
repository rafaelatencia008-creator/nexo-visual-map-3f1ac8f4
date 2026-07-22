/**
 * Testes de tipo do domínio de serviços (LV-07.2.1).
 *
 * Este arquivo é incluído no `tsc --noEmit` via `tsconfig.json`.
 * NÃO executa nada em runtime — não importa `bun:test`, não usa `describe`,
 * `it`, `expect`, mocks nem estado. Todas as garantias são verificadas
 * pelo TypeScript em tempo de compilação, usando `satisfies` e
 * `@ts-expect-error`. Uma diretiva `@ts-expect-error` não utilizada é
 * ERRO — logo estas asserções são realmente verificadas.
 */

import {
  buildDomainId,
  type CaseId,
  type MembershipId,
  type PersonId,
  type ProfessionalProfileId,
  type IsoDate,
  type EntityMetadata,
} from "@/domain/core";
import type {
  ServiceContext,
  ServiceResult,
  PermissionRequest,
  CreateCaseInput,
  UpdateCaseInput,
  CreateCasePersonInput,
  CreateAssignmentInput,
  RevokeMembershipInput,
  ChangeAssignmentStatusInput,
  CaseListRequest,
  MembershipListRequest,
  AssignmentService,
  CaseReadinessIssue,
} from "@/domain/services";

// ----- Fixtures de tipos (não instanciadas em runtime real) ----------------

const ORG_ID = buildDomainId("org", "types");
const USER_ID = buildDomainId("user", "types");
const MEMBERSHIP_ID = buildDomainId("membership", "types") as MembershipId;
const CASE_ID = buildDomainId("case", "types") as CaseId;
const PERSON_ID = buildDomainId("person", "types") as PersonId;
const PROF_ID = buildDomainId("professionalProfile", "types") as ProfessionalProfileId;
const ASSIGNMENT_ID = buildDomainId("assignment", "types");
const STARTED_ON = "2026-01-01" as IsoDate;

// ==========================================================================
// T1 — ServiceContext exige organizationId
// ==========================================================================

const _ctxOk = {
  organizationId: ORG_ID,
  userId: USER_ID,
  membershipId: MEMBERSHIP_ID,
  role: "proprietario",
} satisfies ServiceContext;
void _ctxOk;

// @ts-expect-error — organizationId ausente
const _ctxNoOrg = {
  userId: USER_ID,
  membershipId: MEMBERSHIP_ID,
  role: "proprietario",
} satisfies ServiceContext;
void _ctxNoOrg;

// ==========================================================================
// T2 — ServiceContext exige membershipId
// ==========================================================================

// @ts-expect-error — membershipId ausente
const _ctxNoMembership = {
  organizationId: ORG_ID,
  userId: USER_ID,
  role: "proprietario",
} satisfies ServiceContext;
void _ctxNoMembership;

// ==========================================================================
// T3 — Papel inválido é rejeitado
// ==========================================================================

// @ts-expect-error — "chefe" não é um Role válido
const _ctxBadRole = {
  organizationId: ORG_ID,
  userId: USER_ID,
  membershipId: MEMBERSHIP_ID,
  role: "chefe",
} satisfies ServiceContext;
void _ctxBadRole;

// ==========================================================================
// T4 — PermissionRequest aceita ação catalogada
// ==========================================================================

const _permOk = {
  action: "case.read",
  caseId: CASE_ID,
} satisfies PermissionRequest;
void _permOk;

// ==========================================================================
// T5 — PermissionRequest rejeita ação inválida
// ==========================================================================

// @ts-expect-error — "invalid.action" não pertence a PERMISSION_ACTIONS
const _permBadAction = {
  action: "invalid.action",
} satisfies PermissionRequest;
void _permBadAction;

// ==========================================================================
// T6 — PermissionRequest rejeita string livre em caseId
// ==========================================================================

// @ts-expect-error — string livre não é CaseId branded
const _permBadCaseId = {
  action: "case.read",
  caseId: "not_branded",
} satisfies PermissionRequest;
void _permBadCaseId;

// ==========================================================================
// T7-T9 — CreateCaseInput rejeita id, organizationId e metadata
// ==========================================================================

const _createCaseOk = {
  reference: "REF-1",
  title: "T",
  confidentiality: "standard",
} satisfies CreateCaseInput;
void _createCaseOk;

// @ts-expect-error — id proibido no DTO de criação
const _createCaseId = {
  reference: "REF-1",
  title: "T",
  confidentiality: "standard",
  id: CASE_ID,
} satisfies CreateCaseInput;
void _createCaseId;

// @ts-expect-error — organizationId proibido no DTO
const _createCaseOrg = {
  reference: "REF-1",
  title: "T",
  confidentiality: "standard",
  organizationId: ORG_ID,
} satisfies CreateCaseInput;
void _createCaseOrg;

const _fakeMeta = {
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
} as unknown as EntityMetadata;

// @ts-expect-error — metadata proibido no DTO
const _createCaseMeta = {
  reference: "REF-1",
  title: "T",
  confidentiality: "standard",
  metadata: _fakeMeta,
} satisfies CreateCaseInput;
void _createCaseMeta;

// ==========================================================================
// T10 — UpdateCaseInput exige expectedVersion
// ==========================================================================

const _updateOk = { title: "novo", expectedVersion: 1 } satisfies UpdateCaseInput;
void _updateOk;

// @ts-expect-error — expectedVersion é obrigatório
const _updateNoVersion = { title: "novo" } satisfies UpdateCaseInput;
void _updateNoVersion;

// ==========================================================================
// T11 — CreateCasePersonInput exige CaseId e PersonId branded
// ==========================================================================

const _createCpOk = {
  caseId: CASE_ID,
  personId: PERSON_ID,
  role: "evaluated_person",
  restrictedByDefault: false,
} satisfies CreateCasePersonInput;
void _createCpOk;

// @ts-expect-error — string livre em caseId
const _createCpBadCase = {
  caseId: "not_branded",
  personId: PERSON_ID,
  role: "evaluated_person",
  restrictedByDefault: false,
} satisfies CreateCasePersonInput;
void _createCpBadCase;

// @ts-expect-error — string livre em personId
const _createCpBadPerson = {
  caseId: CASE_ID,
  personId: "not_branded",
  role: "evaluated_person",
  restrictedByDefault: false,
} satisfies CreateCasePersonInput;
void _createCpBadPerson;

// ==========================================================================
// T12 — CreateAssignmentInput exige IDs branded e proíbe organizationId
// ==========================================================================

const _createAssignOk = {
  caseId: CASE_ID,
  professionalProfileId: PROF_ID,
  role: "lead_professional",
  startedOn: STARTED_ON,
} satisfies CreateAssignmentInput;
void _createAssignOk;

// @ts-expect-error — string livre em caseId
const _createAssignBadCase = {
  caseId: "not_branded",
  professionalProfileId: PROF_ID,
  role: "lead_professional",
  startedOn: STARTED_ON,
} satisfies CreateAssignmentInput;
void _createAssignBadCase;

// @ts-expect-error — organizationId proibido
const _createAssignOrg = {
  caseId: CASE_ID,
  professionalProfileId: PROF_ID,
  role: "lead_professional",
  startedOn: STARTED_ON,
  organizationId: ORG_ID,
} satisfies CreateAssignmentInput;
void _createAssignOrg;

// ==========================================================================
// T13 — RevokeMembershipInput exige expectedVersion
// ==========================================================================

const _revokeOk = {
  membershipId: MEMBERSHIP_ID,
  expectedVersion: 1,
} satisfies RevokeMembershipInput;
void _revokeOk;

// @ts-expect-error — expectedVersion é obrigatório em RevokeMembershipInput
const _revokeNoVersion = {
  membershipId: MEMBERSHIP_ID,
} satisfies RevokeMembershipInput;
void _revokeNoVersion;

// @ts-expect-error — status não pertence ao DTO de revogação
const _revokeStatus = {
  membershipId: MEMBERSHIP_ID,
  expectedVersion: 1,
  status: "revoked",
} satisfies RevokeMembershipInput;
void _revokeStatus;

// ==========================================================================
// T14 — AssignmentService.changeStatus exige caseId como argumento explícito
// ==========================================================================

type ChangeStatusParams = Parameters<AssignmentService["changeStatus"]>;
type ChangeStatusReturn = ReturnType<AssignmentService["changeStatus"]>;

// A assinatura passa a ser (context, caseId, input)
const _paramsProof: ChangeStatusParams = [
  {
    organizationId: ORG_ID,
    userId: USER_ID,
    membershipId: MEMBERSHIP_ID,
    role: "proprietario",
  },
  CASE_ID,
  {
    assignmentId: ASSIGNMENT_ID,
    status: "active",
    expectedVersion: 1,
  } satisfies ChangeAssignmentStatusInput,
];
void _paramsProof;

// O retorno é Promise<ServiceResult<T>>
type _AsyncResult = ChangeStatusReturn extends Promise<ServiceResult<unknown>>
  ? true
  : false;
const _asyncProof: _AsyncResult = true;
void _asyncProof;

// ==========================================================================
// T15 — CaseReadinessIssue rejeita string arbitrária
// ==========================================================================

const _issueOk: CaseReadinessIssue = "objectDefined";
void _issueOk;

// @ts-expect-error — string arbitrária não é um CaseReadinessIssue
const _issueBad: CaseReadinessIssue = "qualquer_coisa";
void _issueBad;

// ==========================================================================
// T16 — filtros rejeitam status não catalogado
// ==========================================================================

// @ts-expect-error — "not_a_status" não é CaseStatus
const _filterBad = {
  filter: { statuses: ["not_a_status"] },
  page: { limit: 10 },
} satisfies CaseListRequest;
void _filterBad;

// ==========================================================================
// T17 — campos de ordenação rejeitam string livre
// ==========================================================================

// @ts-expect-error — sortBy é limitado a CASE_SORT_FIELDS
const _sortBad = {
  page: { limit: 10 },
  sortBy: "anything",
} satisfies CaseListRequest;
void _sortBad;

// @ts-expect-error — sortBy de MembershipListRequest é limitado a MEMBERSHIP_SORT_FIELDS
const _sortMembershipBad = {
  page: { limit: 10 },
  sortBy: "não_existe",
} satisfies MembershipListRequest;
void _sortMembershipBad;

// ==========================================================================
// T18 — métodos não aceitam chamada sem contexto
// ==========================================================================

declare const assignmentService: AssignmentService;

// Chamada correta
void assignmentService.changeStatus(
  {
    organizationId: ORG_ID,
    userId: USER_ID,
    membershipId: MEMBERSHIP_ID,
    role: "proprietario",
  },
  CASE_ID,
  { assignmentId: ASSIGNMENT_ID, status: "active", expectedVersion: 1 },
);

// @ts-expect-error — chamada sem contexto
void assignmentService.changeStatus(CASE_ID, {
  assignmentId: ASSIGNMENT_ID,
  status: "active",
  expectedVersion: 1,
});

// @ts-expect-error — chamada sem caseId (string livre)
void assignmentService.changeStatus(
  {
    organizationId: ORG_ID,
    userId: USER_ID,
    membershipId: MEMBERSHIP_ID,
    role: "proprietario",
  },
  "not_branded",
  { assignmentId: ASSIGNMENT_ID, status: "active", expectedVersion: 1 },
);

// ==========================================================================
// T19 — retornos são Promise<ServiceResult<T>>
// ==========================================================================

type _GetByIdReturn = ReturnType<AssignmentService["getById"]>;
type _IsPromiseServiceResult = _GetByIdReturn extends Promise<
  ServiceResult<unknown>
>
  ? true
  : false;
const _promiseProof: _IsPromiseServiceResult = true;
void _promiseProof;

// ==========================================================================
// T20 — nenhum comando de criação aceita organizationId
// ==========================================================================

// @ts-expect-error — CreateCasePersonInput não aceita organizationId
const _cpOrg = {
  caseId: CASE_ID,
  personId: PERSON_ID,
  role: "evaluated_person",
  restrictedByDefault: false,
  organizationId: ORG_ID,
} satisfies CreateCasePersonInput;
void _cpOrg;
