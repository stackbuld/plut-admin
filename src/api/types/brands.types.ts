import type { CardType } from "./catalog.types";

export type BrandListItem = {
  id: string;
  name: string;
  code: string;
  imageUrl: string;
  isActive: boolean;
  countryCount: number;
  denominationCount: number;
  createdAt: string;
};

export type BrandRateDetail = {
  id: string;
  acquisitionCurrency: string | null;
  acquisitionRatePerCardDollar: number | null;
  marketRateUsd: number;
  customerRateUsd: number;
  markupUsd: number;
  markupType: string;
  markupValue: number;
  source: string;
  validFrom: string;
};

export type BrandDenominationDetail = {
  id: string;
  amount: number;
  currencyCode: string;
  cardType: CardType;
  isActive: boolean;
  activeRate: BrandRateDetail | null;
};

export type BrandCountryDetail = {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  isActive: boolean;
  denominations: BrandDenominationDetail[];
};

export type BrandDetail = {
  id: string;
  name: string;
  code: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  countries: BrandCountryDetail[];
};
