import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Download,
  FileText,
  Send,
  Undo2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  archiveTemplate,
  duplicateTemplate,
  listTemplates,
  publishTemplate,
  reactivateTemplate,
  returnTemplateToDraft,
} from "@/features/report-templates/report-template-store";
import {
  serializeReportTemplate,
  serializeReportTemplates,
} from "@/features/report-templates/report-template-export";
import {
  useReportTemplatesHistorySnapshot,
  useReportTemplatesSnapshot,
  useReportTemplatesVersionsSnapshot,
} from "@/features/report-templates/hooks";
import { validateReportTemplate } from "@/features/report-templates/report-template-validation";
import { friendlyReportTemplateError } from "@/features/report-templates/report-template-error-labels";
import type {
  ReportTemplate,
  ReportTemplateId,
} from "@/features/report-templates/report-template-types";
import { REPORT_TEMPLATE_SPECIALTY_LABEL } from "@/features/report-templates/report-template-types";
import { ReportTemplateList } from "@/features/report-templates/components/ReportTemplateList";
import { ReportTemplateEditor } from "@/features/report-templates/components/ReportTemplateEditor";
import { ReportTemplateVariablesPanel } from "@/features/report-templates/components/ReportTemplateVariablesPanel";
import { ReportTemplateValidationPanel } from "@/features/report-templates/components/ReportTemplateValidationPanel";
import { ReportTemplateHistoryPanel } from "@/features/report-templates/components/ReportTemplateHistoryPanel";
import { ReportTemplateVersionsPanel } from "@/features/report-templates/components/ReportTemplateVersionsPanel";
import { ReportTemplateStatusBadge } from "@/features/report-templates/components/ReportTemplateStatusBadge";
import { ReportTemplateCreateDialog } from "@/features/report-templates/components/ReportTemplateCreateDialog";
import { ReportTemplateImportDialog } from "@/features/report-templates/components/ReportTemplateImportDialog";
import {
  downloadJsonBlob,
  sanitizeFileName,
} from "@/features/report-templates/download";

type ConfirmKind =
  | "publish"
  | "return_to_draft"
  | "archive"
  | "reactivate"
  | null;

