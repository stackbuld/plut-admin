import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, SearchX } from "lucide-react";
import {
  cryptoAssetQueries,
  enableCryptoAsset,
  disableCryptoAsset,
  patchCryptoAssetInCache,
} from "@/api/crypto-assets";
import type { AdminCryptoAsset } from "@/api/types/crypto-assets.types";
import { EnabledToggleConfirm } from "@/components/plut/crypto/EnabledToggleConfirm";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type SearchState = { q?: string };

export const Route = createFileRoute("/_app/admin/crypto/assets/")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    q: typeof s.q === "string" && s.q.length > 0 ? s.q : undefined,
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(cryptoAssetQueries.list());
  },
  component: CryptoAssetsList,
});

function CryptoAssetsList() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery(cryptoAssetQueries.list());

  const toggleMutation = useMutation({
    mutationFn: ({ asset, enabled }: { asset: string; enabled: boolean }) =>
      enabled ? disableCryptoAsset(asset) : enableCryptoAsset(asset),
    onSuccess: (updated) => {
      toast.success(`${updated.asset} ${updated.isEnabled ? "enabled" : "disabled"}.`);
      patchCryptoAssetInCache(qc, updated);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const needle = q.trim().toLowerCase();
  const assets = (data ?? []).filter(
    (a) =>
      needle.length === 0 ||
      a.asset.toLowerCase().includes(needle) ||
      a.fullName.toLowerCase().includes(needle),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Assets & Networks</h1>
          <p className="text-sm text-muted-foreground">
            Plut's own catalogue kill switches — independent of what Binance reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Input
            value={q}
            onChange={(e) =>
              navigate({ search: { q: e.target.value || undefined }, replace: true })
            }
            placeholder="Search asset or name…"
            className="h-9 w-56"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState hasQuery={needle.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Asset", "Name", "Direct Pair", "Enabled", "Networks"].map((h) => (
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
                {assets.map((a) => (
                  <Row
                    key={a.asset}
                    asset={a}
                    pending={
                      toggleMutation.isPending && toggleMutation.variables?.asset === a.asset
                    }
                    onToggle={() => toggleMutation.mutate({ asset: a.asset, enabled: a.isEnabled })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  asset,
  pending,
  onToggle,
}: {
  asset: AdminCryptoAsset;
  pending: boolean;
  onToggle: () => void;
}) {
  const networkNames = asset.networks.map((n) => n.network).join("/");
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40">
      <td className="px-6 py-3.5">
        <Link
          to="/admin/crypto/assets/$asset"
          params={{ asset: asset.asset }}
          className="flex items-center gap-2 font-semibold hover:text-primary"
        >
          {asset.logoUrl ? (
            <img src={asset.logoUrl} alt="" className="h-5 w-5 rounded-full object-contain" />
          ) : (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-bold">
              {asset.asset.slice(0, 2)}
            </span>
          )}
          {asset.asset}
        </Link>
      </td>
      <td className="px-6 py-3.5 text-muted-foreground">{asset.fullName}</td>
      <td className="px-6 py-3.5">{asset.isDirectPair ? "Yes" : "No"}</td>
      <td className="px-6 py-3.5">
        <EnabledToggleConfirm
          checked={asset.isEnabled}
          label={asset.asset}
          pending={pending}
          onConfirm={onToggle}
        />
      </td>
      <td className="px-6 py-3.5 text-xs text-muted-foreground">
        {asset.networks.length} {asset.networks.length === 1 ? "network" : "networks"}
        {networkNames && <span className="ml-1">({networkNames})</span>}
      </td>
    </tr>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-16 text-center text-sm text-muted-foreground">
      <SearchX className="h-6 w-6" />
      {hasQuery ? "No assets match your search." : "No assets in the catalogue yet."}
    </div>
  );
}
