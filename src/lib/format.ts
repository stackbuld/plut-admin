import { format, formatDistanceToNow, parseISO, intervalToDuration, formatDuration as dfFormatDuration } from "date-fns";
import type { Duration } from "date-fns";

export const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const formatCurrency = (amount: number, code: string) => {
  const symbols: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$",
    SEK: "kr", JPY: "¥", BRL: "R$",
  };
  return `${symbols[code] ?? ""}${amount.toFixed(2)} ${code}`;
};

export const relativeTime = (iso: string) =>
  formatDistanceToNow(parseISO(iso), { addSuffix: true });

export const formatTime = (iso: string) =>
  format(parseISO(iso), "HH:mm");

export const formatDate = (iso: string) =>
  format(parseISO(iso), "dd MMM yyyy");

export const formatDateTime = (iso: string) =>
  format(parseISO(iso), "dd MMM yyyy, HH:mm");

export const truncId = (id: string, n = 12) =>
  id.length <= n ? id : `${id.slice(0, n)}…`;

const DURATION_UNITS: (keyof Duration)[] = ["years", "months", "days", "hours", "minutes", "seconds"];

export const formatDuration = (seconds: number): string => {
  const d = intervalToDuration({ start: 0, end: Math.round(seconds) * 1000 });
  const nonZero = DURATION_UNITS.filter((u) => (d[u] ?? 0) > 0).slice(0, 2);
  return nonZero.length ? dfFormatDuration(d, { format: nonZero }) : "< 1 second";
};

// USD costs range from dollars down to tiny fractions of a cent (a single LLM call). Scale the
// precision so small amounts stay legible instead of rounding to "$0.00".
export const formatUsd = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  const abs = Math.abs(n);
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(6)}`;
};

// Compact token counts: 1234 → "1.2k", 1_200_000 → "1.2M".
export const formatTokens = (n: number): string => {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

export const currencySymbol = (code: string) => {
  const m: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$",
    JPY: "¥", BRL: "R$", NGN: "₦", GHS: "₵",
  };
  return m[code] ?? "";
};
