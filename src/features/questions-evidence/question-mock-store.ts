/**
 * LV-12 — Store em memória, seed determinístico e mutações append-only.
 */
import type {
  EvidenceLink,
  EvidenceRelevance,
  EvidenceType,
  ExpertQuestion,
  GapKind,
  HistoryEvent,
  HistoryEventKind,
  QuestionGap,
  QuestionOrigin,
  QuestionPriority,
  QuestionStatus,
} from "./question-types";
import {
  QUESTION_ORIGIN_LABEL,
  QUESTION_STATUS_LABEL,
  QUESTION_PRIORITY_LABEL,
  EVIDENCE_TYPE_LABEL,
  GAP_KIND_LABEL,
  HISTORY_EVENT_LABEL,
} from "./question-labels";

// -------------- IDs / clock determinístico --------------
let idCounter = 5000;
export function makeQuestionId(prefix: "que" | "evi" | "gap" | "his"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
export function resetQuestionIdCounter(seed = 5000): void {
  idCounter = seed;
}

function iso(y: number, mo: number, d: number, h = 9, mi = 0): string {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0)).toISOString();
}

export const SEED_REFERENCE_ISO = iso(2026, 7, 25, 12, 0);
const DEFAULT_AUTHOR = "Dra. Ana Beatriz Salgado";

// -------------- Helpers --------------
function makeHistory(
  questionId: string,
  kind: HistoryEventKind,
  createdAt: string,
  summary?: string,
  authorLabel: string = DEFAULT_AUTHOR,
): HistoryEvent {
  return {
    id: makeQuestionId("his"),
    questionId,
    kind,
    summary: summary ?? HISTORY_EVENT_LABEL[kind],
    authorLabel,
    createdAt,
  };
}

function makeLink(
  questionId: string,
  overrides: Partial<EvidenceLink> & {
    evidenceType: EvidenceType;
    sourceLabel: string;
    relevance: EvidenceRelevance;
    createdAt: string;
  },
): EvidenceLink {
  return {
    id: makeQuestionId("evi"),
    questionId,
    supportsAnswer: true,
    contradictsAnswer: false,
    createdByLabel: DEFAULT_AUTHOR,
    ...overrides,
  };
}

function makeGap(
  questionId: string,
  overrides: Partial<QuestionGap> & {
    kind: GapKind;
    description: string;
    createdAt: string;
  },
): QuestionGap {
  return {
    id: makeQuestionId("gap"),
    questionId,
    priority: "normal",
    resolved: false,
    ...overrides,
  };
}

