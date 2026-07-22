export type NotificationTone = "prazo" | "documento" | "entrevista" | "quesito" | "laudo";

export type MockNotification = {
  id: string;
  tone: NotificationTone;
  title: string;
  description: string;
  when: string; // texto pt-BR ("há 2 horas", "hoje", "ontem")
  read: boolean;
  to?: string; // rota interna opcional
};

export const initialNotifications: MockNotification[] = [
  {
    id: "ntf-01",
    tone: "prazo",
    title: "Prazo próximo — 2 dias",
    description: "Perícia Eng. Civil · Construtora Horizonte Ltda.",
    when: "há 2 horas",
    read: false,
    to: "/app/pericias",
  },
  {
    id: "ntf-02",
    tone: "documento",
    title: "Documento pendente",
    description: "Comprovante de residência aguardando anexo — Maria E. Ferreira.",
    when: "há 5 horas",
    read: false,
    to: "/app/documentos",
  },
  {
    id: "ntf-03",
    tone: "entrevista",
    title: "Entrevista agendada",
    description: "Amanhã, 09h30 — Perícia grafotécnica.",
    when: "ontem",
    read: false,
    to: "/app/entrevistas",
  },
  {
    id: "ntf-04",
    tone: "quesito",
    title: "Quesito sem resposta",
    description: "Quesito 4 do autor — Processo 5001122-33.2025.",
    when: "há 2 dias",
    read: true,
    to: "/app/quesitos",
  },
  {
    id: "ntf-05",
    tone: "laudo",
    title: "Laudo aguardando revisão",
    description: "Perícia contábil · Banco Meridiano S.A.",
    when: "há 3 dias",
    read: true,
    to: "/app/laudos",
  },
];
