/**
 * LV-12 — Adaptadores de leitura sobre stores existentes.
 *
 * NÃO modifica Documentos ou Entrevistas. Apenas leitura.
 */
import { listDocuments } from "@/features/documents/document-mock-store";
import { listInterviewRecords } from "@/features/interviews/interview-mock-store";
import type {
  DiligenceRecord,
  InterviewRecord,
  ModuleRecord,
} from "@/features/interviews/interview-types";
import type { DocumentRecord } from "@/features/documents/document-types";

export type EvidenceSource = "documentos" | "entrevistas" | "diligencias" | "manual";

export type DocumentOption = Readonly<{
  id: string;
  label: string;
  caseId?: string;
  versions: readonly { id: string; version: number; label: string }[];
  annotations: readonly { id: string; label: string }[];
}>;

export function listDocumentOptions(): readonly DocumentOption[] {
  return listDocuments().map((d: DocumentRecord) => ({
    id: d.id,
    label: d.name,
    caseId: d.caseId,
    versions: d.versions.map((v) => ({
      id: v.id,
      version: v.version,
      label: `v${v.version} — ${v.fileName}`,
    })),
    annotations: d.annotations.map((a) => ({
      id: a.id,
      label: a.text.slice(0, 80),
    })),
  }));
}

export type InterviewOption = Readonly<{
  id: string;
  label: string;
  caseId?: string;
  notes: readonly { id: string; label: string }[];
  transcriptBlocks: readonly { id: string; label: string }[];
  questions: readonly { id: string; label: string }[];
}>;

export function listInterviewOptions(): readonly InterviewOption[] {
  return listInterviewRecords()
    .filter((r): r is InterviewRecord => r.kind === "entrevista")
    .map((r) => ({
      id: r.id,
      label: r.title,
      caseId: r.caseId,
      notes: r.notes.map((n) => ({
        id: n.id,
        label: n.text.slice(0, 80),
      })),
      transcriptBlocks: r.transcriptBlocks.map((b) => ({
        id: b.id,
        label: `${b.personLabel}: ${b.text.slice(0, 60)}`,
      })),
      questions: r.questions
        .filter((q) => q.answerText && q.answerText.trim().length > 0)
        .map((q) => ({
          id: q.id,
          label: q.questionText.slice(0, 80),
        })),
    }));
}

export type DiligenceOption = Readonly<{
  id: string;
  label: string;
  caseId?: string;
  checklist: readonly { id: string; label: string }[];
  notes: readonly { id: string; label: string }[];
  photos: readonly { id: string; label: string }[];
  hasLocation: boolean;
  locationLabel?: string;
}>;

export function listDiligenceOptions(): readonly DiligenceOption[] {
  return listInterviewRecords()
    .filter((r): r is DiligenceRecord => r.kind === "diligencia")
    .map((r) => ({
      id: r.id,
      label: r.title,
      caseId: r.caseId,
      checklist: r.checklistItems.map((c) => ({
        id: c.id,
        label: c.text.slice(0, 80),
      })),
      notes: r.notes.map((n) => ({
        id: n.id,
        label: n.text.slice(0, 80),
      })),
      photos: r.photos.map((p) => ({
        id: p.id,
        label: p.caption || p.name,
      })),
      hasLocation: Boolean(r.location),
      locationLabel: r.location
        ? `${r.location.latitude.toFixed(5)}, ${r.location.longitude.toFixed(5)}`
        : undefined,
    }));
}

export function findRecordCaseId(id: string): string | undefined {
  const list = listInterviewRecords();
  return list.find((r: ModuleRecord) => r.id === id)?.caseId;
}
