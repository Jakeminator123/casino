// Skyddar: hans domar och val – städningen tar bara slask äldre än sju dygn, aldrig granska/ och aldrig något utanför.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {stada, type Options} from './scratch-clean.ts';
import {stadaAll} from '../../slask/slask.ts';

// The clock is moved a month forward rather than the files back: a file's change time (ctime) cannot be set.
const DAY = 864e5, LATER = Date.now() + 30 * DAY;

function world() {
  const base = mkdtempSync(path.join(tmpdir(), 'dealer-stada-')), slask = path.join(base, 'slask', 'blackjack-dealer'), repo = path.join(base, 'blackjack-dealer');
  mkdirSync(slask, {recursive: true}); mkdirSync(repo);
  const put = (rel: string) => { const f = path.join(slask, rel); mkdirSync(path.dirname(f), {recursive: true}); writeFileSync(f, 'x'); return f; };
  const go = (argv: string[], o: Options = {}) => {
    const lines: string[] = [], code = stada(argv, {slask, repo, now: LATER, out: l => lines.push(l), err: l => lines.push(l), ...o});
    return {code, text: lines.join('\n')};
  };
  return {base, slask, repo, put, go, done: () => rmSync(base, {recursive: true, force: true})};
}

test('what has not changed for a week goes and the rest stays; --torr only lists', () => {
  const w = world();
  try {
    w.put('gammal/a/b.png'); w.put('lös.tmp'); w.put('granska/väntar-på-dom/film.mp4'); // what waits for Jakob's verdict stays
    const fresh = w.put('pågår/gammal-mapp/ny.txt'); utimesSync(fresh, LATER / 1000, LATER / 1000); // one new file keeps its whole entry
    const dry = w.go(['--torr']);
    assert.equal(dry.code, 0, dry.text);
    assert.match(dry.text, /raderas .* gammal\n.*lös\.tmp\n.*skulle radera 2 st/);
    assert.doesNotMatch(dry.text, /raderas .*(pågår|granska)/);
    assert.equal(w.go(['--dygn', '60']).code, 0);
    assert.deepEqual(readdirSync(w.slask).sort(), ['gammal', 'granska', 'lös.tmp', 'pågår']);
    const run = w.go([]);
    assert.equal(run.code, 0, run.text);
    assert.match(run.text, /raderat 2 st .* 2 st behålls\.$/);
    assert.deepEqual(readdirSync(w.slask).sort(), ['granska', 'pågår']);
    assert.ok(existsSync(fresh));
    for (const bad of [['--dygn', '0'], ['--dygn', 'x'], ['--dygn'], ['--kor']]) assert.equal(w.go(bad).code, 1, bad.join(' '));
  } finally { w.done(); }
});

test('a link is removed as a link, and what it points at is never touched', t => {
  const w = world();
  try {
    const outside = path.join(w.base, 'utanför'); mkdirSync(outside); writeFileSync(path.join(outside, 'offer.png'), 'v');
    try {
      symlinkSync(outside, path.join(w.slask, 'länk'), 'junction');
      symlinkSync(outside, path.join(path.dirname(w.put('mapp/x.txt')), 'inre'), 'junction');
    } catch { return t.skip('junctions unavailable on this machine'); }
    const run = w.go([]);
    assert.equal(run.code, 0, run.text);
    assert.deepEqual(readdirSync(w.slask), []);
    assert.deepEqual(readdirSync(outside), ['offer.png']);
  } finally { w.done(); }
});

test('a drive root, the repo, a folder around it or one inside it is refused; a missing slask is nothing to clean', () => {
  const w = world();
  try {
    for (const slask of [path.parse(w.base).root, w.repo, w.base, path.join(w.repo, 'slask')]) {
      const r = w.go(['--torr'], {slask});
      assert.equal(r.code, 1, slask); assert.match(r.text, /Vägrar/);
    }
    const none = w.go([], {slask: path.join(w.base, 'saknas')});
    assert.equal(none.code, 0); assert.match(none.text, /finns inte; inget att städa/);
  } finally { w.done(); }
});

test('the whole slask (node ../slask/slask.ts stada): every project by the same rule; granska/ and the tool beside it stay', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'casino-stada-')), root = path.join(base, 'slask');
  const put = (rel: string) => { const f = path.join(root, rel); mkdirSync(path.dirname(f), {recursive: true}); writeFileSync(f, 'x'); return f; };
  try {
    put('slask.ts'); put('lös.txt'); put('a/gammal/x.ts'); put('a/granska/väntar/film.mp4'); put('b/gammal/lapp.json'); put('b/granska/y.png');
    const fresh = put('b/pågår/ny.ts'); utimesSync(fresh, LATER / 1000, LATER / 1000);
    const lines: string[] = [], go = (argv: string[]) => stadaAll(argv, {root, casino: base, now: LATER, out: l => lines.push(l), err: l => lines.push(l)});
    assert.equal(go(['--dygn', 'x']), 1);
    assert.equal(go(['--torr']), 0, lines.join('\n'));
    assert.deepEqual(readdirSync(path.join(root, 'a')).sort(), ['gammal', 'granska']);
    assert.equal(go([]), 0, lines.join('\n'));
    assert.deepEqual(readdirSync(root).sort(), ['a', 'b', 'lös.txt', 'slask.ts']);
    assert.deepEqual(readdirSync(path.join(root, 'a')), ['granska']);
    assert.deepEqual(readdirSync(path.join(root, 'b')).sort(), ['granska', 'pågår']);
    assert.ok(existsSync(path.join(root, 'a/granska/väntar/film.mp4')) && existsSync(fresh));
  } finally { rmSync(base, {recursive: true, force: true}); }
});
