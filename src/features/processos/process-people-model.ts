/**
 * LV-08.4 — modelo funcional puro da seção "Pessoas e relações".
 *
 * Só TypeScript. Nada de React, storage ou rede. Concentra rótulos,
 * builders restritos, junções entre entidades oficiais e o mapeamento
 * público de erros de serviço.
 */

import {
  AGE_CLASSIFICATIONS,
  type AgeClassification,
  type Person,
} from "@/domain/core/person";
import {
  CASE_PERSON_ROLES,
  RELATIONSHIP_TYPES,
  type CasePerson,
  type CasePersonRole,
  type Relationship,
  type RelationshipType,
} from "@/domain/core/assignment";
import type {
  CaseId,
  CasePersonId,
  PersonId,
  RelationshipId,
} from "@/domain/core/ids";
import type {
  CreateCasePersonInput,
  CreatePersonInput,
  CreateRelationshipInput,
  UpdateCasePersonInput,
  UpdatePersonInput,
  UpdateRelationshipInput,
} from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import type { PermissionAction } from "@/domain/services/permissions";

// ---- Rótulos oficiais ------------------------------------------------------

export const AGE_CLASSIFICATION_LABELS_PT: Readonly<
  Record<AgeClassification, string>
> = {
  adult: "Adulto",
  child: "Criança",
  adolescent: "Adolescente",
  unknown: "Não informado",
};

export const CASE_PERSON_ROLE_LABELS_PT: Readonly<
  Record<CasePersonRole, string>
> = {
  evaluated_person: "Pessoa avaliada",
  child_or_adolescent: "Criança ou adolescente",
  parent: "Pai ou mãe",
  guardian: "Responsável ou guardião",
  applicant: "Requerente",
  respondent: "Requerido",
  witness: "Testemunha",
  informant: "Informante",
  technical_contact: "Contato técnico",
  other: "Outro",
};

export const RELATIONSHIP_TYPE_LABELS_PT: Readonly<
  Record<RelationshipType, string>
> = {
  parent_child: "Parental",
  spouse: "Cônjuges",
  former_spouse: "Ex-cônjuges",
  guardian: "Guarda ou responsabilidade",
  sibling: "Irmãos",
  extended_family: "Família extensa",
  affective_bond: "Vínculo afetivo",
  professional: "Relação profissional",
  other: "Outra relação",
};

// Guardas de integridade em tempo de módulo.
{
  for (const key of AGE_CLASSIFICATIONS) {
    if (!(key in AGE_CLASSIFICATION_LABELS_PT)) {
      throw new Error(`AGE_CLASSIFICATION_LABELS_PT: falta ${key}`);
    }
  }
  for (const key of CASE_PERSON_ROLES) {
    if (!(key in CASE_PERSON_ROLE_LABELS_PT)) {
      throw new Error(`CASE_PERSON_ROLE_LABELS_PT: falta ${key}`);
    }
  }
  for (const key of RELATIONSHIP_TYPES) {
    if (!(key in RELATIONSHIP_TYPE_LABELS_PT)) {
      throw new Error(`RELATIONSHIP_TYPE_LABELS_PT: falta ${key}`);
    }
  }
}

// ---- Views compostas -------------------------------------------------------

export type LinkedCasePersonView = Readonly<{
  link: CasePerson;
  person: Person;
}>;

export type ProcessRelationshipView = Readonly<{
  relationship: Relationship;
  fromPerson: Person;
  toPerson: Person;
}>;

export type LinkedPeopleBuild = Readonly<{
  views: readonly LinkedCasePersonView[];
  unresolved: readonly Readonly<{ casePersonId: CasePersonId; personId: PersonId }>[];
}>;

export type RelationshipMissingSide = "from" | "to" | "both";

export type RelationshipViewsBuild = Readonly<{
  views: readonly ProcessRelationshipView[];
  unresolved: readonly Readonly<{
    relationshipId: RelationshipId;
    missing: RelationshipMissingSide;
  }>[];
}>;

