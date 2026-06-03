import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { userQueries } from "@/api";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/users/$userId")({
  head: () => ({ meta: [{ title: "User Detail — Plut Admin" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = useParams({ from: "/_app/admin/giftcards/users/$userId" });
  const { data: user, isLoading, isError } = useQuery(userQueries.detail(userId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/giftcards/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const statusBadge = user.status === "Suspended" ? "Rejected" : user.status === "Active" ? "Paid" : "Submitted";

  return (
    <div className="space-y-6">
      <Link to="/admin/giftcards/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="User Info">
          <Row k="User ID"><span className="font-mono text-xs break-all">{user.userId}</span></Row>
          <Row k="Display Name">{user.displayName}</Row>
          <Row k="First Name">{user.firstName}</Row>
          <Row k="Last Name">{user.lastName}</Row>
          <Row k="Email">{user.email}</Row>
          <Row k="Phone">{user.phoneNumber ?? "—"}</Row>
          <Row k="Created">{formatDateTime(user.createdAt)}</Row>
          {user.lastLogin && <Row k="Last Login">{formatDateTime(user.lastLogin)}</Row>}
        </Panel>

        <Panel title="Account Status">
          <Row k="Status"><StatusBadge status={statusBadge} dot={false} /></Row>
          <Row k="KYC Tier">{user.kycTier}</Row>
          {user.avatarUrl && (
            <Row k="Avatar">
              <img src={user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
            </Row>
          )}
          <Row k="Zitadel ID"><span className="font-mono text-xs break-all">{user.zitadelUserId}</span></Row>
          {user.oldUserId && <Row k="Legacy ID"><span className="font-mono text-xs">{user.oldUserId}</span></Row>}
        </Panel>
      </div>

      <Panel title="Trade History">
        <p className="text-sm text-muted-foreground">Per-user trade history endpoint not yet available.</p>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
