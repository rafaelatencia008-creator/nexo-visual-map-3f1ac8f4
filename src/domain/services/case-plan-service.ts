/**
 * Contrato do serviço de Plano de trabalho — LV-08.5A.
 */

import type { CasePlanItem } from "../core/case-plan";
import type { CaseId, CasePlanItemId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type {
  ChangeCasePlanItemStatusInput,
  CreateCasePlanItemInput,
  UpdateCasePlanItemInput,
} from "./inputs";

export interface CasePlanService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
    planItemId: CasePlanItemId,
  ): Promise<ServiceResult<CasePlanItem>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<CasePlanItem>>>;

  create(
    context: ServiceContext,
    input: CreateCasePlanItemInput,
  ): Promise<ServiceResult<CasePlanItem>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateCasePlanItemInput,
  ): Promise<ServiceResult<CasePlanItem>>;

  changeStatus(
    context: ServiceContext,
    caseId: CaseId,
    input: ChangeCasePlanItemStatusInput,
  ): Promise<ServiceResult<CasePlanItem>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    planItemId: CasePlanItemId,
    expectedVersion: number,
  ): Promise<ServiceResult<void>>;
}
