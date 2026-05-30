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
  brandName: string;
  countryId: string;
  countryName: string;
  amount: number;
  currencyCode: string;
  cardType: CardType;
  isActive: boolean;
};

export type ListDenominationsParams = {
  BrandId?: string;
  CountryId?: string;
  CardType?: CardType;
  Page?: number;
  PageSize?: number;
};

// ── Rates ─────────────────────────────────────────────────────────────────────

export type MarkupType = "FixedUsd" | "Percentage";
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

// ── Payout Currencies ─────────────────────────────────────────────────────────

export type PayoutCurrencyItem = {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  created: string;
};
