/**
 * Contrato do serviço de Snapshot do processo — LV-08.6A.
 *
 * Snapshots são imutáveis: não há update ou remove.
 */

import type { CaseSnapshot } from "../core/case-audit";
import type { CaseId, CaseSnapshotId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type { CreateCaseSnapshotInput } from "./inputs";

export type CaseSnapshotListOptions = Readonly<{
  page?: PageRequest;
}>;

export interface CaseSnapshotService {
  create(
    context: ServiceContext,
    input: CreateCaseSnapshotInput,
  ): Promise<ServiceResult<CaseSnapshot>>;

  getById(
    context: ServiceContext,
    caseId: CaseId,
    snapshotId: CaseSnapshotId,
  ): Promise<ServiceResult<CaseSnapshot>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    options?: CaseSnapshotListOptions,
  ): Promise<ServiceResult<PageResult<CaseSnapshot>>>;
}
