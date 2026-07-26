/**
 * LV-15 — Painel de revisão geral do documento.
 * Somente leitura, alimentado por `computeReviewSummary`.
 */
import { AlertTriangle, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  REPORT_GENERAL_STATUS_LABEL,
  type ReportDocument,
} from "./report-types";
import { computeReviewSummary } from "./report-review";

export type ReportReviewPanelProps = {
  readonly document: ReportDocument;
};

export function ReportReviewPanel({ document }: ReportReviewPanelProps) {
  const s = computeReviewSummary(document);
  const blocking = s.pendings.filter((p) => p.severity === "impeditivo");
  const warnings = s.pendings.filter((p) => p.severity === "aviso");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Situação geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {REPORT_GENERAL_STATUS_LABEL[s.generalStatus]}
            </Badge>
            <Badge variant={blocking.length ? "destructive" : "outline"}>
              {blocking.length} impeditivo(s)
            </Badge>
            <Badge variant="outline">{warnings.length} aviso(s)</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Status derivado automaticamente do estado das seções e blocos. Não
            representa assinatura, protocolo ou validade oficial.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Seções</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Total" value={s.totalSections} />
            <Stat label="Não iniciadas" value={s.sectionsNotStarted} />
            <Stat label="Em elaboração" value={s.sectionsInProgress} />
            <Stat label="Revisadas" value={s.sectionsReviewed} />
            <Stat label="Aprovadas" value={s.sectionsApproved} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Blocos e fontes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Blocos totais" value={s.totalBlocks} />
            <Stat label="Não revisados" value={s.blocksUnreviewed} />
            <Stat label="Sem conteúdo" value={s.blocksEmpty} />
            <Stat label="Sem fontes" value={s.blocksWithoutSources} />
            <Stat label="Fontes vinculadas" value={s.totalSources} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm">Pendências impeditivas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {blocking.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Nenhuma pendência impeditiva.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {blocking.map((p, i) => (
                <li key={`${p.kind}-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <span>{p.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <Info className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm">Avisos</CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem avisos.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {warnings.map((p, i) => (
                <li key={`${p.kind}-${i}`}>{p.message}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Regras de revisão são determinísticas e locais. Todo o processamento
        ocorre em memória do navegador.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
