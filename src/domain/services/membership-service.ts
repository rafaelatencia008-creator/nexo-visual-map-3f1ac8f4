import type { Membership } from "../core/access";
import type { MembershipId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult, SortDirection } from "./pagination";
import type {
  ChangeMembershipRoleInput,
  ChangeMembershipStatusInput,
  CreateMembershipInput,
  MembershipFilter,
  RevokeMembershipInput,
} from "./inputs";

export const MEMBERSHIP_SORT_FIELDS = ["createdAt", "role", "status"] as const;
export type MembershipSortField = (typeof MEMBERSHIP_SORT_FIELDS)[number];

export type MembershipListRequest = Readonly<{
  filter?: MembershipFilter;
  page: PageRequest;
  sortBy?: MembershipSortField;
  sortDir?: SortDirection;
}>;

export interface MembershipService {
  getById(
    context: ServiceContext,
    membershipId: MembershipId,
  ): Promise<ServiceResult<Membership>>;

  list(
    context: ServiceContext,
    request: MembershipListRequest,
  ): Promise<ServiceResult<PageResult<Membership>>>;

  create(
    context: ServiceContext,
    input: CreateMembershipInput,
  ): Promise<ServiceResult<Membership>>;

  changeRole(
    context: ServiceContext,
    input: ChangeMembershipRoleInput,
  ): Promise<ServiceResult<Membership>>;

  changeStatus(
    context: ServiceContext,
    input: ChangeMembershipStatusInput,
  ): Promise<ServiceResult<Membership>>;

  revoke(
    context: ServiceContext,
    input: RevokeMembershipInput,
  ): Promise<ServiceResult<Membership>>;
}
