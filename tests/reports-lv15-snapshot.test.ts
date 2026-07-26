/**
 * LV-15 (correção) — Snapshot referencialmente estável para a store de laudos.
 * Contrato exigido pelo useSyncExternalStore: getSnapshot deve retornar a
 * mesma referência enquanto a store não muda.
 */
import { describe, expect, it, beforeEach } from "bun:test";
import {
  createReport,
  getReportsSnapshot,
  getReportsVersion,
  getReportHistorySnapshot,
  renameReport,
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
} from "../src/features/reports/report-mock-store";

function reset() {
  resetReportStore();
  resetReportIdCounter();
  resetReportClock();
}

describe("LV-15 — snapshot estável da store de laudos", () => {
  beforeEach(reset);

  it("getReportsSnapshot devolve a mesma referência sem mutação", () => {
    const a = getReportsSnapshot();
    const b = getReportsSnapshot();
    expect(b).toBe(a);
  });

  it("snapshot é invalidado após criação de documento", () => {
    const before = getReportsSnapshot();
    createReport({
      title: "Laudo teste",
      templateId: "laudo_psicologico",
      caseId: "case-1",
      caseLabel: "Caso 1",
    });
    const after = getReportsSnapshot();
    expect(after).not.toBe(before);
    expect(after.length).toBe(1);
  });

  it("snapshot é invalidado após edição de documento", () => {
    const doc = createReport({
      title: "Laudo teste",
      templateId: "laudo_psicologico",
      caseId: "case-1",
      caseLabel: "Caso 1",
    });
    const before = getReportsSnapshot();
    renameReport(doc.id, "Laudo renomeado");
    const after = getReportsSnapshot();
    expect(after).not.toBe(before);
  });

  it("versão monotônica acompanha mutações", () => {
    const v0 = getReportsVersion();
    createReport({
      title: "X",
      templateId: "parecer_tecnico",
      caseId: "c",
      caseLabel: "C",
    });
    expect(getReportsVersion()).toBeGreaterThan(v0);
  });

  it("getReportHistorySnapshot é estável entre chamadas sem mutação", () => {
    createReport({
      title: "Y",
      templateId: "parecer_tecnico",
      caseId: "c",
      caseLabel: "C",
    });
    const h1 = getReportHistorySnapshot();
    const h2 = getReportHistorySnapshot();
    expect(h2).toBe(h1);
  });
});
