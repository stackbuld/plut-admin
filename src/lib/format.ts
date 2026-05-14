export const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const formatCurrency = (amount: number, code: string) => {
  const symbols: Record<string, string> = {
    USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$",
    SEK: "kr", JPY: "¥", BRL: "R$",
  };
  const sym = symbols[code] ?? "";
  return `${sym}${amount.toFixed(2)} ${code}`;
};

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};
