/**
 * LV-11 — Store mock em memória para o módulo Entrevistas e diligências.
 *
 * Sem persistência, sem rede, sem backend. Seed determinístico restaurado
 * a cada carregamento. Notificações via subscribe() para os consumidores.
 */

import { clientes } from "@/lib/mock/data";
import type {
  DiligenceChecklistItem,
  DiligencePhotoMock,
  DiligenceRecord,
  DiligenceStatus,
  InterviewNote,
  InterviewNoteKind,
  InterviewQuestionAnswer,
  InterviewRecord,
  InterviewStatus,
  ModuleRecord,
  TranscriptBlock,
} from "./interview-types";
import { buildQuestionsFromTemplate } from "./interview-templates";

let counter = 100;
export function makeInterviewId(prefix: "ent" | "dil" | "nota" | "trs" | "chk" | "pho"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
export function resetInterviewIdCounter(seed = 100): void {
  counter = seed;
}

const iso = (y: number, mo: number, d: number, h = 9, mi = 0) =>
  new Date(Date.UTC(y, mo - 1, d, h, mi, 0)).toISOString();

const BASE_ISO = iso(2026, 7, 25, 12, 0);
const DEFAULT_RESP = "Dra. Ana Beatriz Salgado";

function note(
  id: string,
  text: string,
  kind: InterviewNoteKind,
  createdAt: string,
  authorLabel = DEFAULT_RESP,
  timestampMs?: number,
): InterviewNote {
  return { id, text, kind, timestampMs, authorLabel, createdAt };
}

function q(
  base: InterviewQuestionAnswer,
  patch: Partial<InterviewQuestionAnswer>,
): InterviewQuestionAnswer {
  return { ...base, ...patch };
}

function block(
  id: string,
  timeLabel: string,
  personLabel: string,
  text: string,
  opts: Partial<TranscriptBlock> = {},
): TranscriptBlock {
  return {
    id,
    timeLabel,
    personLabel,
    text,
    highlighted: false,
    consolidated: true,
    ...opts,
  };
}

function seedInterviews(): InterviewRecord[] {
  const inicial = buildQuestionsFromTemplate("roteiro-inicial");
  const complementar = buildQuestionsFromTemplate("roteiro-complementar");
  const psicologica = buildQuestionsFromTemplate("roteiro-psicologica");
  const familiar = buildQuestionsFromTemplate("roteiro-familiar");
  const crianca = buildQuestionsFromTemplate("roteiro-crianca-adolescente");
  const tecnico = buildQuestionsFromTemplate("roteiro-tecnico-livre");

  return [
    {
      id: "ent-001",
      kind: "entrevista",
      title: "Entrevista inicial — Construtora Horizonte",
      caseId: "pro-01",
      expertiseId: "prc-01",
      participantIds: ["cli-01"],
      responsibleLabel: DEFAULT_RESP,
      templateId: "roteiro-inicial",
      status: "agendada",
      scheduledAt: iso(2026, 8, 2, 14, 30),
      notes: [],
      transcriptBlocks: [],
      questions: inicial,
      pendingItems: [],
      createdAt: iso(2026, 7, 20, 10),
      updatedAt: iso(2026, 7, 20, 10),
    },
    {
      id: "ent-002",
      kind: "entrevista",
      title:
        "Entrevista complementar — assistente técnico do Banco Meridiano sobre movimentações financeiras controversas",
      caseId: "pro-02",
      expertiseId: "prc-02",
      participantIds: ["cli-02"],
      responsibleLabel: "Dra. Helena Vasconcelos",
      templateId: "roteiro-complementar",
      status: "em_preparacao",
      scheduledAt: iso(2026, 7, 30, 10),
      notes: [
        note("nota-201", "Verificar planilha enviada em anexo.", "observacao", iso(2026, 7, 22, 8)),
      ],
      transcriptBlocks: [],
      questions: complementar,
      pendingItems: ["Confirmar disponibilidade do intérprete."],
      createdAt: iso(2026, 7, 19, 9),
      updatedAt: iso(2026, 7, 22, 8),
    },
    {
      id: "ent-003",
      kind: "entrevista",
      title: "Avaliação psicológica — Maria Eduarda",
      caseId: "pro-03",
      expertiseId: "prc-03",
      participantIds: ["cli-03"],
      responsibleLabel: "Dr. Paulo Cordeiro",
      templateId: "roteiro-psicologica",
      status: "em_andamento",
      scheduledAt: iso(2026, 7, 25, 15),
      startedAt: iso(2026, 7, 25, 15, 5),
      notes: [
        note(
          "nota-301",
          "Entrevistada relata quadro de ansiedade.",
          "ponto_importante",
          iso(2026, 7, 25, 15, 20),
        ),
        note(
          "nota-302",
          "Retomar tema família na próxima sessão.",
          "pendencia",
          iso(2026, 7, 25, 15, 40),
        ),
      ],
      transcriptBlocks: [
        block("trs-301", "15:07", "Perito", "Bom dia, obrigado por comparecer."),
        block("trs-302", "15:08", "Entrevistada", "Bom dia. Estou tranquila."),
        block(
          "trs-303",
          "15:12",
          "Entrevistada",
          "Tenho dormido pouco desde o início do processo.",
          {
            highlighted: true,
          },
        ),
      ],
      questions: [
        q(psicologica[0]!, {
          status: "respondida",
          answerText: "Ansiedade leve, sem crises graves.",
        }),
        ...psicologica.slice(1),
      ],
      pendingItems: [],
      createdAt: iso(2026, 7, 20, 11),
      updatedAt: iso(2026, 7, 25, 15, 40),
    },
    {
      id: "ent-004",
      kind: "entrevista",
      title: "Entrevista familiar — família Ferreira",
      caseId: "pro-03",
      expertiseId: "prc-03",
      participantIds: ["cli-03"],
      responsibleLabel: "Dra. Marina Toledo",
      templateId: "roteiro-familiar",
      status: "com_pendencia",
      scheduledAt: iso(2026, 7, 15, 14),
      startedAt: iso(2026, 7, 15, 14, 5),
      completedAt: iso(2026, 7, 15, 16, 20),
      notes: [
        note(
          "nota-401",
          "Necessário reconvocar o irmão mais velho.",
          "pendencia",
          iso(2026, 7, 15, 16, 20),
        ),
      ],
      transcriptBlocks: [
        block("trs-401", "14:10", "Mãe", "A rotina se reorganizou nos últimos meses."),
      ],
      questions: familiar.map((qq, i) =>
        i < 2 ? q(qq, { status: "respondida", answerText: "Respondido em entrevista." }) : qq,
      ),
      pendingItems: ["Reconvocar familiar ausente"],
      createdAt: iso(2026, 7, 10, 10),
      updatedAt: iso(2026, 7, 15, 16, 20),
    },
    {
      id: "ent-005",
      kind: "entrevista",
      title: "Entrevista com adolescente — caso Vale",
      caseId: "pro-04",
      participantIds: [],
      responsibleLabel: "Dr. Paulo Cordeiro",
      templateId: "roteiro-crianca-adolescente",
      status: "concluida",
      scheduledAt: iso(2026, 7, 12, 10),
      startedAt: iso(2026, 7, 12, 10, 5),
      completedAt: iso(2026, 7, 12, 11, 5),
      notes: [
        note("nota-501", "Adolescente colaborativo.", "observacao", iso(2026, 7, 12, 11, 5)),
        note(
          "nota-502",
          "Conclusão provisória: quadro estável.",
          "conclusao_provisoria",
          iso(2026, 7, 12, 11, 6),
        ),
      ],
      transcriptBlocks: [],
      questions: crianca.map((qq) =>
        q(qq, { status: "respondida", answerText: "Registrado nas notas." }),
      ),
      pendingItems: [],
      conclusion: "Escuta especializada realizada; adolescente estável e colaborativo.",
      createdAt: iso(2026, 7, 5, 9),
      updatedAt: iso(2026, 7, 12, 11, 6),
    },
    {
      id: "ent-006",
      kind: "entrevista",
      title: "Entrevista técnica — João Batista Rocha",
      caseId: "pro-05",
      participantIds: ["cli-05"],
      responsibleLabel: "Dr. Fernando Aguiar",
      templateId: "roteiro-tecnico-livre",
      status: "pausada",
      scheduledAt: iso(2026, 7, 25, 9),
      startedAt: iso(2026, 7, 25, 9, 5),
      notes: [
        note("nota-601", "Pausa solicitada pelo entrevistado.", "observacao", iso(2026, 7, 25, 10)),
      ],
      transcriptBlocks: [
        block("trs-601", "09:10", "Entrevistado", "Trabalhei na área por quinze anos."),
      ],
      questions: tecnico,
      pendingItems: [],
      createdAt: iso(2026, 7, 22, 8),
      updatedAt: iso(2026, 7, 25, 10),
    },
    {
      id: "ent-007",
      kind: "entrevista",
      title: "Entrevista cancelada — retorno remarcado",
      caseId: "pro-06",
      participantIds: ["cli-06"],
      responsibleLabel: DEFAULT_RESP,
      templateId: "roteiro-personalizado",
      status: "cancelada",
      scheduledAt: iso(2026, 7, 18, 15),
      notes: [
        note(
          "nota-701",
          "Cancelada por indisponibilidade do entrevistado.",
          "observacao",
          iso(2026, 7, 17, 18),
        ),
      ],
      transcriptBlocks: [],
      questions: [],
      pendingItems: [],
      createdAt: iso(2026, 7, 12, 10),
      updatedAt: iso(2026, 7, 17, 18),
    },
    {
      id: "ent-008",
      kind: "entrevista",
      title: "Entrevista inicial — Seguradora Aliança",
      caseId: "pro-06",
      participantIds: ["cli-06"],
      responsibleLabel: "Dr. Ricardo Monteiro",
      templateId: "roteiro-inicial",
      status: "agendada",
      scheduledAt: iso(2026, 8, 10, 14),
      notes: [],
      transcriptBlocks: [],
      questions: inicial,
      pendingItems: [],
      createdAt: iso(2026, 7, 24, 11),
      updatedAt: iso(2026, 7, 24, 11),
    },
  ];
}

function chk(
  id: string,
  text: string,
  state: DiligenceChecklistItem["state"] = "pendente",
): DiligenceChecklistItem {
  return { id, text, state };
}

function photo(
  id: string,
  name: string,
  category: DiligencePhotoMock["category"],
  caption: string,
): DiligencePhotoMock {
  return {
    id,
    name,
    sizeBytes: 850_000,
    mimeType: "image/jpeg",
    caption,
    capturedAt: iso(2026, 7, 20, 11, 15),
    category,
    relevant: false,
  };
}

function seedDiligences(): DiligenceRecord[] {
  return [
    {
      id: "dil-001",
      kind: "diligencia",
      title: "Vistoria estrutural — Vila Aurora",
      caseId: "pro-01",
      expertiseId: "prc-01",
      responsibleLabel: DEFAULT_RESP,
      diligenceKind: "vistoria_imovel",
      status: "agendada",
      scheduledAt: iso(2026, 8, 3, 9),
      address: "Rua das Palmeiras, 250 — Vila Aurora, São Paulo/SP",
      objective: "Inspecionar infiltrações no subsolo.",
      checklistItems: [
        chk("chk-011", "Medir umidade nas paredes"),
        chk("chk-012", "Fotografar pontos críticos"),
        chk("chk-013", "Coletar amostras para laboratório"),
      ],
      notes: [],
      photos: [],
      pendingItems: [],
      createdAt: iso(2026, 7, 20, 8),
      updatedAt: iso(2026, 7, 20, 8),
    },
    {
      id: "dil-002",
      kind: "diligencia",
      title: "Visita domiciliar — família Ferreira",
      caseId: "pro-03",
      responsibleLabel: "Dra. Marina Toledo",
      diligenceKind: "visita_domiciliar",
      status: "em_andamento",
      scheduledAt: iso(2026, 7, 25, 10),
      startedAt: iso(2026, 7, 25, 10, 15),
      address: "Rua do Carmo, 82 — Guarulhos/SP",
      objective: "Avaliar condições de moradia e convivência familiar.",
      location: {
        latitude: -23.4638,
        longitude: -46.5333,
        accuracyMeters: 25,
        capturedAt: iso(2026, 7, 25, 10, 20),
        source: "manual",
      },
      checklistItems: [
        chk("chk-021", "Registrar composição familiar", "concluido"),
        chk("chk-022", "Verificar condições sanitárias"),
        chk("chk-023", "Conversar com vizinhos próximos", "nao_aplicavel"),
      ],
      notes: [
        note(
          "nota-8021",
          "Casa organizada, filhos presentes.",
          "observacao",
          iso(2026, 7, 25, 10, 30),
        ),
      ],
      photos: [photo("pho-021", "fachada.jpg", "ambiente", "Fachada do imóvel")],
      pendingItems: [],
      createdAt: iso(2026, 7, 21, 9),
      updatedAt: iso(2026, 7, 25, 10, 30),
    },
    {
      id: "dil-003",
      kind: "diligencia",
      title: "Inspeção técnica — planta industrial da Vale",
      caseId: "pro-04",
      responsibleLabel: "Dra. Marina Toledo",
      diligenceKind: "inspecao_tecnica",
      status: "concluida",
      scheduledAt: iso(2026, 5, 10, 8),
      startedAt: iso(2026, 5, 10, 8, 15),
      completedAt: iso(2026, 5, 10, 17),
      address: "Rodovia MG-050, km 34 — Contagem/MG",
      objective: "Verificar mitigação de impacto ambiental na planta industrial.",
      location: {
        latitude: -19.9317,
        longitude: -44.0536,
        accuracyMeters: 12,
        capturedAt: iso(2026, 5, 10, 8, 20),
        source: "manual",
      },
      checklistItems: [
        chk("chk-031", "Coletar amostras de solo", "concluido"),
        chk("chk-032", "Registrar poços de monitoramento", "concluido"),
        chk("chk-033", "Fotografar tanques", "concluido"),
      ],
      notes: [
        note(
          "nota-8031",
          "Sem indícios visuais de vazamento.",
          "conclusao_provisoria",
          iso(2026, 5, 10, 17),
        ),
      ],
      photos: [
        photo("pho-031", "tanque-1.jpg", "objeto", "Tanque principal, sem vazamentos aparentes"),
        photo("pho-032", "solo.jpg", "evidencia", "Amostra de solo coletada"),
      ],
      pendingItems: [],
      conclusion: "Diligência concluída, amostras encaminhadas ao laboratório.",
      createdAt: iso(2026, 5, 1, 10),
      updatedAt: iso(2026, 5, 10, 17),
    },
    {
      id: "dil-004",
      kind: "diligencia",
      title: "Coleta de evidências — sede da Construtora Horizonte",
      caseId: "pro-01",
      responsibleLabel: DEFAULT_RESP,
      diligenceKind: "coleta_evidencias",
      status: "com_pendencia",
      scheduledAt: iso(2026, 7, 18, 14),
      startedAt: iso(2026, 7, 18, 14, 10),
      completedAt: iso(2026, 7, 18, 17),
      address: "Av. Paulista, 1000 — São Paulo/SP",
      objective: "Coletar planilhas físicas e digitais relativas ao empreendimento.",
      checklistItems: [
        chk("chk-041", "Solicitar planilhas físicas", "concluido"),
        chk("chk-042", "Copiar arquivos digitais", "pendente"),
      ],
      notes: [
        note(
          "nota-8041",
          "Necessária nova visita para copiar arquivos.",
          "pendencia",
          iso(2026, 7, 18, 17),
        ),
      ],
      photos: [],
      pendingItems: ["Retornar para copiar arquivos digitais"],
      createdAt: iso(2026, 7, 15, 9),
      updatedAt: iso(2026, 7, 18, 17),
    },
    {
      id: "dil-005",
      kind: "diligencia",
      title: "Diligência externa cancelada",
      caseId: "pro-06",
      responsibleLabel: "Dr. Fernando Aguiar",
      diligenceKind: "diligencia_externa",
      status: "cancelada",
      scheduledAt: iso(2026, 7, 22, 9),
      address: "Rua Central, 15 — São Paulo/SP",
      objective: "Reunião externa cancelada por indisponibilidade da parte.",
      checklistItems: [],
      notes: [],
      photos: [],
      pendingItems: [],
      createdAt: iso(2026, 7, 20, 10),
      updatedAt: iso(2026, 7, 21, 18),
    },
    {
      id: "dil-006",
      kind: "diligencia",
      title: "Vistoria complementar pausada",
      caseId: "pro-02",
      responsibleLabel: "Dra. Helena Vasconcelos",
      diligenceKind: "outro",
      status: "pausada",
      scheduledAt: iso(2026, 7, 24, 10),
      startedAt: iso(2026, 7, 24, 10, 10),
      address: "Av. Rio Branco, 1 — Rio de Janeiro/RJ",
      objective: "Complementar coleta de informações contábeis.",
      checklistItems: [chk("chk-061", "Confirmar dados bancários", "pendente")],
      notes: [
        note("nota-8061", "Aguardando retorno do contador.", "observacao", iso(2026, 7, 24, 11)),
      ],
      photos: [],
      pendingItems: [],
      createdAt: iso(2026, 7, 20, 10),
      updatedAt: iso(2026, 7, 24, 11),
    },
  ];
}

// -----------------------------------------------------------------------------
// Estado em memória
// -----------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

let store: ModuleRecord[] = [...seedInterviews(), ...seedDiligences()];

function nowIso(): string {
  // Determinístico para SSR/testes fora do runtime: usa Date.now no browser.
  if (typeof performance !== "undefined") return new Date().toISOString();
  return new Date().toISOString();
}

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeInterviewStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listInterviewRecords(): readonly ModuleRecord[] {
  return store;
}

export function getInterviewRecord(id: string): ModuleRecord | undefined {
  return store.find((r) => r.id === id);
}

/** Reseta ao seed determinístico — usado em testes. */
export function resetInterviewStore(): void {
  resetInterviewIdCounter();
  store = [...seedInterviews(), ...seedDiligences()];
  notify();
}

function upsert(rec: ModuleRecord): void {
  const i = store.findIndex((r) => r.id === rec.id);
  if (i === -1) store = [rec, ...store];
  else {
    const next = store.slice();
    next[i] = rec;
    store = next;
  }
  notify();
}

// -----------------------------------------------------------------------------
// Criação
// -----------------------------------------------------------------------------

export function createInterview(input: {
  title: string;
  caseId?: string;
  expertiseId?: string;
  participantIds: readonly string[];
  responsibleLabel: string;
  templateId: string;
  scheduledAt?: string;
  observation?: string;
}): InterviewRecord {
  const now = nowIso();
  const questions = buildQuestionsFromTemplate(input.templateId);
  const notes: InterviewNote[] = input.observation?.trim()
    ? [
        note(
          makeInterviewId("nota"),
          input.observation.trim(),
          "observacao",
          now,
          input.responsibleLabel || DEFAULT_RESP,
        ),
      ]
    : [];
  const rec: InterviewRecord = {
    id: makeInterviewId("ent"),
    kind: "entrevista",
    title: input.title.trim(),
    caseId: input.caseId,
    expertiseId: input.expertiseId,
    participantIds: [...input.participantIds],
    responsibleLabel: input.responsibleLabel.trim() || DEFAULT_RESP,
    templateId: input.templateId,
    status: input.scheduledAt ? "agendada" : "em_preparacao",
    scheduledAt: input.scheduledAt,
    notes,
    transcriptBlocks: [],
    questions,
    pendingItems: [],
    createdAt: now,
    updatedAt: now,
  };
  upsert(rec);
  return rec;
}

export function createDiligence(input: {
  title: string;
  caseId?: string;
  expertiseId?: string;
  responsibleLabel: string;
  diligenceKind: DiligenceRecord["diligenceKind"];
  scheduledAt?: string;
  address: string;
  objective?: string;
  checklistTexts?: readonly string[];
}): DiligenceRecord {
  const now = nowIso();
  const rec: DiligenceRecord = {
    id: makeInterviewId("dil"),
    kind: "diligencia",
    title: input.title.trim(),
    caseId: input.caseId,
    expertiseId: input.expertiseId,
    responsibleLabel: input.responsibleLabel.trim() || DEFAULT_RESP,
    diligenceKind: input.diligenceKind,
    status: input.scheduledAt ? "agendada" : "em_preparacao",
    scheduledAt: input.scheduledAt,
    address: input.address.trim(),
    objective: input.objective?.trim(),
    checklistItems: (input.checklistTexts ?? [])
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => ({ id: makeInterviewId("chk"), text: t, state: "pendente" as const })),
    notes: [],
    photos: [],
    pendingItems: [],
    createdAt: now,
    updatedAt: now,
  };
  upsert(rec);
  return rec;
}

