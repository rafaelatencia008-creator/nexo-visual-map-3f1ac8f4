/**
 * LV-08.5B — modelo puro da seção "Plano de trabalho e Cronologia".
 *
 * Só TypeScript. Sem React, storage, rede. Concentra:
 * - rótulos oficiais em pt-BR;
 * - opções de responsável derivadas de Assignment + área do perfil;
 * - builders puros dos DTOs oficiais de Plano e Cronologia;
 * - mapeamento público de erros de serviço;
 * - helper de formatação de data ISO no padrão brasileiro.
 */

import {
  CASE_PLAN_ITEM_KINDS,
  CASE_PLAN_ITEM_STATUSES,
  CASE_PLAN_ITEM_PRIORITIES,
  CASE_TIMELINE_ENTRY_KINDS,
  type CasePlanItem,
  type CasePlanItemKind,
  type CasePlanItemPriority,
  type CasePlanItemStatus,
  type CaseTimelineEntry,
  type CaseTimelineEntryKind,
} from "@/domain/core/case-plan";
import {
  ASSIGNMENT_ROLES,
  type Assignment,
  type AssignmentRole,
} from "@/domain/core/assignment";
import type { ProfessionalProfile } from "@/domain/core/professional";
import { PERFIS, type Perfil } from "@/domain/shared/work-context";
import type { AssignmentId, ProfessionalProfileId } from "@/domain/core/ids";
import { isAssignmentId } from "@/domain/core/ids";
import { isIsoDate, type IsoDate } from "@/domain/core/common";
import type {
  ChangeCasePlanItemStatusInput,
  CreateCasePlanItemInput,
  CreateCaseTimelineEntryInput,
  UpdateCasePlanItemInput,
  UpdateCaseTimelineEntryInput,
} from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import type { PermissionAction } from "@/domain/services/permissions";

// ---- Rótulos oficiais ------------------------------------------------------

export const CASE_PLAN_ITEM_KIND_LABELS_PT: Readonly<
  Record<CasePlanItemKind, string>
> = {
  activity: "Atividade",
  pending: "Pendência",
};

export const CASE_PLAN_ITEM_STATUS_LABELS_PT: Readonly<
  Record<CasePlanItemStatus, string>
> = {
  planned: "Planejado",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const CASE_PLAN_ITEM_PRIORITY_LABELS_PT: Readonly<
  Record<CasePlanItemPriority, string>
> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};

export const CASE_TIMELINE_ENTRY_KIND_LABELS_PT: Readonly<
  Record<CaseTimelineEntryKind, string>
> = {
  milestone: "Marco",
  note: "Registro",
};

export const PROFESSIONAL_AREA_LABELS_PT: Readonly<Record<Perfil, string>> = {
  psicologia: "Psicologia",
  "servico-social": "Serviço Social",
  multi: "Atuação multiprofissional",
  outro: "Outra área",
};

export const ASSIGNMENT_ROLE_LABELS_PT: Readonly<
  Record<AssignmentRole, string>
> = {
  lead_professional: "Profissional principal",
  co_professional: "Coprofissional",
  reviewer: "Revisor",
  collaborator: "Colaborador",
  read_only: "Consulta",
};

