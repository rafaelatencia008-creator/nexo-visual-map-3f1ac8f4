/**
 * LV-09.1B.5 — Diálogo de detalhe e edição de item da Agenda.
 *
 * Consome exclusivamente os serviços oficiais expostos por
 * `MockDomainEnvironment`. Sem persistência de rascunho e sem acesso a
 * seeds. Aplica concorrência otimista via `expectedVersion` capturado no
 * início da edição.
 */

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import type { Case } from "@/domain/core/case";
import type {
  Appointment,
  AppointmentKind,
  AppointmentMode,
  Deadline,
  DeadlineKind,
  DeadlinePriority,
} from "@/domain/core/agenda";
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_MODES,
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  APPOINTMENT_LOCATION_MAX,
} from "@/domain/core/agenda";
import type { Assignment } from "@/domain/core/assignment";
import type {
  AppointmentId,
  AssignmentId,
  CaseId,
  DeadlineId,
} from "@/domain/core/ids";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceError } from "@/domain/services/result";

import {
  appointmentToEditForm,
  buildUpdateAppointmentInput,
  buildUpdateDeadlineInput,
  deadlineToEditForm,
  formatDurationLabel,
  hasAppointmentChanges,
  hasDeadlineChanges,
  translateAgendaUpdateError,
  type BuildUpdateAppointmentResult,
  type BuildUpdateDeadlineResult,
  type EditAppointmentFormState,
  type EditDeadlineFormState,
  type TranslatedUpdateError,
} from "./edit-form";
import { getDeadlinePresentation } from "./visual-state";
import {
  deriveEditUiState,
  reduceConflictAction,
  resolveDetailLoadResponse,
  resolveDiscardIntent,
} from "./detail-reducers";
import {
  APPOINTMENT_STATUS_LABEL as APPT_STATUS_LABEL_OFFICIAL,
  DEADLINE_STATUS_LABEL as DL_STATUS_LABEL_OFFICIAL,
  buildChangeAppointmentStatusInput,
  buildChangeDeadlineStatusInput,
  buildMutationConflict,
  getAppointmentStatusActions,
  getDeadlineStatusActions,
  permissionAllowsAction,
  translateAgendaMutationError,
  type AppointmentStatusAction,
  type DeadlineStatusAction,
  type MutationConflict,
  type PermissionEvalState,
  type TranslatedMutationError,
} from "./item-mutations";

// ---- Tipos públicos -----------------------------------------------------

export type SelectedAgendaItem =
  | Readonly<{ type: "deadline"; caseId: CaseId; id: DeadlineId }>
  | Readonly<{ type: "appointment"; caseId: CaseId; id: AppointmentId }>;

export type AgendaItemUpdated =
  | Readonly<{ type: "deadline"; item: Deadline }>
  | Readonly<{ type: "appointment"; item: Appointment }>;

export type AgendaItemDeleted =
  | Readonly<{ type: "deadline"; caseId: CaseId; id: DeadlineId }>
  | Readonly<{ type: "appointment"; caseId: CaseId; id: AppointmentId }>;

export interface AgendaItemDetailDialogProps {
  readonly selected: SelectedAgendaItem | null;
  readonly onClose: () => void;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly cases: readonly Case[];
  readonly onUpdated: (updated: AgendaItemUpdated) => void;
  readonly onDeleted: (deleted: AgendaItemDeleted) => void;
  /** Instante de referência para estado visual derivado (ex.: "Atrasado"). */
  readonly referenceEpoch: number;
}

// ---- Rótulos ------------------------------------------------------------

const DEADLINE_KIND_LABEL: Readonly<Record<DeadlineKind, string>> = {
  procedural: "Processual",
  administrative: "Administrativo",
  internal: "Interno",
};
const DEADLINE_PRIORITY_LABEL: Readonly<Record<DeadlinePriority, string>> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};
const DEADLINE_STATUS_LABEL = {
  pending: "Pendente",
  completed: "Cumprido",
  cancelled: "Cancelado",
} as const;
const APPOINTMENT_KIND_LABEL: Readonly<Record<AppointmentKind, string>> = {
  hearing: "Audiência",
  interview: "Entrevista",
  meeting: "Reunião",
  diligence: "Diligência",
  inspection: "Vistoria",
  other: "Outro",
};
const APPOINTMENT_MODE_LABEL: Readonly<Record<AppointmentMode, string>> = {
  in_person: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};
const APPOINTMENT_STATUS_LABEL = {
  scheduled: "Agendado",
  completed: "Realizado",
  cancelled: "Cancelado",
} as const;
const ASSIGNMENT_ROLE_LABEL: Readonly<Record<string, string>> = {
  lead_professional: "Profissional responsável",
  co_professional: "Profissional auxiliar",
  reviewer: "Revisor",
  collaborator: "Colaborador",
  read_only: "Somente leitura",
};

