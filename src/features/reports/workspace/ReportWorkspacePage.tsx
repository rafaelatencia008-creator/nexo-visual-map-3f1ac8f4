/**
 * LV-19.2 — Página do workspace de elaboração do laudo.
 *
 * Shell responsivo (mobile: nav rolável no topo; desktop: nav lateral).
 * Consome unicamente o hook `useReportWorkspace` e casos de uso da LV-19.1.
 * Estritamente não acessa `report-mock-store` — validado por teste estático.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logWorkspaceOpened } from "../report-workspace-use-cases";
import { useReportWorkspace } from "./useReportWorkspace";
import { ReportWorkspaceHeader } from "./ReportWorkspaceHeader";
import { ReportWorkspaceSectionsNav } from "./ReportWorkspaceSectionsNav";
import { ReportWorkspaceBlockEditor } from "./ReportWorkspaceBlockEditor";
import { ReportWorkspaceHistoryPanel } from "./ReportWorkspaceHistoryPanel";
import { ReportWorkspaceAuditPanel } from "./ReportWorkspaceAuditPanel";

interface Props {
  readonly reportId: string;
}

export function ReportWorkspacePage({ reportId }: Props) {
  const navigate = useNavigate();
  const snapshot = useReportWorkspace(reportId);
  const firstSectionId = snapshot?.report.sections[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(firstSectionId);

  // Sincroniza a seção ativa caso o documento não a tenha (ou mude de laudo).
  useEffect(() => {
    if (!snapshot) return;
    const stillExists = snapshot.report.sections.some(
      (s) => s.id === activeId,
    );
    if (!stillExists) setActiveId(snapshot.report.sections[0]?.id);
  }, [snapshot, activeId]);

  // Registra abertura do workspace (evento único no histórico).
  useEffect(() => {
    if (!snapshot) return;
    try {
      logWorkspaceOpened(reportId);
    } catch {
      // fachada valida existência — silencioso em corridas.
    }
  }, [reportId, snapshot?.report.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSection = useMemo(() => {
    if (!snapshot || !activeId) return undefined;
    return snapshot.report.sections.find((s) => s.id === activeId);
  }, [snapshot, activeId]);

  const activeProgress = useMemo(() => {
    if (!snapshot || !activeId) return undefined;
    return snapshot.sections.find((s) => s.sectionId === activeId);
  }, [snapshot, activeId]);

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Laudo não encontrado"
          description="Este laudo pode ter sido removido ou o link está incorreto."
          action={{
            label: "Voltar para laudos",
            onClick: () => navigate({ to: "/app/laudos" }),
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl space-y-5"
      data-testid="lv19-workspace-page"
    >
      <ReportWorkspaceHeader snapshot={snapshot} />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <ReportWorkspaceSectionsNav
            snapshot={snapshot}
            activeSectionId={activeId ?? ""}
            onSelect={setActiveId}
          />
        </aside>

        <div className="min-w-0">
          {activeSection && activeProgress ? (
            <ReportWorkspaceBlockEditor
              reportId={reportId}
              section={activeSection}
              progress={activeProgress}
            />
          ) : (
            <EmptyState
              title="Selecione uma seção"
              description="Escolha uma seção ao lado para começar a elaboração."
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="historico" data-testid="lv19-workspace-tabs">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="historico" className="mt-3">
          <ReportWorkspaceHistoryPanel
            reportId={reportId}
            snapshot={snapshot}
          />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-3">
          <ReportWorkspaceAuditPanel
            reportId={reportId}
            snapshot={snapshot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
