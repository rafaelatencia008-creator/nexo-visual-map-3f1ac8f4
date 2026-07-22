import type { Assignment } from "../core/assignment";
import type { AssignmentId, CaseId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type {
  ChangeAssignmentStatusInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "./inputs";

export interface AssignmentService {
  getById(
    context: ServiceContext,
    caseId: CaseId,
    id: AssignmentId,
  ): Promise<ServiceResult<Assignment>>;

  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<Assignment>>>;

  create(
    context: ServiceContext,
    input: CreateAssignmentInput,
  ): Promise<ServiceResult<Assignment>>;

  update(
    context: ServiceContext,
    caseId: CaseId,
    input: UpdateAssignmentInput,
  ): Promise<ServiceResult<Assignment>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeAssignmentStatusInput,
  ): Promise<ServiceResult<Assignment>>;
}
