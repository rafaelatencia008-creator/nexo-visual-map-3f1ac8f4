/**
 * LV-17 — Fixtures agregadas para a jornada demonstrativa.
 *
 * Este módulo NÃO cria novos dados. Apenas expõe identificadores e rótulos
 * já existentes nas stores/mocks aprovados nas etapas LV-06 a LV-16, de
 * modo que a jornada de demonstração use nomes e códigos consistentes.
 */

import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_PERSON_ALFA_1_ID,
} from "@/domain/mocks/seed";

export type DemoJourneyStep = Readonly<{
  id: string;
  label: string;
  route: string;
  description: string;
}>;

/**
 * Passos da jornada demonstrativa. As rotas apontam para telas já existentes.
 * Nenhum dado extra é criado; a jornada apenas guia o usuário.
 */
export const DEMO_JOURNEY: readonly DemoJourneyStep[] = Object.freeze([
  { id: "01", label: "Entrar", route: "/entrar", description: "Login demonstrativo" },
  { id: "02", label: "Contexto", route: "/selecionar-contexto", description: "Selecionar organização" },
  { id: "03", label: "Painel", route: "/app", description: "Visão geral" },
  { id: "04", label: "Perícias", route: "/app/pericias", description: "Lista de perícias" },
  { id: "05", label: "Clientes", route: "/app/clientes", description: "Pessoas e partes" },
  { id: "06", label: "Entrevistas", route: "/app/entrevistas", description: "Entrevistas e diligências" },
  { id: "07", label: "Documentos", route: "/app/documentos", description: "Documentos e evidências" },
  { id: "08", label: "Quesitos", route: "/app/quesitos", description: "Quesitos e evidências" },
  { id: "09", label: "Laudos", route: "/app/laudos", description: "Editor, versões e fechamento" },
  { id: "10", label: "Agenda", route: "/app/agenda", description: "Compromissos" },
] as const);

export const DEMO_IDS = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  caseId: SEED_CASE_ALFA_1_ID,
  personId: SEED_PERSON_ALFA_1_ID,
} as const);

/** Data mock estável usada como “agora demonstrativo”. */
export const DEMO_CLOCK_ISO = "2026-07-25T12:00:00.000Z";

/** Versão visual do frontend exibida no painel de diagnóstico. */
export const DEMO_FRONTEND_VERSION = "LV-17";

/** Módulos ativos na demonstração — usados pelo painel de diagnóstico. */
export const DEMO_MODULES: readonly string[] = Object.freeze([
  "Painel",
  "Processos",
  "Perícias",
  "Clientes",
  "Agenda",
  "Peritos",
  "Documentos",
  "Entrevistas e diligências",
  "Quesitos e evidências",
  "Laudos",
  "Copiloto (mock)",
] as const);
