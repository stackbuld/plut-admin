import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { rateQueries } from "@/api";
import type { DenomRateContext } from "./SetRateDialog";
import { cn } from "@/lib/utils";

export function RateHistoryDrawer({
  denom,
  onClose,
  onSetNew,
}: {
  denom: DenomRateContext | null;
  onClose: () => void;
  onSetNew: (ctx: DenomRateContext) => void;
}) {
  const open = denom !== null;

  const { data, isLoading } = useQuery({
    ...rateQueries.list({ DenominationId: denom?.id }),
    enabled: open && !!denom?.id,
  });

  const rates = data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Rate History</SheetTitle>
          <SheetDescription>
            {denom && `${denom.brandName} · ${denom.countryCode} · ${denom.currencyCode} ${denom.amount} ${denom.cardType}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 overflow-hidden rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Supplier", "Mkt Rate", "Cst Rate", "Margin", "Source", "Valid From", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No rate history yet.</td></tr>
                )}
                {rates.map((r) => {
                  const margin = r.marketRateUsd
                    ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100
                    : 0;
                  const supplier =
                    r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar
                      ? `${r.acquisitionRatePerCardDollar} CNY/$1`
                      : "Direct USD";
                  const isActive = r.hasRate && !r.rateValidFrom?.includes("0001");
                  return (
                    <tr key={r.denominationId} className={cn("border-b last:border-0", isActive && "bg-primary/5")}>
                      <td className="px-3 py-2 font-mono text-xs">{supplier}</td>
                      <td className="px-3 py-2 font-mono text-xs">${r.marketRateUsd.toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono text-xs">${r.customerRateUsd.toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{margin.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-xs">{r.rateSource ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.rateValidFrom ? r.rateValidFrom.slice(0, 10) : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {isActive && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Active</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {denom && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { onClose(); onSetNew(denom); }}>Set New Rate</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
