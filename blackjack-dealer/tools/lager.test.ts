// Skyddar: publiceringsskyddet och hans data – kartan över allt som lagras (../../lager.ts) har varje mapp som .gitignore
// håller tillbaka som media eller producerat, så att en ny mapp inte kan komma till utan att synas; och raderingen på hans
// klick (tools/lager-remove.ts) håller sina spärrar: det spelet spelar, det som har en roll och det som väntar på hans dom
// kräver hans andra klick, ett kort i Beslut vägrar, hans anteckningar, kortplanen, hans val och livebordets film erbjuds
// aldrig, ingen sökväg går utanför kartan, och live-bj:s film lämnas aldrig ut. Raderat är borta från disken, ingen korg.
// Behöver ingen media: "filmerna" är några byte text i en tillfällig mapp.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {CASINO, PLATSER, UTANFOR, osakerSokvag, platsFor, visasInte} from '../../lager.ts';
import {fraga, radera} from './lager-remove.ts';

test('every folder .gitignore holds back as media or produced is in the map, or said why not', () => {
  const lines = readFileSync(path.join(CASINO, '.gitignore'), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => /^\/\S+(?:\/|\/\*)$/.test(l));
  assert.ok(lines.length >= 12, 'the root .gitignore is read');
  const known = new Set([...PLATSER.map(p => p.ignore), ...UTANFOR.map(u => u.ignore)]);
  const missing = lines.filter(l => !known.has(l));
  assert.deepEqual(missing, [], `lager.ts PLATSER (or UTANFOR, with the reason) lacks: ${missing.join(', ')}`);
  for (const p of PLATSER) {
    assert.ok(!p.mapp.includes('..') && !path.isAbsolute(p.mapp) && !/^[A-Za-z]:/.test(p.mapp), `${p.id}: from the repo's root, no machine's path`);
    assert.ok(p.radera === 'aldrig' ? !!p.aldrig : !p.git, `${p.id}: what Git has is never offered, and "never" says why`);
  }
  for (const p of PLATSER.filter(p => p.mapp.startsWith('live-bj/'))) assert.equal(p.visas, 'aldrig', `${p.id}: film of real dealers is never shown`);
});

test('no path leaves the map, and live-bj\'s film and his photo are never handed out', () => {
  for (const bad of ['../x', 'blackjack-dealer/assets/../data/proof-notes.json', 'blackjack-dealer\\assets\\x', '/etc/passwd', 'C:/x', 'slask/./x', 'a//b', ''])
    assert.ok(osakerSokvag(bad), bad);
  assert.equal(platsFor('blackjack-dealer/data/proof-notes.json'), null, 'his notes are not in the map');
  assert.equal(platsFor('blackjack-dealer/placements/default.json'), null, 'the card plan is not in the map');
  assert.equal(platsFor('blackjack-dealer/data/scene-presets/casino.json'), null, 'his saved looks are not in the map');
  assert.equal(platsFor('slask/blackjack-dealer/granska/x/a.mp4')?.plats.id, 'vantar', 'the most precise place first');
  assert.equal(platsFor('blackjack-dealer/.runtime/papperskorg/2026-11-25')?.plats.id, 'papperskorgen');
  for (const p of ['live-bj/video/film.mp4', 'live-bj/rutor/r-0001.png', 'live-bj/matt/x.png', 'blackjack-dealer/private/referenser/jakob.jpg', 'avatar-auto-pipeline/input/tomasz/1-portratt.jpg', 'blackjack-dealer/assets/tracking/x/a.png', 'blackjack-dealer/.env.png'])
    assert.ok(visasInte(p), `${p} is never shown`);
  for (const p of ['avatar-auto-pipeline/assets/docka/standarddocka_man.glb', 'standarddocka/klipp/a.mp4', 'blackjack-dealer/assets/proofs/x/a.png'])
    assert.equal(visasInte(p), null, `${p} is shown as a miniature`);
});

