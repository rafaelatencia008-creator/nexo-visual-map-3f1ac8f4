/**
 * LV-19.3 — Painel de histórico do workspace do laudo.
 *
 * Somente leitura. Consome exclusivamente a fachada de casos de uso da
 * LV-19.1 (`listWorkspaceHistory` + `subscribeWorkspaceHistory`). Não
 * importa `report-mock-store`, não deriva progresso e não emite eventos
 * durante renderização.
 *
 * Regras:
 *  - Ordem cronológica INVERSA (mais recente primeiro).
 *  - Exibe tipo, data/hora, seção/bloco (quando existem) e resumo legível.
 *  - Estado vazio explícito quando não houver eventos.
 */
import { useMemo, useSyncExternalStore } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/app/states";
import {
  listWorkspaceHistory,
  subscribeWorkspaceHistory,
  type ReportWorkspaceSnapshot,
} from "../report-workspace-use-cases";
import type {
  ReportHistoryEvent,
  ReportHistoryEventKind,
} from "../report-types";

interface Props {
  readonly reportId: string;
  readonly snapshot: ReportWorkspaceSnapshot;
}

// Rótulos locais de apresentação. NÃO redefinem regra de status/progresso.
const KIND_LABEL: Readonly<Partial<Record<ReportHistoryEventKind, string>>> = {
  documento_criado: "Documento criado",
  titulo_alterado: "Título alterado",
  modelo_alterado: "Modelo alterado",
  bloco_criado: "Bloco criado",
  bloco_duplicado: "Bloco duplicado",
  bloco_removido: "Bloco removido",
  bloco_movido: "Bloco movido",
  conteudo_alterado: "Conteúdo alterado",
  titulo_bloco_alterado: "Título do bloco alterado",
  fonte_vinculada: "Fonte vinculada",
  fonte_removida: "Fonte removida",
  bloco_revisado: "Bloco revisado",
  revisao_retirada: "Revisão retirada",
  status_secao_alterado: "Status da seção alterado",
  previa_aberta: "Prévia aberta",
  exportacao_realizada: "Exportação realizada",
  exportacao_bloqueada: "Exportação bloqueada",
  checklist_marcado: "Checklist marcado",
  checklist_desmarcado: "Checklist desmarcado",
  versao_trabalho_criada: "Versão de trabalho criada",
  versao_revisada_criada: "Versão revisada criada",
  versao_revisada_bloqueada: "Versão revisada bloqueada",
  fechamento_iniciado: "Fechamento iniciado",
  fechamento_cancelado: "Fechamento cancelado",
  fechamento_bloqueado: "Fechamento bloqueado",
  versao_fechada_criada: "Versão fechada criada",
  documento_congelado: "Documento congelado",
  reabertura_solicitada: "Reabertura solicitada",
  reabertura_bloqueada: "Reabertura bloqueada",
  documento_reaberto: "Documento reaberto",
  comparacao_aberta: "Comparação aberta",
  versao_visualizada: "Versão visualizada",
  versao_exportada: "Versão exportada",
  versao_impressa: "Versão impressa",
  versao_anterior_substituida: "Versão anterior substituída",
  report_created_from_template: "Laudo criado a partir de modelo",
  workspace_aberto: "Workspace aberto",
  bloco_atualizado: "Bloco atualizado",
};

function labelForKind(kind: ReportHistoryEventKind): string {
  return KIND_LABEL[kind] ?? kind;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function ReportWorkspaceHistoryPanel({ reportId, snapshot }: Props) {
  // Assinatura reativa do domínio de histórico. Leitura pura, sem efeitos.
  const events = useSyncExternalStore(
    subscribeWorkspaceHistory,
    () => listWorkspaceHistory(reportId),
    () => listWorkspaceHistory(reportId),
  );

  const sectionTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of snapshot.report.sections) map.set(s.id, s.title);
    return map;
  }, [snapshot]);

  const blockTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of snapshot.report.sections) {
      for (const b of s.blocks) map.set(b.id, b.title || "Bloco sem título");
    }
    return map;
  }, [snapshot]);

  // Ordem cronológica inversa (mais recente primeiro). Não mutamos a fonte.
  const ordered = useMemo<readonly ReportHistoryEvent[]>(() => {
    return events.slice().reverse();
  }, [events]);

  if (ordered.length === 0) {
    return (
      <div data-testid="lv19-history-panel">
        <EmptyState
          icon={<History className="h-6 w-6" aria-hidden />}
          title="Nenhum evento registrado"
          description="As alterações realizadas no workspace aparecerão aqui em ordem cronológica."
        />
      </div>
    );
  }

  return (
    <ScrollArea
      className="max-h-[420px] pr-2"
      data-testid="lv19-history-panel"
    >
      <ol className="space-y-2" aria-label="Histórico do laudo">
        {ordered.map((ev) => {
          const sectionTitle = ev.sectionId
            ? sectionTitleById.get(ev.sectionId)
            : undefined;
          const blockTitle = ev.blockId
            ? blockTitleById.get(ev.blockId)
            : undefined;
          return (
            <li
              key={ev.id}
              className="rounded-md border p-3 text-xs"
              data-event-kind={ev.kind}
              data-testid="lv19-history-event"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {labelForKind(ev.kind)}
                </Badge>
                <time className="text-muted-foreground" dateTime={ev.at}>
                  {formatDateTime(ev.at)}
                </time>
              </div>
              <p className="mt-1 text-sm">{ev.description}</p>
              {(sectionTitle || blockTitle) && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {sectionTitle && (
                    <span>
                      Seção: <span className="font-medium">{sectionTitle}</span>
                    </span>
                  )}
                  {sectionTitle && blockTitle && <span> · </span>}
                  {blockTitle && (
                    <span>
                      Bloco: <span className="font-medium">{blockTitle}</span>
                    </span>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </ScrollArea>
  );
}
