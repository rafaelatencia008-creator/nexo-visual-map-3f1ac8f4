/**
 * LV-09.1B.4 — Helpers puros para criação de prazos e compromissos.
 *
 * Sem React, sem I/O, sem `Date.now()`. Traduzem o estado do formulário
 * para os DTOs oficiais `CreateDeadlineInput` e `CreateAppointmentInput`,
 * e traduzem erros do serviço para mensagens em pt-BR.
 */

import type {
  AppointmentKind,
  AppointmentMode,
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
import { isIsoDateTime, isoDateTimeToEpoch, type IsoDateTime } from "@/domain/core/common";
import type { AssignmentId, CaseId } from "@/domain/core/ids";
import { isAssignmentId, isCaseId } from "@/domain/core/ids";
import type {
  CreateAppointmentInput,
  CreateDeadlineInput,
} from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";

// ---- Estados de formulário ----------------------------------------------

export type CreateDeadlineFormState = Readonly<{
  caseId: string;
  kind: string;
  title: string;
  description: string;
  dueAtLocal: string;
  priority: string;
  assignmentId: string;
}>;

export type CreateAppointmentFormState = Readonly<{
  caseId: string;
  kind: string;
  title: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  mode: string;
  location: string;
  assignmentId: string;
}>;

export const EMPTY_DEADLINE_FORM: CreateDeadlineFormState = Object.freeze({
  caseId: "",
  kind: "",
  title: "",
  description: "",
  dueAtLocal: "",
  priority: "",
  assignmentId: "",
});

export const EMPTY_APPOINTMENT_FORM: CreateAppointmentFormState = Object.freeze({
  caseId: "",
  kind: "",
  title: "",
  description: "",
  startsAtLocal: "",
  endsAtLocal: "",
  mode: "",
  location: "",
  assignmentId: "",
});

export type DeadlineFieldError =
  | "caseId"
  | "kind"
  | "title"
  | "description"
  | "dueAt"
  | "priority"
  | "assignmentId";

export type AppointmentFieldError =
  | "caseId"
  | "kind"
  | "title"
  | "description"
  | "startsAt"
  | "endsAt"
  | "mode"
  | "location"
  | "assignmentId";

// ---- Normalizadores puros -----------------------------------------------

export type TitleResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: "empty" | "too_long" };

export function normalizeTitle(raw: string): TitleResult {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  if (raw.length > AGENDA_TITLE_MAX) return { ok: false, reason: "too_long" };
  const t = raw.trim();
  if (t.length === 0) return { ok: false, reason: "empty" };
  return { ok: true, value: t };
}

export type OptionalTextResult =
  | { readonly ok: true; readonly value: string | undefined }
  | { readonly ok: false; readonly reason: "too_long" };

export function normalizeOptionalDescription(raw: string): OptionalTextResult {
  if (typeof raw !== "string") return { ok: true, value: undefined };
  if (raw.length > AGENDA_DESCRIPTION_MAX)
    return { ok: false, reason: "too_long" };
  const t = raw.trim();
  return { ok: true, value: t.length === 0 ? undefined : t };
}

export function normalizeOptionalLocation(raw: string): OptionalTextResult {
  if (typeof raw !== "string") return { ok: true, value: undefined };
  if (raw.length > APPOINTMENT_LOCATION_MAX)
    return { ok: false, reason: "too_long" };
  const t = raw.trim();
  return { ok: true, value: t.length === 0 ? undefined : t };
}

// ---- Conversão datetime-local -> ISO ------------------------------------

export type DateTimeResult =
  | { readonly ok: true; readonly value: IsoDateTime }
  | { readonly ok: false; readonly reason: "empty" | "invalid" };

/**
 * Converte um valor `<input type="datetime-local">` (interpretado no fuso
 * do navegador) em `IsoDateTime` UTC. Não usa relógio real. Aceita:
 *   YYYY-MM-DDTHH:mm
 *   YYYY-MM-DDTHH:mm:ss
 * O parsing é feito com `Date` em modo local, e o resultado é validado
 * por `isIsoDateTime`.
 */
