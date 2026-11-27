"use client";

// Spegla (/spegla/): Youtubefilmens bordsbild och vår vy av samma giv i samma bild, 1728 x 972, och i samma takt (Jakob
// 2026-11-27: "spegla vår vy/bord/dealer/kort/kameravinkel etc mot youtubeklippet varifrån det kommer"). Vår ruta k visas
// mot filmens sekund för den rutan, som datan har den (lib/spegla.ts, tools/spegla-routes.ts). Reglagen: genomskinligheten
// mellan Youtubefilmen och Vår vy, ett lodrätt drag över bilden som delar den (filmen till vänster om draget), Bredvid,
// spela och paus, farten, en ruta i taget, slingan, och rutorna där handen är vid skon, bytet och kortet ligger. Adressen
// väljer också: ?giv=danilo-p4 (eller ?docka=&plats= som i Dockan), ?var=, ?ruta=, ?lage=halv|delad|bredvid, ?fart=.
// Inget förklaras på sidan (blackjack-dealer/AGENTS.md, "Studion visar, den förklarar inte"); orden står i Ordlistan.
import { ChevronLeft, ChevronRight, Columns2, Pause, Play, Repeat } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Page } from "../shell";
import { EmptyState, ErrorState, IconButton, SegmentedControl, Select, Skeleton } from "../ui";
import { cn } from "../ui/cn";
import { beskarning, clampRuta, filmRuta, filmSekund, getSpegling, mittI, sekunder, valdGiv, type Film, type Giv, type Spegling } from "../../lib/spegla.ts";

const LAGEN = {
  halv: { mix: 0.5, delning: 0, bredvid: false },
  delad: { mix: 1, delning: 0.5, bredvid: false },
  bredvid: { mix: 1, delning: 0, bredvid: true },
} as const;
const FARTER = [
  { value: "1", label: "1×" },
  { value: "0.5", label: "½" },
  { value: "0.25", label: "¼" },
] as const;
const MARK_ORD: Record<string, string> = { skon: "Vid skon", bytet: "Bytet", ligger: "Kortet ligger" };
const VID = 16 / 9;

// ---- videorna ------------------------------------------------------------------------------------------------------
const nar = (v: HTMLVideoElement, event: string, ms = 8000) =>
  new Promise<void>((done) => {
    const t = setTimeout(done, ms);
    v.addEventListener(event, () => { clearTimeout(t); done(); }, { once: true });
  });
/** Ställer en video på en tid och väntar tills den visar rutan där. */
async function stall(v: HTMLVideoElement, t: number) {
  if (v.readyState < 1) await nar(v, "loadedmetadata");
  if (Math.abs(v.currentTime - t) < 1e-4 && v.readyState >= 2) return;
  const klar = nar(v, "seeked");
  v.currentTime = t;
  await klar;
}
const vila = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Spelet: vår video bestämmer rutan medan den spelar (dess egna rutor, requestVideoFrameCallback), och Youtubefilmen
 * följer med samma fart, rättad mot filmens sekund för rutan. Stilla ställs båda på sin ruta. `klar` är rutan båda visar.
 */
