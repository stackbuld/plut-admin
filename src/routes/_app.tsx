import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/plut/AppShell";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("plut-session");
      if (!raw) throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});