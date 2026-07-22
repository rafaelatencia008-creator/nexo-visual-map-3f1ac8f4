import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CASE_STATUSES,
  CONFIDENTIALITY_LEVELS,
  type CaseStatus,
  type ConfidentialityLevel,
} from "@/domain/core/case";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
  PROCESS_SORT_OPTIONS,
} from "./process-list-model";

export type ProcessFiltersValue = Readonly<{
  search: string;
  status: CaseStatus | "all";
  confidentiality: ConfidentialityLevel | "all";
  sortId: string;
}>;

export type ProcessListFiltersProps = Readonly<{
  value: ProcessFiltersValue;
  onChange: (next: ProcessFiltersValue) => void;
  onClear?: () => void;
  showClear?: boolean;
}>;

export function ProcessListFilters(props: ProcessListFiltersProps) {
  const { value, onChange, onClear, showClear } = props;
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_220px]">
      <div className="flex flex-col gap-1">
        <Label htmlFor="processos-busca" className="text-xs text-muted-foreground">
          Buscar processos
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="processos-busca"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Buscar por referência ou título"
            className="pl-9"
            aria-label="Buscar por referência ou título"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="processos-status" className="text-xs text-muted-foreground">
          Status
        </Label>
        <Select
          value={value.status}
          onValueChange={(v) =>
            onChange({ ...value, status: v as ProcessFiltersValue["status"] })
          }
        >
          <SelectTrigger id="processos-status" aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {CASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CASE_STATUS_LABELS_PT[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="processos-conf" className="text-xs text-muted-foreground">
          Confidencialidade
        </Label>
        <Select
          value={value.confidentiality}
          onValueChange={(v) =>
            onChange({
              ...value,
              confidentiality: v as ProcessFiltersValue["confidentiality"],
            })
          }
        >
          <SelectTrigger id="processos-conf" aria-label="Filtrar por confidencialidade">
            <SelectValue placeholder="Confidencialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {CONFIDENTIALITY_LEVELS.map((c) => (
              <SelectItem key={c} value={c}>
                {CONFIDENTIALITY_LABELS_PT[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="processos-ordem" className="text-xs text-muted-foreground">
          Ordenar por
        </Label>
        <div className="flex gap-2">
          <Select
            value={value.sortId}
            onValueChange={(v) => onChange({ ...value, sortId: v })}
          >
            <SelectTrigger id="processos-ordem" aria-label="Ordenar processos">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {PROCESS_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showClear && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClear}
              aria-label="Limpar filtros"
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
