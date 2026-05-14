export type TradeStatus = "Pending" | "Completed" | "Rejected" | "Processing";

export interface Trade {
  id: string;
  user: string;
  brand: string;
  country: string;
  cards: number;
  payout: number;
  status: TradeStatus;
  sla: string;
  submitted: string;
  rejectionReason?: string;
  lineItems: { denom: string; type: "Physical" | "E-Code"; rate: number; payout: number }[];
}

const brandsList = ["Apple", "Steam", "Amazon", "Google Play", "iTunes", "Netflix", "Visa", "eBay", "Sephora", "Nike", "PlayStation", "Xbox"];

export const trades: Trade[] = [
  { id: "TRD-00291", user: "kemi.adebayo@gmail.com", brand: "Apple", country: "United States", cards: 2, payout: 47500, status: "Pending", sla: "May 14, 2026 · 4:00 PM", submitted: "May 13, 2026",
    lineItems: [
      { denom: "$25.00 USD", type: "E-Code", rate: 1580, payout: 39500 },
      { denom: "$5.00 USD", type: "E-Code", rate: 1600, payout: 8000 },
    ]},
  { id: "TRD-00290", user: "tunde.o@yahoo.com", brand: "Steam", country: "United Kingdom", cards: 1, payout: 31200, status: "Completed", sla: "—", submitted: "May 13, 2026",
    lineItems: [{ denom: "£20.00 GBP", type: "E-Code", rate: 1560, payout: 31200 }]},
  { id: "TRD-00289", user: "amaka.eze@gmail.com", brand: "Amazon", country: "United States", cards: 4, payout: 158000, status: "Processing", sla: "May 14, 2026 · 2:00 PM", submitted: "May 13, 2026",
    lineItems: [{ denom: "$100.00 USD", type: "Physical", rate: 1580, payout: 158000 }]},
  { id: "TRD-00288", user: "biodun.k@hotmail.com", brand: "Google Play", country: "Canada", cards: 1, payout: 15600, status: "Rejected", sla: "—", submitted: "May 12, 2026", rejectionReason: "Card was previously redeemed. Balance shows zero on issuer verification.",
    lineItems: [{ denom: "C$15.00 CAD", type: "Physical", rate: 1040, payout: 15600 }]},
  { id: "TRD-00287", user: "femi.shola@gmail.com", brand: "iTunes", country: "United States", cards: 3, payout: 118500, status: "Completed", sla: "—", submitted: "May 12, 2026",
    lineItems: [{ denom: "$25.00 USD", type: "E-Code", rate: 1580, payout: 39500 }]},
  { id: "TRD-00286", user: "ngozi.a@gmail.com", brand: "Netflix", country: "United Kingdom", cards: 2, payout: 62400, status: "Pending", sla: "May 14, 2026 · 6:00 PM", submitted: "May 12, 2026",
    lineItems: [{ denom: "£20.00 GBP", type: "E-Code", rate: 1560, payout: 31200 }]},
  { id: "TRD-00285", user: "chinedu.m@yahoo.com", brand: "Visa", country: "Germany", cards: 1, payout: 79000, status: "Completed", sla: "—", submitted: "May 12, 2026",
    lineItems: [{ denom: "€50.00 EUR", type: "Physical", rate: 1580, payout: 79000 }]},
  { id: "TRD-00284", user: "yemi.t@gmail.com", brand: "PlayStation", country: "United States", cards: 1, payout: 39500, status: "Processing", sla: "May 14, 2026 · 10:00 AM", submitted: "May 11, 2026",
    lineItems: [{ denom: "$25.00 USD", type: "E-Code", rate: 1580, payout: 39500 }]},
  { id: "TRD-00283", user: "abel.ibrahim@gmail.com", brand: "Xbox", country: "Australia", cards: 2, payout: 28800, status: "Completed", sla: "—", submitted: "May 11, 2026",
    lineItems: [{ denom: "A$20.00 AUD", type: "E-Code", rate: 720, payout: 14400 }]},
  { id: "TRD-00282", user: "ifeoma.c@gmail.com", brand: "eBay", country: "United States", cards: 1, payout: 79000, status: "Rejected", sla: "—", submitted: "May 11, 2026", rejectionReason: "Image of card was unclear. Could not verify the redemption code.",
    lineItems: [{ denom: "$50.00 USD", type: "Physical", rate: 1580, payout: 79000 }]},
  { id: "TRD-00281", user: "olu.bankole@gmail.com", brand: "Sephora", country: "United States", cards: 1, payout: 31600, status: "Pending", sla: "May 14, 2026 · 8:00 PM", submitted: "May 11, 2026",
    lineItems: [{ denom: "$20.00 USD", type: "Physical", rate: 1580, payout: 31600 }]},
  { id: "TRD-00280", user: "sade.olumide@gmail.com", brand: "Nike", country: "United Kingdom", cards: 1, payout: 46800, status: "Completed", sla: "—", submitted: "May 10, 2026",
    lineItems: [{ denom: "£30.00 GBP", type: "Physical", rate: 1560, payout: 46800 }]},
];

