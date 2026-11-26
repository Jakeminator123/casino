// Egna bord för paketets figurer i bordsvyn (bord.ts), byggda här i kod av enkla former (Jakob 2026-11-26: "en annan
// kanske kan skapa ett unikt bord för just dessa. Kanske ska bordet vara större, men se då till att dealerns övriga
// avstånd, vyer eller koordinater [inte] tappas. Kanske också ska man ta och göra just det bord som detta paket kom med?").
//
// Två bord, för att paketets giv bara går till fem ställen och de ligger tätare än sju av figuren kan sitta:
// - `paket`: bordet paketet kom med, efter dess mått, med fem platser mitt för de fem ställen där given landar.
// - `stort`: ett bredare bord (2,6 m) med sju platser 58 cm isär. De tre i mitten får given på sina kort; till plats 2
//   och 6 landar den cirka 30 cm för kort, och plats 1 och 7 får ingen.
// Båda är plana (paketets rörelser är inspelade vid en plan skiva: ingen vaddering över filten och ingen sarg under
// den), och dealerns sida är spelets: kanten mot dealern, filtens höjd, brickan och skon ligger där de ligger vid
// spelets bord, med måtten ur blackjack-dealer/src/table-lens.ts. Inget mått för spelets bord står här som ett eget tal.
//
// Måtten här är i bordets egna koordinater: x tvärs över (åt dealerns vänster), s från kanten mot dealern ut mot
// spelarna, meter. Bordets rot ligger på kantens mitt, så s är rotens z.
import * as T from 'three';
import {CARD, TABLE_BASE, TABLE_LENS, TRAY, dollShoe, shoeCard, shoePose} from '../../blackjack-dealer/src/table-lens.ts';

/**
 * Där paketets giv landar (AS_Blackjack_Dealer_DealCard, de fem givarna i tur och ordning): högerhandens yttersta
 * pekfingerled när handen är längst ut, i centimeter från dealerns höft, i sidled (åt dealerns vänster) och framåt.
 * Mätt i paketets skelett (OVERLAMNING.md, "Blackjackdealerns giv i tal").
 */
const DEALS: [number, number][] = [[-47, 47], [-41, 80], [0, 79], [32, 77], [49, 49]];
/** Platserna de fem givarna går till vid paketets bord: de platser vid spelets bord som given hamnar närmast. Plats 3 och 5 finns inte där. */
const DEALT_SEATS = [1, 2, 4, 6, 7];
/**
 * Bordet paketet kom med (Unreal-demots SM_GamblingTable), i centimeter, ur filens gränslåda och dess bild av bordet:
 * en halvmåne med rak kant mot dealern, 189,4 bred och 102,5 djup (en halv cirkel med radien 94,7 och en rak remsa på
 * 7,8 bakom den), en tunn plan skiva med grön filt på smala svarta ben. I demobanan sitter den som spelar med höften
 * 22–30 cm utanför kanten. Lådan är 95 cm hög, för att en svart kortmaskin står på skivan mitt på den raka kanten; där
 * har spelets bord brickan, så maskinen är inte med här.
 */
const PACK_TABLE = {halfWidth: 94.7, depth: 102.5};
/** Spelarnas höft utanför bordets kant (meter): den nedre änden av demobanans 22–30 cm, så att händerna når så långt in som möjligt. */
const HIP_OUTSIDE = 0.22;
/** Det större bordet: avståndet mellan två grannars höfter, mätt längs bågen de sitter på (meter). */
const SEAT_APART = 0.58;
/**
 * Det större bordet: en plats första kort ligger så här långt framför höften (meter). Vid paketets bord landar given
 * 46–64 cm framför den som sitter mitt för den; insatsringen hamnar då 49 cm framför höften, där spelarnas egna händer
 * arbetar i paketets rörelser (45–55 cm).
 */
const CARD_AHEAD = 0.57;
/**
 * Det större bordets form: halva bredden, bågens djup och den raka remsan mot dealern. Lika djupt som paketets bord, så
 * att de tre i mitten sitter där given når, och så brett att händerna på plats 7 går fria från skon (cirka 20 cm; vid
 * 2,4 m bredd låg handen på skons bakre ände, prövat i bild).
 */
