/**
 * LV-09.1B.7.2 — Página consultiva de disponibilidade (SCR-AGE-004).
 *
 * Consulta o motor aprovado `checkAppointmentAvailability` e apresenta
 * disponibilidade, conflitos ou motivos de indeterminação. NÃO cria,
 * altera, cancela, conclui ou remove compromissos. NÃO reinterpreta a
 * regra de sobreposição — apenas exibe a decisão retornada pelo motor.
 */

import * as React from "react";
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ServiceContext } from "@/domain/services/context";
import type { Assignment } from "@/domain/core/assignment";
import type { Case } from "@/domain/core/case";
import { isoDateTimeToEpoch } from "@/domain/core/common";

import {
  checkAppointmentAvailability,
  type CheckAppointmentAvailabilityInput,
} from "./check-appointment-availability";
import type {
  AppointmentAvailabilityConflict,
  AppointmentAvailabilityIndeterminateReason,
} from "./availability";
import {
  buildAvailabilityConsultationInput,
  EMPTY_AVAILABILITY_FORM,
  type AvailabilityFormFieldError,
  type AvailabilityFormState,
} from "./availability-form";
import {
  formatAvailabilityAssignmentLabel,
  loadActiveAssignmentsForCase,
  loadAvailabilityCases,
  type AvailabilityOptionsResult,
  type AvailabilityPageEnvironment,
} from "./availability-options";
import type { CaseId } from "@/domain/core/ids";

export interface AgendaAvailabilityContentProps {
  readonly environment: AvailabilityPageEnvironment;
  readonly context: ServiceContext;
}

type OptionsState<T> =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; items: readonly T[] }>
  | Readonly<{ kind: "error"; reason: "consultation_failed" | "pagination_limit" }>;

type AvailabilityViewState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "checking"; requestId: number }>
  | Readonly<{ kind: "available"; requestId: number }>
  | Readonly<{
      kind: "conflict";
      requestId: number;
      conflicts: readonly AppointmentAvailabilityConflict[];
    }>
  | Readonly<{
      kind: "indeterminate";
      requestId: number;
      reason: AppointmentAvailabilityIndeterminateReason;
    }>;

const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDateTime(iso: string): string {
  const epoch = isoDateTimeToEpoch(iso as never);
  if (!Number.isFinite(epoch)) return iso;
  return DATETIME_FMT.format(new Date(epoch));
}

