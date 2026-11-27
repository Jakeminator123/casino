"use client";

// Biblioteket (/bibliotek/): allt som lagras i repot, per slag (Jakob 2026-11-27: "Vi ska ju inte bara ansamla massa skit,
// men vill inte ta bort bra saker"). Överst hur mycket som ligger var och hur mycket som inget pekar på; sedan slagen, och i
// varje slag ställena med sina enheter: en miniatyr där studion får visa den, storlek, var den används, om den väntar på
// hans dom och om den går att göra om gratis. En enhet öppnas i en panel med sin användning; papperskorgen på den frågar
// först och raderar sedan från disken på hans klick (lib/bibliotek.ts, tools/lager-remove.ts). Det skyddade kräver ett
// andra klick. Livebordets film och bilder visas bara som storlek och antal. ?slag=<slag> väljer ett slag, ?enhet=<id>
// öppnar en enhet och ?fraga=<id> frågan före en radering.
import { Box, Film, ImageIcon, Lock, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../shell";
import { Badge, Button, EmptyState, ErrorState, IconButton, Sheet, Skeleton, Spinner, TextField, cn } from "../ui";
import { ModelView } from "../avatars/ModelView";
import { RaderaFraga } from "./RaderaFraga";
import { anvandsOrd, brickor, dagOrd, filUrl, getLager, kortOrd, LASARE, PROJEKT, sortAv, storlek, type Enhet, type Lager, type Plats } from "../../lib/bibliotek.ts";

const VISA_FORST = 12;
const param = (name: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name));

function Miniatyr({ rel, className, stor = false }: { rel: string | null; className?: string; stor?: boolean }) {
  const sort = sortAv(rel);
  if (!rel || !sort) return <div className={cn("grid place-items-center bg-raised text-faint", className)}><Box className="size-6" /></div>;
  if (sort === "bild") return <img src={filUrl(rel)} alt="" loading="lazy" className={cn("bg-raised object-cover", className)} />;
  if (sort === "film") return <video src={`${filUrl(rel)}#t=0.5`} preload="metadata" muted playsInline controls={stor} className={cn("bg-black object-cover", className)} />;
  return stor ? <ModelView src={filUrl(rel)} className={cn("bg-raised", className)} /> : <div className={cn("grid place-items-center bg-raised text-faint", className)}><Box className="size-7" /><span className="sr-only">3D-modell</span></div>;
}