// -------------- Seed builder --------------
function buildSeed(): ExpertQuestion[] {
  resetQuestionIdCounter(5000);
  const list: ExpertQuestion[] = [];

  function q(
    partial: Partial<ExpertQuestion> & {
      sequence: number;
      origin: QuestionOrigin;
      text: string;
      priority: QuestionPriority;
      status: QuestionStatus;
      caseId?: string;
      expertiseId?: string;
      createdAt: string;
      updatedAt: string;
      responsibleLabel?: string;
    },
  ): void {
    const id = `que-${String(partial.sequence).padStart(3, "0")}`;
    const questionId = id;
    const links: EvidenceLink[] = [];
    const gaps: QuestionGap[] = [];
    const history: HistoryEvent[] = [
      makeHistory(questionId, "criado", partial.createdAt, "Quesito criado no seed"),
    ];
    list.push({
      id,
      sequence: partial.sequence,
      origin: partial.origin,
      originLabel: partial.originLabel,
      text: partial.text,
      objective: partial.objective,
      priority: partial.priority,
      status: partial.status,
      caseId: partial.caseId,
      expertiseId: partial.expertiseId,
      technicalAnalysis: partial.technicalAnalysis,
      technicalAnswer: partial.technicalAnswer,
      conclusion: partial.conclusion,
      observations: partial.observations,
      evidenceLinks: links,
      gapItems: gaps,
      tags: partial.tags ?? [],
      responsibleLabel: partial.responsibleLabel ?? DEFAULT_AUTHOR,
      dueAt: partial.dueAt,
      readyForReport: partial.readyForReport ?? false,
      divergenceAnalyzed: partial.divergenceAnalyzed ?? false,
      divergenceJustification: partial.divergenceJustification,
      history,
      createdAt: partial.createdAt,
      updatedAt: partial.updatedAt,
    });
  }

  // 20 quesitos determinísticos cobrindo variedade
  q({
    sequence: 1, origin: "juizo", priority: "alta", status: "respondido", caseId: "pro-01", expertiseId: "prc-01",
    text: "Existem infiltrações no subsolo do empreendimento Vila Aurora? Em caso afirmativo, apontar sua origem, extensão e a responsabilidade técnica pela ocorrência.",
    objective: "Identificar patologias construtivas e nexo com projeto/execução.",
    technicalAnalysis: "Vistoria realizada em 05/08/2026 identificou pontos ativos de umidade nas paredes oeste e norte do subsolo, com padrão típico de infiltração por lençol freático rebaixado sem impermeabilização adequada.",
    technicalAnswer: "Sim. Constatou-se infiltração em 12 pontos do subsolo, com origem em falha de impermeabilização executiva das paredes de contenção.",
    conclusion: "Responsabilidade técnica atribuída à etapa executiva.",
    tags: ["patologia", "impermeabilização", "urgente"],
    readyForReport: true,
    createdAt: iso(2026, 4, 1), updatedAt: iso(2026, 6, 20),
  });
  q({
    sequence: 2, origin: "autor", priority: "normal", status: "parcial", caseId: "pro-01", expertiseId: "prc-01",
    text: "As infiltrações comprometem a estabilidade estrutural da edificação?",
    technicalAnswer: "Análise preliminar indica que não há comprometimento estrutural imediato, mas monitoramento é recomendado.",
    createdAt: iso(2026, 4, 2), updatedAt: iso(2026, 6, 10),
    dueAt: iso(2026, 8, 15),
  });
  q({
    sequence: 3, origin: "reu", priority: "normal", status: "sem_evidencia", caseId: "pro-01", expertiseId: "prc-01",
    text: "As infiltrações decorrem de uso inadequado do imóvel pelos condôminos?",
    createdAt: iso(2026, 4, 3), updatedAt: iso(2026, 4, 3),
    dueAt: iso(2026, 7, 15),
  });
  q({
    sequence: 4, origin: "assistente_tecnico", originLabel: "AT do autor — Eng. Souza",
    priority: "alta", status: "com_divergencia", caseId: "pro-01", expertiseId: "prc-01",
    text: "Existe registro de vazamentos anteriores documentados pela administração do condomínio?",
    technicalAnswer: "Há registros conflitantes: livro de ocorrências indica reparos em 2023; ata de assembleia nega.",
    createdAt: iso(2026, 4, 4), updatedAt: iso(2026, 6, 5),
  });
  q({
    sequence: 5, origin: "juizo", priority: "critica", status: "nao_analisado", caseId: "pro-02", expertiseId: "prc-02",
    text: "Os valores cobrados a título de tarifas bancárias estão de acordo com a Resolução Bacen aplicável ao contrato?",
    objective: "Verificar conformidade regulatória de tarifas.",
    priority: "critica",
    createdAt: iso(2026, 5, 10), updatedAt: iso(2026, 5, 10),
    dueAt: iso(2026, 6, 30), // vencido em relação a SEED_REFERENCE_ISO
  });
  q({
    sequence: 6, origin: "autor", priority: "alta", status: "em_analise", caseId: "pro-02", expertiseId: "prc-02",
    text: "Houve capitalização indevida de juros no contrato de financiamento?",
    technicalAnalysis: "Recalculando parcelas com sistema Price e SAC para comparação.",
    createdAt: iso(2026, 5, 12), updatedAt: iso(2026, 7, 1),
    dueAt: iso(2026, 8, 30),
  });
  q({
    sequence: 7, origin: "reu", priority: "baixa", status: "nao_aplicavel", caseId: "pro-02", expertiseId: "prc-02",
    text: "O autor possui outros contratos financeiros com o réu no período investigado?",
    createdAt: iso(2026, 5, 15), updatedAt: iso(2026, 6, 1),
  });
  q({
    sequence: 8, origin: "ministerio_publico", priority: "alta", status: "parcial", caseId: "pro-03", expertiseId: "prc-03",
    text: "A criança apresenta indícios clínicos de alienação parental?",
    technicalAnalysis: "Avaliações psicológicas em curso; três sessões realizadas; padrão de discurso repetitivo observado.",
    technicalAnswer: "Indícios parciais; avaliação incompleta pendente de sessões complementares.",
    createdAt: iso(2026, 3, 1), updatedAt: iso(2026, 6, 15),
    tags: ["psicologia", "familia"],
    dueAt: iso(2026, 9, 1),
  });
  q({
    sequence: 9, origin: "perito", priority: "normal", status: "respondido", caseId: "pro-03", expertiseId: "prc-03",
    text: "O ambiente familiar oferece condições adequadas ao desenvolvimento da criança?",
    technicalAnswer: "Sim, com ressalvas quanto à supervisão escolar.",
    conclusion: "Ambiente adequado com recomendações complementares.",
    readyForReport: true,
    createdAt: iso(2026, 3, 5), updatedAt: iso(2026, 6, 20),
  });
  q({
    sequence: 10, origin: "juizo", priority: "critica", status: "sem_evidencia", caseId: "pro-04", expertiseId: "prc-04",
    text: "Existe contaminação de solo por metais pesados na área industrial desativada do processo? Especificar concentrações e limites da CETESB/CONAMA aplicáveis.",
    objective: "Determinar contaminação e conformidade com normas ambientais vigentes.",
    tags: ["ambiental", "cetesb"],
    createdAt: iso(2026, 2, 14), updatedAt: iso(2026, 5, 1),
    dueAt: iso(2026, 8, 20),
  });
  q({
    sequence: 11, origin: "autor", priority: "alta", status: "em_analise", caseId: "pro-04", expertiseId: "prc-04",
    text: "As atividades industriais anteriores geraram passivo ambiental?",
    createdAt: iso(2026, 2, 20), updatedAt: iso(2026, 6, 30),
  });
  q({
    sequence: 12, origin: "complementar", priority: "normal", status: "nao_analisado", caseId: "pro-05", expertiseId: "prc-05",
    text: "Os cálculos de horas extras apresentados pela reclamante estão corretos?",
    createdAt: iso(2026, 6, 1), updatedAt: iso(2026, 6, 1),
    dueAt: iso(2026, 8, 10),
  });
  q({
    sequence: 13, origin: "reu", priority: "baixa", status: "nao_aplicavel", caseId: "pro-05", expertiseId: "prc-05",
    text: "A reclamante trabalhou em regime de banco de horas formalizado por acordo coletivo?",
    createdAt: iso(2026, 6, 2), updatedAt: iso(2026, 6, 2),
  });
  q({
    sequence: 14, origin: "assistente_tecnico", originLabel: "AT do réu — Contadora Lima",
    priority: "alta", status: "com_divergencia", caseId: "pro-05", expertiseId: "prc-05",
    text: "O adicional noturno foi corretamente calculado sobre as horas efetivamente trabalhadas?",
    createdAt: iso(2026, 6, 3), updatedAt: iso(2026, 7, 10),
    dueAt: iso(2026, 8, 5),
  });
  q({
    sequence: 15, origin: "outro", originLabel: "Curador especial",
    priority: "normal", status: "respondido", caseId: "pro-06", expertiseId: "prc-06",
    text: "O interditando apresenta capacidade cognitiva compatível com atos negociais complexos?",
    technicalAnswer: "Não. Diagnóstico consolidado indica déficit cognitivo moderado.",
    conclusion: "Incapacidade parcial para atos negociais.",
    readyForReport: true,
    createdAt: iso(2026, 1, 15), updatedAt: iso(2026, 6, 10),
  });
  q({
    sequence: 16, origin: "juizo", priority: "normal", status: "parcial", caseId: "pro-06", expertiseId: "prc-06",
    text: "Existe rede de apoio familiar capaz de assumir a curatela?",
    technicalAnswer: "Sim, com dois familiares próximos disponíveis.",
    createdAt: iso(2026, 1, 20), updatedAt: iso(2026, 6, 12),
    tags: ["curatela"],
  });
  q({
    sequence: 17, origin: "perito", priority: "baixa", status: "nao_analisado", caseId: "pro-06", expertiseId: "prc-06",
    text: "Existem indícios de exploração patrimonial anterior?",
    createdAt: iso(2026, 1, 25), updatedAt: iso(2026, 1, 25),
  });
  q({
    sequence: 18, origin: "autor", priority: "alta", status: "respondido", caseId: "pro-01", expertiseId: "prc-01",
    text: "O custo estimado das obras corretivas justifica a rescisão contratual pretendida?",
    technicalAnswer: "Sim. Estimativa de R$ 480.000,00 supera 15% do valor original da obra.",
    conclusion: "Custos incompatíveis com correção pontual.",
    readyForReport: true,
    createdAt: iso(2026, 4, 15), updatedAt: iso(2026, 6, 25),
  });
  q({
    sequence: 19, origin: "complementar", priority: "critica", status: "em_analise", caseId: "pro-04", expertiseId: "prc-04",
    text: "Os laudos laboratoriais complementares apresentados são tecnicamente conclusivos quanto à profundidade da contaminação, considerando as metodologias adotadas pela CETESB e a heterogeneidade do solo local?",
    objective: "Validar metodologia laboratorial e representatividade das amostras.",
    createdAt: iso(2026, 5, 5), updatedAt: iso(2026, 7, 15),
    dueAt: iso(2026, 8, 25),
    tags: ["laboratorio", "amostragem"],
  });
  q({
    sequence: 20, origin: "juizo", priority: "normal", status: "nao_analisado", caseId: "pro-02", expertiseId: "prc-02",
    text: "Há indícios de venda casada de produtos financeiros associados ao contrato principal?",
    createdAt: iso(2026, 5, 20), updatedAt: iso(2026, 5, 20),
    dueAt: iso(2026, 9, 15),
  });

  // Add curated evidence links & gaps to selected questions (deterministic)
  function addLink(qId: string, link: Omit<EvidenceLink, "id" | "questionId">): void {
    const idx = list.findIndex((x) => x.id === qId);
    if (idx < 0) return;
    const target = list[idx];
    const newLink: EvidenceLink = {
      ...link,
      id: makeQuestionId("evi"),
      questionId: qId,
    };
    list[idx] = {
      ...target,
      evidenceLinks: [...target.evidenceLinks, newLink],
      history: [
        ...target.history,
        makeHistory(qId, "evidencia_vinculada", link.createdAt, `Evidência: ${link.sourceLabel}`),
      ],
    };
  }
  function addGap(qId: string, gap: Omit<QuestionGap, "id" | "questionId">): void {
    const idx = list.findIndex((x) => x.id === qId);
    if (idx < 0) return;
    const target = list[idx];
    const newGap: QuestionGap = {
      ...gap,
      id: makeQuestionId("gap"),
      questionId: qId,
    };
    list[idx] = {
      ...target,
      gapItems: [...target.gapItems, newGap],
      history: [
        ...target.history,
        makeHistory(qId, "lacuna_criada", gap.createdAt, GAP_KIND_LABEL[gap.kind]),
      ],
    };
  }

  addLink("que-001", {
    evidenceType: "documento",
    sourceId: "doc-01",
    sourceLabel: "Laudo pericial preliminar — infiltrações Vila Aurora",
    relevance: "determinante",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 5, 12),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-001", {
    evidenceType: "diligencia_foto",
    sourceId: "doc-03",
    sourceLabel: "Evidência fotográfica — pontos de umidade parede oeste",
    excerpt: "12 pontos ativos de umidade fotografados na vistoria conjunta.",
    relevance: "alta",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 5, 13),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-002", {
    evidenceType: "documento",
    sourceId: "doc-01",
    sourceLabel: "Laudo pericial preliminar — infiltrações Vila Aurora",
    relevance: "media",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 5, 15),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-004", {
    evidenceType: "documento",
    sourceId: "doc-02",
    sourceLabel: "Livro de ocorrências — condomínio",
    relevance: "alta",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 5, 20),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-004", {
    evidenceType: "observacao_manual",
    sourceLabel: "Ata de assembleia — negativa administração",
    excerpt: "Ata registra ausência de eventos anteriores; conflita com livro de ocorrências.",
    relevance: "alta",
    supportsAnswer: false,
    contradictsAnswer: true,
    contradictionJustification: "Fonte oficial da administração contradiz registros informais.",
    createdAt: iso(2026, 6, 1),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-008", {
    evidenceType: "entrevista",
    sourceId: "ent-003",
    sourceLabel: "Avaliação psicológica — Maria Eduarda",
    relevance: "alta",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 5, 30),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-008", {
    evidenceType: "entrevista_nota",
    sourceId: "ent-004",
    sourceParentId: "ent-004",
    sourceLabel: "Nota da entrevista familiar — padrão de discurso",
    relevance: "media",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 6, 5),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-009", {
    evidenceType: "entrevista",
    sourceId: "ent-004",
    sourceLabel: "Entrevista familiar — família Ferreira",
    relevance: "determinante",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 6, 10),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-014", {
    evidenceType: "documento",
    sourceId: "doc-04",
    sourceLabel: "Petição de esclarecimentos — quesitos complementares",
    relevance: "media",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 6, 15),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-014", {
    evidenceType: "observacao_manual",
    sourceLabel: "Contra-análise do AT do autor",
    relevance: "alta",
    supportsAnswer: false,
    contradictsAnswer: true,
    contradictionJustification: "Cálculo apresenta metodologia divergente do adotado.",
    createdAt: iso(2026, 7, 1),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-015", {
    evidenceType: "entrevista",
    sourceId: "ent-006",
    sourceLabel: "Entrevista técnica — João Batista Rocha",
    relevance: "determinante",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 6, 5),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-018", {
    evidenceType: "documento",
    sourceId: "doc-01",
    sourceLabel: "Laudo pericial preliminar — Vila Aurora",
    relevance: "alta",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 6, 20),
    createdByLabel: DEFAULT_AUTHOR,
  });
  addLink("que-019", {
    evidenceType: "documento_versao",
    sourceId: "doc-06",
    sourceParentId: "doc-06",
    sourceLabel: "Relatório ambiental preliminar — v2",
    relevance: "media",
    supportsAnswer: true,
    contradictsAnswer: false,
    createdAt: iso(2026, 7, 10),
    createdByLabel: DEFAULT_AUTHOR,
  });

  // Gaps
  addGap("que-003", {
    kind: "documento_ausente",
    description: "Livro de ocorrências completo do condomínio nos últimos 5 anos.",
    priority: "alta",
    resolved: false,
    createdAt: iso(2026, 5, 1),
  });
  addGap("que-005", {
    kind: "prazo_vencido",
    description: "Prazo original vencido; solicitar prorrogação ao juízo.",
    priority: "critica",
    resolved: false,
    createdAt: iso(2026, 7, 1),
  });
  addGap("que-010", {
    kind: "documento_ausente",
    description: "Laudo laboratorial de coleta de amostras.",
    priority: "critica",
    resolved: false,
    createdAt: iso(2026, 5, 1),
  });
  addGap("que-011", {
    kind: "diligencia_necessaria",
    description: "Nova visita à área industrial para nova amostragem.",
    priority: "alta",
    resolved: false,
    createdAt: iso(2026, 6, 30),
  });
  addGap("que-019", {
    kind: "validacao_pendente",
    description: "Aguardando revisão do AT do autor sobre metodologia CETESB.",
    priority: "alta",
    resolved: false,
    createdAt: iso(2026, 7, 15),
  });

  return list;
}

