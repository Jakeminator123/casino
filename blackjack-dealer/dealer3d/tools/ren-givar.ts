// Dockans rena grundrörelser från A2.3 (dealer3d/src/ren-giv.ts) för en docka: ankaret A2.3, vilan till skon (A1 till
// A2.3) och given till en plats (kortet ur skon till platsen och handen tillbaka till A2.3). Jakob 2026-11-26: givarna
// ritas för standarddockans egen kropp (först mannen, sedan kvinnan), så att kroppen som visas och rörelsens punkter är
// samma sak, och mannen och kvinnan delar grund ("så man inte behöver jobba dubbelt för grundposer"): samma verktyg och
// regler, bara måtten skiljer.
//   node dealer3d/tools/ren-givar.ts --docka paow|man|kvinna [--ankare] [--vila] [--plats <1-7> | --alla] [--prov]
// --koreo [a|b]: standarddockans giv som koreografi (dealer3d/src/koreo-giv.ts), version A (nyckelvridningen, förval)
//   eller B (vänd där det landar: giv-fran-2-3-p<n>c1-ren-b-<docka>, med --prov …-prov-b-<docka>); annars den rena given
//   (ren-giv.ts). Jakob 2026-11-26 om A och B: "5/5 för båda", "gärna A och B": båda ritas till alla platser. Kortet läggs
//   vänt mot sin spelare (doll.ts dollCardYaw), och platserna närmast skon ges med vänsterhanden ensam (koreo-giv.ts
//   vilkenHand; --hand R|L tvingar): där finns en giv, skriven som A.
// --ankare: dealer3d/data/ankare-2-3-<docka>.json.
//   paow        första rutan av hennes giv till plats 4 (giv-fran-2-3-p4c1-naturlig-cykel-a-paow), med vänsterhanden vid
//               skon som Naturlig har den (ren-giv.ts rentAnkare);
//   man, kvinna dockans egna axlar, armar och händer (dealer3d/src/doll.ts, mätta på modellen och skrivna av
//               dealer3d/tools/docka-standard.ts): högerhanden där dockan har den på filten (hand.at.right), vänsterhanden
//               vid skon som Naturlig (rentAnkare), kortet Paows och blicken på kortet i skons mynning (Jakob
//               2026-11-26: i A2.3 riktas blicken mot skon); armbågarna så att underarmarna går över bordets kant
//               (ren-giv.ts armbageOverKanten).
// --vila (man, kvinna): dealer3d/data/till-ankare-2-3-<docka>.json, från vilan A1 (dockans hand.rest, armbågarna över
//   kanten) till exakt ankarets första ruta (ren-giv.ts renVila).
// Givarna: dealer3d/data/giv-fran-2-3-p<n>c1-ren-a-<docka>.json. Varje fil får `about` och `made`; en rörelse med röd
// spärr skrivs bara under provnamn (ersätter aldrig en fil som står), och en fil som finns
// skrivs över (det här verktyget är det enda som skriver dem). Varje rörelse mäts: ren-giv.ts granska med dockan (ett
// finger i kortet eller filten, kortet utan stöd, ett hopp, och ett ben som inte har sin längd: en handled armen inte når),
// hur långt handleden står från underarmen (figure-model.ts ställer handen högst 50 grader från den), underarmarnas luft
// över bordets kant och, för standarddockorna, händernas hud mot filten.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PLAY_LENS, add, cross, dot, filmEye, sub, unit, type Vec3} from '../src/camera.ts';
import {arm, turned} from '../src/body.ts';
import {dollCardYaw, dollFrame, dollNamed, naturalDoll, type Doll, type HandPlace} from '../src/doll.ts';
import {placed} from '../src/hand-pose.ts';
import {handFaults} from '../src/hand-rule.ts';
import {REN, armbageOverKanten, givRegler, granska, renGiv, renVila, rentAnkare, underarmLuft, type Ankare23, type Kant} from '../src/ren-giv.ts';
import {koreoGiv, vilkenHand} from '../src/koreo-giv.ts';
import {spots, type Plan} from '../src/world.ts';
import {TABLE_LENS} from '../../src/table-lens.ts';
import {lasDocka} from './modell.ts';
import {SKON, SKON_FLYTT, STANDARDBORD, bordet, handHud, kantFor} from './hud.ts';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const NAMN = arg('--docka') ?? 'paow', doll = dollNamed(NAMN), STANDARD = NAMN === 'man' || NAMN === 'kvinna', ROOT = fileURLToPath(new URL('../../', import.meta.url)), DATA = 'dealer3d/data/';
const platser = process.argv.includes('--alla') ? [1, 2, 3, 4, 5, 6, 7] : arg('--plats') ? [Number(arg('--plats'))] : [];
if (platser.some(p => !(p >= 1 && p <= 7))) throw Error('--plats tar 1-7.');
const las = (fil: string) => readFileSync(path.join(ROOT, fil)), sha = (b: Buffer) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3, mm = (m: number) => Math.round(m * 1000);
const grader = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180 / Math.PI;
type Frame = Ankare23['frame'];
type Limb = Frame['R'];
const axlar = (at: HandPlace) => ({forward: unit(at.forward), palm: unit(at.palm), across: cross(unit(at.palm), unit(at.forward))});

