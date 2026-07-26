import type { CopilotIntent, CopilotRouteContext } from "./copilot-types";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Rule = Readonly<{
  intent: CopilotIntent;
  keywords: readonly (readonly string[])[];
  priority: number;
}>;

/**
 * Ordem alta = maior prioridade. Cada regra tem grupos: TODAS as
 * palavras de PELO MENOS UM grupo devem estar presentes.
 */
const RULES: readonly Rule[] = [
  // ações proibidas — recusa
  {
    intent: "recusar_acao",
    priority: 100,
    keywords: [
      ["assine", "laudo"],
      ["assinar", "laudo"],
      ["protocole"],
      ["envie", "tribunal"],
      ["apague", "evidencias"],
      ["exclua", "todas"],
      ["altere", "sem", "confirmacao"],
      ["conclusao", "definitiva"],
    ],
  },
  {
    intent: "rascunhar_resposta_quesito",
    priority: 60,
    keywords: [
      ["rascunho", "resposta"],
      ["rascunhar", "resposta"],
      ["rascunho", "quesito"],
      ["esboco", "resposta"],
    ],
  },
  {
    intent: "explicar_cobertura_quesito",
    priority: 55,
    keywords: [
      ["cobertura", "quesito"],
      ["explique", "cobertura"],
      ["explicar", "cobertura"],
    ],
  },
  {
    intent: "preparar_para_laudo",
    priority: 55,
    keywords: [
      ["preparar", "laudo"],
      ["preparado", "laudo"],
      ["conteudo", "laudo"],
      ["consolidar", "laudo"],
    ],
  },
  {
    intent: "identificar_lacunas",
    priority: 50,
    keywords: [
      ["lacuna"],
      ["lacunas"],
    ],
  },
  {
    intent: "identificar_divergencias",
    priority: 50,
    keywords: [
      ["divergencia"],
      ["divergencias"],
      ["contradiz"],
      ["contradicao"],
    ],
  },
  {
    intent: "localizar_evidencias",
    priority: 45,
    keywords: [
      ["evidencia"],
      ["evidencias"],
      ["sustenta"],
      ["sustentam"],
    ],
  },
  {
    intent: "sugerir_perguntas_entrevista",
    priority: 40,
    keywords: [
      ["perguntas", "entrevista"],
      ["perguntas", "complementares"],
      ["perguntas", "pendentes"],
    ],
  },
  {
    intent: "preparar_roteiro_entrevista",
    priority: 40,
    keywords: [
      ["roteiro", "entrevista"],
      ["roteiro"],
    ],
  },
  {
    intent: "preparar_checklist_diligencia",
    priority: 40,
    keywords: [
      ["checklist", "diligencia"],
      ["checklist"],
    ],
  },
  {
    intent: "localizar_documentos",
    priority: 35,
    keywords: [
      ["localize", "documentos"],
      ["localizar", "documentos"],
      ["documentos", "sem", "classificacao"],
      ["quais", "documentos"],
    ],
  },
  {
    intent: "resumir_documentos",
    priority: 35,
    keywords: [
      ["resuma", "arquivos"],
      ["resumir", "arquivos"],
      ["resuma", "documentos"],
      ["resumir", "documentos"],
    ],
  },
  {
    intent: "identificar_prazos",
    priority: 30,
    keywords: [
      ["prazo"],
      ["prazos"],
      ["vencidos"],
    ],
  },
  {
    intent: "listar_pendencias",
    priority: 30,
    keywords: [
      ["pendencia"],
      ["pendencias"],
    ],
  },
  {
    intent: "explicar_situacao_processo",
    priority: 25,
    keywords: [
      ["situacao", "processo"],
      ["explique", "processo"],
      ["explicar", "processo"],
    ],
  },
  {
    intent: "sugerir_proximos_passos",
    priority: 25,
    keywords: [
      ["proximos", "passos"],
      ["proximo", "passo"],
      ["passos", "seguintes"],
    ],
  },
  {
    intent: "abrir_modulo",
    priority: 20,
    keywords: [
      ["abrir", "modulo"],
      ["abra", "modulo"],
    ],
  },
  {
    intent: "ajuda_sistema",
    priority: 15,
    keywords: [
      ["ajuda"],
      ["help"],
      ["como", "usar"],
    ],
  },
  {
    intent: "resumo_contexto",
    priority: 10,
    keywords: [
      ["resuma", "contexto"],
      ["resumir", "contexto"],
      ["resumo"],
      ["resuma", "pagina"],
      ["resuma", "esta"],
    ],
  },
];

export function classifyIntent(
  text: string,
  context: CopilotRouteContext,
): CopilotIntent {
  const t = norm(text);
  const matches: { rule: Rule; contextBoost: number }[] = [];
  for (const r of RULES) {
    const ok = r.keywords.some((group) => group.every((w) => t.includes(norm(w))));
    if (!ok) continue;
    let boost = 0;
    // simples afinidade de contexto
    if (context.moduleKey === "quesitos" &&
      (r.intent === "identificar_lacunas" ||
        r.intent === "rascunhar_resposta_quesito" ||
        r.intent === "explicar_cobertura_quesito" ||
        r.intent === "localizar_evidencias" ||
        r.intent === "preparar_para_laudo")) boost += 5;
    if (context.moduleKey === "documentos" &&
      (r.intent === "localizar_documentos" || r.intent === "resumir_documentos")) boost += 5;
    if (context.moduleKey === "entrevistas" &&
      (r.intent === "sugerir_perguntas_entrevista" ||
        r.intent === "preparar_roteiro_entrevista" ||
        r.intent === "preparar_checklist_diligencia")) boost += 5;
    if (context.moduleKey === "agenda" && r.intent === "identificar_prazos") boost += 5;
    if (context.moduleKey === "pendencias" && r.intent === "listar_pendencias") boost += 5;
    matches.push({ rule: r, contextBoost: boost });
  }
  if (matches.length === 0) return "desconhecido";
  matches.sort(
    (a, b) => b.rule.priority + b.contextBoost - (a.rule.priority + a.contextBoost),
  );
  return matches[0].rule.intent;
}
