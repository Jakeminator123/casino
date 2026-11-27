"use client";

// <ProofGrid proofs={list} named={named} notes={notes} cards={cards} onRemoved={read} />: the proof folders as cards, in
// groups by area (lib/proof-areas.ts: Rörelser, Ansikte och händer, Filmer, Bord och kamera, Avatarer, Studion, and those
// without one last), newest first within a group, and a search field. Over them how many proofs there are, how many are
// without his verdict, how many a card in Beslut asks about, and how much room they take. A card: a still, the title (with
// a second line that tells it apart where another proof has the same title), how many films and pictures, the takes'
// verdicts counted (lib/verdict.ts: underlag is not counted), how many places Jakob has said something about, where it
// stands for him (lib/proof-areas.ts standing) and its size; and "Radera provet", which asks first, the same question as
// Biblioteket's (components/bibliotek/RaderaFraga.tsx), and then deletes the proof from the disk on his click, no trash
// (tools/lager-remove.ts). His notes are never removed with it.
import { Film, MessageSquare, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Proof } from "../../lib/api.ts";
import { RaderaFraga } from "../bibliotek/RaderaFraga";
import { countLine, coverOf, matchProof, proofDay, proofHref, proofTitle, sortProofs, verdictTally } from "../../lib/proofs.ts";
import { PROOF_VERDICT_LABEL, splitLabel, type ProofVerdict } from "../../lib/verdict.ts";
import { notesOn, type ShownNote } from "../../lib/proof-notes.ts";
import { byArea, domOf, domTone, externOf, oense, proofBytes, proofsLine, sizeWord, standing, STANDING_WORD, telling, type Standing } from "../../lib/proof-areas.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { Badge, EmptyState, IconButton, TextField, cn } from "../ui";
import { ProofStill } from "./ProofStill";
import { waitingIn, type NamedTakes } from "./ProofTakes";

const TALLY: { verdict: ProofVerdict; sign: string; tone: string }[] = [
  { verdict: "ok", sign: "✓", tone: "text-[#6cc595]" },
  { verdict: "remarks", sign: "!", tone: "text-[#f0b07a]" },
  { verdict: "failed", sign: "✕", tone: "text-[#ef8b8b]" },
  { verdict: "unreviewed", sign: "○", tone: "text-faint" },
];
const STANDING_TONE: Record<Standing, string> = { vantar: "bg-brass/90 text-brass-ink", domt: "bg-godkand/25 text-[#8fdcb2]", utan: "bg-black/65 text-brass-hi" };

type Card = { proof?: string; answer: unknown };

