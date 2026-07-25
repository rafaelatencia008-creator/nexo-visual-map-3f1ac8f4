/**
 * LV-09.3 — Store mock em memória.
 *
 * Sem persistência, sem rede, sem upload real.
 * O seed determinístico é restaurado a cada carregamento da aplicação.
 */

import type {
  DocumentAnnotation,
  DocumentRecord,
  DocumentVersion,
} from "./document-types";
import type { DocumentFormInput, DocumentVersionInput } from "./document-form";
import { formatFileSize } from "./document-form";

const ORG = "org-01";
const DEFAULT_RESPONSIBLE = "Dra. Ana Beatriz Salgado";

function iso(y: number, mo: number, d: number, h = 9, mi = 0): string {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0)).toISOString();
}

function offsetDaysFrom(baseIso: string, days: number): string {
  const t = new Date(baseIso).getTime() + days * 86_400_000;
  return new Date(t).toISOString();
}

/** Data de referência estável para os prazos do seed. */
export const SEED_REFERENCE_DATE = "2026-07-25";

const REF_ISO = iso(2026, 7, 25, 12, 0);

let idCounter = 1000;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
export function resetIdCounter(seed = 1000): void {
  idCounter = seed;
}

function v(
  version: number,
  fileName: string,
  bytes: number,
  mime: string,
  createdAt: string,
  createdByLabel: string,
  description?: string,
): DocumentVersion {
  return {
    id: `ver-${version}-${fileName}`,
    version,
    fileName,
    fileSizeLabel: formatFileSize(bytes),
    mimeType: mime,
    description,
    createdAt,
    createdByLabel,
  };
}

function a(id: string, text: string, createdAt: string, author: string): DocumentAnnotation {
  return { id, text, createdAt, authorLabel: author };
}

