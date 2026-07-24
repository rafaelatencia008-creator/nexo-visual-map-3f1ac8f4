/**
 * LV-09.1B.6.3A.3 — Política pura de fechamento do surface de criação da
 * Agenda após uma criação bem-sucedida.
 *
 * Regra: por padrão o diálogo fecha após criar (comportamento histórico dos
 * consumidores existentes). Consumidores que já controlam a navegação/rota
 * podem passar `closeAfterCreate={false}` para inibir o fechamento
 * automático — impedindo uma segunda navegação disparada pelo
 * `onOpenChange(false)`.
 *
 * Sem React, sem serviços, sem casts, sem store/seed/snapshot.
 */
export function shouldCloseAgendaCreateAfterSuccess(
  closeAfterCreate: boolean | undefined,
): boolean {
  return closeAfterCreate !== false;
}