function ProofCard({ proof, waiting, said, stand, shared, onRemove }: { proof: Proof; waiting: number; said: number; stand: Standing; shared: boolean; onRemove: (p: Proof) => void }) {
  const cover = coverOf(proof);
  const films = proof.files.filter((f) => f.kind === "video").length;
  const tally = verdictTally(proof);
  const { name: title, rest } = splitLabel(proofTitle(proof));
  const second = telling(proof, rest, shared);
  const day = proofDay(proof);
  // The judge's verdict in his place (the skill doma): its own chip, never his; where the two judges disagree the card is marked.
  const dom = domOf(proof), extern = externOf(proof), split = oense(proof);
  return (
    <div className="group relative h-full">
      <Link
        href={proofHref(proof.id)}
        className={cn("flex h-full flex-col overflow-hidden rounded-lg border bg-surface shadow-inset transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-raised/50 focus-visible:outline-offset-2", split ? "border-[#f0b07a]/70" : "border-line")}
      >
        <div className="relative">
          <ProofStill cover={cover} fps={proof.fps} className="aspect-16/10 transition-[filter] duration-200 group-hover:brightness-110" />
          <span className={cn("pointer-events-none absolute left-2 top-2 rounded-xs px-1.5 py-0.5 text-2xs font-medium backdrop-blur-sm", STANDING_TONE[stand])}>
            {stand !== "domt" && waiting ? (waiting === 1 ? "1 tagning väntar på dig" : `${waiting} tagningar väntar på dig`) : STANDING_WORD[stand]}
          </span>
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-xs bg-black/65 px-1.5 py-0.5 text-2xs font-medium text-ink backdrop-blur-sm">
            {films ? <><Film className="size-3" /> {films} ·</> : null} {sizeWord(proofBytes(proof))}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3 pt-2.5">
          <span className="line-clamp-2 text-sm font-semibold leading-5 text-ink" title={proofTitle(proof)}>
            {title}
          </span>
          {second ? <span className="line-clamp-2 text-xs leading-4 text-dim">{second}</span> : null}
          {dom || split ? (
            <span className="flex flex-wrap items-center gap-1" title="Domarens ord, inte dina: din dom ersätter den.">
              {split ? <Badge tone="remark" size="sm">Domarna är oense</Badge> : null}
              {dom ? <Badge tone={domTone(dom)} size="sm">Domaren: {dom}</Badge> : null}
              {extern ? <Badge tone={domTone(extern)} size="sm">Extern domare: {extern}</Badge> : null}
            </span>
          ) : null}
          <span className="mt-auto flex items-center gap-2 text-xs text-faint">
            <span className="truncate">{[countLine(proof), day].filter(Boolean).join(" · ")}</span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {said ? (
                <span title={`${isSnapshot ? "Jakob har" : "Du har"} sagt något om ${said === 1 ? "en sak" : `${said} saker`} i provet`} className="inline-flex items-center gap-0.5 font-medium tabular-nums text-brass-hi [&_svg]:size-3">
                  <MessageSquare /> {said}
                </span>
              ) : null}
              {TALLY.filter((t) => tally[t.verdict]).map((t) => (
                <span key={t.verdict} title={`${PROOF_VERDICT_LABEL[t.verdict]}: ${tally[t.verdict]}`} className={cn("font-medium tabular-nums", t.tone)}>
                  {t.sign} {tally[t.verdict]}
                </span>
              ))}
            </span>
          </span>
        </div>
      </Link>
      {isSnapshot ? null : (
        <IconButton
          label="Radera provet"
          icon={<Trash2 />}
          size="sm"
          onClick={() => onRemove(proof)}
          className="absolute right-2 top-2 bg-black/60 text-soft opacity-0 backdrop-blur-sm transition-opacity hover:text-[#ef8b8b] focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
        />
      )}
    </div>
  );
}

export function ProofGrid({ proofs, named, notes, cards, onRemoved }: { proofs: readonly Proof[]; named: NamedTakes; notes: readonly ShownNote[]; cards: readonly Card[]; onRemoved: () => void }) {
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState<Proof | null>(null);
  const sorted = useMemo(() => sortProofs(proofs), [proofs]);
  const shown = useMemo(() => sorted.filter((p) => matchProof(p, query)), [sorted, query]);
  const standOf = (p: Proof) => standing(p.id, cards, notesOn(notes, p.id));
  // A title more than one proof has ("Standarddockan" five times): those cards get a second line that tells them apart.
  const titles = useMemo(() => { const n = new Map<string, number>(); for (const p of proofs) { const t = splitLabel(proofTitle(p)).name; n.set(t, (n.get(t) ?? 0) + 1); } return n; }, [proofs]);
  const room = proofs.reduce((s, p) => s + proofBytes(p), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <TextField
          aria-label="Sök bland proven"
          placeholder="Sök: titel, mapp eller ord i beskrivningen"
          icon={<Search />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          wrapperClassName="w-[380px] max-w-full"
        />
        <span className="text-sm text-faint tabular-nums">
          {query.trim() ? `${shown.length} av ${proofs.length} prov` : proofsLine(proofs.map(standOf), room, { falld: proofs.filter((p) => domOf(p) === "Inte bra").length, oense: proofs.filter(oense).length })}
        </span>
      </div>
      {shown.length ? (
        byArea(shown).map((group) => (
          <section key={group.word} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold uppercase tracking-widest text-faint">
              {group.word}
              <span className="text-xs font-normal normal-case tracking-normal">
                {group.proofs.length} prov · {sizeWord(group.proofs.reduce((s, p) => s + proofBytes(p), 0))}
              </span>
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {group.proofs.map((p) => (
                <li key={p.id}>
                  <ProofCard proof={p} waiting={waitingIn(p, named)} said={notesOn(notes, p.id)} stand={standOf(p)} shared={(titles.get(splitLabel(proofTitle(p)).name) ?? 0) > 1} onRemove={setAsking} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState compact title="Inget prov matchar">
          Prova ett annat ord.
        </EmptyState>
      )}
      <RaderaFraga id={asking ? `blackjack-dealer/assets/proofs/${asking.id}` : null} onClose={() => setAsking(null)} onDone={() => { setAsking(null); onRemoved(); }} />
    </div>
  );
}
