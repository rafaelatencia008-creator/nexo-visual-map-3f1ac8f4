/**
 * LV-08.6B — modelo puro da seção "Histórico de alterações e Snapshots".
 *
 * Só TypeScript. Sem React, storage ou rede.
 */

import {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditEvent,
  type CaseSnapshotPayload,
} from "@/domain/core/case-audit";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import {
  isIsoDateTime,
  type IsoDate,
  type IsoDateTime,
} from "@/domain/core/common";
import type { CaseId, UserId } from "@/domain/core/ids";
import type { PermissionAction } from "@/domain/services/permissions";

// ---- Categorias visuais ---------------------------------------------------

export const AUDIT_CATEGORIES = [
  "processo",
  "pessoas",
  "relacoes",
  "equipe",
  "plano",
  "cronologia",
  "snapshot",
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS_PT: Readonly<Record<AuditCategory, string>> = {
  processo: "Processo",
  pessoas: "Pessoas",
  relacoes: "Relações",
  equipe: "Equipe",
  plano: "Plano de trabalho",
  cronologia: "Cronologia",
  snapshot: "Snapshot",
};

export const AUDIT_ACTION_TO_CATEGORY: Readonly<Record<AuditAction, AuditCategory>> = {
  "case.created": "processo",
  "case.updated": "processo",
  "casePerson.created": "pessoas",
  "casePerson.updated": "pessoas",
  "casePerson.removed": "pessoas",
  "relationship.created": "relacoes",
  "relationship.updated": "relacoes",
  "relationship.removed": "relacoes",
  "assignment.created": "equipe",
  "assignment.updated": "equipe",
  "assignment.removed": "equipe",
  "casePlanItem.created": "plano",
  "casePlanItem.updated": "plano",
  "casePlanItem.statusChanged": "plano",
  "casePlanItem.removed": "plano",
  "caseTimelineEntry.created": "cronologia",
  "caseTimelineEntry.updated": "cronologia",
  "caseTimelineEntry.removed": "cronologia",
  "caseSnapshot.created": "snapshot",
};

// Guarda de integridade — toda AuditAction deve estar mapeada.
{
  for (const a of AUDIT_ACTIONS) {
    if (!(a in AUDIT_ACTION_TO_CATEGORY)) {
      throw new Error(`AUDIT_ACTION_TO_CATEGORY: falta ${a}`);
    }
  }
}

export function getActionsForCategory(
  category: AuditCategory,
): readonly AuditAction[] {
  const out: AuditAction[] = [];
  for (const a of AUDIT_ACTIONS) {
    if (AUDIT_ACTION_TO_CATEGORY[a] === category) out.push(a);
  }
  return out;
}

export const AUDIT_CATEGORY_TO_ACTIONS: Readonly<
  Record<AuditCategory, readonly AuditAction[]>
> = {
  processo: getActionsForCategory("processo"),
  pessoas: getActionsForCategory("pessoas"),
  relacoes: getActionsForCategory("relacoes"),
  equipe: getActionsForCategory("equipe"),
  plano: getActionsForCategory("plano"),
  cronologia: getActionsForCategory("cronologia"),
  snapshot: getActionsForCategory("snapshot"),
};

// ---- Permissões da seção --------------------------------------------------

export const AUDIT_SNAPSHOT_ACTIONS = [
  "auditEvent.read",
  "caseSnapshot.read",
  "caseSnapshot.create",
] as const satisfies readonly PermissionAction[];

export type AuditSnapshotAction = (typeof AUDIT_SNAPSHOT_ACTIONS)[number];

export type AuditSnapshotPermissions = Readonly<{
  canReadAudit: boolean;
  canReadSnapshots: boolean;
  canCreateSnapshot: boolean;
}>;

export function buildAuditSnapshotPermissions(
  entries: readonly (readonly [AuditSnapshotAction, boolean])[],
): AuditSnapshotPermissions {
  const m = new Map<AuditSnapshotAction, boolean>(entries);
  return {
    canReadAudit: m.get("auditEvent.read") === true,
    canReadSnapshots: m.get("caseSnapshot.read") === true,
    canCreateSnapshot: m.get("caseSnapshot.create") === true,
  };
}

// ---- Autor público --------------------------------------------------------

export function getPublicAuthorLabel(
  event: Pick<AuditEvent, "actorUserId">,
  currentUserId: UserId,
): string {
  return event.actorUserId === currentUserId ? "Você" : "Outro usuário autorizado";
}

// ---- Datas ----------------------------------------------------------------

/**
 * Converte YYYY-MM-DD para DD/MM/AAAA sem depender de fuso horário.
 */
export function formatIsoDatePtBr(date: IsoDate | string): string {
  const s = String(date);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
}

/**
 * Converte IsoDateTime para "DD/MM/AAAA às HH:mm" no fuso local.
 */
export function formatIsoDateTimePtBr(value: IsoDateTime): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
}

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte um YYYY-MM-DD local em IsoDateTime UTC (início do dia).
 * Retorna null se o formato for inválido ou a data não existir no calendário.
 */
export function localDateToIsoStartOfDay(value: string): IsoDateTime | null {
  const t = value.trim();
  if (!LOCAL_DATE_RE.test(t)) return null;
  const iso = `${t}T00:00:00.000Z`;
  return isIsoDateTime(iso) ? iso : null;
}

