// Skyddar: hans domar och val – det han godkänt och det spelet har raderas aldrig av sig självt, bara på hans ord; original aldrig; bara via papperskorgen eller ett arkiv.
// The thinning tool's hard parts (tools/media-thin.ts): the guard that nothing gets past, the rule of what goes without more
// words, and the execution against a temporary folder (moved to a trash with RADERAD.txt and a receipt, linked, refused
// when guarded, young or changed, the trash emptied after 14 days). Needs no media: the "films" are a few bytes of text.
// Run: node --test tools/media-thin.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DAY, MARKER, blocked, carryOut, deliveryGroup, emptyShield, emptyTrash, factOf, finishedOrder, guardKeys, levelOf, orderOpen, protect, rejectedGroup, removeOnWord, type Action, type GroupPlan, type Plan} from './media-thin.ts';
import {unitOf} from './media-audit.ts';
import {motionRegister} from './register-store.ts';

const OLD = Date.now() - 10 * DAY;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
function sandbox() {
  const root = mkdtempSync(path.join(tmpdir(), 'media-thin-')), repo = path.join(root, 'repo');
  const put = (rel: string, text: string, when = OLD) => { const abs = path.join(repo, rel); mkdirSync(path.dirname(abs), {recursive: true}); writeFileSync(abs, text); utimesSync(abs, when / 1000, when / 1000); return rel; };
  const row = (rel: string, action: Action['action'] = 'flytta', extra: Partial<Action> = {}): Action => ({...factOf(path.join(repo, rel), rel), action, ...extra});
  return {root, repo, put, row, done: () => rmSync(root, {recursive: true, force: true})};
}
const planOf = (groups: Partial<GroupPlan>[]): Plan => ({schemaVersion: 1, about: '', made: new Date().toISOString(), trash: '', skipped: [], notes: [],
  assets: {mb: 0, files: 0, byTop: {}}, blob: {listed: 0, local: 0, mb: 0, byGroup: {}, missing: 0, changed: 0, young: 0, source: null},
  groups: groups.map(g => ({name: 'g', level: 'säkert', title: '', rule: '', units: [], count: 0, mb: 0, mbFreed: 0, examples: [], ...g}) as GroupPlan)});

test('the guard: kept collections, V6, originals, references, outside assets/, young files and guarded names never pass', () => {
  const now = Date.now(), s = emptyShield(now), fact = (p: string, mtimeMs = OLD, key = `1:${p}`) => ({path: p, mtimeMs, key});
  for (const p of ['assets/noir/v4.mp4', 'assets/films/intro/intro.mp4', 'assets/v6/frame.png', 'assets/reference/v6.mp4', 'assets/originals/a.mp4',
    'private/recovery/x.mp4', 'output/v6/a.png', 'assets/../private/x.mp4', 'assets/motions/../../x.mp4', 'data/motions.jsonl']) assert.ok(blocked(fact(p), s), p);
  assert.match(blocked(fact('assets/motions/old-01/source.mp4', now - DAY), s) ?? '', /tre dygn/);
  assert.equal(blocked(fact('assets/motions/old-01/source.mp4'), s), null);
  protect(s, 'assets/motions/good-01', 'spelet har good-01', unitOf);
  protect(s, 'assets/anchors/a1/anchor.png', 'roll i Material', unitOf);
  protect(s, 'assets/motions', 'a register naming the whole top folder', unitOf);   // too wide: guards nothing
  protect(s, 'assets/speech/paow', 'a register naming a dealer', unitOf);          // too wide as well
  assert.match(blocked(fact('assets/motions/good-01/source.mp4'), s) ?? '', /spelet har/);
  assert.match(blocked(fact('assets/anchors/a1/anchor.png'), s) ?? '', /Material/);
  assert.equal(blocked(fact('assets/anchors/a1/other.png'), s), null);
  assert.equal(blocked(fact('assets/motions/bad-01/source.mp4'), s), null);
  assert.equal(blocked(fact('assets/speech/paow/paow-tal-x-sv-01/source.mp4'), s), null);
  // A name that shares its file with a guarded one is guarded: noir's films are hard links elsewhere.
  guardKeys(s, [{path: 'assets/noir/v4.mp4', key: '7:42'}, {path: 'assets/motions/bad-01/source.mp4', key: '7:43'}]);
  assert.match(blocked(fact('assets/proofs/trailer/v4.mp4', OLD, '7:42'), s) ?? '', /samma fil som assets\/noir\/v4\.mp4/);
  assert.equal(blocked(fact('assets/proofs/other/b.mp4', OLD, '7:43'), s), null);
});

