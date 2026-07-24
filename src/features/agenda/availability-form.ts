/**
 * LV-09.1B.7.2 / LV-09.1B.7.2.1 — Helper puro do formulário consultivo.
 *
 * Sem React, sem I/O. Reutiliza `datetimeLocalToIso` e
 * `validateAppointmentInterval` de `./create-form`. Não cria outro parser
 * de `datetime-local`. Traduz o estado do formulário em um input tipado
 * para `checkAppointmentAvailability` — sem `caseId`, sem `title`,
 * sem `status`, sem `excludeAppointmentId`, sem `expectedVersion`.
 *
 * Correção LV-09.1B.7.2.1: sem `as never`, sem `undefined as never`,
 * sem `as AssignmentId`. TypeScript estreita `startParsed.ok`,
 * `endParsed.ok` e `isAssignmentId(rawAssignmentId)` diretamente.
 */

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

export type AvailabilityFormFieldError = "caseId" | "assignmentId" | "startsAt" | "endsAt";

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

  const caseIdValid = rawCaseId.length > 0 && isCaseId(rawCaseId);
  if (!caseIdValid) {
    errors.caseId = AVAILABILITY_FORM_MESSAGES.caseRequired;
  }

  const assignmentIdValid = rawAssignmentId.length > 0 && isAssignmentId(rawAssignmentId);
  if (!assignmentIdValid) {
    errors.assignmentId = AVAILABILITY_FORM_MESSAGES.assignmentRequired;
  }

  const startParsed = datetimeLocalToIso(form.startsAtLocal);
  if (!startParsed.ok) {
    errors.startsAt =
      startParsed.reason === "empty"
        ? AVAILABILITY_FORM_MESSAGES.startEmpty
        : AVAILABILITY_FORM_MESSAGES.startInvalid;
  }

  const endParsed = datetimeLocalToIso(form.endsAtLocal);
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

  // Estreitamento explícito: caso qualquer garantia acima não seja
  // reconhecida pelo compilador, retornamos o mesmo `false` (não
  // fabricamos valores sintéticos). Essa guarda é comprovadamente
  // inatingível quando `errors` é vazio, mas satisfaz o narrowing.
  if (!startParsed.ok || !endParsed.ok || !isAssignmentId(rawAssignmentId)) {
    return Object.freeze({ ok: false, errors: Object.freeze({}) });
  }

  const input: CheckAppointmentAvailabilityInput = Object.freeze({
    startsAt: startParsed.value,
    endsAt: endParsed.value,
    assignmentId: rawAssignmentId,
  });
  return Object.freeze({ ok: true, input });
}
