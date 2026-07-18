import { createFileRoute } from "@tanstack/react-router";
import { merchantQueries } from "@/api";
import { MerchantsTable } from "@/components/plut/MerchantsTable";

export const Route = createFileRoute("/_app/admin/sourcing/merchants")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(merchantQueries.list());
  },
  component: MerchantsTab,
});

function MerchantsTab() {
  return <MerchantsTable />;
}
