/**
 * LV-08.4.2.1 — provas de tipo estritas da seção Pessoas e Relações.
 *
 * Sem execução em runtime. Não usa `as never`, `as any` nem
 * `as unknown as`. Todos os IDs branded são obtidos por `declare const`.
 */

import type { AgeClassification, Person } from "@/domain/core/person";
import type {
  CasePerson,
  CasePersonRole,
  Relationship,
  RelationshipType,
} from "@/domain/core/assignment";
import type {
  CaseId,
  CasePersonId,
  OrganizationId,
  PersonId,
  RelationshipId,
} from "@/domain/core/ids";
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
  filterPersonsByDisplayLabel,
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

// ---- Valores ambientais tipados (sem casts) --------------------------------

declare const person: Person;
declare const casePerson: CasePerson;
declare const relationship: Relationship;

declare const caseId: CaseId;
declare const personId: PersonId;
declare const otherPersonId: PersonId;
declare const casePersonId: CasePersonId;
declare const relationshipId: RelationshipId;
declare const organizationId: OrganizationId;
void organizationId;
void casePerson;
void relationship;
void casePersonId;
void relationshipId;

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

const _perms: PeoplePermissions = emptyPeoplePermissions();
void _perms;
type _PeopleWriteAction = PeopleWriteAction;
const _oneAction: _PeopleWriteAction = "person.create";
void _oneAction;

// ---- Builders retornam DTOs oficiais --------------------------------------

const _cp: CreatePersonInput = buildCreatePersonInput({
  displayLabel: "X",
  ageClassification: "adult",
  role: "applicant",
  restrictedByDefault: false,
});
void _cp;

const _upType: UpdatePersonInput | null = buildPersonUpdateInput(person, {
  displayLabel: "Y",
  ageClassification: "adult",
});
void _upType;

const _cpBuilt: CreateCasePersonInput = buildCreateCasePersonInput(
  caseId,
  personId,
  "applicant",
  false,
  "adult",
);
void _cpBuilt;

const _upCPType: UpdateCasePersonInput | null = buildCasePersonUpdateInput(
  casePerson,
  { role: "witness", restrictedByDefault: true },
);
void _upCPType;

const _createRBuilt: CreateRelationshipInput = buildCreateRelationshipInput(
  caseId,
  {
    fromPersonId: personId,
    toPersonId: otherPersonId,
    type: "spouse",
  },
);
void _createRBuilt;

const _upRType: UpdateRelationshipInput | null = buildRelationshipUpdateInput(
  relationship,
  "former_spouse",
);
void _upRType;

// ---- Filtro puro preserva tipagem readonly<Person> ------------------------

declare const personList: readonly Person[];
const _filtered: readonly Person[] = filterPersonsByDisplayLabel(personList, "x");
void _filtered;

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

// ---- Campos proibidos em CreatePersonInput --------------------------------

// @ts-expect-error — id não pertence ao DTO de criação de pessoa
const _cpBadId: CreatePersonInput = { displayLabel: "A", ageClassification: "adult", id: personId };
void _cpBadId;

// @ts-expect-error — organizationId não pertence ao DTO de criação de pessoa
const _cpBadOrg: CreatePersonInput = { displayLabel: "A", ageClassification: "adult", organizationId };
void _cpBadOrg;

const _cpBadMeta: CreatePersonInput = {
  displayLabel: "A",
  ageClassification: "adult",
  // @ts-expect-error — metadata não pertence ao DTO de criação de pessoa
  metadata: { createdAt: "x", updatedAt: "x", version: 1 },
};
void _cpBadMeta;

// @ts-expect-error — caseId não pertence ao DTO de criação de pessoa
const _cpBadCase: CreatePersonInput = { displayLabel: "A", ageClassification: "adult", caseId };
void _cpBadCase;

// @ts-expect-error — role de vínculo não pertence ao DTO de pessoa
const _cpBadRole: CreatePersonInput = { displayLabel: "A", ageClassification: "adult", role: "applicant" };
void _cpBadRole;

