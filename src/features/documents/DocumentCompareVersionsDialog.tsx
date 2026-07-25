/**
 * LV-09.5 — Comparação de versões do mesmo documento (mock).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock, WifiOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentRecord } from "./document-types";
import {
  ANALYSIS_DEMO_NOTICE,
  ANALYSIS_STATUS_LABEL,
  compareVersions,
  type AnalysisStatus,
  type VersionDiff,
} from "./document-analysis";

export interface DocumentCompareVersionsDialogProps {
  readonly open: boolean;
  readonly documents: readonly DocumentRecord[];
  readonly initialDocumentId?: string;
  readonly onClose: () => void;
  readonly permission?: "allowed" | "forbidden";
}

export function DocumentCompareVersionsDialog({
  open,
  documents,
  initialDocumentId,
  onClose,
  permission = "allowed",
}: DocumentCompareVersionsDialogProps) {
  const [docId, setDocId] = useState("");
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("empty");
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? null,
    [documents, docId],
  );
  const eligibleDocs = useMemo(
    () => documents.filter((d) => d.versions.length >= 2),
    [documents],
  );

  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!window.navigator.onLine);
    const onOff = () => setIsOffline(true);
    const onOn = () => setIsOffline(false);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const initial =
      eligibleDocs.find((d) => d.id === initialDocumentId)?.id ??
      eligibleDocs[0]?.id ??
      "";
    setDocId(initial);
    const target = documents.find((d) => d.id === initial);
    setLeftId(target?.versions[0]?.id ?? "");
    setRightId(target?.versions[1]?.id ?? "");
  }, [open, initialDocumentId, eligibleDocs, documents]);

  useEffect(() => {
    if (!doc || !leftId || !rightId) {
      setDiff(null);
      setStatus("empty");
      return;
    }
    if (permission === "forbidden") {
      setStatus("forbidden");
      setDiff(null);
      return;
    }
    if (isOffline) {
      setStatus("offline");
      setDiff(null);
      return;
    }
    if (leftId === rightId) {
      setStatus("empty");
      setDiff(null);
      return;
    }
    const left = doc.versions.find((v) => v.id === leftId);
    const right = doc.versions.find((v) => v.id === rightId);
    if (!left || !right) {
      setStatus("empty");
      setDiff(null);
      return;
    }
    setStatus("preparing");
    setDiff(null);
    const t = setTimeout(() => {
      try {
        setDiff(compareVersions(doc.id, left, right));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [doc, leftId, rightId, isOffline, permission]);

  const handleClose = () => {
    onClose();
    const opener = openerRef.current;
    if (opener && typeof opener.focus === "function") {
      queueMicrotask(() => opener.focus());
    }
  };

  const retry = () => {
    if (!doc) return;
    const left = doc.versions.find((v) => v.id === leftId);
    const right = doc.versions.find((v) => v.id === rightId);
    if (!left || !right) return;
    setStatus("preparing");
    setTimeout(() => {
      try {
        setDiff(compareVersions(doc.id, left, right));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 150);
  };

  const sameSideError = leftId && rightId && leftId === rightId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar versões</DialogTitle>
          <DialogDescription>{ANALYSIS_DEMO_NOTICE}</DialogDescription>
        </DialogHeader>

        {eligibleDocs.length === 0 ? (
          <div className="rounded-md border p-4 text-sm">
            Nenhum documento possui duas ou mais versões para comparar.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 sm:col-span-3">
                <span className="text-xs font-medium">Documento</span>
                <Select
                  value={docId}
                  onValueChange={(v) => {
                    setDocId(v);
                    const target = documents.find((d) => d.id === v);
                    setLeftId(target?.versions[0]?.id ?? "");
                    setRightId(target?.versions[1]?.id ?? "");
                  }}
                >
                  <SelectTrigger aria-label="Selecionar documento">
                    <SelectValue placeholder="Selecione um documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDocs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Versão esquerda</span>
                <Select value={leftId} onValueChange={setLeftId} disabled={!doc}>
                  <SelectTrigger aria-label="Versão esquerda">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doc?.versions ?? []).map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === rightId}
                      >
                        v{v.version} · {v.fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Versão direita</span>
                <Select
                  value={rightId}
                  onValueChange={setRightId}
                  disabled={!doc}
                >
                  <SelectTrigger aria-label="Versão direita">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doc?.versions ?? []).map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === leftId}
                      >
                        v{v.version} · {v.fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            {sameSideError ? (
              <p role="alert" className="text-sm text-destructive">
                Selecione versões diferentes dos dois lados.
              </p>
            ) : null}

            <div
              role="status"
              aria-live="polite"
              aria-busy={status === "preparing"}
              className="min-h-8"
            >
              <p className="text-muted-foreground text-sm">
                {ANALYSIS_STATUS_LABEL[status]}
              </p>
            </div>

            {status === "preparing" ? (
              <div className="flex items-center gap-2 rounded-md border p-4">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <p className="text-sm">Analisando diferenças…</p>
              </div>
            ) : null}
            {status === "offline" ? (
              <StateBox
                icon={WifiOff}
                title="Você está offline"
                description="Reconecte-se para gerar a comparação."
              />
            ) : null}
            {status === "forbidden" ? (
              <StateBox
                icon={Lock}
                title="Sem permissão"
                description="Você não pode comparar versões deste documento."
              />
            ) : null}
            {status === "error" ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-4"
              >
                <p className="font-medium text-destructive">
                  Não foi possível concluir a análise
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={retry}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            {status === "empty" && !sameSideError ? (
              <StateBox
                icon={AlertCircle}
                title="Nenhum conteúdo disponível"
                description="Escolha um documento e duas versões distintas."
              />
            ) : null}

            {status === "ready" && diff ? (
              <div className="space-y-3">
                <p className="text-sm">{diff.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    Adicionadas: {diff.addedCount}
                  </Badge>
                  <Badge variant="outline">
                    Removidas: {diff.removedCount}
                  </Badge>
                  <Badge variant="outline">
                    Alteradas: {diff.changedCount}
                  </Badge>
                  <Badge variant="outline">
                    Inalteradas: {diff.unchangedCount}
                  </Badge>
                </div>

                <div className="max-h-[45vh] overflow-y-auto rounded-md border">
                  <ul className="divide-y">
                    {diff.lines.map((line, i) => (
                      <li
                        key={i}
                        className="grid gap-2 p-3 text-xs sm:grid-cols-2"
                        data-kind={line.kind}
                      >
                        <div
                          className={
                            line.kind === "removed" || line.kind === "changed"
                              ? "rounded-md bg-destructive/10 p-2 break-words"
                              : "p-2 break-words"
                          }
                        >
                          <span className="text-muted-foreground mr-1">
                            [{line.kind === "removed" ? "-" : line.kind === "changed" ? "~" : line.kind === "added" ? " " : "="}]
                          </span>
                          {line.left ?? ""}
                        </div>
                        <div
                          className={
                            line.kind === "added" || line.kind === "changed"
                              ? "rounded-md bg-primary/10 p-2 break-words"
                              : "p-2 break-words"
                          }
                        >
                          <span className="text-muted-foreground mr-1">
                            [{line.kind === "added" ? "+" : line.kind === "changed" ? "~" : line.kind === "removed" ? " " : "="}]
                          </span>
                          {line.right ?? ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </>
        )}

        <DialogFooter>
          <p className="text-xs text-muted-foreground mr-auto">
            {ANALYSIS_DEMO_NOTICE}
          </p>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StateBox({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border p-4 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-medium mt-2">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