export function ReportTemplatesPage() {
  const snapshot = useReportTemplatesSnapshot();
  const historySnap = useReportTemplatesHistorySnapshot();
  const versionsSnap = useReportTemplatesVersionsSnapshot();

  const summaries = useMemo(() => listTemplates(), [snapshot.version]);
  const [selectedId, setSelectedId] = useState<ReportTemplateId | null>(
    () => summaries[0]?.id ?? null,
  );
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [tab, setTab] = useState("conteudo");

  // Correção de seleção pós-reset/exclusão.
  useEffect(() => {
    if (selectedId && !snapshot.templates.some((t) => t.id === selectedId)) {
      setSelectedId(snapshot.templates[0]?.id ?? null);
    }
    if (!selectedId && snapshot.templates.length > 0) {
      setSelectedId(snapshot.templates[0]!.id);
    }
    // limpa export selecionado com IDs inexistentes
    setSelectedForExport((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (snapshot.templates.some((t) => t.id === id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [snapshot, selectedId]);

  const selected: ReportTemplate | null = useMemo(
    () => (selectedId ? snapshot.templates.find((t) => t.id === selectedId) ?? null : null),
    [snapshot.templates, selectedId],
  );

  const readOnly = selected ? selected.status !== "rascunho" : true;

  const templateHistory = useMemo(
    () =>
      selectedId
        ? historySnap.events.filter((e) => e.templateId === selectedId)
        : [],
    [historySnap, selectedId],
  );
  const templateVersions = useMemo(
    () =>
      selectedId
        ? versionsSnap.versions.filter((v) => v.templateId === selectedId)
        : [],
    [versionsSnap, selectedId],
  );

  function toggleExport(id: ReportTemplateId) {
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run<T>(fn: () => T, successMsg?: string): T | undefined {
    try {
      const v = fn();
      if (successMsg) toast.success(successMsg);
      return v;
    } catch (e) {
      toast.error(friendlyReportTemplateError(e));
      return undefined;
    }
  }

  function handlePublish() {
    if (!selected) return;
    const result = validateReportTemplate(selected);
    if (!result.valid) {
      toast.error("Modelo com erros — verifique a validação antes de publicar.");
      setTab("validacao");
      setConfirmKind(null);
      return;
    }
    run(() => publishTemplate(selected.id, "Publicação via UI"), "Modelo publicado.");
    setConfirmKind(null);
  }

  function handleReturnDraft() {
    if (!selected) return;
    run(() => returnTemplateToDraft(selected.id), "Modelo retornou para rascunho.");
    setConfirmKind(null);
  }

  function handleArchive() {
    if (!selected) return;
    run(() => archiveTemplate(selected.id), "Modelo arquivado.");
    setConfirmKind(null);
  }

  function handleReactivate() {
    if (!selected) return;
    run(() => reactivateTemplate(selected.id), "Modelo reativado.");
    setConfirmKind(null);
  }

  function handleDuplicate() {
    if (!selected) return;
    const copy = run(() => duplicateTemplate(selected.id), "Modelo duplicado.");
    if (copy) setSelectedId(copy.id);
  }

  function handleExportSingle() {
    if (!selected) return;
    try {
      const json = serializeReportTemplate(selected.id, { recordHistory: false });
      downloadJsonBlob(`modelo-${sanitizeFileName(selected.name)}.json`, json);
      toast.success("Arquivo gerado.");
    } catch (e) {
      toast.error(friendlyReportTemplateError(e));
    }
  }

  function handleExportSelected() {
    const ids = Array.from(selectedForExport) as ReportTemplateId[];
    if (ids.length === 0) return;
    try {
      const json = serializeReportTemplates(ids, { recordHistory: false });
      downloadJsonBlob(`modelos-de-laudo.json`, json);
      toast.success(`${ids.length} modelo(s) exportado(s).`);
    } catch (e) {
      toast.error(friendlyReportTemplateError(e));
    }
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Modelos de laudo</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie modelos, versões e importação/exportação em memória (demonstrativo).
          </p>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-lg border bg-background lg:flex-row">
        <ReportTemplateList
          templates={summaries}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          selectedForExport={selectedForExport}
          onToggleExport={toggleExport}
          onNew={() => setShowCreate(true)}
          onImport={() => setShowImport(true)}
          onExportSelected={handleExportSelected}
        />

        <div className="flex-1 p-4">
          {!selected && <EmptySelection />}

          {selected && (
            <div className="space-y-4">
              <TemplateHeader
                template={selected}
                onPublish={() => setConfirmKind("publish")}
                onReturnDraft={() => setConfirmKind("return_to_draft")}
                onArchive={() => setConfirmKind("archive")}
                onReactivate={() => setConfirmKind("reactivate")}
                onDuplicate={handleDuplicate}
                onExport={handleExportSingle}
              />

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                  <TabsTrigger value="variaveis">Variáveis</TabsTrigger>
                  <TabsTrigger value="validacao">Validação</TabsTrigger>
                  <TabsTrigger value="versoes">Versões</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="conteudo" className="mt-4">
                  <ReportTemplateEditor template={selected} readOnly={readOnly} />
                </TabsContent>
                <TabsContent value="variaveis" className="mt-4">
                  <ReportTemplateVariablesPanel template={selected} readOnly={readOnly} />
                </TabsContent>
                <TabsContent value="validacao" className="mt-4">
                  <ReportTemplateValidationPanel template={selected} autoRun />
                </TabsContent>
                <TabsContent value="versoes" className="mt-4">
                  <ReportTemplateVersionsPanel
                    template={selected}
                    versions={templateVersions}
                  />
                </TabsContent>
                <TabsContent value="historico" className="mt-4">
                  <ReportTemplateHistoryPanel events={templateHistory} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      <ReportTemplateCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(t) => setSelectedId(t.id)}
      />

      <ReportTemplateImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImported={(_r, firstId) => {
          if (firstId) setSelectedId(firstId);
        }}
      />

      <AlertDialog
        open={confirmKind !== null}
        onOpenChange={(v) => !v && setConfirmKind(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "publish" && "Publicar modelo?"}
              {confirmKind === "return_to_draft" && "Retornar para rascunho?"}
              {confirmKind === "archive" && "Arquivar modelo?"}
              {confirmKind === "reactivate" && "Reativar modelo?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind === "publish" &&
                "A validação será executada. Se válido, o modelo passa a somente leitura e uma versão é criada."}
              {confirmKind === "return_to_draft" &&
                "O modelo voltará a ser editável. Versões já registradas permanecem no histórico e não serão alteradas."}
              {confirmKind === "archive" &&
                "O modelo ficará somente leitura. Ele poderá ser reativado depois."}
              {confirmKind === "reactivate" &&
                "O modelo retornará ao status de rascunho e voltará a ser editável."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmKind === "publish") handlePublish();
                else if (confirmKind === "return_to_draft") handleReturnDraft();
                else if (confirmKind === "archive") handleArchive();
                else if (confirmKind === "reactivate") handleReactivate();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptySelection() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Selecione um modelo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Escolha um modelo na lista ao lado ou crie um novo. Você também pode importar
          modelos a partir de um arquivo <code>.json</code>.
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateHeader({
  template,
  onPublish,
  onReturnDraft,
  onArchive,
  onReactivate,
  onDuplicate,
  onExport,
}: {
  template: ReportTemplate;
  onPublish: () => void;
  onReturnDraft: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) {
  const isDraft = template.status === "rascunho";
  const isPublished = template.status === "publicado";
  const isArchived = template.status === "arquivado";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-muted/20 p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="truncate text-lg font-semibold">{template.name}</h2>
          <ReportTemplateStatusBadge status={template.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {REPORT_TEMPLATE_SPECIALTY_LABEL[template.specialty]} · {template.sections.length}{" "}
          seções · {template.variables.length} variáveis · atualizado{" "}
          {new Date(template.updatedAt).toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
          <Download className="h-4 w-4" aria-hidden /> Exportar
        </Button>
        <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-1">
          <Copy className="h-4 w-4" aria-hidden /> Duplicar
        </Button>
        {isDraft && (
          <>
            <Button size="sm" onClick={onPublish} className="gap-1">
              <Send className="h-4 w-4" aria-hidden /> Publicar
            </Button>
            <Button variant="outline" size="sm" onClick={onArchive} className="gap-1">
              <Archive className="h-4 w-4" aria-hidden /> Arquivar
            </Button>
          </>
        )}
        {isPublished && (
          <>
            <Button variant="outline" size="sm" onClick={onReturnDraft} className="gap-1">
              <Undo2 className="h-4 w-4" aria-hidden /> Retornar para rascunho
            </Button>
            <Button variant="outline" size="sm" onClick={onArchive} className="gap-1">
              <Archive className="h-4 w-4" aria-hidden /> Arquivar
            </Button>
          </>
        )}
        {isArchived && (
          <Button size="sm" onClick={onReactivate} className="gap-1">
            <Play className="h-4 w-4" aria-hidden /> Reativar
          </Button>
        )}
      </div>
    </div>
  );
}
