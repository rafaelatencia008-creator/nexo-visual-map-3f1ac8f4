/**
 * Caso — unidade central do trabalho pericial.
 */

import { isCaseId, isOrganizationId, type CaseId, type OrganizationId } from "./ids";
import { isEntityMetadata, hasOnlyAllowedKeys, type EntityMetadata } from "./common";

export const CASE_STATUSES = [
  "draft",
  "triage",
  "active",
  "diligence",
  "drafting",
  "review",
  "completed",
  "delivered",
  "clarifications",
  "archived",
  "cancelled",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CONFIDENTIALITY_LEVELS = ["standard", "restricted", "high"] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

export const CONFLICT_CHECK_STATUSES = [
  "not_reviewed",
  "no_conflict",
  "conflict_detected",
] as const;
export type ConflictCheckStatus = (typeof CONFLICT_CHECK_STATUSES)[number];

export const DEADLINE_STATUSES = [
  "not_reviewed",
  "reviewed",
  "extended",
  "expired",
] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export type CaseReadiness = {
  professionalRoleDefined: boolean;
  objectDefined: boolean;
  deadlineReviewed: boolean;
  confidentialityReviewed: boolean;
  conflictOfInterestReviewed: boolean;
};

export type Case = {
  id: CaseId;
  organizationId: OrganizationId;
  reference: string;
  title: string;
  status: CaseStatus;
  confidentiality: ConfidentialityLevel;
  conflictCheck: ConflictCheckStatus;
  objectDefined: boolean;
  deadlineStatus: DeadlineStatus;
  metadata: EntityMetadata;
};

const STATUS_SET = new Set<string>(CASE_STATUSES);
const CONF_SET = new Set<string>(CONFIDENTIALITY_LEVELS);
const CONFLICT_SET = new Set<string>(CONFLICT_CHECK_STATUSES);
const DEADLINE_SET = new Set<string>(DEADLINE_STATUSES);

export const CASE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "reference",
  "title",
  "status",
  "confidentiality",
  "conflictCheck",
  "objectDefined",
  "deadlineStatus",
  "metadata",
]);

export function isCase(v: unknown): v is Case {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_ALLOWED_KEYS)) return false;
  const c = v as Record<string, unknown>;
  return (
    isCaseId(c.id) &&
    isOrganizationId(c.organizationId) &&
    typeof c.reference === "string" &&
    c.reference.length > 0 &&
    typeof c.title === "string" &&
    c.title.length > 0 &&
    typeof c.status === "string" &&
    STATUS_SET.has(c.status) &&
    typeof c.confidentiality === "string" &&
    CONF_SET.has(c.confidentiality) &&
    typeof c.conflictCheck === "string" &&
    CONFLICT_SET.has(c.conflictCheck) &&
    typeof c.objectDefined === "boolean" &&
    typeof c.deadlineStatus === "string" &&
    DEADLINE_SET.has(c.deadlineStatus) &&
    isEntityMetadata(c.metadata)
  );
}

export function computeReadiness(c: Case, professionalRoleDefined: boolean): CaseReadiness {
  return {
    professionalRoleDefined,
    objectDefined: c.objectDefined,
    deadlineReviewed: c.deadlineStatus !== "not_reviewed",
    confidentialityReviewed: true, // `standard` é uma escolha consciente
    conflictOfInterestReviewed: c.conflictCheck !== "not_reviewed",
  };
}

export function getCaseReadinessIssues(readiness: CaseReadiness): string[] {
  const issues: string[] = [];
  if (!readiness.professionalRoleDefined) issues.push("professionalRoleDefined");
  if (!readiness.objectDefined) issues.push("objectDefined");
  if (!readiness.deadlineReviewed) issues.push("deadlineReviewed");
  if (!readiness.confidentialityReviewed) issues.push("confidentialityReviewed");
  if (!readiness.conflictOfInterestReviewed) issues.push("conflictOfInterestReviewed");
  return issues;
}

export function canLeaveDraft(readiness: CaseReadiness): boolean {
  return getCaseReadinessIssues(readiness).length === 0;
}
