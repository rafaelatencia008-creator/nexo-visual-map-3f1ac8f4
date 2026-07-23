/**
 * LV-08.5B — Seção "Plano de trabalho e Cronologia do processo".
 *
 * Usa exclusivamente os serviços oficiais do domínio mock:
 * casePlan, caseTimeline, assignments, professionalProfiles, permissions.
 *
 * Nenhum dado local permanente. Nenhum acesso a store, snapshot ou seed.
 */

import * as React from "react";
import {
  AlertCircle,
  Calendar,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Activity,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import type { Case } from "@/domain/core/case";
import type { Assignment } from "@/domain/core/assignment";
import type { ProfessionalProfile } from "@/domain/core/professional";
import type {
  CasePlanItem,
  CasePlanItemStatus,
  CaseTimelineEntry,
} from "@/domain/core/case-plan";
import type { ProfessionalProfileId } from "@/domain/core/ids";
import type { ServiceError, ServiceResult } from "@/domain/services/result";
import {
  ALL_PLAN_TIMELINE_ACTIONS,
  ASSIGNMENT_ROLE_LABELS_PT,
  buildAssignmentOptions,
  buildChangeCasePlanItemStatusInput,
  buildCreateCasePlanItemInput,
  buildCreateCaseTimelineEntryInput,
  buildPlanTimelinePermissions,
  buildUpdateCasePlanItemInput,
  buildUpdateCaseTimelineEntryInput,
  CASE_PLAN_ITEM_KIND_LABELS_PT,
  CASE_PLAN_ITEM_PRIORITY_LABELS_PT,
  CASE_PLAN_ITEM_STATUS_LABELS_PT,
  CASE_TIMELINE_ENTRY_KIND_LABELS_PT,
  collectDistinctProfessionalProfileIds,
  emptyPlanTimelinePermissions,
  formatIsoDatePtBr,
  mapPlanTimelineError,
  PROFESSIONAL_AREA_LABELS_PT,
  type AssignmentOption,
  type PlanItemFormValues,
  type PlanTimelinePermissions,
  type PlanTimelinePublicError,
  type PlanTimelineWriteAction,
  type TimelineFormValues,
} from "@/features/processos/process-plan-model";
import {
  ProcessPlanTimelineEmpty,
  ProcessPlanTimelineError,
  ProcessPlanTimelineLoading,
} from "@/features/processos/ProcessPlanTimelineState";
import {
  ProcessPlanDialog,
  type ProcessPlanDialogMode,
} from "@/features/processos/ProcessPlanDialog";
import { ProcessPlanStatusDialog } from "@/features/processos/ProcessPlanStatusDialog";
import {
  ProcessTimelineDialog,
  type ProcessTimelineDialogMode,
} from "@/features/processos/ProcessTimelineDialog";

export type ProcessPlanTimelineProps = Readonly<{
  case: Case;
}>;

type ReadyData = Readonly<{
  planItems: readonly CasePlanItem[];
  timelineEntries: readonly CaseTimelineEntry[];
  assignmentOptions: readonly AssignmentOption[];
  permissions: PlanTimelinePermissions;
}>;

type SectionState =
  | { kind: "loading" }
  | { kind: "error"; error: PlanTimelinePublicError }
  | { kind: "ready"; data: ReadyData; refreshing: boolean };

type PlanDialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      mode: ProcessPlanDialogMode;
      submitting: boolean;
      error: PlanTimelinePublicError | null;
    };

type StatusDialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      item: CasePlanItem;
      submitting: boolean;
      error: PlanTimelinePublicError | null;
    };

type TimelineDialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      mode: ProcessTimelineDialogMode;
      submitting: boolean;
      error: PlanTimelinePublicError | null;
    };

type RemoveState =
  | { kind: "closed" }
  | {
      kind: "remove-plan";
      item: CasePlanItem;
      error: PlanTimelinePublicError | null;
    }
  | {
      kind: "remove-timeline";
      entry: CaseTimelineEntry;
      error: PlanTimelinePublicError | null;
    };

