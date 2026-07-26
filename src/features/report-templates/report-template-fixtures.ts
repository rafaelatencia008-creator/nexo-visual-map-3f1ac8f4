/**
 * LV-18.1 — Fixtures determinísticas de modelos de laudo.
 *
 * Todos os IDs, datas e conteúdos são fixos e fictícios. Nenhum dado real,
 * nenhum PII. A função `buildInitialTemplates()` produz uma nova cópia
 * profunda a cada chamada, garantindo que o consumidor (store) nunca receba
 * a mesma referência mutável usada em outra sessão.
 */

import type {
  ReportTemplate,
  ReportTemplateBlock,
  ReportTemplateBlockId,
  ReportTemplateBlockKind,
  ReportTemplateId,
  ReportTemplateSection,
  ReportTemplateSectionId,
  ReportTemplateSpecialty,
  ReportTemplateStatus,
  ReportTemplateVariable,
  ReportTemplateVariableId,
  ReportTemplateVariableKind,
} from "./report-template-types";

const FIXED_CREATED = "2026-01-10T09:00:00.000Z";
const FIXED_UPDATED = "2026-06-01T09:00:00.000Z";
const MOCK_USER = "usr-demo";

type SectionSeed = {
  id: string;
  title: string;
  description: string;
  blocks: readonly {
    id: string;
    kind: ReportTemplateBlockKind;
    title: string;
    content: string;
    variableRefs?: readonly string[];
  }[];
};

type VariableSeed = {
  id: string;
  key: string;
  label: string;
  kind: ReportTemplateVariableKind;
  required?: boolean;
  defaultValue?: string;
};

type TemplateSeed = {
  id: string;
  name: string;
  description: string;
  specialty: ReportTemplateSpecialty;
  status?: ReportTemplateStatus;
  sections: readonly SectionSeed[];
  variables: readonly VariableSeed[];
};

const SEEDS: readonly TemplateSeed[] = [
  {
    id: "rtpl-1001",
    name: "Laudo Psicológico",
    description: "Estrutura demonstrativa para avaliação psicológica.",
    specialty: "psicologia",
    sections: [
      {
        id: "rsec-1101",
        title: "Identificação",
        description: "Dados do avaliado e do processo.",
        blocks: [
          {
            id: "rblk-1201",
            kind: "paragrafo",
            title: "Dados do avaliado",
            content: "Nome: {{cliente_nome}}. Idade: {{cliente_idade}}.",
            variableRefs: ["cliente_nome", "cliente_idade"],
          },
        ],
      },
      {
        id: "rsec-1102",
        title: "Metodologia",
        description: "Instrumentos e procedimentos utilizados.",
        blocks: [
          {
            id: "rblk-1202",
            kind: "lista",
            title: "Instrumentos",
            content: "Entrevista clínica; Observação; Testes projetivos.",
          },
        ],
      },
      {
        id: "rsec-1103",
        title: "Conclusão",
        description: "Síntese da avaliação.",
        blocks: [
          {
            id: "rblk-1203",
            kind: "paragrafo",
            title: "Parecer",
            content: "Conclusão demonstrativa sem valor jurídico.",
          },
        ],
      },
    ],
    variables: [
      { id: "rvar-1301", key: "cliente_nome", label: "Nome do avaliado", kind: "texto", required: true },
      { id: "rvar-1302", key: "cliente_idade", label: "Idade", kind: "numero" },
    ],
  },
  {
    id: "rtpl-1002",
    name: "Relatório Técnico",
    description: "Relatório técnico geral com foco em observação de campo.",
    specialty: "geral",
    sections: [
      {
        id: "rsec-1111",
        title: "Introdução",
        description: "Contexto e objetivo do relatório.",
        blocks: [
          {
            id: "rblk-1211",
            kind: "paragrafo",
            title: "Objetivo",
            content: "Descrever o objetivo geral do relatório.",
          },
        ],
      },
      {
        id: "rsec-1112",
        title: "Observações",
        description: "Registros técnicos coletados.",
        blocks: [
          {
            id: "rblk-1212",
            kind: "observacao",
            title: "Nota técnica",
            content: "Observação demonstrativa.",
          },
        ],
      },
    ],
    variables: [
      { id: "rvar-1311", key: "local", label: "Local", kind: "texto" },
    ],
  },
  {
    id: "rtpl-1003",
    name: "Parecer Técnico",
    description: "Parecer técnico fictício para análise de documentos.",
    specialty: "contabilidade",
    sections: [
      {
        id: "rsec-1121",
        title: "Documentos analisados",
        description: "Relação de documentos.",
        blocks: [
          {
            id: "rblk-1221",
            kind: "lista",
            title: "Lista",
            content: "Documento A; Documento B; Documento C.",
          },
        ],
      },
      {
        id: "rsec-1122",
        title: "Análise",
        description: "Análise técnica.",
        blocks: [
          {
            id: "rblk-1222",
            kind: "paragrafo",
            title: "Análise",
            content: "Análise demonstrativa de referência.",
          },
        ],
      },
      {
        id: "rsec-1123",
        title: "Parecer",
        description: "Parecer final.",
        blocks: [
          {
            id: "rblk-1223",
            kind: "citacao",
            title: "Citação",
            content: "Trecho de referência fictício.",
          },
        ],
      },
    ],
    variables: [
      { id: "rvar-1321", key: "referencia", label: "Referência", kind: "texto" },
    ],
  },
  {
    id: "rtpl-1004",
    name: "Laudo de Engenharia",
    description: "Modelo demonstrativo de laudo de engenharia estrutural.",
    specialty: "engenharia",
    sections: [
      {
        id: "rsec-1131",
        title: "Vistoria",
        description: "Registro da vistoria realizada.",
        blocks: [
          {
            id: "rblk-1231",
            kind: "paragrafo",
            title: "Data da vistoria",
            content: "Vistoria realizada em {{data_vistoria}}.",
            variableRefs: ["data_vistoria"],
          },
        ],
      },
      {
        id: "rsec-1132",
        title: "Análise técnica",
        description: "Análise da estrutura.",
        blocks: [
          {
            id: "rblk-1232",
            kind: "lista",
            title: "Achados",
            content: "Achado 1; Achado 2; Achado 3.",
          },
          {
            id: "rblk-1233",
            kind: "observacao",
            title: "Ressalvas",
            content: "Ressalvas técnicas demonstrativas.",
          },
        ],
      },
      {
        id: "rsec-1133",
        title: "Conclusão",
        description: "Parecer estrutural.",
        blocks: [
          {
            id: "rblk-1234",
            kind: "paragrafo",
            title: "Parecer",
            content: "Parecer estrutural demonstrativo.",
          },
        ],
      },
    ],
    variables: [
      { id: "rvar-1331", key: "data_vistoria", label: "Data da vistoria", kind: "data", required: true },
    ],
  },
  {
    id: "rtpl-1005",
    name: "Modelo Vazio",
    description:
      "Modelo propositalmente incompleto — usado como base para novos modelos criados no editor.",
    specialty: "geral",
    status: "rascunho",
    sections: [],
    variables: [],
  },
];

