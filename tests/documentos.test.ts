/**
 * LV — Biblioteca documental
 *
 * Auditoria estática + testes comportamentais puros dos helpers
 * e da validação do formulário de criação de documentos.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  documentosSeed,
  getProcessoLabel,
  processoOptions,
  CATEGORIA_LABEL,
  SITUACAO_LABEL,
} from "../src/lib/mock/documentos";
import { validateDocumentCreate } from "../src/features/documentos/DocumentCreateDialog";
import { APP_NAV, ALL_NAV_ITEMS, CONSTRUCTION_MODULES } from "../src/lib/app-nav";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Documentos — auditoria estática", () => {
  test("rota /app/documentos não renderiza UnderConstruction", () => {
    const src = read("src/routes/app.documentos.tsx");
    expect(src).not.toMatch(/UnderConstruction/);
    expect(src).not.toMatch(/Em breve/i);
    expect(src).not.toMatch(/Em construção/i);
    expect(src).not.toMatch(/em construção/i);
  });

  test("menu Documentos está habilitado (sem construction)", () => {
    const item = ALL_NAV_ITEMS.find((i) => i.to === "/app/documentos");
    expect(item).toBeDefined();
    expect(item?.construction).toBeUndefined();
  });

  test("Documentos não está mais no mapa de módulos em construção", () => {
    expect(CONSTRUCTION_MODULES["/app/documentos"]).toBeUndefined();
  });

  test("página exibe cabeçalho e botão Adicionar documento", () => {
    const src = read("src/routes/app.documentos.tsx");
    expect(src).toMatch(/Documentos/);
    expect(src).toMatch(/Adicionar documento/);
  });

  test("página cobre estados de UI exigidos", () => {
    const src = read("src/routes/app.documentos.tsx");
    // loading
    expect(src).toMatch(/Skeleton/);
    // vazio
    expect(src).toMatch(/Nenhum documento encontrado/);
    // erro
    expect(src).toMatch(/Não foi possível carregar/);
    // offline
    expect(src).toMatch(/offline/i);
    // sem permissão
    expect(src).toMatch(/Sem permissão/);
  });

  test("APP_NAV inclui Documentos ativo no grupo Trabalho pericial", () => {
    const grupo = APP_NAV.find((g) => g.title === "Trabalho pericial");
    expect(grupo).toBeDefined();
    const doc = grupo!.items.find((i) => i.to === "/app/documentos");
    expect(doc?.construction).toBeUndefined();
  });
});

describe("Documentos — mocks", () => {
  test("seed tem pelo menos 5 documentos com campos essenciais", () => {
    expect(documentosSeed.length).toBeGreaterThanOrEqual(5);
    for (const d of documentosSeed) {
      expect(d.id).toBeTruthy();
      expect(d.nome.length).toBeGreaterThan(0);
      expect(CATEGORIA_LABEL[d.categoria]).toBeTruthy();
      expect(SITUACAO_LABEL[d.situacao]).toBeTruthy();
      expect(d.processoId).toBeTruthy();
      expect(d.versaoAtual).toBeGreaterThanOrEqual(1);
      expect(d.versoes.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(d.anotacoes)).toBe(true);
      expect(Array.isArray(d.vinculos)).toBe(true);
    }
  });

  test("cada versaoAtual corresponde a maior número em versoes", () => {
    for (const d of documentosSeed) {
      const max = Math.max(...d.versoes.map((v) => v.numero));
      expect(max).toBe(d.versaoAtual);
    }
  });

  test("getProcessoLabel resolve ID válido e retorna '—' para inválido", () => {
    const ops = processoOptions();
    expect(ops.length).toBeGreaterThan(0);
    expect(getProcessoLabel(ops[0]!.id)).toBe(ops[0]!.label);
    expect(getProcessoLabel("pro-inexistente")).toBe("—");
  });

  test("todos os documentos apontam para processo existente", () => {
    const ids = new Set(processoOptions().map((p) => p.id));
    for (const d of documentosSeed) {
      expect(ids.has(d.processoId)).toBe(true);
    }
  });

  test("existem documentos com nomes longos (>60 chars) para caso de responsividade", () => {
    const longos = documentosSeed.filter((d) => d.nome.length > 60);
    expect(longos.length).toBeGreaterThan(0);
  });
});

describe("Documentos — validação do formulário de criação", () => {
  const base = {
    nome: "Novo laudo",
    categoria: "laudo" as const,
    processoId: processoOptions()[0]!.id,
    descricao: "",
    arquivoNome: "laudo.pdf",
  };

  test("entrada válida não retorna erros", () => {
    expect(Object.keys(validateDocumentCreate(base)).length).toBe(0);
  });

  test("nome curto é rejeitado", () => {
    const e = validateDocumentCreate({ ...base, nome: "ab" });
    expect(e.nome).toBeTruthy();
  });

  test("processo vazio é rejeitado", () => {
    const e = validateDocumentCreate({ ...base, processoId: "" });
    expect(e.processoId).toBeTruthy();
  });

  test("arquivo vazio é rejeitado", () => {
    const e = validateDocumentCreate({ ...base, arquivoNome: "   " });
    expect(e.arquivoNome).toBeTruthy();
  });

  test("nome só com espaços é rejeitado", () => {
    const e = validateDocumentCreate({ ...base, nome: "   " });
    expect(e.nome).toBeTruthy();
  });
});

describe("Documentos — filtragem pura", () => {
  function filtrar(
    docs: typeof documentosSeed,
    query: string,
    categoria: string,
    situacao: string,
  ) {
    const termo = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (categoria !== "todas" && d.categoria !== categoria) return false;
      if (situacao !== "todas" && d.situacao !== situacao) return false;
      if (!termo) return true;
      const nomeMatch = d.nome.toLowerCase().includes(termo);
      const catMatch = CATEGORIA_LABEL[d.categoria].toLowerCase().includes(termo);
      const procMatch = getProcessoLabel(d.processoId).toLowerCase().includes(termo);
      return nomeMatch || catMatch || procMatch;
    });
  }

  test("busca por trecho do nome funciona", () => {
    const r = filtrar(documentosSeed, "laudo pericial preliminar", "todas", "todas");
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test("filtro por categoria isola registros corretamente", () => {
    const r = filtrar(documentosSeed, "", "contrato", "todas");
    expect(r.every((d) => d.categoria === "contrato")).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test("filtro por situação isola corretamente", () => {
    const r = filtrar(documentosSeed, "", "todas", "aprovado");
    expect(r.every((d) => d.situacao === "aprovado")).toBe(true);
  });

  test("busca vazia retorna todos", () => {
    const r = filtrar(documentosSeed, "", "todas", "todas");
    expect(r.length).toBe(documentosSeed.length);
  });

  test("busca sem correspondência retorna vazio", () => {
    const r = filtrar(documentosSeed, "xxxxxxxxxxxxxx-nao-existe", "todas", "todas");
    expect(r.length).toBe(0);
  });

  test("filtro por número do processo (busca) encontra documento", () => {
    const alvo = documentosSeed[0]!;
    const numero = getProcessoLabel(alvo.processoId);
    const r = filtrar(documentosSeed, numero, "todas", "todas");
    expect(r.some((d) => d.id === alvo.id)).toBe(true);
  });
});

describe("Documentos — dependências visuais montam", () => {
  test("componentes existem no disco", () => {
    read("src/features/documentos/DocumentDetailDialog.tsx");
    read("src/features/documentos/DocumentCreateDialog.tsx");
    read("src/routes/app.documentos.tsx");
    read("src/lib/mock/documentos.ts");
  });
});