export function datetimeLocalToIso(raw: string): DateTimeResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, reason: "empty" };
  }
  const trimmed = raw.trim();
  // Regex estrita para formato datetime-local.
  const re = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
  const m = re.exec(trimmed);
  if (!m) return { ok: false, reason: "invalid" };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = m[6] !== undefined ? Number(m[6]) : 0;
  if (mo < 1 || mo > 12) return { ok: false, reason: "invalid" };
  if (d < 1 || d > 31) return { ok: false, reason: "invalid" };
  if (h > 23 || mi > 59 || s > 59) return { ok: false, reason: "invalid" };
  const local = new Date(y, mo - 1, d, h, mi, s, 0);
  // Verifica que a Date construída bate com os campos (rejeita 31/02, etc.).
  if (
    local.getFullYear() !== y ||
    local.getMonth() !== mo - 1 ||
    local.getDate() !== d ||
    local.getHours() !== h ||
    local.getMinutes() !== mi ||
    local.getSeconds() !== s
  ) {
    return { ok: false, reason: "invalid" };
  }
  const iso = local.toISOString();
  if (!isIsoDateTime(iso)) return { ok: false, reason: "invalid" };
  return { ok: true, value: iso };
}

// ---- Intervalo do compromisso -------------------------------------------

export type IntervalResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "not_after_start" };

export function validateAppointmentInterval(
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
): IntervalResult {
  if (isoDateTimeToEpoch(endsAt) > isoDateTimeToEpoch(startsAt)) {
    return { ok: true };
  }
  return { ok: false, reason: "not_after_start" };
}

// ---- Builders -----------------------------------------------------------

export type BuildDeadlineResult =
  | { readonly ok: true; readonly input: CreateDeadlineInput }
  | {
      readonly ok: false;
      readonly errors: Readonly<
        Partial<Record<DeadlineFieldError, string>>
      >;
    };

export type BuildAppointmentResult =
  | { readonly ok: true; readonly input: CreateAppointmentInput }
  | {
      readonly ok: false;
      readonly errors: Readonly<
        Partial<Record<AppointmentFieldError, string>>
      >;
    };

function optionalAssignmentId(
  raw: string,
): { ok: true; value: AssignmentId | undefined } | { ok: false } {
  if (raw === "" || raw === "none") return { ok: true, value: undefined };
  if (!isAssignmentId(raw)) return { ok: false };
  return { ok: true, value: raw };
}

export function buildCreateDeadlineInput(
  form: CreateDeadlineFormState,
): BuildDeadlineResult {
  const errors: Partial<Record<DeadlineFieldError, string>> = {};

  const caseIdOk = isCaseId(form.caseId);
  if (!caseIdOk) errors.caseId = "Selecione um processo válido.";

  const kindOk = isDeadlineKind(form.kind);
  if (!kindOk) errors.kind = "Selecione um tipo de prazo.";

  const priorityOk = isDeadlinePriority(form.priority);
  if (!priorityOk) errors.priority = "Selecione uma prioridade.";

  const title = normalizeTitle(form.title);
  if (!title.ok) {
    errors.title =
      title.reason === "empty"
        ? "Informe um título."
        : `O título deve ter até ${AGENDA_TITLE_MAX} caracteres.`;
  }

  const description = normalizeOptionalDescription(form.description);
  if (!description.ok) {
    errors.description = `A descrição deve ter até ${AGENDA_DESCRIPTION_MAX} caracteres.`;
  }

  const dueAt = datetimeLocalToIso(form.dueAtLocal);
  if (!dueAt.ok) {
    errors.dueAt =
      dueAt.reason === "empty"
        ? "Informe a data e a hora limite."
        : "Data e hora inválidas.";
  }

  const assignment = optionalAssignmentId(form.assignmentId);
  if (!assignment.ok) errors.assignmentId = "Responsável inválido.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // Todos os guards acima já garantiram os narrows abaixo:
  const input: CreateDeadlineInput = {
    caseId: form.caseId as CaseId,
    kind: form.kind as DeadlineKind,
    title: (title as { ok: true; value: string }).value,
    ...((description as { ok: true; value: string | undefined }).value !== undefined
      ? { description: (description as { ok: true; value: string }).value }
      : {}),
    dueAt: (dueAt as { ok: true; value: IsoDateTime }).value,
    priority: form.priority as DeadlinePriority,
    ...((assignment as { ok: true; value: AssignmentId | undefined }).value !==
    undefined
      ? {
          assignmentId: (assignment as { ok: true; value: AssignmentId }).value,
        }
      : {}),
  };
  return { ok: true, input };
}

