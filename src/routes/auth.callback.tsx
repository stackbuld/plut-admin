import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { exchangeCode, parseIdToken, isAdmin } from "@/lib/zitadel";
import { useAuth } from "@/lib/auth";

type BootstrapUser = {
  userId: string;
  zitadelUserId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  status: string;
  kycTier: string;
  createdAt: string;
};

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

        const claims = parseIdToken(tokens.id_token);

        if (!isAdmin(claims)) {
          setError("Access denied. Your account does not have admin privileges.");
          return;
        }

        // Bootstrap provisions the user and returns the backend user record
        const bootstrapRes = await fetch("https://api-v2.plut.ng/api/v1/users/bootstrap", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
        });

        let backendUser: BootstrapUser | null = null;
        if (bootstrapRes.ok) {
          const body = await bootstrapRes.json();
          backendUser = body.data ?? null;
        }

        setSession({
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          // Use backend userId (not Zitadel sub) — this is what API mutations expect
          userId: backendUser?.userId ?? claims.sub,
          email: backendUser?.email ?? claims.email ?? "",
          name: backendUser?.displayName ?? claims.name ?? "Admin",
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
