"use client";

// Mått (/matt/): the measures, in two parts chosen at the top (?del=livebordet for the second).
// - Alla mått: every measure in one place, as the repo's MATT.md has it, read anew from the code each time the view opens
//   (lib/measures.ts): the cameras, the table and what stands on it, where the cards land, the dolls, the motions and the
//   motion catalogue, each beside what was measured at the live table. The parts of the text are a row of buttons at the top.
// - Livebordet: our standard set-up beside the clone of the live table, in pictures and in numbers (SetupCompare).
import { RotateCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Page } from "../shell";
import { Button, ErrorState, SegmentedControl, Skeleton } from "../ui";
import { getMeasures, measureSections, type Section } from "../../lib/measures.ts";
import { choiceName } from "../../lib/uppsattning-val.ts";
import { MeasureBlock } from "./MeasureText";
import { SetupCompare } from "./SetupCompare";

type Part = "tal" | "livebordet";
const PARTS = [
  { value: "tal" as const, label: "Alla mått" },
  { value: "livebordet" as const, label: `${choiceName("live")} och ${choiceName("forra").toLowerCase()}` },
];

function AllMeasures({ round }: { round: number }) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [again, setAgain] = useState(0);
  useEffect(() => {
    let live = true;
    getMeasures()
      .then((m) => { if (live) { setSections(measureSections(m.block)); setError(null); } })
      .catch((e: Error) => { if (live) setError(e); });
    return () => { live = false; };
  }, [round, again]);
  if (error) return <ErrorState title="Måtten gick inte att läsa" error={error} onRetry={() => setAgain((n) => n + 1)} />;
  if (!sections)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3 rounded-md" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Delarna" className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button key={s.id} type="button" onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-dim transition-colors hover:border-line-strong hover:text-ink">
            {s.title.replace(/^\d+\.\s*/, "")}
          </button>
        ))}
      </nav>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="flex scroll-mt-4 flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">{s.title}</h2>
          {s.blocks.map((b, i) => <MeasureBlock key={i} block={b} />)}
        </section>
      ))}
    </div>
  );
}

function Measures() {
  const params = useSearchParams();
  const router = useRouter();
  const part: Part = params.get("del") === "livebordet" ? "livebordet" : "tal";
  const [round, setRound] = useState(0);
  const [readAt, setReadAt] = useState(() => new Date());
  const again = useCallback(() => { setRound((n) => n + 1); setReadAt(new Date()); }, []);
  const choose = (next: Part) => router.replace(next === "tal" ? "/matt/" : `/matt/?del=${next}`);
  const time = readAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return (
    <Page
      title="Mått"
      status={<span>ur koden, läst {time}</span>}
      actions={
        <>
          <SegmentedControl size="sm" label="Måttens delar" value={part} onChange={choose} options={PARTS} />
          <Button size="sm" variant="quiet" icon={<RotateCw />} onClick={again} title="Läs måtten ur koden igen">
            Läs om
          </Button>
        </>
      }
    >
      {part === "tal" ? <AllMeasures round={round} /> : <SetupCompare key={round} />}
    </Page>
  );
}

export function MeasuresView() {
  return (
    <Suspense fallback={<Page title="Mått" />}>
      <Measures />
    </Suspense>
  );
}
