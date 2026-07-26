import { useMemo, useState } from "react";
import { Search, Plus, Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportTemplateStatusBadge } from "./ReportTemplateStatusBadge";
import {
  REPORT_TEMPLATE_SPECIALTIES,
  REPORT_TEMPLATE_SPECIALTY_LABEL,
  REPORT_TEMPLATE_STATUSES,
  REPORT_TEMPLATE_STATUS_LABEL,
  type ReportTemplateId,
  type ReportTemplateSpecialty,
  type ReportTemplateStatus,
  type ReportTemplateSummary,
} from "../report-template-types";

type SortMode = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

export interface ReportTemplateListProps {
  readonly templates: readonly ReportTemplateSummary[];
  readonly selectedId: ReportTemplateId | null;
  readonly onSelect: (id: ReportTemplateId) => void;
  readonly selectedForExport: ReadonlySet<string>;
  readonly onToggleExport: (id: ReportTemplateId) => void;
  readonly onNew: () => void;
  readonly onImport: () => void;
  readonly onExportSelected: () => void;
}

export function ReportTemplateList(props: ReportTemplateListProps) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<ReportTemplateSpecialty | "all">("all");
  const [status, setStatus] = useState<ReportTemplateStatus | "all">("all");
  const [sort, setSort] = useState<SortMode>("updated_desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = props.templates.slice();
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q));
    if (specialty !== "all") list = list.filter((t) => t.specialty === specialty);
    if (status !== "all") list = list.filter((t) => t.status === status);
    list.sort((a, b) => {
      switch (sort) {
        case "name_asc":
          return a.name.localeCompare(b.name, "pt-BR");
        case "name_desc":
          return b.name.localeCompare(a.name, "pt-BR");
        case "updated_asc":
          return a.updatedAt.localeCompare(b.updatedAt);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return list;
  }, [props.templates, query, specialty, status, sort]);

  const hasFilters =
    query.length > 0 || specialty !== "all" || status !== "all" || sort !== "updated_desc";

  const exportCount = props.selectedForExport.size;

  return (
    <div className="flex h-full flex-col gap-3 border-r bg-background/40 p-3 lg:w-80">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={props.onNew} className="gap-1">
          <Plus className="h-4 w-4" aria-hidden />
          Novo modelo
        </Button>
        <Button size="sm" variant="outline" onClick={props.onImport} className="gap-1">
          <Upload className="h-4 w-4" aria-hidden />
          Importar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={exportCount === 0}
          onClick={props.onExportSelected}
          className="gap-1"
          aria-label={`Exportar ${exportCount} modelo(s) selecionado(s)`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Exportar ({exportCount})
        </Button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome…"
          aria-label="Buscar modelos"
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="sr-only" htmlFor="rtpl-specialty">Especialidade</label>
          <Select
            value={specialty}
            onValueChange={(v) => setSpecialty(v as ReportTemplateSpecialty | "all")}
          >
            <SelectTrigger id="rtpl-specialty" aria-label="Filtrar por especialidade">
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas especialidades</SelectItem>
              {REPORT_TEMPLATE_SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REPORT_TEMPLATE_SPECIALTY_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="sr-only" htmlFor="rtpl-status">Status</label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ReportTemplateStatus | "all")}
          >
            <SelectTrigger id="rtpl-status" aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {REPORT_TEMPLATE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REPORT_TEMPLATE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="h-8 text-xs" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Recentes primeiro</SelectItem>
            <SelectItem value="updated_asc">Antigos primeiro</SelectItem>
            <SelectItem value="name_asc">Nome (A→Z)</SelectItem>
            <SelectItem value="name_desc">Nome (Z→A)</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => {
              setQuery("");
              setSpecialty("all");
              setStatus("all");
              setSort("updated_desc");
            }}
          >
            <X className="h-3 w-3" aria-hidden />
            Limpar
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 rounded border">
        <ul role="list" className="divide-y">
          {filtered.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">
              Nenhum modelo encontrado.
            </li>
          )}
          {filtered.map((t) => {
            const active = props.selectedId === t.id;
            const checked = props.selectedForExport.has(t.id);
            return (
              <li key={t.id}>
                <div
                  className={
                    "flex items-start gap-2 p-3 text-left transition " +
                    (active ? "bg-primary/10" : "hover:bg-muted/40")
                  }
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => props.onToggleExport(t.id)}
                    aria-label={`Selecionar ${t.name} para exportação`}
                    className="mt-1"
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => props.onSelect(t.id)}
                    aria-current={active ? "true" : undefined}
                    aria-label={`Abrir modelo ${t.name}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium">
                        {t.name}
                      </span>
                      <ReportTemplateStatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{REPORT_TEMPLATE_SPECIALTY_LABEL[t.specialty]}</span>
                      <span aria-hidden>·</span>
                      <span>{t.sectionsCount} seções</span>
                      <span aria-hidden>·</span>
                      <span>{t.variablesCount} variáveis</span>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