// Standarddockornas kropp och bord: modellen (huden på händerna) och bordets kant för underarmarna.
const CASINO = path.join(ROOT, '..'), modell = STANDARD ? lasDocka(path.join(CASINO, `avatar-auto-pipeline/assets/docka/standarddocka_${NAMN}.glb`)) : null;
const kant: Kant | undefined = modell ? kantFor(modell, bordet(path.join(CASINO, STANDARDBORD.fil), STANDARDBORD.kantBak)) : undefined;
const hudar = modell ? {R: handHud(modell, 'Right'), L: handHud(modell, 'Left')} : null;
/** Armbågen för en arm med dockans ben, mot polen, och över bordets kant där den finns. */
const armbagen = (s: Vec3, w: Vec3, pol: Vec3, ut: number) => kant ? armbageOverKanten(s, w, pol, doll, kant, ut).e : arm(s, w, pol, doll).elbow;

/** En rörelse mätt: granska med dockan, handleden mot underarmen, underarmarnas luft och händernas hud mot filten. */
function matt(m: {frames: Frame[]; leavesShoe: number; rests: number}) {
  const g = granska(m, doll), F = m.frames, sidor = ['R', 'L'] as const;
  const handled = sidor.map(s => Math.max(...F.map(f => grader(sub(f[s].w, f[s].e), sub(f[s].p[9], f[s].p[0])))));
  const luft = sidor.map(s => Math.min(...F.map(f => kant ? underarmLuft(f[s].e, f[s].w, kant) : Infinity)));
  // (huden som figure-model.ts ställer dockan, med underarmens vridning ruta för ruta: hud.ts handHud)
  const vridna = hudar ? sidor.map(s => { let forre: number | null = null; return F.map(f => { const v = hudar[s].vridning(f[s].p, f[s].e, f[s].s, forre); forre = v.vrid; return v; }); }) : null;
  const hud = hudar ? sidor.map((s, i) => Math.min(...F.map((f, j) => Math.min(...hudar[s].stall(f[s].p, f[s].e, f[s].s, j ? vridna![i][j - 1].vrid : null).map(q => q[1]))))) : null;
  const underarm = vridna ? vridna.map(v => ({min: Math.min(...v.map(x => x.grader)), max: Math.max(...v.map(x => x.grader))})) : null;
  const text = `${g.sparrRutor ? `SPÄRR i ${g.sparrRutor} rutor (${g.vad.join(", ")}; rutorna ${g.rutor.join(",")})` : "ingen spärr"}${g.bojdRutor ? `, handleden över 70° i ${g.bojdRutor} rutor` : ''}; handleden högst ${handled.map(x => x.toFixed(0)).join('/')}° från underarmen (höger/vänster)${kant ? `; underarmarna minst ${luft.map(mm).join('/')} mm över bordet` : ''}${hud ? `; händernas hud minst ${hud.map(x => (x * 1000).toFixed(1)).join('/')} mm över filten` : ''}${underarm ? `; underarmen vriden från vilan ${underarm.map(u => `${u.min}..${u.max}`).join(' / ')}° (figure-model.ts, positivt: handflatan upp)` : ''}`;
  return {g, handled, luft, hud, underarm, text};
}

