/**
 * LV-09.4 — Visualizador documental (mock).
 *
 * Todas as prévias são reconstruídas a partir do par (documentId, versionId).
 * Nenhum arquivo real é buscado, transmitido ou armazenado.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  AlertCircle,
  WifiOff,
  Lock,
  FileWarning,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  DocumentRecord,
  DocumentVersion,
} from "./document-types";
import {
  classifyPreview,
  buildTextPage,
  buildSheetPreview,
  buildImagePreview,
  buildAudioPreview,
  buildVideoPreview,
  buildThumbnails,
  clampPage,
  clampZoom,
  DEFAULT_ZOOM,
  fitWidthZoom,
  formatPageIndicator,
  getPreviewPageCount,
  nextRotation,
  PREVIEW_DEMO_NOTICE,
  PREVIEW_KIND_LABEL,
  PREVIEW_STATUS_LABEL,
  zoomIn,
  zoomOut,
  type PreviewKind,
  type PreviewStatus,
} from "./document-preview";

export interface DocumentViewerDialogProps {
  open: boolean;
  document: DocumentRecord | null;
  /** Versão inicial (opcional). Padrão: versão atual do documento. */
  initialVersionId?: string;
  /** Estado forçado (opcional) — útil para os cenários de demonstração. */
  forcedStatus?: PreviewStatus;
  onClose: () => void;
}

