"use client";

// Karta's two views (components/map/KartaView.tsx): Träden (a dealer's trees with their films) and Schemat (the motion scheme
// of the dolls, components/schemat/SchemaView.tsx), in the address as ?vy=trad|schema. The words of the other view are left
// behind when he changes, so that a link opens one view only. In Schemat's header both views stand as a switch; the trees'
// header is full already, so there one small button leads to Schemat.
import { Workflow } from "lucide-react";
import { Button, SegmentedControl } from "../ui";

const TREE_WORDS = ["trad", "steg", "kant", "tagning", "vag", "kamera", "replik", "komposition", "plats"];
const SCHEMA_WORDS = ["docka", "stadium", "rorelse", "ankare", "kortplats"];

export type KartaVy = "trad" | "schema";

export function goKartaVy(vy: KartaVy) {
  const p = new URLSearchParams(window.location.search);
  for (const k of vy === "schema" ? TREE_WORDS : SCHEMA_WORDS) p.delete(k);
  p.set("vy", vy);
  window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
}

const SCHEMA_TITLE = "Rörelseschemat: ankarena, rörelserna mellan dem och vad som finns för varje docka";

export function SchemaSwitch({ value }: { value: KartaVy }) {
  if (value === "trad")
    return (
      <Button size="sm" variant="secondary" icon={<Workflow />} onClick={() => goKartaVy("schema")} title={SCHEMA_TITLE} className="mr-1">
        Schemat
      </Button>
    );
  return (
    <SegmentedControl
      size="sm"
      label="Karta"
      value={value}
      onChange={goKartaVy}
      options={[
        { value: "trad", label: "Träden", title: "Dealerns träd med filmerna, steg för steg" },
        { value: "schema", label: "Schemat", title: SCHEMA_TITLE },
      ]}
    />
  );
}
