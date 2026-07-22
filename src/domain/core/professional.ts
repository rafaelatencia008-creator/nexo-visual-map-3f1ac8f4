/**
 * Perfil profissional e credencial — contratos conceituais.
 * NÃO implementa verificação real de conselho profissional.
 */

import {
  isOrganizationId,
  isProfessionalProfileId,
  isUserId,
  isCredentialId,
  type OrganizationId,
  type ProfessionalProfileId,
  type UserId,
  type CredentialId,
} from "./ids";
import { isEntityMetadata, type EntityMetadata } from "./common";

/**
 * Perfil profissional: reutiliza `Perfil` do onboarding para "área"
 * quando aplicável, mas mantém uma projeção neutra para permitir
 * evolução independente.
 */
export const PROFESSIONAL_AREAS = [
  "psychology",
  "social_work",
  "multi",
  "other",
] as const;
export type ProfessionalArea = (typeof PROFESSIONAL_AREAS)[number];

export const PROFESSIONAL_STATUSES = ["active", "inactive", "on_leave"] as const;
export type ProfessionalStatus = (typeof PROFESSIONAL_STATUSES)[number];

export type ProfessionalProfile = {
  id: ProfessionalProfileId;
  organizationId: OrganizationId;
  userId: UserId;
  area: ProfessionalArea;
  status: ProfessionalStatus;
  metadata: EntityMetadata;
};

const AREA_SET = new Set<string>(PROFESSIONAL_AREAS);
const PROF_STATUS_SET = new Set<string>(PROFESSIONAL_STATUSES);

export function isProfessionalProfile(v: unknown): v is ProfessionalProfile {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  return (
    isProfessionalProfileId(p.id) &&
    isOrganizationId(p.organizationId) &&
    isUserId(p.userId) &&
    typeof p.area === "string" &&
    AREA_SET.has(p.area) &&
    typeof p.status === "string" &&
    PROF_STATUS_SET.has(p.status) &&
    isEntityMetadata(p.metadata)
  );
}

// ---- Credencial (contrato conceitual) --------------------------------------

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
  professionalProfileId: ProfessionalProfileId;
  status: CredentialStatus;
  metadata: EntityMetadata;
};

const CRED_STATUS_SET = new Set<string>(CREDENTIAL_STATUSES);

export function isCredential(v: unknown): v is Credential {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  return (
    isCredentialId(c.id) &&
    isProfessionalProfileId(c.professionalProfileId) &&
    typeof c.status === "string" &&
    CRED_STATUS_SET.has(c.status) &&
    isEntityMetadata(c.metadata)
  );
}
