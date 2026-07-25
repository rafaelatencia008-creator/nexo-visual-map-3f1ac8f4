/**
 * LV-11 — Diálogo de resumo de entrevista/diligência.
 */
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DiligenceRecord, InterviewRecord, ModuleRecord } from "./interview-types";
import {
  buildDiligenceSummaryText,
  buildInterviewSummaryText,
  formatDurationBetween,
} from "./interview-mock-store";
import { getTemplate } from "./interview-templates";
import { INTERVIEW_STATUS_LABEL, PHOTO_CATEGORY_LABEL } from "./interview-labels";

export type InterviewSummaryDialogProps = {
  record: ModuleRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InterviewSummaryDialog({ record, open, onOpenChange }: InterviewSummaryDialogProps) {
  const summary = useMemo(() => {
    if (!record) return "";
    return record.kind === "entrevista"
      ? buildInterviewSummaryText(record)
      : buildDiligenceSummaryText(record);
  }, [record]);

  async function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(summary);
        toast.success("Resumo copiado");
        return;
      } catch {
        /* fallback */
      }
    }
    toast.error("Não foi possível copiar automaticamente. Selecione o texto abaixo.");
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo · {record.title}</DialogTitle>
          <DialogDescription>
            {INTERVIEW_STATUS_LABEL[record.status]} · duração{" "}
            {formatDurationBetween(record.startedAt, record.completedAt)}
          </DialogDescription>
        </DialogHeader>

        {record.kind === "entrevista" ? (
          <InterviewSummaryBody rec={record} />
        ) : (
          <DiligenceSummaryBody rec={record} />
        )}

        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Texto para copiar
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{summary}</pre>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleCopy}>Copiar resumo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InterviewSummaryBody({ rec }: { rec: InterviewRecord }) {
  const template = getTemplate(rec.templateId);
  const answered = rec.questions.filter((q) => q.status === "respondida").length;
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="text-muted-foreground">Roteiro:</span> {template?.name ?? rec.templateId}
      </p>
      <p>
        <span className="text-muted-foreground">Participantes:</span>{" "}
        {rec.participantIds.join(", ") || "—"}
      </p>
      <p>
        <span className="text-muted-foreground">Perguntas respondidas:</span> {answered} de{" "}
        {rec.questions.length}
      </p>
      {rec.notes.length > 0 && (
        <div>
          <p className="text-muted-foreground">Notas:</p>
          <ul className="list-disc pl-5">
            {rec.notes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        </div>
      )}
      {rec.transcriptBlocks.length > 0 && (
        <p className="text-muted-foreground">
          Transcrição manual: {rec.transcriptBlocks.length} blocos.
        </p>
      )}
      {rec.pendingItems.length > 0 && (
        <div>
          <p className="text-muted-foreground">Pendências:</p>
          <ul className="list-disc pl-5">
            {rec.pendingItems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {rec.conclusion && (
        <p>
          <span className="text-muted-foreground">Conclusão:</span> {rec.conclusion}
        </p>
      )}
    </div>
  );
}

function DiligenceSummaryBody({ rec }: { rec: DiligenceRecord }) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="text-muted-foreground">Endereço:</span> {rec.address ?? "—"}
      </p>
      {rec.location && (
        <p>
          <span className="text-muted-foreground">Localização:</span> {rec.location.latitude},{" "}
          {rec.location.longitude}
        </p>
      )}
      {rec.checklistItems.length > 0 && (
        <div>
          <p className="text-muted-foreground">Checklist:</p>
          <ul className="list-disc pl-5">
            {rec.checklistItems.map((it) => (
              <li key={it.id}>
                [{it.state}] {it.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rec.photos.length > 0 && (
        <div>
          <p className="text-muted-foreground">Fotos:</p>
          <ul className="list-disc pl-5">
            {rec.photos.map((p) => (
              <li key={p.id}>
                ({PHOTO_CATEGORY_LABEL[p.category]}) {p.name}
                {p.caption ? ` — ${p.caption}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rec.notes.length > 0 && (
        <div>
          <p className="text-muted-foreground">Notas:</p>
          <ul className="list-disc pl-5">
            {rec.notes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        </div>
      )}
      {rec.pendingItems.length > 0 && (
        <div>
          <p className="text-muted-foreground">Pendências:</p>
          <ul className="list-disc pl-5">
            {rec.pendingItems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {rec.conclusion && (
        <p>
          <span className="text-muted-foreground">Conclusão:</span> {rec.conclusion}
        </p>
      )}
    </div>
  );
}
