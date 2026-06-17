import { createFileRoute } from "@tanstack/react-router";
import {
  brandQueries,
  countryQueries,
  rateQueries,
  fxRateQueries,
  payoutCurrencyQueries,
} from "@/api";
import { RatesTable } from "@/components/plut/RatesTable";

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/admin/giftcards/catalog/rates")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(rateQueries.list({ Page: 1, PageSize: DEFAULT_PAGE_SIZE, ActiveOnly: true }));
    qc.prefetchQuery(brandQueries.list());
    qc.prefetchQuery(countryQueries.list());
    qc.prefetchQuery(fxRateQueries.current());
    qc.prefetchQuery(payoutCurrencyQueries.list());
    import("@/components/plut/SetRateDialog.body");
  },
  component: RatesTab,
});

function RatesTab() {
  return <RatesTable />;
}
