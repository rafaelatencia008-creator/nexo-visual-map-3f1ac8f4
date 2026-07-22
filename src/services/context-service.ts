import { DEMO_CONTEXTS, CONTEXT_IDS } from "@/mocks/demo-contexts";
import type { DemoContext } from "@/domain/context";
import type { WorkMode } from "@/domain/onboarding";

/**
 * Serviço de contexto — camada intermediária entre componentes e mocks.
 * No futuro, esta interface conceitual pode ser reimplementada com banco.
 */

export function listContexts(): DemoContext[] {
  return [...DEMO_CONTEXTS];
}

export function listContextsFor(workMode?: WorkMode): DemoContext[] {
  if (!workMode) return listContexts();
  return DEMO_CONTEXTS.filter((c) => c.tipo === workMode);
}

export function getContextById(id: string | undefined): DemoContext | undefined {
  if (!id) return undefined;
  return DEMO_CONTEXTS.find((c) => c.id === id);
}

export function isValidContextId(id: unknown): id is string {
  return typeof id === "string" && CONTEXT_IDS.has(id);
}

/**
 * Confirma que o contexto existe, pertence aos mocks e é compatível
 * com a forma de trabalho declarada. Aceita `workMode` opcional: sem ele,
 * exige apenas que o contexto exista.
 */
export function isContextCompatible(
  contextId: unknown,
  workMode?: WorkMode | undefined,
): boolean {
  if (!isValidContextId(contextId)) return false;
  const ctx = getContextById(contextId);
  if (!ctx) return false;
  if (!workMode) return true;
  return ctx.tipo === workMode;
}

/** Contexto padrão para o modo convidado. */
export const GUEST_CONTEXT_ID = "demo-individual";

