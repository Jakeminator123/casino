"use client";

// Avatarer (/avatarer/): the ways from pictures of a person to a doll on our skeleton, as a guide to read and click
// through (lib/avatars.ts, from avatar-auto-pipeline/vagar.json). Three parts, chosen at the top (?del=…):
// - Vägarna: the finished ways, Version 1 (the one that runs today) set apart from the others in use, tried and thought
//   of. A way chosen shows its steps one by one, with what each costs and what lies on disk for the chosen person, or,
//   where it has no steps of its own, its choice for each part.
// - Delarna: every part a doll is built of, its alternatives, which ways use them, and the rules for what goes together.
// - Föremål och material: the table, the shoe, the stool, the cards and the chip tray, and the finished models to turn in 3D.
// Nothing here starts a run.
import { Check, Circle, RotateCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Page } from "../shell";
import { Badge, Button, ErrorState, SegmentedControl, Skeleton } from "../ui";
import { cn } from "../ui/cn";
import { ModelView } from "./ModelView";
import {
  costWord, firstPerson, getAvatars, modelWord, personName, plainWords, STATUS_TONE, STATUS_WORD, waysInOrder,
  type AvatarAnswer, type Model, type Part, type Person, type Way,
} from "../../lib/avatars.ts";

type Tab = "vagar" | "delar" | "foremal";
const TABS = [
  { value: "vagar" as const, label: "Vägarna" },
  { value: "delar" as const, label: "Delarna" },
  { value: "foremal" as const, label: "Föremål och material" },
];

