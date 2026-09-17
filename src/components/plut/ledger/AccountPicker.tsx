import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ledgerQueries } from "@/api/ledger";
import { floatQueries } from "@/api/ledger-float";
import type { OperationalAccountDto } from "@/api/types/ledger-float.types";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { KIND_LABEL, accountName } from "./account-labels";

/**
 * Search-and-select for a ledger account, replacing the free-text account inputs the corrections
 * form used to have.
 *
 * Typing a chart-of-accounts path by hand is the single most error-prone thing on this console: a
 * typo either fails validation (best case) or posts real money into an account nobody is watching
 * (the incident in 00-OVERVIEW.md §2 started with an account nothing had declared). Every account
 * offered here is one that actually exists.
 *
 * Two sources, in order of usefulness:
 *  1. The ledger's operational accounts — named, with live balances. This is what an operator wants
 *     99% of the time, and it's already loaded on these screens.
 *  2. A live prefix search over every account in the ledger, for the per-user and hold accounts that
 *     aren't in the manifest. Only runs once the operator has typed a prefix, because a ledger has
 *     millions of per-user accounts and there is no useful "everything" list. Formance's address
 *     matching is anchored at the START of the address (see FormanceAddressFilter), so this finds
 *     "liabilities:users:637b…" but not a bare "637b…" — hence the hint below, and hence group 1
 *     doing a plain substring match so Plut's own accounts are findable by name.
 *
 * `world` is offered explicitly when allowed, since it's the funding source for float seeds and is
 * not an account any listing returns.
 */
export function AccountPicker({
  ledger,
  value,
  onChange,
  placeholder = "Search accounts…",
  allowWorld = false,
  disabled,
}: {
  ledger: string;
  value: string;
  onChange: (account: string) => void;
  placeholder?: string;
  /** Offer Formance's `world` external-counterparty account (float seeds fund from it). */
  allowWorld?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: operational } = useQuery(floatQueries.operational(ledger));

  // Only search the full ledger once there's enough of a prefix to be meaningful — a 1-character
  // prefix would page through most of the ledger for nothing.
  const prefix = search.trim().length >= 3 ? search.trim() : "";
  const { data: searchPage, isFetching: searching } = useQuery({
    ...ledgerQueries.accounts({ ledger, prefix, pageSize: 25 }),
    enabled: Boolean(ledger && prefix),
  });

  const operationalMatches = useMemo(() => {
    const rows = operational ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (a) =>
        a.account.toLowerCase().includes(q) ||
        accountName(a).toLowerCase().includes(q) ||
        (a.category ?? "").toLowerCase().includes(q),
    );
  }, [operational, search]);

  // Anything the manifest already covers is shown in the richer group above; don't list it twice.
  const knownPaths = useMemo(
    () => new Set((operational ?? []).map((a) => a.account)),
    [operational],
  );
  const otherMatches = (searchPage?.items ?? []).filter((a) => !knownPaths.has(a.account));

  const selected = (operational ?? []).find((a) => a.account === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !ledger}
          className="h-auto w-full justify-between py-2 text-left font-normal"
        >
          {value ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm">
                {selected
                  ? accountName(selected)
                  : value === "world"
                    ? "Outside Plut (world)"
                    : value}
              </span>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{value}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, or the start of an account path…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>
              {searching ? "Searching…" : "No account matches that. Try a different word."}
            </CommandEmpty>

            {allowWorld && "world".includes(search.trim().toLowerCase()) && (
              <CommandGroup heading="External">
                <CommandItem
                  value="world"
                  onSelect={() => {
                    onChange("world");
                    setOpen(false);
                  }}
                >
                  <Globe className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm">Outside Plut</span>
                    <span className="text-[11px] text-muted-foreground">
                      Money entering the books from outside — use this to fund a float account.
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === "world" ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              </CommandGroup>
            )}

            {operationalMatches.length > 0 && (
              <CommandGroup heading="Plut's own accounts">
                {operationalMatches.map((a) => (
                  <AccountOption
                    key={a.account}
                    account={a}
                    selected={value === a.account}
                    onSelect={() => {
                      onChange(a.account);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}

            {otherMatches.length > 0 && (
              <CommandGroup heading="Other accounts in this ledger">
                {otherMatches.map((a) => (
                  <CommandItem
                    key={a.account}
                    value={a.account}
                    onSelect={() => {
                      onChange(a.account);
                      setOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-xs">{a.account}</span>
                      <span className="text-[11px] text-muted-foreground">{a.type}</span>
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === a.account ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!prefix && search.trim().length > 0 && operationalMatches.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                To search the whole ledger, type the start of an account path — e.g.
                &ldquo;liabilities:users:&rdquo;.
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AccountOption({
  account,
  selected,
  onSelect,
}: {
  account: OperationalAccountDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={account.account} onSelect={onSelect} className="items-start">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{accountName(account)}</span>
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {account.account}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {KIND_LABEL[account.kind]}
          {account.assetCode
            ? ` · holds ${formatMinor(account.balanceMinor, account.assetCode, account.precision)}`
            : ""}
        </span>
      </span>
      <Check className={cn("mt-1 ml-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}
