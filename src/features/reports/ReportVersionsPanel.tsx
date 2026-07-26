/**
 * LV-16 — Linha do tempo de versões e ações.
 */
import { useState, useSyncExternalStore } from "react";
import {
  Download,
  Eye,
  FilePlus2,
  GitCompare,
  Printer,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  REPORT_VERSION_STATUS_LABEL,
  REPORT_VERSION_TYPE_LABEL,
  type ReportVersion,
  type ReportVersionType,
} from "./report-types";
import {
  getReportVersion,
  getReportVersionsSnapshot,
  isReportFrozen,
  logVersionPrinted,
  logVersionExported,
  subscribeReports,
  subscribeReportVersions,
} from "./report-mock-store";
import { prepareVersionExport } from "./report-export";
import { toast } from "sonner";
import { ReportVersionCreateDialog } from "./ReportVersionCreateDialog";
import { ReportVersionViewerDialog } from "./ReportVersionViewerDialog";
import { ReportVersionCompareDialog } from "./ReportVersionCompareDialog";
import { ReportReopenDialog } from "./ReportReopenDialog";

function downloadLocal(filename: string, mime: string, content: string) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore — ambiente sem DOM (SSR/test)
  }
}

function printLocal(content: string) {
  try {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;padding:16px">${content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`,
    );
    w.document.close();
    w.focus();
    w.print();
  } catch {
    // noop
  }
}

export function ReportVersionsPanel({ reportId }: { reportId: string }) {
  const versions = useSyncExternalStore(
    subscribeReportVersions,
    () => getReportVersionsSnapshot(reportId),
    () => getReportVersionsSnapshot(reportId),
  );
  const frozen = useSyncExternalStore(
    subscribeReports,
    () => isReportFrozen(reportId),
    () => isReportFrozen(reportId),
  );

  const [createType, setCreateType] = useState<Exclude<ReportVersionType, "fechada"> | null>(null);
  const [viewing, setViewing] = useState<ReportVersion | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  function handleExport(v: ReportVersion, format: "txt" | "json" | "print") {
    const r = prepareVersionExport(v, format);
    if (!r.ok) {
      toast.error(r.reason);
      return;
    }
    if (format === "print") {
      printLocal(r.payload.content);
      logVersionPrinted(reportId, v.id);
    } else {
      downloadLocal(r.payload.filename, r.payload.mime, r.payload.content);
      logVersionExported(
        reportId,
        v.id,
        `Versão ${v.number} exportada em ${format.toUpperCase()}.`,
      );
      toast.success(`Versão ${v.number} exportada em ${format.toUpperCase()}.`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Linha do tempo de versões</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={frozen}
            onClick={() => setCreateType("trabalho")}
          >
            <FilePlus2 className="mr-1 h-4 w-4" />
            Versão de trabalho
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={frozen}
            onClick={() => setCreateType("revisada")}
          >
            <FilePlus2 className="mr-1 h-4 w-4" />
            Versão revisada
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={versions.length < 2}
            onClick={() => setCompareOpen(true)}
          >
            <GitCompare className="mr-1 h-4 w-4" />
            Comparar
          </Button>
          {frozen && (
            <Button size="sm" onClick={() => setReopenOpen(true)}>
              <Unlock className="mr-1 h-4 w-4" />
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma versão criada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {versions.slice().reverse().map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    Versão nº {v.number} — {REPORT_VERSION_TYPE_LABEL[v.type]}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{REPORT_VERSION_STATUS_LABEL[v.status]}</Badge>
                    <Badge variant="secondary">
                      Pendências: {v.pendingCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  {v.createdAt} — {v.authorLabel}
                </p>
                <p>Motivo: {v.reason}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(v)}>
                    <Eye className="mr-1 h-3 w-3" /> Visualizar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleExport(v, "txt")}>
                    <Download className="mr-1 h-3 w-3" /> TXT
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleExport(v, "json")}>
                    <Download className="mr-1 h-3 w-3" /> JSON
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleExport(v, "print")}>
                    <Printer className="mr-1 h-3 w-3" /> Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createType && (
        <ReportVersionCreateDialog
          open
          onOpenChange={(o) => !o && setCreateType(null)}
          reportId={reportId}
          type={createType}
        />
      )}
      <ReportVersionViewerDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        version={viewing}
      />
      <ReportVersionCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        versions={versions}
      />
      <ReportReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        reportId={reportId}
      />
    </div>
  );
}
