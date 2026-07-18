import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppConnection } from "@/components/plut/WhatsAppConnection";

export const Route = createFileRoute("/_app/admin/sourcing/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Plut Admin" }] }),
  component: WhatsAppTab,
});

function WhatsAppTab() {
  return <WhatsAppConnection />;
}
