/**
 * Rótulos em pt-BR para os enums do domínio oficial. Centralizados
 * para evitar strings soltas nas telas futuras.
 */

import type { CaseStatus, ConfidentialityLevel, ConflictCheckStatus, DeadlineStatus } from "./case";
import type { CasePersonRole, RelationshipType, AssignmentRole, AssignmentStatus } from "./assignment";
import type { OrganizationKind, OrganizationStatus } from "./organization";
import type { ProfessionalArea, ProfessionalStatus, CredentialStatus } from "./professional";
import type { AgeClassification } from "./person";

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Rascunho",
  triage: "Em triagem",
  active: "Ativo",
  diligence: "Em diligência",
  drafting: "Em elaboração",
  review: "Em revisão",
  completed: "Concluído",
  delivered: "Entregue",
  clarifications: "Em esclarecimentos",
  archived: "Arquivado",
  cancelled: "Cancelado",
};

export const CONFIDENTIALITY_LABEL: Record<ConfidentialityLevel, string> = {
  standard: "Padrão",
  restricted: "Restrito",
  high: "Alta confidencialidade",
};

export const CONFLICT_CHECK_LABEL: Record<ConflictCheckStatus, string> = {
  not_reviewed: "Não revisado",
  no_conflict: "Sem conflito",
  conflict_detected: "Conflito identificado",
};

export const DEADLINE_STATUS_LABEL: Record<DeadlineStatus, string> = {
  not_reviewed: "Não revisado",
  reviewed: "Revisado",
  extended: "Prorrogado",
  expired: "Expirado",
};

export const CASE_PERSON_ROLE_LABEL: Record<CasePersonRole, string> = {
  evaluated_person: "Pessoa avaliada",
  child_or_adolescent: "Criança ou adolescente",
  parent: "Genitor(a)",
  guardian: "Responsável legal",
  applicant: "Requerente",
  respondent: "Requerido(a)",
  witness: "Testemunha",
  informant: "Informante",
  technical_contact: "Contato técnico",
  other: "Outro",
};

export const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> = {
  parent_child: "Filiação",
  spouse: "Cônjuge",
  former_spouse: "Ex-cônjuge",
  guardian: "Guarda",
  sibling: "Irmandade",
  extended_family: "Família extensa",
  affective_bond: "Vínculo afetivo",
  professional: "Profissional",
  other: "Outro",
};

export const ASSIGNMENT_ROLE_LABEL: Record<AssignmentRole, string> = {
  lead_professional: "Profissional responsável",
  co_professional: "Coprofissional",
  reviewer: "Revisor(a)",
  collaborator: "Colaborador(a)",
  read_only: "Somente leitura",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  concluded: "Concluído",
  cancelled: "Cancelado",
};

export const ORGANIZATION_KIND_LABEL: Record<OrganizationKind, string> = {
  individual: "Individual",
  team: "Equipe",
  institutional: "Institucional",
};

export const ORGANIZATION_STATUS_LABEL: Record<OrganizationStatus, string> = {
  active: "Ativa",
  suspended: "Suspensa",
  archived: "Arquivada",
};

export const PROFESSIONAL_AREA_LABEL: Record<ProfessionalArea, string> = {
  psychology: "Psicologia",
  social_work: "Serviço Social",
  multi: "Equipe multiprofissional",
  other: "Outra área",
};

export const PROFESSIONAL_STATUS_LABEL: Record<ProfessionalStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Afastado",
};

export const CREDENTIAL_STATUS_LABEL: Record<CredentialStatus, string> = {
  not_informed: "Não informado",
  pending: "Pendente",
  verified: "Verificado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

export const AGE_CLASSIFICATION_LABEL: Record<AgeClassification, string> = {
  adult: "Adulto",
  child: "Criança",
  adolescent: "Adolescente",
  unknown: "Não informado",
};
