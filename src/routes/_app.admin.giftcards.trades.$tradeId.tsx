import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, AlertTriangle, ChevronRight, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { tradeQueries, acceptTrade, rejectTrade, approveTradeItem, rejectTradeItem, queryKeys } from "@/api";
import { formatDateTime } from "@/lib/format";
import type { TradeItem } from "@/api/types";
import { cn } from "@/lib/utils";

const REJECT_REASONS = [
  { value: "INVALID_CARD",      label: "Invalid card",       help: "Card appears invalid or expired" },
  { value: "WRONG_BRAND",       label: "Wrong brand",        help: "Card is not the declared brand" },
  { value: "WRONG_REGION",      label: "Wrong region",       help: "Card region doesn't match" },
  { value: "WRONG_AMOUNT",      label: "Wrong amount",       help: "Face value doesn't match declared" },
  { value: "DUPLICATE_CARD",    label: "Duplicate card",     help: "Card was previously submitted" },
  { value: "LOW_QUALITY_PROOF", label: "Low-quality proof",  help: "Photos are blurry or incomplete" },
  { value: "RESOLD_CARD",       label: "Resold card",        help: "Card has been used or resold", ban: true },
  { value: "OTHER",             label: "Other",              help: "See notes below" },
];

export const Route = createFileRoute("/_app/admin/giftcards/trades/$tradeId")({
  head: () => ({ meta: [{ title: "Trade Detail — Plut Admin" }] }),
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { tradeId } = useParams({ from: "/_app/admin/giftcards/trades/$tradeId" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: trade, isLoading, isError } = useQuery(tradeQueries.detail(tradeId));

  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [payoutOverride, setPayoutOverride] = useState("");
  const [itemRejectTarget, setItemRejectTarget] = useState<TradeItem | null>(null);

  const approveMutation = useMutation({
    mutationFn: (override?: number) => acceptTrade(tradeId, override),
    onSuccess: () => {
      toast.success("Trade approved. Payout in progress.");
      qc.invalidateQueries({ queryKey: queryKeys.trades.all() });
      navigate({ to: "/admin/giftcards/trades" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectTrade(tradeId, reason),
    onSuccess: () => {
      toast.success("Trade rejected. User notified.");
      qc.invalidateQueries({ queryKey: queryKeys.trades.all() });
      navigate({ to: "/admin/giftcards/trades" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveItemMutation = useMutation({
    mutationFn: (itemId: string) => approveTradeItem(tradeId, itemId),
    onSuccess: () => {
      toast.success("Item approved.");
      qc.invalidateQueries({ queryKey: queryKeys.trades.detail(tradeId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectItemMutation = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: string; reason: string }) =>
      rejectTradeItem(tradeId, itemId, reason),
    onSuccess: () => {
      toast.success("Item rejected.");
      setItemRejectTarget(null);
      qc.invalidateQueries({ queryKey: queryKeys.trades.detail(tradeId) });
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

  if (isError || !trade) {
    return (
      <div className="space-y-4">
        <Link to="/admin/giftcards/trades" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Trades
        </Link>
        <p className="text-sm text-muted-foreground">Trade not found or failed to load.</p>
      </div>
    );
  }

  const isTerminal = !["Submitted", "Approved"].includes(trade.status);
  const allImages = trade.items.flatMap((i) => i.imageUrls);
  const pendingCount = trade.items.filter((i) => i.status === "Pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/giftcards/trades" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Trades
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{trade.id}</span>
          <StatusBadge status={trade.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Trade Summary">
          <Row label="Payout Currency">{trade.payoutCurrency}</Row>
          <Row label="Card Value (USD)"><span className="font-mono">${trade.totalCardValueUsd.toFixed(2)}</span></Row>
          <Row label="Customer Payout">
            <span className="font-mono font-semibold">{trade.totalCustomerPayoutAmount.toLocaleString()} {trade.payoutCurrency}</span>
          </Row>
          <Row label="Profit (USD)"><span className="font-mono text-success">${trade.totalProfitUsd.toFixed(2)}</span></Row>
          <Row label="Submitted">{formatDateTime(trade.submittedAt)}</Row>
          {!isTerminal && <Row label="SLA"><SlaIndicator deadlineIso={trade.slaDeadlineAt} /></Row>}
          {trade.approvedAt && <Row label="Approved">{formatDateTime(trade.approvedAt)}</Row>}
          {trade.paidAt && <Row label="Paid">{formatDateTime(trade.paidAt)}</Row>}
          {trade.rejectedAt && <Row label="Rejected">{formatDateTime(trade.rejectedAt)}</Row>}
        </Panel>

        <Panel title="Customer">
          <Row label="Customer ID"><span className="font-mono text-xs break-all">{trade.customerId}</span></Row>
          <Row label="Quote ID"><span className="font-mono text-xs break-all">{trade.quoteId}</span></Row>
          <Link to="/admin/giftcards/users/$userId" params={{ userId: trade.customerId }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View user profile <ChevronRight className="h-3 w-3" />
          </Link>
        </Panel>
      </div>

      <Panel title={`Batch Items${!isTerminal && pendingCount > 0 ? ` — ${pendingCount} pending review` : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Denomination</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4 text-right">Cust Rate (USD)</th>
                <th className="py-2 pr-4 text-right">Payout / item</th>
                <th className="py-2 pr-4 text-right">Line Total</th>
                <th className="py-2 pl-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {trade.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-3 pr-4 font-mono">{item.denominationCurrency} {item.denominationAmount}</td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  <td className="py-3 pr-4 text-right font-mono">${item.customerRateUsd.toFixed(4)}</td>
                  <td className="py-3 pr-4 text-right font-mono">{item.customerPayoutAmount.toLocaleString()} {item.payoutCurrency}</td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold">
                    {(item.customerPayoutAmount * item.quantity).toLocaleString()} {item.payoutCurrency}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    {isTerminal ? (
                      <ItemStatusBadge status={item.status} />
                    ) : (
                      <ItemStatusSelect
                        value={item.status}
                        loading={approveItemMutation.isPending && approveItemMutation.variables === item.id}
                        onChange={(next) => {
                          if (next === "Approved") approveItemMutation.mutate(item.id);
                          else setItemRejectTarget(item);
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={5} className="py-2 text-right text-sm font-semibold">Total Payout</td>
                <td className="py-2 pl-4 text-right font-mono text-lg font-bold">
                  {trade.totalCustomerPayoutAmount.toLocaleString()} {trade.payoutCurrency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {allImages.length > 0 && (
        <Panel title="Proof Images">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allImages.map((url, i) => (
              <button key={i} onClick={() => setLightbox(url)}
                className="aspect-4/3 overflow-hidden rounded-lg border bg-secondary/40 transition-all hover:border-primary">
                <img src={url} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </Panel>
      )}

      {trade.status === "Rejected" && trade.rejectionReason && (
        <Panel title="Rejection">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <p>{trade.rejectionReason}</p>
          </div>
        </Panel>
      )}

      {!isTerminal && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
          {pendingCount > 0 && (
            <p className="flex-1 text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-3 w-3 text-warning" />
              {pendingCount} item{pendingCount !== 1 ? "s" : ""} still pending review
            </p>
          )}
          <Button onClick={() => setOpenApprove(true)} className="flex-1 sm:flex-none">
            <Check className="h-4 w-4" /> Approve Trade
          </Button>
          <Button onClick={() => setOpenReject(true)} variant="outline"
            className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <X className="h-4 w-4" /> Reject Trade
          </Button>
        </div>
      )}

      {/* Trade-level approve */}
      <Dialog open={openApprove} onOpenChange={(o) => { setOpenApprove(o); if (!o) setPayoutOverride(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>This will credit the user's wallet and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-secondary/60 p-3 text-sm">
            <Row label="Trade"><span className="font-mono text-xs">{trade.id}</span></Row>
            <Row label="Payout">
              <span className="font-mono font-semibold">{trade.totalCustomerPayoutAmount.toLocaleString()} {trade.payoutCurrency}</span>
            </Row>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-override" className="text-sm">
              Override payout <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input id="payout-override" type="number" inputMode="decimal" min={0} step="0.01"
                placeholder={trade.totalCustomerPayoutAmount.toString()}
                value={payoutOverride} onChange={(e) => setPayoutOverride(e.target.value)}
                className="font-mono" />
              <span className="text-sm text-muted-foreground">{trade.payoutCurrency}</span>
            </div>
            <p className="text-xs text-muted-foreground">Leave blank to credit the calculated amount.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenApprove(false)}>Cancel</Button>
            <Button onClick={() => {
              const t = payoutOverride.trim();
              if (t === "") return approveMutation.mutate(undefined);
              const n = Number(t);
              if (!Number.isFinite(n) || n < 0) { toast.error("Enter a valid payout amount"); return; }
              approveMutation.mutate(n);
            }} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving…" : "Confirm Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade-level reject */}
      <RejectDialog open={openReject} onOpenChange={setOpenReject}
        title="Reject Trade"
        description="The user will be notified and a strike added to their account."
        onSubmit={(r) => rejectMutation.mutate(r)}
        submitting={rejectMutation.isPending} />

      {/* Per-item reject */}
      <RejectDialog
        open={!!itemRejectTarget}
        onOpenChange={(o) => !o && setItemRejectTarget(null)}
        title={`Reject Item — ${itemRejectTarget?.denominationCurrency} ${itemRejectTarget?.denominationAmount}`}
        description="Only this item will be marked rejected. Other items are unaffected."
        onSubmit={(r) => itemRejectTarget && rejectItemMutation.mutate({ itemId: itemRejectTarget.id, reason: r })}
        submitting={rejectItemMutation.isPending} />

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Proof Image</DialogTitle>
            <DialogDescription>{trade.id}</DialogDescription>
          </DialogHeader>
          {lightbox && <img src={lightbox} alt="Proof" className="w-full rounded-lg object-contain max-h-[70vh]" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type ItemStatus = TradeItem["status"];

const STATUS_STYLES: Record<ItemStatus, string> = {
  Pending:  "border-warning/40 bg-warning/10 text-warning",
  Approved: "border-success/40 bg-success/10 text-success",
  Rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

function ItemStatusSelect({ value, onChange, loading }: {
  value: ItemStatus;
  onChange: (next: "Approved" | "Rejected") => void;
  loading: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as "Approved" | "Rejected")} disabled={loading}>
      <SelectTrigger className={cn("h-8 w-[130px] gap-1.5 text-xs font-semibold", STATUS_STYLES[value])}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ItemStatusIcon status={value} />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Pending" disabled>Pending</SelectItem>
        <SelectItem value="Approved">Approved</SelectItem>
        <SelectItem value="Rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLES[status])}>
      <ItemStatusIcon status={status} />
      {status}
    </span>
  );
}

function ItemStatusIcon({ status }: { status: ItemStatus }) {
  if (status === "Approved") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "Rejected") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function RejectDialog({ open, onOpenChange, title, description, onSubmit, submitting }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const banWarn = REJECT_REASONS.find((r) => r.value === reason)?.ban;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setReason(""); setNotes(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rejection reason *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="font-medium">{r.label}</span> — <span className="text-muted-foreground">{r.help}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {banWarn && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <span>This reason will permanently ban the user and may trigger a payout reversal.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive"
            onClick={() => { if (!reason) { toast.error("Pick a rejection reason."); return; } onSubmit(`${reason}${notes ? `: ${notes}` : ""}`); }}
            disabled={submitting}>
            {submitting ? "Rejecting…" : "Confirm Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
