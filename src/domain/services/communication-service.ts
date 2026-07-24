/**
 * Contrato do serviço de Comunicações da Agenda — LV-09.2A.
 *
 * `Communication` é um registro APPEND-ONLY vinculado a um `Appointment`
 * (compromisso). O serviço NÃO expõe `update` nem `remove` — apenas
 * `create`, `getById` e `listByAppointment`.
 */

import type {
  AppointmentId,
  CaseId,
  CommunicationId,
} from "../core/ids";
import type {
  Communication,
  CommunicationChannel,
  CommunicationDirection,
  CommunicationKind,
  CommunicationOutcome,
} from "../core/communication";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";
import type { CreateCommunicationInput } from "./inputs";

export type CommunicationListOptions = Readonly<{
  page?: PageRequest;
  kinds?: readonly CommunicationKind[];
  channels?: readonly CommunicationChannel[];
  outcomes?: readonly CommunicationOutcome[];
  directions?: readonly CommunicationDirection[];
}>;

export const COMMUNICATION_LIST_OPTIONS_ALLOWED_KEYS: ReadonlySet<string> =
  new Set(["page", "kinds", "channels", "outcomes", "directions"]);

export interface CommunicationService {
  create(
    context: ServiceContext,
    input: CreateCommunicationInput,
  ): Promise<ServiceResult<Communication>>;

  getById(
    context: ServiceContext,
    caseId: CaseId,
    appointmentId: AppointmentId,
    communicationId: CommunicationId,
  ): Promise<ServiceResult<Communication>>;

  listByAppointment(
    context: ServiceContext,
    caseId: CaseId,
    appointmentId: AppointmentId,
    options?: CommunicationListOptions,
  ): Promise<ServiceResult<PageResult<Communication>>>;
}
