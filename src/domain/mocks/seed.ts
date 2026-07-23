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
import type { CasePlanItem, CaseTimelineEntry } from "../core/case-plan";
import { isCasePlanItem, isCaseTimelineEntry } from "../core/case-plan";
import type { AuditEvent, CaseSnapshot } from "../core/case-audit";
import { AUDIT_SUMMARY, isAuditEvent, isCaseSnapshot } from "../core/case-audit";
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

// ---- CasePlanItems ---------------------------------------------------------
export const SEED_PLAN_ALFA_1_ID = buildDomainId("casePlanItem", "seed_alfa_1");
export const SEED_PLAN_ALFA_2_ID = buildDomainId("casePlanItem", "seed_alfa_2");
export const SEED_PLAN_ALFA_3_ID = buildDomainId("casePlanItem", "seed_alfa_3");
export const SEED_PLAN_BETA_1_ID = buildDomainId("casePlanItem", "seed_beta_1");
export const SEED_PLAN_BETA_2_ID = buildDomainId("casePlanItem", "seed_beta_2");

// ---- CaseTimelineEntries ---------------------------------------------------
export const SEED_TL_ALFA_1_ID = buildDomainId("caseTimelineEntry", "seed_alfa_1");
export const SEED_TL_ALFA_2_ID = buildDomainId("caseTimelineEntry", "seed_alfa_2");
export const SEED_TL_ALFA_3_ID = buildDomainId("caseTimelineEntry", "seed_alfa_3");
export const SEED_TL_BETA_1_ID = buildDomainId("caseTimelineEntry", "seed_beta_1");

// ---- AuditEvents (LV-08.6A) -----------------------------------------------
// Caso Alfa 1 — trilha própria (LV-08.6A.1).
export const SEED_AUDIT_ALFA_C1_1_ID = buildDomainId("auditEvent", "seed_alfa_c1_1");
export const SEED_AUDIT_ALFA_C1_2_ID = buildDomainId("auditEvent", "seed_alfa_c1_2");
export const SEED_AUDIT_ALFA_C1_3_ID = buildDomainId("auditEvent", "seed_alfa_c1_3");
// Caso Alfa 2 — 11 eventos originais.
export const SEED_AUDIT_ALFA_1_ID = buildDomainId("auditEvent", "seed_alfa_1");
export const SEED_AUDIT_ALFA_2_ID = buildDomainId("auditEvent", "seed_alfa_2");
export const SEED_AUDIT_ALFA_3_ID = buildDomainId("auditEvent", "seed_alfa_3");
export const SEED_AUDIT_ALFA_4_ID = buildDomainId("auditEvent", "seed_alfa_4");
export const SEED_AUDIT_ALFA_5_ID = buildDomainId("auditEvent", "seed_alfa_5");
export const SEED_AUDIT_ALFA_6_ID = buildDomainId("auditEvent", "seed_alfa_6");
export const SEED_AUDIT_ALFA_7_ID = buildDomainId("auditEvent", "seed_alfa_7");
export const SEED_AUDIT_ALFA_8_ID = buildDomainId("auditEvent", "seed_alfa_8");
export const SEED_AUDIT_ALFA_9_ID = buildDomainId("auditEvent", "seed_alfa_9");
export const SEED_AUDIT_ALFA_10_ID = buildDomainId("auditEvent", "seed_alfa_10");
export const SEED_AUDIT_ALFA_11_ID = buildDomainId("auditEvent", "seed_alfa_11");
export const SEED_AUDIT_BETA_1_ID = buildDomainId("auditEvent", "seed_beta_1");

