/**
 * LV-09.1A.1 — Acesso contextual da Agenda por caso.
 *
 * Regra determinística e local:
 *   - `proprietario` e `administrador` acessam **todos** os casos da própria
 *     organização.
 *   - Demais papéis (profissional, revisor, colaborador, leitura) acessam
 *     apenas os casos em que houver, no mesmo escopo organizacional, um
 *     Assignment ATIVO cujo `professionalProfile.userId` corresponda ao
 *     `userId` do contexto.
 *
 * Puro: apenas leitura do store. Nenhum efeito colateral.
 */

import type { CaseId } from "../core/ids";
import type { Role } from "../shared/work-context";
import type { ServiceContext } from "../services/context";
import type { MockStore } from "./store";

const ADMIN_ROLES = new Set<Role>(["proprietario", "administrador"]);

export function isAgendaAdminRole(role: Role): boolean {
  return ADMIN_ROLES.has(role);
}

/**
 * Retorna `true` se o contexto tem acesso ao caso para fins de Agenda.
 * O caso precisa existir na organização informada — se não existir,
 * devolve `false` (o serviço externo devolverá `not_found` no lugar).
 */
export function hasAgendaCaseAccess(
  store: MockStore,
  context: ServiceContext,
  caseId: CaseId,
): boolean {
  const c = store.cases.get(caseId);
  if (!c || c.organizationId !== context.organizationId) return false;
  if (isAgendaAdminRole(context.role)) return true;
  // Descobre os professional profiles do usuário na org.
  const profIds = new Set<string>();
  for (const p of store.professionalProfiles.values()) {
    if (p.organizationId === context.organizationId && p.userId === context.userId) {
      profIds.add(p.id);
    }
  }
  if (profIds.size === 0) return false;
  for (const a of store.assignments.values()) {
    if (a.organizationId !== context.organizationId) continue;
    if (a.caseId !== caseId) continue;
    if (a.status !== "active") continue;
    if (profIds.has(a.professionalProfileId)) return true;
  }
  return false;
}

/**
 * Enumera todos os casos acessíveis pelo contexto na organização atual.
 */
export function computeAgendaAccessibleCaseIds(
  store: MockStore,
  context: ServiceContext,
): Set<string> {
  const orgId = context.organizationId;
  const orgCases: string[] = [];
  for (const c of store.cases.values()) {
    if (c.organizationId === orgId) orgCases.push(c.id);
  }
  if (isAgendaAdminRole(context.role)) return new Set<string>(orgCases);
  const profIds = new Set<string>();
  for (const p of store.professionalProfiles.values()) {
    if (p.organizationId === orgId && p.userId === context.userId) profIds.add(p.id);
  }
  const accessible = new Set<string>();
  if (profIds.size === 0) return accessible;
  for (const a of store.assignments.values()) {
    if (a.organizationId !== orgId) continue;
    if (a.status !== "active") continue;
    if (profIds.has(a.professionalProfileId)) accessible.add(a.caseId);
  }
  // Interseção com casos da org.
  const intersect = new Set<string>();
  for (const id of accessible) if (orgCases.includes(id)) intersect.add(id);
  return intersect;
}

export function isAgendaAction(action: string): boolean {
  return action.startsWith("deadline.") || action.startsWith("appointment.");
}