// @ts-expect-error — restrictedByDefault não pertence ao DTO de pessoa
const _cpBadRestricted: CreatePersonInput = { displayLabel: "A", ageClassification: "adult", restrictedByDefault: false };
void _cpBadRestricted;

// @ts-expect-error — ageClassification inválido
const _cpBadAge: CreatePersonInput = { displayLabel: "A", ageClassification: "elderly" };
void _cpBadAge;

// ---- Campos proibidos em CreateCasePersonInput ----------------------------

// @ts-expect-error — caseId ausente é aceito? Não: é obrigatório. Valor inválido do tipo string cru é recusado.
const _ccpBadCase: CreateCasePersonInput = { caseId: "case_x", personId, role: "applicant", restrictedByDefault: false };
void _ccpBadCase;

// @ts-expect-error — personId cru não é branded PersonId
const _ccpBadPerson: CreateCasePersonInput = { caseId, personId: "person_x", role: "applicant", restrictedByDefault: false };
void _ccpBadPerson;

// @ts-expect-error — organizationId não pertence ao DTO de vínculo
const _ccpBadOrg: CreateCasePersonInput = { caseId, personId, role: "applicant", restrictedByDefault: false, organizationId };
void _ccpBadOrg;

// @ts-expect-error — metadata não pertence ao DTO de vínculo
const _ccpBadMeta: CreateCasePersonInput = {
  caseId,
  personId,
  role: "applicant",
  restrictedByDefault: false,
  metadata: { createdAt: "x", updatedAt: "x", version: 1 },
};
void _ccpBadMeta;

// @ts-expect-error — role inválido
const _ccpBadRole: CreateCasePersonInput = { caseId, personId, role: "boss", restrictedByDefault: false };
void _ccpBadRole;

// ---- Campos proibidos em CreateRelationshipInput --------------------------

// @ts-expect-error — caseId cru não é branded CaseId
const _crBadCase: CreateRelationshipInput = { caseId: "case_x", fromPersonId: personId, toPersonId: otherPersonId, type: "spouse" };
void _crBadCase;

// @ts-expect-error — fromPersonId cru não é branded PersonId
const _crBadFrom: CreateRelationshipInput = { caseId, fromPersonId: "person_x", toPersonId: otherPersonId, type: "spouse" };
void _crBadFrom;

// @ts-expect-error — toPersonId cru não é branded PersonId
const _crBadTo: CreateRelationshipInput = { caseId, fromPersonId: personId, toPersonId: "person_y", type: "spouse" };
void _crBadTo;

// @ts-expect-error — organizationId não pertence ao DTO de relação
const _crBadOrg: CreateRelationshipInput = { caseId, fromPersonId: personId, toPersonId: otherPersonId, type: "spouse", organizationId };
void _crBadOrg;

// @ts-expect-error — metadata não pertence ao DTO de relação
const _crBadMeta: CreateRelationshipInput = {
  caseId,
  fromPersonId: personId,
  toPersonId: otherPersonId,
  type: "spouse",
  metadata: { createdAt: "x", updatedAt: "x", version: 1 },
};
void _crBadMeta;

// @ts-expect-error — type inválido
const _crBadType: CreateRelationshipInput = { caseId, fromPersonId: personId, toPersonId: otherPersonId, type: "friend" };
void _crBadType;

// ---- IDs branded não são intercambiáveis ---------------------------------

// @ts-expect-error PersonId não é CaseId
const invalidCaseId: CaseId = personId;
void invalidCaseId;

// @ts-expect-error CaseId não é PersonId
const invalidPersonId: PersonId = caseId;
void invalidPersonId;

// @ts-expect-error RelationshipId não é CasePersonId
const invalidCasePersonId: CasePersonId = relationshipId;
void invalidCasePersonId;

// @ts-expect-error CasePersonId não é RelationshipId
const invalidRelationshipId: RelationshipId = casePersonId;
void invalidRelationshipId;

// @ts-expect-error OrganizationId não é PersonId
const invalidPersonId2: PersonId = organizationId;
void invalidPersonId2;

// @ts-expect-error PersonId não é OrganizationId
const invalidOrgId: OrganizationId = personId;
void invalidOrgId;
