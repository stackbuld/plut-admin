import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type { PagedResult, UserListItem, UserDetail, ListUsersParams } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listAdminUsers = (params: ListUsersParams = {}) =>
  apiGet<PagedResult<UserListItem>>(`/api/v1/admin/users${buildQs(params)}`);

export const getAdminUser = (userId: string) =>
  apiGet<UserDetail>(`/api/v1/admin/users/${userId}`);

// ── Query options ─────────────────────────────────────────────────────────────

export const userQueries = {
  list: (params?: ListUsersParams) =>
    queryOptions({
      queryKey: ["admin", "users", "list", params] as const,
      queryFn: () => listAdminUsers(params),
      staleTime: 2 * 60_000,
      enabled: !!(params?.search || params?.status || params?.kycTier),
    }),

  suspended: () =>
    queryOptions({
      queryKey: ["admin", "users", "list", { status: "Suspended" }] as const,
      queryFn: () => listAdminUsers({ status: "Suspended", pageSize: 20 }),
      staleTime: 2 * 60_000,
    }),

  detail: (userId: string) =>
    queryOptions({
      queryKey: ["admin", "users", userId] as const,
      queryFn: () => getAdminUser(userId),
      staleTime: 5 * 60_000,
    }),
};
