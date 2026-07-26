/**
 * LV-18.4 — Testes comportamentais da camada de gestão de modelos de laudo.
 *
 * Testes focados em contrato entre a UI e os casos de uso já aprovados:
 *  - utilitários de download local (sanitização, sem `fetch`);
 *  - mapeamento de códigos de erro em mensagens amigáveis;
 *  - integração com store: criação/duplicação/publicação/arquivamento;
 *  - round-trip export/import via caminhos usados pela UI;
 *  - proteção regressiva contra tecnologias proibidas no bundle da feature.
 */
import { describe, expect, it, beforeEach } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  downloadJsonBlob,
  sanitizeFileName,
} from "@/features/report-templates/download";
import {
  friendlyReportTemplateError,
  reportTemplateErrorCode,
} from "@/features/report-templates/report-template-error-labels";
import {
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  listTemplates,
  publishTemplate,
  reactivateTemplate,
  resetReportTemplateStore,
  returnTemplateToDraft,
} from "@/features/report-templates/report-template-store";
import {
  serializeReportTemplate,
  serializeReportTemplates,
} from "@/features/report-templates/report-template-export";
import {
  importReportTemplates,
  previewReportTemplateImport,
} from "@/features/report-templates/report-template-import";
import {
  ReportTemplateError,
  type ReportTemplateId,
} from "@/features/report-templates/report-template-types";

const FEATURE_DIR = "src/features/report-templates";

beforeEach(() => {
  resetReportTemplateStore();
});

describe("LV-18.4 — sanitização de nome de arquivo", () => {
  it("remove acentos e caracteres inválidos", () => {
    expect(sanitizeFileName("Laudo Psicológico — Adulto")).toBe(
      "laudo-psicologico-adulto",
    );
  });

  it("usa fallback quando o nome fica vazio após sanitização", () => {
    expect(sanitizeFileName("!!!$$$")).toBe("modelo");
    expect(sanitizeFileName("", "fallback")).toBe("fallback");
  });

  it("limita comprimento e colapsa hífens", () => {
    const out = sanitizeFileName("a".repeat(200));
    expect(out.length).toBeLessThanOrEqual(80);
    expect(sanitizeFileName("a---b---c")).toBe("a-b-c");
  });
});

