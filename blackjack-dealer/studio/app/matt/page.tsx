// Mått (/matt/): every measure as the code has it now (components/measures). Only in the studio on his computer: the
// measures are read by the server out of the code each time.
import { MeasuresView } from "@/components/measures/MeasuresView";
import { Page } from "@/components/shell";
import { EmptyState } from "@/components/ui";
import { isSnapshot } from "@/lib/mode";

export default function Matt() {
  if (isSnapshot)
    return (
      <Page title="Mått">
        <EmptyState title="Måtten finns inte i kopian">De läses ur koden på Jakobs dator.</EmptyState>
      </Page>
    );
  return <MeasuresView />;
}
