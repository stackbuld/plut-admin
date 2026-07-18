import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, relativeTime } from "@/lib/format";
import {
  teamNumberQueries,
  addTeamNumber,
  setTeamNumberActive,
  queryKeys,
  type TeamNumberItem,
} from "@/api";
import { TabLoader, EmptyRow, Dash } from "@/components/plut/catalog-shared";

const HEADERS = ["Number", "Label", "Active", "Created"];

export function OurNumbers() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery(teamNumberQueries.list());
  const items = data ?? [];

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setTeamNumberActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Number activated." : "Number deactivated.");
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.teamNumbers() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <p>
          These are <span className="font-medium text-foreground">your</span> side's WhatsApp
          numbers. In a provider group, messages from these numbers (and our own WAHA line) are
          treated as internal and ignored — only the provider's messages are acted on.
        </p>
      </div>

      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">
          {items.length.toLocaleString()} number{items.length === 1 ? "" : "s"}
        </span>
        <Button size="sm" className="ml-auto gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add number
        </Button>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <TeamNumberRow
                    key={n.id}
                    item={n}
                    pending={activeMutation.isPending}
                    onToggle={(isActive) => activeMutation.mutate({ id: n.id, isActive })}
                  />
                ))}
                {items.length === 0 && <EmptyRow cols={HEADERS.length} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddTeamNumberDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function TeamNumberRow({
  item,
  pending,
  onToggle,
}: {
  item: TeamNumberItem;
  pending: boolean;
  onToggle: (isActive: boolean) => void;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40">
      <td className="px-6 py-3.5 font-mono text-xs">{item.phoneNormalized}</td>
      <td className="px-6 py-3.5">{item.label ? item.label : <Dash />}</td>
      <td className="px-6 py-3.5">
        <Switch
          checked={item.isActive}
          disabled={pending}
          onCheckedChange={(checked) => onToggle(checked)}
          aria-label={item.isActive ? "Deactivate number" : "Activate number"}
        />
      </td>
      <td
        className="px-6 py-3.5 whitespace-nowrap text-muted-foreground"
        title={formatDateTime(item.created)}
      >
        {relativeTime(item.created)}
      </td>
    </tr>
  );
}

function AddTeamNumberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [rawInput, setRawInput] = useState("");
  const [label, setLabel] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const raw = rawInput.trim();
      if (!raw) throw new Error("Number is required");
      await addTeamNumber({ rawInput: raw, label: label.trim() });
    },
    onSuccess: () => {
      toast.success("Number added.");
      qc.invalidateQueries({ queryKey: queryKeys.sourcing.teamNumbers() });
      setRawInput("");
      setLabel("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRawInput("");
          setLabel("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add our number</DialogTitle>
          <DialogDescription>
            Add one of our own WhatsApp numbers so the assistant ignores its messages in provider
            groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label="Number *"
            hint="the teammate's WhatsApp number in full international form, e.g. 2348012345678 — the AI will ignore messages from this number inside provider groups"
          >
            <Input
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="2348012345678"
              className="font-mono"
            />
          </Field>

          <Field label="Label" hint='e.g. "Ops – Ada"'>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ops – Ada"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add number"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
