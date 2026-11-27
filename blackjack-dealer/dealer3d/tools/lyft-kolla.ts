// Kontrollen av Danilos och Frasses rörelser (dealer3d/data/lyft-<docka>-*.json, skrivna av dealer3d/tools/lyft-till-docka.ts):
// samma saker som standarddocka/verktyg/mat.ts prövar för standardens rörelser, på livebordet, och mot lyftet de är gjorda av.
//   node dealer3d/tools/lyft-kolla.ts [--json] [<rörelse.json> ...]      (från blackjack-dealer/; utan filer: alla lyft-*.json)
//   node dealer3d/tools/lyft-kolla.ts <rörelse.json> --ansikte <ansikte.json>   och huvudet som det syns: ansiktsnätet på dockans film
//        (titta.ts --giv <rörelsen> --spela-in hela --kamera spel, sedan live-bj/verktyg/lyft.py dockhuvud <filmen> <ansikte.json>)
// Slutkoden är 1 om någon rörelse har en spärr.
//
// Spärrar (som mat.ts): ett ben som ändrar längd (armen mot dockans ben, fingrarna mot ankaret, högst 1 mm); handleden bortom
// armens räckvidd (benen minus 2 mm); handen mer än 50 grader från underarmen; en led bortom vad ett finger kan, ett finger i
// filten eller i eller genom kortet (hand-rule.ts handFaults, också medan kortet står i skon); handflatan i filten; ett hörn
// av kortet under filten; en arm mer än 5 mm in i bålen (armIBalen); kortet ute ur skon utan stöd (varken hållet mellan fingrar på var sin sida, tryckt mot filten av
// ett finger, eller liggande); kortet som vänds eller vrids mer än 40 grader på en ruta; ett hopp eller ryck (mat.ts HACK:
// ett steg 15 mm längre än rutorna bredvid, farten som byter 25 mm per ruta mer än bredvid; huvudet 5 och 15 mm; blicken
// 5 grader); första och sista rutan mer än 0,5 mm från ankaret; kortet landat mer än 3 mm eller 2° från sitt mål (där den
// riktiga dealerns kort låg, made.chosen.landning), inte plant, inte med framsidan upp, eller rörligt efteråt; kortet som
// vrids eller glider under tummen medan det ligger på filten (läggs till rätta). Fingrar i varandra räknas men spärrar inte (som mat.ts).
// HANDEN MOT LYFTET (spärr): varje handled ruta för ruta mot lyftets, jämnat som verktyget jämnar det (lyft-till-docka.ts
// lugna): i de rutor där handen är lyftets (made.hand l) får den inte stå mer än 1 mm därifrån, och där en kontakt har
// rättat den (k) högst KONTAKT (2 cm). Bryggorna och vilan (b, v) räknas inte, men står i talen. En rörelse utan made.hand
// (gjord av ett äldre verktyg) räknas som lyftets i alla rutor. Bredvid: avståndet mot det råa lyftet (median, 95 %, mest).
// Mot lyftet: per led medianen av skillnaden i sidled (x), höjd (y) och djup (z), och i livebordets bild (bildpunkter);
// handledens fart längs filten i 21 steg för fyra delar, med toppens läge bredvid lyftets och stilfilens; dalen i bytet
// (handen som har kortet, som andel av den högre toppen) bredvid stilfilens; och styckets längd.
// SKAKIGHETEN (Jakob 2026-11-27: "han var lite skakig"): i de rutor där punkten i stort är stilla (farten jämnad till 1 Hz
// under 0,08 m/s) medianen av steget mellan två rutor och av ändringen i steget (andra differensen), i mm, för handlederna,
// fingertopparna och huvudet, dockans bredvid lyftets; och handledernas toppfart, dockans bredvid lyftets.
// RYCKEN (spärr): huvudet eller en axel fortare än dubbla dealerns; en handled som byter fart mer än dealerns i samma rutor
// (8 mm marginal); blicken som vrider sig ryckigt (över 3 grader fartbyte på en ruta); fingertopparna som darrar mer än
// dealerns. Talen står bredvid dealerns (det råa lyftet).
// BLICKEN I VILAN: vinkeln mellan blicken och riktningen till livebordets kamera (LIVE_CAMERA) i rutorna där båda händerna
// vilar (i en väntan alla rutor, i en giv vilan i början och slutet), dockans bredvid lyftets, och hur mycket av den som är
// uppåt (+) eller nedåt.
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CARD, cross, dot, length, sub, unit, type Vec3} from '../../src/space.ts';
import {LIVE, LIVE_CAMERA, liveSee} from '../../src/table-live.ts';
import {dollNamed} from '../src/doll.ts';
import {handFaults, boneLengths} from '../src/hand-rule.ts';
import {BALEN, DATA, KONTAKT, armIBalenAv, jamna, lugna, type Frame, type Kort, type Lyft} from './lyft-till-docka.ts';