test('his click: the guarded asks for a second click, a card in Beslut refuses, his data is never offered; what goes is gone from the disk', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lager-')), old = Date.now() - 10 * 86_400_000;
  const put = (rel: string, text: string) => { const abs = path.join(root, rel); mkdirSync(path.dirname(abs), {recursive: true}); writeFileSync(abs, text); utimesSync(abs, old / 1000, old / 1000); return rel; };
  const there = (rel: string) => existsSync(path.join(root, rel));
  try {
    const bj = 'blackjack-dealer';
    for (const d of ['src', 'data/orders', 'placements']) mkdirSync(path.join(root, bj, d), {recursive: true});
    put(`${bj}/data/clip-jobs.json`, '{}');
    // The game's code loads a room: the bank says the game plays it.
    put(`${bj}/src/game-rum.ts`, "export const ROOM = 'assets/scene/rooms/hall.jpg';\n");
    const room = put(`${bj}/assets/scene/rooms/hall.jpg`, 'a room');
    // An anchor with a role in Material.
    const anchor = put(`${bj}/assets/anchors/vila-a/anchor.png`, 'an anchor');
    put(`${bj}/data/media-roles.json`, JSON.stringify({schemaVersion: 1, dealers: {paow: {entries: [{id: 'vila-a', role: 'ankare-1', state: 'gäller', path: 'assets/anchors/vila-a/anchor.png'}]}}}, null, 2));
    // Two proofs: one a card in Beslut asks about, one he judged Inte bra with its originals waiting in the slask.
    put(`${bj}/assets/proofs/med-kort/a.png`, 'a still'); put(`${bj}/assets/proofs/med-kort/proof.json`, '{"title":"Med kort"}');
    put(`${bj}/assets/proofs/gammalt-prov/b.mp4`, 'a paid film'); put(`${bj}/assets/proofs/gammalt-prov/proof.json`, '{"title":"Gammalt"}');
    const waiting = put('slask/blackjack-dealer/granska/gammalt-prov/c.mp4', 'waiting in the slask');
    put(`${bj}/data/decisions.json`, JSON.stringify({schemaVersion: 1, decisions: [{id: 'k', proof: 'med-kort', question: 'Bra?'}]}));
    const notes = put(`${bj}/data/proof-notes.json`, JSON.stringify({schemaVersion: 1, notes: [{id: 1, proof: 'gammalt-prov', file: 'b.mp4', choice: 'inte-bra', text: 'Nej'}]}));
    const notesText = readFileSync(path.join(root, notes), 'utf8');
    // A doll the ways point at, a check picture, live-bj's film, his card plan and his saved look.
    const doll = [put('avatar-auto-pipeline/assets/docka/standarddocka_x.glb', 'a doll'), put('avatar-auto-pipeline/assets/docka/standarddocka_x.blend', 'its source')];
    put('avatar-auto-pipeline/vagar.json', '{\n "prov": [\n  {\n   "id": "x",\n   "var": ["../blackjack-dealer/assets/proofs/gammalt-prov/", "assets/docka/standarddocka_x.glb"],\n   "sa": "standarddocka_x i ord"\n  }\n ]\n}\n');
    const check = put('avatar-auto-pipeline/qc/bord_topp.png', 'a check picture');
    const film = put('live-bj/video/livebordet.mp4', 'a real dealer');
    const plan = put(`${bj}/placements/default.json`, '{"his": "plan"}'), look = put(`${bj}/data/scene-presets/casino.json`, '{}'), ledger = put(`${bj}/.runtime/runway-api/liggare.jsonl`, '{}');
    const lock = put('slask/blackjack-dealer/gpu-och-headless.lock', 'en körning');

    // Never offered: his card plan, his saved look, the ledgers, live-bj's film, a run's lock; no path out of the map.
    for (const id of [plan, look, film, lock, `${bj}/.runtime/runway-api`, 'avatar-auto-pipeline/qc/../../blackjack-dealer/data', `${bj}/data/proof-notes.json`]) {
      const r = await radera(root, id, {andra: true});
      assert.ok(r.vagrat && !r.raderat.length, `${id} is refused`);
    }
    assert.equal((await fraga(root, film)).niva, 'aldrig');
    for (const p of [plan, look, film, ledger, lock]) assert.ok(there(p), `${p} stays`);

    // What the game plays asks for his second click, and goes with it.
    const playing = await fraga(root, `${bj}/assets/scene/rooms/hall.jpg`);
    assert.equal(playing.niva, 'skyddad'); assert.match(playing.orsaker.map(o => o.text).join(' '), /Spelet laddar den/);
    assert.match((await radera(root, room)).vagrat ?? '', /andra klick/); assert.ok(there(room));
    assert.equal((await radera(root, room, {andra: true})).vagrat, null); assert.ok(!there(room));

    // A role in Material: two clicks, and the role leaves the register in the same step.
    const role = await fraga(root, `${bj}/assets/anchors/vila-a`);
    assert.equal(role.niva, 'skyddad'); assert.match(role.orsaker.map(o => o.text).join(' '), /Har rollen ankare 1 i Material/);
    assert.equal((await radera(root, `${bj}/assets/anchors/vila-a`, {andra: true})).vagrat, null);
    assert.ok(!there(anchor)); assert.deepEqual(JSON.parse(readFileSync(path.join(root, bj, 'data/media-roles.json'), 'utf8')).dealers.paow.entries, []);

    // A card in Beslut refuses even after two clicks.
    const card = await radera(root, `${bj}/assets/proofs/med-kort`, {andra: true});
    assert.match(card.vagrat ?? '', /Beslut/); assert.ok(there(`${bj}/assets/proofs/med-kort/a.png`));

    // A proof he judged Inte bra whose originals wait in the slask: two clicks; both go; his notes stay; no trash anywhere.
    const proof = await fraga(root, `${bj}/assets/proofs/gammalt-prov`);
    assert.equal(proof.niva, 'skyddad'); assert.match(proof.orsaker.map(o => o.text).join(' '), /original som väntar på din dom/);
    const gone = await radera(root, `${bj}/assets/proofs/gammalt-prov`, {andra: true});
    assert.deepEqual([gone.vagrat, gone.raderat], [null, [`${bj}/assets/proofs/gammalt-prov`, 'slask/blackjack-dealer/granska/gammalt-prov']]);
    assert.ok(!there(`${bj}/assets/proofs/gammalt-prov`) && !there(waiting));
    assert.equal(readFileSync(path.join(root, notes), 'utf8'), notesText, 'his notes are never touched');
    assert.ok(!existsSync(path.join(root, bj, '.runtime/papperskorg')), 'no trash: gone from the disk');

    // A doll: its files go together, and the ways stop pointing at it (the rest of the file stays as it was).
    const dollAsk = await fraga(root, 'avatar-auto-pipeline/assets/docka/standarddocka_x');
    assert.ok(dollAsk.rattas.some(t => /vägar/.test(t)));
    assert.equal((await radera(root, 'avatar-auto-pipeline/assets/docka/standarddocka_x', {andra: true})).vagrat, null);
    for (const d of doll) assert.ok(!there(d));
    const ways = readFileSync(path.join(root, 'avatar-auto-pipeline/vagar.json'), 'utf8');
    assert.match(ways, /"var": \[\],/); assert.match(ways, /"sa": "standarddocka_x i ord"/);

    // What can be made again for free goes with one click.
    const free = await fraga(root, check);
    assert.equal(free.niva, 'fri');
    assert.equal((await radera(root, check)).vagrat, null); assert.ok(!there(check));
    assert.ok(readdirSync(path.join(root, bj, '.runtime/cleanup')).length >= 1, 'a receipt says what went');
  } finally { rmSync(root, {recursive: true, force: true}); }
});