const WIDE_TABLE = {a: 1.3, b: 0.8, strip: 0.2};
/** Skivan: tjockleken (lårens ovansida ligger 12–15 cm under filten), träkantens bredd runt filten, i plan med den, och benens radie. */
const TOP = {thick: 0.04, rim: 0.05, leg: 0.022};
/**
 * Kortplatserna, ritade som på spelets bord: en ram 4 mm utanför kortet med 3 mm linje
 * (avatar-auto-pipeline/scen/standard.yaml, kort.markering), och insatsringen bortom det första kortet mot spelaren:
 * radien och luften mellan kort och ring (blackjack-dealer/src/scene3d-geometry.ts, BET; visarens server lämnar inte ut
 * den filen, så de två talen står här).
 */
const MARK = {margin: 0.004, line: 0.003, ring: 0.027, clear: 0.012};
/** Så mycket av en som sitter når utanför höften åt alla håll (meter): det kamerorna ska rymma utöver höfterna. */
export const KROPP = 0.4;

/** Där en spelare sitter: höften i dockans linsvärld och vridningen kring lodlinjen (mot sitt kort). */
export type Plats = {x: number; z: number; turn: number};
/**
 * Ett eget bord. `platser` har index som bord.ts sitsar (0 dealern, som inte flyttas; 1–7 spelarna): null där platsen
 * inte finns. `halvBredd` är höften längst ut i sidled, `djup` höfterna närmast och längst från kanten mot dealern
 * (meter från den kanten, dealerns är minus).
 */
export type EgetBord = {id: string; namn: string; root: T.Group; platser: (Plats | null)[]; halvBredd: number; djup: [number, number]};

type Form = {a: number; b: number; strip: number};
type Seat = {plats: number; t: number; hip: {x: number; s: number}; card: {x: number; s: number}};

/** En punkt på bordets båge, `ut` meter utanför kanten, och riktningen rakt ut från bordet där. t = 0 är bågens topp mitt emot dealern, ±π/2 dess ändar. */
function arc(f: Form, t: number, ut = 0) {
  const nx = Math.sin(t) / f.a, ns = Math.cos(t) / f.b, n = Math.hypot(nx, ns);
  return {x: f.a * Math.sin(t) + ut * nx / n, s: f.strip + f.b * Math.cos(t) + ut * ns / n, nx: nx / n, ns: ns / n};
}
/** Skivans kontur sedd uppifrån, med urtaget för brickan i kanten mot dealern; `inset` drar in bågen och sidorna (filten innanför träkanten). */
function outline(f: Form, inset = 0): T.Shape {
  const g = {a: f.a - inset, b: f.b - inset, strip: f.strip}, shape = new T.Shape(), to = (x: number, s: number) => shape.lineTo(x, -s);
  shape.moveTo(-g.a, 0);
  to(TRAY.x0, 0); to(TRAY.x0, TRAY.s1); to(TRAY.x1, TRAY.s1); to(TRAY.x1, 0); to(g.a, 0);
  for (let i = 0; i <= 96; i++) { const p = arc(g, Math.PI / 2 - i / 96 * Math.PI); to(p.x, p.s); }
  return shape;
}
/** En form ritad i (x, −s) lagd plant med ovansidan upp. */
const flat = (shape: T.Shape) => new T.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2);

