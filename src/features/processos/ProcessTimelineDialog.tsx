/**
 * LV-08.5B — diálogo de criação/edição de registro da Cronologia.
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
import {
  isCaseTimelineEntryKind,
  type CaseTimelineEntry,
  type CaseTimelineEntryKind,
} from "@/domain/core/case-plan";
import {
  CASE_TIMELINE_ENTRY_KIND_LABELS_PT,
  type PlanTimelinePublicError,
  type TimelineFormValues,
} from "@/features/processos/process-plan-model";

export type ProcessTimelineDialogMode =
  | Readonly<{ kind: "create"; entryKind: CaseTimelineEntryKind }>
  | Readonly<{ kind: "edit"; entry: CaseTimelineEntry }>;

export type ProcessTimelineDialogProps = Readonly<{
  open: boolean;
  mode: ProcessTimelineDialogMode;
  submitting: boolean;
  error: PlanTimelinePublicError | null;
  onSubmit: (values: TimelineFormValues) => void;
  onCancel: () => void;
  onReloadFromConflict: () => void;
}>;

export function ProcessTimelineDialog(props: ProcessTimelineDialogProps) {
  const { open, mode, submitting, error, onSubmit, onCancel, onReloadFromConflict } = props;

  const initial: TimelineFormValues = React.useMemo(() => {
    if (mode.kind === "edit") {
      return {
        kind: mode.entry.kind,
        occurredOn: mode.entry.occurredOn,
        title: mode.entry.title,
        description: mode.entry.description ?? "",
      };
    }
    return { kind: mode.entryKind, occurredOn: "", title: "", description: "" };
  }, [mode]);

  const [values, setValues] = React.useState<TimelineFormValues>(initial);
  const modeKey = mode.kind === "edit" ? `edit-${mode.entry.id}-${mode.entry.metadata.version}` : `create-${mode.entryKind}`;
  React.useEffect(() => {
    if (!open) return;
    setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKey]);

  const isConflict = error?.kind === "conflict" || error?.kind === "not_found";
  const titleOk = values.title.trim().length > 0;
  const dateOk = values.occurredOn.trim().length > 0;
  const canSubmit = !submitting && !isConflict && titleOk && dateOk;

  const title = mode.kind === "create"
    ? mode.entryKind === "milestone" ? "Novo marco" : "Novo registro"
    : "Editar registro da cronologia";

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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tl-kind">Tipo</Label>
              <Select
                value={values.kind}
                onValueChange={(v) => {
                  if (!isCaseTimelineEntryKind(v)) return;
                  setValues((s) => ({ ...s, kind: v }));
                }}
                disabled={submitting}
              >
                <SelectTrigger id="tl-kind" aria-label="Tipo do registro">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">{CASE_TIMELINE_ENTRY_KIND_LABELS_PT.milestone}</SelectItem>
                  <SelectItem value="note">{CASE_TIMELINE_ENTRY_KIND_LABELS_PT.note}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tl-date">Data</Label>
              <Input
                id="tl-date"
                type="date"
                value={values.occurredOn}
                onChange={(e) => setValues((s) => ({ ...s, occurredOn: e.target.value }))}
                disabled={submitting}
                aria-describedby={dateOk ? undefined : "tl-date-help"}
              />
              {!dateOk && (
                <p id="tl-date-help" className="text-xs text-muted-foreground">
                  A data é obrigatória.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tl-title">Título</Label>
            <Input
              id="tl-title"
              value={values.title}
              maxLength={160}
              onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
              disabled={submitting}
              autoFocus
              aria-describedby={titleOk ? undefined : "tl-title-help"}
            />
            {!titleOk && (
              <p id="tl-title-help" className="text-xs text-muted-foreground">
                O título é obrigatório.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tl-description">Descrição</Label>
            <Textarea
              id="tl-description"
              value={values.description}
              maxLength={2000}
              onChange={(e) => setValues((s) => ({ ...s, description: e.target.value }))}
              disabled={submitting}
              rows={3}
            />
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
            <Button type="button" onClick={() => canSubmit && onSubmit(values)} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