// -----------------------------------------------------------------------------
// Mutações — Entrevista
// -----------------------------------------------------------------------------

function bumpInterview(rec: InterviewRecord, patch: Partial<InterviewRecord>): InterviewRecord {
  const next: InterviewRecord = { ...rec, ...patch, updatedAt: nowIso() };
  upsert(next);
  return next;
}

function requireInterview(id: string): InterviewRecord {
  const rec = getInterviewRecord(id);
  if (!rec || rec.kind !== "entrevista") throw new Error("Entrevista não encontrada");
  return rec;
}

export function startInterview(id: string): InterviewRecord {
  const rec = requireInterview(id);
  return bumpInterview(rec, {
    status: "em_andamento",
    startedAt: rec.startedAt ?? nowIso(),
  });
}

export function pauseInterview(id: string): InterviewRecord {
  return bumpInterview(requireInterview(id), { status: "pausada" });
}

export function resumeInterview(id: string): InterviewRecord {
  return bumpInterview(requireInterview(id), { status: "em_andamento" });
}

export function cancelInterview(id: string): InterviewRecord {
  return bumpInterview(requireInterview(id), { status: "cancelada" });
}

export function addInterviewNote(
  id: string,
  input: { text: string; kind: InterviewNoteKind; authorLabel?: string; timestampMs?: number },
): InterviewRecord {
  const rec = requireInterview(id);
  const text = input.text.trim();
  if (!text) throw new Error("Nota vazia");
  const n: InterviewNote = {
    id: makeInterviewId("nota"),
    text,
    kind: input.kind,
    timestampMs: input.timestampMs,
    authorLabel: input.authorLabel?.trim() || rec.responsibleLabel,
    createdAt: nowIso(),
  };
  return bumpInterview(rec, { notes: [...rec.notes, n] });
}