export const brands = brandsList.map((name, i) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name: `${name}${name.includes("Card") || name.includes("Wallet") ? "" : i === 0 ? " Gift Card" : i === 1 ? " Wallet" : ""}`,
  shortName: name,
  countries: [4, 6, 8, 5, 4, 3, 9, 5, 2, 4, 6, 5][i],
  active: i !== 8 && i !== 11 ? true : i === 11,
}));

export interface Country {
  id: string;
  flag: string;
  name: string;
  currency: string;
  denominations: number;
  active: boolean;
}

export const countries: Country[] = [
  { id: "us", flag: "🇺🇸", name: "United States", currency: "USD", denominations: 24, active: true },
  { id: "gb", flag: "🇬🇧", name: "United Kingdom", currency: "GBP", denominations: 18, active: true },
  { id: "au", flag: "🇦🇺", name: "Australia", currency: "AUD", denominations: 14, active: true },
  { id: "ca", flag: "🇨🇦", name: "Canada", currency: "CAD", denominations: 16, active: true },
  { id: "de", flag: "🇩🇪", name: "Germany", currency: "EUR", denominations: 20, active: true },
  { id: "fr", flag: "🇫🇷", name: "France", currency: "EUR", denominations: 20, active: true },
  { id: "it", flag: "🇮🇹", name: "Italy", currency: "EUR", denominations: 12, active: true },
  { id: "es", flag: "🇪🇸", name: "Spain", currency: "EUR", denominations: 10, active: false },
  { id: "nl", flag: "🇳🇱", name: "Netherlands", currency: "EUR", denominations: 10, active: true },
  { id: "se", flag: "🇸🇪", name: "Sweden", currency: "SEK", denominations: 8, active: true },
  { id: "jp", flag: "🇯🇵", name: "Japan", currency: "JPY", denominations: 6, active: false },
  { id: "br", flag: "🇧🇷", name: "Brazil", currency: "BRL", denominations: 6, active: true },
];

export interface Denomination {
  id: string;
  amount: number;
  currency: string;
  brand: string;
  country: string;
  type: "Physical" | "E-Code";
  rate: number;
  payout: number;
  active: boolean;
}

const mkDenom = (i: number, amount: number, currency: string, brand: string, country: string, type: "Physical" | "E-Code", rate: number): Denomination => ({
  id: `DN-${String(1000 + i).padStart(4, "0")}`,
  amount, currency, brand, country, type, rate,
  payout: Math.round(amount * rate),
  active: i !== 7 && i !== 12,
});

export const denominations: Denomination[] = [
  mkDenom(0, 25, "USD", "Apple", "United States", "E-Code", 1580),
  mkDenom(1, 50, "USD", "Apple", "United States", "Physical", 1580),
  mkDenom(2, 100, "USD", "Apple", "United States", "Physical", 1590),
  mkDenom(3, 20, "GBP", "Steam", "United Kingdom", "E-Code", 1560),
  mkDenom(4, 50, "GBP", "Steam", "United Kingdom", "E-Code", 1570),
  mkDenom(5, 100, "USD", "Amazon", "United States", "Physical", 1585),
  mkDenom(6, 50, "USD", "Amazon", "United States", "E-Code", 1575),
  mkDenom(7, 15, "CAD", "Google Play", "Canada", "Physical", 1040),
  mkDenom(8, 25, "USD", "iTunes", "United States", "E-Code", 1580),
  mkDenom(9, 20, "GBP", "Netflix", "United Kingdom", "E-Code", 1560),
  mkDenom(10, 50, "EUR", "Visa", "Germany", "Physical", 1580),
  mkDenom(11, 25, "USD", "PlayStation", "United States", "E-Code", 1580),
  mkDenom(12, 20, "AUD", "Xbox", "Australia", "E-Code", 720),
  mkDenom(13, 50, "USD", "eBay", "United States", "Physical", 1580),
  mkDenom(14, 20, "USD", "Sephora", "United States", "Physical", 1575),
];

const now = Date.now();
export const rates = denominations.map((d, i) => ({
  ...d,
  lastUpdated: new Date(now - [2, 5, 8, 14, 25, 45, 90, 180, 60 * 4, 60 * 8, 60 * 24, 60 * 24 * 2, 6, 9, 60 * 12][i] * 60 * 1000).toISOString(),
}));

export const topBrandsByVolume = [
  { name: "Apple", trades: 412, payout: 18_640_000 },
  { name: "Steam", trades: 318, payout: 12_480_000 },
  { name: "Amazon", trades: 287, payout: 22_100_000 },
  { name: "iTunes", trades: 241, payout: 9_440_000 },
  { name: "Netflix", trades: 198, payout: 6_180_000 },
];

export const stats = {
  totalTrades: { value: 2491, change: 12 },
  pendingTrades: { value: 143, change: 3 },
  activeBrands: { value: 48, change: 0 },
  countries: { value: 12, change: 0 },
};
