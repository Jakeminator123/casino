// Karta (/karta/): Schemat, the dolls' motion scheme: anchors, stages and motions with what exists for Danilo and Frasse
// (components/schemat). The view reads the address, so it sits inside Suspense: in a static export the page is built
// without a query and the view is drawn in the browser.
import { Suspense } from "react";
import { SchemaView } from "@/components/schemat/SchemaView";
import { Page } from "@/components/shell";
import { Skeleton } from "@/components/ui";
import { ViewContext } from "@/lib/context";

export default function Karta() {
  return (
    <Suspense
      fallback={
        <Page title="Karta" full>
          <div className="grid h-full place-items-center p-10">
            <Skeleton className="h-[60%] w-[80%]" />
          </div>
        </Page>
      }
    >
      <ViewContext vy="karta" />
      <SchemaView />
    </Suspense>
  );
}