export function addTranscriptBlock(
  id: string,
  input: { timeLabel: string; personLabel: string; text: string; linkedQuestionId?: string },
): InterviewRecord {
  const rec = requireInterview(id);
  const text = input.text.trim();
  if (!text) throw new Error("Bloco vazio");
  const b: TranscriptBlock = {
    id: makeInterviewId("trs"),
    timeLabel: input.timeLabel.trim(),
    personLabel: input.personLabel.trim() || "—",
    text,
    highlighted: false,
    linkedQuestionId: input.linkedQuestionId,
    consolidated: false,
  };
  return bumpInterview(rec, { transcriptBlocks: [...rec.transcriptBlocks, b] });
}

export function updateTranscriptBlock(
  id: string,
  blockId: string,
  patch: Partial<
    Pick<
      TranscriptBlock,
      "timeLabel" | "personLabel" | "text" | "highlighted" | "linkedQuestionId" | "consolidated"
    >
  >,
): InterviewRecord {
  const rec = requireInterview(id);
  const next = rec.transcriptBlocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
  return bumpInterview(rec, { transcriptBlocks: next });
}

export function removeTranscriptBlock(id: string, blockId: string): InterviewRecord {
  const rec = requireInterview(id);
  const target = rec.transcriptBlocks.find((b) => b.id === blockId);
  if (target?.consolidated) throw new Error("Bloco consolidado não pode ser removido");
  return bumpInterview(rec, {
    transcriptBlocks: rec.transcriptBlocks.filter((b) => b.id !== blockId),
  });
}

