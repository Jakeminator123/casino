// Avatarer (/avatarer/): the ways from pictures of a person to a doll on our skeleton, as a guide (components/avatars).
// Only in the studio on his computer: it reads avatar-auto-pipeline and the disk through the server.
import { AvatarsView } from "@/components/avatars/AvatarsView";
import { Page } from "@/components/shell";
import { EmptyState } from "@/components/ui";
import { isSnapshot } from "@/lib/mode";

export default function Avatarer() {
  if (isSnapshot)
    return (
      <Page title="Avatarer">
        <EmptyState title="Avatarerna finns inte i kopian">De byggs och läses på Jakobs dator.</EmptyState>
      </Page>
    );
  return <AvatarsView />;
}
