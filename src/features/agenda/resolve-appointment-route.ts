/**
 * LV-09.1B.6.3A — Resolvedor puro de `appointmentId` para a rota
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
 * explicitamente, o resolvedor propaga o código dentro de `error`; caso
 * contrário, itens fora do escopo de acesso simplesmente não aparecem na
 * listagem e retornamos `not_found` (coerente com o restante do sistema,
 * que já protege o acesso pela listagem).
 *
 * Puro: sem React, sem estado global, sem snapshot, sem store, sem seed.
 * Depende apenas do contrato oficial `AppointmentService.list`.
 */

import type { Appointment } from "@/domain/core/agenda";
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

export async function resolveAppointmentRoute(
  service: AppointmentService,
  context: ServiceContext,
  appointmentId: string,
  options: ResolveAppointmentRouteOptions = {},
): Promise<AppointmentRouteResolution> {
  const pageLimit = options.pageLimit ?? DEFAULT_PAGE_LIMIT;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
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
    const found = r.data.items.find((a) => String(a.id) === appointmentId);
    if (found) return { kind: "found", appointment: found };
    if (!r.data.nextCursor) return { kind: "not_found" };
    cursor = r.data.nextCursor;
  }
  return { kind: "not_found" };
}