function buildSeed(): DocumentRecord[] {
  return [
    {
      id: "doc-01",
      organizationId: ORG,
      name: "Laudo pericial preliminar — infiltrações no subsolo do empreendimento Vila Aurora",
      category: "laudo",
      status: "pendente_revisao",
      confidentiality: "restrito",
      description: "Aguardando revisão do assistente técnico das partes.",
      caseId: "pro-01",
      expertiseId: "prc-01",
      personIds: ["cli-01"],
      deadlineAt: offsetDaysFrom(REF_ISO, 12),
      currentVersion: 3,
      versions: [
        v(3, "laudo-vila-aurora-v3.pdf", 4_820_000, "application/pdf", iso(2026, 5, 12, 14, 20), "Dra. Ana Beatriz", "Ajustes finais"),
        v(2, "laudo-vila-aurora-v2.pdf", 4_610_000, "application/pdf", iso(2026, 4, 22, 9, 30), "Dra. Ana Beatriz", "Incluídas fotografias"),
        v(1, "laudo-vila-aurora-v1.pdf", 3_100_000, "application/pdf", iso(2026, 4, 1, 10, 0), "Dra. Ana Beatriz", "Rascunho inicial"),
      ],
      annotations: [
        a("an-01", "Revisar quesito 4 do autor.", iso(2026, 5, 13, 9, 0), "Dra. Ana Beatriz"),
        a("an-02", "Anexar planta baixa atualizada.", iso(2026, 5, 15, 11, 0), "Dra. Ana Beatriz"),
      ],
      createdAt: iso(2026, 4, 1, 10, 0),
      updatedAt: iso(2026, 5, 12, 14, 20),
      responsibleLabel: DEFAULT_RESPONSIBLE,
    },
    {
      id: "doc-02",
      organizationId: ORG,
      name: "Contrato de honorários periciais",
      category: "outro",
      status: "ativo",
      confidentiality: "restrito",
      description: "Assinado por todas as partes.",
      caseId: "pro-02",
      personIds: [],
      currentVersion: 1,
      versions: [
        v(1, "contrato-honorarios.pdf", 210_000, "application/pdf", iso(2025, 10, 1, 11, 0), "Dr. Ricardo"),
      ],
      annotations: [],
      createdAt: iso(2025, 10, 1, 11, 0),
      updatedAt: iso(2025, 10, 1, 11, 0),
      responsibleLabel: "Dr. Ricardo Monteiro",
    },
    {
      id: "doc-03",
      organizationId: ORG,
      name: "Evidências fotográficas — pontos de umidade na parede oeste",
      category: "imagem",
      status: "ativo",
      confidentiality: "publico",
      caseId: "pro-01",
      personIds: ["cli-01"],
      currentVersion: 1,
      versions: [
        v(1, "vila-aurora-parede-oeste.jpg", 1_820_000, "image/jpeg", iso(2026, 4, 15, 16, 40), "Dra. Ana Beatriz"),
      ],
      annotations: [],
      createdAt: iso(2026, 4, 15, 16, 40),
      updatedAt: iso(2026, 4, 15, 16, 40),
      responsibleLabel: DEFAULT_RESPONSIBLE,
    },
    {
      id: "doc-04",
      organizationId: ORG,
      name: "Petição de esclarecimentos — quesitos complementares",
      category: "peticao",
      status: "com_prazo",
      confidentiality: "publico",
      caseId: "pro-05",
      personIds: ["cli-02"],
      deadlineAt: offsetDaysFrom(REF_ISO, 3),
      currentVersion: 2,
      versions: [
        v(2, "peticao-esclarecimentos-v2.docx", 96_000, "application/msword", iso(2026, 6, 2, 8, 10), "Dr. Fernando"),
        v(1, "peticao-esclarecimentos-v1.docx", 88_000, "application/msword", iso(2026, 5, 28, 14, 0), "Dr. Fernando"),
      ],
      annotations: [
        a("an-03", "Confirmar cálculo de horas extras.", iso(2026, 6, 2, 8, 15), "Dr. Fernando"),
      ],
      createdAt: iso(2026, 5, 28, 14, 0),
      updatedAt: iso(2026, 6, 2, 8, 10),
      responsibleLabel: "Dr. Fernando Aguiar",
    },
    {
      id: "doc-05",
      organizationId: ORG,
      name: "Documento de identidade — parte autora",
      category: "documento_pessoal",
      status: "arquivado",
      confidentiality: "sigiloso",
      caseId: "pro-03",
      personIds: ["cli-03"],
      currentVersion: 1,
      versions: [
        v(1, "rg-parte-autora.pdf", 340_000, "application/pdf", iso(2026, 1, 11, 9, 0), "Dra. Helena"),
      ],
      annotations: [],
      createdAt: iso(2026, 1, 11, 9, 0),
      updatedAt: iso(2026, 1, 11, 9, 0),
      responsibleLabel: "Dra. Helena Vasconcelos",
    },
    {
      id: "doc-06",
      organizationId: ORG,
      name: "Relatório ambiental preliminar sobre contaminação de solo em área industrial desativada",
      category: "relatorio_tecnico",
      status: "pendente_revisao",
      confidentiality: "restrito",
      caseId: "pro-04",
      expertiseId: "prc-04",
      personIds: [],
      currentVersion: 2,
      versions: [
        v(2, "relatorio-ambiental-v2.pdf", 6_200_000, "application/pdf", iso(2026, 3, 20, 13, 0), "Dra. Marina"),
        v(1, "relatorio-ambiental-v1.pdf", 5_400_000, "application/pdf", iso(2026, 2, 14, 10, 0), "Dra. Marina"),
      ],
      annotations: [
        a("an-04", "Aguardar laudo laboratorial.", iso(2026, 3, 21, 9, 0), "Dra. Marina"),
      ],
      createdAt: iso(2026, 2, 14, 10, 0),
      updatedAt: iso(2026, 3, 20, 13, 0),
      responsibleLabel: "Dra. Marina Toledo",
    },
    {
      id: "doc-07",
      organizationId: ORG,
      name: "Decisão judicial — determina complementação de laudo",
      category: "decisao",
      status: "ativo",
      confidentiality: "publico",
      caseId: "pro-01",
      personIds: [],
      currentVersion: 1,
      versions: [
        v(1, "decisao-complementacao.pdf", 190_000, "application/pdf", iso(2026, 5, 5, 15, 0), "Vara Cível Central"),
      ],
      annotations: [],
      createdAt: iso(2026, 5, 5, 15, 0),
      updatedAt: iso(2026, 5, 5, 15, 0),
      responsibleLabel: DEFAULT_RESPONSIBLE,
    },
    {
      id: "doc-08",
      organizationId: ORG,
      name: "Comprovante de recolhimento de honorários",
      category: "comprovante",
      status: "ativo",
      confidentiality: "restrito",
      caseId: "pro-02",
      personIds: ["cli-04"],
      currentVersion: 1,
      versions: [
        v(1, "comprovante-honorarios.pdf", 74_000, "application/pdf", iso(2026, 6, 10, 10, 30), "Dr. Ricardo"),
      ],
      annotations: [],
      createdAt: iso(2026, 6, 10, 10, 30),
      updatedAt: iso(2026, 6, 10, 10, 30),
      responsibleLabel: "Dr. Ricardo Monteiro",
    },
    {
      id: "doc-09",
      organizationId: ORG,
      name: "Áudio de entrevista com testemunha técnica",
      category: "audio",
      status: "com_prazo",
      confidentiality: "sigiloso",
      caseId: "pro-05",
      personIds: ["cli-05"],
      deadlineAt: offsetDaysFrom(REF_ISO, 0),
      currentVersion: 1,
      versions: [
        v(1, "entrevista-testemunha.mp3", 12_400_000, "audio/mpeg", iso(2026, 6, 20, 14, 0), "Dr. Fernando"),
      ],
      annotations: [
        a("an-05", "Transcrever trechos entre 12:30 e 18:00.", iso(2026, 6, 20, 16, 0), "Dr. Fernando"),
      ],
      createdAt: iso(2026, 6, 20, 14, 0),
      updatedAt: iso(2026, 6, 20, 14, 0),
      responsibleLabel: "Dr. Fernando Aguiar",
    },
    {
      id: "doc-10",
      organizationId: ORG,
      name: "Vídeo de vistoria — pavimento superior",
      category: "video",
      status: "prazo_vencido",
      confidentiality: "restrito",
      caseId: "pro-01",
      personIds: [],
      deadlineAt: offsetDaysFrom(REF_ISO, -5),
      currentVersion: 1,
      versions: [
        v(1, "vistoria-pav-superior.mp4", 48_200_000, "video/mp4", iso(2026, 4, 18, 11, 20), "Dra. Ana Beatriz"),
      ],
      annotations: [],
      createdAt: iso(2026, 4, 18, 11, 20),
      updatedAt: iso(2026, 4, 18, 11, 20),
      responsibleLabel: DEFAULT_RESPONSIBLE,
    },
    {
      id: "doc-11",
      organizationId: ORG,
      name: "Planilha de cálculos periciais complementares",
      category: "outro",
      status: "ativo",
      confidentiality: "restrito",
      caseId: "pro-06",
      personIds: ["cli-06"],
      currentVersion: 4,
      versions: [
        v(4, "calculos-v4.xlsx", 220_000, "application/vnd.ms-excel", iso(2026, 7, 1, 9, 0), "Dra. Helena", "Ajustes de índices"),
        v(3, "calculos-v3.xlsx", 218_000, "application/vnd.ms-excel", iso(2026, 6, 20, 14, 0), "Dra. Helena"),
        v(2, "calculos-v2.xlsx", 210_000, "application/vnd.ms-excel", iso(2026, 6, 10, 14, 0), "Dra. Helena"),
        v(1, "calculos-v1.xlsx", 200_000, "application/vnd.ms-excel", iso(2026, 6, 1, 10, 0), "Dra. Helena"),
      ],
      annotations: [
        a("an-06", "Revisar planilha após decisão sobre índices.", iso(2026, 7, 2, 10, 0), "Dra. Helena"),
        a("an-07", "Confirmar arredondamentos.", iso(2026, 7, 3, 11, 0), "Dra. Helena"),
      ],
      createdAt: iso(2026, 6, 1, 10, 0),
      updatedAt: iso(2026, 7, 1, 9, 0),
      responsibleLabel: "Dra. Helena Vasconcelos",
    },
    {
      id: "doc-12",
      organizationId: ORG,
      name: "Nota técnica curta",
      category: "outro",
      status: "ativo",
      confidentiality: "publico",
      caseId: "pro-04",
      personIds: [],
      currentVersion: 1,
      versions: [
        v(1, "nota.txt", 2_400, "text/plain", iso(2026, 7, 10, 8, 0), "Dra. Marina"),
      ],
      annotations: [],
      createdAt: iso(2026, 7, 10, 8, 0),
      updatedAt: iso(2026, 7, 10, 8, 0),
      responsibleLabel: "Dra. Marina Toledo",
    },
  ];
}

