import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, buildQs } from "./client";
import type {
  CryptoFeeRuleDto,
  ListCryptoFeeRulesParams,
  CreateCryptoFeeRuleBody,
  UpdateCryptoFeeRuleBody,
} from "./types/crypto-fee-rules.types";

// crypto-service admin fee/spread rule surface - /api/crypto/admin/FeeRules, same AdminOnly
// policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). See docs/wallet-service-docs/crypto-wallet/admin-console/06-FEE_AND_SPREAD_RULES.md.
const BASE = "/api/crypto/admin/FeeRules";

// -- Fetchers -----------------------------------------------------------------

// operationType omitted fetches every rule (fee + spread) in one call - cheaper than 7 separate
// requests for a small table; the route splits the result into tabs client-side.
export const listCryptoFeeRules = (params: ListCryptoFeeRulesParams = {}) =>
  apiGet<CryptoFeeRuleDto[]>(`${BASE}${buildQs(params)}`);

// 409 (an active rule already exists for this operationType/asset pair) surfaces via the thrown
// Error's message - callers should give it a friendlier framing rather than showing it raw.
export const createCryptoFeeRule = (body: CreateCryptoFeeRuleBody) =>
  apiPost<CryptoFeeRuleDto>(BASE, body);

// operationType/asset/feeType are immutable once a rule is created - only these three fields are
// ever sent, matching the backend's UpdateCryptoFeeRuleCommand.
export const updateCryptoFeeRule = (ruleId: string, body: UpdateCryptoFeeRuleBody) =>
  apiPatch<CryptoFeeRuleDto>(`${BASE}/${ruleId}`, body);

export const deactivateCryptoFeeRule = (ruleId: string) =>
  apiPatch<CryptoFeeRuleDto>(`${BASE}/${ruleId}/deactivate`);

// -- Query keys & options -------------------------------------------------------

export const cryptoFeeRuleKeys = {
  all: () => ["admin", "crypto", "fee-rules"] as const,
  lists: () => [...cryptoFeeRuleKeys.all(), "list"] as const,
  list: (params?: ListCryptoFeeRulesParams) => [...cryptoFeeRuleKeys.lists(), params] as const,
};

export const cryptoFeeRuleQueries = {
  list: (params?: ListCryptoFeeRulesParams) =>
    queryOptions({
      queryKey: cryptoFeeRuleKeys.list(params),
      queryFn: () => listCryptoFeeRules(params),
      staleTime: 15_000,
    }),
};
