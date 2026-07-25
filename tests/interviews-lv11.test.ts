/**
 * LV-11 — Entrevistas e diligências (mock)
 *
 * Auditoria estática de rota/menu, seed determinístico, helpers puros,
 * validações e store mock.
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ACCEPTED_PHOTO_MIME_TYPES,
  CHECKLIST_STATES,
  DILIGENCE_KINDS,
  INTERVIEW_STATUSES,
  MAX_PHOTO_SIZE_BYTES,
  NOTE_KINDS,
  PHOTO_CATEGORIES,
  type DiligenceRecord,
  type InterviewRecord,
  type ModuleRecord,
} from "../src/features/interviews/interview-types";
import {
  CHECKLIST_STATE_LABEL,
  DILIGENCE_KIND_LABEL,
  INTERVIEW_STATUS_LABEL,
  MODULE_KIND_LABEL,
  NOTE_KIND_LABEL,
  PHOTO_CATEGORY_LABEL,
  QUESTION_STATUS_LABEL,
} from "../src/features/interviews/interview-labels";
import {
  applyInterviewFilters,
  countByStatus,
  EMPTY_INTERVIEW_FILTERS,
  getCaseNumberLabel,
  hasActiveInterviewFilters,
  isDiligence,
  isInterview,
  isValidCoordinate,
  matchesSearchRecord,
  normalizeSearch,
  validateDiligenceForm,
  validateInterviewForm,
} from "../src/features/interviews/interview-filters";
import {
  buildQuestionsFromTemplate,
  countTemplateQuestions,
  getTemplate,
  INTERVIEW_TEMPLATES,
} from "../src/features/interviews/interview-templates";
import {
  addChecklistItem,
  addDiligenceNote,
  addDiligencePendingItem,
  addDiligencePhoto,
  addInterviewNote,
  addTranscriptBlock,
  answerQuestion,
  buildDiligenceSummaryText,
  buildInterviewSummaryText,
  cancelDiligence,
  cancelInterview,
  completeDiligence,
  completeInterview,
  createDiligence,
  createInterview,
  formatDurationBetween,
  getInterviewRecord,
  listAvailableParticipants,
  listInterviewRecords,
  makeInterviewId,
  movePhoto,
  pauseInterview,
  removeDiligencePhoto,
  removeTranscriptBlock,
  resetInterviewIdCounter,
  resetInterviewStore,
  resumeInterview,
  setChecklistItemState,
  setDiligenceLocation,
  setInterviewAudioSummary,
  startDiligence,
  startInterview,
  subscribeInterviewStore,
  updateDiligencePhoto,
  updateTranscriptBlock,
  validateDiligenceCompletion,
  validateInterviewCompletion,
} from "../src/features/interviews/interview-mock-store";
import {
  isAcceptedPhotoMime,
  isPhotoSizeAcceptable,
} from "../src/features/interviews/MediaMockPanel";

// -----------------------------------------------------------------------------
// 1. Rota e menu — auditoria estática
// -----------------------------------------------------------------------------
describe("LV-11 · rota e menu", () => {
  const routeSrc = readFileSync(resolve("src/routes/app.entrevistas.tsx"), "utf8");
  const navSrc = readFileSync(resolve("src/lib/app-nav.ts"), "utf8");

  test("rota /app/entrevistas não importa mais UnderConstruction", () => {
    expect(routeSrc).not.toMatch(/UnderConstruction/);
  });
  test("rota importa a página funcional", () => {
    expect(routeSrc).toMatch(/InterviewsDiligencesPage/);
  });
  test("rota mantém laboratório LV-10 em ?demo=audio-spike", () => {
    expect(routeSrc).toMatch(/audio-spike/);
    expect(routeSrc).toMatch(/AudioSpikeLab/);
  });
  test("rota não usa mais CONSTRUCTION_MODULES para entrevistas", () => {
    expect(routeSrc).not.toMatch(/CONSTRUCTION_MODULES\["\/app\/entrevistas"\]/);
  });
  test("menu não marca entrevistas como construction", () => {
    // Bloco específico da entrada de Entrevistas não deve ter construction: true
    const line = navSrc.split("\n").find((l) => l.includes('label: "Entrevistas e diligências"'));
    expect(line).toBeDefined();
    expect(line!).not.toMatch(/construction:\s*true/);
  });
  test("CONSTRUCTION_MODULES não contém mais /app/entrevistas", () => {
    expect(navSrc).not.toMatch(/"\/app\/entrevistas"\s*:\s*{/);
  });
  test("routeTree.gen.ts continua listando a rota existente", () => {
    const gen = readFileSync(resolve("src/routeTree.gen.ts"), "utf8");
    expect(gen).toMatch(/app\/entrevistas/);
  });
});

// -----------------------------------------------------------------------------
// 2. Seed determinístico
// -----------------------------------------------------------------------------
describe("LV-11 · seed determinístico", () => {
  beforeEach(() => resetInterviewStore());

  test("seed contém 8 entrevistas", () => {
    const list = listInterviewRecords();
    const ents = list.filter((r) => r.kind === "entrevista");
    expect(ents.length).toBe(8);
  });
  test("seed contém 6 diligências", () => {
    const list = listInterviewRecords();
    const dils = list.filter((r) => r.kind === "diligencia");
    expect(dils.length).toBe(6);
  });
  test("seed contém situações variadas", () => {
    const statuses = new Set(listInterviewRecords().map((r) => r.status));
    expect(statuses.has("agendada")).toBe(true);
    expect(statuses.has("em_preparacao")).toBe(true);
    expect(statuses.has("em_andamento")).toBe(true);
    expect(statuses.has("pausada")).toBe(true);
    expect(statuses.has("concluida")).toBe(true);
    expect(statuses.has("cancelada")).toBe(true);
    expect(statuses.has("com_pendencia")).toBe(true);
  });
  test("seed inclui entrevistas com notas", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "entrevista" && r.notes.length > 0)).toBe(true);
  });
  test("seed inclui entrevistas com transcrição manual", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "entrevista" && r.transcriptBlocks.length > 0)).toBe(true);
  });
  test("seed inclui entrevistas com perguntas respondidas", () => {
    const list = listInterviewRecords();
    expect(
      list.some(
        (r) => r.kind === "entrevista" && r.questions.some((q) => q.status === "respondida"),
      ),
    ).toBe(true);
  });
  test("seed inclui roteiro personalizado (sem perguntas)", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "entrevista" && r.questions.length === 0)).toBe(true);
  });
  test("seed inclui entrevistas com e sem roteiro", () => {
    const list = listInterviewRecords();
    const withQ = list.filter((r) => r.kind === "entrevista" && r.questions.length > 0);
    const withoutQ = list.filter((r) => r.kind === "entrevista" && r.questions.length === 0);
    expect(withQ.length).toBeGreaterThan(0);
    expect(withoutQ.length).toBeGreaterThan(0);
  });
  test("seed inclui diligências com endereço", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "diligencia" && r.address)).toBe(true);
  });
  test("seed inclui diligências com checklist", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "diligencia" && r.checklistItems.length > 0)).toBe(true);
  });
  test("seed inclui diligências com fotos mock", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "diligencia" && r.photos.length > 0)).toBe(true);
  });
  test("seed inclui diligências com localização", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.kind === "diligencia" && r.location)).toBe(true);
  });
  test("seed vincula registros a processos e perícias diferentes", () => {
    const list = listInterviewRecords();
    const cases = new Set(list.map((r) => r.caseId).filter(Boolean));
    expect(cases.size).toBeGreaterThanOrEqual(3);
  });
  test("seed apresenta nomes longos", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.title.length > 80)).toBe(true);
  });
  test("seed apresenta nomes curtos", () => {
    const list = listInterviewRecords();
    expect(list.some((r) => r.title.length < 40)).toBe(true);
  });
  test("seed não usa Math.random / Date.now / crypto.randomUUID no arquivo", () => {
    const src = readFileSync(resolve("src/features/interviews/interview-mock-store.ts"), "utf8");
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).not.toMatch(/crypto\.randomUUID/);
  });
  test("dois resets sucessivos produzem o mesmo estado (determinismo)", () => {
    resetInterviewStore();
    const a = listInterviewRecords()
      .map((r) => r.id)
      .join(",");
    resetInterviewStore();
    const b = listInterviewRecords()
      .map((r) => r.id)
      .join(",");
    expect(a).toBe(b);
  });
});

// -----------------------------------------------------------------------------
// 3. Roteiros predefinidos
// -----------------------------------------------------------------------------
describe("LV-11 · roteiros", () => {
  test("existem no mínimo 6 roteiros predefinidos", () => {
    expect(INTERVIEW_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });
  test("cada roteiro conhecido pode ser encontrado por id", () => {
    for (const t of INTERVIEW_TEMPLATES) {
      expect(getTemplate(t.id)?.id).toBe(t.id);
    }
  });
  test("roteiro personalizado não tem perguntas", () => {
    expect(countTemplateQuestions("roteiro-personalizado")).toBe(0);
  });
  test("roteiros não personalizados têm ao menos 3 perguntas", () => {
    for (const t of INTERVIEW_TEMPLATES) {
      if (t.id === "roteiro-personalizado") continue;
      expect(countTemplateQuestions(t.id)).toBeGreaterThanOrEqual(3);
    }
  });
  test("perguntas geradas são pendentes por padrão", () => {
    const q = buildQuestionsFromTemplate("roteiro-inicial");
    expect(q.every((x) => x.status === "pendente")).toBe(true);
  });
  test("perguntas obrigatórias estão presentes", () => {
    const q = buildQuestionsFromTemplate("roteiro-inicial");
    expect(q.some((x) => x.required)).toBe(true);
  });
  test("id inexistente retorna array vazio", () => {
    expect(buildQuestionsFromTemplate("nao-existe")).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// 4. Rótulos completos
// -----------------------------------------------------------------------------
describe("LV-11 · rótulos", () => {
  test("todo status tem rótulo", () => {
    for (const s of INTERVIEW_STATUSES) expect(INTERVIEW_STATUS_LABEL[s]).toBeTruthy();
  });
  test("todo tipo de nota tem rótulo", () => {
    for (const k of NOTE_KINDS) expect(NOTE_KIND_LABEL[k]).toBeTruthy();
  });
  test("todo tipo de diligência tem rótulo", () => {
    for (const k of DILIGENCE_KINDS) expect(DILIGENCE_KIND_LABEL[k]).toBeTruthy();
  });
  test("todo estado de checklist tem rótulo", () => {
    for (const s of CHECKLIST_STATES) expect(CHECKLIST_STATE_LABEL[s]).toBeTruthy();
  });
  test("toda categoria de foto tem rótulo", () => {
    for (const c of PHOTO_CATEGORIES) expect(PHOTO_CATEGORY_LABEL[c]).toBeTruthy();
  });
  test("QUESTION_STATUS_LABEL cobre todos status", () => {
    expect(QUESTION_STATUS_LABEL.pendente).toBeTruthy();
    expect(QUESTION_STATUS_LABEL.respondida).toBeTruthy();
    expect(QUESTION_STATUS_LABEL.ignorada).toBeTruthy();
  });
  test("MODULE_KIND_LABEL cobre entrevista e diligência", () => {
    expect(MODULE_KIND_LABEL.entrevista).toBe("Entrevista");
    expect(MODULE_KIND_LABEL.diligencia).toBe("Diligência");
  });
});

// -----------------------------------------------------------------------------
// 5. Pesquisa e filtros
// -----------------------------------------------------------------------------
describe("LV-11 · pesquisa e filtros", () => {
  beforeEach(() => resetInterviewStore());

  test("normalizeSearch remove acentos e trata case", () => {
    expect(normalizeSearch(" DILIGÊNCIA ")).toBe("diligencia");
    expect(normalizeSearch("ÁÉÍÓÚçÇ")).toBe(
      "aeiouçc"
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );
  });
  test("busca insensível a acentos localiza registros", () => {
    const list = listInterviewRecords();
    const found = list.filter((r) => matchesSearchRecord(r, "diligencia"));
    expect(found.length).toBeGreaterThan(0);
  });
  test("busca por termo inexistente retorna vazio", () => {
    const list = listInterviewRecords();
    const found = list.filter((r) => matchesSearchRecord(r, "___zzz___"));
    expect(found.length).toBe(0);
  });
  test("busca vazia mantém todos", () => {
    const list = listInterviewRecords();
    expect(list.every((r) => matchesSearchRecord(r, ""))).toBe(true);
  });
  test("filtros vazios são inativos", () => {
    expect(hasActiveInterviewFilters(EMPTY_INTERVIEW_FILTERS)).toBe(false);
  });
  test("filtros com query são ativos", () => {
    expect(hasActiveInterviewFilters({ ...EMPTY_INTERVIEW_FILTERS, query: "x" })).toBe(true);
  });
  test("aba entrevistas filtra por tipo", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, { ...EMPTY_INTERVIEW_FILTERS, tab: "entrevistas" });
    expect(out.every((r) => r.kind === "entrevista")).toBe(true);
  });
  test("aba diligências filtra por tipo", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, { ...EMPTY_INTERVIEW_FILTERS, tab: "diligencias" });
    expect(out.every((r) => r.kind === "diligencia")).toBe(true);
  });
  test("filtro por status", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, { ...EMPTY_INTERVIEW_FILTERS, status: "concluida" });
    expect(out.every((r) => r.status === "concluida")).toBe(true);
  });
  test("filtro por processo", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, { ...EMPTY_INTERVIEW_FILTERS, caseId: "pro-01" });
    expect(out.every((r) => r.caseId === "pro-01")).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
  test("filtro por responsável", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, {
      ...EMPTY_INTERVIEW_FILTERS,
      responsibleLabel: "Dra. Ana Beatriz Salgado",
    });
    expect(out.every((r) => r.responsibleLabel === "Dra. Ana Beatriz Salgado")).toBe(true);
  });
  test("filtro por período restringe registros", () => {
    const list = listInterviewRecords();
    const out = applyInterviewFilters(list, {
      ...EMPTY_INTERVIEW_FILTERS,
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
    });
    expect(out.every((r) => (r.scheduledAt ?? "") >= "2026-08-01")).toBe(true);
  });
  test("countByStatus retorna contadores coerentes", () => {
    const list = listInterviewRecords();
    const c = countByStatus(list);
    expect(c.agendadas).toBeGreaterThanOrEqual(1);
    expect(c.concluidas).toBeGreaterThanOrEqual(1);
    expect(c.comPendencia).toBeGreaterThanOrEqual(1);
  });
  test("getCaseNumberLabel resolve número do processo", () => {
    expect(getCaseNumberLabel("pro-01")).toMatch(/\d/);
    expect(getCaseNumberLabel(undefined)).toBe("");
    expect(getCaseNumberLabel("nao-existe")).toBe("");
  });
  test("isInterview / isDiligence", () => {
    const list = listInterviewRecords();
    for (const r of list) {
      if (r.kind === "entrevista") expect(isInterview(r)).toBe(true);
      else expect(isDiligence(r)).toBe(true);
    }
  });
  test("isValidCoordinate rejeita limites fora do range", () => {
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// 6. Validação de formulários
// -----------------------------------------------------------------------------
describe("LV-11 · formulários", () => {
  test("entrevista exige título", () => {
    const errs = validateInterviewForm({
      title: "",
      responsibleLabel: "X",
      participantIds: ["p1"],
      templateId: "roteiro-inicial",
    });
    expect(errs.title).toBeTruthy();
  });
  test("entrevista exige responsável", () => {
    const errs = validateInterviewForm({
      title: "t",
      responsibleLabel: "",
      participantIds: ["p1"],
      templateId: "roteiro-inicial",
    });
    expect(errs.responsibleLabel).toBeTruthy();
  });
  test("entrevista exige participantes", () => {
    const errs = validateInterviewForm({
      title: "t",
      responsibleLabel: "r",
      participantIds: [],
      templateId: "roteiro-inicial",
    });
    expect(errs.participantIds).toBeTruthy();
  });
  test("entrevista exige roteiro", () => {
    const errs = validateInterviewForm({
      title: "t",
      responsibleLabel: "r",
      participantIds: ["p"],
      templateId: "",
    });
    expect(errs.templateId).toBeTruthy();
  });
  test("entrevista válida não gera erros", () => {
    const errs = validateInterviewForm({
      title: "OK",
      responsibleLabel: "r",
      participantIds: ["p"],
      templateId: "roteiro-inicial",
    });
    expect(Object.keys(errs).length).toBe(0);
  });
  test("entrevista rejeita título absurdamente longo", () => {
    const errs = validateInterviewForm({
      title: "x".repeat(200),
      responsibleLabel: "r",
      participantIds: ["p"],
      templateId: "t",
    });
    expect(errs.title).toBeTruthy();
  });
  test("diligência exige endereço", () => {
    const errs = validateDiligenceForm({ title: "T", responsibleLabel: "r", address: "" });
    expect(errs.address).toBeTruthy();
  });
  test("diligência válida não gera erros", () => {
    const errs = validateDiligenceForm({ title: "T", responsibleLabel: "r", address: "endereço" });
    expect(Object.keys(errs).length).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// 7. Store — criação e ciclo de vida
// -----------------------------------------------------------------------------
describe("LV-11 · criação de entrevista", () => {
  beforeEach(() => resetInterviewStore());

  test("criar entrevista adiciona à lista", () => {
    const before = listInterviewRecords().length;
    createInterview({
      title: "Nova",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    expect(listInterviewRecords().length).toBe(before + 1);
  });
  test("entrevista sem data inicial fica em preparação", () => {
    const rec = createInterview({
      title: "Sem data",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    expect(rec.status).toBe("em_preparacao");
  });
  test("entrevista com data agendada", () => {
    const rec = createInterview({
      title: "Com data",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
      scheduledAt: new Date().toISOString(),
    });
    expect(rec.status).toBe("agendada");
  });
  test("observação de preparação vira nota inicial", () => {
    const rec = createInterview({
      title: "Obs",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
      observation: "Preparar planilha",
    });
    expect(rec.notes.length).toBe(1);
    expect(rec.notes[0]!.kind).toBe("observacao");
  });
  test("iniciar entrevista atualiza status e startedAt", () => {
    const rec = createInterview({
      title: "X",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    const started = startInterview(rec.id);
    expect(started.status).toBe("em_andamento");
    expect(started.startedAt).toBeTruthy();
  });
  test("pausar entrevista", () => {
    const rec = createInterview({
      title: "P",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    startInterview(rec.id);
    expect(pauseInterview(rec.id).status).toBe("pausada");
    expect(resumeInterview(rec.id).status).toBe("em_andamento");
  });
  test("cancelar entrevista", () => {
    const rec = createInterview({
      title: "C",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    expect(cancelInterview(rec.id).status).toBe("cancelada");
  });
});

describe("LV-11 · notas e transcrição", () => {
  beforeEach(() => resetInterviewStore());
  const createEnt = () =>
    createInterview({
      title: "E",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });

  test("adicionar nota preserva notas anteriores", () => {
    const rec = createEnt();
    addInterviewNote(rec.id, { text: "n1", kind: "observacao" });
    const after = addInterviewNote(rec.id, { text: "n2", kind: "ponto_importante" });
    expect(after.notes.length).toBe(2);
    expect(after.notes[0]!.text).toBe("n1");
  });
  test("nota vazia lança erro", () => {
    const rec = createEnt();
    expect(() => addInterviewNote(rec.id, { text: "   ", kind: "observacao" })).toThrow();
  });
  test("adicionar bloco de transcrição não consolidado", () => {
    const rec = createEnt();
    const after = addTranscriptBlock(rec.id, {
      timeLabel: "10:00",
      personLabel: "P",
      text: "olá",
    });
    expect(after.transcriptBlocks.length).toBe(1);
    expect(after.transcriptBlocks[0]!.consolidated).toBe(false);
  });
  test("atualizar destaque do bloco", () => {
    const rec = createEnt();
    const r = addTranscriptBlock(rec.id, { timeLabel: "1", personLabel: "P", text: "t" });
    const bid = r.transcriptBlocks[0]!.id;
    const upd = updateTranscriptBlock(rec.id, bid, { highlighted: true });
    expect(upd.transcriptBlocks[0]!.highlighted).toBe(true);
  });
  test("remover bloco não consolidado", () => {
    const rec = createEnt();
    const r = addTranscriptBlock(rec.id, { timeLabel: "1", personLabel: "P", text: "t" });
    const bid = r.transcriptBlocks[0]!.id;
    const upd = removeTranscriptBlock(rec.id, bid);
    expect(upd.transcriptBlocks.length).toBe(0);
  });
  test("remover bloco consolidado lança erro", () => {
    const rec = createEnt();
    const r = addTranscriptBlock(rec.id, { timeLabel: "1", personLabel: "P", text: "t" });
    const bid = r.transcriptBlocks[0]!.id;
    updateTranscriptBlock(rec.id, bid, { consolidated: true });
    expect(() => removeTranscriptBlock(rec.id, bid)).toThrow();
  });
});

describe("LV-11 · perguntas e conclusão de entrevista", () => {
  beforeEach(() => resetInterviewStore());
  const createEnt = () =>
    createInterview({
      title: "E",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });

  test("responder pergunta atualiza status", () => {
    const rec = createEnt();
    const qid = rec.questions[0]!.id;
    const upd = answerQuestion(rec.id, qid, { status: "respondida", answerText: "sim" });
    const q = upd.questions.find((x) => x.id === qid);
    expect(q?.status).toBe("respondida");
    expect(q?.answerText).toBe("sim");
  });
  test("validação bloqueia conclusão com obrigatórias pendentes", () => {
    const rec = createEnt();
    const v = validateInterviewCompletion(rec);
    expect(v.ok).toBe(false);
    expect(v.hasPendingRequired).toBe(true);
  });
  test("validação alerta gravação ativa", () => {
    const rec = createEnt();
    const v = validateInterviewCompletion(rec, { audioActive: true });
    expect(v.warnings.some((w) => w.includes("Encerre a gravação"))).toBe(true);
  });
  test("validação alerta nota não salva", () => {
    const rec = createEnt();
    const v = validateInterviewCompletion(rec, { hasUnsavedNoteDraft: true });
    expect(v.warnings.some((w) => w.includes("nota não salva"))).toBe(true);
  });
  test("concluir com pendência muda status", () => {
    const rec = createEnt();
    const done = completeInterview(rec.id, "concluir_com_pendencia", "Parcial");
    expect(done.status).toBe("com_pendencia");
    expect(done.conclusion).toBe("Parcial");
    expect(done.completedAt).toBeTruthy();
  });
  test("concluir marca status como concluida", () => {
    const rec = createEnt();
    // responde todas obrigatórias
    for (const q of rec.questions) {
      if (q.required) answerQuestion(rec.id, q.id, { status: "respondida" });
    }
    const done = completeInterview(rec.id, "concluir");
    expect(done.status).toBe("concluida");
  });
  test("setInterviewAudioSummary grava referência", () => {
    const rec = createEnt();
    const upd = setInterviewAudioSummary(rec.id, {
      segmentsCount: 3,
      approxDurationMs: 10000,
      supported: true,
      note: "n",
    });
    expect(upd.audioSession?.segmentsCount).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// 8. Diligência — ciclo e componentes
// -----------------------------------------------------------------------------
describe("LV-11 · diligência", () => {
  beforeEach(() => resetInterviewStore());
  const createDil = () =>
    createDiligence({
      title: "D",
      responsibleLabel: "R",
      diligenceKind: "vistoria_imovel",
      address: "Rua X",
    });

  test("criar diligência adiciona ao store", () => {
    const before = listInterviewRecords().length;
    createDil();
    expect(listInterviewRecords().length).toBe(before + 1);
  });
  test("iniciar e cancelar diligência", () => {
    const rec = createDil();
    expect(startDiligence(rec.id).status).toBe("em_andamento");
    expect(cancelDiligence(rec.id).status).toBe("cancelada");
  });
  test("checklist state pode ser alterado", () => {
    const rec = createDiligence({
      title: "D",
      responsibleLabel: "R",
      diligenceKind: "outro",
      address: "Rua",
      checklistTexts: ["Verificar item A"],
    });
    const item = rec.checklistItems[0]!;
    const upd = setChecklistItemState(rec.id, item.id, "concluido");
    expect(upd.checklistItems[0]!.state).toBe("concluido");
    const upd2 = setChecklistItemState(rec.id, item.id, "nao_aplicavel");
    expect(upd2.checklistItems[0]!.state).toBe("nao_aplicavel");
  });
  test("addChecklistItem inclui novo item pendente", () => {
    const rec = createDil();
    const upd = addChecklistItem(rec.id, "novo item");
    expect(upd.checklistItems.some((c) => c.text === "novo item")).toBe(true);
  });
  test("addDiligenceNote preserva notas", () => {
    const rec = createDil();
    addDiligenceNote(rec.id, { text: "n1", kind: "observacao" });
    const after = addDiligenceNote(rec.id, { text: "n2", kind: "pendencia" });
    expect(after.notes.length).toBe(2);
  });
  test("addDiligencePendingItem cresce lista", () => {
    const rec = createDil();
    const upd = addDiligencePendingItem(rec.id, "Voltar amanhã");
    expect(upd.pendingItems).toContain("Voltar amanhã");
  });
  test("setDiligenceLocation valores válidos", () => {
    const rec = createDil();
    const upd = setDiligenceLocation(rec.id, {
      latitude: -23.5,
      longitude: -46.6,
      capturedAt: new Date().toISOString(),
      source: "manual",
    });
    expect(upd.location?.latitude).toBe(-23.5);
  });
  test("remover localização", () => {
    const rec = createDil();
    setDiligenceLocation(rec.id, {
      latitude: -23,
      longitude: -46,
      capturedAt: new Date().toISOString(),
      source: "manual",
    });
    const upd = setDiligenceLocation(rec.id, null);
    expect(upd.location).toBeUndefined();
  });
  test("adicionar e remover foto — cleanup de URL não quebra", () => {
    const rec = createDil();
    const withPhoto = addDiligencePhoto(rec.id, {
      name: "a.jpg",
      sizeBytes: 1024,
      mimeType: "image/jpeg",
      category: "objeto",
      caption: "cap",
    });
    expect(withPhoto.photos.length).toBe(1);
    const pid = withPhoto.photos[0]!.id;
    const upd = updateDiligencePhoto(rec.id, pid, { caption: "atualizada", relevant: true });
    expect(upd.photos[0]!.caption).toBe("atualizada");
    expect(upd.photos[0]!.relevant).toBe(true);
    const removed = removeDiligencePhoto(rec.id, pid);
    expect(removed.photos.length).toBe(0);
  });
  test("mover foto na ordem", () => {
    const rec = createDil();
    addDiligencePhoto(rec.id, {
      name: "1.jpg",
      sizeBytes: 100,
      mimeType: "image/jpeg",
      category: "objeto",
    });
    addDiligencePhoto(rec.id, {
      name: "2.jpg",
      sizeBytes: 100,
      mimeType: "image/jpeg",
      category: "objeto",
    });
    const cur = getInterviewRecord(rec.id) as DiligenceRecord;
    const first = cur.photos[0]!.id;
    const upd = movePhoto(rec.id, first, 1);
    expect(upd.photos[1]!.id).toBe(first);
  });
  test("validação de conclusão exige objetivo e endereço", () => {
    const rec = createDiligence({
      title: "sem obj",
      responsibleLabel: "R",
      diligenceKind: "outro",
      address: "Rua Y",
    });
    const v = validateDiligenceCompletion(rec);
    expect(v.pending.some((p) => /objetivo/i.test(p))).toBe(true);
  });
  test("concluir diligência marca como concluida", () => {
    const rec = createDiligence({
      title: "d",
      responsibleLabel: "R",
      diligenceKind: "outro",
      address: "R",
      objective: "obj",
    });
    const done = completeDiligence(rec.id, "concluir");
    expect(done.status).toBe("concluida");
  });
  test("concluir com pendência", () => {
    const rec = createDiligence({
      title: "d",
      responsibleLabel: "R",
      diligenceKind: "outro",
      address: "R",
      objective: "obj",
    });
    const done = completeDiligence(rec.id, "concluir_com_pendencia");
    expect(done.status).toBe("com_pendencia");
  });
});

// -----------------------------------------------------------------------------
// 9. Media panel — helpers de aceitação
// -----------------------------------------------------------------------------
describe("LV-11 · mídia (helpers)", () => {
  test("mime aceito", () => {
    expect(isAcceptedPhotoMime("image/jpeg")).toBe(true);
    expect(isAcceptedPhotoMime("image/png")).toBe(true);
    expect(isAcceptedPhotoMime("image/webp")).toBe(true);
    expect(isAcceptedPhotoMime("application/pdf")).toBe(false);
    expect(isAcceptedPhotoMime("")).toBe(false);
  });
  test("tamanho aceito", () => {
    expect(isPhotoSizeAcceptable(1024)).toBe(true);
    expect(isPhotoSizeAcceptable(MAX_PHOTO_SIZE_BYTES)).toBe(true);
    expect(isPhotoSizeAcceptable(MAX_PHOTO_SIZE_BYTES + 1)).toBe(false);
    expect(isPhotoSizeAcceptable(0)).toBe(false);
  });
  test("mimes permitidos cobrem os formatos exigidos", () => {
    expect(ACCEPTED_PHOTO_MIME_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_PHOTO_MIME_TYPES).toContain("image/png");
    expect(ACCEPTED_PHOTO_MIME_TYPES).toContain("image/webp");
  });
});

// -----------------------------------------------------------------------------
// 10. Resumo (text builders) e utilidades
// -----------------------------------------------------------------------------
describe("LV-11 · resumo e utilitários", () => {
  beforeEach(() => resetInterviewStore());

  test("resumo de entrevista inclui título e status", () => {
    const rec = listInterviewRecords().find((r) => r.kind === "entrevista") as InterviewRecord;
    const text = buildInterviewSummaryText(rec);
    expect(text).toContain(rec.title);
    expect(text).toMatch(/Situação:/);
  });
  test("resumo de diligência inclui endereço", () => {
    const rec = listInterviewRecords().find(
      (r) => r.kind === "diligencia" && r.address,
    ) as DiligenceRecord;
    const text = buildDiligenceSummaryText(rec);
    expect(text).toContain(rec.address!);
  });
  test("formatDurationBetween retorna — quando faltam datas", () => {
    expect(formatDurationBetween(undefined, undefined)).toBe("—");
    expect(formatDurationBetween("2026-01-01T10:00:00Z", "2026-01-01T09:00:00Z")).toBe("—");
  });
  test("formatDurationBetween produz minutos", () => {
    const s = formatDurationBetween("2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z");
    expect(s).toBe("30min");
  });
  test("formatDurationBetween produz horas e minutos", () => {
    const s = formatDurationBetween("2026-01-01T10:00:00Z", "2026-01-01T11:15:00Z");
    expect(s).toBe("1h15min");
  });
  test("listAvailableParticipants retorna lista da mock data", () => {
    const list = listAvailableParticipants();
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
    }
  });
  test("makeInterviewId gera ids únicos", () => {
    resetInterviewIdCounter(500);
    const a = makeInterviewId("ent");
    const b = makeInterviewId("ent");
    expect(a).not.toBe(b);
    expect(a.startsWith("ent-")).toBe(true);
  });
  test("subscribe recebe notificação em mutações", () => {
    let calls = 0;
    const off = subscribeInterviewStore(() => (calls += 1));
    createInterview({
      title: "sub",
      participantIds: ["cli-01"],
      responsibleLabel: "R",
      templateId: "roteiro-inicial",
    });
    off();
    expect(calls).toBeGreaterThan(0);
  });
  test("getInterviewRecord retorna undefined para id inexistente", () => {
    expect(getInterviewRecord("nao-existe")).toBeUndefined();
  });
});
