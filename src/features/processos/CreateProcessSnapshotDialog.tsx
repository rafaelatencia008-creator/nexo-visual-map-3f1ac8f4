/**
 * LV-08.6B / LV-08.6B.1 — diálogo de criação de snapshot.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SNAPSHOT_LABEL_MAX,
  SNAPSHOT_REASON_MAX,
  buildCreateCaseSnapshotInput,
  type AuditSnapshotPublicError,
  type SnapshotBuildError,
  type SnapshotFormValues,
} from "@/features/processos/process-audit-snapshot-model";
import type { CaseId } from "@/domain/core/ids";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";

export type CreateProcessSnapshotDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: CaseId;
  submitting: boolean;
  error: AuditSnapshotPublicError | null;
  onSubmit: (input: CreateCaseSnapshotInput) => void;
}>;

type FieldError =
  | { field: "label"; message: string }
  | { field: "reason"; message: string };

function toFieldError(reason: SnapshotBuildError): FieldError {
  switch (reason) {
    case "label_required":
      return { field: "label", message: "Informe um nome para o snapshot." };
    case "label_too_long":
      return {
        field: "label",
        message: `O nome deve ter no máximo ${SNAPSHOT_LABEL_MAX} caracteres.`,
      };
    case "reason_too_long":
      return {
        field: "reason",
        message: `O motivo deve ter no máximo ${SNAPSHOT_REASON_MAX} caracteres.`,
      };
  }
}

export function CreateProcessSnapshotDialog({
  open,
  onOpenChange,
  caseId,
  submitting,
  error,
  onSubmit,
}: CreateProcessSnapshotDialogProps) {
  const [values, setValues] = React.useState<SnapshotFormValues>({
    label: "",
    reason: "",
  });
  const [fieldError, setFieldError] = React.useState<FieldError | null>(null);

  React.useEffect(() => {
    if (!open) {
      setValues({ label: "", reason: "" });
      setFieldError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const built = buildCreateCaseSnapshotInput(caseId, values);
    if (!built.ok) {
      setFieldError(toFieldError(built.reason));
      return;
    }
    setFieldError(null);
    onSubmit(built.input);
  };

  const labelError =
    fieldError !== null && fieldError.field === "label" ? fieldError : null;
  const reasonError =
    fieldError !== null && fieldError.field === "reason" ? fieldError : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-busy={submitting || undefined}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Criar snapshot do processo</DialogTitle>
            <DialogDescription>
              Registre uma fotografia imutável do estado atual do processo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="snapshot-label">Nome do snapshot</Label>
            <Input
              id="snapshot-label"
              autoFocus
              maxLength={SNAPSHOT_LABEL_MAX + 10}
              value={values.label}
              onChange={(e) =>
                setValues((v) => ({ ...v, label: e.target.value }))
              }
              aria-describedby={
                labelError !== null ? "snapshot-label-error" : undefined
              }
              aria-invalid={labelError !== null || undefined}
              disabled={submitting}
            />
            {labelError !== null ? (
              <p
                id="snapshot-label-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {labelError.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="snapshot-reason">Motivo (opcional)</Label>
            <Textarea
              id="snapshot-reason"
              rows={4}
              maxLength={SNAPSHOT_REASON_MAX + 10}
              value={values.reason}
              onChange={(e) =>
                setValues((v) => ({ ...v, reason: e.target.value }))
              }
              aria-describedby={
                reasonError !== null ? "snapshot-reason-error" : undefined
              }
              aria-invalid={reasonError !== null || undefined}
              disabled={submitting}
            />
            {reasonError !== null ? (
              <p
                id="snapshot-reason-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {reasonError.message}
              </p>
            ) : null}
          </div>
          {error !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando…" : "Criar snapshot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
