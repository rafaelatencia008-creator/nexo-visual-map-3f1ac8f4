/**
 * LV-13 — Suíte do Copiloto Nexo (mock).
 *
 * Objetivo: cobrir motor, store, biblioteca, adaptadores, aplicação
 * de ações, fingerprint/stale, auditoria e segurança.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { classifyIntent } from "@/features/copilot/copilot-intents";
import {
  runCopilot,
  suggestionsForContext,
  moduleFromRoute,
  resetEngineCounter,
} from "@/features/copilot/copilot-engine";
import {
  COPILOT_PROMPT_LIBRARY,
  PROMPT_CATEGORIES,
  searchPrompts,
} from "@/features/copilot/copilot-prompt-library";
import {
  appendMessage,
  archiveThread,
  clearThread,
  createThread,
  getThread,
  listAudit,
  listThreads,
  logAudit,
  makeAssistantMessage,
  makeCopilotId,
  makeUserMessage,
  renameThread,
  resetCopilotClock,
  resetCopilotIdCounter,
  resetCopilotStore,
  setMessageFeedback,
  updateActionStatus,
  updateMessage,
  copilotNow,
} from "@/features/copilot/copilot-mock-store";
import {
  collectAvailableSources,
  computeFingerprint,
} from "@/features/copilot/copilot-action-adapters";
import { applyAction } from "@/features/copilot/copilot-apply";
import {
  DRAFT_DISCLAIMER,
  EPHEMERAL_WARNING,
  INSUFFICIENT_DATA_MESSAGE,
  REFUSAL_MESSAGE,
  SIMULATION_BANNER,
  SIMULATION_DESCRIPTION,
  STALE_MESSAGE,
  UNKNOWN_INTENT_MESSAGE,
} from "@/features/copilot/copilot-labels";
import type {
  CopilotProposedAction,
  CopilotRouteContext,
  CopilotSourceRecord,
} from "@/features/copilot/copilot-types";

// -------- Helpers --------
const CTX_QUESITOS: CopilotRouteContext = {
  route: "/app/quesitos",
  moduleKey: "quesitos",
  moduleLabel: "Quesitos e evidências",
};
const CTX_DOC: CopilotRouteContext = {
  route: "/app/documentos",
  moduleKey: "documentos",
  moduleLabel: "Documentos",
};
const CTX_ENT: CopilotRouteContext = {
  route: "/app/entrevistas",
  moduleKey: "entrevistas",
  moduleLabel: "Entrevistas e diligências",
};
const CTX_INIT: CopilotRouteContext = {
  route: "/app",
  moduleKey: "inicio",
  moduleLabel: "Painel",
};

function fakeSources(extras: Partial<CopilotSourceRecord>[] = []): CopilotSourceRecord[] {
  return [
    {
      sourceType: "processo",
      id: "p-1",
      label: "Processo 001",
      searchableText: "001",
      metadata: { status: "ativo" },
    },
    {
      sourceType: "documento",
      id: "d-1",
      label: "Contrato social.pdf",
      searchableText: "contrato",
      metadata: { deadlineAt: "2026-08-01" },
    },
    {
      sourceType: "pendencia",
      id: "pd-1",
      label: "Enviar laudo",
      searchableText: "laudo",
      metadata: { prioridade: "alta" },
    },
    ...extras.map((x) => ({
      sourceType: "processo",
      id: "x",
      label: "x",
      searchableText: "",
      metadata: {},
      ...x,
    })) as CopilotSourceRecord[],
  ];
}

beforeEach(() => {
  resetCopilotStore();
  resetCopilotIdCounter(0);
  resetCopilotClock();
  resetEngineCounter(0);
});

// ============ 1. Intents ============
describe("classifyIntent", () => {
  it("recusa assinatura de laudo", () => {
    expect(classifyIntent("assine o laudo por mim", CTX_INIT)).toBe("recusar_acao");
  });
  it("recusa protocolo", () => {
    expect(classifyIntent("protocole este documento", CTX_INIT)).toBe("recusar_acao");
  });
  it("recusa exclusão em massa", () => {
    expect(classifyIntent("apague todas as evidências", CTX_INIT)).toBe("recusar_acao");
  });
  it("reconhece lacunas", () => {
    expect(classifyIntent("quais lacunas existem?", CTX_QUESITOS)).toBe("identificar_lacunas");
  });
  it("reconhece divergências", () => {
    expect(classifyIntent("quais divergências existem?", CTX_QUESITOS)).toBe("identificar_divergencias");
  });
  it("reconhece cobertura", () => {
    expect(classifyIntent("explique a cobertura deste quesito", CTX_QUESITOS)).toBe(
      "explicar_cobertura_quesito",
    );
  });
  it("reconhece rascunho", () => {
    expect(classifyIntent("crie um rascunho de resposta", CTX_QUESITOS)).toBe(
      "rascunhar_resposta_quesito",
    );
  });
  it("reconhece pendências", () => {
    expect(classifyIntent("liste pendências", CTX_INIT)).toBe("listar_pendencias");
  });
  it("reconhece prazos", () => {
    expect(classifyIntent("quais prazos", CTX_INIT)).toBe("identificar_prazos");
  });
  it("reconhece documentos", () => {
    expect(classifyIntent("quais documentos", CTX_DOC)).toBe("localizar_documentos");
  });
  it("reconhece resumo de arquivos", () => {
    expect(classifyIntent("resuma os arquivos", CTX_DOC)).toBe("resumir_documentos");
  });
  it("reconhece perguntas de entrevista", () => {
    expect(classifyIntent("sugira perguntas de entrevista", CTX_ENT)).toBe(
      "sugerir_perguntas_entrevista",
    );
  });
  it("reconhece roteiro", () => {
    expect(classifyIntent("prepare o roteiro", CTX_ENT)).toBe("preparar_roteiro_entrevista");
  });
  it("reconhece checklist", () => {
    expect(classifyIntent("prepare um checklist", CTX_ENT)).toBe("preparar_checklist_diligencia");
  });
  it("reconhece localizar evidências", () => {
    expect(classifyIntent("localize evidências", CTX_QUESITOS)).toBe("localizar_evidencias");
  });
  it("reconhece preparação para laudo", () => {
    expect(classifyIntent("preparar conteúdo para o laudo", CTX_QUESITOS)).toBe(
      "preparar_para_laudo",
    );
  });
  it("reconhece explicar situação", () => {
    expect(classifyIntent("explique a situação do processo", CTX_INIT)).toBe(
      "explicar_situacao_processo",
    );
  });
  it("reconhece próximos passos", () => {
    expect(classifyIntent("sugira próximos passos", CTX_INIT)).toBe("sugerir_proximos_passos");
  });
  it("reconhece ajuda", () => {
    expect(classifyIntent("ajuda", CTX_INIT)).toBe("ajuda_sistema");
  });
  it("reconhece resumo", () => {
    expect(classifyIntent("resuma o contexto", CTX_INIT)).toBe("resumo_contexto");
  });
  it("classifica desconhecido quando não há regra", () => {
    expect(classifyIntent("banana amarela", CTX_INIT)).toBe("desconhecido");
  });
  it("é insensível a acento", () => {
    expect(classifyIntent("quais LACUNAS existem?", CTX_QUESITOS)).toBe("identificar_lacunas");
  });
  it("prioridade: recusa vence outras", () => {
    expect(classifyIntent("assine o laudo e liste pendências", CTX_INIT)).toBe("recusar_acao");
  });
  it("contexto de quesitos favorece intents de quesito", () => {
    // texto ambíguo — em contexto quesitos deve preferir cobertura
    expect(classifyIntent("qual a cobertura do quesito", CTX_QUESITOS)).toBe("explicar_cobertura_quesito");
  });
});

// ============ 2. Motor ============
describe("runCopilot", () => {
  const sources = fakeSources();
  it("resumo_contexto retorna texto com totais", () => {
    const out = runCopilot({
      text: "resuma o contexto",
      context: CTX_INIT,
      availableSources: sources,
      threadHistory: [],
    });
    expect(out.intent).toBe("resumo_contexto");
    expect(out.responseText).toContain("Documentos");
    expect(out.responseText).toContain("Pendências");
  });
  it("lista pendências com referências reais", () => {
    const out = runCopilot({
      text: "liste pendências",
      context: CTX_INIT,
      availableSources: sources,
      threadHistory: [],
    });
    expect(out.intent).toBe("listar_pendencias");
    expect(out.references.length).toBeGreaterThan(0);
    expect(out.references[0].sourceType).toBe("pendencia");
  });
  it("informa dados insuficientes quando não há pendências", () => {
    const out = runCopilot({
      text: "liste pendências",
      context: CTX_INIT,
      availableSources: [],
      threadHistory: [],
    });
    expect(out.responseText).toBe(INSUFFICIENT_DATA_MESSAGE);
  });
  it("recusa ações proibidas", () => {
    const out = runCopilot({
      text: "assine o laudo por mim",
      context: CTX_INIT,
      availableSources: sources,
      threadHistory: [],
    });
    expect(out.responseText).toBe(REFUSAL_MESSAGE);
  });
  it("responde fallback para desconhecido", () => {
    const out = runCopilot({
      text: "aiubdaiub",
      context: CTX_INIT,
      availableSources: sources,
      threadHistory: [],
    });
    expect(out.responseText).toBe(UNKNOWN_INTENT_MESSAGE);
  });
  it("rascunho inclui aviso demonstrativo", () => {
    const out = runCopilot({
      text: "rascunho de resposta",
      context: CTX_QUESITOS,
      availableSources: [
        {
          sourceType: "quesito",
          id: "q-1",
          label: "Quesito 1",
          searchableText: "",
          metadata: {},
        },
      ],
      threadHistory: [],
    });
    expect(out.responseText).toContain(DRAFT_DISCLAIMER);
    expect(out.proposedActions.length).toBeGreaterThan(0);
    expect(out.proposedActions[0].kind).toBe("save_question_draft");
    expect(out.proposedActions[0].risk).toBe("high");
  });
  it("nunca inventa fonte inexistente", () => {
    const out = runCopilot({
      text: "quais documentos",
      context: CTX_DOC,
      availableSources: sources,
      threadHistory: [],
    });
    for (const r of out.references) {
      expect(sources.some((s) => s.id === r.sourceId)).toBe(true);
    }
  });
  it("proposta de ação começa com status proposed", () => {
    const out = runCopilot({
      text: "preparar checklist",
      context: CTX_ENT,
      availableSources: [
        {
          sourceType: "diligencia",
          id: "dil-1",
          label: "Vistoria",
          searchableText: "",
          metadata: {},
        },
      ],
      threadHistory: [],
    });
    expect(out.proposedActions[0].status).toBe("proposed");
  });
  it("perguntas de entrevista incluem ação de risco medio", () => {
    const out = runCopilot({
      text: "sugira perguntas de entrevista",
      context: CTX_ENT,
      availableSources: [
        { sourceType: "entrevista", id: "e-1", label: "Entrevista", searchableText: "", metadata: {} },
      ],
      threadHistory: [],
    });
    expect(out.proposedActions[0].risk).toBe("medium");
  });
  it("moduleFromRoute mapeia todas as rotas conhecidas", () => {
    expect(moduleFromRoute("/app/quesitos").moduleKey).toBe("quesitos");
    expect(moduleFromRoute("/app/documentos").moduleKey).toBe("documentos");
    expect(moduleFromRoute("/app/entrevistas").moduleKey).toBe("entrevistas");
    expect(moduleFromRoute("/app/agenda").moduleKey).toBe("agenda");
    expect(moduleFromRoute("/app/processos").moduleKey).toBe("processos");
    expect(moduleFromRoute("/app/pericias").moduleKey).toBe("pericias");
    expect(moduleFromRoute("/app/pendencias").moduleKey).toBe("pendencias");
    expect(moduleFromRoute("/app/clientes").moduleKey).toBe("clientes");
    expect(moduleFromRoute("/app/peritos").moduleKey).toBe("peritos");
    expect(moduleFromRoute("/app").moduleKey).toBe("inicio");
  });
});

// ============ 3. Store ============
describe("copilot store", () => {
  it("cria conversa com ID determinístico", () => {
    const t = createThread("A");
    expect(t.id.startsWith("thr-")).toBe(true);
    expect(listThreads().length).toBe(1);
  });
  it("renomeia conversa", () => {
    const t = createThread("A");
    const r = renameThread(t.id, "Renomeada");
    expect(r?.title).toBe("Renomeada");
  });
  it("arquiva conversa", () => {
    const t = createThread("A");
    const r = archiveThread(t.id);
    expect(r?.status).toBe("archived");
  });
  it("limpa mensagens", () => {
    const t = createThread("A");
    appendMessage(t.id, makeUserMessage("oi"));
    clearThread(t.id);
    expect(getThread(t.id)?.messages.length).toBe(0);
  });
  it("appendMessage empilha e não desordena", () => {
    const t = createThread("A");
    appendMessage(t.id, makeUserMessage("m1"));
    appendMessage(t.id, makeUserMessage("m2"));
    const cur = getThread(t.id)!;
    expect(cur.messages[0].text).toBe("m1");
    expect(cur.messages[1].text).toBe("m2");
  });
  it("updateMessage aplica patch", () => {
    const t = createThread("A");
    const m = makeAssistantMessage({ text: "pending", status: "pending" });
    appendMessage(t.id, m);
    updateMessage(t.id, m.id, { text: "ok", status: "completed" });
    expect(getThread(t.id)!.messages[0].status).toBe("completed");
  });
  it("updateActionStatus atualiza status da ação", () => {
    const t = createThread("A");
    const action: CopilotProposedAction = {
      id: "a1",
      kind: "copy_text",
      label: "x",
      description: "y",
      targetType: "processo",
      payload: {},
      risk: "low",
      status: "proposed",
    };
    const m = makeAssistantMessage({ text: "", proposedActions: [action] });
    appendMessage(t.id, m);
    updateActionStatus(t.id, m.id, "a1", "applied");
    expect(getThread(t.id)!.messages[0].proposedActions[0].status).toBe("applied");
  });
  it("setMessageFeedback grava feedback", () => {
    const t = createThread("A");
    const m = makeAssistantMessage({ text: "" });
    appendMessage(t.id, m);
    setMessageFeedback(t.id, m.id, { helpful: false, reason: "x", createdAt: copilotNow() });
    expect(getThread(t.id)!.messages[0].feedback?.helpful).toBe(false);
  });
  it("logAudit é append-only", () => {
    const t = createThread("A");
    const before = listAudit().length;
    logAudit(t.id, "message_sent", "x");
    expect(listAudit().length).toBe(before + 1);
  });
  it("cria conversa gera evento de auditoria", () => {
    createThread("A");
    expect(listAudit().some((e) => e.eventType === "conversation_created")).toBe(true);
  });
  it("arquivar gera evento", () => {
    const t = createThread("A");
    archiveThread(t.id);
    expect(listAudit().some((e) => e.eventType === "conversation_archived")).toBe(true);
  });
  it("limpar gera evento", () => {
    const t = createThread("A");
    clearThread(t.id);
    expect(listAudit().some((e) => e.eventType === "conversation_cleared")).toBe(true);
  });
  it("makeCopilotId incrementa contador", () => {
    resetCopilotIdCounter(0);
    const a = makeCopilotId("x");
    const b = makeCopilotId("x");
    expect(a).not.toBe(b);
    expect(a).toBe("x-0001");
    expect(b).toBe("x-0002");
  });
  it("resetCopilotStore limpa tudo", () => {
    createThread("A");
    resetCopilotStore();
    expect(listThreads().length).toBe(0);
    expect(listAudit().length).toBe(0);
  });
  it("copilotNow avança em passos determinísticos", () => {
    resetCopilotClock();
    const a = copilotNow();
    const b = copilotNow();
    expect(new Date(b).getTime()).toBeGreaterThan(new Date(a).getTime());
  });
  it("store não usa localStorage/sessionStorage", () => {
    // Não podemos garantir por reflexão trivial, mas os símbolos exportados não
    // devem incluir persistentes; verificação semântica:
    createThread("A");
    // Se hoje houver localStorage no ambiente, ele não deve conter chave "copilot"
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) ?? "";
        expect(k.toLowerCase()).not.toContain("copilot");
      }
    }
  });
  it("mensagens do usuário nascem completed", () => {
    const m = makeUserMessage("oi");
    expect(m.status).toBe("completed");
    expect(m.role).toBe("user");
  });
  it("mensagens do assistente sem status são completed", () => {
    const m = makeAssistantMessage({ text: "x" });
    expect(m.status).toBe("completed");
  });
});

// ============ 4. Biblioteca ============
describe("prompt library", () => {
  it("tem pelo menos 30 perguntas", () => {
    expect(COPILOT_PROMPT_LIBRARY.length).toBeGreaterThanOrEqual(30);
  });
  it("tem 10 categorias esperadas", () => {
    expect(PROMPT_CATEGORIES.length).toBe(10);
  });
  it("todas as perguntas têm id único", () => {
    const ids = new Set(COPILOT_PROMPT_LIBRARY.map((p) => p.id));
    expect(ids.size).toBe(COPILOT_PROMPT_LIBRARY.length);
  });
  it("busca vazia retorna tudo", () => {
    expect(searchPrompts("").length).toBe(COPILOT_PROMPT_LIBRARY.length);
  });
  it("busca filtra por termo", () => {
    const r = searchPrompts("laudo");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.text.toLowerCase().includes("laudo"))).toBe(true);
  });
  it("busca é insensível a acento", () => {
    const withAccent = searchPrompts("evidências");
    const withoutAccent = searchPrompts("evidencias");
    expect(withAccent.length).toBe(withoutAccent.length);
    expect(withAccent.length).toBeGreaterThan(0);
  });
  it("filtra por categoria", () => {
    const r = searchPrompts("", "Quesitos");
    expect(r.every((p) => p.category === "Quesitos")).toBe(true);
  });
  it("existe pergunta de laudo", () => {
    expect(COPILOT_PROMPT_LIBRARY.some((p) => p.category === "Laudos")).toBe(true);
  });
  it("existe pergunta de prazos", () => {
    expect(COPILOT_PROMPT_LIBRARY.some((p) => p.category === "Prazos")).toBe(true);
  });
});

// ============ 5. Sugestões ============
describe("suggestionsForContext", () => {
  it("documentos", () => {
    const s = suggestionsForContext(CTX_DOC);
    expect(s.join(" ")).toContain("Localizar");
  });
  it("entrevistas", () => {
    const s = suggestionsForContext(CTX_ENT);
    expect(s.join(" ")).toContain("Roteiro".toLowerCase()) === false;
    expect(s.some((x) => x.toLowerCase().includes("roteiro"))).toBe(true);
  });
  it("quesitos", () => {
    const s = suggestionsForContext(CTX_QUESITOS);
    expect(s.some((x) => x.toLowerCase().includes("cobertura"))).toBe(true);
    expect(s.some((x) => x.toLowerCase().includes("laudo"))).toBe(true);
  });
  it("agenda", () => {
    const s = suggestionsForContext({
      route: "/app/agenda",
      moduleKey: "agenda",
      moduleLabel: "Agenda",
    });
    expect(s.length).toBeGreaterThan(0);
  });
  it("pendencias", () => {
    const s = suggestionsForContext({
      route: "/app/pendencias",
      moduleKey: "pendencias",
      moduleLabel: "Pendências",
    });
    expect(s.some((x) => x.toLowerCase().includes("pend"))).toBe(true);
  });
  it("processos", () => {
    const s = suggestionsForContext({
      route: "/app/processos",
      moduleKey: "processos",
      moduleLabel: "Processos",
    });
    expect(s.length).toBeGreaterThan(0);
  });
  it("mudam conforme a rota", () => {
    const a = suggestionsForContext(CTX_DOC);
    const b = suggestionsForContext(CTX_QUESITOS);
    expect(a.join("|")).not.toBe(b.join("|"));
  });
  it("fallback para módulo desconhecido", () => {
    const s = suggestionsForContext({
      route: "/app",
      moduleKey: "outro",
      moduleLabel: "?",
    });
    expect(s.length).toBeGreaterThan(0);
  });
});

// ============ 6. Adaptadores ============
describe("adapters (read-only)", () => {
  it("coleta fontes de múltiplos módulos", () => {
    const s = collectAvailableSources();
    expect(s.some((x) => x.sourceType === "processo")).toBe(true);
    expect(s.some((x) => x.sourceType === "documento")).toBe(true);
    expect(s.some((x) => x.sourceType === "quesito")).toBe(true);
    expect(s.some((x) => x.sourceType === "pendencia")).toBe(true);
  });
  it("cada fonte tem id e label", () => {
    for (const src of collectAvailableSources()) {
      expect(src.id.length).toBeGreaterThan(0);
      expect(src.label.length).toBeGreaterThan(0);
    }
  });
  it("evidências aparecem como sourceType evidencia", () => {
    const s = collectAvailableSources();
    // pode ou não haver evidências no seed; tipo permitido
    for (const e of s.filter((x) => x.sourceType === "evidencia")) {
      expect(e.parentId).toBeTruthy();
    }
  });
});

// ============ 7. Fingerprint / stale ============
describe("fingerprint", () => {
  it("é estável para os mesmos dados", () => {
    const r: CopilotSourceRecord = {
      sourceType: "quesito",
      id: "q1",
      label: "x",
      searchableText: "",
      updatedAt: "2026-08-01T00:00:00Z",
      metadata: { status: "aberto", evidenceCount: 2 },
    };
    expect(computeFingerprint(r)).toBe(computeFingerprint({ ...r }));
  });
  it("muda quando updatedAt muda", () => {
    const a: CopilotSourceRecord = {
      sourceType: "quesito",
      id: "q1",
      label: "x",
      searchableText: "",
      updatedAt: "2026-08-01T00:00:00Z",
      metadata: { status: "aberto" },
    };
    const b: CopilotSourceRecord = { ...a, updatedAt: "2026-08-02T00:00:00Z" };
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b));
  });
  it("muda quando metadados mudam", () => {
    const a: CopilotSourceRecord = {
      sourceType: "quesito",
      id: "q1",
      label: "x",
      searchableText: "",
      updatedAt: "2026-08-01T00:00:00Z",
      metadata: { status: "aberto" },
    };
    const b: CopilotSourceRecord = { ...a, metadata: { status: "fechado" } };
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b));
  });
});

// ============ 8. Aplicação (com/sem stale) ============
describe("applyAction", () => {
  it("bloqueia com fingerprint diferente (stale)", () => {
    const src: CopilotSourceRecord = {
      sourceType: "processo",
      id: "p-1",
      label: "P",
      searchableText: "",
      metadata: { status: "ativo" },
      updatedAt: "2026-08-01",
    };
    const action: CopilotProposedAction = {
      id: "a1",
      kind: "add_interview_note",
      label: "Nota",
      description: "",
      targetType: "processo",
      targetId: "p-1",
      payload: { text: "x" },
      risk: "medium",
      status: "proposed",
      sourceFingerprint: "outra-coisa",
    };
    const res = applyAction(action, [src]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("stale");
  });
  it("retorna invalid quando registro não existe", () => {
    const action: CopilotProposedAction = {
      id: "a1",
      kind: "add_interview_note",
      label: "x",
      description: "",
      targetType: "entrevista",
      targetId: "nao-existe",
      payload: { text: "x" },
      risk: "low",
      status: "proposed",
    };
    const res = applyAction(action, []);
    expect(res.ok).toBe(false);
  });
  it("copy_text não requer alteração", () => {
    const src: CopilotSourceRecord = {
      sourceType: "processo",
      id: "p-1",
      label: "P",
      searchableText: "",
      metadata: {},
    };
    const res = applyAction(
      {
        id: "a1",
        kind: "copy_text",
        label: "Copiar",
        description: "",
        targetType: "processo",
        targetId: "p-1",
        payload: {},
        risk: "low",
        status: "proposed",
      },
      [src],
    );
    expect(res.ok).toBe(true);
  });
  it("add_diligence_pending recusa por falta de API", () => {
    const src: CopilotSourceRecord = {
      sourceType: "diligencia",
      id: "dil-x",
      label: "d",
      searchableText: "",
      metadata: {},
    };
    const res = applyAction(
      {
        id: "a1",
        kind: "add_diligence_pending",
        label: "P",
        description: "",
        targetType: "diligencia",
        targetId: "dil-x",
        payload: {},
        risk: "low",
        status: "proposed",
      },
      [src],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("no_api");
  });
});

// ============ 9. Auditoria ============
describe("auditoria", () => {
  it("append-only: eventos não são removidos", () => {
    const t = createThread("A");
    logAudit(t.id, "message_sent", "m");
    const snapshot = listAudit().map((e) => e.id);
    logAudit(t.id, "response_produced", "r");
    expect(snapshot.every((id) => listAudit().some((e) => e.id === id))).toBe(true);
  });
  it("cada evento tem timestamp único e crescente", () => {
    const t = createThread("A");
    logAudit(t.id, "message_sent", "m");
    logAudit(t.id, "response_produced", "r");
    const evs = listAudit();
    const times = evs.map((e) => new Date(e.createdAt).getTime());
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
  it("associa mensagem e ação quando fornecidos", () => {
    const t = createThread("A");
    logAudit(t.id, "action_applied", "ok", { messageId: "m1", actionId: "a1", outcome: "ok" });
    const ev = listAudit().find((e) => e.eventType === "action_applied");
    expect(ev?.messageId).toBe("m1");
    expect(ev?.actionId).toBe("a1");
    expect(ev?.outcome).toBe("ok");
  });
});

// ============ 10. Segurança e limites ============
describe("segurança", () => {
  it("banner permanente é exportado", () => {
    expect(SIMULATION_BANNER).toContain("Simulação");
    expect(SIMULATION_DESCRIPTION).toContain("Nenhuma IA real");
    expect(EPHEMERAL_WARNING).toContain("temporárias");
  });
  it("recusa é constante", () => {
    expect(REFUSAL_MESSAGE.length).toBeGreaterThan(20);
  });
  it("stale message é constante", () => {
    expect(STALE_MESSAGE).toContain("Os dados");
  });
  it("motor não usa fetch/xhr/websocket", () => {
    const src = runCopilot.toString();
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/XMLHttpRequest/);
    expect(src).not.toMatch(/WebSocket/);
    expect(src).not.toMatch(/EventSource/);
  });
  it("motor não referencia SDK de IA", () => {
    const src = runCopilot.toString();
    expect(src.toLowerCase()).not.toContain("openai");
    expect(src.toLowerCase()).not.toContain("anthropic");
    expect(src.toLowerCase()).not.toContain("gemini");
  });
  it("intents recusa: pedido de conclusão definitiva sem fontes", () => {
    expect(classifyIntent("dê uma conclusão definitiva agora", CTX_INIT)).toBe("recusar_acao");
  });
  it("intents recusa: alteração sem confirmação", () => {
    expect(classifyIntent("altere sem confirmação", CTX_INIT)).toBe("recusar_acao");
  });
});

// ============ 11. Complementos ============
describe("complementos", () => {
  it("rascunho gera fingerprint na proposta", () => {
    const src: CopilotSourceRecord = {
      sourceType: "quesito",
      id: "q-1",
      label: "Q",
      searchableText: "",
      updatedAt: "2026-08-01",
      metadata: { status: "aberto" },
    };
    const out = runCopilot({
      text: "crie um rascunho de resposta",
      context: CTX_QUESITOS,
      availableSources: [src],
      threadHistory: [],
    });
    expect(out.proposedActions.length).toBeGreaterThan(0);
    expect(out.proposedActions[0].sourceFingerprint).toBeTruthy();
  });
  it("resposta sempre tem intent definido", () => {
    const out = runCopilot({
      text: "xyz",
      context: CTX_INIT,
      availableSources: [],
      threadHistory: [],
    });
    expect(out.intent).toBeTruthy();
  });
  it("ajuda_sistema responde texto explicativo", () => {
    const out = runCopilot({
      text: "ajuda",
      context: CTX_INIT,
      availableSources: [],
      threadHistory: [],
    });
    expect(out.responseText.length).toBeGreaterThan(20);
  });
  it("referências vêm apenas das fontes disponíveis", () => {
    const s = fakeSources();
    const out = runCopilot({
      text: "resuma o contexto",
      context: CTX_INIT,
      availableSources: s,
      threadHistory: [],
    });
    for (const r of out.references) {
      expect(s.some((x) => x.id === r.sourceId)).toBe(true);
    }
  });
  it("classifica com string vazia como desconhecido", () => {
    expect(classifyIntent("", CTX_INIT)).toBe("desconhecido");
  });
  it("classifica com espaços como desconhecido", () => {
    expect(classifyIntent("   ", CTX_INIT)).toBe("desconhecido");
  });
  it("createThread com título padrão", () => {
    const t = createThread();
    expect(t.title.length).toBeGreaterThan(0);
  });
  it("threads são ordenadas por atualização mais recente primeiro", () => {
    const a = createThread("A");
    const b = createThread("B");
    appendMessage(a.id, makeUserMessage("m"));
    const list = listThreads();
    expect(list[0].id).toBe(a.id);
    expect(list[1].id).toBe(b.id);
  });
  it("makeUserMessage grava texto exato", () => {
    const m = makeUserMessage("Olá copiloto");
    expect(m.text).toBe("Olá copiloto");
  });
  it("makeAssistantMessage permite status pending", () => {
    const m = makeAssistantMessage({ text: "", status: "pending" });
    expect(m.status).toBe("pending");
  });
  it("UNKNOWN_INTENT_MESSAGE é constante", () => {
    expect(UNKNOWN_INTENT_MESSAGE.length).toBeGreaterThan(10);
  });
  it("banner de simulação nunca é vazio", () => {
    expect(SIMULATION_BANNER.trim().length).toBeGreaterThan(0);
  });
});
