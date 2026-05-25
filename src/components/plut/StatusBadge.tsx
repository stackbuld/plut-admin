import { cn } from "@/lib/utils";

// Pastel palette per spec — works in both light and dark.
const styles: Record<string, string> = {
  Submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  Approved: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  Paid: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  Cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
  Active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  Paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
  Physical: "bg-secondary text-secondary-foreground",
  "E-code": "bg-primary/15 text-primary",
};

const dotColor: Record<string, string> = {
  Submitted: "bg-yellow-500",
  Approved: "bg-blue-500",
  Paid: "bg-green-500",
  Rejected: "bg-red-500",
  Cancelled: "bg-gray-400",
  Active: "bg-green-500",
  Paused: "bg-yellow-500",
  Inactive: "bg-gray-400",
};

export function StatusBadge({ status, className, dot = true }: { status: string; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        styles[status] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {dot && dotColor[status] && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[status])} />}
      {status}
    </span>
  );
}