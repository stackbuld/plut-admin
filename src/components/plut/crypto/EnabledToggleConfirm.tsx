import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Admin-owned enable/disable toggle with a lightweight inline confirm — a Popover anchored to the
 * switch itself, not a full dialog. Used for both the asset-level toggle (list rows, detail header)
 * and the per-network toggle (detail page) — small blast radius, reversible, so a single click plus
 * one inline confirm click is enough (unlike, say, a wallet freeze, which carries more consequence
 * and configuration).
 *
 * Deliberately only ever wraps the admin-owned `isEnabled` flag — never the provider-reported
 * isDepositEnabledByProvider/isWithdrawEnabledByProvider fields, which have no control at all here.
 */
export function EnabledToggleConfirm({
  checked,
  label,
  pending,
  onConfirm,
  size = "default",
}: {
  checked: boolean;
  /** Human-readable name of the thing being toggled, e.g. "BTC" or "USDT on TRC20" — used in the
   * inline confirm's prompt text. */
  label: string;
  pending: boolean;
  onConfirm: () => void;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            // Stop propagation/default so this works inside a Link-wrapped table row (list page)
            // without also triggering row navigation.
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Switch checked={checked} className="pointer-events-none" />
          )}
          <span
            className={cn(
              "font-medium",
              size === "sm" ? "text-xs" : "text-sm",
              checked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            {checked ? "On" : "Off"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm">
          {checked ? "Disable" : "Enable"} <span className="font-semibold">{label}</span>?
        </p>
        {checked && (
          <p className="mt-1 text-xs text-muted-foreground">
            Existing holders can still sell/withdraw — this only blocks new activation/buy.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={checked ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {checked ? "Disable" : "Enable"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
