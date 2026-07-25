/**
 * LV-11 — Workspace de diligência.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { CHECKLIST_STATE_LABEL, INTERVIEW_STATUS_LABEL, NOTE_KIND_LABEL } from "./interview-labels";
import {
  CHECKLIST_STATES,
  NOTE_KINDS,
  type DiligenceRecord,
  type InterviewNoteKind,
} from "./interview-types";
import {
  addChecklistItem,
  addDiligenceNote,
  addDiligencePendingItem,
  completeDiligence,
  getInterviewRecord,
  pauseDiligence,
  resumeDiligence,
  setChecklistItemState,
  setDiligenceLocation,
  startDiligence,
  validateDiligenceCompletion,
} from "./interview-mock-store";
import { isValidCoordinate } from "./interview-filters";
import { MediaMockPanel } from "./MediaMockPanel";

export type DiligenceWorkspaceDialogProps = {
  diligenceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (id: string) => void;
};

function useDiligenceSnapshot(id: string | null): DiligenceRecord | null {
  const [snap, setSnap] = useState<DiligenceRecord | null>(null);
  useEffect(() => {
    if (!id) {
      setSnap(null);
      return;
    }
    const load = () => {
      const rec = getInterviewRecord(id);
      setSnap(rec && rec.kind === "diligencia" ? rec : null);
    };
    load();
    const t = setInterval(load, 200);
    return () => clearInterval(t);
  }, [id]);
  return snap;
}

export type LocationErrorKind =
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | null;

export function DiligenceWorkspaceDialog({
  diligenceId,
  open,
  onOpenChange,
  onCompleted,
}: DiligenceWorkspaceDialogProps) {
  const rec = useDiligenceSnapshot(diligenceId);

  const [newChecklist, setNewChecklist] = useState("");
  const [newPending, setNewPending] = useState("");
  const [noteDraft, setNoteDraft] = useState<{ text: string; kind: InterviewNoteKind }>({
    text: "",
    kind: "observacao",
  });
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [locError, setLocError] = useState<LocationErrorKind>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [conclusion, setConclusion] = useState("");
  const [confirmClearLoc, setConfirmClearLoc] = useState(false);

  const validation = useMemo(() => {
    if (!rec) return null;
    return validateDiligenceCompletion(rec, {
      hasUnsavedNoteDraft: noteDraft.text.trim().length > 0,
      hasUnsavedPhoto: false,
    });
  }, [rec, noteDraft.text]);

  const handleUseDevice = useCallback(() => {
    setLocError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!diligenceId) return;
        setDiligenceLocation(diligenceId, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
          source: "device",
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocError("permission_denied");
        else if (err.code === err.TIMEOUT) setLocError("timeout");
        else setLocError("unavailable");
      },
      { timeout: 8000 },
    );
  }, [diligenceId]);

  const handleManualLocation = useCallback(() => {
    if (!diligenceId) return;
    const lat = Number(manualLat.replace(",", "."));
    const lng = Number(manualLng.replace(",", "."));
    if (!isValidCoordinate(lat, lng)) {
      toast.error("Coordenadas inválidas");
      return;
    }
    setDiligenceLocation(diligenceId, {
      latitude: lat,
      longitude: lng,
      capturedAt: new Date().toISOString(),
      source: "manual",
    });
    setManualLat("");
    setManualLng("");
  }, [diligenceId, manualLat, manualLng]);

  const handleComplete = useCallback(
    (mode: "concluir" | "concluir_com_pendencia") => {
      if (!diligenceId) return;
      completeDiligence(diligenceId, mode, conclusion || undefined);
      setConfirmComplete(false);
      onCompleted?.(diligenceId);
      onOpenChange(false);
    },
    [diligenceId, conclusion, onCompleted, onOpenChange],
  );

  if (!rec) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diligência</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Nenhuma diligência selecionada.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const readOnly = rec.status === "cancelada" || rec.status === "concluida";
  const showStart = rec.status === "agendada" || rec.status === "em_preparacao";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[92vh] overflow-y-auto"
          data-testid="diligence-workspace"
        >
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{rec.title}</span>
              <Badge variant="outline">{INTERVIEW_STATUS_LABEL[rec.status]}</Badge>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-3 text-xs">
              <span>Responsável: {rec.responsibleLabel}</span>
              <span>Endereço: {rec.address ?? "—"}</span>
              <span>Processo: {rec.caseId ?? "—"}</span>
            </DialogDescription>
          </DialogHeader>

          {showStart && !readOnly && (
            <div className="flex justify-end">
              <Button onClick={() => startDiligence(rec.id)}>Iniciar diligência</Button>
            </div>
          )}

          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="checklist">Checklist ({rec.checklistItems.length})</TabsTrigger>
              <TabsTrigger value="notas">Notas ({rec.notes.length})</TabsTrigger>
              <TabsTrigger value="local">Localização</TabsTrigger>
              <TabsTrigger value="fotos">Fotos ({rec.photos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-4 pt-4">
              <ul className="space-y-2">
                {rec.checklistItems.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhum item cadastrado.</li>
                )}
                {rec.checklistItems.map((it) => (
                  <li key={it.id} className="rounded-md border border-border/60 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">{it.text}</p>
                      <Select
                        value={it.state}
                        onValueChange={(v) =>
                          setChecklistItemState(
                            rec.id,
                            it.id,
                            v as (typeof CHECKLIST_STATES)[number],
                          )
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-40" aria-label="Situação do item">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHECKLIST_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {CHECKLIST_STATE_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row">
                <Input
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  placeholder="Adicionar item ao checklist"
                  aria-label="Novo item do checklist"
                  disabled={readOnly}
                />
                <Button
                  onClick={() => {
                    if (!newChecklist.trim()) return;
                    addChecklistItem(rec.id, newChecklist);
                    setNewChecklist("");
                  }}
                  disabled={readOnly || !newChecklist.trim()}
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row">
                <Input
                  value={newPending}
                  onChange={(e) => setNewPending(e.target.value)}
                  placeholder="Registrar pendência"
                  aria-label="Nova pendência"
                  disabled={readOnly}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newPending.trim()) return;
                    addDiligencePendingItem(rec.id, newPending);
                    setNewPending("");
                  }}
                  disabled={readOnly || !newPending.trim()}
                >
                  Registrar
                </Button>
              </div>
              {rec.pendingItems.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {rec.pendingItems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="notas" className="space-y-4 pt-4">
              <div className="grid gap-2 rounded-md border border-border/60 p-3">
                <Label htmlFor="dil-note-kind">Tipo</Label>
                <Select
                  value={noteDraft.kind}
                  onValueChange={(v) =>
                    setNoteDraft((n) => ({ ...n, kind: v as InterviewNoteKind }))
                  }
                >
                  <SelectTrigger id="dil-note-kind" className="w-full sm:max-w-xs">
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
                <Label htmlFor="dil-note-text">Texto</Label>
                <Textarea
                  id="dil-note-text"
                  value={noteDraft.text}
                  onChange={(e) => setNoteDraft((n) => ({ ...n, text: e.target.value }))}
                  rows={3}
                  disabled={readOnly}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (!noteDraft.text.trim()) return;
                      addDiligenceNote(rec.id, noteDraft);
                      setNoteDraft({ text: "", kind: noteDraft.kind });
                    }}
                    disabled={readOnly || !noteDraft.text.trim()}
                  >
                    Adicionar nota
                  </Button>
                </div>
              </div>
              <ul className="space-y-2" aria-live="polite">
                {rec.notes.map((n) => (
                  <li key={n.id} className="rounded-md border border-border/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{NOTE_KIND_LABEL[n.kind]}</Badge>
                      <span className="text-xs text-muted-foreground">{n.authorLabel}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{n.text}</p>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="local" className="space-y-4 pt-4">
              <Alert>
                <AlertDescription>
                  A localização é opcional e permanece somente nesta sessão. Nada é enviado ao
                  servidor.
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleUseDevice} disabled={readOnly}>
                  <MapPin className="mr-2 h-4 w-4" aria-hidden />
                  Usar localização do dispositivo
                </Button>
                {rec.location && (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmClearLoc(true)}
                    disabled={readOnly}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Remover localização
                  </Button>
                )}
              </div>
              {locError && (
                <Alert role="alert">
                  <AlertDescription>
                    {locError === "permission_denied" && "Permissão negada pelo usuário."}
                    {locError === "unavailable" && "Localização indisponível no momento."}
                    {locError === "timeout" && "Tempo de espera excedido."}
                    {locError === "unsupported" && "API de geolocalização não suportada."}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2 rounded-md border border-border/60 p-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="dil-lat">Latitude manual</Label>
                  <Input
                    id="dil-lat"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    inputMode="decimal"
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="dil-lng">Longitude manual</Label>
                  <Input
                    id="dil-lng"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    inputMode="decimal"
                    disabled={readOnly}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button onClick={handleManualLocation} disabled={readOnly}>
                    Salvar localização manual
                  </Button>
                </div>
              </div>
              {rec.location && (
                <div className="rounded-md border border-border/60 p-3 text-sm">
                  <p>
                    Latitude: {rec.location.latitude} · Longitude: {rec.location.longitude}
                  </p>
                  {rec.location.accuracyMeters !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Precisão: ±{rec.location.accuracyMeters.toFixed(0)} m · Fonte:{" "}
                      {rec.location.source}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="fotos" className="space-y-4 pt-4">
              <MediaMockPanel diligenceId={rec.id} photos={rec.photos} readOnly={readOnly} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Continuar depois
            </Button>
            {rec.status === "em_andamento" && (
              <Button variant="outline" onClick={() => pauseDiligence(rec.id)}>
                Pausar
              </Button>
            )}
            {rec.status === "pausada" && (
              <Button variant="outline" onClick={() => resumeDiligence(rec.id)}>
                Retomar
              </Button>
            )}
            {!readOnly && <Button onClick={() => setConfirmComplete(true)}>Finalizar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClearLoc} onOpenChange={setConfirmClearLoc}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover localização?</AlertDialogTitle>
            <AlertDialogDescription>
              A localização registrada será removida desta sessão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (diligenceId) setDiligenceLocation(diligenceId, null);
                setConfirmClearLoc(false);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar diligência</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {validation && !validation.ok && validation.pending.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Pendências:</p>
                    <ul className="list-disc pl-5 text-sm">
                      {validation.pending.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Label htmlFor="dil-concl" className="mt-2 block">
                  Conclusão (opcional)
                </Label>
                <Textarea
                  id="dil-concl"
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
              disabled={validation ? validation.pending.length > 0 : false}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
