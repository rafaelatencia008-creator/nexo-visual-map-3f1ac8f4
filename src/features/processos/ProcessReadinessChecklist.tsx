import * as React from "react";
import { Check, Circle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Case, ConflictCheckStatus, DeadlineStatus } from "@/domain/core/case";
import {
  CASE_READINESS_ISSUES,
  type CaseReadinessIssue,
  type CaseReadinessView,
} from "@/domain/services/case-service";
import {
  CASE_READINESS_DESCRIPTIONS_PT,
  CASE_READINESS_LABELS_PT,
  CONFLICT_CHECK_LABELS_PT,
  DEADLINE_STATUS_LABELS_PT,
  buildCaseChecklistUpdateInput,
  caseToChecklistFormValues,
  getCaseReadinessProgress,
  type CaseChecklistFormValues,
  type CaseChecklistUpdateInput,
  type CaseDetailPublicError,
} from "@/features/processos/process-detail-model";

export type ChecklistSaveResult =
  | Readonly<{ status: "unchanged" }>
  | Readonly<{ status: "success"; readinessError?: string }>
  | Readonly<{ status: "error"; error: CaseDetailPublicError }>;

export type ProcessReadinessChecklistProps = Readonly<{
  case: Case;
  view: CaseReadinessView;
  canEdit: boolean;
  onSave: (input: CaseChecklistUpdateInput) => Promise<ChecklistSaveResult>;
  onReloadReadiness: () => Promise<CaseDetailPublicError | null>;
  onReloadAll: () => void;
}>;

