import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-10 text-center text-sm text-muted-foreground">No data yet.</td>
    </tr>
  );
}

export function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function TablePager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  noun = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  noun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/20 px-4 py-3">
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-xs text-muted-foreground">
          {total === 0
            ? `No ${noun}`
            : `${from}–${to} of ${total.toLocaleString()} ${noun}`}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <PagerBtn onClick={() => onPageChange(1)} disabled={page <= 1} title="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </PagerBtn>
        <PagerBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1} title="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </PagerBtn>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`el-${i}`} className="w-7 text-center text-xs text-muted-foreground select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}

        <PagerBtn onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} title="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </PagerBtn>
        <PagerBtn onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} title="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </PagerBtn>
      </div>
    </div>
  );
}

function PagerBtn({ onClick, disabled, title, children }: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={onClick} title={title}>
      {children}
    </Button>
  );
}

function buildPageNumbers(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | "…")[] = [1];

  if (page > 3) result.push("…");

  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  for (let i = start; i <= end; i++) result.push(i);

  if (page < total - 2) result.push("…");

  result.push(total);
  return result;
}
