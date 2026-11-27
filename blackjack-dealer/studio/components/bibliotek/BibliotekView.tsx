"use client";

// Biblioteket (/bibliotek/): allt som lagras i repot, per slag, ur kartan (lib/bibliotek.ts). Sidan visar sakerna: överst fyra
// tal, sedan slagen, och i varje slag ställena med sina saker som små bilder med ett namn och en storlek (Jakob 2026-11-27:
// "Se till att inte så fruktansvärt mycket text och skit finns i studion"). En sak öppnas i en panel med bilden stor, var den
// används och hans ord; papperskorgen frågar först (RaderaFraga) och raderar sedan från disken. Livebordets film och bilder
// visas bara som storlek. ?slag=<slag> väljer ett slag, ?enhet=<id> öppnar en sak och ?fraga=<id> frågan före en radering.
import { Box, Lock, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../shell";
import { Button, EmptyState, ErrorState, IconButton, Sheet, Skeleton, Spinner, TextField, Tooltip, cn } from "../ui";
import { ModelView } from "../avatars/ModelView";
import { RaderaFraga } from "./RaderaFraga";
import { DOM_ORD, anvandsOrd, filUrl, getLager, sokbar, sortAv, storlek, type Enhet, type Lager, type Plats } from "../../lib/bibliotek.ts";

const VISA_FORST = 18;
const param = (name: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name));

/** Den lilla bilden: en förminskad bild eller en ruta ur filmen, hämtad först när den syns; en modell som en ikon. */
function Liten({ e, className }: { e: Enhet; className?: string }) {
  const sort = sortAv(e.bild);
  const [fel, setFel] = useState(false);
  if (!e.bild || !sort || sort === "modell" || fel) return <div className={cn("grid place-items-center bg-raised text-faint", className)}><Box className="size-6" /></div>;
  // eslint-disable-next-line @next/next/no-img-element -- a lab file; a static export cannot optimise
  return <img src={filUrl(e.bild, true)} alt="" loading="lazy" decoding="async" onError={() => setFel(true)} className={cn("bg-raised object-cover", className)} />;
}

/** Bilden stor i panelen: filen själv, en film med kontroller, en modell i 3D. */
function Stor({ rel, className }: { rel: string; className?: string }) {
  const sort = sortAv(rel);
  // eslint-disable-next-line @next/next/no-img-element -- a lab file
  if (sort === "bild") return <img src={filUrl(rel)} alt="" className={cn("bg-raised object-contain", className)} />;
  if (sort === "film") return <video src={filUrl(rel)} poster={filUrl(rel, true)} preload="none" controls muted playsInline className={cn("bg-black object-contain", className)} />;
  if (sort === "modell") return <ModelView src={filUrl(rel)} className={cn("bg-raised", className)} />;
  return null;
}

function Ruta({ e, kanRadera, visas, onOpen, onRadera }: { e: Enhet; kanRadera: boolean; visas: boolean; onOpen: () => void; onRadera: () => void }) {
  return (
    <div className="group relative h-full">
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-surface text-left transition-colors hover:border-line-strong hover:bg-raised/50">
        {visas ? <Liten e={e} className="aspect-16/10 w-full" /> : null}
        <span className="flex items-baseline gap-2 px-2.5 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-ink" title={e.namn}>{e.namn}</span>
          <span className="shrink-0 text-xs tabular-nums text-faint">{storlek(e.bytes)}</span>
        </span>
      </button>
      {kanRadera ? (
        <IconButton label="Radera" icon={<Trash2 />} size="sm" onClick={onRadera}
          className="absolute right-1.5 top-1.5 bg-black/60 text-soft opacity-0 backdrop-blur-sm transition-opacity hover:text-[#ef8b8b] focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100" />
      ) : null}
    </div>
  );
}

