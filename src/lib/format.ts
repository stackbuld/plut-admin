import { format, formatDistanceToNow, parseISO } from "date-fns";

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

export const currencySymbol = (code: string) => {
  const m: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$",
    JPY: "¥", BRL: "R$", NGN: "₦", GHS: "₵",
  };
  return m[code] ?? "";
};
