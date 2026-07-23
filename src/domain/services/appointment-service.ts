/**
 * Contrato do serviço de Compromissos da Agenda — LV-09.1A.
 */

import type {
  AppointmentId,
  AssignmentId,
  CaseId,
} from "../core/ids";
import type {
  Appointment,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
} from "../core/agenda";
import type { IsoDateTime } from "../core/common";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type {
  ChangeAppointmentStatusInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "./inputs";

export type AppointmentListOptions = Readonly<{
  page?: PageRequest;
  caseId?: CaseId;
  rangeFrom?: IsoDateTime;
  rangeTo?: IsoDateTime;
  statuses?: readonly AppointmentStatus[];
  kinds?: readonly AppointmentKind[];
  modes?: readonly AppointmentMode[];
  assignmentIds?: readonly AssignmentId[];
  search?: string;
}>;

export const APPOINTMENT_LIST_OPTIONS_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "page",
  "caseId",
  "rangeFrom",
  "rangeTo",
  "statuses",
  "kinds",
  "modes",
  "assignmentIds",
  "search",
]);

export interface AppointmentService {
  create(
    context: ServiceContext,
    input: CreateAppointmentInput,
  ): Promise<ServiceResult<Appointment>>;

  getById(
    context: ServiceContext,
    caseId: CaseId,
    appointmentId: AppointmentId,
  ): Promise<ServiceResult<Appointment>>;

  list(
    context: ServiceContext,
    options?: AppointmentListOptions,
  ): Promise<ServiceResult<PageResult<Appointment>>>;

  update(
    context: ServiceContext,
    input: UpdateAppointmentInput,
  ): Promise<ServiceResult<Appointment>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeAppointmentStatusInput,
  ): Promise<ServiceResult<Appointment>>;

  remove(
    context: ServiceContext,
    caseId: CaseId,
    appointmentId: AppointmentId,
    expectedVersion: number,
  ): Promise<ServiceResult<{ readonly removed: true }>>;
}
