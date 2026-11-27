// Spegla (/spegla/): Youtubefilmen och vår vy av samma giv på varandra, i samma takt (components/spegla). Only in the studio on
// his computer: the film lies there and the server streams it; the online copy has neither. The view reads the address, so
// it sits inside Suspense: in a static export the page is built without a query and the view is drawn in the browser.
import { Suspense } from "react";
import { Page } from "@/components/shell";
import { SpeglaView } from "@/components/spegla/SpeglaView";
import { EmptyState } from "@/components/ui";
import { isSnapshot } from "@/lib/mode";

export default function Spegla() {
  if (isSnapshot)
    return (
      <Page title="Spegla">
        <EmptyState title="Spegla finns inte i kopian">Den går på Jakobs dator.</EmptyState>
      </Page>
    );
  return (
    <Suspense fallback={<Page title="Spegla" full />}>
      <SpeglaView />
    </Suspense>
  );
}
