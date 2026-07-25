/**
 * LV-09.2B2 — Diálogo único para registro de comunicações e presença.
 *
 * O mesmo componente atende as CINCO ações rápidas (contact, confirm,
 * absence, cancellation, reschedule_request). O preset é escolhido pela
 * prop `action`; o usuário não pode produzir combinação incompatível.
 */

import * as React from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Communication, CommunicationOutcome } from "@/domain/core/communication";
import {
  COMMUNICATION_CHANNELS,
  isCommunicationKind,
  kindRequiresChannel,
} from "@/domain/core/communication";
import type { AppointmentId, CaseId } from "@/domain/core/ids";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";

import {
  buildCommunicationCreateInput,
  createCommunicationFormForAction,
  EMPTY_COMMUNICATION_FORM,
  getAllowedOutcomesForAction,
  type CommunicationFormField,
  type CommunicationFormState,
  type CommunicationQuickAction,
} from "./communication-form";
import {
  getCommunicationActionLabel,
  getCommunicationChannelLabel,
  getCommunicationKindLabel,
  getCommunicationOutcomeLabel,
} from "./communication-labels";

// ---- Props ---------------------------------------------------------------

export interface AgendaCommunicationDialogProps {
  readonly open: boolean;
  readonly action: CommunicationQuickAction | null;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly caseId: CaseId;
  readonly appointmentId: AppointmentId;
  readonly returnFocusRef: React.RefObject<HTMLElement | null>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: (communication: Communication) => void;
}

// ---- Componente ----------------------------------------------------------

