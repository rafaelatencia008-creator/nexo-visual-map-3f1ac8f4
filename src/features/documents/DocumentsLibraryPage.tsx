import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Upload,
  WifiOff,
  Lock,
  Shield,
  Globe,
  AlertCircle,
  FolderOpen,
  X,
  MessageSquarePlus,
  FileUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processos } from "@/lib/mock/data";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CONFIDENTIALITIES,
  DOCUMENT_CONFIDENTIALITY_LABEL,
  DOCUMENT_CONFIDENTIALITY_SHORT,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABEL,
} from "./document-labels";
import type {
  DocumentCategory,
  DocumentConfidentiality,
  DocumentRecord,
  DocumentStatus,
} from "./document-types";
import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  getCaseNumberLabel,
  type DeadlineFilter,
} from "./document-filters";
import {
  addAnnotation,
  addVersion,
  createDocumentFromForm,
  listDocuments,
  SEED_REFERENCE_DATE,
} from "./document-mock-store";
import { computeDeadlineState, formatDeadlineText } from "./document-form";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { DocumentBatchDialog } from "./DocumentBatchDialog";
import { DocumentDetailDialog } from "./DocumentDetailDialog";
import { DocumentVersionDialog } from "./DocumentVersionDialog";
import { DocumentAnnotationDialog } from "./DocumentAnnotationDialog";

type LoadState = "loading" | "ready" | "error" | "offline" | "forbidden";

function ConfBadge({ level }: { level: DocumentConfidentiality }) {
  const Icon = level === "sigiloso" ? Lock : level === "restrito" ? Shield : Globe;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {DOCUMENT_CONFIDENTIALITY_SHORT[level]}
    </Badge>
  );
}

