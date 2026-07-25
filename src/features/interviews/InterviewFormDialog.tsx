/**
 * LV-11 — Diálogo de criação de entrevista.
 */
import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { processos, pericias } from "@/lib/mock/data";
import { INTERVIEW_TEMPLATES } from "./interview-templates";
import { validateInterviewForm } from "./interview-filters";
import { createInterview, listAvailableParticipants } from "./interview-mock-store";
import { toast } from "sonner";

export type InterviewFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

export function InterviewFormDialog({ open, onOpenChange, onCreated }: InterviewFormDialogProps) {
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [expertiseId, setExpertiseId] = useState<string>("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [responsibleLabel, setResponsibleLabel] = useState("Dra. Ana Beatriz Salgado");
  const [scheduledAt, setScheduledAt] = useState("");
  const [templateId, setTemplateId] = useState("roteiro-inicial");
  const [observation, setObservation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const participants = useMemo(() => listAvailableParticipants(), []);
  const isDirty =
    title.trim() !== "" ||
    caseId !== "" ||
    expertiseId !== "" ||
    participantIds.length > 0 ||
    observation.trim() !== "";

  function reset() {
    setTitle("");
    setCaseId("");
    setExpertiseId("");
    setParticipantIds([]);
    setResponsibleLabel("Dra. Ana Beatriz Salgado");
    setScheduledAt("");
    setTemplateId("roteiro-inicial");
    setObservation("");
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

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function submit() {
    const errs = validateInterviewForm({ title, responsibleLabel, participantIds, templateId });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const rec = createInterview({
      title,
      caseId: caseId || undefined,
      expertiseId: expertiseId || undefined,
      participantIds,
      responsibleLabel,
      templateId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      observation: observation || undefined,
    });
    toast.success("Entrevista criada");
    onCreated?.(rec.id);
    reset();
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={tryClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova entrevista</DialogTitle>
            <DialogDescription>
              Preencha os dados e escolha um roteiro. Nada é enviado a servidor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ent-title">Título *</Label>
              <Input
                id="ent-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "ent-title-error" : undefined}
                maxLength={160}
              />
              {errors.title && (
                <p id="ent-title-error" role="alert" className="text-xs text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ent-case">Processo</Label>
                <Select
                  value={caseId || "none"}
                  onValueChange={(v) => setCaseId(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="ent-case">
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
                <Label htmlFor="ent-pericia">Perícia</Label>
                <Select
                  value={expertiseId || "none"}
                  onValueChange={(v) => setExpertiseId(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="ent-pericia">
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

            <div className="grid gap-2">
              <Label>Participantes *</Label>
              <div
                className="rounded-md border border-border/60 p-3 space-y-2"
                aria-invalid={Boolean(errors.participantIds)}
                aria-describedby={errors.participantIds ? "ent-parts-error" : undefined}
              >
                {participants.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={participantIds.includes(p.id)}
                      onCheckedChange={() => toggleParticipant(p.id)}
                      aria-label={p.label}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
              {errors.participantIds && (
                <p id="ent-parts-error" role="alert" className="text-xs text-destructive">
                  {errors.participantIds}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ent-resp">Responsável *</Label>
                <Input
                  id="ent-resp"
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
                <Label htmlFor="ent-when">Data e horário</Label>
                <Input
                  id="ent-when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ent-tpl">Roteiro *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="ent-tpl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.templateId && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.templateId}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ent-obs">Observações de preparação</Label>
              <Textarea
                id="ent-obs"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => tryClose(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Criar entrevista</Button>
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
