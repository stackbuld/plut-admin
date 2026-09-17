import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ledgerQueries } from "@/api/ledger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Ledger picker used by every ledger admin screen.
 *
 * Shows what each ledger actually is ("Nigeria — naira", "Crypto — all assets") rather than only its
 * internal name, so choosing one doesn't require knowing the topology. Auto-selects the first ledger
 * so no screen renders in an unusable "no ledger chosen" state, which is what every screen was
 * open-coding before this.
 */

/** Plain descriptions for the ledgers in config/ledger-topology.yaml. */
const LEDGER_BLURB: Record<string, string> = {
  "plut-core-ng": "Nigeria — everyday naira money",
  "plut-crypto-global": "Crypto — all crypto assets",
  "plut-rewards-global": "Rewards — points and perks",
};

export function LedgerPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (ledger: string) => void;
  className?: string;
}) {
  const { data: ledgers, isLoading } = useQuery(ledgerQueries.ledgers());

  useEffect(() => {
    if (!value && ledgers && ledgers.length > 0) onChange(ledgers[0].name);
  }, [value, ledgers, onChange]);

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className={className ?? "h-9 min-w-[240px]"}>
        <SelectValue placeholder={isLoading ? "Loading ledgers…" : "Choose a ledger"} />
      </SelectTrigger>
      <SelectContent>
        {(ledgers ?? []).map((l) => (
          <SelectItem key={l.name} value={l.name}>
            <span className="flex flex-col items-start">
              <span>{LEDGER_BLURB[l.name] ?? l.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{l.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
