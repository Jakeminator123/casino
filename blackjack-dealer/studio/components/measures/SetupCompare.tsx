"use client";

// Mått, part Livebordet (/matt/?del=livebordet): our standard set-up beside the clone of the live table (lib/setups.ts,
// read from the code at run time). In pictures: both tables from above on the same scale, one over the other at their
// dealer's edge; and each table through its own camera, as the films are made. In numbers: the camera, the felt, the shoe
// and the card places side by side, with the difference. Then the lifted dealers beside the doll, from the proofs that
// have them (only our own pictures: the dolls and stick figures at our clone, never a frame of the real film), and the
// way to both tables in the doll's editor.
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buttonClasses, ErrorState, Skeleton } from "../ui";
import { cn } from "../ui/cn";
import { COMPARED_CARDS, readSetups, type Pt, type Px, type Setup } from "../../lib/setups.ts";
import { getProofs } from "../../lib/api.ts";
import type { UppsattningId } from "../../lib/uppsattning-val.ts";
import { useSetup } from "../shell/SetupProvider";

/** The mark beside the table and camera chosen in the menu. */
const Chosen = () => <span className="ml-1.5 rounded-full bg-brass/90 px-1.5 py-px text-2xs font-semibold text-brass-ink">valt i menyn</span>;

const OURS = "#d9b96a", LIVE = "#7fb8f5";
const n = (x: number, d = 3) => x.toLocaleString("sv-SE", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const m = (x: number, d = 3) => `${n(x, d)} m`, cm = (x: number) => `${n(x * 100, 1)} cm`, deg = (x: number, d = 1) => `${n(x, d)}°`;
const diff = (a: number, b: number, f: (x: number) => string) => { const d = a - b; return `${d > 0 ? "+" : d < 0 ? "−" : "±"}${f(Math.abs(d))}${b ? ` (${d > 0 ? "+" : d < 0 ? "−" : ""}${n(Math.abs((d / b) * 100), 0)} %)` : ""}`; };

const path = (ps: (Pt | Px)[], close = true) => ps.map((p, i) => `${i ? "L" : "M"}${"x" in p ? `${n2(p.x)} ${n2(p.y)}` : `${n2(p[0] * 1000)} ${n2(p[1] * 1000)}`}`).join(" ") + (close ? " Z" : "");
const n2 = (x: number) => Math.round(x * 10) / 10;

/** Both tables from above, on the same scale, at their dealer's edge: the felt, the card places, the shoe, the box or the tray, and each camera's foot with its field of view. */
function Plan({ ours, live }: { ours: Setup; live: Setup }) {
  const layer = (s: Setup, colour: string, dashed: boolean) => {
    const c = s.camera, half = (c.hFovDeg / 2) * (Math.PI / 180), reach = c.toEdge + 0.05;
    const ray = (sign: number): Pt => [c.foot[0] + sign * Math.tan(half) * reach, c.foot[1] - reach];
    return (
      <g stroke={colour} fill="none" strokeWidth={dashed ? 5 : 6} strokeDasharray={dashed ? "18 10" : undefined}>
        <path d={path(s.felt)} />
        {s.cards.filter((k) => /^(P\d\.C1|D\.C1)$/.test(k.id)).map((k) => <path key={k.id} d={path(k.corners)} fill={colour} fillOpacity={0.18} />)}
        <path d={path(s.shoe.foot)} fill={colour} fillOpacity={0.3} />
        {s.box ? <path d={path(s.box)} fill={colour} fillOpacity={0.12} /> : null}
        {s.tray ? <path d={path(s.tray)} fill={colour} fillOpacity={0.12} /> : null}
        {s.betMarks.map((b, i) => <circle key={i} cx={b[0] * 1000} cy={b[1] * 1000} r={22} />)}
        <path d={path([ray(-1), c.foot, ray(1)], false)} strokeWidth={3} opacity={0.6} />
        <circle cx={c.foot[0] * 1000} cy={c.foot[1] * 1000} r={30} fill={colour} stroke="none" />
      </g>
    );
  };
  const box = [-1150, -350, 2300, 2550];
  return (
    <svg viewBox={box.join(" ")} className="h-auto w-full" role="img" aria-label="Borden uppifrån">
      <line x1={-1100} x2={1100} y1={0} y2={0} stroke="#373c43" strokeWidth={3} />
      <text x={0} y={-230} textAnchor="middle" fill="#a2a8b0" fontSize={56}>dealern</text>
      <text x={0} y={-120} textAnchor="middle" fill="#7e858e" fontSize={40}>kanten mot dealern</text>
      {layer(live, LIVE, true)}
      {layer(ours, OURS, false)}
      <text x={ours.camera.foot[0] * 1000 + 50} y={ours.camera.foot[1] * 1000 + 15} fill={OURS} fontSize={48}>förra standardens kamera</text>
      <text x={live.camera.foot[0] * 1000 + 50} y={live.camera.foot[1] * 1000 + 15} fill={LIVE} fontSize={48}>livebordets kamera</text>
      <text x={-1100} y={2150} fill="#7e858e" fontSize={40}>1 ruta = 10 cm, skalan lika för båda</text>
      <g stroke="#7e858e" strokeWidth={4}><line x1={-1100} x2={-1000} y1={2080} y2={2080} /><line x1={-1100} x2={-1100} y1={2060} y2={2100} /><line x1={-1000} x2={-1000} y1={2060} y2={2100} /></g>
    </svg>
  );
}

/** One table through its own camera, in its own picture: what the films of that set-up see. */
function Picture({ s, colour }: { s: Setup; colour: string }) {
  const p = s.picture;
  return (
    <svg viewBox={`0 0 ${p.width} ${p.height}`} className="h-auto w-full rounded-md bg-well" role="img" aria-label={`${s.name} genom sin kamera`}>
      <g stroke={colour} fill="none" strokeWidth={3}>
        <path d={path(p.felt, false)} />
        <path d={path(p.edge, false)} strokeOpacity={0.6} />
        {p.cards.map((c) => <path key={c.id} d={path(c.quad)} fill={colour} fillOpacity={/C1$/.test(c.id) ? 0.35 : 0.12} />)}
        {p.shoe.map((ring, i) => (ring.length === 4 ? <path key={i} d={path(ring)} fill={colour} fillOpacity={i ? 0.1 : 0.3} /> : null))}
        {p.shoe[0]?.length === 4 && p.shoe[1]?.length === 4 ? p.shoe[0].map((a, i) => <line key={i} x1={a.x} y1={a.y} x2={p.shoe[1][i].x} y2={p.shoe[1][i].y} />) : null}
        {p.box && p.box.length === 4 ? <path d={path(p.box)} fill={colour} fillOpacity={0.12} /> : null}
      </g>
      <text x={24} y={p.height - 24} fill="#a2a8b0" fontSize={30}>{p.width} × {p.height} bildpunkter</text>
    </svg>
  );
}

function Row({ what, a, b, d }: { what: ReactNode; a: string; b: string; d?: string }) {
  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="sticky left-0 bg-surface px-3 py-1.5 font-medium text-ink">{what}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-soft">{a}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-soft">{b}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-dim">{d ?? ""}</td>
    </tr>
  );
}
const Head = ({ children }: { children: ReactNode }) => <tr><td colSpan={4} className="bg-raised/60 px-3 pb-1 pt-3 text-2xs font-semibold uppercase tracking-widest text-faint">{children}</td></tr>;

