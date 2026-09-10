import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type { CryptoRevenueReportDto, GetCryptoRevenueParams } from "./types/crypto-revenue.types";

// crypto-service admin Revenue Report — /api/crypto/admin/Revenue, same AdminOnly policy + envelope
// convention as every other admin fetcher here (see src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/11-REVENUE_REPORTS.md.
const BASE = "/api/crypto/admin/Revenue";

// -- Fetchers -----------------------------------------------------------------

// from/to both optional - the backend defaults to the last 7 days when omitted, so an empty
// params object is a perfectly valid call, not a special case here.
export const getCryptoRevenue = (params: GetCryptoRevenueParams = {}) =>
  apiGet<CryptoRevenueReportDto>(`${BASE}${buildQs(params)}`);

// -- Query keys & options -------------------------------------------------------

export const cryptoRevenueKeys = {
  all: () => ["admin", "crypto", "revenue"] as const,
  report: (params?: GetCryptoRevenueParams) => [...cryptoRevenueKeys.all(), "report", params] as const,
};

export const cryptoRevenueQueries = {
  report: (params?: GetCryptoRevenueParams) =>
    queryOptions({
      queryKey: cryptoRevenueKeys.report(params),
      queryFn: () => getCryptoRevenue(params),
      staleTime: 30_000,
    }),
};
