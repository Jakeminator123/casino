export type View = 'native' | 'portrait';
export type Hand = 'LH' | 'RH';
export type Side = 'BACK' | 'FRONT';
export type Point = { u: number; v: number };
export type Geometry = Point & { width: number; height: number; angle: number; taper: number };
// grip: how the card leaves the shoe. PINCH = pinched in the shoe's window and lifted (anchor 2, position 1); DRAG = fingertips
// on the card in the shoe's mouth, slid out along the felt (anchor 2, position 2). turnAt: where a turned card is turned, on the
// way (AIR) or at its place on the felt (PLACE); it only means something when turn is true. A card turned later needs no value
// of its own: it is turn=false with endSide equal to startSide (closed), as the dealer's second card is.
// flipAxis: how a card turned on the way is turned (Jakob 2026-11-17: both ways are valid, the right side comes up towards the
// player, yellow to blue). FREE: the wrist turns over with the card, the palm from down to up; LONG_EDGE: hand and card roll
// together about the card's long side like a key (Jakob's "vändning B", 2026-11-17). A card turned at its place (turnAt PLACE) rolls over its long
// edge there whatever flipAxis says. An order says the three in one word (src/order-model.ts FlipAxis: AT_PLACE, FREE, LONG_EDGE).
export type Grip = 'PINCH' | 'DRAG';
export type TurnAt = 'AIR' | 'PLACE';
export type TurnAxis = 'FREE' | 'LONG_EDGE';
export type Intent = { takeHand: Hand; startSide: Side; endSide: Side; pass: boolean; turn: boolean; grip: Grip; turnAt: TurnAt; flipAxis: TurnAxis };
export const GRIPS: readonly Grip[] = ['PINCH','DRAG'];
export const TURN_PLACES: readonly TurnAt[] = ['AIR','PLACE'];
export const TURN_AXES: readonly TurnAxis[] = ['FREE','LONG_EDGE'];
// Plans saved before grip, turnAt or flipAxis existed lack them; validatePlan fills these in when a plan is read.
export const INTENT_DEFAULTS: Readonly<Pick<Intent,'grip'|'turnAt'|'flipAxis'>> = Object.freeze({grip:'PINCH',turnAt:'AIR',flipAxis:'FREE'});
export type Target = { geometry: Record<View, Geometry>; intent: Intent; material: { bend: number; gloss: number } };
// perspective: on "Plant bord" every card is a real card at its place through the real camera (size and place), and
// perspective is only its shape: how much narrower its far edge is drawn, as the share at seat 4 (far over near, 0.80 to
// 0.96; src/card-plan.ts). Absent, seat 4's own stored taper (P4.C1's, 0.87 in his plan of 11 Nov). One number for the whole
// plan (Jakob 2026-11-17/18: depth in the shape, "brist på djup i bordet", but sizes that agree with the shoe's card); the
// game reads it under the lens 'standard' (Lins in src/card-plan.ts).
export type TableProjection = { mode:'flat'|'individual'; heading:number; perspective?:number };
/** The table's perspective on "Plant bord": its limits and step. 0.96 is a real card's own shape (the real camera's 0.956). */
export const TABLE_PERSPECTIVE = { min: .80, max: .96, step: .01 } as const;
// The plan is the cards' places and how they are dealt. Until 2026-11-26 it also held the shoe's point and a checked mark per
// card ("Kontrollerad"); nothing read either (the shoe's place is the standard's, src/table-lens.ts SHOE; Jakob 2026-11-24:
// "färre val"), so validatePlan still reads a file that has them and leaves them out, and a save writes neither.
export type PlacementPlan = { schemaVersion: 1; id: 'kortplan'; space: 'image-normalized-bottom-up'; updatedAt: string | null; targets: Record<string, Target>; tableProjection?:TableProjection };
// The headings a flat table's plane may be saved with (validatePlan).
const PLANE_HEADINGS=[-90,-45,-15,0,15,45,90] as const;
export const VIEWS = { native: { width: 1762, height: 1174, label: 'Dator', profileId: 'v6-native', background: 'assets/lab/native.jpg' }, portrait: { width: 1080, height: 1920, label: 'Mobil', profileId: 'v6-portrait', background: 'assets/lab/portrait.jpg' } } as const;
// Inspelning has no picture of its own under the cards: the studio shows the plan's cards on the doll's 3D table
// (dealer3d/page/docka.html in a frame; Jakob 2026-11-25: one picture, all of it in 3D).
export const INITIAL_TARGETS = [...Array.from({length:7},(_,i)=>`P${i+1}`),'D'].flatMap(p=>[`${p}.C1`,`${p}.C2`]);
export const TARGETS = [...INITIAL_TARGETS, 'D.C3'];
// Older files did not store this slot. Preserve its former film-pixel position when upgrading them.
export const DEALER_THIRD_FILM = {x:1069,y:926} as const;
// The card standing in the shoe's window in the lab's two background pictures: its corners in the picture's pixels, clockwise
// from the upper one. The pictures show the game's own card back there (black and gold); the lab paints the place yellow, the
// colour a closed card has in the films and in the plan (Jakob 2026-11-11). Measured in assets/lab/native.jpg and portrait.jpg.
export const SHOE_CARD: Readonly<Record<View, readonly {x:number;y:number}[]>> = {
 native:[{x:1298,y:757.5},{x:1337,y:780},{x:1285,y:854},{x:1244,y:829}],
 portrait:[{x:922.5,y:763.5},{x:955,y:777.5},{x:904.5,y:849.5},{x:867.5,y:826.5}],
};
// The card standing in the shoe's window as the dealers' anchors and the bank's films show it (the bank's
// shoe, the same for every dealer): inside the window's mouth, its long side at about 125° in the picture, about 92 × 45 px.
// Its corners, clockwise from the upper one, are the yellow card's own in a rest frame (the largest yellow blob in
// the window, its hull brought to four points; measured in Siluett's picture, the plan's backdrop until 2026-11-23, cut from
// the bank's rest frame); anchor 1 (paow-vila-ung-2) gives the same
// card within 2 px, and it is the V6 picture's card (SHOE_CARD) within 5 px. Until 2026-11-17 late these were the card track's first
// frame of a pinch (111 × 57 px): the card already drawn up out of the window with a strip of the next card, which the lab
// then drew larger than the shoe's mouth (Jakob: "Kortet vid skon ska ju inte vara större än "mynningen" av skon heller").
// The card path starts from it in Dator; Mobil has no film of its own and starts from SHOE_CARD.
export const WINDOW_CARD: Readonly<Record<View, readonly {x:number;y:number}[]>> = {
 native:[{x:1298,y:760},{x:1337,y:781},{x:1280,y:855},{x:1240,y:831}],
 portrait:SHOE_CARD.portrait,
};
// A card as the films show it, and as the labs where films are planned and ordered draw it (Jakob 2026-11-17: the back yellow,
// the face blue; the print is the game's afterwork): one yellow and one blue, the film card's own. The blue is the median of
// the card drawn on an order's last picture (the bank's real card pixels, tools/order-images.ts TEXTURE: 0, 130, 218), the
// yellow the median of the card in the shoe's window of anchors 1 and 2.1 and the plan's backdrop (VIEWS; 239–245, 214–228, 0–3).
// The game's lit film card (src/scene3d-deal.ts COLOUR: 232, 209, 5 and 0, 121, 227) lies within 13 of both.
//
// The film card's four colours, kept here and nowhere else (Jakob 2026-11-20: "Spara RGB-färgen för det gula, blåa, kryssets
// färg och den lilla cirkelns färg på alla kort"): the yellow and the blue above, and the two marks on the blue side, a small
// pink cross in its middle and a small red circle in one corner, so that a film cannot show the wrong side of the card in the
// right colour, and so that the card's turn and angle can be read off the cross. The yellow side carries the opposite marks
// in the same two colours (CARD_MARK.back).
export type Rgb3 = readonly [number, number, number];
export const CARD_RGB: Readonly<Record<'back' | 'face' | 'cross' | 'dot', Rgb3>> = { back: [241, 216, 0], face: [0, 130, 218], cross: [255, 120, 200], dot: [225, 30, 35] };
const hexOf = (c: Rgb3) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
export const CARD_COLOUR: Readonly<Record<Side, string>> = { BACK: hexOf(CARD_RGB.back), FRONT: hexOf(CARD_RGB.face) };
export const MARK_COLOUR: Readonly<Record<'cross' | 'dot', string>> = { cross: hexOf(CARD_RGB.cross), dot: hexOf(CARD_RGB.dot) };
// The marks' measures in card widths (63 mm): the cross's arms reach `arm` from the card's middle along its diagonals of a
// square and are `stroke` wide (about 21 mm across, 4 mm wide); the circle has radius `radius` and its middle lies `inset` in
// from both sides of one corner (9 mm across, 13 mm in), so that blue goes all round it and the card's outline stays whole.
// `long` is the card's long side in widths (88 mm).
//
// `back` is the yellow side's marks, the opposite ones in the same two colours (Jakob 2026-11-23: "samma RGB ... men motsatta
// symboler"; 2026-11-24: "EN OCH SAMMA TYP AV KORT för respektive sida"): a filled red circle of radius `radius` in the card's
// middle (20 mm across) and a pink cross on the card's middle line, its middle `inset` in from one short side (13 mm), its
// arms and stroke measured as the blue side's (20 mm across, 3.5 mm wide). The cross lies at the short side the blue side's
// circle lies at: the lower end of the card in the shoe's window, the one her hand leaves free. Measured on A2.3's card in
// that window (assets/anchors/paow-ankare-2-3-marke), whose marks are drawn in the picture's pixels: carried back through the
// card's perspective the radius and the arm are 0.13–0.21 widths, the stroke 0.045–0.07 and the inset 0.20–0.23, by direction
// and by which reading of the card's corners is used; these are the middle values.
export const CARD_MARK = { long: 88 / 63, cross: { arm: 0.17, stroke: 0.07 }, dot: { radius: 0.075, inset: 0.2 }, back: { dot: { radius: 0.16 }, cross: { arm: 0.16, stroke: 0.055, inset: 0.21 } } } as const;
/**
 * The marks of a card's side as shapes in the picture, for a card drawn as four corners far left, far right, near right,
 * near left (src/card-plan.ts planCardQuad): the cross's two arms and the circle, each a polygon, laid through the same
 * perspective as the corners. The first side (far left to far right) is read as the card's short side, as the plan's cards
 * lie. The blue side (the one where `side` is left out): the cross in the middle and the circle at the near left corner, the
 * one furthest from her fingertips in a landing picture. The yellow side: the circle in the middle and the cross on the
 * middle line near the near short side, the lower end of the card standing in the shoe's window.
 */
