import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { trades, type Trade } from "@/data/mock";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/trades")({
  head: () => ({ meta: [{ title: "Trades — Plut Admin" }] }),
  component: TradesPage,
});

function TradesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<Trade | null>(null);

  const filtered = useMemo(() => trades.filter(t => {
    const matchQ = !q || t.id.toLowerCase().includes(q.toLowerCase()) || t.brand.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || t.status === status;
    return matchQ && matchS;
  }), [q, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by trade ID or brand…" className="h-10 w-72 pl-9 rounded-lg" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-40 rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-secondary">
            <Calendar className="h-4 w-4" /> Date range
          </button>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Trade ID", "User", "Brand", "Country", "Cards", "Payout", "Status", "SLA Deadline", "Submitted"].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setOpen(t)} className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-mono text-xs">{t.id}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.user}</td>
                  <td className="px-5 py-3.5 font-medium">{t.brand}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.country}</td>
                  <td className="px-5 py-3.5">{t.cards}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatNaira(t.payout)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{t.sla}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.submitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
          <p className="text-muted-foreground">Showing 1–{filtered.length} of 2,491 trades</p>
          <div className="flex gap-2">
            <button className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
            <button className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={v => !v && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
          <SheetHeader className="sr-only"><SheetTitle>Trade details</SheetTitle></SheetHeader>
          {open && <TradeDetail trade={open} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TradeDetail({ trade }: { trade: Trade }) {
  const steps = [
    { label: "Submitted", done: true, time: trade.submitted + " · 9:42 AM" },
    { label: "Under Review", done: trade.status !== "Pending", time: trade.status !== "Pending" ? trade.submitted + " · 10:15 AM" : "—" },
    { label: trade.status === "Rejected" ? "Rejected" : "Completed", done: trade.status === "Completed" || trade.status === "Rejected", time: trade.status === "Completed" || trade.status === "Rejected" ? trade.submitted + " · 11:02 AM" : "—" },
  ];
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3 pt-2">
        <h2 className="font-display text-2xl font-bold">{trade.id}</h2>
        <StatusBadge status={trade.status} />
      </div>

      <Section title="Trade Summary">
        <Row k="Brand" v={trade.brand} />
        <Row k="Country" v={trade.country} />
        <Row k="Payout" v={<span className="font-display font-bold">{formatNaira(trade.payout)}</span>} />
        <Row k="Submitted" v={trade.submitted} />
        <Row k="SLA Deadline" v={trade.sla} />
      </Section>

      <Section title="Line Items">
        <div className="space-y-2">
          {trade.lineItems.map((li, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground text-[10px]">IMG</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{li.denom}</p>
                <p className="text-xs text-muted-foreground">×{li.rate.toLocaleString()} rate</p>
              </div>
              <div className="text-right">
                <StatusBadge status={li.type} />
                <p className="mt-1 text-sm font-semibold">{formatNaira(li.payout)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {trade.rejectionReason && (
        <Section title="Rejection Reason">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {trade.rejectionReason}
          </div>
        </Section>
      )}

      <Section title="Status Timeline">
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={"grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold " + (s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{i + 1}</span>
                {i < steps.length - 1 && <span className="mt-1 h-8 w-px bg-border" />}
              </div>
              <div className="pb-2">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    <div>{children}</div>
  </div>
);
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span>{v}</span>
  </div>
);
