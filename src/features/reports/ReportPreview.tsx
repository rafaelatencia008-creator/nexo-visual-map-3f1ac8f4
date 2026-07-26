/**
 * LV-15 — Prévia somente leitura do documento pericial.
 * Sem edição. Marca obrigatória "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE".
 */
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  REPORT_GENERAL_STATUS_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  REPORT_SOURCE_KIND_LABEL,
  REPORT_TEMPLATE_LABEL,
  REPORT_WATERMARK,
  type ReportDocument,
} from "./report-types";
import { computeReviewSummary } from "./report-review";
import { logPreviewOpened } from "./report-mock-store";

export type ReportPreviewProps = {
  readonly document: ReportDocument;
  /** Fontes indisponíveis conhecidas (opcional). */
  readonly unavailableSourceIds?: readonly string[];
};

export function ReportPreview({
  document,
  unavailableSourceIds = [],
}: ReportPreviewProps) {
  const summary = computeReviewSummary(document);
  const unavailable = new Set(unavailableSourceIds);

  useEffect(() => {
    logPreviewOpened(document.id);
  }, [document.id]);

  return (
    <div
      className="space-y-4 print:bg-white print:text-black"
      data-testid="report-preview-root"
    >
      <div
        className="rounded-md border border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-destructive print:border-black"
        role="note"
      >
        {REPORT_WATERMARK}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{document.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <strong>Modelo:</strong> {REPORT_TEMPLATE_LABEL[document.templateId]}
          </p>
          <p>
            <strong>Perícia:</strong> {document.caseLabel}
          </p>
          <p>
            <strong>Criado em:</strong> {document.createdAt}
          </p>
          <p>
            <strong>Atualizado em:</strong> {document.updatedAt}
          </p>
          <p>
            <strong>Status geral:</strong>{" "}
            <Badge variant="secondary">
              {REPORT_GENERAL_STATUS_LABEL[summary.generalStatus]}
            </Badge>
          </p>
        </CardContent>
      </Card>

      {document.sections.map((s) => (
        <section key={s.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1">
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <Badge variant="outline">
              {REPORT_SECTION_STATUS_LABEL[s.status]}
            </Badge>
          </div>
          {s.blocks.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              (seção sem blocos)
            </p>
          )}
          {s.blocks.map((b) => (
            <article key={b.id} className="space-y-1">
              <h4 className="font-medium">{b.title}</h4>
              <p className="whitespace-pre-wrap text-sm">
                {b.content.trim() || (
                  <span className="italic text-muted-foreground">
                    (sem conteúdo)
                  </span>
                )}
              </p>
              {b.sources.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {b.sources.map((src) => (
                    <li key={src.id}>
                      {REPORT_SOURCE_KIND_LABEL[src.kind]}: {src.label}
                      {unavailable.has(src.refId) && (
                        <span className="ml-1 italic text-destructive">
                          — Fonte indisponível no estado atual da demonstração
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      ))}

      <div
        className="rounded-md border border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-destructive print:border-black"
        role="note"
      >
        {REPORT_WATERMARK}
      </div>
    </div>
  );
}
