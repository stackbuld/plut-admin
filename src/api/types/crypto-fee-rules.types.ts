// crypto-service admin fee/spread rule surface — /api/crypto/admin/FeeRules (Web/Endpoints/AdminFeeRules.cs).
// Same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). Shapes verified against
// docs/wallet-service-docs/crypto-wallet/admin-console/06-FEE_AND_SPREAD_RULES.md §3.
//
// One entity covers both of Plut's crypto revenue mechanisms, distinguished by `operationType`:
//   - Withdrawal/Buy/Sell/Swap  -> Platform Fee (Percentage or Flat allowed)
//   - BuySpread/SellSpread/SwapSpread -> Spread markup (Percentage only, backend rejects Flat)

export type CryptoFeeOperationType =
  | "Withdrawal"
  | "Buy"
  | "Sell"
  | "Swap"
  | "BuySpread"
  | "SellSpread"
  | "SwapSpread";

export type CryptoFeeType = "Percentage" | "Flat";

/** `asset` is null for the default/global rule that applies to every asset without a more specific
 * active override for the same `operationType`. */
export type CryptoFeeRuleDto = {
  id: string;
  operationType: CryptoFeeOperationType;
  asset: string | null;
  feeType: CryptoFeeType;
  feeValue: number;
  minFeeUsd: number | null;
  maxFeeUsd: number | null;
  isActive: boolean;
};

// -- GET /api/crypto/admin/FeeRules?operationType= ---------------------------

export type ListCryptoFeeRulesParams = {
  operationType?: CryptoFeeOperationType;
};

// -- POST /api/crypto/admin/FeeRules ------------------------------------------

export type CreateCryptoFeeRuleBody = {
  operationType: CryptoFeeOperationType;
  asset?: string | null;
  feeType: CryptoFeeType;
  feeValue: number;
  minFeeUsd?: number | null;
  maxFeeUsd?: number | null;
};

// -- PATCH /api/crypto/admin/FeeRules/{ruleId} --------------------------------
// operationType/asset/feeType are immutable after creation - only these three fields are sent.

export type UpdateCryptoFeeRuleBody = {
  feeValue: number;
  minFeeUsd?: number | null;
  maxFeeUsd?: number | null;
};
