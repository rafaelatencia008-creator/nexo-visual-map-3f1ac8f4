/**
 * Contrato do serviço de Prazos da Agenda — LV-09.1A.
 */

import type {
  AssignmentId,
  CaseId,
  DeadlineId,
} from "../core/ids";
import type {
  Deadline,
  DeadlineKind,
  DeadlinePriority,
  DeadlineStatus,
} from "../core/agenda";
import type { IsoDateTime } from "../core/common";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type {
  ChangeDeadlineStatusInput,
  CreateDeadlineInput,
  UpdateDeadlineInput,
} from "./inputs";

export type DeadlineListOptions = Readonly<{
  page?: PageRequest;
  caseId?: CaseId;
  rangeFrom?: IsoDateTime;
  rangeTo?: IsoDateTime;
  statuses?: readonly DeadlineStatus[];
  kinds?: readonly DeadlineKind[];
  priorities?: readonly DeadlinePriority[];
  assignmentIds?: readonly AssignmentId[];
  search?: string;
}>;

export const DEADLINE_LIST_OPTIONS_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "page",
  "caseId",
  "rangeFrom",
  "rangeTo",
  "statuses",
  "kinds",
  "priorities",
  "assignmentIds",
  "search",
]);

export interface DeadlineService {
  create(
    context: ServiceContext,
    input: CreateDeadlineInput,
  ): Promise<ServiceResult<Deadline>>;

  getById(
    context: ServiceContext,
    caseId: CaseId,
    deadlineId: DeadlineId,
  ): Promise<ServiceResult<Deadline>>;

  list(
    context: ServiceContext,
    options?: DeadlineListOptions,
  ): Promise<ServiceResult<PageResult<Deadline>>>;

  update(
    context: ServiceContext,
    input: UpdateDeadlineInput,
  ): Promise<ServiceResult<Deadline>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeDeadlineStatusInput,
  ): Promise<ServiceResult<Deadline>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    deadlineId: DeadlineId,
    expectedVersion: number,
  ): Promise<ServiceResult<{ readonly removed: true }>>;
}
