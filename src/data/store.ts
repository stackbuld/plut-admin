import { create } from "zustand";
import {
  brands as seedBrands,
  countries as seedCountries,
  denominations as seedDenoms,
  rates as seedRates,
  rateHistory as seedRateHistory,
  fxRates as seedFxRates,
  payoutCurrencies as seedPayouts,
  type Brand,
  type Country,
  type Denomination,
  type Rate,
  type FxRate,
  type PayoutCurrency,
  type PayoutCurrencyStatus,
} from "./mock";

// =========================================================================
// Shared, stateful catalog store.
//
// The original mock.ts arrays are used as the SEED only. After hydration,
// all reads/writes flow through this store so changes made in the Set Rate
// modal, FX dialog, Add Denomination dialog, etc. are reflected everywhere
// (catalog, brand detail, payout previews, rate history).
// =========================================================================

let idSeq = 100000;
const newId = (p: string) => `${p}-${++idSeq}`;

const nowStamp = () =>
  new Date()
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");

export interface RatePayload {
  marketRateUsd: number;
  customerRateUsd: number;
  markupType: "Percentage" | "Fixed";
  markupValue: number;
  source: "Manual" | "Auto";
  acquisitionCurrency?: "CNY" | null;
  acquisitionRatePerCardDollar?: number | null;
  supplierNgnPerDollar?: number | null;
}

interface CatalogState {
  brands: Brand[];
  countries: Country[];
  denominations: Denomination[];
  rates: Rate[];
  rateHistory: Rate[];
  fxRates: FxRate[];
  payoutCurrencies: PayoutCurrency[];

  addCountry: (c: Country) => void;
  addBrand: (b: Brand) => void;

  addDenomination: (input: {
    brandId: string;
    countryId: string;
    amount: number;
    currency: string;
    cardType: Denomination["cardType"];
    initialRate?: RatePayload | null;
  }) => { denomId: string; hasRate: boolean };

  toggleDenomination: (id: string) => void;

  setRate: (denomId: string, payload: RatePayload) => void;

  setFxRate: (
    base: string,
    quote: string,
    rate: number,
    source: "Manual" | "Auto",
  ) => void;

  addPayoutCurrency: (c: { code: string; name: string; symbol: string; status?: PayoutCurrencyStatus }) => void;
  togglePayoutCurrency: (code: string) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  brands: [...seedBrands],
  countries: [...seedCountries],
  denominations: [...seedDenoms],
  rates: [...seedRates],
  rateHistory: [...seedRateHistory],
  fxRates: [...seedFxRates],
  payoutCurrencies: [...seedPayouts],

  addCountry: (c) => set((s) => ({ countries: [...s.countries, c] })),
  addBrand: (b) => set((s) => ({ brands: [...s.brands, b] })),

  addDenomination: ({ initialRate, ...d }) => {
    const id = newId("d");
    let hasRate = false;
    set((s) => {
      const denom: Denomination = { ...d, id, active: true };
      const next: Partial<CatalogState> = {
        denominations: [...s.denominations, denom],
      };
      if (initialRate) {
        hasRate = true;
        const rate: Rate = {
          ...initialRate,
          id: newId("r"),
          denominationId: id,
          active: true,
          validFrom: nowStamp(),
        };
        next.rates = [...s.rates, rate];
      }
      return next;
    });
    return { denomId: id, hasRate };
  },

  toggleDenomination: (id) =>
    set((s) => ({
      denominations: s.denominations.map((d) =>
        d.id === id ? { ...d, active: !d.active } : d,
      ),
    })),

  setRate: (denomId, payload) =>
    set((s) => {
      const prev = s.rates.find(
        (r) => r.denominationId === denomId && r.active,
      );
      const next: Rate = {
        ...payload,
        id: newId("r"),
        denominationId: denomId,
        active: true,
        validFrom: nowStamp(),
      };
      return {
        rates: [...s.rates.filter((r) => r.id !== prev?.id), next],
        rateHistory: prev
          ? [{ ...prev, active: false }, ...s.rateHistory]
          : s.rateHistory,
      };
    }),