export function answerQuestion(
  id: string,
  questionId: string,
  patch: Partial<
    Pick<InterviewQuestionAnswer, "status" | "answerText" | "observation" | "justification">
  >,
): InterviewRecord {
  const rec = requireInterview(id);
  const now = nowIso();
  const next = rec.questions.map((qa) =>
    qa.id === questionId ? { ...qa, ...patch, updatedAt: now } : qa,
  );
  return bumpInterview(rec, { questions: next });
}

export function setInterviewAudioSummary(
  id: string,
  audio: InterviewRecord["audioSession"],
): InterviewRecord {
  return bumpInterview(requireInterview(id), { audioSession: audio });
}

export type CompletionValidation = Readonly<{
  ok: boolean;
  hasPendingRequired: boolean;
  pending: readonly string[];
  warnings: readonly string[];
}>;

export function validateInterviewCompletion(
  rec: InterviewRecord,
  ctx: {
    audioActive?: boolean;
    hasUnsavedNoteDraft?: boolean;
    hasUnconsolidatedTranscript?: boolean;
  } = {},
): CompletionValidation {
  const pending: string[] = [];
  const warnings: string[] = [];
  if (!rec.title.trim()) pending.push("Informe o título.");
  if (rec.participantIds.length === 0) pending.push("Adicione participantes.");
  if (!rec.templateId) pending.push("Selecione um roteiro.");
  const requiredMissing = rec.questions.filter((q) => q.required && q.status === "pendente");
  if (requiredMissing.length > 0) {
    for (const q of requiredMissing) pending.push(`Pergunta obrigatória: ${q.questionText}`);
  }
  for (const p of rec.pendingItems) pending.push(p);
  if (ctx.audioActive) warnings.push("Encerre a gravação de áudio antes de concluir.");
  if (ctx.hasUnsavedNoteDraft) warnings.push("Existe uma nota não salva.");
  if (ctx.hasUnconsolidatedTranscript)
    warnings.push("Existem blocos de transcrição sem consolidar.");
  const hasPendingRequired = requiredMissing.length > 0;
  return {
    ok: pending.length === 0 && warnings.length === 0,
    hasPendingRequired,
    pending,
    warnings,
  };
}