// ---- CaseSnapshots (LV-08.6A) ---------------------------------------------
export const SEED_SNAPSHOT_ALFA_1_ID = buildDomainId("caseSnapshot", "seed_alfa_1");
export const SEED_SNAPSHOT_ALFA_2_ID = buildDomainId("caseSnapshot", "seed_alfa_2");

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

  const casePlanItems: CasePlanItem[] = [
    {
      id: SEED_PLAN_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "Revisar objeto e limites do trabalho",
      status: "in_progress",
      priority: "high",
      dueOn: "2026-02-01" as IsoDate,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
      metadata: meta,
    },
    {
      id: SEED_PLAN_ALFA_2_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "Organizar fontes iniciais",
      status: "planned",
      priority: "normal",
      dueOn: "2026-02-15" as IsoDate,
      metadata: meta,
    },
    {
      id: SEED_PLAN_ALFA_3_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "pending",
      title: "Confirmar informação pendente",
      status: "blocked",
      priority: "normal",
      metadata: meta,
    },
    {
      id: SEED_PLAN_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      caseId: SEED_CASE_BETA_2_ID,
      kind: "activity",
      title: "Preparar cronograma de entrevistas",
      status: "planned",
      priority: "high",
      dueOn: "2026-02-10" as IsoDate,
      assignmentId: SEED_ASSIGN_BETA_1_ID,
      metadata: meta,
    },
    {
      id: SEED_PLAN_BETA_2_ID,
      organizationId: SEED_ORG_BETA_ID,
      caseId: SEED_CASE_BETA_2_ID,
      kind: "pending",
      title: "Coletar autorizações institucionais",
      status: "blocked",
      priority: "normal",
      metadata: meta,
    },
  ];

  const caseTimelineEntries: CaseTimelineEntry[] = [
    {
      id: SEED_TL_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "milestone",
      occurredOn: "2026-01-05" as IsoDate,
      title: "Processo cadastrado no ambiente demonstrativo",
      metadata: meta,
    },
    {
      id: SEED_TL_ALFA_2_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "note",
      occurredOn: "2026-01-08" as IsoDate,
      title: "Checklist inicial revisado",
      metadata: meta,
    },
    {
      id: SEED_TL_ALFA_3_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "note",
      occurredOn: "2026-01-12" as IsoDate,
      title: "Pessoas vinculadas ao processo",
      metadata: meta,
    },
    {
      id: SEED_TL_BETA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
      caseId: SEED_CASE_BETA_2_ID,
      kind: "milestone",
      occurredOn: "2026-01-07" as IsoDate,
      title: "Recebimento da nomeação",
      metadata: meta,
    },
  ];

  // ---- AuditEvents (seed trail para Case Alfa 1, Alfa 2 + Beta 2) --------
  const auditActorAlfaC1 = {
    actorUserId: SEED_USER_1_ID,
    actorMembershipId: SEED_MEM_ALFA_OWNER_ID,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_1_ID,
  } as const;
  const auditActorAlfa = {
    actorUserId: SEED_USER_1_ID,
    actorMembershipId: SEED_MEM_ALFA_OWNER_ID,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_2_ID,
  } as const;
  const auditActorBeta = {
    actorUserId: SEED_USER_2_ID,
    actorMembershipId: SEED_MEM_BETA_OWNER_ID,
    organizationId: SEED_ORG_BETA_ID,
    caseId: SEED_CASE_BETA_2_ID,
  } as const;
  const evt = (
    id: string,
    actor: typeof auditActorAlfa | typeof auditActorBeta | typeof auditActorAlfaC1,
    action: keyof typeof AUDIT_SUMMARY,
    targetType: AuditEvent["targetType"],
    targetId: string,
    occurredAt: IsoDateTime,
  ): AuditEvent => ({
    id: id as AuditEvent["id"],
    organizationId: actor.organizationId,
    caseId: actor.caseId,
    actorUserId: actor.actorUserId,
    actorMembershipId: actor.actorMembershipId,
    action,
    targetType,
    targetId,
    summary: AUDIT_SUMMARY[action],
    occurredAt,
    metadata: metaAt(occurredAt),
  });
  const auditEvents: AuditEvent[] = [
    // Caso Alfa 1 — três eventos determinísticos próprios.
    evt(SEED_AUDIT_ALFA_C1_1_ID, auditActorAlfaC1, "case.created", "case",
      SEED_CASE_ALFA_1_ID, "2026-01-02T09:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_C1_2_ID, auditActorAlfaC1, "case.updated", "case",
      SEED_CASE_ALFA_1_ID, "2026-01-03T09:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_C1_3_ID, auditActorAlfaC1, "case.updated", "case",
      SEED_CASE_ALFA_1_ID, "2026-01-04T09:00:00.000Z" as IsoDateTime),
    // Caso Alfa 2 — 11 eventos originais.
    evt(SEED_AUDIT_ALFA_1_ID, auditActorAlfa, "case.created", "case",
      SEED_CASE_ALFA_2_ID, "2026-01-05T09:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_2_ID, auditActorAlfa, "assignment.created", "assignment",
      SEED_ASSIGN_ALFA_1_ID, "2026-01-05T09:05:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_3_ID, auditActorAlfa, "casePerson.created", "casePerson",
      SEED_CP_ALFA_1_ID, "2026-01-06T10:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_4_ID, auditActorAlfa, "casePerson.created", "casePerson",
      SEED_CP_ALFA_2_ID, "2026-01-06T10:05:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_5_ID, auditActorAlfa, "relationship.created", "relationship",
      SEED_REL_ALFA_1_ID, "2026-01-06T10:10:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_6_ID, auditActorAlfa, "casePlanItem.created", "casePlanItem",
      SEED_PLAN_ALFA_1_ID, "2026-01-07T11:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_7_ID, auditActorAlfa, "casePlanItem.created", "casePlanItem",
      SEED_PLAN_ALFA_2_ID, "2026-01-07T11:05:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_8_ID, auditActorAlfa, "casePlanItem.created", "casePlanItem",
      SEED_PLAN_ALFA_3_ID, "2026-01-07T11:10:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_9_ID, auditActorAlfa, "caseTimelineEntry.created", "caseTimelineEntry",
      SEED_TL_ALFA_1_ID, "2026-01-08T08:00:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_10_ID, auditActorAlfa, "caseTimelineEntry.created", "caseTimelineEntry",
      SEED_TL_ALFA_2_ID, "2026-01-08T08:05:00.000Z" as IsoDateTime),
    evt(SEED_AUDIT_ALFA_11_ID, auditActorAlfa, "caseTimelineEntry.created", "caseTimelineEntry",
      SEED_TL_ALFA_3_ID, "2026-01-12T08:00:00.000Z" as IsoDateTime),
    // Beta 2 — prova isolamento.
    evt(SEED_AUDIT_BETA_1_ID, auditActorBeta, "case.created", "case",
      SEED_CASE_BETA_2_ID, "2026-01-07T09:00:00.000Z" as IsoDateTime),
  ];

  // ---- CaseSnapshots (para Case Alfa 2) ----------------------------------
  // Dois payloads INDEPENDENTES (LV-08.6A.1): antigo com menos itens do plano
  // que o recente e que o estado atual.
  const snapshotAt1: IsoDateTime = "2026-01-15T12:00:00.000Z" as IsoDateTime;
  const snapshotAt2: IsoDateTime = "2026-01-20T15:30:00.000Z" as IsoDateTime;
  const alfa2Case = cases.find((c) => c.id === SEED_CASE_ALFA_2_ID)!;
  const alfa2CasePersons = casePersons.filter(
    (cp) => cp.caseId === SEED_CASE_ALFA_2_ID,
  );
  const alfa2PersonIds = new Set(alfa2CasePersons.map((cp) => cp.personId));
  const alfa2Persons = persons.filter((p) => alfa2PersonIds.has(p.id));
  const alfa2Relationships = relationships.filter(
    (r) => r.caseId === SEED_CASE_ALFA_2_ID,
  );
  const alfa2Assignments = assignments.filter(
    (a) => a.caseId === SEED_CASE_ALFA_2_ID,
  );
  const alfa2PlanItems = casePlanItems.filter(
    (p) => p.caseId === SEED_CASE_ALFA_2_ID,
  );
  const alfa2Timeline = caseTimelineEntries.filter(
    (t) => t.caseId === SEED_CASE_ALFA_2_ID,
  );

  // Snapshot antigo: retrato inicial com apenas uma pessoa vinculada,
  // sem relacionamentos, com um único item do plano e um marco.
  const alfa2FirstCasePerson = alfa2CasePersons.find(
    (cp) => cp.personId === SEED_PERSON_ALFA_1_ID,
  );
  const alfa2FirstPerson = alfa2Persons.find((p) => p.id === SEED_PERSON_ALFA_1_ID);
  if (!alfa2FirstCasePerson || !alfa2FirstPerson) {
    throw new Error("seed: caso Alfa 2 sem pessoa inicial para snapshot antigo");
  }
  const alfa2OldPlanItems = alfa2PlanItems.filter(
    (p) => p.id === SEED_PLAN_ALFA_1_ID,
  );
  const alfa2OldTimeline = alfa2Timeline.filter(
    (t) => t.id === SEED_TL_ALFA_1_ID,
  );
  const alfa2PayloadOld = {
    case: { ...alfa2Case },
    casePersons: [{ ...alfa2FirstCasePerson }],
    persons: [{ ...alfa2FirstPerson }],
    relationships: [] as Relationship[],
    assignments: alfa2Assignments.map((a) => ({ ...a })),
    casePlanItems: alfa2OldPlanItems.map((p) => ({ ...p })),
    caseTimelineEntries: alfa2OldTimeline.map((t) => ({ ...t })),
  };

  // Snapshot recente: estado completo atual.
  const alfa2PayloadRecent = {
    case: { ...alfa2Case },
    casePersons: alfa2CasePersons.map((cp) => ({ ...cp })),
    persons: alfa2Persons.map((p) => ({ ...p })),
    relationships: alfa2Relationships.map((r) => ({ ...r })),
    assignments: alfa2Assignments.map((a) => ({ ...a })),
    casePlanItems: alfa2PlanItems.map((p) => ({ ...p })),
    caseTimelineEntries: alfa2Timeline.map((t) => ({ ...t })),
  };

  const caseSnapshots: CaseSnapshot[] = [
    {
      id: SEED_SNAPSHOT_ALFA_1_ID as CaseSnapshot["id"],
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      createdByUserId: SEED_USER_1_ID,
      createdByMembershipId: SEED_MEM_ALFA_OWNER_ID,
      createdAt: snapshotAt1,
      label: "Marco inicial do processo",
      reason: "Registro fotográfico do estado após vínculo inicial.",
      payload: alfa2PayloadOld,
      metadata: metaAt(snapshotAt1),
    },
    {
      id: SEED_SNAPSHOT_ALFA_2_ID as CaseSnapshot["id"],
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      createdByUserId: SEED_USER_1_ID,
      createdByMembershipId: SEED_MEM_ALFA_OWNER_ID,
      createdAt: snapshotAt2,
      label: "Marco após revisão do plano",
      payload: alfa2PayloadRecent,
      metadata: metaAt(snapshotAt2),
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
    casePlanItems,
    caseTimelineEntries,
    auditEvents,
    caseSnapshots,
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
  dup("casePlanItem", seed.casePlanItems);
  dup("caseTimelineEntry", seed.caseTimelineEntries);
  dup("auditEvent", seed.auditEvents);
  dup("caseSnapshot", seed.caseSnapshots);

  for (const e of seed.auditEvents) {
    const eid = e.id;
    if (!isAuditEvent(e)) {
      issues.push({ entity: "auditEvent", id: eid, reason: "invalid_shape" });
    }
  }
  for (const s of seed.caseSnapshots) {
    const sid = s.id;
    if (!isCaseSnapshot(s)) {
      issues.push({ entity: "caseSnapshot", id: sid, reason: "invalid_shape" });
    }
  }

  const caseByIdEarly = new Map(seed.cases.map((c) => [c.id, c]));
  const assignByIdEarly = new Map(seed.assignments.map((a) => [a.id, a]));

  for (const p of seed.casePlanItems) {
    const pid = p.id;
    if (!isCasePlanItem(p)) {
      issues.push({ entity: "casePlanItem", id: pid, reason: "invalid_shape" });
      continue;
    }
    const c = caseByIdEarly.get(p.caseId);
    if (!c) issues.push({ entity: "casePlanItem", id: pid, reason: "case_not_found" });
    else if (c.organizationId !== p.organizationId)
      issues.push({ entity: "casePlanItem", id: pid, reason: "case_org_mismatch" });
    if (p.assignmentId !== undefined) {
      const a = assignByIdEarly.get(p.assignmentId);
      if (!a)
        issues.push({ entity: "casePlanItem", id: pid, reason: "assignment_not_found" });
      else {
        if (a.caseId !== p.caseId)
          issues.push({ entity: "casePlanItem", id: pid, reason: "assignment_case_mismatch" });
        if (a.organizationId !== p.organizationId)
          issues.push({ entity: "casePlanItem", id: pid, reason: "assignment_org_mismatch" });
      }
    }
  }
  for (const t of seed.caseTimelineEntries) {
    const tid = t.id;
    if (!isCaseTimelineEntry(t)) {
      issues.push({ entity: "caseTimelineEntry", id: tid, reason: "invalid_shape" });
      continue;
    }
    const c = caseByIdEarly.get(t.caseId);
    if (!c) issues.push({ entity: "caseTimelineEntry", id: tid, reason: "case_not_found" });
    else if (c.organizationId !== t.organizationId)
      issues.push({ entity: "caseTimelineEntry", id: tid, reason: "case_org_mismatch" });
  }

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

  // ---- Regras relacionais adicionais -------------------------------------

  const orgIds = new Set(seed.organizations.map((o) => o.id));
  const userIds = new Set(seed.users.map((u) => u.id));
  const profByCase = seed.professionalProfiles;
  const caseById = new Map(seed.cases.map((c) => [c.id, c]));
  const personById = new Map(seed.persons.map((p) => [p.id, p]));

  // ProfessionalProfile: referências existentes.
  for (const p of seed.professionalProfiles) {
    if (!orgIds.has(p.organizationId))
      issues.push({ entity: "professionalProfile", id: p.id, reason: "org_not_found" });
    if (!userIds.has(p.userId))
      issues.push({ entity: "professionalProfile", id: p.id, reason: "user_not_found" });
  }

  // Case: organização existente.
  for (const c of seed.cases) {
    if (!orgIds.has(c.organizationId))
      issues.push({ entity: "case", id: c.id, reason: "org_not_found" });
  }

  // Person: organização existente.
  for (const p of seed.persons) {
    if (!orgIds.has(p.organizationId))
      issues.push({ entity: "person", id: p.id, reason: "org_not_found" });
  }

  // Membership duplicado (mesmo user na mesma org).
  {
    const seen = new Set<string>();
    for (const m of seed.memberships) {
      const key = `${m.organizationId}|${m.userId}`;
      if (seen.has(key))
        issues.push({ entity: "membership", id: m.id, reason: "duplicate_user_in_org" });
      seen.add(key);
    }
  }

  // ProfessionalProfile duplicado equivalente.
  {
    const seen = new Set<string>();
    for (const p of profByCase) {
      const key = `${p.organizationId}|${p.userId}|${p.area}`;
      if (seen.has(key))
        issues.push({ entity: "professionalProfile", id: p.id, reason: "duplicate_equivalent" });
      seen.add(key);
    }
  }

  // Case: referência duplicada por org.
  {
    const seen = new Set<string>();
    for (const c of seed.cases) {
      const key = `${c.organizationId}|${c.reference}`;
      if (seen.has(key))
        issues.push({ entity: "case", id: c.id, reason: "duplicate_reference_in_org" });
      seen.add(key);
    }
  }

  // CasePerson: coerência org, duplicado por caso+pessoa.
  {
    const seen = new Set<string>();
    for (const cp of seed.casePersons) {
      const c = caseById.get(cp.caseId);
      const p = personById.get(cp.personId);
      if (c && cp.organizationId !== c.organizationId)
        issues.push({ entity: "casePerson", id: cp.id, reason: "case_org_mismatch" });
      if (p && cp.organizationId !== p.organizationId)
        issues.push({ entity: "casePerson", id: cp.id, reason: "person_org_mismatch" });
      const key = `${cp.caseId}|${cp.personId}`;
      if (seen.has(key))
        issues.push({ entity: "casePerson", id: cp.id, reason: "duplicate_case_person" });
      seen.add(key);
    }
  }

  // Relationship: pessoas devem estar vinculadas ao caso via CasePerson;
  // duplicados equivalentes; coerência org.
  {
    const byCase = new Map<string, Set<string>>();
    for (const cp of seed.casePersons) {
      const set = byCase.get(cp.caseId) ?? new Set<string>();
      set.add(cp.personId);
      byCase.set(cp.caseId, set);
    }
    const seen = new Set<string>();
    for (const r of seed.relationships) {
      const c = caseById.get(r.caseId);
      if (c && r.organizationId !== c.organizationId)
        issues.push({ entity: "relationship", id: r.id, reason: "case_org_mismatch" });
      const linked = byCase.get(r.caseId) ?? new Set<string>();
      if (!linked.has(r.fromPersonId))
        issues.push({ entity: "relationship", id: r.id, reason: "from_person_not_linked" });
      if (!linked.has(r.toPersonId))
        issues.push({ entity: "relationship", id: r.id, reason: "to_person_not_linked" });
      const key = `${r.caseId}|${r.fromPersonId}|${r.toPersonId}|${r.type}`;
      if (seen.has(key))
        issues.push({ entity: "relationship", id: r.id, reason: "duplicate_equivalent" });
      seen.add(key);
    }
  }

  // Assignment: duplicado ativo equivalente.
  {
    const seen = new Set<string>();
    for (const a of seed.assignments) {
      if (a.status !== "active") continue;
      const key = `${a.caseId}|${a.professionalProfileId}|${a.role}`;
      if (seen.has(key))
        issues.push({ entity: "assignment", id: a.id, reason: "duplicate_active" });
      seen.add(key);
    }
  }

  return issues;
}