const Section = ({ title, children, note }: { title: string; note?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {note ? <p className="max-w-[100ch] text-xs text-dim">{note}</p> : null}
    </div>
    {children}
  </section>
);

function WayList({ ways, chosen, onChoose }: { ways: Way[]; chosen: string; onChoose: (id: string) => void }) {
  const groups: { title: string; list: Way[] }[] = [
    { title: "Körs i dag", list: ways.filter((w) => w.id === "version-1") },
    { title: "Finns också", list: ways.filter((w) => w.id !== "version-1" && w.status === "finns") },
    { title: "Prövat", list: ways.filter((w) => w.status === "provat") },
    { title: "Tänkt", list: ways.filter((w) => w.status === "tankt" || w.status === "gar_inte") },
  ].filter((g) => g.list.length);
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1.5">
          <div className="text-2xs font-semibold uppercase tracking-widest text-faint">{g.title}</div>
          {g.list.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onChoose(w.id)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                chosen === w.id ? "border-brass/60 bg-raised shadow-[0_0_0_1px_rgb(217_185_106/0.45)]" : "border-line bg-surface hover:border-line-strong hover:bg-raised/50",
              )}
            >
              <span className="text-sm font-semibold text-ink">{w.id === "version-1" ? "Version 1 (den som körs i dag)" : w.namn}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-dim">
                <Badge tone={STATUS_TONE[w.status]}>{STATUS_WORD[w.status]}</Badge>
                {plainWords(w.kostnad?.text) || "kostnaden står inte"}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function PersonPicker({ people, chosen, onChoose }: { people: Person[]; chosen: string | null; onChoose: (name: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-dim">Vad som finns för</span>
      {people.map((p) => {
        const done = Object.keys(p.steps).length;
        return (
          <button key={p.name} type="button" onClick={() => onChoose(p.name)} className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", chosen === p.name ? "border-brass/60 bg-raised text-ink" : "border-line text-dim hover:text-ink")}>
            {personName(p.name)}{done ? ` · ${done} steg` : ""}
          </button>
        );
      })}
    </div>
  );
}

function WayDetail({ way, parts, person }: { way: Way; parts: Part[]; person: Person | null }) {
  const alt = (partId: string, altId: string | null) => parts.find((p) => p.id === partId)?.alternativ.find((a) => a.id === altId) ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-ink">{way.id === "version-1" ? "Version 1: från foton med Meshy" : way.namn}</h2>
          <Badge tone={STATUS_TONE[way.status]}>{STATUS_WORD[way.status]}</Badge>
          {way.kan_koras ? <Badge tone="ok">går att köra</Badge> : <Badge>körs inte som en helhet</Badge>}
        </div>
        <p className="max-w-[100ch] text-sm leading-6 text-soft">{plainWords(way.beskrivning)}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><span className="text-dim">Kostar: </span><span className="text-ink">{plainWords(way.kostnad?.text) || "—"}</span></span>
          {way.tid?.text ? <span><span className="text-dim">Tar: </span><span className="text-ink">{plainWords(way.tid.text)}</span></span> : null}
        </div>
        {way.provet?.sa ? <p className="max-w-[100ch] text-sm leading-6 text-dim"><span className="text-soft">Prövat: </span>{plainWords(way.provet.sa)}</p> : null}
      </div>

      {way.steg.length ? (
        <ol className="flex flex-col gap-2">
          {way.steg.map((s) => {
            const disk = s.mapp && person ? person.steps[s.mapp] : undefined;
            const done = !!disk && disk.files > 0;
            return (
              <li key={String(s.nr)} className="flex gap-3 rounded-lg border border-line bg-surface p-3 shadow-inset">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums", done ? "bg-godkand/20 text-godkand" : "bg-raised text-brass")}>{done ? <Check className="size-4" /> : s.nr}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-sm font-semibold text-ink">{s.namn}</span>
                    <span className={cn("text-xs", s.betalt ? "text-anmarkning" : "text-dim")}>{costWord(s.betalt)}</span>
                  </div>
                  <p className="text-sm leading-5 text-soft">{plainWords(s.gor)}</p>
                  {s.delar?.length ? <p className="text-xs text-faint">Bygger: {s.delar.map((d) => parts.find((p) => p.id === d)?.namn ?? d).join(", ")}</p> : null}
                  {s.mapp && person ? (
                    <p className={cn("flex items-center gap-1.5 text-xs", done ? "text-godkand" : "text-faint")}>
                      {done ? <Check className="size-3.5" /> : <Circle className="size-3" />}
                      {done ? `Gjort för ${personName(person.name)}: ${disk!.files} ${disk!.files === 1 ? "fil" : "filer"}` : `Inte gjort för ${personName(person.name)}`}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Valet för varje del</h3>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-inset">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <tbody>
              {parts.map((p) => {
                const a = alt(p.id, way.val[p.id] ?? null);
                const free = way.far_bytas?.[p.id];
                return (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="w-48 px-3 py-1.5 font-medium text-ink">{p.namn}</td>
                    <td className="px-3 py-1.5 text-soft">{a ? plainWords(a.namn) : <span className="text-faint">inget</span>}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{a ? <Badge tone={STATUS_TONE[a.status]}>{STATUS_WORD[a.status]}</Badge> : null}</td>
                    <td className="px-3 py-1.5 text-xs text-dim">{free ? `får bytas mot ${free.filter((x) => x !== a?.id).map((x) => plainWords(p.alternativ.find((y) => y.id === x)?.namn ?? x)).join(", ")}` : way.last?.includes(p.id) ? "låst i den här vägen" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {way.varfor_last ? <p className="max-w-[100ch] text-xs leading-5 text-dim"><span className="text-soft">Varför delarna är låsta: </span>{plainWords(way.varfor_last)}</p> : null}
      </div>
    </div>
  );
}

function Ways({ data }: { data: AvatarAnswer }) {
  const ways = useMemo(() => waysInOrder(data.vagar.vagar), [data]);
  const [chosen, setChosen] = useState(ways[0]?.id ?? "");
  const [who, setWho] = useState<string | null>(() => firstPerson(data.people)?.name ?? null);
  const way = ways.find((w) => w.id === chosen) ?? ways[0];
  const person = data.people.find((p) => p.name === who) ?? null;
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[100ch] text-sm leading-6 text-soft">{plainWords(data.vagar.om.vad)} {plainWords(data.vagar.skelettet.regel)}</p>
      <PersonPicker people={data.people} chosen={who} onChoose={setWho} />
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <WayList ways={ways} chosen={way?.id ?? ""} onChoose={setChosen} />
        {way ? <WayDetail way={way} parts={data.vagar.delar} person={person} /> : null}
      </div>
    </div>
  );
}

function Parts({ data }: { data: AvatarAnswer }) {
  const ways = waysInOrder(data.vagar.vagar);
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[100ch] text-sm leading-6 text-soft">Varje del en docka byggs av, med alternativen för den och vilka vägar som tar vilket. En väg är en rad val som hör ihop och är prövade tillsammans.</p>
      {data.vagar.delar.map((p) => (
        <Section key={p.id} title={p.namn} note={plainWords(p.fraga)}>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {p.alternativ.map((a) => {
              const users = ways.filter((w) => w.val[p.id] === a.id);
              return (
                <div key={a.id} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 shadow-inset">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{plainWords(a.namn)}</span>
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_WORD[a.status]}</Badge>
                  </div>
                  {a.ger?.length ? <ul className="list-disc space-y-0.5 pl-4 text-xs leading-4 text-soft">{a.ger.map((g, i) => <li key={i}>{plainWords(g)}</li>)}</ul> : null}
                  {a.hinder ? <p className="text-xs text-underkand">{plainWords(a.hinder)}</p> : null}
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-dim">
                    <span>{a.kostnad?.text ? plainWords(a.kostnad.text) : "gratis"}</span>
                    {a.tid?.text ? <span>{plainWords(a.tid.text)}</span> : null}
                  </div>
                  {users.length ? <div className="flex flex-wrap gap-1">{users.map((w) => <span key={w.id} className="rounded-full bg-raised px-2 py-0.5 text-2xs text-soft">{w.id === "version-1" ? "Version 1" : w.namn.replace(/\s*\(.*\)$/, "")}</span>)}</div> : null}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
      <Section title="Reglerna för vad som går ihop">
        <ul className="flex max-w-[110ch] flex-col gap-2">
          {data.vagar.regler.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-surface p-3 text-sm leading-5 text-soft shadow-inset">
              {plainWords(r.villkor ?? r.varfor)}
              {r.i_dag ? <span className="mt-1 block text-xs text-dim">I dag: {plainWords(r.i_dag)}</span> : null}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

type Thing = { id: string; name: string; text: string; model?: string };
function Things({ data }: { data: AvatarAnswer }) {
  const things: Thing[] = [
    { id: "bord", name: "Bordet", text: "Byggs i Blender efter spelets mått, med filt, sarg, kortplatser, sko och markerbricka. Standarddockans bord har sin kant 23 cm bakom spelets; livebordet är vår klon av det riktiga bordet.", model: "/dealer3d/figur/bord23.glb" },
    { id: "stol", name: "Stolen", text: "Dealerns stol, byggd efter måtten. Dockans rum sätter den under hennes lår när bilden ritas.", model: "/dealer3d/figur/stol.glb" },
    { id: "sko", name: "Skon", text: "Vår sko byggs med bordet efter skons mått; livebordets sko har en klar, lutande front. I spelet står i dag en sko gjord av Meshy, som byts i ett eget arbete.", model: "/assets/props/shoe.glb" },
    { id: "bricka", name: "Markerlådan", text: "På vårt bord en försänkt bricka bakom kanten mot dealern. I spelet en markerlåda gjord av Meshy, med marker i tolv fack.", model: "/assets/props/tray.glb" },
    { id: "kort", name: "Korten", text: "Riktiga kort, 63 × 88 mm. I filmerna har kortet gul baksida och blå framsida utan valör; spelet ritar det riktiga kortet ovanpå." },
  ];
  const [shown, setShown] = useState<string>("stol");
  const thing = things.find((t) => t.id === shown);
  const files = (folder: string) => data.models.filter((m) => m.folder === folder);
  const mb = (m: Model) => `${(m.bytes / 1048576).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} MB`;
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[100ch] text-sm leading-6 text-soft">{plainWords(data.vagar.scenen.text)}</p>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-2">
          {things.map((t) => (
            <button key={t.id} type="button" onClick={() => t.model && setShown(t.id)} className={cn("flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors", shown === t.id ? "border-brass/60 bg-raised" : "border-line bg-surface", t.model ? "hover:border-line-strong" : "cursor-default")}>
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">{t.name}{t.model ? <span className="text-2xs font-normal text-faint">visa i 3D</span> : null}</span>
              <span className="text-sm leading-5 text-soft">{t.text}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm text-dim">{thing?.name ?? ""} i 3D: dra för att vrida, rulla för att komma närmare.</div>
          {thing?.model ? <ModelView key={thing.model} src={thing.model} className="h-[460px] w-full overflow-hidden rounded-lg border border-line bg-well" /> : null}
        </div>
      </div>
      <Section title="De färdiga modellerna på datorn" note="Byggda i Blender eller hämtade, och lästa av editorn och studion. Följer inte med Git.">
        <div className="grid gap-4 md:grid-cols-3">
          {[["bord", "Borden"], ["stol", "Stolen"], ["docka", "Dockorna och figurerna"]].map(([folder, title]) => (
            <div key={folder} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-3 shadow-inset">
              <div className="text-sm font-semibold text-ink">{title}</div>
              {files(folder).length ? files(folder).map((m) => (
                <div key={m.name} className="flex justify-between gap-3 text-xs"><span className="text-soft">{modelWord(m)}</span><span className="shrink-0 tabular-nums text-faint">{mb(m)}</span></div>
              )) : <span className="text-xs text-faint">inga på den här datorn</span>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Avatars() {
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = params.get("del") === "delar" ? "delar" : params.get("del") === "foremal" ? "foremal" : "vagar";
  const [data, setData] = useState<AvatarAnswer | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    getAvatars().then((d) => { if (live) { setData(d); setError(null); } }).catch((e: Error) => { if (live) setError(e); });
    return () => { live = false; };
  }, [round]);
  const people = data?.people.length ?? 0;
  return (
    <Page
      title="Avatarer"
      status={data ? <span>{people} personer · Version 1 körs i dag · inget här startar en körning</span> : <span>läser vägarna …</span>}
      actions={
        <>
          <SegmentedControl size="sm" label="Avatarernas delar" value={tab} onChange={(t) => router.replace(t === "vagar" ? "/avatarer/" : `/avatarer/?del=${t}`)} options={TABS} />
          <Button size="sm" variant="quiet" icon={<RotateCw />} onClick={() => setRound((n) => n + 1)} title="Läs vägarna och diskens innehåll igen">Läs om</Button>
        </>
      }
    >
      {error ? <ErrorState title="Vägarna gick inte att läsa" error={error} onRetry={() => setRound((n) => n + 1)} />
        : !data ? <div className="space-y-3"><Skeleton className="h-8 w-2/3 rounded-md" /><Skeleton className="h-96 rounded-lg" /></div>
        : tab === "vagar" ? <Ways data={data} /> : tab === "delar" ? <Parts data={data} /> : <Things data={data} />}
    </Page>
  );
}

export function AvatarsView() {
  return (
    <Suspense fallback={<Page title="Avatarer" />}>
      <Avatars />
    </Suspense>
  );
}
