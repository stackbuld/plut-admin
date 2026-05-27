export type TradeStatus = "Submitted" | "Approved" | "Paid" | "Rejected" | "Cancelled";
export type RejectReason =
  | "INVALID_CARD"
  | "WRONG_BRAND"
  | "WRONG_REGION"
  | "WRONG_AMOUNT"
  | "DUPLICATE_CARD"
  | "LOW_QUALITY_PROOF"
  | "RESOLD_CARD"
  | "OTHER";

export const REJECT_REASONS: { value: RejectReason; label: string; help: string; ban?: boolean }[] = [
  { value: "INVALID_CARD", label: "Invalid card", help: "Card appears invalid or expired" },
  { value: "WRONG_BRAND", label: "Wrong brand", help: "Card is not the declared brand" },
  { value: "WRONG_REGION", label: "Wrong region", help: "Card region doesn't match" },
  { value: "WRONG_AMOUNT", label: "Wrong amount", help: "Face value doesn't match declared" },
  { value: "DUPLICATE_CARD", label: "Duplicate card", help: "Card was previously submitted" },
  { value: "LOW_QUALITY_PROOF", label: "Low-quality proof", help: "Photos are blurry or incomplete" },
  { value: "RESOLD_CARD", label: "Resold card", help: "Card has been used or resold", ban: true },
  { value: "OTHER", label: "Other", help: "See notes below" },
];

export interface Country {
  id: string;
  code: string;
  name: string;
  flag: string;
  currency: string;
}

