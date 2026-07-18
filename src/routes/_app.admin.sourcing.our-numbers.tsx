import { createFileRoute } from "@tanstack/react-router";
import { teamNumberQueries } from "@/api";
import { OurNumbers } from "@/components/plut/OurNumbers";

export const Route = createFileRoute("/_app/admin/sourcing/our-numbers")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(teamNumberQueries.list());
  },
  component: OurNumbersTab,
});

function OurNumbersTab() {
  return <OurNumbers />;
}
