/**
 * LV-19.2 — Editor de blocos do workspace.
 *
 * Consome apenas casos de uso (LV-19.1). Cada alteração de título/conteúdo
 * é encaminhada como uma única chamada atômica `updateBlock` (a store
 * garante evento + notificação único).
 *
 * Escopo LV-19.2:
 *  - editar título e conteúdo do bloco (texto/subtítulo/lista via textarea);
 *  - concluir seção (explícito) e reabrir seção;
 *  - exibir origem, estado de revisão e última edição.
 *
 * NÃO faz parte desta fatia: adicionar/remover/mover blocos, vincular fontes,
 * autosave, colaboração, versões, exportação. Reservado para LV-19.3+.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  REPORT_BLOCK_ORIGIN_LABEL,
  type ReportBlock,
  type ReportSection,
} from "../report-types";
import {
  markSectionComplete,
  reopenSection,
  ReportWorkspaceError,
  updateBlock,
  type ReportSectionProgress,
} from "../report-workspace-use-cases";

interface Props {
  readonly reportId: string;
  readonly section: ReportSection;
  readonly progress: ReportSectionProgress;
}

function formatDateTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function ReportWorkspaceBlockEditor({
  reportId,
  section,
  progress,
}: Props) {
  return (
    <section
      className="space-y-4"
      aria-labelledby="lv19-workspace-section-heading"
      data-testid="lv19-workspace-section"
      data-section-status={progress.derivedStatus}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="lv19-workspace-section-heading"
            className="text-xl font-semibold"
          >
            {section.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {progress.filledBlocks} de {progress.totalBlocks} blocos preenchidos
          </p>
        </div>
        <SectionActions
          reportId={reportId}
          sectionId={section.id}
          progress={progress}
        />
      </div>

      {section.blocks.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Esta seção não possui blocos. A criação de blocos será habilitada em
          etapa posterior.
        </p>
      ) : (
        <div className="space-y-4">
          {section.blocks.map((block) => (
            <BlockCard
              key={block.id}
              reportId={reportId}
              sectionId={section.id}
              block={block}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SectionActions({
  reportId,
  sectionId,
  progress,
}: {
  reportId: string;
  sectionId: string;
  progress: ReportSectionProgress;
}) {
  if (progress.isCompleted) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          try {
            reopenSection(reportId, sectionId);
            toast.success("Seção reaberta.");
          } catch (err) {
            const msg =
              err instanceof ReportWorkspaceError
                ? err.message
                : "Não foi possível reabrir a seção.";
            toast.error(msg);
          }
        }}
      >
        <RotateCcw className="mr-1 h-4 w-4" />
        Reabrir seção
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      disabled={!progress.canMarkComplete}
      onClick={() => {
        try {
          const result = markSectionComplete(reportId, sectionId);
          if (result.ok) toast.success("Seção concluída.");
          else toast.error(result.reason);
        } catch (err) {
          const msg =
            err instanceof ReportWorkspaceError
              ? err.message
              : "Não foi possível concluir a seção.";
          toast.error(msg);
        }
      }}
    >
      <CheckCircle2 className="mr-1 h-4 w-4" />
      Concluir seção
    </Button>
  );
}

function BlockCard({
  reportId,
  block,
}: {
  reportId: string;
  block: ReportBlock;
}) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);

  useEffect(() => {
    setTitle(block.title);
  }, [block.id, block.title]);
  useEffect(() => {
    setContent(block.content);
  }, [block.id, block.content]);

  const dirty = title !== block.title || content !== block.content;
  const lastEdited = formatDateTime(block.lastEditedAt);

  const commit = () => {
    if (!dirty) return;
    const patch: { title?: string; content?: string } = {};
    if (title !== block.title) patch.title = title;
    if (content !== block.content) patch.content = content;
    try {
      updateBlock(reportId, /* sectionId is resolved via doc */ findSectionId(block.id, reportId), block.id, patch);
    } catch (err) {
      if (err instanceof ReportWorkspaceError) {
        if (err.code === "report_workspace_no_change") return;
        toast.error(err.message);
      } else {
        toast.error("Não foi possível salvar as alterações.");
      }
      // reverte visual em caso de erro
      setTitle(block.title);
      setContent(block.content);
    }
  };

  return (
    <article
      className="space-y-2 rounded-lg border bg-card p-4"
      data-testid="lv19-workspace-block"
      data-block-id={block.id}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{REPORT_BLOCK_ORIGIN_LABEL[block.origin]}</Badge>
        {block.reviewed ? (
          <Badge
            variant="outline"
            className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
          >
            <ShieldCheck className="mr-1 h-3 w-3" />
            Revisado
          </Badge>
        ) : (
          <Badge variant="outline">
            <ShieldAlert className="mr-1 h-3 w-3" />
            Sem revisão
          </Badge>
        )}
        {lastEdited && <span>Última edição: {lastEdited}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Título do bloco
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
        />
        <label className="block text-xs font-medium text-muted-foreground">
          Conteúdo
        </label>
        <Textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={commit}
          placeholder="Descreva livremente o conteúdo deste bloco."
        />
      </div>
    </article>
  );
}

/**
 * Resolve o `sectionId` do bloco a partir do documento localizado via fachada.
 * Evita passar o id via prop (o snapshot já é fonte única) e mantém o editor
 * independente de props redundantes.
 */
function findSectionId(blockId: string, reportId: string): string {
  // Import tardio para evitar acoplamento em módulo — resolvido a partir da
  // fachada (não da store) pois `tryLocateReport` é reexportada de use-cases.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tryLocateReport } = require("../report-workspace-use-cases") as typeof import("../report-workspace-use-cases");
  const doc = tryLocateReport(reportId);
  if (!doc) throw new ReportWorkspaceError("report_not_found");
  for (const s of doc.sections) {
    if (s.blocks.some((b) => b.id === blockId)) return s.id;
  }
  throw new ReportWorkspaceError("report_block_not_found");
}
