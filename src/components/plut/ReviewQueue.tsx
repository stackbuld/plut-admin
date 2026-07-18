import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  reviewQueueQueries,
  attachOutcome,
  attachRateQuote,
  dismissInboundMessage,
  saveProviderReplySample,
  queryKeys,
  type CorrelationReviewItemDto,
  type RedemptionOrderDto,
  type RateAskDto,
  type RedemptionOutcome,
} from "@/api";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { TabLoader, TablePager } from "@/components/plut/catalog-shared";
import { relativeTime, formatDateTime, truncId } from "@/lib/format";
import { Bookmark, Loader2, BellOff } from "lucide-react";

const OUTCOMES: RedemptionOutcome[] = ["Redeemed", "Failed", "Unknown"];
const RATE_UNITS = ["CnyPerUsdFace", "PercentOfFace", "TotalCnyForCard", "UsdPerUsdFace"] as const;

type Plane = "Rate" | "Redemption";
type TabKey = "all" | "attach" | "clarify";

type AttachCtx = { inboundMessageId: string; order: RedemptionOrderDto; discard?: boolean };
type RateCtx = { inboundMessageId: string; ask: RateAskDto; prefill: string };
// After a manual correction, suggest teaching the provider this example.
type SampleCtx = { inboundMessageId: string; plane: Plane; text: string; suggested: boolean };

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attach", label: "Needs attach" },
  { key: "clarify", label: "Awaiting clarification" },
];

export function ReviewQueue() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tab, setTab] = useState<TabKey>("all");

  const { data, isLoading } = useQuery(reviewQueueQueries.list({ page, pageSize }));

  const [attaching, setAttaching] = useState<AttachCtx | null>(null);
  const [attachingRate, setAttachingRate] = useState<RateCtx | null>(null);
  const [savingSample, setSavingSample] = useState<SampleCtx | null>(null);

  const allItems = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const items = useMemo(
    () =>
      allItems.filter((i) =>
        tab === "all"
          ? true
          : tab === "attach"
            ? i.message.correlationStatus === "PendingHuman"
            : i.message.correlationStatus === "AwaitingClarification",
      ),
    [allItems, tab],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.sourcing.reviewQueueList() });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Correlation review queue</h2>
        <p className="text-xs text-muted-foreground">
          Provider messages the assistant could not auto-attach. Attach each to the right rate ask or order,
          teach it as a sample, or ignore it.
        </p>
      </div>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "ghost"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <TabLoader />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          Nothing awaiting review. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ReviewCard
              key={item.message.id}
              item={item}
              onAttachOrder={(order) => setAttaching({ inboundMessageId: item.message.id, order })}
              onDiscardOrder={(order) => setAttaching({ inboundMessageId: item.message.id, order, discard: true })}
              onAttachRate={(ask) =>
                setAttachingRate({
                  inboundMessageId: item.message.id,
                  ask,
                  prefill: numericPrefill(item.message.rawText),
                })
              }
              onSaveSample={(plane, text) =>
                setSavingSample({ inboundMessageId: item.message.id, plane, text, suggested: false })
              }
            />
          ))}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <TablePager
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              noun="messages"
            />
          </div>
        </div>
      )}

      <AttachOutcomeDialog
        ctx={attaching}
        onClose={() => setAttaching(null)}
        onDone={refresh}
        onSuggestSample={(text) =>
          attaching && setSavingSample({ inboundMessageId: attaching.inboundMessageId, plane: "Redemption", text, suggested: true })
        }
      />
      <AttachRateDialog
        ctx={attachingRate}
        onClose={() => setAttachingRate(null)}
        onDone={refresh}
        onSuggestSample={(text) =>
          attachingRate && setSavingSample({ inboundMessageId: attachingRate.inboundMessageId, plane: "Rate", text, suggested: true })
        }
      />
      <SaveSampleDialog ctx={savingSample} onClose={() => setSavingSample(null)} onDone={refresh} />
    </div>
  );
}

