"use client";

// <DomarePanel proof={proof} />: the independent judge's verdict on an open proof (proof.json domare, the skill doma: "Föra in
// domen"), set apart from his own word: its verdict as a chip of its own, its three reasons, what it would correct, and the
// external voice beside it where there is one. Where the two disagree it says so first. The judge's words are never his: the
// panel says that his verdict replaces it, and his own (NoteBar) is never filled in for him.
import type { DomarSkal, Proof } from "../../lib/api.ts";
import { domOf, domTone, externOf, oense, skalText } from "../../lib/proof-areas.ts";
import { Badge, cn } from "../ui";

function Lista({ rubrik, rader }: { rubrik: string; rader: readonly DomarSkal[] | undefined }) {
  const text = (rader ?? []).map(skalText).filter(Boolean);
  if (!text.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-medium uppercase tracking-widest text-faint">{rubrik}</span>
      <ul className="flex flex-col gap-1 text-sm leading-5 text-soft">
        {text.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-line-hi" />{t}</li>)}
      </ul>
    </div>
  );
}

export function DomarePanel({ proof }: { proof: Proof }) {
  const d = proof.domare;
  const dom = domOf(proof), extern = externOf(proof), split = oense(proof);
  if (!d || (!dom && !extern)) return null;
  return (
    <section aria-label="Domarens dom" className={cn("flex max-w-4xl flex-col gap-3 rounded-lg border p-4", split ? "border-[#f0b07a]/60 bg-[#3a2a1a]/40" : "border-line bg-surface/60")}>
      <div className="flex flex-wrap items-center gap-2">
        {split ? <Badge tone="remark">Domarna är oense: titta själv</Badge> : null}
        {dom ? <Badge tone={domTone(dom)}>Domaren: {dom}</Badge> : null}
        {extern ? <Badge tone={domTone(extern)}>Extern domare: {extern}</Badge> : null}
        <span className="text-xs text-faint">Domarens ord, inte dina: din dom ersätter den.</span>
      </div>
      <div className={cn("grid gap-4", d.extern ? "md:grid-cols-2" : "")}>
        <div className="flex flex-col gap-3">
          <Lista rubrik={d.extern ? "Domarens skäl" : "Skälen"} rader={d.skal?.slice(0, 3)} />
          <Lista rubrik="Det domaren skulle rätta" rader={d.ratta} />
        </div>
        {d.extern ? (
          <div className="flex flex-col gap-3">
            <Lista rubrik="Den externa domarens skäl" rader={d.extern.skal?.slice(0, 3)} />
            <Lista rubrik="Det den externa domaren skulle rätta" rader={d.extern.ratta} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
