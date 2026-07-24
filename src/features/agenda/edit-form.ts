/**
 * LV-09.1B.5 — Helpers puros para edição de prazo/compromisso da Agenda.
 *
 * Sem React, sem I/O, sem `Date.now()`. Trabalham com as entidades oficiais
 * `Deadline` / `Appointment` e produzem estritamente os DTOs oficiais
 * `UpdateDeadlineInput` / `UpdateAppointmentInput`, incluindo
 * `expectedVersion` capturado no início da edição.
 *
 * Remoção de campo opcional é expressa por `null` (description, location,
 * assignmentId). Campos não alterados NÃO são enviados.
 */

import type {
  Appointment,
  AppointmentKind,
  AppointmentMode,
  Deadline,
  DeadlineKind,
  DeadlinePriority,
} from "@/domain/core/agenda";
import {
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  APPOINTMENT_LOCATION_MAX,
  isAppointmentKind,
  isAppointmentMode,
  isDeadlineKind,
  isDeadlinePriority,
} from "@/domain/core/agenda";
import {
  isIsoDateTime,
  isoDateTimeToEpoch,
  type IsoDateTime,
} from "@/domain/core/common";
import type { AssignmentId, CaseId } from "@/domain/core/ids";
import { isAssignmentId, isCaseId } from "@/domain/core/ids";
import type {
  UpdateAppointmentInput,
  UpdateDeadlineInput,
} from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import {
  datetimeLocalToIso,
  normalizeOptionalDescription,
  normalizeOptionalLocation,
  normalizeTitle,
  validateAppointmentInterval,
} from "./create-form";

// ---- Conversão inversa ISO → datetime-local -----------------------------

/**
 * Converte um `IsoDateTime` UTC em uma string aceita por
 * `<input type="datetime-local">`, representando o instante no fuso local
 * do navegador. Preserva minutos (segundos são omitidos por padrão).
 * Não compara strings; usa `isoDateTimeToEpoch` internamente.
 */
export function isoDateTimeToDatetimeLocal(iso: IsoDateTime): string {
  const epoch = isoDateTimeToEpoch(iso);
  const d = new Date(epoch);
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid_iso");
  }
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Estados de formulário de edição ------------------------------------

export type EditDeadlineFormState = Readonly<{
  kind: string;
  title: string;
  description: string;
  dueAtLocal: string;
  priority: string;
  /** "" = sem responsável (equivale a undefined). */
  assignmentId: string;
}>;

export type EditAppointmentFormState = Readonly<{
  kind: string;
  title: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  mode: string;
  location: string;
  assignmentId: string;
}>;

export function deadlineToEditForm(d: Deadline): EditDeadlineFormState {
  return Object.freeze({
    kind: d.kind,
    title: d.title,
    description: d.description ?? "",
    dueAtLocal: isoDateTimeToDatetimeLocal(d.dueAt),
    priority: d.priority,
    assignmentId: d.assignmentId ?? "",
  });
}

export function appointmentToEditForm(a: Appointment): EditAppointmentFormState {
  return Object.freeze({
    kind: a.kind,
    title: a.title,
    description: a.description ?? "",
    startsAtLocal: isoDateTimeToDatetimeLocal(a.startsAt),
    endsAtLocal: isoDateTimeToDatetimeLocal(a.endsAt),
    mode: a.mode,
    location: a.location ?? "",
    assignmentId: a.assignmentId ?? "",
  });
}

// ---- Detecção pura de alterações ----------------------------------------

function sameOrBothAbsent(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return a === b;
}

function normOpt(raw: string, max: number): string | undefined {
  if (raw.length > max) return raw; // deixa builder rejeitar
  const t = raw.trim();
  return t.length === 0 ? undefined : t;
}

function sameInstant(isoA: IsoDateTime, isoB: IsoDateTime): boolean {
  return isoDateTimeToEpoch(isoA) === isoDateTimeToEpoch(isoB);
}

export function hasDeadlineChanges(
  original: Deadline,
  form: EditDeadlineFormState,
): boolean {
  if (form.kind !== original.kind) return true;
  if (form.priority !== original.priority) return true;

  const title = form.title.trim();
  if (title !== original.title) return true;

  const desc = normOpt(form.description, AGENDA_DESCRIPTION_MAX);
  if (!sameOrBothAbsent(desc, original.description)) return true;

  const dt = datetimeLocalToIso(form.dueAtLocal);
  if (!dt.ok) return true;
  if (!sameInstant(dt.value, original.dueAt)) return true;

  const assign = form.assignmentId === "" ? undefined : form.assignmentId;
  if (!sameOrBothAbsent(assign, original.assignmentId)) return true;

  return false;
}

