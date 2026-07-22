/**
 * Organização — ambiente isolado de trabalho. Reutiliza `WorkMode`
 * do onboarding como `kind` (mesmo conceito conceitual).
 */

import { isOrganizationId, type OrganizationId } from "./ids";
import { isEntityMetadata, type EntityMetadata } from "./common";

export const ORGANIZATION_KINDS = ["individual", "team", "institutional"] as const;
export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number];

export const ORGANIZATION_STATUSES = ["active", "suspended", "archived"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export type Organization = {
  id: OrganizationId;
  kind: OrganizationKind;
  displayName: string;
  status: OrganizationStatus;
  metadata: EntityMetadata;
};

const KIND_SET = new Set<string>(ORGANIZATION_KINDS);
const STATUS_SET = new Set<string>(ORGANIZATION_STATUSES);

export function isOrganization(v: unknown): v is Organization {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (!isOrganizationId(o.id)) return false;
  if (typeof o.kind !== "string" || !KIND_SET.has(o.kind)) return false;
  if (typeof o.displayName !== "string" || o.displayName.length === 0) return false;
  if (typeof o.status !== "string" || !STATUS_SET.has(o.status)) return false;
  if (!isEntityMetadata(o.metadata)) return false;
  return true;
}