function EnhetRuta({ e, p, lager, onOpen, onRadera }: { e: Enhet; p: Plats; lager: Lager; onOpen: () => void; onRadera: () => void }) {
  const prov = p.id === "prov" ? lager.prov[e.id.split("/").at(-1)!] : undefined;
  const sort = sortAv(e.bild);
  return (
    <div className="group relative h-full">
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-surface text-left shadow-inset transition-colors hover:border-line-strong hover:bg-raised/50">
        {p.visas === "media" ? (
          <div className="relative">
            <Miniatyr rel={e.bild} className="aspect-16/10 w-full" />
            {sort ? (
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-xs bg-black/65 px-1.5 py-0.5 text-2xs text-ink">
                {sort === "film" ? <Film className="size-3" /> : sort === "modell" ? <Box className="size-3" /> : <ImageIcon className="size-3" />} {storlek(e.bytes)}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-1.5 px-3 pb-2.5 pt-2">
          <span className="line-clamp-2 text-sm font-medium leading-5 text-ink">{e.namn}</span>
          <span className="text-xs text-faint tabular-nums">{[`${e.files} ${e.files === 1 ? "fil" : "filer"}`, p.visas === "media" && sort ? null : storlek(e.bytes), dagOrd(e.andrad)].filter(Boolean).join(" · ")}</span>
          <span className="mt-auto flex flex-wrap gap-1">
            {brickor(e, p, prov).map((b) => <Badge key={b.text} tone={b.tone} size="sm">{b.text}</Badge>)}
            {e.anvands.slice(0, 2).map((a) => <Badge key={a.ord} size="sm">{kortOrd(a)}</Badge>)}
          </span>
        </div>
      </button>
      {p.radera === "ja" && !p.git ? (
        <IconButton label="Radera" icon={<Trash2 />} size="sm" onClick={onRadera}
          className="absolute right-1.5 top-1.5 bg-black/60 text-soft opacity-0 backdrop-blur-sm transition-opacity hover:text-[#ef8b8b] focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100" />
      ) : null}
    </div>
  );
}

function PlatsKort({ p, lager, query, onOpen, onRadera }: { p: Plats; lager: Lager; query: string; onOpen: (e: Enhet) => void; onRadera: (e: Enhet) => void }) {
  const [alla, setAlla] = useState(false);
  const q = query.trim().toLowerCase();
  const enheter = q ? p.enheter.filter((e) => e.namn.toLowerCase().includes(q)) : p.enheter;
  if (q && !enheter.length && !p.namn.toLowerCase().includes(q)) return null;
  const visade = alla ? enheter : enheter.slice(0, VISA_FORST);
  const fakta = [PROJEKT[p.projekt] ?? p.projekt, `läses av ${p.lasare.map((l) => LASARE[l] ?? l).join(" och ")}`, p.gratis ? `går att göra om gratis${p.hur ? `: ${p.hur}` : ""}` : p.betald ? "betalt, går inte att göra om" : null].filter(Boolean);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface/60 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-md font-semibold text-ink">{p.namn}</h3>
        <span className="text-sm text-dim tabular-nums">{storlek(p.bytes)} · {p.files.toLocaleString("sv-SE")} {p.files === 1 ? "fil" : "filer"}{p.enheter.length ? ` · ${p.enheter.length} st` : ""}</span>
        {p.git ? <Badge size="sm">Git har den</Badge> : null}
        {p.okand ? <Badge tone="wait" size="sm">Okänd mapp</Badge> : null}
      </div>
      <p className="-mt-1.5 text-xs text-faint">{fakta.join(" · ")}</p>
      {p.radera === "aldrig" || p.git ? (
        <p className="flex items-center gap-2 text-sm text-dim"><Lock className="size-4 shrink-0 text-faint" />{p.aldrig ?? "Raderas inte här."}{p.visas === "aldrig" && p.slag === "matdata" ? " Visas bara som storlek och antal." : ""}</p>
      ) : visade.length ? (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {visade.map((e) => <li key={e.id}><EnhetRuta e={e} p={p} lager={lager} onOpen={() => onOpen(e)} onRadera={() => onRadera(e)} /></li>)}
          </ul>
          {enheter.length > VISA_FORST ? <Button variant="quiet" size="sm" className="self-start" onClick={() => setAlla(!alla)}>{alla ? "Visa färre" : `Visa alla ${enheter.length}`}</Button> : null}
        </>
      ) : <p className="text-sm text-faint">Tomt.</p>}
    </section>
  );
}

function EnhetPanel({ e, p, lager, onClose, onRadera }: { e: Enhet | null; p: Plats | null; lager: Lager | null; onClose: () => void; onRadera: (e: Enhet) => void }) {
  const prov = e && p?.id === "prov" ? lager?.prov[e.id.split("/").at(-1)!] : undefined;
  const ord = e ? anvandsOrd(e) : [];
  return (
    <Sheet open={!!e} onOpenChange={(open) => { if (!open) onClose(); }} title={e?.namn ?? ""} subtitle={p?.namn} width={520}>
      {e && p ? (
        <div className="flex flex-col gap-5 p-5">
          {p.visas === "media" && e.bild ? <Miniatyr rel={e.bild} stor className="aspect-4/3 w-full rounded-md" /> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-faint">Storlek</dt><dd className="text-ink tabular-nums">{storlek(e.bytes)}, {e.files} {e.files === 1 ? "fil" : "filer"}</dd>
            <dt className="text-faint">Ändrad</dt><dd className="text-ink">{e.andrad ? new Date(e.andrad).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" }) : "–"}</dd>
            <dt className="text-faint">Hör till</dt><dd className="text-ink">{PROJEKT[p.projekt] ?? p.projekt}</dd>
            <dt className="text-faint">Göra om</dt><dd className="text-ink">{p.gratis ? `Går gratis${p.hur ? `: ${p.hur}` : ""}` : p.betald ? "Betalt: går inte att göra om gratis" : "Går inte att göra om gratis"}</dd>
            {prov ? <><dt className="text-faint">Din dom</dt><dd className="text-ink">{prov.bra ? `Bra om ${prov.bra} ${prov.bra === 1 ? "sak" : "saker"}` : prov.inteBra ? "Inte bra" : "Inte ännu"}{prov.obesvarat ? " · ett kort i Beslut väntar" : ""}</dd></> : null}
            {prov?.domare ? <><dt className="text-faint">Domaren</dt><dd className="text-ink">{prov.domare}{prov.extern ? ` · extern domare: ${prov.extern}` : ""} <span className="text-faint">(inte din dom)</span></dd></> : null}
          </dl>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">Var den används</h3>
            {ord.length ? <ul className="flex flex-col gap-1 text-sm text-soft">{ord.map((o) => <li key={o} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" />{o}</li>)}</ul> : <p className="text-sm text-dim">Inget pekar på den.</p>}
          </section>
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
  const synliga = useMemo(() => (lager?.perSlag ?? []).filter((s) => !slag || s.slag === slag), [lager, slag]);

  if (fel && !lager) return <Page title="Biblioteket"><ErrorState error={fel} title="Biblioteket kunde inte läsas" onRetry={() => void las(true)} /></Page>;
  const t = lager?.totalt;
  return (
    <Page
      title="Biblioteket"
      status={t ? <span className="tabular-nums">{storlek(t.bytes)} på datorn</span> : <span>läser …</span>}
      actions={<Button variant="quiet" size="sm" icon={laser ? <Spinner size="sm" /> : <RefreshCw />} onClick={() => void las(true)} disabled={laser}>Läs om</Button>}
    >
      {!lager ? (
        <div className="flex flex-col gap-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-label="Hur mycket som ligger var" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { tal: storlek(t!.bytes), rad: `lagrat i repot, i ${t!.files.toLocaleString("sv-SE")} filer` },
              { tal: storlek(t!.utanPekareBytes), rad: `som inget pekar på (${t!.utanPekare} st)` },
              { tal: storlek(t!.vantarBytes), rad: `väntar på din dom (${t!.vantar} st)` },
              { tal: String(lager.saknas.length), rad: lager.saknas.length === 1 ? "fil som registren pekar på saknas här" : "filer som registren pekar på saknas här" },
            ].map((x) => (
              <div key={x.rad} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface p-4 shadow-inset">
                <span className="font-display text-2xl font-semibold tabular-nums text-ink">{x.tal}</span>
                <span className="text-sm text-dim">{x.rad}</span>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSlag(null)} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", !slag ? "border-brass/60 bg-raised text-ink" : "border-line text-dim hover:text-ink")}>Allt</button>
              {lager.perSlag.map((s) => (
                <button key={s.slag} type="button" onClick={() => setSlag(slag === s.slag ? null : s.slag)} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", slag === s.slag ? "border-brass/60 bg-raised text-ink" : "border-line text-dim hover:text-ink")}>
                  {s.ord} <span className="tabular-nums text-faint">{storlek(s.bytes)}</span>
                </button>
              ))}
            </div>
            <TextField aria-label="Sök i biblioteket" placeholder="Sök: en docka, en film, ett prov" icon={<Search />} value={query} onChange={(ev) => setQuery(ev.target.value)} wrapperClassName="w-[380px] max-w-full" />
          </section>

          {synliga.map((s) => (
            <section key={s.slag} className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 className="flex items-baseline gap-2 text-sm font-semibold uppercase tracking-widest text-faint">{s.ord}<span className="text-xs font-normal normal-case tracking-normal tabular-nums">{storlek(s.bytes)}</span></h2>
                <p className="text-sm text-dim">{s.rad}</p>
              </div>
              {lager.platser.filter((p) => p.slag === s.slag).sort((a, b) => b.bytes - a.bytes).map((p) => (
                <PlatsKort key={p.id} p={p} lager={lager} query={query} onOpen={(e) => setOppen(e.id)} onRadera={(e) => setFraga(e.id)} />
              ))}
            </section>
          ))}
          {!synliga.length ? <EmptyState title="Inget här">Välj ett annat slag.</EmptyState> : null}
        </div>
      )}
      <EnhetPanel e={oppnad} p={oppnadPlats} lager={lager} onClose={() => setOppen(null)} onRadera={(e) => setFraga(e.id)} />
      <RaderaFraga id={fraga} onClose={() => setFraga(null)} onDone={() => { setFraga(null); setOppen(null); void las(true); }} />
    </Page>
  );
}
