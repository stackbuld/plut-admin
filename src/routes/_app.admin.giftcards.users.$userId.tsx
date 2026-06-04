import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, ShieldOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { userQueries, tradeQueries, blockUser, unblockUser, queryKeys } from "@/api";
import { formatDateTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/giftcards/users/$userId")({
  head: () => ({ meta: [{ title: "User Detail — Plut Admin" }] }),
  component: UserDetail,
});

const DURATION_OPTIONS = [
  { label: "1 hour",   hours: 1 },
  { label: "6 hours",  hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "7 days",   hours: 24 * 7 },
  { label: "30 days",  hours: 24 * 30 },
];

function UserDetail() {
  const { userId } = useParams({ from: "/_app/admin/giftcards/users/$userId" });
  const qc = useQueryClient();

  const { data: user, isLoading, isError } = useQuery(userQueries.detail(userId));
  const { data: tradesData, isLoading: tradesLoading } = useQuery(tradeQueries.list({ CustomerId: userId, PageSize: 20 }));
  const { data: blocks, isLoading: blocksLoading } = useQuery(userQueries.blocks(userId));
  const { data: strikes, isLoading: strikesLoading } = useQuery(userQueries.strikes(userId));

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockType, setBlockType] = useState<"Temporary" | "Permanent">("Temporary");
  const [blockDuration, setBlockDuration] = useState("24");
  const [blockReason, setBlockReason] = useState("");

  const blockMutation = useMutation({
    mutationFn: () => blockUser(userId, {
      type: blockType,
      reason: blockReason.trim(),
      ...(blockType === "Temporary" ? { durationHours: Number(blockDuration) } : {}),
    }),
    onSuccess: () => {
      toast.success("User blocked.");
      qc.invalidateQueries({ queryKey: queryKeys.users.blocks(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      setBlockReason(""); setBlockOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unblockMutation = useMutation({
    mutationFn: (blockId: string) => unblockUser(userId, blockId),
    onSuccess: () => {
      toast.success("Block lifted.");
      qc.invalidateQueries({ queryKey: queryKeys.users.blocks(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const activeBlock = blocks?.find((b) => b.isActive);
  const statusBadge = user.status === "Suspended" ? "Rejected" : user.status === "Active" ? "Paid" : "Submitted";
  const activeStrikes = (strikes ?? []).filter((s) => !s.isExpired);

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Active block banner */}
      {activeBlock && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/40 bg-destructive/8 px-5 py-3.5">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {activeBlock.type === "Permanent" ? "Permanently blocked" : `Blocked · ${activeBlock.type}`}
              </p>
              <p className="text-xs text-muted-foreground">{activeBlock.reason}</p>
              {activeBlock.expiresAt && (
                <p className="text-xs text-muted-foreground">Expires {formatDateTime(activeBlock.expiresAt)}</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0"
            onClick={() => unblockMutation.mutate(activeBlock.id)}
            disabled={unblockMutation.isPending}>
            {unblockMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Lift Block"}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Info */}
        <Panel title="User Info">
          <Row k="User ID"><span className="font-mono text-xs break-all">{user.userId}</span></Row>
          <Row k="Display Name">{user.displayName}</Row>
          <Row k="First Name">{user.firstName}</Row>
          <Row k="Last Name">{user.lastName}</Row>
          <Row k="Email">{user.email}</Row>
          <Row k="Phone">{user.phoneNumber ?? "—"}</Row>
          <Row k="Created">{formatDateTime(user.createdAt)}</Row>
          {user.lastLoginAt && <Row k="Last Login">{formatDateTime(user.lastLoginAt)}</Row>}
        </Panel>

        {/* Account Status */}
        <Panel title="Account Status" action={
          !activeBlock && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setBlockOpen(true)}>
              <ShieldOff className="h-3.5 w-3.5" /> Block User
            </Button>
          )
        }>
          <Row k="Status"><StatusBadge status={statusBadge} dot={false} /></Row>
          <Row k="KYC Tier">{user.kycTier}</Row>
          <Row k="Active Strikes">
            <span className={cn("font-semibold", activeStrikes.length > 0 && "text-warning")}>
              {strikesLoading ? "…" : `${activeStrikes.length} / ${(strikes ?? []).length} total`}
            </span>
          </Row>
          {user.avatarUrl && (
            <Row k="Avatar">
              <img src={user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
            </Row>
          )}
          <Row k="Zitadel ID"><span className="font-mono text-xs break-all">{user.zitadelUserId}</span></Row>
          {user.oldUserId && <Row k="Legacy ID"><span className="font-mono text-xs">{user.oldUserId}</span></Row>}
        </Panel>
      </div>

      {/* Strikes */}
      <Panel title="Strike History">
        {strikesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !strikes ? (
          <p className="text-xs text-muted-foreground">Endpoint not yet available — ask backend.</p>
        ) : strikes.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> No strikes on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Reason</th>
                  <th className="pb-2 pr-4">Trade</th>
                  <th className="pb-2 pr-4">Added</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {strikes.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{s.strikeNumber}</td>
                    <td className="py-2.5 pr-4">{s.reason}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {s.tradeId
                        ? <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: s.tradeId }} className="hover:text-primary">{truncId(s.tradeId)}</Link>
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDateTime(s.addedAt)}</td>
                    <td className="py-2.5">
                      {s.isExpired
                        ? <span className="text-xs text-muted-foreground">Expired</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">● Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Block History */}
      <Panel title="Block History">
        {blocksLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !blocks ? (
          <p className="text-xs text-muted-foreground">Endpoint not yet available — ask backend.</p>
        ) : blocks.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> No blocks on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Reason</th>
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2 pr-4">Expires</th>
                  <th className="pb-2 pr-4">By</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{b.type}</td>
                    <td className="py-2.5 pr-4 text-xs">{b.reason}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDateTime(b.startedAt)}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {b.type === "Permanent" ? "Never" : b.expiresAt ? formatDateTime(b.expiresAt) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{b.createdBy}</td>
                    <td className="py-2.5">
                      {b.isActive
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] font-semibold text-destructive">● Active</span>
                        : <span className="text-xs text-muted-foreground">Lifted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Trade History */}
      <Panel title="Trade History">
        {tradesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !tradesData?.items.length ? (
          <p className="text-sm text-muted-foreground">No trades by this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">Trade ID</th>
                  <th className="pb-2 pr-4">Items</th>
                  <th className="pb-2 pr-4">Payout</th>
                  <th className="pb-2 pr-4">Submitted</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">SLA</th>
                </tr>
              </thead>
              <tbody>
                {tradesData.items.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">
                      <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="hover:text-primary">{truncId(t.id)}</Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{t.itemCount}</td>
                    <td className="py-3 pr-4 font-mono">{t.totalCustomerPayoutAmount.toLocaleString()} {t.payoutCurrency}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDateTime(t.submittedAt)}</td>
                    <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                    <td className="py-3">
                      {t.status === "Submitted" ? <SlaIndicator deadlineIso={t.slaDeadlineAt} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Block User Dialog */}
      <Dialog open={blockOpen} onOpenChange={(o) => !o && setBlockOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Blocks the user from submitting new trades. You can lift a temporary block at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Block Type *</label>
              <Select value={blockType} onValueChange={(v) => setBlockType(v as "Temporary" | "Permanent")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Temporary">Temporary</SelectItem>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {blockType === "Temporary" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duration *</label>
                <Select value={blockDuration} onValueChange={setBlockDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d.hours} value={String(d.hours)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Pattern of duplicate card submissions" rows={3} />
            </div>
            {blockType === "Permanent" && (
              <p className="flex items-start gap-2 rounded-lg border bg-destructive/8 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Permanent blocks cannot be automatically lifted. Only a manual unblock will restore access.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => blockMutation.mutate()}
              disabled={!blockReason.trim() || blockMutation.isPending}>
              {blockMutation.isPending ? "Blocking…" : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/admin/giftcards/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to Users
    </Link>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