/**
 * Cruza vínculos com pessoas. Vínculos cuja pessoa não foi resolvida ficam
 * fora de `views` e são reportados em `unresolved` para o chamador tratar.
 * Ordenação estável: displayLabel asc; empate por id (não exibido).
 */
export function buildLinkedCasePeopleView(
  casePeople: readonly CasePerson[],
  persons: readonly Person[],
): LinkedPeopleBuild {
  const byId = new Map<PersonId, Person>();
  for (const p of persons) byId.set(p.id, p);
  const views: LinkedCasePersonView[] = [];
  const unresolved: {
    casePersonId: CasePersonId;
    personId: PersonId;
  }[] = [];
  for (const cp of casePeople) {
    const person = byId.get(cp.personId);
    if (!person) {
      unresolved.push({ casePersonId: cp.id, personId: cp.personId });
      continue;
    }
    views.push({ link: cp, person });
  }
  views.sort((a, b) => {
    const cmp = a.person.displayLabel.localeCompare(b.person.displayLabel, "pt-BR");
    if (cmp !== 0) return cmp;
    return String(a.link.id).localeCompare(String(b.link.id));
  });
  return { views, unresolved };
}

/**
 * Constrói as visões de relações a partir das pessoas vinculadas ao processo.
 * Ordenação estável: de-para displayLabel, depois tipo.
 */
export function buildRelationshipViews(
  relationships: readonly Relationship[],
  linkedPeople: readonly LinkedCasePersonView[],
): RelationshipViewsBuild {
  const byPerson = new Map<PersonId, Person>();
  for (const v of linkedPeople) byPerson.set(v.person.id, v.person);
  const views: ProcessRelationshipView[] = [];
  const unresolved: {
    relationshipId: RelationshipId;
    missing: RelationshipMissingSide;
  }[] = [];
  for (const r of relationships) {
    const from = byPerson.get(r.fromPersonId);
    const to = byPerson.get(r.toPersonId);
    if (!from && !to) {
      unresolved.push({ relationshipId: r.id, missing: "both" });
      continue;
    }
    if (!from) {
      unresolved.push({ relationshipId: r.id, missing: "from" });
      continue;
    }
    if (!to) {
      unresolved.push({ relationshipId: r.id, missing: "to" });
      continue;
    }
    views.push({ relationship: r, fromPerson: from, toPerson: to });
  }
  views.sort((a, b) => {
    const cmpFrom = a.fromPerson.displayLabel.localeCompare(
      b.fromPerson.displayLabel,
      "pt-BR",
    );
    if (cmpFrom !== 0) return cmpFrom;
    const cmpTo = a.toPerson.displayLabel.localeCompare(
      b.toPerson.displayLabel,
      "pt-BR",
    );
    if (cmpTo !== 0) return cmpTo;
    return a.relationship.type.localeCompare(b.relationship.type);
  });
  return { views, unresolved };
}

// ---- Formulários -----------------------------------------------------------

export type PersonFormValues = Readonly<{
  displayLabel: string;
  ageClassification: AgeClassification;
}>;

export type CasePersonFormValues = Readonly<{
  role: CasePersonRole;
  restrictedByDefault: boolean;
}>;

export type NewLinkFormValues = Readonly<{
  personId: PersonId;
  role: CasePersonRole;
  restrictedByDefault: boolean;
}>;

export type NewPersonFormValues = Readonly<{
  displayLabel: string;
  ageClassification: AgeClassification;
  role: CasePersonRole;
  restrictedByDefault: boolean;
}>;

export type RelationshipFormValues = Readonly<{
  fromPersonId: PersonId;
  toPersonId: PersonId;
  type: RelationshipType;
}>;

export const PERSON_LABEL_MAX_LENGTH = 120;

export function normalizePersonLabel(value: string): string {
  return value.trim();
}