export function AgendaAvailabilityContent(
  props: AgendaAvailabilityContentProps,
): React.ReactElement {
  const { environment, context } = props;
  const [form, setForm] = React.useState<AvailabilityFormState>(EMPTY_AVAILABILITY_FORM);
  const [errors, setErrors] = React.useState<
    Readonly<Partial<Record<AvailabilityFormFieldError, string>>>
  >({});
  const [cases, setCases] = React.useState<OptionsState<Case>>({ kind: "idle" });
  const [casesAttempt, setCasesAttempt] = React.useState(0);
  const [assignments, setAssignments] = React.useState<OptionsState<Assignment>>({
    kind: "idle",
  });
  const [assignmentsAttempt, setAssignmentsAttempt] = React.useState(0);
  const [view, setView] = React.useState<AvailabilityViewState>({ kind: "idle" });

  const mountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);
  const inFlightRef = React.useRef(false);
  const casesReqIdRef = React.useRef(0);
  const assignmentsReqIdRef = React.useRef(0);
  const resultPanelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Carregar processos -----------------------------------------------
  React.useEffect(() => {
    const reqId = ++casesReqIdRef.current;
    let cancelled = false;
    setCases({ kind: "loading" });
    loadAvailabilityCases(environment, context)
      .then((r: AvailabilityOptionsResult<Case>) => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== casesReqIdRef.current) return;
        if (r.kind === "ready") {
          setCases({ kind: "ready", items: r.items });
        } else {
          setCases({ kind: "error", reason: r.reason });
        }
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== casesReqIdRef.current) return;
        setCases({ kind: "error", reason: "consultation_failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [environment, context, casesAttempt]);

  // ---- Carregar vínculos -------------------------------------------------
  React.useEffect(() => {
    if (form.caseId.length === 0) {
      setAssignments({ kind: "idle" });
      return;
    }
    const reqId = ++assignmentsReqIdRef.current;
    let cancelled = false;
    setAssignments({ kind: "loading" });
    loadActiveAssignmentsForCase(environment, context, form.caseId as CaseId)
      .then((r: AvailabilityOptionsResult<Assignment>) => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== assignmentsReqIdRef.current) return;
        if (r.kind === "ready") {
          setAssignments({ kind: "ready", items: r.items });
        } else {
          setAssignments({ kind: "error", reason: r.reason });
        }
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        if (reqId !== assignmentsReqIdRef.current) return;
        setAssignments({ kind: "error", reason: "consultation_failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [environment, context, form.caseId, assignmentsAttempt]);

  // ---- Handlers ---------------------------------------------------------
  const invalidateResult = React.useCallback(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
    setView({ kind: "idle" });
  }, []);

  const handleCaseChange = React.useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...prev,
        caseId: value,
        assignmentId: "",
      }));
      setErrors((prev) => {
        const { caseId: _c, assignmentId: _a, ...rest } = prev;
        return rest;
      });
      invalidateResult();
    },
    [invalidateResult],
  );

  const handleAssignmentChange = React.useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, assignmentId: value }));
      setErrors((prev) => {
        const { assignmentId: _a, ...rest } = prev;
        return rest;
      });
      invalidateResult();
    },
    [invalidateResult],
  );

  const handleFieldChange = React.useCallback(
    (field: "startsAtLocal" | "endsAtLocal", value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const key: AvailabilityFormFieldError =
          field === "startsAtLocal" ? "startsAt" : "endsAt";
        if (prev[key] === undefined) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      invalidateResult();
    },
    [invalidateResult],
  );

  const runConsultation = React.useCallback(
    (input: CheckAppointmentAvailabilityInput, reqId: number) => {
      checkAppointmentAvailability(environment, context, input)
        .then((decision) => {
          if (!mountedRef.current) return;
          if (reqId !== requestIdRef.current) return;
          inFlightRef.current = false;
          if (decision.kind === "available") {
            setView({ kind: "available", requestId: reqId });
          } else if (decision.kind === "conflict") {
            setView({
              kind: "conflict",
              requestId: reqId,
              conflicts: decision.conflicts,
            });
          } else {
            setView({
              kind: "indeterminate",
              requestId: reqId,
              reason: decision.reason,
            });
          }
        })
        .catch(() => {
          if (!mountedRef.current) return;
          if (reqId !== requestIdRef.current) return;
          inFlightRef.current = false;
          setView({
            kind: "indeterminate",
            requestId: reqId,
            reason: "consultation_failed",
          });
        });
    },
    [environment, context],
  );

  const handleSubmit = React.useCallback(() => {
    if (inFlightRef.current) return;
    const built = buildAvailabilityConsultationInput(form);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    if (
      assignments.kind !== "ready" ||
      !assignments.items.some((a) => String(a.id) === form.assignmentId)
    ) {
      setErrors((prev) => ({
        ...prev,
        assignmentId: "Responsável obrigatório.",
      }));
      return;
    }
    setErrors({});
    const reqId = ++requestIdRef.current;
    inFlightRef.current = true;
    setView({ kind: "checking", requestId: reqId });
    runConsultation(built.input, reqId);
  }, [form, assignments, runConsultation]);

  // ---- Foco no resultado -------------------------------------------------
  React.useEffect(() => {
    if (
      view.kind === "available" ||
      view.kind === "conflict" ||
      view.kind === "indeterminate"
    ) {
      const el = resultPanelRef.current;
      if (el) {
        try {
          el.focus({ preventScroll: false });
        } catch {
          /* ignore */
        }
      }
    }
  }, [view.kind, view]);

  const isChecking = view.kind === "checking";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link to="/app/agenda">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Voltar para a agenda
            </Link>
          </Button>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Disponibilidade
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte conflitos de horário antes de agendar um compromisso.
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Esta consulta é informativa e não cria nem altera compromissos.
          </AlertDescription>
        </Alert>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Processo */}
          <div className="space-y-1.5">
            <Label htmlFor="availability-case">
              Processo <span aria-hidden>*</span>
            </Label>
            {cases.kind === "loading" && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Carregando processos…
              </p>
            )}
            {cases.kind === "error" && (
              <div role="alert" className="text-sm text-destructive space-y-2">
                <p>Não foi possível carregar os processos</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCasesAttempt((n) => n + 1)}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {cases.kind === "ready" && cases.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum processo acessível</p>
            )}
            {cases.kind === "ready" && cases.items.length > 0 && (
              <Select value={form.caseId} onValueChange={handleCaseChange}>
                <SelectTrigger
                  id="availability-case"
                  aria-invalid={errors.caseId !== undefined}
                  aria-describedby={errors.caseId ? "availability-case-error" : undefined}
                >
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  {cases.items.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.reference} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.caseId && (
              <p id="availability-case-error" role="alert" className="text-sm text-destructive">
                {errors.caseId}
              </p>
            )}
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <Label htmlFor="availability-assignment">
              Responsável <span aria-hidden>*</span>
            </Label>
            {form.caseId.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Selecione primeiro um processo
              </p>
            )}
            {form.caseId.length > 0 && assignments.kind === "loading" && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Carregando responsáveis…
              </p>
            )}
            {form.caseId.length > 0 && assignments.kind === "error" && (
              <div role="alert" className="text-sm text-destructive space-y-2">
                <p>Não foi possível carregar responsáveis</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignmentsAttempt((n) => n + 1)}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {form.caseId.length > 0 &&
              assignments.kind === "ready" &&
              assignments.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum responsável ativo neste processo
                </p>
              )}
            {form.caseId.length > 0 &&
              assignments.kind === "ready" &&
              assignments.items.length > 0 && (
                <Select
                  value={form.assignmentId}
                  onValueChange={handleAssignmentChange}
                >
                  <SelectTrigger
                    id="availability-assignment"
                    aria-invalid={errors.assignmentId !== undefined}
                    aria-describedby={
                      errors.assignmentId ? "availability-assignment-error" : undefined
                    }
                  >
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.items.map((a) => (
                      <SelectItem key={String(a.id)} value={String(a.id)}>
                        {formatAvailabilityAssignmentLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            {errors.assignmentId && (
              <p
                id="availability-assignment-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.assignmentId}
              </p>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="availability-start">
                Início <span aria-hidden>*</span>
              </Label>
              <Input
                id="availability-start"
                type="datetime-local"
                value={form.startsAtLocal}
                onChange={(e) => handleFieldChange("startsAtLocal", e.target.value)}
                aria-invalid={errors.startsAt !== undefined}
                aria-describedby={
                  errors.startsAt ? "availability-start-error" : undefined
                }
              />
              {errors.startsAt && (
                <p
                  id="availability-start-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.startsAt}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availability-end">
                Término <span aria-hidden>*</span>
              </Label>
              <Input
                id="availability-end"
                type="datetime-local"
                value={form.endsAtLocal}
                onChange={(e) => handleFieldChange("endsAtLocal", e.target.value)}
                aria-invalid={errors.endsAt !== undefined}
                aria-describedby={errors.endsAt ? "availability-end-error" : undefined}
              />
              {errors.endsAt && (
                <p
                  id="availability-end-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.endsAt}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isChecking}
              aria-busy={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Verificando…
                </>
              ) : (
                "Verificar disponibilidade"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {view.kind !== "idle" && view.kind !== "checking" && (
        <div
          ref={resultPanelRef}
          tabIndex={-1}
          className="outline-none"
          aria-label="Resultado da consulta de disponibilidade"
        >
          {view.kind === "available" && (
            <Card role="status">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Horário disponível
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nenhum conflito foi encontrado para o responsável e período informados.
                </p>
              </CardContent>
            </Card>
          )}
          {view.kind === "conflict" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                  Conflito de horário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Foram encontrados compromissos que se sobrepõem ao período informado.
                </p>
                <p className="text-sm">
                  {view.conflicts.length === 1
                    ? "1 conflito encontrado"
                    : `${view.conflicts.length} conflitos encontrados`}
                </p>
                <ul className="space-y-2">
                  {view.conflicts.map((c) => (
                    <li key={String(c.appointmentId)} className="rounded-md border p-3">
                      <Link
                        to="/app/agenda/$appointmentId"
                        params={{ appointmentId: String(c.appointmentId) }}
                        className="font-medium text-primary underline-offset-4 hover:underline break-words"
                      >
                        {c.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(c.startsAt)} — {formatDateTime(c.endsAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {view.kind === "indeterminate" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" aria-hidden />
                  Não foi possível concluir a consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {view.reason === "assignment_required" && (
                  <p role="alert" className="text-sm">
                    Selecione um responsável para verificar a disponibilidade.
                  </p>
                )}
                {view.reason === "invalid_interval" && (
                  <p role="alert" className="text-sm">
                    O término deve ser posterior ao início.
                  </p>
                )}
                {view.reason === "consultation_failed" && (
                  <>
                    <p role="alert" className="text-sm">
                      Não foi possível consultar a agenda.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={handleSubmit}>
                      Tentar novamente
                    </Button>
                  </>
                )}
                {view.reason === "pagination_limit" && (
                  <>
                    <p role="alert" className="text-sm">
                      A consulta não pôde ser concluída porque existem mais registros do
                      que o limite seguro de verificação.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={handleSubmit}>
                      Tentar novamente
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
