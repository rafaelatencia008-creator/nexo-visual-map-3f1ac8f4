/**
 * LV-13 — Escopo determinístico das fontes para o Copiloto.
 *
 * Regras (documentadas no pedido de correção):
 *  1. Se houver entidade registrada (entityType + entityId) e essa entidade
 *     existir nas fontes disponíveis, é o alvo principal (scope="entity").
 *  2. Caso contrário, se houver `caseId` no metadata, priorizar fontes do
 *     mesmo processo (scope="case").
 *  3. Caso contrário, se houver `expertiseId`, priorizar fontes da mesma
 *     perícia (scope="expertise").
 *  4. Sem contexto, scope="global" — a busca ocorre "na visão geral do
 *     sistema", nunca "no contexto atual".
 *
 * Nunca escolhe silenciosamente o primeiro registro. Consumidores devem
 * consultar `selected` para decisão de mutação.
 */
import type {
  CopilotRouteContext,
  CopilotSourceRecord,
  CopilotSourceType,
} from "./copilot-types";

export type CopilotScope = "entity" | "case" | "expertise" | "global";

export type CopilotScopedSources = Readonly<{
  scope: CopilotScope;
  scoped: readonly CopilotSourceRecord[];
  selected?: CopilotSourceRecord;
  caseId?: string;
  expertiseId?: string;
}>;

function meta(s: CopilotSourceRecord): Record<string, unknown> {
  return (s.metadata ?? {}) as Record<string, unknown>;
}

function matchesCase(s: CopilotSourceRecord, caseId: string): boolean {
  if (s.parentId === caseId) return true;
  const m = meta(s);
  if (m.caseId === caseId) return true;
  if (m.processoId === caseId) return true;
  if (s.sourceType === "processo" && s.id === caseId) return true;
  return false;
}

function matchesExpertise(s: CopilotSourceRecord, expertiseId: string): boolean {
  if (s.parentId === expertiseId) return true;
  const m = meta(s);
  if (m.expertiseId === expertiseId) return true;
  if (m.periciaId === expertiseId) return true;
  if (s.sourceType === "pericia" && s.id === expertiseId) return true;
  return false;
}

export function scopeSourcesToContext(input: {
  context: CopilotRouteContext;
  availableSources: readonly CopilotSourceRecord[];
}): CopilotScopedSources {
  const { context, availableSources } = input;
  const m = (context.metadata ?? {}) as Record<string, unknown>;
  const caseId =
    typeof m.caseId === "string"
      ? m.caseId
      : typeof m.processoId === "string"
        ? m.processoId
        : undefined;
  const expertiseId =
    typeof m.expertiseId === "string"
      ? m.expertiseId
      : typeof m.periciaId === "string"
        ? m.periciaId
        : undefined;

  const selected =
    context.entityType && context.entityId
      ? availableSources.find(
          (s) =>
            s.sourceType === (context.entityType as CopilotSourceType) &&
            s.id === context.entityId,
        )
      : undefined;

  if (selected) {
    const key = caseId ?? (selected.parentId as string | undefined);
    const scoped = availableSources.filter((s) => {
      if (s.id === selected.id && s.sourceType === selected.sourceType) return true;
      if (key && matchesCase(s, key)) return true;
      if (expertiseId && matchesExpertise(s, expertiseId)) return true;
      return false;
    });
    return { scope: "entity", scoped, selected, caseId: key, expertiseId };
  }

  if (caseId) {
    const scoped = availableSources.filter((s) => matchesCase(s, caseId));
    return { scope: "case", scoped, caseId, expertiseId };
  }

  if (expertiseId) {
    const scoped = availableSources.filter((s) => matchesExpertise(s, expertiseId));
    return { scope: "expertise", scoped, expertiseId };
  }

  return { scope: "global", scoped: availableSources };
}

export function scopeQualifier(scope: CopilotScope): string {
  return scope === "global" ? "na visão geral do sistema" : "no contexto atual";
}