export type CompletionMode = "concluir" | "concluir_com_pendencia";

export function completeInterview(
  id: string,
  mode: CompletionMode,
  conclusion?: string,
): InterviewRecord {
  const rec = requireInterview(id);
  return bumpInterview(rec, {
    status: mode === "concluir" ? "concluida" : "com_pendencia",
    completedAt: nowIso(),
    conclusion: conclusion?.trim() ?? rec.conclusion,
  });
}

// -----------------------------------------------------------------------------
// Mutações — Diligência
// -----------------------------------------------------------------------------

function requireDiligence(id: string): DiligenceRecord {
  const rec = getInterviewRecord(id);
  if (!rec || rec.kind !== "diligencia") throw new Error("Diligência não encontrada");
  return rec;
}

function bumpDiligence(rec: DiligenceRecord, patch: Partial<DiligenceRecord>): DiligenceRecord {
  const next: DiligenceRecord = { ...rec, ...patch, updatedAt: nowIso() };
  upsert(next);
  return next;
}

export function startDiligence(id: string): DiligenceRecord {
  const rec = requireDiligence(id);
  return bumpDiligence(rec, {
    status: "em_andamento",
    startedAt: rec.startedAt ?? nowIso(),
  });
}

export function pauseDiligence(id: string): DiligenceRecord {
  return bumpDiligence(requireDiligence(id), { status: "pausada" });
}

