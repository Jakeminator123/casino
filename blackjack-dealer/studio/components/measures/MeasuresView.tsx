"use client";

// Mått (/matt/): every measure in one place, as the repo's MATT.md has it, read anew from the code each time the view opens
// (lib/measures.ts): the camera, the table and what stands on it, where the cards land, the dolls, the motions and the
// motion catalogue, each beside what was measured at the live table. The parts of the text are a row of buttons at the top.
import { RotateCw } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Page } from "../shell";
import { Button, ErrorState, Skeleton } from "../ui";
import { getMeasures, measureSections, type Section } from "../../lib/measures.ts";
import { MeasureBlock } from "./MeasureText";

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
  const [round, setRound] = useState(0);
  const [readAt, setReadAt] = useState(() => new Date());
  const again = useCallback(() => { setRound((n) => n + 1); setReadAt(new Date()); }, []);

  const time = readAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return (
    <Page
      title="Mått"
      status={<span>läst {time}</span>}
      actions={
        <Button size="sm" variant="quiet" icon={<RotateCw />} onClick={again} title="Läs måtten ur koden igen">
          Läs om
        </Button>
      }
    >
      <AllMeasures round={round} />
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
