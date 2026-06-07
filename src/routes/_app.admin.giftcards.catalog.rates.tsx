import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, History } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import { RateHistoryDrawer } from "@/components/plut/RateHistoryDrawer";
import {
  brandQueries, countryQueries,
  rateQueries, deactivateRate,
  fxRateQueries,
  payoutCurrencyQueries,
  queryKeys,
} from "@/api";
import { toast } from "sonner";
import { formatDate, currencySymbol } from "@/lib/format";
import { FilterSelect, TabLoader, EmptyRow, Dash, TablePager } from "@/components/plut/catalog-shared";

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/admin/giftcards/catalog/rates")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(rateQueries.list({ Page: 1, PageSize: DEFAULT_PAGE_SIZE, ActiveOnly: true }));
    qc.prefetchQuery(brandQueries.list());
    qc.prefetchQuery(countryQueries.list());
    qc.prefetchQuery(fxRateQueries.current());
    qc.prefetchQuery(payoutCurrencyQueries.list());
    import("@/components/plut/SetRateDialog.body");
  },
  component: RatesTab,
});

function RatesTab() {
  const qc = useQueryClient();

  const [brandFilter, setBrandFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [activeOnly, setActiveOnly] = useState(true);
  const [view, setView] = useState("USD");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);
  const [historyFor, setHistoryFor] = useState<DenomRateContext | null>(null);

  const params = {
    ...(brandFilter !== "All" && { BrandId: brandFilter }),
    ...(countryFilter !== "All" && { CountryId: countryFilter }),
    ActiveOnly: activeOnly,
    Page: page,
    PageSize: pageSize,
  };

  const { data, isLoading } = useQuery(rateQueries.list(params));
  const { data: brandsData } = useQuery(brandQueries.list());
  const { data: countriesData } = useQuery(countryQueries.list());
  const { data: fxRates } = useQuery(fxRateQueries.current());
  const { data: payouts } = useQuery(payoutCurrencyQueries.list());

  const activePayout = (payouts ?? []).filter((p) => p.isActive);
  const viewFxRate = view === "USD"
    ? 1
    : fxRates?.find((f) => f.baseCurrency === "USD" && f.quoteCurrency === view)?.rate ?? 0;

  const deactivateMutation = useMutation({
    mutationFn: (rateId: string) => deactivateRate(rateId),
    onSuccess: () => {
      toast.success("Rate deactivated.");
      qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Prefetch next page so turning pages is instant
  useEffect(() => {
    if (!data || page >= Math.ceil(data.totalCount / pageSize)) return;
    qc.prefetchQuery(rateQueries.list({ ...params, Page: page + 1 }));
  }, [data?.totalCount, page, pageSize, brandFilter, countryFilter, activeOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetPage() { setPage(1); }

  function buildContext(r: NonNullable<typeof data>["items"][number]): DenomRateContext {
    return {
      id: r.denominationId,
      amount: r.amount,
      currencyCode: r.currencyCode,
      cardType: r.cardType,
      brandName: r.brandName,
      countryCode: r.countryName,
      activeRate: r.rateId ? {
        id: r.rateId,
        acquisitionCurrency: r.acquisitionCurrency ?? null,
        acquisitionRatePerCardDollar: r.acquisitionRatePerCardDollar ?? null,
        marketRateUsd: r.marketRateUsd,
        customerRateUsd: r.customerRateUsd,
        markupUsd: r.markupUsd,
        markupType: r.markupType ?? "",
        markupValue: r.markupValue,
        source: r.rateSource ?? "",
        validFrom: r.rateValidFrom ?? "",
      } : null,
    };
  }

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;

  const supplierLabel = (r: NonNullable<typeof data>["items"][number]) => {
    if (!r.hasRate) return "—";
    if (r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar) {
      return `${r.acquisitionRatePerCardDollar} CNY / $1`;
    }
    return "Direct USD";
  };

  const viewSym = view === "USD" ? "$" : (currencySymbol(view) || activePayout.find((p) => p.code === view)?.symbol || view);
  const usdHeaders = ["Brand", "Country", "Denom", "Supplier Quote", "Mkt Rate", "Cust Rate", "Margin", "Src", "Since", ""];
  const curHeaders = ["Brand", "Country", "Denom", "Supplier Quote", `Cost (${view})`, `Payout (${view})`, `Margin (${view})`, "Src", ""];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brandFilter} onChange={(v) => { setBrandFilter(v); resetPage(); }} placeholder="Brand"
          options={[{ v: "All", l: "All brands" }, ...(brandsData ?? []).map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={countryFilter} onChange={(v) => { setCountryFilter(v); resetPage(); }} placeholder="Country"
          options={[{ v: "All", l: "All countries" }, ...(countriesData ?? []).map((c) => ({ v: c.id, l: c.name }))]} />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={activeOnly} onCheckedChange={(v) => { setActiveOnly(!!v); resetPage(); }} />
          Active only
        </label>
        <div className="flex items-center gap-1 rounded-md border bg-secondary/40 p-0.5">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">View</span>
          {["USD", ...activePayout.map((p) => p.code)].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {v}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{total.toLocaleString()} rate{total === 1 ? "" : "s"}</span>
      </div>

      {view !== "USD" && viewFxRate > 0 && (
        <p className="text-xs text-muted-foreground">
          Using FX rate: <span className="font-mono font-semibold text-foreground">USD/{view} {viewSym}{viewFxRate.toLocaleString()}</span>
        </p>
      )}

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {(view === "USD" ? usdHeaders : curHeaders).map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const margin = r.marketRateUsd ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : 0;
                  const cost = r.marketRateUsd * r.amount * viewFxRate;
                  const payout = r.customerRateUsd * r.amount * viewFxRate;
                  const marginCur = cost - payout;
                  const ctx = buildContext(r);

                  return (
                    <tr key={r.denominationId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-6 py-3.5 font-medium">{r.brandName}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{r.countryName}</td>
                      <td className="px-6 py-3.5 font-mono">{currencySymbol(r.currencyCode)}{r.amount}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{supplierLabel(r)}</td>

                      {view === "USD" ? (
                        <>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `$${r.marketRateUsd.toFixed(3)}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `$${r.customerRateUsd.toFixed(3)}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `${margin.toFixed(1)}%` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.hasRate ? (r.rateSource === "Admin" ? "M" : "A") : "—"}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.rateValidFrom ? formatDate(r.rateValidFrom) : "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `${viewSym}${cost.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono font-semibold">{r.hasRate ? `${viewSym}${payout.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{r.hasRate ? `+${viewSym}${marginCur.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.hasRate ? (r.rateSource === "Admin" ? "M" : "A") : "—"}</td>
                        </>
                      )}

                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {r.hasRate && (
                            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs"
                              onMouseEnter={() => qc.prefetchQuery(rateQueries.list({ DenominationId: r.denominationId }))}
                              onClick={() => setHistoryFor(ctx)}>
                              <History className="h-3.5 w-3.5" /> History
                            </Button>
                          )}
                          <Button size="sm" variant={r.hasRate ? "outline" : "default"} onClick={() => setRateFor(ctx)}>
                            {r.hasRate ? "Update" : "Set Rate"}
                          </Button>
                          {r.hasRate && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive"
                                  onClick={() => r.rateId && deactivateMutation.mutate(r.rateId)}>
                                  Deactivate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <EmptyRow cols={view === "USD" ? 10 : 9} />}
              </tbody>
            </table>
          </div>
          <TablePager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            noun="rates"
          />
          <p className="border-t border-border bg-secondary/30 px-6 py-2 text-[11px] text-muted-foreground">
            Legend: M = Manual, A = Auto · Use the History button to see past rates · Supplier Quote shows the input mode used.
          </p>
        </div>
      )}

      <SetRateDialog
        denom={rateFor}
        onClose={() => { setRateFor(null); qc.invalidateQueries({ queryKey: queryKeys.rates.all() }); }}
      />
      <RateHistoryDrawer
        denom={historyFor}
        onClose={() => setHistoryFor(null)}
        onSetNew={(ctx) => { setHistoryFor(null); setRateFor(ctx); }}
      />
    </div>
  );
}
