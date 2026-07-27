/**
 * LV-19.2 — Cabeçalho do workspace do laudo.
 * Exibe título, caso, origem (imutável) e o progresso geral derivado.
 * Apenas apresentação — não realiza mutações.
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { REPORT_TEMPLATE_LABEL } from "../report-types";
import { ReportTemplateOriginBadge } from "../ReportTemplateOriginBadge";
import type { ReportWorkspaceSnapshot } from "../report-workspace-use-cases";

interface Props {
  readonly snapshot: ReportWorkspaceSnapshot;
}

export function ReportWorkspaceHeader({ snapshot }: Props) {
  const { report, progress, origin } = snapshot;
  const pct = Math.round(progress.percentage * 100);
  return (
    <header
      className="space-y-3 border-b pb-4"
      data-testid="lv19-workspace-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 text-muted-foreground"
          >
            <Link to="/app/laudos">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar para laudos
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-semibold" title={report.title}>
            {report.title}
          </h1>
          <p className="text-sm text-muted-foreground">{report.caseLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline">
            {REPORT_TEMPLATE_LABEL[report.templateId]}
          </Badge>
          {origin && <ReportTemplateOriginBadge origin={origin} compact />}
        </div>
      </div>

      <div
        className="space-y-1"
        aria-label="Progresso geral do laudo"
        data-testid="lv19-workspace-progress"
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.completedSections} de {progress.totalSections} seções
            concluídas
          </span>
          <span>
            {progress.filledBlocks}/{progress.totalBlocks} blocos preenchidos ·{" "}
            {pct}%
          </span>
        </div>
        <Progress value={pct} />
      </div>
    </header>
  );
}