function Stalle({ p, query, onOpen, onRadera }: { p: Plats; query: string; onOpen: (e: Enhet) => void; onRadera: (e: Enhet) => void }) {
  const [alla, setAlla] = useState(false);
  const q = sokbar(query.trim());
  const enheter = q ? p.enheter.filter((e) => sokbar(e.namn).includes(q)) : p.enheter;
  if (q ? !enheter.length && !sokbar(p.namn).includes(q) : !p.bytes && !p.enheter.length) return null;
  const visade = alla ? enheter : enheter.slice(0, VISA_FORST);
  const aldrig = p.radera === "aldrig" || p.git;
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-baseline gap-2 text-md font-semibold text-ink">
        {p.namn}
        <span className="text-sm font-normal tabular-nums text-faint">{storlek(p.bytes)}</span>
        {aldrig ? <Tooltip content={p.aldrig ?? "Raderas inte här."}><Lock aria-label={p.aldrig ?? "Raderas inte här"} className="size-3.5 self-center text-faint" /></Tooltip> : null}
      </h3>
      {!aldrig && visade.length ? (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
            {visade.map((e) => <li key={e.id}><Ruta e={e} visas={p.visas === "media"} kanRadera={!aldrig} onOpen={() => onOpen(e)} onRadera={() => onRadera(e)} /></li>)}
          </ul>
          {enheter.length > VISA_FORST ? <Button variant="quiet" size="sm" className="self-start" onClick={() => setAlla(!alla)}>{alla ? "Färre" : `Alla ${enheter.length}`}</Button> : null}
        </>
      ) : null}
    </section>
  );
}