function useSpel(giv: Giv | null, film: Film | null, varUrl: string, start: number) {
  const filmRef = useRef<HTMLVideoElement>(null), varRef = useRef<HTMLVideoElement>(null);
  const [ruta, setRuta] = useState(start), [klar, setKlar] = useState<number | null>(null);
  const [spelar, setSpelar] = useState(false), [fart, setFartState] = useState(1), [slinga, setSlinga] = useState(true);
  const st = useRef({ want: start, busy: false, playing: false, token: 0, fart: 1, slinga: true });

  const ga = useCallback(
    (k: number) => {
      if (!giv) return;
      const s = st.current;
      s.want = clampRuta(giv, k);
      setRuta(s.want);
      setKlar(null);
      if (s.busy) return;
      const tok = s.token;
      s.busy = true;
      void (async () => {
        for (;;) {
          const k0 = s.want, f = filmRef.current, v = varRef.current;
          if (!v) break;
          await Promise.all([stall(v, mittI(k0, giv.fps)), f && film ? stall(f, mittI(filmRuta(giv, film, k0), film.fps)) : null]);
          if (s.token !== tok) return;
          if (s.want === k0) { setKlar(k0); break; }
        }
        s.busy = false;
      })();
    },
    [giv, film],
  );

  const stopp = useCallback(() => {
    const s = st.current;
    s.playing = false;
    filmRef.current?.pause();
    varRef.current?.pause();
    setSpelar(false);
  }, []);

  const spela = useCallback(async () => {
    const v = varRef.current, s = st.current;
    if (!giv || !v || s.playing) return;
    if (s.want >= giv.rutor - 1) ga(0);
    while (s.busy) await vila(20);
    const tok = s.token;
    s.playing = true;
    setSpelar(true);
    setKlar(null);
    const satt = () => {
      const f = filmRef.current;
      v.playbackRate = s.fart;
      if (f) f.playbackRate = s.fart;
      return Promise.all([v.play().catch(() => {}), f && s.want <= giv.lyftetTill ? f.play().catch(() => {}) : null]);
    };
    const pa = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (!s.playing || s.token !== tok) return;
      const f = filmRef.current, k = Math.min(giv.rutor - 1, Math.round(meta.mediaTime * giv.fps));
      s.want = k;
      setRuta(k);
      if (f && film) {
        if (k > giv.lyftetTill) {
          if (!f.paused) f.pause();
        } else {
          // Filmen följer: samma fart, lite snabbare eller långsammare när den ligger efter eller före, och ett hopp
          // bara när den har kommit långt från sin ruta.
          const mal = filmSekund(giv, k) + Math.max(0, v.currentTime - meta.mediaTime), fel = f.currentTime - mal;
          if (Math.abs(fel) > 0.25) f.currentTime = mal + 0.03 * s.fart;
          else f.playbackRate = s.fart * (1 - Math.max(-0.15, Math.min(0.15, fel * 1.5)));
          if (f.paused) void f.play().catch(() => {});
        }
      }
      if (k >= giv.rutor - 1) {
        f?.pause();
        v.pause();
        if (!s.slinga) { s.playing = false; setSpelar(false); setKlar(k); return; }
        void (async () => {
          await Promise.all([stall(v, mittI(0, giv.fps)), f && film ? stall(f, mittI(filmRuta(giv, film, 0), film.fps)) : null]);
          if (!s.playing || s.token !== tok) return;
          s.want = 0;
          setRuta(0);
          await satt();
          v.requestVideoFrameCallback(pa);
        })();
        return;
      }
      v.requestVideoFrameCallback(pa);
    };
    await satt();
    v.requestVideoFrameCallback(pa);
  }, [giv, film, ga]);

  const paus = useCallback(() => { stopp(); ga(st.current.want); }, [stopp, ga]);
  const steg = useCallback((d: number) => { stopp(); ga(st.current.want + d); }, [stopp, ga]);
  const setFart = useCallback((x: number) => {
    st.current.fart = x;
    setFartState(x);
    if (varRef.current) varRef.current.playbackRate = x;
    if (filmRef.current) filmRef.current.playbackRate = x;
  }, []);
  const vaxlaSlinga = useCallback(() => setSlinga((x) => { st.current.slinga = !x; return !x; }), []);

  // Ett nytt giv eller en ny vy: allt som pågår släpps, och båda ställs på rutan.
  useEffect(() => {
    const s = st.current;
    s.token++;
    s.busy = false;
    s.playing = false;
    setSpelar(false);
    ga(s.want);
  }, [ga, varUrl]);

  return { filmRef, varRef, ruta, klar, spelar, fart, slinga, ga, spela, paus, steg, setFart, vaxlaSlinga };
}

/** Rutans storlek på skärmen. */
function useStorlek<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

