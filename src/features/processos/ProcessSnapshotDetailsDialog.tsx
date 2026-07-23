/**
 * LV-08.6B — diálogo somente leitura de detalhes do snapshot.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import type { CaseSnapshot } from "@/domain/core/case-audit";
import type { UserId } from "@/domain/core/ids";
import {
  computeSnapshotPayloadCounters,
  formatIsoDatePtBr,
  formatIsoDateTimePtBr,
  getPublicAuthorLabel,
  type AuditSnapshotPublicError,
} from "@/features/processos/process-audit-snapshot-model";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
} from "@/features/processos/process-list-model";
import {
  CASE_PERSON_ROLE_LABELS_PT,
  RELATIONSHIP_TYPE_LABELS_PT,
} from "@/features/processos/process-people-model";
import {
  ASSIGNMENT_ROLE_LABELS_PT,
  CASE_PLAN_ITEM_KIND_LABELS_PT,
  CASE_PLAN_ITEM_PRIORITY_LABELS_PT,
  CASE_PLAN_ITEM_STATUS_LABELS_PT,
  CASE_TIMELINE_ENTRY_KIND_LABELS_PT,
} from "@/features/processos/process-plan-model";

const ASSIGNMENT_STATUS_LABELS_PT: Readonly<Record<string, string>> = {
  active: "Ativo",
  suspended: "Suspenso",
  concluded: "Concluído",
  cancelled: "Cancelado",
};

export type ProcessSnapshotDetailsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: AuditSnapshotPublicError | null;
  snapshot: CaseSnapshot | null;
  currentUserId: UserId;
  canRetry: boolean;
  onRetry: () => void;
}>;

export function ProcessSnapshotDetailsDialog({
  open,
  onOpenChange,
  loading,
  error,
  snapshot,
  currentUserId,
  canRetry,
  onRetry,
}: ProcessSnapshotDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Snapshot do processo</DialogTitle>
          <DialogDescription>
            Visualização somente leitura do estado registrado neste marco
            histórico.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div role="status" aria-live="polite" className="py-8 text-center">
            <Loader2
              className="mx-auto h-6 w-6 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Carregando snapshot…
            </p>
          </div>
        ) : error !== null ? (
          <div className="space-y-3 py-4">
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
            {canRetry ? (
              <Button type="button" variant="outline" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
        ) : snapshot !== null ? (
          <SnapshotBody snapshot={snapshot} currentUserId={currentUserId} />
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotBody({
  snapshot,
  currentUserId,
}: {
  snapshot: CaseSnapshot;
  currentUserId: UserId;
}) {
  const counters = computeSnapshotPayloadCounters(snapshot.payload);
  const author = getPublicAuthorLabel(
    { actorUserId: snapshot.createdByUserId },
    currentUserId,
  );
  const personMap = new Map(snapshot.payload.persons.map((p) => [p.id, p]));
  const c = snapshot.payload.case;
  return (
    <div className="space-y-6" aria-readonly="true">
      <section aria-labelledby="snap-info">
        <h3
          id="snap-info"
          className="text-sm font-semibold text-foreground"
        >
          Identificação
        </h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Nome" value={snapshot.label} />
          <Field
            label="Criado em"
            value={
              <time dateTime={snapshot.createdAt}>
                {formatIsoDateTimePtBr(snapshot.createdAt)}
              </time>
            }
          />
          <Field label="Autor" value={author} />
          <Field label="Referência do processo" value={c.reference} />
          {snapshot.reason !== undefined ? (
            <Field label="Motivo" value={snapshot.reason} full />
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="snap-case">
        <h3 id="snap-case" className="text-sm font-semibold text-foreground">
          Resumo do processo
        </h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Título" value={c.title} />
          <Field
            label="Situação"
            value={CASE_STATUS_LABELS_PT[c.status] ?? c.status}
          />
          <Field
            label="Confidencialidade"
            value={
              CONFIDENTIALITY_LABELS_PT[c.confidentiality] ?? c.confidentiality
            }
          />
        </dl>
      </section>

      <section aria-labelledby="snap-people">
        <h3
          id="snap-people"
          className="text-sm font-semibold text-foreground"
        >
          Pessoas vinculadas ({counters.persons})
        </h3>
        {snapshot.payload.casePersons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma pessoa registrada neste snapshot.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {snapshot.payload.casePersons.map((cp) => {
              const p = personMap.get(cp.personId);
              return (
                <li key={cp.id} className="flex flex-wrap gap-2">
                  <span className="font-medium">
                    {p ? p.displayLabel : "Pessoa registrada"}
                  </span>
                  <Badge variant="secondary">
                    {CASE_PERSON_ROLE_LABELS_PT[cp.role] ?? cp.role}
                  </Badge>
                  {cp.restrictedByDefault ? (
                    <Badge variant="outline">Restrita por padrão</Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="snap-rels">
        <h3 id="snap-rels" className="text-sm font-semibold text-foreground">
          Relações ({counters.relationships})
        </h3>
        {snapshot.payload.relationships.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma relação registrada neste snapshot.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {snapshot.payload.relationships.map((r) => {
              const from = personMap.get(r.fromPersonId);
              const to = personMap.get(r.toPersonId);
              return (
                <li key={r.id} className="flex flex-wrap gap-2">
                  <span>
                    {from ? from.displayLabel : "Pessoa"} →{" "}
                    {to ? to.displayLabel : "Pessoa"}
                  </span>
                  <Badge variant="secondary">
                    {RELATIONSHIP_TYPE_LABELS_PT[r.type] ?? r.type}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="snap-team">
        <h3 id="snap-team" className="text-sm font-semibold text-foreground">
          Profissionais vinculados ({counters.professionals})
        </h3>
        {snapshot.payload.assignments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum profissional registrado neste snapshot.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {snapshot.payload.assignments.map((a) => (
              <li key={a.id} className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {ASSIGNMENT_ROLE_LABELS_PT[a.role] ?? a.role}
                  </Badge>
                  <Badge variant="outline">
                    {ASSIGNMENT_STATUS_LABELS_PT[a.status] ?? a.status}
                  </Badge>
                  {a.section !== undefined && a.section.length > 0 ? (
                    <Badge variant="outline">{a.section}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Início:{" "}
                  <time dateTime={a.startedOn}>
                    {formatIsoDatePtBr(a.startedOn)}
                  </time>
                  {a.endedOn !== undefined ? (
                    <>
                      {" "}
                      · Fim:{" "}
                      <time dateTime={a.endedOn}>
                        {formatIsoDatePtBr(a.endedOn)}
                      </time>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="snap-plan">
        <h3 id="snap-plan" className="text-sm font-semibold text-foreground">
          Plano de trabalho ({counters.planItems})
        </h3>
        {snapshot.payload.casePlanItems.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum item registrado neste snapshot.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {snapshot.payload.casePlanItems.map((it) => (
              <li key={it.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.title}</span>
                  <Badge variant="secondary">
                    {CASE_PLAN_ITEM_KIND_LABELS_PT[it.kind]}
                  </Badge>
                  <Badge variant="outline">
                    {CASE_PLAN_ITEM_STATUS_LABELS_PT[it.status]}
                  </Badge>
                  <Badge variant="outline">
                    Prioridade: {CASE_PLAN_ITEM_PRIORITY_LABELS_PT[it.priority]}
                  </Badge>
                </div>
                {it.dueOn !== undefined ? (
                  <p className="text-xs text-muted-foreground">
                    Prazo:{" "}
                    <time dateTime={it.dueOn}>
                      {formatIsoDatePtBr(it.dueOn)}
                    </time>
                  </p>
                ) : null}
                {it.description !== undefined ? (
                  <p className="whitespace-pre-line text-xs text-muted-foreground">
                    {it.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="snap-timeline">
        <h3
          id="snap-timeline"
          className="text-sm font-semibold text-foreground"
        >
          Cronologia ({counters.timelineEntries})
        </h3>
        {snapshot.payload.caseTimelineEntries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum registro na cronologia deste snapshot.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {snapshot.payload.caseTimelineEntries.map((t) => (
              <li key={t.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <time
                    dateTime={t.occurredOn}
                    className="text-xs text-muted-foreground"
                  >
                    {formatIsoDatePtBr(t.occurredOn)}
                  </time>
                  <Badge variant="secondary">
                    {CASE_TIMELINE_ENTRY_KIND_LABELS_PT[t.kind]}
                  </Badge>
                  <span className="font-medium">{t.title}</span>
                </div>
                {t.description !== undefined ? (
                  <p className="whitespace-pre-line text-xs text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