export const DOCUMENT_SEED: readonly DocumentRecord[] = buildSeed();

// ── Store em memória (escopo módulo, restaurado no page load real)

let store: DocumentRecord[] = buildSeed();

export function listDocuments(): DocumentRecord[] {
  return store;
}

export function resetStore(): void {
  store = buildSeed();
  resetIdCounter();
}

export function getDocument(id: string): DocumentRecord | undefined {
  return store.find((d) => d.id === id);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createDocumentFromForm(
  input: DocumentFormInput,
  opts: { now?: string; id?: string } = {},
): DocumentRecord {
  if (!input.file) throw new Error("Arquivo obrigatório.");
  if (!input.category) throw new Error("Categoria obrigatória.");
  if (!input.confidentiality) throw new Error("Sigilo obrigatório.");
  const createdAt = opts.now ?? nowIso();
  const id = opts.id ?? makeId("doc");
  const responsibleLabel = input.responsibleLabel?.trim() || DEFAULT_RESPONSIBLE;
  const version: DocumentVersion = {
    id: `${id}-v1`,
    version: 1,
    fileName: input.file.fileName,
    fileSizeLabel: formatFileSize(input.file.sizeBytes),
    mimeType: input.file.mimeType,
    description: input.description?.trim() || undefined,
    createdAt,
    createdByLabel: responsibleLabel,
  };
  const record: DocumentRecord = {
    id,
    organizationId: ORG,
    name: input.name.trim(),
    category: input.category,
    status: input.deadlineAt ? "com_prazo" : "ativo",
    confidentiality: input.confidentiality,
    description: input.description?.trim() || undefined,
    caseId: input.caseId || undefined,
    expertiseId: input.expertiseId || undefined,
    personIds: input.personIds ? [...input.personIds] : [],
    deadlineAt: input.deadlineAt || undefined,
    currentVersion: 1,
    versions: [version],
    annotations: [],
    createdAt,
    updatedAt: createdAt,
    responsibleLabel,
  };
  store = [record, ...store];
  return record;
}

export function addVersion(
  documentId: string,
  input: DocumentVersionInput,
  opts: { now?: string } = {},
): DocumentRecord | undefined {
  const idx = store.findIndex((d) => d.id === documentId);
  if (idx < 0) return undefined;
  if (!input.file) throw new Error("Arquivo obrigatório.");
  const current = store[idx]!;
  const nextNumber = current.currentVersion + 1;
  const createdAt = opts.now ?? nowIso();
  const newVersion: DocumentVersion = {
    id: `${current.id}-v${nextNumber}`,
    version: nextNumber,
    fileName: input.file.fileName,
    fileSizeLabel: formatFileSize(input.file.sizeBytes),
    mimeType: input.file.mimeType,
    description: input.description?.trim() || undefined,
    createdAt,
    createdByLabel: current.responsibleLabel,
  };
  const updated: DocumentRecord = {
    ...current,
    currentVersion: nextNumber,
    versions: [newVersion, ...current.versions],
    updatedAt: createdAt,
  };
  store = store.map((d) => (d.id === documentId ? updated : d));
  return updated;
}

export function addAnnotation(
  documentId: string,
  text: string,
  opts: { now?: string; authorLabel?: string } = {},
): DocumentRecord | undefined {
  const idx = store.findIndex((d) => d.id === documentId);
  if (idx < 0) return undefined;
  const current = store[idx]!;
  const createdAt = opts.now ?? nowIso();
  const annotation: DocumentAnnotation = {
    id: makeId("an"),
    text: text.trim(),
    createdAt,
    authorLabel: opts.authorLabel ?? current.responsibleLabel,
  };
  const updated: DocumentRecord = {
    ...current,
    annotations: [annotation, ...current.annotations],
    updatedAt: createdAt,
  };
  store = store.map((d) => (d.id === documentId ? updated : d));
  return updated;
}
