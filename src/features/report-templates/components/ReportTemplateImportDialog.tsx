import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  MAX_IMPORT_BYTES,
  MAX_TEMPLATES_PER_IMPORT,
} from "../report-template-serialization";
import {
  importReportTemplates,
  previewReportTemplateImport,
  type ImportConflictStrategy,
  type ImportPreview,
  type ReportTemplateImportReport,
} from "../report-template-import";
import { friendlyReportTemplateError } from "../report-template-error-labels";
import type { ReportTemplateId } from "../report-template-types";

type Step = "select" | "preview" | "strategy" | "confirm" | "result" | "error";

const STRATEGY_LABEL: Record<ImportConflictStrategy, string> = {
  reject: "Rejeitar em caso de conflito",
  regenerate_ids: "Regenerar IDs (recomendado)",
  duplicate: "Duplicar (novos IDs e sufixo no nome)",
};

const STRATEGY_DESC: Record<ImportConflictStrategy, string> = {
  reject:
    "Se houver qualquer conflito de ID com a base atual, nenhum modelo será importado.",
  regenerate_ids:
    "Todos os IDs internos serão recriados preservando as relações. Nomes são mantidos. Status final: rascunho.",
  duplicate:
    "Uma cópia será criada com IDs novos e o nome receberá o sufixo “(importado)”. Status final: rascunho.",
};

