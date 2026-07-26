/**
 * LV-11 — Workspace de entrevista (sala funcional).
 *
 * Integra o motor de gravação da LV-10, roteiro, notas, transcrição
 * manual e finalização com validações.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Mic, MicOff, Pause, Play, Square, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import type { InterviewNoteKind, InterviewRecord, QuestionAnswerStatus } from "./interview-types";
import { INTERVIEW_STATUS_LABEL, NOTE_KIND_LABEL, QUESTION_STATUS_LABEL } from "./interview-labels";
import { NOTE_KINDS } from "./interview-types";
import { getTemplate } from "./interview-templates";
import {
  addInterviewNote,
  addTranscriptBlock,
  answerQuestion,
  completeInterview,
  getInterviewRecord,
  pauseInterview,
  removeTranscriptBlock,
  resumeInterview,
  setInterviewAudioSummary,
  startInterview,
  updateTranscriptBlock,
  validateInterviewCompletion,
} from "./interview-mock-store";
import { useAudioRecorder } from "@/features/audio-spike/useAudioRecorder";
import { useRegisterCopilotEntity } from "@/features/copilot/copilot-context";

export type InterviewWorkspaceDialogProps = {
  interviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (id: string) => void;
};

type NoteDraft = { text: string; kind: InterviewNoteKind };
type TranscriptDraft = { timeLabel: string; personLabel: string; text: string };

function useInterviewSnapshot(id: string | null): InterviewRecord | null {
  const [snap, setSnap] = useState<InterviewRecord | null>(null);
  useEffect(() => {
    if (!id) {
      setSnap(null);
      return;
    }
    const load = () => {
      const rec = getInterviewRecord(id);
      setSnap(rec && rec.kind === "entrevista" ? rec : null);
    };
    load();
    // Subscribe via minimal polling to avoid coupling; store notifies on writes
    const t = setInterval(load, 200);
    return () => clearInterval(t);
  }, [id]);
  return snap;
}

export function InterviewWorkspaceDialog({
  interviewId,
  open,
  onOpenChange,
  onCompleted,
}: InterviewWorkspaceDialogProps) {
  const rec = useInterviewSnapshot(interviewId);
  const rec_ = rec; // narrow
  const template = rec ? getTemplate(rec.templateId) : undefined;

  useRegisterCopilotEntity(
    open && rec_
      ? {
          entityType: "entrevista",
          entityId: rec_.id,
          entityLabel: rec_.title,
          route: "/app/entrevistas",
          moduleKey: "entrevistas",
          metadata: {
            caseId: rec_.caseId,
            expertiseId: rec_.expertiseId,
            status: rec_.status,
            updatedAt: rec_.updatedAt,
          },
        }
      : null,
  );

  const rec2 = useAudioRecorder({});
  const audio = rec2;
  const isRecording = audio.context.state === "recording";
  const isPaused = audio.context.state === "paused";
  const audioActive = isRecording || isPaused;

  const [noteDraft, setNoteDraft] = useState<NoteDraft>({ text: "", kind: "observacao" });
  const [transDraft, setTransDraft] = useState<TranscriptDraft>({
    timeLabel: "",
    personLabel: "",
    text: "",
  });
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [conclusion, setConclusion] = useState("");

  const validation = useMemo(() => {
    if (!rec_) return null;
    return validateInterviewCompletion(rec_, {
      audioActive,
      hasUnsavedNoteDraft: noteDraft.text.trim().length > 0,
      hasUnconsolidatedTranscript: rec_.transcriptBlocks.some((b) => !b.consolidated),
    });
  }, [rec_, audioActive, noteDraft.text]);

  const answeredCount = rec_ ? rec_.questions.filter((q) => q.status === "respondida").length : 0;
  const totalQuestions = rec_?.questions.length ?? 0;

  const handleAddNote = useCallback(() => {
    if (!interviewId) return;
    const text = noteDraft.text.trim();
    if (!text) return;
    try {
      addInterviewNote(interviewId, {
        text,
        kind: noteDraft.kind,
        timestampMs: audio.elapsedMs || undefined,
      });
      setNoteDraft({ text: "", kind: noteDraft.kind });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [interviewId, noteDraft, audio.elapsedMs]);

  const handleAddTranscriptBlock = useCallback(() => {
    if (!interviewId) return;
    const text = transDraft.text.trim();
    if (!text) return;
    try {
      addTranscriptBlock(interviewId, {
        timeLabel: transDraft.timeLabel || "—",
        personLabel: transDraft.personLabel || "—",
        text,
      });
      setTransDraft({ timeLabel: "", personLabel: "", text: "" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [interviewId, transDraft]);

  const handleAnswer = useCallback(
    (
      qid: string,
      status: QuestionAnswerStatus,
      patch: Partial<{ answerText: string; observation: string; justification: string }> = {},
    ) => {
      if (!interviewId) return;
      answerQuestion(interviewId, qid, { status, ...patch });
    },
    [interviewId],
  );

  const handleStartRec = useCallback(() => audio.beginRecorder(), [audio]);
  const handlePauseRec = useCallback(() => audio.pause(), [audio]);
  const handleResumeRec = useCallback(() => audio.resume(), [audio]);
  const handleStopRec = useCallback(() => {
    audio.stop();
    if (interviewId) {
      setInterviewAudioSummary(interviewId, {
        segmentsCount: audio.segments.length,
        approxDurationMs: audio.elapsedMs,
        supported: audio.capability.supported,
        note: "Áudio em memória apenas. Não foi enviado a servidor.",
      });
    }
  }, [audio, interviewId]);
  const handleDiscardRec = useCallback(() => audio.discardAllData(), [audio]);

  const handleComplete = useCallback(
    (mode: "concluir" | "concluir_com_pendencia") => {
      if (!interviewId) return;
      completeInterview(interviewId, mode, conclusion || undefined);
      setConfirmComplete(false);
      onCompleted?.(interviewId);
      onOpenChange(false);
    },
    [interviewId, conclusion, onCompleted, onOpenChange],
  );

  const durationLabel = useMemo(() => {
    const seconds = Math.floor(audio.elapsedMs / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [audio.elapsedMs]);

  if (!rec_) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrevista</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Nenhuma entrevista selecionada.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const readOnly = rec_.status === "cancelada" || rec_.status === "concluida";
  const showStartButton = rec_.status === "agendada" || rec_.status === "em_preparacao";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[92vh] overflow-y-auto"
          data-testid="interview-workspace"
        >
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{rec_.title}</span>
              <Badge variant="outline">{INTERVIEW_STATUS_LABEL[rec_.status]}</Badge>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-3 text-xs">
              <span>Responsável: {rec_.responsibleLabel}</span>
              <span>Roteiro: {template?.name ?? rec_.templateId}</span>
              <span>Participantes: {rec_.participantIds.length}</span>
              <span>Sessão: {durationLabel}</span>
            </DialogDescription>
          </DialogHeader>

          {showStartButton && !readOnly && (
            <div className="flex justify-end">
              <Button onClick={() => startInterview(rec_.id)}>Iniciar entrevista</Button>
            </div>
          )}

          <Tabs defaultValue="roteiro" className="w-full">
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="roteiro">
                Roteiro ({answeredCount}/{totalQuestions})
              </TabsTrigger>
              <TabsTrigger value="notas">Notas ({rec_.notes.length})</TabsTrigger>
              <TabsTrigger value="transcricao">
                Transcrição ({rec_.transcriptBlocks.length})
              </TabsTrigger>
              <TabsTrigger value="audio">Áudio</TabsTrigger>
            </TabsList>

            <TabsContent value="roteiro" className="space-y-4 pt-4">
              {template && template.sections.length > 0 ? (
                template.sections.map((sec) => (
                  <section key={sec.title} className="space-y-2">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {sec.title}
                    </h3>
                    <ul className="space-y-2">
                      {rec_.questions
                        .filter((q) => q.templateSection === sec.title)
                        .map((q) => (
                          <li
                            key={q.id}
                            className="rounded-md border border-border/60 p-3 space-y-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{q.questionText}</p>
                                <p className="text-xs text-muted-foreground">
                                  {q.required ? "Obrigatória" : "Opcional"} ·{" "}
                                  {QUESTION_STATUS_LABEL[q.status]}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant={q.status === "respondida" ? "default" : "outline"}
                                  onClick={() => handleAnswer(q.id, "respondida")}
                                  disabled={readOnly}
                                >
                                  Respondida
                                </Button>
                                <Button
                                  size="sm"
                                  variant={q.status === "pendente" ? "default" : "outline"}
                                  onClick={() => handleAnswer(q.id, "pendente")}
                                  disabled={readOnly}
                                >
                                  Pendente
                                </Button>
                                <Button
                                  size="sm"
                                  variant={q.status === "ignorada" ? "default" : "outline"}
                                  onClick={() => {
                                    const j = window.prompt(
                                      "Justificativa para ignorar:",
                                      q.justification ?? "",
                                    );
                                    if (j !== null)
                                      handleAnswer(q.id, "ignorada", { justification: j });
                                  }}
                                  disabled={readOnly}
                                >
                                  Ignorar
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              rows={2}
                              value={q.answerText ?? ""}
                              placeholder="Resposta ou observação"
                              onChange={(e) =>
                                handleAnswer(q.id, q.status, { answerText: e.target.value })
                              }
                              disabled={readOnly}
                            />
                          </li>
                        ))}
                    </ul>
                  </section>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Roteiro personalizado: utilize notas e transcrição manual para registrar a
                  entrevista.
                </p>
              )}
            </TabsContent>

            <TabsContent value="notas" className="space-y-4 pt-4">
              <div className="grid gap-2 rounded-md border border-border/60 p-3">
                <Label htmlFor="note-kind">Tipo</Label>
                <Select
                  value={noteDraft.kind}
                  onValueChange={(v) =>
                    setNoteDraft((n) => ({ ...n, kind: v as InterviewNoteKind }))
                  }
                >
                  <SelectTrigger id="note-kind" className="w-full sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {NOTE_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="note-text">Texto da nota</Label>
                <Textarea
                  id="note-text"
                  value={noteDraft.text}
                  onChange={(e) => setNoteDraft((n) => ({ ...n, text: e.target.value }))}
                  rows={3}
                  disabled={readOnly}
                />
                <div className="flex justify-end">
                  <Button onClick={handleAddNote} disabled={readOnly || !noteDraft.text.trim()}>
                    Adicionar nota
                  </Button>
                </div>
              </div>

              <ul className="space-y-2" aria-live="polite">
                {rec_.notes.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhuma nota registrada.</li>
                )}
                {rec_.notes.map((n) => (
                  <li key={n.id} className="rounded-md border border-border/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{NOTE_KIND_LABEL[n.kind]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {n.authorLabel} · {new Date(n.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{n.text}</p>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="transcricao" className="space-y-4 pt-4">
              <Alert>
                <AlertTitle>Transcrição manual</AlertTitle>
                <AlertDescription>Nenhuma IA está ativa nesta etapa.</AlertDescription>
              </Alert>

              <div className="grid gap-2 rounded-md border border-border/60 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <Label htmlFor="trs-time">Horário</Label>
                    <Input
                      id="trs-time"
                      value={transDraft.timeLabel}
                      onChange={(e) => setTransDraft((d) => ({ ...d, timeLabel: e.target.value }))}
                      placeholder="15:07"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor="trs-person">Pessoa</Label>
                    <Input
                      id="trs-person"
                      value={transDraft.personLabel}
                      onChange={(e) =>
                        setTransDraft((d) => ({ ...d, personLabel: e.target.value }))
                      }
                      placeholder="Entrevistado"
                      disabled={readOnly}
                    />
                  </div>
                </div>
                <Label htmlFor="trs-text">Texto</Label>
                <Textarea
                  id="trs-text"
                  value={transDraft.text}
                  onChange={(e) => setTransDraft((d) => ({ ...d, text: e.target.value }))}
                  rows={3}
                  disabled={readOnly}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddTranscriptBlock}
                    disabled={readOnly || !transDraft.text.trim()}
                  >
                    Adicionar bloco
                  </Button>
                </div>
              </div>

              <ul className="space-y-2">
                {rec_.transcriptBlocks.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhum bloco registrado.</li>
                )}
                {rec_.transcriptBlocks.map((b) => (
                  <li
                    key={b.id}
                    className={`rounded-md border p-3 ${
                      b.highlighted ? "border-primary bg-primary/5" : "border-border/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {b.timeLabel} · {b.personLabel} {b.consolidated ? "· consolidado" : ""}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateTranscriptBlock(rec_.id, b.id, { highlighted: !b.highlighted })
                          }
                          disabled={readOnly}
                        >
                          {b.highlighted ? "Desmarcar" : "Destacar"}
                        </Button>
                        {!b.consolidated && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTranscriptBlock(rec_.id, b.id)}
                            disabled={readOnly}
                            aria-label="Remover bloco"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{b.text}</p>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4 pt-4">
              {!audio.capability.supported ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  <AlertTitle>Gravação de áudio indisponível</AlertTitle>
                  <AlertDescription>
                    Seu navegador não suporta gravação, mas o restante da entrevista continua
                    funcionando. Use notas e transcrição manual normalmente.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 p-3">
                    <Badge variant="outline">Estado: {audio.context.state}</Badge>
                    <span className="text-sm">Cronômetro: {durationLabel}</span>
                    <span className="text-sm">Segmentos: {audio.segments.length}</span>
                    <span className="text-sm">Nível: {(audio.level * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {audio.context.state === "idle" && (
                      <Button onClick={audio.requestPermission}>
                        <Mic className="mr-2 h-4 w-4" aria-hidden /> Preparar microfone
                      </Button>
                    )}
                    <Button onClick={handleStartRec} disabled={isRecording || isPaused}>
                      <Mic className="mr-2 h-4 w-4" aria-hidden /> Iniciar
                    </Button>
                    <Button variant="outline" onClick={handlePauseRec} disabled={!isRecording}>
                      <Pause className="mr-2 h-4 w-4" aria-hidden /> Pausar
                    </Button>
                    <Button variant="outline" onClick={handleResumeRec} disabled={!isPaused}>
                      <Play className="mr-2 h-4 w-4" aria-hidden /> Continuar
                    </Button>
                    <Button variant="outline" onClick={handleStopRec} disabled={!audioActive}>
                      <Square className="mr-2 h-4 w-4" aria-hidden /> Encerrar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleDiscardRec}
                      disabled={audio.segments.length === 0}
                    >
                      <MicOff className="mr-2 h-4 w-4" aria-hidden /> Descartar
                    </Button>
                  </div>
                  <Alert>
                    <AlertDescription>
                      O áudio não será preservado após fechar ou recarregar esta página nesta etapa.
                      Nenhuma transcrição automática está ativa.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Continuar depois
            </Button>
            {rec_.status === "em_andamento" && (
              <Button variant="outline" onClick={() => pauseInterview(rec_.id)}>
                Pausar entrevista
              </Button>
            )}
            {rec_.status === "pausada" && (
              <Button variant="outline" onClick={() => resumeInterview(rec_.id)}>
                Retomar
              </Button>
            )}
            {!readOnly && <Button onClick={() => setConfirmComplete(true)}>Finalizar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar entrevista</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {validation && !validation.ok && (
                  <>
                    {validation.pending.length > 0 && (
                      <div>
                        <p className="font-medium text-foreground">Pendências:</p>
                        <ul className="list-disc pl-5 text-sm">
                          {validation.pending.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div>
                        <p className="font-medium text-foreground">Atenção:</p>
                        <ul className="list-disc pl-5 text-sm">
                          {validation.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                <Label htmlFor="entrev-concl" className="mt-2 block">
                  Conclusão (opcional)
                </Label>
                <Textarea
                  id="entrev-concl"
                  rows={3}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar trabalhando</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleComplete("concluir_com_pendencia")}>
              Concluir com pendências
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleComplete("concluir")}
              disabled={audioActive || (validation ? validation.pending.length > 0 : false)}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
