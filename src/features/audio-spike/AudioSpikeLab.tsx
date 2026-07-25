import { useState } from "react";
import { AlertCircle, Mic, MicOff, Pause, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { AudioDeviceSelector } from "./AudioDeviceSelector";
import { AudioLevelMeter } from "./AudioLevelMeter";
import { AudioSegmentsPanel } from "./AudioSegmentsPanel";
import { AudioDiagnosticsPanel } from "./AudioDiagnosticsPanel";
import { useAudioRecorder } from "./useAudioRecorder";
import { describeState } from "./audio-state-machine";
import { formatDurationMs } from "./audio-diagnostics";
import { AUDIO_DEMO_NOTICE, AUDIO_MESSAGES } from "./audio-types";

export function AudioSpikeLab() {
  const rec = useAudioRecorder({
    segmentDurationMs: 60_000,
    overlapMs: 2_000,
    timesliceMs: 1_000,
  });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDeviceChange, setConfirmDeviceChange] = useState<string | null>(null);

  const { context, capability } = rec;

  const isRecording = context.state === "recording";
  const isPaused = context.state === "paused";
  const isCompleted = context.state === "completed";
  const isRecovering = context.state === "recovering";
  const busy =
    context.state === "requesting_permission" || context.state === "stopping" || isRecovering;

  const handleDeviceChange = (id: string) => {
    if (isRecording || isPaused) {
      setConfirmDeviceChange(id);
      return;
    }
    rec.setDeviceId(id);
  };

  const confirmChangeDevice = () => {
    if (!confirmDeviceChange) return;
    rec.setDeviceId(confirmDeviceChange);
    setConfirmDeviceChange(null);
  };

  const snapshot = {
    capability,
    microphoneCount: rec.devices.length,
    selectedDeviceLabel: rec.devices.find((d) => d.deviceId === rec.deviceId)?.label || "",
    recordedMs: rec.elapsedMs,
    chunksReceived: rec.chunksReceived,
    segmentsCompleted: rec.segments.filter((s) => !s.incomplete).length,
    segmentsIncomplete: rec.segments.filter((s) => s.incomplete).length,
    failures: rec.failuresCount,
    recoveries: rec.interruptionCount,
    approxMemoryBytes: rec.approxBytes,
    supportsPause: rec.supportsPause,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="audio-spike-lab">
      <header className="space-y-2">
        <Badge variant="outline" className="text-[11px] uppercase tracking-widest">
          LV-10 · Spike técnico
        </Badge>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Laboratório de gravação de áudio
        </h1>
        <p className="text-sm text-muted-foreground">
          Prova técnica exclusiva de captura, segmentação, fila local e recuperação. A
          funcionalidade completa de <strong>Entrevistas e diligências</strong> será entregue em
          etapa futura.
        </p>
      </header>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Gravação local temporária</AlertTitle>
        <AlertDescription>{AUDIO_DEMO_NOTICE}</AlertDescription>
      </Alert>

      {context.state === "unsupported" ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{AUDIO_MESSAGES.unsupported}</AlertTitle>
          <AlertDescription>
            {capability.reason ?? "Ambiente incompatível com gravação de áudio."}
          </AlertDescription>
        </Alert>
      ) : null}

      {context.state === "error" && context.error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Falha</AlertTitle>
          <AlertDescription>{context.error}</AlertDescription>
        </Alert>
      ) : null}

      {isRecovering ? (
        <Alert role="alert" aria-busy="true">
          <AlertTitle>{AUDIO_MESSAGES.deviceDisconnected}</AlertTitle>
          <AlertDescription>
            A recuperação após fechar ou recarregar a página dependerá de armazenamento local ou
            backend em etapa futura.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AudioDeviceSelector
              devices={rec.devices}
              deviceId={rec.deviceId}
              onChange={handleDeviceChange}
              disabled={busy}
            />
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Estado</div>
              <div
                className="font-display text-lg font-semibold"
                aria-live="polite"
                aria-busy={busy}
              >
                {describeState(context.state)}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                MIME: {capability.selectedMimeType ?? "n/d"} · Codec: {capability.codec ?? "n/d"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-3xl tabular-nums" aria-label="Tempo gravado">
              {formatDurationMs(rec.elapsedMs)}
            </div>
            <AudioLevelMeter level={rec.level} active={isRecording || isPaused} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={rec.requestPermission}
              disabled={
                context.state === "recording" ||
                context.state === "paused" ||
                context.state === "unsupported" ||
                context.state === "ready"
              }
              aria-busy={context.state === "requesting_permission"}
            >
              <Mic className="mr-2 h-4 w-4" />
              Preparar microfone
            </Button>
            <Button
              variant="default"
              onClick={rec.beginRecorder}
              disabled={context.state !== "ready" && context.state !== "completed"}
            >
              <Play className="mr-2 h-4 w-4" />
              Iniciar gravação
            </Button>
            <Button variant="outline" onClick={rec.pause} disabled={!isRecording}>
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </Button>
            <Button variant="outline" onClick={rec.resume} disabled={!isPaused}>
              <Play className="mr-2 h-4 w-4" />
              Continuar
            </Button>
            <Button variant="outline" onClick={rec.stop} disabled={!isRecording && !isPaused}>
              <Square className="mr-2 h-4 w-4" />
              Encerrar
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDiscard(true)}
              disabled={rec.segments.length === 0 && !isRecording && !isPaused && !isCompleted}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            {isRecovering ? (
              <Button variant="secondary" onClick={rec.tryRecover}>
                <MicOff className="mr-2 h-4 w-4" />
                Tentar recuperar
              </Button>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Blocos" value={String(rec.chunksReceived)} />
            <Stat label="Segmentos" value={String(rec.segments.length)} />
            <Stat label="Interrupções" value={String(rec.interruptionCount)} />
            <Stat label="Falhas" value={String(rec.failuresCount)} />
          </dl>
        </CardContent>
      </Card>

      <AudioSegmentsPanel
        segments={rec.segments}
        items={rec.queue.items}
        onProcess={rec.processSegment}
        onRetry={rec.retry}
        onDiscard={rec.discardOne}
      />

      <AudioDiagnosticsPanel snapshot={snapshot} />

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os segmentos e prévias locais serão liberados da memória. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                rec.discardAllData();
                setConfirmDiscard(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeviceChange !== null}
        onOpenChange={(open) => !open && setConfirmDeviceChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar microfone durante gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              A gravação atual será encerrada com segurança e os segmentos já capturados serão
              preservados antes de aplicar o novo microfone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter atual</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeDevice}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/70 bg-muted/20 p-2">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-mono text-base">{value}</dd>
    </div>
  );
}
