/**
 * Pessoa natural — jamais organização ou empresa. Não armazena PII real
 * nesta fundação. Campos sensíveis futuros ficarão opcionais e marcados
 * conceitualmente.
 */

import { isPersonId, isOrganizationId, type PersonId, type OrganizationId } from "./ids";
import { isEntityMetadata, type EntityMetadata } from "./common";

export const AGE_CLASSIFICATIONS = [
  "adult",
  "child",
  "adolescent",
  "unknown",
] as const;
export type AgeClassification = (typeof AGE_CLASSIFICATIONS)[number];

export type Person = {
  id: PersonId;
  organizationId: OrganizationId;
  /** Rótulo neutro, ex.: "Pessoa A". Nunca nome real. */
  displayLabel: string;
  ageClassification: AgeClassification;
  metadata: EntityMetadata;
};

const AGE_SET = new Set<string>(AGE_CLASSIFICATIONS);

export function isPerson(v: unknown): v is Person {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  return (
    isPersonId(p.id) &&
    isOrganizationId(p.organizationId) &&
    typeof p.displayLabel === "string" &&
    p.displayLabel.length > 0 &&
    typeof p.ageClassification === "string" &&
    AGE_SET.has(p.ageClassification) &&
    isEntityMetadata(p.metadata)
  );
}

export function isMinor(p: Pick<Person, "ageClassification">): boolean {
  return p.ageClassification === "child" || p.ageClassification === "adolescent";
}
