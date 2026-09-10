import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cryptoWalletQueries } from "@/api/crypto-wallets";
import { CryptoWalletStatusBadge } from "@/components/plut/crypto/CryptoWalletStatusBadge";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatCrypto } from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { truncId } from "@/lib/format";

type SearchState = { userId?: string };

// userId-only search for v1 — no admin-scoped "list all crypto users" or asset/balance-range
// filter endpoint exists yet (02-WALLETS_AND_USERS.md §2/§3 explicitly allows starting here; a
// richer filter is a natural, low-risk later addition once GET /api/crypto/admin/Wallets grows a
// broader query surface). userId is URL-persisted so a search result is a shareable/bookmarkable
// link, same convention as the operations list's status filter.
export const Route = createFileRoute("/_app/admin/crypto/wallets/")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    userId: typeof s.userId === "string" && s.userId ? s.userId : undefined,
  }),
  component: CryptoWalletsSearch,
});

function CryptoWalletsSearch() {
  const { userId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [input, setInput] = useState(userId ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    navigate({ search: trimmed ? { userId: trimmed } : {} });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Wallets & Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up a user's full crypto picture — wallets, balances, and recent activity — by their
          user ID.
        </p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="User ID (guid)…"
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={!input.trim()}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </form>

      {userId && <Results userId={userId} />}
    </div>
  );
}

function Results({ userId }: { userId: string }) {
  const { data, isLoading, isError, error } = useQuery(cryptoWalletQueries.byUser(userId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm font-semibold text-destructive">Couldn't load wallets</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error."}
        </p>
      </div>
    );
  }

  const wallets = data ?? [];

  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        <Wallet className="mx-auto mb-2 h-6 w-6 opacity-60" />
        No crypto wallets found for this user.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <UserRef userId={userId} className="font-mono text-sm">
          {truncId(userId, 22)}
        </UserRef>
        <Link
          to="/admin/crypto/wallets/$userId"
          params={{ userId }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open full profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-border rounded-2xl border bg-card">
        {wallets.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{w.asset}</span>
              <span className="text-xs text-muted-foreground">{w.assetFullName}</span>
              {w.isDefault && (
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  default
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatCrypto(w.availableBalance, w.asset)} available
              </span>
              <CryptoWalletStatusBadge status={w.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