/** Retorna `true` para classificações que forçam vínculo restrito. */
export function isMinorAge(age: AgeClassification): boolean {
  return age === "child" || age === "adolescent";
}

// ---- Builders restritos ---------------------------------------------------

/**
 * `personId` fica fora dos DTOs oficiais — é passado como argumento posicional
 * do serviço; portanto não precisa aparecer no input.
 */
export function buildPersonUpdateInput(
  current: Person,
  values: PersonFormValues,
): UpdatePersonInput | null {
  const patch: {
    displayLabel?: string;
    ageClassification?: AgeClassification;
  } = {};
  const nextLabel = normalizePersonLabel(values.displayLabel);
  if (nextLabel !== current.displayLabel && nextLabel.length > 0) {
    patch.displayLabel = nextLabel;
  }
  if (values.ageClassification !== current.ageClassification) {
    patch.ageClassification = values.ageClassification;
  }
  if (Object.keys(patch).length === 0) return null;
  return { ...patch, expectedVersion: current.metadata.version };
}

export function buildCasePersonUpdateInput(
  current: CasePerson,
  values: CasePersonFormValues,
): UpdateCasePersonInput | null {
  const patch: {
    role?: CasePersonRole;
    restrictedByDefault?: boolean;
  } = {};
  if (values.role !== current.role) patch.role = values.role;
  if (values.restrictedByDefault !== current.restrictedByDefault) {
    patch.restrictedByDefault = values.restrictedByDefault;
  }
  if (Object.keys(patch).length === 0) return null;
  return {
    casePersonId: current.id,
    ...patch,
    expectedVersion: current.metadata.version,
  };
}

export function buildRelationshipUpdateInput(
  current: Relationship,
  nextType: RelationshipType,
): UpdateRelationshipInput | null {
  if (nextType === current.type) return null;
  return {
    relationshipId: current.id,
    type: nextType,
    expectedVersion: current.metadata.version,
  };
}

export function buildCreatePersonInput(
  values: NewPersonFormValues,
): CreatePersonInput {
  return {
    displayLabel: normalizePersonLabel(values.displayLabel),
    ageClassification: values.ageClassification,
  };
}

export function buildCreateCasePersonInput(
  caseId: CaseId,
  personId: PersonId,
  role: CasePersonRole,
  restrictedByDefault: boolean,
  ageClassification: AgeClassification,
): CreateCasePersonInput {
  return {
    caseId,
    personId,
    role,
    restrictedByDefault: isMinorAge(ageClassification) ? true : restrictedByDefault,
  };
}

export function buildCreateRelationshipInput(
  caseId: CaseId,
  values: RelationshipFormValues,
): CreateRelationshipInput {
  return {
    caseId,
    fromPersonId: values.fromPersonId,
    toPersonId: values.toPersonId,
    type: values.type,
  };
}

// ---- Mapeamento público de erros ------------------------------------------

export type PeopleErrorKind =
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "offline"
  | "unavailable"
  | "validation"
  | "generic";

export type PeoplePublicError = Readonly<{
  kind: PeopleErrorKind;
  message: string;
}>;

const GENERIC = "Não foi possível concluir esta operação. Tente novamente.";

