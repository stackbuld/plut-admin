import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { exchangeCode, parseIdToken, isAdmin } from "@/lib/zitadel";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");

      if (errorParam) {
        setError(params.get("error_description") ?? errorParam);
        return;
      }

      const code = params.get("code");
      if (!code) {
        setError("No authorization code received.");
        return;
      }

      try {
        const tokens = await exchangeCode(code, params.get("state"));

        // id_token contains profile + roles (enabled in Zitadel app token settings)
        const claims = parseIdToken(tokens.id_token);

        if (!isAdmin(claims)) {
          setError("Access denied. Your account does not have admin privileges.");
          return;
        }

        const nameParts = [claims.given_name, claims.family_name].filter(Boolean).join(" ");
        const name = claims.name || nameParts || claims.email?.split("@")[0] || "Admin";

        // Bootstrap the user on the backend (idempotent — safe to call every login)
        await fetch("https://api-v2.plut.ng/api/v1/users/bootstrap", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {
          // Non-fatal: user may already be provisioned
        });

        setSession({
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          userId: claims.sub,
          email: claims.email ?? "",
          name,
          role: "Super Admin",
        });

        navigate({ to: "/admin/giftcards/dashboard", replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    }

    handle();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <a href="/login" className="text-xs text-muted-foreground hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
