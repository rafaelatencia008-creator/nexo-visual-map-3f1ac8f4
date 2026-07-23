/**
 * LV-08.6B — card de "Histórico de alterações" (auditoria).
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
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS_PT,
  AUDIT_ACTION_TO_CATEGORY,
  EMPTY_AUDIT_FILTER,
  buildAuditFilter,
  formatIsoDateTimePtBr,
  getPublicAuthorLabel,
  isAuditFilterActive,
  type AuditCategory,
  type AuditFilterFormValues,
} from "@/features/processos/process-audit-snapshot-model";
import type { CaseId } from "@/domain/core/ids";
import type { AuditEventListOptions } from "@/domain/services/audit-service";

const ACTION_LABEL_PT: Readonly<Record<string, string>> = {
  "case.created": "Processo cadastrado",
  "case.updated": "Processo atualizado",
  "casePerson.created": "Pessoa vinculada",
  "casePerson.updated": "Pessoa atualizada",
  "casePerson.removed": "Pessoa desvinculada",
  "relationship.created": "Relação registrada",
  "relationship.updated": "Relação atualizada",
  "relationship.removed": "Relação removida",
  "assignment.created": "Profissional vinculado",
  "assignment.updated": "Vínculo atualizado",
  "assignment.removed": "Vínculo encerrado",
  "casePlanItem.created": "Item do plano criado",
  "casePlanItem.updated": "Item do plano atualizado",
  "casePlanItem.statusChanged": "Status do plano alterado",
  "casePlanItem.removed": "Item do plano removido",
  "caseTimelineEntry.created": "Registro adicionado à cronologia",
  "caseTimelineEntry.updated": "Registro da cronologia atualizado",
  "caseTimelineEntry.removed": "Registro removido da cronologia",
  "caseSnapshot.created": "Snapshot criado",
};

export type ProcessAuditHistoryCardProps = Readonly<{
  caseId: CaseId;
  events: readonly AuditEvent[];
  currentUserId: UserId;
  filter: AuditFilterFormValues;
  onFilterChange: (next: AuditFilterFormValues) => void;
  onApplyFilter: (options: AuditEventListOptions | null) => void;
  filterError: string | null;
  loading: boolean;
}>;

export function ProcessAuditHistoryCard({
  events,
  currentUserId,
  filter,
  onFilterChange,
  onApplyFilter,
  filterError,
  loading,
}: ProcessAuditHistoryCardProps) {
  const [open, setOpen] = React.useState(false);

  const submitFilter = () => {
    const built = buildAuditFilter(filter);
    if (!built.ok) {
      onApplyFilter(null);
      return;
    }
    const opts: AuditEventListOptions = {};
    if (built.actions !== undefined) {
      (opts as { actions?: readonly string[] }).actions = built.actions;
    }
    if (built.occurredFrom !== undefined) {
      (opts as { occurredFrom?: string }).occurredFrom = built.occurredFrom;
    }
    if (built.occurredTo !== undefined) {
      (opts as { occurredTo?: string }).occurredTo = built.occurredTo;
    }
    onApplyFilter(Object.keys(opts).length === 0 ? {} : opts);
  };

  const clearFilter = () => {
    onFilterChange(EMPTY_AUDIT_FILTER);
    onApplyFilter({});
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Histórico de alterações</CardTitle>
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
                onValueChange={(v) =>
                  onFilterChange({
                    ...filter,
                    category:
                      v === "__all__" ? "" : (v as AuditCategory),
                  })
                }
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
          <p className="text-sm text-muted-foreground">
            Nenhuma alteração registrada para este processo.
          </p>
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
                      {ACTION_LABEL_PT[e.action] ?? e.action}
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