function assignmentLabel(a: Assignment): string {
  const role = ASSIGNMENT_ROLE_LABEL[a.role] ?? a.role;
  const shortId = String(a.id).slice(-6);
  const section = a.section ? ` · ${a.section}` : "";
  return `${role}${section} · #${shortId}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Estados internos ---------------------------------------------------

type LoadedDeadline = Readonly<{ type: "deadline"; item: Deadline }>;
type LoadedAppointment = Readonly<{ type: "appointment"; item: Appointment }>;
type Loaded = LoadedDeadline | LoadedAppointment;

type DetailState =
  | { kind: "loading" }
  | { kind: "ready"; loaded: Loaded }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

type PermState = PermissionEvalState;
type AssignmentsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; items: readonly Assignment[] }
  | { kind: "error"; message: string };

type Mode = "view" | "edit";

const ASSIGN_LIMIT = 100;
const ASSIGN_MAX_PAGES = 20;

// ---- Componente ---------------------------------------------------------

export function AgendaItemDetailDialog(
  props: AgendaItemDetailDialogProps,
): React.ReactElement {
  const {
    selected,
    onClose,
    environment,
    context,
    cases,
    onUpdated,
    onDeleted,
    referenceEpoch,
  } = props;
  const open = selected !== null;

  const [detail, setDetail] = React.useState<DetailState>({ kind: "loading" });
  const [mode, setMode] = React.useState<Mode>("view");
  const [perm, setPerm] = React.useState<PermState>("unknown");
  const [assignments, setAssignments] = React.useState<AssignmentsState>({
    kind: "idle",
  });
  const [assignAttempt, setAssignAttempt] = React.useState(0);
  const [reload, setReload] = React.useState(0);

  // Formulários de edição
  const [dForm, setDForm] = React.useState<EditDeadlineFormState | null>(null);
  const [aForm, setAForm] = React.useState<EditAppointmentFormState | null>(
    null,
  );
  const [expectedVersion, setExpectedVersion] = React.useState<number>(0);
  const [errors, setErrors] = React.useState<Readonly<Record<string, string>>>(
    {},
  );
  const [touched, setTouched] = React.useState<Readonly<Record<string, boolean>>>(
    {},
  );
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [conflictState, setConflictState] = React.useState<{
    expected?: number;
    actual?: number;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState<
    "close" | "cancel_edit" | "reload_after_conflict" | null
  >(null);

  // LV-09.1B.6 — status change / remove
  const [permChangeStatus, setPermChangeStatus] =
    React.useState<PermState>("unknown");
  const [permRemove, setPermRemove] = React.useState<PermState>("unknown");
  const [permAttempt, setPermAttempt] = React.useState(0);
  const [pendingStatus, setPendingStatus] = React.useState<
    | Readonly<{ kind: "deadline"; action: DeadlineStatusAction }>
    | Readonly<{ kind: "appointment"; action: AppointmentStatusAction }>
    | null
  >(null);
  const [pendingRemoval, setPendingRemoval] = React.useState<boolean>(false);
  const [mutating, setMutating] = React.useState<boolean>(false);
  const [mutationError, setMutationError] =
    React.useState<TranslatedMutationError | null>(null);
  const [mutationConflict, setMutationConflict] =
    React.useState<MutationConflict>(null);

  const mountedRef = React.useRef(true);
  const detailReqIdRef = React.useRef(0);
  const assignReqIdRef = React.useRef(0);
  const submittingRef = React.useRef(false);
  const mutationInFlightRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset ao abrir/mudar seleção
  React.useEffect(() => {
    if (!selected) return;
    setDetail({ kind: "loading" });
    setMode("view");
    setPerm("unknown");
    setPermChangeStatus("unknown");
    setPermRemove("unknown");
    setPendingStatus(null);
    setPendingRemoval(false);
    setMutating(false);
    setMutationError(null);
    setStatusConflict(null);
    mutationInFlightRef.current = false;
    setAssignments({ kind: "idle" });
    setDForm(null);
    setAForm(null);
    setExpectedVersion(0);
    setErrors({});
    setTouched({});
    setAttemptedSubmit(false);
    setGeneralError(null);
    setConflictState(null);
    setSubmitting(false);
    submittingRef.current = false;
  }, [selected]);

  // Carrega o detalhe pelo serviço oficial. Ramifica pelo discriminante para
  // preservar a correlação entre `type` e o tipo da `response` (união
  // discriminada em `resolveDetailLoadResponse`), sem casts.
  React.useEffect(() => {
    if (!selected) return;
    const reqId = ++detailReqIdRef.current;
    setDetail({ kind: "loading" });

    const applyDecision = (
      decided: ReturnType<typeof resolveDetailLoadResponse>,
    ): void => {
      if (decided === "ignore") return;
      if (decided.kind === "ready") {
        const loaded: Loaded =
          decided.type === "deadline"
            ? { type: "deadline", item: decided.item }
            : { type: "appointment", item: decided.item };
        setDetail({ kind: "ready", loaded });
        return;
      }
      setDetail(decided);
    };

    if (selected.type === "deadline") {
      environment.services.deadlines
        .getById(context, selected.caseId, selected.id)
        .then((response) => {
          if (!mountedRef.current) return;
          applyDecision(
            resolveDetailLoadResponse(detailReqIdRef.current, {
              requestId: reqId,
              type: "deadline",
              response,
            }),
          );
        })
        .catch(() => {
          if (!mountedRef.current || reqId !== detailReqIdRef.current) return;
          setDetail({
            kind: "error",
            message: "Não foi possível carregar este item.",
          });
        });
    } else {
      environment.services.appointments
        .getById(context, selected.caseId, selected.id)
        .then((response) => {
          if (!mountedRef.current) return;
          applyDecision(
            resolveDetailLoadResponse(detailReqIdRef.current, {
              requestId: reqId,
              type: "appointment",
              response,
            }),
          );
        })
        .catch(() => {
          if (!mountedRef.current || reqId !== detailReqIdRef.current) return;
          setDetail({
            kind: "error",
            message: "Não foi possível carregar este item.",
          });
        });
    }
  }, [selected, environment, context, reload]);


  // Avalia permissões de edição, mudança de status e exclusão em paralelo.
  React.useEffect(() => {
    if (!selected) return;
    if (detail.kind !== "ready") return;
    let cancelled = false;
    setPerm("loading");
    setPermChangeStatus("loading");
    setPermRemove("loading");
    const updateAction =
      selected.type === "deadline" ? "deadline.update" : "appointment.update";
    const statusAction =
      selected.type === "deadline"
        ? "deadline.changeStatus"
        : "appointment.changeStatus";
    const removeAction =
      selected.type === "deadline" ? "deadline.remove" : "appointment.remove";
    const evalOne = (
      action: typeof updateAction | typeof statusAction | typeof removeAction,
      setter: (v: PermState) => void,
    ) => {
      environment.services.permissions
        .evaluate(context, { action, caseId: selected.caseId })
        .then((res) => {
          if (cancelled || !mountedRef.current) return;
          setter(res.ok && res.data.allowed ? "allowed" : "denied");
        })
        .catch(() => {
          if (cancelled || !mountedRef.current) return;
          setter("denied");
        });
    };
    evalOne(updateAction, setPerm);
    evalOne(statusAction, setPermChangeStatus);
    evalOne(removeAction, setPermRemove);
    return () => {
      cancelled = true;
    };
  }, [selected, detail, environment, context]);

  // Carrega assignments do caso quando entrar em edição
  const currentCaseId = selected?.caseId;
  React.useEffect(() => {
    if (mode !== "edit" || !currentCaseId) {
      return;
    }
    const reqId = ++assignReqIdRef.current;
    setAssignments({ kind: "loading" });
    (async () => {
      const collected: Assignment[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      for (let p = 0; p < ASSIGN_MAX_PAGES; p++) {
        const res = await environment.services.assignments.listByCase(
          context,
          currentCaseId,
          cursor ? { cursor, limit: ASSIGN_LIMIT } : { limit: ASSIGN_LIMIT },
        );
        if (!res.ok) {
          if (mountedRef.current && reqId === assignReqIdRef.current) {
            setAssignments({
              kind: "error",
              message: "Não foi possível carregar responsáveis.",
            });
          }
          return;
        }
        for (const a of res.data.items) {
          if (a.status !== "active") continue;
          const k = String(a.id);
          if (seen.has(k)) continue;
          seen.add(k);
          collected.push(a);
        }
        if (!res.data.nextCursor) break;
        cursor = res.data.nextCursor;
      }
      if (mountedRef.current && reqId === assignReqIdRef.current) {
        setAssignments({ kind: "ready", items: collected });
      }
    })().catch(() => {
      if (mountedRef.current && reqId === assignReqIdRef.current) {
        setAssignments({
          kind: "error",
          message: "Não foi possível carregar responsáveis.",
        });
      }
    });
  }, [mode, currentCaseId, environment, context, assignAttempt]);

  // ---- Handlers -----------------------------------------------------------

  const enterEdit = React.useCallback(() => {
    if (detail.kind !== "ready" || perm !== "allowed") return;
    setErrors({});
    setTouched({});
    setAttemptedSubmit(false);
    setGeneralError(null);
    setConflictState(null);
    if (detail.loaded.type === "deadline") {
      setDForm(deadlineToEditForm(detail.loaded.item));
      setAForm(null);
      setExpectedVersion(detail.loaded.item.metadata.version);
    } else {
      setAForm(appointmentToEditForm(detail.loaded.item));
      setDForm(null);
      setExpectedVersion(detail.loaded.item.metadata.version);
    }
    setMode("edit");
  }, [detail, perm]);

  const hasLocalChanges = React.useMemo((): boolean => {
    if (mode !== "edit" || detail.kind !== "ready") return false;
    if (detail.loaded.type === "deadline" && dForm) {
      return hasDeadlineChanges(detail.loaded.item, dForm);
    }
    if (detail.loaded.type === "appointment" && aForm) {
      return hasAppointmentChanges(detail.loaded.item, aForm);
    }
    return false;
  }, [mode, detail, dForm, aForm]);

  const cancelEdit = React.useCallback(() => {
    const dec = resolveDiscardIntent("cancel_edit", {
      mode,
      hasChanges: hasLocalChanges,
      submitting: submittingRef.current,
    });
    if (dec.action === "blocked") return;
    if (dec.action === "confirm") {
      setConfirmDiscard("cancel_edit");
      return;
    }
    setMode("view");
    setErrors({});
    setGeneralError(null);
    setConflictState(null);
  }, [mode, hasLocalChanges]);

  const requestClose = React.useCallback(() => {
    const dec = resolveDiscardIntent("close", {
      mode,
      hasChanges: hasLocalChanges,
      submitting: submittingRef.current,
    });
    if (dec.action === "blocked") return;
    if (dec.action === "confirm") {
      setConfirmDiscard("close");
      return;
    }
    onClose();
  }, [mode, hasLocalChanges, onClose]);

  const confirmDiscardChoice = React.useCallback(() => {
    const action = confirmDiscard;
    setConfirmDiscard(null);
    if (action === "close") {
      onClose();
    } else if (action === "cancel_edit") {
      setMode("view");
      setErrors({});
      setGeneralError(null);
      setConflictState(null);
    } else if (action === "reload_after_conflict") {
      setConflictState((prev) =>
        reduceConflictAction(prev, { type: "reload_confirmed" }),
      );
      setMode("view");
      setErrors({});
      setGeneralError(null);
      setReload((r) => r + 1);
    }
  }, [confirmDiscard, onClose]);

  const reloadAfterConflict = React.useCallback(() => {
    const dec = resolveDiscardIntent("reload_after_conflict", {
      mode,
      hasChanges: hasLocalChanges,
      submitting: submittingRef.current,
    });
    if (dec.action === "blocked") return;
    if (dec.action === "confirm") {
      setConfirmDiscard("reload_after_conflict");
      return;
    }
    setConflictState((prev) =>
      reduceConflictAction(prev, { type: "reload_confirmed" }),
    );
    setMode("view");
    setReload((r) => r + 1);
  }, [mode, hasLocalChanges]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      requestClose();
    },
    [requestClose],
  );

  const submit = React.useCallback(async () => {
    if (submittingRef.current) return;
    if (detail.kind !== "ready") return;
    if (perm !== "allowed") return;
    setAttemptedSubmit(true);
    setGeneralError(null);
    setConflictState(null);

    if (detail.loaded.type === "deadline" && dForm) {
      const built = buildUpdateDeadlineInput(
        detail.loaded.item,
        dForm,
        expectedVersion,
      );
      if (!built.ok) {
        setErrors(built.errors);
        return;
      }
      if (!built.changed) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const res = await environment.services.deadlines.update(
          context,
          built.input,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          handleUpdateError(res.error);
          return;
        }
        toast.success("Prazo atualizado com sucesso.");
        const updated = res.data;
        setDetail({
          kind: "ready",
          loaded: { type: "deadline", item: updated },
        });
        setMode("view");
        onUpdated({ type: "deadline", item: updated });
      } finally {
        if (mountedRef.current) setSubmitting(false);
        submittingRef.current = false;
      }
    } else if (detail.loaded.type === "appointment" && aForm) {
      const built = buildUpdateAppointmentInput(
        detail.loaded.item,
        aForm,
        expectedVersion,
      );
      if (!built.ok) {
        setErrors(built.errors);
        return;
      }
      if (!built.changed) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const res = await environment.services.appointments.update(
          context,
          built.input,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          handleUpdateError(res.error);
          return;
        }
        toast.success("Compromisso atualizado com sucesso.");
        const updated = res.data;
        setDetail({
          kind: "ready",
          loaded: { type: "appointment", item: updated },
        });
        setMode("view");
        onUpdated({ type: "appointment", item: updated });
      } finally {
        if (mountedRef.current) setSubmitting(false);
        submittingRef.current = false;
      }
    }


    function handleUpdateError(err: ServiceError): void {
      const t: TranslatedUpdateError = translateAgendaUpdateError(err);
      if (t.kind === "conflict") {
        setConflictState((prev) =>
          reduceConflictAction(prev, {
            type: "receive_conflict",
            ...(t.expectedVersion !== undefined
              ? { expected: t.expectedVersion }
              : {}),
            ...(t.actualVersion !== undefined
              ? { actual: t.actualVersion }
              : {}),
          }),
        );
        return;
      }
      if (t.kind === "field") {
        setErrors({ [t.field]: t.message });
        return;
      }
      setGeneralError(t.message);
    }
  }, [
    detail,
    perm,
    dForm,
    aForm,
    expectedVersion,
    environment,
    context,
    onUpdated,
  ]);

  // ---- Mudança de status / exclusão (LV-09.1B.6) ------------------------

  const confirmStatusChange = React.useCallback(async () => {
    if (mutationInFlightRef.current) return;
    if (!pendingStatus) return;
    if (detail.kind !== "ready") return;
    if (permChangeStatus !== "allowed") return;
    mutationInFlightRef.current = true;
    setMutating(true);
    setMutationError(null);
    setStatusConflict(null);
    try {
      if (
        pendingStatus.kind === "deadline" &&
        detail.loaded.type === "deadline"
      ) {
        const input = buildChangeDeadlineStatusInput(
          detail.loaded.item,
          pendingStatus.action.status,
          detail.loaded.item.metadata.version,
        );
        const res =
          await environment.services.deadlines.changeStatus(context, input);
        if (!mountedRef.current) return;
        if (!res.ok) {
          const t = translateAgendaMutationError(res.error);
          setMutationError(t);
          if (t.kind === "conflict") {
            setStatusConflict({
              ...(t.expectedVersion !== undefined
                ? { expected: t.expectedVersion }
                : {}),
              ...(t.actualVersion !== undefined
                ? { actual: t.actualVersion }
                : {}),
            });
          }
          return;
        }
        const updated = res.data;
        setDetail({
          kind: "ready",
          loaded: { type: "deadline", item: updated },
        });
        setPendingStatus(null);
        toast.success("Status do prazo atualizado.");
        onUpdated({ type: "deadline", item: updated });
      } else if (
        pendingStatus.kind === "appointment" &&
        detail.loaded.type === "appointment"
      ) {
        const input = buildChangeAppointmentStatusInput(
          detail.loaded.item,
          pendingStatus.action.status,
          detail.loaded.item.metadata.version,
        );
        const res =
          await environment.services.appointments.changeStatus(context, input);
        if (!mountedRef.current) return;
        if (!res.ok) {
          const t = translateAgendaMutationError(res.error);
          setMutationError(t);
          if (t.kind === "conflict") {
            setStatusConflict({
              ...(t.expectedVersion !== undefined
                ? { expected: t.expectedVersion }
                : {}),
              ...(t.actualVersion !== undefined
                ? { actual: t.actualVersion }
                : {}),
            });
          }
          return;
        }
        const updated = res.data;
        setDetail({
          kind: "ready",
          loaded: { type: "appointment", item: updated },
        });
        setPendingStatus(null);
        toast.success("Status do compromisso atualizado.");
        onUpdated({ type: "appointment", item: updated });
      }
    } finally {
      if (mountedRef.current) setMutating(false);
      mutationInFlightRef.current = false;
    }
  }, [pendingStatus, detail, permChangeStatus, environment, context, onUpdated]);

  const confirmRemoval = React.useCallback(async () => {
    if (mutationInFlightRef.current) return;
    if (!pendingRemoval) return;
    if (detail.kind !== "ready") return;
    if (permRemove !== "allowed") return;
    if (!selected) return;
    mutationInFlightRef.current = true;
    setMutating(true);
    setMutationError(null);
    try {
      const version = detail.loaded.item.metadata.version;
      if (detail.loaded.type === "deadline") {
        const res = await environment.services.deadlines.remove(
          context,
          detail.loaded.item.caseId,
          detail.loaded.item.id,
          version,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          setMutationError(translateAgendaMutationError(res.error));
          return;
        }
        setPendingRemoval(false);
        toast.success("Prazo excluído.");
        onDeleted({
          type: "deadline",
          caseId: detail.loaded.item.caseId,
          id: detail.loaded.item.id,
        });
      } else {
        const res = await environment.services.appointments.remove(
          context,
          detail.loaded.item.caseId,
          detail.loaded.item.id,
          version,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          setMutationError(translateAgendaMutationError(res.error));
          return;
        }
        setPendingRemoval(false);
        toast.success("Compromisso excluído.");
        onDeleted({
          type: "appointment",
          caseId: detail.loaded.item.caseId,
          id: detail.loaded.item.id,
        });
      }
    } finally {
      if (mountedRef.current) setMutating(false);
      mutationInFlightRef.current = false;
    }
  }, [
    pendingRemoval,
    detail,
    permRemove,
    selected,
    environment,
    context,
    onDeleted,
  ]);

  const reloadAfterStatusConflict = React.useCallback(() => {
    if (mutationInFlightRef.current) return;
    setPendingStatus(null);
    setMutationError(null);
    setStatusConflict(null);
    setReload((r) => r + 1);
  }, []);



  const caseById = React.useMemo(() => {
    const m = new Map<string, Case>();
    for (const c of cases) m.set(String(c.id), c);
    return m;
  }, [cases]);

  const currentCaseLabel = React.useMemo(() => {
    if (detail.kind !== "ready") return "";
    const cid = detail.loaded.item.caseId;
    const c = caseById.get(String(cid));
    return c ? `${c.reference} — ${c.title}` : String(cid);
  }, [detail, caseById]);

  // Avaliação derivada do builder oficial: fonte única de verdade para a
  // validade do formulário. O botão "Salvar" e o `submit()` consomem esta
  // mesma decisão via `deriveEditUiState`.
  const currentBuildResult = React.useMemo<
    BuildUpdateDeadlineResult | BuildUpdateAppointmentResult | null
  >(() => {
    if (mode !== "edit" || detail.kind !== "ready") return null;
    if (detail.loaded.type === "deadline" && dForm) {
      return buildUpdateDeadlineInput(
        detail.loaded.item,
        dForm,
        expectedVersion,
      );
    }
    if (detail.loaded.type === "appointment" && aForm) {
      return buildUpdateAppointmentInput(
        detail.loaded.item,
        aForm,
        expectedVersion,
      );
    }
    return null;
  }, [mode, detail, dForm, aForm, expectedVersion]);


  // Fonte única de verdade da UI de edição. `deriveEditUiState` é o mesmo
  // helper puro exercitado pelos testes comportamentais — o componente real
  // consome exatamente a decisão testada, sem duplicação manual das regras
  // de `canSubmit` e de exibição progressiva de erros.
  const editUiState = React.useMemo(
    () =>
      deriveEditUiState({
        mode,
        perm,
        submitting,
        build: currentBuildResult,
        storedErrors: errors,
        touched,
        attemptedSubmit,
      }),
    [
      mode,
      perm,
      submitting,
      currentBuildResult,
      errors,
      touched,
      attemptedSubmit,
    ],
  );
  const canSubmit = editUiState.canSubmit;
  const displayErrors = editUiState.displayErrors;



  const title =
    !selected
      ? "Detalhe"
      : selected.type === "deadline"
        ? mode === "edit"
          ? "Editar prazo"
          : "Detalhe do prazo"
        : mode === "edit"
          ? "Editar compromisso"
          : "Detalhe do compromisso";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 sm:max-w-2xl"
          onEscapeKeyDown={(e) => {
            if (submittingRef.current) {
              e.preventDefault();
              return;
            }
            if (mode === "edit" && hasLocalChanges) {
              e.preventDefault();
              setConfirmDiscard("close");
            }
          }}
        >
          <div className="flex max-h-[95vh] flex-col">
            <DialogHeader className="border-b px-4 py-3 sm:px-6">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Ajuste os campos permitidos. O processo não pode ser alterado."
                  : "Informações completas conforme o registro oficial."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {detail.kind === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Carregando item da agenda…
                </div>
              )}

              {detail.kind === "not_found" && (
                <div
                  role="alert"
                  className="rounded-md border border-border/70 bg-muted/30 p-4 text-sm text-foreground"
                >
                  Este item não está mais disponível.
                </div>
              )}

              {detail.kind === "forbidden" && (
                <div
                  role="alert"
                  className="rounded-md border border-border/70 bg-muted/30 p-4 text-sm text-foreground"
                >
                  Você não tem permissão para visualizar este item.
                </div>
              )}

              {detail.kind === "error" && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  <span>{detail.message}</span>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReload((r) => r + 1)}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}

              {detail.kind === "ready" && mode === "view" && (
                <>
                  <ViewPanel
                    loaded={detail.loaded}
                    caseLabel={currentCaseLabel}
                    perm={perm}
                    referenceEpoch={referenceEpoch}
                  />
                  <ItemActionsSection
                    loaded={detail.loaded}
                    permChangeStatus={permChangeStatus}
                    permRemove={permRemove}
                    mutating={mutating}
                    mutationError={mutationError}
                    onSelectDeadlineAction={(action) => {
                      setMutationError(null);
                      setStatusConflict(null);
                      setPendingStatus({ kind: "deadline", action });
                    }}
                    onSelectAppointmentAction={(action) => {
                      setMutationError(null);
                      setStatusConflict(null);
                      setPendingStatus({ kind: "appointment", action });
                    }}
                    onRequestRemoval={() => {
                      setMutationError(null);
                      setPendingRemoval(true);
                    }}
                  />
                </>
              )}

              {detail.kind === "ready" && mode === "edit" && (
                <>
                  {conflictState && (
                    <ConflictBanner
                      onReload={reloadAfterConflict}
                      onKeepReviewing={() => setConflictState(null)}
                    />
                  )}
                  {generalError && (
                    <div
                      role="alert"
                      className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                    >
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      <span>{generalError}</span>
                    </div>
                  )}
                  <div className="mb-4 rounded-md border border-border/70 bg-muted/30 p-3 text-xs">
                    <span className="font-medium text-foreground">Processo:</span>{" "}
                    <span className="text-muted-foreground">{currentCaseLabel}</span>
                  </div>
                  {detail.loaded.type === "deadline" && dForm && (
                    <DeadlineEditFields
                      form={dForm}
                      errors={displayErrors}
                      onChange={(k, v) => {
                        setDForm((prev) => (prev ? { ...prev, [k]: v } : prev));
                        const key = k === "dueAtLocal" ? "dueAt" : k;
                        setTouched((prev) =>
                          prev[key] ? prev : { ...prev, [key]: true },
                        );
                        setErrors((prev) => {
                          if (prev[key] === undefined) return prev;
                          const { [key]: _o, ...rest } = prev;
                          return rest;
                        });
                        setGeneralError(null);
                      }}
                      onBlurField={(k) => {
                        const key = k === "dueAtLocal" ? "dueAt" : k;
                        setTouched((prev) =>
                          prev[key] ? prev : { ...prev, [key]: true },
                        );
                      }}
                      assignments={assignments}
                      originalAssignmentId={
                        detail.loaded.item.assignmentId ?? null
                      }
                      disabled={submitting}
                      onRetryAssignments={() => setAssignAttempt((n) => n + 1)}
                    />
                  )}
                  {detail.loaded.type === "appointment" && aForm && (
                    <AppointmentEditFields
                      form={aForm}
                      errors={displayErrors}
                      onChange={(k, v) => {
                        setAForm((prev) => (prev ? { ...prev, [k]: v } : prev));
                        const errKey =
                          k === "startsAtLocal"
                            ? "startsAt"
                            : k === "endsAtLocal"
                              ? "endsAt"
                              : k;
                        setTouched((prev) =>
                          prev[errKey] ? prev : { ...prev, [errKey]: true },
                        );
                        setErrors((prev) => {
                          if (prev[errKey] === undefined) return prev;
                          const { [errKey]: _o, ...rest } = prev;
                          return rest;
                        });
                        setGeneralError(null);
                      }}
                      onBlurField={(k) => {
                        const errKey =
                          k === "startsAtLocal"
                            ? "startsAt"
                            : k === "endsAtLocal"
                              ? "endsAt"
                              : k;
                        setTouched((prev) =>
                          prev[errKey] ? prev : { ...prev, [errKey]: true },
                        );
                      }}
                      assignments={assignments}
                      originalAssignmentId={
                        detail.loaded.item.assignmentId ?? null
                      }
                      disabled={submitting}
                      onRetryAssignments={() => setAssignAttempt((n) => n + 1)}
                    />
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2 border-t px-4 py-3 sm:px-6">
              {mode === "view" ? (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                  {detail.kind === "ready" && (
                    <Button
                      type="button"
                      onClick={enterEdit}
                      disabled={perm !== "allowed"}
                      aria-describedby={
                        perm === "denied" ? "detail-perm-hint" : undefined
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" aria-hidden />
                      Editar
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={submitting}
                  >
                    Cancelar edição
                  </Button>
                  <Button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    aria-busy={submitting}
                  >
                    {submitting && (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    )}
                    Salvar alterações
                  </Button>
                </>
              )}
            </DialogFooter>
            {perm === "denied" && mode === "view" && detail.kind === "ready" && (
              <p
                id="detail-perm-hint"
                className="border-t px-4 py-2 text-xs text-muted-foreground sm:px-6"
              >
                Você não tem permissão para editar este item.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDiscard !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDiscard(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As mudanças ainda não foram salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscardChoice}>
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(o) => {
          if (!o && !mutationInFlightRef.current) {
            setPendingStatus(null);
            setMutationError(null);
            setStatusConflict(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus?.kind === "deadline"
                ? pendingStatus.action.confirmTitle
                : pendingStatus?.kind === "appointment"
                  ? pendingStatus.action.confirmTitle
                  : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus &&
                `Alterar status de ${pendingStatus.action.currentLabel} para ${pendingStatus.action.targetLabel}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutationError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{mutationError.message}</span>
            </div>
          )}
          <AlertDialogFooter>
            {statusConflict ? (
              <>
                <AlertDialogCancel disabled={mutating}>Fechar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    reloadAfterStatusConflict();
                  }}
                  disabled={mutating}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                  Recarregar dados
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel disabled={mutating}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void confirmStatusChange();
                  }}
                  disabled={mutating || permChangeStatus !== "allowed"}
                  aria-busy={mutating}
                >
                  {mutating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Confirmar
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRemoval}
        onOpenChange={(o) => {
          if (!o && !mutationInFlightRef.current) {
            setPendingRemoval(false);
            setMutationError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected?.type === "deadline"
                ? "Excluir este prazo?"
                : "Excluir este compromisso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutationError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{mutationError.message}</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmRemoval();
              }}
              disabled={mutating || permRemove !== "allowed"}
              aria-busy={mutating}
            >
              {mutating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemActionsSection({
  loaded,
  permChangeStatus,
  permRemove,
  mutating,
  mutationError,
  onSelectDeadlineAction,
  onSelectAppointmentAction,
  onRequestRemoval,
}: {
  loaded: Loaded;
  permChangeStatus: PermState;
  permRemove: PermState;
  mutating: boolean;
  mutationError: TranslatedMutationError | null;
  onSelectDeadlineAction: (action: DeadlineStatusAction) => void;
  onSelectAppointmentAction: (action: AppointmentStatusAction) => void;
  onRequestRemoval: () => void;
}) {
  const canStatus = permChangeStatus === "allowed";
  const canRemove = permRemove === "allowed";
  if (!canStatus && !canRemove) return null;
  const statusActions =
    loaded.type === "deadline"
      ? getDeadlineStatusActions(loaded.item.status)
      : getAppointmentStatusActions(loaded.item.status);

  return (
    <section
      aria-label="Ações do item"
      className="mt-4 rounded-md border border-border/70 bg-muted/20 p-3"
    >
      <div className="mb-2 text-xs font-medium text-foreground">
        Ações do item
      </div>
      <div className="flex flex-wrap gap-2">
        {canStatus &&
          statusActions.map((a) =>
            loaded.type === "deadline" ? (
              <Button
                key={`d-${a.status}`}
                type="button"
                size="sm"
                variant="outline"
                disabled={mutating}
                onClick={() =>
                  onSelectDeadlineAction(a as DeadlineStatusAction)
                }
              >
                {a.status === (loaded.item.status === "completed"
                  ? "pending"
                  : "completed") ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                ) : a.status === "cancelled" ? (
                  <Ban className="mr-2 h-4 w-4" aria-hidden />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                )}
                {a.actionLabel}
              </Button>
            ) : (
              <Button
                key={`a-${a.status}`}
                type="button"
                size="sm"
                variant="outline"
                disabled={mutating}
                onClick={() =>
                  onSelectAppointmentAction(a as AppointmentStatusAction)
                }
              >
                {a.status === "completed" ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                ) : a.status === "cancelled" ? (
                  <Ban className="mr-2 h-4 w-4" aria-hidden />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                )}
                {a.actionLabel}
              </Button>
            ),
          )}
        {canRemove && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={mutating}
            onClick={onRequestRemoval}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Excluir
          </Button>
        )}
      </div>
      {mutationError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{mutationError.message}</span>
        </div>
      )}
    </section>
  );
}


