"use client";

// A workshop with a server of its own (lib/workshops.ts), shown inside the studio: the studio's menu on the left, the
// workshop's own page filling the rest. Opening the view starts the workshop's server if it does not answer yet (the
// studio's server starts it without a window and stops it when it stops itself); one that already answers is used as it
// is. The view's own words in the address (everything but dealer and robot) go on to the workshop's page, so that
// /studio/dockan/?docka=frasse opens the editor with Frasse.
import { ExternalLink, RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Page } from "../shell";
import { Button, ErrorState, Spinner, buttonClasses } from "../ui";
import { startWorkshop, WORKSHOP_WORDS, type WorkshopId, type WorkshopState } from "../../lib/workshops.ts";


const OWN = new Set(["dealer", "robot"]);

function Frame({ id }: { id: WorkshopId }) {
  const words = WORKSHOP_WORDS[id];
  const params = useSearchParams();
  const [state, setState] = useState<WorkshopState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);


  useEffect(() => {
    let live = true;
    setError(null);
    startWorkshop(id)
      .then((s) => { if (!live) return; if (s.answers) setState(s); else setError(s.error ?? `${words.running} svarar inte.`); })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [id, round, words.running]);

  const again = useCallback(() => { setState(null); setRound((n) => n + 1); }, []);
  const passed = new URLSearchParams();
  params.forEach((value, key) => { if (!OWN.has(key)) passed.append(key, value); });
  const src = state ? `${state.address}${passed.size ? `?${passed}` : ""}` : null;

  return (
    <Page
      title={words.title}
      full
      status={state ? <span>går</span> : error ? <span className="text-[#ef8b8b]">svarar inte</span> : <span>startar …</span>}
      actions={
        <>
          <Button size="sm" variant="quiet" onClick={again} title="Läs om sidan" icon={<RotateCw />}>
            Ladda om
          </Button>
          {src ? (
            <a href={src} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })} title="Samma sida i en egen flik, utan studions meny">
              <ExternalLink className="size-4" />
              Egen flik
            </a>
          ) : null}
        </>
      }
    >
      {src ? (
        <iframe key={round} src={src} title={words.running} className="absolute inset-0 size-full border-0 bg-well" allow="fullscreen" />
      ) : error ? (
        <div className="grid h-full place-items-center p-6">
          <ErrorState title={`${words.running} gick inte att starta`} error={error} onRetry={again} />
        </div>
      ) : (
        <div className="grid h-full place-items-center">
          <div className="flex items-center gap-3 text-sm text-dim">
            <Spinner />
            {words.starting}
          </div>
        </div>
      )}
    </Page>
  );
}

export function WorkshopView({ id }: { id: WorkshopId }) {
  return (
    <Suspense fallback={<Page title={WORKSHOP_WORDS[id].title} full />}>
      <Frame id={id} />
    </Suspense>
  );
}
