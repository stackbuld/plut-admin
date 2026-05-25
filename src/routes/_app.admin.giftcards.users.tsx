import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { users, imageBlacklist, REJECT_REASONS } from "@/data/mock";

export const Route = createFileRoute("/_app/admin/giftcards/users")({
  head: () => ({ meta: [{ title: "Users — Plut Admin" }] }),
  component: UsersLayout,
});

function UsersLayout() {
  const isDetail = useRouterState({ select: (s) => /^\/admin\/giftcards\/users\/.+/.test(s.location.pathname) });
  if (isDetail) return <Outlet />;

  const [q, setQ] = useState("");
  const matches = users.filter((u) => !q || u.id.includes(q) || u.email.includes(q));

  return (
    <Tabs defaultValue="lookup" className="space-y-5">
      <TabsList>
        <TabsTrigger value="lookup">User Lookup</TabsTrigger>
        <TabsTrigger value="blacklist">Image Blacklist</TabsTrigger>
      </TabsList>

      <TabsContent value="lookup" className="space-y-5">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Search by User ID or email</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="user_01HXZ… or user@email.com" className="h-10 pl-9" />
            </div>
            <Button className="h-10">Search</Button>
          </div>
          {q && (
            <div className="mt-4 divide-y divide-border rounded-lg border">
              {matches.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No matches.</p>}
              {matches.map((u) => (
                <Link key={u.id} to="/admin/giftcards/users/$userId" params={{ userId: u.id }} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="font-mono text-xs text-muted-foreground">{u.id}</p>
                  </div>
                  <StatusBadge status={u.sellActive ? "Active" : "Paused"} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <section className="rounded-2xl border bg-card overflow-hidden">
          <header className="border-b border-border px-6 py-4">
            <h2 className="font-display text-base font-bold">Recent Blocked Users</h2>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr className="text-left">
              {["User", "Block Type", "Started", "Expires"].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.filter((u) => u.blocks.some((b) => b.active)).map((u) => {
                const blk = u.blocks.find((b) => b.active)!;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5">
                      <Link to="/admin/giftcards/users/$userId" params={{ userId: u.id }} className="hover:text-primary">
                        <p className="font-medium">{u.email}</p>
                        <p className="font-mono text-xs text-muted-foreground">{u.id}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={blk.type === "Permanent" ? "Rejected" : "Submitted"} dot={false} /> <span className="ml-2 text-xs text-muted-foreground">{blk.type}</span></td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{blk.startedAt}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{blk.expiresAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </TabsContent>

      <TabsContent value="blacklist" className="space-y-4">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr className="text-left">
              {["Hash (pHash)", "Added", "By", "Reason"].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {imageBlacklist.map((img) => (
                <tr key={img.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono text-xs">{img.hash}…</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{img.addedAt}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{img.addedBy}</td>
                  <td className="px-6 py-3.5">{REJECT_REASONS.find((r) => r.value === img.reason)?.label ?? img.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}