// ---- ankaret -----------------------------------------------------------------------------------------------------------
// (--prov: allt under provnamn, ankare-2-3-prov-<docka>, till-ankare-2-3-prov-<docka> och giv-fran-2-3-p<n>c1-prov-<docka>,
// så att det som spelas och testas inte skrivs över medan en giv prövas; given läser provankaret om det finns)
const PROV = process.argv.includes('--prov'), TAGG = PROV ? `prov-${NAMN}` : NAMN, KOREO_VAL = process.argv.includes('--koreo') ? (arg('--koreo') === 'b' ? 'b' : 'a') as 'a' | 'b' : null;
const ANKARE = PROV && (process.argv.includes('--ankare') || existsSync(path.join(ROOT, `${DATA}ankare-2-3-${TAGG}.json`))) ? `${DATA}ankare-2-3-${TAGG}.json` : `${DATA}ankare-2-3-${NAMN}.json`;
if (process.argv.includes('--ankare')) {
  let ut: {about: string; doll: string; from: string; hip: Vec3; frame: Frame};
  if (NAMN === 'paow') {
    const fran = `${DATA}giv-fran-2-3-p4c1-naturlig-cykel-a-paow.json`, b = las(fran), m = JSON.parse(b.toString('utf8')), f = rentAnkare(m.frames[0], doll);
    ut = {about: `Ställningen A2.3 för dockan paow, ren: första rutan av ${fran} (sha256 ${sha(b)}), med vänsterhanden vid skon som Naturlig har den (doll.ts hand.natural) och dess fingrar inom vad ett finger kan (dealer3d/src/ren-giv.ts rentAnkare). De rena givarna (ren-giv.ts, dealer3d/tools/ren-givar.ts) börjar och slutar här.`,
      doll: 'paow', from: fran, hip: m.hip, frame: {card: f.card, L: f.L, R: f.R, h: f.h, g: f.g}};
  } else {
    const fran = `${DATA}ankare-2-3-paow.json`, b = las(fran), f = (JSON.parse(b.toString('utf8')) as {frame: Frame}).frame, fr = dollFrame(TABLE_LENS, doll), H = doll.hand!, at = H.at.right;
    const R: Limb = {s: r4(fr.shoulders[0]), e: r4(armbagen(fr.shoulders[0], at.wrist, unit(sub(f.R.e, f.R.s)), -1)), w: r4(at.wrist), k: f.R.k, p: placed(H.right, axlar(at), at.wrist).map(r4)};
    const kort = {...f.card, c: r4(add(f.card.c, SKON_FLYTT))}, g = rentAnkare({card: kort, R, L: {...f.L, s: r4(fr.shoulders[1])}, h: r4(fr.head), g: f.g}, doll);
    // (vänsterarmbågen ut så långt att underarmen är vriden högst VRIDEN grader från vilan, som figure-model.ts vrider den
    // (hud.ts vridning; huvudagenten 2026-11-26: underarmens hud nyps vid armbågen bortom cirka 70 grader), med handleden
    // högst 40 grader från underarmen och underarmen över bordets kant)
    const e0 = armbagen(g.L.s, g.L.w, unit(sub(g.L.e, g.L.s)), 1), linje = unit(sub(g.L.w, g.L.s)), VRIDEN = 68;
    const vridenTill = (e: Vec3) => Math.abs(hudar!.L.vridning(g.L.p, e, g.L.s).grader), handled = (e: Vec3) => grader(sub(g.L.w, e), sub(g.L.p[9], g.L.p[0]));
    const eL = (() => { if (!hudar || vridenTill(e0) <= VRIDEN) return e0; for (let x = 2; x <= 90; x += 2) { const e = arm(g.L.s, g.L.w, turned(unit(sub(e0, g.L.s)), linje, x * Math.PI / 180), doll).elbow;
      if (vridenTill(e) <= VRIDEN && handled(e) <= 40 && (!kant || underarmLuft(e, g.L.w, kant) >= kant.luft)) return e; } return e0; })();
    const L: Limb = {...g.L, e: r4(eL)};
    ut = {about: `Ställningen A2.3 för dockan ${NAMN} (standarddockans ${NAMN === 'man' ? 'man' : 'kvinna'}), ren: dockans egna axlar, armar och händer (dealer3d/src/doll.ts, mätta på modellen av dealer3d/tools/docka-standard.ts): högerhanden där dockan har den på filten (hand.at.right), vänsterhanden vid skon som Naturlig (hand.natural, rentAnkare), armbågarna åt samma håll som Paows i hennes ankare ${fran} (sha256 ${sha(b)}) och ut så att underarmarna går över bordets kant (${STANDARDBORD.kantBak} m bakom spelets kant); kortet i skon (flyttat med skon till standarddockornas bord, hud.ts SKON), och blicken på kortet i skons mynning (Jakob 2026-11-26: i A2.3 riktas blicken mot skon, och en giv återvänder dit med samma blick). Vilan till skon (till-ankare-2-3-${NAMN}) och de rena givarna (dealer3d/src/ren-giv.ts, dealer3d/tools/ren-givar.ts --docka ${NAMN}) slutar och börjar här.`,
      doll: NAMN, from: fran, hip: r4(fr.hip), frame: {card: kort, L, R, h: r4(fr.head), g: kort.c}};
  }
  // (ett ankare med röd spärr ersätter aldrig ett som står: det skrivs då bara under provnamn)
  const f = ut.frame, fel = (l: Limb, sign: number, kort: Frame['card'] | null) => handFaults(l.p, sign, null, kort).filter(x => x.kind !== 'ordning' && x.kind !== 'grannen').map(x => x.what).join(' | ') || 'inga fel';
  const ma = matt({frames: [f, f], leavesShoe: 2, rests: 2}), fil = ma.g.sparrRutor && !PROV ? `${DATA}ankare-2-3-prov-${NAMN}.json` : ANKARE;
  writeFileSync(path.join(ROOT, fil), JSON.stringify(ut) + '\n'); if (ma.g.sparrRutor) process.exitCode = 1;
  console.log(`${fil !== ANKARE ? `SPÄRR: ${ANKARE} skrevs inte; ` : ''}skrev ${fil}: höger ${fel(f.R, 1, null)}, vänster ${fel(f.L, -1, f.card)}; ${ma.text}`);
}
const ankBytes = () => las(ANKARE), ankaret = (): Ankare23 => { const a = JSON.parse(ankBytes().toString('utf8')) as {hip: Vec3; frame: Frame}; return {hip: a.hip, frame: a.frame}; };

