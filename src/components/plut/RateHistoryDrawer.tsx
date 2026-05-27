import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { brandById, countryById } from "@/data/mock";
import { useDenominations, useRates, useRateHistory } from "@/data/store";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RateHistoryDrawer({
  denomId,
  onClose,
  onSetNew,
}: {
  denomId: string | null;
  onClose: () => void;
  onSetNew: (id: string) => void;
}) {
  const open = denomId !== null;
  const denominations = useDenominations();
  const rates = useRates();
  const rateHistory = useRateHistory();
  const d = denominations.find((x) => x.id === denomId);
  if (!d) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }
  const b = brandById(d.brandId);
  const c = countryById(d.countryId);
  const all = [
    ...rates.filter((r) => r.denominationId === d.id),
    ...rateHistory.filter((r) => r.denominationId === d.id),
  ].sort((a, b) => (a.active ? -1 : b.active ? 1 : 0));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Rate History</SheetTitle>
          <SheetDescription>
            {b?.logoEmoji} {b?.name} · {c?.flag} {c?.name} · {currencySymbol(d.currency)}{d.amount} {d.cardType}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Supplier", "Mkt Rate", "Cst Rate", "Margin", "Source", "Valid From", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No rate history yet.</td></tr>
              )}
              {all.map((r) => {
                const margin = ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100;
                const supplier =
                  r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar
                    ? `${r.acquisitionRatePerCardDollar} CNY/$`
                    : r.supplierNgnPerDollar
                    ? `₦${r.supplierNgnPerDollar.toLocaleString()}/$`
                    : "Direct USD";
                return (
                  <tr key={r.id} className={cn("border-b last:border-0", r.active && "bg-primary/5")}>
                    <td className="px-3 py-2 font-mono text-xs">{supplier}</td>
                    <td className="px-3 py-2 font-mono text-xs">${r.marketRateUsd.toFixed(3)}</td>
                    <td className="px-3 py-2 font-mono text-xs">${r.customerRateUsd.toFixed(3)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{margin.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-xs">{r.source}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.validFrom}</td>
                    <td className="px-3 py-2 text-right">
                      {r.active && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Active</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => { onClose(); onSetNew(d.id); }}>Set New Rate</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}