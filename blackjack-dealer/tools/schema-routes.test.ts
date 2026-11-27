// Skyddar: kontraktet mellan rörelseschemat (../standarddocka/rorelsekatalog.json) och det Schemat i Karta visar
// (tools/schema-routes.ts). Varje rörelse går från ett ankare till ett ankare som finns (ett mönster som A3PnC1 räknas till
// A3PnCm), varje stadiums hemankare finns, varje fil katalogen nämner finns, och det vägen säger finns för en docka är filer som
// finns, för en docka vid standardens bord, på en kortplats vid det bordet, och öppnas i Dockan vid det bordet. Ett ankare eller
// en rörelse som katalogen får av någon kommer med i bilden av sig själv. Behöver ingen media: klippen som finns räknas, och
// inga klipp är också ett svar.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {UPPSATTNING, VALETS_FORVAL, dockansUppsattning} from '../src/uppsattning.ts';
import {ankareFor, ar, kodAv, platsAv, rorelseFor, rundansVag, type Katalog} from '../studio/lib/schemat.ts';
import {KALLOR, filerRe, schema} from './schema-routes.ts';

const CASINO = path.resolve(import.meta.dirname, '../..');
const katalog = JSON.parse(readFileSync(path.join(CASINO, KALLOR.katalog), 'utf8')) as Katalog;

test('every motion goes from an anchor to an anchor, every stage\'s home is one, and every file named exists', () => {
  const ids = new Set(katalog.ankare.map(a => a.id));
  assert.equal(ids.size, katalog.ankare.length, 'an anchor\'s id is used once');
  for (const r of katalog.rorelser) {
    assert.ok(ankareFor(r.fran, katalog.ankare), `${r.id}: fran ${r.fran} is an anchor`);
    assert.ok(ankareFor(r.till, katalog.ankare), `${r.id}: till ${r.till} is an anchor`);
    assert.ok(katalog.stadier.some(s => s.id === r.stadium), `${r.id}: its stage ${r.stadium} is a stage`);
  }
  for (const s of katalog.stadier) assert.ok(ankareFor(s.hem, katalog.ankare), `${s.id}: home ${s.hem} is an anchor`);
  for (const x of [...katalog.rorelser, ...katalog.ankare]) for (const namn of x.lyfta ?? []) assert.ok(existsSync(path.join(CASINO, KALLOR.data, `${namn}.json`)), `${x.id}: ${namn} exists`);
  assert.ok(rundansVag(katalog.begrepp.schemat).length > 2, 'the catalogue writes a round as a path');
});

test('an id is read as the anchor it is one of, and a step as the motion it is', () => {
  const a = [{id: 'A1'}, {id: 'A1S'}, {id: 'A2.3'}, {id: 'A3PnCm'}, {id: 'A3DCm'}];
  assert.equal(ankareFor('A3PnC1', a), 'A3PnCm');
  assert.equal(ankareFor('A3P4C2', a), 'A3PnCm');
  assert.equal(ankareFor('A3DC1', a), 'A3DCm');
  assert.equal(ankareFor('A1', a), 'A1');
  assert.equal(ankareFor('A1S', a), 'A1S');
  assert.equal(ankareFor('A2.4', a), null);
  assert.equal(ankareFor('A23', a), null, 'the dot is a dot');
  assert.ok(ar('A3P4C1', 'A3PnC1') && !ar('A3PnCm', 'A3PnC1') && !ar('A3P4C2', 'A3PnC1'));
  assert.equal(platsAv('A3P4C1'), 'P4.C1'); assert.equal(platsAv('A3DC2'), 'D.C2'); assert.equal(kodAv('P4.C1'), 'A3P4C1');
  // The least general motion wins: the first card to seat 4 is GIV-KORT-1, the second GIV-KORT-2.
  const r = [{id: 'X2', fran: 'A2.3', till: 'A3PnCm', segment: 'GIV'}, {id: 'X1', fran: 'A2.3', till: 'A3PnC1', segment: 'GIV'}];
  assert.equal(rorelseFor('A2.3', 'A3P4C1', r)?.id, 'X1');
  assert.equal(rorelseFor('A2.3', 'A3P4C2', r)?.id, 'X2');
  assert.equal(rorelseFor('A1', 'A3P4C1', r), null);
  assert.deepEqual(rundansVag('En runda: A1 - A2.3 - A3P4C1 - A2.3 - A1.'), ['A1', 'A2.3', 'A3P4C1', 'A2.3', 'A1']);
  const re = filerRe('giv-fran-2-3-p<n>c1-ren-<a|b>-<docka>', ['man', 'kvinna']);
  assert.ok(re.test('giv-fran-2-3-p4c1-ren-a-man.json') && !re.test('giv-fran-2-3-p4c1-ren-n-man.json') && !re.test('giv-fran-2-3-p4c1-ren-a-paow.json'));
});

