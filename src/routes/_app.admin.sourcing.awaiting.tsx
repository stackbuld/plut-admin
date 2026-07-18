import { createFileRoute } from "@tanstack/react-router";
import { awaitingProviderQueries } from "@/api";
import { AwaitingProvidersList } from "@/components/plut/AwaitingProvidersList";

export const Route = createFileRoute("/_app/admin/sourcing/awaiting")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(awaitingProviderQueries.list());
  },
  component: AwaitingTab,
});

function AwaitingTab() {
  return <AwaitingProvidersList />;
}
