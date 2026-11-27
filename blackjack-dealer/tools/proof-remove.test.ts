// Skyddar: hans domar – "Ta bort provet" i Prov tar provets mapp och dess filmer i slasken till papperskorgen på hans klick,
// rör aldrig hans anteckningar, och tar inget som ett kort i Beslut fortfarande pekar på.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {removeProof} from './proof-remove.ts';

test('a proof goes to the trash with its folder in the slask; his notes stay; a card in Beslut keeps it', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'proof-remove-')), repo = path.join(root, 'blackjack-dealer'), slask = path.join(root, 'slask');
  const put = (abs: string, text: string) => { mkdirSync(path.dirname(abs), {recursive: true}); writeFileSync(abs, text); };
  try {
    put(path.join(repo, 'assets/proofs/gammalt-prov/a.mp4'), 'a paid film');
    put(path.join(repo, 'assets/proofs/gammalt-prov/proof.json'), '{"title":"Gammalt"}');
    put(path.join(repo, 'assets/proofs/med-kort/b.png'), 'a still');
    put(path.join(slask, 'blackjack-dealer/granska/gammalt-prov/c.mp4'), 'waiting in the slask');
    const notes = JSON.stringify({schemaVersion: 1, notes: [{n: 1, proof: 'gammalt-prov', file: 'a.mp4', choice: 'bra', text: 'Bra'}]});
    put(path.join(repo, 'data/proof-notes.json'), notes);
    put(path.join(repo, 'data/decisions.json'), JSON.stringify({schemaVersion: 1, decisions: [{id: 'kort', proof: 'med-kort', question: 'Bra?'}]}));
    mkdirSync(path.join(repo, '.runtime'), {recursive: true});

    await assert.rejects(removeProof(repo, '../data'), /Inget prov/);
    const kept = await removeProof(repo, 'med-kort', {slask});
    assert.match(kept.refused ?? '', /Beslut/);
    assert.ok(existsSync(path.join(repo, 'assets/proofs/med-kort/b.png')), 'a card in Beslut keeps the proof');

    const gone = await removeProof(repo, 'gammalt-prov', {slask});
    assert.deepEqual([gone.refused, gone.removed], [null, ['assets/proofs/gammalt-prov', 'slask/blackjack-dealer/granska/gammalt-prov']]);
    assert.ok(!existsSync(path.join(repo, 'assets/proofs/gammalt-prov')) && !existsSync(path.join(slask, 'blackjack-dealer/granska/gammalt-prov')));
    const day = path.join(repo, '.runtime/papperskorg', new Date().toISOString().slice(0, 10));
    assert.equal(readFileSync(path.join(day, 'assets/proofs/gammalt-prov/a.mp4'), 'utf8'), 'a paid film', 'in the trash, not gone');
    assert.equal(readFileSync(path.join(day, 'slask/blackjack-dealer/granska/gammalt-prov/c.mp4'), 'utf8'), 'waiting in the slask');
    assert.equal(readFileSync(path.join(repo, 'data/proof-notes.json'), 'utf8'), notes, 'his notes are never touched');
    await assert.rejects(removeProof(repo, 'gammalt-prov', {slask}), /finns inte/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
