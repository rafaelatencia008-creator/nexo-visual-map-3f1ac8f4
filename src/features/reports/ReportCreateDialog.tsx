/**
 * LV-14 — Diálogo de criação de documento pericial.
 * Seleciona modelo + perícia (mock). Sem backend.
 */
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pericias, processos } from "@/lib/mock/data";
import { REPORT_TEMPLATE_LABEL, type ReportTemplateId } from "./report-types";
import { REPORT_TEMPLATES } from "./report-templates";
import { createReport } from "./report-mock-store";

export type ReportCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (reportId: string) => void;
};

function caseOptions(): { id: string; label: string }[] {
  return pericias.map((p) => {
    const proc = processos.find((pr) => pr.id === p.processoId);
    const label = proc
      ? `${proc.numero} — ${proc.comarca}`
      : `Perícia ${p.id}`;
    return { id: p.id, label };
  });
}

export function ReportCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: ReportCreateDialogProps): JSX.Element {
  const cases = caseOptions();
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] =
    useState<ReportTemplateId>("laudo_psicologico");
  const [caseId, setCaseId] = useState<string>(cases[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(): void {
    if (!title.trim()) {
      setError("Informe o título do documento.");
      return;
    }
    const selected = cases.find((c) => c.id === caseId);
    if (!selected) {
      setError("Selecione uma perícia.");
      return;
    }
    const doc = createReport({
      title,
      templateId,
      caseId: selected.id,
      caseLabel: selected.label,
    });
    setTitle("");
    setError(null);
    onOpenChange(false);
    onCreated?.(doc.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo documento pericial</DialogTitle>
          <DialogDescription>
            Escolha o modelo base e a perícia vinculada. As seções iniciais são
            criadas conforme o modelo selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rep-title">Título</Label>
            <Input
              id="rep-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Laudo psicológico — João da Silva"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select
              value={templateId}
              onValueChange={(v) => setTemplateId(v as ReportTemplateId)}
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

          <div className="space-y-1.5">
            <Label>Perícia vinculada</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a perícia" />
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

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Criar documento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
