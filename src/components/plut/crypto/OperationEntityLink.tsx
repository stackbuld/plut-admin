import { Link } from "@tanstack/react-router";
import { truncId } from "@/lib/format";

/**
 * Cross-links an operation's EntityRef to the natural detail page for that entity type, where one
 * already exists in plut-admin — this is what makes the generic Operations Explorer actually
 * useful instead of a raw table of GUIDs (09-OPERATIONS_EXPLORER.md §2).
 *
 * EntityRef meaning per CryptoOperationType (confirmed by reading crypto-service's step
 * implementations, not guessed):
 *  - BinanceSubAccountProvisioning → userId (CreateSubAccountStep.cs, ShareKycDataStep.cs) →
 *    linked to the shipped Sub-Accounts detail page.
 *  - BinanceWithdrawalSubmission → CryptoWithdrawal id (SweepToMasterStep.cs,
 *    BroadcastWithdrawalStep.cs) → no admin route for this yet (docs' 04-WITHDRAWALS.md is
 *    unbuilt) — rendered as plain text below until that screen ships.
 *  - CryptoBuySettlement / CryptoSellSettlement / CryptoSwapTwoLegExecution → CryptoTransaction id
 *    (LedgerSettleBuyStep.cs, LedgerSettleSellStep.cs, SwapLeg1SellStep.cs) → no
 *    transactions-explorer route exists yet either (05-TRANSACTIONS_EXPLORER.md is unbuilt) —
 *    also plain text for now.
 *
 * Extend the switch below with a real `<Link>` once those screens ship.
 */
export function OperationEntityLink({
  operationType,
  entityRef,
}: {
  operationType: string;
  entityRef: string;
}) {
  if (operationType === "BinanceSubAccountProvisioning") {
    return (
      <Link
        to="/admin/crypto/subaccounts/$userId"
        params={{ userId: entityRef }}
        className="font-mono text-[11px] text-primary hover:underline"
      >
        {truncId(entityRef, 22)}
      </Link>
    );
  }

  return <span className="font-mono text-[11px]">{truncId(entityRef, 22)}</span>;
}
