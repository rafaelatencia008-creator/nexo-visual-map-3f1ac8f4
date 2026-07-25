/**
 * Documentos — dados mockados para a biblioteca documental visual.
 * Sem persistência, sem rede, sem upload real.
 */

import { processos } from "./data";

export type DocumentoCategoria =
  | "laudo"
  | "peticao"
  | "contrato"
  | "evidencia"
  | "identidade"
  | "outros";

export type DocumentoSituacao =
  | "rascunho"
  | "em_revisao"
  | "aprovado"
  | "arquivado";

export const CATEGORIA_LABEL: Record<DocumentoCategoria, string> = {
  laudo: "Laudo",
  peticao: "Petição",
  contrato: "Contrato",
  evidencia: "Evidência",
  identidade: "Identidade",
  outros: "Outros",
};

export const SITUACAO_LABEL: Record<DocumentoSituacao, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

export interface DocumentoVersao {
  numero: number;
  criadoEm: string; // ISO
  autor: string;
  resumo: string;
}

export interface DocumentoAnotacao {
  id: string;
  autor: string;
  criadoEm: string;
  texto: string;
}

export interface DocumentoVinculo {
  tipo: "processo" | "pessoa" | "perícia";
  descricao: string;
}

export interface Documento {
  id: string;
  nome: string;
  categoria: DocumentoCategoria;
  processoId: string;
  situacao: DocumentoSituacao;
  versaoAtual: number;
  atualizadoEm: string;
  responsavel: string;
  observacoes: string;
  versoes: DocumentoVersao[];
  vinculos: DocumentoVinculo[];
  anotacoes: DocumentoAnotacao[];
}

export const documentosSeed: Documento[] = [
  {
    id: "doc-01",
    nome: "Laudo pericial preliminar — infiltrações no subsolo do empreendimento Vila Aurora",
    categoria: "laudo",
    processoId: "pro-01",
    situacao: "em_revisao",
    versaoAtual: 3,
    atualizadoEm: "2026-05-12T14:20:00.000Z",
    responsavel: "Dra. Ana Beatriz Salgado",
    observacoes: "Aguardando revisão do assistente técnico das partes.",
    versoes: [
      { numero: 1, criadoEm: "2026-04-01T10:00:00.000Z", autor: "Dra. Ana Beatriz", resumo: "Rascunho inicial" },
      { numero: 2, criadoEm: "2026-04-22T09:30:00.000Z", autor: "Dra. Ana Beatriz", resumo: "Incluídas fotografias" },
      { numero: 3, criadoEm: "2026-05-12T14:20:00.000Z", autor: "Dra. Ana Beatriz", resumo: "Ajustes finais na conclusão" },
    ],
    vinculos: [
      { tipo: "processo", descricao: "1023456-78.2024.8.26.0100" },
      { tipo: "perícia", descricao: "Vistoria técnica em 05/08/2026" },
    ],
    anotacoes: [
      { id: "an-1", autor: "Dra. Ana Beatriz", criadoEm: "2026-05-13T09:00:00.000Z", texto: "Revisar quesito 4 do autor." },
    ],
  },
  {
    id: "doc-02",
    nome: "Contrato de honorários periciais",
    categoria: "contrato",
    processoId: "pro-02",
    situacao: "aprovado",
    versaoAtual: 1,
    atualizadoEm: "2025-10-01T11:00:00.000Z",
    responsavel: "Dr. Ricardo Monteiro",
    observacoes: "Assinado por todas as partes.",
    versoes: [
      { numero: 1, criadoEm: "2025-10-01T11:00:00.000Z", autor: "Dr. Ricardo", resumo: "Versão assinada" },
    ],
    vinculos: [{ tipo: "processo", descricao: "5001122-33.2025.8.19.0001" }],
    anotacoes: [],
  },
  {
    id: "doc-03",
    nome: "Evidência fotográfica — pontos de umidade parede oeste",
    categoria: "evidencia",
    processoId: "pro-01",
    situacao: "aprovado",
    versaoAtual: 1,
    atualizadoEm: "2026-04-15T16:40:00.000Z",
    responsavel: "Dra. Ana Beatriz Salgado",
    observacoes: "Coletado em vistoria conjunta.",
    versoes: [
      { numero: 1, criadoEm: "2026-04-15T16:40:00.000Z", autor: "Dra. Ana Beatriz", resumo: "Registro fotográfico" },
    ],
    vinculos: [{ tipo: "processo", descricao: "1023456-78.2024.8.26.0100" }],
    anotacoes: [],
  },
  {
    id: "doc-04",
    nome: "Petição de esclarecimentos — quesitos complementares",
    categoria: "peticao",
    processoId: "pro-05",
    situacao: "rascunho",
    versaoAtual: 2,
    atualizadoEm: "2026-06-02T08:10:00.000Z",
    responsavel: "Dr. Fernando Aguiar",
    observacoes: "",
    versoes: [
      { numero: 1, criadoEm: "2026-05-28T14:00:00.000Z", autor: "Dr. Fernando", resumo: "Estrutura inicial" },
      { numero: 2, criadoEm: "2026-06-02T08:10:00.000Z", autor: "Dr. Fernando", resumo: "Revisão gramatical" },
    ],
    vinculos: [{ tipo: "processo", descricao: "0012345-67.2025.5.02.0056" }],
    anotacoes: [
      { id: "an-2", autor: "Dr. Fernando", criadoEm: "2026-06-02T08:15:00.000Z", texto: "Confirmar cálculo de horas extras." },
    ],
  },
  {
    id: "doc-05",
    nome: "Documento de identidade — parte autora",
    categoria: "identidade",
    processoId: "pro-03",
    situacao: "arquivado",
    versaoAtual: 1,
    atualizadoEm: "2026-01-11T09:00:00.000Z",
    responsavel: "Dra. Helena Vasconcelos",
    observacoes: "RG e CPF digitalizados.",
    versoes: [
      { numero: 1, criadoEm: "2026-01-11T09:00:00.000Z", autor: "Dra. Helena", resumo: "Arquivo original" },
    ],
    vinculos: [{ tipo: "processo", descricao: "0005544-21.2024.8.26.0224" }],
    anotacoes: [],
  },
  {
    id: "doc-06",
    nome: "Relatório ambiental preliminar sobre contaminação de solo em área industrial desativada",
    categoria: "laudo",
    processoId: "pro-04",
    situacao: "em_revisao",
    versaoAtual: 2,
    atualizadoEm: "2026-03-20T13:00:00.000Z",
    responsavel: "Dra. Marina Toledo",
    observacoes: "Aguardando laudo laboratorial complementar.",
    versoes: [
      { numero: 1, criadoEm: "2026-02-14T10:00:00.000Z", autor: "Dra. Marina", resumo: "Estrutura inicial" },
      { numero: 2, criadoEm: "2026-03-20T13:00:00.000Z", autor: "Dra. Marina", resumo: "Adicionadas coletas" },
    ],
    vinculos: [{ tipo: "processo", descricao: "5099887-11.2024.4.03.6100" }],
    anotacoes: [],
  },
];

export function getProcessoLabel(processoId: string): string {
  const p = processos.find((x) => x.id === processoId);
  return p ? p.numero : "—";
}

export function processoOptions(): { id: string; label: string }[] {
  return processos.map((p) => ({ id: p.id, label: p.numero }));
}
