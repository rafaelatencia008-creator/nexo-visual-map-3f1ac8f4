/**
 * LV-09.4 — Visualizador documental (mock).
 *
 * Cobertura: helpers puros de prévia, determinismo por (documentId, versionId),
 * zoom, rotação, paginação, miniaturas, classificação por tipo, estados,
 * ausência de rota nova, ausência de backend/chamada externa, integrações
 * de UI (Library page + DetailDialog + Viewer).
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyPreview,
  buildTextPage,
  buildSheetPreview,
  buildImagePreview,
  buildAudioPreview,
  buildVideoPreview,
  buildThumbnails,
  clampPage,
  clampZoom,
  DEFAULT_ZOOM,
  fitWidthZoom,
  formatPageIndicator,
  getPreviewPageCount,
  hashString,
  isValidRotation,
  MAX_ZOOM,
  MIN_ZOOM,
  nextRotation,
  PREVIEW_DEMO_NOTICE,
  PREVIEW_KIND_LABEL,
  PREVIEW_STATUS_LABEL,
  previewSeed,
  ROTATIONS,
  seededRandom,
  ZOOM_STEP,
  ZOOM_STEPS,
  zoomIn,
  zoomOut,
} from "../src/features/documents/document-preview";
import { DOCUMENT_SEED } from "../src/features/documents/document-mock-store";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}
const has = (rel: string) => existsSync(resolve(process.cwd(), rel));

// ─────────────────────────────────────────────────────────────
// 1) Auditoria estática — sem nova rota, sem backend
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — auditoria estática", () => {
  test("componente DocumentViewerDialog existe", () => {
    expect(has("src/features/documents/DocumentViewerDialog.tsx")).toBe(true);
  });

  test("helpers puros de prévia existem", () => {
    expect(has("src/features/documents/document-preview.ts")).toBe(true);
  });

  test("nenhuma rota nova foi criada para o visualizador", () => {
    const forbidden = [
      "src/routes/app.documentos.visualizar.tsx",
      "src/routes/app.documentos.viewer.tsx",
      "src/routes/app.documentos.$documentId.tsx",
      "src/routes/app.documentos.$documentId.visualizar.tsx",
      "src/routes/app.documentos.$documentId.versoes.$versionId.tsx",
    ];
    for (const rel of forbidden) {
      expect(has(rel)).toBe(false);
    }
  });

  test("visualizador não faz fetch, XHR ou WebSocket", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/XMLHttpRequest/);
    expect(src).not.toMatch(/new\s+WebSocket/);
    expect(src).not.toMatch(/EventSource/);
  });

  test("visualizador não usa Math.random / crypto.randomUUID / Date.now para prévia", () => {
    const src = read("src/features/documents/document-preview.ts");
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/randomUUID/);
    expect(src).not.toMatch(/Date\.now/);
  });

  test("nenhuma referência a supabase, storage ou upload no visualizador", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    expect(src).not.toMatch(/supabase/i);
    expect(src).not.toMatch(/uploadFile/i);
    expect(src).not.toMatch(/createServerFn/);
  });

  test("visualizador declara o aviso demonstrativo obrigatório", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    expect(src).toMatch(/PREVIEW_DEMO_NOTICE/);
  });

  test("visualizador expõe controles nomeados (aria-label)", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    for (const label of [
      "Página anterior",
      "Próxima página",
      "Zoom menos",
      "Zoom mais",
      "Ajustar à largura",
      "Rotacionar 90 graus",
      "Tela cheia",
      "Fechar visualizador",
    ]) {
      expect(src).toContain(label);
    }
  });

  test("visualizador possui aria-live e aria-busy", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    expect(src).toMatch(/aria-live/);
    expect(src).toMatch(/aria-busy/);
  });

  test("DEC-DOC-002 registrada com pontos exigidos", () => {
    const dec = read("docs/decisions/DEC-DOC-002-visualizador-documental-mock.md");
    expect(dec).toMatch(/LV-09\.4/);
    expect(dec).toMatch(/mock/i);
    expect(dec).toMatch(/determin/i);
    expect(dec).toMatch(/rota/i);
    expect(dec).toMatch(/storage/i);
  });

  test("página integra o visualizador", () => {
    const src = read("src/features/documents/DocumentsLibraryPage.tsx");
    expect(src).toMatch(/DocumentViewerDialog/);
    expect(src).toMatch(/Visualizar conteúdo/);
  });

  test("detalhe integra visualização por versão", () => {
    const src = read("src/features/documents/DocumentDetailDialog.tsx");
    expect(src).toMatch(/Visualizar versão/);
    expect(src).toMatch(/Visualizar conteúdo/);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Classificação por tipo
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — classifyPreview", () => {
  test("pdf → text", () => expect(classifyPreview("a.pdf")).toBe("text"));
  test("doc → text", () => expect(classifyPreview("a.doc")).toBe("text"));
  test("docx → text", () => expect(classifyPreview("a.docx")).toBe("text"));
  test("txt → text", () => expect(classifyPreview("a.txt")).toBe("text"));
  test("xls → sheet", () => expect(classifyPreview("a.xls")).toBe("sheet"));
  test("xlsx → sheet", () => expect(classifyPreview("a.xlsx")).toBe("sheet"));
  test("jpg → image", () => expect(classifyPreview("a.jpg")).toBe("image"));
  test("jpeg → image", () => expect(classifyPreview("a.jpeg")).toBe("image"));
  test("png → image", () => expect(classifyPreview("a.PNG")).toBe("image"));
  test("mp3 → audio", () => expect(classifyPreview("a.mp3")).toBe("audio"));
  test("wav → audio", () => expect(classifyPreview("a.wav")).toBe("audio"));
  test("mp4 → video", () => expect(classifyPreview("a.mp4")).toBe("video"));
  test("mov → video", () => expect(classifyPreview("a.mov")).toBe("video"));
  test("desconhecido → unsupported", () =>
    expect(classifyPreview("a.zip")).toBe("unsupported"));
  test("fallback por mime image/*", () =>
    expect(classifyPreview("x", "image/png")).toBe("image"));
  test("fallback por mime application/pdf", () =>
    expect(classifyPreview("x", "application/pdf")).toBe("text"));
  test("fallback por mime spreadsheet", () =>
    expect(classifyPreview("x", "application/vnd.ms-excel")).toBe("sheet"));
});

// ─────────────────────────────────────────────────────────────
// 3) Hash / PRNG / seed determinístico
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — hash e seed", () => {
  test("hashString é determinístico", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
  });
  test("hashString diferencia entradas", () => {
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
  test("previewSeed determinístico", () => {
    expect(previewSeed("doc", "ver", 3)).toBe(previewSeed("doc", "ver", 3));
  });
  test("previewSeed diferencia por página", () => {
    expect(previewSeed("doc", "ver", 1)).not.toBe(previewSeed("doc", "ver", 2));
  });
  test("previewSeed diferencia por versão", () => {
    expect(previewSeed("doc", "v1", 0)).not.toBe(previewSeed("doc", "v2", 0));
  });
  test("seededRandom repete a mesma sequência para o mesmo seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 8; i += 1) expect(a()).toBe(b());
  });
  test("seededRandom devolve valores em [0,1)", () => {
    const r = seededRandom(1);
    for (let i = 0; i < 32; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 4) Zoom
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — zoom", () => {
  test("DEFAULT_ZOOM é 100", () => expect(DEFAULT_ZOOM).toBe(100));
  test("MIN_ZOOM e MAX_ZOOM coerentes", () => {
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
  });
  test("clampZoom limita inferior", () => expect(clampZoom(10)).toBe(MIN_ZOOM));
  test("clampZoom limita superior", () =>
    expect(clampZoom(9999)).toBe(MAX_ZOOM));
  test("clampZoom aceita valores no meio", () =>
    expect(clampZoom(120)).toBe(120));
  test("clampZoom trata NaN", () =>
    expect(clampZoom(Number.NaN)).toBe(DEFAULT_ZOOM));
  test("zoomIn incrementa por ZOOM_STEP", () =>
    expect(zoomIn(100)).toBe(100 + ZOOM_STEP));
  test("zoomOut decrementa por ZOOM_STEP", () =>
    expect(zoomOut(100)).toBe(100 - ZOOM_STEP));
  test("zoomIn não passa de MAX_ZOOM", () =>
    expect(zoomIn(MAX_ZOOM)).toBe(MAX_ZOOM));
  test("zoomOut não passa de MIN_ZOOM", () =>
    expect(zoomOut(MIN_ZOOM)).toBe(MIN_ZOOM));
  test("ZOOM_STEPS ordenado e único", () => {
    const sorted = [...ZOOM_STEPS].sort((a, b) => a - b);
    expect(ZOOM_STEPS).toEqual(sorted);
    expect(new Set(ZOOM_STEPS).size).toBe(ZOOM_STEPS.length);
  });
  test("fitWidthZoom com container 0 → default", () =>
    expect(fitWidthZoom(0)).toBe(DEFAULT_ZOOM));
  test("fitWidthZoom respeita limites", () => {
    expect(fitWidthZoom(80)).toBe(MIN_ZOOM);
    expect(fitWidthZoom(9999)).toBe(MAX_ZOOM);
  });
  test("fitWidthZoom coerente com base", () =>
    expect(fitWidthZoom(800, 800)).toBe(100));
});

// ─────────────────────────────────────────────────────────────
// 5) Rotação
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — rotação", () => {
  test("ROTATIONS é [0, 90, 180, 270]", () =>
    expect(ROTATIONS).toEqual([0, 90, 180, 270]));
  test("isValidRotation aceita valores da lista", () => {
    for (const r of ROTATIONS) expect(isValidRotation(r)).toBe(true);
  });
  test("isValidRotation rejeita outros", () => {
    expect(isValidRotation(45)).toBe(false);
    expect(isValidRotation(360)).toBe(false);
  });
  test("nextRotation cicla 0→90→180→270→0", () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(90)).toBe(180);
    expect(nextRotation(180)).toBe(270);
    expect(nextRotation(270)).toBe(0);
  });
  test("nextRotation com valor inválido volta a 90", () => {
    expect(nextRotation(45)).toBe(90);
  });
});

// ─────────────────────────────────────────────────────────────
// 6) Paginação
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — paginação", () => {
  test("clampPage limita inferior", () => expect(clampPage(0, 5)).toBe(1));
  test("clampPage limita superior", () => expect(clampPage(9, 5)).toBe(5));
  test("clampPage retorna 0 quando total 0", () =>
    expect(clampPage(1, 0)).toBe(0));
  test("clampPage trata NaN", () =>
    expect(clampPage(Number.NaN, 5)).toBe(1));
  test("clampPage floor de decimais", () =>
    expect(clampPage(2.9, 5)).toBe(2));
  test("formatPageIndicator com total > 0", () =>
    expect(formatPageIndicator(2, 5)).toBe("Página 2 de 5"));
  test("formatPageIndicator com total 0", () =>
    expect(formatPageIndicator(0, 0)).toBe("Sem páginas"));
});

// ─────────────────────────────────────────────────────────────
// 7) Contagem de páginas e miniaturas
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — contagem de páginas", () => {
  test("unsupported → 0 páginas", () =>
    expect(getPreviewPageCount("unsupported", "d", "v")).toBe(0));
  test("image → 1 página", () =>
    expect(getPreviewPageCount("image", "d", "v")).toBe(1));
  test("audio → 1 página", () =>
    expect(getPreviewPageCount("audio", "d", "v")).toBe(1));
  test("video → 1 página", () =>
    expect(getPreviewPageCount("video", "d", "v")).toBe(1));
  test("sheet → 1 página", () =>
    expect(getPreviewPageCount("sheet", "d", "v")).toBe(1));
  test("text entre 3 e 8", () => {
    for (const doc of DOCUMENT_SEED) {
      for (const v of doc.versions) {
        const kind = classifyPreview(v.fileName, v.mimeType);
        if (kind === "text") {
          const n = getPreviewPageCount(kind, doc.id, v.id);
          expect(n).toBeGreaterThanOrEqual(3);
          expect(n).toBeLessThanOrEqual(8);
        }
      }
    }
  });
  test("text é determinístico entre chamadas", () => {
    const a = getPreviewPageCount("text", "doc-01", "ver-01");
    const b = getPreviewPageCount("text", "doc-01", "ver-01");
    expect(a).toBe(b);
  });
  test("buildThumbnails gera N miniaturas", () => {
    const t = buildThumbnails(5);
    expect(t.length).toBe(5);
    expect(t[0]!.index).toBe(1);
    expect(t[4]!.index).toBe(5);
    expect(t[0]!.label).toContain("Miniatura da página 1");
  });
  test("buildThumbnails com 0 → vazio", () =>
    expect(buildThumbnails(0)).toEqual([]));
});

// ─────────────────────────────────────────────────────────────
// 8) Builders por tipo — determinismo e forma
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — builders de prévia", () => {
  test("buildTextPage é determinístico", () => {
    const a = buildTextPage("doc-01", "ver-a", 0);
    const b = buildTextPage("doc-01", "ver-a", 0);
    expect(a).toEqual(b);
  });
  test("buildTextPage varia por página", () => {
    const a = buildTextPage("doc-01", "ver-a", 0);
    const b = buildTextPage("doc-01", "ver-a", 1);
    expect(a.title !== b.title || a.paragraphs.join() !== b.paragraphs.join()).toBe(true);
  });
  test("buildTextPage varia por versão", () => {
    const a = buildTextPage("doc-01", "ver-a", 0);
    const b = buildTextPage("doc-01", "ver-b", 0);
    expect(a.paragraphs.join()).not.toBe(b.paragraphs.join());
  });
  test("buildTextPage possui título e 3–5 parágrafos", () => {
    const p = buildTextPage("d", "v", 0);
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(p.paragraphs.length).toBeLessThanOrEqual(5);
  });
  test("buildSheetPreview possui headers e rows", () => {
    const s = buildSheetPreview("d", "v");
    expect(s.headers.length).toBeGreaterThan(0);
    expect(s.rows.length).toBeGreaterThanOrEqual(8);
    expect(s.rows.length).toBeLessThanOrEqual(12);
    for (const row of s.rows) expect(row.length).toBe(s.headers.length);
  });
  test("buildSheetPreview é determinístico", () => {
    expect(buildSheetPreview("d", "v")).toEqual(buildSheetPreview("d", "v"));
  });
  test("buildImagePreview hue em [0, 359]", () => {
    const img = buildImagePreview("d", "v");
    expect(img.hue).toBeGreaterThanOrEqual(0);
    expect(img.hue).toBeLessThan(360);
    expect(img.hue2).toBeGreaterThanOrEqual(0);
    expect(img.hue2).toBeLessThan(360);
  });
  test("buildImagePreview determinístico", () => {
    expect(buildImagePreview("d", "v")).toEqual(buildImagePreview("d", "v"));
  });
  test("buildAudioPreview durationLabel mm:ss", () => {
    const a = buildAudioPreview("d", "v");
    expect(a.durationLabel).toMatch(/^\d{2}:\d{2}$/);
    expect(a.waveform.length).toBe(48);
    for (const w of a.waveform) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(1.01);
    }
  });
  test("buildVideoPreview durationLabel mm:ss e hue válido", () => {
    const v = buildVideoPreview("d", "v");
    expect(v.durationLabel).toMatch(/^\d{2}:\d{2}$/);
    expect(v.hue).toBeGreaterThanOrEqual(0);
    expect(v.hue).toBeLessThan(360);
  });
  test("prévias diferem entre documentos distintos", () => {
    const a = buildImagePreview("doc-01", "v");
    const b = buildImagePreview("doc-02", "v");
    expect(a.hue === b.hue && a.hue2 === b.hue2).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 9) Determinismo aplicado ao seed
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — determinismo sobre o seed", () => {
  test("seed possui 12 documentos", () =>
    expect(DOCUMENT_SEED.length).toBe(12));

  test("cada versão do seed classifica em algum tipo (não lança)", () => {
    for (const doc of DOCUMENT_SEED) {
      for (const v of doc.versions) {
        const kind = classifyPreview(v.fileName, v.mimeType);
        expect(PREVIEW_KIND_LABEL[kind]).toBeDefined();
      }
    }
  });

  test("cada versão do seed produz a mesma prévia entre chamadas", () => {
    for (const doc of DOCUMENT_SEED.slice(0, 6)) {
      const v = doc.versions[0]!;
      const kind = classifyPreview(v.fileName, v.mimeType);
      const n = getPreviewPageCount(kind, doc.id, v.id);
      expect(n).toBe(getPreviewPageCount(kind, doc.id, v.id));
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 10) Rótulos e estados
// ─────────────────────────────────────────────────────────────

describe("LV-09.4 — rótulos e estados", () => {
  test("PREVIEW_KIND_LABEL cobre os 6 tipos", () => {
    for (const k of ["text", "sheet", "image", "audio", "video", "unsupported"] as const) {
      expect(PREVIEW_KIND_LABEL[k]).toBeTruthy();
    }
  });
  test("PREVIEW_STATUS_LABEL cobre os estados exigidos", () => {
    expect(PREVIEW_STATUS_LABEL.preparing).toMatch(/Preparando/);
    expect(PREVIEW_STATUS_LABEL.ready).toMatch(/Prévia disponível/);
    expect(PREVIEW_STATUS_LABEL.unsupported).toMatch(/Formato sem prévia/);
    expect(PREVIEW_STATUS_LABEL.error).toMatch(/Não foi possível/);
    expect(PREVIEW_STATUS_LABEL.offline).toMatch(/offline/i);
    expect(PREVIEW_STATUS_LABEL.forbidden).toMatch(/Sem permissão/);
  });
  test("Aviso demonstrativo obrigatório", () => {
    expect(PREVIEW_DEMO_NOTICE).toMatch(/Prévia demonstrativa/);
    expect(PREVIEW_DEMO_NOTICE).toMatch(/não está armazenado/i);
  });
  test("visualizador expõe 'Tentar novamente'", () => {
    const src = read("src/features/documents/DocumentViewerDialog.tsx");
    expect(src).toMatch(/Tentar novamente/);
  });
});
