/**
 * LV-10 — Máquina de estados pura do gravador de áudio.
 * Todas as transições são determinísticas e testáveis.
 */

import type { AudioRecorderEvent, AudioRecorderState } from "./audio-types";

export type AudioMachineContext = Readonly<{
  state: AudioRecorderState;
  error: string | null;
  deviceLostReason: string | null;
  interruptionCount: number;
}>;

export const INITIAL_CONTEXT: AudioMachineContext = {
  state: "idle",
  error: null,
  deviceLostReason: null,
  interruptionCount: 0,
};

export function initialContext(unsupportedReason: string | null): AudioMachineContext {
  if (unsupportedReason) {
    return {
      state: "unsupported",
      error: unsupportedReason,
      deviceLostReason: null,
      interruptionCount: 0,
    };
  }
  return INITIAL_CONTEXT;
}

/**
 * Retorna próximo contexto ou o mesmo em transição inválida.
 * A intenção é que o consumidor consulte `canTransition` para bloquear a UI
 * antes de disparar eventos ilegais.
 */
export function reduce(
  ctx: AudioMachineContext,
  event: AudioRecorderEvent,
): AudioMachineContext {
  switch (event.type) {
    case "detect_unsupported":
      return {
        state: "unsupported",
        error: event.reason,
        deviceLostReason: null,
        interruptionCount: ctx.interruptionCount,
      };
    case "request_permission":
      if (ctx.state !== "idle" && ctx.state !== "error") return ctx;
      return { ...ctx, state: "requesting_permission", error: null };
    case "permission_granted":
      if (ctx.state !== "requesting_permission") return ctx;
      return { ...ctx, state: "ready", error: null };
    case "permission_denied":
      if (ctx.state !== "requesting_permission") return ctx;
      return { ...ctx, state: "error", error: event.reason };
    case "start":
      if (ctx.state !== "ready" && ctx.state !== "completed") return ctx;
      return { ...ctx, state: "recording", error: null };
    case "pause":
      if (ctx.state !== "recording") return ctx;
      return { ...ctx, state: "paused" };
    case "resume":
      if (ctx.state !== "paused") return ctx;
      return { ...ctx, state: "recording" };
    case "stop":
      if (ctx.state !== "recording" && ctx.state !== "paused") return ctx;
      return { ...ctx, state: "stopping" };
    case "stopped":
      if (ctx.state !== "stopping") return ctx;
      return { ...ctx, state: "completed" };
    case "device_lost":
      if (
        ctx.state !== "recording" &&
        ctx.state !== "paused" &&
        ctx.state !== "ready"
      )
        return ctx;
      return {
        ...ctx,
        state: "recovering",
        deviceLostReason: event.reason,
        interruptionCount: ctx.interruptionCount + 1,
      };
    case "recover":
      if (ctx.state !== "recovering") return ctx;
      return { ...ctx, state: "recovering" };
    case "recovered":
      if (ctx.state !== "recovering") return ctx;
      return { ...ctx, state: "recording", deviceLostReason: null };
    case "recover_failed":
      if (ctx.state !== "recovering") return ctx;
      return { ...ctx, state: "error", error: event.reason };
    case "fatal":
      if (ctx.state === "unsupported") return ctx;
      return { ...ctx, state: "error", error: event.reason };
    case "reset":
      if (ctx.state === "unsupported") return ctx;
      return { ...INITIAL_CONTEXT };
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return ctx;
    }
  }
}

export function canTransition(
  ctx: AudioMachineContext,
  event: AudioRecorderEvent,
): boolean {
  const next = reduce(ctx, event);
  if (event.type === "detect_unsupported" || event.type === "fatal")
    return next !== ctx;
  return next.state !== ctx.state || next.error !== ctx.error;
}

export function describeState(state: AudioRecorderState): string {
  switch (state) {
    case "unsupported":
      return "Não suportado";
    case "idle":
      return "Ocioso";
    case "requesting_permission":
      return "Solicitando permissão";
    case "ready":
      return "Pronto para gravar";
    case "recording":
      return "Gravando";
    case "paused":
      return "Pausado";
    case "stopping":
      return "Encerrando";
    case "completed":
      return "Concluído";
    case "recovering":
      return "Recuperando";
    case "error":
      return "Erro";
  }
}