export function localDateToIsoEndOfDay(value: string): IsoDateTime | null {
  const t = value.trim();
  if (!LOCAL_DATE_RE.test(t)) return null;
  const iso = `${t}T23:59:59.999Z`;
  return isIsoDateTime(iso) ? iso : null;
}

// ---- Filtros --------------------------------------------------------------

export type AuditFilterFormValues = Readonly<{
  category: AuditCategory | "";
  dateFrom: string;
  dateTo: string;
}>;

export type AuditFilterBuildResult =
  | Readonly<{
      ok: true;
      actions?: readonly AuditAction[];
      occurredFrom?: IsoDateTime;
      occurredTo?: IsoDateTime;
    }>
  | Readonly<{
      ok: false;
      reason: "invalid_from" | "invalid_to" | "range_inverted";
    }>;

export function buildAuditFilter(
  values: AuditFilterFormValues,
): AuditFilterBuildResult {
  let from: IsoDateTime | undefined;
  let to: IsoDateTime | undefined;
  if (values.dateFrom.trim().length > 0) {
    const parsed = localDateToIsoStartOfDay(values.dateFrom);
    if (!parsed) return { ok: false, reason: "invalid_from" };
    from = parsed;
  }
  if (values.dateTo.trim().length > 0) {
    const parsed = localDateToIsoEndOfDay(values.dateTo);
    if (!parsed) return { ok: false, reason: "invalid_to" };
    to = parsed;
  }
  if (from !== undefined && to !== undefined && from > to) {
    return { ok: false, reason: "range_inverted" };
  }
  const actions =
    values.category === "" ? undefined : AUDIT_CATEGORY_TO_ACTIONS[values.category];
  const out: {
    ok: true;
    actions?: readonly AuditAction[];
    occurredFrom?: IsoDateTime;
    occurredTo?: IsoDateTime;
  } = { ok: true };
  if (actions !== undefined) out.actions = actions;
  if (from !== undefined) out.occurredFrom = from;
  if (to !== undefined) out.occurredTo = to;
  return out;
}

export function isAuditFilterActive(v: AuditFilterFormValues): boolean {
  return (
    v.category !== "" ||
    v.dateFrom.trim().length > 0 ||
    v.dateTo.trim().length > 0
  );
}

export const EMPTY_AUDIT_FILTER: AuditFilterFormValues = Object.freeze({
  category: "" as AuditCategory | "",
  dateFrom: "",
  dateTo: "",
});

// ---- Builder do input de criação de snapshot ------------------------------

export const SNAPSHOT_LABEL_MAX = 120;
export const SNAPSHOT_REASON_MAX = 1000;

export type SnapshotFormValues = Readonly<{
  label: string;
  reason: string;
}>;

export function buildCreateCaseSnapshotInput(
  caseId: CaseId,
  values: SnapshotFormValues,
):
  | Readonly<{ ok: true; input: CreateCaseSnapshotInput }>
  | Readonly<{
      ok: false;
      reason: "label_required" | "label_too_long" | "reason_too_long";
    }> {
  const label = values.label.trim();
  if (label.length === 0) return { ok: false, reason: "label_required" };
  if (label.length > SNAPSHOT_LABEL_MAX)
    return { ok: false, reason: "label_too_long" };
  const reason = values.reason.trim();
  if (reason.length > SNAPSHOT_REASON_MAX)
    return { ok: false, reason: "reason_too_long" };
  const input: CreateCaseSnapshotInput =
    reason.length === 0 ? { caseId, label } : { caseId, label, reason };
  return { ok: true, input };
}

// ---- Contadores de payload ------------------------------------------------

export type SnapshotPayloadCounters = Readonly<{
  persons: number;
  relationships: number;
  professionals: number;
  planItems: number;
  timelineEntries: number;
}>;

export function computeSnapshotPayloadCounters(
  payload: CaseSnapshotPayload,
): SnapshotPayloadCounters {
  return {
    persons: payload.casePersons.length,
    relationships: payload.relationships.length,
    professionals: payload.assignments.length,
    planItems: payload.casePlanItems.length,
    timelineEntries: payload.caseTimelineEntries.length,
  };
}

// ---- Mapeamento público de erros ------------------------------------------

export type AuditSnapshotPublicError = Readonly<{
  kind:
    | "forbidden"
    | "not_found"
    | "validation_error"
    | "conflict"
    | "offline"
    | "unavailable"
    | "generic";
  message: string;
}>;

export function mapAuditSnapshotError(
  error: ServiceError,
): AuditSnapshotPublicError {
  switch (error.code) {
    case "forbidden":
      return {
        kind: "forbidden",
        message: "Você não tem permissão para acessar esta informação.",
      };
    case "not_found":
      return {
        kind: "not_found",
        message:
          "Este registro não está mais disponível. Recarregue o histórico e os snapshots.",
      };
    case "validation_error":
      return { kind: "validation_error", message: "Revise os dados informados." };
    case "conflict":
      return {
        kind: "conflict",
        message:
          "Os dados foram alterados em outra ação. Recarregue antes de continuar.",
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
    default:
      return { kind: "generic", message: "Não foi possível concluir esta ação." };
  }
}
