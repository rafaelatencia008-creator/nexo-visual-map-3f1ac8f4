/**
 * LV-14 — Diálogo para vincular fonte mock a um bloco.
 * Apenas referência visual — não altera módulos de origem.
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  REPORT_SOURCE_KIND_LABEL,
  type ReportSourceKind,
} from "./report-types";
import { collectSourceCandidates } from "./report-source-adapters";
import { linkSourceToBlock } from "./report-mock-store";

export type ReportSourceLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  sectionId: string;
  blockId: string;
  caseId: string;
};

const KIND_ORDER: readonly ReportSourceKind[] = [
  "entrevista",
  "diligencia",
  "documento",
  "quesito",
  "evidencia",
];

export function ReportSourceLinkDialog({
  open,
  onOpenChange,
  reportId,
  sectionId,
  blockId,
  caseId,
}: ReportSourceLinkDialogProps): JSX.Element {
  const [kind, setKind] = useState<ReportSourceKind>("documento");
  const candidates = useMemo(() => collectSourceCandidates(caseId), [caseId]);
  const list = candidates[kind];

  function handleLink(refId: string, label: string): void {
    linkSourceToBlock(reportId, sectionId, blockId, {
      kind,
      refId,
      label,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular origem ao bloco</DialogTitle>
          <DialogDescription>
            Selecione o tipo de fonte e um registro. Apenas referência visual —
            os módulos de origem não são modificados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          {KIND_ORDER.map((k) => (
            <Badge
              key={k}
              variant={k === kind ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setKind(k)}
            >
              {REPORT_SOURCE_KIND_LABEL[k]} · {candidates[k].length}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <Select value={kind} onValueChange={(v) => setKind(v as ReportSourceKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  {REPORT_SOURCE_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ScrollArea className="h-64 rounded-md border">
            <ul className="divide-y">
              {list.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">
                  Nenhum registro disponível nesse tipo para a perícia atual.
                </li>
              )}
              {list.map((c) => (
                <li
                  key={`${c.kind}-${c.refId}`}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.label}</p>
                    {c.hint && (
                      <p className="text-xs text-muted-foreground">{c.hint}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLink(c.refId, c.label)}
                  >
                    Vincular
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
