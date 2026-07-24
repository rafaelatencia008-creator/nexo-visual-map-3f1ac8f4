/**
 * LV-09.1B.4 — Diálogo de criação de prazo ou compromisso da Agenda.
 *
 * Consome apenas os serviços oficiais expostos por `MockDomainEnvironment`.
 * Não persiste rascunho fora do estado do componente.
 */

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
} from "@/domain/core/agenda";
import type { Assignment } from "@/domain/core/assignment";
import type { AssignmentId, CaseId } from "@/domain/core/ids";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";

import {
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  APPOINTMENT_LOCATION_MAX,
} from "@/domain/core/agenda";
import {
  buildCreateAppointmentInput,
  buildCreateDeadlineInput,
  EMPTY_APPOINTMENT_FORM,
  EMPTY_DEADLINE_FORM,
  hasAppointmentDraft,
  hasDeadlineDraft,
  translateAgendaServiceError,
  type CreateAppointmentFormState,
  type CreateDeadlineFormState,
} from "./create-form";

// ---- Rótulos --------------------------------------------------------------

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

// ---- Tipos internos -------------------------------------------------------

type ItemType = "deadline" | "appointment";
type PermState = "unknown" | "loading" | "allowed" | "denied";
type AssignmentsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; items: readonly Assignment[] }
  | { kind: "error"; message: string };

const ASSIGNMENTS_PAGE_LIMIT = 100;
const ASSIGNMENTS_MAX_PAGES = 20;

export type AgendaCreatedItem =
  | { readonly type: "deadline"; readonly item: Deadline }
  | { readonly type: "appointment"; readonly item: Appointment };

export interface AgendaCreateDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly cases: readonly Case[];
  readonly initialCaseId?: CaseId;
  readonly onCreated: (created: AgendaCreatedItem) => void;
}

// ---- Componente principal -------------------------------------------------

