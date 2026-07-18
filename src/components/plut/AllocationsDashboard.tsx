import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pin, Ban, Send, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  merchantQueries,
  routingQueries,
  redemptionOrderQueries,
  invalidateRoutingDecision,
  pinRoutingDecision,
  dispatchRedemptionOrder,
  reassignProvider,
  queryKeys,
  type RoutingDecisionDto,
  type RedemptionOrderDto,
  type RoutingDecisionStatus,
  type RedemptionOrderStatus,
  type ProviderDto,
} from "@/api";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { FilterSelect, TabLoader, EmptyRow, TablePager, Dash } from "@/components/plut/catalog-shared";
import { relativeTime, formatDateTime, truncId } from "@/lib/format";

const ROUTING_STATUSES: RoutingDecisionStatus[] = ["Active", "Expired", "Invalidated"];
const ORDER_STATUSES: RedemptionOrderStatus[] = [
  "Created",
  "Dispatched",
  "AwaitingProvider",
  "OutcomeRecorded",
  "NeedsHumanReview",
  "TimedOut",
  "Synced",
  "Cancelled",
];

// Orders in a live state where forwarding to a (new) provider still makes sense.
const REASSIGNABLE: RedemptionOrderStatus[] = [
  "Created",
  "Dispatched",
  "AwaitingProvider",
  "NeedsHumanReview",
  "TimedOut",
];

export function AllocationsDashboard() {
  return (
    <div className="space-y-10">
      <RoutingSection />
      <RedemptionOrdersSection />
    </div>
  );
}

// ── Routing allocations ───────────────────────────────────────────────────────

function RoutingSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = {
    status: status === "All" ? undefined : (status as RoutingDecisionStatus),
    page,
    pageSize,
  };
  const { data, isLoading } = useQuery(routingQueries.list(params));

  const [invalidating, setInvalidating] = useState<RoutingDecisionDto | null>(null);
  const [pinningFor, setPinningFor] = useState<RoutingDecisionDto | null>(null);

  const invalidateMutation = useMutation({
    mutationFn: (id: string) => invalidateRoutingDecision(id, { reason: "Admin invalidation" }),
    onSuccess: () => {
      toast.success("Routing decision invalidated.");
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.routingList() });
      setInvalidating(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const headers = ["Card spec", "Best provider", "Normalized rate", "Decided", "Expires", "Status", ""];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-base font-semibold">Routing allocations</h2>
          <p className="text-xs text-muted-foreground">
            Which provider currently wins each card spec, and until when.
          </p>
        </div>
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          placeholder="Status"
          options={[{ v: "All", l: "All statuses" }, ...ROUTING_STATUSES.map((s) => ({ v: s, l: s }))]}
        />
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {headers.map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {d.brandCode || "—"} · {d.countryCode || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.denominationAmount} {d.denominationCurrency} · {d.cardFormat}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {d.bestProviderName ?? <span className="font-mono text-xs">{truncId(d.bestProviderId)}</span>}
                    </td>
                    <td className="px-6 py-3.5 font-mono">
                      {d.normalizedUsdPerCardUsd > 0 ? d.normalizedUsdPerCardUsd.toFixed(6) : <Dash />}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground" title={formatDateTime(d.decidedAt)}>
                      {relativeTime(d.decidedAt)}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground" title={formatDateTime(d.expiresAt)}>
                      {relativeTime(d.expiresAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={d.isFresh ? "Active" : d.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPinningFor(d)}>
                            <Pin className="mr-2 h-4 w-4" /> Pin provider
                          </DropdownMenuItem>
                          {d.status === "Active" && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setInvalidating(d)}>
                              <Ban className="mr-2 h-4 w-4" /> Invalidate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <EmptyRow cols={headers.length} />}
              </tbody>
            </table>
          </div>
          <TablePager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="decisions"
          />
        </div>
      )}

      <AlertDialog open={!!invalidating} onOpenChange={(o) => !o && setInvalidating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalidate routing decision?</AlertDialogTitle>
            <AlertDialogDescription>
              The next trade for{" "}
              <span className="font-medium">
                {invalidating?.brandCode} · {invalidating?.countryCode} · {invalidating?.denominationAmount}{" "}
                {invalidating?.denominationCurrency}
              </span>{" "}
              will re-run rate discovery instead of dispatching to{" "}
              {invalidating?.bestProviderName ?? "the current provider"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invalidating && invalidateMutation.mutate(invalidating.id)}
              disabled={invalidateMutation.isPending}
            >
              {invalidateMutation.isPending ? "Invalidating…" : "Invalidate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PinProviderDialog decision={pinningFor} onClose={() => setPinningFor(null)} />
    </section>
  );
}

// ── Redemption orders ─────────────────────────────────────────────────────────

function RedemptionOrdersSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = {
    status: status === "All" ? undefined : (status as RedemptionOrderStatus),
    page,
    pageSize,
  };
  const { data, isLoading } = useQuery(redemptionOrderQueries.list(params));

  const [reassignTarget, setReassignTarget] = useState<RedemptionOrderDto | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<RedemptionOrderDto | null>(null);

  const invalidateOrders = () =>
    qc.invalidateQueries({ queryKey: queryKeys.sourcing.redemptionOrdersList() });

  const reassignMutation = useMutation({
    mutationFn: ({ orderId, providerId }: { orderId: string; providerId: string }) =>
      reassignProvider({ redemptionOrderId: orderId, newProviderId: providerId }),
    onSuccess: () => {
      toast.success("Order reassigned and re-dispatched.");
      invalidateOrders();
      setReassignTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ tradeId, providerId }: { tradeId: string; providerId: string }) =>
      dispatchRedemptionOrder({ tradeId, providerId }),
    onSuccess: () => {
      toast.success("Trade dispatched to provider.");
      invalidateOrders();
      setDispatchTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const headers = ["Trade ref", "Provider", "Card spec", "Status", "Outcome", "Correlation", ""];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-base font-semibold">Redemption orders</h2>
          <p className="text-xs text-muted-foreground">In-flight and completed dispatches to providers.</p>
        </div>
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          placeholder="Status"
          options={[{ v: "All", l: "All statuses" }, ...ORDER_STATUSES.map((s) => ({ v: s, l: s }))]}
        />
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {headers.map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <Link
                        to="/admin/giftcards/trades/$tradeId"
                        params={{ tradeId: o.tradeId }}
                        className="hover:text-primary hover:underline"
                      >
                        {o.tradeReference}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">{truncId(o.providerId)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{o.brandCode} · {o.countryCode}</span>
                        <span className="text-xs text-muted-foreground">
                          {o.denominationAmount} {o.denominationCurrency} · {o.cardFormat}
                          {o.totalCards > 0 && (
                            <span className="ml-1.5 font-medium text-foreground">
                              · {o.redeemedCards}/{o.totalCards} cards
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-3.5">
                      {o.outcome ? (
                        <div className="flex flex-col">
                          <StatusBadge status={o.outcome === "Redeemed" ? "Paid" : o.outcome === "Failed" ? "Rejected" : "Cancelled"} />
                          {(o.outcomeReasonText || o.outcomeReasonCode) && (
                            <span className="mt-1 text-xs text-muted-foreground">
                              {o.outcomeReasonText ?? o.outcomeReasonCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Dash />
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {o.correlationConfidence != null ? (
                        <>
                          {(o.correlationConfidence * 100).toFixed(0)}%
                          {o.correlationMethod ? ` · ${o.correlationMethod}` : ""}
                        </>
                      ) : (
                        <Dash />
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {REASSIGNABLE.includes(o.status) && (
                            <DropdownMenuItem onClick={() => setReassignTarget(o)}>
                              <Repeat className="mr-2 h-4 w-4" /> Reassign provider
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDispatchTarget(o)}>
                            <Send className="mr-2 h-4 w-4" /> Manual dispatch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <EmptyRow cols={headers.length} />}
              </tbody>
            </table>
          </div>
          <TablePager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="orders"
          />
        </div>
      )}

      <ProviderPickerDialog
        open={!!reassignTarget}
        title="Reassign provider"
        description={`Forward ${reassignTarget?.tradeReference ?? "this order"} to a different provider and re-dispatch the card image.`}
        confirmLabel="Reassign"
        pending={reassignMutation.isPending}
        onClose={() => setReassignTarget(null)}
        onConfirm={(providerId) => reassignTarget && reassignMutation.mutate({ orderId: reassignTarget.id, providerId })}
      />

      <ProviderPickerDialog
        open={!!dispatchTarget}
        title="Manual dispatch"
        description={`Force-dispatch ${dispatchTarget?.tradeReference ?? "this trade"} to a chosen provider, bypassing rate discovery.`}
        confirmLabel="Dispatch"
        pending={dispatchMutation.isPending}
        onClose={() => setDispatchTarget(null)}
        onConfirm={(providerId) => dispatchTarget && dispatchMutation.mutate({ tradeId: dispatchTarget.tradeId, providerId })}
      />
    </section>
  );
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

function PinProviderDialog({
  decision,
  onClose,
}: {
  decision: RoutingDecisionDto | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: merchants } = useQuery(merchantQueries.list());
  const [providerId, setProviderId] = useState("");
  const [allowIneligible, setAllowIneligible] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!decision) throw new Error("No card spec selected");
      if (!providerId) throw new Error("Choose a provider to pin");
      return pinRoutingDecision({
        cardSpecKey: decision.cardSpecKey,
        brandCode: decision.brandCode,
        countryCode: decision.countryCode,
        denominationAmount: decision.denominationAmount,
        denominationCurrency: decision.denominationCurrency,
        cardFormat: decision.cardFormat,
        providerId,
        allowIneligible,
      });
    },
    onSuccess: () => {
      toast.success("Provider pinned for this card spec.");
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.routingList() });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setProviderId("");
    setAllowIneligible(false);
    onClose();
  };

  const options = (merchants ?? []) as ProviderDto[];

  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pin provider</DialogTitle>
          <DialogDescription>
            Manually route{" "}
            <span className="font-medium">
              {decision?.brandCode} · {decision?.countryCode} · {decision?.denominationAmount}{" "}
              {decision?.denominationCurrency} · {decision?.cardFormat}
            </span>{" "}
            to a chosen provider. This overrides rate discovery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Provider</label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a provider…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} {m.status !== "Active" ? `(${m.status})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allowIneligible}
              onChange={(e) => setAllowIneligible(e.target.checked)}
            />
            Allow ineligible provider (bypass capability / status checks)
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !providerId}>
            {mutation.isPending ? "Pinning…" : "Pin provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProviderPickerDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (providerId: string) => void;
}) {
  const { data: merchants } = useQuery(merchantQueries.list());
  const [providerId, setProviderId] = useState("");
  const options = (merchants ?? []) as ProviderDto[];

  const handleClose = () => {
    setProviderId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider</label>
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a provider…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {m.status !== "Active" ? `(${m.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => onConfirm(providerId)} disabled={pending || !providerId}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