/**
 * Constrói o conjunto inicial de modelos. Cada chamada retorna instâncias
 * NOVAS e independentes: mutar o resultado JAMAIS afeta chamadas futuras.
 */
export function buildInitialTemplates(): readonly ReportTemplate[] {
  return SEEDS.map(seedToTemplate);
}

/** Total esperado de modelos iniciais (5). */
export const INITIAL_TEMPLATE_COUNT = SEEDS.length;

/** IDs estáveis das fixtures — úteis para testes e navegação demonstrativa. */
export const FIXTURE_TEMPLATE_IDS = Object.freeze({
  laudoPsicologico: "rtpl-1001" as ReportTemplateId,
  relatorioTecnico: "rtpl-1002" as ReportTemplateId,
  parecerTecnico: "rtpl-1003" as ReportTemplateId,
  laudoEngenharia: "rtpl-1004" as ReportTemplateId,
  modeloVazio: "rtpl-1005" as ReportTemplateId,
});

// ---------- helpers internos ----------

function seedToTemplate(seed: TemplateSeed): ReportTemplate {
  return {
    id: seed.id as ReportTemplateId,
    name: seed.name,
    description: seed.description,
    specialty: seed.specialty,
    status: "publicado",
    createdAt: FIXED_CREATED,
    updatedAt: FIXED_UPDATED,
    createdBy: MOCK_USER,
    sections: seed.sections.map((s, sIdx) => seedToSection(s, sIdx)),
    variables: seed.variables.map(seedToVariable),
    duplicatedFrom: null,
  };
}

function seedToSection(seed: SectionSeed, position: number): ReportTemplateSection {
  return {
    id: seed.id as ReportTemplateSectionId,
    title: seed.title,
    description: seed.description,
    position,
    blocks: seed.blocks.map((b, bIdx) => seedToBlock(b, bIdx)),
  };
}

function seedToBlock(
  seed: SectionSeed["blocks"][number],
  position: number,
): ReportTemplateBlock {
  return {
    id: seed.id as ReportTemplateBlockId,
    kind: seed.kind,
    title: seed.title,
    content: seed.content,
    position,
    variableRefs: [...(seed.variableRefs ?? [])],
  };
}

function seedToVariable(seed: VariableSeed): ReportTemplateVariable {
  return {
    id: seed.id as ReportTemplateVariableId,
    key: seed.key,
    label: seed.label,
    kind: seed.kind,
    required: seed.required ?? false,
    defaultValue: seed.defaultValue ?? "",
  };
}
