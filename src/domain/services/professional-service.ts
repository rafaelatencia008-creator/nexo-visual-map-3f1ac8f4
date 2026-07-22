import type {
  Credential,
  ProfessionalProfile,
} from "../core/professional";
import type {
  CredentialId,
  ProfessionalProfileId,
} from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult, SortDirection } from "./pagination";
import type {
  CreateCredentialInput,
  CreateProfessionalProfileInput,
  ProfessionalProfileFilter,
  UpdateCredentialStatusInput,
  UpdateProfessionalProfileInput,
} from "./inputs";
import type { ProfessionalStatus } from "../core/professional";

export const PROFESSIONAL_SORT_FIELDS = [
  "createdAt",
  "area",
  "status",
] as const;
export type ProfessionalSortField = (typeof PROFESSIONAL_SORT_FIELDS)[number];

export type ProfessionalListRequest = Readonly<{
  filter?: ProfessionalProfileFilter;
  page: PageRequest;
  sortBy?: ProfessionalSortField;
  sortDir?: SortDirection;
}>;

export type ChangeProfessionalStatusInput = Readonly<{
  professionalProfileId: ProfessionalProfileId;
  status: ProfessionalStatus;
  expectedVersion: number;
}>;

export interface ProfessionalProfileService {
  getById(
    context: ServiceContext,
    id: ProfessionalProfileId,
  ): Promise<ServiceResult<ProfessionalProfile>>;

  list(
    context: ServiceContext,
    request: ProfessionalListRequest,
  ): Promise<ServiceResult<PageResult<ProfessionalProfile>>>;

  create(
    context: ServiceContext,
    input: CreateProfessionalProfileInput,
  ): Promise<ServiceResult<ProfessionalProfile>>;

  update(
    context: ServiceContext,
    id: ProfessionalProfileId,
    input: UpdateProfessionalProfileInput,
  ): Promise<ServiceResult<ProfessionalProfile>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeProfessionalStatusInput,
  ): Promise<ServiceResult<ProfessionalProfile>>;
}

export interface CredentialService {
  getById(
    context: ServiceContext,
    id: CredentialId,
  ): Promise<ServiceResult<Credential>>;

  listByProfessionalProfile(
    context: ServiceContext,
    professionalProfileId: ProfessionalProfileId,
    page: PageRequest,
  ): Promise<ServiceResult<PageResult<Credential>>>;

  create(
    context: ServiceContext,
    input: CreateCredentialInput,
  ): Promise<ServiceResult<Credential>>;

  updateStatus(
    context: ServiceContext,
    input: UpdateCredentialStatusInput,
  ): Promise<ServiceResult<Credential>>;
}