export function AgendaCommunicationDialog(
  props: AgendaCommunicationDialogProps,
): React.ReactElement {
  const {
    open,
    action,
    environment,
    context,
    caseId,
    appointmentId,
    returnFocusRef,
    onOpenChange,
    onSaved,
  } = props;

  const [state, setState] = React.useState<CommunicationFormState>(
    EMPTY_COMMUNICATION_FORM,
  );
  const [errors, setErrors] = React.useState<
    Readonly<Partial<Record<CommunicationFormField, string>>>
  >({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const savingRef = React.useRef(false);
  const activeAction = React.useRef<CommunicationQuickAction | null>(null);
  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);

  // Reset ao abrir com uma nova ação.
  React.useEffect(() => {
    if (open && action !== null && activeAction.current !== action) {
      activeAction.current = action;
      setState(createCommunicationFormForAction(action));
      setErrors({});
      setGeneralError(null);
    }
    if (!open) {
      activeAction.current = null;
    }
  }, [open, action]);

  const dirty = React.useMemo(() => {
    if (action === null) return false;
    const preset = createCommunicationFormForAction(action);
    return (
      state.occurredAtLocal !== preset.occurredAtLocal ||
      state.summary !== preset.summary ||
      state.notes !== preset.notes ||
      state.recipientLabel !== preset.recipientLabel ||
      state.channel !== preset.channel ||
      state.outcome !== preset.outcome
    );
  }, [state, action]);

  const allowedOutcomes = React.useMemo<readonly string[]>(
    () => (action ? getAllowedOutcomesForAction(action) : []),
    [action],
  );

  const kindObj = state.kind;
  const channelRequired =
    isCommunicationKind(kindObj) && kindRequiresChannel(kindObj);

  const closeSafely = React.useCallback(() => {
    setState(EMPTY_COMMUNICATION_FORM);
    setErrors({});
    setGeneralError(null);
    setConfirmDiscard(false);
    onOpenChange(false);
    // Restaura o foco ao gatilho.
    requestAnimationFrame(() => {
      const el = returnFocusRef.current;
      if (el && typeof el.focus === "function") el.focus();
    });
  }, [onOpenChange, returnFocusRef]);

  const attemptClose = React.useCallback(() => {
    if (savingRef.current) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    closeSafely();
  }, [dirty, closeSafely]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      attemptClose();
    },
    [onOpenChange, attemptClose],
  );

  const patch = React.useCallback((p: Partial<CommunicationFormState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  const handleSave = React.useCallback(async () => {
    if (savingRef.current) return;
    if (action === null) return;
    const built = buildCommunicationCreateInput(caseId, appointmentId, state);
    if (!built.ok) {
      setErrors(built.errors);
      const firstField = Object.keys(built.errors)[0];
      if (firstField === "summary" && firstFieldRef.current) {
        firstFieldRef.current.focus();
      }
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setErrors({});
    setGeneralError(null);
    try {
      const r = await environment.services.communications.create(
        context,
        built.input,
      );
      if (!r.ok) {
        const msg =
          r.error.code === "forbidden"
            ? "Você não tem permissão para registrar esta comunicação."
            : r.error.code === "offline"
              ? "Você está offline. Tente novamente quando estiver conectado."
              : r.error.code === "validation_error"
                ? "Não foi possível validar os dados informados."
                : "Não foi possível salvar o registro.";
        setGeneralError(msg);
        return;
      }
      toast.success("Registro salvo");
      onSaved(r.data);
      closeSafely();
    } catch {
      setGeneralError("Não foi possível salvar o registro.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [action, caseId, appointmentId, state, environment, context, onSaved, closeSafely]);

  const showRescheduleNotice = action === "reschedule_request";

  const outcomeSelectDisabled = allowedOutcomes.length <= 1;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 sm:max-w-xl"
          onEscapeKeyDown={(e) => {
            if (savingRef.current) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            if (savingRef.current) e.preventDefault();
          }}
        >
          <DialogHeader className="border-b px-4 py-3 sm:px-6">
            <DialogTitle>
              {action ? getCommunicationActionLabel(action) : "Nova comunicação"}
            </DialogTitle>
            <DialogDescription>
              Registro histórico do compromisso. Nenhuma comunicação real é
              enviada.
            </DialogDescription>
          </DialogHeader>

          <div
            className="space-y-4 px-4 py-4 sm:px-6"
            aria-busy={saving ? "true" : "false"}
          >
            {generalError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <span>{generalError}</span>
              </div>
            )}

            {showRescheduleNotice && (
              <div
                role="note"
                className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground"
              >
                O registro do pedido não altera automaticamente a data do
                compromisso.
              </div>
            )}

            {/* Tipo (somente leitura) */}
            <div className="grid gap-1.5">
              <Label>Tipo de registro</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {isCommunicationKind(state.kind)
                  ? getCommunicationKindLabel(state.kind)
                  : "—"}
              </div>
            </div>

            {/* Canal */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-channel">
                Canal
                {!channelRequired && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Opcional
                  </span>
                )}
              </Label>
              <Select
                value={state.channel || undefined}
                onValueChange={(v) => patch({ channel: v })}
                disabled={saving}
              >
                <SelectTrigger
                  id="comm-channel"
                  aria-invalid={errors.channel ? "true" : "false"}
                  aria-describedby={errors.channel ? "comm-channel-err" : undefined}
                >
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {getCommunicationChannelLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.channel && (
                <p
                  id="comm-channel-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.channel}
                </p>
              )}
            </div>

            {/* Resultado */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-outcome">Resultado</Label>
              {outcomeSelectDisabled ? (
                <div
                  id="comm-outcome"
                  className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  {(() => {
                    const o = state.outcome as CommunicationOutcome;
                    return getCommunicationOutcomeLabel(o);
                  })()}
                </div>
              ) : (
                <Select
                  value={state.outcome || undefined}
                  onValueChange={(v) => patch({ outcome: v })}
                  disabled={saving}
                >
                  <SelectTrigger
                    id="comm-outcome"
                    aria-invalid={errors.outcome ? "true" : "false"}
                    aria-describedby={errors.outcome ? "comm-outcome-err" : undefined}
                  >
                    <SelectValue placeholder="Selecione um resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOutcomes.map((o) => (
                      <SelectItem key={o} value={o}>
                        {getCommunicationOutcomeLabel(o as CommunicationOutcome)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.outcome && (
                <p
                  id="comm-outcome-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.outcome}
                </p>
              )}
            </div>

            {/* Data e hora */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-occurred-at">
                Data e hora <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="comm-occurred-at"
                type="datetime-local"
                value={state.occurredAtLocal}
                onChange={(e) => patch({ occurredAtLocal: e.target.value })}
                disabled={saving}
                aria-invalid={errors.occurredAt ? "true" : "false"}
                aria-describedby={
                  errors.occurredAt ? "comm-occurred-at-err" : undefined
                }
                required
              />
              {errors.occurredAt && (
                <p
                  id="comm-occurred-at-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.occurredAt}
                </p>
              )}
            </div>

            {/* Resumo */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-summary">
                Resumo <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="comm-summary"
                ref={firstFieldRef}
                value={state.summary}
                onChange={(e) => patch({ summary: e.target.value })}
                disabled={saving}
                maxLength={160}
                aria-invalid={errors.summary ? "true" : "false"}
                aria-describedby={errors.summary ? "comm-summary-err" : undefined}
                required
              />
              {errors.summary && (
                <p
                  id="comm-summary-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.summary}
                </p>
              )}
            </div>

            {/* Observações */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-notes">Observações</Label>
              <Textarea
                id="comm-notes"
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                disabled={saving}
                rows={4}
                maxLength={2000}
                aria-invalid={errors.notes ? "true" : "false"}
                aria-describedby={errors.notes ? "comm-notes-err" : undefined}
              />
              {errors.notes && (
                <p
                  id="comm-notes-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.notes}
                </p>
              )}
            </div>

            {/* Destinatário */}
            <div className="grid gap-1.5">
              <Label htmlFor="comm-recipient">
                Identificação do destinatário
                <span className="ml-2 text-xs text-muted-foreground">Opcional</span>
              </Label>
              <Input
                id="comm-recipient"
                value={state.recipientLabel}
                onChange={(e) => patch({ recipientLabel: e.target.value })}
                disabled={saving}
                maxLength={160}
                aria-invalid={errors.recipientLabel ? "true" : "false"}
                aria-describedby={
                  errors.recipientLabel ? "comm-recipient-err" : undefined
                }
              />
              {errors.recipientLabel && (
                <p
                  id="comm-recipient-err"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.recipientLabel}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={attemptClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving ? "true" : "false"}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : (
                "Salvar registro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDiscard}
        onOpenChange={(o) => {
          if (!o) setConfirmDiscard(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas ainda não foram salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDiscard(false)}>
              Continuar preenchendo
            </AlertDialogCancel>
            <AlertDialogAction onClick={closeSafely}>
              Descartar registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
