"use client";

// <RaderaFraga id={enhet} onClose onDone />: frågan före en radering på hans klick, i Biblioteket och i Granska, Prov: vad som
// raderas, följden i hans ord och det som rättas i samma steg (GET /api/lager/fraga, tools/lager-remove.ts). Det skyddade
// kräver ett andra klick ("Klicka igen: radera på riktigt"); det vägrade och det som aldrig raderas säger varför och har
// ingen knapp. Raderat är borta från datorn, utan papperskorg.
import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Spinner, cn, useToast } from "../ui";
import { getFraga, radera, storlek, type Fraga } from "../../lib/bibliotek.ts";

/** Frågan före en radering: följden i hans ord; det skyddade kräver ett andra klick. */
export function RaderaFraga({ id, onClose, onDone }: { id: string | null; onClose: () => void; onDone: () => void }) {
  const [fraga, setFraga] = useState<Fraga | null>(null);
  const [fel, setFel] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setFraga(null); setFel(null); setArmed(false);
    if (!id) return;
    let live = true;
    getFraga(id).then((f) => { if (live) setFraga(f); }, (e: Error) => { if (live) setFel(e.message); });
    return () => { live = false; };
  }, [id]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const go = async () => {
    if (!fraga) return;
    if (fraga.niva === "skyddad" && !armed) { setArmed(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setArmed(false), 6000); return; }
    setBusy(true);
    try {
      const r = await radera(fraga.id, fraga.niva === "skyddad");
      if (r.vagrat) toast({ tone: "bad", title: "Det finns kvar", detail: r.vagrat });
      else toast({ tone: "ok", title: `Raderat: ${fraga.namn}`, detail: [`${storlek(r.bytes)} borta från datorn.`, ...r.rattat].join(" ") });
      onDone();
    } catch (e) { toast({ tone: "bad", title: "Det gick inte att radera", detail: (e as Error).message }); }
    finally { setBusy(false); }
  };
  const kan = fraga && (fraga.niva === "fri" || fraga.niva === "skyddad");
  return (
    <Dialog
      open={!!id}
      onOpenChange={(open) => { if (!open && !busy) onClose(); }}
      title={fraga ? `Radera ${fraga.namn}?` : "Radera?"}
      description={fraga && fraga.files ? `${fraga.files} ${fraga.files === 1 ? "fil" : "filer"} · ${storlek(fraga.bytes)}` : undefined}
      width={500}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={busy}>{kan ? "Behåll" : "Stäng"}</Button>
          {kan ? <Button variant="danger" loading={busy} onClick={() => void go()}>{fraga!.niva === "skyddad" ? (armed ? "Klicka igen: radera på riktigt" : "Radera") : "Radera"}</Button> : null}
        </>
      }
    >
      {fel ? <p className="text-sm text-[#ef8b8b]">{fel}</p> : !fraga ? <span className="flex items-center gap-2 text-sm text-dim"><Spinner size="sm" />Ser efter vad som händer …</span> : (
        <div className="flex flex-col gap-3 text-sm leading-5">
          {fraga.vagras ? <p className="flex gap-2 rounded-md border border-line-strong bg-raised p-3 text-soft"><Lock className="mt-0.5 size-4 shrink-0 text-faint" />{fraga.vagras}</p> : null}
          {fraga.orsaker.length ? (
            <ul className="flex flex-col gap-1.5">
              {fraga.orsaker.map((o) => <li key={o.text} className={cn("flex gap-2", o.skyddar ? "text-ink" : "text-dim")}><span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", o.skyddar ? "bg-underkand" : "bg-line-hi")} />{o.text}</li>)}
            </ul>
          ) : null}
          {fraga.rattas.length ? <p className="text-dim">I samma steg: {fraga.rattas.join(" ")}</p> : null}
          {kan ? <p className="text-dim">Raderas från datorn, utan papperskorg.</p> : null}
        </div>
      )}
    </Dialog>
  );
}