// ---- Ícone de estado do prazo --------------------------------------------

function DeadlineStateIcon({
  state,
}: {
  state: ReturnType<typeof getDeadlinePresentation>["state"];
}) {
  const cls = "h-3.5 w-3.5" as const;
  switch (state) {
    case "cancelled":
      return <Ban className={cls} aria-hidden />;
    case "completed":
      return <CheckCircle2 className={cls} aria-hidden />;
    case "overdue":
      return <AlertTriangle className={cls} aria-hidden />;
    case "urgent":
      return <AlertCircle className={cls} aria-hidden />;
    case "high":
      return <Flag className={cls} aria-hidden />;
    case "normal":
    case "low":
    default:
      return <Clock className={cls} aria-hidden />;
  }
}


function ViewPanel({
  loaded,
  caseLabel,
  perm,
  referenceEpoch,
}: {
  loaded: Loaded;
  caseLabel: string;
  perm: PermState;
  referenceEpoch: number;
}) {
  if (loaded.type === "deadline") {
    const d = loaded.item;
    const presentation = getDeadlinePresentation(d, referenceEpoch);
    return (
      <dl className="grid gap-3 text-sm">
        <Row label="Item">
          <Badge variant="secondary">Prazo</Badge>
        </Row>
        <Row label="Estado atual">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${presentation.stateBadgeClass}`}
            data-testid="deadline-state-badge"
            data-state={presentation.state}
          >
            <DeadlineStateIcon state={presentation.state} />
            {presentation.stateLabel}
          </span>
        </Row>
        <Row label="Título">
          <span className="font-medium">{d.title}</span>
        </Row>
        {d.description && (
          <Row label="Descrição">
            <span className="whitespace-pre-wrap text-muted-foreground">
              {d.description}
            </span>
          </Row>
        )}
        <Row label="Processo">{caseLabel}</Row>
        <Row label="Tipo">{DEADLINE_KIND_LABEL[d.kind]}</Row>
        <Row label="Prioridade">{DEADLINE_PRIORITY_LABEL[d.priority]}</Row>
        <Row label="Status">{DEADLINE_STATUS_LABEL[d.status]}</Row>
        <Row label="Prazo">{fmtDateTime(d.dueAt)}</Row>
        <Row label="Responsável">
          {d.assignmentId ? String(d.assignmentId).slice(-6) : "—"}
        </Row>
        <Row label="Criado em">{fmtDateTime(d.metadata.createdAt)}</Row>
        <Row label="Atualizado em">{fmtDateTime(d.metadata.updatedAt)}</Row>
        <Row label="Versão">v{d.metadata.version}</Row>
        {perm === "denied" && (
          <p className="text-xs text-muted-foreground">
            Modo somente leitura.
          </p>
        )}
      </dl>
    );
  }
  const a = loaded.item;
  return (
    <dl className="grid gap-3 text-sm">
      <Row label="Item">
        <Badge variant="secondary">Compromisso</Badge>
      </Row>
      <Row label="Título">
        <span className="font-medium">{a.title}</span>
      </Row>
      {a.description && (
        <Row label="Descrição">
          <span className="whitespace-pre-wrap text-muted-foreground">
            {a.description}
          </span>
        </Row>
      )}
      <Row label="Processo">{caseLabel}</Row>
      <Row label="Tipo">{APPOINTMENT_KIND_LABEL[a.kind]}</Row>
      <Row label="Status">{APPOINTMENT_STATUS_LABEL[a.status]}</Row>
      <Row label="Início">{fmtDateTime(a.startsAt)}</Row>
      <Row label="Término">{fmtDateTime(a.endsAt)}</Row>
      <Row label="Duração">{formatDurationLabel(a.startsAt, a.endsAt)}</Row>
      <Row label="Modalidade">{APPOINTMENT_MODE_LABEL[a.mode]}</Row>
      {a.location && <Row label="Localização">{a.location}</Row>}
      <Row label="Responsável">
        {a.assignmentId ? String(a.assignmentId).slice(-6) : "—"}
      </Row>
      <Row label="Criado em">{fmtDateTime(a.metadata.createdAt)}</Row>
      <Row label="Atualizado em">{fmtDateTime(a.metadata.updatedAt)}</Row>
      <Row label="Versão">v{a.metadata.version}</Row>
      {perm === "denied" && (
        <p className="text-xs text-muted-foreground">Modo somente leitura.</p>
      )}
    </dl>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

// ---- Conflict banner ------------------------------------------------------

function ConflictBanner({
  onReload,
  onKeepReviewing,
}: {
  onReload: () => void;
  onKeepReviewing: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300"
    >
      <p>
        Este item foi alterado em outra sessão. Recarregue os dados mais
        recentes antes de salvar novamente.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onKeepReviewing}
        >
          Continuar revisando
        </Button>
        <Button type="button" size="sm" onClick={onReload}>
          Recarregar dados
        </Button>
      </div>
    </div>
  );
}

// ---- Campos de edição -----------------------------------------------------

function AssignmentSelect({
  value,
  onChange,
  assignments,
  originalAssignmentId,
  disabled,
  id,
  onRetry,
  errorMessageId,
  fieldError,
}: {
  value: string;
  onChange: (v: string) => void;
  assignments: AssignmentsState;
  originalAssignmentId: string | null;
  disabled: boolean;
  id: string;
  onRetry: () => void;
  errorMessageId: string;
  fieldError?: string;
}) {
  const loading = assignments.kind === "loading";
  const loadError = assignments.kind === "error";
  const items = assignments.kind === "ready" ? assignments.items : [];
  const activeIds = new Set(items.map((a) => String(a.id)));
  const originalInactive =
    originalAssignmentId !== null && !activeIds.has(originalAssignmentId);
  return (
    <div className="space-y-1.5">
      <Select
        value={value === "" ? "none" : value}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
        disabled={disabled || loading}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!!fieldError || loadError}
          aria-describedby={fieldError ? errorMessageId : undefined}
          aria-busy={loading}
        >
          <SelectValue
            placeholder={
              loading ? "Carregando responsáveis…" : "Sem responsável específico"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem responsável específico</SelectItem>
          {originalInactive && originalAssignmentId && value === originalAssignmentId && (
            <SelectItem value={originalAssignmentId}>
              Responsável atual — inativo
            </SelectItem>
          )}
          {items.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {assignmentLabel(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loadError && (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível carregar responsáveis.{" "}
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </p>
      )}
    </div>
  );
}

function DeadlineEditFields({
  form,
  errors,
  onChange,
  onBlurField,
  assignments,
  originalAssignmentId,
  disabled,
  onRetryAssignments,
}: {
  form: EditDeadlineFormState;
  errors: Readonly<Record<string, string>>;
  onChange: (k: keyof EditDeadlineFormState, v: string) => void;
  onBlurField: (k: keyof EditDeadlineFormState) => void;
  assignments: AssignmentsState;
  originalAssignmentId: string | null;
  disabled: boolean;
  onRetryAssignments: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ed-kind">Tipo *</Label>
          <Select
            value={form.kind || undefined}
            onValueChange={(v) => onChange("kind", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="ed-kind"
              aria-invalid={!!errors.kind}
              aria-describedby={errors.kind ? "err-ed-kind" : undefined}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {DEADLINE_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.kind && (
            <p id="err-ed-kind" className="text-xs text-destructive">
              {errors.kind}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-priority">Prioridade *</Label>
          <Select
            value={form.priority || undefined}
            onValueChange={(v) => onChange("priority", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="ed-priority"
              aria-invalid={!!errors.priority}
              aria-describedby={errors.priority ? "err-ed-priority" : undefined}
            >
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {DEADLINE_PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && (
            <p id="err-ed-priority" className="text-xs text-destructive">
              {errors.priority}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ed-title">Título *</Label>
        <Input
          id="ed-title"
          value={form.title}
          maxLength={AGENDA_TITLE_MAX}
          onChange={(e) => onChange("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "err-ed-title" : undefined}
          disabled={disabled}
        />
        {errors.title && (
          <p id="err-ed-title" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ed-due">Data e hora limite *</Label>
        <Input
          id="ed-due"
          type="datetime-local"
          value={form.dueAtLocal}
          onChange={(e) => onChange("dueAtLocal", e.target.value)}
          aria-invalid={!!errors.dueAt}
          aria-describedby={errors.dueAt ? "err-ed-due" : undefined}
          disabled={disabled}
        />
        {errors.dueAt && (
          <p id="err-ed-due" className="text-xs text-destructive">
            {errors.dueAt}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ed-desc">Descrição</Label>
        <Textarea
          id="ed-desc"
          value={form.description}
          maxLength={AGENDA_DESCRIPTION_MAX}
          rows={3}
          onChange={(e) => onChange("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "err-ed-desc" : undefined}
          disabled={disabled}
        />
        {errors.description && (
          <p id="err-ed-desc" className="text-xs text-destructive">
            {errors.description}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ed-assignee">Responsável</Label>
        <AssignmentSelect
          id="ed-assignee"
          value={form.assignmentId}
          onChange={(v) => onChange("assignmentId", v as AssignmentId | "")}
          assignments={assignments}
          originalAssignmentId={originalAssignmentId}
          disabled={disabled}
          fieldError={errors.assignmentId}
          errorMessageId="err-ed-assignee"
          onRetry={onRetryAssignments}
        />
        {errors.assignmentId && (
          <p id="err-ed-assignee" className="text-xs text-destructive">
            {errors.assignmentId}
          </p>
        )}
      </div>
    </div>
  );
}

function AppointmentEditFields({
  form,
  errors,
  onChange,
  onBlurField,
  assignments,
  originalAssignmentId,
  disabled,
  onRetryAssignments,
}: {
  form: EditAppointmentFormState;
  errors: Readonly<Record<string, string>>;
  onChange: (k: keyof EditAppointmentFormState, v: string) => void;
  onBlurField: (k: keyof EditAppointmentFormState) => void;
  assignments: AssignmentsState;
  originalAssignmentId: string | null;
  disabled: boolean;
  onRetryAssignments: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ea-kind">Tipo *</Label>
          <Select
            value={form.kind || undefined}
            onValueChange={(v) => onChange("kind", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="ea-kind"
              aria-invalid={!!errors.kind}
              aria-describedby={errors.kind ? "err-ea-kind" : undefined}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {APPOINTMENT_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.kind && (
            <p id="err-ea-kind" className="text-xs text-destructive">
              {errors.kind}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ea-mode">Modalidade *</Label>
          <Select
            value={form.mode || undefined}
            onValueChange={(v) => onChange("mode", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="ea-mode"
              aria-invalid={!!errors.mode}
              aria-describedby={errors.mode ? "err-ea-mode" : undefined}
            >
              <SelectValue placeholder="Selecione a modalidade" />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {APPOINTMENT_MODE_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mode && (
            <p id="err-ea-mode" className="text-xs text-destructive">
              {errors.mode}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ea-title">Título *</Label>
        <Input
          id="ea-title"
          value={form.title}
          maxLength={AGENDA_TITLE_MAX}
          onChange={(e) => onChange("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "err-ea-title" : undefined}
          disabled={disabled}
        />
        {errors.title && (
          <p id="err-ea-title" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ea-start">Início *</Label>
          <Input
            id="ea-start"
            type="datetime-local"
            value={form.startsAtLocal}
            onChange={(e) => onChange("startsAtLocal", e.target.value)}
            aria-invalid={!!errors.startsAt}
            aria-describedby={errors.startsAt ? "err-ea-start" : undefined}
            disabled={disabled}
          />
          {errors.startsAt && (
            <p id="err-ea-start" className="text-xs text-destructive">
              {errors.startsAt}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ea-end">Término *</Label>
          <Input
            id="ea-end"
            type="datetime-local"
            value={form.endsAtLocal}
            onChange={(e) => onChange("endsAtLocal", e.target.value)}
            aria-invalid={!!errors.endsAt}
            aria-describedby={errors.endsAt ? "err-ea-end" : undefined}
            disabled={disabled}
          />
          {errors.endsAt && (
            <p id="err-ea-end" className="text-xs text-destructive">
              {errors.endsAt}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ea-location">Localização</Label>
        <Input
          id="ea-location"
          value={form.location}
          maxLength={APPOINTMENT_LOCATION_MAX}
          onChange={(e) => onChange("location", e.target.value)}
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "err-ea-location" : undefined}
          disabled={disabled}
        />
        {errors.location && (
          <p id="err-ea-location" className="text-xs text-destructive">
            {errors.location}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ea-desc">Descrição</Label>
        <Textarea
          id="ea-desc"
          value={form.description}
          maxLength={AGENDA_DESCRIPTION_MAX}
          rows={3}
          onChange={(e) => onChange("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "err-ea-desc" : undefined}
          disabled={disabled}
        />
        {errors.description && (
          <p id="err-ea-desc" className="text-xs text-destructive">
            {errors.description}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ea-assignee">Responsável</Label>
        <AssignmentSelect
          id="ea-assignee"
          value={form.assignmentId}
          onChange={(v) => onChange("assignmentId", v as AssignmentId | "")}
          assignments={assignments}
          originalAssignmentId={originalAssignmentId}
          disabled={disabled}
          fieldError={errors.assignmentId}
          errorMessageId="err-ea-assignee"
          onRetry={onRetryAssignments}
        />
        {errors.assignmentId && (
          <p id="err-ea-assignee" className="text-xs text-destructive">
            {errors.assignmentId}
          </p>
        )}
      </div>
    </div>
  );
}
