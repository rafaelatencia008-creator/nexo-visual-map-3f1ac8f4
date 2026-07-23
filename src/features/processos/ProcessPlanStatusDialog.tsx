/**
 * LV-08.5B — diálogo dedicado para alterar andamento de item do plano.
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
  CASE_PLAN_ITEM_STATUSES,
  isCasePlanItemStatus,
  type CasePlanItem,
  type CasePlanItemStatus,
} from "@/domain/core/case-plan";
import {
  CASE_PLAN_ITEM_STATUS_LABELS_PT,
  type PlanTimelinePublicError,
} from "@/features/processos/process-plan-model";

export type ProcessPlanStatusDialogProps = Readonly<{
  open: boolean;
  item: CasePlanItem;
  submitting: boolean;
  error: PlanTimelinePublicError | null;
  onSubmit: (status: CasePlanItemStatus) => void;
  onCancel: () => void;
  onReloadFromConflict: () => void;
}>;

export function ProcessPlanStatusDialog(props: ProcessPlanStatusDialogProps) {
  const { open, item, submitting, error, onSubmit, onCancel, onReloadFromConflict } = props;
  const [status, setStatus] = React.useState<CasePlanItemStatus>(item.status);
  React.useEffect(() => {
    if (!open) return;
    setStatus(item.status);
  }, [open, item.status, item.id]);

  const isConflict = error?.kind === "conflict" || error?.kind === "not_found";
  const canSubmit = !submitting && !isConflict && status !== item.status;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onCancel(); }}>
      <DialogContent className="max-w-md" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>Alterar andamento</DialogTitle>
          <DialogDescription>
            Atualize apenas o andamento deste item do plano.
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

          <div className="space-y-2">
            <Label htmlFor="plan-status">Andamento</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CasePlanItemStatus)}
              disabled={submitting}
            >
              <SelectTrigger id="plan-status" aria-label="Andamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_PLAN_ITEM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CASE_PLAN_ITEM_STATUS_LABELS_PT[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="button" onClick={() => canSubmit && onSubmit(status)} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