// ---- vilan till skon ---------------------------------------------------------------------------------------------------
if (process.argv.includes('--vila')) {
  if (!STANDARD) throw Error('--vila gäller standarddockorna (man, kvinna).');
  const a23 = ankaret(), fr = dollFrame(TABLE_LENS, doll), R = doll.hand!.rest!, pol: Vec3 = unit([0, -1, -0.25]);
  // (vilan: dockans händer där docka-standard.ts lade dem, armbågarna som där: hängande, ut så lite som kanten kräver)
  const limb = (i: 0 | 1): Limb => { const at = i ? R.at.left : R.at.right, s = fr.shoulders[i]; return {s: r4(s), e: r4(armbagen(s, at.wrist, pol, i ? 1 : -1)), w: r4(at.wrist), k: 1, p: placed(i ? R.left : R.right, axlar(at), at.wrist).map(r4)}; };
  const a1: Frame = {card: a23.frame.card, R: limb(0), L: limb(1), h: r4(fr.head), g: r4(filmEye(PLAY_LENS).position)};
  const v = renVila({a1, a23, doll, kant}), namn = `till-ankare-2-3-${TAGG}`, {times, armbagenUtGrader, ...motion} = v;
  const about = `Standarddockans ${NAMN === 'man' ? 'man' : 'kvinna'}, från vilan A1 till ankaret A2.3 (${ANKARE}), på dockans egna ben (dealer3d/src/ren-giv.ts renVila): stilla i vilan, rörelsen på ${((times.framme - times.borjar) / motion.fps).toFixed(2)} s, och stilla i exakt ankarets första ruta. Vilan: händerna strax framför markerbrickan och pekande som underarmarna, fingrarna lätt böjda och lite isär, underarmarna över bordets kant (doll.ts hand.rest, dealer3d/tools/docka-standard.ts). Skriven av dealer3d/tools/ren-givar.ts --docka ${NAMN} --vila.`;
  const made = {tool: 'dealer3d/tools/ren-givar.ts', doll: NAMN, to: ANKARE, sources: {[ANKARE]: sha(ankBytes())}, times, armbagenUtGrader, at: new Date().toISOString()};
  // (en vila med röd spärr ersätter aldrig en som står: den skrivs då bara under provnamn)
  const mv = matt(motion), fil = mv.g.sparrRutor && !PROV ? `till-ankare-2-3-prov-${NAMN}` : namn;
  writeFileSync(path.join(ROOT, `${DATA}${fil}.json`), JSON.stringify({...motion, about, made}) + '\n'); if (mv.g.sparrRutor) process.exitCode = 1;
  const sistaLika = JSON.stringify(motion.frames.at(-1)) === JSON.stringify(a23.frame);
  console.log(`${fil !== namn ? `SPÄRR: ${namn} skrevs inte; ` : ''}${fil}: ${motion.frames.length} rutor, rörelsen rutorna ${times.borjar}-${times.framme} (${((times.framme - times.borjar) / motion.fps).toFixed(2)} s); sista rutan ${sistaLika ? 'är' : 'är INTE'} ankarets; armbågen ut över kanten högst ${armbagenUtGrader.join('/')}°; ${mv.text}`);
}

