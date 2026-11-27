// Dockan (/dockan/): standarddockans editor inside the studio (components/workshop), started when the view opens. Only in
// the studio on his computer: the online copy has no editor behind it.
import { Page } from "@/components/shell";
import { SpeglaLank } from "@/components/spegla/SpeglaLank";
import { EmptyState } from "@/components/ui";
import { WorkshopView } from "@/components/workshop/WorkshopView";
import { isSnapshot } from "@/lib/mode";

export default function Dockan() {
  if (isSnapshot)
    return (
      <Page title="Dockan">
        <EmptyState title="Dockans editor finns inte i kopian">Den går på Jakobs dator.</EmptyState>
      </Page>
    );
  return <WorkshopView id="editorn" actions={<SpeglaLank />} />;
}
