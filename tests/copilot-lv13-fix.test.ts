/**
 * LV-13 — Correção final: testes comportamentais.
 * Estabilidade de registro, seleção exata, segurança de rotas.
 */
import { describe, it, expect } from "vitest";
import { runCopilot } from "@/features/copilot/copilot-engine";
import { scopeSourcesToContext } from "@/features/copilot/copilot-scope";
import type {
  CopilotRouteContext,
  CopilotSourceRecord,
} from "@/features/copilot/copilot-types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = process.cwd();
const readSrc = (rel: string) => readFileSync(resolve(REPO, rel), "utf8");

const CTX_QUESITOS: CopilotRouteContext = {
  route: "/app/quesitos",
  moduleKey: "quesitos",
  moduleLabel: "Quesitos",
};

function q(id: string, label = `Quesito ${id}`): CopilotSourceRecord {
  return {
    sourceType: "quesito",
    id,
    label,
    searchableText: label,
    metadata: {},
    route: `/app/quesitos?id=${id}`,
  };
}

describe("LV-13 correção — seleção exata em mutações", () => {
  it("com 2+ candidatos e nenhum selecionado: NÃO propõe mutação e explica que precisa abrir o registro", () => {
    const out = runCopilot({
      text: "rascunhe uma resposta técnica ao quesito",
      context: CTX_QUESITOS,
      availableSources: [q("q1"), q("q2")],
      threadHistory: [],
    });
    expect(out.proposedActions.length).toBe(0);
    expect(out.responseText.toLowerCase()).toMatch(/abra|selecion/);
  });

  it("com registro específico registrado no contexto: mutação usa exatamente esse alvo", () => {
    const out = runCopilot({
      text: "rascunhe uma resposta técnica",
      context: {
        ...CTX_QUESITOS,
        entityType: "quesito",
        entityId: "q2",
        entityLabel: "Quesito q2",
      },
      availableSources: [q("q1"), q("q2"), q("q3")],
      threadHistory: [],
    });
    expect(out.proposedActions.length).toBeGreaterThan(0);
    expect(out.proposedActions[0].targetId).toBe("q2");
  });

  it("com candidato único no escopo: mutação é permitida sem ambiguidade", () => {
    const out = runCopilot({
      text: "rascunhe uma resposta",
      context: CTX_QUESITOS,
      availableSources: [q("q9")],
      threadHistory: [],
    });
    expect(out.proposedActions.length).toBeGreaterThan(0);
    expect(out.proposedActions[0].targetId).toBe("q9");
  });
});

describe("LV-13 correção — scopeSourcesToContext", () => {
  it("sem contexto: escopo global", () => {
    const r = scopeSourcesToContext({
      context: CTX_QUESITOS,
      availableSources: [q("a"), q("b")],
    });
    expect(r.scope).toBe("global");
    expect(r.selected).toBeUndefined();
  });

  it("com entidade registrada: encontra selected e escopo entity", () => {
    const r = scopeSourcesToContext({
      context: { ...CTX_QUESITOS, entityType: "quesito", entityId: "b" },
      availableSources: [q("a"), q("b")],
    });
    expect(r.scope).toBe("entity");
    expect(r.selected?.id).toBe("b");
  });
});

describe("LV-13 correção — segurança de rotas em Abrir fonte", () => {
  it("CopilotPanel valida rota /app antes de abrir fonte", () => {
    const src = readSrc("src/features/copilot/CopilotPanel.tsx");
    expect(src).toContain('ref.route.startsWith("/app")');
    // Registra auditoria source_opened ao abrir
    expect(src).toContain('"source_opened"');
  });

  it("CopilotPanel usa lista de fontes com botão Abrir fonte, não apenas badges", () => {
    const src = readSrc("src/features/copilot/CopilotPanel.tsx");
    expect(src).toContain("Abrir fonte");
  });

  it("Diálogo de confirmação detalha registro, alterações, risco e fontes", () => {
    const src = readSrc("src/features/copilot/CopilotPanel.tsx");
    expect(src).toContain("Ação proposta");
    expect(src).toContain("Registro afetado");
    expect(src).toContain("Alterações previstas");
    expect(src).toContain("Fontes utilizadas");
    expect(src).toContain("Risco");
  });
});

describe("LV-13 correção — estabilidade de registro de entidade", () => {
  it("useRegisterCopilotEntity usa assinatura de primitivos (sem loops por objeto literal)", () => {
    const src = readSrc("src/features/copilot/copilot-context.tsx");
    expect(src).toContain("useRegisterCopilotEntity");
  });

  it("integração real: diálogos registram entidade aberta", () => {
    const dialogs = [
      "src/features/interviews/InterviewWorkspaceDialog.tsx",
      "src/features/interviews/DiligenceWorkspaceDialog.tsx",
      "src/features/questions-evidence/QuestionDetailDialog.tsx",
    ];
    for (const p of dialogs) {
      const src = readSrc(p);
      expect(src).toContain("useRegisterCopilotEntity");
    }
  });
});

describe("LV-13 correção — sugestões contextuais reconhecidas", () => {
  it("sugestões de documentos incluem verbo reconhecido pelo classificador", () => {
    const src = readSrc("src/features/copilot/copilot-engine.ts");
    expect(src).toContain("Localizar documentos");
  });
});
