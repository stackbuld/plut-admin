import { createFileRoute } from "@tanstack/react-router";
import { reviewQueueQueries } from "@/api";
import { ReviewQueue } from "@/components/plut/ReviewQueue";

export const Route = createFileRoute("/_app/admin/sourcing/review")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(reviewQueueQueries.list({ page: 1, pageSize: 20 }));
  },
  component: ReviewTab,
});

function ReviewTab() {
  return <ReviewQueue />;
}
