import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, WifiOff, Lock, AlertCircle, FolderOpen } from "lucide-react";
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
import {
  CATEGORIA_LABEL,
  SITUACAO_LABEL,
  documentosSeed,
  getProcessoLabel,
  type Documento,
  type DocumentoCategoria,
  type DocumentoSituacao,
} from "@/lib/mock/documentos";
import { DocumentDetailDialog } from "@/features/documentos/DocumentDetailDialog";
import {
  DocumentCreateDialog,
  type DocumentCreateInput,
} from "@/features/documentos/DocumentCreateDialog";

export const Route = createFileRoute("/app/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Biblioteca documental do escritório pericial: laudos, petições, evidências e contratos vinculados aos processos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentosPage,
});

type LoadState = "loading" | "ready" | "error";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

// Permissão mockada. Poderá ser conectada ao domínio no futuro.
const HAS_PERMISSION = true;

function DocumentosPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<DocumentoCategoria | "todas">("todas");
  const [situacao, setSituacao] = useState<DocumentoSituacao | "todas">("todas");
  const [selecionado, setSelecionado] = useState<Documento | null>(null);
  const [criarAberto, setCriarAberto] = useState(false);
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDocumentos(documentosSeed);
      setLoadState("ready");
    }, 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOn = () => setOnline(true);
    const handleOff = () => setOnline(false);
    window.addEventListener("online", handleOn);
    window.addEventListener("offline", handleOff);
    return () => {
      window.removeEventListener("online", handleOn);
      window.removeEventListener("offline", handleOff);
    };
  }, []);

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    return documentos.filter((d) => {
      if (categoria !== "todas" && d.categoria !== categoria) return false;
      if (situacao !== "todas" && d.situacao !== situacao) return false;
      if (!termo) return true;
      const nomeMatch = d.nome.toLowerCase().includes(termo);
      const catMatch = CATEGORIA_LABEL[d.categoria].toLowerCase().includes(termo);
      const procMatch = getProcessoLabel(d.processoId).toLowerCase().includes(termo);
      return nomeMatch || catMatch || procMatch;
    });
  }, [documentos, query, categoria, situacao]);

  const handleSave = (input: DocumentCreateInput) => {
    const now = new Date().toISOString();
    const novo: Documento = {
      id: `doc-${Date.now()}`,
      nome: input.nome,
      categoria: input.categoria,
      processoId: input.processoId,
      situacao: "rascunho",
      versaoAtual: 1,
      atualizadoEm: now,
      responsavel: "Você",
      observacoes: input.descricao,
      versoes: [
        {
          numero: 1,
          criadoEm: now,
          autor: "Você",
          resumo: input.arquivoNome
            ? `Versão inicial (${input.arquivoNome})`
            : "Versão inicial",
        },
      ],
      vinculos: [{ tipo: "processo", descricao: getProcessoLabel(input.processoId) }],
      anotacoes: [],
    };
    setDocumentos((prev) => [novo, ...prev]);
  };

  const handleAddAnotacao = (documentoId: string, texto: string) => {
    const now = new Date().toISOString();
    setDocumentos((prev) =>
      prev.map((d) =>
        d.id === documentoId
          ? {
              ...d,
              atualizadoEm: now,
              anotacoes: [
                ...d.anotacoes,
                { id: `an-${Date.now()}`, autor: "Você", criadoEm: now, texto },
              ],
            }
          : d,
      ),
    );
    setSelecionado((sel) =>
      sel && sel.id === documentoId
        ? {
            ...sel,
            atualizadoEm: now,
            anotacoes: [
              ...sel.anotacoes,
              { id: `an-${Date.now()}`, autor: "Você", criadoEm: now, texto },
            ],
          }
        : sel,
    );
  };

  const handleCreateVersao = (documentoId: string, resumo: string) => {
    const now = new Date().toISOString();
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== documentoId) return d;
        const proxima = d.versaoAtual + 1;
        return {
          ...d,
          versaoAtual: proxima,
          atualizadoEm: now,
          versoes: [...d.versoes, { numero: proxima, criadoEm: now, autor: "Você", resumo }],
        };
      }),
    );
    setSelecionado((sel) => {
      if (!sel || sel.id !== documentoId) return sel;
      const proxima = sel.versaoAtual + 1;
      return {
        ...sel,
        versaoAtual: proxima,
        atualizadoEm: now,
        versoes: [...sel.versoes, { numero: proxima, criadoEm: now, autor: "Você", resumo }],
      };
    });
  };

  if (!HAS_PERMISSION) {
    return (
      <StateCard
        icon={<Lock className="h-6 w-6" />}
        title="Sem permissão"
        description="Você não tem acesso à biblioteca documental desta organização."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Documentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Biblioteca documental do escritório: laudos, petições, evidências e contratos.
          </p>
        </div>
        <Button onClick={() => setCriarAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar documento
        </Button>
      </div>

      {!online ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
        >
          <WifiOff className="h-4 w-4" />
          Você está offline. Alterações não serão sincronizadas.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por nome, categoria ou processo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Pesquisar documentos"
          />
        </div>
        <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
          <SelectTrigger className="min-w-[160px]" aria-label="Filtrar por categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {(Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[]).map((k) => (
              <SelectItem key={k} value={k}>
                {CATEGORIA_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={situacao} onValueChange={(v) => setSituacao(v as typeof situacao)}>
          <SelectTrigger className="min-w-[160px]" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas situações</SelectItem>
            {(Object.keys(SITUACAO_LABEL) as DocumentoSituacao[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SITUACAO_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadState === "loading" ? (
        <div className="space-y-2" aria-label="Carregando documentos">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : loadState === "error" ? (
        <StateCard
          icon={<AlertCircle className="h-6 w-6" />}
          title="Não foi possível carregar"
          description="Tente novamente em instantes."
        />
      ) : filtrados.length === 0 ? (
        <StateCard
          icon={<FolderOpen className="h-6 w-6" />}
          title="Nenhum documento encontrado"
          description={
            documentos.length === 0
              ? "Adicione seu primeiro documento para começar."
              : "Ajuste os filtros ou revise a pesquisa."
          }
        />
      ) : (
        <ul className="grid gap-3" aria-label="Lista de documentos">
          {filtrados.map((d) => (
            <li key={d.id}>
              <Card className="hover:border-primary/40 transition">
                <CardContent className="p-4">
                  <button
                    type="button"
                    onClick={() => setSelecionado(d)}
                    className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-start sm:gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium">{d.nome}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{CATEGORIA_LABEL[d.categoria]}</Badge>
                        <Badge variant="outline">{SITUACAO_LABEL[d.situacao]}</Badge>
                        <span className="break-all">Processo {getProcessoLabel(d.processoId)}</span>
                        <span>·</span>
                        <span>v{d.versaoAtual}</span>
                        <span>·</span>
                        <span>Atualizado {formatDate(d.atualizadoEm)}</span>
                        <span>·</span>
                        <span className="break-words">{d.responsavel}</span>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <DocumentDetailDialog
        documento={selecionado}
        open={selecionado !== null}
        onClose={() => setSelecionado(null)}
        onAddAnotacao={handleAddAnotacao}
        onCreateVersao={handleCreateVersao}
      />
      <DocumentCreateDialog
        open={criarAberto}
        onClose={() => setCriarAberto(false)}
        onSave={handleSave}
      />
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
