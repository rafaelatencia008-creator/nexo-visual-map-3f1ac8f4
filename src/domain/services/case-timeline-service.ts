/**
 * Contrato do serviço de Cronologia manual — LV-08.5A.
 */

import type { CaseTimelineEntry } from "../core/case-plan";
import type { CaseId, CaseTimelineEntryId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type {
  CreateCaseTimelineEntryInput,
  UpdateCaseTimelineEntryInput,
} from "./inputs";

export interface CaseTimelineService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
    timelineEntryId: CaseTimelineEntryId,
  ): Promise<ServiceResult<CaseTimelineEntry>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<CaseTimelineEntry>>>;

  create(
    context: ServiceContext,
    input: CreateCaseTimelineEntryInput,
  ): Promise<ServiceResult<CaseTimelineEntry>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateCaseTimelineEntryInput,
  ): Promise<ServiceResult<CaseTimelineEntry>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    timelineEntryId: CaseTimelineEntryId,
    expectedVersion: number,
  ): Promise<ServiceResult<void>>;
}
