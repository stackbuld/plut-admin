import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createMerchant,
  updateMerchant,
  wahaQueries,
  queryKeys,
  type ProviderDto,
  type MerchantChannelType,
  type MerchantTrustTier,
  type WahaGroup,
} from "@/api";
import { cn } from "@/lib/utils";

const CHANNEL_TYPES: MerchantChannelType[] = ["Waha", "Telegram", "WhatsAppBusiness"];
const TRUST_TIERS: MerchantTrustTier[] = ["Probation", "Standard", "Trusted"];

export function RegisterMerchantDialog({
  open,
  merchant,
  prefillChatId,
  onClose,
}: {
  open: boolean;
  merchant?: ProviderDto | null;
  /** Prefills the channel chat id when registering a new merchant (e.g. from the Unmatched inbox). */
  prefillChatId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!merchant;

  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState<MerchantChannelType>("Waha");
  const [channelChatId, setChannelChatId] = useState("");
  const [channelDisplayHint, setChannelDisplayHint] = useState("");
  const [trustTier, setTrustTier] = useState<MerchantTrustTier>("Probation");
  const [maxConcurrent, setMaxConcurrent] = useState("");
  const [rateRequestLocale, setRateRequestLocale] = useState("");
  const [notes, setNotes] = useState("");
  const [rateReplyGuidance, setRateReplyGuidance] = useState("");
  const [redemptionReplyGuidance, setRedemptionReplyGuidance] = useState("");
  const [agentNotes, setAgentNotes] = useState("");
  // For Waha we default to picking a group from the dropdown; this flips to a raw text input.
  // We start in manual mode if a chat id was prefilled (e.g. from the Unmatched inbox).
  const [manualChatId, setManualChatId] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(merchant?.name ?? "");
    setChannelType(merchant?.channelType ?? "Waha");
    setChannelChatId(merchant?.channelChatId ?? prefillChatId ?? "");
    setChannelDisplayHint(merchant?.channelDisplayHint ?? "");
    setTrustTier(merchant?.trustTier ?? "Probation");
    setMaxConcurrent(
      merchant?.maxConcurrentRedemptions != null ? String(merchant.maxConcurrentRedemptions) : "",
    );
    setRateRequestLocale(merchant?.rateRequestLocale ?? "");
    setNotes(merchant?.notes ?? "");
    setRateReplyGuidance(merchant?.rateReplyGuidance ?? "");
    setRedemptionReplyGuidance(merchant?.redemptionReplyGuidance ?? "");
    setAgentNotes(merchant?.agentNotes ?? "");
    setManualChatId(!!prefillChatId);
  }, [open, merchant, prefillChatId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Name is required");

      const maxNum = maxConcurrent.trim() ? Number(maxConcurrent) : undefined;
      if (maxNum != null && (!Number.isFinite(maxNum) || maxNum < 0)) {
        throw new Error("Max concurrent must be a non-negative number");
      }

      if (isEdit && merchant) {
        await updateMerchant(merchant.id, {
          name: trimmedName,
          channelDisplayHint: channelDisplayHint.trim() || null,
          rateRequestLocale: rateRequestLocale.trim() || null,
          notes: notes.trim() || null,
          trustTier,
          maxConcurrentRedemptions: maxNum,
          rateReplyGuidance: rateReplyGuidance.trim() || null,
          redemptionReplyGuidance: redemptionReplyGuidance.trim() || null,
          agentNotes: agentNotes.trim() || null,
        });
        return;
      }

      if (!channelChatId.trim()) throw new Error("Channel chat id is required");
      await createMerchant({
        name: trimmedName,
        channelType,
        channelChatId: channelChatId.trim(),
        channelDisplayHint: channelDisplayHint.trim() || null,
        trustTier,
        maxConcurrentRedemptions: maxNum,
        rateRequestLocale: rateRequestLocale.trim() || null,
        notes: notes.trim() || null,
        rateReplyGuidance: rateReplyGuidance.trim() || null,
        redemptionReplyGuidance: redemptionReplyGuidance.trim() || null,
        agentNotes: agentNotes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? `Updated ${name}.` : `Registered ${name}.`);
      qc.invalidateQueries({ queryKey: queryKeys.merchants.all() });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Merchant" : "Register Merchant"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the merchant's profile and trust settings."
              : "Register a giftcard-redemption partner."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Redemption"
            />
          </Field>

          <Field label="Channel type *">
            {isEdit ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">{channelType}</div>
            ) : (
              <Select value={channelType} onValueChange={(v) => setChannelType(v as MerchantChannelType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field
            label="Channel chat id *"
            hint={
              channelType === "Waha" && !manualChatId && !isEdit
                ? "Pick the provider's WhatsApp group from the connected number."
                : "the provider's chat id — usually a group id ending in @g.us (e.g. 12036304...@g.us), or a 1:1 DM ending in @c.us"
            }
          >
            {isEdit ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm font-mono">
                {channelChatId}
              </div>
            ) : channelType === "Waha" && !manualChatId ? (
              <div className="space-y-1.5">
                <GroupCombobox
                  value={channelChatId}
                  onSelect={(g) => {
                    setChannelChatId(g.id);
                    if (!channelDisplayHint.trim()) setChannelDisplayHint(g.name);
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setManualChatId(true)}
                >
                  Enter id manually instead
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  value={channelChatId}
                  onChange={(e) => setChannelChatId(e.target.value)}
                  placeholder="2348012345678@c.us"
                  className="font-mono"
                />
                {channelType === "Waha" && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setManualChatId(false)}
                  >
                    Pick from WhatsApp groups instead
                  </button>
                )}
              </div>
            )}
          </Field>

          <Field label="Channel display hint" hint="Optional human-friendly label for the channel.">
            <Input
              value={channelDisplayHint}
              onChange={(e) => setChannelDisplayHint(e.target.value)}
              placeholder="Acme WhatsApp"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Trust tier *">
              <Select value={trustTier} onValueChange={(v) => setTrustTier(v as MerchantTrustTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max concurrent" hint="Redemptions in flight.">
              <Input
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(e.target.value)}
                placeholder="5"
                className="font-mono"
              />
            </Field>
          </div>

          <Field label="Rate request locale" hint='e.g. "en-NG"'>
            <Input
              value={rateRequestLocale}
              onChange={(e) => setRateRequestLocale(e.target.value)}
              placeholder="en-NG"
              className="font-mono"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this merchant…"
              rows={3}
            />
          </Field>

          <div className="space-y-3 rounded-lg border bg-secondary/30 p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">How this provider responds</p>
              <p className="text-xs text-muted-foreground">
                Teaches the assistant this provider's reply style so it can read their messages correctly.
              </p>
            </div>

            <Field
              label="Rate replies"
              hint="How they acknowledge + quote a rate."
            >
              <Textarea
                value={rateReplyGuidance}
                onChange={(e) => setRateReplyGuidance(e.target.value)}
                placeholder="usually replies just the number like 7.1; says checking first"
                rows={3}
              />
            </Field>

            <Field
              label="Redemption replies"
              hint="How they confirm a card worked/failed, and whether they send a screenshot."
            >
              <Textarea
                value={redemptionReplyGuidance}
                onChange={(e) => setRedemptionReplyGuidance(e.target.value)}
                placeholder="sends good/done, usually a balance screenshot"
                rows={3}
              />
            </Field>

            <Field
              label="Extra notes for the AI"
              hint="Anything else the assistant should know (language, timezone, quirks)."
            >
              <Textarea
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                placeholder="Replies in pidgin; offline after 9pm WAT."
                rows={3}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending
              ? isEdit
                ? "Saving…"
                : "Registering…"
              : isEdit
                ? "Save Changes"
                : "Register Merchant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Searchable dropdown of the WhatsApp groups the connected number belongs to. Selecting one drops its
 * @g.us id into channelChatId. Fetches lazily (only when this control mounts) and degrades to a helpful
 * message when the session isn't connected (the groups endpoint fails unless WAHA is WORKING).
 */
function GroupCombobox({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (group: WahaGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: groups, isLoading, isError, error, refetch, isFetching } = useQuery(wahaQueries.groups());
  const selected = groups?.find((g) => g.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && !value && "text-muted-foreground")}>
            {selected ? selected.name : value ? value : "Select a WhatsApp group…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search groups…" />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading groups…
              </div>
            ) : isError ? (
              <div className="space-y-2 px-3 py-6 text-sm text-muted-foreground">
                <p>{(error as Error)?.message ?? "Couldn't load groups."}</p>
                <p className="text-xs">
                  Make sure the WhatsApp number is connected on the WhatsApp page, then retry.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  disabled={isFetching}
                  onClick={() => refetch()}
                >
                  {isFetching && <Loader2 className="h-3 w-3 animate-spin" />} Retry
                </Button>
              </div>
            ) : (
              <>
                <CommandEmpty>No groups found.</CommandEmpty>
                <CommandGroup>
                  {groups?.map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`${g.name} ${g.id}`}
                      onSelect={() => {
                        onSelect(g);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", value === g.id ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{g.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {g.id}
                          {typeof g.size === "number" ? ` · ${g.size} members` : ""}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
