import type { AccountKind, OperationalAccountDto } from "@/api/types/ledger-float.types";

/**
 * Turns a chart-of-accounts path into something an operator without accounting training can read.
 *
 * The console used to show `liabilities:payable:providers:vtpass:ngn` and nothing else — correct,
 * and useless unless you already know the COA. These helpers put a plain name and a plain purpose
 * in front of the path; the path itself stays visible underneath, because it is what actually gets
 * posted and an engineer reading over someone's shoulder needs to see it.
 */

/** What this kind of account means, in one phrase. */
export const KIND_LABEL: Record<AccountKind, string> = {
  MoneyWeHold: "Money we hold",
  MoneyWeOwe: "Money we owe",
  Income: "Income we've earned",
  Cost: "Costs we've paid",
  Capital: "Company capital",
  Other: "Other",
};

export const KIND_HELP: Record<AccountKind, string> = {
  MoneyWeHold:
    "Funds Plut actually has somewhere — a bank float, a provider balance, crypto in custody.",
  MoneyWeOwe: "Funds that belong to someone else — user balances, money owed to a provider.",
  Income: "Fees, commission and spread Plut has earned.",
  Cost: "What Plut has spent — provider fees, rewards, goodwill adjustments.",
  Capital: "The company's own money in the business.",
  Other: "An account whose path doesn't match any known pattern — worth asking an engineer about.",
};

/** Human names for the `category` metadata each manifest account declares. */
const CATEGORY_LABEL: Record<string, string> = {
  bank_float: "Bank float",
  transit: "In transit",
  vas_provider_payable: "Owed to VAS provider",
  fee_revenue: "Fee income",
  commission_revenue: "Commission income",
  spread_revenue: "Spread income",
  provider_fees: "Provider fees",
  cogs: "Cost of sales",
  customer_rewards: "Customer rewards",
  sla_compensation: "SLA compensation",
  admin_adjustment: "Admin adjustments",
  equity_capital: "Share capital",
  retained_earnings: "Retained earnings",
  crypto_custody: "Crypto custody",
};

export const categoryLabel = (category: string | null): string | null =>
  category ? (CATEGORY_LABEL[category] ?? humanize(category)) : null;

/**
 * The name shown as the row's heading. Prefers the description the manifest already declares
 * (someone wrote it for exactly this purpose), then falls back to composing provider + category,
 * then to a humanized path — never to the raw path, which is displayed separately anyway.
 */
export const accountName = (a: OperationalAccountDto): string => {
  if (a.description) return a.description;

  const category = categoryLabel(a.category);
  if (a.provider && category) return `${humanize(a.provider)} — ${category}`;
  if (category) return `${category}${a.assetCode ? ` (${a.assetCode})` : ""}`;

  // Drop the leading type segment ("assets", "liabilities", …) — the Kind column already says that.
  const segments = a.account.split(":");
  return humanize(segments.slice(1).join(" ")) || a.account;
};

/**
 * One sentence on what this account being low or empty would mean. Only accounts money is posted
 * OUT of can run dry; for the rest, a low balance is not a problem to fix.
 */
export const riskNote = (a: OperationalAccountDto): string =>
  a.canRunDry
    ? "Money is paid out of this account, so it can run empty — and when it does, real user transactions start failing."
    : "This account only ever receives money in normal operation, so it can't run dry.";

const humanize = (raw: string): string =>
  raw
    .replace(/[:_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