export function mapPeopleError(error: ServiceError): PeoplePublicError {
  switch (error.code) {
    case "not_found":
      return { kind: "not_found", message: "Registro não encontrado." };
    case "conflict": {
      switch (error.message) {
        case "duplicate_case_person":
          return {
            kind: "conflict",
            message: "Esta pessoa já está vinculada ao processo.",
          };
        case "case_person_in_use":
          return {
            kind: "conflict",
            message:
              "Remova primeiro as relações que envolvem esta pessoa.",
          };
        case "duplicate_relationship":
          return {
            kind: "conflict",
            message: "Esta relação já está cadastrada.",
          };
        default:
          return {
            kind: "conflict",
            message:
              "Estes dados foram alterados em outra ação. Recarregue antes de tentar novamente.",
          };
      }
    }
    case "unauthorized":
      return {
        kind: "unauthorized",
        message: "Sua sessão não está disponível. Entre novamente para continuar.",
      };
    case "forbidden":
      return {
        kind: "forbidden",
        message: "Você não tem permissão para esta ação.",
      };
    case "offline":
      return {
        kind: "offline",
        message:
          "Você está sem conexão no momento. Tente novamente quando a conexão for restabelecida.",
      };
    case "unavailable":
      return {
        kind: "unavailable",
        message: "O serviço está temporariamente indisponível. Tente novamente.",
      };
    case "validation_error": {
      switch (error.message) {
        case "self_relationship":
          return {
            kind: "validation",
            message: "Uma pessoa não pode ter relação consigo mesma.",
          };
        case "person_not_linked_to_case":
          return {
            kind: "validation",
            message: "As duas pessoas precisam estar vinculadas ao processo.",
          };
        case "case_person_links_unprotected":
          return {
            kind: "validation",
            message:
              "Proteja primeiro todos os vínculos desta pessoa antes de classificá-la como menor.",
          };
        default:
          return {
            kind: "validation",
            message: "Não foi possível salvar as informações.",
          };
      }
    }
    case "internal_error":
    default:
      return { kind: "generic", message: GENERIC };
  }
}

// ---- Permissões da seção --------------------------------------------------

export const PEOPLE_WRITE_ACTIONS = [
  "person.create",
  "person.update",
  "casePerson.create",
  "casePerson.update",
  "casePerson.remove",
  "relationship.create",
  "relationship.update",
  "relationship.remove",
] as const satisfies readonly PermissionAction[];

export type PeopleWriteAction = (typeof PEOPLE_WRITE_ACTIONS)[number];

/**
 * Ações de escrita que se referem a `Person` (organizacional) — nunca recebem
 * `caseId` na avaliação de permissão.
 */
export const PEOPLE_PERSON_ACTIONS = [
  "person.create",
  "person.update",
] as const satisfies readonly PeopleWriteAction[];

/**
 * Ações de escrita que se referem a um processo específico — sempre recebem
 * `caseId` na avaliação de permissão.
 */
export const PEOPLE_CASE_ACTIONS = [
  "casePerson.create",
  "casePerson.update",
  "casePerson.remove",
  "relationship.create",
  "relationship.update",
  "relationship.remove",
] as const satisfies readonly PeopleWriteAction[];

export type PeoplePermissions = Readonly<Record<PeopleWriteAction, boolean>>;

export function emptyPeoplePermissions(): PeoplePermissions {
  return {
    "person.create": false,
    "person.update": false,
    "casePerson.create": false,
    "casePerson.update": false,
    "casePerson.remove": false,
    "relationship.create": false,
    "relationship.update": false,
    "relationship.remove": false,
  };
}

/**
 * Cria um `PeoplePermissions` a partir de pares `[ação, permitido]` sem cast.
 */
export function buildPeoplePermissions(
  entries: Iterable<readonly [PeopleWriteAction, boolean]>,
): PeoplePermissions {
  const out: Record<PeopleWriteAction, boolean> = {
    "person.create": false,
    "person.update": false,
    "casePerson.create": false,
    "casePerson.update": false,
    "casePerson.remove": false,
    "relationship.create": false,
    "relationship.update": false,
    "relationship.remove": false,
  };
  for (const [k, v] of entries) out[k] = v;
  return out;
}

// ---- Coleta de IDs distintos ---------------------------------------------

/**
 * Retorna os `personId` presentes nos vínculos, sem duplicatas, preservando
 * a ordem da primeira ocorrência.
 */
export function collectDistinctLinkedPersonIds(
  casePeople: readonly CasePerson[],
): readonly PersonId[] {
  const seen = new Set<PersonId>();
  const out: PersonId[] = [];
  for (const cp of casePeople) {
    if (seen.has(cp.personId)) continue;
    seen.add(cp.personId);
    out.push(cp.personId);
  }
  return out;
}