const felt = new T.MeshStandardMaterial({color: 0x1d2d27, roughness: 0.95});
const wood = new T.MeshStandardMaterial({color: 0x5b3a21, roughness: 0.55});
const black = new T.MeshStandardMaterial({color: 0x121214, roughness: 0.45, metalness: 0.2});
const gold = new T.MeshStandardMaterial({color: 0xd8b665, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
const CHIPS = [0xb3262b, 0x1f6b3a, 0x20222a, 0x2c4f9e, 0xe9e4d6].map(color => new T.MeshStandardMaterial({color, roughness: 0.5}));

/** Spelarna vid paketets bord: var och en mitt för det ställe där given landar, det vill säga den punkt på höfternas båge som ligger närmast det. */
function dealt(f: Form, hipS: number): Seat[] {
  return DEALS.map(([side, ahead], i) => {
    const card = {x: side / 100, s: hipS + ahead / 100}; let t = 0, least = Infinity;
    for (let k = -2000; k <= 2000; k++) { const at = k / 2000 * Math.PI / 2, p = arc(f, at, HIP_OUTSIDE), d = Math.hypot(p.x - card.x, p.s - card.s); if (d < least) { least = d; t = at; } }
    const p = arc(f, t, HIP_OUTSIDE);
    return {plats: DEALT_SEATS[i], t, hip: {x: p.x, s: p.s}, card};
  });
}
/** Spelarna vid det större bordet: plats 4 mitt emot dealern och de andra SEAT_APART isär längs bågen åt var sida, så många som får plats (högst sju), med kortet rakt framför sig. */
function even(f: Form): Seat[] {
  const seats: Seat[] = [], put = (plats: number, t: number) => { const p = arc(f, t, HIP_OUTSIDE); seats.push({plats, t, hip: {x: p.x, s: p.s}, card: {x: p.x - p.nx * CARD_AHEAD, s: p.s - p.ns * CARD_AHEAD}}); };
  put(4, 0);
  let length = 0, prev = arc(f, 0, HIP_OUTSIDE), n = 1;
  for (let i = 1; i <= 4000 && n <= 3; i++) {
    const t = i / 4000 * Math.PI / 2, p = arc(f, t, HIP_OUTSIDE); length += Math.hypot(p.x - prev.x, p.s - prev.s); prev = p;
    if (length >= n * SEAT_APART) { put(4 + n, t); put(4 - n, -t); n++; }
  }
  return seats;
}

/**
 * Bygger de egna borden. `edgeZ`: bordets kant mot dealern i linsvärlden; `hipZ`: dealerns höft; `places`: kortplanens
 * platser i linsvärlden (dealerns egna kortplatser ritas där planen har dem, och det andra kortet ligger mot det första
 * som på plats 4 i planen). Borden är dolda tills bord.ts väljer ett.
 */
export function egnaBord(at: {edgeZ: number; hipZ: number; places: {id: string; at: number[]}[]}): EgetBord[] {
  const spot = (id: string) => { const p = at.places.find(s => s.id === id); if (!p) throw Error(`Kortplanen saknar ${id}.`); return {x: p.at[0], s: p.at[2] - at.edgeZ}; };
  const first = spot('P4.C1'), other = spot('P4.C2'), second = {right: other.x - first.x, away: first.s - other.s}; // plats 4 är vänd rakt mot dealern
  const hipS = at.hipZ - at.edgeZ, shadow = <M extends T.Mesh>(m: M) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // Kortplatsens tryck: en ram runt ett kort, med långsidan längs z, och insatsringen.
  const rect = (w: number, h: number) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => new T.Vector2(x, y));
  const hw = CARD.width / 2 + MARK.margin, hh = CARD.height / 2 + MARK.margin, half = MARK.line / 2;
  const frameShape = new T.Shape(rect(hw + half, hh + half)); frameShape.holes.push(new T.Path(rect(hw - half, hh - half)));
  const frame = flat(frameShape), ring = new T.RingGeometry(MARK.ring - half, MARK.ring + half, 48).rotateX(-Math.PI / 2);
  const print = (g: T.BufferGeometry, x: number, s: number, heading = 0) => { const m = new T.Mesh(g, gold); m.position.set(x, 0.0004, s); m.rotation.y = heading; m.receiveShadow = true; return m; };

  // Brickan: urtaget i skivan där spelets bricka ligger, med botten, väggen mot dealern och rader av marker.
  function tray(): T.Group {
    const g = new T.Group(), wide = TRAY.x1 - TRAY.x0, deep = TRAY.s1 - TRAY.s0, mid = (TRAY.x0 + TRAY.x1) / 2, wall = 0.006;
    const floor = shadow(new T.Mesh(new T.BoxGeometry(wide, wall, deep), black)); floor.position.set(mid, -TRAY.depth - wall / 2, (TRAY.s0 + TRAY.s1) / 2);
    const back = shadow(new T.Mesh(new T.BoxGeometry(wide, TRAY.depth, wall), black)); back.position.set(mid, -TRAY.depth / 2, TRAY.s0 + wall / 2);
    g.add(floor, back);
    const r = TRAY.depth / 2, rows = Math.floor((wide - 0.01) / (2 * r + 0.004)), step = (wide - 0.01) / rows, chip = new T.CylinderGeometry(r, r, deep - wall - 0.01, 24).rotateX(Math.PI / 2); // markerna fyller urtaget upp till filten
    for (let i = 0; i < rows; i++) { const row = shadow(new T.Mesh(chip, CHIPS[i % CHIPS.length])); row.position.set(TRAY.x0 + 0.005 + (i + 0.5) * step, -TRAY.depth + r, (TRAY.s0 + TRAY.s1 + wall) / 2); g.add(row); }
    return g;
  }
  // Skon: kilen med spelets mått där dockans bord har den (dollShoe), och nästa kort mot dess främre platta.
  function shoe(): T.Group {
    const kind = dollShoe(TABLE_LENS), pose = shoePose(TABLE_LENS, kind), g = new T.Group(); g.position.z = -at.edgeZ; // måtten är linsvärldens
    const profile = new T.Shape([[0, 0], [kind.length, 0], [kind.length, kind.backHeight], [kind.frontHeight / Math.tan(kind.plateLean), kind.frontHeight]].map(([along, up]) => new T.Vector2(along, up)));
    const back = new T.Vector3(...pose.back), up = new T.Vector3(0, 1, 0), across = new T.Vector3().crossVectors(back, up), far = new T.Vector3(...pose.far);
    const from = new T.Vector3(...pose.front); if (across.dot(far) < 0) from.addScaledVector(far, kind.width); // kroppen ligger på väggens bortre sida
    g.add(shadow(new T.Mesh(new T.ExtrudeGeometry(profile, {depth: kind.width, bevelEnabled: false}).applyMatrix4(new T.Matrix4().makeBasis(back, up, across).setPosition(from)), black)));
    const c = shoeCard(pose, kind), long = new T.Vector3(...c.up), short = new T.Vector3(...c.across);
    g.add(new T.Mesh(new T.PlaneGeometry(CARD.width, CARD.height).applyMatrix4(new T.Matrix4().makeBasis(short, long, new T.Vector3().crossVectors(short, long)).setPosition(...c.centre)), new T.MeshStandardMaterial({color: 0xb3262b, roughness: 0.6, side: T.DoubleSide})));
    return g;
  }

  /** Ett bord av en form och dess platser. `legs`: par av platser som ett ben står mellan, vid kanten där grannarnas lår är längst isär. */
  function build(id: string, namn: string, f: Form, seats: Seat[], legs: [number, number][]): EgetBord {
    const root = new T.Group(); root.position.z = at.edgeZ; root.visible = false;
    // Skivan: träet med ovansidan strax under filten, och filten i höjd med spelets filt (y = 0).
    const slab = shadow(new T.Mesh(new T.ExtrudeGeometry(outline(f), {depth: TOP.thick, bevelEnabled: false, curveSegments: 24}).rotateX(-Math.PI / 2), wood)); slab.position.y = -TOP.thick - 0.002;
    root.add(slab, shadow(new T.Mesh(flat(outline(f, TOP.rim)), felt)), tray(), shoe());
    // Benen: två vid kanten mot dealern, utanför hans knän, och ett mellan vart och ett av paren.
    const tall = -TOP.thick - TABLE_BASE.floor, leg = new T.CylinderGeometry(TOP.leg, TOP.leg, tall, 20);
    const stand = (x: number, s: number) => { const m = shadow(new T.Mesh(leg, black)); m.position.set(x, TABLE_BASE.floor + tall / 2, s); root.add(m); };
    for (const side of [-1, 1]) stand(side * 0.62 * f.a, 0.12);
    for (const [a, b] of legs) { const one = seats.find(s => s.plats === a), two = seats.find(s => s.plats === b); if (one && two) { const p = arc(f, (one.t + two.t) / 2, -0.06); stand(p.x, p.s); } }
    // Kortplatserna: spelarnas två kort vända mot sin spelare och ringen närmare honom; dealerns två kort där planen har dem.
    const platser: (Plats | null)[] = Array(8).fill(null);
    for (const seat of seats) {
      const d = Math.hypot(seat.card.x - seat.hip.x, seat.card.s - seat.hip.s), ux = (seat.card.x - seat.hip.x) / d, us = (seat.card.s - seat.hip.s) / d, heading = Math.atan2(ux, us);
      const out = CARD.height / 2 + MARK.ring + MARK.clear;
      root.add(print(frame, seat.card.x, seat.card.s, heading), print(frame, seat.card.x - us * second.right + ux * second.away, seat.card.s + ux * second.right + us * second.away, heading), print(ring, seat.card.x - ux * out, seat.card.s - us * out));
      platser[seat.plats] = {x: seat.hip.x, z: at.edgeZ + seat.hip.s, turn: heading};
    }
    for (const own of ['D.C1', 'D.C2']) { const p = spot(own); root.add(print(frame, p.x, p.s)); }
    const reach = seats.map(s => s.hip.s);
    return {id, namn, root, platser, halvBredd: Math.max(...seats.map(s => Math.abs(s.hip.x))), djup: [hipS, Math.max(...reach)]};
  }

  const pack: Form = {a: PACK_TABLE.halfWidth / 100, b: PACK_TABLE.halfWidth / 100, strip: (PACK_TABLE.depth - PACK_TABLE.halfWidth) / 100};
  return [
    build('paket', 'paketets, fem platser', pack, dealt(pack, hipS), [[2, 4], [4, 6]]),
    build('stort', 'större, sju platser', WIDE_TABLE, even(WIDE_TABLE), [[2, 3], [5, 6]]),
  ];
}