  setFxRate: (base, quote, rate, source) =>
    set((s) => {
      const ts = nowStamp();
      const archived = s.fxRates.map((f) =>
        f.baseCurrency === base &&
        f.quoteCurrency === quote &&
        f.validTo === null
          ? { ...f, validTo: ts }
          : f,
      );
      return {
        fxRates: [
          {
            id: newId("fx"),
            baseCurrency: base,
            quoteCurrency: quote,
            rate,
            source,
            validFrom: ts,
            validTo: null,
          },
          ...archived,
        ],
      };
    }),

  addPayoutCurrency: (c) =>
    set((s) => ({
      payoutCurrencies: [
        ...s.payoutCurrencies,
        { code: c.code, name: c.name, symbol: c.symbol, status: c.status ?? "Draft" },
      ],
    })),

  togglePayoutCurrency: (code) =>
    set((s) => ({
      payoutCurrencies: s.payoutCurrencies.map((p) =>
        p.code === code
          ? { ...p, status: p.status === "Active" ? "Inactive" : "Active" }
          : p,
      ),
    })),
}));

// ---- Reactive selectors ---------------------------------------------------

export const useDenominations = () => useCatalogStore((s) => s.denominations);
export const useRates = () => useCatalogStore((s) => s.rates);
export const useRateHistory = () => useCatalogStore((s) => s.rateHistory);
export const useFxRatesList = () => useCatalogStore((s) => s.fxRates);
export const usePayoutCurrenciesList = () =>
  useCatalogStore((s) => s.payoutCurrencies);

export const useActiveRateForDenom = (denomId: string | null | undefined) =>
  useCatalogStore((s) =>
    denomId
      ? s.rates.find((r) => r.denominationId === denomId && r.active) ?? null
      : null,
  );

export const useActiveFxRate = (quote = "NGN", base = "USD") =>
  useCatalogStore(
    (s) =>
      s.fxRates.find(
        (f) =>
          f.baseCurrency === base &&
          f.quoteCurrency === quote &&
          f.validTo === null,
      )?.rate ?? 0,
  );

export const useActivePayoutCurrencies = () =>
  useCatalogStore((s) => s.payoutCurrencies.filter((p) => p.status === "Active"));

const ACQ_META: Record<string, { symbol: string; name: string }> = {
  CNY: { symbol: "¥", name: "Chinese Yuan (RMB)" },
};

export const useAcquisitionCurrencies = () =>
  useCatalogStore((s) => {
    const payoutCodes = new Set(s.payoutCurrencies.map((p) => p.code));
    const seen = new Set<string>();
    const list: { code: string; symbol: string; name: string }[] = [];
    for (const fx of s.fxRates) {
      if (fx.validTo !== null) continue;
      if (fx.baseCurrency === "USD") continue;
      if (payoutCodes.has(fx.baseCurrency)) continue;
      if (seen.has(fx.baseCurrency)) continue;
      seen.add(fx.baseCurrency);
      const m = ACQ_META[fx.baseCurrency] ?? {
        symbol: fx.baseCurrency,
        name: fx.baseCurrency,
      };
      list.push({ code: fx.baseCurrency, symbol: m.symbol, name: m.name });
    }
    return list;
  });

// ---- Non-reactive helpers (for use in event handlers / one-off reads) -----

export const getActiveFxRate = (quote = "NGN", base = "USD") =>
  useCatalogStore.getState().fxRates.find(
    (f) =>
      f.baseCurrency === base &&
      f.quoteCurrency === quote &&
      f.validTo === null,
  )?.rate ?? 0;

export const getActiveRateForDenom = (denomId: string) =>
  useCatalogStore
    .getState()
    .rates.find((r) => r.denominationId === denomId && r.active) ?? null;

export const getDenominationsForBrandCountry = (
  brandId: string,
  countryId: string,
) =>
  useCatalogStore
    .getState()
    .denominations.filter(
      (d) => d.brandId === brandId && d.countryId === countryId,
    );

export const useDenomsForBrandCountry = (brandId: string, countryId: string) =>
  useCatalogStore((s) =>
    s.denominations.filter(
      (d) => d.brandId === brandId && d.countryId === countryId,
    ),
  );