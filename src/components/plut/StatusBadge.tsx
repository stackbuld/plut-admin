import { cn } from "@/lib/utils";
import type { TradeStatus } from "@/data/mock";

const styles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Completed: "bg-success/15 text-success",
  Rejected: "bg-destructive/15 text-destructive",
  Processing: "bg-primary/15 text-primary",
  Active: "bg-success/15 text-success",
  Inactive: "bg-muted-foreground/15 text-muted-foreground",
  Physical: "bg-secondary text-secondary-foreground",
  "E-Code": "bg-primary/15 text-primary",
};

export function StatusBadge({ status, className }: { status: TradeStatus | string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", styles[status] ?? "bg-secondary text-secondary-foreground", className)}>
      {status}
    </span>
  );
}
