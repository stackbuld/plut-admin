import { cn } from "@/lib/utils";

/** Returns short SLA indicator: green / orange / red ring + label */
export function SlaIndicator({ deadlineIso, className }: { deadlineIso: string; className?: string }) {
  const diffMin = Math.round((new Date(deadlineIso).getTime() - Date.now()) / 60_000);
  let color = "bg-green-500";
  let label: string;
  if (diffMin < 0) {
    color = "bg-red-500 animate-pulse";
    label = "OVERDUE";
  } else if (diffMin <= 5) {
    color = "bg-orange-500";
    label = `${diffMin}m left`;
  } else {
    label = `${diffMin}m left`;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}