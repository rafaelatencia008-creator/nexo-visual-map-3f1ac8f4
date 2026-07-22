import type { Case, CaseReadiness } from "../core/case";
import type { CaseId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult, SortDirection } from "./pagination";
import type {
  CaseFilter,
  CaseSortField,
  ChangeCaseStatusInput,
  CreateCaseInput,
  UpdateCaseInput,
} from "./inputs";

export type CaseListRequest = Readonly<{
  filter?: CaseFilter;
  page: PageRequest;
  sortBy?: CaseSortField;
  sortDir?: SortDirection;
}>;

export type CaseReadinessView = Readonly<{
  readiness: CaseReadiness;
  issues: readonly string[];
}>;

export interface CaseService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
  ): Promise<ServiceResult<Case>>;

  list(
    context: ServiceContext,
    request: CaseListRequest,
  ): Promise<ServiceResult<PageResult<Case>>>;

  create(
    context: ServiceContext,
    input: CreateCaseInput,
  ): Promise<ServiceResult<Case>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateCaseInput,
  ): Promise<ServiceResult<Case>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeCaseStatusInput,
  ): Promise<ServiceResult<Case>>;

  archive(
    context: ServiceContext,
    caseId: CaseId,
    expectedVersion: number,
  ): Promise<ServiceResult<Case>>;

  getReadiness(
    context: ServiceContext,
    caseId: CaseId,
  ): Promise<ServiceResult<CaseReadinessView>>;
}
