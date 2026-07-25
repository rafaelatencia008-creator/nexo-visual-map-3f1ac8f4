import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AudioQueueItemState, AudioSegment } from "./audio-types";
import { formatDurationMs, formatBytes } from "./audio-diagnostics";

const STATUS_LABEL: Record<string, string> = {
  captured: "Capturado",
  queued: "Na fila",
  processing: "Processando",
  ready: "Pronto",
  failed: "Falhou",
  retrying: "Nova tentativa",
  discarded: "Descartado",
  incomplete: "Incompleto",
};

export function AudioSegmentsPanel({
  segments,
  items,
  onProcess,
  onRetry,
  onDiscard,
}: {
  segments: readonly AudioSegment[];
  items: Readonly<Record<string, AudioQueueItemState>>;
  onProcess: (id: string) => void;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Segmentos capturados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum segmento capturado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {segments.map((seg) => {
              const item = items[seg.id];
              return (
                <li
                  key={seg.id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{seg.id}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {STATUS_LABEL[item?.status ?? seg.status] ??
                            item?.status ??
                            seg.status}
                        </Badge>
                        {seg.incomplete ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Incompleto
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground break-words">
                        {formatDurationMs(seg.durationMs)} · {formatBytes(seg.sizeBytes)}
                        {" · sobreposição "}
                        {seg.overlapBeforeMs}ms
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item?.status === "queued" || item?.status === "retrying" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onProcess(seg.id)}
                        >
                          Processar
                        </Button>
                      ) : null}
                      {item?.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRetry(seg.id)}
                        >
                          Tentar novamente
                        </Button>
                      ) : null}
                      {item?.status === "ready" ? (
                        <SegmentPlayer url={item.previewUrl} />
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDiscard(seg.id)}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                  {item?.lastError ? (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {item.lastError}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentPlayer({ url }: { url: string | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    return () => {
      try {
        ref.current?.pause();
      } catch {
        /* noop */
      }
    };
  }, []);
  const src = useMemo(() => url ?? "", [url]);
  if (!src) return null;
  return (
    <div className="flex items-center gap-2">
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        preload="none"
        controls
      />
      <span className="sr-only">{playing ? "Reproduzindo" : "Parado"}</span>
    </div>
  );
}