function ReviewCard({
  item,
  onAttachOrder,
  onDiscardOrder,
  onAttachRate,
  onSaveSample,
}: {
  item: CorrelationReviewItemDto;
  onAttachOrder: (order: RedemptionOrderDto) => void;
  onDiscardOrder: (order: RedemptionOrderDto) => void;
  onAttachRate: (ask: RateAskDto) => void;
  onSaveSample: (plane: Plane, text: string) => void;
}) {
  const { message, candidateOrders, candidateRateAsks, agentReview } = item;
  const qc = useQueryClient();

  const samplePlane: Plane = agentReview?.targetKind === "Redemption" ? "Redemption" : "Rate";

  const dismiss = useMutation({
    mutationFn: () => dismissInboundMessage(message.id),
    onSuccess: () => {
      toast.success("Message dismissed.");
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.reviewQueueList() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/30 px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{message.channelChatId}</span>
            <StatusBadge status={message.correlationStatus} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-foreground/90">
            {message.rawText ?? <span className="text-muted-foreground">(no text — {message.mediaUrls.length} media)</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right text-xs text-muted-foreground" title={formatDateTime(message.receivedAt)}>
            {relativeTime(message.receivedAt)}
            {message.interpretationConfidence != null && (
              <div>interpret {(message.interpretationConfidence * 100).toFixed(0)}%</div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {message.providerId && message.rawText && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1"
                title="Save this reply as a sample for this provider"
                onClick={() => onSaveSample(samplePlane, message.rawText!)}
              >
                <Bookmark className="h-3 w-3" /> Save as sample
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-muted-foreground"
              disabled={dismiss.isPending}
              title="Ignore — remove from the queue without attaching"
              onClick={() => dismiss.mutate()}
            >
              {dismiss.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3" />} Ignore
            </Button>
          </div>
        </div>
      </div>

      {agentReview && (agentReview.reasoning || agentReview.clarificationQuestion || agentReview.suggestedRef) && (
        <div className="border-b border-border bg-muted/30 px-6 py-3 text-xs">
          <div className="mb-1 font-medium text-muted-foreground">
            Assistant read
            {agentReview.action && <span className="ml-1 font-normal">· {agentReview.action}</span>}
            {agentReview.targetKind && agentReview.targetKind !== "None" && (
              <span className="ml-1 font-normal">· {agentReview.targetKind} plane</span>
            )}
          </div>
          {agentReview.reasoning && <p className="text-foreground/80">{agentReview.reasoning}</p>}
          {agentReview.suggestedRef && (
            <p className="mt-0.5 text-foreground/70">
              Leaned toward <span className="font-mono">{agentReview.suggestedRef}</span>
            </p>
          )}
          {agentReview.clarificationQuestion && (
            <p className="mt-0.5 italic text-foreground/70">Asked: "{agentReview.clarificationQuestion}"</p>
          )}
          {agentReview.ambiguousRefs.length > 0 && (
            <p className="mt-0.5 text-foreground/60">
              Torn between: <span className="font-mono">{agentReview.ambiguousRefs.join(", ")}</span>
            </p>
          )}
        </div>
      )}

      {/* Rate-ask candidates (rate plane) */}
      {candidateRateAsks.length > 0 && (
        <div className="divide-y divide-border">
          {candidateRateAsks.map((ask) => (
            <div key={ask.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
              <div className="min-w-0">
                <span className="font-mono text-xs">{ask.ref}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ask.brandCode} · {ask.countryCode} · {ask.denominationAmount} {ask.denominationCurrency} · rate ask
                </p>
              </div>
              <Button size="sm" onClick={() => onAttachRate(ask)}>
                Attach rate
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Redemption-order candidates */}
      <div className="divide-y divide-border">
        {candidateOrders.length === 0 && candidateRateAsks.length === 0 ? (
          <div className="px-6 py-6 text-sm text-muted-foreground">
            No open asks or orders for this provider — ignore it, or teach it as a sample.
          </div>
        ) : (
          candidateOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{o.tradeReference}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {o.brandCode} · {o.countryCode} · {o.denominationAmount} {o.denominationCurrency} · {o.cardFormat}
                  {" · provider "}
                  <span className="font-mono">{truncId(o.providerId, 10)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => onDiscardOrder(o)}>
                  No outcome
                </Button>
                <Button size="sm" onClick={() => onAttachOrder(o)}>
                  Attach
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AttachOutcomeDialog({
  ctx,
  onClose,
  onDone,
  onSuggestSample,
}: {
  ctx: AttachCtx | null;
  onClose: () => void;
  onDone: () => void;
  onSuggestSample: (text: string) => void;
}) {
  const [outcome, setOutcome] = useState<RedemptionOutcome>("Redeemed");
  const [reasonText, setReasonText] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!ctx) throw new Error("Nothing selected");
      const effectiveOutcome: RedemptionOutcome = ctx.discard ? "Unknown" : outcome;
      return attachOutcome({
        inboundMessageId: ctx.inboundMessageId,
        redemptionOrderId: ctx.order.id,
        outcome: effectiveOutcome,
        reasonText: ctx.discard ? reasonText.trim() || "No actionable outcome" : reasonText.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(ctx?.discard ? "Marked reviewed." : "Outcome attached.");
      onDone();
      const wasCorrection = !ctx?.discard;
      handleClose();
      if (wasCorrection) onSuggestSample(""); // auto-suggest teaching this example
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setOutcome("Redeemed");
    setReasonText("");
    onClose();
  };

  const isDiscard = !!ctx?.discard;

  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isDiscard ? "Mark reviewed" : "Attach outcome"}</DialogTitle>
          <DialogDescription>
            {isDiscard
              ? "Record this against the order with no actionable outcome (Unknown)."
              : "Attach this message to the selected order and record how the redemption went."}
            {ctx && <span className="mt-1 block font-mono text-xs">{ctx.order.tradeReference}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!isDiscard && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Outcome</label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as RedemptionOutcome)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason {isDiscard ? "" : "(optional)"}</label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={isDiscard ? "Why no outcome?" : "Notes about the outcome…"}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : isDiscard ? "Mark reviewed" : "Attach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachRateDialog({
  ctx,
  onClose,
  onDone,
  onSuggestSample,
}: {
  ctx: RateCtx | null;
  onClose: () => void;
  onDone: () => void;
  onSuggestSample: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<(typeof RATE_UNITS)[number]>("CnyPerUsdFace");

  // Prefill the value from the message when it opens.
  const openKey = ctx?.inboundMessageId ?? "";
  useEffect(() => {
    if (ctx) {
      setValue(ctx.prefill);
      setUnit("CnyPerUsdFace");
    }
  }, [openKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () => {
      if (!ctx) throw new Error("Nothing selected");
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Enter a valid rate value");
      return attachRateQuote({
        inboundMessageId: ctx.inboundMessageId,
        rateRequestId: ctx.ask.id,
        quotedValue: parsed,
        rateUnit: unit,
      });
    },
    onSuccess: () => {
      toast.success("Rate attached.");
      onDone();
      handleClose();
      onSuggestSample(""); // auto-suggest teaching this rate example
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setValue("");
    onClose();
  };

  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach rate</DialogTitle>
          <DialogDescription>
            Record this reply as the provider's CNY rate for the selected ask.
            {ctx && <span className="mt-1 block font-mono text-xs">{ctx.ask.ref} · {ctx.ask.brandCode} {ctx.ask.denominationAmount} {ctx.ask.denominationCurrency}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rate value</label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 2.5" inputMode="decimal" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Unit</label>
            <Select value={unit} onValueChange={(v) => setUnit(v as (typeof RATE_UNITS)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Attach rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveSampleDialog({
  ctx,
  onClose,
  onDone,
}: {
  ctx: SampleCtx | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [plane, setPlane] = useState<Plane>("Rate");
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");

  const openKey = ctx?.inboundMessageId ?? "";
  useEffect(() => {
    if (ctx) {
      setPlane(ctx.plane);
      setLabel("");
      setComment("");
    }
  }, [openKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () => {
      if (!ctx) throw new Error("Nothing to save");
      return saveProviderReplySample({
        inboundMessageId: ctx.inboundMessageId,
        plane,
        label: label.trim() || null,
        comment: comment.trim() || null,
        source: ctx.suggested ? "AutoConfirmed" : "Manual",
      });
    },
    onSuccess: (res) => {
      toast.success(res.saved ? `Saved as a ${res.plane.toLowerCase()} sample.` : "Already saved (or nothing to save).");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Teach this as a sample</DialogTitle>
          <DialogDescription>
            {ctx?.suggested
              ? "Save how this provider phrased it so the assistant recognises it next time."
              : "Save this reply as a few-shot example for this provider."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Plane</label>
            <Select value={plane} onValueChange={(v) => setPlane(v as Plane)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rate">Rate</SelectItem>
                <SelectItem value="Redemption">Redemption</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What it means (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "rate quote", "already used"' />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Comment for the assistant (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Extra context the assistant should heed for this provider…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Skip</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save sample"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Pull a leading number out of a message for the rate-attach prefill (e.g. "2.5" → "2.5").
function numericPrefill(text?: string | null): string {
  if (!text) return "";
  const m = text.match(/-?\d+(\.\d+)?/);
  return m ? m[0] : "";
}
