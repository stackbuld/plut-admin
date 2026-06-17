import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { beginLogin, parseIdToken, isAdmin } from "@/lib/zitadel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Plut Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, ready, setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const [sessionJson, setSessionJson] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteLoading, setPasteLoading] = useState(false);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (ready && session) navigate({ to: "/admin/giftcards/dashboard", replace: true });
  }, [ready, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    await beginLogin(trimmed);
  };

  const submitPastedSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);

    let parsed: any;
    try {
      parsed = JSON.parse(sessionJson);
    } catch {
      setPasteError("Invalid JSON.");
      return;
    }

    const accessToken: string | undefined = parsed?.access_token;
    const idToken: string | undefined = parsed?.id_token;
    if (!accessToken || !idToken) {
      setPasteError("Missing `access_token` or `id_token`.");
      return;
    }

    setPasteLoading(true);
    try {
      const claims = parseIdToken(idToken);
      if (!isAdmin(claims)) {
        setPasteError("Access denied. Not an admin account.");
        setPasteLoading(false);
        return;
      }

      // Best-effort bootstrap to get backend userId; fall back to claims.sub.
      let backendUserId: string | null = null;
      let backendEmail: string | null = null;
      let backendName: string | null = null;
      try {
        const res = await fetch("https://api-v2.plut.ng/api/v1/users/bootstrap", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const body = await res.json();
          backendUserId = body?.data?.userId ?? null;
          backendEmail = body?.data?.email ?? null;
          backendName = body?.data?.displayName ?? null;
        }
      } catch {
        // ignore — fall back to claims
      }

      setSession({
        accessToken,
        idToken,
        userId: backendUserId ?? claims.sub,
        email: backendEmail ?? parsed?.profile?.email ?? claims.email ?? "",
        name: backendName ?? parsed?.profile?.name ?? claims.name ?? "Admin",
        role: "Super Admin",
      });

      navigate({ to: "/admin/giftcards/dashboard", replace: true });
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : "Failed to load session.");
      setPasteLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[hsl(258_35%_6%)] p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(256 100% 75% / 0.25), transparent 45%), radial-gradient(circle at 80% 70%, hsl(280 90% 60% / 0.2), transparent 50%)" }} />
        <div className="relative flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(256_100%_75%)] text-[hsl(258_40%_8%)] font-display text-xl font-bold">P</div>
          <div className="font-display text-xl font-bold tracking-tight">Plut Admin</div>
        </div>
        <div className="relative max-w-md space-y-4">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Back-office for every Plut product.
          </h2>
          <p className="text-white/70">
            Review trades, manage cards, set rates and keep operations sharp. One console, every product.
          </p>
          <div className="flex items-center gap-2 pt-4 text-xs text-white/50">
            <ShieldCheck className="h-4 w-4" />
            Single sign-on via ZidaTel
          </div>
        </div>
        <div className="relative text-xs text-white/40">© 2026 Plut Finance. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-xl font-bold">P</div>
            <div className="font-display text-xl font-bold">Plut Admin</div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Plut work email. We'll redirect you to ZidaTel to confirm.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Work email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@plut.finance"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={loading}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to ZidaTel…
                </>
              ) : (
                <>
                  Continue with ZidaTel
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Need access? Ask a Super Admin to add you in ZidaTel.
          </p>

          {inIframe && (
            <div className="space-y-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-600">
                  Preview only · Login with session data
                </p>
                <p className="text-xs text-muted-foreground">
                  Sign in on a new tab, then paste the OIDC session JSON (must include
                  <code className="mx-1 rounded bg-muted px-1 py-0.5">access_token</code>
                  and <code className="mx-1 rounded bg-muted px-1 py-0.5">id_token</code>).
                </p>
              </div>
              <form onSubmit={submitPastedSession} className="space-y-2">
                <Textarea
                  value={sessionJson}
                  onChange={(e) => setSessionJson(e.target.value)}
                  placeholder='{ "id_token": "...", "access_token": "...", "profile": { ... } }'
                  className="h-32 font-mono text-[11px]"
                  disabled={pasteLoading}
                />
                {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pasteLoading || !sessionJson.trim()}
                >
                  {pasteLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading session…
                    </>
                  ) : (
                    "Login with session data"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}