export function ProcessPlanTimeline({ case: c }: ProcessPlanTimelineProps) {
  const { environment, context } = useMockDomain();
  const caseId = c.id;
  const [state, setState] = React.useState<SectionState>({ kind: "loading" });
  const [planDialog, setPlanDialog] = React.useState<PlanDialogState>({ kind: "closed" });
  const [statusDialog, setStatusDialog] = React.useState<StatusDialogState>({ kind: "closed" });
  const [timelineDialog, setTimelineDialog] = React.useState<TimelineDialogState>({ kind: "closed" });
  const [confirm, setConfirm] = React.useState<RemoveState>({ kind: "closed" });
  const [removing, setRemoving] = React.useState(false);

  const requestIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);
  const writeOperationRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const tryAcquireWrite = React.useCallback((label: string): boolean => {
    if (writeOperationRef.current !== null) return false;
    writeOperationRef.current = label;
    return true;
  }, []);
  const releaseWrite = React.useCallback(() => {
    writeOperationRef.current = null;
  }, []);

  // ---- Carga ------------------------------------------------------------

  const loadAll = React.useCallback(
    async (mode: "initial" | "refresh") => {
      const reqId = ++requestIdRef.current;
      if (mode === "initial") {
        setState({ kind: "loading" });
      } else {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, refreshing: true } : prev,
        );
      }

      // Chamadas iniciais criadas ANTES de qualquer await, em paralelo.
      const planPromise = environment.services.casePlan.listByCase(context, caseId, { limit: 100 });
      const timelinePromise = environment.services.caseTimeline.listByCase(context, caseId, { limit: 100 });
      const assignPromise = environment.services.assignments.listByCase(context, caseId, { limit: 100 });
      const permPromises = ALL_PLAN_TIMELINE_ACTIONS.map((action) =>
        environment.services.permissions.evaluate(context, { action, caseId }),
      );

      const [planRes, tlRes, asgRes, ...permResults] = await Promise.all([
        planPromise, timelinePromise, assignPromise, ...permPromises,
      ]);

      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      if (!planRes.ok) return setState({ kind: "error", error: mapPlanTimelineError(planRes.error) });
      if (!tlRes.ok) return setState({ kind: "error", error: mapPlanTimelineError(tlRes.error) });
      if (!asgRes.ok) return setState({ kind: "error", error: mapPlanTimelineError(asgRes.error) });

      const entries: [PlanTimelineWriteAction, boolean][] = [];
      for (let i = 0; i < ALL_PLAN_TIMELINE_ACTIONS.length; i++) {
        const r = permResults[i];
        if (!r.ok) {
          // Falha técnica no serviço de permissão vira erro da seção,
          // não acesso somente leitura silencioso.
          setState({ kind: "error", error: mapPlanTimelineError(r.error) });
          return;
        }
        entries.push([ALL_PLAN_TIMELINE_ACTIONS[i], r.data.allowed === true]);
      }
      const permissions = buildPlanTimelinePermissions(entries);

      // Resolver perfis dos responsáveis. Deduplica IDs; uma chamada por ID.
      const distinct = collectDistinctProfessionalProfileIds(asgRes.data.items);
      const profileResults: ServiceResult<ProfessionalProfile>[] = await Promise.all(
        distinct.map((id) => {
          if (!isProfessionalProfileId(id)) {
            const err: ServiceError = { code: "internal_error", message: "invalid_profile_id" };
            return Promise.resolve<ServiceResult<ProfessionalProfile>>({ ok: false, error: err });
          }
          return environment.services.professionalProfiles.getById(
            context,
            id as ProfessionalProfileId,
          );
        }),
      );
      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      const profiles: ProfessionalProfile[] = [];
      for (const r of profileResults) {
        if (!r.ok) {
          setState({ kind: "error", error: mapPlanTimelineError(r.error) });
          return;
        }
        profiles.push(r.data);
      }

      const built = buildAssignmentOptions(asgRes.data.items, profiles);
      if (!built.ok) {
        setState({
          kind: "error",
          error: {
            kind: "generic",
            message: "Não foi possível identificar todos os responsáveis do processo.",
          },
        });
        return;
      }

      setState({
        kind: "ready",
        data: {
          planItems: planRes.data.items,
          timelineEntries: tlRes.data.items,
          assignmentOptions: built.options,
          permissions,
        },
        refreshing: false,
      });
    },
    [environment, context, caseId],
  );

  React.useEffect(() => {
    void loadAll("initial");
  }, [loadAll]);

  const finishAndReload = React.useCallback(() => {
    setPlanDialog({ kind: "closed" });
    setStatusDialog({ kind: "closed" });
    setTimelineDialog({ kind: "closed" });
    setConfirm({ kind: "closed" });
    void loadAll("refresh");
  }, [loadAll]);

  // ---- Handlers de escrita (Plano) --------------------------------------

  const handlePlanSubmit = async (values: PlanItemFormValues) => {
    if (planDialog.kind !== "open") return;
    if (state.kind !== "ready") return;
    const options = state.data.assignmentOptions;
    if (planDialog.mode.kind === "create") {
      if (!tryAcquireWrite("plan-create")) return;
      setPlanDialog({ ...planDialog, submitting: true, error: null });
      try {
        const built = buildCreateCasePlanItemInput(caseId, values, options);
        if (!built.ok) {
          setPlanDialog({ ...planDialog, submitting: false, error: { kind: "generic", message: "Verifique os dados informados." } });
          return;
        }
        const r = await environment.services.casePlan.create(context, built.input);
        if (!r.ok) {
          setPlanDialog({ ...planDialog, submitting: false, error: mapPlanTimelineError(r.error) });
          return;
        }
        toast.success("Item adicionado ao plano.");
        finishAndReload();
      } finally {
        releaseWrite();
      }
    } else {
      const item = planDialog.mode.item;
      if (!tryAcquireWrite("plan-update")) return;
      setPlanDialog({ ...planDialog, submitting: true, error: null });
      try {
        const built = buildUpdateCasePlanItemInput(item, values, options);
        if (!built.ok) {
          setPlanDialog({ ...planDialog, submitting: false, error: { kind: "generic", message: "Verifique os dados informados." } });
          return;
        }
        if (built.input === null) {
          setPlanDialog({ ...planDialog, submitting: false, error: { kind: "no_changes", message: "Nenhuma alteração foi feita." } });
          return;
        }
        const r = await environment.services.casePlan.update(context, caseId, built.input);
        if (!r.ok) {
          setPlanDialog({ ...planDialog, submitting: false, error: mapPlanTimelineError(r.error) });
          return;
        }
        toast.success("Item atualizado.");
        finishAndReload();
      } finally {
        releaseWrite();
      }
    }
  };

  const handleStatusSubmit = async (nextStatus: CasePlanItemStatus) => {
    if (statusDialog.kind !== "open") return;
    const item = statusDialog.item;
    if (!tryAcquireWrite("plan-status")) return;
    setStatusDialog({ ...statusDialog, submitting: true, error: null });
    try {
      const input = buildChangeCasePlanItemStatusInput(item, nextStatus);
      if (!input) {
        setStatusDialog({ ...statusDialog, submitting: false, error: { kind: "no_changes", message: "Nenhuma alteração foi feita." } });
        return;
      }
      const r = await environment.services.casePlan.changeStatus(context, caseId, input);
      if (!r.ok) {
        setStatusDialog({ ...statusDialog, submitting: false, error: mapPlanTimelineError(r.error) });
        return;
      }
      toast.success("Andamento atualizado.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleRemovePlan = async () => {
    if (confirm.kind !== "remove-plan") return;
    if (!tryAcquireWrite("plan-remove")) return;
    setRemoving(true);
    try {
      const r = await environment.services.casePlan.remove(
        context,
        caseId,
        confirm.item.id,
        confirm.item.metadata.version,
      );
      if (!r.ok) {
        setConfirm({ kind: "remove-plan", item: confirm.item, error: mapPlanTimelineError(r.error) });
        return;
      }
      toast.success("Item removido.");
      finishAndReload();
    } finally {
      releaseWrite();
      setRemoving(false);
    }
  };

  // ---- Handlers (Cronologia) --------------------------------------------

  const handleTimelineSubmit = async (values: TimelineFormValues) => {
    if (timelineDialog.kind !== "open") return;
    if (timelineDialog.mode.kind === "create") {
      if (!tryAcquireWrite("tl-create")) return;
      setTimelineDialog({ ...timelineDialog, submitting: true, error: null });
      try {
        const built = buildCreateCaseTimelineEntryInput(caseId, values);
        if (!built.ok) {
          setTimelineDialog({ ...timelineDialog, submitting: false, error: { kind: "generic", message: "Verifique os dados informados." } });
          return;
        }
        const r = await environment.services.caseTimeline.create(context, built.input);
        if (!r.ok) {
          setTimelineDialog({ ...timelineDialog, submitting: false, error: mapPlanTimelineError(r.error) });
          return;
        }
        toast.success("Registro adicionado à cronologia.");
        finishAndReload();
      } finally {
        releaseWrite();
      }
    } else {
      const entry = timelineDialog.mode.entry;
      if (!tryAcquireWrite("tl-update")) return;
      setTimelineDialog({ ...timelineDialog, submitting: true, error: null });
      try {
        const built = buildUpdateCaseTimelineEntryInput(entry, values);
        if (!built.ok) {
          setTimelineDialog({ ...timelineDialog, submitting: false, error: { kind: "generic", message: "Verifique os dados informados." } });
          return;
        }
        if (built.input === null) {
          setTimelineDialog({ ...timelineDialog, submitting: false, error: { kind: "no_changes", message: "Nenhuma alteração foi feita." } });
          return;
        }
        const r = await environment.services.caseTimeline.update(context, caseId, built.input);
        if (!r.ok) {
          setTimelineDialog({ ...timelineDialog, submitting: false, error: mapPlanTimelineError(r.error) });
          return;
        }
        toast.success("Registro atualizado.");
        finishAndReload();
      } finally {
        releaseWrite();
      }
    }
  };

  const handleRemoveTimeline = async () => {
    if (confirm.kind !== "remove-timeline") return;
    if (!tryAcquireWrite("tl-remove")) return;
    setRemoving(true);
    try {
      const r = await environment.services.caseTimeline.remove(
        context,
        caseId,
        confirm.entry.id,
        confirm.entry.metadata.version,
      );
      if (!r.ok) {
        setConfirm({ kind: "remove-timeline", entry: confirm.entry, error: mapPlanTimelineError(r.error) });
        return;
      }
      toast.success("Registro removido.");
      finishAndReload();
    } finally {
      releaseWrite();
      setRemoving(false);
    }
  };

  // ---- Render -----------------------------------------------------------

  const permissions: PlanTimelinePermissions =
    state.kind === "ready" ? state.data.permissions : emptyPlanTimelinePermissions();

  const planHeadingId = React.useId();
  const timelineHeadingId = React.useId();

  return (
    <div className="space-y-6" data-lv="08.5B">
      {/* Plano de trabalho */}
      <Card aria-labelledby={planHeadingId}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id={planHeadingId} className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" aria-hidden="true" />
              Plano de trabalho
            </CardTitle>
            <CardDescription>
              Organize atividades, pendências, prioridades, prazos e responsáveis deste processo.
            </CardDescription>
          </div>
          {state.kind === "ready" && permissions.createPlanItem && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPlanDialog({
                    kind: "open",
                    mode: { kind: "create", itemKind: "activity" },
                    submitting: false,
                    error: null,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Nova atividade
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPlanDialog({
                    kind: "open",
                    mode: { kind: "create", itemKind: "pending" },
                    submitting: false,
                    error: null,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Nova pendência
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && <ProcessPlanTimelineLoading />}
          {state.kind === "error" && (
            <ProcessPlanTimelineError message={state.error.message} onRetry={() => void loadAll("initial")} />
          )}
          {state.kind === "ready" && (
            <PlanBody
              items={state.data.planItems}
              options={state.data.assignmentOptions}
              permissions={permissions}
              refreshing={state.refreshing}
              onEdit={(item) =>
                setPlanDialog({
                  kind: "open",
                  mode: { kind: "edit", item },
                  submitting: false,
                  error: null,
                })
              }
              onChangeStatus={(item) =>
                setStatusDialog({ kind: "open", item, submitting: false, error: null })
              }
              onRemove={(item) => setConfirm({ kind: "remove-plan", item, error: null })}
            />
          )}
        </CardContent>
      </Card>

      {/* Cronologia */}
      <Card aria-labelledby={timelineHeadingId}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id={timelineHeadingId} className="flex items-center gap-2">
              <Activity className="h-5 w-5" aria-hidden="true" />
              Cronologia do processo
            </CardTitle>
            <CardDescription>
              Registre marcos e informações contextuais relevantes em ordem cronológica.
            </CardDescription>
          </div>
          {state.kind === "ready" && permissions.createTimelineEntry && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setTimelineDialog({
                    kind: "open",
                    mode: { kind: "create", entryKind: "milestone" },
                    submitting: false,
                    error: null,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Novo marco
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setTimelineDialog({
                    kind: "open",
                    mode: { kind: "create", entryKind: "note" },
                    submitting: false,
                    error: null,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Novo registro
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {state.kind === "loading" && <ProcessPlanTimelineLoading />}
          {state.kind === "error" && (
            <ProcessPlanTimelineError message={state.error.message} onRetry={() => void loadAll("initial")} />
          )}
          {state.kind === "ready" && (
            <TimelineBody
              entries={state.data.timelineEntries}
              permissions={permissions}
              refreshing={state.refreshing}
              onEdit={(entry) =>
                setTimelineDialog({
                  kind: "open",
                  mode: { kind: "edit", entry },
                  submitting: false,
                  error: null,
                })
              }
              onRemove={(entry) => setConfirm({ kind: "remove-timeline", entry, error: null })}
            />
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      {planDialog.kind === "open" && state.kind === "ready" && (
        <ProcessPlanDialog
          open
          mode={planDialog.mode}
          submitting={planDialog.submitting}
          error={planDialog.error}
          assignmentOptions={state.data.assignmentOptions}
          onSubmit={handlePlanSubmit}
          onCancel={() => setPlanDialog({ kind: "closed" })}
          onReloadFromConflict={finishAndReload}
        />
      )}
      {statusDialog.kind === "open" && (
        <ProcessPlanStatusDialog
          open
          item={statusDialog.item}
          submitting={statusDialog.submitting}
          error={statusDialog.error}
          onSubmit={handleStatusSubmit}
          onCancel={() => setStatusDialog({ kind: "closed" })}
          onReloadFromConflict={finishAndReload}
        />
      )}
      {timelineDialog.kind === "open" && (
        <ProcessTimelineDialog
          open
          mode={timelineDialog.mode}
          submitting={timelineDialog.submitting}
          error={timelineDialog.error}
          onSubmit={handleTimelineSubmit}
          onCancel={() => setTimelineDialog({ kind: "closed" })}
          onReloadFromConflict={finishAndReload}
        />
      )}

      {/* Confirmações de remoção */}
      <AlertDialog
        open={confirm.kind === "remove-plan"}
        onOpenChange={(v) => { if (!v && !removing) setConfirm({ kind: "closed" }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove somente este item do plano de trabalho. O processo e o responsável serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm.kind === "remove-plan" && confirm.error && (
            <p role="alert" className="text-sm text-destructive">
              {confirm.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            {confirm.kind === "remove-plan" && (confirm.error?.kind === "conflict" || confirm.error?.kind === "not_found") ? (
              <AlertDialogAction onClick={finishAndReload}>
                Recarregar plano e cronologia
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleRemovePlan} disabled={removing}>
                {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Remover item
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm.kind === "remove-timeline"}
        onOpenChange={(v) => { if (!v && !removing) setConfirm({ kind: "closed" }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro da cronologia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove somente este registro da cronologia do processo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm.kind === "remove-timeline" && confirm.error && (
            <p role="alert" className="text-sm text-destructive">
              {confirm.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            {confirm.kind === "remove-timeline" && (confirm.error?.kind === "conflict" || confirm.error?.kind === "not_found") ? (
              <AlertDialogAction onClick={finishAndReload}>
                Recarregar plano e cronologia
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleRemoveTimeline} disabled={removing}>
                {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Remover registro
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Corpo do Plano --------------------------------------------------------

type PlanBodyProps = Readonly<{
  items: readonly CasePlanItem[];
  options: readonly AssignmentOption[];
  permissions: PlanTimelinePermissions;
  refreshing: boolean;
  onEdit: (item: CasePlanItem) => void;
  onChangeStatus: (item: CasePlanItem) => void;
  onRemove: (item: CasePlanItem) => void;
}>;

function PlanBody({
  items, options, permissions, refreshing, onEdit, onChangeStatus, onRemove,
}: PlanBodyProps) {
  if (items.length === 0) {
    return (
      <ProcessPlanTimelineEmpty
        title="Nenhum item no plano de trabalho"
        description="Adicione uma atividade ou pendência para organizar os próximos passos do processo."
      />
    );
  }
  const counters = React.useMemo(() => {
    const c = { planned: 0, in_progress: 0, blocked: 0, completed: 0, cancelled: 0 };
    for (const it of items) c[it.status] += 1;
    return c;
  }, [items]);
  const optionById = React.useMemo(
    () => new Map(options.map((o) => [o.assignmentId, o])),
    [options],
  );

  return (
    <div className="space-y-4" aria-busy={refreshing || undefined}>
      {refreshing && (
        <div role="status" aria-live="polite" className="sr-only">
          Atualizando plano e cronologia.
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1">Planejados: {counters.planned}</span>
        <span className="rounded-md bg-muted px-2 py-1">Em andamento: {counters.in_progress}</span>
        <span className="rounded-md bg-muted px-2 py-1">Bloqueados: {counters.blocked}</span>
        <span className="rounded-md bg-muted px-2 py-1">Concluídos: {counters.completed}</span>
      </div>
      <ul className="space-y-3">
        {items.map((item) => {
          const dim = item.status === "completed" || item.status === "cancelled";
          const opt = item.assignmentId ? optionById.get(item.assignmentId) : undefined;
          const responsavel = opt ? opt.label : "Sem responsável definido";
          return (
            <li
              key={item.id}
              className={`rounded-md border p-4 ${dim ? "opacity-70" : ""}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{CASE_PLAN_ITEM_KIND_LABELS_PT[item.kind]}</Badge>
                    <Badge variant="secondary">{CASE_PLAN_ITEM_STATUS_LABELS_PT[item.status]}</Badge>
                    <Badge variant="outline">
                      Prioridade: {CASE_PLAN_ITEM_PRIORITY_LABELS_PT[item.priority]}
                    </Badge>
                  </div>
                  <p className="font-medium break-words">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.dueOn ? (
                        <>
                          Prazo:{" "}
                          <time dateTime={item.dueOn}>{formatIsoDatePtBr(item.dueOn)}</time>
                        </>
                      ) : (
                        "Sem prazo definido"
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      {responsavel}
                    </span>
                  </div>
                </div>
                {(permissions.updatePlanItem || permissions.changePlanItemStatus || permissions.removePlanItem) && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {permissions.changePlanItemStatus && (
                      <Button size="sm" variant="outline" onClick={() => onChangeStatus(item)}>
                        Alterar andamento
                      </Button>
                    )}
                    {permissions.updatePlanItem && (
                      <Button size="sm" variant="ghost" onClick={() => onEdit(item)} aria-label={`Editar ${item.title}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    {permissions.removePlanItem && (
                      <Button size="sm" variant="ghost" onClick={() => onRemove(item)} aria-label={`Remover ${item.title}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- Corpo da Cronologia ---------------------------------------------------

type TimelineBodyProps = Readonly<{
  entries: readonly CaseTimelineEntry[];
  permissions: PlanTimelinePermissions;
  refreshing: boolean;
  onEdit: (entry: CaseTimelineEntry) => void;
  onRemove: (entry: CaseTimelineEntry) => void;
}>;

function TimelineBody({ entries, permissions, refreshing, onEdit, onRemove }: TimelineBodyProps) {
  if (entries.length === 0) {
    return (
      <ProcessPlanTimelineEmpty
        title="Nenhum registro na cronologia"
        description="Adicione um marco ou registro para construir o histórico deste processo."
      />
    );
  }
  return (
    <ol className="space-y-3" aria-busy={refreshing || undefined}>
      {refreshing && (
        <li role="status" aria-live="polite" className="sr-only">
          Atualizando plano e cronologia.
        </li>
      )}
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-md border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{CASE_TIMELINE_ENTRY_KIND_LABELS_PT[entry.kind]}</Badge>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={entry.occurredOn}>{formatIsoDatePtBr(entry.occurredOn)}</time>
                </span>
              </div>
              <p className="font-medium break-words">{entry.title}</p>
              {entry.description && (
                <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                  {entry.description}
                </p>
              )}
            </div>
            {(permissions.updateTimelineEntry || permissions.removeTimelineEntry) && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {permissions.updateTimelineEntry && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(entry)} aria-label={`Editar ${entry.title}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {permissions.removeTimelineEntry && (
                  <Button size="sm" variant="ghost" onClick={() => onRemove(entry)} aria-label={`Remover ${entry.title}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
