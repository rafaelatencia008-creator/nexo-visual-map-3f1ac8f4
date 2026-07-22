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

/** Contexto padrão para o modo convidado. */
export const GUEST_CONTEXT_ID = "demo-individual";
