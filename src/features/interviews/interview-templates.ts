/**
 * LV-11 — Roteiros predefinidos de entrevistas.
 * Perguntas determinísticas, sem randomização.
 */

import type { InterviewQuestionAnswer } from "./interview-types";

export type InterviewTemplateSection = Readonly<{
  title: string;
  questions: ReadonlyArray<{ id: string; text: string; required: boolean }>;
}>;

export type InterviewTemplate = Readonly<{
  id: string;
  name: string;
  description: string;
  sections: readonly InterviewTemplateSection[];
}>;

export const INTERVIEW_TEMPLATES: readonly InterviewTemplate[] = [
  {
    id: "roteiro-inicial",
    name: "Entrevista inicial",
    description: "Coleta introdutória com o entrevistado e contextualização do caso.",
    sections: [
      {
        title: "Identificação e vínculo",
        questions: [
          { id: "ini-01", text: "Confirme o nome completo e a data de nascimento.", required: true },
          { id: "ini-02", text: "Qual seu vínculo com o processo em análise?", required: true },
          { id: "ini-03", text: "Existe alguma questão de saúde relevante para esta entrevista?", required: false },
        ],
      },
      {
        title: "Fatos e contexto",
        questions: [
          { id: "ini-04", text: "Descreva com suas palavras o que motivou o processo.", required: true },
          { id: "ini-05", text: "Existem outras pessoas envolvidas nos fatos relatados?", required: false },
          { id: "ini-06", text: "Há documentos ou evidências que gostaria de destacar?", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-complementar",
    name: "Entrevista complementar",
    description: "Aprofunda pontos identificados em entrevista anterior.",
    sections: [
      {
        title: "Revisão de pontos anteriores",
        questions: [
          { id: "com-01", text: "Confirmar identidade e finalidade da entrevista complementar.", required: true },
          { id: "com-02", text: "Deseja retificar ou complementar informações anteriores?", required: true },
        ],
      },
      {
        title: "Aprofundamento",
        questions: [
          { id: "com-03", text: "Detalhar cronologia dos fatos apontados como controversos.", required: true },
          { id: "com-04", text: "Apresentar documentos adicionais recebidos após a primeira entrevista.", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-psicologica",
    name: "Avaliação psicológica",
    description: "Entrevista clínica estruturada para avaliação psicológica.",
    sections: [
      {
        title: "Contexto biopsicossocial",
        questions: [
          { id: "psi-01", text: "Como descreveria seu estado emocional atual?", required: true },
          { id: "psi-02", text: "Existem tratamentos ou medicações em curso?", required: true },
          { id: "psi-03", text: "Como avalia seu suporte familiar e social?", required: false },
        ],
      },
      {
        title: "Objeto da avaliação",
        questions: [
          { id: "psi-04", text: "Como percebe o impacto dos fatos discutidos em sua rotina?", required: true },
          { id: "psi-05", text: "Existe algo que gostaria que fosse considerado no laudo?", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-familiar",
    name: "Entrevista familiar",
    description: "Coleta com grupo familiar ou responsáveis diretos.",
    sections: [
      {
        title: "Dinâmica familiar",
        questions: [
          { id: "fam-01", text: "Descreva a composição familiar atual.", required: true },
          { id: "fam-02", text: "Como se dá a rotina de convivência entre os membros?", required: true },
        ],
      },
      {
        title: "Conflitos e cuidados",
        questions: [
          { id: "fam-03", text: "Existem pontos de conflito recorrentes? Quais?", required: true },
          { id: "fam-04", text: "Como são organizados cuidados com crianças, idosos ou dependentes?", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-crianca-adolescente",
    name: "Entrevista com criança ou adolescente",
    description: "Roteiro sensível para escuta especializada.",
    sections: [
      {
        title: "Acolhida e ambientação",
        questions: [
          { id: "cri-01", text: "Explicar de forma acessível o motivo da conversa.", required: true },
          { id: "cri-02", text: "Verificar se a criança/adolescente sente-se à vontade para falar.", required: true },
        ],
      },
      {
        title: "Percepção dos fatos",
        questions: [
          { id: "cri-03", text: "Perguntar como a criança/adolescente descreve seu dia a dia.", required: true },
          { id: "cri-04", text: "Explorar sentimentos em relação aos fatos, respeitando pausas.", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-tecnico-livre",
    name: "Entrevista técnica livre",
    description: "Roteiro aberto para perícia técnica que exija questões específicas.",
    sections: [
      {
        title: "Aspectos técnicos",
        questions: [
          { id: "tec-01", text: "Confirmar identificação e vínculo técnico com o objeto pericial.", required: true },
          { id: "tec-02", text: "Descrever o histórico técnico do objeto sob análise.", required: true },
          { id: "tec-03", text: "Registrar aspectos técnicos relevantes observados.", required: false },
        ],
      },
    ],
  },
  {
    id: "roteiro-personalizado",
    name: "Roteiro personalizado",
    description: "Sem perguntas pré-definidas; usar notas e transcrição manual.",
    sections: [],
  },
];

export function getTemplate(id: string): InterviewTemplate | undefined {
  return INTERVIEW_TEMPLATES.find((t) => t.id === id);
}

export function buildQuestionsFromTemplate(id: string): InterviewQuestionAnswer[] {
  const t = getTemplate(id);
  if (!t) return [];
  const out: InterviewQuestionAnswer[] = [];
  for (const section of t.sections) {
    for (const q of section.questions) {
      out.push({
        id: q.id,
        templateSection: section.title,
        questionText: q.text,
        required: q.required,
        status: "pendente",
      });
    }
  }
  return out;
}

export function countTemplateQuestions(id: string): number {
  return buildQuestionsFromTemplate(id).length;
}
