/**
 * LV-09.5 — Comparação entre dois documentos distintos (mock).
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
  compareDocuments,
  type AnalysisStatus,
  type DocumentComparison,
} from "./document-analysis";

export interface DocumentCompareDocumentsDialogProps {
  readonly open: boolean;
  readonly documents: readonly DocumentRecord[];
  readonly initialLeftId?: string;
  readonly onClose: () => void;
  readonly permission?: "allowed" | "forbidden";
}

export function DocumentCompareDocumentsDialog({
  open,
  documents,
  initialLeftId,
  onClose,
  permission = "allowed",
}: DocumentCompareDocumentsDialogProps) {
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("empty");
  const [cmp, setCmp] = useState<DocumentComparison | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const left = useMemo(
    () => documents.find((d) => d.id === leftId) ?? null,
    [documents, leftId],
  );
  const right = useMemo(
    () => documents.find((d) => d.id === rightId) ?? null,
    [documents, rightId],
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
    const first = initialLeftId ?? documents[0]?.id ?? "";
    setLeftId(first);
    const second = documents.find((d) => d.id !== first)?.id ?? "";
    setRightId(second);
  }, [open, initialLeftId, documents]);

  useEffect(() => {
    if (!left || !right) {
      setCmp(null);
      setStatus("empty");
      return;
    }
    if (permission === "forbidden") {
      setStatus("forbidden");
      setCmp(null);
      return;
    }
    if (isOffline) {
      setStatus("offline");
      setCmp(null);
      return;
    }
    if (left.id === right.id) {
      setStatus("empty");
      setCmp(null);
      return;
    }
    setStatus("preparing");
    setCmp(null);
    const t = setTimeout(() => {
      try {
        setCmp(compareDocuments(left, right));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [left, right, isOffline, permission]);

  const handleClose = () => {
    onClose();
    const opener = openerRef.current;
    if (opener && typeof opener.focus === "function") {
      queueMicrotask(() => opener.focus());
    }
  };

  const retry = () => {
    if (!left || !right || left.id === right.id) return;
    setStatus("preparing");
    setTimeout(() => {
      try {
        setCmp(compareDocuments(left, right));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 150);
  };

  const sameError = leftId && rightId && leftId === rightId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar documentos</DialogTitle>
          <DialogDescription>{ANALYSIS_DEMO_NOTICE}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Documento à esquerda</span>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger aria-label="Documento esquerdo">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id} disabled={d.id === rightId}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Documento à direita</span>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger aria-label="Documento direito">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id} disabled={d.id === leftId}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {sameError ? (
          <p role="alert" className="text-sm text-destructive">
            Selecione dois documentos diferentes.
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
            <p className="text-sm">Analisando documentos…</p>
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
            description="Você não pode comparar estes documentos."
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
        {status === "empty" && !sameError ? (
          <StateBox
            icon={AlertCircle}
            title="Nenhum conteúdo disponível"
            description="Selecione dois documentos diferentes."
          />
        ) : null}

        {status === "ready" && cmp && left && right ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Similaridade demonstrativa: {cmp.similarityPercent}%
              </Badge>
              <Badge variant="outline">
                Semelhanças: {cmp.similarities.length}
              </Badge>
              <Badge variant="outline">
                Diferenças: {cmp.differences.length}
              </Badge>
              {cmp.conflicts.length > 0 ? (
                <Badge variant="destructive">
                  Possíveis conflitos: {cmp.conflicts.length}
                </Badge>
              ) : null}
            </div>

            <section>
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
                Metadados lado a lado
              </h3>
              <div className="mt-2 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase">
                    <tr>
                      <th className="p-2 text-left">Campo</th>
                      <th className="p-2 text-left">Esquerda</th>
                      <th className="p-2 text-left">Direita</th>
                      <th className="p-2 text-left">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmp.fields.map((f) => (
                      <tr key={f.label} className="border-t">
                        <td className="p-2 font-medium">{f.label}</td>
                        <td className="p-2 break-words">{f.left || "—"}</td>
                        <td className="p-2 break-words">{f.right || "—"}</td>
                        <td className="p-2">
                          <Badge variant={f.equal ? "outline" : "destructive"}>
                            {f.equal ? "Igual" : "Diferente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {cmp.conflicts.length > 0 ? (
              <section>
                <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
                  Possíveis conflitos
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {cmp.conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
                Conteúdo mock lado a lado
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {cmp.contentDiff.summary}
              </p>
              <div className="mt-2 max-h-[40vh] overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {cmp.contentDiff.lines.map((line, i) => (
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
                        {line.left ?? ""}
                      </div>
                      <div
                        className={
                          line.kind === "added" || line.kind === "changed"
                            ? "rounded-md bg-primary/10 p-2 break-words"
                            : "p-2 break-words"
                        }
                      >
                        {line.right ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

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
