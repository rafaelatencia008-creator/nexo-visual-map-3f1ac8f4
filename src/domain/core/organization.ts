/**
 * Organização — reutiliza `WorkMode` como `kind`. Não cria enum paralelo.
 */

import { isOrganizationId, type OrganizationId } from "./ids";
import { isEntityMetadata, hasOnlyAllowedKeys, type EntityMetadata } from "./common";
import { WORK_MODES, isWorkMode, type WorkMode } from "../shared/work-context";

/** Alias temporário para consumidores que ainda usam o nome antigo. */
export const ORGANIZATION_KINDS = WORK_MODES;
export type OrganizationKind = WorkMode;

export const ORGANIZATION_STATUSES = ["active", "suspended", "archived"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export type Organization = {
  id: OrganizationId;
  kind: WorkMode;
  displayName: string;
  status: OrganizationStatus;
  metadata: EntityMetadata;
};

const STATUS_SET = new Set<string>(ORGANIZATION_STATUSES);

export const ORGANIZATION_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "kind",
  "displayName",
  "status",
  "metadata",
]);

export function isOrganization(v: unknown): v is Organization {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, ORGANIZATION_ALLOWED_KEYS)) return false;
  const o = v as Record<string, unknown>;
  if (!isOrganizationId(o.id)) return false;
  if (!isWorkMode(o.kind)) return false;
  if (typeof o.displayName !== "string" || o.displayName.length === 0) return false;
  if (typeof o.status !== "string" || !STATUS_SET.has(o.status)) return false;
  if (!isEntityMetadata(o.metadata)) return false;
  return true;
}
