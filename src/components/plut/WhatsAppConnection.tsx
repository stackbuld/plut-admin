import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Power, RotateCw, Smartphone, AlertTriangle, CheckCircle2, QrCode, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  wahaQueries,
  startWahaSession,
  restartWahaSession,
  logoutWahaSession,
  requestWahaCode,
  queryKeys,
  type WahaSessionStatus,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/plut/StatusBadge";

// How often we re-poll the session WHILE the admin is actively pairing (drives the QR countdown).
// We do NOT poll otherwise — the page loads a single status read and waits for an explicit Connect.
// 5s is a calm default: WAHA rotates the QR only ~every 20s, and this still flips to "Connected"
// within a few seconds of the scan. Polling stops entirely once WORKING or when pairing is cancelled.
const POLL_MS = 5000;

// WAHA status → a StatusBadge-friendly label + pastel colour (works in light + dark).
const STATUS_META: Record<WahaSessionStatus, { label: string; className: string }> = {
  WORKING: { label: "Connected", className: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300" },
  SCAN_QR_CODE: { label: "Scan QR", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300" },
  STARTING: { label: "Starting", className: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300" },
  STOPPED: { label: "Disconnected", className: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
};

export function WhatsAppConnection() {
  const qc = useQueryClient();

  // "Pairing" is opt-in: the page loads a single status read, but the QR flow (and the 3s polling
  // that refreshes it) only kicks in once the admin clicks Connect. This also lets an already-paired
  // number show as Connected on load without spinning up a pairing UI.
  const [pairing, setPairing] = useState(false);

  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = useQuery({
    ...wahaQueries.session(),
    // Poll only while actively pairing and not yet connected; stop once WORKING or idle.
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return pairing && s && s !== "WORKING" ? POLL_MS : false;
    },
  });
  const status = data?.status;

  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.waha.session() });

  // ── QR auto-refresh countdown ──────────────────────────────────────────────
  // While pairing the query polls every POLL_MS; we count the remaining time down
  // to 0 and reset the moment a fresh payload lands (dataUpdatedAt changes).
  const [msLeft, setMsLeft] = useState(POLL_MS);
  useEffect(() => {
    setMsLeft(POLL_MS);
    const id = setInterval(() => setMsLeft((prev) => Math.max(0, prev - 250)), 250);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const countdownPct = (msLeft / POLL_MS) * 100;

  // ── Pairing method + phone-code state ──────────────────────────────────────
  const [method, setMethod] = useState<"qr" | "phone">("qr");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: startWahaSession,
    onSuccess: () => { setPairing(true); refresh(); },
    onError: (e: Error) => { setPairing(false); toast.error(e.message); },
  });
  const restartMutation = useMutation({
    mutationFn: restartWahaSession,
    onSuccess: () => { setPairing(true); setPairingCode(null); toast.success("Fresh QR on the way."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const logoutMutation = useMutation({
    mutationFn: logoutWahaSession,
    onSuccess: () => { setPairing(false); setPairingCode(null); toast.success("Disconnected."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const requestCodeMutation = useMutation({
    mutationFn: () => requestWahaCode(phone.trim()),
    onSuccess: (code) => { setPairingCode(code); toast.success("Pairing code ready — enter it on the phone."); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Once the number links, pairing mode has served its purpose — drop back to the resting view.
  useEffect(() => {
    if (status === "WORKING" && pairing) setPairing(false);
  }, [status, pairing]);

  const busy = startMutation.isPending || restartMutation.isPending || logoutMutation.isPending;
  const meta = status ? STATUS_META[status] : undefined;

  const connect = () => { setPairing(true); startMutation.mutate(); };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>WhatsApp Connection</CardTitle>
                <CardDescription>
                  Pair the dedicated sourcing number so the assistant can message merchants.
                </CardDescription>
              </div>
            </div>
            <span className="flex items-center gap-2">
              {pairing && isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {meta && <StatusBadge status={meta.label} className={meta.className} dot={false} />}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Couldn't load the WhatsApp session.</p>
                <p className="text-xs opacity-80">{(error as Error)?.message ?? "The gateway may be unreachable."}</p>
              </div>
            </div>
          ) : status === "WORKING" ? (
            // ── Already paired ──────────────────────────────────────────────
            <>
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium">Connected and ready.</p>
                  <p className="text-sm text-muted-foreground">
                    Number: <span className="font-mono">{data?.connectedNumber ?? "unknown"}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-1" disabled={busy} onClick={() => restartMutation.mutate()}>
                  {restartMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  Restart
                </Button>
                <Button variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => logoutMutation.mutate()}>
                  {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  Disconnect
                </Button>
              </div>
            </>
          ) : !pairing ? (
            // ── Resting state — nothing happens until the admin clicks Connect ──
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-secondary/30 p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm">
                <QrCode className="h-6 w-6" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                No number is linked yet. Click <span className="font-medium text-foreground">Connect</span> to start
                pairing — a QR code (or phone-number code) will be generated for you to scan.
              </p>
              <Button className="gap-1" disabled={busy} onClick={connect}>
                {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Connect
              </Button>
            </div>
          ) : (
            // ── Actively pairing (Connect was clicked) ──────────────────────
            <>
              {(status === "SCAN_QR_CODE" || status === "STARTING") && (
                <Tabs value={method} onValueChange={(v) => setMethod(v as "qr" | "phone")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="qr" className="gap-1.5">
                      <QrCode className="h-4 w-4" /> Scan QR
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="gap-1.5">
                      <KeyRound className="h-4 w-4" /> Link with phone number
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Scan-QR panel ── */}
                  <TabsContent value="qr" className="mt-4">
                    <div className="flex flex-col items-center gap-4 rounded-xl border bg-secondary/30 p-6 text-center">
                      {data?.qr ? (
                        <img
                          src={data.qr}
                          alt="WhatsApp pairing QR code"
                          className="h-56 w-56 rounded-lg bg-white p-2 shadow-sm"
                        />
                      ) : (
                        <div className="grid h-56 w-56 place-items-center rounded-lg bg-white text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                      <ol className="max-w-sm space-y-1 text-left text-sm text-muted-foreground">
                        <li>1. Open WhatsApp on the dedicated number.</li>
                        <li>2. Go to <span className="font-medium text-foreground">Settings → Linked devices</span>.</li>
                        <li>3. Tap <span className="font-medium text-foreground">Link a device</span> and scan this code.</li>
                      </ol>

                      {/* Live auto-refresh countdown — resets each time a fresh QR lands. */}
                      <div className="w-full max-w-sm space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isFetching ? "Refreshing…" : `Next refresh in ${secondsLeft}s`}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs"
                            disabled={busy}
                            onClick={() => restartMutation.mutate()}
                          >
                            <RotateCw className="h-3 w-3" /> Refresh QR
                          </Button>
                        </div>
                        <Progress value={countdownPct} className="h-1" />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Link-with-phone-number panel ── */}
                  <TabsContent value="phone" className="mt-4">
                    <div className="space-y-4 rounded-xl border bg-secondary/30 p-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone number to link</label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="2348012345678"
                          inputMode="numeric"
                        />
                        <p className="text-xs text-muted-foreground">
                          Full international number, digits only — the WhatsApp account being linked.
                        </p>
                      </div>
                      <Button
                        className="gap-1"
                        disabled={requestCodeMutation.isPending || phone.trim().length < 6}
                        onClick={() => requestCodeMutation.mutate()}
                      >
                        {requestCodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Get code
                      </Button>

                      {pairingCode && (
                        <div className="space-y-3 rounded-lg border bg-background p-4 text-center">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Your pairing code</p>
                          <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pairingCode}</p>
                          <p className="text-left text-sm text-muted-foreground">
                            On that WhatsApp number:{" "}
                            <span className="font-medium text-foreground">
                              Settings → Linked devices → Link a device → Link with phone number instead
                            </span>
                            , then enter this code.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {status === "FAILED" && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/10">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    The session failed — the QR likely expired before it was scanned.
                  </p>
                  <Button className="gap-1" disabled={busy} onClick={() => restartMutation.mutate()}>
                    {restartMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                    Get a fresh QR
                  </Button>
                </div>
              )}

              {(status === "STOPPED" || !status) && (
                <div className="flex items-center justify-center gap-2 rounded-xl border bg-secondary/30 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting the session…
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-1" disabled={busy} onClick={() => restartMutation.mutate()}>
                  {restartMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  Restart
                </Button>
                <Button variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => logoutMutation.mutate()}>
                  {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  Disconnect
                </Button>
                <Button variant="ghost" className="gap-1" disabled={busy} onClick={() => setPairing(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