function Panel({ e, p, lager, onClose, onRadera }: { e: Enhet | null; p: Plats | null; lager: Lager | null; onClose: () => void; onRadera: (e: Enhet) => void }) {
  const prov = e && p?.id === "prov" ? lager?.prov[e.id.split("/").at(-1)!] : undefined;
  const ord = e ? anvandsOrd(e) : [];
  return (
    <Sheet open={!!e} onOpenChange={(open) => { if (!open) onClose(); }} title={e?.namn ?? ""} subtitle={p?.namn} width={520}>
      {e && p ? (
        <div className="flex flex-col gap-5 p-5">
          {p.visas === "media" && e.bild ? <Stor rel={e.bild} className="aspect-4/3 w-full rounded-md" /> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-faint">Storlek</dt><dd className="tabular-nums text-ink">{storlek(e.bytes)} · {e.files} {e.files === 1 ? "fil" : "filer"}</dd>
            <dt className="text-faint">Ändrad</dt><dd className="text-ink">{e.andrad ? new Date(e.andrad).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" }) : "–"}</dd>
            <dt className="text-faint">Göra om</dt><dd className="text-ink">{e.gratis ? "Gratis" : p.betald ? "Betalt, går inte" : "Går inte gratis"}</dd>
            {e.dom ? <><dt className="text-faint">Din dom</dt><dd className="text-ink">{DOM_ORD[e.dom]}{e.utanProv ? " · inget prov visar den" : ""}</dd></> : null}
            {prov?.domare ? <><dt className="text-faint">Domaren</dt><dd className="text-ink">{prov.domare}{prov.extern ? ` · extern: ${prov.extern}` : ""}</dd></> : null}
            {e.git ? <><dt className="text-faint">Git</dt><dd className="text-ink">{e.git} {e.git === 1 ? "fil står kvar" : "filer står kvar"}</dd></> : null}
          </dl>
          {ord.length ? <ul className="flex flex-col gap-1 text-sm text-soft">{ord.map((o) => <li key={o} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" />{o}</li>)}</ul> : <p className="text-sm text-dim">Inget pekar på den.</p>}
          <div className="flex flex-wrap gap-2">
            {p.id === "prov" ? <Link href={`/granska/?prov=${encodeURIComponent(e.id.split("/").at(-1)!)}`} className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-sm text-ink hover:bg-raised">Öppna i Granska</Link> : null}
            {p.radera === "ja" && !p.git ? <Button variant="danger" icon={<Trash2 />} onClick={() => onRadera(e)}>Radera</Button> : null}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

export function BibliotekView() {
  const [lager, setLager] = useState<Lager | null>(null);
  const [fel, setFel] = useState<Error | null>(null);
  const [laser, setLaser] = useState(false);
  const [slag, setSlag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [oppen, setOppen] = useState<string | null>(null);
  const [fraga, setFraga] = useState<string | null>(null);
  const las = useCallback(async (nytt = false) => {
    setLaser(true);
    try { setLager(await getLager(nytt)); setFel(null); } catch (e) { setFel(e as Error); } finally { setLaser(false); }
  }, []);
  useEffect(() => { void las(); setSlag(param("slag")); setOppen(param("enhet")); setFraga(param("fraga")); }, [las]);
  const hitta = (id: string | null) => { if (!id || !lager) return { e: null, p: null }; for (const p of lager.platser) { const e = p.enheter.find((x) => x.id === id); if (e) return { e, p }; } return { e: null, p: null }; };
  const { e: oppnad, p: oppnadPlats } = hitta(oppen);
  const synliga = useMemo(() => (lager?.perSlag ?? []).filter((s) => s.bytes > 0 && (!slag || s.slag === slag)), [lager, slag]);

  if (fel && !lager) return <Page title="Biblioteket"><ErrorState error={fel} title="Biblioteket kunde inte läsas" onRetry={() => void las(true)} /></Page>;
  const t = lager?.totalt;
  return (
    <Page
      title="Biblioteket"
      status={t ? <span className="tabular-nums">{storlek(t.bytes)}</span> : null}
      actions={<Button variant="quiet" size="sm" icon={laser ? <Spinner size="sm" /> : <RefreshCw />} onClick={() => void las(true)} disabled={laser}>Räkna om</Button>}
    >
      {!lager ? (
        <div className="flex flex-col gap-4"><Skeleton className="h-20" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-label="Talen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { tal: storlek(t!.bytes), ord: "lagrat" },
              { tal: storlek(t!.utanPekareBytes), ord: "inget pekar på" },
              { tal: storlek(t!.vantarBytes), ord: "väntar på din dom" },
              { tal: String(lager.saknas.length), ord: "saknas här" },
            ].map((x) => (
              <div key={x.ord} className="flex items-baseline gap-2 rounded-lg border border-line bg-surface px-4 py-3">
                <span className="font-display text-2xl font-semibold tabular-nums text-ink">{x.tal}</span>
                <span className="text-sm text-dim">{x.ord}</span>
              </div>
            ))}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSlag(null)} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", !slag ? "border-brass/60 bg-raised text-ink" : "border-line text-dim hover:text-ink")}>Allt</button>
            {lager.perSlag.filter((s) => s.bytes > 0).map((s) => (
              <button key={s.slag} type="button" onClick={() => setSlag(slag === s.slag ? null : s.slag)} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", slag === s.slag ? "border-brass/60 bg-raised text-ink" : "border-line text-dim hover:text-ink")}>
                {s.ord} <span className="tabular-nums text-faint">{storlek(s.bytes)}</span>
              </button>
            ))}
            <TextField aria-label="Sök" placeholder="Sök" icon={<Search />} value={query} onChange={(ev) => setQuery(ev.target.value)} wrapperClassName="ml-auto w-[260px] max-w-full" />
          </div>

          {synliga.map((s) => (
            <section key={s.slag} className="flex flex-col gap-5">
              <h2 className="flex items-baseline gap-2 border-b border-line pb-2 text-sm font-semibold uppercase tracking-widest text-faint">
                {s.ord}<span className="text-xs font-normal normal-case tracking-normal tabular-nums">{storlek(s.bytes)}</span>
              </h2>
              {lager.platser.filter((p) => p.slag === s.slag).sort((a, b) => b.bytes - a.bytes).map((p) => (
                <Stalle key={p.id} p={p} query={query} onOpen={(e) => setOppen(e.id)} onRadera={(e) => setFraga(e.id)} />
              ))}
            </section>
          ))}
          {!synliga.length ? <EmptyState title="Inget här" /> : null}
        </div>
      )}
      <Panel e={oppnad} p={oppnadPlats} lager={lager} onClose={() => setOppen(null)} onRadera={(e) => setFraga(e.id)} />
      <RaderaFraga id={fraga} onClose={() => setFraga(null)} onDone={() => { setFraga(null); setOppen(null); void las(); }} />
    </Page>
  );
}
