/**
 * Perfil profissional e credencial.
 *
 * `ProfessionalProfile.area` reutiliza `Perfil` do onboarding — NÃO existe
 * enum paralelo. `Credential` agora é organizacionalmente escopada.
 */

import {
  isCredentialId,
  isOrganizationId,
  isProfessionalProfileId,
  isUserId,
  type CredentialId,
  type OrganizationId,
  type ProfessionalProfileId,
  type UserId,
} from "./ids";
import { isEntityMetadata, hasOnlyAllowedKeys, type EntityMetadata } from "./common";
import { PERFIS, isPerfil, type Perfil } from "../shared/work-context";

/** Alias temporário — mesmos valores, mesmo tipo. */
export const PROFESSIONAL_AREAS = PERFIS;
export type ProfessionalArea = Perfil;

export const PROFESSIONAL_STATUSES = ["active", "inactive", "on_leave"] as const;
export type ProfessionalStatus = (typeof PROFESSIONAL_STATUSES)[number];

export type ProfessionalProfile = {
  id: ProfessionalProfileId;
  organizationId: OrganizationId;
  userId: UserId;
  area: Perfil;
  status: ProfessionalStatus;
  metadata: EntityMetadata;
};

const PROF_STATUS_SET = new Set<string>(PROFESSIONAL_STATUSES);

export const PROFESSIONAL_PROFILE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "userId",
  "area",
  "status",
  "metadata",
]);

export function isProfessionalProfile(v: unknown): v is ProfessionalProfile {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, PROFESSIONAL_PROFILE_ALLOWED_KEYS)) return false;
  const p = v as Record<string, unknown>;
  return (
    isProfessionalProfileId(p.id) &&
    isOrganizationId(p.organizationId) &&
    isUserId(p.userId) &&
    isPerfil(p.area) &&
    typeof p.status === "string" &&
    PROF_STATUS_SET.has(p.status) &&
    isEntityMetadata(p.metadata)
  );
}

// ---- Credential ------------------------------------------------------------

export const CREDENTIAL_STATUSES = [
  "not_informed",
  "pending",
  "verified",
  "rejected",
  "expired",
] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export type Credential = {
  id: CredentialId;
  organizationId: OrganizationId;
  professionalProfileId: ProfessionalProfileId;
  status: CredentialStatus;
  metadata: EntityMetadata;
};

const CRED_STATUS_SET = new Set<string>(CREDENTIAL_STATUSES);

export const CREDENTIAL_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "professionalProfileId",
  "status",
  "metadata",
]);

export function isCredential(v: unknown): v is Credential {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, CREDENTIAL_ALLOWED_KEYS)) return false;
  const c = v as Record<string, unknown>;
  return (
    isCredentialId(c.id) &&
    isOrganizationId(c.organizationId) &&
    isProfessionalProfileId(c.professionalProfileId) &&
    typeof c.status === "string" &&
    CRED_STATUS_SET.has(c.status) &&
    isEntityMetadata(c.metadata)
  );
}
