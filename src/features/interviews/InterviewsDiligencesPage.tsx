/**
 * LV-11 — Página principal: Entrevistas e diligências.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Calendar,
  Filter,
  Mic,
  Plus,
  Search,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { processos } from "@/lib/mock/data";
import {
  applyInterviewFilters,
  countByStatus,
  EMPTY_INTERVIEW_FILTERS,
  getCaseNumberLabel,
  hasActiveInterviewFilters,
  type InterviewFilters,
  type InterviewTabKind,
} from "./interview-filters";
import { INTERVIEW_STATUS_LABEL, MODULE_KIND_LABEL } from "./interview-labels";
import { INTERVIEW_STATUSES, type InterviewStatus, type ModuleRecord } from "./interview-types";
import {
  cancelDiligence,
  cancelInterview,
  listInterviewRecords,
  startDiligence,
  startInterview,
  subscribeInterviewStore,
} from "./interview-mock-store";
import { InterviewFormDialog } from "./InterviewFormDialog";
import { DiligenceFormDialog } from "./DiligenceFormDialog";
import { InterviewWorkspaceDialog } from "./InterviewWorkspaceDialog";
import { DiligenceWorkspaceDialog } from "./DiligenceWorkspaceDialog";
import { InterviewSummaryDialog } from "./InterviewSummaryDialog";

function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useInterviewRecords(): readonly ModuleRecord[] {
  return useSyncExternalStore(
    subscribeInterviewStore,
    listInterviewRecords,
    listInterviewRecords,
  );
}

export function InterviewsDiligencesPage() {
  const records = useInterviewRecords();
  const online = useOnline();
  const [filters, setFilters] = useState<InterviewFilters>(EMPTY_INTERVIEW_FILTERS);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showDiligenceForm, setShowDiligenceForm] = useState(false);
  const [openInterviewId, setOpenInterviewId] = useState<string | null>(null);
  const [openDiligenceId, setOpenDiligenceId] = useState<string | null>(null);
  const [summaryRecord, setSummaryRecord] = useState<ModuleRecord | null>(null);

  const filtered = useMemo(() => applyInterviewFilters(records, filters), [records, filters]);
  const counts = useMemo(() => countByStatus(records), [records]);

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) set.add(r.responsibleLabel);
    return Array.from(set).sort();
  }, [records]);

  const isEmptyModule = records.length === 0;
  const hasFilters = hasActiveInterviewFilters(filters);
  const noResultsWithFilters = filtered.length === 0 && hasFilters;
  const noResultsNoFilters = filtered.length === 0 && !hasFilters && !isEmptyModule;

  function openRecord(rec: ModuleRecord) {
    if (rec.status === "concluida") {
      setSummaryRecord(rec);
      return;
    }
    if (rec.kind === "entrevista") setOpenInterviewId(rec.id);
    else setOpenDiligenceId(rec.id);
  }

  function startRecord(rec: ModuleRecord) {
    if (rec.kind === "entrevista") {
      startInterview(rec.id);
      setOpenInterviewId(rec.id);
    } else {
      startDiligence(rec.id);
      setOpenDiligenceId(rec.id);
    }
  }

  function cancelRecord(rec: ModuleRecord) {
    if (rec.kind === "entrevista") cancelInterview(rec.id);
    else cancelDiligence(rec.id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="interviews-page">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[11px] uppercase tracking-widest">
            <Mic className="mr-1 h-3 w-3" aria-hidden /> Módulo funcional
          </Badge>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Entrevistas e diligências
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Registre entrevistas, vistorias e diligências com roteiros, anotações e mídias.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowInterviewForm(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova entrevista
          </Button>
          <Button variant="outline" onClick={() => setShowDiligenceForm(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova diligência
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IndicatorCard title="Agendadas" value={counts.agendadas} />
        <IndicatorCard title="Em andamento" value={counts.emAndamento} />
        <IndicatorCard title="Concluídas" value={counts.concluidas} />
        <IndicatorCard title="Com pendência" value={counts.comPendencia} />
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">Registros</CardTitle>
          <Tabs
            value={filters.tab}
            onValueChange={(v) => setFilters((f) => ({ ...f, tab: v as InterviewTabKind }))}
          >
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="entrevistas">Entrevistas</TabsTrigger>
              <TabsTrigger value="diligencias">Diligências</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2 relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Pesquisar"
                placeholder="Pesquisar por título, participante, endereço, responsável..."
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v as InterviewStatus | "todas" }))
              }
            >
              <SelectTrigger aria-label="Situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas situações</SelectItem>
                {INTERVIEW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INTERVIEW_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.caseId}
              onValueChange={(v) => setFilters((f) => ({ ...f, caseId: v }))}
            >
              <SelectTrigger aria-label="Processo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos processos</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.responsibleLabel}
              onValueChange={(v) => setFilters((f) => ({ ...f, responsibleLabel: v }))}
            >
              <SelectTrigger aria-label="Responsável">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos responsáveis</SelectItem>
                {responsibles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="p-start" className="text-xs">De</Label>
                <Input
                  id="p-start"
                  type="date"
                  value={filters.periodStart ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, periodStart: e.target.value || undefined }))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="p-end" className="text-xs">Até</Label>
                <Input
                  id="p-end"
                  type="date"
                  value={filters.periodEnd ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, periodEnd: e.target.value || undefined }))}
                />
              </div>
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters((f) => ({ ...EMPTY_INTERVIEW_FILTERS, tab: f.tab }))
                }
              >
                <X className="mr-2 h-3 w-3" aria-hidden /> Limpar filtros
              </Button>
            </div>
          )}

          {!online && (
            <Alert role="alert">
              <WifiOff className="h-4 w-4" aria-hidden />
              <AlertTitle>Você está offline</AlertTitle>
              <AlertDescription>
                A lista está sendo exibida a partir dos dados locais desta sessão.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {isEmptyModule ? (
            <EmptyState
              title="Nenhuma entrevista ou diligência cadastrada"
              description="Crie o primeiro registro para começar."
            />
          ) : noResultsWithFilters ? (
            <EmptyState
              title="Nenhum registro corresponde aos filtros"
              description="Ajuste os filtros para localizar registros."
            />
          ) : noResultsNoFilters ? (
            <EmptyState
              title="Nenhum resultado nesta aba"
              description="Alterne para outra aba para visualizar registros."
            />
          ) : (
            <RecordsTable
              records={filtered}
              onOpen={openRecord}
              onStart={startRecord}
              onCancel={cancelRecord}
              onShowSummary={(rec) => setSummaryRecord(rec)}
            />
          )}
        </CardContent>
      </Card>

      <InterviewFormDialog open={showInterviewForm} onOpenChange={setShowInterviewForm} />
      <DiligenceFormDialog open={showDiligenceForm} onOpenChange={setShowDiligenceForm} />
      <InterviewWorkspaceDialog
        interviewId={openInterviewId}
        open={openInterviewId !== null}
        onOpenChange={(v) => (v ? null : setOpenInterviewId(null))}
      />
      <DiligenceWorkspaceDialog
        diligenceId={openDiligenceId}
        open={openDiligenceId !== null}
        onOpenChange={(v) => (v ? null : setOpenDiligenceId(null))}
      />
      <InterviewSummaryDialog
        record={summaryRecord}
        open={summaryRecord !== null}
        onOpenChange={(v) => (v ? null : setSummaryRecord(null))}
      />
    </div>
  );
}

function IndicatorCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 p-10 text-center">
      <Filter className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function RecordsTable({
  records,
  onOpen,
  onStart,
  onCancel,
  onShowSummary,
}: {
  records: readonly ModuleRecord[];
  onOpen: (rec: ModuleRecord) => void;
  onStart: (rec: ModuleRecord) => void;
  onCancel: (rec: ModuleRecord) => void;
  onShowSummary: (rec: ModuleRecord) => void;
}) {
  return (
    <div className="w-full overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Pendências</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[260px] break-words align-top">
                  <p className="font-medium">{r.title}</p>
                </TableCell>
                <TableCell className="align-top">{MODULE_KIND_LABEL[r.kind]}</TableCell>
                <TableCell className="align-top">{getCaseNumberLabel(r.caseId) || "—"}</TableCell>
                <TableCell className="align-top text-xs">
                  {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="align-top text-xs">{r.responsibleLabel}</TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline">{INTERVIEW_STATUS_LABEL[r.status]}</Badge>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {r.pendingItems.length > 0 ? r.pendingItems.length : "—"}
                </TableCell>
                <TableCell className="align-top text-right">
                  <RowActions
                    rec={r}
                    onOpen={onOpen}
                    onStart={onStart}
                    onCancel={onCancel}
                    onShowSummary={onShowSummary}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="space-y-2 md:hidden">
        {records.map((r) => (
          <li key={r.id} className="rounded-md border border-border/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 break-words font-medium">{r.title}</p>
              <Badge variant="outline">{INTERVIEW_STATUS_LABEL[r.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {MODULE_KIND_LABEL[r.kind]} · {r.responsibleLabel}
            </p>
            {r.scheduledAt && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" aria-hidden />
                {new Date(r.scheduledAt).toLocaleString("pt-BR")}
              </p>
            )}
            <div className="mt-2">
              <RowActions
                rec={r}
                onOpen={onOpen}
                onStart={onStart}
                onCancel={onCancel}
                onShowSummary={onShowSummary}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowActions({
  rec,
  onOpen,
  onStart,
  onCancel,
  onShowSummary,
}: {
  rec: ModuleRecord;
  onOpen: (r: ModuleRecord) => void;
  onStart: (r: ModuleRecord) => void;
  onCancel: (r: ModuleRecord) => void;
  onShowSummary: (r: ModuleRecord) => void;
}) {
  const s = rec.status;
  if (s === "cancelada") {
    return (
      <Button size="sm" variant="outline" onClick={() => onOpen(rec)}>
        Visualizar
      </Button>
    );
  }
  if (s === "concluida") {
    return (
      <Button size="sm" variant="outline" onClick={() => onShowSummary(rec)}>
        Ver resumo
      </Button>
    );
  }
  if (s === "em_andamento" || s === "pausada") {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" onClick={() => onOpen(rec)}>
          Continuar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onCancel(rec)}>
          Cancelar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => onOpen(rec)}>
        Abrir
      </Button>
      <Button size="sm" onClick={() => onStart(rec)}>
        Iniciar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onCancel(rec)}>
        Cancelar
      </Button>
    </div>
  );
}
