/**
 * LV-19.3 — Painel de auditoria estática do workspace.
 *
 * Apresenta APENAS informações DERIVADAS do snapshot da LV-19.1 e do
 * histórico já emitido. Nenhuma regra de status ou progresso é recalculada
 * aqui — todos os valores exibidos vêm do `ReportWorkspaceSnapshot` e de
 * `listWorkspaceHistory`. Leituras são livres de efeitos colaterais.
 *
 * Regras (LV-19.1) refletidas sem duplicação:
 *  - "concluida" ⇔ `section.status === "aprovada"`;
 *  - progresso e contagens vêm de `snapshot.progress` e `snapshot.sections`.
 */
import { useMemo, useSyncExternalStore } from "react";
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  listWorkspaceHistory,
  subscribeWorkspaceHistory,
  type ReportWorkspaceSnapshot,
  type SectionDerivedStatus,
} from "../report-workspace-use-cases";

interface Props {
  readonly reportId: string;
  readonly snapshot: ReportWorkspaceSnapshot;
}

const STATUS_LABEL: Readonly<Record<SectionDerivedStatus, string>> = {
  vazia: "Vazia",
  em_andamento: "Em elaboração",
  concluida: "Concluída",
};

const STATUS_ICON: Readonly<
  Record<SectionDerivedStatus, typeof CheckCircle2>
> = {
  vazia: CircleDashed,
  em_andamento: Circle,
  concluida: CheckCircle2,
};

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function ReportWorkspaceAuditPanel({ reportId, snapshot }: Props) {
  const events = useSyncExternalStore(
    subscribeWorkspaceHistory,
    () => listWorkspaceHistory(reportId),
    () => listWorkspaceHistory(reportId),
  );

  const { report, sections, progress, origin } = snapshot;

  // Contagem de blocos revisados é uma leitura direta do documento
  // (não é regra derivada — não redefine status nem progresso).
  const reviewedBlocks = useMemo(() => {
    let count = 0;
    for (const s of report.sections) {
      for (const b of s.blocks) if (b.reviewed) count += 1;
    }
    return count;
  }, [report]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const pct = Math.round(progress.percentage * 100);

  return (
    <section
      className="space-y-4 rounded-md border p-4 text-sm"
      aria-label="Auditoria do laudo"
      data-testid="lv19-audit-panel"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Origem do modelo
        </p>
        {origin ? (
          <div className="mt-1 space-y-0.5" data-testid="lv19-audit-origin">
            <p className="font-medium">{origin.templateName}</p>
            <p className="text-xs text-muted-foreground">
              Versão {origin.templateVersionNumber} · {origin.templateSpecialty}
            </p>
            <p className="text-xs text-muted-foreground">
              Aplicado em {formatDateTime(origin.appliedAt)} por{" "}
              {origin.appliedBy}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Laudo sem modelo de origem.
          </p>
        )}
      </div>

      <Separator />

      <div
        className="grid grid-cols-2 gap-3 text-xs"
        data-testid="lv19-audit-metrics"
      >
        <Metric label="Seções concluídas">
          {progress.completedSections}/{progress.totalSections}
        </Metric>
        <Metric label="Progresso geral">{pct}%</Metric>
        <Metric label="Blocos preenchidos">
          {progress.filledBlocks}/{progress.totalBlocks}
        </Metric>
        <Metric label="Blocos revisados">
          {reviewedBlocks}/{progress.totalBlocks}
        </Metric>
      </div>

      <Separator />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status das seções
        </p>
        <ul
          className="mt-2 space-y-1"
          data-testid="lv19-audit-sections"
          aria-label="Estado derivado por seção"
        >
          {report.sections.map((section) => {
            const derived = sections.find((s) => s.sectionId === section.id);
            const status: SectionDerivedStatus =
              derived?.derivedStatus ?? "vazia";
            const Icon = STATUS_ICON[status];
            return (
              <li
                key={section.id}
                className="flex items-center justify-between gap-2"
                data-status={status}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                  <span className="truncate">{section.title}</span>
                </span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {STATUS_LABEL[status]}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <Metric label="Última alteração">
          {formatDateTime(report.updatedAt)}
        </Metric>
        <Metric label="Último evento">
          {lastEvent ? formatDateTime(lastEvent.at) : "—"}
        </Metric>
      </div>
    </section>
  );
}

function Metric({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium tabular-nums">{children}</p>
    </div>
  );
}
