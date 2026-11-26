// Skyddar: Jakobs domar – standarddockans grundrörelser (vilan till skon och givarna från A2.3, skrivna av dealer3d/tools/ren-givar.ts): takten (vilan till skon cirka 1 s, kortet ut högst 1 s, handen tillbaka cirka 0,6 s), landningen plan på platsen och stilla, inget som spärrar, och att varje rörelse börjar och slutar i exakt ankaret.
// Jakobs domar (standarddocka/AGENTS.md, 2026-11-26): "A1 - A2.3 ska ta 1 sekund ungefär", "respektive utgivning är max 1
// sekund och tillbakagången till A1 och/eller A2.3 eller så ska göras på ca 0,6 sekunder"; kortet ligger sedan plant på
// planens plats och flyttas inte; "Allt börjar i A1": varje rörelse börjar och slutar stilla i sitt ankare, så att klippen
// läggs efter varandra utan skarv; och det som spärrar en rörelse från att filmas (dealer3d/src/ren-giv.ts granska med
// dockan: ett finger i kortet eller filten, kortet utan stöd, ett hörn under filten, ett hopp, och ett ben som inte har
// sin längd, alltså en handled armen inte når). Prövar de filer som finns för mannen och kvinnan.
//   node --test dealer3d/tests/standarddockans-givar.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {dollNamed} from '../src/doll.ts';
import {granska, type Ankare23} from '../src/ren-giv.ts';
import {spots, type Plan} from '../src/world.ts';
import {CARD, TABLE_LENS} from '../../src/table-lens.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), DATA = path.join(ROOT, 'dealer3d/data');
const read = (namn: string) => JSON.parse(readFileSync(path.join(DATA, `${namn}.json`), 'utf8'));
const plan = JSON.parse(readFileSync(path.join(ROOT, 'placements/default.json'), 'utf8')) as Plan, platser = spots(plan, TABLE_LENS);
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
type Frame = Ankare23['frame'];
type Motion = {fps: number; frames: Frame[]; leavesShoe: number; rests: number; doll: string};
/** Kroppen i en ruta (armarna, händerna, huvudet), som ankaret har den. */
const kroppen = (f: Frame) => JSON.stringify({R: f.R, L: f.L, h: f.h});

for (const docka of ['man', 'kvinna']) {
  if (!existsSync(path.join(DATA, `ankare-2-3-${docka}.json`))) continue;
  const doll = dollNamed(docka), ankaret = read(`ankare-2-3-${docka}`).frame as Frame;

  test(`${docka}: vilan till skon tar cirka 1 s och slutar i exakt ankaret`, {skip: !existsSync(path.join(DATA, `till-ankare-2-3-${docka}.json`))}, () => {
    const m = read(`till-ankare-2-3-${docka}`) as Motion, F = m.frames;
    assert.equal(m.doll, docka);
    assert.equal(JSON.stringify(F.at(-1)), JSON.stringify(ankaret), 'sista rutan är inte ankarets');
    const ror = F.map((f, i) => i > 0 && Math.max(dist(f.R.w, F[i - 1].R.w), dist(f.L.w, F[i - 1].L.w)) > 0.001), fran = ror.indexOf(true), till = ror.lastIndexOf(true);
    const sek = (till - fran + 1) / m.fps; assert.ok(sek >= 0.8 && sek <= 1.2, `rörelsen tar ${sek.toFixed(2)} s`);
    const g = granska({frames: F, leavesShoe: F.length, rests: F.length}, doll); assert.equal(g.sparrRutor, 0, `spärr: ${g.vad.join(', ')}`);
  });

  const givar = readdirSync(DATA).filter(f => new RegExp(`^giv-fran-2-3-p\\dc1-ren-a-${docka}\\.json$`).test(f)).map(f => f.replace(/\.json$/, ''));
  for (const namn of givar) test(`${docka}: ${namn} i Jakobs takt, landar plant på platsen och stilla, utan spärr, från och till ankaret`, () => {
    const m = read(namn) as Motion, F = m.frames, plats = platser.find(s => s.id === `P${namn.match(/-p(\d)c1-/)![1]}.C1`)!;
    assert.equal(m.doll, docka);
    assert.equal(kroppen(F[0]), kroppen(ankaret), 'första rutan är inte ankaret');
    assert.equal(kroppen(F.at(-1)!), kroppen(ankaret), 'sista rutan är inte ankaret');
    assert.ok(m.rests / m.fps <= 1 + 1e-9, `kortet ligger först efter ${(m.rests / m.fps).toFixed(2)} s`);
    const tillbaka = (F.length - 1 - m.rests) / m.fps; assert.ok(tillbaka >= 0.5 && tillbaka <= 0.7, `handen tillbaka på ${tillbaka.toFixed(2)} s`);
    const kort = F[m.rests].card;
    assert.ok(kort.n[1] >= Math.cos(Math.PI / 180), 'kortet ligger inte plant med framsidan upp');
    assert.ok(Math.abs(kort.c[1] - CARD.thickness / 2) <= 0.0005, `kortet ${((kort.c[1] - CARD.thickness / 2) * 1000).toFixed(1)} mm från filten`);
    assert.ok(Math.hypot(kort.c[0] - plats.at[0], kort.c[2] - plats.at[2]) <= 0.005, 'kortet ligger inte på planens plats');
    for (const f of F.slice(m.rests)) assert.ok(dist(f.card.c, kort.c) <= 0.0005 && dist(f.card.n, kort.n) <= 0.001, 'kortet flyttas efter att det har landat');
    const g = granska(m, doll); assert.equal(g.sparrRutor, 0, `spärr: ${g.vad.join(', ')}`);
  });
}
