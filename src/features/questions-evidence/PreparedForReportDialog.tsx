/**
 * LV-12 — Visualização "Conteúdo preparado para o laudo".
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy } from "lucide-react";
import {
  buildPreparedBlock,
  listQuestions,
  unmarkReadyForReport,
} from "./question-mock-store";
import { QUESTION_ORIGIN_LABEL } from "./question-labels";

export function PreparedForReportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const prepared = useMemo(
    () =>
      listQuestions()
        .filter((q) => q.readyForReport)
        .slice()
        .sort((a, b) => a.sequence - b.sequence),
    [],
  );

  const combined = useMemo(
    () => prepared.map((q) => buildPreparedBlock(q)).join("\n\n---\n\n"),
    [prepared],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conteúdo preparado para o laudo</DialogTitle>
          <DialogDescription>
            Preparação mock. O módulo de Laudos será integrado em etapa futura.
          </DialogDescription>
        </DialogHeader>

        {notice && (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        {prepared.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum quesito preparado ainda. Marque quesitos respondidos como “Preparado para o laudo”.
          </p>
        )}
        {prepared.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    if (navigator.clipboard) await navigator.clipboard.writeText(combined);
                    setNotice("Conteúdo copiado.");
                  } catch {
                    setNotice("Falha ao copiar.");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar todo o conteúdo
              </Button>
            </div>
            <div className="space-y-3">
              {prepared.map((q) => (
                <div key={q.id} className="rounded-md border border-border/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Nº {q.sequence}</Badge>
                    <Badge variant="outline">{QUESTION_ORIGIN_LABEL[q.origin]}</Badge>
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        unmarkReadyForReport(q.id);
                        setNotice("Retirado da preparação.");
                      }}
                    >
                      Retirar
                    </Button>
                  </div>
                  <Textarea readOnly rows={6} value={buildPreparedBlock(q)} className="mt-2" />
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