export function cardMark(quad: readonly { x: number; y: number }[], side: Side = 'FRONT'): { cross: { x: number; y: number }[][]; dot: { x: number; y: number }[] } {
  const [p0, p1, p2, p3] = quad, back = side === 'BACK', M = back ? { long: CARD_MARK.long, cross: CARD_MARK.back.cross, dot: CARD_MARK.back.dot } : CARD_MARK;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, sx = p0.x - p1.x + p2.x - p3.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, sy = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  // a point of the card in widths (x across 0–1, y along 0–long) to the picture
  const at = (x: number, y: number) => { const s = x, t = y / M.long, w = g * s + h * t + 1; return { x: ((p1.x - p0.x + g * p1.x) * s + (p3.x - p0.x + h * p3.x) * t + p0.x) / w, y: ((p1.y - p0.y + g * p1.y) * s + (p3.y - p0.y + h * p3.y) * t + p0.y) / w }; };
  const cx = 0.5, cy = back ? M.long - CARD_MARK.back.cross.inset : M.long / 2, a = M.cross.arm * Math.SQRT1_2, k = (M.cross.stroke / 2) * Math.SQRT1_2;
  const arm = (d: 1 | -1) => [at(cx - a * d - k * d, cy - a + k), at(cx - a * d + k * d, cy - a - k), at(cx + a * d + k * d, cy + a - k), at(cx + a * d - k * d, cy + a + k)];
  const mx = back ? 0.5 : CARD_MARK.dot.inset, my = back ? M.long / 2 : M.long - CARD_MARK.dot.inset, n = back ? 28 : 20;
  const dot = Array.from({ length: n }, (_, i) => at(mx + M.dot.radius * Math.cos((i * 2 * Math.PI) / n), my + M.dot.radius * Math.sin((i * 2 * Math.PI) / n)));
  return { cross: [arm(1), arm(-1)], dot };
}
export const otherHand = (h: Hand): Hand => h==='LH'?'RH':'LH';
export const otherSide = (s: Side): Side => s==='BACK'?'FRONT':'BACK';
export function toPixels(point: Point, view: View) { const p=VIEWS[view]; return { x:point.u*(p.width-1), y:(1-point.v)*(p.height-1) }; }
export function fromPixels(x: number,y: number,view: View): Point { const p=VIEWS[view];return {u:x/(p.width-1),v:1-y/(p.height-1)}; }
// A single projective plane derived from P4. Saving this visual projection
// does not make it a camera calibration; that still needs measured correspondences.
export function flatQuad(g: Geometry, reference: Geometry, view: View, heading=0) {
 const p=VIEWS[view],origin=toPixels(reference,view),wanted=toPixels(g,view);
 const w=reference.width*(p.width-1)/2,h=reference.height*(p.height-1)/2;
 const k=(reference.taper-1)/(reference.taper+1),roll=reference.angle*Math.PI/180,a=heading*Math.PI/180;
 const project=(x:number,y:number)=>{const d=1+k*y,X=w*(1+k)*x/d,Y=h*(y+k)/d;return {x:origin.x+X*Math.cos(roll)-Y*Math.sin(roll),y:origin.y+X*Math.sin(roll)+Y*Math.cos(roll)};};
 const dx=wanted.x-origin.x,dy=wanted.y-origin.y,lx=dx*Math.cos(roll)+dy*Math.sin(roll),ly=-dx*Math.sin(roll)+dy*Math.cos(roll);
 let cy=(ly/h-k)/(1-k*ly/h),cx=lx*(1+k*cy)/(w*(1+k));
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:x*Math.cos(a)-y*Math.sin(a)/.714,y:x*Math.sin(a)*.714+y*Math.cos(a)}));
 const shape=(x:number,y:number)=>corners.map(q=>project(x+q.x,y+q.y));
 const centre=(x:number,y:number)=>shape(x,y).reduce((s,q)=>({x:s.x+q.x/4,y:s.y+q.y/4}),{x:0,y:0});
 // Preserve the existing image centre, including P4's exact original corners.
 for(let i=0;i<8;i++){const c=centre(cx,cy),ex=wanted.x-c.x,ey=wanted.y-c.y;if(Math.hypot(ex,ey)<1e-8)break;const e=.0001,px=centre(cx+e,cy),py=centre(cx,cy+e),xx=(px.x-c.x)/e,xy=(py.x-c.x)/e,yx=(px.y-c.y)/e,yy=(py.y-c.y)/e,d=xx*yy-xy*yx;cx+=(ex*yy-ey*xy)/d;cy+=(ey*xx-ex*yx)/d;}
 return shape(cx,cy);
}
// The step that takes the card from the shoe: TAKE (pinch and lift) or DRAG (slid out along the felt); the place of a turn.
const takeStep=(intent:Intent)=>intent.grip==='DRAG'?'DRAG':'TAKE';
const turnPlace=(intent:Intent)=>intent.turnAt==='PLACE'?'PLACE':'AIR';
export function motionNodes(id:string,intent:Intent){const hand=intent.pass?otherHand(intent.takeHand):intent.takeHand;
 return [{id:'ready',label:'SHOE_READY',detail:intent.startSide}, {id:'take',label:takeStep(intent),detail:intent.takeHand},...(intent.pass?[{id:'pass',label:'PASS',detail:`${intent.takeHand} → ${hand}`}]:[]),...(intent.turn?[{id:'turn',label:'TURN',detail:`${intent.startSide} → ${intent.endSide} · ${turnPlace(intent)}`}]:[]),{id:'land',label:'LAND',detail:`${id} · ${intent.endSide}`},{id:'release',label:'RELEASE',detail:hand},{id:'return',label:'RETURN',detail:'SHOE_READY'}];
}
export function quad(g: Geometry, view: View) {
 const p=VIEWS[view],c=toPixels(g,view),w=g.width*(p.width-1)/2,h=g.height*(p.height-1)/2,a=g.angle*Math.PI/180;
 return [[-w*g.taper,-h],[w*g.taper,-h],[w,h],[-w,h]].map(([x,y])=>({x:c.x+x*Math.cos(a)-y*Math.sin(a),y:c.y+x*Math.sin(a)+y*Math.cos(a)}));
}
export function constrain(g: Geometry,view: View): Geometry {
 const p=VIEWS[view],q=quad(g,view),xs=q.map(p=>p.x),ys=q.map(p=>p.y);
 const dx=Math.max(0,-Math.min(...xs))-Math.max(0,Math.max(...xs)-(p.width-1));
 const dy=Math.max(0,-Math.min(...ys))-Math.max(0,Math.max(...ys)-(p.height-1));
 return {...g,u:g.u+dx/(p.width-1),v:g.v-dy/(p.height-1)};
}
export function sequence(id: string, intent: Intent) {
 const hand=intent.pass?otherHand(intent.takeHand):intent.takeHand;
 return [`${id} | ${takeStep(intent)}(${intent.takeHand},${intent.startSide})`,...(intent.pass?[`PASS(${intent.takeHand}>${hand},${intent.startSide})`]:[]),...(intent.turn?[`TURN(${hand},${intent.startSide}>${intent.endSide},${turnPlace(intent)})`]:[]),`LAND(${intent.endSide})`,`RELEASE(${hand})`,`RETURN(SHOE_READY)`].join(' > ');
}
// ── Edits of a plan, for the page that changes one (Bordet's Inspelning) ──
// Each returns a new plan and leaves the given one alone. The rules: a card's outline is kept inside the picture, and its sides and TURN agree.
/** A card place (P1.C1 … D.C3). */
export type Place = string;
/** The shoe's old place word, no place since 2026-11-26 (above); studio/lib/bordet.ts still guards against it. */
export const SHOE = 'shoe';
const unit = (x: number) => Math.max(0, Math.min(1, x));
const placeOf = (plan: PlacementPlan, id: string) => { const t = plan.targets[id]; if (!t) throw Error(`Okänd kortplats ${id}.`); return t; };
/**
 * The quad a card is drawn with in a view by the plan's own, older drawing rule: as the game lays its cards with the geometry
 * 'contract' (src/game-table.ts); the lab, and the game with the geometry 'lens', draw src/card-plan.ts planCardQuad. On a flat
 * table (tableProjection.mode 'flat') every card is P4.C1's outline carried over one plane to its own centre (flatQuad); otherwise
 * each card has its own angle, size and taper (quad). A plan without tableProjection is drawn card by card, as the game does.
 */
