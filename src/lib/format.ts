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

export const currencySymbol = (code: string) => {
  const m: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$",
    JPY: "¥", BRL: "R$", NGN: "₦", GHS: "₵",
  };
  return m[code] ?? "";
};
