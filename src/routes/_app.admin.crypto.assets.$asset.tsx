import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, SearchX } from "lucide-react";
import { toast } from "sonner";
import {
  cryptoAssetQueries,
  enableCryptoAsset,
  disableCryptoAsset,
  enableCryptoAssetNetwork,
  disableCryptoAssetNetwork,
  patchCryptoAssetInCache,
} from "@/api/crypto-assets";
import type { AdminCryptoAssetNetwork } from "@/api/types/crypto-assets.types";
import { EnabledToggleConfirm } from "@/components/plut/crypto/EnabledToggleConfirm";
import { ChangeAssetLogoDialog } from "@/components/plut/crypto/ChangeAssetLogoDialog";
import { Button } from "@/components/ui/button";

// crypto-service exposes no per-asset admin GET — GET /api/crypto/admin/Assets returns the full
// catalogue and that's the only read endpoint on this surface (confirmed against
// Web/Endpoints/AdminAssets.cs). So this detail page reads from the SAME cached list query the index
// route populates, and finds its one row client-side, rather than hitting a detail endpoint that
// doesn't exist.
export const Route = createFileRoute("/_app/admin/crypto/assets/$asset")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(cryptoAssetQueries.list());
  },
  component: CryptoAssetDetail,
});

function CryptoAssetDetail() {
  const { asset: assetCode } = Route.useParams();
  const qc = useQueryClient();
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);

  const { data, isLoading } = useQuery(cryptoAssetQueries.list());
  const asset = data?.find((a) => a.asset === assetCode);

  const assetToggle = useMutation({
    mutationFn: (enabled: boolean) => (enabled ? disableCryptoAsset(assetCode) : enableCryptoAsset(assetCode)),
    onSuccess: (updated) => {
      toast.success(`${updated.asset} ${updated.isEnabled ? "enabled" : "disabled"}.`);
      patchCryptoAssetInCache(qc, updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const networkToggle = useMutation({
    mutationFn: ({ network, enabled }: { network: string; enabled: boolean }) =>
      enabled
        ? disableCryptoAssetNetwork(assetCode, network)
        : enableCryptoAssetNetwork(assetCode, network),
    onSuccess: (updated, vars) => {
      toast.success(`${assetCode} / ${vars.network} network ${vars.enabled ? "disabled" : "enabled"}.`);
      patchCryptoAssetInCache(qc, updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const backLink = (
    <Link
      to="/admin/crypto/assets"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to assets
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Asset not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            "{assetCode}" isn't in the catalogue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {backLink}

      {/* Header — admin-owned identity + the admin-owned kill switch. */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border bg-secondary">
              {asset.logoUrl ? (
                <img src={asset.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{asset.asset.slice(0, 3)}</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {asset.asset} — {asset.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {asset.isDirectPair ? "Direct pair" : "Not a direct pair"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Enabled
            </span>
            <EnabledToggleConfirm
              checked={asset.isEnabled}
              label={asset.asset}
              pending={assetToggle.isPending}
              onConfirm={() => assetToggle.mutate(asset.isEnabled)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">Logo</span>
          <Button size="sm" variant="outline" onClick={() => setLogoDialogOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Change logo URL
          </Button>
        </div>
      </div>

      {/* Admin-editable per-network kill switches — the "control" section. */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Networks
        </h2>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Network", "Full Name", "Default", "Min Withdraw", "Withdraw Fee", "Enabled"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {asset.networks.map((n) => (
                  <tr key={n.network} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-mono text-xs font-semibold">{n.network}</td>
                    <td className="px-5 py-3 text-muted-foreground">{n.networkFullName}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {n.isDefault ? "Yes" : ""}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{n.minWithdrawAmount}</td>
                    <td className="px-5 py-3 font-mono text-xs">{n.withdrawFee}</td>
                    <td className="px-5 py-3">
                      <EnabledToggleConfirm
                        checked={n.isEnabled}
                        label={`${asset.asset} on ${n.network}`}
                        size="sm"
                        pending={
                          networkToggle.isPending &&
                          networkToggle.variables?.network === n.network
                        }
                        onConfirm={() =>
                          networkToggle.mutate({ network: n.network, enabled: n.isEnabled })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Provider-reported block — deliberately its own section with muted, read-only styling.
          This is NOT the same switch as "Enabled" above: these flags come from Binance and are
          overwritten every 24h by the provider-catalogue refresh job. There is no control here on
          purpose — building one would be silently reverted within a day. */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Provider-reported
        </h2>
        <div className="rounded-2xl border border-dashed bg-secondary/20 p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Reported by Binance, refreshed every 24h. Not editable here — any admin control here
            would be silently reverted by the next catalogue refresh.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  {["Network", "Deposit", "Withdraw"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asset.networks.map((n) => (
                  <ProviderRow key={n.network} n={n} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ChangeAssetLogoDialog
        asset={asset.asset}
        currentLogoUrl={asset.logoUrl}
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
      />
    </div>
  );
}

function ProviderRow({ n }: { n: AdminCryptoAssetNetwork }) {
  return (
    <tr className="text-muted-foreground">
      <td className="px-3 py-1.5 font-mono text-xs">{n.network}</td>
      <td className="px-3 py-1.5">
        <ProviderFlag ok={n.isDepositEnabledByProvider} />
      </td>
      <td className="px-3 py-1.5">
        <ProviderFlag ok={n.isWithdrawEnabledByProvider} />
      </td>
    </tr>
  );
}

function ProviderFlag({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? "text-muted-foreground" : "font-medium text-destructive/80"}>
      {ok ? "✓" : "✗"}
    </span>
  );
}
