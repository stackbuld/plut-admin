import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  merchantQueries,
  setMerchantStatus,
  queryKeys,
  type ProviderDto,
  type MerchantStatus,
} from "@/api";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { FilterSelect, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { RegisterMerchantDialog } from "@/components/plut/RegisterMerchantDialog";
import { MerchantCapabilitiesDialog } from "@/components/plut/MerchantCapabilitiesDialog";
import { MerchantSamplesDialog } from "@/components/plut/MerchantSamplesDialog";

const STATUSES: MerchantStatus[] = ["Active", "Paused", "Disabled"];

export function MerchantsTable() {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("All");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderDto | null>(null);
  const [capsFor, setCapsFor] = useState<ProviderDto | null>(null);
  const [samplesFor, setSamplesFor] = useState<ProviderDto | null>(null);

  const { data, isLoading } = useQuery(merchantQueries.list());

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MerchantStatus }) =>
      setMerchantStatus(id, { status }),
    onSuccess: (_, { status }) => {
      toast.success(`Merchant ${status.toLowerCase()}.`);
      qc.invalidateQueries({ queryKey: queryKeys.merchants.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = data ?? [];
  const rows = statusFilter === "All" ? all : all.filter((m) => m.status === statusFilter);
  const total = rows.length;

  const headers = ["Name", "Channel", "Status", "Trust", "Max Concurrent", "Capabilities", ""];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
          options={[
            { v: "All", l: "All statuses" },
            ...STATUSES.map((s) => ({ v: s, l: s })),
          ]}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {total.toLocaleString()} merchant{total === 1 ? "" : "s"}
        </span>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => {
            setEditing(null);
            setRegisterOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Register Merchant
        </Button>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {headers.map((h) => (
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
                {rows.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3.5 font-medium">{m.name}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{m.channelChatId}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.channelType}
                          {m.channelDisplayHint ? ` · ${m.channelDisplayHint}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{m.trustTier}</td>
                    <td className="px-6 py-3.5 font-mono">{m.maxConcurrentRedemptions}</td>
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => setCapsFor(m)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        {m.capabilities.length}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(m);
                            setRegisterOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setCapsFor(m)}>
                              Manage capabilities
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSamplesFor(m)}>
                              Learned samples
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {m.status !== "Active" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "Active" })
                                }
                              >
                                Activate
                              </DropdownMenuItem>
                            )}
                            {m.status !== "Paused" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "Paused" })
                                }
                              >
                                Pause
                              </DropdownMenuItem>
                            )}
                            {m.status !== "Disabled" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "Disabled" })
                                }
                              >
                                Disable
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <EmptyRow cols={headers.length} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RegisterMerchantDialog
        open={registerOpen}
        merchant={editing}
        onClose={() => {
          setRegisterOpen(false);
          setEditing(null);
        }}
      />
      <MerchantCapabilitiesDialog merchant={capsFor} onClose={() => setCapsFor(null)} />
      <MerchantSamplesDialog merchant={samplesFor} onClose={() => setSamplesFor(null)} />
    </div>
  );
}
