/**
 * LV-18.6 — Contrato `ReportTemplateRepository` e desacoplamento.
 *
 * Valida:
 *  - Adaptador in-memory de produção (delegando para stores globais).
 *  - Repositório isolado/fake (`createIsolatedReportTemplateRepository`).
 *  - Estabilidade referencial do snapshot e notificações a listeners.
 *  - Aplicação da fachada `report-template-use-cases`.
 *  - Casos de uso (import/export/aplicação) não importam stores concretas
 *    diretamente — apenas via repositório injetado / fachada.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createInMemoryReportTemplateRepository,
  createIsolatedReportTemplateRepository,
} from "@/features/report-templates/report-template-memory-repository";
import { reportTemplateRepository } from "@/features/report-templates/report-template-composition";
import * as useCases from "@/features/report-templates/report-template-use-cases";
import type { ReportTemplateRepository } from "@/features/report-templates/report-template-repository";

const REPO_ROOT = join(import.meta.dir, "..");

function seedTemplate(repo: ReportTemplateRepository) {
  const t = repo.create({
    name: "Modelo LV-18.6",
    description: "Contrato de repositório",
    specialty: "psicologia",
  });
  const section = repo.addSection(t.id, {
    title: "Identificação",
    description: "Cabeçalho",
  });
  repo.addBlock(t.id, section.id, {
    kind: "paragrafo",
    title: "Sujeito",
    content: "Paciente {{nome}}",
    variableRefs: ["nome"],
  });
  repo.addVariable(t.id, {
    key: "nome",
    label: "Nome",
    kind: "texto",
    required: true,
  });
  return { template: t, sectionId: section.id };
}

describe("LV-18.6 · ReportTemplateRepository — contrato", () => {
  it("exposição dos métodos essenciais na instância padrão", () => {
    const requiredMethods = [
      "getSnapshot",
      "subscribe",
      "getById",
      "list",
      "create",
      "updateMetadata",
      "duplicate",
      "archive",
      "reactivate",
      "publish",
      "returnToDraft",
      "addSection",
      "updateSection",
      "removeSection",
      "moveSection",
      "addBlock",
      "updateBlock",
      "removeBlock",
      "moveBlock",
      "addVariable",
      "updateVariable",
      "removeVariable",
      "isVariableInUse",
      "getExistingIds",
      "bulkInsertImported",
      "generateImportedTemplateId",
      "generateImportedSectionId",
      "generateImportedBlockId",
      "generateImportedVariableId",
      "listVersions",
      "getVersion",
      "getVersionSnapshot",
      "subscribeVersions",
      "createManualVersion",
      "listHistory",
      "getHistorySnapshot",
      "subscribeHistory",
      "appendHistoryEvent",
      "reset",
    ] as const;
    for (const method of requiredMethods) {
      expect(
        typeof (reportTemplateRepository as unknown as Record<string, unknown>)[method],
      ).toBe("function");
    }
  });

  it("a instância padrão é um adaptador in-memory reusável", () => {
    const a = createInMemoryReportTemplateRepository();
    const b = createInMemoryReportTemplateRepository();
    // Ambos delegam ao singleton global — compartilham o mesmo snapshot.
    expect(a.getSnapshot()).toBe(b.getSnapshot());
    expect(a.getSnapshot()).toBe(reportTemplateRepository.getSnapshot());
  });
});

describe("LV-18.6 · Repositório isolado", () => {
  let repo: ReportTemplateRepository;

  beforeEach(() => {
    repo = createIsolatedReportTemplateRepository();
  });

  it("inicia vazio, independente do singleton global", () => {
    const snap = repo.getSnapshot();
    expect(snap.templates.length).toBe(0);
    // Duas instâncias isoladas não compartilham estado.
    const other = createIsolatedReportTemplateRepository();
    seedTemplate(other);
    expect(repo.getSnapshot().templates.length).toBe(0);
    expect(other.getSnapshot().templates.length).toBe(1);
  });

  it("emite IDs branded determinísticos", () => {
    const { template, sectionId } = seedTemplate(repo);
    expect(String(template.id)).toMatch(/^rtpl-\d+$/);
    expect(String(sectionId)).toMatch(/^rsec-\d+$/);
  });

  it("snapshot muda de referência após mutação e mantém referência sem mutação", () => {
    const before = repo.getSnapshot();
    seedTemplate(repo);
    const after = repo.getSnapshot();
    expect(after).not.toBe(before);
    const stable = repo.getSnapshot();
    expect(stable).toBe(after);
  });

  it("notifica listeners de templates, versões e histórico", () => {
    let templateCalls = 0;
    let historyCalls = 0;
    const unsubT = repo.subscribe(() => {
      templateCalls += 1;
    });
    const unsubH = repo.subscribeHistory(() => {
      historyCalls += 1;
    });
    const { template } = seedTemplate(repo);
    expect(templateCalls).toBeGreaterThan(0);
    repo.appendHistoryEvent({
      templateId: template.id,
      action: "created",
      result: "sucesso",
    });
    expect(historyCalls).toBeGreaterThan(0);
    unsubT();
    unsubH();
    const templateCallsAtUnsub = templateCalls;
    repo.updateMetadata(template.id, { name: "Outro nome" });
    expect(templateCalls).toBe(templateCallsAtUnsub);
  });

  it("reset limpa estado (templates, versões e histórico) da instância isolada", () => {
    const { template } = seedTemplate(repo);
    repo.appendHistoryEvent({
      templateId: template.id,
      action: "created",
      result: "sucesso",
    });
    expect(repo.getSnapshot().templates.length).toBe(1);
    expect(repo.listHistory().length).toBeGreaterThan(0);
    repo.reset();
    expect(repo.getSnapshot().templates.length).toBe(0);
    expect(repo.listHistory().length).toBe(0);
  });

  it("suporta ciclo básico: criar, publicar, duplicar, arquivar", () => {
    const t = repo.create({
      name: "Ciclo",
      description: "",
      specialty: "geral",
    });
    repo.addSection(t.id, { title: "S1", description: "" });
    const published = repo.publish(t.id);
    expect(published.status).toBe("publicado");
    const dup = repo.duplicate(t.id);
    expect(dup.id).not.toBe(t.id);
    const arch = repo.archive(t.id);
    expect(arch.status).toBe("arquivado");
  });
});

describe("LV-18.6 · Fachada `report-template-use-cases`", () => {
  beforeEach(() => {
    reportTemplateRepository.reset();
  });

  it("delegações da fachada operam sobre o repositório padrão", () => {
    const created = useCases.createTemplate({
      name: "Via fachada",
      description: "",
      specialty: "geral",
    });
    const fetched = useCases.getTemplate(created.id);
    expect(fetched?.id).toBe(created.id);
    const list = useCases.listTemplates();
    expect(list.some((t) => t.id === created.id)).toBe(true);
  });

  it("resetReportTemplateStore limpa via repositório", () => {
    useCases.createTemplate({
      name: "Temp",
      description: "",
      specialty: "geral",
    });
    expect(useCases.getSnapshot().templates.length).toBeGreaterThan(0);
    useCases.resetReportTemplateStore();
    expect(useCases.getSnapshot().templates.length).toBe(0);
  });
});

describe("LV-18.6 · Desacoplamento — casos de uso não importam stores concretas", () => {
  const useCaseFiles = [
    "src/features/report-templates/report-template-import.ts",
    "src/features/report-templates/report-template-export.ts",
    "src/features/reports/report-template-application.ts",
  ] as const;

  const forbiddenImports = [
    "./report-template-store",
    "./report-template-version-store",
    "./report-template-history-store",
    "@/features/report-templates/report-template-store",
    "@/features/report-templates/report-template-version-store",
    "@/features/report-templates/report-template-history-store",
    "../report-templates/report-template-store",
    "../report-templates/report-template-version-store",
    "../report-templates/report-template-history-store",
  ];

  for (const file of useCaseFiles) {
    it(`${file} não importa stores concretas`, () => {
      const source = readFileSync(join(REPO_ROOT, file), "utf-8");
      for (const forbidden of forbiddenImports) {
        const pattern = new RegExp(
          `from\\s+["']${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        );
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});
