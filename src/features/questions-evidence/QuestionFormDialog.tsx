/**
 * LV-12 — Formulário de novo quesito.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processos, pericias } from "@/lib/mock/data";
import { QUESTION_ORIGIN_LABEL, QUESTION_PRIORITY_LABEL } from "./question-labels";
import { QUESTION_ORIGINS, QUESTION_PRIORITIES } from "./question-types";
import type { QuestionOrigin, QuestionPriority } from "./question-types";
import {
  createQuestion,
  validateQuestionForm,
  type QuestionFormInput,
  type FormErrors,
} from "./question-mock-store";

export function QuestionFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [caseId, setCaseId] = useState<string>("");
  const [expertiseId, setExpertiseId] = useState<string>("");
  const [origin, setOrigin] = useState<QuestionOrigin>("juizo");
  const [originLabel, setOriginLabel] = useState("");
  const [text, setText] = useState("");
  const [objective, setObjective] = useState("");
  const [priority, setPriority] = useState<QuestionPriority>("normal");
  const [responsibleLabel, setResponsibleLabel] = useState("Dra. Ana Beatriz Salgado");
  const [dueAt, setDueAt] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const firstErrorRef = useRef<HTMLTextAreaElement | null>(null);

  const dirty = useMemo(
    () =>
      caseId !== "" || text.trim() !== "" || objective.trim() !== "" ||
      originLabel.trim() !== "" || tagsRaw.trim() !== "" || dueAt !== "",
    [caseId, text, objective, originLabel, tagsRaw, dueAt],
  );

  const needsOriginLabel = origin === "assistente_tecnico" || origin === "outro";

  const filteredExpertises = useMemo(
    () => (caseId ? pericias.filter((p) => p.processoId === caseId) : pericias),
    [caseId],
  );

  useEffect(() => {
    if (errors.text && firstErrorRef.current) firstErrorRef.current.focus();
  }, [errors]);

  function handleClose() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function submit() {
    const input: QuestionFormInput = {
      caseId: caseId || undefined,
      expertiseId: expertiseId || undefined,
      origin,
      originLabel: needsOriginLabel ? originLabel : undefined,
      text,
      objective,
      priority,
      responsibleLabel,
      dueAt: dueAt || undefined,
      tags: tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    };
    const e = validateQuestionForm(input);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    createQuestion(input);
    onClose();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo quesito</DialogTitle>
            <DialogDescription>
              Preencha as informações do quesito. Os campos obrigatórios estão marcados com *.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="q-case">Processo *</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger id="q-case" aria-invalid={Boolean(errors.caseId)} aria-describedby="q-case-err">
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.caseId && (
                <p id="q-case-err" role="alert" className="text-xs text-destructive">
                  {errors.caseId}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-exp">Perícia</Label>
              <Select value={expertiseId} onValueChange={setExpertiseId}>
                <SelectTrigger id="q-exp">
                  <SelectValue placeholder="Selecione a perícia" />
                </SelectTrigger>
                <SelectContent>
                  {filteredExpertises.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} — {p.tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-origin">Origem *</Label>
              <Select value={origin} onValueChange={(v) => setOrigin(v as QuestionOrigin)}>
                <SelectTrigger id="q-origin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_ORIGINS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {QUESTION_ORIGIN_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsOriginLabel && (
              <div className="space-y-1">
                <Label htmlFor="q-origin-label">Identificação da origem *</Label>
                <Input
                  id="q-origin-label"
                  value={originLabel}
                  onChange={(e) => setOriginLabel(e.target.value)}
                  maxLength={120}
                  aria-invalid={Boolean(errors.originLabel)}
                  aria-describedby="q-origin-err"
                />
                {errors.originLabel && (
                  <p id="q-origin-err" role="alert" className="text-xs text-destructive">
                    {errors.originLabel}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="q-text">Texto do quesito *</Label>
              <Textarea
                id="q-text"
                ref={firstErrorRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
                aria-invalid={Boolean(errors.text)}
                aria-describedby="q-text-err"
              />
              {errors.text && (
                <p id="q-text-err" role="alert" className="text-xs text-destructive">
                  {errors.text}
                </p>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="q-obj">Objetivo</Label>
              <Textarea
                id="q-obj"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-priority">Prioridade *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as QuestionPriority)}>
                <SelectTrigger id="q-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {QUESTION_PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-resp">Responsável *</Label>
              <Input
                id="q-resp"
                value={responsibleLabel}
                onChange={(e) => setResponsibleLabel(e.target.value)}
                aria-invalid={Boolean(errors.responsibleLabel)}
                aria-describedby="q-resp-err"
              />
              {errors.responsibleLabel && (
                <p id="q-resp-err" role="alert" className="text-xs text-destructive">
                  {errors.responsibleLabel}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-due">Prazo</Label>
              <Input
                id="q-due"
                type="date"
                value={dueAt.slice(0, 10)}
                onChange={(e) =>
                  setDueAt(e.target.value ? new Date(e.target.value + "T12:00:00Z").toISOString() : "")
                }
                aria-invalid={Boolean(errors.dueAt)}
              />
              {errors.dueAt && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.dueAt}
                </p>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="q-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="q-tags"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="ex.: impermeabilização, urgente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar quesito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDiscard && (
        <Dialog open onOpenChange={(v) => (!v ? setConfirmDiscard(false) : null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Descartar rascunho?</DialogTitle>
              <DialogDescription>
                As informações digitadas serão perdidas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
                Continuar editando
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDiscard(false);
                  onClose();
                }}
              >
                Descartar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