export function ReportTemplateImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (report: ReportTemplateImportReport, firstId: ReportTemplateId | null) => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [json, setJson] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [strategy, setStrategy] = useState<ImportConflictStrategy>("regenerate_ids");
  const [report, setReport] = useState<ReportTemplateImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("select");
    setFile(null);
    setJson(null);
    setPreview(null);
    setStrategy("regenerate_ids");
    setReport(null);
    setError(null);
  }

  function onClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function onFileChosen(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      setJson(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".json") && f.type !== "application/json") {
      setError("Selecione um arquivo .json.");
      return;
    }
    if (f.size > MAX_IMPORT_BYTES) {
      setError(`Arquivo excede o limite de ${Math.round(MAX_IMPORT_BYTES / 1024)} KB.`);
      return;
    }
    setFile(f);
    try {
      const text = await f.text();
      setJson(text);
    } catch {
      setError("Não foi possível ler o arquivo.");
    }
  }

  function analyze() {
    if (!json) return;
    setError(null);
    try {
      const p = previewReportTemplateImport(json);
      setPreview(p);
      setStrategy(p.recommendedStrategy);
      setStep("preview");
    } catch (e) {
      setError(friendlyReportTemplateError(e));
      setStep("error");
    }
  }

  function confirmImport() {
    if (!json) return;
    setError(null);
    try {
      const r = importReportTemplates(json, { strategy });
      setReport(r);
      setStep("result");
    } catch (e) {
      setError(friendlyReportTemplateError(e));
      setStep("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar modelos de laudo</DialogTitle>
          <DialogDescription>
            Todos os modelos importados entram como rascunho. Nenhum dado é enviado à rede.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-3">
            <Label htmlFor="rtpl-import-file">Selecione o arquivo</Label>
            <input
              id="rtpl-import-file"
              type="file"
              accept=".json,application/json"
              onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {Math.round(file.size / 1024)} KB
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Limites: {Math.round(MAX_IMPORT_BYTES / 1024)} KB,{" "}
              {MAX_TEMPLATES_PER_IMPORT} modelo(s) por arquivo.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <ImportPreviewView preview={preview} />
        )}

        {step === "strategy" && preview && (
          <div className="space-y-3">
            <RadioGroup
              value={strategy}
              onValueChange={(v) => setStrategy(v as ImportConflictStrategy)}
              aria-label="Estratégia de conflito"
            >
              {(Object.keys(STRATEGY_LABEL) as ImportConflictStrategy[]).map((s) => (
                <div
                  key={s}
                  className="flex items-start gap-3 rounded border p-3"
                >
                  <RadioGroupItem value={s} id={`strat-${s}`} className="mt-1" />
                  <label htmlFor={`strat-${s}`} className="flex-1 cursor-pointer text-sm">
                    <span className="font-medium">{STRATEGY_LABEL[s]}</span>
                    <span className="block text-muted-foreground">{STRATEGY_DESC[s]}</span>
                  </label>
                </div>
              ))}
            </RadioGroup>
            {strategy === "reject" && preview.conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Conflitos detectados</AlertTitle>
                <AlertDescription>
                  Com esta estratégia, a importação será abortada e nenhum modelo será
                  inserido.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-2 text-sm">
            <p><strong>Arquivo:</strong> {file?.name}</p>
            <p><strong>Modelos:</strong> {preview.templateCount}</p>
            <p><strong>Estratégia:</strong> {STRATEGY_LABEL[strategy]}</p>
            <p><strong>Conflitos:</strong> {preview.conflicts.length}</p>
            <p><strong>Avisos:</strong> {preview.warnings.length}</p>
            <p className="text-muted-foreground">
              Status final de todos os modelos: <Badge variant="outline">rascunho</Badge>
            </p>
          </div>
        )}

        {step === "result" && report && (
          <div className="space-y-2 text-sm">
            <Alert>
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription>
                {report.importedCount} modelo(s) importado(s) com estratégia{" "}
                <code>{report.strategy}</code>.
              </AlertDescription>
            </Alert>
            <ScrollArea className="max-h-56">
              <ul className="space-y-1 pr-3">
                {report.importedTemplates.map((t) => (
                  <li key={t.newId} className="rounded border p-2">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      novo id: <code>{t.newId}</code> · {t.sectionsCount} seções ·{" "}
                      {t.variablesCount} variáveis
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            {report.warnings.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {report.warnings.length} aviso(s) durante a importação.
              </p>
            )}
          </div>
        )}

        {step === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Falha na importação</AlertTitle>
            <AlertDescription>{error ?? "Erro inesperado."}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={() => onClose(false)}>
                Cancelar
              </Button>
              <Button disabled={!json} onClick={analyze}>
                Analisar arquivo
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("strategy")}>Escolher estratégia</Button>
            </>
          )}
          {step === "strategy" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("confirm")}>Continuar</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("strategy")}>
                Voltar
              </Button>
              <Button onClick={confirmImport}>Confirmar importação</Button>
            </>
          )}
          {step === "result" && report && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onImported(
                    report,
                    (report.importedTemplates[0]?.newId as ReportTemplateId) ?? null,
                  );
                  onClose(false);
                }}
              >
                Concluir
              </Button>
              {report.importedTemplates[0] && (
                <Button
                  onClick={() => {
                    onImported(report, report.importedTemplates[0]!.newId);
                    onClose(false);
                  }}
                >
                  Abrir modelo importado
                </Button>
              )}
            </>
          )}
          {step === "error" && (
            <Button variant="outline" onClick={() => setStep("select")}>
              Recomeçar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportPreviewView({ preview }: { preview: ImportPreview }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">schema v{preview.schemaVersion}</Badge>
        <Badge variant="outline">{preview.templateCount} modelo(s)</Badge>
        <Badge variant="secondary">
          {preview.idsToRegenerate} IDs se “regenerate_ids”
        </Badge>
      </div>
      <div>
        <p className="font-medium">Modelos no arquivo:</p>
        <ul className="ml-4 list-disc">
          {preview.names.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
      {preview.warnings.length > 0 && (
        <Alert>
          <AlertTitle>Avisos ({preview.warnings.length})</AlertTitle>
          <AlertDescription>
            <ul className="ml-4 list-disc">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {preview.conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Conflitos ({preview.conflicts.length})</AlertTitle>
          <AlertDescription>
            <ScrollArea className="max-h-40">
              <ul className="ml-4 list-disc pr-3">
                {preview.conflicts.map((c, i) => (
                  <li key={i}>
                    <code>{c.kind}</code>: {c.reason}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
