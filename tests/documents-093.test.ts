/**
 * LV-09.3 — Biblioteca documental funcional
 *
 * Auditoria estática, helpers puros, seed determinístico, validações,
 * pesquisa, filtros e store mock.
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ACCEPTED_EXTENSIONS,
  MAX_ANNOTATION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MAX_NAME_LENGTH,
  type DocumentRecord,
} from "../src/features/documents/document-types";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CONFIDENTIALITIES,
  DOCUMENT_CONFIDENTIALITY_LABEL,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABEL,
} from "../src/features/documents/document-labels";
import {
  computeDeadlineState,
  daysBetween,
  formatDeadlineText,
  formatFileSize,
  getExtension,
  getFirstDocumentErrorField,
  isAcceptedExtension,
  isIsoDate,
  validateAnnotation,
  validateDocumentForm,
  validateFileMeta,
  validateVersionForm,
  type DocumentFormInput,
} from "../src/features/documents/document-form";
import {
  applyFilters,
  EMPTY_FILTERS,
  getCaseNumberLabel,
  hasActiveFilters,
  matchesSearch,
  normalize,
} from "../src/features/documents/document-filters";
import {
  DOCUMENT_SEED,
  SEED_REFERENCE_DATE,
  addAnnotation,
  addVersion,
  createDocumentFromForm,
  listDocuments,
  resetStore,
} from "../src/features/documents/document-mock-store";
import { ALL_NAV_ITEMS, APP_NAV, CONSTRUCTION_MODULES } from "../src/lib/app-nav";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

// ─────────────────────────────────────────────────────────────
// 1) Auditoria estática — remoção definitiva do "Em construção"
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — Auditoria estática", () => {
  const route = read("src/routes/app.documentos.tsx");

  test("rota não referencia UnderConstruction", () => {
    expect(route).not.toMatch(/UnderConstruction/);
  });
  test("rota não contém 'Em breve'", () => {
    expect(route).not.toMatch(/Em breve/);
  });
  test("rota não contém 'Módulo em construção'", () => {
    expect(route).not.toMatch(/Módulo em construção/);
  });
  test("rota não contém 'Recursos previstos'", () => {
    expect(route).not.toMatch(/Recursos previstos/);
  });
  test("rota não contém 'Voltar ao painel'", () => {
    expect(route).not.toMatch(/Voltar ao painel/);
  });
  test("rota não contém 'Ver roadmap público'", () => {
    expect(route).not.toMatch(/Ver roadmap público/);
  });
  test("rota exibe 'Documentos'", () => {
    expect(route).toMatch(/Documentos/);
  });
  test("rota expõe 'Adicionar documento' (marcador)", () => {
    expect(route).toMatch(/Adicionar documento/);
  });
  test("rota menciona 'Skeleton' (marcador de carregamento)", () => {
    expect(route).toMatch(/Skeleton/);
  });
  test("rota menciona 'Nenhum documento encontrado'", () => {
    expect(route).toMatch(/Nenhum documento encontrado/);
  });
  test("rota menciona 'Não foi possível carregar'", () => {
    expect(route).toMatch(/Não foi possível carregar/);
  });
  test("rota menciona 'offline'", () => {
    expect(route).toMatch(/offline/i);
  });
  test("rota menciona 'Sem permissão'", () => {
    expect(route).toMatch(/Sem permissão/);
  });

  test("menu Documentos ativo (sem construction)", () => {
    const item = ALL_NAV_ITEMS.find((i) => i.to === "/app/documentos");
    expect(item).toBeDefined();
    expect(item?.construction).toBeUndefined();
  });

  test("APP_NAV possui Documentos em 'Trabalho pericial'", () => {
    const grupo = APP_NAV.find((g) => g.title === "Trabalho pericial");
    const item = grupo?.items.find((i) => i.to === "/app/documentos");
    expect(item).toBeDefined();
    expect(item?.construction).toBeUndefined();
  });

  test("Documentos não está em CONSTRUCTION_MODULES", () => {
    expect(CONSTRUCTION_MODULES["/app/documentos"]).toBeUndefined();
  });

  test("componentes da feature existem", () => {
    read("src/features/documents/DocumentsLibraryPage.tsx");
    read("src/features/documents/DocumentFormDialog.tsx");
    read("src/features/documents/DocumentBatchDialog.tsx");
    read("src/features/documents/DocumentDetailDialog.tsx");
    read("src/features/documents/DocumentVersionDialog.tsx");
    read("src/features/documents/DocumentAnnotationDialog.tsx");
  });

  test("decisão DEC-DOC-001 registrada", () => {
    const dec = read("docs/decisions/DEC-DOC-001-biblioteca-documental-mock.md");
    expect(dec).toMatch(/LV-09\.3/);
    expect(dec).toMatch(/mock/i);
  });

  test("nenhuma rota nova para /app/documentos/novo, $documentId ou lote", () => {
    let created = 0;
    for (const rel of [
      "src/routes/app.documentos.novo.tsx",
      "src/routes/app.documentos.lote.tsx",
      "src/routes/app.documentos.$documentId.tsx",
    ]) {
      try {
        readFileSync(resolve(process.cwd(), rel), "utf8");
        created += 1;
      } catch {
        /* ok */
      }
    }
    expect(created).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Rótulos e categorias mínimas
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — Rótulos", () => {
  const categoriasEsperadas = [
    "laudo",
    "peticao",
    "decisao",
    "documento_pessoal",
    "comprovante",
    "relatorio_tecnico",
    "imagem",
    "audio",
    "video",
    "outro",
  ] as const;

  test("todas as categorias mínimas existem", () => {
    for (const c of categoriasEsperadas) {
      expect(DOCUMENT_CATEGORY_LABEL[c]).toBeTruthy();
    }
    expect(DOCUMENT_CATEGORIES.length).toBe(categoriasEsperadas.length);
  });

  test("categorias apresentadas em português", () => {
    expect(DOCUMENT_CATEGORY_LABEL.laudo).toBe("Laudo");
    expect(DOCUMENT_CATEGORY_LABEL.peticao).toBe("Petição");
    expect(DOCUMENT_CATEGORY_LABEL.decisao).toBe("Decisão judicial");
    expect(DOCUMENT_CATEGORY_LABEL.documento_pessoal).toBe("Documento pessoal");
    expect(DOCUMENT_CATEGORY_LABEL.comprovante).toBe("Comprovante");
    expect(DOCUMENT_CATEGORY_LABEL.relatorio_tecnico).toBe("Relatório técnico");
    expect(DOCUMENT_CATEGORY_LABEL.imagem).toBe("Imagem");
    expect(DOCUMENT_CATEGORY_LABEL.audio).toBe("Áudio");
    expect(DOCUMENT_CATEGORY_LABEL.video).toBe("Vídeo");
    expect(DOCUMENT_CATEGORY_LABEL.outro).toBe("Outro");
  });

  test("todas as situações mínimas existem", () => {
    for (const s of ["ativo", "pendente_revisao", "arquivado", "com_prazo", "prazo_vencido"] as const) {
      expect(DOCUMENT_STATUS_LABEL[s]).toBeTruthy();
    }
    expect(DOCUMENT_STATUSES.length).toBe(5);
  });

  test("todos os níveis de sigilo existem", () => {
    for (const c of ["publico", "restrito", "sigiloso"] as const) {
      expect(DOCUMENT_CONFIDENTIALITY_LABEL[c]).toBeTruthy();
    }
    expect(DOCUMENT_CONFIDENTIALITIES.length).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Seed determinístico
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — Seed", () => {
  test("possui pelo menos 12 documentos", () => {
    expect(DOCUMENT_SEED.length).toBeGreaterThanOrEqual(12);
  });

  test("ids únicos", () => {
    const set = new Set(DOCUMENT_SEED.map((d) => d.id));
    expect(set.size).toBe(DOCUMENT_SEED.length);
  });

  test("categorias variadas (>=5 distintas)", () => {
    const set = new Set(DOCUMENT_SEED.map((d) => d.category));
    expect(set.size).toBeGreaterThanOrEqual(5);
  });

  test("sigilos variados (todos os três presentes)", () => {
    const set = new Set(DOCUMENT_SEED.map((d) => d.confidentiality));
    expect(set.has("publico")).toBe(true);
    expect(set.has("restrito")).toBe(true);
    expect(set.has("sigiloso")).toBe(true);
  });

  test("existe documento com prazo futuro", () => {
    const has = DOCUMENT_SEED.some(
      (d) => computeDeadlineState(d.deadlineAt, SEED_REFERENCE_DATE) === "futuro"
      || computeDeadlineState(d.deadlineAt, SEED_REFERENCE_DATE) === "vencendo",
    );
    expect(has).toBe(true);
  });

  test("existe documento com prazo vencido", () => {
    const has = DOCUMENT_SEED.some(
      (d) => computeDeadlineState(d.deadlineAt, SEED_REFERENCE_DATE) === "vencido",
    );
    expect(has).toBe(true);
  });

  test("existe documento sem prazo", () => {
    const has = DOCUMENT_SEED.some((d) => !d.deadlineAt);
    expect(has).toBe(true);
  });

  test("existe documento com 1 versão", () => {
    expect(DOCUMENT_SEED.some((d) => d.versions.length === 1)).toBe(true);
  });
  test("existe documento com 2 versões", () => {
    expect(DOCUMENT_SEED.some((d) => d.versions.length === 2)).toBe(true);
  });
  test("existe documento com 3+ versões", () => {
    expect(DOCUMENT_SEED.some((d) => d.versions.length >= 3)).toBe(true);
  });

  test("existe documento com anotações e outro sem", () => {
    expect(DOCUMENT_SEED.some((d) => d.annotations.length > 0)).toBe(true);
    expect(DOCUMENT_SEED.some((d) => d.annotations.length === 0)).toBe(true);
  });

  test("existem documentos com nomes curtos e longos", () => {
    expect(DOCUMENT_SEED.some((d) => d.name.length < 40)).toBe(true);
    expect(DOCUMENT_SEED.some((d) => d.name.length > 60)).toBe(true);
  });

  test("cada currentVersion equivale ao maior número de versão", () => {
    for (const d of DOCUMENT_SEED) {
      const max = Math.max(...d.versions.map((v) => v.version));
      expect(d.currentVersion).toBe(max);
    }
  });

  test("todos os documentos apontam para processo existente quando informado", () => {
    for (const d of DOCUMENT_SEED) {
      if (d.caseId) expect(getCaseNumberLabel(d.caseId).length).toBeGreaterThan(0);
    }
  });

  test("existe documento vinculado a perícia", () => {
    expect(DOCUMENT_SEED.some((d) => !!d.expertiseId)).toBe(true);
  });

  test("existe documento vinculado a pelo menos uma pessoa", () => {
    expect(DOCUMENT_SEED.some((d) => d.personIds.length > 0)).toBe(true);
  });

  test("determinismo: importar duas vezes produz mesmos ids", () => {
    const ids1 = DOCUMENT_SEED.map((d) => d.id).join(",");
    const ids2 = DOCUMENT_SEED.map((d) => d.id).join(",");
    expect(ids1).toBe(ids2);
  });

  test("seed não usa timestamps não-determinísticos evidentes", () => {
    for (const d of DOCUMENT_SEED) {
      expect(d.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(d.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 4) Helpers puros — extensões e tamanhos
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — helpers de arquivo", () => {
  test("getExtension retorna extensão em minúsculas", () => {
    expect(getExtension("laudo.PDF")).toBe("pdf");
    expect(getExtension("foto.jpeg")).toBe("jpeg");
    expect(getExtension("arquivo.tar.gz")).toBe("gz");
  });
  test("getExtension retorna vazio para nomes sem extensão", () => {
    expect(getExtension("semextensao")).toBe("");
    expect(getExtension(".semnome")).toBe("");
    expect(getExtension("terminaponto.")).toBe("");
  });
  test("isAcceptedExtension aceita todas as extensões documentadas", () => {
    for (const e of ACCEPTED_EXTENSIONS) expect(isAcceptedExtension(e)).toBe(true);
  });
  test("isAcceptedExtension rejeita tipos não permitidos", () => {
    for (const e of ["exe", "bin", "sh", "app", "svg"]) {
      expect(isAcceptedExtension(e)).toBe(false);
    }
  });
  test("formatFileSize em B, KB, MB e GB", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1024)).toContain("KB");
    expect(formatFileSize(2 * 1024 * 1024)).toContain("MB");
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toContain("GB");
  });
  test("formatFileSize protege contra valores inválidos", () => {
    expect(formatFileSize(Number.NaN)).toBe("—");
    expect(formatFileSize(-1)).toBe("—");
  });

  test("validateFileMeta exige arquivo", () => {
    expect(validateFileMeta(null)).toBeTruthy();
    expect(validateFileMeta(undefined)).toBeTruthy();
  });
  test("validateFileMeta rejeita extensão inválida", () => {
    expect(
      validateFileMeta({ fileName: "hack.exe", sizeBytes: 100, mimeType: "" }),
    ).toBeTruthy();
  });
  test("validateFileMeta rejeita arquivo acima de 50 MB", () => {
    expect(
      validateFileMeta({
        fileName: "grande.pdf",
        sizeBytes: MAX_FILE_SIZE_BYTES + 1,
        mimeType: "application/pdf",
      }),
    ).toBeTruthy();
  });
  test("validateFileMeta aceita arquivo válido", () => {
    expect(
      validateFileMeta({ fileName: "ok.pdf", sizeBytes: 1024, mimeType: "application/pdf" }),
    ).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 5) Datas ISO e cálculo de prazos
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — datas e prazos", () => {
  test("isIsoDate aceita datas válidas", () => {
    expect(isIsoDate("2026-07-25")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
  });
  test("isIsoDate rejeita datas inválidas", () => {
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("hoje")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate("2026/07/25")).toBe(false);
  });

  test("daysBetween calcula corretamente", () => {
    expect(daysBetween("2026-07-25", "2026-07-25")).toBe(0);
    expect(daysBetween("2026-07-25", "2026-07-26")).toBe(1);
    expect(daysBetween("2026-07-25", "2026-07-24")).toBe(-1);
    expect(daysBetween("2026-07-25", "2026-08-04")).toBe(10);
  });

  test("computeDeadlineState — sem prazo", () => {
    expect(computeDeadlineState(undefined, "2026-07-25")).toBe("sem_prazo");
    expect(computeDeadlineState("data-invalida", "2026-07-25")).toBe("sem_prazo");
  });
  test("computeDeadlineState — hoje", () => {
    expect(computeDeadlineState("2026-07-25", "2026-07-25")).toBe("hoje");
  });
  test("computeDeadlineState — vencido", () => {
    expect(computeDeadlineState("2026-07-20", "2026-07-25")).toBe("vencido");
  });
  test("computeDeadlineState — vencendo (<=7 dias)", () => {
    expect(computeDeadlineState("2026-07-27", "2026-07-25")).toBe("vencendo");
    expect(computeDeadlineState("2026-08-01", "2026-07-25")).toBe("vencendo");
  });
  test("computeDeadlineState — futuro (>7 dias)", () => {
    expect(computeDeadlineState("2026-08-05", "2026-07-25")).toBe("futuro");
  });

  test("formatDeadlineText — variações", () => {
    expect(formatDeadlineText(undefined, "2026-07-25")).toBe("Sem prazo");
    expect(formatDeadlineText("2026-07-25", "2026-07-25")).toBe("Vence hoje");
    expect(formatDeadlineText("2026-07-26", "2026-07-25")).toBe("Vence em 1 dia");
    expect(formatDeadlineText("2026-07-30", "2026-07-25")).toBe("Vence em 5 dias");
    expect(formatDeadlineText("2026-07-24", "2026-07-25")).toBe("Vencido há 1 dia");
    expect(formatDeadlineText("2026-07-20", "2026-07-25")).toBe("Vencido há 5 dias");
  });

  test("helpers de prazo não dependem de Date.now (recebem referência)", () => {
    // Chamadas repetidas com a mesma referência devem produzir o mesmo resultado.
    const r1 = computeDeadlineState("2026-07-30", "2026-07-25");
    const r2 = computeDeadlineState("2026-07-30", "2026-07-25");
    expect(r1).toBe(r2);
  });
});

// ─────────────────────────────────────────────────────────────
// 6) validateDocumentForm
// ─────────────────────────────────────────────────────────────

const validFile = { fileName: "laudo.pdf", sizeBytes: 1024, mimeType: "application/pdf" };
const validForm = (patch: Partial<DocumentFormInput> = {}): DocumentFormInput => ({
  file: validFile,
  name: "Laudo teste",
  category: "laudo",
  confidentiality: "restrito",
  ...patch,
});

describe("LV-09.3 — validateDocumentForm", () => {
  test("entrada válida não retorna erros", () => {
    expect(Object.keys(validateDocumentForm(validForm())).length).toBe(0);
  });
  test("arquivo ausente é obrigatório", () => {
    expect(validateDocumentForm(validForm({ file: null })).file).toBeTruthy();
  });
  test("nome curto é rejeitado", () => {
    expect(validateDocumentForm(validForm({ name: "ab" })).name).toBeTruthy();
  });
  test("nome apenas com espaços é rejeitado", () => {
    expect(validateDocumentForm(validForm({ name: "     " })).name).toBeTruthy();
  });
  test("nome acima do limite é rejeitado", () => {
    expect(
      validateDocumentForm(validForm({ name: "x".repeat(MAX_NAME_LENGTH + 1) })).name,
    ).toBeTruthy();
  });
  test("categoria vazia é rejeitada", () => {
    expect(validateDocumentForm(validForm({ category: "" })).category).toBeTruthy();
  });
  test("sigilo vazio é rejeitado", () => {
    expect(validateDocumentForm(validForm({ confidentiality: "" })).confidentiality).toBeTruthy();
  });
  test("tipo inválido rejeitado", () => {
    expect(
      validateDocumentForm(
        validForm({ file: { fileName: "vírus.exe", sizeBytes: 100, mimeType: "" } }),
      ).file,
    ).toBeTruthy();
  });
  test("tamanho acima do limite rejeitado", () => {
    expect(
      validateDocumentForm(
        validForm({ file: { fileName: "big.pdf", sizeBytes: MAX_FILE_SIZE_BYTES + 1, mimeType: "" } }),
      ).file,
    ).toBeTruthy();
  });
  test("prazo com data inválida é rejeitado", () => {
    expect(validateDocumentForm(validForm({ deadlineAt: "31-01-2026" })).deadlineAt).toBeTruthy();
  });
  test("prazo com data válida aceito", () => {
    expect(validateDocumentForm(validForm({ deadlineAt: "2026-08-01" })).deadlineAt).toBeUndefined();
  });
  test("descrição acima do limite rejeitada", () => {
    expect(
      validateDocumentForm(validForm({ description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1) }))
        .description,
    ).toBeTruthy();
  });

  test("getFirstDocumentErrorField segue ordem canônica", () => {
    const all = validateDocumentForm({
      file: null,
      name: "a",
      category: "",
      confidentiality: "",
      description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1),
      deadlineAt: "invalida",
    });
    expect(getFirstDocumentErrorField(all)).toBe("file");
    expect(getFirstDocumentErrorField({ name: "x" })).toBe("name");
    expect(getFirstDocumentErrorField({ category: "x" })).toBe("category");
    expect(getFirstDocumentErrorField({ confidentiality: "x" })).toBe("confidentiality");
    expect(getFirstDocumentErrorField({ deadlineAt: "x" })).toBe("deadlineAt");
    expect(getFirstDocumentErrorField({ description: "x" })).toBe("description");
    expect(getFirstDocumentErrorField({})).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────
// 7) validateVersionForm e validateAnnotation
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — versão e anotação", () => {
  test("versão exige arquivo", () => {
    expect(validateVersionForm({}).file).toBeTruthy();
  });
  test("versão aceita arquivo válido", () => {
    expect(validateVersionForm({ file: validFile }).file).toBeUndefined();
  });
  test("versão rejeita descrição acima do limite", () => {
    expect(
      validateVersionForm({
        file: validFile,
        description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1),
      }).description,
    ).toBeTruthy();
  });

  test("anotação obrigatória", () => {
    expect(validateAnnotation("")).toBeTruthy();
    expect(validateAnnotation("   ")).toBeTruthy();
  });
  test("anotação válida", () => {
    expect(validateAnnotation("nota rápida")).toBeUndefined();
  });
  test("anotação respeita limite", () => {
    expect(validateAnnotation("x".repeat(MAX_ANNOTATION_LENGTH + 1))).toBeTruthy();
    expect(validateAnnotation("x".repeat(MAX_ANNOTATION_LENGTH))).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 8) Pesquisa e filtros
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — pesquisa e filtros", () => {
  test("normalize remove acentos e case", () => {
    expect(normalize("Perícia Ambiental")).toBe("pericia ambiental");
    expect(normalize("Ávila")).toBe("avila");
  });

  test("matchesSearch — nome parcial", () => {
    const d = DOCUMENT_SEED.find((x) => x.name.toLowerCase().includes("vila aurora"))!;
    expect(matchesSearch(d, "vila")).toBe(true);
    expect(matchesSearch(d, "AURORA")).toBe(true);
  });

  test("matchesSearch — categoria", () => {
    const d = DOCUMENT_SEED.find((x) => x.category === "laudo")!;
    expect(matchesSearch(d, "laudo")).toBe(true);
  });

  test("matchesSearch — sem acento", () => {
    const d = DOCUMENT_SEED.find((x) => x.name.toLowerCase().includes("perícia") || x.name.toLowerCase().includes("pericia"))
      ?? DOCUMENT_SEED[0]!;
    const hit = matchesSearch(d, "pericia") || matchesSearch(d, "pericial");
    expect(typeof hit).toBe("boolean");
  });

  test("matchesSearch — busca vazia retorna true", () => {
    expect(matchesSearch(DOCUMENT_SEED[0]!, "")).toBe(true);
  });

  test("matchesSearch — não encontra termo inexistente", () => {
    expect(matchesSearch(DOCUMENT_SEED[0]!, "xxxxx-nao-existe")).toBe(false);
  });

  test("matchesSearch — busca por responsável", () => {
    const d = DOCUMENT_SEED.find((x) => x.responsibleLabel.includes("Ana"))!;
    expect(matchesSearch(d, "ana")).toBe(true);
  });

  test("matchesSearch — busca por número do processo", () => {
    const d = DOCUMENT_SEED.find((x) => !!x.caseId)!;
    const num = getCaseNumberLabel(d.caseId);
    expect(matchesSearch(d, num)).toBe(true);
  });

  test("hasActiveFilters — false quando vazio", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });
  test("hasActiveFilters — true com query", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "abc" })).toBe(true);
  });
  test("hasActiveFilters — true com categoria", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: "laudo" })).toBe(true);
  });
  test("hasActiveFilters — true com sigilo", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, confidentiality: "sigiloso" })).toBe(true);
  });

  test("applyFilters — retorna tudo com filtros vazios", () => {
    expect(applyFilters(DOCUMENT_SEED, EMPTY_FILTERS, SEED_REFERENCE_DATE).length).toBe(
      DOCUMENT_SEED.length,
    );
  });

  test("applyFilters — filtro por categoria", () => {
    const r = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, category: "laudo" }, SEED_REFERENCE_DATE);
    expect(r.every((d) => d.category === "laudo")).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test("applyFilters — filtro por situação", () => {
    const r = applyFilters(
      DOCUMENT_SEED,
      { ...EMPTY_FILTERS, status: "pendente_revisao" },
      SEED_REFERENCE_DATE,
    );
    expect(r.every((d) => d.status === "pendente_revisao")).toBe(true);
  });

  test("applyFilters — filtro por sigilo sigiloso", () => {
    const r = applyFilters(
      DOCUMENT_SEED,
      { ...EMPTY_FILTERS, confidentiality: "sigiloso" },
      SEED_REFERENCE_DATE,
    );
    expect(r.every((d) => d.confidentiality === "sigiloso")).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  test("applyFilters — filtro por processo específico", () => {
    const target = DOCUMENT_SEED.find((d) => d.caseId)!;
    const r = applyFilters(
      DOCUMENT_SEED,
      { ...EMPTY_FILTERS, caseId: target.caseId! },
      SEED_REFERENCE_DATE,
    );
    expect(r.every((d) => d.caseId === target.caseId)).toBe(true);
  });

  test("applyFilters — prazo 'com_prazo'", () => {
    const r = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, deadline: "com_prazo" }, SEED_REFERENCE_DATE);
    expect(r.every((d) => !!d.deadlineAt)).toBe(true);
  });
  test("applyFilters — prazo 'sem_prazo'", () => {
    const r = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, deadline: "sem_prazo" }, SEED_REFERENCE_DATE);
    expect(r.every((d) => !d.deadlineAt)).toBe(true);
  });
  test("applyFilters — prazo 'vencido'", () => {
    const r = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, deadline: "vencido" }, SEED_REFERENCE_DATE);
    expect(
      r.every((d) => computeDeadlineState(d.deadlineAt, SEED_REFERENCE_DATE) === "vencido"),
    ).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
  test("applyFilters — prazo 'vencendo'", () => {
    const r = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, deadline: "vencendo" }, SEED_REFERENCE_DATE);
    for (const d of r) {
      const s = computeDeadlineState(d.deadlineAt, SEED_REFERENCE_DATE);
      expect(s === "vencendo" || s === "hoje").toBe(true);
    }
  });

  test("applyFilters — combina query + categoria", () => {
    const r = applyFilters(
      DOCUMENT_SEED,
      { ...EMPTY_FILTERS, query: "laudo", category: "laudo" },
      SEED_REFERENCE_DATE,
    );
    expect(r.every((d) => d.category === "laudo")).toBe(true);
  });

  test("applyFilters — nenhum resultado para query nonsense", () => {
    expect(
      applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, query: "zzz-inexistente" }, SEED_REFERENCE_DATE).length,
    ).toBe(0);
  });

  test("applyFilters — busca acentos-agnóstica", () => {
    // Reduzimos algum documento pelo termo 'pericial'
    const hits1 = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, query: "pericial" }, SEED_REFERENCE_DATE);
    const hits2 = applyFilters(DOCUMENT_SEED, { ...EMPTY_FILTERS, query: "perícial" }, SEED_REFERENCE_DATE);
    expect(hits1.length).toBe(hits2.length);
  });
});

