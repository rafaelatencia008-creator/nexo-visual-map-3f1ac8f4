/**
 * LV-14 / LV-15 — Editor por blocos de um documento pericial (mock).
 *
 * LV-15:
 *  - Abas: Editor / Revisão / Prévia.
 *  - Botão "Exportar" (local).
 *  - Ações de bloco: mover cima/baixo, duplicar.
 *  - Botão "Aprovar seção" com validação (canApproveSection).
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookMarked,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  FilePlus2,
  Link2,
  PencilLine,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  REPORT_BLOCK_ORIGIN_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  REPORT_SECTION_STATUSES,
  REPORT_SOURCE_KIND_LABEL,
  REPORT_TEMPLATE_LABEL,
  type ReportSection,
  type ReportSectionStatus,
  type ReportTemplateId,
} from "./report-types";
import { REPORT_TEMPLATES } from "./report-templates";
import {
  addBlock,
  approveSection,
  changeTemplate,
  duplicateBlock,
  getReport,
  isReportFrozen,
  markBlockReviewed,
  moveBlock,
  removeBlock,
  setSectionStatus,
  subscribeReports,
  unlinkSourceFromBlock,
  updateBlockContent,
  updateBlockTitle,
} from "./report-mock-store";
import { ReportSourceLinkDialog } from "./ReportSourceLinkDialog";
import { ReportReviewPanel } from "./ReportReviewPanel";
import { ReportPreview } from "./ReportPreview";
import { ReportExportDialog } from "./ReportExportDialog";
import { ReportClosurePanel } from "./ReportClosurePanel";
import { ReportVersionsPanel } from "./ReportVersionsPanel";
import { ReportHistoryPanel } from "./ReportHistoryPanel";


export type ReportEditorProps = {
  reportId: string;
  onBack: () => void;
};

function useReport(id: string) {
  return useSyncExternalStore(
    subscribeReports,
    () => getReport(id),
    () => getReport(id),
  );
}

export function ReportEditor({ reportId, onBack }: ReportEditorProps) {
  const doc = useReport(reportId);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sourceDialog, setSourceDialog] = useState<{
    sectionId: string;
    blockId: string;
  } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [tab, setTab] = useState<
    "editor" | "revisao" | "previa" | "fechamento" | "versoes" | "historico"
  >("editor");
  const frozen = useSyncExternalStore(
    subscribeReports,
    () => isReportFrozen(reportId),
    () => isReportFrozen(reportId),
  );



  const activeSection: ReportSection | undefined = useMemo(() => {
    if (!doc) return undefined;
    if (activeSectionId) {
      return doc.sections.find((s) => s.id === activeSectionId) ?? doc.sections[0];
    }
    return doc.sections[0];
  }, [doc, activeSectionId]);

  if (!doc) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Documento não encontrado.
        </p>
        <Button variant="ghost" onClick={onBack} className="mt-2">
          Voltar
        </Button>
      </div>
    );
  }

  function handleTemplateChange(next: ReportTemplateId): void {
    if (!doc) return;
    if (next === doc.templateId) return;
    const ok = window.confirm(
      "Trocar o modelo recria a estrutura inicial das seções. Continuar?",
    );
    if (!ok) return;
    changeTemplate(doc.id, next);
    setActiveSectionId(null);
  }

  function handleApproveSection(sectionId: string): void {
    if (!doc) return;
    const result = approveSection(doc.id, sectionId);
    if (!result.ok) {
      toast.error(result.reason);
    } else {
      toast.success("Seção aprovada.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-semibold leading-tight">{doc.title}</h2>
            <p className="text-xs text-muted-foreground">
              {doc.caseLabel} · {REPORT_TEMPLATE_LABEL[doc.templateId]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={doc.templateId}
            onValueChange={(v) => handleTemplateChange(v as ReportTemplateId)}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {REPORT_TEMPLATE_LABEL[t.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="mr-1 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {frozen && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800">
          <strong>Documento congelado.</strong> A edição está bloqueada porque existe
          uma versão fechada demonstrativa. Prévia, exportação e comparação continuam
          disponíveis. Para editar novamente, reabra o documento na aba Versões.
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="revisao">Revisão</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento</TabsTrigger>
          <TabsTrigger value="versoes">Versões</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>

        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Seções</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ul className="space-y-1">
                  {doc.sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSectionId(s.id)}
                        aria-current={activeSection?.id === s.id ? "page" : undefined}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          activeSection?.id === s.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{s.title}</span>
                        <SectionStatusDot status={s.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {activeSection && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{activeSection.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeSection.blocks.length} bloco(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={activeSection.status}
                      onValueChange={(v) =>
                        setSectionStatus(
                          doc.id,
                          activeSection.id,
                          v as ReportSectionStatus,
                        )
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_SECTION_STATUSES.filter(
                          (s) => s !== "aprovada",
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            {REPORT_SECTION_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApproveSection(activeSection.id)}
                      title="Valida e aprova a seção se todos os blocos estiverem preenchidos e revisados."
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      Aprovar seção
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        addBlock(doc.id, activeSection.id, {
                          title: "Novo bloco",
                          content: "",
                          origin: "manual",
                        })
                      }
                    >
                      <FilePlus2 className="mr-1 h-4 w-4" />
                      Adicionar bloco
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {activeSection.blocks.map((b, idx) => (
                    <Card key={b.id}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Input
                            value={b.title}
                            onChange={(e) =>
                              updateBlockTitle(
                                doc.id,
                                activeSection.id,
                                b.id,
                                e.target.value,
                              )
                            }
                            aria-label="Título do bloco"
                            className="max-w-md font-medium"
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="secondary">
                              {REPORT_BLOCK_ORIGIN_LABEL[b.origin]}
                            </Badge>
                            {b.manuallyEdited && (
                              <Badge variant="outline">
                                <PencilLine className="mr-1 h-3 w-3" />
                                Edição manual
                              </Badge>
                            )}
                            <Badge
                              variant={b.reviewed ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() =>
                                markBlockReviewed(
                                  doc.id,
                                  activeSection.id,
                                  b.id,
                                  !b.reviewed,
                                )
                              }
                            >
                              {b.reviewed ? (
                                <>
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Revisado
                                </>
                              ) : (
                                <>
                                  <Circle className="mr-1 h-3 w-3" /> Sem revisão
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={b.content}
                          onChange={(e) =>
                            updateBlockContent(
                              doc.id,
                              activeSection.id,
                              b.id,
                              e.target.value,
                            )
                          }
                          aria-label="Conteúdo do bloco"
                          className="min-h-[120px]"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={idx === 0}
                              onClick={() =>
                                moveBlock(doc.id, activeSection.id, b.id, "up")
                              }
                              aria-label="Mover bloco para cima"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={idx === activeSection.blocks.length - 1}
                              onClick={() =>
                                moveBlock(doc.id, activeSection.id, b.id, "down")
                              }
                              aria-label="Mover bloco para baixo"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                duplicateBlock(doc.id, activeSection.id, b.id)
                              }
                            >
                              <Copy className="mr-1 h-4 w-4" />
                              Duplicar
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSourceDialog({
                                  sectionId: activeSection.id,
                                  blockId: b.id,
                                })
                              }
                            >
                              <Link2 className="mr-1 h-4 w-4" />
                              Vincular fonte
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                removeBlock(doc.id, activeSection.id, b.id)
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Fontes vinculadas ({b.sources.length})
                          </p>
                          {b.sources.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5">
                              {b.sources.map((s) => (
                                <li key={s.id}>
                                  <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    title="Clique para remover"
                                    onClick={() =>
                                      unlinkSourceFromBlock(
                                        doc.id,
                                        activeSection.id,
                                        b.id,
                                        s.id,
                                      )
                                    }
                                  >
                                    <BookMarked className="mr-1 h-3 w-3" />
                                    {REPORT_SOURCE_KIND_LABEL[s.kind]}: {s.label}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {activeSection.blocks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum bloco. Use “Adicionar bloco” para começar.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revisao" className="mt-4">
          <ReportReviewPanel document={doc} />
        </TabsContent>

        <TabsContent value="previa" className="mt-4">
          <ReportPreview document={doc} />
        </TabsContent>

        <TabsContent value="fechamento" className="mt-4">
          <ReportClosurePanel document={doc} />
        </TabsContent>

        <TabsContent value="versoes" className="mt-4">
          <ReportVersionsPanel reportId={doc.id} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <ReportHistoryPanel reportId={doc.id} />
        </TabsContent>
      </Tabs>


      {sourceDialog && (
        <ReportSourceLinkDialog
          open
          onOpenChange={(o) => !o && setSourceDialog(null)}
          reportId={doc.id}
          sectionId={sourceDialog.sectionId}
          blockId={sourceDialog.blockId}
          caseId={doc.caseId}
        />
      )}

      <ReportExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        document={doc}
      />
    </div>
  );
}

function SectionStatusDot({ status }: { status: ReportSectionStatus }) {
  const map: Record<ReportSectionStatus, string> = {
    nao_iniciada: "bg-muted-foreground/40",
    em_elaboracao: "bg-amber-500",
    revisada: "bg-sky-500",
    aprovada: "bg-emerald-500",
  };
  return (
    <span
      aria-label={REPORT_SECTION_STATUS_LABEL[status]}
      title={REPORT_SECTION_STATUS_LABEL[status]}
      className={`h-2.5 w-2.5 rounded-full ${map[status]}`}
    />
  );
}
