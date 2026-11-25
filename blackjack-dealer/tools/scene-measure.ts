// Measures where the table's points land in the game's picture, so that a change to the scene can be shown to leave
// Casino where it was (STATUS, Bred lins räknad ur standarden; first used 2026-11-26 for the key lins and the play view,
// where every point stayed within a hundredth of a pixel). Four small commands, run from blackjack-dealer/:
//
//   node tools/scene-measure.ts lista <lista.json>
//       the list tools/lab-look.ts reads: the game with Casino's look, with Standard, without a look and with Jakob's own
//       looks, on a computer (1440 x 900) and a phone (390 x 844), each with the facts below; and two studio pages, pictures only
//   node tools/lab-look.ts <lista.json> <utmapp> --vem <chatt> > fore.log      (the same again afterwards, into efter.log)
//   node tools/scene-measure.ts jamfor <fore.log> <efter.log> [gräns] [namn=annat …]
//       the largest difference in any number per page (the limit is 0.01), and how far a point moved in pixels; a pair
//       name=other compares page `name` of the first log with page `other` of the second
//   node tools/scene-measure.ts kort <ut.json>
//       the game's lying cards (createLayout) for all 17 places under both lenses, to compare byte for byte with cmp
//   node tools/scene-measure.ts skala
//       how many units of Bred lins's felt a real metre is at points of the table (1.897 across at the dealer's edge)
//
// The facts are read off window.game.scene (src/game-page.ts): the film camera, the view's keys, the canvas, and the picture
// point and pixels per metre of fixed table points, the tray's corners and every card place and bet ring.
import {readFileSync, writeFileSync} from 'node:fs';
import {createLayout, slotLabel, type Slot} from '../src/game-table.ts';
import {cameraFromContract, edgeRowOf, filmToTable, lensCamera, solveCamera, tableToFilm} from '../src/scene3d-geometry.ts';
import {TABLE_LENS} from '../src/table-lens.ts';

const FACTS = `(() => {
  const g = window.game; if (!g || !g.scene) return {fel: 'ingen scen'};
  const s = g.scene, st = s.state, c = s.canvas, r = v => Math.round(v * 1000) / 1000;
  const at = (x, d) => { const p = s.project(x, d); return [r(p.x), r(p.y), r(p.pxPerM)]; };
  const spots = s.spots();
  return {
    kamera: s.status().camera,
    vy: {yaw: st.yaw, pitch: st.pitch, zoom: st.zoom, dx: st.dx, dy: st.dy, dz: st.dz, format: st.format, lins: st.lins ?? null, tableSize: st.tableSize},
    duk: [c.clientWidth, c.clientHeight, c.width, c.height],
    bord: [[-1.2, 0], [-0.6, 0], [0, 0], [0.6, 0], [1.2, 0], [0, 0.3], [0, 0.6], [-0.7, 0.45], [0.7, 0.45]].map(([x, d]) => at(x, d)),
    lada: [[-0.3, 0], [0.24, 0], [-0.3, 0.1], [0.24, 0.1]].map(([x, d]) => at(x, d)),
    kort: Object.fromEntries(spots.cards.map(p => [p.id, at(p.x, p.s)])),
    insats: Object.fromEntries(spots.bets.map(p => [p.id, at(p.x, p.s)])),
  };
})()`.replace(/\s*\n\s*/g, ' ');

/** The pages: each game page gets a table of its own, so that no measurement plays in Jakob's session. */
function list(out: string) {
  const sizes = [{tag: 'dator', width: 1440, height: 900}, {tag: 'mobil', width: 390, height: 844}];
  const game = [
    {name: 'casino', url: '/game.html?forval=casino&table=matt-a'},
    {name: 'casino-standard', url: '/game.html?forval=casino&lins=standard&table=matt-b'},
    {name: 'spelet', url: '/game.html?table=matt-c'},
    {name: 'jakob-1', url: '/game.html?forval=jakob-1&table=matt-d'},
    {name: 'profilval-1', url: '/game.html?forval=profilval-1&table=matt-e'},
  ];
  const studio = [{name: 'scen', url: '/studio/bordet/?lage=scen'}, {name: 'casino-vyn', url: '/studio/game/'}];
  const pages = sizes.flatMap(size => [
    ...game.map(p => ({name: `${p.name}-${size.tag}`, url: p.url, wait: 7000, width: size.width, height: size.height, facts: FACTS})),
    ...studio.map(p => ({name: `${p.name}-${size.tag}`, url: p.url, wait: 7000, width: size.width, height: size.height})),
  ]);
  writeFileSync(out, JSON.stringify(pages, null, 1) + '\n');
  console.log(`${pages.length} sidor i ${out}`);
}

