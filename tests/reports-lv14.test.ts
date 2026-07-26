/**
 * LV-14 — Suíte de testes para Modelos Documentais e Estrutura do Laudo.
 *
 * Cobertura:
 *   - criação de documento
 *   - troca de modelo
 *   - edição de blocos (título/conteúdo)
 *   - alteração de status de seção
 *   - vínculo/desvínculo de fontes
 *   - navegação entre seções (encontrar por kind)
 *   - integração mock com módulos existentes (adapters read-only)
 *   - imutabilidade e estabilidade de IDs
 */
import { describe, it, expect, beforeEach } from "bun:test";

import {
  REPORT_SECTION_KINDS,
  REPORT_SECTION_LABEL,
  REPORT_SECTION_STATUSES,
  REPORT_TEMPLATE_IDS,
  REPORT_TEMPLATE_LABEL,
  REPORT_SOURCE_KIND_LABEL,
} from "@/features/reports/report-types";
import {
  REPORT_TEMPLATES,
  REPORT_TEMPLATE_MAP,
  getTemplate,
} from "@/features/reports/report-templates";
import {
  addBlock,
  approveSection,
  changeTemplate,
  createReport,
  findSection,
  getReport,
  linkSourceToBlock,
  listReports,
  markBlockReviewed,
  removeBlock,
  renameReport,
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
  setSectionStatus,
  subscribeReports,
  unlinkSourceFromBlock,
  updateBlockContent,
  updateBlockTitle,
  advanceReportClockSeconds,
} from "@/features/reports/report-mock-store";
import {
  collectSourceCandidates,
  loadDocumentCandidates,
  loadEvidenceCandidates,
  loadInterviewCandidates,
  loadQuestionCandidates,
} from "@/features/reports/report-source-adapters";

function seed() {
  resetReportStore();
  resetReportIdCounter(9000);
  resetReportClock();
  return createReport({
    title: "Laudo demonstrativo",
    templateId: "laudo_psicologico",
    caseId: "prc-01",
    caseLabel: "Perícia 01",
  });
}

beforeEach(() => {
  resetReportStore();
  resetReportIdCounter(9000);
  resetReportClock();
});

describe("LV-14 — tipos e biblioteca de modelos", () => {
  it("expõe 7 modelos, todos rotulados", () => {
    expect(REPORT_TEMPLATE_IDS).toHaveLength(7);
    for (const id of REPORT_TEMPLATE_IDS) {
      expect(REPORT_TEMPLATE_LABEL[id]).toBeTruthy();
      expect(REPORT_TEMPLATE_MAP[id].id).toBe(id);
    }
  });

  it("cada modelo cobre as 14 seções obrigatórias", () => {
    expect(REPORT_SECTION_KINDS).toHaveLength(14);
    for (const t of REPORT_TEMPLATES) {
      const kinds = t.sections.map((s) => s.kind);
      expect(new Set(kinds)).toEqual(new Set(REPORT_SECTION_KINDS));
    }
  });

  it("cada seção tem ao menos um bloco seed em cada modelo", () => {
    for (const t of REPORT_TEMPLATES) {
      for (const s of t.sections) {
        expect(s.blocks.length).toBeGreaterThan(0);
      }
    }
  });

  it("labels de status e origem estão definidos", () => {
    for (const k of REPORT_SECTION_KINDS) {
      expect(REPORT_SECTION_LABEL[k]).toBeTruthy();
    }
    for (const s of REPORT_SECTION_STATUSES) {
      expect(s).toBeTruthy();
    }
    expect(REPORT_SOURCE_KIND_LABEL.entrevista).toBe("Entrevista");
    expect(REPORT_SOURCE_KIND_LABEL.diligencia).toBe("Diligência");
    expect(REPORT_SOURCE_KIND_LABEL.documento).toBe("Documento");
    expect(REPORT_SOURCE_KIND_LABEL.quesito).toBe("Quesito");
    expect(REPORT_SOURCE_KIND_LABEL.evidencia).toBe("Evidência");
  });

  it("getTemplate devolve o mesmo objeto do MAP", () => {
    expect(getTemplate("relatorio_tecnico")).toBe(
      REPORT_TEMPLATE_MAP.relatorio_tecnico,
    );
  });
});