export function hasAppointmentChanges(
  original: Appointment,
  form: EditAppointmentFormState,
): boolean {
  if (form.kind !== original.kind) return true;
  if (form.mode !== original.mode) return true;

  const title = form.title.trim();
  if (title !== original.title) return true;

  const desc = normOpt(form.description, AGENDA_DESCRIPTION_MAX);
  if (!sameOrBothAbsent(desc, original.description)) return true;

  const loc = normOpt(form.location, APPOINTMENT_LOCATION_MAX);
  if (!sameOrBothAbsent(loc, original.location)) return true;

  const start = datetimeLocalToIso(form.startsAtLocal);
  if (!start.ok) return true;
  if (!sameInstant(start.value, original.startsAt)) return true;

  const end = datetimeLocalToIso(form.endsAtLocal);
  if (!end.ok) return true;
  if (!sameInstant(end.value, original.endsAt)) return true;

  const assign = form.assignmentId === "" ? undefined : form.assignmentId;
  if (!sameOrBothAbsent(assign, original.assignmentId)) return true;

  return false;
}

// ---- Erros dos builders --------------------------------------------------

export type DeadlineEditFieldError =
  | "kind"
  | "title"
  | "description"
  | "dueAt"
  | "priority"
  | "assignmentId";

export type AppointmentEditFieldError =
  | "kind"
  | "title"
  | "description"
  | "startsAt"
  | "endsAt"
  | "mode"
  | "location"
  | "assignmentId";

// ---- Builders ------------------------------------------------------------

export type BuildUpdateDeadlineResult =
  | Readonly<{ ok: true; changed: true; input: UpdateDeadlineInput }>
  | Readonly<{ ok: true; changed: false }>
  | Readonly<{
      ok: false;
      errors: Readonly<Partial<Record<DeadlineEditFieldError, string>>>;
    }>;

export type BuildUpdateAppointmentResult =
  | Readonly<{ ok: true; changed: true; input: UpdateAppointmentInput }>
  | Readonly<{ ok: true; changed: false }>
  | Readonly<{
      ok: false;
      errors: Readonly<Partial<Record<AppointmentEditFieldError, string>>>;
    }>;

/**
 * `expectedVersion` deve ser a versão capturada no início da edição
 * (não a atual, para permitir concorrência otimista).
 */
