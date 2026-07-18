import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Bot,
  User,
  Pencil,
  ImageOff,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { UserRef } from "@/components/plut/UserSummaryModal";
import {
  AiVerificationBadge,
  aiVerdictMeta,
  formatConfidence,
} from "@/components/plut/AiVerificationBadge";
import {
  tradeQueries,
  tradeSourcingQueries,
  denominationQueries,
  userQueries,
  acceptTrade,
  rejectTrade,
  approveTradeItem,
  editTradeItem,
  rejectTradeItem,
  recordCardOutcome,
  resendCardImages,
  queryKeys,
} from "@/api";
import { formatDateTime, currencySymbol } from "@/lib/format";
import type { TradeItem, TradeDetail, KycTier, UserStatus, TradeCardDto } from "@/api/types";
import { cn } from "@/lib/utils";

const REJECT_REASONS = [
  { value: "INVALID_CARD", label: "Invalid card", help: "Card appears invalid or expired" },
  { value: "WRONG_BRAND", label: "Wrong brand", help: "Card is not the declared brand" },
  { value: "WRONG_REGION", label: "Wrong region", help: "Card region doesn't match" },
  { value: "WRONG_AMOUNT", label: "Wrong amount", help: "Face value doesn't match declared" },
  { value: "DUPLICATE_CARD", label: "Duplicate card", help: "Card was previously submitted" },
  {
    value: "LOW_QUALITY_PROOF",
    label: "Low-quality proof",
    help: "Photos are blurry or incomplete",
  },
  { value: "RESOLD_CARD", label: "Resold card", help: "Card has been used or resold", ban: true },
  { value: "OTHER", label: "Other", help: "See notes below" },
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

  const { data: customer, isLoading: customerLoading } = useQuery({
    ...userQueries.detail(trade?.customerId ?? ""),
    enabled: !!trade?.customerId,
  });

  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [payoutOverride, setPayoutOverride] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [itemRejectTarget, setItemRejectTarget] = useState<TradeItem | null>(null);
  const [itemEditTarget, setItemEditTarget] = useState<TradeItem | null>(null);

  const approveMutation = useMutation({
    mutationFn: ({ override, comment }: { override?: number; comment?: string }) =>
      acceptTrade(tradeId, override, comment),
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

  const editItemMutation = useMutation({
    mutationFn: ({
      itemId,
      changes,
    }: {
      itemId: string;
      changes: { denominationId?: string; quantity?: number };
    }) => editTradeItem(tradeId, itemId, changes),
    onSuccess: () => {
      toast.success("Item updated.");
      setItemEditTarget(null);
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
        <Link
          to="/admin/giftcards/trades"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Trades
        </Link>
        <p className="text-sm text-muted-foreground">Trade not found or failed to load.</p>
      </div>
    );
  }

  const isTerminal = !["Submitted", "Approved"].includes(trade.status);
  const allImages = trade.items.flatMap((i) => i.imageUrls);
  const pendingCount = trade.items.filter((i) => i.status === "Pending").length;
  // All items share the same FX snapshot from the quote
  const fxRate = trade.items[0]?.fxRateToPayoutCurrency;
  // Derive brand/country from first item for the rate-lock panel
  const firstItem = trade.items[0];

  // ── Totals reflect only non-rejected line items ──
  // Rejecting one item must drop it from the trade total. We recompute the headline
  // figures from the live (non-rejected) items so the UI updates immediately; the
  // backend is expected to persist the same recalculation on reject (see backend MD).
  const liveItems = trade.items.filter((i) => i.status !== "Rejected");
  const rejectedCount = trade.items.length - liveItems.length;
  const sumLive = (f: (i: TradeItem) => number) => liveItems.reduce((s, i) => s + f(i), 0);
  // The backend does NOT drop rejected items from the trade totals (verified live), so while a
  // trade is still under review we recompute the headline figures from the surviving items.
  // For terminal trades we keep the backend totals — they're the historical record of what was paid.
  const recompute = !isTerminal && rejectedCount > 0;
  const effCardValueUsd = recompute ? sumLive((i) => i.cardValueUsd) : trade.totalCardValueUsd;
  const effPayoutAmount = recompute
    ? sumLive((i) => i.customerPayoutAmount)
    : trade.totalCustomerPayoutAmount;
  const effProfitUsd = recompute
    ? sumLive((i) => i.marketRateUsd * i.cardValueUsd) - sumLive((i) => i.customerPayoutUsd)
    : trade.totalProfitUsd;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/giftcards/trades"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Trades
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{trade.id}</span>
          <AiVerificationBadge
            status={trade.verificationStatus}
            confidence={trade.verificationConfidence}
            showConfidence
            showAiPrefix
          />
          <StatusBadge status={trade.status} />
        </div>
      </div>

      {/* ── Row 1: Trade Summary + Customer ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trade Summary — Finding 5: divider separates financials from lifecycle timestamps */}
        <Panel title="Trade Summary">
          <Row label="Payout Currency">{trade.payoutCurrency}</Row>
          <Row label="Card Value (USD)">
            <span className="font-mono">${effCardValueUsd.toFixed(2)}</span>
          </Row>
          <Row label="Customer Payout">
            <span className="font-mono font-semibold">
              {effPayoutAmount.toLocaleString()} {trade.payoutCurrency}
            </span>
          </Row>
          {fxRate ? (
            <Row label="FX Rate">
              <span className="font-mono">
                1 USD = {currencySymbol(trade.payoutCurrency)}
                {fxRate.toLocaleString()}
              </span>
            </Row>
          ) : null}
          <Row label="Profit (USD)">
            <span className="font-mono text-success">${effProfitUsd.toFixed(2)}</span>
          </Row>
          {recompute && (
            <Row label="Adjustment">
              <span className="text-[11px] text-warning">
                Excludes {rejectedCount} rejected item{rejectedCount > 1 ? "s" : ""} · was{" "}
                <span className="font-mono line-through">
                  {trade.totalCustomerPayoutAmount.toLocaleString()} {trade.payoutCurrency}
                </span>
              </span>
            </Row>
          )}

          <div className="my-2 border-t border-border" />

          <Row label="Submitted">{formatDateTime(trade.submittedAt)}</Row>
          {!isTerminal && (
            <Row label="SLA">
              <SlaIndicator deadlineIso={trade.slaDeadlineAt} />
            </Row>
          )}
          {trade.approvedAt && <Row label="Approved">{formatDateTime(trade.approvedAt)}</Row>}
          {trade.paidAt && <Row label="Paid">{formatDateTime(trade.paidAt)}</Row>}
          {trade.rejectedAt && <Row label="Rejected">{formatDateTime(trade.rejectedAt)}</Row>}
          {trade.adminComment && (
            <Row label="Admin note">
              <span className="text-xs italic text-muted-foreground">“{trade.adminComment}”</span>
            </Row>
          )}
        </Panel>

        {/* Customer — Finding 1: fetch and display customer details */}
        <Panel title="Customer">
          {customerLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading customer…
            </div>
          ) : customer ? (
            <div className="space-y-3">
              {/* Avatar + name row */}
              <div className="flex items-center gap-3">
                {customer.avatarUrl ? (
                  <img
                    src={customer.avatarUrl}
                    alt={customer.displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {customer.displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-semibold leading-tight">{customer.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.firstName} {customer.lastName}
                  </p>
                </div>
              </div>

              <div className="space-y-0">
                <Row label="Email">
                  <span className="text-xs">{customer.email}</span>
                </Row>
                {customer.phoneNumber && (
                  <Row label="Phone">
                    <span className="font-mono text-xs">{customer.phoneNumber}</span>
                  </Row>
                )}
                <Row label="KYC Tier">
                  <KycBadge tier={customer.kycTier} />
                </Row>
                <Row label="Status">
                  <UserStatusBadge status={customer.status} />
                </Row>
                <Row label="Customer ID">
                  <UserRef
                    userId={trade.customerId}
                    className="font-mono text-[11px] break-all text-muted-foreground"
                  >
                    {trade.customerId}
                  </UserRef>
                </Row>
              </div>

              <Link
                to="/admin/giftcards/users/$userId"
                params={{ userId: trade.customerId }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View full profile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              <Row label="Customer ID">
                <UserRef userId={trade.customerId} className="font-mono text-xs break-all">
                  {trade.customerId}
                </UserRef>
              </Row>
              <Link
                to="/admin/giftcards/users/$userId"
                params={{ userId: trade.customerId }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View user profile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Rate Lock — Finding 2: quoteId as audit ref + brand/country/FX from items ── */}
      {firstItem && (
        <Panel title="Rate Lock">
          <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
            <Row label="Card">{firstItem.brandName}</Row>
            <Row label="Country">
              {firstItem.countryName}{" "}
              <span className="ml-1 text-[11px] text-muted-foreground">
                ({firstItem.countryCode})
              </span>
            </Row>
            <Row label="Payout Currency">{trade.payoutCurrency}</Row>
            {fxRate && (
              <Row label="FX Rate Applied">
                <span className="font-mono">
                  1 USD = {fxRate.toLocaleString()} {trade.payoutCurrency}
                </span>
              </Row>
            )}
            <div className="col-span-2">
              <Row label="Rate-lock ID">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {trade.quoteId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(trade.quoteId);
                      toast.success("Copied");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy quote ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              </Row>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Vendor & Redemption — how this trade was sourced to a provider ── */}
      <VendorSourcingPanel tradeId={tradeId} />

      {/* ── Batch Items — Finding 3: Brand + Country columns; Finding 4: FX note below ── */}
      <Panel
        title={`Batch Items${!isTerminal && pendingCount > 0 ? ` — ${pendingCount} pending review` : ""}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Card</th>
                <th className="py-2 pr-4">Country</th>
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
                  <td className="py-3 pr-4 font-medium">{item.brandName}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{item.countryName}</td>
                  <td className="py-3 pr-4 font-mono">
                    {item.denominationCurrency} {item.denominationAmount}
                  </td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  <td className="py-3 pr-4 text-right font-mono">
                    ${item.customerRateUsd.toFixed(4)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono">
                    {(item.customerPayoutAmount / item.quantity).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {item.payoutCurrency}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold">
                    {item.customerPayoutAmount.toLocaleString()} {item.payoutCurrency}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isTerminal && item.status !== "Rejected" && (
                        <button
                          type="button"
                          onClick={() => setItemEditTarget(item)}
                          title="Edit denomination / quantity"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!isTerminal && item.status === "Pending" ? (
                        <ItemStatusSelect
                          value={item.status}
                          loading={
                            approveItemMutation.isPending &&
                            approveItemMutation.variables === item.id
                          }
                          onChange={(next) => {
                            if (next === "Approved") approveItemMutation.mutate(item.id);
                            else setItemRejectTarget(item);
                          }}
                        />
                      ) : (
                        <ItemStatusBadge status={item.status} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {recompute && (
                <tr>
                  <td colSpan={7} className="py-1 text-right text-[11px] text-muted-foreground">
                    Excludes {rejectedCount} rejected item{rejectedCount > 1 ? "s" : ""}
                  </td>
                  <td className="py-1 pl-4 text-right font-mono text-[11px] text-muted-foreground line-through">
                    {trade.totalCustomerPayoutAmount.toLocaleString()} {trade.payoutCurrency}
                  </td>
                </tr>
              )}
              <tr className="border-t border-border">
                <td colSpan={7} className="py-2 text-right text-sm font-semibold">
                  Total Payout
                </td>
                <td className="py-2 pl-4 text-right font-mono text-lg font-bold">
                  {effPayoutAmount.toLocaleString()} {trade.payoutCurrency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* Finding 4: locked FX rate for audit reference */}
        {fxRate && (
          <p className="mt-2 text-right text-[11px] text-muted-foreground">
            FX rate locked at submission: 1 USD = {fxRate.toLocaleString()} {trade.payoutCurrency}
          </p>
        )}
      </Panel>

      {allImages.length > 0 && (
        <Panel title="Proof Images">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(url)}
                className="aspect-4/3 overflow-hidden rounded-lg border bg-secondary/40 transition-all hover:border-primary"
              >
                <img src={url} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </Panel>
      )}

      <AiVerificationPanel trade={trade} />

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
          <Button
            onClick={() => setOpenReject(true)}
            variant="outline"
            className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" /> Reject Trade
          </Button>
        </div>
      )}

      {/* Trade-level approve */}
      <Dialog
        open={openApprove}
        onOpenChange={(o) => {
          setOpenApprove(o);
          if (!o) {
            setPayoutOverride("");
            setApproveComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              This will credit the user's wallet and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-secondary/60 p-3 text-sm">
            <Row label="Trade">
              <span className="font-mono text-xs">{trade.id}</span>
            </Row>
            <Row label="Payout">
              <span className="font-mono font-semibold">
                {effPayoutAmount.toLocaleString()} {trade.payoutCurrency}
              </span>
            </Row>
            {recompute && (
              <Row label="Note">
                <span className="text-[11px] text-warning">
                  Excludes {rejectedCount} rejected item{rejectedCount > 1 ? "s" : ""}
                </span>
              </Row>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-override" className="text-sm">
              Override payout <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="payout-override"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={effPayoutAmount.toString()}
                value={payoutOverride}
                onChange={(e) => setPayoutOverride(e.target.value)}
                className="font-mono"
              />
              <span className="text-sm text-muted-foreground">{trade.payoutCurrency}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to credit the calculated amount.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-comment" className="text-sm">
              Comment <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="approve-comment"
              rows={2}
              maxLength={1000}
              placeholder="Internal note — e.g. why an override was applied"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenApprove(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const comment = approveComment.trim() || undefined;
                const t = payoutOverride.trim();
                if (t === "") return approveMutation.mutate({ comment });
                const n = Number(t);
                if (!Number.isFinite(n) || n < 0) {
                  toast.error("Enter a valid payout amount");
                  return;
                }
                approveMutation.mutate({ override: n, comment });
              }}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving…" : "Confirm Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade-level reject */}
      <RejectDialog
        open={openReject}
        onOpenChange={setOpenReject}
        title="Reject Trade"
        description="The user will be notified and a strike added to their account."
        onSubmit={(r) => rejectMutation.mutate(r)}
        submitting={rejectMutation.isPending}
      />

      {/* Per-item reject */}
      <RejectDialog
        open={!!itemRejectTarget}
        onOpenChange={(o) => !o && setItemRejectTarget(null)}
        title={`Reject Item — ${itemRejectTarget?.denominationCurrency} ${itemRejectTarget?.denominationAmount}`}
        description="Only this item will be marked rejected. Other items are unaffected."
        onSubmit={(r) =>
          itemRejectTarget && rejectItemMutation.mutate({ itemId: itemRejectTarget.id, reason: r })
        }
        submitting={rejectItemMutation.isPending}
      />

      {/* Per-item edit — denomination / quantity */}
      <EditItemDialog
        item={itemEditTarget}
        payoutCurrency={trade.payoutCurrency}
        onOpenChange={(o) => !o && setItemEditTarget(null)}
        onSubmit={(changes) =>
          itemEditTarget && editItemMutation.mutate({ itemId: itemEditTarget.id, changes })
        }
        submitting={editItemMutation.isPending}
      />

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Proof Image</DialogTitle>
            <DialogDescription>{trade.id}</DialogDescription>
          </DialogHeader>
          {lightbox && (
            <img
              src={lightbox}
              alt="Proof"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type ItemStatus = TradeItem["status"];

const STATUS_STYLES: Record<ItemStatus, string> = {
  Pending: "border-warning/40 bg-warning/10 text-warning",
  Approved: "border-success/40 bg-success/10 text-success",
  Rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

const KYC_STYLES: Record<KycTier, string> = {
  Tier0: "border-border bg-secondary text-muted-foreground",
  Tier1: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400",
  Tier2: "border-blue-400/40 bg-blue-400/10 text-blue-600 dark:text-blue-400",
  Tier3: "border-success/40 bg-success/10 text-success",
};

const KYC_LABELS: Record<KycTier, string> = {
  Tier0: "Unverified",
  Tier1: "Basic KYC",
  Tier2: "Intermediate",
  Tier3: "Full KYC",
};

const USER_STATUS_STYLES: Record<UserStatus, string> = {
  Active: "border-success/40 bg-success/10 text-success",
  Pending: "border-warning/40 bg-warning/10 text-warning",
  Suspended: "border-destructive/40 bg-destructive/10 text-destructive",
};

function KycBadge({ tier }: { tier: KycTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        KYC_STYLES[tier],
      )}
    >
      {KYC_LABELS[tier]}
    </span>
  );
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        USER_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

function ItemStatusSelect({
  value,
  onChange,
  loading,
}: {
  value: ItemStatus;
  onChange: (next: "Approved" | "Rejected") => void;
  loading: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as "Approved" | "Rejected")}
      disabled={loading}
    >
      <SelectTrigger
        className={cn("h-8 w-[130px] gap-1.5 text-xs font-semibold", STATUS_STYLES[value])}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ItemStatusIcon status={value} />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Pending" disabled>
          Pending
        </SelectItem>
        <SelectItem value="Approved">Approved</SelectItem>
        <SelectItem value="Rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        STATUS_STYLES[status],
      )}
    >
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

// ── AI Verification panel ──────────────────────────────────────────────────────
// Surfaces the advisory verdict from the ai-service worker: the trade-level rollup plus
// a per-line-item breakdown of what the vision model saw. Purely informational — the
// admin still approves/rejects manually (the worker never moves money or auto-decides).
function AiVerificationPanel({ trade }: { trade: TradeDetail }) {
  const meta = aiVerdictMeta(trade.verificationStatus);
  const isChecked = meta.key !== "NOTCHECKED" && meta.key !== "INPROGRESS";

  return (
    <Panel title="AI Verification">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AiVerificationBadge
          status={trade.verificationStatus}
          confidence={trade.verificationConfidence}
          showConfidence
        />
        {trade.verifiedAt ? (
          <span className="text-xs text-muted-foreground">
            Verified {formatDateTime(trade.verifiedAt)}
          </span>
        ) : meta.key === "INPROGRESS" ? (
          <span className="text-xs text-muted-foreground">AI is analysing the proof images…</span>
        ) : meta.key === "NOTCHECKED" ? (
          <span className="text-xs text-muted-foreground">Not yet processed by the AI.</span>
        ) : null}
      </div>

      {/* Attention callout — NotGiftcard / Uncertain trades warrant a closer look before payout */}
      {meta.needsAttention && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg p-3 text-sm",
            meta.key === "NOTGIFTCARD"
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning",
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {meta.key === "NOTGIFTCARD"
              ? "The AI flagged one or more images as not a giftcard. Review the proofs carefully before approving."
              : "The AI was uncertain about one or more images. Verify the proofs manually before approving."}
          </p>
        </div>
      )}

      {/* Per-item breakdown of what the vision model classified */}
      {isChecked && (
        <div className="mt-4 space-y-2">
          {trade.items.map((item) => {
            const itemMeta = aiVerdictMeta(item.verificationStatus);
            const conf = formatConfidence(item.verificationConfidence);
            return (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {item.brandName}
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {item.denominationCurrency} {item.denominationAmount} × {item.quantity}
                    </span>
                  </span>
                  <AiVerificationBadge
                    status={item.verificationStatus}
                    confidence={item.verificationConfidence}
                    showConfidence
                  />
                </div>
                {(item.isGiftcardImage != null || item.imageType) && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {item.isGiftcardImage != null &&
                      (item.isGiftcardImage
                        ? "Looks like a giftcard"
                        : "Does not look like a giftcard")}
                    {item.imageType && <span> · {item.imageType}</span>}
                    {conf && <span> · {conf} confidence</span>}
                  </p>
                )}
                {item.verificationNotes && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    “{item.verificationNotes}”
                  </p>
                )}
                {itemMeta.key === "NOTCHECKED" &&
                  !item.verificationNotes &&
                  item.isGiftcardImage == null && (
                    <p className="mt-1 text-xs text-muted-foreground">Not checked.</p>
                  )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        AI checks are advisory — they never approve, reject, or move money. Use your judgement.
      </p>
    </Panel>
  );
}

// ── Vendor & Redemption panel ──────────────────────────────────────────────────
// Shows how this trade was routed to (and redeemed by) a vendor: the winning provider,
// the quoted rate, the live redemption status, the AI's read of the outcome, and the
// vendor's raw comment. Sourced from the sourcing engine — advisory, read-only here.
const REDEMPTION_STATUS_STYLES: Record<string, string> = {
  Dispatched: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  AwaitingProvider: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  OutcomeRecorded: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  NeedsHumanReview: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  TimedOut: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  Synced: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
};

const OUTCOME_STYLES: Record<string, string> = {
  Redeemed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  Unknown: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

const CARD_OUTCOME_STYLES: Record<TradeCardDto["outcome"], string> = {
  Pending: "bg-secondary text-secondary-foreground",
  Redeemed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  Unknown: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

function SourcingBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {label}
    </span>
  );
}

function VendorSourcingPanel({ tradeId }: { tradeId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(tradeSourcingQueries.summary(tradeId));

  const outcomeMutation = useMutation({
    mutationFn: ({
      orderId,
      index,
      outcome,
    }: {
      orderId: string;
      index: number;
      outcome: "Redeemed" | "Failed";
    }) => recordCardOutcome(orderId, index, { outcome }),
    onSuccess: (res) => {
      toast.success(`Card ${res.cardIndex} marked. ${res.pendingCards} still pending.`);
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.tradeSummary(tradeId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMutation = useMutation({
    mutationFn: (orderId: string) => resendCardImages(orderId),
    onSuccess: (res) => {
      toast.success(
        res.imagesSent >= res.imagesTotal
          ? `All ${res.imagesTotal} card image(s) sent.`
          : `${res.imagesSent}/${res.imagesTotal} card image(s) sent.`,
      );
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.tradeSummary(tradeId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Panel title="Vendor & Redemption">
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sourcing…
        </div>
      </Panel>
    );
  }

  if (!data || !data.sourced) {
    return (
      <Panel title="Vendor & Redemption">
        <p className="py-1 text-sm text-muted-foreground">Not yet routed to a vendor.</p>
      </Panel>
    );
  }

  const rate =
    data.quotedRate != null ? `${data.quotedRate} ${data.quotedCurrency ?? ""}`.trim() : null;

  return (
    <Panel title="Vendor & Redemption">
      <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
        <Row label="Vendor">
          {data.providerName ?? <span className="text-muted-foreground">—</span>}
        </Row>
        <Row label="Trade ref">
          <span className="font-mono text-xs">{data.tradeReference ?? "—"}</span>
        </Row>
        <Row label="Rate">
          {rate ? (
            <span className="font-mono">
              {rate}
              {data.normalizedUsdPerCard != null && (
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  ${data.normalizedUsdPerCard.toFixed(4)}/card
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row label="Status">
          <SourcingBadge
            label={data.redemptionStatus}
            className={REDEMPTION_STATUS_STYLES[data.redemptionStatus]}
          />
        </Row>
        <Row label="Outcome">
          {data.outcome ? (
            <SourcingBadge label={data.outcome} className={OUTCOME_STYLES[data.outcome]} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        {data.correlationConfidence != null && (
          <Row label="Correlation">
            <span className="text-xs text-muted-foreground">
              {(data.correlationConfidence * 100).toFixed(0)}%
              {data.correlationMethod ? ` · ${data.correlationMethod}` : ""}
            </span>
          </Row>
        )}
        {data.dispatchedAt && <Row label="Dispatched">{formatDateTime(data.dispatchedAt)}</Row>}
        {data.outcomeAt && <Row label="Outcome at">{formatDateTime(data.outcomeAt)}</Row>}
        {data.imagesTotal > 0 && (
          <Row label="Card images">
            <span
              className={
                data.imagesSent < data.imagesTotal
                  ? "font-medium text-destructive"
                  : "text-muted-foreground"
              }
            >
              {data.imagesSent}/{data.imagesTotal} sent
            </span>
          </Row>
        )}
      </div>

      {data.redemptionOrderId && data.imagesSent < data.imagesTotal && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <ImageOff className="h-4 w-4 shrink-0" />
            <span>
              The vendor received the message but {data.imagesTotal - data.imagesSent} of{" "}
              {data.imagesTotal} card image(s) didn't send.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate(data.redemptionOrderId!)}
          >
            {resendMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCw className="h-3 w-3" />
            )}
            Re-send images
          </Button>
        </div>
      )}

      {(data.outcomeReasonText || data.outcomeReasonCode) && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">AI read:</span>{" "}
          {data.outcomeReasonText ?? data.outcomeReasonCode}
        </p>
      )}

      {data.vendorComment && (
        <blockquote className="mt-3 border-l-2 border-border pl-3 text-xs italic text-muted-foreground">
          “{data.vendorComment}”
        </blockquote>
      )}

      {data.cards.length > 0 && (
        <CardChecklist
          cards={data.cards}
          orderId={data.redemptionOrderId}
          onRecord={(index, outcome) =>
            data.redemptionOrderId &&
            outcomeMutation.mutate({ orderId: data.redemptionOrderId, index, outcome })
          }
          pendingIndex={
            outcomeMutation.isPending ? (outcomeMutation.variables?.index ?? null) : null
          }
        />
      )}
    </Panel>
  );
}

// Per-card redemption checklist for a multi-card order. Each Pending card can be
// marked Redeemed/Failed inline; the buttons are hidden once we don't have an order id.
function CardChecklist({
  cards,
  orderId,
  onRecord,
  pendingIndex,
}: {
  cards: TradeCardDto[];
  orderId: string | null;
  onRecord: (index: number, outcome: "Redeemed" | "Failed") => void;
  pendingIndex: number | null;
}) {
  const ordered = [...cards].sort((a, b) => a.index - b.index);
  const total = ordered.length;
  const redeemed = ordered.filter((c) => c.outcome === "Redeemed").length;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Cards — {redeemed}/{total} redeemed
        </h4>
      </div>
      <div className="space-y-2">
        {ordered.map((card) => (
          <CardRow
            key={card.index}
            card={card}
            orderId={orderId}
            busy={pendingIndex === card.index}
            onRecord={onRecord}
          />
        ))}
      </div>
    </div>
  );
}

function CardRow({
  card,
  orderId,
  busy,
  onRecord,
}: {
  card: TradeCardDto;
  orderId: string | null;
  busy: boolean;
  onRecord: (index: number, outcome: "Redeemed" | "Failed") => void;
}) {
  const resolved = card.outcome !== "Pending";
  const [overriding, setOverriding] = useState(false);
  const showButtons = orderId && (!resolved || overriding);

  const record = (outcome: "Redeemed" | "Failed") => {
    setOverriding(false);
    onRecord(card.index, outcome);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt={`Card ${card.index}`}
          className="h-9 w-9 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          Card {card.index} · {card.brandCode} {card.amount} {card.currency}
        </p>
        {resolved && card.outcomeSource && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {card.outcomeSource === "Agent" ? (
              <Bot className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {card.outcomeSource === "Agent" ? "Assistant" : "Operator"}
            {card.outcomeSource === "Agent" && card.outcomeConfidence != null && (
              <span>· {(card.outcomeConfidence * 100).toFixed(0)}%</span>
            )}
          </p>
        )}
        {card.reasonText && (
          <p className="truncate text-xs text-muted-foreground">{card.reasonText}</p>
        )}
      </div>
      <SourcingBadge label={card.outcome} className={CARD_OUTCOME_STYLES[card.outcome]} />
      {showButtons ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-success/40 text-success hover:bg-success/10 hover:text-success"
            disabled={busy}
            onClick={() => record("Redeemed")}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}{" "}
            Redeemed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => record("Failed")}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Failed
          </Button>
          {resolved && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => setOverriding(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      ) : (
        resolved &&
        orderId && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-muted-foreground"
            onClick={() => setOverriding(true)}
            title="Override this card's outcome"
          >
            <Pencil className="h-3 w-3" /> Override
          </Button>
        )
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
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

function RejectDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitting,
}: {
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setReason("");
          setNotes("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rejection reason *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="font-medium">{r.label}</span> —{" "}
                    <span className="text-muted-foreground">{r.help}</span>
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
              <span>
                This reason will permanently ban the user and may trigger a payout reversal.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!reason) {
                toast.error("Pick a rejection reason.");
                return;
              }
              onSubmit(`${reason}${notes ? `: ${notes}` : ""}`);
            }}
            disabled={submitting}
          >
            {submitting ? "Rejecting…" : "Confirm Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({
  item,
  payoutCurrency,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  item: TradeItem | null;
  payoutCurrency: string;
  onOpenChange: (o: boolean) => void;
  onSubmit: (changes: { denominationId?: string; quantity?: number }) => void;
  submitting: boolean;
}) {
  const [denominationId, setDenominationId] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (item) {
      setDenominationId(item.denominationId);
      setQuantity(String(item.quantity));
    }
  }, [item]);

  const { data: denomPage, isLoading: denomsLoading } = useQuery({
    ...denominationQueries.list({
      BrandId: item?.brandId,
      CountryId: item?.countryId,
      PageSize: 100,
    }),
    enabled: !!item,
  });

  const options = (() => {
    if (!item) return [];
    const list = (denomPage?.items ?? []).filter(
      (d) => d.isActive && d.cardType === item.cardFormat,
    );
    if (!list.some((d) => d.id === item.denominationId)) {
      list.unshift({
        id: item.denominationId,
        brandId: item.brandId,
        countryId: item.countryId,
        amount: item.denominationAmount,
        currencyCode: item.denominationCurrency,
        cardType: item.cardFormat as "Physical" | "ECode",
        isActive: true,
      });
    }
    return [...list].sort((a, b) => a.amount - b.amount);
  })();

  const qtyNum = Number(quantity);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && qtyNum <= 20;
  const denomChanged = !!item && denominationId !== item.denominationId;
  const qtyChanged = !!item && qtyNum !== item.quantity;
  const dirty = denomChanged || qtyChanged;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Change the denomination and/or quantity. The trade total is recalculated. Changing the
            denomination re-prices at the current rate, so the payout may differ slightly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Denomination</Label>
            <Select
              value={denominationId}
              onValueChange={setDenominationId}
              disabled={denomsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={denomsLoading ? "Loading…" : "Select denomination…"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.currencyCode} {d.amount} · {d.cardType}
                    {d.id === item?.denominationId ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-qty" className="text-sm">
              Quantity
            </Label>
            <Input
              id="edit-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Between 1 and 20 cards.</p>
          </div>

          {item && (
            <p className="text-xs text-muted-foreground">
              Current line total:{" "}
              <span className="font-mono">
                {item.customerPayoutAmount.toLocaleString()} {payoutCurrency}
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!qtyValid) {
                toast.error("Quantity must be between 1 and 20.");
                return;
              }
              if (!dirty) {
                toast.error("Change the denomination or quantity first.");
                return;
              }
              onSubmit({
                ...(denomChanged ? { denominationId } : {}),
                ...(qtyChanged ? { quantity: qtyNum } : {}),
              });
            }}
            disabled={submitting || !dirty || !qtyValid}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