// -------------- Store --------------
type Listener = () => void;
let state: readonly ExpertQuestion[] = buildSeed();
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeQuestionsStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function listQuestions(): readonly ExpertQuestion[] {
  return state;
}

export function getQuestion(id: string): ExpertQuestion | undefined {
  return state.find((q) => q.id === id);
}

export function resetQuestionsStore(): void {
  state = buildSeed();
  notify();
}

// -------------- Mutations (immutable) --------------
function replace(id: string, mut: (q: ExpertQuestion) => ExpertQuestion): ExpertQuestion {
  const idx = state.findIndex((q) => q.id === id);
  if (idx < 0) throw new Error(`Quesito não encontrado: ${id}`);
  const updated = mut(state[idx]);
  const next = state.slice();
  next[idx] = updated;
  state = next;
  notify();
  return updated;
}

function addHistory(
  q: ExpertQuestion,
  kind: HistoryEventKind,
  summary?: string,
  authorLabel: string = DEFAULT_AUTHOR,
): ExpertQuestion {
  const now = new Date().toISOString();
  return {
    ...q,
    updatedAt: now,
    history: [
      ...q.history,
      {
        id: makeQuestionId("his"),
        questionId: q.id,
        kind,
        summary: summary ?? HISTORY_EVENT_LABEL[kind],
        authorLabel,
        createdAt: now,
      },
    ],
  };
}