// ---- sidan ---------------------------------------------------------------------------------------------------------
function Scen({ data }: { data: Spegling & { film: Film } }) {
  const params = useSearchParams();
  const [givId, setGivId] = useState(() => valdGiv(data.givar, params)?.id ?? null);
  const giv = data.givar.find((g) => g.id === givId) ?? data.givar[0];
  const [varId, setVarId] = useState(() => params.get("var"));
  const vy = giv.var.find((v) => v.id === varId) ?? giv.var[0];
  const lage = LAGEN[(params.get("lage") ?? "halv") as keyof typeof LAGEN] ?? LAGEN.halv;
  const [mix, setMix] = useState<number>(lage.mix), [delning, setDelning] = useState<number>(lage.delning), [bredvid, setBredvid] = useState<boolean>(lage.bredvid);
  const start = clampRuta(giv, Number(params.get("ruta") ?? 0) || 0);
  const spel = useSpel(giv, data.film, vy.url, start);
  const { setFart } = spel;
  useEffect(() => { const f = Number(params.get("fart")); if (f === 0.5 || f === 0.25) setFart(f); }, [params, setFart]);

  // Valen står i adressen, så att en omladdning visar samma sak.
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("giv", giv.id);
    u.searchParams.delete("docka");
    u.searchParams.delete("plats");
    if (vy.id === giv.var[0].id) u.searchParams.delete("var"); else u.searchParams.set("var", vy.id);
    window.history.replaceState(window.history.state, "", u);
  }, [giv, vy]);

  const { spelar, spela, paus, steg } = spel;
  useEffect(() => {
    const tangent = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=listbox], [role=combobox], [role=radiogroup]")) return;
      if (e.key === " " && t?.closest("button")) return;
      if (e.key === " ") { e.preventDefault(); if (spelar) paus(); else void spela(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); steg(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); steg(1); }
    };
    window.addEventListener("keydown", tangent);
    return () => window.removeEventListener("keydown", tangent);
  }, [spelar, spela, paus, steg]);

  const [yta, size] = useStorlek<HTMLDivElement>();
  const scenRef = useRef<HTMLDivElement>(null);
  const bredd = bredvid ? Math.min(size.w, size.h * VID * 2 + 8) : Math.min(size.w, size.h * VID);
  const dra = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = scenRef.current?.getBoundingClientRect();
    if (r && r.width) setDelning(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const crop = useMemo(() => beskarning(data.film), [data.film]);
  const n = giv.rutor, k = spel.ruta;

  const filmVideo = <video ref={spel.filmRef} src={data.film.url} muted playsInline preload="auto" className="absolute max-w-none" style={crop} />;
  const varVideo = <video key={vy.url} ref={spel.varRef} src={vy.url} muted playsInline preload="auto" className="absolute inset-0 size-full" />;
  const namn = (text: string) => <span className="pointer-events-none absolute left-2 top-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-2xs text-soft">{text}</span>;

  return (
    <Page
      title="Spegla"
      full
      actions={
        <>
          <Select size="sm" aria-label="Rörelse" className="w-44" value={giv.id} onChange={(id) => { setGivId(id); setVarId(null); }} options={data.givar.map((g) => ({ value: g.id, label: g.namn }))} />
          <Select size="sm" aria-label="Vår vy" className="w-32" value={vy.id} onChange={setVarId} options={giv.var.map((v) => ({ value: v.id, label: v.namn }))} />
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div ref={yta} className="relative min-h-0 flex-1 bg-well">
          <div
            ref={scenRef}
            data-spegla=""
            data-klar={spel.klar ?? ""}
            className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", bredvid ? "grid grid-cols-2 gap-2" : "touch-none select-none")}
            style={{ width: bredd || undefined, aspectRatio: bredvid ? undefined : `${VID}` }}
            onPointerDown={bredvid ? undefined : (e) => { e.currentTarget.setPointerCapture(e.pointerId); dra(e); }}
            onPointerMove={bredvid ? undefined : (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) dra(e); }}
          >
            <div className={cn("overflow-hidden bg-black", bredvid ? "relative aspect-video" : "absolute inset-0")}>
              {filmVideo}
              {bredvid ? namn("Youtubefilmen") : null}
            </div>
            <div
              className={cn("overflow-hidden", bredvid ? "relative aspect-video bg-black" : "absolute inset-0")}
              style={bredvid ? undefined : { opacity: mix, clipPath: `inset(0 0 0 ${delning * 100}%)` }}
            >
              {varVideo}
              {bredvid ? namn("Vår vy") : null}
            </div>
            {bredvid ? null : (
              <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: `${delning * 100}%` }}>
                <div className="absolute inset-y-0 -left-px w-0.5 bg-brass/80" />
                <div className="absolute top-1/2 grid h-9 w-4 -translate-y-1/2 place-items-center rounded-sm border border-brass/70 bg-canvas/80" style={{ left: delning < 0.02 ? 0 : delning > 0.98 ? -16 : -8 }}>
                  <span className="h-4 w-px bg-brass" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-1">
            <IconButton label="En ruta bak" kbd="←" icon={<ChevronLeft />} onClick={() => spel.steg(-1)} />
            <IconButton label={spel.spelar ? "Paus" : "Spela"} kbd="Mellanslag" variant="secondary" icon={spel.spelar ? <Pause /> : <Play />} onClick={() => (spel.spelar ? spel.paus() : void spel.spela())} />
            <IconButton label="En ruta fram" kbd="→" icon={<ChevronRight />} onClick={() => spel.steg(1)} />
          </div>
          <SegmentedControl size="sm" label="Fart" value={String(spel.fart)} onChange={(x) => spel.setFart(Number(x))} options={FARTER} />
          <IconButton label="Slinga" icon={<Repeat />} aria-pressed={spel.slinga} onClick={spel.vaxlaSlinga} />

          <div className="relative min-w-48 flex-1 pt-2.5">
            {Object.entries(giv.marken).map(([namnet, r]) => (
              <button
                key={namnet}
                type="button"
                title={MARK_ORD[namnet] ?? namnet}
                aria-label={MARK_ORD[namnet] ?? namnet}
                onClick={() => { spel.paus(); spel.ga(r as number); }}
                className={cn("absolute top-0 h-2.5 w-2 -translate-x-1/2 rounded-[2px] transition-colors", k === r ? "bg-brass" : "bg-line-hi hover:bg-brass-lo")}
                style={{ left: `calc(${((r as number) / Math.max(1, n - 1)) * 100}% + ${7 - ((r as number) / Math.max(1, n - 1)) * 14}px)` }}
              />
            ))}
            <input
              type="range"
              aria-label="Ruta"
              min={0}
              max={n - 1}
              step={1}
              value={k}
              onChange={(e) => { spel.paus(); spel.ga(Number(e.target.value)); }}
              className="ui-range w-full"
              style={{ ["--fill" as string]: `${(k / Math.max(1, n - 1)) * 100}%` }}
            />
          </div>
          <div className="flex items-baseline gap-2 text-xs tabular-nums text-faint">
            <span title="Rutan i vår vy">
              {k}
              <span className="text-line-hi"> / {n - 1}</span>
            </span>
            <span title="Youtubefilmens sekund">{sekunder(filmSekund(giv, k))} s</span>
          </div>

          <label className={cn("flex items-center gap-2 text-xs text-dim", bredvid && "opacity-45")}>
            <span>Youtubefilmen</span>
            <input type="range" aria-label="Youtubefilmen eller Vår vy" min={0} max={1} step={0.01} value={mix} disabled={bredvid} onChange={(e) => setMix(Number(e.target.value))} className="ui-range w-28" style={{ ["--fill" as string]: `${mix * 100}%` }} />
            <span>Vår vy</span>
          </label>
          <IconButton label="Bredvid" icon={<Columns2 />} aria-pressed={bredvid} onClick={() => setBredvid((x) => !x)} />
        </div>
      </div>
    </Page>
  );
}

export function SpeglaView() {
  const [data, setData] = useState<Spegling | null>(null), [error, setError] = useState<string | null>(null), [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    getSpegling().then((d) => { if (live) { setData(d); setError(null); } }, (e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [round]);

  if (error) return <Page title="Spegla"><ErrorState title="Speglingen gick inte att läsa" error={error} onRetry={() => setRound((n) => n + 1)} /></Page>;
  if (!data) return <Page title="Spegla" full><div className="grid h-full place-items-center p-10"><Skeleton className="aspect-video w-[80%]" /></div></Page>;
  if (!data.film) return <Page title="Spegla"><EmptyState title="Youtubefilmen finns inte på den här datorn." /></Page>;
  if (!data.givar.length) return <Page title="Spegla"><EmptyState title="Ingen giv har en inspelning att spegla än." /></Page>;
  return <Scen data={data as Spegling & { film: Film }} />;
}
