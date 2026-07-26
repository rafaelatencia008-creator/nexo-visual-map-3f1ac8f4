/**
 * LV-18.6 — Testes de contrato `ReportTemplateRepository` e desacoplamento.
 *
 * Cobertura:
 *  1. Contrato do repositório (in-memory vs isolado/fake).
 *  2. Casos de uso de import/export/application aceitam repositório injetado.
 *  3. Desacoplamento: casos de uso não importam stores concretas.
 *  4. Atomicidade e isolamento de estado em erro.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { reportTemplateRepository } from "@/features/report-templates/report-template-composition";
import {
  createIsolatedReportTemplateRepository,
  createInMemoryReportTemplateRepository,
} from "@/features/report-templates/report-template-memory-repository";
import {
  importReportTemplate,
  previewReportTemplateImport,
} from "@/features/report-templates/report-template-import";
import {
  exportReportTemplate,
  serializeReportTemplate,
} from "@/features/report-templates/report-template-export";
import {
  createReportFromTemplate,
  previewReportTemplateApplication,
  listApplicableTemplates,
} from "@/features/reports/report-template-application";
import { resetReportStore } from "@/features/reports/report-mock-store";
import { toExportedTemplate } from "@/features/report-templates/report-template-export";

beforeEach(() => {
  resetReportStore();
  reportTemplateRepository.reset();
});

const SAMPLE_TEMPLATE = (name = "Modelo P") =>
  toExportedTemplate({
    id: "rtpl-iso-1",
    name,
    description: "",
    specialty: "psicologia",
    status: "publicado",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "usr-test",
    duplicatedFrom: null,
    sections: [
      {
        id: "rsec-iso-1",
        title: "Introdução",
        description: "",
        position: 0,
        blocks: [
          {
            id: "rblk-iso-1",
            kind: "texto",
            title: "Objeto",
            content: "Laudo de {{nome}}.",
            position: 0,
            variableRefs: ["nome"],
          },
        ],
      },
    ],
    variables: [
      {
        id: "rvar-iso-1",
        key: "nome",
        label: "Nome",
        kind: "texto",
        required: true,
        defaultValue: "",
      },
    ],
  });

function buildEnvelope(template = SAMPLE_TEMPLATE()) {
  return {
    format: "nexo-report-template" as const,
    schemaVersion: 1 as const,
    exportedAt: "2026-07-25T12:00:00.000Z",
    exportedBy: "usr-test",
    source: "mock" as const,
    templates: [template],
  };
}

const JSON_ENVELOPE = (t = SAMPLE_TEMPLATE()) =>
  JSON.stringify(buildEnvelope(t));

// ---------- 1. Contrato do repositório ----------

describe("LV-18.6 — contrato ReportTemplateRepository", () => {
  it("in-memory e isolated implementam os métodos de CRUD básico", () => {
    const mem = createInMemoryReportTemplateRepository();
    const iso = createIsolatedReportTemplateRepository();
    for (const repo of [mem, iso]) {
      expect(typeof repo.getSnapshot).toBe("function");
      expect(typeof repo.create).toBe("function");
      expect(typeof repo.getById).toBe("function");
      expect(typeof repo.updateMetadata).toBe("function");
      expect(typeof repo.archive).toBe("function");
      expect(typeof repo.publish).toBe("function");
      expect(typeof repo.addSection).toBe("function");
      expect(typeof repo.addBlock).toBe("function");
      expect(typeof repo.addVariable).toBe("function");
      expect(typeof repo.bulkInsertImported).toBe("function");
      expect(typeof repo.getExistingIds).toBe("function");
      expect(typeof repo.listVersions).toBe("function");
      expect(typeof repo.appendHistoryEvent).toBe("function");
      expect(typeof repo.reset).toBe("function");
    }
  });

  it("repositório isolado mantém estado independente da instância padrão", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t = iso.create({ name: "Isolado" });
    expect(t.name).toBe("Isolado");
    expect(t.status).toBe("rascunho");
    expect(reportTemplateRepository.getById(t.id)).toBeUndefined();
  });

  it("repositório isolado tem IDs e timestamps determinísticos", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t1 = iso.create({ name: "A" });
    const t2 = iso.create({ name: "B" });
    expect(t1.id).toBe("rtpl-1001");
    expect(t2.id).toBe("rtpl-1002");
    expect(t1.createdAt).toBe("2026-07-25T12:00:00.000Z");
    expect(t2.createdAt).toBe("2026-07-25T12:00:00.000Z");
  });
});

// ---------- 2. Importação com repositório injetado ----------

describe("LV-18.6 — importação via repositório", () => {
  it("importa com repositório isolado sem tocar na store global", () => {
    const iso = createIsolatedReportTemplateRepository();
    const before = reportTemplateRepository.getSnapshot().templates.length;
    importReportTemplate(JSON_ENVELOPE(), undefined, iso);
    const after = reportTemplateRepository.getSnapshot().templates.length;
    expect(after).toBe(before);
    expect(iso.getSnapshot().templates.length).toBe(1);
  });

  it("preview de importação com repositório isolado retorna preview sem alterar estado", () => {
    const iso = createIsolatedReportTemplateRepository();
    const snapBefore = iso.getSnapshot();
    previewReportTemplateImport(JSON_ENVELOPE(), iso);
    const snapAfter = iso.getSnapshot();
    expect(snapAfter.templates.length).toBe(snapBefore.templates.length);
    expect(snapAfter.templates).toBe(snapBefore.templates);
  });

  it("falha atômica em importação não consome IDs e preserva listeners", () => {
    const iso = createIsolatedReportTemplateRepository();
    iso.create({ name: "Ocupante" });
    const calls: number[] = [];
    iso.subscribe(() => calls.push(1));

    const bad = JSON.stringify({
      ...buildEnvelope(),
      templates: [
        {
          ...SAMPLE_TEMPLATE("Colidente"),
          id: "rtpl-1001", // conflito com o ID do ocupante
        },
      ],
    });

    expect(() => importReportTemplate(bad, { strategy: "reject" }, iso)).toThrow();
    expect(calls.length).toBe(0);
    expect(iso.getSnapshot().templates.length).toBe(1);
  });
});

// ---------- 3. Exportação com repositório injetado ----------

describe("LV-18.6 — exportação via repositório", () => {
  it("exporta modelo de repositório isolado", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t = iso.create({ name: "Exportável" });
    const env = exportReportTemplate(t.id, {}, iso);
    expect(env.templates.length).toBe(1);
    expect(env.templates[0].name).toBe("Exportável");
  });

  it("serialização com repositório isolado não toca no histórico global", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t = iso.create({ name: "Serializado" });
    const histBefore = iso.getHistorySnapshot().events.length;
    serializeReportTemplate(t.id, { recordHistory: false }, iso);
    const histAfter = iso.getHistorySnapshot().events.length;
    expect(histAfter).toBe(histBefore);
  });
});

// ---------- 4. Aplicação com repositório injetado ----------

describe("LV-18.6 — aplicação de modelo em laudo via repositório", () => {
  it("lista modelos aplicáveis de repositório isolado", () => {
    const iso = createIsolatedReportTemplateRepository();
    iso.create({ name: "Rascunho" });
    const pub = iso.create({ name: "Publicado" });
    iso.publish(pub.id);
    expect(listApplicableTemplates(undefined, iso)).toHaveLength(1);
  });

  it("cria laudo a partir de modelo publicado em repositório isolado", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t = iso.create({ name: "Base" });
    iso.publish(t.id);
    iso.createManualVersion(t.id, "Revisão", "Ajuste");

    const preview = previewReportTemplateApplication(
      {
        templateId: t.id,
        variableValues: { nome: "Maria" },
      },
      iso,
    );
    expect(preview.templateName).toBe("Base");
    expect(preview.sections.length).toBeGreaterThan(0);

    const result = createReportFromTemplate(
      {
        title: "Laudo de Maria",
        caseId: "case-1",
        caseLabel: "Processo 1",
        templateId: t.id,
        variableValues: { nome: "Maria" },
        fingerprint: preview.fingerprint,
      },
      iso,
    );
    expect(result.report.title).toBe("Laudo de Maria");
    expect(result.origin?.templateId).toBe(t.id);
  });

  it("preview rejeita modelo não publicado no repositório isolado", () => {
    const iso = createIsolatedReportTemplateRepository();
    const t = iso.create({ name: "Rascunho" });
    expect(() =>
      previewReportTemplateApplication(
        { templateId: t.id, variableValues: {} },
        iso,
      ),
    ).toThrow("Modelo não está publicado");
  });
});

// ---------- 5. Desacoplamento estático ----------

describe("LV-18.6 — desacoplamento estático dos casos de uso", () => {
  it("casos de uso import/export/application não importam stores diretamente", () => {
    const useCases = [
      "src/features/report-templates/report-template-import.ts",
      "src/features/report-templates/report-template-export.ts",
      "src/features/reports/report-template-application.ts",
    ];
    for (const path of useCases) {
      const src = require("fs").readFileSync(path, "utf-8");
      const importRe = /from\s+["'](\.\/|\@\/features\/report-templates\/)report-template-(store|version-store|history-store)["']/g;
      expect(importRe.test(src)).toBe(false);
    }
  });

  it("composição padrão exporta repositório conectado às stores globais", () => {
    expect(reportTemplateRepository).toBeDefined();
    const t = reportTemplateRepository.create({ name: "Via composição" });
    expect(reportTemplateRepository.getById(t.id)).toBeDefined();
  });
});
