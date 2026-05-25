import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, X, Image as ImageIcon, AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { tradeById, REJECT_REASONS, brandById, type RejectReason } from "@/data/mock";
import { formatNaira, formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/giftcards/trades/$tradeId")({
  head: () => ({ meta: [{ title: "Trade Detail — Plut Admin" }] }),
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { tradeId } = useParams({ from: "/_app/admin/giftcards/trades/$tradeId" });
  const navigate = useNavigate();
  const trade = tradeById(tradeId);
  const brand = trade ? brandById(trade.brandId) : null;
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [openLightbox, setOpenLightbox] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!trade) {
    return (
      <div className="space-y-4">
        <Link to="/admin/giftcards/trades" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Trades</Link>
        <p className="text-sm text-muted-foreground">Trade not found.</p>
      </div>
    );
  }

  const isTerminal = trade.status !== "Submitted";

  const onApprove = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setOpenApprove(false);
    toast.success("Trade approved. Payout in progress.");
    navigate({ to: "/admin/giftcards/trades" });
  };

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
          <Row label="Brand"><span className="inline-flex items-center gap-2">{brand?.logoEmoji} <span className="font-medium">{brand?.name}</span></span></Row>
          <Row label="Country">{trade.countryCode}</Row>
          <Row label="Format">{trade.format}</Row>
          <Row label="Submitted">{formatDateTime(trade.submittedAt)}</Row>
          {trade.status === "Submitted" && <Row label="SLA"><SlaIndicator deadlineIso={trade.slaDeadlineAt} /></Row>}
        </Panel>
        <Panel title="Customer">
          <Row label="ID"><span className="font-mono text-xs">{trade.customerId}</span></Row>
          <Row label="Email">{trade.customerEmail}</Row>
          <Row label="KYC Tier">{trade.kycTier}</Row>
          <Row label="Active Strikes">{trade.activeStrikes}</Row>
          <Row label="Past Trades">{trade.pastTrades} (all paid)</Row>
          <Link to="/admin/giftcards/users/$userId" params={{ userId: trade.customerId }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View user profile <ChevronRight className="h-3 w-3" />
          </Link>
        </Panel>
      </div>

      <Panel title="Batch Items">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">Denom</th><th className="py-2 pr-4">Qty</th><th className="py-2 pr-4 text-right">Cust Rate (USD)</th><th className="py-2 pr-4 text-right">Payout / card</th><th className="py-2 text-right">Line NGN</th>
            </tr></thead>
            <tbody>
              {trade.lineItems.map((li, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-3 pr-4 font-mono">{li.denom}</td>
                  <td className="py-3 pr-4">{li.qty}</td>
                  <td className="py-3 pr-4 text-right font-mono">${li.customerRateUsd.toFixed(4)}</td>
                  <td className="py-3 pr-4 text-right font-mono">{formatNaira(li.payoutPerCardNgn)}</td>
                  <td className="py-3 text-right font-mono font-semibold">{formatNaira(li.lineNgn)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border"><td colSpan={4} className="py-2 text-right text-xs text-muted-foreground">Gross NGN</td><td className="py-2 text-right font-mono">{formatNaira(trade.grossNgn)}</td></tr>
              <tr><td colSpan={4} className="py-1 text-right text-xs text-muted-foreground">Fee (2%)</td><td className="py-1 text-right font-mono text-muted-foreground">{formatNaira(trade.feeNgn)}</td></tr>
              <tr><td colSpan={4} className="py-1 text-right text-xs text-muted-foreground">Compensation</td><td className="py-1 text-right font-mono text-muted-foreground">{formatNaira(trade.compNgn)}</td></tr>
              <tr className="border-t border-border"><td colSpan={4} className="py-2 text-right text-sm font-semibold">Payout NGN</td><td className="py-2 text-right font-mono text-lg font-bold">{formatNaira(trade.payoutNgn)}</td></tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel title="Proof Images">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {trade.proofImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setOpenLightbox(i)}
              className="group relative aspect-[4/3] rounded-lg border bg-secondary/40 transition-all hover:border-primary hover:shadow-[var(--shadow-primary)]"
            >
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between rounded-b-lg bg-background/70 px-3 py-1.5 text-xs backdrop-blur-sm">
                <span className="font-medium">{img.label}</span>
                <span className="text-muted-foreground">{(img.sizeKb / 1024).toFixed(1)} MB</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="AI Analysis">
          <Row label="Decision"><span className={cn("font-semibold", trade.ai.decision === "PASSED" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{trade.ai.decision}</span></Row>
          <Row label="Confidence">{trade.ai.confidence}%</Row>
          <Row label="Probable Brand">{trade.ai.probableBrand}</Row>
          <Row label="Flags">{trade.ai.flags.length === 0 ? <span className="text-muted-foreground">None</span> : trade.ai.flags.join(", ")}</Row>
          <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs italic text-muted-foreground">"{trade.ai.notes}"</p>
        </Panel>
        <Panel title="Fraud Score">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-4xl font-bold">{trade.fraud.score}<span className="text-base text-muted-foreground">/100</span></span>
            <StatusBadge status={trade.fraud.level === "LOW" ? "Paid" : trade.fraud.level === "HIGH" ? "Rejected" : "Submitted"} dot={false} className="!gap-0">
            </StatusBadge>
            <span className="text-sm font-semibold">Risk {trade.fraud.level}</span>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
            {trade.fraud.breakdown.map((b) => (
              <div key={b.label} className="flex justify-between">
                <span className="text-muted-foreground">{b.label}</span>
                <span className={cn("font-mono", b.delta === 0 ? "text-muted-foreground" : b.delta > 20 ? "text-red-500" : "text-warning")}>+{b.delta}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Status History">
        <ol className="space-y-3">
          {trade.history.map((e, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="w-24 font-mono text-xs text-muted-foreground">{formatTime(e.at)}</span>
              <span>{e.label}</span>
            </li>
          ))}
        </ol>
      </Panel>

      {trade.status === "Rejected" && trade.rejectionReason && (
        <Panel title="Rejection">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="font-semibold">{REJECT_REASONS.find((r) => r.value === trade.rejectionReason)?.label}</p>
              <p className="text-xs text-muted-foreground">{REJECT_REASONS.find((r) => r.value === trade.rejectionReason)?.help}</p>
            </div>
          </div>
        </Panel>
      )}

      {!isTerminal && (
        <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
          <Button onClick={() => setOpenApprove(true)} className="flex-1 sm:flex-none">
            <Check className="h-4 w-4" /> Approve Trade
          </Button>
          <Button onClick={() => setOpenReject(true)} variant="outline" className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <X className="h-4 w-4" /> Reject Trade
          </Button>
        </div>
      )}

      {/* Approve */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>This will credit the user's wallet. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-secondary/60 p-3 text-sm">
            <Row label="Trade"><span className="font-mono text-xs">{trade.id}</span></Row>
            <Row label="Customer">{trade.customerEmail}</Row>
            <Row label="Payout"><span className="font-mono font-semibold">{formatNaira(trade.payoutNgn)}</span></Row>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenApprove(false)}>Cancel</Button>
            <Button onClick={onApprove} disabled={submitting}>{submitting ? "Approving…" : "Confirm Approve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <RejectDialog open={openReject} onOpenChange={setOpenReject} tradeId={trade.id} />

      {/* Lightbox */}
      <Dialog open={openLightbox !== null} onOpenChange={(o) => !o && setOpenLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Proof Image — {trade.id}</DialogTitle>
            <DialogDescription>{openLightbox !== null && trade.proofImages[openLightbox]?.label}</DialogDescription>
          </DialogHeader>
          <div className="grid aspect-video w-full place-items-center rounded-lg bg-secondary/60 text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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

function RejectDialog({ open, onOpenChange, tradeId }: { open: boolean; onOpenChange: (o: boolean) => void; tradeId: string }) {
  const [reason, setReason] = useState<RejectReason | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const banWarn = REJECT_REASONS.find((r) => r.value === reason)?.ban;

  const submit = async () => {
    if (!reason) { toast.error("Pick a rejection reason."); return; }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    onOpenChange(false);
    toast.success(`Trade ${tradeId} rejected. User has been notified.`);
    navigate({ to: "/admin/giftcards/trades" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Trade</DialogTitle>
          <DialogDescription>The user will be notified and a strike added to their account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rejection reason *</label>
            <Select value={reason} onValueChange={(v) => setReason(v as RejectReason)}>
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
          <Button variant="destructive" onClick={submit} disabled={submitting}>{submitting ? "Rejecting…" : "Confirm Reject"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}