import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, change, icon: Icon }: { label: string; value: string; change?: number; icon: LucideIcon }) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-[var(--shadow-primary)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display mt-3 text-[32px] font-bold leading-none">{value}</p>
          {change !== undefined && change !== 0 && (
            <span className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}% from last month
            </span>
          )}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
