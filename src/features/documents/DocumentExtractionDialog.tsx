/**
 * LV-09.5 — Extração mock de informações.
 * Integrado à rota /app/documentos sem criar rota nova.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Copy, Loader2, Lock, WifiOff } from "lucide-react";
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
import type { DocumentRecord, DocumentVersion } from "./document-types";
import {
  ANALYSIS_DEMO_NOTICE,
  ANALYSIS_STATUS_LABEL,
  extractFromDocument,
  extractionToText,
  type AnalysisItem,
  type AnalysisStatus,
  type ExtractionResult,
} from "./document-analysis";

export interface DocumentExtractionDialogProps {
  readonly open: boolean;
  readonly documents: readonly DocumentRecord[];
  readonly initialDocumentId?: string;
  readonly onClose: () => void;
  readonly permission?: "allowed" | "forbidden";
}

export function DocumentExtractionDialog({
  open,
  documents,
  initialDocumentId,
  onClose,
  permission = "allowed",
}: DocumentExtractionDialogProps) {
  const [docId, setDocId] = useState<string>("");
  const [verId, setVerId] = useState<string>("");
  const [status, setStatus] = useState<AnalysisStatus>("preparing");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === docId) ?? null,
    [documents, docId],
  );
  const selectedVersion = useMemo<DocumentVersion | null>(() => {
    if (!selectedDoc) return null;
    return selectedDoc.versions.find((v) => v.id === verId) ?? null;
  }, [selectedDoc, verId]);

  // Estado offline reativo
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
    const first = initialDocumentId ?? documents[0]?.id ?? "";
    setDocId(first);
    const doc = documents.find((d) => d.id === first);
    setVerId(doc?.versions[0]?.id ?? "");
    setCopied(false);
  }, [open, initialDocumentId, documents]);

  useEffect(() => {
    if (!selectedDoc || !selectedVersion) {
      setResult(null);
      setStatus("empty");
      return;
    }
    if (permission === "forbidden") {
      setStatus("forbidden");
      setResult(null);
      return;
    }
    if (isOffline) {
      setStatus("offline");
      setResult(null);
      return;
    }
    setStatus("preparing");
    setResult(null);
    const t = setTimeout(() => {
      try {
        const r = extractFromDocument(selectedDoc, selectedVersion);
        setResult(r);
        setStatus("ready");
      } catch {
        setResult(null);
        setStatus("error");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [selectedDoc, selectedVersion, isOffline, permission]);

  const handleClose = () => {
    onClose();
    const opener = openerRef.current;
    if (opener && typeof opener.focus === "function") {
      queueMicrotask(() => opener.focus());
    }
  };

  const retry = () => {
    if (!selectedDoc || !selectedVersion) return;
    setStatus("preparing");
    setResult(null);
    setTimeout(() => {
      try {
        setResult(extractFromDocument(selectedDoc, selectedVersion));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 150);
  };

  const doCopy = async () => {
    if (!result) return;
    const text = extractionToText(result);
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extrair informações</DialogTitle>
          <DialogDescription>{ANALYSIS_DEMO_NOTICE}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Documento</span>
            <Select
              value={docId}
              onValueChange={(v) => {
                setDocId(v);
                const doc = documents.find((d) => d.id === v);
                setVerId(doc?.versions[0]?.id ?? "");
              }}
            >
              <SelectTrigger aria-label="Selecionar documento">
                <SelectValue placeholder="Selecione um documento" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Versão</span>
            <Select
              value={verId}
              onValueChange={setVerId}
              disabled={!selectedDoc}
            >
              <SelectTrigger aria-label="Selecionar versão">
                <SelectValue placeholder="Selecione a versão" />
              </SelectTrigger>
              <SelectContent>
                {(selectedDoc?.versions ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} · {v.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

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
            <p className="text-sm">Analisando documento…</p>
          </div>
        ) : null}

        {status === "offline" ? (
          <StateBox
            icon={WifiOff}
            title="Você está offline"
            description="Reconecte-se para gerar a análise demonstrativa."
          />
        ) : null}
        {status === "forbidden" ? (
          <StateBox
            icon={Lock}
            title="Sem permissão"
            description="Você não tem permissão para extrair informações deste documento."
          />
        ) : null}
        {status === "empty" ? (
          <StateBox
            icon={AlertCircle}
            title="Nenhum conteúdo disponível"
            description="Selecione um documento e uma versão para gerar a análise."
          />
        ) : null}
        {status === "error" ? (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <p className="font-medium text-destructive">
              Não foi possível concluir a análise
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente novamente em instantes.
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={retry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}

        {status === "ready" && result ? (
          <div className="space-y-4">
            <section>
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
                Resumo
              </h3>
              <p className="text-sm mt-1">{result.summary}</p>
            </section>

            <Group title="Pessoas mencionadas" items={result.persons} />
            <Group title="Datas encontradas" items={result.dates} />
            <Group title="Valores encontrados" items={result.values} />
            <Group title="Números de processo" items={result.caseNumbers} />
            <Group title="Prazos" items={result.deadlines} />
            <Group title="Palavras-chave" items={result.keywords} />
            <Group
              title="Possíveis inconsistências"
              items={result.inconsistencies}
              tone="warn"
            />
            <section>
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
                Trechos relevantes
              </h3>
              <ul className="mt-2 space-y-2">
                {result.excerpts.map((e, i) => (
                  <li
                    key={`${e.value}-${i}`}
                    className="rounded-md border p-3 text-sm"
                  >
                    <p className="break-words">{e.value}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Confiança demonstrativa: {e.confidence}%
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">{ANALYSIS_DEMO_NOTICE}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={doCopy}
              disabled={!result}
              aria-label="Copiar resultado"
            >
              <Copy className="mr-1 h-4 w-4" aria-hidden />
              {copied ? "Copiado" : "Copiar resultado"}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly AnalysisItem[];
  tone?: "warn";
}) {
  return (
    <section>
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm mt-1">Nenhum item.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <li key={`${it.value}-${i}`}>
              <Badge
                variant={tone === "warn" ? "destructive" : "outline"}
                className="gap-1"
              >
                <span>{it.value}</span>
                <span className="opacity-70">{it.confidence}%</span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
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
