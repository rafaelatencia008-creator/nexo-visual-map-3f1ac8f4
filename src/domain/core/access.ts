/**
 * Access: `User` (identidade conceitual) e `Membership` (vínculo
 * usuário↔organização). Sem senha, token, e-mail ou dado de autenticação.
 */

import {
  isOrganizationId,
  isUserId,
  isMembershipId,
  type OrganizationId,
  type UserId,
  type MembershipId,
} from "./ids";
import { isEntityMetadata, hasOnlyAllowedKeys, type EntityMetadata } from "./common";
import { isRole, type Role } from "../shared/work-context";

// ---- User ------------------------------------------------------------------

export const USER_STATUSES = ["active", "suspended", "archived"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  id: UserId;
  status: UserStatus;
  /** Rótulo neutro opcional — jamais PII. */
  displayLabel?: string;
  metadata: EntityMetadata;
};

const USER_STATUS_SET = new Set<string>(USER_STATUSES);

export const USER_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "status",
  "displayLabel",
  "metadata",
]);

export function isUser(v: unknown): v is User {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, USER_ALLOWED_KEYS)) return false;
  const u = v as Record<string, unknown>;
  if (!isUserId(u.id)) return false;
  if (typeof u.status !== "string" || !USER_STATUS_SET.has(u.status)) return false;
  if (u.displayLabel !== undefined && typeof u.displayLabel !== "string") return false;
  if (!isEntityMetadata(u.metadata)) return false;
  return true;
}

// ---- Membership ------------------------------------------------------------

export const MEMBERSHIP_STATUSES = ["active", "suspended", "revoked"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type Membership = {
  id: MembershipId;
  organizationId: OrganizationId;
  userId: UserId;
  role: Role;
  status: MembershipStatus;
  metadata: EntityMetadata;
};

const MEMBERSHIP_STATUS_SET = new Set<string>(MEMBERSHIP_STATUSES);

export const MEMBERSHIP_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "userId",
  "role",
  "status",
  "metadata",
]);

export function isMembership(v: unknown): v is Membership {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, MEMBERSHIP_ALLOWED_KEYS)) return false;
  const m = v as Record<string, unknown>;
  if (!isMembershipId(m.id)) return false;
  if (!isOrganizationId(m.organizationId)) return false;
  if (!isUserId(m.userId)) return false;
  if (!isRole(m.role)) return false;
  if (typeof m.status !== "string" || !MEMBERSHIP_STATUS_SET.has(m.status)) return false;
  if (!isEntityMetadata(m.metadata)) return false;
  return true;
}
