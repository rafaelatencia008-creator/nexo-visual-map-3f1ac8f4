/**
 * LV-13 — Adaptadores somente-leitura sobre stores existentes.
 * Nenhum acesso a estado privado; apenas APIs públicas.
 */
import { listDocuments } from "@/features/documents/document-mock-store";
import { listInterviewRecords } from "@/features/interviews/interview-mock-store";
import { listQuestions } from "@/features/questions-evidence/question-mock-store";
import { processos, pericias, clientes, peritos } from "@/lib/mock/data";
import { pendencias } from "@/lib/mock/pendencias";
import type { CopilotSourceRecord } from "./copilot-types";

function txt(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function collectAvailableSources(): readonly CopilotSourceRecord[] {
  const out: CopilotSourceRecord[] = [];

  for (const p of processos) {
    out.push({
      sourceType: "processo",
      id: p.id,
      label: `Processo ${p.numero}`,
      searchableText: txt(p.numero, p.comarca, p.vara, p.status),
      excerpt: `${p.comarca} — ${p.vara}`,
      route: `/app/processos/${p.id}`,
      updatedAt: p.criadoEm,
      metadata: { status: p.status, clienteId: p.clienteId },
    });
  }

  for (const pe of pericias) {
    out.push({
      sourceType: "pericia",
      id: pe.id,
      parentId: pe.processoId,
      label: `Perícia ${pe.tipo}`,
      searchableText: txt(pe.tipo, pe.status, pe.observacoes),
      excerpt: pe.observacoes,
      route: `/app/pericias/${pe.id}`,
      updatedAt: pe.dataAgendada,
      metadata: { tipo: pe.tipo, status: pe.status, honorarios: pe.honorarios },
    });
  }

  for (const d of listDocuments()) {
    out.push({
      sourceType: "documento",
      id: d.id,
      parentId: d.caseId,
      label: d.name,
      searchableText: txt(d.name, d.category, d.status, d.description),
      excerpt: d.description,
      route: `/app/documentos`,
      updatedAt: d.updatedAt,
      metadata: {
        category: d.category,
        status: d.status,
        deadlineAt: d.deadlineAt,
      },
    });
  }

  for (const r of listInterviewRecords()) {
    out.push({
      sourceType: r.kind === "entrevista" ? "entrevista" : "diligencia",
      id: r.id,
      parentId: r.caseId,
      label: r.title,
      searchableText: txt(r.title, r.status, r.responsibleLabel),
      excerpt: r.conclusion,
      route: `/app/entrevistas`,
      updatedAt: r.updatedAt,
      metadata: { status: r.status, kind: r.kind },
    });
  }

  for (const q of listQuestions()) {
    out.push({
      sourceType: "quesito",
      id: q.id,
      parentId: q.caseId,
      label: q.text.slice(0, 80),
      searchableText: txt(q.text, q.origin, q.status, q.technicalAnswer),
      excerpt: q.technicalAnswer ?? q.text,
      route: `/app/quesitos`,
      updatedAt: q.updatedAt,
      metadata: {
        status: q.status,
        origin: q.origin,
        priority: q.priority,
        readyForReport: q.readyForReport,
        evidenceCount: q.evidenceLinks.length,
        gapCount: q.gapItems.filter((g) => !g.resolved).length,
      },
    });
    for (const e of q.evidenceLinks) {
      out.push({
        sourceType: "evidencia",
        id: e.id,
        parentId: q.id,
        label: e.sourceLabel,
        searchableText: txt(e.sourceLabel, e.excerpt, e.evidenceType),
        excerpt: e.excerpt,
        route: `/app/quesitos`,
        updatedAt: e.createdAt,
        metadata: {
          evidenceType: e.evidenceType,
          relevance: e.relevance,
          supports: e.supportsAnswer,
          contradicts: e.contradictsAnswer,
        },
      });
    }
  }

  for (const p of pendencias) {
    out.push({
      sourceType: "pendencia",
      id: p.id,
      label: p.titulo,
      searchableText: txt(p.titulo, p.tipo, p.prioridade, p.status),
      excerpt: undefined,
      route: "/app/pendencias",
      updatedAt: p.prazo,
      metadata: {
        tipo: p.tipo,
        prioridade: p.prioridade,
        status: p.status,
      },
    });
  }

  return out;
}

export function findClienteName(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return clientes.find((c) => c.id === id)?.nome;
}
export function findPeritoName(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return peritos.find((p) => p.id === id)?.nome;
}

/**
 * Compute a deterministic fingerprint of a source record based on
 * relevant fields. Used for stale detection.
 */
export function fingerprintFromSource(
  sources: readonly CopilotSourceRecord[],
  sourceType: string,
  id: string,
): string | undefined {
  const found = sources.find(
    (s) => s.sourceType === (sourceType as CopilotSourceRecord["sourceType"]) && s.id === id,
  );
  if (!found) return undefined;
  return computeFingerprint(found);
}

export function computeFingerprint(s: CopilotSourceRecord): string {
  // JSON estável e ordenado
  const keys = Object.keys(s.metadata).sort();
  const meta = keys.map((k) => `${k}=${String((s.metadata as Record<string, unknown>)[k])}`).join("|");
  return `${s.sourceType}:${s.id}:${s.updatedAt ?? "-"}:${meta}`;
}