export function buildUpdateDeadlineInput(
  original: Deadline,
  form: EditDeadlineFormState,
  expectedVersion: number,
): BuildUpdateDeadlineResult {
  const errors: Partial<Record<DeadlineEditFieldError, string>> = {};

  // Validações de campo
  if (!isDeadlineKind(form.kind))
    errors.kind = "Selecione um tipo de prazo.";
  if (!isDeadlinePriority(form.priority))
    errors.priority = "Selecione uma prioridade.";

  const title = normalizeTitle(form.title);
  if (!title.ok) {
    errors.title =
      title.reason === "empty"
        ? "Informe um título."
        : `O título deve ter até ${AGENDA_TITLE_MAX} caracteres.`;
  }

  const description = normalizeOptionalDescription(form.description);
  if (!description.ok)
    errors.description = `A descrição deve ter até ${AGENDA_DESCRIPTION_MAX} caracteres.`;

  const dueAt = datetimeLocalToIso(form.dueAtLocal);
  if (!dueAt.ok)
    errors.dueAt =
      dueAt.reason === "empty"
        ? "Informe a data e a hora limite."
        : "Data e hora inválidas.";

  let assignmentValid = true;
  if (form.assignmentId !== "" && !isAssignmentId(form.assignmentId)) {
    errors.assignmentId = "Responsável inválido.";
    assignmentValid = false;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // Delta em relação ao original
  const patch: Record<string, unknown> = {};
  let changed = false;

  if (form.kind !== original.kind) {
    patch.kind = form.kind as DeadlineKind;
    changed = true;
  }
  if (form.priority !== original.priority) {
    patch.priority = form.priority as DeadlinePriority;
    changed = true;
  }
  const titleValue = (title as { ok: true; value: string }).value;
  if (titleValue !== original.title) {
    patch.title = titleValue;
    changed = true;
  }
  const descValue = (description as { ok: true; value: string | undefined })
    .value;
  if (!sameOrBothAbsent(descValue, original.description)) {
    patch.description = descValue === undefined ? null : descValue;
    changed = true;
  }
  const dueValue = (dueAt as { ok: true; value: IsoDateTime }).value;
  if (!sameInstant(dueValue, original.dueAt)) {
    patch.dueAt = dueValue;
    changed = true;
  }
  const assignValue: AssignmentId | undefined =
    form.assignmentId === "" || !assignmentValid
      ? undefined
      : (form.assignmentId as AssignmentId);
  if (!sameOrBothAbsent(assignValue, original.assignmentId)) {
    patch.assignmentId = assignValue === undefined ? null : assignValue;
    changed = true;
  }

  if (!changed) return { ok: true, changed: false };

  const input: UpdateDeadlineInput = {
    caseId: original.caseId as CaseId,
    deadlineId: original.id,
    ...patch,
    expectedVersion,
  } as UpdateDeadlineInput;
  return { ok: true, changed: true, input };
}

export function buildUpdateAppointmentInput(
  original: Appointment,
  form: EditAppointmentFormState,
  expectedVersion: number,
): BuildUpdateAppointmentResult {
  const errors: Partial<Record<AppointmentEditFieldError, string>> = {};

  if (!isAppointmentKind(form.kind))
    errors.kind = "Selecione um tipo de compromisso.";
  if (!isAppointmentMode(form.mode))
    errors.mode = "Selecione uma modalidade.";

  const title = normalizeTitle(form.title);
  if (!title.ok) {
    errors.title =
      title.reason === "empty"
        ? "Informe um título."
        : `O título deve ter até ${AGENDA_TITLE_MAX} caracteres.`;
  }

  const description = normalizeOptionalDescription(form.description);
  if (!description.ok)
    errors.description = `A descrição deve ter até ${AGENDA_DESCRIPTION_MAX} caracteres.`;

  const location = normalizeOptionalLocation(form.location);
  if (!location.ok)
    errors.location = `A localização deve ter até ${APPOINTMENT_LOCATION_MAX} caracteres.`;

  const startsAt = datetimeLocalToIso(form.startsAtLocal);
  if (!startsAt.ok)
    errors.startsAt =
      startsAt.reason === "empty" ? "Informe o início." : "Início inválido.";
  const endsAt = datetimeLocalToIso(form.endsAtLocal);
  if (!endsAt.ok)
    errors.endsAt =
      endsAt.reason === "empty" ? "Informe o término." : "Término inválido.";

  if (startsAt.ok && endsAt.ok) {
    const interval = validateAppointmentInterval(startsAt.value, endsAt.value);
    if (!interval.ok) {
      errors.endsAt = "O horário de término deve ser posterior ao início.";
    }
  }

  let assignmentValid = true;
  if (form.assignmentId !== "" && !isAssignmentId(form.assignmentId)) {
    errors.assignmentId = "Responsável inválido.";
    assignmentValid = false;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const patch: Record<string, unknown> = {};
  let changed = false;

  if (form.kind !== original.kind) {
    patch.kind = form.kind as AppointmentKind;
    changed = true;
  }
  if (form.mode !== original.mode) {
    patch.mode = form.mode as AppointmentMode;
    changed = true;
  }
  const titleValue = (title as { ok: true; value: string }).value;
  if (titleValue !== original.title) {
    patch.title = titleValue;
    changed = true;
  }
  const descValue = (description as { ok: true; value: string | undefined })
    .value;
  if (!sameOrBothAbsent(descValue, original.description)) {
    patch.description = descValue === undefined ? null : descValue;
    changed = true;
  }
  const locValue = (location as { ok: true; value: string | undefined }).value;
  if (!sameOrBothAbsent(locValue, original.location)) {
    patch.location = locValue === undefined ? null : locValue;
    changed = true;
  }
  const startValue = (startsAt as { ok: true; value: IsoDateTime }).value;
  if (!sameInstant(startValue, original.startsAt)) {
    patch.startsAt = startValue;
    changed = true;
  }
  const endValue = (endsAt as { ok: true; value: IsoDateTime }).value;
  if (!sameInstant(endValue, original.endsAt)) {
    patch.endsAt = endValue;
    changed = true;
  }
  const assignValue: AssignmentId | undefined =
    form.assignmentId === "" || !assignmentValid
      ? undefined
      : (form.assignmentId as AssignmentId);
  if (!sameOrBothAbsent(assignValue, original.assignmentId)) {
    patch.assignmentId = assignValue === undefined ? null : assignValue;
    changed = true;
  }

  if (!changed) return { ok: true, changed: false };

  const input: UpdateAppointmentInput = {
    caseId: original.caseId as CaseId,
    appointmentId: original.id,
    ...patch,
    expectedVersion,
  } as UpdateAppointmentInput;
  return { ok: true, changed: true, input };
}

// ---- Tradução de erros de atualização -----------------------------------

export type TranslatedUpdateError =
  | Readonly<{ kind: "conflict"; expectedVersion?: number; actualVersion?: number; message: string }>
  | Readonly<{
      kind: "field";
      field: DeadlineEditFieldError | AppointmentEditFieldError;
      message: string;
    }>
  | Readonly<{ kind: "general"; message: string }>;

const UPDATE_FIELD_MAP: Readonly<
  Record<
    string,
    { field: DeadlineEditFieldError | AppointmentEditFieldError; message: string }
  >
> = Object.freeze({
  invalid_kind: { field: "kind", message: "Tipo inválido." },
  invalid_priority: { field: "priority", message: "Prioridade inválida." },
  invalid_title: {
    field: "title",
    message: `Título inválido (até ${AGENDA_TITLE_MAX} caracteres).`,
  },
  invalid_description: {
    field: "description",
    message: `Descrição inválida (até ${AGENDA_DESCRIPTION_MAX} caracteres).`,
  },
  invalid_due_at: { field: "dueAt", message: "Data e hora inválidas." },
  invalid_starts_at: { field: "startsAt", message: "Início inválido." },
  invalid_ends_at: { field: "endsAt", message: "Término inválido." },
  period_inverted: {
    field: "endsAt",
    message: "O horário de término deve ser posterior ao início.",
  },
  invalid_mode: { field: "mode", message: "Modalidade inválida." },
  invalid_location: {
    field: "location",
    message: `Localização inválida (até ${APPOINTMENT_LOCATION_MAX} caracteres).`,
  },
  invalid_assignment_id: {
    field: "assignmentId",
    message: "Responsável inválido.",
  },
  assignment_not_in_case: {
    field: "assignmentId",
    message: "O responsável selecionado não pertence a este processo.",
  },
  assignment_not_active: {
    field: "assignmentId",
    message: "O responsável selecionado não está ativo neste processo.",
  },
});

export function translateAgendaUpdateError(
  error: ServiceError,
): TranslatedUpdateError {
  if (error.code === "conflict") {
    return {
      kind: "conflict",
      ...(error.expectedVersion !== undefined
        ? { expectedVersion: error.expectedVersion }
        : {}),
      ...(error.actualVersion !== undefined
        ? { actualVersion: error.actualVersion }
        : {}),
      message:
        "Este item foi alterado em outra sessão. Recarregue os dados mais recentes antes de salvar novamente.",
    };
  }
  if (error.code === "forbidden") {
    return { kind: "general", message: "Você não tem permissão para editar este item." };
  }
  if (error.code === "unauthorized") {
    return { kind: "general", message: "Sessão inválida. Faça login novamente." };
  }
  if (error.code === "not_found") {
    return { kind: "general", message: "Este item não está mais disponível." };
  }
  if (error.code === "offline") {
    return { kind: "general", message: "Sem conexão. Tente novamente." };
  }
  if (error.code === "unavailable") {
    return { kind: "general", message: "Serviço indisponível. Tente novamente em instantes." };
  }
  if (error.code === "internal_error") {
    return { kind: "general", message: "Erro interno. Tente novamente em instantes." };
  }
  // validation_error
  const mapped = UPDATE_FIELD_MAP[error.message];
  if (mapped) return { kind: "field", field: mapped.field, message: mapped.message };
  return {
    kind: "general",
    message: "Não foi possível salvar. Verifique os campos e tente novamente.",
  };
}

// ---- Utilidades de rótulo ------------------------------------------------

/** Duração legível pt-BR entre dois instantes. */
export function formatDurationLabel(
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
): string {
  const ms = isoDateTimeToEpoch(endsAt) - isoDateTimeToEpoch(startsAt);
  if (ms <= 0) return "0 min";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// Reexports para conveniência de consumidores da UI
export { isCaseId };
