import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, buildQs } from "./client";
import { queryKeys } from "./keys";
import type {
  PagedResult,
  UserListItem, UserDetail, ListUsersParams,
  UserBlock, UserStrike,
  ImageBlacklistEntry, ListImageBlacklistParams,
} from "./types";

// ── Users ─────────────────────────────────────────────────────────────────────

// The API returns { users: [...] } — normalise to standard PagedResult shape
export const listAdminUsers = async (params: ListUsersParams = {}): Promise<PagedResult<UserListItem>> => {
  const raw = await apiGet<{
    users: UserListItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages?: number;
  }>(`/api/v1/admin/users${buildQs(params)}`);
  return { items: raw.users, totalCount: raw.totalCount, page: raw.page, pageSize: raw.pageSize, totalPages: raw.totalPages };
};

export const getAdminUser = (userId: string) =>
  apiGet<UserDetail>(`/api/v1/admin/users/${userId}`);

// ── Blocks ────────────────────────────────────────────────────────────────────

export const listUserBlocks = (userId: string) =>
  apiGet<UserBlock[]>(`/api/v1/admin/users/${userId}/blocks`);

export const blockUser = (userId: string, body: { type: "Temporary" | "Permanent"; reason: string; durationHours?: number }) =>
  apiPost<UserBlock>(`/api/v1/admin/users/${userId}/block`, body);

export const unblockUser = (userId: string, blockId: string) =>
  apiPatch<void>(`/api/v1/admin/users/${userId}/blocks/${blockId}/lift`);

// ── Strikes ───────────────────────────────────────────────────────────────────

export const listUserStrikes = (userId: string) =>
  apiGet<UserStrike[]>(`/api/v1/admin/users/${userId}/strikes`);

// ── Image Blacklist ───────────────────────────────────────────────────────────

export const listImageBlacklist = (params: ListImageBlacklistParams = {}) =>
  apiGet<PagedResult<ImageBlacklistEntry>>(`/api/v1/admin/image-blacklist${buildQs(params)}`);

export const addImageBlacklist = (body: { hash: string; reason: string; notes?: string }) =>
  apiPost<ImageBlacklistEntry>("/api/v1/admin/image-blacklist", body);

export const removeImageBlacklist = (id: string) =>
  apiPost<void>(`/api/v1/admin/image-blacklist/${id}/remove`);

// ── Query options ─────────────────────────────────────────────────────────────

export const userQueries = {
  list: (params?: ListUsersParams) =>
    queryOptions({
      queryKey: queryKeys.users.list(params),
      queryFn: () => listAdminUsers(params),
      staleTime: 2 * 60_000,
    }),

  detail: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.users.detail(userId),
      queryFn: () => getAdminUser(userId),
      staleTime: 5 * 60_000,
    }),

  blocks: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.users.blocks(userId),
      queryFn: () => listUserBlocks(userId),
      staleTime: 60_000,
    }),

  strikes: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.users.strikes(userId),
      queryFn: () => listUserStrikes(userId),
      staleTime: 5 * 60_000,
    }),

  blacklist: (params?: ListImageBlacklistParams) =>
    queryOptions({
      queryKey: queryKeys.users.blacklist(params),
      queryFn: () => listImageBlacklist(params),
      staleTime: 2 * 60_000,
    }),
};