export function AgendaCreateDialog(props: AgendaCreateDialogProps): React.ReactElement {
  const { open, onOpenChange, environment, context, cases, initialCaseId, onCreated } =
    props;

  const [itemType, setItemType] = React.useState<ItemType>("deadline");
  const [deadlineForm, setDeadlineForm] = React.useState<CreateDeadlineFormState>(
    () => ({ ...EMPTY_DEADLINE_FORM, caseId: initialCaseId ?? "" }),
  );
  const [appointmentForm, setAppointmentForm] = React.useState<CreateAppointmentFormState>(
    () => ({ ...EMPTY_APPOINTMENT_FORM, caseId: initialCaseId ?? "" }),
  );
  const [errors, setErrors] = React.useState<Readonly<Record<string, string>>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [permDeadline, setPermDeadline] = React.useState<PermState>("unknown");
  const [permAppointment, setPermAppointment] = React.useState<PermState>("unknown");
  const [assignments, setAssignments] = React.useState<AssignmentsState>({ kind: "idle" });
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  const [assignmentsAttempt, setAssignmentsAttempt] = React.useState(0);

  const mountedRef = React.useRef(true);
  const submittingRef = React.useRef(false);
  const assignmentsReqIdRef = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Ao abrir, restaura estado.
  React.useEffect(() => {
    if (!open) return;
    setItemType("deadline");
    setDeadlineForm({ ...EMPTY_DEADLINE_FORM, caseId: initialCaseId ?? "" });
    setAppointmentForm({ ...EMPTY_APPOINTMENT_FORM, caseId: initialCaseId ?? "" });
    setErrors({});
    setGeneralError(null);
    setSubmitting(false);
    submittingRef.current = false;
    setPermDeadline("unknown");
    setPermAppointment("unknown");
    setAssignments({ kind: "idle" });
  }, [open, initialCaseId]);

  const currentCaseId =
    itemType === "deadline" ? deadlineForm.caseId : appointmentForm.caseId;

  // Avalia permissões ao trocar de processo.
  React.useEffect(() => {
    if (!open) return;
    if (!currentCaseId) {
      setPermDeadline("unknown");
      setPermAppointment("unknown");
      return;
    }
    let cancelled = false;
    setPermDeadline("loading");
    setPermAppointment("loading");
    Promise.all([
      environment.services.permissions.evaluate(context, {
        action: "deadline.create",
        caseId: currentCaseId as CaseId,
      }),
      environment.services.permissions.evaluate(context, {
        action: "appointment.create",
        caseId: currentCaseId as CaseId,
      }),
    ])
      .then(([d, a]) => {
        if (cancelled || !mountedRef.current) return;
        setPermDeadline(d.ok && d.data.allowed ? "allowed" : "denied");
        setPermAppointment(a.ok && a.data.allowed ? "allowed" : "denied");
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        setPermDeadline("denied");
        setPermAppointment("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentCaseId, environment, context]);

  // Carrega assignments ativos do processo escolhido (paginação por cursor,
  // deduplicação por ID, ordenação estável, respostas obsoletas descartadas).
  React.useEffect(() => {
    if (!open) return;
    if (!currentCaseId) {
      setAssignments({ kind: "idle" });
      return;
    }
    const reqId = ++assignmentsReqIdRef.current;
    let cancelled = false;
    setAssignments({ kind: "loading" });

    async function loadAll(caseId: CaseId): Promise<
      | { ok: true; items: readonly Assignment[] }
      | { ok: false; message: string }
    > {
      const collected: Assignment[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      for (let page = 0; page < ASSIGNMENTS_MAX_PAGES; page++) {
        const res = await environment.services.assignments.listByCase(
          context,
          caseId,
          cursor
            ? { cursor, limit: ASSIGNMENTS_PAGE_LIMIT }
            : { limit: ASSIGNMENTS_PAGE_LIMIT },
        );
        if (!res.ok) {
          return { ok: false, message: "Não foi possível carregar responsáveis." };
        }
        for (const a of res.data.items) {
          if (a.status !== "active") continue;
          const key = String(a.id);
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push(a);
        }
        if (!res.data.nextCursor) return { ok: true, items: collected };
        cursor = res.data.nextCursor;
      }
      return { ok: true, items: collected };
    }

    loadAll(currentCaseId as CaseId)
      .then((r) => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== assignmentsReqIdRef.current) return;
        if (!r.ok) {
          setAssignments({ kind: "error", message: r.message });
          return;
        }
        setAssignments({ kind: "ready", items: r.items });
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== assignmentsReqIdRef.current) return;
        setAssignments({
          kind: "error",
          message: "Não foi possível carregar responsáveis.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentCaseId, environment, context, assignmentsAttempt]);

  const clearFieldError = React.useCallback((field: string) => {
    setErrors((prev) => {
      if (prev[field] === undefined) return prev;
      const { [field]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const updateDeadline = React.useCallback(
    <K extends keyof CreateDeadlineFormState>(
      key: K,
      value: CreateDeadlineFormState[K],
    ) => {
      setDeadlineForm((prev) => ({ ...prev, [key]: value }));
      clearFieldError(key === "dueAtLocal" ? "dueAt" : String(key));
      setGeneralError(null);
    },
    [clearFieldError],
  );

  const updateAppointment = React.useCallback(
    <K extends keyof CreateAppointmentFormState>(
      key: K,
      value: CreateAppointmentFormState[K],
    ) => {
      setAppointmentForm((prev) => ({ ...prev, [key]: value }));
      const errKey =
        key === "startsAtLocal"
          ? "startsAt"
          : key === "endsAtLocal"
            ? "endsAt"
            : String(key);
      clearFieldError(errKey);
      setGeneralError(null);
    },
    [clearFieldError],
  );

  const handleTypeChange = React.useCallback((v: string) => {
    if (v !== "deadline" && v !== "appointment") return;
    setItemType(v);
    setErrors({});
    setGeneralError(null);
  }, []);

  const isDraft =
    itemType === "deadline"
      ? hasDeadlineDraft(deadlineForm)
      : hasAppointmentDraft(appointmentForm);

  const requestClose = React.useCallback(() => {
    if (submittingRef.current) return;
    const anyDraft =
      hasDeadlineDraft(deadlineForm) || hasAppointmentDraft(appointmentForm);
    if (anyDraft) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  }, [deadlineForm, appointmentForm, onOpenChange]);

  const discardAndClose = React.useCallback(() => {
    setConfirmDiscard(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      requestClose();
    },
    [onOpenChange, requestClose],
  );

  const submitDeadline = React.useCallback(async () => {
    if (submittingRef.current) return;
    setGeneralError(null);
    const built = buildCreateDeadlineInput(deadlineForm);
    if (!built.ok) {
      setErrors(built.errors as Record<string, string>);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await environment.services.deadlines.create(context, built.input);
      if (!mountedRef.current) return;
      if (!res.ok) {
        const t = translateAgendaServiceError(res.error);
        if (t.field) {
          setErrors({ [t.field]: t.message });
        } else {
          setGeneralError(t.message);
        }
        return;
      }
      toast.success("Prazo criado com sucesso.");
      onCreated({ type: "deadline", item: res.data });
      onOpenChange(false);
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
      submittingRef.current = false;
    }
  }, [deadlineForm, environment, context, onCreated, onOpenChange]);

  const submitAppointment = React.useCallback(async () => {
    if (submittingRef.current) return;
    setGeneralError(null);
    const built = buildCreateAppointmentInput(appointmentForm);
    if (!built.ok) {
      setErrors(built.errors as Record<string, string>);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await environment.services.appointments.create(context, built.input);
      if (!mountedRef.current) return;
      if (!res.ok) {
        const t = translateAgendaServiceError(res.error);
        if (t.field) {
          setErrors({ [t.field]: t.message });
        } else {
          setGeneralError(t.message);
        }
        return;
      }
      toast.success("Compromisso criado com sucesso.");
      onCreated({ type: "appointment", item: res.data });
      onOpenChange(false);
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
      submittingRef.current = false;
    }
  }, [appointmentForm, environment, context, onCreated, onOpenChange]);

  const permAllowed =
    itemType === "deadline" ? permDeadline === "allowed" : permAppointment === "allowed";
  const permKnown =
    itemType === "deadline" ? permDeadline !== "loading" : permAppointment !== "loading";
  const permDenied =
    (itemType === "deadline" && permDeadline === "denied") ||
    (itemType === "appointment" && permAppointment === "denied");

  const canSubmit = !!currentCaseId && permAllowed && !submitting;

  const submitLabel = itemType === "deadline" ? "Criar prazo" : "Criar compromisso";

  const caseOptions = cases;

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
            if (isDraft) {
              e.preventDefault();
              setConfirmDiscard(true);
            }
          }}
        >
          <div className="flex max-h-[95vh] flex-col">
            <DialogHeader className="border-b px-4 py-3 sm:px-6">
              <DialogTitle>Novo item na agenda</DialogTitle>
              <DialogDescription>
                Escolha entre criar um prazo ou um compromisso vinculado a um processo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <Tabs value={itemType} onValueChange={handleTypeChange} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="deadline">Prazo</TabsTrigger>
                  <TabsTrigger value="appointment">Compromisso</TabsTrigger>
                </TabsList>
              </Tabs>

              {generalError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{generalError}</span>
                </div>
              )}

              {permDenied && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Você não tem permissão para criar{" "}
                    {itemType === "deadline" ? "prazos" : "compromissos"} neste processo.
                  </span>
                </div>
              )}

              {/* Processo — compartilhado */}
              <div className="space-y-1.5">
                <Label htmlFor="agenda-create-case">Processo *</Label>
                <Select
                  value={currentCaseId || undefined}
                  onValueChange={(v) => {
                    if (itemType === "deadline") {
                      updateDeadline("caseId", v);
                      updateDeadline("assignmentId", "");
                    } else {
                      updateAppointment("caseId", v);
                      updateAppointment("assignmentId", "");
                    }
                  }}
                  disabled={submitting}
                >
                  <SelectTrigger
                    id="agenda-create-case"
                    aria-invalid={!!errors.caseId}
                    aria-describedby={errors.caseId ? "err-case" : undefined}
                  >
                    <SelectValue placeholder="Selecione um processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseOptions.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        Nenhum processo disponível
                      </SelectItem>
                    )}
                    {caseOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.reference} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.caseId && (
                  <p id="err-case" className="text-xs text-destructive">
                    {errors.caseId}
                  </p>
                )}
              </div>

              {itemType === "deadline" ? (
                <DeadlineFields
                  form={deadlineForm}
                  errors={errors}
                  onChange={updateDeadline}
                  assignments={assignments}
                  disabled={submitting}
                  onRetryAssignments={() => setAssignmentsAttempt((n) => n + 1)}
                />
              ) : (
                <AppointmentFields
                  form={appointmentForm}
                  errors={errors}
                  onChange={updateAppointment}
                  assignments={assignments}
                  disabled={submitting}
                  onRetryAssignments={() => setAssignmentsAttempt((n) => n + 1)}
                />
              )}
            </div>

            <DialogFooter className="gap-2 border-t px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={itemType === "deadline" ? submitDeadline : submitAppointment}
                disabled={!canSubmit || !permKnown}
                aria-busy={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar preenchendo</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Subcomponentes -------------------------------------------------------

function AssignmentSelect(props: {
  value: string;
  onChange: (v: string) => void;
  assignments: AssignmentsState;
  disabled: boolean;
  id: string;
  fieldError?: string;
  errorMessageId: string;
  loadErrorMessageId: string;
  onRetry: () => void;
}): React.ReactElement {
  const {
    value,
    onChange,
    assignments,
    disabled,
    id,
    fieldError,
    errorMessageId,
    loadErrorMessageId,
    onRetry,
  } = props;
  const loading = assignments.kind === "loading";
  const loadError = assignments.kind === "error";
  const describedBy = [
    loadError ? loadErrorMessageId : null,
    fieldError ? errorMessageId : null,
  ]
    .filter((x): x is string => !!x)
    .join(" ") || undefined;
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
          aria-describedby={describedBy}
          aria-busy={loading}
        >
          <SelectValue
            placeholder={
              loading
                ? "Carregando responsáveis…"
                : "Sem responsável específico"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem responsável específico</SelectItem>
          {assignments.kind === "ready" &&
            assignments.items.map((a: Assignment) => (
              <SelectItem key={a.id} value={a.id}>
                {assignmentLabel(a)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <span className="sr-only" aria-live="polite">
        {loading ? "Carregando responsáveis" : ""}
      </span>
      {loadError && (
        <p
          id={loadErrorMessageId}
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-destructive"
        >
          <span>{assignments.message}</span>
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Tentar novamente
          </button>
        </p>
      )}
    </div>
  );
}


function DeadlineFields(props: {
  form: CreateDeadlineFormState;
  errors: Readonly<Record<string, string>>;
  onChange: <K extends keyof CreateDeadlineFormState>(
    key: K,
    value: CreateDeadlineFormState[K],
  ) => void;
  assignments: AssignmentsState;
  disabled: boolean;
}): React.ReactElement {
  const { form, errors, onChange, assignments, disabled } = props;
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-kind">Tipo *</Label>
          <Select
            value={form.kind || undefined}
            onValueChange={(v) => onChange("kind", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="d-kind"
              aria-invalid={!!errors.kind}
              aria-describedby={errors.kind ? "err-d-kind" : undefined}
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
            <p id="err-d-kind" className="text-xs text-destructive">
              {errors.kind}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-priority">Prioridade *</Label>
          <Select
            value={form.priority || undefined}
            onValueChange={(v) => onChange("priority", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="d-priority"
              aria-invalid={!!errors.priority}
              aria-describedby={errors.priority ? "err-d-priority" : undefined}
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
            <p id="err-d-priority" className="text-xs text-destructive">
              {errors.priority}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-title">Título *</Label>
        <Input
          id="d-title"
          value={form.title}
          maxLength={AGENDA_TITLE_MAX}
          onChange={(e) => onChange("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "err-d-title" : undefined}
          disabled={disabled}
        />
        {errors.title && (
          <p id="err-d-title" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-due">Data e hora limite *</Label>
        <Input
          id="d-due"
          type="datetime-local"
          value={form.dueAtLocal}
          onChange={(e) => onChange("dueAtLocal", e.target.value)}
          aria-invalid={!!errors.dueAt}
          aria-describedby={errors.dueAt ? "err-d-due" : undefined}
          disabled={disabled}
        />
        {errors.dueAt && (
          <p id="err-d-due" className="text-xs text-destructive">
            {errors.dueAt}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-desc">Descrição</Label>
        <Textarea
          id="d-desc"
          value={form.description}
          maxLength={AGENDA_DESCRIPTION_MAX}
          rows={3}
          onChange={(e) => onChange("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "err-d-desc" : undefined}
          disabled={disabled}
        />
        {errors.description && (
          <p id="err-d-desc" className="text-xs text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-assignee">Responsável</Label>
        <AssignmentSelect
          id="d-assignee"
          value={form.assignmentId}
          onChange={(v) => onChange("assignmentId", v as AssignmentId | "")}
          assignments={assignments}
          disabled={disabled}
        />
        {errors.assignmentId && (
          <p className="text-xs text-destructive">{errors.assignmentId}</p>
        )}
      </div>
    </div>
  );
}

function AppointmentFields(props: {
  form: CreateAppointmentFormState;
  errors: Readonly<Record<string, string>>;
  onChange: <K extends keyof CreateAppointmentFormState>(
    key: K,
    value: CreateAppointmentFormState[K],
  ) => void;
  assignments: AssignmentsState;
  disabled: boolean;
}): React.ReactElement {
  const { form, errors, onChange, assignments, disabled } = props;
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="a-kind">Tipo *</Label>
          <Select
            value={form.kind || undefined}
            onValueChange={(v) => onChange("kind", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="a-kind"
              aria-invalid={!!errors.kind}
              aria-describedby={errors.kind ? "err-a-kind" : undefined}
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
            <p id="err-a-kind" className="text-xs text-destructive">
              {errors.kind}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-mode">Modalidade *</Label>
          <Select
            value={form.mode || undefined}
            onValueChange={(v) => onChange("mode", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="a-mode"
              aria-invalid={!!errors.mode}
              aria-describedby={errors.mode ? "err-a-mode" : undefined}
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
            <p id="err-a-mode" className="text-xs text-destructive">
              {errors.mode}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a-title">Título *</Label>
        <Input
          id="a-title"
          value={form.title}
          maxLength={AGENDA_TITLE_MAX}
          onChange={(e) => onChange("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "err-a-title" : undefined}
          disabled={disabled}
        />
        {errors.title && (
          <p id="err-a-title" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="a-start">Início *</Label>
          <Input
            id="a-start"
            type="datetime-local"
            value={form.startsAtLocal}
            onChange={(e) => onChange("startsAtLocal", e.target.value)}
            aria-invalid={!!errors.startsAt}
            aria-describedby={errors.startsAt ? "err-a-start" : undefined}
            disabled={disabled}
          />
          {errors.startsAt && (
            <p id="err-a-start" className="text-xs text-destructive">
              {errors.startsAt}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-end">Término *</Label>
          <Input
            id="a-end"
            type="datetime-local"
            value={form.endsAtLocal}
            onChange={(e) => onChange("endsAtLocal", e.target.value)}
            aria-invalid={!!errors.endsAt}
            aria-describedby={errors.endsAt ? "err-a-end" : undefined}
            disabled={disabled}
          />
          {errors.endsAt && (
            <p id="err-a-end" className="text-xs text-destructive">
              {errors.endsAt}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a-location">Localização</Label>
        <Input
          id="a-location"
          value={form.location}
          maxLength={APPOINTMENT_LOCATION_MAX}
          onChange={(e) => onChange("location", e.target.value)}
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "err-a-location" : undefined}
          disabled={disabled}
        />
        {errors.location && (
          <p id="err-a-location" className="text-xs text-destructive">
            {errors.location}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a-desc">Descrição</Label>
        <Textarea
          id="a-desc"
          value={form.description}
          maxLength={AGENDA_DESCRIPTION_MAX}
          rows={3}
          onChange={(e) => onChange("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "err-a-desc" : undefined}
          disabled={disabled}
        />
        {errors.description && (
          <p id="err-a-desc" className="text-xs text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a-assignee">Responsável</Label>
        <AssignmentSelect
          id="a-assignee"
          value={form.assignmentId}
          onChange={(v) => onChange("assignmentId", v as AssignmentId | "")}
          assignments={assignments}
          disabled={disabled}
        />
        {errors.assignmentId && (
          <p className="text-xs text-destructive">{errors.assignmentId}</p>
        )}
      </div>
    </div>
  );
}
