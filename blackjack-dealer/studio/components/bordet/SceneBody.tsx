"use client";

// Bordet's live picture (modes Scen, Råfilm and Efterarbete), in the same frame as Inspelning: the toolbar on top, the stage as
// large as the window allows, one column on the right where things are changed. Since 2026-11-17 it is the whole of the
// view Scen (whose address / now leads here): a round plays large in the lab's 3D scene, or as the films are on their green
// (Råfilm), with one transport; under it the round as a strip of its steps; over it the presets (Basgrund, Levande,
// Rumsstudien, his own; not on a flat picture, where they do nothing); in the column the rounds to play and every key of
// the scene but the cards' and chips' (Scen), the rounds alone (Råfilm), or only what is laid over the film (Efterarbete:
// "Kort och marker", with the cards' bend and gloss in the plan; Jakob 2026-11-17: their look is changed only there). One
// scene: the stage builds it and the editor (components/scene-editor) drives that same object, so it stays when Scen and
// Efterarbete change places.
// The address is Scen's: the round (?runda=<his notation>, ?kant=<edge>&tagning=<take> to play a take where it belongs)
// and the look (?forval=levande&dust=0.8, components/scene-editor/address.ts), written beside Bordet's own words (lage,
// plats). Without a round in the address it plays the chosen card's deal and back from the anchor Inspelning's card goes from
// (the guide tree's) where the bank has that round, else from the anchor the game deals it from ("A2.1 - P4C1 - A2.1";
// Paow's seat 6 "A2.2 - P6C1 - A2.2", lib/bordet.ts roundFor, hasRound); without a look, the saved Casino preset, what the
// game shows (Jakob 2026-11-17: "Spela i casino bör rimligtvis vara samma som i casino, alltså som det är i runtime"), so
// "Prova i Casino" opens what the rail's Casino opens until a key is changed. The round plays the chosen dealer's films
// (lib/bank.ts); a step without a film is a gap, shown as one.
// The lens (Standard or Bred lins) is the look's key lins, under Bord in the column like every other key (Jakob 2026-11-25:
// Bred lins is a filter on the same standard), live in the scene and saved with the look; an older address's
// geometri=lins|kontrakt is read as that key and written as it.
// The actions, in this order: Prova i Casino plays this look, its lens with it, in the Casino and saves nothing; Använd i
// Casino saves it as Casino's look (the rail's Casino plays it); Publicera sends nothing: a note says that publishing rests
// until he says so in the chat, with a link to the Casino on the net. The online copy has neither of the last two.
// Loaded only when one of the three is chosen (Bordet loads it on demand), so that Inspelning stays light.
import { Copy, Globe, Spade, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resolveRound } from "../../../src/clip-graph.ts";
import { countWord } from "../../../src/dealer-trees.ts";
import { LINS_ALIAS_WORD } from "../../../src/card-plan.ts";
import { sceneWords } from "../../lib/bordet.ts";
import { useBank } from "../../lib/bank.ts";
import { ONLINE_CASINO } from "../../lib/casino.ts";
import { stepFacts, useViewContext } from "../../lib/context.ts";
import { openingRound, ownSteps, withDealer } from "../../lib/dealer.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { formatJakob } from "../../lib/names.ts";
import { partsOf } from "../../lib/parts.ts";
import { addressOf, contextRound, readAddress, readyRounds, roundFacts, roundFromText, type Round } from "../../lib/rounds.ts";
import { CASINO_PRESET } from "../../lib/scene-presets.ts";
import { readSceneCardTrial, withSceneCardTrial } from "../../lib/scene-card-trial.ts";
import { firstTree, useTrees } from "../map/useTrees";
import { RoundPicker, RoundStrip } from "../round";
import { joinParts, readLook, roundPart, useSceneEditor } from "../scene-editor";
import { ROUND_WORDS } from "../scene-editor/address.ts";
import { Stage, createClock, type StageHandle } from "../stage";
import { Button, Dialog, ErrorState, IconButton, Skeleton, Tooltip, buttonClasses, useToast } from "../ui";

export type SceneKind = "scen" | "rafilm" | "efterarbete";

/** Scen's words of an address (the round's and the look's, the lens's older word too), without Bordet's own. */
function scenePart(all: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams();
  all.forEach((value, key) => {
    if ((sceneWords.has(key) || key === LINS_ALIAS_WORD) && key !== "vy") p.append(key, value);
  });
  return p;
}

/** The look an address asks for; with no look of its own (the lens's older word aside) Casino's saved look, what the game shows. */
function lookOf(p: URLSearchParams) {
  if ([...p.keys()].some((k) => !ROUND_WORDS.includes(k) && k !== LINS_ALIAS_WORD)) return readLook(p);
  const casino = new URLSearchParams(p);
  casino.set("forval", CASINO_PRESET);
  return readLook(casino);
}

