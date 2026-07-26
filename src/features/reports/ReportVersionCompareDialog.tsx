/**
 * LV-16 — Comparação legível entre duas versões do mesmo documento.
 * Nunca renderiza HTML arbitrário; usa apenas texto.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  REPORT_CHECKLIST_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  type ReportChecklistItemId,
  type ReportVersion,
} from "./report-types";
import { compareReportVersions } from "./report-mock-store";

const DIFF_LABEL: Record<string, string> = {
  sem_alteracao: "Sem alteração",
  alterado: "Alterado",
  adicionado: "Adicionado",
  removido: "Removido",
  movido: "Movido",
};

export function ReportVersionCompareDialog({
  open,
  onOpenChange,
  versions,
  initialA,
  initialB,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versions: readonly ReportVersion[];
  initialA?: string;
  initialB?: string;
}) {
  const [aId, setAId] = useState<string | undefined>(initialA ?? versions[0]?.id);
  const [bId, setBId] = useState<string | undefined>(
    initialB ?? versions[versions.length - 1]?.id,
  );
  const diff = useMemo(() => {
    if (!aId || !bId || !versions.length) return null;
    try {
      return compareReportVersions(versions[0].reportId, aId, bId);
    } catch {
      return null;
    }
  }, [aId, bId, versions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar versões</DialogTitle>
          <DialogDescription>
            Comparação legível — snapshots imutáveis, sem HTML arbitrário.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Versão A</label>
            <Select value={aId} onValueChange={setAId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    nº {v.number} — {v.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Versão B</label>
            <Select value={bId} onValueChange={setBId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    nº {v.number} — {v.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        {diff ? (
          <div className="space-y-4 text-sm">
            <ul className="grid gap-1 sm:grid-cols-2">
              {diff.title.changed && (
                <li>
                  <strong>Título:</strong> {diff.title.before} → {diff.title.after}
                </li>
              )}
              {diff.template.changed && (
                <li>
                  <strong>Modelo:</strong> {diff.template.before} → {diff.template.after}
                </li>
              )}
              {diff.generalStatus.changed && (
                <li>
                  <strong>Status geral:</strong> {diff.generalStatus.before} → {diff.generalStatus.after}
                </li>
              )}
              {diff.reason.changed && (
                <li>
                  <strong>Motivo:</strong> {diff.reason.before} → {diff.reason.after}
                </li>
              )}
              <li>
                <strong>Pendências:</strong> {diff.pendingCount.before} → {diff.pendingCount.after}
              </li>
            </ul>
            {diff.checklistChanged.length > 0 && (
              <div>
                <p className="text-xs font-medium">Checklist alterado:</p>
                <ul className="text-xs text-muted-foreground">
                  {diff.checklistChanged.map((k) => (
                    <li key={k}>• {REPORT_CHECKLIST_LABEL[k as ReportChecklistItemId]}</li>
                  ))}
                </ul>
              </div>
            )}
            <Separator />
            <div className="space-y-3">
              {diff.sections.map((s) => (
                <div key={s.kind} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.statusChanged && (
                      <Badge variant="outline" className="text-xs">
                        {s.statusBefore
                          ? REPORT_SECTION_STATUS_LABEL[s.statusBefore]
                          : "—"}{" "}
                        →{" "}
                        {s.statusAfter
                          ? REPORT_SECTION_STATUS_LABEL[s.statusAfter]
                          : "—"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Blocos: {s.blocksBefore} → {s.blocksAfter}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {s.blocks
                      .filter((b) => b.kind !== "sem_alteracao")
                      .map((b, i) => (
                        <li key={i} className="rounded border p-1.5">
                          <Badge variant="secondary" className="mr-1">
                            {DIFF_LABEL[b.kind] ?? b.kind}
                          </Badge>
                          <span className="font-medium">
                            {b.titleAfter ?? b.titleBefore}
                          </span>
                          {b.kind === "alterado" && b.titleBefore !== b.titleAfter && (
                            <div className="text-muted-foreground">
                              Título: {b.titleBefore} → {b.titleAfter}
                            </div>
                          )}
                          {b.kind === "alterado" && b.contentBefore !== b.contentAfter && (
                            <div className="grid gap-1 sm:grid-cols-2">
                              <div>
                                <p className="font-medium text-muted-foreground">Antes</p>
                                <p className="whitespace-pre-wrap">
                                  {b.contentBefore ?? ""}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">Depois</p>
                                <p className="whitespace-pre-wrap">
                                  {b.contentAfter ?? ""}
                                </p>
                              </div>
                            </div>
                          )}
                          {b.sourcesAdded.length > 0 && (
                            <p className="text-emerald-700">
                              + Fontes: {b.sourcesAdded.join("; ")}
                            </p>
                          )}
                          {b.sourcesRemoved.length > 0 && (
                            <p className="text-rose-700">
                              − Fontes: {b.sourcesRemoved.join("; ")}
                            </p>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione duas versões do mesmo documento.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