export const countries: Country[] = [
  { id: "c-us", code: "USA", name: "United States", flag: "🇺🇸", currency: "USD" },
  { id: "c-uk", code: "UK", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { id: "c-ca", code: "CAN", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { id: "c-de", code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { id: "c-au", code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { id: "c-fr", code: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
  { id: "c-jp", code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY" },
  { id: "c-br", code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL" },
];

export interface Brand {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  logoEmoji: string;
  countryIds: string[];
}

export const brands: Brand[] = [
  { id: "b-apple", name: "Apple", code: "APPLE", active: true, createdAt: "01 Jan 2026", logoEmoji: "🍎", countryIds: ["c-us", "c-uk", "c-ca"] },
  { id: "b-amazon", name: "Amazon", code: "AMAZON", active: true, createdAt: "05 Jan 2026", logoEmoji: "🛒", countryIds: ["c-us", "c-uk"] },
  { id: "b-steam", name: "Steam", code: "STEAM", active: true, createdAt: "08 Jan 2026", logoEmoji: "🎮", countryIds: ["c-us"] },
  { id: "b-itunes", name: "iTunes", code: "ITUNES", active: false, createdAt: "10 Jan 2026", logoEmoji: "🎵", countryIds: ["c-us", "c-uk"] },
  { id: "b-gplay", name: "Google Play", code: "GOOGLE_PLAY", active: true, createdAt: "15 Jan 2026", logoEmoji: "🎮", countryIds: ["c-us", "c-uk", "c-de"] },
  { id: "b-ebay", name: "eBay", code: "EBAY", active: false, createdAt: "20 Jan 2026", logoEmoji: "🎁", countryIds: ["c-us"] },
  { id: "b-netflix", name: "Netflix", code: "NETFLIX", active: true, createdAt: "22 Jan 2026", logoEmoji: "🎬", countryIds: ["c-us", "c-uk"] },
  { id: "b-xbox", name: "Xbox", code: "XBOX", active: true, createdAt: "25 Jan 2026", logoEmoji: "🎮", countryIds: ["c-us", "c-au"] },
];

export type CardType = "Physical" | "E-code";
export interface Denomination {
  id: string;
  brandId: string;
  countryId: string;
  amount: number;
  currency: string;
  cardType: CardType;
  active: boolean;
}
export interface Rate {
  id: string;
  denominationId: string;
  marketRateUsd: number;
  customerRateUsd: number;
  markupType: "Percentage" | "Fixed";
  markupValue: number;
  source: "Manual" | "Auto";
  validFrom: string;
  active: boolean;
  // Supplier quote context (Multi-currency acquisition model)
  acquisitionCurrency?: "CNY" | null; // CNY when Mode B; null otherwise
  acquisitionRatePerCardDollar?: number | null; // e.g. 5.4 RMB/$1
  supplierNgnPerDollar?: number | null; // Mode A audit-only
}

const denoms: Denomination[] = [];
const ratesArr: Rate[] = [];
let dId = 1000;
let rId = 2000;

function addDenom(brandId: string, countryId: string, amount: number, cardType: CardType, marketRate: number | null, markupPct = 1.2) {
  const country = countries.find((c) => c.id === countryId)!;
  const id = `d-${dId++}`;
  denoms.push({ id, brandId, countryId, amount, currency: country.currency, cardType, active: true });
  if (marketRate != null) {
    const cust = +(marketRate * (1 - markupPct / 100)).toFixed(4);
    ratesArr.push({
      id: `r-${rId++}`,
      denominationId: id,
      marketRateUsd: marketRate,
      customerRateUsd: cust,
      markupType: "Percentage",
      markupValue: markupPct,
      source: "Manual",
      validFrom: "01 May 2026",
      active: true,
      // Default seed: assume supplier quoted in NGN
      acquisitionCurrency: null,
      acquisitionRatePerCardDollar: null,
      supplierNgnPerDollar: Math.round(marketRate * 1550),
    });
  }
}

// Apple / USA
addDenom("b-apple", "c-us", 10, "Physical", 0.82, 4.8);
addDenom("b-apple", "c-us", 25, "Physical", 0.82, 3.7);
addDenom("b-apple", "c-us", 50, "Physical", 0.82, 2.4);
addDenom("b-apple", "c-us", 100, "Physical", 0.82, 1.2);
addDenom("b-apple", "c-us", 50, "E-code", 0.82, 3.7);
addDenom("b-apple", "c-us", 100, "E-code", 0.82, 1.2);
// Apple / UK
addDenom("b-apple", "c-uk", 10, "Physical", 0.80, 5.0);
addDenom("b-apple", "c-uk", 25, "Physical", 0.80, 3.7);
addDenom("b-apple", "c-uk", 50, "Physical", null);
// Apple / Canada — none
// Amazon / USA
addDenom("b-amazon", "c-us", 25, "Physical", 0.78, 2.0);
addDenom("b-amazon", "c-us", 100, "Physical", 0.80, 1.5);
// Steam
addDenom("b-steam", "c-us", 50, "E-code", 0.74, 2.0);
// Google Play
addDenom("b-gplay", "c-us", 25, "E-code", 0.76, 2.0);
addDenom("b-gplay", "c-uk", 25, "E-code", 0.74, 2.5);
// Netflix
addDenom("b-netflix", "c-us", 50, "E-code", 0.77, 2.0);
// Xbox
addDenom("b-xbox", "c-au", 20, "E-code", 0.55, 3.0);

export const denominations = denoms;
export const rates = ratesArr;

// Rate history (a few extra inactive rates for the first denom)
export const rateHistory: Rate[] = [
  { id: "rh-1", denominationId: denoms[3].id, marketRateUsd: 0.80, customerRateUsd: 0.784, markupType: "Percentage", markupValue: 2.0, source: "Manual", validFrom: "15 Apr 2026", active: false },
  { id: "rh-2", denominationId: denoms[3].id, marketRateUsd: 0.81, customerRateUsd: 0.794, markupType: "Percentage", markupValue: 2.0, source: "Auto", validFrom: "01 Apr 2026", active: false },
];

// ===== Trades =====
export interface ProofImage {
  id: string;
  label: string;
  uploadedAt: string;
  sizeKb: number;
}
export interface TradeLineItem {
  denom: string;
  currency: string;
  qty: number;
  customerRateUsd: number;
  payoutPerCardNgn: number;
  lineNgn: number;
}
export interface AiAnalysis {
  decision: "PASSED" | "FAILED" | "REVIEW";
  confidence: number;
  probableBrand: string;
  flags: string[];
  notes: string;
}
export interface FraudScore {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  breakdown: { label: string; delta: number }[];
}
export interface StatusEvent {
  at: string;
  label: string;
}

export interface Trade {
  id: string;
  customerId: string;
  customerEmail: string;
  brandId: string;
  brandCode: string;
  countryCode: string;
  format: CardType;
  totalUsd: number;
  payoutNgn: number;
  feeNgn: number;
  grossNgn: number;
  compNgn: number;
  status: TradeStatus;
  submittedAt: string; // ISO
  slaDeadlineAt: string; // ISO
  paidAt?: string;
  rejectedAt?: string;
  rejectionReason?: RejectReason;
  rejectionNotes?: string;
  lineItems: TradeLineItem[];
  proofImages: ProofImage[];
  ai: AiAnalysis;
  fraud: FraudScore;
  history: StatusEvent[];
  kycTier: string;
  activeStrikes: number;
  pastTrades: number;
}

const now = Date.now();
const min = (m: number) => new Date(now - m * 60_000).toISOString();
const fwd = (m: number) => new Date(now + m * 60_000).toISOString();

function makeTrade(
  i: number,
  brandId: string,
  brandCode: string,
  countryCode: string,
  totalUsd: number,
  payoutNgn: number,
  format: CardType,
  customerEmail: string,
  status: TradeStatus,
  submittedMinAgo: number,
  slaMinFromNow: number,
  rejectionReason?: RejectReason,
): Trade {
  const submittedAt = min(submittedMinAgo);
  const grossNgn = Math.round(payoutNgn / 0.98);
  const feeNgn = grossNgn - payoutNgn;
  const lineItems: TradeLineItem[] = [
    {
      denom: `$${totalUsd}`,
      currency: "USD",
      qty: 1,
      customerRateUsd: 0.81,
      payoutPerCardNgn: payoutNgn,
      lineNgn: payoutNgn,
    },
  ];
  return {
    id: `txn_gc_${String(i).padStart(2, "0")}${"ABCDEFGH"[i % 8]}A`,
    customerId: `user_${String(0x01a0 + i).toUpperCase()}`,
    customerEmail,
    brandId,
    brandCode,
    countryCode,
    format,
    totalUsd,
    payoutNgn,
    feeNgn,
    grossNgn,
    compNgn: 0,
    status,
    submittedAt,
    slaDeadlineAt: fwd(slaMinFromNow),
    paidAt: status === "Paid" ? min(submittedMinAgo - 10) : undefined,
    rejectedAt: status === "Rejected" ? min(submittedMinAgo - 5) : undefined,
    rejectionReason,
    lineItems,
    proofImages: [
      { id: "p1", label: "Front", uploadedAt: submittedAt, sizeKb: 1820 },
      { id: "p2", label: "Back", uploadedAt: submittedAt, sizeKb: 1640 },
      { id: "p3", label: "Receipt", uploadedAt: submittedAt, sizeKb: 980 },
    ],
    ai: {
      decision: status === "Rejected" ? "FAILED" : "PASSED",
      confidence: status === "Rejected" ? 64 : 92,
      probableBrand: `${brandCode} (${countryCode})`,
      flags: status === "Rejected" ? ["Low resolution", "Glare on serial"] : [],
      notes:
        status === "Rejected"
          ? "Image quality below threshold. Manual review recommended."
          : `${format} ${brandCode} ${countryCode} card. Back visible. No anomalies.`,
    },
    fraud: {
      score: status === "Rejected" ? 48 : 12,
      level: status === "Rejected" ? "MEDIUM" : "LOW",
      breakdown: [
        { label: "Account age (> 6 months)", delta: 0 },
        { label: "Submission rate (1 in 24h)", delta: 5 },
        { label: "Duplicate check", delta: 0 },
        { label: "KYC tier 2", delta: 0 },
        { label: status === "Rejected" ? "Image quality (low res)" : "Image quality", delta: status === "Rejected" ? 43 : 7 },
      ],
    },
    history: [
      { at: submittedAt, label: "Submitted" },
      { at: min(submittedMinAgo - 1), label: "AI pipeline started" },
      { at: min(submittedMinAgo - 2), label: `AI ${status === "Rejected" ? "flagged for review" : "passed"}` },
      { at: min(submittedMinAgo - 2), label: "Assigned to review queue" },
      ...(status === "Paid" ? [{ at: min(submittedMinAgo - 10), label: "Payout credited" }] : []),
    ],
    kycTier: "Tier 2",
    activeStrikes: status === "Rejected" ? 1 : 0,
    pastTrades: 42,
  };
}

export const trades: Trade[] = [
  makeTrade(1, "b-apple", "APPLE", "USA", 250, 308500, "Physical", "kemi.adebayo@gmail.com", "Submitted", 8, 2),
  makeTrade(2, "b-amazon", "AMAZON", "USA", 100, 155000, "Physical", "tunde.o@yahoo.com", "Submitted", 6, 4),
  makeTrade(3, "b-steam", "STEAM", "USA", 50, 92400, "E-code", "amaka.eze@gmail.com", "Submitted", 22, -3),
  makeTrade(4, "b-apple", "APPLE", "USA", 300, 420000, "Physical", "biodun.k@hotmail.com", "Submitted", 4, 6),
  makeTrade(5, "b-gplay", "GOOGLE_PLAY", "UK", 25, 64200, "E-code", "femi.shola@gmail.com", "Submitted", 2, 8),
  makeTrade(6, "b-netflix", "NETFLIX", "USA", 50, 77500, "E-code", "ngozi.a@gmail.com", "Approved", 60, 0),
  makeTrade(7, "b-apple", "APPLE", "UK", 100, 124000, "Physical", "chinedu.m@yahoo.com", "Paid", 180, 0),
  makeTrade(8, "b-amazon", "AMAZON", "USA", 200, 310000, "Physical", "yemi.t@gmail.com", "Paid", 220, 0),
  makeTrade(9, "b-xbox", "XBOX", "AU", 20, 22000, "E-code", "abel.ibrahim@gmail.com", "Rejected", 340, 0, "LOW_QUALITY_PROOF"),
  makeTrade(10, "b-ebay", "EBAY", "USA", 50, 77500, "Physical", "ifeoma.c@gmail.com", "Rejected", 400, 0, "DUPLICATE_CARD"),
  makeTrade(11, "b-apple", "APPLE", "USA", 75, 116000, "Physical", "olu.bankole@gmail.com", "Paid", 720, 0),
  makeTrade(12, "b-itunes", "ITUNES", "UK", 30, 46800, "Physical", "sade.olumide@gmail.com", "Cancelled", 1200, 0),
];

// ===== Users =====
export type BlockType = "24-hour" | "7-day" | "Permanent" | "Custom";
export interface UserStrike {
  number: number;
  reason: RejectReason;
  tradeId: string;
  addedAt: string;
  expired: boolean;
}
export interface UserBlock {
  id: string;
  type: BlockType;
  reason: string;
  startedAt: string;
  expiresAt: string;
  active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  kycTier: string;
  createdAt: string;
  sellActive: boolean;
  activeStrikes: number;
  totalStrikes: number;
  pastTrades: number;
  allTimePayoutNgn: number;
  strikes: UserStrike[];
  blocks: UserBlock[];
}

export const users: AdminUser[] = [
  {
    id: "user_01HXZ",
    email: "kemi.adebayo@gmail.com",
    kycTier: "Tier 2",
    createdAt: "01 Jan 2026",
    sellActive: true,
    activeStrikes: 1,
    totalStrikes: 3,
    pastTrades: 42,
    allTimePayoutNgn: 4_200_000,
    strikes: [
      { number: 3, reason: "INVALID_CARD", tradeId: "txn_gc_01AA", addedAt: "20 May 12:03", expired: true },
      { number: 2, reason: "DUPLICATE_CARD", tradeId: "txn_gc_00XY", addedAt: "10 May 15:22", expired: true },
      { number: 1, reason: "WRONG_REGION", tradeId: "txn_gc_00AB", addedAt: "2 May 09:11", expired: true },
    ],
    blocks: [
      { id: "blk-1", type: "24-hour", reason: "2 strikes / 24h", startedAt: "20 May 12:03", expiresAt: "21 May 12:03", active: false },
    ],
  },
  {
    id: "user_02KLM",
    email: "tunde.o@yahoo.com",
    kycTier: "Tier 1",
    createdAt: "10 Feb 2026",
    sellActive: false,
    activeStrikes: 2,
    totalStrikes: 4,
    pastTrades: 18,
    allTimePayoutNgn: 1_240_000,
    strikes: [],
    blocks: [
      { id: "blk-2", type: "7-day", reason: "Pattern review", startedAt: "22 May 09:00", expiresAt: "29 May 09:00", active: true },
    ],
  },
  {
    id: "user_03NOP",
    email: "biodun.k@hotmail.com",
    kycTier: "Tier 2",
    createdAt: "15 Mar 2026",
    sellActive: false,
    activeStrikes: 0,
    totalStrikes: 6,
    pastTrades: 9,
    allTimePayoutNgn: 410_000,
    strikes: [],
    blocks: [
      { id: "blk-3", type: "Permanent", reason: "Confirmed fraud — resold card", startedAt: "10 May 2026", expiresAt: "Never", active: true },
    ],
  },
];

export interface BlacklistedImage {
  id: string;
  hash: string;
  addedAt: string;
  addedBy: string;
  reason: RejectReason;
}

export const imageBlacklist: BlacklistedImage[] = [
  { id: "bl-1", hash: "a1b2c3d4e5f6a7b8c9d0", addedAt: "10 May 2026", addedBy: "admin@plut.finance", reason: "RESOLD_CARD" },
  { id: "bl-2", hash: "f6g7h8i9j0k1l2m3n4o5", addedAt: "5 May 2026", addedBy: "admin@plut.finance", reason: "DUPLICATE_CARD" },
];

// ===== Derived helpers =====
export const brandById = (id: string) => brands.find((b) => b.id === id);
export const countryById = (id: string) => countries.find((c) => c.id === id);
export const countryByCode = (code: string) => countries.find((c) => c.code === code);
export const denomsForBrandCountry = (brandId: string, countryId: string) =>
  denoms.filter((d) => d.brandId === brandId && d.countryId === countryId);
export const activeRateForDenom = (denomId: string) => ratesArr.find((r) => r.denominationId === denomId && r.active);
export const tradeById = (id: string) => trades.find((t) => t.id === id);
export const userById = (id: string) => users.find((u) => u.id === id);

// Dashboard stats
export const pendingTradesCount = trades.filter((t) => t.status === "Submitted").length;
export const pastSlaCount = trades.filter((t) => t.status === "Submitted" && new Date(t.slaDeadlineAt).getTime() < Date.now()).length;

export const dashboardStats = {
  pendingReview: pendingTradesCount,
  paidTodayNgn: trades.filter((t) => t.status === "Paid").reduce((s, t) => s + t.payoutNgn, 0),
  paidTodayCount: trades.filter((t) => t.status === "Paid").length,
  rejectedToday: trades.filter((t) => t.status === "Rejected").length,
  pastSla: pastSlaCount,
  activeBrands: brands.filter((b) => b.active).length,
  avgReviewMin: 8,
};

export const recentBlockedUsers = users.filter((u) => u.blocks.some((b) => b.active));

// ===== FX Rates =====
export interface FxRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: "Manual" | "Auto";
  validFrom: string;
  validTo: string | null; // null = active
}
export const fxRates: FxRate[] = [
  { id: "fx-1", baseCurrency: "USD", quoteCurrency: "NGN", rate: 1550.0, source: "Manual", validFrom: "01 May 2026 09:00", validTo: null },
  { id: "fx-2", baseCurrency: "USD", quoteCurrency: "NGN", rate: 1520.0, source: "Manual", validFrom: "20 Apr 2026 14:00", validTo: "01 May 2026 09:00" },
  { id: "fx-3", baseCurrency: "USD", quoteCurrency: "NGN", rate: 1495.0, source: "Auto", validFrom: "01 Apr 2026 00:00", validTo: "20 Apr 2026 14:00" },
  { id: "fx-4", baseCurrency: "USD", quoteCurrency: "GHS", rate: 16.20, source: "Manual", validFrom: "25 May 2026 14:00", validTo: null },
  { id: "fx-5", baseCurrency: "CNY", quoteCurrency: "NGN", rate: 203.0, source: "Manual", validFrom: "27 May 2026 09:12", validTo: null },
  { id: "fx-6", baseCurrency: "CNY", quoteCurrency: "NGN", rate: 201.5, source: "Manual", validFrom: "22 May 2026 11:00", validTo: "27 May 2026 09:12" },
  { id: "fx-7", baseCurrency: "GHS", quoteCurrency: "NGN", rate: 95.68, source: "Manual", validFrom: "25 May 2026 14:00", validTo: null },
];
export const activeFxRate = (quote = "NGN", base = "USD") =>
  fxRates.find((f) => f.baseCurrency === base && f.quoteCurrency === quote && f.validTo === null)?.rate ?? 1550;

// ===== Payout Currencies =====
export type PayoutCurrencyStatus = "Active" | "Draft" | "Inactive";
export interface PayoutCurrency {
  code: string;
  name: string;
  symbol: string;
  status: PayoutCurrencyStatus;
}
export const payoutCurrencies: PayoutCurrency[] = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", status: "Active" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", status: "Active" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", status: "Draft" },
  { code: "ZAR", name: "South African Rand", symbol: "R", status: "Draft" },
];

export const activePayoutCurrencies = () =>
  payoutCurrencies.filter((c) => c.status === "Active");

// Acquisition currencies: non-USD bases that have an active FX rate to NGN and
// are NOT payout currencies (e.g. CNY). Used to supply the supplier-quote
// dropdown in the Set Rate modal.
export const acquisitionCurrencies = (): { code: string; symbol: string; name: string }[] => {
  const payoutCodes = new Set(payoutCurrencies.map((p) => p.code));
  const seen = new Set<string>();
  const list: { code: string; symbol: string; name: string }[] = [];
  for (const fx of fxRates) {
    if (fx.validTo !== null) continue;
    if (fx.baseCurrency === "USD") continue;
    if (payoutCodes.has(fx.baseCurrency)) continue;
    if (seen.has(fx.baseCurrency)) continue;
    seen.add(fx.baseCurrency);
    const meta: Record<string, { symbol: string; name: string }> = {
      CNY: { symbol: "¥", name: "Chinese Yuan (RMB)" },
    };
    const m = meta[fx.baseCurrency] ?? { symbol: fx.baseCurrency, name: fx.baseCurrency };
    list.push({ code: fx.baseCurrency, symbol: m.symbol, name: m.name });
  }
  return list;
};