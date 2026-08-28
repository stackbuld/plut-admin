import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import {
  cryptoFxRateQueries, cryptoFxRateKeys,
  createCryptoFxRate, deactivateCryptoFxRate,
  payoutCurrencyQueries,
} from "@/api";
import type { CryptoFxRateDto } from "@/api/types";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Route/API background: docs/wallet-service-docs/crypto-wallet/admin-console/07-FX_RATES.md
// Backend is fully built (Web/Endpoints/AdminFxRates.cs) — this route is pure frontend against it.
// This is the screen whose absence caused the CRYPTO_FX_RATE_NOT_CONFIGURED incident — see the
// doc's §2 for the write-up. Closest existing pattern mirrored: giftcards' FX-rate tab
// (_app.admin.giftcards.catalog.fx.tsx / src/api/catalog.ts's fxRateQueries) — same *kind* of
// problem (admin-managed currency conversion rate, immutable history), separate backend table.

const BASE_ASSET = "USDT"; // Today: the only direct-pair asset (07-FX_RATES.md §1). The dialog
// still renders it as a (disabled) select so a second base asset can be added later without a
// dialog redesign.

export const Route = createFileRoute("/_app/admin/crypto/pricing/fx-rates")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(cryptoFxRateQueries.active());
    qc.prefetchQuery(payoutCurrencyQueries.list());
  },
  component: FxRatesPage,
});

type Row = {
  code: string;
  rate: CryptoFxRateDto | null;
};