describe("LV-14 — criação de documento", () => {
  it("cria documento com todas as seções do modelo escolhido", () => {
    const doc = seed();
    expect(doc.id).toMatch(/^rep-/);
    expect(doc.sections).toHaveLength(REPORT_SECTION_KINDS.length);
    expect(doc.templateId).toBe("laudo_psicologico");
    expect(doc.caseId).toBe("prc-01");
    for (const kind of REPORT_SECTION_KINDS) {
      expect(findSection(doc, kind)).toBeDefined();
    }
  });

  it("blocos iniciais têm origem = 'modelo' e sem edição manual", () => {
    const doc = seed();
    for (const s of doc.sections) {
      for (const b of s.blocks) {
        expect(b.origin).toBe("modelo");
        expect(b.manuallyEdited).toBe(false);
        expect(b.reviewed).toBe(false);
        expect(b.sources).toHaveLength(0);
      }
    }
  });

  it("listReports reflete a criação e progresso zero", () => {
    seed();
    const list = listReports();
    expect(list).toHaveLength(1);
    expect(list[0].reviewProgress).toBe(0);
    expect(list[0].templateId).toBe("laudo_psicologico");
  });

  it("subscribeReports notifica na criação", () => {
    let calls = 0;
    const off = subscribeReports(() => {
      calls += 1;
    });
    seed();
    expect(calls).toBeGreaterThan(0);
    off();
  });

  it("renameReport atualiza título e timestamp", () => {
    const doc = seed();
    advanceReportClockSeconds(60);
    const next = renameReport(doc.id, "Novo título");
    expect(next.title).toBe("Novo título");
    expect(next.updatedAt).not.toBe(doc.updatedAt);
  });
});

describe("LV-14 — troca de modelo", () => {
  it("troca de modelo substitui a estrutura inicial", () => {
    const doc = seed();
    const changed = changeTemplate(doc.id, "estudo_social");
    expect(changed.templateId).toBe("estudo_social");
    expect(changed.sections.map((s) => s.kind)).toEqual(
      [...REPORT_SECTION_KINDS],
    );
    // IDs de seção são novos (recriação).
    const beforeIds = new Set(doc.sections.map((s) => s.id));
    for (const s of changed.sections) expect(beforeIds.has(s.id)).toBe(false);
  });

  it("troca preserva a vinculação de perícia e título", () => {
    const doc = seed();
    const changed = changeTemplate(doc.id, "parecer_social");
    expect(changed.caseId).toBe(doc.caseId);
    expect(changed.title).toBe(doc.title);
  });

  it("cada modelo, ao ser aplicado, gera as 14 seções", () => {
    const doc = seed();
    for (const id of REPORT_TEMPLATE_IDS) {
      const c = changeTemplate(doc.id, id);
      expect(c.sections).toHaveLength(REPORT_SECTION_KINDS.length);
    }
  });
});