const ROOT = path.join(DATA, '../..'), CASINO = path.join(ROOT, '..');
const HACK = {steg: 0.015, ryck: 0.025, huvudSteg: 0.005, huvudRyck: 0.015, blick: 5}, HANDLED = 50.5, ANKARE = 0.0005, FPS = 30;
const SIDOR = [['R', 1], ['L', -1]] as const;
const grader = (c: number) => Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI, mm = (m: number) => Math.round(m * 1000), mm1 = (m: number) => Math.round(m * 10000) / 10;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length ? s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 : NaN; };
const KAMERAN: Vec3 = [0, LIVE_CAMERA.height, 0];
const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul2 = (a: Vec3): Vec3 => [2 * a[0], 2 * a[1], 2 * a[2]];
const horn = (c: Kort) => { const s = cross(c.n, c.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [0, 1, 2].map(k => c.c[k] + c.l[k] * a * CARD.height / 2 + s[k] * b * CARD.width / 2) as Vec3); };
/** Var en punkt är mot kortet, ut ur framsidan; null om den inte rör det (inom 1 cm från kanten och 16 mm från ytan): mat.ts mot. */
const mot = (c: Kort, p: Vec3) => { const d = sub(p, c.c), u = dot(d, c.l), v = dot(d, cross(c.n, c.l)), w = dot(d, c.n); return Math.abs(u) < CARD.height / 2 + 0.01 && Math.abs(v) < CARD.width / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
const HANDFLATA: [number, number, number][] = [[0, 0, 0.02], [0, 1, 0.012], [0, 5, 0.0078], [0, 9, 0.0078], [0, 13, 0.0078], [0, 17, 0.0078], [5, 9, 0.0078], [9, 13, 0.0078], [13, 17, 0.0078]];
const TOPPAR = [4, 8, 12, 16, 20];
type Motion = {doll: string; ankare?: {borjan: string; slut: string}; fps: number; frameCount: number; hip: Vec3; leavesShoe?: number; rests?: number; to?: string[]; frames: Frame[]; made: {lift: string; liftFrom?: number; from: string; to?: string; hand?: {R: string; L: string}; times?: {arrive: number; pull: number; leaves: number; meet: number; rests: number; vila: number} | null}};
/** En arm i bålen i rutan `x` (meter; under 0 går den fritt): lyft-till-docka.ts armIBalenAv på rutans axlar och leder. */
export const armIBalen = (x: Frame, hip: Vec3, s: 'R' | 'L', doll: ReturnType<typeof dollNamed>) => armIBalenAv(x.R.s, x.L.s, hip, x[s].s, x[s].e, x[s].w, doll);
type Stil = {speed: Record<string, {speed_share_of_top: number[]; top_m_s: {best: {median: number}}}>; handover: {dip_share_of_top: {median: number}}};

/** Handledens fart längs filten (x, z), m/s. */
const fartLangsFilten = (v: Vec3[]) => v.map((p, t) => t ? Math.hypot(p[0] - v[t - 1][0], p[2] - v[t - 1][2]) * FPS : 0);
/** En del av en fartkurva i 21 steg av sin egen tid, som andel av sin topp; toppens läge (andel av tiden) och toppen (m/s). */
function kurva(f: number[], a: number, b: number) {
  const del = f.slice(a, b + 1), top = Math.max(...del), steg = Array.from({length: 21}, (_, i) => { const x = a + (b - a) * i / 20, j = Math.floor(x), r = x - j; return ((f[j] ?? 0) * (1 - r) + (f[Math.min(b, j + 1)] ?? 0) * r) / (top || 1); });
  return {steg: steg.map(x => Math.round(x * 100) / 100), toppVid: Math.round(del.indexOf(top) / Math.max(1, b - a) * 100) / 100, topp: Math.round(top * 100) / 100};
}
/** Där en rörelse börjar före sin topp: bakåt från toppen tills farten är under 15 % av den. */
const borjan = (f: number[], fran: number, till: number) => { let top = fran; for (let t = fran; t <= till; t++) if (f[t] > f[top]) top = t; let s = top; while (s > fran && f[s - 1] > 0.15 * f[top]) s--; return s; };
const slutet = (f: number[], fran: number, till: number) => { let top = fran; for (let t = fran; t <= till; t++) if (f[t] > f[top]) top = t; let s = top; while (s < till && f[s + 1] > 0.15 * f[top]) s++; return s; };

export function kolla(fil: string) {
  const m = JSON.parse(readFileSync(fil, 'utf8')) as Motion, doll = dollNamed(m.doll), f = m.frames, n = f.length;
  const ankAv = (fil: string) => (JSON.parse(readFileSync(path.join(CASINO, fil), 'utf8')) as {frame: Frame}).frame, ank = ankAv(m.made.from), ankSlut = m.made.to ? ankAv(m.made.to) : ank;
  const lyft0 = JSON.parse(readFileSync(path.join(CASINO, m.made.lift), 'utf8')) as Lyft, lyft: Lyft = {...lyft0, frames: lyft0.frames.slice(m.made.liftFrom ?? 0)}, ti = m.made.times ?? null;
  // (ett fynd per slag: i hur många rutor, varje ruta en gång, och det värsta)
  const samla = new Map<string, {rutor: number; varst: number; text: string; vid: number; senast: number}>();
  const not = (vad: string, by: number, text: string, t: number) => { const s = samla.get(vad) ?? {rutor: 0, varst: -Infinity, text: '', vid: t, senast: NaN}; if (s.senast !== t) { s.rutor++; s.senast = t; } if (by > s.varst) { s.varst = by; s.text = text; s.vid = t; } samla.set(vad, s); };
  // ankaret
  // (i sista rutan ligger kortet kvar där det lades: där jämförs bara kroppen, som mat.ts gör)
  const skillnad = (a: Frame, b: Frame, medKort: boolean) => Math.max(length(sub(a.h, b.h)), medKort ? length(sub(a.card.c, b.card.c)) : 0, ...SIDOR.flatMap(([s]) => [length(sub(a[s].s, b[s].s)), length(sub(a[s].e, b[s].e)), length(sub(a[s].w, b[s].w)), ...a[s].p.map((p, k) => length(sub(p, b[s].p[k])))]));
  for (const [vad, t] of [['första rutan är inte ankaret', 0], ['sista rutan är inte ankaret', n - 1]] as const) { const d = skillnad(f[t], t === 0 ? ank : ankSlut, t === 0); if (d > ANKARE) not(vad, d, `${mm1(d)} mm`, t); }
  const benAnk = {R: boneLengths(ank.R.p), L: boneLengths(ank.L.p)}, rackvidd = doll.upperArm + doll.forearm - 0.002;
  const lamnar = m.leavesShoe ?? n, ligger = m.rests ?? n;
  const utanStod: number[] = [];
  f.forEach((x, t) => {
    for (const [s, sign] of SIDOR) { const l = x[s], namn = s === 'R' ? 'höger' : 'vänster';
      const ua = length(sub(l.e, l.s)) - doll.upperArm, fa = length(sub(l.w, l.e)) - doll.forearm;
      if (Math.abs(ua) > 0.001) not(`${namn} överarm ändrar längd`, Math.abs(ua), `${mm1(ua)} mm`, t); if (Math.abs(fa) > 0.001) not(`${namn} underarm ändrar längd`, Math.abs(fa), `${mm1(fa)} mm`, t);
      boneLengths(l.p).forEach((b, k) => { const d = b - benAnk[s][k]; if (Math.abs(d) > 0.001) not(`${namn} hand: ett fingerben ändrar längd`, Math.abs(d), `ben ${k} ${mm1(d)} mm`, t); });
      const bort = length(sub(l.w, l.s)) - rackvidd; if (bort > 0.001) not(`${namn} handled bortom armens räckvidd`, bort, `${mm(bort)} mm`, t);
      const led = grader(dot(unit(sub(l.w, l.e)), unit(sub(l.p[9], l.p[0])))); if (led > HANDLED) not(`${namn} hand mer än 50° från underarmen`, led, `${Math.round(led)}°`, t);
      for (const fel of handFaults(l.p, sign, null, x.card)) if (fel.kind !== 'ordning' && fel.kind !== 'grannen') not(`${namn} hand: ${fel.kind === 'led' ? 'en led bortom vad ett finger kan' : fel.kind === 'i varandra' ? 'fingrar i varandra' : fel.kind === 'kortet' ? 'ett finger i eller genom kortet' : 'ett finger i filten'}`, fel.by, fel.what, t);
      const flata = Math.max(...HANDFLATA.map(([a, b, r]) => -0.002 - (Math.min(l.p[a][1], l.p[b][1]) - r))); if (flata > 0) not(`${namn} handflata i filten`, flata, `${mm1(flata + 0.002)} mm`, t);
      const iBal = armIBalen(x, m.hip, s, doll); if (iBal > BALEN.tol) not(`${namn} arm in i bålen`, iBal, `${mm(iBal)} mm`, t);
    }
    const lagst = Math.min(...horn(x.card).map(p => p[1])); if (t >= lamnar && lagst < -0.002) not('kortet: ett hörn under filten', -lagst, `${mm(-lagst)} mm`, t);
    if (t > lamnar && t < ligger) { const sidor = [...FINGRAR.map(k => mot(x.card, x.R.p[k])), ...FINGRAR.map(k => mot(x.card, x.L.p[k]))].filter(w => w !== null) as number[];
      const hallet = sidor.some(w => w > 0) && sidor.some(w => w < 0), motFilten = lagst < 0.004 && sidor.length > 0, liggande = horn(x.card).every(p => p[1] < 0.004);
      if (!hallet && !motFilten && !liggande) { utanStod.push(t); not('kortet ute ur skon utan stöd', x.card.c[1], `${mm(x.card.c[1])} mm över filten`, t); } }
    if (t > 0) { const y = f[t - 1].card, v = grader(dot(x.card.n, y.n)), l = grader(Math.abs(dot(x.card.l, y.l)));
      if (v > 40) not('kortet vänds mer än 40° på en ruta', v, `${Math.round(v)}°`, t); if (l > 40) not('kortet vrids mer än 40° på en ruta', l, `${Math.round(l)}°`, t); }
  });
  const hack = (vad: string, punkt: (x: Frame) => Vec3, steg = HACK.steg, ryck = HACK.ryck) => {
    const v = [[0, 0, 0] as Vec3, ...f.slice(1).map((x, i) => sub(punkt(x), punkt(f[i]))), [0, 0, 0] as Vec3], s = v.map(length), dv = v.map((x, i) => i ? length(sub(x, v[i - 1])) : 0);
    for (let i = 1; i < n; i++) { const over = s[i] - Math.max(s[i - 1], s[i + 1]); if (over > steg) not(`${vad} hoppar`, over, `${mm(s[i])} mm på en ruta`, i); }
    for (let i = 1; i <= n; i++) { const over = dv[i] - Math.max(dv[i - 1], dv[i + 1] ?? 0); if (over > ryck) not(`${vad} rycker`, over, `farten ändras ${mm(dv[i])} mm per ruta`, i - 1); }
  };
  for (const [s, namn] of [['R', 'höger'], ['L', 'vänster']] as const) { hack(`${namn} handled`, x => x[s].w); hack(`${namn} armbåge`, x => x[s].e); for (const k of TOPPAR) hack(`${namn} fingertopp ${k}`, x => x[s].p[k]); }
  hack('kortet', x => x.card.c); hack('huvudet', x => x.h, HACK.huvudSteg, HACK.huvudRyck);
  { const b = f.map((x, i) => { if (!i) return 0; const a = sub(x.g, x.h), c = sub(f[i - 1].g, f[i - 1].h); return grader(dot(unit(a), unit(c))); });
    for (let i = 1; i < n; i++) { const over = b[i] - Math.max(b[i - 1], b[i + 1] ?? 0); if (over > HACK.blick) not('blicken hoppar', over, `${Math.round(b[i])}° på en ruta`, i); } }
  // landningen (Jakob 2026-11-27: kortet "ska inte automatiskt läggas i rätt vinkel bara för det inte kom exakt rätt"):
  // kortet ska landa där rörelsens mål är (made.chosen.landning.malet: där den riktiga dealerns kort låg; en äldre rörelse
  // utan det: kortplatsen), inom 3 mm och 2°, plant med framsidan upp och stilla efteråt; och från att det ligger plant på
  // filten tills det ligger får det inte vridas eller glida under tummen: det rör sig bara med handen (spärr över
  // 1° eller 1,5 mm). Avståndet till kortplatsen (LIVE.cards) står bredvid.
  let landning: {franMaletMm: number; vinkelMotMalet: number; franPlatsenMm: number; vinkelMotPlatsen: number; plant: boolean; framsidanUpp: boolean; rorSigMm: number; vridsPaFiltenGrader: number; glider: number} | null = null;
  if (m.rests !== undefined && m.to) { const k = f[m.rests].card, p = LIVE.cards[m.to[0]], mal = (m.made as {chosen?: {landning?: {malet?: {c: Vec3; vinkel: number}}}}).chosen?.landning?.malet ?? {c: p.at, vinkel: p.turn};
    const vinkelAv = (l: Vec3) => { let a = Math.atan2(l[0], l[2]) * 180 / Math.PI; while (a < 0) a += 180; while (a >= 180) a -= 180; return a; }, mellan = (a: number, b: number) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
    const fran = (c: Vec3) => Math.hypot(k.c[0] - c[0], k.c[2] - c[2]), dM = fran(mal.c), r1 = (x: number) => Math.round(x * 10) / 10;
    // (från rutan kortet först ligger plant på filten till rutan det ligger: dess vinkel och den hållande fingertoppens ställe
    // på det; den hållande är högerns fingertopp närmast kortets ovansida i den första rutan, tummen hos dealern)
    const TOPPAR_R = [4, 8, 12, 16, 20], overKortet = (x: Frame, k: number) => { const d = sub(x.R.p[k], x.card.c), a = cross(x.card.n, x.card.l);
      return {over: Math.abs(dot(d, x.card.n)) - CARD.thickness / 2, inom: Math.abs(dot(d, x.card.l)) < CARD.height / 2 + 0.005 && Math.abs(dot(d, a)) < CARD.width / 2 + 0.005}; };
    const plant = (x: Frame) => Math.abs(x.card.n[1]) > Math.cos(1 * Math.PI / 180) && x.card.c[1] < 0.001;
    let t0 = m.rests; while (t0 > (m.leavesShoe ?? 0) + 1 && plant(f[t0 - 1])) t0--;
    const haller = TOPPAR_R.map(k => ({k, ...overKortet(f[t0], k)})).filter(x => x.inom).sort((p, q) => p.over - q.over)[0]?.k ?? 8;
    const paKortet = (x: Frame) => { const d = sub(x.R.p[haller], x.card.c), a = cross(x.card.n, x.card.l); return [dot(d, x.card.l), dot(d, a)]; }, p0 = paKortet(f[t0]);
    const vrids = Math.max(0, ...f.slice(t0, m.rests + 1).map(x => mellan(vinkelAv(x.card.l), vinkelAv(f[t0].card.l)))), glider = Math.max(0, ...f.slice(t0, m.rests + 1).map(x => { const q = paKortet(x); return Math.hypot(q[0] - p0[0], q[1] - p0[1]); }));
    landning = {franMaletMm: r1(dM * 1000), vinkelMotMalet: r1(mellan(vinkelAv(k.l), mal.vinkel)), franPlatsenMm: r1(fran(p.at) * 1000), vinkelMotPlatsen: r1(mellan(vinkelAv(k.l), p.turn)), plant: Math.abs(k.n[1]) > Math.cos(1 * Math.PI / 180), framsidanUpp: k.n[1] > 0,
      rorSigMm: Math.round(Math.max(...f.slice(m.rests, n - 1).map(x => length(sub(x.card.c, k.c)))) * 10000) / 10, vridsPaFiltenGrader: r1(vrids), glider: r1(glider * 1000)};
    if (dM > 0.003 || landning.vinkelMotMalet > 2 || !landning.plant || !landning.framsidanUpp || landning.rorSigMm > 1) not('kortet landar inte rätt', dM, `${landning.franMaletMm} mm och ${landning.vinkelMotMalet}° från målet`, m.rests);
    if (vrids > 1 || glider > 0.0015) not('kortet läggs till rätta på filten', Math.max(vrids, glider * 1000), `vrids ${landning.vridsPaFiltenGrader}° och glider ${landning.glider} mm under tummen medan det ligger, rutorna ${t0}–${m.rests}`, t0);
    // (domaren 2026-11-27: kortet föll de sista 30 mm med fingret ovanför och gled sedan bakåt av sig självt): från tre rutor
    // innan kortet ligger plant till att det ligger rör det sig bara med en fingertopp på sig (tummen), toppens mitt högst 12 mm från
    // kortets ovansida och inom 5 mm från dess kanter
    for (let t = Math.max((m.leavesShoe ?? 0) + 1, t0 - 3); t <= m.rests; t++) { const k = f[t].card, steg = length(sub(k.c, f[t - 1].card.c)); if (steg <= 0.001) continue;
      const nara = TOPPAR_R.map(j => overKortet(f[t], j)).filter(x => x.inom).sort((p, q) => p.over - q.over)[0];
      if (!nara || nara.over > 0.012) not('kortet rör sig utan fingret', steg, `${mm(steg)} mm på en ruta med närmaste fingertopp ${nara ? `${mm(nara.over)} mm från kortet` : 'utanför det'}`, t); } }

  // ---- mot lyftet
  // (två gånger: över hela stycket, och över rörelsen själv, där ankarets början och slut inte räknas: för en giv från att
  // vänsterhanden är vid skon till att högerns fingrar har vilat på kortet, för en väntan utom de tio första och sista rutorna)
  const L = lyft.frames, led = (namn: string, a: (x: Frame) => Vec3, b: (y: Lyft['frames'][number]) => Vec3 | null, fran = 0, till = n - 1) => {
    const d = f.flatMap((x, t) => { const q = t >= fran && t <= till && t < L.length ? b(L[t]) : null; return q ? [[a(x), q]] : []; }), px = d.map(([p, q]) => { const P = liveSee(p), Q = liveSee(q); return P && Q ? Math.hypot(P.x - Q.x, P.y - Q.y) : NaN; });
    return {led: namn, x: mm(median(d.map(([p, q]) => Math.abs(p[0] - q[0])))), y: mm(median(d.map(([p, q]) => Math.abs(p[1] - q[1])))), z: mm(median(d.map(([p, q]) => Math.abs(p[2] - q[2])))), bild: Math.round(median(px.filter(Number.isFinite)))};
  };
  const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const leder = (fran?: number, till?: number) => [
    led('axlarna', x => mid(x.R.s, x.L.s), y => mid(y.R.s, y.L.s), fran, till), led('höger armbåge', x => x.R.e, y => y.R.e, fran, till), led('vänster armbåge', x => x.L.e, y => y.L.e, fran, till),
    led('höger handled', x => x.R.w, y => y.R.w, fran, till), led('vänster handled', x => x.L.w, y => y.L.w, fran, till), led('höger fingertoppar', x => mid(x.R.p[8], x.R.p[12]), y => y.R.p ? mid(y.R.p[8], y.R.p[12]) : null, fran, till),
    led('vänster fingertoppar', x => mid(x.L.p[8], x.L.p[12]), y => y.L.p ? mid(y.L.p[8], y.L.p[12]) : null, fran, till), led('huvudet', x => x.h, y => y.h, fran, till)];
  const motLyftet = {helaStycket: leder(), rorelsen: ti ? leder(ti.arrive, ti.vila) : leder(10, n - 11), rutor: ti ? [ti.arrive, ti.vila] : [10, n - 11]};
  // handen mot lyftet, ruta för ruta: mot lyftet jämnat som verktyget gör det, och mot det råa
  // (ändpunkten: högerns väg böjd mot kortets mål från bytet till nedläggningen, made.hand a; lyft-till-docka.ts andpunktMm)
  const andpunkt = ((m.made as {chosen?: {andpunktMm?: number}}).chosen?.andpunktMm ?? 0) / 1000;
  const handMotLyftet: Record<string, unknown> = {andpunktFlyttadMm: mm(andpunkt)};
  for (const [s, namn] of [['R', 'höger'], ['L', 'vänster']] as const) {
    // (tvärs synlinjen från livebordets kamera: det filmens bild visar, och spärrar; längs den: djupet, som redovisas; och i bildpunkter)
    const kod = m.made.hand?.[s] ?? 'l'.repeat(n), jamnad = lugna(L.map(y => y[s].w)), per: Record<string, number[]> = {}, ra: Record<string, number[]> = {}, langs: Record<string, number[]> = {}, px: Record<string, number[]> = {};
    for (let t = 0; t < Math.min(n, L.length); t++) { const k = kod[t] ?? 'l', u = unit(sub(jamnad[t], KAMERAN)), dv = sub(f[t][s].w, jamnad[t]), along = dot(dv, u), d = length(sub(dv, [u[0] * along, u[1] * along, u[2] * along]));
      const rv = sub(f[t][s].w, L[t][s].w), ur = unit(sub(L[t][s].w, KAMERAN)), ra0 = dot(rv, ur), r = length(sub(rv, [ur[0] * ra0, ur[1] * ra0, ur[2] * ra0])), P = liveSee(f[t][s].w), Q = liveSee(L[t][s].w);
      (per[k] ??= []).push(d); (ra[k] ??= []).push(r); (langs[k] ??= []).push(Math.abs(along)); if (P && Q) (px[k] ??= []).push(Math.hypot(P.x - Q.x, P.y - Q.y) / 1000);
      if (k === 'l' && d > 0.0015) not(`${namn} handled ur lyftet`, d, `${mm(d)} mm från lyftet tvärs synlinjen utan kontakt`, t); if (k === 'k' && d > KONTAKT + 0.0005) not(`${namn} handled ur lyftet`, d, `${mm(d)} mm från lyftet tvärs synlinjen i en kontakt`, t);
      if (k === 'a' && d > andpunkt + KONTAKT + 0.0005) not(`${namn} handled ur lyftet`, d, `${mm(d)} mm från lyftet tvärs synlinjen, mer än ändpunktens flytt ${mm(andpunkt)} mm och en kontakt`, t); }
    const sam = (v: number[] = []) => { const s2 = [...v].sort((a, b) => a - b); return v.length ? {rutor: v.length, median: mm(s2[s2.length >> 1]), p95: mm(s2[Math.floor(s2.length * 0.95)]), mest: mm(s2[s2.length - 1])} : null; };
    handMotLyftet[namn] = {lyftet: sam(per.l), kontakt: sam(per.k), andpunkt: sam(per.a), brygga: sam(per.b), vilan: sam(per.v), raa: {lyftet: sam(ra.l), kontakt: sam(ra.k)}, langs: {lyftet: sam(langs.l), kontakt: sam(langs.k)}, bildpunkter: {lyftet: sam(px.l), kontakt: sam(px.k)}};
  }
  // skakigheten: i stillheten, steget och ändringen i steget (mm), dockans och lyftets; handledernas toppfart (m/s)
  const skak = (v: Vec3[]) => { const sl = jamna(v, 1), still = sl.map((p, t) => t > 0 && t < v.length - 1 && length(sub(sl[t + 1], sl[t - 1])) * FPS / 2 < 0.08), steg: number[] = [], acc: number[] = [];
    for (let t = 1; t < v.length - 1; t++) if (still[t]) { steg.push(length(sub(v[t], v[t - 1]))); acc.push(length(sub(add3(v[t + 1], v[t - 1]), mul2(v[t])))); }
    return {stilla: steg.length, steg: Math.round(median(steg) * 10000) / 10, andra: Math.round(median(acc) * 10000) / 10}; };
  const topp = (v: Vec3[]) => Math.round(Math.max(...v.map((p, t) => t ? length(sub(p, v[t - 1])) * FPS : 0)) * 100) / 100;
  const tipp = (p: Vec3[] | null) => p ? [(p[8][0] + p[12][0]) / 2, (p[8][1] + p[12][1]) / 2, (p[8][2] + p[12][2]) / 2] as Vec3 : null;
  const fylld = (v: (Vec3 | null)[]) => { let sista: Vec3 | null = v.find(Boolean) ?? null; return v.map(x => (sista = x ?? sista) as Vec3); };
  const dockan = f.slice(0, Math.min(n, L.length)), skakighet = {
    'höger handled': {dockan: skak(dockan.map(x => x.R.w)), lyftet: skak(L.map(y => y.R.w))}, 'vänster handled': {dockan: skak(dockan.map(x => x.L.w)), lyftet: skak(L.map(y => y.L.w))},
    'höger fingertoppar': {dockan: skak(dockan.map(x => tipp(x.R.p)!)), lyftet: skak(fylld(L.map(y => tipp(y.R.p))))}, 'vänster fingertoppar': {dockan: skak(dockan.map(x => tipp(x.L.p)!)), lyftet: skak(fylld(L.map(y => tipp(y.L.p))))},
    'huvudet': {dockan: skak(dockan.map(x => x.h)), lyftet: skak(fylld(L.map(y => y.h)))},
    toppfart: {höger: {dockan: topp(f.map(x => x.R.w)), lyftet: topp(L.map(y => y.R.w))}, vänster: {dockan: topp(f.map(x => x.L.w)), lyftet: topp(L.map(y => y.L.w))}}};
  // RYCKEN (Jakob 2026-11-27: "Små olika typer av 'ryck' som vi fick när vår docka nitiskt följde livedealern ... i
  // huvud var det framförallt. Men jag vet att det har skett kring handen också"): per punkt farten per ruta (mm), fartbytet
  // (ändringen i fart mellan två rutor, som vektor) och darret (rms mot ett glidande medel över fem rutor), dockans bredvid
  // det råa lyftets. Spärr: huvudet eller en axel fortare än dubbla dealerns (största farten, plus 1 mm); en handled vars
  // fartbyte i en ruta där handen är lyftets är mer än 8 mm större än lyftets eget i rutorna omkring (två åt var sida);
  // blicken som vrider sig ryckigt (vinkelns fartbyte över 3 grader på en ruta); fingertopparna mot handleden som darrar
  // mer än lyftets.
  const serie = (v: (Vec3 | null)[]) => { const fart: number[] = [], byte: number[] = [], darr: number[] = [];
    for (let t = 1; t < v.length; t++) { const a = v[t - 1], b = v[t]; fart.push(a && b ? length(sub(b, a)) : NaN); }
    for (let t = 2; t < v.length; t++) { const a = v[t - 2], b = v[t - 1], c = v[t]; byte.push(a && b && c ? length(sub(add3(c, a), mul2(b))) : NaN); }
    for (let t = 2; t < v.length - 2; t++) { const w = v.slice(t - 2, t + 3); if (w.every(Boolean)) { const m = [0, 1, 2].map(k => w.reduce((s, p) => s + p![k], 0) / 5) as Vec3; darr.push(length(sub(v[t]!, m)) ** 2); } }
    const mest = (x: number[]) => Math.max(...x.filter(Number.isFinite)); return {fart, byte, mestFart: mest(fart), mestByte: mest(byte), darr: Math.sqrt(darr.reduce((s, x) => s + x, 0) / (darr.length || 1))}; };
  const mm1v = (x: number) => Math.round(x * 10000) / 10;
  const ryck: Record<string, {dockan: {mestFart: number; mestByte: number; darr: number}; lyftet: {mestFart: number; mestByte: number; darr: number}}> = {};
  const jamfor = (namn: string, d: (Vec3 | null)[], l: (Vec3 | null)[]) => { const a = serie(d), b = serie(l); ryck[namn] = {dockan: {mestFart: mm1v(a.mestFart), mestByte: mm1v(a.mestByte), darr: mm1v(a.darr)}, lyftet: {mestFart: mm1v(b.mestFart), mestByte: mm1v(b.mestByte), darr: mm1v(b.darr)}}; return {a, b}; };
  for (const [namn, d, l] of [['huvudet', f.map(x => x.h), L.map(y => y.h)], ['höger axel', f.map(x => x.R.s), L.map(y => y.R.s)], ['vänster axel', f.map(x => x.L.s), L.map(y => y.L.s)]] as [string, Vec3[], (Vec3 | null)[]][]) {
    const {a, b} = jamfor(namn, d, l); if (a.mestFart > 2 * b.mestFart + 0.001) not(`${namn} rör sig mer än dealerns`, a.mestFart, `${mm1v(a.mestFart)} mm på en ruta (dealern högst ${mm1v(b.mestFart)})`, a.fart.indexOf(a.mestFart) + 1); }
  for (const [s, namn] of [['R', 'höger'], ['L', 'vänster']] as const) {
    const {a, b} = jamfor(`${namn} handled`, f.map(x => x[s].w), L.map(y => y[s].w)), kod = m.made.hand?.[s] ?? 'l'.repeat(n);
    a.byte.forEach((x, i) => { const t = i + 1; if (!'lka'.includes(kod[t] ?? 'v') || !Number.isFinite(x)) return; const ref = Math.max(...b.byte.slice(Math.max(0, i - 2), i + 3).filter(Number.isFinite), 0);
      if (x > ref + 0.008) not(`${namn} handled rycker mer än dealerns`, x - ref, `fartbytet ${mm1v(x)} mm mot dealerns ${mm1v(ref)}`, t); });
    const tipp = (p: Vec3[] | null, w: Vec3) => p ? sub(p[8], w) : null, {a: ta, b: tb} = jamfor(`${namn} pekfingertopp mot handleden`, f.map(x => tipp(x[s].p, x[s].w)), L.map(y => tipp(y[s].p, y[s].w)));
    if (ta.darr > tb.darr) not(`${namn} pekfingertopp darrar mer än dealerns`, ta.darr, `${mm1v(ta.darr)} mm rms mot dealerns ${mm1v(tb.darr)}`, 0); }
  { const rikt = (x: {h: Vec3 | null; g: Vec3 | null}) => x.h && x.g ? unit(sub(x.g, x.h)) : null, d = f.map(rikt), vinkel = (p: Vec3, q: Vec3) => grader(dot(p, q));
    const steg = d.map((x, t) => t && x && d[t - 1] ? vinkel(x, d[t - 1]!) : NaN), byte = steg.map((x, t) => t > 1 ? Math.abs(x - steg[t - 1]) : NaN), mest = Math.max(...byte.filter(Number.isFinite));
    const lr = L.map(y => rikt(y)), ls = lr.map((x, t) => t && x && lr[t - 1] ? vinkel(x, lr[t - 1]!) : NaN);
    ryck.blicken = {dockan: {mestFart: Math.round(Math.max(...steg.filter(Number.isFinite)) * 10) / 10, mestByte: Math.round(mest * 10) / 10, darr: NaN}, lyftet: {mestFart: Math.round(Math.max(...ls.filter(Number.isFinite)) * 10) / 10, mestByte: NaN, darr: NaN}};
    if (mest > 3) not('blicken vrider sig ryckigt', mest, `${Math.round(mest * 10) / 10}° fartbyte på en ruta`, byte.indexOf(mest)); }
  // HUVUDETS VINKEL (domaren 2026-11-27: "den riktiga dealern håller huvudet stilla och lätt böjt"): huvudets riktning per
  // ruta (mot hv där rörelsen har ett eget mål för huvudet, annars mot blickpunkten, som dockans kod vänder det), som lutning
  // (upp +) och vridning i grader; dealerns är hans eget huvud (lyftets hv, utan ögonen; finns det inte, blicken), jämnat till 1 Hz.
  // Spärr: dockans huvud svänger mer än dealerns över rörelsen (5 grader marginal) eller vrids fortare på en ruta (0,5 grader
  // marginal), utom i en rörelse mellan två ankaren.
  // Lutningen är huvudets höjdvinkel (upp positivt), vridningen sidvinkeln (mot bildens höger positivt), tippningen kring
  // hållet det vetter åt (toppen mot dealerns egen höger positivt; dockans ht, dealerns lyftets huvud[2]); steget är den
  // största vinkeln huvudet går på en ruta, alla tre tillsammans. Ifrån: hur långt dockans huvud som mest är från dealerns
  // i samma ruta (i början och slutet tonar det till ankaret, så där får det vara ifrån). Dealern räknas över samma rutor som
  // dockan, och hans sväng med ankarets huvud.
  const huvudVinkel = (() => { const rikt = (h: Vec3 | null, p: Vec3 | null | undefined) => h && p ? unit(sub(p, h)) : null, grad2 = (d: Vec3, tipp: number) => ({lut: Math.asin(d[1]) * 180 / Math.PI, vrid: Math.atan2(d[0], d[2]) * 180 / Math.PI, tipp});
    const dock = f.map(x => grad2(rikt(x.h, (x as Frame & {hv?: Vec3}).hv ?? x.g)!, (x as {ht?: number}).ht ?? 0));
    const Lh = L.slice(0, n), lr = Lh.map(y => rikt(y.h, (y as {hv?: Vec3 | null}).hv ?? y.g)); let sista = lr.find(Boolean) ?? [0, 0, -1] as Vec3; const lf = lr.map(x => (sista = x ?? sista)), dealer = jamna(lf, 1).map((x, t) => grad2(unit(x), (Lh[t] as {huvud?: number[] | null}).huvud?.[2] ?? 0));
    const K = ['lut', 'vrid', 'tipp'] as const, rund = (x: number) => Math.round(x * 10) / 10;
    const sving = (v: {lut: number; vrid: number; tipp: number}[]) => { const r = (k: typeof K[number]) => rund(Math.max(...v.map(x => x[k])) - Math.min(...v.map(x => x[k])));
      return {lut: r('lut'), vrid: r('vrid'), tipp: r('tipp'), steg: rund(Math.max(...v.slice(1).map((x, i) => Math.hypot(x.lut - v[i].lut, x.vrid - v[i].vrid, x.tipp - v[i].tipp))))}; };
    const ifran = Object.fromEntries(K.map(k => [k, rund(Math.max(...dock.map((x, t) => Math.abs(x[k] - dealer[Math.min(t, dealer.length - 1)][k]))))])) as Record<typeof K[number], number>;
    // (dealerns sväng räknas med ankarets huvud, där rörelsen börjar och slutar: ankaret är hans egen hållning i en annan ruta)
    const medAnkaret = sving([...dealer, dock[0], dock[dock.length - 1]]);
    return {dockan: sving(dock), dealern: {...medAnkaret, steg: sving(dealer).steg}, ifran}; })();
  const mellanAnkaren = !!m.ankare && m.ankare.borjan !== m.ankare.slut;
  if (!mellanAnkaren && huvudVinkel.dockan.steg > huvudVinkel.dealern.steg + 0.5) not('huvudet vrids fortare än dealerns', huvudVinkel.dockan.steg, `${huvudVinkel.dockan.steg}° på en ruta mot dealerns ${huvudVinkel.dealern.steg}°`, 0);
  if (!mellanAnkaren) for (const k of ['lut', 'vrid', 'tipp'] as const) if (huvudVinkel.dockan[k] > huvudVinkel.dealern[k] + 5) not(`huvudet svänger mer än dealerns (${k === 'lut' ? 'lutning' : k === 'vrid' ? 'vridning' : 'tippning'})`, huvudVinkel.dockan[k], `${huvudVinkel.dockan[k]}° mot dealerns ${huvudVinkel.dealern[k]}°`, 0);
  // blicken i vilan: mot livebordets kamera där båda händerna vilar
  // (i en väntan de rutor där lyftet säger att dealern ser in i kameran, fältet blick; finns det inte, alla)
  const kamera: Vec3 = [0, LIVE_CAMERA.height, 0], blickF = (t: number) => (L[t] as {blick?: string} | undefined)?.blick, harBlick = L.some((_, t) => blickF(t) !== undefined);
  const vilar = (t: number) => ti ? (m.made.hand ? m.made.hand.R[t] === 'v' && m.made.hand.L[t] === 'v' : t < 3 || t > n - 4) : !harBlick || blickF(t) === 'kameran';
  const blickMot = (h: Vec3 | null, g: Vec3 | null) => { if (!h || !g) return null; const a = unit(sub(g, h)), c = unit(sub(kamera, h)); return {grader: grader(dot(a, c)), upp: Math.asin(a[1]) * 180 / Math.PI - Math.asin(c[1]) * 180 / Math.PI}; };
  const blickSam = (v: ({grader: number; upp: number} | null)[]) => { const x = v.filter(Boolean) as {grader: number; upp: number}[]; return x.length ? {rutor: x.length, grader: Math.round(median(x.map(y => y.grader)) * 10) / 10, upp: Math.round(median(x.map(y => y.upp)) * 10) / 10} : null; };
  const blicken = {dockan: blickSam(f.map((x, t) => t > 0 && t < n - 1 && vilar(t) ? blickMot(x.h, x.g) : null)), lyftet: ti ? null : blickSam(L.map((y, t) => vilar(t) ? blickMot(y.h, y.g) : null)), ankaret: blickSam([blickMot(ank.h, ank.g)])};
  // farten
  const stil = JSON.parse(readFileSync(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`), 'utf8')) as Stil;
  const fD = {R: fartLangsFilten(f.map(x => x.R.w)), L: fartLangsFilten(f.map(x => x.L.w))}, fL = {R: fartLangsFilten(jamna(L.map(y => y.R.w))), L: fartLangsFilten(jamna(L.map(y => y.L.w)))};
  const farten: Record<string, unknown> = {};
  if (ti) {
    const delar: [string, 'R' | 'L', number, number][] = [['left_to_shoe', 'L', borjan(fD.L, 1, ti.arrive), ti.arrive], ['left_back_with_card', 'L', ti.pull, ti.meet], ['right_out', 'R', ti.meet, ti.rests], ['right_back', 'R', ti.vila, slutet(fD.R, ti.vila, n - 2)]];
    for (const [namn, s, a, b] of delar) { if (b - a < 3) continue; const d = kurva(fD[s], a, b), l = kurva(fL[s], a, b), st = stil.speed[namn], stTopp = st.speed_share_of_top.indexOf(Math.max(...st.speed_share_of_top)) / 20;
      farten[namn] = {rutor: [a, b], sekunder: Math.round((b - a) / FPS * 100) / 100, dockan: d, lyftet: l, stilen: {toppVid: stTopp, topp: st.top_m_s.best.median, steg: st.speed_share_of_top}}; }
    // dalen i bytet: handen som har kortet (vänstern till bytet, högern efter), från vänsterns topp till högerns
    const dal = (fv: {R: number[]; L: number[]}) => { let a = ti.pull; for (let t = ti.pull; t <= ti.meet; t++) if (fv.L[t] > fv.L[a]) a = t; let b = ti.meet; for (let t = ti.meet; t <= ti.rests; t++) if (fv.R[t] > fv.R[b]) b = t;
      const v = Array.from({length: b - a + 1}, (_, i) => a + i <= ti.meet ? fv.L[a + i] : fv.R[a + i]), top = Math.max(fv.L[a], fv.R[b]); return {dal: Math.round(Math.min(...v) / top * 100) / 100, toppTillTopp: Math.round((b - a) / FPS * 100) / 100}; };
    farten.dalen = {dockan: dal(fD), lyftet: dal(fL), stilen: stil.handover.dip_share_of_top.median};
  }
  const fynd = [...samla].map(([vad, s]) => ({vad, rutor: s.rutor, varst: s.text, vid: s.vid}));
  const sparrar = fynd.filter(x => !/fingrar i varandra/.test(x.vad));
  const armIBalenMest = Object.fromEntries((['R', 'L'] as const).map(s => [s === 'R' ? 'höger' : 'vänster', mm(Math.max(...f.map(x => armIBalen(x, m.hip, s, doll))))]));
  return {ansikte: null as null | ReturnType<typeof ansiktet>, fil: path.basename(fil), docka: m.doll, rutor: n, sekunder: Math.round(n / FPS * 100) / 100, lyftetsSekunder: Math.round(L.length / FPS * 100) / 100, landning, fynd, sparrar, handMotLyftet, armIBalenMest, skakighet, ryck, huvudVinkel, blicken, motLyftet, farten};
}

/**
 * HUVUDET SOM DET SYNS (domaren 2026-11-27 mätte dockans huvud i den ritade filmen med ansiktsnätet, och två försök föll på
 * att det inte var huvudet i datat): ansiktsnätets nick, vridning och tippning för dockans film genom livebordets kamera
 * (live-bj/verktyg/lyft.py dockhuvud, jämnat som dealerns) bredvid samma nät på dealern (lyftets ansikte), ruta för ruta, i
 * absoluta tal mot kameran (ett lyft utan ansikte: lyftets huvud, efter medelskillnaden); farten per ruta som den är. Spärr: en
 * vinkel mer än 6° från dealerns i en ruta, eller fortare än dealerns snabbaste ruta och 0,5°.
 */
function ansiktet(fil: string, ansikteFil: string, sparrar: {vad: string; rutor: number; varst: string; vid: number}[]) {
  const m = JSON.parse(readFileSync(fil, 'utf8')) as Motion, a = JSON.parse(readFileSync(ansikteFil, 'utf8')) as {evened: number[][]; found: number};
  const lyft = JSON.parse(readFileSync(path.join(CASINO, m.made.lift), "utf8")) as {frames: {huvud?: number[] | null; ansikte?: number[] | null}[]}, s = m.made.liftFrom ?? 0, absolut = lyft.frames.some(x => x.ansikte);
  const dl = lyft.frames.slice(s).map(x => (absolut ? x.ansikte : x.huvud) ?? [0, 0, 0]), d = a.evened, n = Math.min(d.length, m.frames.length), rund = (x: number) => Math.round(x * 10) / 10;
  const med = (v: number[]) => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)];
  return (['nick', 'vridning', 'tippning'] as const).map((namn, k) => {
    const doll = d.slice(0, n).map(x => x[k]), deal = doll.map((_, t) => dl[Math.min(t, dl.length - 1)][k]), off = absolut ? 0 : med(doll.map((x, t) => x - deal[t]));
    const diff = doll.map((x, t) => x - deal[t] - off), steg = (v: number[]) => Math.max(...v.slice(1).map((x, i) => Math.abs(x - v[i])));
    const varst = diff.reduce((b, x, t) => Math.abs(x) > Math.abs(diff[b]) ? t : b, 0), r = {namn, skillnad: rund(diff[varst]), vid: varst, fart: rund(steg(doll)), dealernsFart: rund(steg(deal))};
    if (Math.abs(r.skillnad) > 6) sparrar.push({vad: `ansiktet i bilden: ${namn} skiljer sig från dealerns`, rutor: diff.filter(x => Math.abs(x) > 6).length, varst: `${r.skillnad}°`, vid: varst});
    if (r.fart > r.dealernsFart + 0.5) sparrar.push({vad: `ansiktet i bilden: ${namn} fortare än dealerns`, rutor: 1, varst: `${r.fart}° på en ruta mot dealerns ${r.dealernsFart}°`, vid: 0});
    return r; });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ai = process.argv.indexOf('--ansikte'), ansikteFil = ai > 0 ? process.argv[ai + 1] : null;
  const filer = process.argv.slice(2).filter((a, i, v) => !a.startsWith('--') && v[i - 1] !== '--ansikte'), alla = filer.length ? filer.map(f => path.resolve(f)) : readdirSync(DATA).filter(f => /^lyft-.*\.json$/.test(f)).sort().map(f => path.join(DATA, f));
  const ut = alla.map(f => kolla(f));
  if (ansikteFil && ut.length === 1) ut[0].ansikte = ansiktet(alla[0], ansikteFil, ut[0].sparrar);
  if (process.argv.includes('--json')) console.log(JSON.stringify(ut, null, 1));
  else for (const r of ut) {
    console.log(`${r.fil}: ${r.rutor} rutor (${r.sekunder} s; lyftet ${r.lyftetsSekunder} s) ${r.sparrar.length ? `SPÄRR: ${r.sparrar.map(x => `${x.vad} (${x.rutor} rutor, värst ${x.varst} i ruta ${x.vid})`).join('; ')}` : 'grön'}`);
    const iv = r.fynd.filter(x => /fingrar i varandra/.test(x.vad)); if (iv.length) console.log(`  märkt, ingen spärr: ${iv.map(x => `${x.vad} ${x.rutor} rutor`).join('; ')}`);
    if (r.landning) console.log(`  landningen: ${r.landning.franMaletMm} mm och ${r.landning.vinkelMotMalet}° från målet (där den riktiga dealerns kort låg), ${r.landning.franPlatsenMm} mm och ${r.landning.vinkelMotPlatsen}° från kortplatsen, ${r.landning.plant ? 'plant' : 'inte plant'}, framsidan ${r.landning.framsidanUpp ? 'upp' : 'NED'}, på filten vriden ${r.landning.vridsPaFiltenGrader}° och glidit ${r.landning.glider} mm under tummen, rör sig ${r.landning.rorSigMm} mm efteråt`);
    type Sam = {rutor: number; median: number; p95: number; mest: number} | null;
    const sam = (x: Sam) => x ? `${x.rutor} rutor median ${x.median}, 95 % ${x.p95}, mest ${x.mest}` : '–';
    console.log(`  ändpunkten flyttad ${(r.handMotLyftet as {andpunktFlyttadMm: number}).andpunktFlyttadMm} mm tvärs synlinjen (högerns väg böjd så att kortet landar där den riktiga dealerns låg)`);
    for (const [namn, v] of Object.entries(r.handMotLyftet).filter(([k]) => k !== 'andpunktFlyttadMm') as [string, {lyftet: Sam; kontakt: Sam; brygga: Sam; vilan: Sam; raa: {lyftet: Sam; kontakt: Sam}; langs: {lyftet: Sam; kontakt: Sam}; bildpunkter: {lyftet: Sam; kontakt: Sam}}][])
      console.log(`  ${namn} handled mot lyftet, tvärs synlinjen (mm): lyftet ${sam(v.lyftet)}; kontakt ${sam(v.kontakt)}; brygga ${sam(v.brygga)}; mot det råa ${sam(v.raa.lyftet)} / ${sam(v.raa.kontakt)}; i bilden (px) ${sam(v.bildpunkter.lyftet)} / ${sam(v.bildpunkter.kontakt)}; längs synlinjen (djupet, mm) ${sam(v.langs.lyftet)} / ${sam(v.langs.kontakt)}`);
    console.log(`  arm in i bålen som mest (mm): höger ${r.armIBalenMest.höger}, vänster ${r.armIBalenMest.vänster}`);
    const sk = r.skakighet as unknown as Record<string, {dockan: {steg: number; andra: number; stilla: number}; lyftet: {steg: number; andra: number}}> & {toppfart: Record<string, {dockan: number; lyftet: number}>};
    console.log(`  skakighet i stillheten (mm steg/ändring, dockan mot lyftet): ${Object.entries(sk).filter(([k]) => k !== 'toppfart').map(([k, v0]) => { const v = v0 as {dockan: {steg: number; andra: number; stilla: number}; lyftet: {steg: number; andra: number}}; return `${k} ${v.dockan.steg}/${v.dockan.andra} mot ${v.lyftet.steg}/${v.lyftet.andra} (${v.dockan.stilla} rutor)`; }).join('; ')}; toppfart (m/s) höger ${sk.toppfart.höger.dockan} mot ${sk.toppfart.höger.lyftet}, vänster ${sk.toppfart.vänster.dockan} mot ${sk.toppfart.vänster.lyftet}`);
    console.log(`  ryck (dockan mot dealern: största fart per ruta / största fartbyte / darr rms, mm; blicken grader): ${Object.entries(r.ryck).map(([k, v]) => `${k} ${v.dockan.mestFart}/${v.dockan.mestByte}/${v.dockan.darr} mot ${v.lyftet.mestFart}/${v.lyftet.mestByte}/${v.lyftet.darr}`).join('; ')}`);
    console.log(`  huvudets vinkel, största sväng över rörelsen (grader, lutning/vridning/tippning/största steg på en ruta): dockan ${r.huvudVinkel.dockan.lut}/${r.huvudVinkel.dockan.vrid}/${r.huvudVinkel.dockan.tipp}/${r.huvudVinkel.dockan.steg}, dealern ${r.huvudVinkel.dealern.lut}/${r.huvudVinkel.dealern.vrid}/${r.huvudVinkel.dealern.tipp}/${r.huvudVinkel.dealern.steg}; dockan som mest ifrån dealern i samma ruta ${r.huvudVinkel.ifran.lut}/${r.huvudVinkel.ifran.vrid}/${r.huvudVinkel.ifran.tipp}`);
    if (r.ansikte) console.log(`  ansiktet i bilden (ansiktsnätet på dockans film mot samma nät på dealern, absoluta tal; största skillnad, i ruta / största fart per ruta, dockan mot dealern, grader): ${r.ansikte.map(x => `${x.namn} ${x.skillnad} i ruta ${x.vid} / ${x.fart} mot ${x.dealernsFart}`).join("; ")}`);
    const bl = (x: {rutor: number; grader: number; upp: number} | null) => x ? `${x.grader}° (${x.upp >= 0 ? '+' : ''}${x.upp}° upp, ${x.rutor} rutor)` : '–';
    console.log(`  blicken i vilan mot kameran: dockan ${bl(r.blicken.dockan)}, lyftet ${bl(r.blicken.lyftet)}, ankaret ${bl(r.blicken.ankaret)}`);
    console.log(`  mot lyftet i rörelsen, rutorna ${r.motLyftet.rutor.join('–')} (median mm sidled/höjd/djup, bildpunkter): ${r.motLyftet.rorelsen.map(l => `${l.led} ${l.x}/${l.y}/${l.z} (${l.bild} px)`).join('; ')}`);
    console.log(`  mot lyftet i hela stycket: ${r.motLyftet.helaStycket.map(l => `${l.led} ${l.x}/${l.y}/${l.z}`).join('; ')}`);
    for (const [namn, v] of Object.entries(r.farten)) { const x = v as {dockan: {toppVid: number; topp: number; dal?: number}; lyftet: {toppVid: number; topp: number}; stilen: {toppVid: number; topp: number} | number; sekunder?: number};
      if (namn === 'dalen') { const d = v as {dockan: {dal: number; toppTillTopp: number}; lyftet: {dal: number; toppTillTopp: number}; stilen: number}; console.log(`  dalen i bytet (andel av toppen): dockan ${d.dockan.dal} (topp till topp ${d.dockan.toppTillTopp} s), lyftet ${d.lyftet.dal} (${d.lyftet.toppTillTopp} s), stilen ${d.stilen}`); continue; }
      const st = x.stilen as {toppVid: number; topp: number}; console.log(`  ${namn} (${x.sekunder} s): toppen vid ${x.dockan.toppVid} (lyftet ${x.lyftet.toppVid}, stilen ${st.toppVid}), ${x.dockan.topp} m/s (lyftet ${x.lyftet.topp}, stilen ${st.topp})`); }
  }
  process.exit(ut.some(r => r.sparrar.length) ? 1 : 0);
}
