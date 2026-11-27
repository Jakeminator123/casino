// The browser tab's title says the page (Jakob 2026-11-27: the tabs all said the same): "Karta · Studio". Page.tsx renders it
// with its title; React puts a <title> rendered anywhere into the document's head. The root layout gives no title of its own,
// so that this one is the tab's.
export function TabTitle({ title }: { title: string }) {
  return <title>{`${title} · Studio`}</title>;
}