// Guardas de integridade em tempo de módulo.
{
  for (const key of CASE_PLAN_ITEM_KINDS) {
    if (!(key in CASE_PLAN_ITEM_KIND_LABELS_PT))
      throw new Error(`CASE_PLAN_ITEM_KIND_LABELS_PT: falta ${key}`);
  }
  for (const key of CASE_PLAN_ITEM_STATUSES) {
    if (!(key in CASE_PLAN_ITEM_STATUS_LABELS_PT))
      throw new Error(`CASE_PLAN_ITEM_STATUS_LABELS_PT: falta ${key}`);
  }
  for (const key of CASE_PLAN_ITEM_PRIORITIES) {
    if (!(key in CASE_PLAN_ITEM_PRIORITY_LABELS_PT))
      throw new Error(`CASE_PLAN_ITEM_PRIORITY_LABELS_PT: falta ${key}`);
  }
  for (const key of CASE_TIMELINE_ENTRY_KINDS) {
    if (!(key in CASE_TIMELINE_ENTRY_KIND_LABELS_PT))
      throw new Error(`CASE_TIMELINE_ENTRY_KIND_LABELS_PT: falta ${key}`);
  }
  for (const key of PERFIS) {
    if (!(key in PROFESSIONAL_AREA_LABELS_PT))
      throw new Error(`PROFESSIONAL_AREA_LABELS_PT: falta ${key}`);
  }
  for (const key of ASSIGNMENT_ROLES) {
    if (!(key in ASSIGNMENT_ROLE_LABELS_PT))
      throw new Error(`ASSIGNMENT_ROLE_LABELS_PT: falta ${key}`);
  }
}

// ---- Permissões ------------------------------------------------------------

export const PLAN_ACTIONS = [
  "casePlanItem.create",
  "casePlanItem.update",
  "casePlanItem.changeStatus",
  "casePlanItem.remove",
] as const satisfies readonly PermissionAction[];

export const TIMELINE_ACTIONS = [
  "caseTimelineEntry.create",
  "caseTimelineEntry.update",
  "caseTimelineEntry.remove",
] as const satisfies readonly PermissionAction[];

export const ALL_PLAN_TIMELINE_ACTIONS = [
  ...PLAN_ACTIONS,
  ...TIMELINE_ACTIONS,
] as const;

export type PlanTimelineWriteAction = (typeof ALL_PLAN_TIMELINE_ACTIONS)[number];

export type PlanTimelinePermissions = Readonly<{
  createPlanItem: boolean;
  updatePlanItem: boolean;
  changePlanItemStatus: boolean;
  removePlanItem: boolean;
  createTimelineEntry: boolean;
  updateTimelineEntry: boolean;
  removeTimelineEntry: boolean;
}>;

export function emptyPlanTimelinePermissions(): PlanTimelinePermissions {
  return {
    createPlanItem: false,
    updatePlanItem: false,
    changePlanItemStatus: false,
    removePlanItem: false,
    createTimelineEntry: false,
    updateTimelineEntry: false,
    removeTimelineEntry: false,
  };
}

export function buildPlanTimelinePermissions(
  entries: readonly (readonly [PlanTimelineWriteAction, boolean])[],
): PlanTimelinePermissions {
  const map = new Map<PlanTimelineWriteAction, boolean>(entries);
  return {
    createPlanItem: map.get("casePlanItem.create") === true,
    updatePlanItem: map.get("casePlanItem.update") === true,
    changePlanItemStatus: map.get("casePlanItem.changeStatus") === true,
    removePlanItem: map.get("casePlanItem.remove") === true,
    createTimelineEntry: map.get("caseTimelineEntry.create") === true,
    updateTimelineEntry: map.get("caseTimelineEntry.update") === true,
    removeTimelineEntry: map.get("caseTimelineEntry.remove") === true,
  };
}

// ---- Opções de responsável -------------------------------------------------

export type AssignmentOption = Readonly<{
  assignmentId: AssignmentId;
  area: Perfil;
  role: AssignmentRole;
  status: Assignment["status"];
  label: string;
  availableForNewAssignments: boolean;
}>;

export function buildAssignmentOptionLabel(
  area: Perfil,
  role: AssignmentRole,
): string {
  return `${PROFESSIONAL_AREA_LABELS_PT[area]} — ${ASSIGNMENT_ROLE_LABELS_PT[role]}`;
}

