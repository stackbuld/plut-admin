import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ShieldOff, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { userById, trades, brandById, REJECT_REASONS, type BlockType } from "@/data/mock";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/giftcards/users/$userId")({
  head: () => ({ meta: [{ title: "User Detail — Plut Admin" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = useParams({ from: "/_app/admin/giftcards/users/$userId" });
  const user = userById(userId);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unblockId, setUnblockId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/giftcards/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const userTrades = trades.filter((t) => t.customerEmail === user.email).slice(0, 5);

  return (
    <div className="space-y-6">
      <Link to="/admin/giftcards/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="User Info">
          <Row k="ID"><span className="font-mono text-xs">{user.id}</span></Row>
          <Row k="Email">{user.email}</Row>
          <Row k="KYC Tier">{user.kycTier}</Row>
          <Row k="Created">{user.createdAt}</Row>
        </Panel>
        <Panel title="Giftcard Sell Status">
          <Row k="Sell Access">
            <StatusBadge status={user.sellActive ? "Active" : "Paused"} />
          </Row>
          <Row k="Active Strikes"><span className="font-semibold">{user.activeStrikes}</span></Row>
          <Row k="Total Strikes">{user.totalStrikes}</Row>
          <Row k="Past Trades">{user.pastTrades}</Row>
          <Row k="All-time Payout"><span className="font-mono font-semibold">{formatNaira(user.allTimePayoutNgn)}</span></Row>
          <Button onClick={() => setBlockOpen(true)} variant="outline" className="mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <ShieldOff className="h-4 w-4" /> Manually Block User
          </Button>
        </Panel>
      </div>

      <Panel title="Strike History">
        {user.strikes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No strikes recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">#</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Trade</th><th className="py-2 pr-4">Added</th><th className="py-2">Status</th>
            </tr></thead>
            <tbody>
              {user.strikes.map((s) => (
                <tr key={s.number} className="border-t border-border">
                  <td className="py-3 pr-4">{s.number}</td>
                  <td className="py-3 pr-4">{REJECT_REASONS.find((r) => r.value === s.reason)?.label ?? s.reason}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{s.tradeId}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{s.addedAt}</td>
                  <td className="py-3"><span className={cn("text-xs", s.expired ? "text-muted-foreground" : "text-destructive font-semibold")}>{s.expired ? "Expired" : "Active"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Block History">
        {user.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Started</th><th className="py-2 pr-4">Expires</th><th className="py-2 text-right">Action</th>
            </tr></thead>
            <tbody>
              {user.blocks.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="py-3 pr-4">{b.type}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{b.reason}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{b.startedAt}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{b.expiresAt}</td>
                  <td className="py-3 text-right">
                    {b.active ? <Button size="sm" variant="ghost" onClick={() => setUnblockId(b.id)}>Unblock</Button> : <span className="text-xs text-muted-foreground">Expired</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Recent Trades">
        {userTrades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trades by this user.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">Trade ID</th><th className="py-2 pr-4">Brand</th><th className="py-2 pr-4">USD</th><th className="py-2 pr-4 text-right">Payout</th><th className="py-2">Status</th>
            </tr></thead>
            <tbody>
              {userTrades.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-3 pr-4 font-mono text-xs"><Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="hover:text-primary">{t.id}</Link></td>
                  <td className="py-3 pr-4">{brandById(t.brandId)?.name}</td>
                  <td className="py-3 pr-4 font-mono">${t.totalUsd}</td>
                  <td className="py-3 pr-4 text-right font-mono">{formatNaira(t.payoutNgn)}</td>
                  <td className="py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <BlockDialog open={blockOpen} onOpenChange={setBlockOpen} userId={user.id} />

      <Dialog open={unblockId !== null} onOpenChange={(o) => !o && setUnblockId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unblock User — Confirm</DialogTitle>
            <DialogDescription>This will immediately restore giftcard sell access.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnblockId(null)}>Cancel</Button>
            <Button onClick={() => { toast.success("User unblocked."); setUnblockId(null); }}>Confirm Unblock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right">{children}</span></div>;
}

function BlockDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string }) {
  const [type, setType] = useState<BlockType>("24-hour");
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("48");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manually Block User</DialogTitle>
          <DialogDescription>User <span className="font-mono">{userId}</span> will not be able to submit giftcard trades.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Block duration *</label>
            <div className="mt-2 space-y-1.5">
              {(["24-hour", "7-day", "Custom", "Permanent"] as BlockType[]).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary/40">
                  <input type="radio" name="dur" checked={type === t} onChange={() => setType(t)} />
                  <span className="flex-1">{t}{t === "Permanent" && <span className="ml-2 text-xs text-muted-foreground">(confirmed fraud only)</span>}</span>
                </label>
              ))}
            </div>
            {type === "Custom" && (
              <div className="mt-2"><Input type="number" value={custom} onChange={(e) => setCustom(e.target.value)} className="font-mono" placeholder="Hours" /></div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Reason *</label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
            <span>{type === "Permanent" ? "Permanent block triggers payout reversal if the most recent trade was already paid." : "User cannot upload or submit giftcard trades while blocked."}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { if (!reason) { toast.error("Reason required"); return; } toast.success(`User blocked (${type}).`); onOpenChange(false); }}>Confirm Block</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}