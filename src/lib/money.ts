import { currencySymbol } from "./format";

/**
 * Minor-unit conversion that respects the asset's real precision, and does it exactly.
 *
 * Two separate hazards live here:
 *
 *  1. **Precision varies by asset.** Every money input on the ledger console used to hardcode
 *     `amount * 100`, while the ledger picker on those same screens offers `plut-crypto-global` —
 *     where BTC is 8 decimals and ETH is 18. Typing "1 BTC" posted 100 satoshi.
 *
 *  2. **JavaScript numbers cannot hold high-precision minor units.** 1 ETH is 10^18 wei, well past
 *     `Number.MAX_SAFE_INTEGER` (2^53 ≈ 9.007e15), so `1 * 10 ** 18` is not an exact integer and
 *     `Math.round` cannot rescue it. That is exactly why the ledger types these amounts as
 *     `BigInteger` server-side. Conversion here is therefore done with decimal STRING arithmetic —
 *     no floating point at any step — and the value goes on the wire as a string.
 */

/** Falls back to 2 only when the asset is genuinely unknown — never as a default for a known one. */
export const FALLBACK_PRECISION = 2;

/**
 * Exact major → minor conversion. Takes the operator's raw input string and returns a whole-number
 * string, or null when the input isn't a valid amount for this asset (non-numeric, negative, or
 * carrying more decimal places than the asset supports).
 */
export function toMinorString(major: string, precision: number): string | null {
  const trimmed = major.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  // More decimals than the asset can represent — rounding here would silently alter the amount.
  if (fraction.length > precision) return null;

  const digits = (whole + fraction.padEnd(precision, "0")).replace(/^0+(?=\d)/, "");
  return digits === "" ? "0" : digits;
}

/** True when `major` carries more decimal places than the asset supports. */
export const exceedsPrecision = (major: string, precision: number): boolean =>
  /^\d+(\.\d+)?$/.test(major.trim()) && toMinorString(major, precision) === null;

/** Exact minor + minor, for previews. Returns a decimal string. */
export function addMinor(a: number | bigint | string, b: number | bigint | string): string {
  return (toBig(a) + toBig(b)).toString();
}

export function negateMinor(v: number | bigint | string): string {
  return (-toBig(v)).toString();
}

export const isNegativeMinor = (v: number | bigint | string): boolean => toBig(v) < 0n;

/**
 * Renders a minor-unit balance the way an operator reads money: "₦452,300.00", not "45230000".
 * The old Float screen printed raw minor units, which on a triage screen is a real misread risk.
 * Formatting goes through string arithmetic too, so a wei-scale balance renders exactly rather
 * than as the nearest representable double.
 */
export const formatMinor = (
  minor: number | bigint | string,
  assetCode: string | null | undefined,
  precision: number,
): string => {
  const value = toBig(minor);
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(precision + 1, "0");

  const whole = digits.slice(0, digits.length - precision) || "0";
  const fractionAll = precision > 0 ? digits.slice(digits.length - precision) : "";

  // Crypto assets carry far more decimals than anyone wants in a table: show at least 2 places so
  // money looks like money, at most 8 so an 18-decimal balance doesn't render as a wall of dust.
  const shown = Math.min(Math.max(precision, 2), 8);
  const fraction = fractionAll.padEnd(shown, "0").slice(0, shown);

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = `${grouped}${shown > 0 ? `.${fraction}` : ""}`;

  // Sign goes outside the symbol — "-₦380.00", not "₦-380.00". Negative balances are real here
  // (`world` sits at minus the whole ledger), so this is not a hypothetical.
  const sign = negative ? "-" : "";
  const symbol = assetCode ? currencySymbol(assetCode) : "";
  return symbol ? `${sign}${symbol}${body}` : `${sign}${body}${assetCode ? ` ${assetCode}` : ""}`;
};

/** Precision for an asset code, from the registry, with a safe fallback for unknown codes. */
export const precisionOf = (
  assetCode: string | null | undefined,
  assets: { code: string; precision: number }[] | undefined,
): number => {
  if (!assetCode) return FALLBACK_PRECISION;
  return (
    assets?.find((a) => a.code.toUpperCase() === assetCode.toUpperCase())?.precision ??
    FALLBACK_PRECISION
  );
};

function toBig(v: number | bigint | string): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "string") return BigInt(v || "0");
  // A JSON-decoded `long` from the API. Integral by contract; guard anyway rather than let
  // BigInt() throw on an unexpected fractional value.
  return BigInt(Math.trunc(v));
}