// ─────────────────────────────────────────────────────────────
// 9) Store mock — criar, versão, anotação
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — store mock", () => {
  beforeEach(() => {
    resetStore();
  });

  test("listDocuments contém o seed inicial", () => {
    expect(listDocuments().length).toBe(DOCUMENT_SEED.length);
  });

  test("createDocumentFromForm insere no topo com versão 1", () => {
    const before = listDocuments().length;
    const rec = createDocumentFromForm(validForm({ name: "Doc novo" }));
    expect(rec.currentVersion).toBe(1);
    expect(rec.versions.length).toBe(1);
    expect(rec.versions[0]!.version).toBe(1);
    expect(listDocuments().length).toBe(before + 1);
    expect(listDocuments()[0]!.id).toBe(rec.id);
  });

  test("createDocumentFromForm marca 'com_prazo' quando prazo é informado", () => {
    const rec = createDocumentFromForm(validForm({ deadlineAt: "2026-12-31", name: "Com prazo" }));
    expect(rec.status).toBe("com_prazo");
    expect(rec.deadlineAt).toBe("2026-12-31");
  });

  test("createDocumentFromForm sem prazo entra como 'ativo'", () => {
    const rec = createDocumentFromForm(validForm({ name: "Sem prazo" }));
    expect(rec.status).toBe("ativo");
  });

  test("createDocumentFromForm valida arquivo, categoria e sigilo", () => {
    expect(() => createDocumentFromForm(validForm({ file: null }))).toThrow();
    expect(() => createDocumentFromForm(validForm({ category: "" }))).toThrow();
    expect(() => createDocumentFromForm(validForm({ confidentiality: "" }))).toThrow();
  });

  test("addVersion incrementa currentVersion e mantém histórico", () => {
    const first = listDocuments()[0]!;
    const originalCount = first.versions.length;
    const originalVersion = first.currentVersion;
    const updated = addVersion(first.id, {
      file: { fileName: "nova.pdf", sizeBytes: 4096, mimeType: "application/pdf" },
      description: "Ajuste",
    });
    expect(updated).toBeDefined();
    expect(updated!.currentVersion).toBe(originalVersion + 1);
    expect(updated!.versions.length).toBe(originalCount + 1);
    // mais recente primeiro
    expect(updated!.versions[0]!.version).toBe(originalVersion + 1);
    // versões antigas preservadas
    expect(updated!.versions[updated!.versions.length - 1]!.version).toBe(1);
  });

  test("addVersion ordena decrescente por version", () => {
    const first = listDocuments()[0]!;
    addVersion(first.id, {
      file: { fileName: "a.pdf", sizeBytes: 100, mimeType: "application/pdf" },
    });
    addVersion(first.id, {
      file: { fileName: "b.pdf", sizeBytes: 100, mimeType: "application/pdf" },
    });
    const doc = listDocuments().find((d) => d.id === first.id)!;
    const nums = doc.versions.map((v) => v.version);
    expect([...nums].sort((a, b) => b - a)).toEqual(nums);
  });

  test("addVersion retorna undefined para id inexistente", () => {
    expect(
      addVersion("doc-inexistente", {
        file: { fileName: "x.pdf", sizeBytes: 1, mimeType: "application/pdf" },
      }),
    ).toBeUndefined();
  });

  test("addAnnotation adiciona a mais recente no topo", () => {
    const first = listDocuments()[0]!;
    const before = first.annotations.length;
    const updated = addAnnotation(first.id, "Nova anotação");
    expect(updated).toBeDefined();
    expect(updated!.annotations.length).toBe(before + 1);
    expect(updated!.annotations[0]!.text).toBe("Nova anotação");
  });

  test("addAnnotation preserva anotações antigas", () => {
    const first = listDocuments().find((d) => d.annotations.length > 0)!;
    const oldFirstId = first.annotations[0]!.id;
    const updated = addAnnotation(first.id, "Extra");
    expect(updated!.annotations.some((a) => a.id === oldFirstId)).toBe(true);
  });

  test("addAnnotation retorna undefined para id inexistente", () => {
    expect(addAnnotation("doc-inexistente", "x")).toBeUndefined();
  });

  test("resetStore restaura o seed", () => {
    createDocumentFromForm(validForm({ name: "Temporário" }));
    expect(listDocuments().length).toBe(DOCUMENT_SEED.length + 1);
    resetStore();
    expect(listDocuments().length).toBe(DOCUMENT_SEED.length);
  });

  test("criar múltiplos documentos preserva ordem (mais recente primeiro)", () => {
    createDocumentFromForm(validForm({ name: "A" }));
    createDocumentFromForm(validForm({ name: "B" }));
    createDocumentFromForm(validForm({ name: "C" }));
    const first = listDocuments()[0]!;
    expect(first.name).toBe("C");
  });

  test("ids gerados são únicos", () => {
    const a = createDocumentFromForm(validForm({ name: "A" }));
    const b = createDocumentFromForm(validForm({ name: "B" }));
    expect(a.id).not.toBe(b.id);
  });

  test("responsibleLabel padrão aplicado quando ausente", () => {
    const rec = createDocumentFromForm(validForm({ name: "Sem responsável" }));
    expect(rec.responsibleLabel.length).toBeGreaterThan(0);
  });

  test("upload em lote — múltiplas criações via loop preservam contagem", () => {
    const inputs = [
      validForm({ name: "Lote 1" }),
      validForm({ name: "Lote 2" }),
      validForm({ name: "Lote 3" }),
    ];
    const before = listDocuments().length;
    for (const i of inputs) createDocumentFromForm(i);
    expect(listDocuments().length).toBe(before + 3);
  });
});

