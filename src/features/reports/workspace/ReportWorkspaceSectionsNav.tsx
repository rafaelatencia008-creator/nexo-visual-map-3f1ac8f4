/**
 * LV-19.2 — Navegação lateral por seções do laudo.
 *
 * Consome APENAS as projeções derivadas do snapshot (LV-19.1). Não recalcula
 * status, progresso, nem toca a store.
 */
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ReportSectionProgress,
  ReportWorkspaceSnapshot,
  SectionDerivedStatus,
} from "../report-workspace-use-cases";

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

const STATUS_TONE: Readonly<Record<SectionDerivedStatus, string>> = {
  vazia: "text-muted-foreground",
  em_andamento: "text-primary",
  concluida: "text-emerald-600 dark:text-emerald-400",
};

interface Props {
  readonly snapshot: ReportWorkspaceSnapshot;
  readonly activeSectionId: string;
  readonly onSelect: (sectionId: string) => void;
}

export function ReportWorkspaceSectionsNav({
  snapshot,
  activeSectionId,
  onSelect,
}: Props) {
  const { report, sections } = snapshot;
  const byId = new Map<string, ReportSectionProgress>(
    sections.map((s) => [s.sectionId, s]),
  );

  return (
    <nav
      aria-label="Seções do laudo"
      className="space-y-1"
      data-testid="lv19-workspace-sections-nav"
    >
      {report.sections.map((section) => {
        const progress = byId.get(section.id);
        const status: SectionDerivedStatus =
          progress?.derivedStatus ?? "vazia";
        const Icon = STATUS_ICON[status];
        const isActive = section.id === activeSectionId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "true" : undefined}
            data-status={status}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "hover:bg-muted",
            )}
          >
            <Icon
              className={cn("h-4 w-4 flex-shrink-0", STATUS_TONE[status])}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {STATUS_LABEL[status]}
            </Badge>
            {progress && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {progress.filledBlocks}/{progress.totalBlocks}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
