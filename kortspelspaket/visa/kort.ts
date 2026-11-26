// Korten vid bordet: paketets rörelser har bara kroppen, så korten dealern delar läggs till här. Blackjackdealerns giv
// är en giv ur en sko (sett i bild 2026-11-26: vänsterhanden sträcker sig ut till skon vid dealerns vänstra sida, för
// kortet in mot mitten, högerhanden tar det där och lägger det framför spelaren). Ett kort per giv kommer därför ur
// spelets sko, följer vänsterhandens fingrar in, byter till högerhandens när händerna möts, följer den ut och blir
// liggande där handen släpper det, med ryggen upp som det kom ur skon.
//
// Tiderna räknas ur rörelsen själv, en gång när dealern får den: varje gång högerhanden lämnar vilan är en giv. Kortet
// dras ur skon när vänsterhandens pekfinger är närmast skons mynning före den given, byter hand när händerna är närmast
// varandra, och släpps när högerhanden är längst ut. Korten ställs sedan efter tiden i rörelsen, så de följer med när reglaget
// dras åt båda hållen.
import * as T from 'three';
import {CARD, TABLE_LENS, dollShoe, shoeCard, shoePose} from '../../blackjack-dealer/src/table-lens.ts';
import type {Sits} from './bord.ts';

/**
 * Rörelserna där dealern delar ur skon: bara i dem visas korten. Pokerdealerns giv ur maskin har samma mönster som
 * blackjackgiven (vänster hand hämtar kortet på samma ställe till vänster om dealern, höger lägger det; mätt med
 * verktyg/mat.ts), så där står skon för maskinen.
 */
const DEALS = new Set(['AS_Blackjack_Dealer_DealCard', 'AS_Poker_Dealer_To_Players_From_Machine_01']);
/** Kortets tjocklek i bild (ett riktigt kort är för tunt för att synas från sidan). */
const CARD_THICK = 0.0008;
/** Så långt från vilan högerhanden ska vara för att det ska räknas som en giv (meter), och så länge (sekunder). */
const AWAY = 0.03, LEAST = 0.5;
/** Hur långt före given vänsterhandens väg till skon söks (sekunder). */
const REACH = 2.5;
/** Tiderna kortet tar på sig: ur skon in i fingrarna, från hand till hand, och från handen ner på filten (sekunder). */
const DRAW = 0.24, PASS = 0.16, DROP = 0.2;

type Pose = {at: T.Vector3; turn: T.Quaternion};
type Deal = {draw: number; pass: number; release: number; inHand: Pose; onTable: Pose};
export type Kort = {
  /** Dealern har fått en rörelse (eller ingen): givarna räknas ut, eller korten tas bort om rörelsen inte är en giv. */
  rorelse(namn: string | null): void;
  /** Ställer korten för tiden t i dealerns rörelse. Anropas när figuren är ställd för den tiden. */
  stall(t: number): void;
  /** Visar eller döljer korten. */
  visa(pa: boolean): void;
  /** Bordets höjd över spelets (meter): skon och korten som ligger på bordet följer med. */
  hojd(meter: number): void;
};

/** Kortets rygg, ritad: röd med vit ram och ett rutmönster, så att den syns som ett kort och inte som en vit lapp. */
function back(): T.Texture {
  const c = document.createElement('canvas'); c.width = 126; c.height = 176;
  const g = c.getContext('2d')!;
  g.fillStyle = '#a3222b'; g.fillRect(0, 0, 126, 176);
  g.strokeStyle = '#d8858b'; g.lineWidth = 1.5;
  for (let i = -176; i < 126; i += 14) { g.beginPath(); g.moveTo(i, 8); g.lineTo(i + 160, 168); g.moveTo(i + 160, 8); g.lineTo(i, 168); g.stroke(); }
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, 126, 8); g.fillRect(0, 168, 126, 8); g.fillRect(0, 0, 8, 176); g.fillRect(118, 0, 8, 176);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/**
 * `led` översätter paketets lednamn till figurens, för en figur med ett annat skelett (en docka ur avatar-pipelinen,
 * docka.ts); utan den är figuren paketets egen.
 */
