/**
 * LV-18.5 — Diálogo de criação de laudos com suporte a Modelos LV-18.
 *
 * Wizard multi-etapas:
 *   1. Modo (branco/modelo)
 *   2. Seleção do modelo (só publicados) + preview resumido
 *   3. Título + perícia + variáveis
 *   4. Preview resolvido
 *   5. Confirmação — chamada atômica ao caso de uso central
 *
 * A UI é fina: NÃO monta estrutura, NÃO gera IDs, NÃO valida variáveis.
 * Toda a lógica está em `report-template-application.ts`.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileText, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pericias, processos } from "@/lib/mock/data";
import { createReport } from "./report-mock-store";
import {
  REPORT_TEMPLATE_LABEL,
  type ReportTemplateId as LegacyReportTemplateId,
} from "./report-types";
import { REPORT_TEMPLATES } from "./report-templates";
import {
  createReportFromTemplate,
  listApplicableTemplates,
  previewReportTemplateApplication,
} from "./report-template-application";
import {
  ReportTemplateApplicationError,
  REPORT_TEMPLATE_APPLICATION_ERROR_LABEL,
  type ReportTemplateApplicationPreview,
  type ReportTemplateVariableValues,
  type VariableFieldError,
} from "./report-template-application-types";
import {
  getSnapshot as getTemplatesSnapshot,
  subscribe as subscribeTemplates,
} from "@/features/report-templates/report-template-store";
import {
  REPORT_TEMPLATE_SPECIALTY_LABEL,
  type ReportTemplate,
} from "@/features/report-templates/report-template-types";

type Mode = "branco" | "modelo";
type Step = "modo" | "selecao" | "variaveis" | "preview" | "confirmacao";

export type ReportCreationDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated?: (reportId: string) => void;
};

function caseOptions(): readonly { readonly id: string; readonly label: string }[] {
  return pericias.map((p) => {
    const proc = processos.find((pr) => pr.id === p.processoId);
    const label = proc ? `${proc.numero} — ${proc.comarca}` : `Perícia ${p.id}`;
    return { id: p.id, label };
  });
}

function useTemplatesSnapshot() {
  return useSyncExternalStore(subscribeTemplates, getTemplatesSnapshot, getTemplatesSnapshot);
}

export function ReportCreationDialog({
  open,
  onOpenChange,
  onCreated,
}: ReportCreationDialogProps) {
  const cases = useMemo(caseOptions, []);
  const snapshot = useTemplatesSnapshot();

  const [step, setStep] = useState<Step>("modo");
  const [mode, setMode] = useState<Mode>("branco");
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState<string>(cases[0]?.id ?? "");
  const [legacyTemplateId, setLegacyTemplateId] =
    useState<LegacyReportTemplateId>("laudo_psicologico");

  // Modo "modelo"
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<readonly VariableFieldError[]>([]);
  const [preview, setPreview] = useState<ReportTemplateApplicationPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applicableTemplates = useMemo(
    () => listApplicableTemplates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.version],
  );

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicableTemplates.filter((t) => {
      if (specialtyFilter !== "all" && t.specialty !== specialtyFilter) return false;
      if (q.length === 0) return true;
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    });
  }, [applicableTemplates, search, specialtyFilter]);

  const selectedTemplate: ReportTemplate | null = useMemo(() => {
    if (!selectedTemplateId) return null;
    return applicableTemplates.find((t) => t.id === selectedTemplateId) ?? null;
  }, [applicableTemplates, selectedTemplateId]);

  function reset() {
    setStep("modo");
    setMode("branco");
    setTitle("");
    setCaseId(cases[0]?.id ?? "");
    setLegacyTemplateId("laudo_psicologico");
    setSelectedTemplateId(null);
    setSearch("");
    setSpecialtyFilter("all");
    setVariableValues({});
    setFieldErrors([]);
    setPreview(null);
    setErrorMsg(null);
  }

  function close() {
    onOpenChange(false);
    // Delay reset para não piscar durante a animação de saída.
    setTimeout(reset, 200);
  }

  function handleCreateBlank() {
    if (!title.trim()) {
      setErrorMsg("Informe o título do documento.");
      return;
    }
    const selected = cases.find((c) => c.id === caseId);
    if (!selected) {
      setErrorMsg("Selecione uma perícia.");
      return;
    }
    const doc = createReport({
      title,
      templateId: legacyTemplateId,
      caseId: selected.id,
      caseLabel: selected.label,
    });
    onCreated?.(doc.id);
    close();
  }

  function computePreview(): ReportTemplateApplicationPreview | null {
    if (!selectedTemplate) return null;
    try {
      const p = previewReportTemplateApplication({
        templateId: selectedTemplate.id,
        variableValues: variableValues as ReportTemplateVariableValues,
      });
      setFieldErrors([]);
      setErrorMsg(null);
      setPreview(p);
      return p;
    } catch (err) {
      if (err instanceof ReportTemplateApplicationError) {
        setErrorMsg(REPORT_TEMPLATE_APPLICATION_ERROR_LABEL[err.code]);
        setFieldErrors(err.fieldErrors ?? []);
      } else {
        setErrorMsg("Erro inesperado ao gerar preview.");
      }
      setPreview(null);
      return null;
    }
  }

  function goToPreview() {
    const p = computePreview();
    if (p) setStep("preview");
  }

  function confirmApply() {
    if (!selectedTemplate || !preview) return;
    const selected = cases.find((c) => c.id === caseId);
    if (!title.trim() || !selected) {
      setErrorMsg("Informe título e perícia.");
      return;
    }
    try {
      const result = createReportFromTemplate({
        templateId: selectedTemplate.id,
        templateVersionId: preview.templateVersionId,
        title,
        caseId: selected.id,
        caseLabel: selected.label,
        variableValues: variableValues as ReportTemplateVariableValues,
        fingerprint: preview.fingerprint,
      });
      onCreated?.(result.report.id);
      close();
    } catch (err) {
      if (err instanceof ReportTemplateApplicationError) {
        setErrorMsg(REPORT_TEMPLATE_APPLICATION_ERROR_LABEL[err.code]);
        setFieldErrors(err.fieldErrors ?? []);
        if (err.code === "report_template_changed") {
          // Volta para preview e recomputa
          setPreview(null);
          setStep("variaveis");
        }
      } else {
        setErrorMsg("Falha ao criar o laudo.");
      }
    }
  }

  // ---------- Render helpers ----------

  const specialties = useMemo(() => {
    const s = new Set<string>();
    applicableTemplates.forEach((t) => s.add(t.specialty));
    return Array.from(s);
  }, [applicableTemplates]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo documento pericial</DialogTitle>
          <DialogDescription>
            {step === "modo" && "Escolha o modo de criação."}
            {step === "selecao" && "Selecione um modelo publicado compatível."}
            {step === "variaveis" && "Preencha o cabeçalho e as variáveis do modelo."}
            {step === "preview" && "Pré-visualize a estrutura resolvida antes de criar."}
            {step === "confirmacao" && "Confirme os dados e crie o laudo."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2">
            {errorMsg && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Não foi possível prosseguir</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {step === "modo" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("branco");
                    setStep("variaveis");
                  }}
                  className={`text-left rounded-lg border p-4 hover:border-primary transition ${mode === "branco" ? "border-primary" : ""}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4" />
                    Criar em branco
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fluxo tradicional — escolha um modelo interno e preencha depois.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("modelo");
                    setStep("selecao");
                  }}
                  className={`text-left rounded-lg border p-4 hover:border-primary transition ${mode === "modelo" ? "border-primary" : ""}`}
                  disabled={applicableTemplates.length === 0}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4" />
                    Usar modelo publicado
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {applicableTemplates.length === 0
                      ? "Nenhum modelo publicado disponível."
                      : `${applicableTemplates.length} modelo(s) disponível(is).`}
                  </p>
                </button>
              </div>
            )}

            {step === "selecao" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome"
                      className="pl-8"
                      aria-label="Buscar modelo"
                    />
                  </div>
                  <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas especialidades</SelectItem>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>
                          {REPORT_TEMPLATE_SPECIALTY_LABEL[s as keyof typeof REPORT_TEMPLATE_SPECIALTY_LABEL] ?? s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(search || specialtyFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSpecialtyFilter("all");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum modelo publicado corresponde aos filtros.
                  </div>
                ) : (
                  <ul role="listbox" aria-label="Modelos publicados" className="space-y-2">
                    {filteredTemplates.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedTemplateId === t.id}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`w-full text-left rounded-md border p-3 hover:border-primary transition ${selectedTemplateId === t.id ? "border-primary bg-accent/50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {t.description || "Sem descrição."}
                              </p>
                            </div>
                            <Badge variant="outline">{REPORT_TEMPLATE_SPECIALTY_LABEL[t.specialty]}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                            <span>{t.sections.length} seções</span>
                            <span>
                              {t.sections.reduce((n, s) => n + s.blocks.length, 0)} blocos
                            </span>
                            <span>{t.variables.length} variáveis</span>
                            <span>
                              Atualizado {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step === "variaveis" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="rep-title">Título</Label>
                    <Input
                      id="rep-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex.: Laudo psicológico — João da Silva"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Perícia vinculada</Label>
                    <Select value={caseId} onValueChange={setCaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === "branco" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Modelo interno</Label>
                      <Select
                        value={legacyTemplateId}
                        onValueChange={(v) => setLegacyTemplateId(v as LegacyReportTemplateId)}
                      >
                        <SelectTrigger>
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
                    </div>
                  )}
                </div>

                {mode === "modelo" && selectedTemplate && (
                  <>
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="font-medium">{selectedTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedTemplate.sections.length} seções ·{" "}
                        {selectedTemplate.variables.length} variáveis · especialidade{" "}
                        {REPORT_TEMPLATE_SPECIALTY_LABEL[selectedTemplate.specialty]}
                      </p>
                    </div>

                    {selectedTemplate.variables.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Este modelo não declara variáveis. Prossiga para o preview.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Variáveis do modelo</h4>
                        {selectedTemplate.variables.map((v) => {
                          const fieldErr = fieldErrors.find((e) => e.key === v.key);
                          return (
                            <div key={v.id} className="space-y-1">
                              <Label htmlFor={`var-${v.key}`}>
                                {v.label || v.key}
                                {v.required && <span className="text-destructive"> *</span>}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({v.kind})
                                </span>
                              </Label>
                              <Input
                                id={`var-${v.key}`}
                                type={
                                  v.kind === "numero"
                                    ? "number"
                                    : v.kind === "data"
                                      ? "date"
                                      : "text"
                                }
                                value={variableValues[v.key] ?? ""}
                                onChange={(e) =>
                                  setVariableValues((prev) => ({
                                    ...prev,
                                    [v.key]: e.target.value,
                                  }))
                                }
                                placeholder={v.defaultValue || undefined}
                                aria-invalid={fieldErr ? true : undefined}
                                aria-describedby={fieldErr ? `err-${v.key}` : undefined}
                              />
                              {fieldErr && (
                                <p
                                  id={`err-${v.key}`}
                                  role="alert"
                                  className="text-xs text-destructive"
                                >
                                  {fieldErr.message}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === "preview" && preview && (
              <div className="space-y-3">
                <div className="rounded-md border p-3">
                  <p className="font-medium">{preview.templateName}</p>
                  <p className="text-xs text-muted-foreground">
                    Versão {preview.templateVersionNumber} — {preview.sectionsCount} seções,{" "}
                    {preview.blocksCount} blocos. Uma cópia independente será criada.
                  </p>
                </div>
                {preview.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {preview.warnings.length} aviso(s) de validação — a criação segue permitida.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  {preview.sections.map((s, i) => (
                    <details key={i} className="rounded-md border">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                        {s.title}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({s.blocks.length} blocos)
                        </span>
                      </summary>
                      <div className="px-3 pb-3 space-y-2">
                        {s.blocks.map((b, j) => (
                          <div key={j} className="rounded bg-muted/40 p-2">
                            <p className="text-xs font-medium">{b.title}</p>
                            <pre className="whitespace-pre-wrap break-words text-xs mt-1 text-muted-foreground">
                              {b.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {step === "confirmacao" && preview && (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Pronto para criar</AlertTitle>
                  <AlertDescription>
                    Uma cópia independente da estrutura será gerada. Nenhuma alteração
                    posterior neste laudo afetará o modelo, e vice-versa.
                  </AlertDescription>
                </Alert>
                <ul className="text-sm space-y-1">
                  <li>
                    <strong>Título:</strong> {title}
                  </li>
                  <li>
                    <strong>Perícia:</strong>{" "}
                    {cases.find((c) => c.id === caseId)?.label}
                  </li>
                  <li>
                    <strong>Modelo:</strong> {preview.templateName} — versão{" "}
                    {preview.templateVersionNumber}
                  </li>
                  <li>
                    <strong>Especialidade:</strong>{" "}
                    {REPORT_TEMPLATE_SPECIALTY_LABEL[preview.templateSpecialty]}
                  </li>
                  <li>
                    <strong>Estrutura:</strong> {preview.sectionsCount} seções,{" "}
                    {preview.blocksCount} blocos
                  </li>
                  <li>
                    <strong>Variáveis preenchidas:</strong> {preview.variableKeys.length}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          {step !== "modo" && (
            <Button
              variant="outline"
              onClick={() => {
                setErrorMsg(null);
                if (step === "selecao") setStep("modo");
                else if (step === "variaveis") setStep(mode === "modelo" ? "selecao" : "modo");
                else if (step === "preview") setStep("variaveis");
                else if (step === "confirmacao") setStep("preview");
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}

          {step === "selecao" && (
            <Button
              onClick={() => setStep("variaveis")}
              disabled={!selectedTemplateId}
            >
              Continuar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === "variaveis" && mode === "branco" && (
            <Button onClick={handleCreateBlank}>Criar em branco</Button>
          )}
          {step === "variaveis" && mode === "modelo" && (
            <Button onClick={goToPreview} disabled={!title.trim() || !caseId}>
              Pré-visualizar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === "preview" && (
            <Button onClick={() => setStep("confirmacao")}>
              Continuar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === "confirmacao" && (
            <Button onClick={confirmApply}>Criar laudo</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