export function DocumentViewerDialog({
  open,
  document,
  initialVersionId,
  forcedStatus,
  onClose,
}: DocumentViewerDialogProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("preparing");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [pageAnnouncement, setPageAnnouncement] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const thumbListRef = useRef<HTMLDivElement | null>(null);

  const version: DocumentVersion | null = useMemo(() => {
    if (!document) return null;
    if (selectedVersionId) {
      const found = document.versions.find((v) => v.id === selectedVersionId);
      if (found) return found;
    }
    const initial = initialVersionId
      ? document.versions.find((v) => v.id === initialVersionId)
      : undefined;
    if (initial) return initial;
    return (
      document.versions.find((v) => v.version === document.currentVersion) ??
      document.versions[0] ??
      null
    );
  }, [document, selectedVersionId, initialVersionId]);

  const kind: PreviewKind = useMemo(() => {
    if (!version) return "unsupported";
    return classifyPreview(version.fileName, version.mimeType);
  }, [version]);

  const pageCount = useMemo(() => {
    if (!document || !version) return 0;
    return getPreviewPageCount(kind, document.id, version.id);
  }, [document, version, kind]);

  const thumbs = useMemo(() => buildThumbnails(pageCount), [pageCount]);

  // Preparação da prévia
  useEffect(() => {
    if (!open || !document || !version) return;
    if (forcedStatus) {
      setStatus(forcedStatus);
      return;
    }
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      setStatus("offline");
      return;
    }
    if (kind === "unsupported") {
      setStatus("unsupported");
      return;
    }
    setStatus("preparing");
    const t = setTimeout(() => setStatus("ready"), 180);
    return () => clearTimeout(t);
  }, [open, document, version, kind, forcedStatus]);

  // Reset ao abrir / trocar versão
  useEffect(() => {
    if (!open) return;
    setPage(1);
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
    setPageAnnouncement("");
  }, [open, version?.id]);

  // Escape sai do fullscreen antes de fechar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) {
          e.preventDefault();
          setFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fullscreen]);

  const goPrev = useCallback(() => {
    setPage((p) => {
      const next = clampPage(p - 1, pageCount);
      setPageAnnouncement(formatPageIndicator(next, pageCount));
      return next;
    });
  }, [pageCount]);

  const goNext = useCallback(() => {
    setPage((p) => {
      const next = clampPage(p + 1, pageCount);
      setPageAnnouncement(formatPageIndicator(next, pageCount));
      return next;
    });
  }, [pageCount]);

  const goTo = useCallback(
    (n: number) => {
      const next = clampPage(n, pageCount);
      setPage(next);
      setPageAnnouncement(formatPageIndicator(next, pageCount));
    },
    [pageCount],
  );

  const handleFit = useCallback(() => {
    const w = stageRef.current?.clientWidth ?? 0;
    setZoom(fitWidthZoom(w));
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => zoomIn(z)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => zoomOut(z)), []);
  const handleRotate = useCallback(() => setRotation((r) => nextRotation(r)), []);
  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  const handleRetry = useCallback(() => {
    setStatus("preparing");
    const t = window.setTimeout(() => setStatus("ready"), 180);
    return () => window.clearTimeout(t);
  }, []);

  if (!document || !version) return null;

  const busy = status === "preparing";
  const canInteract = status === "ready";
  const dialogClass = fullscreen
    ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 sm:rounded-none"
    : "max-w-5xl w-[95vw] max-h-[92vh] p-0";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        if (fullscreen) {
          setFullscreen(false);
          return;
        }
        onClose();
      }}
    >
      <DialogContent
        className={`${dialogClass} flex flex-col overflow-hidden`}
        aria-label={`Visualizar ${document.name}`}
      >
        <DialogHeader className="border-b p-4 sm:p-5 space-y-2">
          <DialogTitle className="break-words text-base sm:text-lg">
            {document.name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">v{version.version}</Badge>
            <Badge variant="outline">{PREVIEW_KIND_LABEL[kind]}</Badge>
            <span className="text-muted-foreground break-all">
              {version.fileName} · {version.fileSizeLabel}
            </span>
          </DialogDescription>
          {document.versions.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label
                htmlFor="doc-viewer-version"
                className="text-muted-foreground text-xs"
              >
                Visualizar versão:
              </label>
              <select
                id="doc-viewer-version"
                aria-label="Escolher versão para visualizar"
                className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                value={version.id}
                onChange={(e) => setSelectedVersionId(e.target.value)}
              >
                {document.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} — {v.fileName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs">{PREVIEW_DEMO_NOTICE}</p>
        </DialogHeader>

        {/* Toolbar */}
        <div
          role="toolbar"
          aria-label="Controles do visualizador"
          className="flex flex-wrap items-center gap-1 border-b p-2 sm:gap-2 sm:p-3"
        >
          <Button
            size="sm"
            variant="outline"
            aria-label="Página anterior"
            onClick={goPrev}
            disabled={!canInteract || page <= 1}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span
            aria-live="polite"
            className="text-xs sm:text-sm min-w-[6.5rem] text-center"
          >
            {formatPageIndicator(page, pageCount)}
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Próxima página"
            onClick={goNext}
            disabled={!canInteract || page >= pageCount}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            size="sm"
            variant="outline"
            aria-label="Zoom menos"
            onClick={handleZoomOut}
            disabled={!canInteract}
          >
            <ZoomOut className="h-4 w-4" aria-hidden />
          </Button>
          <span
            aria-label="Zoom atual"
            className="text-xs sm:text-sm min-w-[3.5rem] text-center"
          >
            {zoom}%
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Zoom mais"
            onClick={handleZoomIn}
            disabled={!canInteract}
          >
            <ZoomIn className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Ajustar à largura"
            onClick={handleFit}
            disabled={!canInteract}
          >
            <Move className="h-4 w-4" aria-hidden />
            <span className="ml-1 hidden sm:inline">Ajustar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Rotacionar 90 graus"
            onClick={handleRotate}
            disabled={!canInteract}
          >
            <RotateCw className="h-4 w-4" aria-hidden />
          </Button>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              onClick={toggleFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Fechar visualizador"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* Live region para leitores de tela */}
        <div role="status" aria-live="polite" className="sr-only">
          {pageAnnouncement}
        </div>

        <div
          className="flex flex-1 min-h-0 flex-col sm:flex-row"
          aria-busy={busy}
        >
          {/* Miniaturas */}
          {canInteract && pageCount > 1 ? (
            <nav
              aria-label="Miniaturas das páginas"
              ref={thumbListRef}
              className="border-b sm:border-b-0 sm:border-r bg-muted/30 shrink-0 sm:w-32 overflow-auto p-2"
            >
              <ul className="flex gap-2 sm:flex-col">
                {thumbs.map((t) => (
                  <li key={t.index}>
                    <button
                      type="button"
                      onClick={() => goTo(t.index)}
                      aria-label={t.label}
                      aria-current={t.index === page ? "page" : undefined}
                      className={`flex h-16 w-12 sm:h-20 sm:w-full shrink-0 flex-col items-center justify-center rounded-md border text-xs transition ${
                        t.index === page
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span aria-hidden>{t.index}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* Área principal */}
          <div
            ref={stageRef}
            className="flex-1 min-h-0 overflow-auto bg-muted/20 p-4 sm:p-6"
          >
            {status === "preparing" ? (
              <PreviewStateBlock
                icon={Loader2}
                spinning
                title={PREVIEW_STATUS_LABEL.preparing}
                description="Estamos organizando as páginas desta prévia demonstrativa."
              />
            ) : status === "offline" ? (
              <PreviewStateBlock
                icon={WifiOff}
                title={PREVIEW_STATUS_LABEL.offline}
                description="Reconecte-se para visualizar este documento."
                action={<Button onClick={handleRetry}>Tentar novamente</Button>}
              />
            ) : status === "forbidden" ? (
              <PreviewStateBlock
                icon={Lock}
                title={PREVIEW_STATUS_LABEL.forbidden}
                description="Você não tem permissão para visualizar este documento."
              />
            ) : status === "unsupported" ? (
              <PreviewStateBlock
                icon={FileWarning}
                title={PREVIEW_STATUS_LABEL.unsupported}
                description="Este tipo de arquivo não possui prévia demonstrativa. As demais funções continuam disponíveis."
              />
            ) : status === "error" ? (
              <PreviewStateBlock
                icon={AlertCircle}
                title={PREVIEW_STATUS_LABEL.error}
                description="Tente novamente em instantes."
                action={<Button onClick={handleRetry}>Tentar novamente</Button>}
              />
            ) : (
              <PreviewSurface
                documentId={document.id}
                versionId={version.id}
                kind={kind}
                page={page}
                zoom={zoom}
                rotation={rotation}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStateBlock({
  icon: Icon,
  title,
  description,
  action,
  spinning,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  spinning?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className={`h-6 w-6 ${spinning ? "animate-spin" : ""}`} aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
      {action ?? null}
    </div>
  );
}

function PreviewSurface({
  documentId,
  versionId,
  kind,
  page,
  zoom,
  rotation,
}: {
  documentId: string;
  versionId: string;
  kind: PreviewKind;
  page: number;
  zoom: number;
  rotation: number;
}) {
  const style: React.CSSProperties = {
    transform: `rotate(${rotation}deg) scale(${clampZoom(zoom) / 100})`,
    transformOrigin: "top center",
    transition: "transform 120ms ease-out",
  };

  if (kind === "text") {
    const p = buildTextPage(documentId, versionId, page - 1);
    return (
      <article
        aria-label={`Página ${page}`}
        className="mx-auto w-full max-w-2xl"
        style={style}
      >
        <div className="rounded-md border bg-background p-6 shadow-sm sm:p-8">
          <h4 className="font-display mb-4 text-xl font-semibold">{p.title}</h4>
          {p.paragraphs.map((para, idx) => (
            <p key={idx} className="mb-3 text-sm leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      </article>
    );
  }

  if (kind === "sheet") {
    const s = buildSheetPreview(documentId, versionId);
    return (
      <div className="mx-auto w-full max-w-4xl" style={style}>
        <div className="rounded-md border bg-background shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                {s.headers.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row, i) => (
                <tr key={i} className={i % 2 ? "bg-muted/20" : ""}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b border-border/50 px-3 py-2"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (kind === "image") {
    const img = buildImagePreview(documentId, versionId);
    return (
      <div className="mx-auto w-full max-w-2xl" style={style}>
        <div
          role="img"
          aria-label={img.label}
          className="aspect-video w-full rounded-md border shadow-sm"
          style={{
            background: `linear-gradient(135deg, hsl(${img.hue} 70% 55%), hsl(${img.hue2} 70% 45%))`,
          }}
        />
      </div>
    );
  }

  if (kind === "audio") {
    const a = buildAudioPreview(documentId, versionId);
    return (
      <div className="mx-auto w-full max-w-xl" style={style}>
        <div className="rounded-md border bg-background p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">Player de áudio (demonstrativo)</p>
            <span className="text-muted-foreground text-xs">
              00:00 / {a.durationLabel}
            </span>
          </div>
          <div className="mt-4 flex h-16 items-end gap-0.5">
            {a.waveform.map((h, i) => (
              <span
                key={i}
                aria-hidden
                className="flex-1 rounded-sm bg-primary/70"
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
          <div className="bg-muted/50 mt-4 h-1.5 w-full rounded-full">
            <div className="bg-primary h-1.5 w-1/3 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const v = buildVideoPreview(documentId, versionId);
  return (
    <div className="mx-auto w-full max-w-3xl" style={style}>
      <div
        role="img"
        aria-label="Vídeo (demonstrativo)"
        className="aspect-video w-full overflow-hidden rounded-md border shadow-sm"
        style={{
          background: `linear-gradient(135deg, hsl(${v.hue} 60% 25%), hsl(${(v.hue + 30) % 360} 70% 15%))`,
        }}
      >
        <div className="flex h-full items-center justify-center">
          <span className="rounded-full bg-white/20 px-5 py-3 text-white backdrop-blur">
            ▶ {v.durationLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
