/**
 * LV-09.1B.7.2 — Helper puro do formulário consultivo de disponibilidade.
 *
 * Sem React, sem I/O. Reutiliza `datetimeLocalToIso` e
 * `validateAppointmentInterval` de `./create-form`. Não cria outro parser
 * de `datetime-local`. Traduz o estado do formulário em um input tipado
 * para `checkAppointmentAvailability` — sem `caseId`, sem `title`,
 * sem `status`, sem `excludeAppointmentId`, sem `expectedVersion`.
 */

import type { AssignmentId, CaseId } from "@/domain/core/ids";
import { isAssignmentId, isCaseId } from "@/domain/core/ids";
import type { CheckAppointmentAvailabilityInput } from "./check-appointment-availability";
import { datetimeLocalToIso, validateAppointmentInterval } from "./create-form";

// ---- Estado do formulário -----------------------------------------------

export type AvailabilityFormState = Readonly<{
  caseId: string;
  assignmentId: string;
  startsAtLocal: string;
  endsAtLocal: string;
}>;

export const EMPTY_AVAILABILITY_FORM: AvailabilityFormState = Object.freeze({
  caseId: "",
  assignmentId: "",
  startsAtLocal: "",
  endsAtLocal: "",
});

export type AvailabilityFormFieldError =
  | "caseId"
  | "assignmentId"
  | "startsAt"
  | "endsAt";

export type AvailabilityConsultationBuildResult =
  | Readonly<{
      ok: true;
      input: CheckAppointmentAvailabilityInput;
    }>
  | Readonly<{
      ok: false;
      errors: Readonly<Partial<Record<AvailabilityFormFieldError, string>>>;
    }>;

// ---- Mensagens oficiais --------------------------------------------------

export const AVAILABILITY_FORM_MESSAGES = Object.freeze({
  caseRequired: "Processo obrigatório.",
  assignmentRequired: "Responsável obrigatório.",
  startEmpty: "Informe a data e hora inicial.",
  endEmpty: "Informe a data e hora final.",
  startInvalid: "Data e hora inicial inválidas.",
  endInvalid: "Data e hora final inválidas.",
  endBeforeStart: "O término deve ser posterior ao início.",
});

// ---- Builder puro --------------------------------------------------------

export function buildAvailabilityConsultationInput(
  form: AvailabilityFormState,
): AvailabilityConsultationBuildResult {
  const errors: Partial<Record<AvailabilityFormFieldError, string>> = {};

  const rawCaseId = form.caseId.trim();
  const rawAssignmentId = form.assignmentId.trim();
  const rawStart = form.startsAtLocal;
  const rawEnd = form.endsAtLocal;

  let caseId: CaseId | undefined;
  if (rawCaseId.length === 0) {
    errors.caseId = AVAILABILITY_FORM_MESSAGES.caseRequired;
  } else if (!isCaseId(rawCaseId)) {
    errors.caseId = AVAILABILITY_FORM_MESSAGES.caseRequired;
  } else {
    caseId = rawCaseId;
  }

  let assignmentId: AssignmentId | undefined;
  if (rawAssignmentId.length === 0) {
    errors.assignmentId = AVAILABILITY_FORM_MESSAGES.assignmentRequired;
  } else if (!isAssignmentId(rawAssignmentId)) {
    errors.assignmentId = AVAILABILITY_FORM_MESSAGES.assignmentRequired;
  } else {
    assignmentId = rawAssignmentId;
  }

  const startParsed = datetimeLocalToIso(rawStart);
  if (!startParsed.ok) {
    errors.startsAt =
      startParsed.reason === "empty"
        ? AVAILABILITY_FORM_MESSAGES.startEmpty
        : AVAILABILITY_FORM_MESSAGES.startInvalid;
  }

  const endParsed = datetimeLocalToIso(rawEnd);
  if (!endParsed.ok) {
    errors.endsAt =
      endParsed.reason === "empty"
        ? AVAILABILITY_FORM_MESSAGES.endEmpty
        : AVAILABILITY_FORM_MESSAGES.endInvalid;
  }

  if (startParsed.ok && endParsed.ok) {
    const interval = validateAppointmentInterval(startParsed.value, endParsed.value);
    if (!interval.ok) {
      errors.endsAt = AVAILABILITY_FORM_MESSAGES.endBeforeStart;
    }
  }

  if (Object.keys(errors).length > 0) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }

  // `caseId` não faz parte do contrato do motor — foi validado apenas
  // para viabilizar a descoberta do vínculo.
  void caseId;

  // Neste ponto todos os campos foram validados com sucesso.
  const startsAt = startParsed.ok ? startParsed.value : (undefined as never);
  const endsAt = endParsed.ok ? endParsed.value : (undefined as never);

  const input: CheckAppointmentAvailabilityInput = Object.freeze({
    startsAt,
    endsAt,
    assignmentId: assignmentId as AssignmentId,
  });
  return Object.freeze({ ok: true, input });
}