export function ProcessReadinessChecklist(props: ProcessReadinessChecklistProps) {
  const { case: c, view, canEdit } = props;
  const progress = getCaseReadinessProgress(view);
  const initial = React.useMemo(() => caseToChecklistFormValues(c), [c]);
  const [values, setValues] = React.useState<CaseChecklistFormValues>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingReload, setPendingReload] = React.useState(false);
  const [publicError, setPublicError] = React.useState<CaseDetailPublicError | null>(null);
  const [readinessWarning, setReadinessWarning] = React.useState<string | null>(null);
  const submittingRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  // Reset values whenever the underlying case reference changes (id or version).
  React.useEffect(() => {
    setValues(initial);
    setPublicError(null);
    setReadinessWarning(null);
  }, [initial, c.id, c.metadata.version]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pendingSet = React.useMemo(
    () => new Set<CaseReadinessIssue>(view.issues),
    [view.issues],
  );

  const dirty =
    values.objectDefined !== initial.objectDefined ||
    values.deadlineStatus !== initial.deadlineStatus ||
    values.conflictCheck !== initial.conflictCheck;

  const disabled = !canEdit || submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!canEdit) return;
    const input = buildCaseChecklistUpdateInput(c, values);
    if (input === null) return;
    submittingRef.current = true;
    setSubmitting(true);
    setPublicError(null);
    setReadinessWarning(null);
    let result: ChecklistSaveResult;
    try {
      result = await props.onSave(input);
    } finally {
      if (mountedRef.current) setSubmitting(false);
      submittingRef.current = false;
    }
    if (!mountedRef.current) return;
    if (result.status === "error") {
      setPublicError(result.error);
      return;
    }
    if (result.status === "success") {
      toast.success("Checklist atualizado", {
        description: "As informações iniciais do processo foram salvas.",
      });
      if (result.readinessError !== undefined) {
        setReadinessWarning(result.readinessError);
      }
    }
  };

  const handleReloadReadiness = async () => {
    if (pendingReload) return;
    setPendingReload(true);
    setPublicError(null);
    try {
      const err = await props.onReloadReadiness();
      if (!mountedRef.current) return;
      if (err !== null) setReadinessWarning(err.message);
      else setReadinessWarning(null);
    } finally {
      if (mountedRef.current) setPendingReload(false);
    }
  };

  const conflictError = publicError?.kind === "conflict" ? publicError : null;
  const otherError = publicError && publicError.kind !== "conflict" ? publicError : null;

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Checklist de prontidão</CardTitle>
        <ChecklistProgress complete={progress.complete} total={progress.total} />
        <p className="text-sm text-muted-foreground">
          {progress.isReady
            ? "Checklist concluído — o processo reúne as condições iniciais de prontidão."
            : `O processo ainda possui ${progress.pending} pendência${progress.pending === 1 ? "" : "s"} antes de avançar.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canEdit && (
          <div
            role="status"
            className="rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
          >
            Você possui acesso somente para visualização.
          </div>
        )}

        <ul className="space-y-3" aria-label="Itens do checklist">
          {CASE_READINESS_ISSUES.map((key) => {
            const pending = pendingSet.has(key);
            return (
              <li
                key={key}
                className="flex items-start gap-3 rounded-md border border-border/50 bg-background/60 px-3 py-3"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${pending ? "border-muted-foreground/40 text-muted-foreground" : "border-primary bg-primary/10 text-primary"}`}
                  aria-hidden="true"
                >
                  {pending ? (
                    <Circle className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {CASE_READINESS_LABELS_PT[key]}
                    </p>
                    <span
                      className={`text-xs font-medium ${pending ? "text-muted-foreground" : "text-primary"}`}
                    >
                      {pending ? "Pendente" : "Concluído"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CASE_READINESS_DESCRIPTIONS_PT[key]}
                  </p>
                  {key === "professionalRoleDefined" && pending && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Será configurado na próxima etapa de pessoas e relações.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          className="space-y-6 border-t border-border/60 pt-6"
        >
          <h3 className="text-sm font-semibold text-foreground">
            Revisão inicial
          </h3>

          {conflictError && (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <p>{conflictError.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={props.onReloadAll}
              >
                Recarregar dados
              </Button>
            </div>
          )}

          {otherError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {otherError.message}
            </div>
          )}

          {readinessWarning && (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
            >
              <p>
                As alterações foram salvas, mas o checklist não pôde ser
                atualizado.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReloadReadiness}
                disabled={pendingReload}
              >
                {pendingReload ? "Recarregando…" : "Recarregar checklist"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Label>Objeto do trabalho</Label>
            <RadioGroup
              value={values.objectDefined ? "true" : "false"}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, objectDefined: v === "true" }))
              }
              className="flex flex-col gap-2 sm:flex-row sm:gap-6"
              aria-label="Objeto do trabalho"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem
                  value="false"
                  disabled={disabled}
                  aria-label="A definir"
                />
                A definir
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem
                  value="true"
                  disabled={disabled}
                  aria-label="Definido"
                />
                Definido
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checklist-deadline">Prazo</Label>
            <Select
              value={values.deadlineStatus}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, deadlineStatus: v as DeadlineStatus }))
              }
              disabled={disabled}
            >
              <SelectTrigger id="checklist-deadline" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DEADLINE_STATUS_LABELS_PT) as DeadlineStatus[]).map(
                  (opt) => (
                    <SelectItem key={opt} value={opt}>
                      {DEADLINE_STATUS_LABELS_PT[opt]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checklist-conflict">Conflito de interesse</Label>
            <Select
              value={values.conflictCheck}
              onValueChange={(v) =>
                setValues((s) => ({
                  ...s,
                  conflictCheck: v as ConflictCheckStatus,
                }))
              }
              disabled={disabled}
            >
              <SelectTrigger id="checklist-conflict" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(CONFLICT_CHECK_LABELS_PT) as ConflictCheckStatus[]
                ).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {CONFLICT_CHECK_LABELS_PT[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              className="w-full gap-2 sm:w-auto"
              disabled={disabled || !dirty}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Salvando checklist…" : "Salvar checklist"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChecklistProgress({
  complete,
  total,
}: {
  complete: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100);
  return (
    <div className="space-y-1">
      <Progress value={pct} aria-label="Progresso do checklist" />
      <p className="text-xs text-muted-foreground">
        {complete} de {total} itens concluídos
      </p>
    </div>
  );
}
