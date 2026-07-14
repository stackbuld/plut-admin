import { createFileRoute } from "@tanstack/react-router";
import { rateQueries } from "@/api";
import { RateHistoryDetail } from "@/components/plut/RateHistoryDetail";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/rate-history/$denominationId")({
  loader: ({ context, params }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(rateQueries.history(params.denominationId));
    qc.prefetchQuery(rateQueries.payouts(params.denominationId));
    import("@/components/plut/SetRateDialog.body");
  },
  component: RateHistoryPage,
});

function RateHistoryPage() {
  const { denominationId } = Route.useParams();
  return <RateHistoryDetail denominationId={denominationId} />;
}
