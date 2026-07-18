import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronsUpDown, Loader2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  merchantQueries,
  addMerchantCapabilities,
  removeMerchantCapability,
  brandQueries,
  countryQueries,
  queryKeys,
  type ProviderDto,
  type ProviderCapabilityDto,
  type MerchantCardFormat,
  type CapabilitySpec,
} from "@/api";
import { cn } from "@/lib/utils";

const CARD_FORMATS: MerchantCardFormat[] = ["Physical", "ECode"];

// Mirrors the backend's IsSameSpec — used to warn (and grey the button) before hitting the API.
function normCode(v?: string | null): string | null {
  const t = (v ?? "").trim().toUpperCase();
  return t.length ? t : null;
}
function sameSpec(c: ProviderCapabilityDto, s: CapabilitySpec): boolean {
  if (!!c.isWildcard !== s.isWildcard) return false;
  if (!s.isWildcard && normCode(c.brandCode) !== normCode(s.brandCode)) return false;
  return (
    normCode(c.countryCode) === normCode(s.countryCode) &&
    (c.cardFormat ?? null) === (s.cardFormat ?? null) &&
    (c.minDenomination ?? null) === (s.minDenomination ?? null) &&
    (c.maxDenomination ?? null) === (s.maxDenomination ?? null)
  );
}

