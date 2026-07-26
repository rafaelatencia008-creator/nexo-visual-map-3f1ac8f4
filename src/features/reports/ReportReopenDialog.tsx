/**
 * LV-16 — Diálogo de reabertura controlada.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { reopenReport } from "./report-mock-store";

export function ReportReopenDialog({
  open,
  onOpenChange,
  reportId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportId: string;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);

  function submit() {
    const r = reopenReport(reportId, reason, { confirm });
    if (!r.ok) {
      toast.error(r.reason);
      return;
    }
    toast.success("Documento reaberto.");
    setReason("");
    setConfirm(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir documento congelado</DialogTitle>
          <DialogDescription>
            A versão fechada anterior será preservada e não será modificada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <label className="text-xs font-medium">Motivo da reabertura</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da reabertura."
            aria-label="Motivo da reabertura"
          />
          <label className="flex items-start gap-2 text-xs">
            <Checkbox
              checked={confirm}
              onCheckedChange={(v) => setConfirm(Boolean(v))}
              aria-label="Confirmar reabertura"
            />
            <span>
              Confirmo a reabertura e ciência de que a versão fechada anterior
              permanece imutável.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!confirm || reason.trim().length === 0}>
            Reabrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