export function byggKort(scene: T.Scene, dealer: Sits, led: (paketets: string) => string | null = name => name): Kort {
  const bone = (name: string) => { const b = dealer.holder.getObjectByName(led(name) ?? name); if (!b) throw Error(`Figuren saknar leden ${led(name) ?? name}.`); return b; };
  const hand = (side: 'r' | 'l') => ({wrist: bone(`hand_${side}`), index: [bone(`index_01_${side}`), bone(`index_02_${side}`), bone(`index_03_${side}`)], pinky: bone(`pinky_01_${side}`), mirror: side === 'l' ? -1 : 1});
  const right = hand('r'), left = hand('l');
  const at = (b: T.Object3D) => b.getWorldPosition(new T.Vector3());

  // Kortet: en låda med ryggen på ovansidan (y) och långsidan längs z.
  const rygg = new T.MeshStandardMaterial({map: back(), roughness: 0.6}), fram = new T.MeshStandardMaterial({color: 0xf4f2ec, roughness: 0.6}), kant = new T.MeshStandardMaterial({color: 0xe8e4dc, roughness: 0.8});
  const shape = new T.BoxGeometry(CARD.width, CARD_THICK, CARD.height), group = new T.Group(); scene.add(group);
  const cards: T.Mesh[] = [];
  let deals: Deal[] = [], active = false, shown = true, lift = 0;

  /** En ställning: mitten, normalen (sidan ryggen vänds åt) och långsidans riktning. */
  const basis = new T.Matrix4(), x = new T.Vector3();
  const pose = (normal: T.Vector3, long: T.Vector3, centre: T.Vector3): Pose => {
    const l = long.clone().addScaledVector(normal, -long.dot(normal)).normalize(); // långsidan i kortets plan
    x.crossVectors(normal, l);
    return {at: centre.clone(), turn: new T.Quaternion().setFromRotationMatrix(basis.makeBasis(x, normal, l))};
  };
  /** Mellan två ställningar, mjukt: k = 0 är den första, 1 den andra. */
  const between = (a: Pose, b: Pose, k: number): Pose => { const s = Math.min(1, Math.max(0, k)), e = s * s * (3 - 2 * s); return {at: a.at.clone().lerp(b.at, e), turn: a.turn.clone().slerp(b.turn, e)}; };

  /** Kortet i skons mynning: spelets sko vid dockbordet (talen i table-lens.ts), lutat mot frontplattan med ryggen utåt. */
  const mouth = (() => {
    const shoe = dollShoe(), c = shoeCard(shoePose(TABLE_LENS, shoe), shoe), up = new T.Vector3(...c.up), out = new T.Vector3().crossVectors(new T.Vector3(...c.across), up).normalize();
    if (out.y < 0) out.negate(); // plattan lutar bakåt, så dess utsida vetter uppåt
    return pose(out, up, new T.Vector3(...c.centre));
  })();
  const shoeNow = (): Pose => ({at: mouth.at.clone().setY(mouth.at.y + lift), turn: mouth.turn});

  /** Kortet under en hands fingrar nu: mot fingrarnas insida, ryggen mot handryggen, långsidan längs pekfingret. */
  function inFingers(h: typeof right): Pose {
    const [a, b, c] = h.index.map(at), along = c.clone().sub(a).normalize(), across = at(h.pinky).sub(a).normalize();
    const outward = new T.Vector3().crossVectors(across, along).multiplyScalar(h.mirror).normalize(); // ut ur handryggen
    return pose(outward, along, b.clone().addScaledVector(outward, -0.014).addScaledVector(along, 0.02).addScaledVector(across, 0.012));
  }

  /** Dealern ställd för en tid i rörelsen (sidan ställer honom igen i nästa bild). */
  const stand = (t: number) => { dealer.action!.time = t; dealer.mixer.update(0); dealer.holder.updateMatrixWorld(true); };

  function rorelse(namn: string | null) {
    for (const c of cards.splice(0)) group.remove(c);
    deals = []; active = !!namn && DEALS.has(namn) && !!dealer.action && dealer.length > 0;
    group.visible = active && shown;
    if (!active) return;
    // Högerhandens avstånd från vilan (rörelsens första bild), vänsterhandens från skon och händernas från varandra, 30 gånger i sekunden.
    const step = 1 / 30, count = Math.floor(dealer.length / step);
    stand(0); const restR = at(right.wrist), spot = dealer.holder.getWorldPosition(new T.Vector3());
    const farR: number[] = [], toShoe: number[] = [], apart: number[] = [];
    for (let i = 0; i <= count; i++) { stand(i * step); const r = at(right.wrist); farR.push(r.distanceTo(restR)); toShoe.push(at(left.index[2]).distanceTo(mouth.at)); apart.push(r.distanceTo(at(left.wrist))); }
    const best = (from: number, to: number, better: (k: number, than: number) => boolean) => { let found = from; for (let k = from; k <= to; k++) if (better(k, found)) found = k; return found; };
    for (let i = 0; i <= count; i++) {
      if (farR[i] <= AWAY) continue;
      let end = i; while (end < count && farR[end + 1] > AWAY) end++;
      if ((end - i) * step >= LEAST) {
        const release = best(i, end, (k, than) => farR[k] > farR[than]);
        const draw = best(Math.max(0, release - Math.round(REACH / step)), release, (k, than) => toShoe[k] < toShoe[than]);
        const pass = best(draw, release, (k, than) => apart[k] < apart[than]);
        stand(release * step);
        const inHand = inFingers(right), n = deals.length;
        // På bordet: under handen där den släpper, plant med ryggen upp, långsidan i riktningen från dealern.
        const down = new T.Vector3(inHand.at.x, CARD_THICK * (n + 0.5), inHand.at.z);
        deals.push({draw: draw * step, pass: pass * step, release: release * step, inHand, onTable: pose(new T.Vector3(0, 1, 0), down.clone().sub(spot).setY(0).normalize(), down)});
        const card = new T.Mesh(shape, [kant, kant, rygg, fram, kant, kant]); card.castShadow = true; card.receiveShadow = true; cards.push(card); group.add(card);
      }
      i = end;
    }
  }

  function stall(t: number) {
    if (!active || !group.visible) return;
    dealer.holder.updateMatrixWorld(true);
    deals.forEach((d, i) => {
      const card = cards[i];
      card.visible = t >= d.draw - DRAW / 2;
      if (!card.visible) return;
      const p = t < d.draw + DRAW / 2 ? between(shoeNow(), inFingers(left), (t - (d.draw - DRAW / 2)) / DRAW)
        : t < d.pass - PASS / 2 ? inFingers(left)
        : t < d.pass + PASS / 2 ? between(inFingers(left), inFingers(right), (t - (d.pass - PASS / 2)) / PASS)
        : t < d.release ? inFingers(right)
        : between(d.inHand, {at: d.onTable.at.clone().setY(d.onTable.at.y + lift), turn: d.onTable.turn}, (t - d.release) / DROP);
      card.position.copy(p.at); card.quaternion.copy(p.turn);
    });
  }

  return {rorelse, stall, visa: pa => { shown = pa; group.visible = active && shown; }, hojd: meter => { lift = meter; }};
}
