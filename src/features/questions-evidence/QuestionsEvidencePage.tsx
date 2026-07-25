/**
 * LV-12 — Página principal: Quesitos e evidências.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Filter,
  ListChecks,
  Plus,
  Search,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { processos, pericias } from "@/lib/mock/data";
import {
  QUESTION_ORIGIN_LABEL,
  QUESTION_PRIORITY_LABEL,
  QUESTION_STATUS_LABEL,
  COVERAGE_BAND_LABEL,
} from "./question-labels";
import {
  QUESTION_ORIGINS,
  QUESTION_PRIORITIES,
  QUESTION_STATUSES,
  type ExpertQuestion,
} from "./question-types";
import {
  applyQuestionFilters,
  countIndicators,
  EMPTY_QUESTION_FILTERS,
  getCaseNumberLabel,
  hasActiveQuestionFilters,
  type QuestionFilters,
  type QuestionTab,
} from "./question-filters";
import { computeCoverage } from "./question-coverage";
import {
  listQuestions,
  subscribeQuestionsStore,
} from "./question-mock-store";
import { QuestionFormDialog } from "./QuestionFormDialog";
import { QuestionDetailDialog } from "./QuestionDetailDialog";
import { CoveragePanel } from "./CoveragePanel";
import { PreparedForReportDialog } from "./PreparedForReportDialog";

const SEED_REFERENCE_ISO = "2026-07-25T12:00:00.000Z";

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

function useQuestions(): readonly ExpertQuestion[] {
  return useSyncExternalStore(subscribeQuestionsStore, listQuestions, listQuestions);
}

function bandTone(band: string): string {
  switch (band) {
    case "completa":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "boa":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
    case "parcial":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "baixa":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    default:
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
  }
}

function statusTone(status: string): string {
  if (status === "respondido") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "com_divergencia") return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
  if (status === "parcial") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (status === "sem_evidencia") return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
  if (status === "nao_aplicavel") return "bg-muted text-muted-foreground";
  return "bg-muted text-foreground";
}

export function QuestionsEvidencePage() {
  const questions = useQuestions();
  const online = useOnline();
  const [filters, setFilters] = useState<QuestionFilters>(EMPTY_QUESTION_FILTERS);
  const [showForm, setShowForm] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showPrepared, setShowPrepared] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 60);
    return () => clearTimeout(t);
  }, []);

  const indicators = useMemo(() => countIndicators(questions), [questions]);
  const filtered = useMemo(
    () => applyQuestionFilters(questions, filters, SEED_REFERENCE_ISO),
    [questions, filters],
  );

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) set.add(q.responsibleLabel);
    return Array.from(set).sort();
  }, [questions]);

  const detail = useMemo(
    () => (detailId ? questions.find((q) => q.id === detailId) ?? null : null),
    [detailId, questions],
  );

  const active = hasActiveQuestionFilters(filters);
  const emptyModule = questions.length === 0;
  const noResults = !emptyModule && filtered.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6" aria-busy={loading}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Quesitos e evidências
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Organize perguntas técnicas, vincule evidências e acompanhe a cobertura da perícia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo quesito
          </Button>
          <Button variant="outline" onClick={() => setShowCoverage(true)}>
            <BarChart3 className="mr-2 h-4 w-4" /> Analisar cobertura
          </Button>
          <Button variant="outline" onClick={() => setShowPrepared(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Preparar para o laudo
          </Button>
        </div>
      </header>

      {!online && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Você está offline</AlertTitle>
          <AlertDescription>
            O módulo continua operando com os dados atualmente carregados.
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <IndicatorCard label="Total de quesitos" value={indicators.total} />
        <IndicatorCard label="Respondidos" value={indicators.respondidos} tone="emerald" />
        <IndicatorCard label="Parcialmente respondidos" value={indicators.parciais} tone="amber" />
        <IndicatorCard label="Sem evidência" value={indicators.semEvidencia} tone="orange" />
        <IndicatorCard label="Com divergência" value={indicators.comDivergencia} tone="rose" />
      </section>

      <Tabs value={filters.tab} onValueChange={(v) => setFilters({ ...filters, tab: v as QuestionTab })}>
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="respondidos">Respondidos</TabsTrigger>
          <TabsTrigger value="com_lacunas">Com lacunas</TabsTrigger>
          <TabsTrigger value="com_divergencia">Com divergência</TabsTrigger>
          <TabsTrigger value="preparados">Preparados para o laudo</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por texto, processo, responsável, evidência..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="pl-8"
                aria-label="Pesquisar quesitos"
              />
            </div>
            {active && (
              <Button variant="ghost" onClick={() => setFilters(EMPTY_QUESTION_FILTERS)}>
                <X className="mr-2 h-4 w-4" /> Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Origem"
              value={filters.origin}
              onChange={(v) => setFilters({ ...filters, origin: v as QuestionFilters["origin"] })}
              options={[["todas", "Todas"], ...QUESTION_ORIGINS.map((o) => [o, QUESTION_ORIGIN_LABEL[o]] as [string, string])]}
            />
            <FilterSelect
              label="Situação"
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v as QuestionFilters["status"] })}
              options={[["todas", "Todas"], ...QUESTION_STATUSES.map((o) => [o, QUESTION_STATUS_LABEL[o]] as [string, string])]}
            />
            <FilterSelect
              label="Prioridade"
              value={filters.priority}
              onChange={(v) => setFilters({ ...filters, priority: v as QuestionFilters["priority"] })}
              options={[["todas", "Todas"], ...QUESTION_PRIORITIES.map((o) => [o, QUESTION_PRIORITY_LABEL[o]] as [string, string])]}
            />
            <FilterSelect
              label="Processo"
              value={filters.caseId}
              onChange={(v) => setFilters({ ...filters, caseId: v as QuestionFilters["caseId"] })}
              options={[["todos", "Todos"], ...processos.map((p) => [p.id, p.numero] as [string, string])]}
            />
            <FilterSelect
              label="Perícia"
              value={filters.expertiseId}
              onChange={(v) => setFilters({ ...filters, expertiseId: v as QuestionFilters["expertiseId"] })}
              options={[["todas", "Todas"], ...pericias.map((p) => [p.id, `${p.id} — ${p.tipo ?? p.id}`] as [string, string])]}
            />
            <FilterSelect
              label="Responsável"
              value={filters.responsibleLabel}
              onChange={(v) => setFilters({ ...filters, responsibleLabel: v })}
              options={[["todos", "Todos"], ...responsibles.map((r) => [r, r] as [string, string])]}
            />
            <FilterSelect
              label="Prazo"
              value={filters.deadline}
              onChange={(v) => setFilters({ ...filters, deadline: v as QuestionFilters["deadline"] })}
              options={[
                ["todos", "Todos"],
                ["sem_prazo", "Sem prazo"],
                ["no_prazo", "No prazo"],
                ["vencendo", "Vencendo em breve"],
                ["vencido", "Vencido"],
              ]}
            />
            <FilterSelect
              label="Evidência"
              value={filters.evidence}
              onChange={(v) => setFilters({ ...filters, evidence: v as QuestionFilters["evidence"] })}
              options={[
                ["todos", "Todos"],
                ["com", "Com evidência"],
                ["sem", "Sem evidência"],
              ]}
            />
            <FilterSelect
              label="Preparado para o laudo"
              value={filters.prepared}
              onChange={(v) => setFilters({ ...filters, prepared: v as QuestionFilters["prepared"] })}
              options={[
                ["todos", "Todos"],
                ["preparado", "Preparado"],
                ["nao_preparado", "Não preparado"],
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">Carregando quesitos…</p>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && emptyModule && (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="Nenhum quesito cadastrado"
          description="Comece cadastrando o primeiro quesito para este processo."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo quesito
            </Button>
          }
        />
      )}

      {!loading && noResults && (
        <EmptyState
          icon={<Filter className="h-8 w-8" />}
          title={active ? "Nenhum quesito corresponde aos filtros" : "Nenhum quesito encontrado"}
          description={
            active
              ? "Ajuste ou limpe os filtros para ver mais resultados."
              : "Nenhum quesito foi localizado."
          }
          action={
            active ? (
              <Button variant="outline" onClick={() => setFilters(EMPTY_QUESTION_FILTERS)}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <section aria-label="Lista de quesitos" className="space-y-3">
          {filtered.map((q) => (
            <QuestionRow key={q.id} q={q} onOpen={() => setDetailId(q.id)} />
          ))}
        </section>
      )}

      {showForm && (
        <QuestionFormDialog open={showForm} onClose={() => setShowForm(false)} />
      )}
      {detail && (
        <QuestionDetailDialog
          questionId={detail.id}
          onClose={() => setDetailId(null)}
        />
      )}
      {showCoverage && (
        <CoveragePanel open={showCoverage} onClose={() => setShowCoverage(false)} />
      )}
      {showPrepared && (
        <PreparedForReportDialog open={showPrepared} onClose={() => setShowPrepared(false)} />
      )}
    </div>
  );
}

function IndicatorCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "orange"
          ? "text-orange-600"
          : tone === "rose"
            ? "text-rose-600"
            : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly [string, string][];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function QuestionRow({ q, onOpen }: { q: ExpertQuestion; onOpen: () => void }) {
  const cov = useMemo(() => computeCoverage(q, SEED_REFERENCE_ISO), [q]);
  const caseNumber = getCaseNumberLabel(q.caseId);
  const openGaps = q.gapItems.filter((g) => !g.resolved).length;
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[80px_1fr_auto]">
        <div className="text-center md:text-left">
          <p className="text-xs uppercase text-muted-foreground">Nº</p>
          <p className="text-lg font-semibold">{q.sequence}</p>
        </div>
        <div className="min-w-0 space-y-2">
          <p className="break-words text-sm text-foreground sm:text-base">{q.text}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{QUESTION_ORIGIN_LABEL[q.origin]}</Badge>
            {q.originLabel && <span className="text-muted-foreground">— {q.originLabel}</span>}
            {caseNumber && <Badge variant="secondary">{caseNumber}</Badge>}
            <Badge variant="outline">Prioridade: {QUESTION_PRIORITY_LABEL[q.priority]}</Badge>
            <Badge className={statusTone(q.status)}>{QUESTION_STATUS_LABEL[q.status]}</Badge>
            <Badge variant="outline">Evidências: {q.evidenceLinks.length}</Badge>
            <Badge className={bandTone(cov.band)}>
              Cobertura: {cov.score}% · {COVERAGE_BAND_LABEL[cov.band]}
            </Badge>
            {openGaps > 0 && (
              <Badge className="bg-rose-500/15 text-rose-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {openGaps} lacuna(s)
              </Badge>
            )}
            {q.readyForReport && (
              <Badge className="bg-sky-500/15 text-sky-700">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Preparado
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <Button size="sm" onClick={onOpen}>
            Abrir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