export function collectDistinctProfessionalProfileIds(
  assignments: readonly Assignment[],
): readonly ProfessionalProfileId[] {
  const seen = new Set<string>();
  const out: ProfessionalProfileId[] = [];
  for (const a of assignments) {
    const id = a.professionalProfileId;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function buildAssignmentOptions(
  assignments: readonly Assignment[],
  profiles: readonly ProfessionalProfile[],
):
  | Readonly<{ ok: true; options: readonly AssignmentOption[] }>
  | Readonly<{ ok: false; missing: readonly string[] }> {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const missing: string[] = [];
  const options: AssignmentOption[] = [];
  for (const a of assignments) {
    const p = byId.get(a.professionalProfileId);
    if (!p) {
      missing.push(a.professionalProfileId);
      continue;
    }
    options.push({
      assignmentId: a.id,
      area: p.area,
      role: a.role,
      status: a.status,
      label: buildAssignmentOptionLabel(p.area, a.role),
      availableForNewAssignments: a.status === "active",
    });
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, options };
}

// ---- Formatação de data ----------------------------------------------------

/**
 * Converte uma data ISO (YYYY-MM-DD) para DD/MM/AAAA sem depender de fuso.
 * Separa diretamente os componentes; não usa `new Date`.
 */
export function formatIsoDatePtBr(date: IsoDate): string {
  const s = String(date);
  const y = s.slice(0, 4);
  const m = s.slice(5, 7);
  const d = s.slice(8, 10);
  return `${d}/${m}/${y}`;
}

// ---- Builders de Plano -----------------------------------------------------

export type PlanItemFormValues = Readonly<{
  kind: CasePlanItemKind;
  title: string;
  description: string;
  priority: CasePlanItemPriority;
  dueOn: string; // string bruta do input; pode ser "".
  assignmentId: string; // "" = sem responsável.
}>;

/**
 * Normaliza um assignmentId para uma NOVA atribuição.
 *
 * Só aceita opção presente em `valid` E com `availableForNewAssignments === true`.
 * Assignments suspensos/concluídos/cancelados são rejeitados mesmo que o ID
 * esteja no array (o array pode conter opções preservadas para edição).
 */
function normalizeAssignmentForNew(
  value: string,
  valid: readonly AssignmentOption[],
): AssignmentId | null | "invalid" {
  const t = value.trim();
  if (t.length === 0) return null;
  if (!isAssignmentId(t)) return "invalid";
  const opt = valid.find((o) => o.assignmentId === t);
  if (!opt) return "invalid";
  if (!opt.availableForNewAssignments) return "invalid";
  return t;
}

function normalizeIsoDateOrNull(value: string): IsoDate | null | "invalid" {
  const t = value.trim();
  if (t.length === 0) return null;
  if (!isIsoDate(t)) return "invalid";
  return t;
}

export function buildCreateCasePlanItemInput(
  caseId: CreateCasePlanItemInput["caseId"],
  values: PlanItemFormValues,
  validOptions: readonly AssignmentOption[],
):
  | Readonly<{ ok: true; input: CreateCasePlanItemInput }>
  | Readonly<{ ok: false; reason: "title_required" | "invalid_due" | "invalid_assignment" }> {
  const title = values.title.trim();
  if (title.length === 0) return { ok: false, reason: "title_required" };
  const desc = values.description.trim();
  const due = normalizeIsoDateOrNull(values.dueOn);
  if (due === "invalid") return { ok: false, reason: "invalid_due" };
  const aid = normalizeAssignmentForNew(values.assignmentId, validOptions);
  if (aid === "invalid") return { ok: false, reason: "invalid_assignment" };
  const input: CreateCasePlanItemInput = {
    caseId,
    kind: values.kind,
    title,
    priority: values.priority,
    ...(desc.length > 0 ? { description: desc } : {}),
    ...(due !== null ? { dueOn: due } : {}),
    ...(aid !== null ? { assignmentId: aid } : {}),
  };
  return { ok: true, input };
}

export function buildUpdateCasePlanItemInput(
  item: CasePlanItem,
  values: PlanItemFormValues,
  validOptions: readonly AssignmentOption[],
):
  | Readonly<{ ok: true; input: UpdateCasePlanItemInput | null }>
  | Readonly<{ ok: false; reason: "title_required" | "invalid_due" | "invalid_assignment" }> {
  const title = values.title.trim();
  if (title.length === 0) return { ok: false, reason: "title_required" };
  const descTrim = values.description.trim();
  const due = normalizeIsoDateOrNull(values.dueOn);
  if (due === "invalid") return { ok: false, reason: "invalid_due" };

  const rawAid = values.assignmentId.trim();
  type AssignAction =
    | { op: "noop" }
    | { op: "set"; value: AssignmentId }
    | { op: "unset" };
  let assignAction: AssignAction = { op: "noop" };
  if (rawAid.length === 0) {
    if (item.assignmentId !== undefined) assignAction = { op: "unset" };
  } else {
    if (!isAssignmentId(rawAid)) return { ok: false, reason: "invalid_assignment" };
    if (rawAid === item.assignmentId) {
      assignAction = { op: "noop" };
    } else {
      const opt = validOptions.find((o) => o.assignmentId === rawAid);
      if (!opt) return { ok: false, reason: "invalid_assignment" };
      if (!opt.availableForNewAssignments) return { ok: false, reason: "invalid_assignment" };
      assignAction = { op: "set", value: rawAid };
    }
  }

  const kindChanged = values.kind !== item.kind;
  const titleChanged = title !== item.title;
  const currentDesc = item.description;
  type DescAction = "noop" | "set" | "unset";
  const descAction: DescAction =
    descTrim.length === 0
      ? currentDesc !== undefined
        ? "unset"
        : "noop"
      : descTrim !== currentDesc
        ? "set"
        : "noop";
  const priorityChanged = values.priority !== item.priority;
  const currentDue = item.dueOn;
  type DueAction = { op: "noop" } | { op: "set"; value: IsoDate } | { op: "unset" };
  const dueAction: DueAction =
    due === null
      ? currentDue !== undefined
        ? { op: "unset" }
        : { op: "noop" }
      : due !== currentDue
        ? { op: "set", value: due }
        : { op: "noop" };

  const changed =
    kindChanged ||
    titleChanged ||
    descAction !== "noop" ||
    priorityChanged ||
    dueAction.op !== "noop" ||
    assignAction.op !== "noop";
  if (!changed) return { ok: true, input: null };

  const input: UpdateCasePlanItemInput = {
    planItemId: item.id,
    expectedVersion: item.metadata.version,
    ...(kindChanged ? { kind: values.kind } : {}),
    ...(titleChanged ? { title } : {}),
    ...(descAction === "set" ? { description: descTrim } : {}),
    ...(descAction === "unset" ? { description: null } : {}),
    ...(priorityChanged ? { priority: values.priority } : {}),
    ...(dueAction.op === "set" ? { dueOn: dueAction.value } : {}),
    ...(dueAction.op === "unset" ? { dueOn: null } : {}),
    ...(assignAction.op === "set" ? { assignmentId: assignAction.value } : {}),
    ...(assignAction.op === "unset" ? { assignmentId: null } : {}),
  };
  return { ok: true, input };
}

export function buildChangeCasePlanItemStatusInput(
  item: CasePlanItem,
  nextStatus: CasePlanItemStatus,
): ChangeCasePlanItemStatusInput | null {
  if (nextStatus === item.status) return null;
  return {
    planItemId: item.id,
    status: nextStatus,
    expectedVersion: item.metadata.version,
  };
}

// ---- Builders de Cronologia -----------------------------------------------

export type TimelineFormValues = Readonly<{
  kind: CaseTimelineEntryKind;
  occurredOn: string;
  title: string;
  description: string;
}>;

export function buildCreateCaseTimelineEntryInput(
  caseId: CreateCaseTimelineEntryInput["caseId"],
  values: TimelineFormValues,
):
  | Readonly<{ ok: true; input: CreateCaseTimelineEntryInput }>
  | Readonly<{ ok: false; reason: "title_required" | "date_required" }> {
  const title = values.title.trim();
  if (title.length === 0) return { ok: false, reason: "title_required" };
  const raw = values.occurredOn.trim();
  if (raw.length === 0 || !isIsoDate(raw)) return { ok: false, reason: "date_required" };
  const desc = values.description.trim();
  const input: CreateCaseTimelineEntryInput = {
    caseId,
    kind: values.kind,
    occurredOn: raw,
    title,
    ...(desc.length > 0 ? { description: desc } : {}),
  };
  return { ok: true, input };
}

export function buildUpdateCaseTimelineEntryInput(
  entry: CaseTimelineEntry,
  values: TimelineFormValues,
):
  | Readonly<{ ok: true; input: UpdateCaseTimelineEntryInput | null }>
  | Readonly<{ ok: false; reason: "title_required" | "date_required" }> {
  const title = values.title.trim();
  if (title.length === 0) return { ok: false, reason: "title_required" };
  const rawDate = values.occurredOn.trim();
  if (rawDate.length === 0 || !isIsoDate(rawDate)) return { ok: false, reason: "date_required" };
  const descTrim = values.description.trim();

  const kindChanged = values.kind !== entry.kind;
  const dateChanged = rawDate !== entry.occurredOn;
  const titleChanged = title !== entry.title;
  const currentDesc = entry.description;
  type DescAction = "noop" | "set" | "unset";
  const descAction: DescAction =
    descTrim.length === 0
      ? currentDesc !== undefined
        ? "unset"
        : "noop"
      : descTrim !== currentDesc
        ? "set"
        : "noop";

  const changed = kindChanged || dateChanged || titleChanged || descAction !== "noop";
  if (!changed) return { ok: true, input: null };

  const input: UpdateCaseTimelineEntryInput = {
    timelineEntryId: entry.id,
    expectedVersion: entry.metadata.version,
    ...(kindChanged ? { kind: values.kind } : {}),
    ...(dateChanged ? { occurredOn: rawDate } : {}),
    ...(titleChanged ? { title } : {}),
    ...(descAction === "set" ? { description: descTrim } : {}),
    ...(descAction === "unset" ? { description: null } : {}),
  };
  return { ok: true, input };
}

// ---- Mapeamento público de erros ------------------------------------------

export type PlanTimelinePublicErrorKind =
  | "forbidden"
  | "conflict"
  | "not_found"
  | "offline"
  | "unavailable"
  | "no_changes"
  | "assignment_not_in_case"
  | "generic";

export type PlanTimelinePublicError = Readonly<{
  kind: PlanTimelinePublicErrorKind;
  message: string;
}>;

export function mapPlanTimelineError(
  error: ServiceError,
): PlanTimelinePublicError {
  switch (error.code) {
    case "forbidden":
      return {
        kind: "forbidden",
        message: "Você não tem permissão para realizar esta ação.",
      };
    case "conflict":
      return {
        kind: "conflict",
        message:
          "O plano ou a cronologia foi alterado em outra ação. Recarregue os dados antes de tentar novamente.",
      };
    case "not_found":
      return {
        kind: "not_found",
        message:
          "Este item não está mais disponível. Recarregue o plano e a cronologia.",
      };
    case "offline":
      return {
        kind: "offline",
        message: "Você está offline. Verifique sua conexão e tente novamente.",
      };
    case "unavailable":
      return {
        kind: "unavailable",
        message: "O serviço está temporariamente indisponível.",
      };
    case "validation_error": {
      if (error.message === "assignment_not_in_case") {
        return {
          kind: "assignment_not_in_case",
          message: "O responsável selecionado não pertence a este processo.",
        };
      }
      if (error.message === "no_changes") {
        return {
          kind: "no_changes",
          message: "Nenhuma alteração foi feita.",
        };
      }
      return {
        kind: "generic",
        message: "Não foi possível concluir esta ação.",
      };
    }
    default:
      return {
        kind: "generic",
        message: "Não foi possível concluir esta ação.",
      };
  }
}
