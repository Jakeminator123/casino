// Kortpaketet (/kortpaketet/): the bought animation pack's viewer inside the studio (components/workshop), started when
// the view opens. It lies beside the work (the root AGENTS.md): not the ground of the doll's motions. Only in the studio
// on his computer.
import { Page } from "@/components/shell";
import { EmptyState } from "@/components/ui";
import { WorkshopView } from "@/components/workshop/WorkshopView";
import { isSnapshot } from "@/lib/mode";

export default function Kortpaketet() {
  if (isSnapshot)
    return (
      <Page title="Kortpaketet">
        <EmptyState title="Kortpaketet finns inte i kopian">Det köpta paketet följer aldrig med ut.</EmptyState>
      </Page>
    );
  return <WorkshopView id="kortpaketet" />;
}
