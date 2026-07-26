/**
 * LV-16 — Painel de Fechamento técnico.
 * Checklist manual + gate de criação de versão fechada.
 */
import { useSyncExternalStore, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  REPORT_CHECKLIST_LABEL,
  REPORT_CHECKLIST_ORDER,
  type ReportChecklistItemId,
  type ReportDocument,
} from "./report-types";
import {
  canCloseReport,
  getChecklist,
  getChecklistProgress,
  isReportFrozen,
  setChecklistItem,
  subscribeReportChecklist,
  subscribeReports,
} from "./report-mock-store";
import { ReportCloseDialog } from "./ReportCloseDialog";

export function ReportClosurePanel({ document }: { document: ReportDocument }) {
  const reportId = document.id;
  const checklist = useSyncExternalStore(
    subscribeReportChecklist,
    () => getChecklist(reportId),
    () => getChecklist(reportId),
  );
  const frozen = useSyncExternalStore(
    subscribeReports,
    () => isReportFrozen(reportId),
    () => isReportFrozen(reportId),
  );
  const progress = getChecklistProgress(reportId);
  const gate = canCloseReport(reportId);
  const [openClose, setOpenClose] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fechamento técnico demonstrativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Este fechamento é apenas demonstrativo. Não representa assinatura digital,
            protocolo, envio judicial ou validade oficial.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={progress.complete ? "default" : "outline"}>
              Checklist {progress.done}/{progress.total}
            </Badge>
            {frozen && <Badge variant="secondary">Documento congelado</Badge>}
            {!gate.ok && !frozen && (
              <Badge variant="outline" className="text-amber-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {gate.reason}
              </Badge>
            )}
          </div>
          <Separator />
          <ul className="grid gap-2 sm:grid-cols-2">
            {REPORT_CHECKLIST_ORDER.map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Checkbox
                  id={`cl-${k}`}
                  checked={checklist[k]}
                  disabled={frozen}
                  onCheckedChange={(v) =>
                    setChecklistItem(reportId, k as ReportChecklistItemId, Boolean(v))
                  }
                  aria-label={REPORT_CHECKLIST_LABEL[k]}
                />
                <label htmlFor={`cl-${k}`} className="cursor-pointer text-sm leading-tight">
                  {REPORT_CHECKLIST_LABEL[k]}
                </label>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {progress.complete ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Checklist concluído
                </span>
              ) : (
                <span>
                  Faltam {progress.remaining.length} itens do checklist para fechar.
                </span>
              )}
            </div>
            <Button
              disabled={!gate.ok || frozen}
              onClick={() => setOpenClose(true)}
              aria-label="Fechar versão demonstrativa"
            >
              <ShieldCheck className="mr-1 h-4 w-4" />
              Fechar versão demonstrativa
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReportCloseDialog
        open={openClose}
        onOpenChange={setOpenClose}
        document={document}
      />
    </div>
  );
}
