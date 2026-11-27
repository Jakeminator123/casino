// Biblioteket (/bibliotek/): allt som lagras i repot, per slag, och raderingen på hans klick (components/bibliotek). Bara i
// studion på hans dator: kartan läses av servern ur disken.
import type { Metadata } from "next";
import { BibliotekView } from "@/components/bibliotek/BibliotekView";
import { Page } from "@/components/shell";
import { EmptyState } from "@/components/ui";
import { isSnapshot } from "@/lib/mode";

export const metadata: Metadata = { title: "Dealer Studio · Biblioteket" };

export default function Bibliotek() {
  if (isSnapshot)
    return (
      <Page title="Biblioteket">
        <EmptyState title="Biblioteket finns inte i kopian">Det läses ur disken på Jakobs dator.</EmptyState>
      </Page>
    );
  return <BibliotekView />;
}
