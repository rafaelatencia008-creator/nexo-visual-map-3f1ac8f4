/**
 * Pessoa natural.
 */

import { isPersonId, isOrganizationId, type PersonId, type OrganizationId } from "./ids";
import { isEntityMetadata, hasOnlyAllowedKeys, type EntityMetadata } from "./common";

export const AGE_CLASSIFICATIONS = ["adult", "child", "adolescent", "unknown"] as const;
export type AgeClassification = (typeof AGE_CLASSIFICATIONS)[number];

export type Person = {
  id: PersonId;
  organizationId: OrganizationId;
  displayLabel: string;
  ageClassification: AgeClassification;
  metadata: EntityMetadata;
};

const AGE_SET = new Set<string>(AGE_CLASSIFICATIONS);

export const PERSON_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "displayLabel",
  "ageClassification",
  "metadata",
]);

export function isPerson(v: unknown): v is Person {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasOnlyAllowedKeys(v, PERSON_ALLOWED_KEYS)) return false;
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
