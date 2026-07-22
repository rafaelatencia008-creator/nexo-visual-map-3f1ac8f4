/**
 * Resultado padronizado das operações de serviço.
 *
 * Falhas esperadas (não encontrado, sem permissão, validação, conflito,
 * offline) NUNCA são exceções — sempre retornam `ServiceResult`.
 * O erro público não carrega Error nativo, stack, cause, token ou payload bruto.
 */

export const SERVICE_ERROR_CODES = [
  "validation_error",
  "not_found",
  "forbidden",
  "unauthorized",
  "conflict",
  "offline",
  "unavailable",
  "internal_error",
] as const;
export type ServiceErrorCode = (typeof SERVICE_ERROR_CODES)[number];

export type ServiceError =
  | Readonly<{
      code: "validation_error";
      message: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    }>
  | Readonly<{
      code: "not_found";
      message: string;
      resource?: string;
    }>
  | Readonly<{ code: "forbidden"; message: string }>
  | Readonly<{ code: "unauthorized"; message: string }>
  | Readonly<{
      code: "conflict";
      message: string;
      expectedVersion?: number;
      actualVersion?: number;
    }>
  | Readonly<{ code: "offline"; message: string }>
  | Readonly<{ code: "unavailable"; message: string; retryAfterMs?: number }>
  | Readonly<{ code: "internal_error"; message: string }>;

export type ServiceResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: ServiceError }>;

// ---- Helpers puros ---------------------------------------------------------

export function serviceOk<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function serviceFailure<T = never>(error: ServiceError): ServiceResult<T> {
  return { ok: false, error };
}

export function isServiceSuccess<T>(
  r: ServiceResult<T>,
): r is Readonly<{ ok: true; data: T }> {
  return r.ok === true;
}

export function isServiceFailure<T>(
  r: ServiceResult<T>,
): r is Readonly<{ ok: false; error: ServiceError }> {
  return r.ok === false;
}