test('the rule (Jakob 2026-11-25): a film he, or a reviewer on his mandate, rejected goes; an open order keeps what it names', () => {
  const his = {verdict: 'underkand', byJakob: true, provisional: false, detail: null};
  const forHim = {verdict: 'underkand', byJakob: false, provisional: true, detail: null};
  const reviewer = {verdict: 'underkand', byJakob: false, provisional: false, detail: null};
  assert.equal(rejectedGroup([his]), 'underkand');
  assert.equal(rejectedGroup([forHim, his]), 'underkand', 'judged for him on his mandate counts as his');
  assert.equal(rejectedGroup([his, reviewer]), 'underkand-granskare', 'a reviewer without his mandate: its own group, by the rule');
  // His Sekundär (played when nothing better exists) is his choice to keep a take, not a rejection: it never goes by itself
  // when the server starts (--auto carries out säkert), and neither does Runway's delivery to it.
  const secondary = {...his, detail: 'sekundär'};
  for (const judges of [[secondary], [his, secondary], [secondary, reviewer]]) {
    const g = rejectedGroup(judges);
    assert.equal(g, 'sekundar');
    assert.equal(levelOf(g!), 'förslag', 'only on his word');
    assert.equal(levelOf(deliveryGroup(g!)), 'förslag', 'its delivery stays with it');
  }
  for (const g of ['underkand', 'underkand-granskare']) assert.equal(levelOf(g), 'säkert');
  for (const kept of ['godkand', 'primar', 'variant', 'vantar']) assert.equal(rejectedGroup([his, {...his, verdict: kept}]), null, `a take ${kept} keeps the film`);
  assert.equal(rejectedGroup([his, null]), null, 'a take without a verdict waits for him');
  assert.equal(rejectedGroup([]), null);
  // An agent's task: a draft, an approved order not yet placed, a take on its way. A finished or set-aside order is not.
  assert.ok(orderOpen('UTKAST', false, []) && orderOpen('GODKÄND', false, []) && orderOpen('GODKÄND', true, ['INFÖRD', 'HÄMTAD']));
  assert.ok(!orderOpen('GODKÄND', true, ['INFÖRD', 'MISSLYCKAD']) && !orderOpen('AVBRUTEN', false, []));
  const open = new Set(['revansch-01']);
  assert.equal(finishedOrder('data/orders/revansch-01.json', open), false, 'the open rework keeps the film');
  assert.equal(finishedOrder('data/orders/klar-01.json', open), true, 'a finished order that named it does not');
  assert.equal(finishedOrder('data/clip-jobs.json#x', open), false, 'another register still holds it');
});

