import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/plut/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !session?.accessToken) {
      navigate({ to: "/login", replace: true });
    }
  }, [ready, session]);

  if (!ready || !session?.accessToken) return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
