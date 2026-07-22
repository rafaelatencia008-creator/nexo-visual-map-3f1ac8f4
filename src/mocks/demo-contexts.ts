import type { DemoContext } from "@/domain/context";

/**
 * Contextos fictícios estáveis. IDs são o único identificador aceito;
 * a URL nunca recebe um ID arbitrário — sempre validamos contra esta lista.
 */
export const DEMO_CONTEXTS: readonly DemoContext[] = [
  {
    id: "demo-individual",
    nome: "Espaço individual de demonstração",
    tipo: "individual",
    role: "proprietario",
    integrantes: 1,
    descricao: "Espaço pessoal fictício para organizar seus trabalhos de demonstração.",
  },
  {
    id: "demo-equipe",
    nome: "Equipe multiprofissional de demonstração",
    tipo: "equipe",
    role: "profissional",
    integrantes: 4,
    descricao: "Time fictício de Psicologia e Serviço Social atuando em conjunto.",
  },
  {
    id: "demo-institucional",
    nome: "Ambiente institucional de demonstração",
    tipo: "institucional",
    role: "administrador",
    integrantes: 12,
    descricao: "Estrutura fictícia com setores, permissões e revisão.",
  },
] as const;

export const CONTEXT_IDS = new Set(DEMO_CONTEXTS.map((c) => c.id));