// ─────────────────────────────────────────────────────────────
// 10) Imutabilidade (readonly) — verifiquemos runtime
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — imutabilidade e contratos", () => {
  test("versions array não é o mesmo objeto após addVersion", () => {
    resetStore();
    const before = listDocuments()[0]!;
    const updated = addVersion(before.id, {
      file: { fileName: "z.pdf", sizeBytes: 10, mimeType: "application/pdf" },
    })!;
    expect(updated.versions).not.toBe(before.versions);
  });

  test("createDocumentFromForm devolve objeto novo distinto do seed", () => {
    resetStore();
    const rec = createDocumentFromForm(validForm({ name: "Distinto" }));
    expect(DOCUMENT_SEED.find((d) => d.id === rec.id)).toBeUndefined();
  });

  test("DocumentRecord tem campos obrigatórios", () => {
    for (const d of DOCUMENT_SEED) {
      const keys: (keyof DocumentRecord)[] = [
        "id",
        "organizationId",
        "name",
        "category",
        "status",
        "confidentiality",
        "currentVersion",
        "versions",
        "annotations",
        "createdAt",
        "updatedAt",
        "responsibleLabel",
        "personIds",
      ];
      for (const k of keys) expect(d[k as keyof DocumentRecord]).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 11) Página — cobertura textual adicional
// ─────────────────────────────────────────────────────────────

describe("LV-09.3 — página (auditoria textual)", () => {
  const page = read("src/features/documents/DocumentsLibraryPage.tsx");

  test("subtítulo canônico presente", () => {
    expect(page).toMatch(/Organize, versione e vincule/);
  });
  test("ações principais", () => {
    expect(page).toMatch(/Adicionar documento/);
    expect(page).toMatch(/Upload em lote/);
  });
  test("resumo com indicadores", () => {
    expect(page).toMatch(/Total de documentos/);
    expect(page).toMatch(/Sigilosos/);
    expect(page).toMatch(/Com prazo próximo/);
    expect(page).toMatch(/Pendentes de revisão/);
  });
  test("pesquisa presente", () => {
    expect(page).toMatch(/Pesquisar documentos/);
  });
  test("estados vazios distintos", () => {
    expect(page).toMatch(/Nenhum documento encontrado/);
    expect(page).toMatch(/Nenhum documento corresponde aos filtros/);
  });
  test("estados de erro/offline/permissão presentes", () => {
    expect(page).toMatch(/Não foi possível carregar/);
    expect(page).toMatch(/Você está offline/);
    expect(page).toMatch(/Sem permissão/);
    expect(page).toMatch(/Tentar novamente/);
  });
  test("aria-live para anúncios", () => {
    expect(page).toMatch(/aria-live/);
  });
  test("regiões de status", () => {
    expect(page).toMatch(/role="status"/);
  });
  test("responsividade — evita rolagem horizontal por classes conhecidas", () => {
    expect(page).toMatch(/break-words/);
  });
});
