import type { Person } from "../core/person";
import type {
  CaseId,
  CasePersonId,
  PersonId,
  RelationshipId,
} from "../core/ids";
import type { CasePerson, Relationship } from "../core/assignment";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult, SortDirection } from "./pagination";
import type {
  CreateCasePersonInput,
  CreatePersonInput,
  CreateRelationshipInput,
  PersonFilter,
  UpdateCasePersonInput,
  UpdatePersonInput,
  UpdateRelationshipInput,
} from "./inputs";

export const PERSON_SORT_FIELDS = [
  "displayLabel",
  "createdAt",
  "ageClassification",
] as const;
export type PersonSortField = (typeof PERSON_SORT_FIELDS)[number];

export type PersonListRequest = Readonly<{
  filter?: PersonFilter;
  page: PageRequest;
  sortBy?: PersonSortField;
  sortDir?: SortDirection;
}>;

export interface PersonService {
  getById(
    context: ServiceContext,
    id: PersonId,
  ): Promise<ServiceResult<Person>>;

  list(
    context: ServiceContext,
    request: PersonListRequest,
  ): Promise<ServiceResult<PageResult<Person>>>;

  create(
    context: ServiceContext,
    input: CreatePersonInput,
  ): Promise<ServiceResult<Person>>;

  update(
    context: ServiceContext,
    id: PersonId,
    input: UpdatePersonInput,
  ): Promise<ServiceResult<Person>>;
}

export interface CasePersonService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
    casePersonId: CasePersonId,
  ): Promise<ServiceResult<CasePerson>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<CasePerson>>>;

  create(
    context: ServiceContext,
    input: CreateCasePersonInput,
  ): Promise<ServiceResult<CasePerson>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateCasePersonInput,
  ): Promise<ServiceResult<CasePerson>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    casePersonId: CasePersonId,
    expectedVersion: number,
  ): Promise<ServiceResult<CasePerson>>;
}

export interface RelationshipService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
    id: RelationshipId,
  ): Promise<ServiceResult<Relationship>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<Relationship>>>;

  create(
    context: ServiceContext,
    input: CreateRelationshipInput,
  ): Promise<ServiceResult<Relationship>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateRelationshipInput,
  ): Promise<ServiceResult<Relationship>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    id: RelationshipId,
    expectedVersion: number,
  ): Promise<ServiceResult<Relationship>>;
}