/** A page's name and its facts from a line "name → address {…} inga fel" of tools/lab-look.ts. */
function read(file: string): Map<string, {facts: unknown; errors: string}> {
  const pages = new Map<string, {facts: unknown; errors: string}>();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^(\S+) → \S+ (.*?) (inga fel|FEL: .*)$/.exec(line.trim());
    if (m) pages.set(m[1], {facts: m[2] ? JSON.parse(m[2]) : null, errors: m[3]});
  }
  return pages;
}
/** Every number and word of a page's facts, by its path. */
function flat(value: unknown, at = '', out = new Map<string, number | string | boolean | null>()) {
  if (value !== null && typeof value === 'object') for (const [k, v] of Object.entries(value)) flat(v, at ? `${at}.${k}` : k, out);
  else out.set(at, value as number | string | boolean | null);
  return out;
}
function compare(a: string, b: string, rest: string[]) {
  const limit = Number(rest.find(word => !word.includes('=')) ?? 0.01);
  const paired = new Map(rest.filter(word => word.includes('=')).map(word => word.split('=') as [string, string]));
  const before = read(a), after = read(b);
  let red = false;
  for (const [name, was] of before) {
    const now = after.get(paired.get(name) ?? name);
    if (!now) { console.log(`${name}: ${paired.get(name) ?? name} saknas i ${b}`); red = true; continue; }
    // The same errors before and after (media that is not on this computer) are not said; a new one is.
    if (was.errors !== now.errors) console.log(`${name}: före "${was.errors.slice(0, 200)}" · efter "${now.errors.slice(0, 200)}"`);
    if (!was.facts && !now.facts) { console.log(`${name}: bara bild`); continue; }
    const x = flat(was.facts), y = flat(now.facts), other: string[] = [];
    // moved: how far a point moved in the picture (x and y of a point; the third number of a point is its pixels per metre)
    let worst = 0, where = '', moved = 0, movedAt = '';
    for (const key of new Set([...x.keys(), ...y.keys()])) {
      const p = x.get(key), q = y.get(key);
      if (typeof p === 'number' && typeof q === 'number') {
        const d = Math.abs(p - q); if (d > worst) { worst = d; where = key; }
        if (/^(bord|lada|kort|insats)\..*\.[01]$/.test(key) && d > moved) { moved = d; movedAt = key; }
      } else if (p !== q) other.push(`${key}: ${JSON.stringify(p)} → ${JSON.stringify(q)}`);
    }
    const ok = worst <= limit; if (!ok) red = true;
    console.log(`${name}: ${x.size} tal, största skillnad ${worst.toFixed(4)}${where ? ` (${where})` : ''} ${ok ? 'inom gränsen' : `ÖVER ${limit}`}${ok ? '' : ` · största flytt ${moved.toFixed(2)} px${movedAt ? ` (${movedAt})` : ''}`}${other.length ? ` · annat: ${other.join('; ').slice(0, 300)}` : ''}`);
  }
  process.exitCode = red ? 1 : 0;
}

/** The game's lying cards for the plan's 17 places under both lenses. */
function cards(out: string) {
  const file = JSON.parse(readFileSync('placements/default.json', 'utf8')), plan = file.plan ?? file;
  const slots: Slot[] = [...[1, 2, 3, 4, 5, 6, 7].flatMap(seat => [0, 1].map(index => ({owner: 'P' as const, seat, hand: 0, hands: 1, index}))), ...[0, 1, 2].map(index => ({owner: 'D' as const, seat: 0, hand: 0, hands: 1, index}))];
  const quads = Object.fromEntries((['bred', 'standard'] as const).map(lins => { const layout = createLayout(plan, {lins}); return [lins, Object.fromEntries(slots.map(slot => [slotLabel(slot), layout.quad(slot).map(p => [p.x, p.y])]))]; }));
  writeFileSync(out, JSON.stringify(quads, null, 1) + '\n');
  console.log(`${slots.length} platser under två linser i ${out}`);
}

/** The magnification between the standard's felt and Bred lins's felt through the film's pixels, across and in depth. */
function scale() {
  const contract = JSON.parse(readFileSync('data/scene-contract.json', 'utf8')), wide = cameraFromContract(contract), standard = lensCamera(TABLE_LENS, edgeRowOf(contract));
  const laid = (x: number, s: number) => { const pixel = tableToFilm(standard, x, s - solveCamera(standard).edgeDistance), p = filmToTable(wide, pixel.x, pixel.y)!; return {x: p.x, s: p.z + solveCamera(wide).edgeDistance, pixel}; };
  const step = 0.001;
  for (const [name, x, s] of [['dealerkantens mitt', 0, 0], ['10 cm från kanten', 0, 0.1], ['plats 4, 45 cm', 0, 0.45], ['60 cm', 0, 0.6], ['kanten, 50 cm åt sidan', 0.5, 0]] as const) {
    const a = laid(x, s);
    console.log(`${name.padEnd(24)} bildpunkt (${a.pixel.x.toFixed(0)}, ${a.pixel.y.toFixed(0)})  tvärs ${((laid(x + step, s).x - a.x) / step).toFixed(3)}  djup ${((laid(x, s + step).s - a.s) / step).toFixed(3)}`);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'lista' && args[0]) list(args[0]);
else if (command === 'jamfor' && args[0] && args[1]) compare(args[0], args[1], args.slice(2));
else if (command === 'kort' && args[0]) cards(args[0]);
else if (command === 'skala') scale();
else { console.error('Använd: node tools/scene-measure.ts lista <lista.json> | jamfor <fore.log> <efter.log> [gräns] [namn=annat …] | kort <ut.json> | skala'); process.exitCode = 1; }