function FxRatesPage() {
  const qc = useQueryClient();

  const { data: activeRates, isLoading } = useQuery(cryptoFxRateQueries.active());
  const { data: payouts } = useQuery(payoutCurrencyQueries.list());

  const [expandedCurrency, setExpandedCurrency] = useState<string | null>(null);
  const { data: historyRates, isLoading: historyLoading } = useQuery({
    ...cryptoFxRateQueries.withHistory(),
    enabled: expandedCurrency !== null,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<CryptoFxRateDto | null>(null);

  // "Every fiat currency Plut supports" — reuse the same active-payout-currency list giftcards
  // already maintains (src/api/catalog.ts's payoutCurrencyQueries) rather than inventing a second
  // one, per 07-FX_RATES.md §2. Union with any rate's fiatCurrency defensively, in case a currency
  // has an FX rate but was since deactivated as a payout currency — we still want its row visible.
  const rows: Row[] = useMemo(() => {
    const rates = activeRates ?? [];
    const currencyCodes = (payouts ?? []).filter((p) => p.isActive).map((p) => p.code);
    const allCodes = Array.from(new Set([...currencyCodes, ...rates.map((r) => r.fiatCurrency)]));
    const built = allCodes.map((code) => ({
      code,
      rate: rates.find((r) => r.fiatCurrency === code && r.baseAsset === BASE_ASSET) ?? null,
    }));
    // Configured rows first (alphabetical), gap rows after (alphabetical) — the gaps are the whole
    // point of this screen, so they should be impossible to miss at the bottom, not buried among
    // configured rows.
    built.sort((a, b) => {
      if (!!a.rate !== !!b.rate) return a.rate ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
    return built;
  }, [activeRates, payouts]);

  const currencyOptions = useMemo(() => {
    const codes = (payouts ?? []).filter((p) => p.isActive).map((p) => p.code);
    return Array.from(new Set(codes)).sort();
  }, [payouts]);

  function openDialog(prefillCurrency?: string, prefillRate?: number) {
    setFiatCurrency(prefillCurrency ?? currencyOptions[0] ?? "");
    setRateInput(prefillRate != null ? String(prefillRate) : "");
    setDialogOpen(true);
  }

  const setRateMutation = useMutation({
    mutationFn: () =>
      createCryptoFxRate({
        baseAsset: BASE_ASSET,
        fiatCurrency,
        rate: parseFloat(rateInput),
      }),
    onSuccess: (newRate) => {
      toast.success(`FX rate set: ${BASE_ASSET}/${newRate.fiatCurrency} = ${newRate.rate}`);
      qc.invalidateQueries({ queryKey: cryptoFxRateKeys.all() });
      setDialogOpen(false);
      setRateInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (rate: CryptoFxRateDto) => deactivateCryptoFxRate(rate.id),
    onSuccess: (_res, rate) => {
      toast.success(`${BASE_ASSET}/${rate.fiatCurrency} deactivated.`);
      qc.invalidateQueries({ queryKey: cryptoFxRateKeys.all() });
      setDeactivateTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rateValid = rateInput.trim() !== "" && Number.isFinite(parseFloat(rateInput)) && parseFloat(rateInput) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">FX Rates</h1>
          <p className="max-w-2xl text-xs text-muted-foreground">
            1 USDT = local currency, used to price every asset in fiat and as the fiat leg for
            Buy/Sell. A missing rate blocks Buy/Sell for that currency outright — this is
            deliberate, not a bug.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" /> Set FX Rate
        </Button>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Pair", "Rate", "Source", "Valid From", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <RateRow
                    key={row.code}
                    row={row}
                    isHistoryOpen={expandedCurrency === row.code}
                    onToggleHistory={() =>
                      setExpandedCurrency(expandedCurrency === row.code ? null : row.code)
                    }
                    onSetRate={() => openDialog(row.code)}
                    onUpdateRate={() => openDialog(row.code, row.rate?.rate)}
                    onDeactivate={() => row.rate && setDeactivateTarget(row.rate)}
                  />
                ))}
                {rows.length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedCurrency && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <p className="text-sm font-semibold">
              {BASE_ASSET}/{expandedCurrency} history
            </p>
            {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Rate", "Source", "Valid From", "Valid To", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(historyRates ?? [])
                  .filter((h) => h.fiatCurrency === expandedCurrency && h.baseAsset === BASE_ASSET)
                  .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))
                  .map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-6 py-3 font-mono">{h.rate.toLocaleString()}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{h.source ?? "—"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{formatDateTime(h.validFrom)}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {h.validTo ? formatDateTime(h.validTo) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {!h.validTo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            ● Current
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Expired
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                {!historyLoading &&
                  (historyRates ?? []).filter(
                    (h) => h.fiatCurrency === expandedCurrency && h.baseAsset === BASE_ASSET,
                  ).length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !setRateMutation.isPending && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set FX Rate</DialogTitle>
            <DialogDescription>
              Sets the active rate. The previous rate (if any) is archived, never deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base Asset">
                <Select value={BASE_ASSET} disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BASE_ASSET}>{BASE_ASSET}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fiat Currency *">
                <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={fiatCurrency ? `Rate (${fiatCurrency} per 1 ${BASE_ASSET}) *` : "Rate *"}>
              <Input
                type="number"
                step="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="1650.00"
                className="font-mono"
              />
            </Field>
            <p className="flex items-start gap-2 rounded-lg border bg-warning/10 p-2.5 text-xs text-warning">
              ⚠ Takes effect immediately. Any in-flight quote at the old rate is unaffected — only
              new quotes see this.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={setRateMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => setRateMutation.mutate()}
              disabled={!fiatCurrency || !rateValid || setRateMutation.isPending}
            >
              {setRateMutation.isPending ? "Saving…" : "Set FX Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => {
          if (!o) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {BASE_ASSET}/{deactivateTarget?.fiatCurrency}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This currency's price display will show <code className="font-mono">null</code>,
              and Buy/Sell for it will start failing with{" "}
              <code className="font-mono">CRYPTO_FX_RATE_NOT_CONFIGURED</code> until a new rate is
              set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget)}
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RateRow({
  row,
  isHistoryOpen,
  onToggleHistory,
  onSetRate,
  onUpdateRate,
  onDeactivate,
}: {
  row: Row;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  onSetRate: () => void;
  onUpdateRate: () => void;
  onDeactivate: () => void;
}) {
  const { code, rate } = row;
  const isGap = !rate;

  return (
    <tr className={cn("border-b border-border last:border-0", isGap ? "bg-amber-500/5" : "hover:bg-secondary/40")}>
      <td className="px-6 py-3.5 font-mono font-semibold text-xs">
        {BASE_ASSET}/{code}
      </td>
      <td className="px-6 py-3.5 font-mono">{rate ? rate.rate.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
      <td className="px-6 py-3.5 text-xs text-muted-foreground">{rate ? (rate.source ?? "—") : "—"}</td>
      <td className="px-6 py-3.5 text-xs text-muted-foreground">{rate ? formatDateTime(rate.validFrom) : "—"}</td>
      <td className="px-6 py-3.5">
        {rate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            ● Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            No rate configured
          </span>
        )}
      </td>
      <td className="px-6 py-3.5 text-right">
        {isGap ? (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onSetRate}>
            <Plus className="h-3.5 w-3.5" /> Set rate
          </Button>
        ) : (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onToggleHistory}>
              <History className="h-3.5 w-3.5" />
              {isHistoryOpen ? "Hide" : "History"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onUpdateRate}>
              Update
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={onDeactivate}
            >
              Deactivate
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
