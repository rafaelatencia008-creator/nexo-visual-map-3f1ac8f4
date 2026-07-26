import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REPORT_TEMPLATE_SPECIALTIES,
  REPORT_TEMPLATE_SPECIALTY_LABEL,
  type ReportTemplate,
  type ReportTemplateSpecialty,
} from "../report-template-types";
import { createTemplate } from "../report-template-store";
import { friendlyReportTemplateError } from "../report-template-error-labels";
import { toast } from "sonner";

export function ReportTemplateCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (t: ReportTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState<ReportTemplateSpecialty>("geral");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setSpecialty("geral");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Informe um nome.");
      return;
    }
    try {
      const t = createTemplate({
        name: trimmed,
        description: description.trim(),
        specialty,
      });
      toast.success("Modelo criado.");
      onCreated(t);
      onOpenChange(false);
    } catch (e) {
      setError(friendlyReportTemplateError(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo modelo de laudo</DialogTitle>
          <DialogDescription>
            Crie um modelo em branco. Você poderá adicionar seções, blocos e variáveis em seguida.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rtpl-new-name">Nome</Label>
            <Input
              id="rtpl-new-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error !== null}
              aria-describedby={error ? "rtpl-new-name-err" : undefined}
            />
            {error && (
              <p id="rtpl-new-name-err" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="rtpl-new-desc">Descrição</Label>
            <Textarea
              id="rtpl-new-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="rtpl-new-spec">Especialidade</Label>
            <Select
              value={specialty}
              onValueChange={(v) => setSpecialty(v as ReportTemplateSpecialty)}
            >
              <SelectTrigger id="rtpl-new-spec">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TEMPLATE_SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REPORT_TEMPLATE_SPECIALTY_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Criar modelo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