export type QuestionFormInput = {
  caseId?: string;
  expertiseId?: string;
  origin: QuestionOrigin;
  originLabel?: string;
  text: string;
  objective?: string;
  priority: QuestionPriority;
  responsibleLabel: string;
  dueAt?: string;
  tags: readonly string[];
};

export type FormErrors = Record<string, string>;

export function validateQuestionForm(input: Partial<QuestionFormInput>): FormErrors {
  const errors: FormErrors = {};
  if (!input.caseId) errors.caseId = "Selecione o processo.";
  if (!input.origin) errors.origin = "Selecione a origem.";
  if (!input.text || !input.text.trim()) errors.text = "Informe o texto do quesito.";
  else if (input.text.length > 2000) errors.text = "Texto muito longo.";
  if (!input.priority) errors.priority = "Selecione a prioridade.";
  if (!input.responsibleLabel || !input.responsibleLabel.trim()) {
    errors.responsibleLabel = "Informe o responsável.";
  }
  if (input.dueAt) {
    const t = new Date(input.dueAt).getTime();
    if (Number.isNaN(t)) errors.dueAt = "Prazo inválido.";
  }
  if ((input.origin === "assistente_tecnico" || input.origin === "outro") &&
      (!input.originLabel || !input.originLabel.trim())) {
    errors.originLabel = "Identifique a origem.";
  }
  return errors;
}