export function MerchantCapabilitiesDialog({
  merchant,
  onClose,
}: {
  merchant: ProviderDto | null;
  onClose: () => void;
}) {
  const open = !!merchant;
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    ...merchantQueries.detail(merchant?.id ?? ""),
    enabled: open,
    initialData: merchant ?? undefined,
  });
  const { data: brands } = useQuery({ ...brandQueries.list(), enabled: open });
  const { data: countries } = useQuery({ ...countryQueries.list(), enabled: open });

  // Multi-select: several brands × several countries become one capability each.
  const [brandCodes, setBrandCodes] = useState<string[]>([]);
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [cardFormat, setCardFormat] = useState<MerchantCardFormat | "Any">("Any");
  const [minDenomination, setMinDenomination] = useState("");
  const [maxDenomination, setMaxDenomination] = useState("");
  const [isWildcard, setIsWildcard] = useState(false);

  const resetForm = () => {
    setBrandCodes([]);
    setCountryCodes([]);
    setCardFormat("Any");
    setMinDenomination("");
    setMaxDenomination("");
    setIsWildcard(false);
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open, merchant?.id]);

  const brandOptions = (brands ?? []).map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }));
  const countryOptions = (countries ?? []).map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }));

  // Build the exact specs the current selection would create (also used to preview duplicates).
  const format: MerchantCardFormat | null = cardFormat === "Any" ? null : cardFormat;
  const parsedMin = minDenomination.trim() ? Number(minDenomination) : null;
  const parsedMax = maxDenomination.trim() ? Number(maxDenomination) : null;
  const safeMin = parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null;
  const safeMax = parsedMax != null && Number.isFinite(parsedMax) ? parsedMax : null;

  const buildSpecs = (): CapabilitySpec[] => {
    const scopes: (string | null)[] = countryCodes.length ? countryCodes : [null];
    const specs: CapabilitySpec[] = [];
    if (isWildcard) {
      for (const cc of scopes)
        specs.push({ brandCode: "", countryCode: cc, cardFormat: format, minDenomination: safeMin, maxDenomination: safeMax, isWildcard: true });
    } else {
      for (const brandCode of brandCodes)
        for (const cc of scopes)
          specs.push({ brandCode, countryCode: cc, cardFormat: format, minDenomination: safeMin, maxDenomination: safeMax, isWildcard: false });
    }
    return specs;
  };

  const existingCaps = detail?.capabilities ?? [];
  const plannedSpecs = buildSpecs();
  const plannedCount = plannedSpecs.length;
  const duplicateCount = plannedSpecs.filter((s) => existingCaps.some((c) => sameSpec(c, s))).length;
  const newCount = plannedCount - duplicateCount;

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!merchant) throw new Error("No merchant selected");
      if (!isWildcard && brandCodes.length === 0) {
        throw new Error("Select at least one brand (or turn on wildcard).");
      }
      if (parsedMin != null && !Number.isFinite(parsedMin)) throw new Error("Min denomination must be a number");
      if (parsedMax != null && !Number.isFinite(parsedMax)) throw new Error("Max denomination must be a number");
      if (safeMin != null && safeMax != null && safeMax < safeMin) {
        throw new Error("Max denomination must be ≥ min denomination.");
      }

      // Skip client-side duplicates too, so we never send known-duplicate records. If everything is a
      // duplicate the server still no-ops; we surface that as a warning below.
      const items = buildSpecs().filter((s) => !existingCaps.some((c) => sameSpec(c, s)));
      if (items.length === 0) {
        return { added: 0, skipped: plannedCount, capabilityIds: [] as string[] };
      }
      return addMerchantCapabilities(merchant.id, { items });
    },
    onSuccess: (result) => {
      const { added, skipped } = result;
      if (added === 0 && skipped > 0) {
        toast.warning(`Nothing added — all ${skipped} already existed.`);
      } else if (skipped > 0) {
        toast.warning(
          `Added ${added} ${added === 1 ? "capability" : "capabilities"}, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`,
        );
      } else {
        const addedTxt = `Added ${added} ${added === 1 ? "capability" : "capabilities"}`;
        const skipTxt = skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : "";
        toast.success(`${addedTxt}${skipTxt}.`);
      }
      if (merchant) qc.invalidateQueries({ queryKey: queryKeys.merchants.detail(merchant.id) });
      qc.invalidateQueries({ queryKey: queryKeys.merchants.lists() });
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (capabilityId: string) => {
      if (!merchant) throw new Error("No merchant selected");
      setRemovingId(capabilityId);
      return removeMerchantCapability(merchant.id, capabilityId);
    },
    onSuccess: () => {
      toast.success("Capability removed.");
      if (merchant) qc.invalidateQueries({ queryKey: queryKeys.merchants.detail(merchant.id) });
      qc.invalidateQueries({ queryKey: queryKeys.merchants.lists() });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setRemovingId(null),
  });

  const capabilities = detail?.capabilities ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capabilities{merchant ? ` · ${merchant.name}` : ""}</DialogTitle>
          <DialogDescription>
            Brands, countries and denomination ranges this merchant can redeem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing capabilities */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["Brand", "Country", "Format", "Min", "Max", "Wildcard", ""].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capabilities.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono font-medium">
                        {c.isWildcard ? <span className="text-muted-foreground">any</span> : c.brandCode || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{c.countryCode || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.cardFormat || "Any"}</td>
                      <td className="px-3 py-2 font-mono">{c.minDenomination ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{c.maxDenomination ?? "—"}</td>
                      <td className="px-3 py-2">{c.isWildcard ? "Yes" : "No"}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Remove capability"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(c.id)}
                        >
                          {removingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {capabilities.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No capabilities yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add capability */}
          <div className="space-y-3 rounded-lg border bg-secondary/30 p-3">
            <p className="text-sm font-semibold">Add capabilities</p>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={isWildcard} onCheckedChange={(v) => setIsWildcard(!!v)} />
              All cards — wildcard (matches any brand)
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Brands"
                hint={isWildcard ? "Ignored while wildcard is on." : "Pick one or more."}
              >
                <MultiSelect
                  options={brandOptions}
                  selected={brandCodes}
                  onToggle={(v) => setBrandCodes((s) => toggle(s, v))}
                  onSelectAll={() => setBrandCodes(brandOptions.map((o) => o.value))}
                  onClear={() => setBrandCodes([])}
                  placeholder="Choose brands"
                  searchPlaceholder="Search brands…"
                  emptyText="No brands in catalog."
                  disabled={isWildcard}
                />
              </Field>

              <Field label="Countries" hint="Empty = any country.">
                <MultiSelect
                  options={countryOptions}
                  selected={countryCodes}
                  onToggle={(v) => setCountryCodes((s) => toggle(s, v))}
                  onSelectAll={() => setCountryCodes(countryOptions.map((o) => o.value))}
                  onClear={() => setCountryCodes([])}
                  placeholder="Any country"
                  searchPlaceholder="Search countries…"
                  emptyText="No countries in catalog."
                />
              </Field>
            </div>

            {/* Selected chips */}
            {(brandCodes.length > 0 || countryCodes.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {!isWildcard &&
                  brandCodes.map((code) => (
                    <Chip key={`b-${code}`} onRemove={() => setBrandCodes((s) => s.filter((v) => v !== code))}>
                      {code}
                    </Chip>
                  ))}
                {countryCodes.map((code) => (
                  <Chip key={`c-${code}`} muted onRemove={() => setCountryCodes((s) => s.filter((v) => v !== code))}>
                    {code}
                  </Chip>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Format">
                <Select value={cardFormat} onValueChange={(v) => setCardFormat(v as MerchantCardFormat | "Any")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any">Any</SelectItem>
                    {CARD_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Min denom">
                <Input
                  type="number"
                  value={minDenomination}
                  onChange={(e) => setMinDenomination(e.target.value)}
                  placeholder="10"
                  className="font-mono"
                />
              </Field>
              <Field label="Max denom">
                <Input
                  type="number"
                  value={maxDenomination}
                  onChange={(e) => setMaxDenomination(e.target.value)}
                  placeholder="500"
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <p className="text-muted-foreground">
                  {plannedCount === 0
                    ? "Pick brands (or wildcard) to add."
                    : `${newCount} new ${newCount === 1 ? "capability" : "capabilities"} will be added.`}
                </p>
                {duplicateCount > 0 && (
                  <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {duplicateCount} already {duplicateCount === 1 ? "exists" : "exist"} and will be skipped.
                  </p>
                )}
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || newCount === 0}
              >
                {addMutation.isPending ? "Adding…" : "Add capabilities"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Multi-select combobox (Popover + Command) with check marks and select-all / clear actions. */
function MultiSelect({
  options,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <div className="flex items-center justify-between border-b px-2 py-1.5 text-xs">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onSelectAll}>
              Select all
            </button>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClear}>
              Clear
            </button>
          </div>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => onToggle(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", selected.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Chip({
  children,
  muted,
  onRemove,
}: {
  children: React.ReactNode;
  muted?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs",
        muted ? "bg-secondary/40 text-muted-foreground" : "bg-background",
      )}
    >
      {children}
      <button type="button" className="opacity-60 hover:opacity-100" onClick={onRemove}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
