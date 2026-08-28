import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, TabLoader } from "@/components/plut/catalog-shared";
import {
  cryptoFeeRuleQueries, cryptoFeeRuleKeys,
  createCryptoFeeRule, updateCryptoFeeRule, deactivateCryptoFeeRule,
} from "@/api";
import type {
  CryptoFeeRuleDto, CryptoFeeOperationType, CryptoFeeType,
  CreateCryptoFeeRuleBody, UpdateCryptoFeeRuleBody,
} from "@/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Route/API background: docs/wallet-service-docs/crypto-wallet/admin-console/06-FEE_AND_SPREAD_RULES.md
// Backend is fully built (Web/Endpoints/AdminFeeRules.cs) — this route is pure frontend against it.

export const Route = createFileRoute("/_app/admin/crypto/pricing/fees")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(cryptoFeeRuleQueries.list());
  },
  component: FeesAndSpreadPage,
});

const FEE_OPERATION_TYPES: CryptoFeeOperationType[] = ["Withdrawal", "Buy", "Sell", "Swap"];
const SPREAD_OPERATION_TYPES: CryptoFeeOperationType[] = ["BuySpread", "SellSpread", "SwapSpread"];

const OPERATION_LABELS: Record<CryptoFeeOperationType, string> = {
  Withdrawal: "Withdrawal",
  Buy: "Buy",
  Sell: "Sell",
  Swap: "Swap",
  BuySpread: "Buy",
  SellSpread: "Sell",
  SwapSpread: "Swap",
};

// crypto-service's CryptoBuySettings/CryptoSellSettings/CryptoSwapSettings.SpreadPercent all default
// to 0.5 (confirmed by source read of src/Web/appsettings.json + the three *Settings classes,
// 2026-08-28) — this is the constant GetSpreadPercentAsync falls back to when no admin rule is
// configured for a Buy/Sell/SwapSpread operation. Shown here so "what will Buy actually charge right
// now" is never a guess (06-FEE_AND_SPREAD_RULES.md §1). If that config value ever changes, this
// display constant needs updating alongside it — there's no API that reports it live.
const SPREAD_FALLBACK_PERCENT = 0.5;

function isSpreadOperationType(op: CryptoFeeOperationType): boolean {
  return op.endsWith("Spread");
}

type FeeRuleGroup = {
  operationType: CryptoFeeOperationType;
  defaultRule: CryptoFeeRuleDto | null;
  overrides: CryptoFeeRuleDto[];
};

function buildGroups(rules: CryptoFeeRuleDto[], types: CryptoFeeOperationType[]): FeeRuleGroup[] {
  return types.map((operationType) => {
    const active = rules.filter((r) => r.operationType === operationType && r.isActive);
    return {
      operationType,
      defaultRule: active.find((r) => r.asset === null) ?? null,
      overrides: active.filter((r) => r.asset !== null),
    };
  });
}

// Deactivating a rule always reverts pricing to the next rule in the resolution order (asset
// override > default > 0%/fallback) — spell out exactly what that means for THIS rule so an admin
// isn't guessing at the blast radius before confirming (06-FEE_AND_SPREAD_RULES.md §4).
function deactivateImpactText(rule: CryptoFeeRuleDto, allRules: CryptoFeeRuleDto[]): string {
  const opLabel = OPERATION_LABELS[rule.operationType];
  const isSpread = isSpreadOperationType(rule.operationType);
  const revertsTo = isSpread ? `the fallback spread (${SPREAD_FALLBACK_PERCENT}%)` : "0% platform fee";

  if (rule.asset === null) {
    return `${opLabel} will immediately revert to ${revertsTo} for every asset that has no specific override rule of its own.`;
  }
  const hasDefault = allRules.some(
    (r) => r.operationType === rule.operationType && r.asset === null && r.isActive && r.id !== rule.id,
  );
  return hasDefault
    ? `${opLabel} for ${rule.asset} will immediately fall back to the operation's default rule.`
    : `${opLabel} for ${rule.asset} will immediately revert to ${revertsTo} — no default rule is currently configured for ${opLabel}.`;
}

function FeesAndSpreadPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"fees" | "spread">("fees");

  const { data, isLoading } = useQuery(cryptoFeeRuleQueries.list());
  const rules = useMemo(() => data ?? [], [data]);

  const feeGroups = useMemo(() => buildGroups(rules, FEE_OPERATION_TYPES), [rules]);
  const spreadGroups = useMemo(() => buildGroups(rules, SPREAD_OPERATION_TYPES), [rules]);

  // The list endpoint never returns deactivated rows (06-FEE_AND_SPREAD_RULES.md §3 — no
  // `includeInactive` param confirmed live yet), so "Show history" can only surface what THIS admin
  // session deactivated, not the full lifetime audit trail. Captured client-side at the moment of
  // deactivation, before the row disappears from the live list.
  const [historyByType, setHistoryByType] = useState<Partial<Record<CryptoFeeOperationType, CryptoFeeRuleDto[]>>>({});
  const [historyOpen, setHistoryOpen] = useState<Partial<Record<CryptoFeeOperationType, boolean>>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRule, setEditingRule] = useState<CryptoFeeRuleDto | null>(null);
  const [form, setForm] = useState({
    operationType: "Withdrawal" as CryptoFeeOperationType,
    assetMode: "default" as "default" | "specific",
    asset: "",
    feeType: "Percentage" as CryptoFeeType,
    feeValue: "",
    minFeeUsd: "",
    maxFeeUsd: "",
  });
  const [deactivateTarget, setDeactivateTarget] = useState<CryptoFeeRuleDto | null>(null);

  function openCreateDialog(operationType: CryptoFeeOperationType, forceSpecific = false) {
    setDialogMode("create");
    setEditingRule(null);
    setForm({
      operationType,
      assetMode: forceSpecific ? "specific" : "default",
      asset: "",
      feeType: "Percentage",
      feeValue: "",
      minFeeUsd: "",
      maxFeeUsd: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(rule: CryptoFeeRuleDto) {
    setDialogMode("edit");
    setEditingRule(rule);
    setForm({
      operationType: rule.operationType,
      assetMode: rule.asset === null ? "default" : "specific",
      asset: rule.asset ?? "",
      feeType: rule.feeType,
      feeValue: String(rule.feeValue),
      minFeeUsd: rule.minFeeUsd != null ? String(rule.minFeeUsd) : "",
      maxFeeUsd: rule.maxFeeUsd != null ? String(rule.maxFeeUsd) : "",
    });
    setDialogOpen(true);
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateCryptoFeeRuleBody) => createCryptoFeeRule(body),
    onSuccess: () => {
      toast.success("Fee rule created.");
      qc.invalidateQueries({ queryKey: cryptoFeeRuleKeys.all() });
      setDialogOpen(false);
    },
    onError: (e: Error) => {
      // The backend 409s when an active rule already exists for this (operationType, asset) pair —
      // surface the friendly framing the spec calls for rather than whatever raw message comes back,
      // since we can't reliably read the HTTP status code back out of the thrown Error (see
      // src/api/client.ts's request() — only `message` survives).
      const assetLabel = form.assetMode === "default" ? "default" : form.asset || "(asset)";
      if (/conflict|already exists|http 409/i.test(e.message)) {
        toast.error(
          `An active rule already exists for ${form.operationType}/${assetLabel}. Deactivate it first, or edit it instead.`,
        );
      } else {
        toast.error(e.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ ruleId, body }: { ruleId: string; body: UpdateCryptoFeeRuleBody }) =>
      updateCryptoFeeRule(ruleId, body),
    onSuccess: () => {
      toast.success("Fee rule updated.");
      qc.invalidateQueries({ queryKey: cryptoFeeRuleKeys.all() });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (rule: CryptoFeeRuleDto) => deactivateCryptoFeeRule(rule.id),
    onSuccess: (_res, rule) => {
      toast.success("Rule deactivated.");
      setHistoryByType((prev) => ({
        ...prev,
        [rule.operationType]: [{ ...rule, isActive: false }, ...(prev[rule.operationType] ?? [])],
      }));
      qc.invalidateQueries({ queryKey: cryptoFeeRuleKeys.all() });
      setDeactivateTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSpreadOp = isSpreadOperationType(form.operationType);
  const feeValueNum = parseFloat(form.feeValue);
  const minNum = form.minFeeUsd.trim() === "" ? undefined : parseFloat(form.minFeeUsd);
  const maxNum = form.maxFeeUsd.trim() === "" ? undefined : parseFloat(form.maxFeeUsd);
  const assetValid = form.assetMode === "default" || form.asset.trim().length > 0;
  const boundsValid =
    (minNum === undefined || Number.isFinite(minNum)) &&
    (maxNum === undefined || Number.isFinite(maxNum)) &&
    (minNum === undefined || maxNum === undefined || maxNum >= minNum);
  const canSubmit = assetValid && Number.isFinite(feeValueNum) && feeValueNum >= 0 && boundsValid;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (dialogMode === "create") {
      createMutation.mutate({
        operationType: form.operationType,
        asset: form.assetMode === "default" ? null : form.asset.trim().toUpperCase(),
        feeType: isSpreadOp ? "Percentage" : form.feeType,
        feeValue: feeValueNum,
        minFeeUsd: isSpreadOp ? undefined : minNum,
        maxFeeUsd: isSpreadOp ? undefined : maxNum,
      });
    } else if (editingRule) {
      updateMutation.mutate({
        ruleId: editingRule.id,
        body: {
          feeValue: feeValueNum,
          minFeeUsd: isSpreadOperationType(editingRule.operationType) ? undefined : minNum,
          maxFeeUsd: isSpreadOperationType(editingRule.operationType) ? undefined : maxNum,
        },
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Fees & Spread</h1>
          <p className="text-xs text-muted-foreground">
            What Plut charges (platform fees) and earns (spread markup) on Withdrawal/Buy/Sell/Swap.
            Changes take effect on the next quote — no admin action needed.
          </p>
        </div>
        <Button onClick={() => openCreateDialog(tab === "fees" ? "Withdrawal" : "BuySpread")}>
          <Plus className="h-4 w-4" /> New Rule
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "fees" | "spread")}>
        <TabsList>
          <TabsTrigger value="fees">Platform Fees</TabsTrigger>
          <TabsTrigger value="spread">Spread</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            An explicit charge on Withdrawal, Buy, Sell, and Swap — additive on top of any spread.
            No rule configured means 0% charged, matching the live pricing behavior exactly.
          </p>
          {isLoading ? <TabLoader /> : (
            <FeeRuleTable
              groups={feeGroups}
              allRules={rules}
              isSpread={false}
              historyByType={historyByType}
              historyOpen={historyOpen}
              onToggleHistory={(op) => setHistoryOpen((p) => ({ ...p, [op]: !p[op] }))}
              onCreateDefault={(op) => openCreateDialog(op)}
              onCreateOverride={(op) => openCreateDialog(op, true)}
              onEdit={openEditDialog}
              onDeactivate={setDeactivateTarget}
            />
          )}
        </TabsContent>

        <TabsContent value="spread" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            The markup baked into the quoted rate for Buy, Sell, and Swap — Percentage only (the
            backend rejects Flat here). No override configured means the operation currently uses
            Plut's config-level fallback spread of {SPREAD_FALLBACK_PERCENT}%, not zero.
          </p>
          {isLoading ? <TabLoader /> : (
            <FeeRuleTable
              groups={spreadGroups}
              allRules={rules}
              isSpread
              historyByType={historyByType}
              historyOpen={historyOpen}
              onToggleHistory={(op) => setHistoryOpen((p) => ({ ...p, [op]: !p[op] }))}
              onCreateDefault={(op) => openCreateDialog(op)}
              onCreateOverride={(op) => openCreateDialog(op, true)}
              onEdit={openEditDialog}
              onDeactivate={setDeactivateTarget}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(o) => !isMutating && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "New Fee Rule" : "Edit Fee Rule"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Additive and reversible — deactivate it later if it doesn't work out."
                : "Operation, asset, and fee type are locked after creation. Deactivate and create a new rule to change those."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Operation Type">
              <Select
                value={form.operationType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    operationType: v as CryptoFeeOperationType,
                    feeType: v.endsWith("Spread") ? "Percentage" : f.feeType,
                  }))
                }
                disabled={dialogMode === "edit"}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(tab === "fees" ? FEE_OPERATION_TYPES : SPREAD_OPERATION_TYPES).map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATION_LABELS[op]}
                      {isSpreadOperationType(op) ? " Spread" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Asset">
              <RadioGroup
                value={form.assetMode}
                onValueChange={(v) => setForm((f) => ({ ...f, assetMode: v as "default" | "specific" }))}
                className="flex items-center gap-4"
                disabled={dialogMode === "edit"}
              >
                <label className="flex items-center gap-1.5 text-sm">
                  <RadioGroupItem value="default" /> Default (all assets)
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <RadioGroupItem value="specific" /> Specific
                </label>
              </RadioGroup>
              {form.assetMode === "specific" && (
                <Input
                  value={form.asset}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, asset: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))
                  }
                  placeholder="e.g. BTC"
                  className="mt-2 font-mono uppercase"
                  disabled={dialogMode === "edit"}
                />
              )}
            </Field>

            {!isSpreadOp && (
              <Field label="Fee Type">
                <RadioGroup
                  value={form.feeType}
                  onValueChange={(v) => setForm((f) => ({ ...f, feeType: v as CryptoFeeType }))}
                  className="flex items-center gap-4"
                  disabled={dialogMode === "edit"}
                >
                  <label className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="Percentage" /> Percentage
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="Flat" /> Flat
                  </label>
                </RadioGroup>
              </Field>
            )}

            <Field label={form.feeType === "Percentage" ? "Value (%)" : "Value (USD)"}>
              <Input
                type="number"
                step="0.01"
                value={form.feeValue}
                onChange={(e) => setForm((f) => ({ ...f, feeValue: e.target.value }))}
                placeholder={form.feeType === "Percentage" ? "1.0" : "2.50"}
                className="font-mono"
              />
            </Field>

            {!isSpreadOp && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Min Fee (USD, optional)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.minFeeUsd}
                      onChange={(e) => setForm((f) => ({ ...f, minFeeUsd: e.target.value }))}
                      placeholder="1.00"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Max Fee (USD, optional)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.maxFeeUsd}
                      onChange={(e) => setForm((f) => ({ ...f, maxFeeUsd: e.target.value }))}
                      placeholder="25.00"
                      className="font-mono"
                    />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">Leave Max blank for no cap.</p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isMutating}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isMutating}>
              {isMutating ? "Saving…" : dialogMode === "create" ? "Create Rule" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => { if (!o) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget && deactivateImpactText(deactivateTarget, rules)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget)}
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeeRuleTable({
  groups,
  allRules,
  isSpread,
  historyByType,
  historyOpen,
  onToggleHistory,
  onCreateDefault,
  onCreateOverride,
  onEdit,
  onDeactivate,
}: {
  groups: FeeRuleGroup[];
  allRules: CryptoFeeRuleDto[];
  isSpread: boolean;
  historyByType: Partial<Record<CryptoFeeOperationType, CryptoFeeRuleDto[]>>;
  historyOpen: Partial<Record<CryptoFeeOperationType, boolean>>;
  onToggleHistory: (op: CryptoFeeOperationType) => void;
  onCreateDefault: (op: CryptoFeeOperationType) => void;
  onCreateOverride: (op: CryptoFeeOperationType) => void;
  onEdit: (rule: CryptoFeeRuleDto) => void;
  onDeactivate: (rule: CryptoFeeRuleDto) => void;
}) {
  const cols = isSpread ? 6 : 7;
  const headers = isSpread
    ? ["Operation", "Asset", "Type", "Value", "Status", ""]
    : ["Operation", "Asset", "Type", "Value", "Bounds (USD)", "Status", ""];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
            {groups.map((g) => {
              const history = historyByType[g.operationType] ?? [];
              const isHistoryOpen = !!historyOpen[g.operationType];
              return (
                <Fragment key={g.operationType}>
                  <FeeRuleRow
                    operationType={g.operationType}
                    rule={g.defaultRule}
                    isSpread={isSpread}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onCreateDefault={onCreateDefault}
                  />
                  {g.overrides.map((rule) => (
                    <FeeRuleRow
                      key={rule.id}
                      operationType={g.operationType}
                      rule={rule}
                      isSpread={isSpread}
                      nested
                      onEdit={onEdit}
                      onDeactivate={onDeactivate}
                    />
                  ))}
                  <tr className="border-b border-border bg-secondary/10 last:border-0">
                    <td colSpan={cols} className="px-6 py-1.5">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                          onClick={() => onCreateOverride(g.operationType)}
                        >
                          <Plus className="h-3 w-3" /> Add override
                        </Button>
                        {history.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                            onClick={() => onToggleHistory(g.operationType)}
                          >
                            <History className="h-3 w-3" />
                            {isHistoryOpen ? "Hide history" : `Show history (${history.length})`}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isHistoryOpen &&
                    history.map((rule) => (
                      <FeeRuleRow key={rule.id} operationType={g.operationType} rule={rule} isSpread={isSpread} nested isHistory />
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeeRuleRow({
  operationType,
  rule,
  isSpread,
  nested = false,
  isHistory = false,
  onEdit,
  onDeactivate,
  onCreateDefault,
}: {
  operationType: CryptoFeeOperationType;
  rule: CryptoFeeRuleDto | null;
  isSpread: boolean;
  nested?: boolean;
  isHistory?: boolean;
  onEdit?: (rule: CryptoFeeRuleDto) => void;
  onDeactivate?: (rule: CryptoFeeRuleDto) => void;
  onCreateDefault?: (op: CryptoFeeOperationType) => void;
}) {
  const assetLabel = rule?.asset ?? "(default)";
  const typeLabel: CryptoFeeType = isSpread ? "Percentage" : rule?.feeType ?? "Percentage";

  const valueLabel = rule
    ? rule.feeType === "Percentage"
      ? `${rule.feeValue}%`
      : `$${rule.feeValue.toFixed(2)}`
    : isSpread
      ? `${SPREAD_FALLBACK_PERCENT}% (fallback)`
      : "0%";

  const boundsLabel =
    !rule || (rule.minFeeUsd == null && rule.maxFeeUsd == null)
      ? "—"
      : `$${(rule.minFeeUsd ?? 0).toFixed(2)} – ${rule.maxFeeUsd != null ? `$${rule.maxFeeUsd.toFixed(2)}` : "no cap"}`;

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0",
        isHistory ? "opacity-50 line-through decoration-muted-foreground/40" : "hover:bg-secondary/40",
      )}
    >
      <td className={cn("px-6 py-3.5", nested && "text-muted-foreground")}>{OPERATION_LABELS[operationType]}</td>
      <td className={cn("px-6 py-3.5", nested && "pl-10")}>
        {nested && <span className="mr-1.5 text-muted-foreground">↳</span>}
        {assetLabel}
      </td>
      <td className="px-6 py-3.5">{typeLabel}</td>
      <td className="px-6 py-3.5 font-mono">
        {valueLabel}
        {!rule && <span className="ml-1.5 align-middle text-[10px] font-sans uppercase text-muted-foreground">not configured</span>}
      </td>
      {!isSpread && <td className="px-6 py-3.5 text-xs text-muted-foreground">{boundsLabel}</td>}
      <td className="px-6 py-3.5">
        {isHistory ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Inactive
          </span>
        ) : !rule ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Not set
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            ● On
          </span>
        )}
      </td>
      <td className="px-6 py-3.5 text-right">
        {isHistory ? null : !rule ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCreateDefault?.(operationType)}>
            Set Rule
          </Button>
        ) : (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit?.(rule)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onDeactivate?.(rule)}
            >
              Deactivate
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
