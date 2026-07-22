export type PendenciaTipo =
  | "prazo"
  | "documento"
  | "entrevista"
  | "quesito"
  | "laudo";

export type PendenciaPrioridade = "alta" | "media" | "baixa";

export type PendenciaStatus = "aberta" | "atrasada" | "proxima" | "concluida";

export type Pendencia = {
  id: string;
  tipo: PendenciaTipo;
  titulo: string;
  detalhe: string;
  prazo: string; // ISO
  prioridade: PendenciaPrioridade;
  status: PendenciaStatus;
  destino?: string; // rota interna
};

export const pendencias: Pendencia[] = [
  {
    id: "pd-01",
    tipo: "prazo",
    titulo: "Entrega de laudo — Perícia contábil",
    detalhe: "Processo 5001122-33.2025 · Banco Meridiano S.A.",
    prazo: "2026-07-28T18:00:00.000Z",
    prioridade: "alta",
    status: "proxima",
    destino: "/app/pericias",
  },
  {
    id: "pd-02",
    tipo: "documento",
    titulo: "Anexar comprovante de residência",
    detalhe: "Cliente Maria Eduarda Ferreira",
    prazo: "2026-07-22T18:00:00.000Z",
    prioridade: "media",
    status: "atrasada",
    destino: "/app/documentos",
  },
  {
    id: "pd-03",
    tipo: "entrevista",
    titulo: "Entrevista com parte autora",
    detalhe: "Perícia grafotécnica · 09h30",
    prazo: "2026-07-24T12:30:00.000Z",
    prioridade: "alta",
    status: "proxima",
    destino: "/app/entrevistas",
  },
  {
    id: "pd-04",
    tipo: "quesito",
    titulo: "Responder quesito 4 do autor",
    detalhe: "Processo 5001122-33.2025",
    prazo: "2026-08-02T18:00:00.000Z",
    prioridade: "media",
    status: "aberta",
    destino: "/app/quesitos",
  },
  {
    id: "pd-05",
    tipo: "laudo",
    titulo: "Revisar rascunho de laudo",
    detalhe: "Perícia ambiental · Vale S.A.",
    prazo: "2026-08-08T18:00:00.000Z",
    prioridade: "baixa",
    status: "aberta",
    destino: "/app/laudos",
  },
  {
    id: "pd-06",
    tipo: "prazo",
    titulo: "Protocolar quesitos complementares",
    detalhe: "Processo 0005544-21.2024",
    prazo: "2026-07-15T18:00:00.000Z",
    prioridade: "baixa",
    status: "concluida",
    destino: "/app/quesitos",
  },
];

export const TIPO_LABEL: Record<PendenciaTipo, string> = {
  prazo: "Prazo",
  documento: "Documento",
  entrevista: "Entrevista",
  quesito: "Quesito",
  laudo: "Laudo",
};

export const PRIORIDADE_LABEL: Record<PendenciaPrioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const STATUS_LABEL: Record<PendenciaStatus, string> = {
  aberta: "Em aberto",
  atrasada: "Atrasada",
  proxima: "Próxima",
  concluida: "Concluída",
};