export function buildCreateAppointmentInput(
  form: CreateAppointmentFormState,
): BuildAppointmentResult {
  const errors: Partial<Record<AppointmentFieldError, string>> = {};

  const caseIdOk = isCaseId(form.caseId);
  if (!caseIdOk) errors.caseId = "Selecione um processo válido.";

  const kindOk = isAppointmentKind(form.kind);
  if (!kindOk) errors.kind = "Selecione um tipo de compromisso.";

  const modeOk = isAppointmentMode(form.mode);
  if (!modeOk) errors.mode = "Selecione uma modalidade.";

  const title = normalizeTitle(form.title);
  if (!title.ok) {
    errors.title =
      title.reason === "empty"
        ? "Informe um título."
        : `O título deve ter até ${AGENDA_TITLE_MAX} caracteres.`;
  }

  const description = normalizeOptionalDescription(form.description);
  if (!description.ok) {
    errors.description = `A descrição deve ter até ${AGENDA_DESCRIPTION_MAX} caracteres.`;
  }

  const location = normalizeOptionalLocation(form.location);
  if (!location.ok) {
    errors.location = `A localização deve ter até ${APPOINTMENT_LOCATION_MAX} caracteres.`;
  }

  const startsAt = datetimeLocalToIso(form.startsAtLocal);
  if (!startsAt.ok) {
    errors.startsAt =
      startsAt.reason === "empty"
        ? "Informe o início."
        : "Início inválido.";
  }
  const endsAt = datetimeLocalToIso(form.endsAtLocal);
  if (!endsAt.ok) {
    errors.endsAt =
      endsAt.reason === "empty" ? "Informe o término." : "Término inválido.";
  }

  if (startsAt.ok && endsAt.ok) {
    const interval = validateAppointmentInterval(startsAt.value, endsAt.value);
    if (!interval.ok) {
      errors.endsAt = "O horário de término deve ser posterior ao início.";
    }
  }

  const assignment = optionalAssignmentId(form.assignmentId);
  if (!assignment.ok) errors.assignmentId = "Responsável inválido.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const input: CreateAppointmentInput = {
    caseId: form.caseId as CaseId,
    kind: form.kind as AppointmentKind,
    title: (title as { ok: true; value: string }).value,
    ...((description as { ok: true; value: string | undefined }).value !== undefined
      ? { description: (description as { ok: true; value: string }).value }
      : {}),
    startsAt: (startsAt as { ok: true; value: IsoDateTime }).value,
    endsAt: (endsAt as { ok: true; value: IsoDateTime }).value,
    mode: form.mode as AppointmentMode,
    ...((location as { ok: true; value: string | undefined }).value !== undefined
      ? { location: (location as { ok: true; value: string }).value }
      : {}),
    ...((assignment as { ok: true; value: AssignmentId | undefined }).value !==
    undefined
      ? {
          assignmentId: (assignment as { ok: true; value: AssignmentId }).value,
        }
      : {}),
  };
  return { ok: true, input };
}

// ---- Rascunho -----------------------------------------------------------