// ---- givarna -----------------------------------------------------------------------------------------------------------
if (platser.length) {
  const start = ankaret(), aBytes = ankBytes(), planBytes = las('placements/default.json'), plan = JSON.parse(planBytes.toString('utf8')) as Plan, alla = spots(plan, TABLE_LENS), giv: Doll = naturalDoll(doll);
  let rott = 0;
  for (const plats of platser) {
    const id = `P${plats}.C1`, at = alla.find(s => s.id === id)!.at, t0 = Date.now(), skon = STANDARD ? SKON : undefined, version = STANDARD ? KOREO_VAL : null;
    // (standarddockornas bord har platserna vända mot sin spelare, och platserna närmast skon ges med vänstern ensam)
    const yaw = dollCardYaw(id, at, TABLE_LENS), hand = arg('--hand') === 'R' || arg('--hand') === 'L' ? arg('--hand') as 'R' | 'L' : vilkenHand(start, at);
    // (A och B skiljer sig i handbytet; där vänstern ger ensam finns en giv, den som skrivs som A)
    if (version === 'b' && hand === 'L') { console.log(`plats ${plats}: ges med vänsterhanden ensam (giv-fran-2-3-p${plats}c1-ren-a-${NAMN}); version B gäller handbytet och ritas inte här.`); continue; }
    const r = version ? koreoGiv({start, place: id, at, doll: giv, lens: TABLE_LENS, shoe: skon, kant, version, yaw, hand}) : renGiv({start, place: id, at, doll: giv, lens: TABLE_LENS, shoe: skon, kant});
    const namn = `giv-fran-2-3-p${plats}c1-${PROV ? (version === 'b' ? `prov-b-${NAMN}` : TAGG) : `ren-${version === 'b' ? 'b' : 'a'}-${NAMN}`}`, t = r.times, m = matt(r.motion);
    const regler = givRegler(r.motion, giv, {dealerKort: alla.filter(s => /^D\.C[123]$/.test(s.id)).map(s => s.at), hand: version ? hand : undefined}), strang = granska(r.motion, doll, {strang: true});
    const vem = NAMN === 'paow' ? 'Paow' : `Standarddockans ${NAMN === 'man' ? 'man' : 'kvinna'}`;
    const satt = version && hand === 'L' ? `given som koreografi med vänsterhanden ensam (dealer3d/src/koreo-giv.ts koreoEnsam; platserna närmast skon, dit högerarmen inte når): fingertopparna drar kortet plant ur skon och skjuter det fram till strax hitom platsen, vänt mot spelaren, tar under dess närmre ände, reser det kring den bortre kortsidan med framsidan mot dealern och fäller det framåt på platsen, där de vilar på det; högerhanden ligger kvar i ankaret`
      : version === 'a' ? `given som koreografi, version A "nyckelvridningen" (dealer3d/src/koreo-giv.ts, läst på Jakobs ord och två lärofilmer): vänsterhanden drar kortet plant ur skon till mötespunkten ute över bordet och reser det på högkant med framsidan mot dealern, högern nyper dess övre kant ovanifrån (tummen ned på framsidan, pekfingret på ryggen) och rullar det framåt med underarmen som en nyckel, bär det plant och lågt, sätter ned det och skjuter det på plats med fingertopparna`
      : version === 'b' ? `given som koreografi, version B (dealer3d/src/koreo-giv.ts): som A, men kortet bärs hängande på högkant i nypet och rullas fram först nära platsen`
      : `den rena given (dealer3d/src/ren-giv.ts): vänsterhanden drar kortet ur skon och skjuter det till högern, högerns tumme tar det under kanten och pek- och långfingret på baksidan, underarmen vänder det en gång, det släpps på kanten och faller plant, två fingertoppar vilar på det och handen går hem`;
    const about = `${vem}, A2.3 till plats ${plats} kort 1 och tillbaka till A2.3 i samma rörelse, ${satt}, på dockans egna ben från ankaret ${ANKARE}${skon ? ' vid standarddockornas sko (dealer3d/tools/hud.ts SKON)' : ''}. Bålen lutar bara så mycket som räckvidden kräver${kant ? ', och underarmarna går över bordets kant' : ''}. Kortet ligger i ruta ${t.ligger} (${(t.ligger / r.motion.fps).toFixed(2)} s), handen åter i A2.3 i ruta ${t.slut} (${((t.slut - t.ligger) / r.motion.fps).toFixed(2)} s därefter). Skriven av dealer3d/tools/ren-givar.ts --docka ${NAMN} --plats ${plats}${version ? ` --koreo ${version}` : ''}.`;
    const made = {tool: 'dealer3d/tools/ren-givar.ts', place: id, doll: NAMN, from: ANKARE, sources: {[ANKARE]: sha(aBytes), 'placements/default.json': sha(planBytes)}, times: t, chosen: r.kvitto, checked: {...m.g, strang, regler: regler.tal, bryter: regler.bryter, underarmGrader: m.underarm}, at: new Date().toISOString()};
    // (en giv med röd spärr ersätter aldrig en fil som står: den skrivs då bara under provnamn)
    const rod = m.g.sparrRutor > 0, fil = rod && !PROV ? `giv-fran-2-3-p${plats}c1-prov-${version === 'b' ? 'b-' : ''}${NAMN}` : namn;
    writeFileSync(path.join(ROOT, `${DATA}${fil}.json`), JSON.stringify({...r.motion, about, made}) + '\n');
    if (rod) { rott++; if (fil !== namn) console.log(`SPÄRR: ${namn} skrevs inte; given står i stället som ${fil}.`); }
    console.log(`${fil}: ${r.motion.frames.length} rutor, ${Date.now() - t0} ms; kortet ute ${t.ute}, taget ${t.tar}, släppt ${t.slapper}, ligger ${t.ligger} (${(t.ligger / 30).toFixed(2)} s, högst ${REN.ligger}), hemma ${t.slut} (${((t.slut - t.ligger) / 30).toFixed(2)} s efter); bålen lutar ${r.kvitto.lutGrader}° och vrids ${r.kvitto.vridGrader}°, armbågen ut över kanten ${r.kvitto.armbagenUtGrader.R}/${r.kvitto.armbagenUtGrader.L}°; ${m.text}`);
    console.log(`   strängt: ${strang.sparrRutor ? `${strang.sparrRutor} rutor (${strang.vad.join(', ')}; ${strang.rutor.join(',')})` : 'ingen spärr'}; reglerna: ${regler.bryter.join('; ') || 'alla hålls'}`);
    console.log(`   ${JSON.stringify(regler.tal)}`);
  }
  if (rott) process.exitCode = 1;
}
