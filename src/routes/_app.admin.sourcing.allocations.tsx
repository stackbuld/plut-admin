import { createFileRoute } from "@tanstack/react-router";
import { routingQueries, redemptionOrderQueries } from "@/api";
import { AllocationsDashboard } from "@/components/plut/AllocationsDashboard";

export const Route = createFileRoute("/_app/admin/sourcing/allocations")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(routingQueries.list({ page: 1, pageSize: 20 }));
    context.queryClient.prefetchQuery(redemptionOrderQueries.list({ page: 1, pageSize: 20 }));
  },
  component: AllocationsTab,
});

function AllocationsTab() {
  return <AllocationsDashboard />;
}
