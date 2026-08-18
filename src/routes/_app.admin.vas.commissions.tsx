import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterSelect, Field } from "@/components/plut/catalog-shared";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  createVasCommission,
  deactivateVasCommission,
  updateVasCommission,
  vasKeys,
  vasQueries,
} from "@/api/vas";
import type { CommissionType, VasAdminService, VasCommission } from "@/api/types/vas.types";

export const Route = createFileRoute("/_app/admin/vas/commissions")({
  head: () => ({ meta: [{ title: "VAS Commissions — Plut Admin" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(vasQueries.commissionList());
    context.queryClient.ensureQueryData(vasQueries.providerList());
    context.queryClient.ensureQueryData(vasQueries.serviceList());
  },
  component: VasCommissionsScreen,
});

function VasCommissionsScreen() {
  return (
    <Tabs defaultValue="rules" className="space-y-5">
      <TabsList>
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="profit">Profit Report</TabsTrigger>
      </TabsList>
      <TabsContent value="rules">
        <CommissionRulesTab />
      </TabsContent>
      <TabsContent value="profit">
        <ProfitReportTab />
      </TabsContent>
    </Tabs>
  );
}

// ── Rules ────────────────────────────────────────────────────────────────────

function CommissionRulesTab() {
  const [providerId, setProviderId] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VasCommission | null>(null);
  const [deactivating, setDeactivating] = useState<VasCommission | null>(null);

  const { data: providers } = useQuery(vasQueries.providerList());
  const { data: services } = useQuery(vasQueries.serviceList());
  const { data: commissions, isLoading } = useQuery(
    vasQueries.commissionList({
      ...(providerId !== "all" ? { providerId } : {}),
      ...(activeFilter !== "all" ? { isActive: activeFilter === "active" } : {}),
    }),
  );

  const providerOptions = [
    { v: "all", l: "All providers" },
    ...(providers ?? []).map((p) => ({ v: p.id, l: `${p.name} (${p.code})` })),
  ];
  const providerName = (id: string) => providers?.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={providerId}
          onChange={setProviderId}
          placeholder="Provider"
          options={providerOptions}
        />
        <FilterSelect
          value={activeFilter}
          onChange={setActiveFilter}
          placeholder="Status"
          options={[
            { v: "all", l: "All statuses" },
            { v: "active", l: "Active" },
            { v: "inactive", l: "Inactive" },
          ]}
        />
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Create Rule
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !commissions?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No commission rules found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((c) => (
            <CommissionRow
              key={c.id}
              commission={c}
              providerName={providerName(c.providerId)}
              services={services ?? []}
              onEdit={() => setEditing(c)}
              onDeactivate={() => setDeactivating(c)}
            />
          ))}
        </div>
      )}

      <CreateCommissionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        providers={providers ?? []}
        services={services ?? []}
      />
      {editing && (
        <EditCommissionDialog
          commission={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {deactivating && (
        <DeactivateCommissionDialog
          commission={deactivating}
          open
          onOpenChange={(o) => !o && setDeactivating(null)}
        />
      )}
    </div>
  );
}

function ScopeBadge({
  commission,
  services,
}: {
  commission: VasCommission;
  services: VasAdminService[];
}) {
  if (!commission.serviceId) {
    return <Badge className="bg-secondary text-foreground">Provider-default</Badge>;
  }
  const service = services.find((s) => s.id === commission.serviceId);
  if (!commission.serviceProductId) {
    return (
      <Badge className="bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400">
        Service: {service?.name ?? commission.serviceId.slice(0, 8)}
      </Badge>
    );
  }
  return (
    <ProductScopeBadge
      serviceId={commission.serviceId}
      productId={commission.serviceProductId}
      serviceName={service?.name}
    />
  );
}

function ProductScopeBadge({
  serviceId,
  productId,
  serviceName,
}: {
  serviceId: string;
  productId: string;
  serviceName?: string;
}) {
  const { data: products } = useQuery(vasQueries.productList(serviceId));
  const product = products?.find((p) => p.id === productId);
  return (
    <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
      Product: {product?.name ?? `${serviceName ?? "service"} product`}
    </Badge>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " + className
      }
    >
      {children}
    </span>
  );
}

function CommissionRow({
  commission: c,
  providerName,
  services,
  onEdit,
  onDeactivate,
}: {
  commission: VasCommission;
  providerName: string;
  services: VasAdminService[];
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateVasCommission(c.id, { isActive }),
    onSuccess: () => {
      toast.success("Rule updated.");
      qc.invalidateQueries({ queryKey: vasKeys.commissions() });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ScopeBadge commission={c} services={services} />
          <span className="text-sm font-semibold">{providerName}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {c.commissionType}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            priority {c.priority}
          </span>
        </div>
        <p className="mt-1.5 text-sm">
          {c.commissionType === "FixedAmount" && c.fixedAmount != null
            ? formatVasAmount(c.fixedAmount, c.currencyCode)
            : c.ratePercent != null
              ? `${c.ratePercent}%`
              : "—"}
          {(c.minTransactionAmount != null || c.maxTransactionAmount != null) && (
            <span className="ml-2 text-xs text-muted-foreground">
              band{" "}
              {c.minTransactionAmount != null
                ? formatVasAmount(c.minTransactionAmount, c.currencyCode)
                : "—"}
              {" – "}
              {c.maxTransactionAmount != null
                ? formatVasAmount(c.maxTransactionAmount, c.currencyCode)
                : "—"}
            </span>
          )}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          effective {formatDate(c.effectiveFrom)}{" "}
          {c.effectiveTo ? `→ ${formatDate(c.effectiveTo)}` : "→ ongoing"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={c.isActive}
          disabled={toggleActive.isPending}
          onCheckedChange={(v) => toggleActive.mutate(v)}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {c.isActive && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={onDeactivate}
            title="Deactivate"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

const COMMISSION_TYPE_OPTIONS: { v: CommissionType; l: string }[] = [
  { v: "Percentage", l: "Percentage" },
  { v: "FixedAmount", l: "Fixed Amount" },
  { v: "Tiered", l: "Tiered" },
];

function CreateCommissionDialog({
  open,
  onOpenChange,
  providers,
  services,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  providers: { id: string; name: string; code: string }[];
  services: VasAdminService[];
}) {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ ...vasQueries.categoryList(), enabled: open });

  const [providerId, setProviderId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [commissionType, setCommissionType] = useState<CommissionType>("Percentage");
  const [ratePercent, setRatePercent] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [scope, setScope] = useState<"default" | "service" | "product">("default");
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [priority, setPriority] = useState("100");

  const { data: productsForService } = useQuery({
    ...vasQueries.productList(serviceId),
    enabled: open && scope === "product" && !!serviceId,
  });

  const servicesInCategory = services.filter(
    (s) => !categoryId || s.serviceCategoryId === categoryId,
  );

  const reset = () => {
    setProviderId("");
    setCurrencyCode("NGN");
    setCommissionType("Percentage");
    setRatePercent("");
    setFixedAmount("");
    setScope("default");
    setCategoryId("");
    setServiceId("");
    setProductId("");
    setMinAmount("");
    setMaxAmount("");
    setEffectiveFrom("");
    setEffectiveTo("");
    setPriority("100");
  };

  const mutation = useMutation({
    mutationFn: () =>
      createVasCommission({
        providerId,
        currencyCode,
        commissionType,
        ratePercent: ratePercent ? Number(ratePercent) : undefined,
        fixedAmount: fixedAmount ? Number(fixedAmount) : undefined,
        serviceId: scope !== "default" && serviceId ? serviceId : undefined,
        serviceProductId: scope === "product" && productId ? productId : undefined,
        minTransactionAmount: minAmount ? Number(minAmount) : undefined,
        maxTransactionAmount: maxAmount ? Number(maxAmount) : undefined,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
        priority: priority ? Number(priority) : undefined,
      }),
    onSuccess: () => {
      toast.success("Commission rule created.");
      qc.invalidateQueries({ queryKey: vasKeys.commissions() });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Create failed."),
  });

  const canSubmit =
    !!providerId &&
    !!currencyCode.trim() &&
    (scope === "default" || !!serviceId) &&
    (scope !== "product" || !!productId);

  const handleOpenChange = (o: boolean) => {
    if (mutation.isPending) return;
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Commission Rule</DialogTitle>
          <DialogDescription>
            Set how much the platform earns for a provider, optionally scoped to a service or
            product.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Provider *">
            <FilterSelect
              value={providerId}
              onChange={setProviderId}
              placeholder="Select provider"
              options={providers.map((p) => ({ v: p.id, l: `${p.name} (${p.code})` }))}
            />
          </Field>

          <Field label="Scope">
            <FilterSelect
              value={scope}
              onChange={(v) => {
                setScope(v as typeof scope);
                setServiceId("");
                setProductId("");
              }}
              placeholder="Scope"
              options={[
                { v: "default", l: "Provider-default" },
                { v: "service", l: "Service-level" },
                { v: "product", l: "Product-level" },
              ]}
            />
          </Field>

          {scope !== "default" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <FilterSelect
                  value={categoryId}
                  onChange={(v) => {
                    setCategoryId(v);
                    setServiceId("");
                    setProductId("");
                  }}
                  placeholder="Category"
                  options={(categories ?? []).map((c) => ({ v: c.id, l: c.name }))}
                />
              </Field>
              <Field label="Service *">
                <FilterSelect
                  value={serviceId}
                  onChange={(v) => {
                    setServiceId(v);
                    setProductId("");
                  }}
                  placeholder="Service"
                  options={servicesInCategory.map((s) => ({ v: s.id, l: s.name }))}
                />
              </Field>
            </div>
          )}

          {scope === "product" && serviceId && (
            <Field label="Product *">
              <FilterSelect
                value={productId}
                onChange={setProductId}
                placeholder="Product"
                options={(productsForService ?? []).map((p) => ({ v: p.id, l: p.name }))}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <FilterSelect
                value={commissionType}
                onChange={(v) => setCommissionType(v as CommissionType)}
                placeholder="Type"
                options={COMMISSION_TYPE_OPTIONS}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate %">
              <Input
                type="number"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </Field>
            <Field label="Fixed amount">
              <Input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="e.g. 50"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min tx amount">
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </Field>
            <Field label="Max tx amount">
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Effective from">
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </Field>
            <Field label="Effective to">
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Priority">
            <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCommissionDialog({
  commission: c,
  open,
  onOpenChange,
}: {
  commission: VasCommission;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [ratePercent, setRatePercent] = useState(
    c.ratePercent != null ? String(c.ratePercent) : "",
  );
  const [fixedAmount, setFixedAmount] = useState(
    c.fixedAmount != null ? String(c.fixedAmount) : "",
  );
  const [minAmount, setMinAmount] = useState(
    c.minTransactionAmount != null ? String(c.minTransactionAmount) : "",
  );
  const [maxAmount, setMaxAmount] = useState(
    c.maxTransactionAmount != null ? String(c.maxTransactionAmount) : "",
  );
  const [effectiveTo, setEffectiveTo] = useState(c.effectiveTo ? c.effectiveTo.slice(0, 10) : "");
  const [priority, setPriority] = useState(String(c.priority));

  const mutation = useMutation({
    mutationFn: () =>
      updateVasCommission(c.id, {
        ratePercent: ratePercent ? Number(ratePercent) : undefined,
        fixedAmount: fixedAmount ? Number(fixedAmount) : undefined,
        minTransactionAmount: minAmount ? Number(minAmount) : undefined,
        maxTransactionAmount: maxAmount ? Number(maxAmount) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
        priority: priority ? Number(priority) : undefined,
      }),
    onSuccess: () => {
      toast.success("Rule updated.");
      qc.invalidateQueries({ queryKey: vasKeys.commissions() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Commission Rule</DialogTitle>
          <DialogDescription>
            Provider, scope, type and currency are fixed once created — create a new rule instead if
            those need to change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate %">
              <Input
                type="number"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
              />
            </Field>
            <Field label="Fixed amount">
              <Input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min tx amount">
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </Field>
            <Field label="Max tx amount">
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Effective to">
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </Field>
            <Field label="Priority">
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateCommissionDialog({
  commission: c,
  open,
  onOpenChange,
}: {
  commission: VasCommission;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deactivateVasCommission(c.id),
    onSuccess: () => {
      toast.success("Rule deactivated.");
      qc.invalidateQueries({ queryKey: vasKeys.commissions() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Deactivate failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate Commission Rule</DialogTitle>
          <DialogDescription>
            This rule stops applying to new transactions. Past transactions already computed under
            it are unaffected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Profit report ────────────────────────────────────────────────────────────

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function ProfitReportTab() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());

  const { data, isLoading } = useQuery(
    vasQueries.profitReport(new Date(from).toISOString(), new Date(to + "T23:59:59").toISOString()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 w-[150px] text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from}
          className="h-9 w-[150px] text-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No data for this range.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total commission earned
              </p>
              <p className="mt-1 font-mono text-2xl font-bold">
                {formatVasAmount(data.totalCommissionEarned)}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Transactions
              </p>
              <p className="mt-1 font-mono text-2xl font-bold">
                {data.transactionCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card">
            <h3 className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              By category
            </h3>
            {data.byCategory.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No commission earned in this range.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.byCategory.map((c) => (
                  <div
                    key={c.serviceCategory}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span>{c.serviceCategory}</span>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatVasAmount(c.commissionEarned)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