test('carrying out: moved to the trash after both SHA-256 agree, RADERAD.txt written, the film\'s posts out of the register, guarded, young and changed units left whole', async () => {
  const t = sandbox();
  try {
    const film = t.put('assets/motions/bad-01/source.mp4', 'a rejected take'), twin = 'assets/orders/o1/take-1/after.mp4';
    mkdirSync(path.join(t.repo, path.dirname(twin)), {recursive: true}); linkSync(path.join(t.repo, film), path.join(t.repo, twin));
    t.put('assets/motions/bad-01/generation.json', '{}');
    const noir = t.put('assets/noir/v4.mp4', 'the trailer'), shared = 'assets/proofs/trailer/v4.mp4';
    mkdirSync(path.join(t.repo, path.dirname(shared)), {recursive: true}); linkSync(path.join(t.repo, noir), path.join(t.repo, shared));
    const young = t.put('assets/motions/new-01/source.mp4', 'made today', Date.now());
    const kept = t.put('assets/motions/good-01/source.mp4', 'his yes');
    const changed = t.put('assets/proofs/p9/a.png', 'before'), secret = t.put('private/recovery/x.mp4', 'never');
    const units = [
      {id: 'bad-01', reason: 'Inte bra', marker: 'assets/motions/bad-01', files: [t.row(film), t.row(twin)]},
      {id: 'trailer', reason: 'test', marker: 'assets/proofs/trailer', files: [t.row(shared)]},
      {id: 'new-01', reason: 'test', marker: null, files: [t.row(young)]},
      {id: 'good-01', reason: 'test', marker: null, files: [t.row(kept)]},
      {id: 'p9', reason: 'test', marker: null, files: [t.row(changed)]},
      {id: 'private', reason: 'test', marker: null, files: [t.row(secret)]},
    ];
    writeFileSync(path.join(t.repo, changed), 'after, and longer');
    // The register: the film that goes has its own post and a take cut from it with his verdict; the kept film has a post too.
    const register = motionRegister(t.repo), post = (id: string, clip: string, review?: unknown) => ({id, dealer: 'paow', source: {path: `assets/motions/${clip}/source.mp4`}, ...(review ? {review} : {})});
    register.putAll([post('bad-01', 'bad-01'), post('bad-01-deal', 'bad-01', {decision: 'REJECTED', userAccepted: false, userReview: 'Jakob 2026-11-20: Inte bra.'}), post('good-01', 'good-01')]);
    const shield = emptyShield();
    protect(shield, 'assets/motions/good-01', 'spelet har good-01', unitOf);
    guardKeys(shield, [factOf(path.join(t.repo, noir), noir)]);
    const trash = path.join(t.root, 'scratch', 'papperskorg'); mkdirSync(path.dirname(trash), {recursive: true});
    const {receipt, result} = await carryOut(planOf([{name: 'g', units}]), ['g'], {repo: t.repo, trash, shield, receiptDir: path.join(t.repo, '.runtime/cleanup')});

    assert.deepEqual(result.done.map(d => d.path), [film, twin]);
    assert.ok(!existsSync(path.join(t.repo, film)) && !existsSync(path.join(t.repo, twin)));
    const day = new Date().toISOString().slice(0, 10), inBin = path.join(trash, day, film);
    assert.equal(readFileSync(inBin, 'utf8'), 'a rejected take');
    assert.equal(result.done[0].sha256, sha('a rejected take'));
    assert.equal(statSync(path.join(trash, day, twin)).ino, statSync(inBin).ino, 'one file with two names is copied once');
    assert.match(readFileSync(path.join(t.repo, 'assets/motions/bad-01', MARKER), 'utf8'), /Inte bra[\s\S]*source\.mp4/);
    assert.ok(existsSync(path.join(t.repo, 'assets/motions/bad-01/generation.json')), 'what the plan does not name stays');
    for (const p of [noir, shared, young, kept, changed, secret]) assert.ok(existsSync(path.join(t.repo, p)), `${p} stays`);
    assert.deepEqual(result.skipped.map(s => s.unit), ['trailer', 'new-01', 'good-01', 'p9', 'private']);
    assert.match(result.skipped[0].reason, /samma fil som assets\/noir/);
    assert.match(result.skipped[1].reason, /tre dygn/);
    assert.match(result.skipped[2].reason, /spelet har/);
    assert.match(result.skipped[3].reason, /ändrats/);
    assert.match(result.skipped[4].reason, /utanför assets/);
    const saved = JSON.parse(readFileSync(receipt, 'utf8'));
    assert.equal(saved.done.length, 2); assert.equal(saved.error, null);
    // The film is gone, so its posts left the register with it; his verdict is kept as one row, and the kept film's post stands.
    assert.deepEqual(saved.posts, ['bad-01', 'bad-01-deal']);
    assert.deepEqual(register.ids(), ['good-01']);
    assert.deepEqual(register.removed().map(r => [r.id, r.decision, r.note]), [['bad-01-deal', 'REJECTED', 'Inte bra.']]);
    assert.match(readFileSync(path.join(t.repo, 'assets/motions/bad-01', MARKER), 'utf8'), /borttagna ur registret: bad-01, bad-01-deal/);
  } finally { t.done(); }
});

