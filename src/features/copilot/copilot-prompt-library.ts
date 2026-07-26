export type PromptCategory =
  | "Geral"
  | "Processos"
  | "Documentos"
  | "Entrevistas"
  | "Diligências"
  | "Quesitos"
  | "Evidências"
  | "Laudos"
  | "Prazos"
  | "Qualidade";

export type CopilotPrompt = Readonly<{
  id: string;
  text: string;
  category: PromptCategory;
}>;

export const COPILOT_PROMPT_LIBRARY: readonly CopilotPrompt[] = [
  // Geral
  { id: "p-001", text: "Resuma o contexto desta página.", category: "Geral" },
  { id: "p-002", text: "Sugira próximos passos para esta perícia.", category: "Geral" },
  { id: "p-003", text: "Ajuda sobre o Copiloto Nexo.", category: "Geral" },
  { id: "p-004", text: "O que posso fazer neste módulo?", category: "Geral" },

  // Processos
  { id: "p-010", text: "Explique a situação deste processo.", category: "Processos" },
  { id: "p-011", text: "Quais pessoas estão vinculadas ao processo?", category: "Processos" },
  { id: "p-012", text: "Quais perícias estão em andamento?", category: "Processos" },

  // Documentos
  { id: "p-020", text: "Quais documentos estão relacionados a este processo?", category: "Documentos" },
  { id: "p-021", text: "Resuma os arquivos disponíveis.", category: "Documentos" },
  { id: "p-022", text: "Localize documentos sem classificação.", category: "Documentos" },
  { id: "p-023", text: "Quais documentos têm prazo próximo?", category: "Documentos" },

  // Entrevistas
  { id: "p-030", text: "Quais entrevistas ainda possuem perguntas pendentes?", category: "Entrevistas" },
  { id: "p-031", text: "Sugira perguntas complementares para a entrevista.", category: "Entrevistas" },
  { id: "p-032", text: "Prepare um roteiro para a próxima entrevista.", category: "Entrevistas" },
  { id: "p-033", text: "Resuma as notas registradas na entrevista.", category: "Entrevistas" },

  // Diligências
  { id: "p-040", text: "Prepare um checklist para esta diligência.", category: "Diligências" },
  { id: "p-041", text: "Liste as pendências da diligência.", category: "Diligências" },
  { id: "p-042", text: "Resuma fotos e localização da diligência.", category: "Diligências" },

  // Quesitos
  { id: "p-050", text: "Quais lacunas impedem este quesito de ser concluído?", category: "Quesitos" },
  { id: "p-051", text: "Explique a cobertura deste quesito.", category: "Quesitos" },
  { id: "p-052", text: "Crie um rascunho manual de resposta com base nas evidências.", category: "Quesitos" },
  { id: "p-053", text: "Quais quesitos estão preparados para o laudo?", category: "Quesitos" },

  // Evidências
  { id: "p-060", text: "Quais evidências sustentam este quesito?", category: "Evidências" },
  { id: "p-061", text: "Quais evidências contradizem a resposta?", category: "Evidências" },
  { id: "p-062", text: "Localize evidências relevantes no contexto atual.", category: "Evidências" },

  // Laudos
  { id: "p-070", text: "Prepare conteúdo consolidado para o laudo.", category: "Laudos" },
  { id: "p-071", text: "Liste itens ainda pendentes para o laudo.", category: "Laudos" },

  // Prazos
  { id: "p-080", text: "Quais prazos estão próximos?", category: "Prazos" },
  { id: "p-081", text: "Identifique prazos vencidos.", category: "Prazos" },

  // Qualidade
  { id: "p-090", text: "Quais pendências exigem atenção?", category: "Qualidade" },
  { id: "p-091", text: "Aponte divergências entre evidências.", category: "Qualidade" },
  { id: "p-092", text: "Sugira revisões de qualidade nesta perícia.", category: "Qualidade" },
];

export const PROMPT_CATEGORIES: readonly PromptCategory[] = [
  "Geral",
  "Processos",
  "Documentos",
  "Entrevistas",
  "Diligências",
  "Quesitos",
  "Evidências",
  "Laudos",
  "Prazos",
  "Qualidade",
];

/** Busca sem acentos, case-insensitive. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function searchPrompts(
  query: string,
  category?: PromptCategory,
): readonly CopilotPrompt[] {
  const q = normalize(query.trim());
  return COPILOT_PROMPT_LIBRARY.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return normalize(p.text).includes(q);
  });
}