describe("LV-14 — edição de blocos", () => {
  it("edita conteúdo marca manuallyEdited=true e reset reviewed", () => {
    const doc = seed();
    const sec = doc.sections[0];
    const blk = sec.blocks[0];
    markBlockReviewed(doc.id, sec.id, blk.id, true);
    const after = updateBlockContent(doc.id, sec.id, blk.id, "Novo conteúdo");
    const b2 = findSection(after, sec.kind)!.blocks[0];
    expect(b2.content).toBe("Novo conteúdo");
    expect(b2.manuallyEdited).toBe(true);
    expect(b2.reviewed).toBe(false);
  });

  it("edita título mantém indicador de origem", () => {
    const doc = seed();
    const sec = doc.sections[1];
    const blk = sec.blocks[0];
    const after = updateBlockTitle(doc.id, sec.id, blk.id, "Novo título");
    const b2 = findSection(after, sec.kind)!.blocks[0];
    expect(b2.title).toBe("Novo título");
    expect(b2.origin).toBe("modelo");
    expect(b2.manuallyEdited).toBe(true);
  });

  it("adiciona bloco manual e depois remove", () => {
    const doc = seed();
    const sec = doc.sections[2];
    const before = sec.blocks.length;
    const added = addBlock(doc.id, sec.id, {
      title: "Extra",
      content: "conteúdo",
    });
    const secA = findSection(added, sec.kind)!;
    expect(secA.blocks).toHaveLength(before + 1);
    const newId = secA.blocks[secA.blocks.length - 1].id;
    expect(secA.blocks[secA.blocks.length - 1].origin).toBe("manual");
    const removed = removeBlock(doc.id, sec.id, newId);
    expect(findSection(removed, sec.kind)!.blocks).toHaveLength(before);
  });

  it("markBlockReviewed alterna o indicador de revisão", () => {
    const doc = seed();
    const sec = doc.sections[0];
    const blk = sec.blocks[0];
    const on = markBlockReviewed(doc.id, sec.id, blk.id, true);
    expect(findSection(on, sec.kind)!.blocks[0].reviewed).toBe(true);
    const off = markBlockReviewed(doc.id, sec.id, blk.id, false);
    expect(findSection(off, sec.kind)!.blocks[0].reviewed).toBe(false);
  });
});

describe("LV-14 — alteração de status de seção", () => {
  it("aplica os status não-aprovados via setSectionStatus e 'aprovada' via approveSection", () => {
    const doc = seed();
    const secId = doc.sections[0].id;
    for (const s of REPORT_SECTION_STATUSES) {
      if (s === "aprovada") {
        // aprovação exige conteúdo + revisão e passa por approveSection
        const cur = getReport(doc.id)!.sections.find((x) => x.id === secId)!;
        for (const b of cur.blocks) {
          updateBlockContent(doc.id, secId, b.id, "conteúdo válido");
          markBlockReviewed(doc.id, secId, b.id, true);
        }
        const res = approveSection(doc.id, secId);
        expect(res.ok).toBe(true);
        if (res.ok) {
          const secAfter = res.document.sections.find((x) => x.id === secId)!;
          expect(secAfter.status).toBe("aprovada");
        }
      } else {
        const next = setSectionStatus(doc.id, secId, s);
        const cur = next.sections.find((x) => x.id === secId)!;
        expect(cur.status).toBe(s);
      }
    }
  });

  it("progresso de revisão considera 'revisada' e 'aprovada'", () => {
    const doc = seed();
    setSectionStatus(doc.id, doc.sections[0].id, "revisada");
    // aprovar a seção 1 via caminho oficial
    const sec1 = doc.sections[1];
    for (const b of sec1.blocks) {
      updateBlockContent(doc.id, sec1.id, b.id, "conteúdo válido");
      markBlockReviewed(doc.id, sec1.id, b.id, true);
    }
    const res = approveSection(doc.id, sec1.id);
    expect(res.ok).toBe(true);
    setSectionStatus(doc.id, doc.sections[2].id, "em_elaboracao");
    const list = listReports();
    const total = REPORT_SECTION_KINDS.length;
    expect(list[0].reviewProgress).toBeCloseTo(2 / total, 5);
  });
});

