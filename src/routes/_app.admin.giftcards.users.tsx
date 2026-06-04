import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { TablePager } from "@/components/plut/catalog-shared";
import { userQueries, addImageBlacklist, removeImageBlacklist, queryKeys } from "@/api";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { REJECT_REASONS } from "@/data/mock";

export const Route = createFileRoute("/_app/admin/giftcards/users")({
  head: () => ({ meta: [{ title: "Users — Plut Admin" }] }),
  component: UsersLayout,
});

function UsersLayout() {
  const isDetail = useRouterState({ select: (s) => /^\/admin\/giftcards\/users\/.+/.test(s.location.pathname) });
  if (isDetail) return <Outlet />;
  return (
    <Tabs defaultValue="lookup" className="space-y-5">
      <TabsList className="w-full max-w-full overflow-x-auto whitespace-nowrap">
        <TabsTrigger value="lookup">User Lookup</TabsTrigger>
        <TabsTrigger value="suspended">Suspended Users</TabsTrigger>
        <TabsTrigger value="blacklist" className="gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" /> Image Blacklist
        </TabsTrigger>
      </TabsList>
      <TabsContent value="lookup"><LookupTab /></TabsContent>
      <TabsContent value="suspended"><SuspendedTab /></TabsContent>
      <TabsContent value="blacklist"><ImageBlacklistTab /></TabsContent>
    </Tabs>
  );
}

// ── Lookup ────────────────────────────────────────────────────────────────────

function LookupTab() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: searchData, isLoading: searching } = useQuery({
    ...userQueries.list({ search: submitted }),
    enabled: submitted.length > 0,
  });

  const results = searchData?.items ?? [];

  return (
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
              <div className="min-w-0">
                <p className="font-medium">{u.displayName}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {u.phoneNumber && <p className="text-xs text-muted-foreground">{u.phoneNumber}</p>}
                <p className="font-mono text-[11px] text-muted-foreground">{u.userId}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 pl-3">
                <StatusBadge status={u.status === "Suspended" ? "Rejected" : u.status === "Active" ? "Paid" : "Submitted"} dot={false} />
                <span className="text-[10px] text-muted-foreground">{u.kycTier}</span>
                {u.lastLoginAt && <span className="text-[10px] text-muted-foreground">Last seen {formatDateTime(u.lastLoginAt)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Suspended ─────────────────────────────────────────────────────────────────

function SuspendedTab() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery(userQueries.list({ status: "Suspended", page, pageSize }));
  const suspended = data?.items ?? [];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left">
              {["User", "Email", "Phone", "KYC Tier", "Created"].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            ) : suspended.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">No suspended users.</td></tr>
            ) : suspended.map((u) => (
              <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="px-6 py-3.5">
                  <Link to="/admin/giftcards/users/$userId" params={{ userId: u.userId }} className="font-medium hover:text-primary">
                    {u.displayName}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">{u.userId}</p>
                </td>
                <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.email}</td>
                <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.phoneNumber ?? "—"}</td>
                <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.kycTier}</td>
                <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={page} pageSize={pageSize} total={data?.totalCount ?? 0} onPageChange={setPage} noun="suspended users" />
    </div>
  );
}

// ── Image Blacklist ───────────────────────────────────────────────────────────

function ImageBlacklistTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [addOpen, setAddOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading, isError } = useQuery(userQueries.blacklist({ page, pageSize }));
  const entries = data?.items ?? [];

  const addMutation = useMutation({
    mutationFn: () => addImageBlacklist({ hash: hash.trim(), reason, notes: notes.trim() || undefined }),
    onSuccess: () => {
      toast.success("Hash added to blacklist.");
      qc.invalidateQueries({ queryKey: queryKeys.users.blacklist() });
      setHash(""); setReason(""); setNotes(""); setAddOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeImageBlacklist(id),
    onSuccess: () => {
      toast.success("Entry removed.");
      qc.invalidateQueries({ queryKey: queryKeys.users.blacklist() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Perceptual hashes of known fraudulent or resold card images. Any uploaded image whose pHash matches an entry here is automatically flagged.
        </p>
        <Button onClick={() => setAddOpen(true)} size="sm"><Plus className="h-4 w-4" /> Add Hash</Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["pHash", "Reason", "Notes", "Added By", "Added At", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              )}
              {isError && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">Endpoint not available yet — ask backend to implement.</td></tr>
              )}
              {!isLoading && !isError && entries.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">No blacklisted images yet.</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono text-xs">{e.hash}</td>
                  <td className="px-6 py-3.5 text-xs">{REJECT_REASONS.find((r) => r.value === e.reason)?.label ?? e.reason}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{e.notes ?? "—"}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{e.addedBy}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(e.addedAt)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(e.id)} disabled={removeMutation.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePager page={page} pageSize={pageSize} total={data?.totalCount ?? 0} onPageChange={setPage} noun="entries" />
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Image Blacklist</DialogTitle>
            <DialogDescription>Block any future upload whose perceptual hash matches this value.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">pHash *</label>
              <Input value={hash} onChange={(e) => setHash(e.target.value)} placeholder="a1b2c3d4e5f6…" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason *</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional context…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!hash.trim() || !reason || addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add to Blacklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