export function resumeDiligence(id: string): DiligenceRecord {
  return bumpDiligence(requireDiligence(id), { status: "em_andamento" });
}

export function cancelDiligence(id: string): DiligenceRecord {
  return bumpDiligence(requireDiligence(id), { status: "cancelada" });
}

export function setDiligenceLocation(
  id: string,
  loc: DiligenceRecord["location"] | null,
): DiligenceRecord {
  return bumpDiligence(requireDiligence(id), { location: loc ?? undefined });
}

export function setChecklistItemState(
  id: string,
  itemId: string,
  state: DiligenceChecklistItem["state"],
  observation?: string,
): DiligenceRecord {
  const rec = requireDiligence(id);
  const next = rec.checklistItems.map((it) =>
    it.id === itemId ? { ...it, state, observation: observation ?? it.observation } : it,
  );
  return bumpDiligence(rec, { checklistItems: next });
}

export function addChecklistItem(id: string, text: string): DiligenceRecord {
  const rec = requireDiligence(id);
  const clean = text.trim();
  if (!clean) throw new Error("Item vazio");
  return bumpDiligence(rec, {
    checklistItems: [
      ...rec.checklistItems,
      { id: makeInterviewId("chk"), text: clean, state: "pendente" as const },
    ],
  });
}

export function addDiligenceNote(
  id: string,
  input: { text: string; kind: InterviewNoteKind; authorLabel?: string },
): DiligenceRecord {
  const rec = requireDiligence(id);
  const text = input.text.trim();
  if (!text) throw new Error("Nota vazia");
  const n: InterviewNote = {
    id: makeInterviewId("nota"),
    text,
    kind: input.kind,
    authorLabel: input.authorLabel?.trim() || rec.responsibleLabel,
    createdAt: nowIso(),
  };
  return bumpDiligence(rec, { notes: [...rec.notes, n] });
}

