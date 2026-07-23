/**
 * Catálogo central de identificadores do domínio — Nexo Pericial 360.
 *
 * IDs são strings *branded* para impedir troca entre `CaseId` e `PersonId`
 * em tempo de compilação. Em runtime a distinção é feita pelo prefixo.
 *
 * Nada aqui acessa localStorage, sessionStorage, window, document ou rede.
 */

// ---- Brand utilitário ------------------------------------------------------

type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

// ---- Prefixos oficiais -----------------------------------------------------

export const ID_PREFIX = {
  organization: "org_",
  user: "usr_",
  membership: "mem_",
  professionalProfile: "pro_",
  credential: "cre_",
  case: "case_",
  person: "person_",
  casePerson: "caseperson_",
  relationship: "rel_",
  assignment: "assign_",
  casePlanItem: "planItem_",
  caseTimelineEntry: "timelineEntry_",

  // Entidades reservadas — apenas catalogadas nesta microetapa.
  deadline: "deadline_",
  appointment: "appt_",
  communication: "comm_",
  sourceDocument: "srcdoc_",
  fileVersion: "filever_",
  interview: "interview_",
  recordingSession: "rec_",
  audioChunk: "audio_",
  transcript: "transcript_",
  transcriptSegment: "trseg_",
  copilotSuggestion: "copilot_",
  diligence: "diligence_",
  evidence: "evid_",
  question: "question_",
  questionAnswer: "answer_",
  analysisItem: "analysis_",
  contradiction: "contra_",
  gap: "gap_",
  package: "pack_",
  template: "tpl_",
  templateVersion: "tplver_",
  technicalDocument: "techdoc_",
  section: "section_",
  approval: "approval_",
  signature: "sign_",
  export: "export_",
  delivery: "delivery_",
  feeProposal: "fee_",
  expense: "expense_",
  aiExecution: "aiexec_",
  auditEvent: "audit_",
  consentRecord: "consent_",
  retentionPolicy: "retention_",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

const PREFIX_TO_KIND: ReadonlyMap<string, IdKind> = new Map(
  (Object.entries(ID_PREFIX) as [IdKind, string][]).map(([kind, prefix]) => [prefix, kind]),
);

// ---- Tipos branded implementados -------------------------------------------

export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type ProfessionalProfileId = Brand<string, "ProfessionalProfileId">;
export type CredentialId = Brand<string, "CredentialId">;
export type CaseId = Brand<string, "CaseId">;
export type PersonId = Brand<string, "PersonId">;
export type CasePersonId = Brand<string, "CasePersonId">;
export type RelationshipId = Brand<string, "RelationshipId">;
export type AssignmentId = Brand<string, "AssignmentId">;

/**
 * Mapa dos tipos implementados — usado pelo overload de `buildDomainId`
 * para devolver o branded type correspondente sem `as`.
 */
export type ImplementedIdMap = {
  organization: OrganizationId;
  user: UserId;
  membership: MembershipId;
  professionalProfile: ProfessionalProfileId;
  credential: CredentialId;
  case: CaseId;
  person: PersonId;
  casePerson: CasePersonId;
  relationship: RelationshipId;
  assignment: AssignmentId;
};

// ---- Validação de forma ----------------------------------------------------

const SUFFIX_RE = /^[a-zA-Z0-9_-]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function hasExpectedPrefix(value: unknown, kind: IdKind): boolean {
  if (!isNonEmptyString(value)) return false;
  const prefix = ID_PREFIX[kind];
  if (!value.startsWith(prefix)) return false;
  const suffix = value.slice(prefix.length);
  return suffix.length > 0 && SUFFIX_RE.test(suffix);
}

export function parseDomainId(value: unknown): { kind: IdKind; value: string } | null {
  if (!isNonEmptyString(value)) return null;
  for (const [prefix, kind] of PREFIX_TO_KIND) {
    if (value.startsWith(prefix)) {
      const suffix = value.slice(prefix.length);
      if (!suffix || !SUFFIX_RE.test(suffix)) return null;
      return { kind, value };
    }
  }
  return null;
}

// ---- Predicados por tipo ---------------------------------------------------

export const isOrganizationId = (v: unknown): v is OrganizationId =>
  hasExpectedPrefix(v, "organization");
export const isUserId = (v: unknown): v is UserId => hasExpectedPrefix(v, "user");
export const isMembershipId = (v: unknown): v is MembershipId =>
  hasExpectedPrefix(v, "membership");
export const isProfessionalProfileId = (v: unknown): v is ProfessionalProfileId =>
  hasExpectedPrefix(v, "professionalProfile");
export const isCredentialId = (v: unknown): v is CredentialId =>
  hasExpectedPrefix(v, "credential");
export const isCaseId = (v: unknown): v is CaseId => hasExpectedPrefix(v, "case");
export const isPersonId = (v: unknown): v is PersonId => hasExpectedPrefix(v, "person");
export const isCasePersonId = (v: unknown): v is CasePersonId =>
  hasExpectedPrefix(v, "casePerson");
export const isRelationshipId = (v: unknown): v is RelationshipId =>
  hasExpectedPrefix(v, "relationship");
export const isAssignmentId = (v: unknown): v is AssignmentId =>
  hasExpectedPrefix(v, "assignment");

// ---- Builders determinísticos ---------------------------------------------

/**
 * Overloads:
 * - Tipos implementados retornam o branded type correspondente.
 * - Tipos reservados retornam `string` (contrato ainda não implementado).
 */
export function buildDomainId<K extends keyof ImplementedIdMap>(
  kind: K,
  suffix: string,
): ImplementedIdMap[K];
export function buildDomainId(kind: IdKind, suffix: string): string;
export function buildDomainId(kind: IdKind, suffix: string): string {
  if (!isNonEmptyString(suffix) || !SUFFIX_RE.test(suffix)) {
    throw new Error(`Sufixo inválido para ID (${kind}): ${String(suffix)}`);
  }
  return `${ID_PREFIX[kind]}${suffix}`;
}
