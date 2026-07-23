/**
 * LV-08.5B — diálogo de criação/edição de item do Plano de trabalho.
 */

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CasePlanItem, CasePlanItemKind } from "@/domain/core/case-plan";
import {
  CASE_PLAN_ITEM_PRIORITIES,
  isCasePlanItemKind,
  isCasePlanItemPriority,
} from "@/domain/core/case-plan";
import {
  CASE_PLAN_ITEM_KIND_LABELS_PT,
  CASE_PLAN_ITEM_PRIORITY_LABELS_PT,
  type AssignmentOption,
  type PlanItemFormValues,
  type PlanTimelinePublicError,
} from "@/features/processos/process-plan-model";

const NO_ASSIGN = "__none__";

export type ProcessPlanDialogMode =
  | Readonly<{ kind: "create"; itemKind: CasePlanItemKind }>
  | Readonly<{ kind: "edit"; item: CasePlanItem }>;

export type ProcessPlanDialogProps = Readonly<{
  open: boolean;
  mode: ProcessPlanDialogMode;
  submitting: boolean;
  error: PlanTimelinePublicError | null;
  assignmentOptions: readonly AssignmentOption[];
  onSubmit: (values: PlanItemFormValues) => void;
  onCancel: () => void;
  onReloadFromConflict: () => void;
}>;

export function ProcessPlanDialog(props: ProcessPlanDialogProps) {
  const {
    open, mode, submitting, error, assignmentOptions,
    onSubmit, onCancel, onReloadFromConflict,
  } = props;

  const initial: PlanItemFormValues = React.useMemo(() => {
    if (mode.kind === "edit") {
      return {
        kind: mode.item.kind,
        title: mode.item.title,
        description: mode.item.description ?? "",
        priority: mode.item.priority,
        dueOn: mode.item.dueOn ?? "",
        assignmentId: mode.item.assignmentId ?? "",
      };
    }
    return {
      kind: mode.itemKind,
      title: "",
      description: "",
      priority: "normal",
      dueOn: "",
      assignmentId: "",
    };
  }, [mode]);

  const [values, setValues] = React.useState<PlanItemFormValues>(initial);
  const modeKey = mode.kind === "edit" ? `edit-${mode.item.id}-${mode.item.metadata.version}` : `create-${mode.itemKind}`;
  React.useEffect(() => {
    if (!open) return;
    setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKey]);

  const isConflict = error?.kind === "conflict" || error?.kind === "not_found";
  const titleOk = values.title.trim().length > 0;
  const canSubmit = !submitting && !isConflict && titleOk;

  // LV-08.5B.1 — Filtra opções conforme o modo:
  // - create: somente assignments ativos;
  // - edit: assignments ativos + o atual (mesmo inativo), evitando expor
  //   outros assignments inativos como escolha.
  const combinedOptions: readonly AssignmentOption[] = React.useMemo(() => {
    const activeOnly = assignmentOptions.filter((o) => o.availableForNewAssignments);
    if (mode.kind !== "edit") return activeOnly;
    const currentId = mode.item.assignmentId;
    if (!currentId) return activeOnly;
    const current = assignmentOptions.find((o) => o.assignmentId === currentId);
    if (!current) return activeOnly;
    if (current.availableForNewAssignments) return activeOnly;
    return [...activeOnly, current];
  }, [assignmentOptions, mode]);

  const title = mode.kind === "create"
    ? mode.itemKind === "activity" ? "Nova atividade" : "Nova pendência"
    : mode.item.kind === "activity" ? "Editar atividade" : "Editar pendência";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onCancel(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Estas informações ficam apenas nesta sessão do navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {mode.kind === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="plan-kind">Tipo</Label>
              <Select
                value={values.kind}
                onValueChange={(v) => setValues((s) => ({ ...s, kind: v as CasePlanItemKind }))}
                disabled={submitting}
              >
                <SelectTrigger id="plan-kind" aria-label="Tipo do item">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">{CASE_PLAN_ITEM_KIND_LABELS_PT.activity}</SelectItem>
                  <SelectItem value="pending">{CASE_PLAN_ITEM_KIND_LABELS_PT.pending}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan-title">Título</Label>
            <Input
              id="plan-title"
              value={values.title}
              maxLength={160}
              onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
              disabled={submitting}
              autoFocus
              aria-describedby={titleOk ? undefined : "plan-title-help"}
            />
            {!titleOk && (
              <p id="plan-title-help" className="text-xs text-muted-foreground">
                O título é obrigatório.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea
              id="plan-description"
              value={values.description}
              maxLength={2000}
              onChange={(e) => setValues((s) => ({ ...s, description: e.target.value }))}
              disabled={submitting}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-priority">Prioridade</Label>
              <Select
                value={values.priority}
                onValueChange={(v) => setValues((s) => ({ ...s, priority: v as PlanItemFormValues["priority"] }))}
                disabled={submitting}
              >
                <SelectTrigger id="plan-priority" aria-label="Prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_PLAN_ITEM_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {CASE_PLAN_ITEM_PRIORITY_LABELS_PT[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-due">Prazo</Label>
              <Input
                id="plan-due"
                type="date"
                value={values.dueOn}
                onChange={(e) => setValues((s) => ({ ...s, dueOn: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-assign">Responsável</Label>
            <Select
              value={values.assignmentId === "" ? NO_ASSIGN : values.assignmentId}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, assignmentId: v === NO_ASSIGN ? "" : v }))
              }
              disabled={submitting}
            >
              <SelectTrigger id="plan-assign" aria-label="Responsável">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ASSIGN}>Sem responsável</SelectItem>
                {combinedOptions.map((o) => (
                  <SelectItem
                    key={o.assignmentId}
                    value={o.assignmentId}
                    disabled={!o.availableForNewAssignments && (
                      mode.kind !== "edit" || mode.item.assignmentId !== o.assignmentId
                    )}
                  >
                    {o.label}
                    {!o.availableForNewAssignments ? " (indisponível)" : ""}
                  </SelectItem>
                ))}
                {mode.kind === "edit" &&
                  mode.item.assignmentId &&
                  !combinedOptions.some((o) => o.assignmentId === mode.item.assignmentId) && (
                    <SelectItem value={mode.item.assignmentId} disabled>
                      Responsável atual (não disponível)
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
            {!assignmentOptions.some((o) => o.availableForNewAssignments) && (
              <p className="text-xs text-muted-foreground">
                Não há responsáveis ativos disponíveis para novas atribuições.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          {isConflict ? (
            <Button type="button" onClick={onReloadFromConflict}>
              Recarregar plano e cronologia
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