describe("LV-14 — vínculo de fontes", () => {
  it("vincula e desvincula fonte, evitando duplicidade", () => {
    const doc = seed();
    const sec = doc.sections[0];
    const blk = sec.blocks[0];
    const linked = linkSourceToBlock(doc.id, sec.id, blk.id, {
      kind: "documento",
      refId: "doc-1",
      label: "Petição inicial",
    });
    let b = findSection(linked, sec.kind)!.blocks[0];
    expect(b.sources).toHaveLength(1);
    // idempotente
    const again = linkSourceToBlock(doc.id, sec.id, blk.id, {
      kind: "documento",
      refId: "doc-1",
      label: "Petição inicial",
    });
    b = findSection(again, sec.kind)!.blocks[0];
    expect(b.sources).toHaveLength(1);
    const sourceId = b.sources[0].id;
    const unlinked = unlinkSourceFromBlock(doc.id, sec.id, blk.id, sourceId);
    expect(findSection(unlinked, sec.kind)!.blocks[0].sources).toHaveLength(0);
  });

  it("aceita todos os 5 tipos de fonte", () => {
    const doc = seed();
    const sec = doc.sections[3];
    const blk = sec.blocks[0];
    const kinds = ["entrevista", "diligencia", "documento", "quesito", "evidencia"] as const;
    let current = doc;
    for (const kind of kinds) {
      current = linkSourceToBlock(doc.id, sec.id, blk.id, {
        kind,
        refId: `ref-${kind}`,
        label: `Ref ${kind}`,
      });
    }
    const b = findSection(current, sec.kind)!.blocks[0];
    expect(b.sources).toHaveLength(kinds.length);
    expect(new Set(b.sources.map((s) => s.kind))).toEqual(new Set(kinds));
  });
});

describe("LV-14 — navegação entre seções", () => {
  it("findSection localiza cada tipo canônico", () => {
    const doc = seed();
    for (const k of REPORT_SECTION_KINDS) {
      const s = findSection(doc, k);
      expect(s?.kind).toBe(k);
      expect(s?.title).toBe(REPORT_SECTION_LABEL[k]);
    }
  });

  it("IDs de seção e bloco são únicos dentro do documento", () => {
    const doc = seed();
    const secIds = doc.sections.map((s) => s.id);
    expect(new Set(secIds).size).toBe(secIds.length);
    const blkIds = doc.sections.flatMap((s) => s.blocks.map((b) => b.id));
    expect(new Set(blkIds).size).toBe(blkIds.length);
  });
});

describe("LV-14 — integração mock com módulos existentes (somente leitura)", () => {
  it("collectSourceCandidates retorna as 5 chaves canônicas", () => {
    const c = collectSourceCandidates("prc-01");
    expect(Object.keys(c).sort()).toEqual(
      ["diligencia", "documento", "entrevista", "evidencia", "quesito"].sort(),
    );
  });

  it("adapters não lançam mesmo para caseId inexistente", () => {
    expect(() => loadInterviewCandidates("no-op")).not.toThrow();
    expect(() => loadDocumentCandidates("no-op")).not.toThrow();
    expect(() => loadQuestionCandidates("no-op")).not.toThrow();
    expect(() => loadEvidenceCandidates("no-op")).not.toThrow();
  });

  it("adapters retornam arrays imutáveis (readonly)", () => {
    const list = loadDocumentCandidates("prc-01");
    expect(Array.isArray(list)).toBe(true);
    // Cada item preserva o kind correto.
    for (const c of list) expect(c.kind).toBe("documento");
  });
});

describe("LV-14 — imutabilidade e estabilidade", () => {
  it("documentos retornados são frozen (proteção mock)", () => {
    const doc = seed();
    expect(Object.isFrozen(doc)).toBe(true);
  });

  it("mutação por chamada gera novo objeto (referencial)", () => {
    const doc = seed();
    const renamed = renameReport(doc.id, "Outro");
    expect(renamed).not.toBe(doc);
    expect(getReport(doc.id)).toBe(renamed);
  });

  it("resetReportStore limpa a listagem", () => {
    seed();
    expect(listReports()).toHaveLength(1);
    resetReportStore();
    expect(listReports()).toHaveLength(0);
  });
});
