/**
 * LV-09.1B.6.3A / .3A.1 — Resolvedor puro de `appointmentId` para a rota
 * `/app/agenda/$appointmentId`.
 *
 * Percorre paginadamente `appointments.list` (contexto do usuário) e devolve
 * uma união discriminada com exatamente três estados:
 *
 *  - `{ kind: "found"; appointment }`
 *  - `{ kind: "not_found" }`
 *  - `{ kind: "error"; source: "appointments"; code; message }`
 *
 * NÃO fabrica `forbidden`: se o serviço oficial retornar `forbidden`
 * explicitamente, o resolvedor propaga o código; caso contrário, itens
 * fora do escopo de acesso simplesmente não aparecem na listagem e o
 * resolvedor retorna `not_found`.
 *
 * Segurança e robustez (LV-09.1B.6.3A.1):
 *  - IDs sintaticamente inválidos retornam `not_found` sem chamar o serviço.
 *  - Esgotar `maxPages` com `nextCursor` restante devolve `error/internal_error`
 *    (nunca `not_found`).
 *  - Cursor repetido devolve `error/internal_error` (proteção anti-loop).
 *  - Compromissos duplicados entre páginas são deduplicados por id.
 *  - `pageLimit` e `maxPages` inválidos usam defaults seguros.
 *
 * Puro: sem React, sem estado global, sem snapshot, sem store, sem seed.
 */

import type { Appointment } from "@/domain/core/agenda";
import { isAppointmentId } from "@/domain/core/ids";
import type { AppointmentId } from "@/domain/core/ids";
import type { AppointmentService } from "@/domain/services/appointment-service";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceErrorCode } from "@/domain/services/result";

export type AppointmentRouteResolution =
  | Readonly<{ kind: "found"; appointment: Appointment }>
  | Readonly<{ kind: "not_found" }>
  | Readonly<{
      kind: "error";
      source: "appointments";
      code: ServiceErrorCode;
      message: string;
    }>;

const DEFAULT_PAGE_LIMIT = 100;
const DEFAULT_MAX_PAGES = 50;

export interface ResolveAppointmentRouteOptions {
  readonly pageLimit?: number;
  readonly maxPages?: number;
}

function sanitizePositiveInt(v: number | undefined, fallback: number): number {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    !Number.isInteger(v) ||
    v <= 0
  ) {
    return fallback;
  }
  return v;
}

export async function resolveAppointmentRoute(
  service: AppointmentService,
  context: ServiceContext,
  appointmentId: string,
  options: ResolveAppointmentRouteOptions = {},
): Promise<AppointmentRouteResolution> {
  // 1) Guard sintático: ID inválido nunca chega ao serviço.
  if (!isAppointmentId(appointmentId)) {
    return { kind: "not_found" };
  }
  const targetId: AppointmentId = appointmentId;

  const pageLimit = sanitizePositiveInt(options.pageLimit, DEFAULT_PAGE_LIMIT);
  const maxPages = sanitizePositiveInt(options.maxPages, DEFAULT_MAX_PAGES);

  const seenCursors = new Set<string>();
  const seenIds = new Set<string>();
  let cursor: string | undefined;

  for (let i = 0; i < maxPages; i++) {
    const r = await service.list(context, {
      page: cursor
        ? { cursor, limit: pageLimit }
        : { limit: pageLimit },
    });
    if (!r.ok) {
      return {
        kind: "error",
        source: "appointments",
        code: r.error.code,
        message: r.error.message,
      };
    }
    for (const a of r.data.items) {
      const key = String(a.id);
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      if (a.id === targetId) {
        return { kind: "found", appointment: a };
      }
    }
    const next = r.data.nextCursor;
    if (!next) return { kind: "not_found" };
    if (seenCursors.has(next)) {
      return {
        kind: "error",
        source: "appointments",
        code: "internal_error",
        message: "appointment_route_pagination_cycle",
      };
    }
    seenCursors.add(next);
    cursor = next;
  }
  // Esgotou maxPages mas ainda havia cursor: consulta incompleta.
  return {
    kind: "error",
    source: "appointments",
    code: "internal_error",
    message: "appointment_route_pagination_exhausted",
  };
}
