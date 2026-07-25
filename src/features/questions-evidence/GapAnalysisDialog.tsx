/**
 * LV-12 — Diálogo simples de lista de lacunas (visualização geral).
 */
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { listQuestions } from "./question-mock-store";
import { GAP_KIND_LABEL, QUESTION_PRIORITY_LABEL } from "./question-labels";

export function GapAnalysisDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const items = useMemo(() => {
    const all = listQuestions();
    const rows: {
      questionId: string;
      sequence: number;
      questionText: string;
      gap: { kind: string; description: string; priority: string; resolved: boolean };
    }[] = [];
    for (const q of all) {
      for (const g of q.gapItems) {
        rows.push({
          questionId: q.id,
          sequence: q.sequence,
          questionText: q.text,
          gap: {
            kind: g.kind,
            description: g.description,
            priority: g.priority,
            resolved: g.resolved,
          },
        });
      }
    }
    return rows;
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lacunas por quesito</DialogTitle>
        </DialogHeader>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma lacuna registrada.</p>}
        <div className="space-y-2">
          {items.map((row, i) => (
            <div key={i} className="rounded-md border border-border/60 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">Nº {row.sequence}</Badge>
                <Badge>{GAP_KIND_LABEL[row.gap.kind as keyof typeof GAP_KIND_LABEL]}</Badge>
                <Badge variant="outline">
                  {QUESTION_PRIORITY_LABEL[row.gap.priority as keyof typeof QUESTION_PRIORITY_LABEL]}
                </Badge>
                {row.gap.resolved && (
                  <Badge className="bg-emerald-500/15 text-emerald-700">Resolvida</Badge>
                )}
              </div>
              <p className="mt-2 break-words text-sm">{row.gap.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.questionText}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