export function addDiligencePendingItem(id: string, text: string): DiligenceRecord {
  const rec = requireDiligence(id);
  const clean = text.trim();
  if (!clean) throw new Error("Pendência vazia");
  return bumpDiligence(rec, { pendingItems: [...rec.pendingItems, clean] });
}

export function addDiligencePhoto(
  id: string,
  input: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    caption?: string;
    category: DiligencePhotoMock["category"];
    objectUrl?: string;
  },
): DiligenceRecord {
  const rec = requireDiligence(id);
  const p: DiligencePhotoMock = {
    id: makeInterviewId("pho"),
    name: input.name,
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType,
    caption: (input.caption ?? "").trim(),
    capturedAt: nowIso(),
    category: input.category,
    relevant: false,
    objectUrl: input.objectUrl,
  };
  return bumpDiligence(rec, { photos: [...rec.photos, p] });
}

export function updateDiligencePhoto(
  id: string,
  photoId: string,
  patch: Partial<Pick<DiligencePhotoMock, "caption" | "category" | "relevant">>,
): DiligenceRecord {
  const rec = requireDiligence(id);
  const next = rec.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p));
  return bumpDiligence(rec, { photos: next });
}

export function removeDiligencePhoto(id: string, photoId: string): DiligenceRecord {
  const rec = requireDiligence(id);
  const target = rec.photos.find((p) => p.id === photoId);
  if (target?.objectUrl && typeof URL !== "undefined" && URL.revokeObjectURL) {
    try {
      URL.revokeObjectURL(target.objectUrl);
    } catch {
      /* noop */
    }
  }
  return bumpDiligence(rec, { photos: rec.photos.filter((p) => p.id !== photoId) });
}

export function movePhoto(id: string, photoId: string, direction: -1 | 1): DiligenceRecord {
  const rec = requireDiligence(id);
  const idx = rec.photos.findIndex((p) => p.id === photoId);
  if (idx === -1) return rec;
  const target = idx + direction;
  if (target < 0 || target >= rec.photos.length) return rec;
  const arr = rec.photos.slice();
  const [item] = arr.splice(idx, 1);
  arr.splice(target, 0, item!);
  return bumpDiligence(rec, { photos: arr });
}

