/**
 * LV-14 — Biblioteca mock de modelos documentais.
 *
 * Cada modelo define a lista canônica de seções e os blocos iniciais
 * (título + conteúdo demonstrativo). Trocar de modelo altera SOMENTE
 * a estrutura inicial; o conteúdo editado pelo usuário permanece dentro
 * do runtime (memória) enquanto o documento existe.
 */

import {
  REPORT_SECTION_KINDS,
  REPORT_SECTION_LABEL,
  type ReportSectionKind,
  type ReportTemplateId,
} from "./report-types";

export type ReportTemplateSectionSeed = {
  readonly kind: ReportSectionKind;
  readonly blocks: readonly { readonly title: string; readonly content: string }[];
};

export type ReportTemplate = {
  readonly id: ReportTemplateId;
  readonly label: string;
  readonly description: string;
  readonly sections: readonly ReportTemplateSectionSeed[];
};

function every(
  overrides: Partial<Record<ReportSectionKind, readonly { title: string; content: string }[]>>,
): readonly ReportTemplateSectionSeed[] {
  return REPORT_SECTION_KINDS.map((kind) => ({
    kind,
    blocks:
      overrides[kind] ??
      [
        {
          title: REPORT_SECTION_LABEL[kind],
          content: `Preencha ${REPORT_SECTION_LABEL[kind].toLowerCase()} conforme o caso.`,
        },
      ],
  }));
}

export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  {
    id: "laudo_psicologico",
    label: "Laudo Psicológico",
    description:
      "Estrutura completa para laudos psicológicos, com ênfase em metodologia e análise.",
    sections: every({
      metodologia: [
        {
          title: "Instrumentos aplicados",
          content:
            "Entrevistas semiestruturadas, observação clínica e testes psicométricos aplicados.",
        },
      ],
      analise: [
        {
          title: "Discussão psicológica",
          content:
            "Integração dos achados clínicos com os quesitos formulados pelo juízo.",
        },
      ],
    }),
  },
  {
    id: "parecer_psicologico",
    label: "Parecer Psicológico",
    description:
      "Peça técnica opinativa, mais enxuta que o laudo, focada em fundamentação e conclusão.",
    sections: every({
      historico: [
        {
          title: "Síntese do histórico",
          content: "Resumo dos elementos históricos relevantes para o parecer.",
        },
      ],
      conclusao: [
        {
          title: "Parecer conclusivo",
          content:
            "Opinião técnica fundamentada, respondendo objetivamente à demanda.",
        },
      ],
    }),
  },
  {
    id: "estudo_social",
    label: "Estudo Social",
    description:
      "Estudo do contexto social, com ênfase em diligências, visitas e entrevistas domiciliares.",
    sections: every({
      diligencias: [
        {
          title: "Visita domiciliar",
          content: "Descrição da visita domiciliar e observações do território.",
        },
      ],
      entrevistas: [
        {
          title: "Entrevistas com familiares",
          content: "Falas relevantes coletadas com o núcleo familiar.",
        },
      ],
    }),
  },
  {
    id: "parecer_social",
    label: "Parecer Social",
    description:
      "Parecer técnico do Serviço Social, com foco em análise e recomendações.",
    sections: every({
      analise: [
        {
          title: "Análise social",
          content:
            "Análise das dimensões socioeconômicas, relacionais e territoriais.",
        },
      ],
      conclusao: [
        {
          title: "Recomendações",
          content: "Recomendações técnicas do serviço social.",
        },
      ],
    }),
  },
  {
    id: "laudo_multiprofissional",
    label: "Laudo Multiprofissional",
    description:
      "Laudo elaborado por equipe multiprofissional, com blocos para cada especialidade.",
    sections: every({
      metodologia: [
        {
          title: "Metodologia integrada",
          content:
            "Descrição da metodologia adotada por cada especialidade participante.",
        },
      ],
      analise: [
        {
          title: "Análise integrada",
          content:
            "Cruzamento das análises das especialidades envolvidas.",
        },
      ],
    }),
  },
  {
    id: "relatorio_tecnico",
    label: "Relatório Técnico",
    description:
      "Relatório objetivo para atualizações intermediárias ou informativos técnicos.",
    sections: every({
      objeto: [
        {
          title: "Objeto do relatório",
          content: "Descrição objetiva do escopo do relatório.",
        },
      ],
      analise: [
        {
          title: "Achados",
          content: "Achados técnicos relevantes até o momento.",
        },
      ],
    }),
  },
  {
    id: "personalizado",
    label: "Documento Personalizado",
    description:
      "Estrutura mínima, para o usuário adaptar livremente as seções ao caso.",
    sections: every({}),
  },
];

export const REPORT_TEMPLATE_MAP: Readonly<Record<ReportTemplateId, ReportTemplate>> =
  Object.freeze(
    REPORT_TEMPLATES.reduce(
      (acc, t) => {
        acc[t.id] = t;
        return acc;
      },
      {} as Record<ReportTemplateId, ReportTemplate>,
    ),
  );

export function getTemplate(id: ReportTemplateId): ReportTemplate {
  return REPORT_TEMPLATE_MAP[id];
}
