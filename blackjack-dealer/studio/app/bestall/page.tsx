// Beställ (/bestall/?order=<id>): the orders to Runway, the queue and one order open to send (components/order).
// The view reads the address, so it sits inside Suspense.
import { Suspense } from "react";
import { OrderView } from "@/components/order/OrderView";
import { Page } from "@/components/shell";

export default function Bestall() {
  return (
    <Suspense fallback={<Page title="Beställ" full />}>
      <OrderView menu={null} />
    </Suspense>
  );
}
