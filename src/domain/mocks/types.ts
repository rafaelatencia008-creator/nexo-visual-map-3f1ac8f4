/**
 * Tipos públicos da camada de mocks estáveis do domínio oficial — LV-07.3.
 *
 * Não exporta nenhuma implementação, store, mapa interno ou instância.
 */

import type { Organization } from "../core/organization";
import type { User, Membership } from "../core/access";
import type { ProfessionalProfile, Credential } from "../core/professional";
import type { Case } from "../core/case";
import type { Person } from "../core/person";
import type { CasePerson, Relationship, Assignment } from "../core/assignment";
import type {
  OrganizationService,
  CurrentUserService,
} from "../services/organization-service";
import type { MembershipService } from "../services/membership-service";
import type {
  ProfessionalProfileService,
  CredentialService,
} from "../services/professional-service";
import type { CaseService } from "../services/case-service";
import type {
  PersonService,
  CasePersonService,
  RelationshipService,
} from "../services/person-service";
import type { AssignmentService } from "../services/assignment-service";
import type { CasePlanService } from "../services/case-plan-service";
import type { CaseTimelineService } from "../services/case-timeline-service";
import type { PermissionPolicy } from "../services/permissions";
import type { CasePlanItem, CaseTimelineEntry } from "../core/case-plan";
import type { AuditEvent, CaseSnapshot } from "../core/case-audit";
import type { AuditEventService } from "../services/audit-service";
import type { CaseSnapshotService } from "../services/case-snapshot-service";
import type { Deadline, Appointment } from "../core/agenda";
import type { DeadlineService } from "../services/deadline-service";
import type { AppointmentService } from "../services/appointment-service";

export type MockDomainServices = Readonly<{
  organization: OrganizationService;
  currentUser: CurrentUserService;
  memberships: MembershipService;
  professionalProfiles: ProfessionalProfileService;
  credentials: CredentialService;
  cases: CaseService;
  persons: PersonService;
  casePersons: CasePersonService;
  relationships: RelationshipService;
  assignments: AssignmentService;
  casePlan: CasePlanService;
  caseTimeline: CaseTimelineService;
  permissions: PermissionPolicy;
  auditEvents: AuditEventService;
  caseSnapshots: CaseSnapshotService;
  deadlines: DeadlineService;
  appointments: AppointmentService;
}>;

export type MockDomainSnapshot = Readonly<{
  organizations: readonly Organization[];
  users: readonly User[];
  memberships: readonly Membership[];
  professionalProfiles: readonly ProfessionalProfile[];
  credentials: readonly Credential[];
  cases: readonly Case[];
  persons: readonly Person[];
  casePersons: readonly CasePerson[];
  relationships: readonly Relationship[];
  assignments: readonly Assignment[];
  casePlanItems: readonly CasePlanItem[];
  caseTimelineEntries: readonly CaseTimelineEntry[];
  auditEvents: readonly AuditEvent[];
  caseSnapshots: readonly CaseSnapshot[];
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
}>;

export const MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "baseEpochMs",
  "tickMs",
]);

export type MockDomainOptions = Readonly<{
  /** Instante inicial do relógio determinístico (default: 2026-01-01T00:00:00Z). */
  baseEpochMs?: number;
  /** Passo do relógio por escrita, em milissegundos (default: 1000). */
  tickMs?: number;
}>;

export type MockDomainEnvironment = Readonly<{
  services: MockDomainServices;
  snapshot(): MockDomainSnapshot;
}>;