test('linking: identical bytes become one file with both names, with no trash needed; a move without a trash is refused', async () => {
  const t = sandbox();
  try {
    const keep = t.put('assets/proofs/p1/a.png', 'same bytes'), copy = t.put('assets/proofs/p2/a.png', 'same bytes');
    const units = [{id: copy, reason: `samma bytes som ${keep}`, marker: null, files: [t.row(copy, 'länka', {to: keep, sha256: sha('same bytes')})]}];
    const nowhere = path.join(t.root, 'no-disk', 'papperskorg');
    const {result} = await carryOut(planOf([{name: 'dubbletter', units}]), ['dubbletter'], {repo: t.repo, trash: nowhere, shield: emptyShield(), receiptDir: path.join(t.repo, '.runtime/cleanup')});
    assert.equal(result.done.length, 1);
    const a = statSync(path.join(t.repo, keep), {bigint: true}), b = statSync(path.join(t.repo, copy), {bigint: true});
    assert.equal(a.ino, b.ino); assert.equal(a.nlink, 2n);
    assert.equal(readFileSync(path.join(t.repo, copy), 'utf8'), 'same bytes');
    assert.ok(!readdirSync(path.join(t.repo, 'assets/proofs/p2')).some(n => n.endsWith('.gallra-lank')));
    const other = t.put('assets/proofs/p3/b.png', 'moved');
    await assert.rejects(carryOut(planOf([{name: 'g', units: [{id: 'p3', reason: '', marker: null, files: [t.row(other)]}]}]), ['g'], {repo: t.repo, trash: nowhere, shield: emptyShield(), receiptDir: path.join(t.repo, '.runtime/cleanup')}), /Korgen saknas/);
    assert.ok(existsSync(path.join(t.repo, other)));
  } finally { t.done(); }
});

