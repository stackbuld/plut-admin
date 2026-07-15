// ── Countries ────────────────────────────────────────────────────────────────

export type CountryListItem = {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  isActive: boolean;
  linkedBrands: { id: string; name: string; code: string; imageUrl: string }[];
  createdAt: string;
};

// ── Denominations ─────────────────────────────────────────────────────────────

export type CardType = "Physical" | "ECode";

export type DenominationListItem = {
  id: string;
  brandId: string;
  countryId: string;
  amount: number;
  currencyCode: string;
  cardType: CardType;
  isActive: boolean;
  createdAt?: string;
};

export type ListDenominationsParams = {
  BrandId?: string;
  CountryId?: string;
  CardType?: CardType;
  Page?: number;
  PageSize?: number;
};

// ── Rates ─────────────────────────────────────────────────────────────────────

// TargetCustomerRate pins the customer rate (markupValue = customer USD rate); the backend derives
// the markup from the live market so the admin's chosen payout is honoured exactly.
export type MarkupType = "FixedUsd" | "Percentage" | "TargetCustomerRate";
export type RateSource = "System" | "Admin";

export type RateListItem = {
  denominationId: string;
  brandId: string;
  brandName: string;
  brandImageUrl: string;
  countryId: string;
  countryName: string;
  amount: number;
  currencyCode: string;
  cardType: CardType;
  denominationIsActive: boolean;
  hasRate: boolean;
  rateId: string | null;
  acquisitionCurrency: string | null;
  acquisitionRatePerCardDollar: number | null;
  marketRateUsd: number;
  customerRateUsd: number;
  markupUsd: number;
  markupType: MarkupType | null;
  markupValue: number;
  rateSource: RateSource | null;
  rateValidFrom: string | null;
  // True when a newer FX rate has been staged (fetched from the feed, not yet applied) for a pair
  // this denomination's rate is derived from — drives the "new rate available" indicator.
  hasPendingFxUpdate: boolean;
};

// ── Denomination rate history (dedicated page) ─────────────────────────────────

export type DenominationRateHistoryItem = {
  rateId: string;
  marketRateUsd: number;
  customerRateUsd: number;
  markupUsd: number;
  markupType: MarkupType;
  markupValue: number;
  acquisitionCurrency: string | null;
  acquisitionRatePerCardDollar: number | null;
  source: RateSource;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
};

export type DenominationRateHistorySummary = {
  denominationId: string;
  brandId: string;
  brandName: string;
  brandImageUrl: string;
  countryId: string;
  countryName: string;
  amount: number;
  currencyCode: string;
  currencySymbol: string;
  cardType: CardType;
  denominationIsActive: boolean;
  hasActiveRate: boolean;
  currentMarketRateUsd: number | null;
  currentCustomerRateUsd: number | null;
  currentMarkupUsd: number | null;
  currentSource: RateSource | null;
  currentValidFrom: string | null;
  totalChanges: number;
  firstRecordedAt: string | null;
  lastChangedAt: string | null;
};

export type DenominationRateHistoryResult = {
  summary: DenominationRateHistorySummary;
  items: DenominationRateHistoryItem[];
};

// ── Denomination rate payouts (per payout currency) ────────────────────────────

export type PayoutCurrencyRate = {
  currency: string;
  symbol: string;
  name: string;
  hasFxRate: boolean;
  // Units of this payout currency per $1 (rate per 1$ of the payout currency).
  fxRatePerUsd: number | null;
  // Customer payout per $1 of card face value, in this payout currency.
  customerRatePerCardDollar: number | null;
  // Total customer payout for the denomination, in this payout currency.
  customerPayoutAmount: number | null;
};

export type DenominationRatePayouts = {
  denominationId: string;
  brandId: string;
  countryId: string;
  amount: number;
  denominationCurrency: string;
  denominationCurrencySymbol: string;
  marketRateUsd: number;
  customerRateUsd: number;
  markupUsd: number;
  payouts: PayoutCurrencyRate[];
};

export type CreateRateBody = {
  denominationId: string;
  marketRateUsd?: number | null;
  acquisitionCurrency?: string | null;
  acquisitionRatePerCardDollar?: number | null;
  markupType?: MarkupType | null;
  markupValue: number;
  source?: RateSource | null;
};

export type ListRatesParams = {
  BrandId?: string;
  CountryId?: string;
  DenominationId?: string;
  ActiveOnly?: boolean;
  Page?: number;
  PageSize?: number;
};

// ── FX Rates ─────────────────────────────────────────────────────────────────

export type FxRateItem = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: string | null;
  validFrom: string;
  rateType: string;
};

// ── FX Rate History ──────────────────────────────────────────────────────────

export type FxRateHistoryItem = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: string | null;
  validFrom: string;
  validTo: string | null;
  isCurrent: boolean;
};

// ── Staged FX Rates (fetched from feed, awaiting manual apply) ─────────────────

export type StagedFxRateItem = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rateType: string;
  stagedRate: number;
  currentRate: number | null;
  delta: number | null;
  deltaPercent: number | null;
  source: string | null;
  fetchedAt: string;
};

// ── Payout Currencies ─────────────────────────────────────────────────────────

export type PayoutCurrencyItem = {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  created: string;
};
