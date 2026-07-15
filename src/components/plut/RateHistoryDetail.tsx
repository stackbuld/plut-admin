import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import { rateQueries } from "@/api";
import { formatDateTime, currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Dedicated, detailed rate-history page for one denomination. Replaces the old slide-over (which read
 * the current-rate status list, not the real history). Shows a catalog/denomination summary on top, a
 * payout-currency breakdown (rate per $1 per currency), and the full chronological rate history below.
 */
export function RateHistoryDetail({ denominationId }: { denominationId: string }) {
  const { data, isLoading } = useQuery(rateQueries.history(denominationId));
  const { data: payouts } = useQuery(rateQueries.payouts(denominationId));
  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);

  const summary = data?.summary;
  const items = data?.items ?? [];

  // Build the Set Rate context from the currently-active history row (it carries the full rate detail).
  const activeItem = items.find((r) => r.isActive) ?? null;
  const ctx: DenomRateContext | null = summary
    ? {
        id: summary.denominationId,
        amount: summary.amount,
        currencyCode: summary.currencyCode,
        cardType: summary.cardType,
        brandName: summary.brandName,
        countryCode: summary.countryName,
        activeRate: activeItem
          ? {
              id: activeItem.rateId,
              acquisitionCurrency: activeItem.acquisitionCurrency,
              acquisitionRatePerCardDollar: activeItem.acquisitionRatePerCardDollar,
              marketRateUsd: activeItem.marketRateUsd,
              customerRateUsd: activeItem.customerRateUsd,
              markupUsd: activeItem.markupUsd,
              markupType: activeItem.markupType,
              markupValue: activeItem.markupValue,
              source: activeItem.source,
              validFrom: activeItem.validFrom,
            }
          : null,
      }
    : null;

  return (
    <div className="space-y-5">
      <Link to="/admin/giftcards/catalog/rates" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to rates
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !summary ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Rate history not found.</p>
      ) : (
        <>
          {/* ── Summary header ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start gap-4">
              {summary.brandImageUrl && (
                <img src={summary.brandImageUrl} alt={summary.brandName} className="h-12 w-12 rounded-lg border object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold">{summary.brandName}</h1>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{summary.countryName}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{summary.cardType}</span>
                  {!summary.denominationIsActive && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Denomination inactive</span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                  {summary.currencySymbol}{summary.amount} {summary.currencyCode} face value
                </p>
              </div>
              <Button onClick={() => ctx && setRateFor(ctx)}>
                {summary.hasActiveRate ? "Update Rate" : "Set Rate"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
              <Stat label="Market rate" value={summary.currentMarketRateUsd != null ? `$${summary.currentMarketRateUsd.toFixed(4)}` : "—"} sub="per $1 (USD)" />
              <Stat label="Customer rate" value={summary.currentCustomerRateUsd != null ? `$${summary.currentCustomerRateUsd.toFixed(4)}` : "—"} sub="per $1 (USD)" highlight />
              <Stat label="Margin" value={summary.currentMarkupUsd != null ? `$${summary.currentMarkupUsd.toFixed(4)}` : "—"} sub="per $1 (USD)" />
              <Stat label="Rate changes" value={String(summary.totalChanges)}
                sub={summary.lastChangedAt ? `last ${formatDateTime(summary.lastChangedAt)}` : "no changes yet"} />
            </div>
          </div>

          {/* ── Payout currencies (rate per $1 + payout in each currency) ─────── */}
          {payouts && payouts.payouts.length > 0 && (
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="border-b px-6 py-3">
                <p className="text-sm font-semibold">Payout currencies</p>
                <p className="text-xs text-muted-foreground">Customer rate expressed in each active payout currency — not just USD.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-secondary/60">
                    <tr className="text-left">
                      {["Currency", "Rate per $1", "Customer rate / $1", `Payout for ${summary.currencySymbol}${summary.amount}`].map((h) => (
                        <th key={h} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.payouts.map((p) => (
                      <tr key={p.currency} className="border-b border-border last:border-0">
                        <td className="px-6 py-3">
                          <span className="font-mono font-semibold">{p.currency}</span>
                          <span className="ml-1 text-xs text-muted-foreground">{p.name}</span>
                        </td>
                        <td className="px-6 py-3 font-mono">
                          {p.hasFxRate && p.fxRatePerUsd != null ? `${p.symbol}${p.fxRatePerUsd.toLocaleString()} / $1` : <MissingFx />}
                        </td>
                        <td className="px-6 py-3 font-mono">
                          {p.hasFxRate && p.customerRatePerCardDollar != null ? `${p.symbol}${p.customerRatePerCardDollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : <MissingFx />}
                        </td>
                        <td className="px-6 py-3 font-mono font-semibold">
                          {p.hasFxRate && p.customerPayoutAmount != null ? `${p.symbol}${p.customerPayoutAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : <MissingFx />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── History table ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b px-6 py-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Rate history</p>
              <span className="text-xs text-muted-foreground">Newest first · active and expired rates</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["Supplier", "Mkt rate", "Cust rate", "Margin", "Mode", "Source", "Valid from", "Valid to", ""].map((h) => (
                      <th key={h} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-xs text-muted-foreground">No rate history yet.</td></tr>
                  )}
                  {items.map((r) => {
                    const margin = r.marketRateUsd ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : 0;
                    const supplier = r.acquisitionCurrency && r.acquisitionRatePerCardDollar != null
                      ? `${r.acquisitionRatePerCardDollar} ${r.acquisitionCurrency}/$1`
                      : "Direct USD";
                    return (
                      <tr key={r.rateId} className={cn("border-b border-border last:border-0", r.isActive && "bg-primary/5")}>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{supplier}</td>
                        <td className="px-6 py-3 font-mono">${r.marketRateUsd.toFixed(4)}</td>
                        <td className="px-6 py-3 font-mono">${r.customerRateUsd.toFixed(4)}</td>
                        <td className="px-6 py-3 font-mono">{margin.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-xs">{r.markupType}</td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">{r.source}</td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">{formatDateTime(r.validFrom)}</td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">{r.validTo ? formatDateTime(r.validTo) : "—"}</td>
                        <td className="px-6 py-3 text-right">
                          {r.isActive && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Active</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SetRateDialog denom={rateFor} onClose={() => setRateFor(null)} />
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-mono text-base font-semibold", highlight && "text-primary")}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MissingFx() {
  return <span className="text-xs italic text-muted-foreground">no FX rate</span>;
}