export function SceneBody({ kind, toolbar, roundText: cardRound }: { kind: SceneKind; toolbar: ReactNode; roundText: string }) {
  const search = useSearchParams();
  const searchText = search.toString();
  const query = scenePart(new URLSearchParams(searchText)).toString();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const toast = useToast();
  const { graph, status, error, reload, dealer, dealers, owners, readAt } = useBank();
  const tree = firstTree(useTrees(dealer, readAt).answer);
  const rounds = useMemo(() => readyRounds(graph), [graph]);
  const [address, setAddress] = useState(() => readAddress(params));
  // The round's words of the address as they stand, until a round is chosen here.
  const [roundText, setRoundText] = useState(() => new URLSearchParams(roundPart(params)).toString());
  const [chosen, setChosen] = useState<Round | null>(null);
  const [clock] = useState(() => createClock());
  const stage = useRef<StageHandle>(null);
  const editor = useSceneEditor(() => lookOf(params));
  const perspective = editor.lins === "bred" ? "Bred lins" : "Standard";
  const [publishNote, setPublishNote] = useState(false);

  // The address changed from outside (a link, back and forth in the history): it decides again. What this body wrote itself
  // is already on screen.
  const [seen, setSeen] = useState(query);
  const [written, setWritten] = useState<string | null>(null);
  if (query !== seen) {
    setSeen(query);
    if (query !== written) {
      setAddress(readAddress(params));
      setChosen(null);
      setRoundText(new URLSearchParams(roundPart(params)).toString());
      editor.ask(lookOf(params));
    }
  }

  const round = useMemo<Round | null>(() => {
    if (chosen) return chosen;
    const asked = address.asked;
    if (asked.kind === "runda") return roundFromText(asked.text, rounds);
    if (asked.kind === "kant") return graph ? contextRound(graph, asked.edge, asked.take) : null;
    // No round asked: the chosen card's deal and back; when that round cannot be read, the ready round that plays most of
    // the dealer's films.
    const own = roundFromText(cardRound, rounds);
    if (!own.errors.length || !graph) return own;
    return openingRound(graph, rounds, owners) ?? own;
  }, [chosen, address, graph, rounds, owners, cardRound]);

  const { plan, places, placesRead } = editor;
  const segments = useMemo(
    () => (graph && placesRead && round?.steps.length ? resolveRound(graph, ownSteps(round.steps, graph.dealer, owners), { holeCardDown: true, places }) : []),
    [graph, placesRead, round, places, owners],
  );
  const lins = editor.lins;
  const parts = useMemo(() => {
    const parts = partsOf(segments), words = readSceneCardTrial(new URLSearchParams(searchText));
    return plan ? withSceneCardTrial(parts, segments, plan, lins, words ?? {}, words ? "film" : null) : parts;
  }, [segments, plan, searchText, lins]);
  const notation = round?.steps.length ? formatJakob(round.steps) : "";
  const mode = kind === "rafilm" ? "platt" : "3d";
  const flat = mode === "platt";
  // How far the dealer is, by the number Karta, the rail and Kön show ("Paow: Casino 22/36 steg"), while the tree lacks films.
  const few = tree && tree.count.have < tree.count.total ? `${dealers.find((d) => d.id === dealer)?.name ?? dealer}: ${tree.tree.name} ${countWord(tree.count)} steg` : null;

  // The address follows the round and the look (a moment after the hand stops), beside Bordet's own words. The lens's older
  // word goes: the look says it as lins.
  const want = joinParts(roundText, editor.lookText);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      for (const key of [...p.keys()]) if ((sceneWords.has(key) || key === LINS_ALIAS_WORD) && key !== "robot") p.delete(key);
      new URLSearchParams(want).forEach((value, key) => {
        if (key !== "robot" && key !== "vy") p.set(key, value);
      });
      const next = p.toString();
      if (next === window.location.search.slice(1)) return;
      setWritten(scenePart(p).toString());
      window.history.replaceState(null, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [want]);

  useViewContext({
    vy: "bordet",
    val: { läge: kind === "rafilm" ? "Råfilm" : kind === "efterarbete" ? "Efterarbete" : "Scen", runda: notation, forval: editor.label, andrat: String(editor.count) },
    live: () => stepFacts(clock.get().pos, segments),
  });

  const copyLink = () => {
    // The link names the dealer: it opens her round wherever it is opened, whatever that browser remembers.
    const link = `${window.location.origin}${window.location.pathname}${withDealer(window.location.search, dealer)}`;
    void navigator.clipboard.writeText(link).then(
      () => toast({ tone: "ok", title: "Länken är kopierad", detail: "Den öppnar samma runda och samma look här i studion." }),
      () => toast({ tone: "bad", title: "Kunde inte kopiera", detail: link }),
    );
  };
  const pick = (next: Round) => {
    setChosen(next);
    setRoundText(addressOf(next, "3d").slice(1));
  };

  // On a wide screen the picture and the column sit side by side and each scrolls on its own; on a narrow one (as Inspelning)
  // the column follows under the picture in one scroll. The toolbar and the presets' row break onto a second line rather
  // than being clipped or drawn over the column.
  return (
    <div className="grid h-full min-h-0 grid-cols-1 content-start overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:content-stretch lg:overflow-hidden">
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-3 py-2">
          {toolbar}
          {/* A long round is clipped, never its facts: the whole round stands in the text box in the column. */}
          <span data-round className="flex min-w-40 flex-1 basis-auto items-baseline gap-1 text-sm text-dim" title={notation}>
            <span className="min-w-0 truncate font-medium text-ink">{notation || "Ingen runda"}</span>
            {parts.length ? <span className="shrink-0 whitespace-nowrap">· {roundFacts(parts)}</span> : null}
            {few ? <span className="shrink-0 whitespace-nowrap text-faint">· {few}</span> : null}
          </span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <Tooltip content={`Spela en runda i den här looken, med ${perspective}. Sparar ingenting.`}>
              <Link href={editor.casino} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                <Spade />
                Prova i Casino
              </Link>
            </Tooltip>
            {!isSnapshot && kind !== "rafilm" && (
              <Button size="sm" disabled={!editor.ready || editor.savingCasino} loading={editor.savingCasino} onClick={() => void editor.useInCasino()} title={`Casino visar den här looken, med ${perspective}, nästa gång du öppnar det. Casinot på nätet får den vid nästa publicering.`}>
                Använd i Casino
              </Button>
            )}
            {!isSnapshot && kind !== "rafilm" && (
              <Button size="sm" variant="quiet" icon={<Upload />} onClick={() => setPublishNote(true)} title="Lägg upp Casinot på nätet med det som är sparat i Casino">
                Publicera
              </Button>
            )}
            <IconButton label="Kopiera länken: samma runda och look" icon={<Copy />} variant="quiet" size="sm" onClick={copyLink} />
          </div>
          <Dialog
            open={publishNote}
            onOpenChange={setPublishNote}
            title="Publicera"
            footer={
              <a href={ONLINE_CASINO} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                <Globe />
                Se Casinot på nätet
              </a>
            }
          >
            Publicering vilar. Säg till i chatten, så läggs Casinot på nätet upp med det som är sparat i Casino.
          </Dialog>
        </div>
        {/* The presets apply to the 3D scene: on a flat picture (Råfilm) they do nothing, and the row is not there. */}
        {flat ? null : editor.bar}
        {status === "error" && !graph ? (
          <ErrorState className="min-h-0 flex-1" title="Klippbanken kunde inte läsas" error={error} onRetry={() => void reload()} />
        ) : (
          <div className="flex flex-col lg:min-h-0 lg:flex-1" {...editor.pointer}>
            {/* On a narrow screen the picture itself is 16:9, as in the game, and the transport sits under it. */}
            <Stage ref={stage} className="lg:min-h-0 lg:flex-1" pictureClassName="aspect-video max-lg:flex-none lg:aspect-auto" parts={parts} mode={mode} clock={clock} initial={editor.initial} onScene={editor.onScene} onSceneChange={editor.onSceneChange}>
              {editor.comparing && !flat ? (
                <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-brass/50 bg-black/70 px-4 py-1.5 text-sm font-semibold text-brass-hi shadow-pop backdrop-blur-sm">Basgrund</div>
              ) : null}
            </Stage>
          </div>
        )}
        <div className="border-t border-line bg-canvas">
          {status === "loading" ? (
            <div className="flex gap-2 px-3 py-2" aria-busy>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[78px] w-[244px] rounded-lg" />
              ))}
            </div>
          ) : segments.length ? (
            <RoundStrip segments={segments} parts={parts} clock={clock} onCue={(step) => stage.current?.cue(step)} />
          ) : (
            <p className="flex h-[92px] items-center px-5 text-sm text-faint">{graph && !placesRead ? "Läser kortplanen…" : "Välj en runda till höger."}</p>
          )}
        </div>
      </div>
      <aside className="flex flex-col border-t border-line bg-surface lg:min-h-0 lg:border-l lg:border-t-0">
        {kind === "efterarbete" ? (
          // only what is laid over the film: the cards' and chips' look, with the cards' bend and gloss in the plan
          <div className="min-h-0 flex-1 overflow-y-auto">{editor.afterwork ?? <Skeleton className="m-4 h-10 rounded-md" />}</div>
        ) : kind === "scen" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* The picker keeps its full height; only a low window lets it scroll, and the search field and one group
                always stay in sight. */}
            <div className="shrink-0 border-b border-line px-4 py-3 lg:max-h-[calc(100%-8rem)] lg:overflow-y-auto">
              <RoundPicker rounds={rounds} current={round} problems={round?.errors ?? []} onPick={pick} />
            </div>
            {editor.panel}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <RoundPicker rounds={rounds} current={round} problems={round?.errors ?? []} onPick={pick} />
          </div>
        )}
      </aside>
    </div>
  );
}