export function validateDiligenceCompletion(
  rec: DiligenceRecord,
  ctx: { hasUnsavedNoteDraft?: boolean; hasUnsavedPhoto?: boolean } = {},
): CompletionValidation {
  const pending: string[] = [];
  const warnings: string[] = [];
  if (!rec.objective || !rec.objective.trim()) pending.push("Informe o objetivo.");
  if (!rec.address || !rec.address.trim()) pending.push("Informe o endereço.");
  const openChecklist = rec.checklistItems.filter((c) => c.state === "pendente");
  if (openChecklist.length > 0) {
    pending.push(`Existem ${openChecklist.length} item(ns) do checklist pendente(s).`);
  }
  for (const p of rec.pendingItems) pending.push(p);
  if (ctx.hasUnsavedNoteDraft) warnings.push("Existe uma nota não salva.");
  if (ctx.hasUnsavedPhoto) warnings.push("Existe uma foto não confirmada.");
  return {
    ok: pending.length === 0 && warnings.length === 0,
    hasPendingRequired: false,
    pending,
    warnings,
  };
}

export function completeDiligence(
  id: string,
  mode: CompletionMode,
  conclusion?: string,
): DiligenceRecord {
  const rec = requireDiligence(id);
  return bumpDiligence(rec, {
    status: mode === "concluir" ? "concluida" : "com_pendencia",
    completedAt: nowIso(),
    conclusion: conclusion?.trim() ?? rec.conclusion,
  });
}

// -----------------------------------------------------------------------------
// Helpers utilitários
// -----------------------------------------------------------------------------

export function listAvailableParticipants(): { id: string; label: string }[] {
  return clientes.map((c) => ({ id: c.id, label: c.nome }));
}

export function formatDurationBetween(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return "—";
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}min`;
  return `${m}min`;
}

export function buildInterviewSummaryText(rec: InterviewRecord): string {
  const lines: string[] = [];
  lines.push(`# ${rec.title}`);
  lines.push(`Situação: ${rec.status}`);
  lines.push(`Responsável: ${rec.responsibleLabel}`);
  lines.push(`Participantes: ${rec.participantIds.join(", ") || "—"}`);
  lines.push(`Duração: ${formatDurationBetween(rec.startedAt, rec.completedAt)}`);
  lines.push(`Roteiro: ${rec.templateId}`);
  const answered = rec.questions.filter((q) => q.status === "respondida").length;
  lines.push(`Perguntas respondidas: ${answered}/${rec.questions.length}`);
  if (rec.notes.length > 0) {
    lines.push("");
    lines.push("Notas:");
    for (const n of rec.notes) lines.push(`- [${n.kind}] ${n.text}`);
  }
  if (rec.transcriptBlocks.length > 0) {
    lines.push("");
    lines.push("Transcrição manual:");
    for (const b of rec.transcriptBlocks) lines.push(`${b.timeLabel} ${b.personLabel}: ${b.text}`);
  }
  if (rec.pendingItems.length > 0) {
    lines.push("");
    lines.push("Pendências:");
    for (const p of rec.pendingItems) lines.push(`- ${p}`);
  }
  if (rec.conclusion) {
    lines.push("");
    lines.push(`Conclusão: ${rec.conclusion}`);
  }
  return lines.join("\n");
}

export function buildDiligenceSummaryText(rec: DiligenceRecord): string {
  const lines: string[] = [];
  lines.push(`# ${rec.title}`);
  lines.push(`Situação: ${rec.status}`);
  lines.push(`Data: ${rec.scheduledAt ?? "—"}`);
  lines.push(`Responsável: ${rec.responsibleLabel}`);
  lines.push(`Processo: ${rec.caseId ?? "—"}`);
  lines.push(`Endereço: ${rec.address ?? "—"}`);
  lines.push(`Duração: ${formatDurationBetween(rec.startedAt, rec.completedAt)}`);
  if (rec.location) {
    lines.push(`Localização: ${rec.location.latitude}, ${rec.location.longitude}`);
  }
  if (rec.checklistItems.length > 0) {
    lines.push("");
    lines.push("Checklist:");
    for (const it of rec.checklistItems) lines.push(`- [${it.state}] ${it.text}`);
  }
  if (rec.photos.length > 0) {
    lines.push("");
    lines.push("Fotos:");
    for (const p of rec.photos) lines.push(`- (${p.category}) ${p.name}: ${p.caption || "—"}`);
  }
  if (rec.notes.length > 0) {
    lines.push("");
    lines.push("Notas:");
    for (const n of rec.notes) lines.push(`- [${n.kind}] ${n.text}`);
  }
  if (rec.pendingItems.length > 0) {
    lines.push("");
    lines.push("Pendências:");
    for (const p of rec.pendingItems) lines.push(`- ${p}`);
  }
  if (rec.conclusion) {
    lines.push("");
    lines.push(`Conclusão: ${rec.conclusion}`);
  }
  return lines.join("\n");
}
