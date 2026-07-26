/**
 * LV-16 — Diálogo de criação de versão (trabalho ou revisada).
 * Versão fechada usa o ReportCloseDialog dedicado.
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
import { toast } from "sonner";
import type { ReportVersionType } from "./report-types";
import { REPORT_VERSION_TYPE_LABEL } from "./report-types";
import { createReportVersion } from "./report-mock-store";

export function ReportVersionCreateDialog({
  open,
  onOpenChange,
  reportId,
  type,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportId: string;
  type: Exclude<ReportVersionType, "fechada">;
}) {
  const [reason, setReason] = useState("");

  function submit() {
    const r = createReportVersion(reportId, type, reason);
    if (!r.ok) {
      toast.error(r.reason);
      return;
    }
    toast.success(`Versão ${r.version.number} criada.`);
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar {REPORT_VERSION_TYPE_LABEL[type].toLowerCase()}</DialogTitle>
          <DialogDescription>
            Snapshot imutável do documento atual. Documento demonstrativo — sem validade oficial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <label className="text-xs font-medium">Motivo</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: consolidação antes de revisão do assistente técnico."
            aria-label="Motivo da versão"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={reason.trim().length === 0}>
            Criar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
