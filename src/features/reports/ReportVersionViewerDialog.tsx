/**
 * LV-16 — Visualizador somente-leitura de uma versão (snapshot imutável).
 */
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  REPORT_SECTION_STATUS_LABEL,
  REPORT_TEMPLATE_LABEL,
  REPORT_VERSION_STATUS_LABEL,
  REPORT_VERSION_TYPE_LABEL,
  type ReportVersion,
} from "./report-types";
import { logVersionViewed } from "./report-mock-store";

export function ReportVersionViewerDialog({
  open,
  onOpenChange,
  version,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  version: ReportVersion | null;
}) {
  useEffect(() => {
    if (open && version) logVersionViewed(version.reportId, version.id);
  }, [open, version]);
  if (!version) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Versão nº {version.number} — {REPORT_VERSION_TYPE_LABEL[version.type]}
          </DialogTitle>
          <DialogDescription>{version.watermark}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="rounded-md border bg-muted/30 p-2 text-xs">
            Snapshot imutável da versão
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{REPORT_VERSION_STATUS_LABEL[version.status]}</Badge>
            <Badge variant="secondary">
              {REPORT_TEMPLATE_LABEL[version.templateId]}
            </Badge>
            <Badge variant="outline">Autor: {version.authorLabel}</Badge>
            <Badge variant="outline">Criada em {version.createdAt}</Badge>
            <Badge variant="outline">Pendências: {version.pendingCount}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Motivo: {version.reason}
          </p>
          <Separator />
          <div>
            <h3 className="font-medium">{version.title}</h3>
            <p className="text-xs text-muted-foreground">
              {version.caseLabel} · {version.caseId}
            </p>
          </div>
          <Separator />
          {version.snapshot.document.sections.map((s) => (
            <div key={s.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">{s.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {REPORT_SECTION_STATUS_LABEL[s.status]}
                </Badge>
              </div>
              {s.blocks.map((b) => (
                <div key={b.id} className="rounded-md border p-2">
                  <p className="text-xs font-medium">{b.title}</p>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {b.content.trim() || "(sem conteúdo)"}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