test('what the route says a doll has is files that exist, at a card place of her table, opened at her table', async () => {
  const s = await schema();
  assert.deepEqual(s.fel, [], 'the catalogue and the files hold together');
  assert.deepEqual(s.dockor.map(d => d.id), [...UPPSATTNING[VALETS_FORVAL].dockor], 'the dolls are the standard table\'s');
  const dockor = new Map(s.dockor.map(d => [d.id, d]));
  const rorelser = new Set(s.rorelser.map(r => r.id));
  assert.ok(s.poster.length > 0, 'something exists');
  for (const p of s.poster) {
    const d = dockor.get(p.docka), vem = `${p.docka} ${p.rorelse} ${p.slag} ${p.plats ?? ''}`;
    assert.ok(d, `${vem}: a doll to choose`);
    assert.ok(rorelser.has(p.rorelse), `${vem}: a motion of the catalogue`);
    assert.ok(p.fil && existsSync(path.join(CASINO, p.fil)), `${vem}: ${p.fil} exists`);
    if (p.plats) assert.ok(d!.platser.some(x => x.id === p.plats), `${vem}: ${p.plats} is a card place at ${d!.bord}`);
    if (p.oppna?.startsWith('/dockan/')) {
      const q = new URLSearchParams(p.oppna.split('?')[1]);
      assert.equal(q.get('docka'), p.docka, `${vem}: opens the same doll`);
      assert.equal(q.get('uppsattning'), dockansUppsattning(p.docka), `${vem}: opens at her own table`);
      if (q.get('giv')) assert.ok(existsSync(path.join(CASINO, KALLOR.data, `${q.get('giv')}.json`)), `${vem}: giv=${q.get('giv')} is a motion`);
    }
  }
  for (const a of s.ankaren) assert.ok(existsSync(path.join(CASINO, a.fil)) && dockor.has(a.docka), `${a.docka} ${a.ankare}: the pose exists`);
  // The round: every step is a motion, and where a doll has every step lifted, Dockan plays it as one sequence of her lifts.
  for (const r of s.runda?.rorelser ?? []) assert.ok(r && rorelser.has(r), 'every step of the round is a motion');
  for (const [docka, adress] of Object.entries(s.runda?.sekvens ?? {})) if (adress) {
    const q = new URLSearchParams(adress.split('?')[1]);
    for (const del of q.get('sekvens')!.split(',')) assert.ok(existsSync(path.join(CASINO, KALLOR.data, `lyft-${docka}-${del}.json`)), `${docka}: lyft-${docka}-${del} exists`);
  }
});

test('an anchor or a motion the catalogue is given shows by itself, an unknown anchor marked', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'schema-'));
  try {
    const egen: Katalog = JSON.parse(JSON.stringify(katalog));
    for (const x of [...egen.rorelser, ...egen.ankare]) delete x.lyfta;
    egen.ankare.push({id: 'A9', namn: 'Ett nytt ankare', status: 'förslag'});
    egen.rorelser.push({id: 'NY', stadium: egen.stadier[0].id, namn: 'En ny rörelse', fran: 'A9', till: 'A7', hander: 'båda', status: 'förslag', segment: null});
    mkdirSync(path.join(dir, path.dirname(KALLOR.katalog)), {recursive: true});
    writeFileSync(path.join(dir, KALLOR.katalog), JSON.stringify(egen));
    const s = await schema(dir);
    assert.ok(s.ankare.some(a => a.id === 'A9' && !a.okand), 'the new anchor');
    assert.ok(s.ankare.some(a => a.id === 'A7' && a.okand), 'the anchor no list has, marked');
    assert.ok(s.rorelser.some(r => r.id === 'NY' && r.franAnkare === 'A9' && r.tillAnkare === 'A7'), 'the new motion between them');
    assert.ok(s.fel.some(f => f.includes('A7')), 'and said');
    assert.deepEqual(s.poster, [], 'no files, nothing exists');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