export function planQuad(plan: PlacementPlan, id: string, view: View) {
 const g = placeOf(plan, id).geometry[view], t = plan.tableProjection;
 return t?.mode === 'flat' ? flatQuad(g, plan.targets['P4.C1'].geometry[view], view, t.heading) : quad(g, view);
}
/**
 * Changes a card's geometry in one view: size and taper are held to the model's limits, the angle to −180…180, and the whole
 * outline is moved back inside the picture (constrain).
 */
export function editPlace(plan: PlacementPlan, id: Place, view: View, patch: Partial<Geometry>): PlacementPlan {
 const next = structuredClone(plan);
 const target = placeOf(next, id), g: Geometry = {...target.geometry[view], ...patch};
 g.u = unit(g.u); g.v = unit(g.v); g.width = Math.min(.25, Math.max(.005, g.width)); g.height = Math.min(.25, Math.max(.005, g.height));
 g.taper = Math.min(1.6, Math.max(.4, g.taper)); g.angle = g.angle > 180 || g.angle < -180 ? ((g.angle % 360) + 540) % 360 - 180 : g.angle;
 target.geometry[view] = constrain(g, view);
 return next;
}
/** One motion choice of a card. Turning the card and its two sides agree: TURN flips the landing side, a changed side sets TURN. */
export function editIntent<K extends keyof Intent>(plan: PlacementPlan, id: string, key: K, value: Intent[K]): PlacementPlan {
 const next = structuredClone(plan), i = placeOf(next, id).intent;
 i[key] = value;
 if (key === 'turn') i.endSide = i.turn ? otherSide(i.startSide) : i.startSide;
 else if (key === 'startSide' || key === 'endSide') i.turn = i.startSide !== i.endSide;
 return next;
}
/** The table's perspective on "Plant bord" (one number for the whole plan), or null for the real camera's. */
export function setTablePerspective(plan: PlacementPlan, perspective: number | null): PlacementPlan {
 if (perspective !== null && (!Number.isFinite(perspective) || perspective < TABLE_PERSPECTIVE.min || perspective > TABLE_PERSPECTIVE.max)) throw Error(`Välj ett perspektiv mellan ${TABLE_PERSPECTIVE.min} och ${TABLE_PERSPECTIVE.max}.`);
 const next = structuredClone(plan), t = next.tableProjection ?? {mode: 'flat' as const, heading: 0};
 next.tableProjection = {mode: t.mode, heading: t.heading, ...(perspective === null ? {} : {perspective: Math.round(perspective * 1000) / 1000})};
 return next;
}
export function defaultPlan(): PlacementPlan {
 const targets: Record<string,Target>={};
 for(const id of INITIAL_TARGETS){const dealer=id[0]==='D',seat=dealer?3:Number(id[1])-1,second=id.endsWith('2'),v=.08+Math.abs(seat-3)*.025,closed=(dealer&&second)||id==='P4.C2';
  targets[id]={geometry:{native:{u:dealer?.5+(second?.027:0):.13+seat*.12+(second?.025:0),v:dealer?.21:v+(second?.008:0),width:.041,height:.051,angle:0,taper:.9},portrait:{u:dealer?.47+(second?.048:0):.10+seat*.125+(second?.035:0),v:dealer?.49:.16+Math.abs(seat-3)*.055+(second?.005:0),width:.06,height:.04,angle:0,taper:.9}},intent:{takeHand:'LH',startSide:'BACK',endSide:closed?'BACK':'FRONT',pass:false,turn:!closed,...INTENT_DEFAULTS},material:{bend:.07,gloss:.35}};
 }
 targets['D.C3']=dealerThirdTarget(targets);
 return {schemaVersion:1,id:'kortplan',space:'image-normalized-bottom-up',updatedAt:null,targets,tableProjection:{mode:'flat',heading:0}};
}
/** Additive upgrade: the original sixteen cards are never moved or resized. */
export function dealerThirdTarget(targets: Record<string,Target>): Target {
 const first=targets['D.C1'],second=targets['D.C2'],out=structuredClone(second);
 out.geometry.native={...out.geometry.native,u:DEALER_THIRD_FILM.x/1763,v:1-DEALER_THIRD_FILM.y/1173};
 out.geometry.portrait={...out.geometry.portrait,u:Math.min(1,Math.max(0,2*second.geometry.portrait.u-first.geometry.portrait.u))};
 out.intent={...first.intent,startSide:'BACK',endSide:'FRONT',turn:true};
 return out;
}
function object(v:unknown): v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function keys(v:unknown,list:string[]): asserts v is Record<string,unknown>{if(!object(v)||Object.keys(v).sort().join('|')!==list.sort().join('|'))throw Error('Felaktiga fält i kortplanen.');}
function number(v:unknown,lo:number,hi:number){if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error('Koordinat eller reglage ligger utanför tillåtet intervall.');}
const has=(v:unknown,key:string)=>object(v)&&Object.hasOwn(v,key);
// Checks a plan strictly and, once all of it has passed, fills in the intent keys an older file lacks (grip, turnAt, flipAxis)
// with their defaults and leaves out the two fields the plan no longer keeps (the shoe's point, a card's checked mark
// `reviewed`; PlacementPlan), in place: every reader gets a complete plan, and a save or export writes the keys. The plan was
// called 'pamela-table' until 2026-11-23; a copy with that id, such as a proof's frozen kortplan.json, reads as the plan and
// is written as 'kortplan'.
export function validatePlan(value: unknown): asserts value is PlacementPlan {
 keys(value,['schemaVersion','id','space','updatedAt','targets',...(has(value,'shoe')?['shoe']:[]),...(has(value,'tableProjection')?['tableProjection']:[])]);
 if(Object.hasOwn(value,'tableProjection')){
  keys(value.tableProjection,['mode','heading',...(object(value.tableProjection)&&Object.hasOwn(value.tableProjection,'perspective')?['perspective']:[])]);
  if(!['flat','individual'].includes(value.tableProjection.mode as string)||!PLANE_HEADINGS.includes(value.tableProjection.heading as typeof PLANE_HEADINGS[number]))throw Error('Ogiltigt bordperspektiv eller riktning.');
  if(Object.hasOwn(value.tableProjection,'perspective'))number(value.tableProjection.perspective,TABLE_PERSPECTIVE.min,TABLE_PERSPECTIVE.max);
 }
 if(value.schemaVersion!==1||(value.id!=='kortplan'&&value.id!=='pamela-table')||value.space!=='image-normalized-bottom-up'||!(value.updatedAt===null||(typeof value.updatedAt==='string'&&value.updatedAt.length<40&&Number.isFinite(Date.parse(value.updatedAt)))))throw Error('Okänd placering eller bildrymd.');
 keys(value.targets,[...(has(value.targets,'D.C3')?TARGETS:INITIAL_TARGETS)]);
 for(const target of Object.values(value.targets)){
  keys(target,['geometry','intent','material']);keys(target.geometry,['native','portrait']);keys(target.intent,['takeHand','startSide','endSide','pass','turn',...Object.keys(INTENT_DEFAULTS).filter(key=>object(target.intent)&&Object.hasOwn(target.intent,key))]);keys(target.material,['bend','gloss']);
  const i=target.intent;if(typeof i.takeHand!=='string'||typeof i.startSide!=='string'||typeof i.endSide!=='string'||!['LH','RH'].includes(i.takeHand)||!['BACK','FRONT'].includes(i.startSide)||!['BACK','FRONT'].includes(i.endSide)||typeof i.pass!=='boolean'||typeof i.turn!=='boolean'||i.turn!==(i.startSide!==i.endSide))throw Error('Sidbyte kräver TURN; handbyte och kortvändning är skilda val.');
  if(Object.hasOwn(i,'grip')&&!GRIPS.includes(i.grip as Grip))throw Error('Okänt grepp vid skon: PINCH eller DRAG.');
  if(Object.hasOwn(i,'turnAt')&&!TURN_PLACES.includes(i.turnAt as TurnAt))throw Error('Okänd plats för vändningen: AIR eller PLACE.');
  if(Object.hasOwn(i,'flipAxis')&&!TURN_AXES.includes(i.flipAxis as TurnAxis))throw Error('Okänd vändning på vägen: FREE eller LONG_EDGE.');
  number(target.material.bend,0,.18);number(target.material.gloss,0,1);
  for(const view of ['native','portrait'] as View[]){const g=target.geometry[view];keys(g,['u','v','width','height','angle','taper',...(has(g,'reviewed')?['reviewed']:[])]);number(g.u,0,1);number(g.v,0,1);number(g.width,.005,.25);number(g.height,.005,.25);number(g.angle,-180,180);number(g.taper,.4,1.6);
   const p=VIEWS[view];if(quad(g as Geometry,view).some(q=>q.x<-.01||q.y<-.01||q.x>p.width-1+.01||q.y>p.height-1+.01))throw Error('Hela kortkonturen måste ligga inom bildytan.');
  }
 }
 for(const target of Object.values(value.targets) as {intent:Record<string,unknown>}[])for(const [key,fallback] of Object.entries(INTENT_DEFAULTS))if(!Object.hasOwn(target.intent,key))target.intent[key]=fallback;
 if(!Object.hasOwn(value.targets,'D.C3'))value.targets['D.C3']=dealerThirdTarget(value.targets as Record<string,Target>);
 delete value.shoe;
 for(const target of Object.values(value.targets) as {geometry:Record<View,Record<string,unknown>>}[])for(const view of ['native','portrait'] as View[])delete target.geometry[view].reviewed;
 value.id='kortplan';
}