export function hasDeadlineDraft(f: CreateDeadlineFormState): boolean {
  return (
    f.caseId !== "" ||
    f.kind !== "" ||
    f.title.trim().length > 0 ||
    f.description.trim().length > 0 ||
    f.dueAtLocal !== "" ||
    f.priority !== "" ||
    f.assignmentId !== ""
  );
}

export function hasAppointmentDraft(f: CreateAppointmentFormState): boolean {
  return (
    f.caseId !== "" ||
    f.kind !== "" ||
    f.title.trim().length > 0 ||
    f.description.trim().length > 0 ||
    f.startsAtLocal !== "" ||
    f.endsAtLocal !== "" ||
    f.mode !== "" ||
    f.location.trim().length > 0 ||
    f.assignmentId !== ""
  );
}

// ---- Tradução de erros do serviço ---------------------------------------

export type TranslatedServiceError = Readonly<{
  message: string;
  field?: DeadlineFieldError | AppointmentFieldError;
}>;

const AGENDA_MESSAGE_MAP: Readonly<Record<string, TranslatedServiceError>> =
  Object.freeze({
    invalid_case_id: {
      message: "Selecione um processo válido.",
      field: "caseId",
    },
    invalid_kind: { message: "Tipo inválido.", field: "kind" },
    invalid_priority: {
      message: "Prioridade inválida.",
      field: "priority",
    },
    invalid_title: {
      message: `Título inválido (até ${AGENDA_TITLE_MAX} caracteres).`,
      field: "title",
    },
    invalid_description: {
      message: `Descrição inválida (até ${AGENDA_DESCRIPTION_MAX} caracteres).`,
      field: "description",
    },
    invalid_due_at: {
      message: "Data e hora inválidas.",
      field: "dueAt",
    },
    invalid_starts_at: { message: "Início inválido.", field: "startsAt" },
    invalid_ends_at: { message: "Término inválido.", field: "endsAt" },
    invalid_range: {
      message: "O horário de término deve ser posterior ao início.",
      field: "endsAt",
    },
    invalid_mode: { message: "Modalidade inválida.", field: "mode" },
    invalid_location: {
      message: `Localização inválida (até ${APPOINTMENT_LOCATION_MAX} caracteres).`,
      field: "location",
    },
    invalid_assignment_id: {
      message: "Responsável inválido.",
      field: "assignmentId",
    },
    assignment_not_in_case: {
      message: "O responsável selecionado não pertence a este processo.",
      field: "assignmentId",
    },
    assignment_not_active: {
      message: "O responsável selecionado não está ativo neste processo.",
      field: "assignmentId",
    },
    deadline_not_found: { message: "O processo não está mais disponível." },
    appointment_not_found: {
      message: "O processo não está mais disponível.",
    },
    resource_not_found: { message: "O processo não está mais disponível." },
    case_access_denied: {
      message: "Você não tem permissão para criar este item.",
    },
    role_not_allowed: {
      message: "Você não tem permissão para criar este item.",
    },
  });

export function translateAgendaServiceError(
  error: ServiceError,
): TranslatedServiceError {
  if (error.code === "forbidden") {
    return { message: "Você não tem permissão para criar este item." };
  }
  if (error.code === "unauthorized") {
    return { message: "Sessão inválida. Faça login novamente." };
  }
  if (error.code === "not_found") {
    return { message: "O processo não está mais disponível." };
  }
  if (error.code === "conflict") {
    return {
      message:
        "Conflito ao criar o item. Recarregue a agenda e tente novamente.",
    };
  }
  if (error.code === "offline") {
    return { message: "Sem conexão. Tente novamente." };
  }
  if (error.code === "unavailable") {
    return { message: "Serviço indisponível. Tente novamente em instantes." };
  }
  if (error.code === "internal_error") {
    return { message: "Erro interno. Tente novamente em instantes." };
  }
  // validation_error
  const key = error.message;
  const mapped = AGENDA_MESSAGE_MAP[key];
  if (mapped) return mapped;
  return { message: "Não foi possível salvar. Verifique os campos e tente novamente." };
}
