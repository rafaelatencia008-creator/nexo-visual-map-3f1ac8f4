/**
 * LV-11 — Painel de mídia (fotos mock) da diligência.
 *
 * Usa URL.createObjectURL para exibir miniaturas. Revoga URLs no unmount
 * e ao remover fotos. Nada é enviado ao servidor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronUp, Star, Trash2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ACCEPTED_PHOTO_MIME_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_PHOTO_SIZE_BYTES,
  PHOTO_CATEGORIES,
  type DiligencePhotoCategory,
  type DiligencePhotoMock,
} from "./interview-types";
import { PHOTO_CATEGORY_LABEL } from "./interview-labels";
import {
  addDiligencePhoto,
  movePhoto,
  removeDiligencePhoto,
  updateDiligencePhoto,
} from "./interview-mock-store";

export type MediaMockPanelProps = {
  diligenceId: string;
  photos: readonly DiligencePhotoMock[];
  readOnly?: boolean;
};

export function isAcceptedPhotoMime(mime: string): boolean {
  return (ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(mime);
}

export function isPhotoSizeAcceptable(size: number): boolean {
  return size > 0 && size <= MAX_PHOTO_SIZE_BYTES;
}

export function MediaMockPanel({ diligenceId, photos, readOnly }: MediaMockPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<DiligencePhotoCategory>("visao_geral");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const createdUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const set = createdUrlsRef.current;
    return () => {
      if (typeof URL === "undefined" || !URL.revokeObjectURL) return;
      for (const url of set) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* noop */
        }
      }
      set.clear();
    };
  }, []);

  const totalSizeLabel = useMemo(() => {
    const totalKb = photos.reduce((s, p) => s + p.sizeBytes, 0) / 1024;
    if (totalKb < 1024) return `${totalKb.toFixed(0)} KB`;
    return `${(totalKb / 1024).toFixed(1)} MB`;
  }, [photos]);

  const onSelectFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (!isAcceptedPhotoMime(file.type)) {
          toast.error(`Formato não aceito: ${file.name}`);
          continue;
        }
        if (!isPhotoSizeAcceptable(file.size)) {
          toast.error(`Tamanho acima do limite: ${file.name}`);
          continue;
        }
        let url: string | undefined;
        try {
          url = URL.createObjectURL(file);
          createdUrlsRef.current.add(url);
        } catch {
          url = undefined;
        }
        addDiligencePhoto(diligenceId, {
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          category,
          objectUrl: url,
        });
      }
    },
    [category, diligenceId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full gap-2 sm:max-w-xs">
          <Label htmlFor="pho-cat">Categoria da próxima foto</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DiligencePhotoCategory)}>
            <SelectTrigger id="pho-cat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {PHOTO_CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="sr-only"
            aria-label="Selecionar fotos"
            onChange={(e) => {
              onSelectFiles(e.target.files);
              e.target.value = "";
            }}
            disabled={readOnly}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={readOnly}
          >
            <Camera className="mr-2 h-4 w-4" aria-hidden />
            Adicionar fotos
          </Button>
          <span className="text-xs text-muted-foreground">{photos.length} · {totalSizeLabel}</span>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          As fotos permanecem apenas em memória durante esta sessão. Nada é enviado ao servidor.
        </AlertDescription>
      </Alert>

      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nenhuma foto adicionada.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {photos.map((p, idx) => {
            const draft = captions[p.id] ?? p.caption;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3"
              >
                <div className="flex items-start gap-3">
                  {p.objectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.objectUrl}
                      alt={p.caption || p.name}
                      className="h-24 w-24 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-muted"
                      aria-label="Miniatura indisponível"
                    >
                      <Camera className="h-6 w-6 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PHOTO_CATEGORY_LABEL[p.category]} · {(p.sizeBytes / 1024).toFixed(0)} KB
                    </p>
                    <p className="text-xs text-muted-foreground">{p.mimeType}</p>
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor={`cap-${p.id}`} className="text-xs">
                    Legenda
                  </Label>
                  <Input
                    id={`cap-${p.id}`}
                    value={draft}
                    onChange={(e) => setCaptions((c) => ({ ...c, [p.id]: e.target.value }))}
                    onBlur={() => {
                      if (draft !== p.caption) {
                        updateDiligencePhoto(diligenceId, p.id, { caption: draft });
                      }
                    }}
                    maxLength={MAX_CAPTION_LENGTH}
                    disabled={readOnly}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select
                    value={p.category}
                    onValueChange={(v) =>
                      updateDiligencePhoto(diligenceId, p.id, { category: v as DiligencePhotoCategory })
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs" aria-label="Categoria">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {PHOTO_CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant={p.relevant ? "default" : "outline"}
                    onClick={() =>
                      updateDiligencePhoto(diligenceId, p.id, { relevant: !p.relevant })
                    }
                    disabled={readOnly}
                    aria-pressed={p.relevant}
                    aria-label={p.relevant ? "Desmarcar relevante" : "Marcar como relevante"}
                  >
                    <Star className="mr-1 h-3 w-3" aria-hidden /> Relevante
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => movePhoto(diligenceId, p.id, -1)}
                    disabled={readOnly || idx === 0}
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => movePhoto(diligenceId, p.id, 1)}
                    disabled={readOnly || idx === photos.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (p.objectUrl) createdUrlsRef.current.delete(p.objectUrl);
                      removeDiligencePhoto(diligenceId, p.id);
                    }}
                    disabled={readOnly}
                    aria-label="Remover foto"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
