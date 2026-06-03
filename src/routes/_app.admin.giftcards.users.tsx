import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { userQueries } from "@/api";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/users")({
  head: () => ({ meta: [{ title: "Users — Plut Admin" }] }),
  component: UsersLayout,
});

function UsersLayout() {
  const isDetail = useRouterState({ select: (s) => /^\/admin\/giftcards\/users\/.+/.test(s.location.pathname) });
  if (isDetail) return <Outlet />;

  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: searchData, isLoading: searching } = useQuery({
    ...userQueries.list({ search: submitted }),
    enabled: submitted.length > 0,
  });

  const { data: suspendedData, isLoading: suspendedLoading } = useQuery(userQueries.suspended());

  const results = searchData?.items ?? [];
  const suspended = suspendedData?.items ?? [];

  return (
    <Tabs defaultValue="lookup" className="space-y-5">
      <TabsList className="w-full max-w-full overflow-x-auto whitespace-nowrap">
        <TabsTrigger value="lookup">User Lookup</TabsTrigger>
        <TabsTrigger value="suspended">Suspended Users</TabsTrigger>
      </TabsList>

      <TabsContent value="lookup" className="space-y-5">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Search by email or name</h3>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="user@email.com or display name" className="h-10 pl-9" />
            </div>
            <Button type="submit" className="h-10" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          {submitted && (
            <div className="mt-4 divide-y divide-border rounded-lg border">
              {searching && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!searching && results.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">No matches for "{submitted}".</p>
              )}
              {results.map((u) => (
                <Link key={u.userId} to="/admin/giftcards/users/$userId" params={{ userId: u.userId }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
                  <div>
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{u.userId}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={u.status === "Suspended" ? "Rejected" : u.status === "Active" ? "Paid" : "Submitted"} dot={false} />
                    <span className="text-[10px] text-muted-foreground">{u.kycTier}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="suspended">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["User", "Email", "KYC Tier", "Created"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suspendedLoading ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : suspended.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">No suspended users.</td></tr>
                ) : suspended.map((u) => (
                  <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5">
                      <Link to="/admin/giftcards/users/$userId" params={{ userId: u.userId }} className="font-medium hover:text-primary">
                        {u.displayName}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{u.userId}</p>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.kycTier}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