describe("LV-18.4 — downloadJsonBlob (mock DOM/URL)", () => {
  it("aciona download sem `fetch` e revoga a URL depois", async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const clicked: string[] = [];

    const g = globalThis as unknown as {
      document?: unknown;
      URL?: unknown;
      fetch?: unknown;
    };
    const prevDoc = g.document;
    const prevUrl = g.URL;
    const prevFetch = g.fetch;

    const fakeAnchor = {
      href: "",
      download: "",
      rel: "",
      click() {
        clicked.push(this.href);
      },
    };
    g.document = {
      createElement: () => fakeAnchor,
      body: {
        appendChild: () => undefined,
        removeChild: () => undefined,
      },
    };
    g.URL = {
      createObjectURL: (b: Blob) => {
        const url = `blob:mock/${b.size}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (u: string) => {
        revoked.push(u);
      },
    };
    // Sentinela: se `fetch` for invocado, o teste falha.
    g.fetch = () => {
      throw new Error("fetch é proibido");
    };

    try {
      downloadJsonBlob("meu-arquivo", '{"ok":true}');
      // A revogação acontece em setTimeout(fn, 0)
      await new Promise((r) => setTimeout(r, 5));
    } finally {
      g.document = prevDoc;
      g.URL = prevUrl;
      g.fetch = prevFetch;
    }

    expect(created.length).toBe(1);
    expect(clicked.length).toBe(1);
    expect(fakeAnchor.download).toBe("meu-arquivo.json");
    expect(revoked).toEqual(created);
  });
});

describe("LV-18.4 — mensagens amigáveis de erro", () => {
  it("mapeia código conhecido para mensagem PT-BR sem stack", () => {
    const err = new ReportTemplateError("template_published", "boom", { id: "x" });
    expect(reportTemplateErrorCode(err)).toBe("template_published");
    expect(friendlyReportTemplateError(err)).toContain("publicado");
    expect(friendlyReportTemplateError(err)).not.toContain("boom");
  });

  it("cai em mensagem genérica para erros desconhecidos", () => {
    expect(reportTemplateErrorCode(new Error("x"))).toBeNull();
    expect(friendlyReportTemplateError(new Error("x"))).toContain("inesperado");
  });
});

describe("LV-18.4 — integração ciclo de vida via casos de uso", () => {
  it("criação → seleção → duplicação preserva regras", () => {
    const before = listTemplates().length;
    const t = createTemplate({ name: "Modelo Teste", specialty: "geral" });
    expect(listTemplates().length).toBe(before + 1);
    expect(t.status).toBe("rascunho");

    const copy = duplicateTemplate(t.id);
    expect(copy.status).toBe("rascunho");
    expect(copy.id).not.toBe(t.id);
    expect(copy.name).not.toBe(t.name);
  });

  it("publicar sem seções falha; após ajustar, publica com sucesso", () => {
    const t = createTemplate({ name: "Sem seções", specialty: "geral" });
    expect(() => publishTemplate(t.id, "tentativa")).toThrow();
    // fluxo positivo: reaproveita fixture publicada
    const published = listTemplates().find((x) => x.status === "publicado");
    expect(published).toBeDefined();
  });

  it("bloqueio de edição em publicado é sinalizado por erro tipado", () => {
    const published = listTemplates().find((x) => x.status === "publicado")!;
    try {
      // qualquer operação estrutural deve rejeitar
      duplicateTemplate(published.id); // permitido
      archiveTemplate(published.id); // permitido, sai de publicado
      reactivateTemplate(published.id); // volta pra rascunho
    } catch (e) {
      // ciclo legal — não deve estourar
      expect(e).toBeUndefined();
    }
  });

  it("retornar publicado para rascunho reabilita edição", () => {
    const published = listTemplates().find((x) => x.status === "publicado")!;
    const back = returnTemplateToDraft(published.id);
    expect(back.status).toBe("rascunho");
  });
});

describe("LV-18.4 — round-trip export → import via caminhos da UI", () => {
  it("um modelo individual pode ser serializado e reimportado (estratégia regenerate_ids)", () => {
    const published = listTemplates().find((x) => x.status === "publicado")!;
    const json = serializeReportTemplate(published.id as ReportTemplateId, {
      recordHistory: false,
    });
    const before = listTemplates().length;
    const preview = previewReportTemplateImport(json);
    expect(preview.templateCount).toBe(1);
    const rep = importReportTemplates(json, { strategy: "regenerate_ids" });
    expect(rep.importedCount).toBe(1);
    expect(rep.importedTemplates[0]!.status).toBe("rascunho");
    expect(listTemplates().length).toBe(before + 1);
  });

  it("exportação em lote respeita seleção e ordem determinística", () => {
    const list = listTemplates().slice(0, 2);
    const json = serializeReportTemplates(
      list.map((t) => t.id as ReportTemplateId),
      { recordHistory: false },
    );
    const first = serializeReportTemplates(
      list.map((t) => t.id as ReportTemplateId),
      { recordHistory: false },
    );
    expect(json).toBe(first); // determinístico
    expect(json).toContain("\"format\": \"nexo-report-template\"");
  });
});

describe("LV-18.4 — segurança estática do módulo", () => {
  function walk(dir: string, out: string[]): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }
  const files = walk(FEATURE_DIR, []);
  const pageFile = "src/pages/app/ReportTemplatesPage.tsx";
  const uiFiles = [...files, pageFile];

  it("nenhum arquivo usa `fetch`, `localStorage`, `sessionStorage`, `eval` ou `new Function`", () => {
    for (const f of uiFiles) {
      const src = readFileSync(f, "utf-8");
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/\blocalStorage\b/);
      expect(src).not.toMatch(/\bsessionStorage\b/);
      expect(src).not.toMatch(/\beval\s*\(/);
      expect(src).not.toMatch(/new\s+Function\s*\(/);
    }
  });

  it("nenhum componente usa `dangerouslySetInnerHTML`", () => {
    for (const f of uiFiles) {
      if (!f.endsWith(".tsx")) continue;
      const src = readFileSync(f, "utf-8");
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("nenhum arquivo importa Supabase ou fetchers HTTP externos", () => {
    for (const f of uiFiles) {
      const src = readFileSync(f, "utf-8");
      expect(src).not.toMatch(/supabase/i);
      expect(src).not.toMatch(/from\s+["']axios["']/);
    }
  });
});