export function createQuestion(input: QuestionFormInput): ExpertQuestion {
  const now = new Date().toISOString();
  const sequence = state.length + 1;
  const id = makeQuestionId("que");
  const q: ExpertQuestion = {
    id,
    caseId: input.caseId,
    expertiseId: input.expertiseId,
    sequence,
    origin: input.origin,
    originLabel: input.originLabel?.trim() || undefined,
    text: input.text.trim(),
    objective: input.objective?.trim() || undefined,
    status: "nao_analisado",
    priority: input.priority,
    evidenceLinks: [],
    gapItems: [],
    tags: [...input.tags],
    responsibleLabel: input.responsibleLabel.trim(),
    dueAt: input.dueAt,
    readyForReport: false,
    divergenceAnalyzed: false,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  const seeded = {
    ...q,
    history: [
      {
        id: makeQuestionId("his"),
        questionId: id,
        kind: "criado" as const,
        summary: HISTORY_EVENT_LABEL.criado,
        authorLabel: DEFAULT_AUTHOR,
        createdAt: now,
      },
    ],
  };
  state = [...state, seeded];
  notify();
  return seeded;
}

export function updateAnswer(
  id: string,
  patch: {
    technicalAnalysis?: string;
    technicalAnswer?: string;
    conclusion?: string;
    observations?: string;
  },
): ExpertQuestion {
  return replace(id, (q) => {
    const next: ExpertQuestion = {
      ...q,
      technicalAnalysis: patch.technicalAnalysis ?? q.technicalAnalysis,
      technicalAnswer: patch.technicalAnswer ?? q.technicalAnswer,
      conclusion: patch.conclusion ?? q.conclusion,
      observations: patch.observations ?? q.observations,
    };
    return addHistory(next, "resposta_alterada", "Resposta técnica alterada");
  });
}

export type StatusChangeError = Readonly<{ ok: false; reason: string }>;
export type StatusChangeSuccess = Readonly<{ ok: true; record: ExpertQuestion }>;
export type StatusChangeResult = StatusChangeSuccess | StatusChangeError;

export function canMarkAnswered(q: ExpertQuestion): { ok: boolean; reason?: string } {
  const answered =
    (q.technicalAnswer ?? "").trim().length > 0 || (q.conclusion ?? "").trim().length > 0;
  if (!answered) return { ok: false, reason: "Preencha a resposta técnica antes de marcar como respondido." };
  const openGaps = q.gapItems.filter((g) => !g.resolved && g.priority !== "baixa");
  if (openGaps.length > 0) {
    return { ok: false, reason: `Existem ${openGaps.length} lacuna(s) obrigatórias abertas.` };
  }
  const unresolvedDivergence = q.evidenceLinks.some(
    (l) => l.contradictsAnswer && l.relevance === "determinante",
  );
  if (unresolvedDivergence && !q.divergenceAnalyzed) {
    return { ok: false, reason: "Divergência determinante não analisada." };
  }
  return { ok: true };
}

export function changeStatus(
  id: string,
  next: QuestionStatus,
): StatusChangeResult {
  const cur = getQuestion(id);
  if (!cur) return { ok: false, reason: "Quesito não encontrado." };
  if (next === "respondido") {
    const g = canMarkAnswered(cur);
    if (!g.ok) return { ok: false, reason: g.reason ?? "Bloqueio de resposta." };
  }
  const rec = replace(id, (q) =>
    addHistory({ ...q, status: next }, "situacao_alterada",
      `Situação: ${QUESTION_STATUS_LABEL[next]}`),
  );
  return { ok: true, record: rec };
}

export function linkEvidence(
  id: string,
  input: Omit<EvidenceLink, "id" | "questionId" | "createdAt" | "createdByLabel"> & {
    createdByLabel?: string;
  },
): { ok: boolean; reason?: string; record?: ExpertQuestion } {
  if (input.supportsAnswer && input.contradictsAnswer && !input.contradictionJustification) {
    return {
      ok: false,
      reason: "Vínculo que sustenta e contradiz simultaneamente exige justificativa explícita.",
    };
  }
  const rec = replace(id, (q) => {
    const link: EvidenceLink = {
      ...input,
      id: makeQuestionId("evi"),
      questionId: id,
      createdAt: new Date().toISOString(),
      createdByLabel: input.createdByLabel ?? DEFAULT_AUTHOR,
    };
    let nextStatus = q.status;
    if (link.contradictsAnswer && q.status !== "com_divergencia") {
      nextStatus = "com_divergencia";
    }
    return addHistory(
      {
        ...q,
        status: nextStatus,
        evidenceLinks: [...q.evidenceLinks, link],
      },
      "evidencia_vinculada",
      `Evidência: ${link.sourceLabel} (${EVIDENCE_TYPE_LABEL[link.evidenceType]})`,
    );
  });
  return { ok: true, record: rec };
}

export function removeEvidence(id: string, evidenceId: string): ExpertQuestion {
  return replace(id, (q) => {
    const removed = q.evidenceLinks.find((l) => l.id === evidenceId);
    return addHistory(
      { ...q, evidenceLinks: q.evidenceLinks.filter((l) => l.id !== evidenceId) },
      "evidencia_removida",
      removed ? `Removida: ${removed.sourceLabel}` : "Evidência removida",
    );
  });
}

export function addGapItem(
  id: string,
  input: Omit<QuestionGap, "id" | "questionId" | "createdAt" | "resolved">,
): ExpertQuestion {
  return replace(id, (q) => {
    const gap: QuestionGap = {
      ...input,
      id: makeQuestionId("gap"),
      questionId: id,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    return addHistory(
      { ...q, gapItems: [...q.gapItems, gap] },
      "lacuna_criada",
      GAP_KIND_LABEL[gap.kind],
    );
  });
}

export function resolveGap(id: string, gapId: string, evidenceId?: string): ExpertQuestion {
  return replace(id, (q) => {
    const now = new Date().toISOString();
    const gaps = q.gapItems.map((g) =>
      g.id === gapId
        ? { ...g, resolved: true, resolvedAt: now, resolvedByEvidenceId: evidenceId }
        : g,
    );
    return addHistory({ ...q, gapItems: gaps }, "lacuna_resolvida");
  });
}

export function reopenGap(id: string, gapId: string): ExpertQuestion {
  return replace(id, (q) => {
    const gaps = q.gapItems.map((g) =>
      g.id === gapId
        ? { ...g, resolved: false, resolvedAt: undefined, resolvedByEvidenceId: undefined }
        : g,
    );
    return addHistory({ ...q, gapItems: gaps }, "lacuna_criada", "Lacuna reaberta");
  });
}

export function analyzeDivergence(
  id: string,
  justification: string,
): ExpertQuestion {
  return replace(id, (q) =>
    addHistory(
      { ...q, divergenceAnalyzed: true, divergenceJustification: justification.trim() },
      "divergencia_analisada",
      justification.trim().slice(0, 200) || "Divergência analisada",
    ),
  );
}

export function markReadyForReport(id: string): { ok: boolean; reason?: string; record?: ExpertQuestion } {
  const cur = getQuestion(id);
  if (!cur) return { ok: false, reason: "Quesito não encontrado." };
  if (cur.status !== "respondido" && cur.status !== "parcial") {
    return { ok: false, reason: "Somente quesitos respondidos podem ser preparados para o laudo." };
  }
  const rec = replace(id, (q) => addHistory({ ...q, readyForReport: true }, "preparado_laudo"));
  return { ok: true, record: rec };
}

export function unmarkReadyForReport(id: string): ExpertQuestion {
  return replace(id, (q) => addHistory({ ...q, readyForReport: false }, "retirado_preparacao"));
}

export function buildPreparedBlock(q: ExpertQuestion): string {
  const parts: string[] = [];
  parts.push(`Quesito ${q.sequence} — ${q.text}`);
  if (q.technicalAnalysis) parts.push(`\nAnálise técnica:\n${q.technicalAnalysis}`);
  if (q.technicalAnswer) parts.push(`\nResposta:\n${q.technicalAnswer}`);
  if (q.conclusion) parts.push(`\nConclusão:\n${q.conclusion}`);
  if (q.evidenceLinks.length > 0) {
    parts.push("\nEvidências citadas:");
    for (const l of q.evidenceLinks) {
      parts.push(`- ${EVIDENCE_TYPE_LABEL[l.evidenceType]}: ${l.sourceLabel}`);
    }
  }
  if (q.divergenceJustification) {
    parts.push(`\nAnálise da divergência:\n${q.divergenceJustification}`);
  }
  return parts.join("\n");
}
