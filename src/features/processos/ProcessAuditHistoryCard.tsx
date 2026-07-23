/**
 * LV-08.6B / LV-08.6B.1 — card de "Histórico de alterações" (auditoria).
 */

import * as React from "react";
import { Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditEvent } from "@/domain/core/case-audit";
import type { UserId } from "@/domain/core/ids";
import {
  AUDIT_ACTION_LABELS_PT,
  AUDIT_ACTION_TO_CATEGORY,
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS_PT,
  EMPTY_AUDIT_FILTER,
  buildAuditFilter,
  formatIsoDateTimePtBr,
  getPublicAuthorLabel,
  isAuditCategory,
  isAuditFilterActive,
  type AuditFilterBuildError,
  type AuditFilterFormValues,
} from "@/features/processos/process-audit-snapshot-model";
import type { AuditEventListOptions } from "@/domain/services/audit-service";

export const AUDIT_HISTORY_TITLE_ID = "audit-history-title";

export type ProcessAuditHistoryCardProps = Readonly<{
  events: readonly AuditEvent[];
  currentUserId: UserId;
  filter: AuditFilterFormValues;
  onFilterChange: (next: AuditFilterFormValues) => void;
  onApplyFilter: (options: AuditEventListOptions) => void;
  onFilterValidationError: (reason: AuditFilterBuildError) => void;
  onClearFilter: () => void;
  filterError: string | null;
  loading: boolean;
  filtered: boolean;
}>;

export function ProcessAuditHistoryCard({
  events,
  currentUserId,
  filter,
  onFilterChange,
  onApplyFilter,
  onFilterValidationError,
  onClearFilter,
  filterError,
  loading,
  filtered,
}: ProcessAuditHistoryCardProps) {
  const [open, setOpen] = React.useState(false);

  const submitFilter = () => {
    const built = buildAuditFilter(filter);
    if (!built.ok) {
      onFilterValidationError(built.reason);
      return;
    }
    onApplyFilter(built.options);
  };

  const clearFilter = () => {
    onFilterChange(EMPTY_AUDIT_FILTER);
    onClearFilter();
  };

  const emptyTitle = filtered
    ? "Nenhuma alteração encontrada"
    : "Nenhuma alteração registrada";
  const emptyDesc = filtered
    ? "Revise os filtros aplicados."
    : "As ações realizadas neste processo aparecerão aqui.";

  return (
    <Card aria-labelledby={AUDIT_HISTORY_TITLE_ID}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle id={AUDIT_HISTORY_TITLE_ID} className="text-base">
          Histórico de alterações
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="audit-filters"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros
          {isAuditFilterActive(filter) ? (
            <Badge variant="secondary" className="ml-1">
              Ativos
            </Badge>
          ) : null}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open ? (
          <div
            id="audit-filters"
            className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-3"
          >
            <div className="space-y-1">
              <Label htmlFor="audit-cat">Categoria</Label>
              <Select
                value={filter.category === "" ? "__all__" : filter.category}
                onValueChange={(v) => {
                  if (v === "__all__") {
                    onFilterChange({ ...filter, category: "" });
                  } else if (isAuditCategory(v)) {
                    onFilterChange({ ...filter, category: v });
                  }
                }}
              >
                <SelectTrigger id="audit-cat">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="pointer-events-auto">
                  <SelectItem value="__all__">Todas</SelectItem>
                  {AUDIT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {AUDIT_CATEGORY_LABELS_PT[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-from">De</Label>
              <Input
                id="audit-from"
                type="date"
                value={filter.dateFrom}
                onChange={(e) =>
                  onFilterChange({ ...filter, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-to">Até</Label>
              <Input
                id="audit-to"
                type="date"
                value={filter.dateTo}
                onChange={(e) =>
                  onFilterChange({ ...filter, dateTo: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={submitFilter}
                disabled={loading}
              >
                Aplicar filtros
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilter}
                disabled={loading}
              >
                Limpar
              </Button>
              {filterError !== null ? (
                <p role="alert" className="text-sm text-destructive">
                  {filterError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {events.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{emptyDesc}</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {events.map((e) => {
              const category = AUDIT_ACTION_TO_CATEGORY[e.action];
              return (
                <li key={e.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <time
                      dateTime={e.occurredAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatIsoDateTimePtBr(e.occurredAt)}
                    </time>
                    <Badge variant="secondary">
                      {AUDIT_CATEGORY_LABELS_PT[category]}
                    </Badge>
                    <span className="text-sm font-medium">
                      {AUDIT_ACTION_LABELS_PT[e.action]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Por {getPublicAuthorLabel(e, currentUserId)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
