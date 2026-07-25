/**
 * LV-11 — Entrevistas e diligências (mock)
 * Contratos de tipos exclusivos do módulo.
 */

export type InterviewStatus =
  | "agendada"
  | "em_preparacao"
  | "em_andamento"
  | "pausada"
  | "concluida"
  | "cancelada"
  | "com_pendencia";

export type DiligenceStatus = InterviewStatus;

export type InterviewNoteKind =
  | "observacao"
  | "ponto_importante"
  | "pendencia"
  | "contradicao"
  | "conclusao_provisoria";

export type InterviewNote = Readonly<{
  id: string;
  text: string;
  kind: InterviewNoteKind;
  timestampMs?: number;
  authorLabel: string;
  createdAt: string;
}>;

export type TranscriptBlock = Readonly<{
  id: string;
  timeLabel: string;
  personLabel: string;
  text: string;
  highlighted: boolean;
  linkedQuestionId?: string;
  consolidated: boolean;
}>;

export type QuestionAnswerStatus = "pendente" | "respondida" | "ignorada";

export type InterviewQuestionAnswer = Readonly<{
  id: string;
  templateSection: string;
  questionText: string;
  required: boolean;
  status: QuestionAnswerStatus;
  answerText?: string;
  observation?: string;
  justification?: string;
  updatedAt?: string;
}>;

export type AudioSessionReference = Readonly<{
  segmentsCount: number;
  approxDurationMs: number;
  supported: boolean;
  note: string;
}>;

export type InterviewRecord = Readonly<{
  id: string;
  kind: "entrevista";
  title: string;
  caseId?: string;
  expertiseId?: string;
  participantIds: readonly string[];
  responsibleLabel: string;
  templateId: string;
  status: InterviewStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  notes: readonly InterviewNote[];
  transcriptBlocks: readonly TranscriptBlock[];
  questions: readonly InterviewQuestionAnswer[];
  audioSession?: AudioSessionReference;
  pendingItems: readonly string[];
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type DiligenceChecklistState = "pendente" | "concluido" | "nao_aplicavel";

export type DiligenceChecklistItem = Readonly<{
  id: string;
  text: string;
  state: DiligenceChecklistState;
  observation?: string;
}>;

export type DiligenceLocation = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
  source: "manual" | "device";
}>;

export type DiligencePhotoCategory =
  | "visao_geral"
  | "ambiente"
  | "objeto"
  | "documento"
  | "dano"
  | "evidencia"
  | "outro";

export type DiligencePhotoMock = Readonly<{
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  caption: string;
  capturedAt: string;
  category: DiligencePhotoCategory;
  relevant: boolean;
  /** URL local em memória (URL.createObjectURL); ausente após cleanup */
  objectUrl?: string;
}>;

export type DiligenceKind =
  | "vistoria_imovel"
  | "visita_domiciliar"
  | "inspecao_tecnica"
  | "coleta_evidencias"
  | "diligencia_externa"
  | "outro";

export type DiligenceRecord = Readonly<{
  id: string;
  kind: "diligencia";
  title: string;
  caseId?: string;
  expertiseId?: string;
  responsibleLabel: string;
  diligenceKind: DiligenceKind;
  status: DiligenceStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  address?: string;
  objective?: string;
  location?: DiligenceLocation;
  checklistItems: readonly DiligenceChecklistItem[];
  notes: readonly InterviewNote[];
  photos: readonly DiligencePhotoMock[];
  pendingItems: readonly string[];
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type ModuleRecord = InterviewRecord | DiligenceRecord;

export const INTERVIEW_STATUSES: readonly InterviewStatus[] = [
  "agendada",
  "em_preparacao",
  "em_andamento",
  "pausada",
  "concluida",
  "cancelada",
  "com_pendencia",
] as const;

export const NOTE_KINDS: readonly InterviewNoteKind[] = [
  "observacao",
  "ponto_importante",
  "pendencia",
  "contradicao",
  "conclusao_provisoria",
] as const;

export const PHOTO_CATEGORIES: readonly DiligencePhotoCategory[] = [
  "visao_geral",
  "ambiente",
  "objeto",
  "documento",
  "dano",
  "evidencia",
  "outro",
] as const;

export const DILIGENCE_KINDS: readonly DiligenceKind[] = [
  "vistoria_imovel",
  "visita_domiciliar",
  "inspecao_tecnica",
  "coleta_evidencias",
  "diligencia_externa",
  "outro",
] as const;

export const CHECKLIST_STATES: readonly DiligenceChecklistState[] = [
  "pendente",
  "concluido",
  "nao_aplicavel",
] as const;

export const ACCEPTED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_TITLE_LENGTH = 160;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_TRANSCRIPT_TEXT_LENGTH = 5000;
export const MAX_CAPTION_LENGTH = 200;
export const MAX_ADDRESS_LENGTH = 240;
export const MAX_OBJECTIVE_LENGTH = 500;
