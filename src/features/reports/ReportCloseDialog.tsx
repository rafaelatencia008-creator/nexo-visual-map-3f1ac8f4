/**
 * LV-16 — Diálogo de fechamento técnico (versão fechada demonstrativa).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  REPORT_TEMPLATE_LABEL,
  type ReportDocument,
} from "./report-types";
import {
  canCloseReport,
  createReportVersion,
  getChecklistProgress,
  getLatestVersion,
  logClosureFlow,
} from "./report-mock-store";
import { computeReviewSummary } from "./report-review";

export function ReportCloseDialog({
  open,
  onOpenChange,
  document,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: ReportDocument;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const summary = computeReviewSummary(document);
  const progress = getChecklistProgress(document.id);
  const gate = canCloseReport(document.id);
  const latest = getLatestVersion(document.id);
  const totalBlocks = document.sections.reduce((n, s) => n + s.blocks.length, 0);
  const totalSources = document.sections.reduce(
    (n, s) => n + s.blocks.reduce((m, b) => m + b.sources.length, 0),
    0,
  );

  function close() {
    setReason("");
    setConfirm(false);
    onOpenChange(false);
  }

  function submit() {
    if (!confirm) {
      toast.error("Marque a confirmação final para fechar.");
      return;
    }
    if (reason.trim().length === 0) {
      toast.error("Motivo obrigatório.");
      return;
    }
    logClosureFlow(document.id, "iniciado");
    const r = createReportVersion(document.id, "fechada", reason, {
      confirmClosure: true,
    });
    if (!r.ok) {
      toast.error(r.reason);
      return;
    }
    toast.success(`Versão ${r.version.number} fechada (demonstrativa).`);
    close();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          logClosureFlow(document.id, "cancelado");
          close();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar versão demonstrativa</DialogTitle>
          <DialogDescription>
            Este fechamento é apenas demonstrativo. Não representa assinatura digital,
            protocolo, envio judicial ou validade oficial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-muted-foreground">Título:</span>
            <span className="truncate">{document.title}</span>
            <span className="text-muted-foreground">Modelo:</span>
            <span>{REPORT_TEMPLATE_LABEL[document.templateId]}</span>
            <span className="text-muted-foreground">Perícia:</span>
            <span className="truncate">{document.caseLabel}</span>
            <span className="text-muted-foreground">Status geral:</span>
            <span>{summary.generalStatus}</span>
            <span className="text-muted-foreground">Seções:</span>
            <span>{document.sections.length}</span>
            <span className="text-muted-foreground">Blocos:</span>
            <span>{totalBlocks}</span>
            <span className="text-muted-foreground">Fontes:</span>
            <span>{totalSources}</span>
            <span className="text-muted-foreground">Pendências impeditivas:</span>
            <span>{summary.blockingCount}</span>
            <span className="text-muted-foreground">Avisos:</span>
            <span>{summary.warningCount}</span>
            <span className="text-muted-foreground">Checklist:</span>
            <span>
              {progress.done}/{progress.total}
            </span>
            <span className="text-muted-foreground">Última versão:</span>
            <span>{latest ? `nº ${latest.number} (${latest.type})` : "—"}</span>
          </div>

          {!gate.ok && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700">
              Bloqueio: {gate.reason}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Motivo do fechamento</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva por que está fechando esta versão."
              aria-label="Motivo do fechamento"
            />
          </div>

          <label className="flex items-start gap-2 text-xs">
            <Checkbox
              checked={confirm}
              onCheckedChange={(v) => setConfirm(Boolean(v))}
              aria-label="Confirmação de fechamento demonstrativo"
            />
            <span>
              Confirmo que este fechamento é demonstrativo e ciente da ausência de
              assinatura, protocolo e validade oficial.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!gate.ok || !confirm || reason.trim().length === 0}>
            Fechar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