function Numbers({ ours, live, chosen }: { ours: Setup; live: Setup; chosen: UppsattningId }) {
  const a = ours, b = live, ca = a.camera, cb = b.camera;
  const card = (s: Setup, id: string) => s.cards.find((c) => c.id === id);
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-inset">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line-strong text-xs font-semibold text-dim">
            <th className="sticky left-0 bg-surface px-3 py-2">Mått</th>
            <th className="px-3 py-2"><span style={{ color: OURS }}>■</span> Förra standarden, spelets vy{chosen === "forra" ? <Chosen /> : null}</th>
            <th className="px-3 py-2"><span style={{ color: LIVE }}>■</span> Livebordet{chosen === "live" ? <Chosen /> : null}</th>
            <th className="px-3 py-2">Skillnad, förra − livebordets</th>
          </tr>
        </thead>
        <tbody>
          <Head>Kameran</Head>
          <Row what="Höjd över filten" a={m(ca.height)} b={m(cb.height)} d={diff(ca.height, cb.height, m)} />
          <Row what="Lutning nedåt" a={deg(ca.pitchDeg)} b={deg(cb.pitchDeg, 2)} d={diff(ca.pitchDeg, cb.pitchDeg, deg)} />
          <Row what="Bildvinkel i sidled" a={deg(ca.hFovDeg)} b={deg(cb.hFovDeg)} d={diff(ca.hFovDeg, cb.hFovDeg, deg)} />
          <Row what="Bildvinkel i höjdled" a={deg(ca.vFovDeg)} b={deg(cb.vFovDeg)} d={diff(ca.vFovDeg, cb.vFovDeg, deg)} />
          <Row what="Bilden" a={`${ca.width} × ${ca.height_px}`} b={`${cb.width} × ${cb.height_px}`} />
          <Row what="Kamerans fot till kanten mot dealern" a={m(ca.toEdge)} b={m(cb.toEdge)} d={diff(ca.toEdge, cb.toEdge, m)} />
          <Head>Filten</Head>
          <Row what="Djup, från kanten till spelarnas kant" a={m(a.feltDepth)} b={m(b.feltDepth)} d={diff(a.feltDepth, b.feltDepth, m)} />
          <Row what="Bredd längs kanten mot dealern" a={m(a.feltWidth)} b={m(b.feltWidth)} d={diff(a.feltWidth, b.feltWidth, m)} />
          <Row what="Bågens radie" a={m(a.feltRadius)} b={m(b.feltRadius)} d={diff(a.feltRadius, b.feltRadius, m)} />
          <Head>Skon</Head>
          <Row what="Längd och bredd" a={`${m(a.shoe.length)} × ${m(a.shoe.width)}`} b={`${m(b.shoe.length)} × ${m(b.shoe.width)}`} d={diff(a.shoe.length, b.shoe.length, m)} />
          <Row what="Höjd bak och fram" a={`${m(a.shoe.backHeight)} och ${m(a.shoe.frontHeight)}`} b={`${m(b.shoe.backHeight)} och ${m(b.shoe.frontHeight)}`} d={diff(a.shoe.backHeight, b.shoe.backHeight, m)} />
          <Row what="Frontens lutning mot filten" a={deg(a.shoe.plateLeanDeg)} b={deg(b.shoe.plateLeanDeg)} d={diff(a.shoe.plateLeanDeg, b.shoe.plateLeanDeg, deg)} />
          <Row what="Vinkel mot kanten" a={deg(a.shoe.angleDeg)} b={deg(b.shoe.angleDeg)} d={diff(a.shoe.angleDeg, b.shoe.angleDeg, deg)} />
          <Row what="Frontens mitt: åt dealerns vänster, från kanten" a={`${m(a.shoe.mouth[0])}, ${m(a.shoe.mouth[1])}`} b={`${m(b.shoe.mouth[0])}, ${m(b.shoe.mouth[1])}`} d={diff(a.shoe.mouth[0], b.shoe.mouth[0], m)} />
          <Head>Kortplatserna, första kortet: åt dealerns vänster och från kanten</Head>
          {COMPARED_CARDS.map((id) => {
            const x = card(a, id), y = card(b, id);
            if (!x && !y) return null;
            const word = id === "D.C1" ? "Dealerns första kort" : `Plats ${id[1]}`;
            const at = (c?: { at: Pt }) => (c ? `${m(c.at[0], 2)}, ${m(c.at[1], 2)}` : "—");
            const apart = x && y ? `${cm(Math.hypot(x.at[0] - y.at[0], x.at[1] - y.at[1]))} isär` : undefined;
            return <Row key={id} what={word} a={at(x)} b={at(y)} d={apart} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

type Film = { name: string; path: string; still: string | null; label: string };
/** The lifted dealers beside the doll: the films of the proof that has them, with a still beside each. */
function useLiftFilms(): Film[] | null {
  const [films, setFilms] = useState<Film[] | null>(null);
  useEffect(() => {
    let live = true;
    getProofs()
      .then((answer) => {
        const proof = answer.proofs.find((p) => p.id === "danilo-frasse-i-editorn-20261127");
        const files = proof?.files ?? [];
        const wanted = ["00-danilo-hela-sekvensen", "01-danilo-p4-kamera", "02-frasse-p4-kamera"];
        const out = wanted.flatMap((w) => {
          const video = files.find((f) => f.name === `${w}.mp4`);
          if (!video) return [];
          const still = files.find((f) => f.name === `${w}.png`);
          return [{ name: w, path: video.path, still: still?.path ?? null, label: proof?.labels?.[video.name] ?? w }];
        });
        if (live) setFilms(out);
      })
      .catch(() => { if (live) setFilms([]); });
    return () => { live = false; };
  }, []);
  return films;
}

export function SetupCompare() {
  const [setups, setSetups] = useState<{ ours: Setup; live: Setup } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    readSetups().then((s) => { if (live) { setSetups(s); setError(null); } }).catch((e: Error) => { if (live) setError(e); });
    return () => { live = false; };
  }, [round]);
  const films = useLiftFilms();
  const { id: setup } = useSetup();
  const legend = useMemo(() => (
    <div className="flex flex-wrap items-center gap-4 text-xs text-dim">
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-6" style={{ background: OURS }} />Förra standarden, genom spelets vy{setup === "forra" ? <Chosen /> : null}</span>
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 border-t-2 border-dashed" style={{ borderColor: LIVE }} />Livebordet: vår klon av det riktiga bordet, den nya standarden{setup === "live" ? <Chosen /> : null}</span>
    </div>
  ), [setup]);

  if (error) return <ErrorState title="Uppsättningarna gick inte att läsa" error={error} onRetry={() => setRound((r) => r + 1)} />;
  if (!setups) return <div className="space-y-3"><Skeleton className="h-8 w-2/3 rounded-md" /><Skeleton className="h-96 rounded-lg" /></div>;
  const { ours, live } = setups;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-[110ch] flex-col gap-2">
        <p className="text-sm leading-6 text-soft">
          Livebordet är den nya standarden: det riktiga bordet i filmen, uppmätt och byggt som ett eget bord. Bredvid står den förra standarden, som finns kvar som ett val och som filmerna i spelet är gjorda för. Allt här är räknat ur koden när sidan öppnas. Inget ur den riktiga filmen visas: bara våra egna bord, dockor och linjer.
        </p>
        {legend}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Uppifrån, samma skala</h2>
          <p className="text-xs text-dim">Borden lagda på varandra vid kanten mot dealern. Kortplatserna är spelarnas första kort och dealerns; prickarna är livebordets platsknappar. Linjerna från kamerorna är bildens kanter.</p>
          <div className="rounded-lg border border-line bg-surface p-3 shadow-inset"><Plan ours={ours} live={live} /></div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Genom var sin kamera</h2>
          <p className="text-xs text-dim">Så som filmerna ser bordet: den förra standarden genom spelets vy från plats 4, livebordet genom sin egen kamera. Starkare fyllda kort är första kortet.</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <figure className="flex flex-col gap-1.5"><Picture s={ours} colour={OURS} /><figcaption className="text-xs text-dim">{ours.name}{setup === "forra" ? <Chosen /> : null}</figcaption></figure>
            <figure className="flex flex-col gap-1.5"><Picture s={live} colour={LIVE} /><figcaption className="text-xs text-dim">{live.name}{setup === "live" ? <Chosen /> : null}</figcaption></figure>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/dockan/?uppsattning=forra" className={buttonClasses({ variant: "secondary", size: "sm" })}>Förra standarden i Dockan</Link>
            <Link href="/dockan/?uppsattning=live&docka=danilo" className={buttonClasses({ variant: "secondary", size: "sm" })}>Livebordet i Dockan, med Danilo</Link>
            <Link href="/dockan/?uppsattning=live&docka=frasse" className={buttonClasses({ variant: "secondary", size: "sm" })}>… med Frasse</Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">I tal</h2>
        <Numbers ours={ours} live={live} chosen={setup} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">De riktiga dealrarnas rörelser på våra dockor</h2>
        <p className="max-w-[110ch] text-xs text-dim">Danilo och Frasse: rörelserna lyfta ur filmen av de två riktiga dealrarna, spelade av dockorna vid livebordet. I de två sista filmerna är dockan till vänster och streckfiguren ur lyftet till höger.</p>
        {films === null ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : films.length === 0 ? (
          <p className="text-sm text-dim">Filmerna finns inte på den här datorn.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {films.map((f) => (
              <figure key={f.name} className="flex flex-col gap-1.5">
                <video src={`/${f.path}`} poster={f.still ? `/${f.still}` : undefined} controls loop muted playsInline preload="none" className={cn("aspect-video w-full rounded-md bg-well object-contain")} />
                <figcaption className="text-xs text-dim">{f.label}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