export function DocumentsLibraryPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "todas">("todas");
  const [status, setStatus] = useState<DocumentStatus | "todas">("todas");
  const [confidentiality, setConfidentiality] =
    useState<DocumentConfidentiality | "todas">("todas");
  const [caseId, setCaseId] = useState<string | "todos">("todos");
  const [deadline, setDeadline] = useState<DeadlineFilter>("todos");

  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ key: number; text: string }>({
    key: 0,
    text: "",
  });
  const announceKey = useRef(0);

  const referenceDate = SEED_REFERENCE_DATE;

  useEffect(() => {
    // Modo demo via querystring
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const demo = params.get("demo");
    if (demo === "error") return setLoadState("error");
    if (demo === "offline") return setLoadState("offline");
    if (demo === "forbidden") return setLoadState("forbidden");
    if (demo === "empty") {
      setDocuments([]);
      setLoadState("ready");
      return;
    }

    if (typeof window !== "undefined" && !window.navigator.onLine) {
      setLoadState("offline");
      return;
    }
    const t = setTimeout(() => {
      setDocuments(listDocuments());
      setLoadState("ready");
    }, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onOffline = () => setLoadState("offline");
    const onOnline = () => {
      if (loadState === "offline") {
        setDocuments(listDocuments());
        setLoadState("ready");
      }
    };
    if (typeof window === "undefined") return;
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [loadState]);

  const filtered = useMemo(() => {
    return applyFilters(documents, {
      query,
      category,
      status,
      confidentiality,
      caseId,
      deadline,
    }, referenceDate);
  }, [documents, query, category, status, confidentiality, caseId, deadline, referenceDate]);

  const filtersActive = hasActiveFilters({
    query,
    category,
    status,
    confidentiality,
    caseId,
    deadline,
  });

  const clearFilters = () => {
    setQuery("");
    setCategory("todas");
    setStatus("todas");
    setConfidentiality("todas");
    setCaseId("todos");
    setDeadline("todos");
  };

  const announce = (text: string) => {
    announceKey.current += 1;
    setAnnouncement({ key: announceKey.current, text });
  };

  const handleSave = (input: Parameters<typeof createDocumentFromForm>[0]) => {
    const rec = createDocumentFromForm(input);
    setDocuments(listDocuments());
    announce("Documento adicionado");
    setSelected(rec);
  };

  const handleBatch = (inputs: Parameters<typeof createDocumentFromForm>[0][]) => {
    for (const i of inputs) createDocumentFromForm(i);
    setDocuments(listDocuments());
    announce("Documentos adicionados");
  };

  const handleNewVersion = (input: Parameters<typeof addVersion>[1]) => {
    if (!selected) return;
    const updated = addVersion(selected.id, input);
    if (updated) {
      setDocuments(listDocuments());
      setSelected(updated);
      announce("Nova versão adicionada");
    }
  };

  const handleAddAnnotation = (text: string) => {
    if (!selected) return;
    const updated = addAnnotation(selected.id, text);
    if (updated) {
      setDocuments(listDocuments());
      setSelected(updated);
      announce("Anotação adicionada");
    }
  };

  // resumo
  const summary = useMemo(() => {
    const total = documents.length;
    const sig = documents.filter((d) => d.confidentiality === "sigiloso").length;
    const prazoProximo = documents.filter((d) => {
      const s = computeDeadlineState(d.deadlineAt, referenceDate);
      return s === "vencendo" || s === "hoje";
    }).length;
    const pendentes = documents.filter((d) => d.status === "pendente_revisao").length;
    return { total, sig, prazoProximo, pendentes };
  }, [documents, referenceDate]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Documentos
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Organize, versione e vincule arquivos aos processos, perícias e pessoas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setBatchOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" aria-hidden />
            Upload em lote
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Adicionar documento
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total de documentos" value={summary.total} />
        <SummaryCard label="Sigilosos" value={summary.sig} />
        <SummaryCard label="Com prazo próximo" value={summary.prazoProximo} />
        <SummaryCard label="Pendentes de revisão" value={summary.pendentes} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
              <Input
                aria-label="Pesquisar documentos"
                placeholder="Pesquisar documentos"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filtersActive ? (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" aria-hidden />
                Limpar filtros
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory | "todas")}>
              <SelectTrigger aria-label="Filtrar por categoria"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {DOCUMENT_CATEGORIES.map((k) => (
                  <SelectItem key={k} value={k}>{DOCUMENT_CATEGORY_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus | "todas")}>
              <SelectTrigger aria-label="Filtrar por situação"><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                {DOCUMENT_STATUSES.map((k) => (
                  <SelectItem key={k} value={k}>{DOCUMENT_STATUS_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={confidentiality}
              onValueChange={(v) => setConfidentiality(v as DocumentConfidentiality | "todas")}
            >
              <SelectTrigger aria-label="Filtrar por sigilo"><SelectValue placeholder="Sigilo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os níveis</SelectItem>
                {DOCUMENT_CONFIDENTIALITIES.map((k) => (
                  <SelectItem key={k} value={k}>{DOCUMENT_CONFIDENTIALITY_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger aria-label="Filtrar por processo"><SelectValue placeholder="Processo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os processos</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deadline} onValueChange={(v) => setDeadline(v as DeadlineFilter)}>
              <SelectTrigger aria-label="Filtrar por prazo"><SelectValue placeholder="Prazo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sem_prazo">Sem prazo</SelectItem>
                <SelectItem value="com_prazo">Com prazo</SelectItem>
                <SelectItem value="vencendo">Vencendo em breve</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div
        role="status"
        aria-live="polite"
        aria-busy={loadState === "loading"}
        className="sr-only"
      >
        {announcement.text}
      </div>

      {loadState === "loading" ? (
        <div className="space-y-3" aria-live="polite">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <p className="text-muted-foreground text-sm">Carregando documentos…</p>
        </div>
      ) : loadState === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="Não foi possível carregar os documentos"
          description="Ocorreu um erro ao buscar os registros."
          action={
            <Button onClick={() => { setLoadState("loading"); setTimeout(() => { setDocuments(listDocuments()); setLoadState("ready"); }, 200); }}>
              Tentar novamente
            </Button>
          }
        />
      ) : loadState === "offline" ? (
        <EmptyState
          icon={WifiOff}
          title="Você está offline"
          description="Reconecte-se para visualizar a biblioteca documental."
        />
      ) : loadState === "forbidden" ? (
        <EmptyState
          icon={Lock}
          title="Sem permissão"
          description="Você não tem permissão para visualizar documentos."
        />
      ) : filtered.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={Search}
            title="Nenhum documento corresponde aos filtros"
            description="Ajuste os critérios ou limpe os filtros."
            action={<Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum documento encontrado"
            description="Comece adicionando o primeiro documento à biblioteca."
            action={<Button onClick={() => setFormOpen(true)}>Adicionar documento</Button>}
          />
        )
      ) : (
        <ul className="space-y-3">
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              referenceDate={referenceDate}
              onOpen={() => setSelected(doc)}
              onNewVersion={() => { setSelected(doc); setVersionOpen(true); }}
              onAnnotate={() => { setSelected(doc); setAnnotationOpen(true); }}
            />
          ))}
        </ul>
      )}

      <DocumentFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} />
      <DocumentBatchDialog open={batchOpen} onClose={() => setBatchOpen(false)} onConfirm={handleBatch} />
      <DocumentDetailDialog
        open={!!selected && !versionOpen && !annotationOpen}
        document={selected}
        referenceIsoDate={referenceDate}
        onClose={() => setSelected(null)}
        onNewVersion={() => setVersionOpen(true)}
        onAddAnnotation={() => setAnnotationOpen(true)}
      />
      <DocumentVersionDialog
        open={versionOpen}
        documentName={selected?.name ?? ""}
        onClose={() => setVersionOpen(false)}
        onSave={handleNewVersion}
      />
      <DocumentAnnotationDialog
        open={annotationOpen}
        onClose={() => setAnnotationOpen(false)}
        onSave={handleAddAnnotation}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">{label}</p>
        <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
        {action ?? null}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  doc,
  referenceDate,
  onOpen,
  onNewVersion,
  onAnnotate,
}: {
  doc: DocumentRecord;
  referenceDate: string;
  onOpen: () => void;
  onNewVersion: () => void;
  onAnnotate: () => void;
}) {
  const caseNumber = getCaseNumberLabel(doc.caseId);
  return (
    <li>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              onClick={onOpen}
              className="flex-1 text-left"
              aria-label={`Abrir ${doc.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium break-words">{doc.name}</p>
                  <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>{DOCUMENT_CATEGORY_LABEL[doc.category]}</span>
                    {caseNumber ? <span>Processo {caseNumber}</span> : null}
                    <span>v{doc.currentVersion}</span>
                    <span>{doc.responsibleLabel}</span>
                    <span>
                      Atualizado em{" "}
                      {format(new Date(doc.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="outline">{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
                    <ConfBadge level={doc.confidentiality} />
                    <Badge variant="outline">
                      {formatDeadlineText(doc.deadlineAt, referenceDate)}
                    </Badge>
                  </div>
                </div>
              </div>
            </button>
            <div className="flex flex-wrap gap-2 sm:flex-col">
              <Button size="sm" variant="outline" onClick={onOpen}>
                Abrir
              </Button>
              <Button size="sm" variant="ghost" onClick={onNewVersion}>
                <Upload className="mr-1 h-3.5 w-3.5" aria-hidden />
                Nova versão
              </Button>
              <Button size="sm" variant="ghost" onClick={onAnnotate}>
                <MessageSquarePlus className="mr-1 h-3.5 w-3.5" aria-hidden />
                Anotação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