test('on his word: a film the game plays goes with its posts, to an archive outside or the trash; a pointer, noir and references stay', async () => {
  const t = sandbox();
  try {
    // Made today and played with his Primär: the automatic thinning keeps both (the guard above); his word takes it.
    const film = t.put('assets/motions/played-01/source.mp4', 'his primary', Date.now()), track = t.put('assets/tracking/played-01/track.json', '{}');
    const anchor = t.put('assets/anchors/a1/anchor.png', 'an anchor'), still = t.put('assets/lab/native.jpg', 'a still'), named = t.put('assets/motions/named-01/source.mp4', 'a role names it');
    const noir = t.put('assets/noir/v4.mp4', 'the trailer');
    // A role points at named-01 by its path; another's note that names played-01 is its history, not a pointer.
    t.put('data/media-roles.json', JSON.stringify({dealers: {paow: {entries: [{id: 'n', role: 'film', path: named}, {id: 'm', role: 'film', path: 'assets/motions/x/source.mp4', note: 'made from played-01'}]}}}));
    const register = motionRegister(t.repo), post = (id: string, clip: string, review?: unknown) => ({id, dealer: 'paow', source: {path: `assets/motions/${clip}/source.mp4`}, ...(review ? {review} : {})});
    register.putAll([post('played-01', 'played-01'), post('played-01-deal', 'played-01', {decision: 'ACCEPTED', acceptedAs: 'MAIN', userAccepted: true, userReview: 'Jakob 2026-11-20: Bra.'}), post('named-01', 'named-01')]);
    const archive = path.join(t.root, 'arkiv'), trash = path.join(t.repo, '.runtime/papperskorg'), receiptDir = path.join(t.repo, '.runtime/cleanup'), why = 'Jakob 2026-11-26: radera dem';
    mkdirSync(path.dirname(trash), {recursive: true});
    await assert.rejects(removeOnWord(['played-01'], {repo: t.repo, why, trash, receiptDir, archive: path.join(t.repo, 'arkiv')}), /utanför utcheckningen/);
    await assert.rejects(removeOnWord(['played-01'], {repo: t.repo, why: ' ', trash, receiptDir, archive}), /varför/);
    const {result} = await removeOnWord(['played-01-deal', 'named-01', 'assets/anchors/a1', 'assets/lab/native.jpg', 'assets/noir'], {repo: t.repo, why, trash, receiptDir, archive});

    assert.deepEqual(result.posts, ['played-01', 'played-01-deal'], 'a take names its film: the film and all its posts go');
    assert.deepEqual(register.removed().map(r => [r.id, r.acceptedAs, r.note, r.why]), [['played-01-deal', 'MAIN', 'Bra.', why]]);
    assert.equal(readFileSync(path.join(archive, 'filmer/played-01.mp4'), 'utf8'), 'his primary');
    assert.equal(readFileSync(path.join(archive, 'kortspår/played-01/track.json'), 'utf8'), '{}');
    assert.equal(readFileSync(path.join(archive, 'ankare/a1.png'), 'utf8'), 'an anchor');
    assert.equal(readFileSync(path.join(archive, 'lab/native.jpg'), 'utf8'), 'a still', 'one file named alone keeps its name');
    assert.equal(result.done.find(d => d.path === film)?.sha256, sha('his primary'));
    for (const p of [film, track, anchor, still]) assert.ok(!existsSync(path.join(t.repo, p)), `${p} is gone from the checkout`);
    for (const d of ['assets/motions/played-01', 'assets/tracking/played-01', 'assets/anchors/a1']) assert.ok(!existsSync(path.join(t.repo, d)), `${d} is not left empty`);
    assert.ok(!existsSync(trash), 'with an archive nothing goes to the trash');
    // A role still names the film: it stays with its post until the pointer is gone; noir stays even on his word.
    assert.deepEqual(result.refused.map(r => r.unit), ['named-01', 'assets/noir']);
    assert.match(result.refused[0].reason, /media-roles\.json pekar/); assert.match(result.refused[1].reason, /bevarad samling/);
    assert.ok(existsSync(path.join(t.repo, named)) && existsSync(path.join(t.repo, noir)) && register.has('named-01'));
    // The pointer gone, the film goes; without an archive to the trash.
    t.put('data/media-roles.json', JSON.stringify({dealers: {paow: {entries: []}}}));
    const second = await removeOnWord(['named-01'], {repo: t.repo, why, trash, receiptDir});
    assert.deepEqual([second.result.posts, second.result.refused], [['named-01'], []]);
    assert.equal(readFileSync(path.join(trash, new Date().toISOString().slice(0, 10), named), 'utf8'), 'a role names it');
    assert.deepEqual(register.ids(), []);
  } finally { t.done(); }
});

test('the trash keeps 14 days', () => {
  const t = sandbox();
  try {
    const trash = path.join(t.root, 'papperskorg');
    for (const d of ['2026-11-01', '2026-11-07', '2026-11-08', '2026-11-20']) { mkdirSync(path.join(trash, d, 'assets'), {recursive: true}); writeFileSync(path.join(trash, d, 'assets', 'x.mp4'), 'x'); }
    writeFileSync(path.join(trash, 'LASMIG.txt'), 'not a day');
    const r = emptyTrash(trash, Date.parse('2026-11-21T12:00:00Z'));
    assert.deepEqual(r.removed.sort(), ['2026-11-01', '2026-11-07']);
    assert.deepEqual(readdirSync(trash).sort(), ['2026-11-08', '2026-11-20', 'LASMIG.txt']);
  } finally { t.done(); }
});
