/**
 * LV-15 — Diálogo de exportação local (TXT / JSON / Imprimir).
 * Sem chamadas de rede. Sem servidor.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, Printer } from "lucide-react";
import {
  REPORT_WATERMARK,
  type ReportDocument,
  type ReportExportFormat,
  type ReportExportMode,
} from "./report-types";
import { computeReviewSummary } from "./report-review";
import { prepareExport } from "./report-export";
import {
  logExportBlocked,
  logExportPerformed,
} from "./report-mock-store";

export type ReportExportDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly document: ReportDocument;
  /**
   * Quando fornecido, chamado no lugar da geração real (usado em testes/preview).
   */
  readonly onPrint?: () => void;
};

function downloadBlob(filename: string, mime: string, content: string): void {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    // Ambiente sem DOM: apenas silencia. Não há rede envolvida.
  }
}

export function ReportExportDialog({
  open,
  onOpenChange,
  document: doc,
  onPrint,
}: ReportExportDialogProps) {
  const summary = useMemo(() => computeReviewSummary(doc), [doc]);
  const [format, setFormat] = useState<ReportExportFormat>("txt");
  const [mode, setMode] = useState<ReportExportMode>(
    summary.canExportReviewed ? "revisada" : "rascunho",
  );
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(): void {
    setError(null);
    const decision = prepareExport(doc, format, mode);
    if (!decision.ok) {
      logExportBlocked(doc.id, decision.reason);
      setError(decision.reason);
      return;
    }
    const { payload } = decision;
    if (format === "print") {
      if (onPrint) {
        onPrint();
      } else if (typeof window !== "undefined" && window.print) {
        window.print();
      }
      logExportPerformed(
        doc.id,
        `Impressão local iniciada (modo ${mode}).`,
      );
    } else {
      downloadBlob(payload.filename, payload.mime, payload.content);
      logExportPerformed(
        doc.id,
        `Exportação ${format.toUpperCase()} (modo ${mode}) — ${payload.filename}.`,
      );
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar documento (local)</DialogTitle>
          <DialogDescription>
            Exportação estritamente local. Nenhum dado é enviado para servidores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-destructive">
            {REPORT_WATERMARK}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de exportação</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ReportExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">Texto estruturado (.txt)</SelectItem>
                <SelectItem value="json">Dados do documento (.json)</SelectItem>
                <SelectItem value="print">Imprimir pelo navegador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as ReportExportMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem
                  value="revisada"
                  disabled={!summary.canExportReviewed}
                >
                  Versão revisada{" "}
                  {!summary.canExportReviewed && "(indisponível: há pendências impeditivas)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Badge variant="outline">
              {summary.blockingCount} impeditivo(s)
            </Badge>
            <Badge variant="outline">
              {summary.warningCount} aviso(s)
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Você confirma que este é um documento demonstrativo, sem valor legal,
            e que a exportação será utilizada apenas para revisão local.
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            {format === "print" ? (
              <>
                <Printer className="mr-1 h-4 w-4" /> Imprimir
              </>
            ) : (
              <>
                <Download className="mr-1 h-4 w-4" /> Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
