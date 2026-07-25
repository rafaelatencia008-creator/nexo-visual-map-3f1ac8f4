/**
 * LV-11 — Diálogo de criação de diligência.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { processos, pericias } from "@/lib/mock/data";
import { DILIGENCE_KIND_LABEL } from "./interview-labels";
import { DILIGENCE_KINDS } from "./interview-types";
import { validateDiligenceForm } from "./interview-filters";
import { createDiligence } from "./interview-mock-store";
import { toast } from "sonner";

export type DiligenceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

export function DiligenceFormDialog({ open, onOpenChange, onCreated }: DiligenceFormDialogProps) {
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState("");
  const [expertiseId, setExpertiseId] = useState("");
  const [responsibleLabel, setResponsibleLabel] = useState("Dra. Ana Beatriz Salgado");
  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState("");
  const [diligenceKind, setDiligenceKind] =
    useState<(typeof DILIGENCE_KINDS)[number]>("vistoria_imovel");
  const [objective, setObjective] = useState("");
  const [checklistRaw, setChecklistRaw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty =
    title.trim() !== "" ||
    caseId !== "" ||
    address.trim() !== "" ||
    objective.trim() !== "" ||
    checklistRaw.trim() !== "";

  function reset() {
    setTitle("");
    setCaseId("");
    setExpertiseId("");
    setResponsibleLabel("Dra. Ana Beatriz Salgado");
    setScheduledAt("");
    setAddress("");
    setDiligenceKind("vistoria_imovel");
    setObjective("");
    setChecklistRaw("");
    setErrors({});
  }

  function tryClose(next: boolean) {
    if (!next && isDirty) {
      setConfirmDiscard(true);
      return;
    }
    if (!next) reset();
    onOpenChange(next);
  }

  function submit() {
    const errs = validateDiligenceForm({ title, responsibleLabel, address });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const checklistTexts = checklistRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const rec = createDiligence({
      title,
      caseId: caseId || undefined,
      expertiseId: expertiseId || undefined,
      responsibleLabel,
      diligenceKind,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      address,
      objective: objective || undefined,
      checklistTexts,
    });
    toast.success("Diligência criada");
    onCreated?.(rec.id);
    reset();
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={tryClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova diligência</DialogTitle>
            <DialogDescription>
              Cadastre uma diligência de campo. Fotos e localização são adicionadas no workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dil-title">Título *</Label>
              <Input
                id="dil-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(errors.title)}
                maxLength={160}
              />
              {errors.title && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dil-case">Processo</Label>
                <Select
                  value={caseId || "none"}
                  onValueChange={(v) => setCaseId(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="dil-case">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {processos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dil-per">Perícia</Label>
                <Select
                  value={expertiseId || "none"}
                  onValueChange={(v) => setExpertiseId(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="dil-per">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {pericias.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id} · {p.tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dil-resp">Responsável *</Label>
                <Input
                  id="dil-resp"
                  value={responsibleLabel}
                  onChange={(e) => setResponsibleLabel(e.target.value)}
                  aria-invalid={Boolean(errors.responsibleLabel)}
                />
                {errors.responsibleLabel && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.responsibleLabel}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dil-when">Data e horário</Label>
                <Input
                  id="dil-when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dil-addr">Endereço *</Label>
              <Input
                id="dil-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                aria-invalid={Boolean(errors.address)}
                maxLength={240}
              />
              {errors.address && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.address}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dil-kind">Tipo de diligência</Label>
              <Select value={diligenceKind} onValueChange={(v) => setDiligenceKind(v as never)}>
                <SelectTrigger id="dil-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DILIGENCE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {DILIGENCE_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dil-obj">Objetivo</Label>
              <Textarea
                id="dil-obj"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dil-check">Checklist (um item por linha)</Label>
              <Textarea
                id="dil-check"
                value={checklistRaw}
                onChange={(e) => setChecklistRaw(e.target.value)}
                rows={3}
                placeholder="Medir umidade&#10;Fotografar pontos críticos"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => tryClose(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Criar diligência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações digitadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                reset();
                onOpenChange(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
