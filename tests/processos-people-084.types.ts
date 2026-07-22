/**
 * LV-08.4 — provas de tipo estritas da seção Pessoas e Relações.
 *
 * Sem execução em runtime: valida catálogos, DTOs e mapeamentos.
 */

import type { AgeClassification } from "@/domain/core/person";
import type {
  CasePersonRole,
  RelationshipType,
} from "@/domain/core/assignment";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  RELATIONSHIP_TYPE_LABELS_PT,
  PEOPLE_WRITE_ACTIONS,
  buildCreateCasePersonInput,
  buildCreatePersonInput,
  buildCreateRelationshipInput,
  buildCasePersonUpdateInput,
  buildPersonUpdateInput,
  buildRelationshipUpdateInput,
  emptyPeoplePermissions,
  mapPeopleError,
  type LinkedCasePersonView,
  type PeopleWriteAction,
  type PeoplePermissions,
  type PeoplePublicError,
  type ProcessRelationshipView,
} from "@/features/processos/process-people-model";
import type {
  CreateCasePersonInput,
  CreatePersonInput,
  CreateRelationshipInput,
  UpdateCasePersonInput,
  UpdatePersonInput,
  UpdateRelationshipInput,
} from "@/domain/services/inputs";
import type { PermissionAction } from "@/domain/services/permissions";

// ---- Catálogo cobre todos os enums oficiais -------------------------------

const _ageKeys: Record<AgeClassification, string> = AGE_CLASSIFICATION_LABELS_PT;
const _roleKeys: Record<CasePersonRole, string> = CASE_PERSON_ROLE_LABELS_PT;
const _relKeys: Record<RelationshipType, string> = RELATIONSHIP_TYPE_LABELS_PT;
void _ageKeys;
void _roleKeys;
void _relKeys;

// ---- PEOPLE_WRITE_ACTIONS é subconjunto de PermissionAction ---------------

const _pw: readonly PermissionAction[] = PEOPLE_WRITE_ACTIONS;
void _pw;

// PeoplePermissions cobre exatamente PEOPLE_WRITE_ACTIONS.
const _perms: PeoplePermissions = emptyPeoplePermissions();
void _perms;
type _PeopleWriteAction = PeopleWriteAction;
const _oneAction: _PeopleWriteAction = "person.create";
void _oneAction;

// ---- Builders retornam DTOs oficiais --------------------------------------

declare const _createPerson: CreatePersonInput;
const _cp: CreatePersonInput = buildCreatePersonInput({
  displayLabel: "X",
  ageClassification: "adult",
  role: "applicant",
  restrictedByDefault: false,
});
void _cp;
void _createPerson;

declare const _updatePerson: UpdatePersonInput | null;
const _upBuilt = buildPersonUpdateInput(
  {
    id: "person_x" as never,
    organizationId: "org_x" as never,
    displayLabel: "X",
    ageClassification: "adult",
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 1,
    },
  } as never,
  { displayLabel: "Y", ageClassification: "adult" },
);
const _upType: UpdatePersonInput | null = _upBuilt;
void _upType;
void _updatePerson;

declare const _createCP: CreateCasePersonInput;
const _cpBuilt: CreateCasePersonInput = buildCreateCasePersonInput(
  "case_x" as never,
  "person_x" as never,
  "applicant",
  false,
  "adult",
);
void _cpBuilt;
void _createCP;

declare const _updateCP: UpdateCasePersonInput | null;
const _upCP = buildCasePersonUpdateInput(
  {
    id: "casePerson_x" as never,
    organizationId: "org_x" as never,
    caseId: "case_x" as never,
    personId: "person_x" as never,
    role: "applicant",
    restrictedByDefault: false,
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 1,
    },
  } as never,
  { role: "witness", restrictedByDefault: true },
);
const _upCPType: UpdateCasePersonInput | null = _upCP;
void _upCPType;
void _updateCP;

declare const _createR: CreateRelationshipInput;
const _createRBuilt: CreateRelationshipInput = buildCreateRelationshipInput(
  "case_x" as never,
  {
    fromPersonId: "person_x" as never,
    toPersonId: "person_y" as never,
    type: "spouse",
  },
);
void _createRBuilt;
void _createR;

declare const _updateR: UpdateRelationshipInput | null;
const _upR = buildRelationshipUpdateInput(
  {
    id: "relationship_x" as never,
    organizationId: "org_x" as never,
    caseId: "case_x" as never,
    fromPersonId: "person_x" as never,
    toPersonId: "person_y" as never,
    type: "spouse",
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 1,
    },
  } as never,
  "former_spouse",
);
const _upRType: UpdateRelationshipInput | null = _upR;
void _upRType;
void _updateR;

// ---- Views compostas preservam entidades oficiais -------------------------

declare const _view: LinkedCasePersonView;
declare const _rview: ProcessRelationshipView;
const _fromLabel: string = _rview.fromPerson.displayLabel;
const _linkRole: CasePersonRole = _view.link.role;
void _fromLabel;
void _linkRole;

// ---- Erros públicos: união restrita ---------------------------------------

const _err: PeoplePublicError = mapPeopleError({
  code: "conflict",
  message: "duplicate_case_person",
});
void _err;

// @ts-expect-error — kind não pode ser desconhecido
const _errBadKind: PeoplePublicError = { kind: "boom", message: "" };
void _errBadKind;

// @ts-expect-error — ação fora do catálogo de escrita
const _badAction: PeopleWriteAction = "case.update";
void _badAction;

// @ts-expect-error — classificação etária desconhecida
const _badAge: AgeClassification = "elderly";
void _badAge;

// @ts-expect-error — tipo de relação desconhecido
const _badRel: RelationshipType = "friend";
void _badRel;

// @ts-expect-error — papel desconhecido no vínculo
const _badRole: CasePersonRole = "boss";
void _badRole;
