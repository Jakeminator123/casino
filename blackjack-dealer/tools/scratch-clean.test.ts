import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {stada, type Options} from './scratch-clean.ts';

// The clock is moved a month forward rather than the files back: a file's change time (ctime) cannot be set.
const DAY = 864e5, LATER = Date.now() + 30 * DAY;

function world() {
  const base = mkdtempSync(path.join(tmpdir(), 'dealer-stada-')), slask = path.join(base, 'slask', 'dealer'), repo = path.join(base, 'dealer');
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
    w.put('gammal/a/b.png'); w.put('lös.tmp');
    const fresh = w.put('pågår/gammal-mapp/ny.txt'); utimesSync(fresh, LATER / 1000, LATER / 1000); // one new file keeps its whole entry
    const dry = w.go(['--torr']);
    assert.equal(dry.code, 0, dry.text);
    assert.match(dry.text, /raderas .* gammal\n.*lös\.tmp\n.*skulle radera 2 st/);
    assert.doesNotMatch(dry.text, /raderas .*pågår/);
    assert.equal(w.go(['--dygn', '60']).code, 0);
    assert.deepEqual(readdirSync(w.slask).sort(), ['gammal', 'lös.tmp', 'pågår']);
    const run = w.go([]);
    assert.equal(run.code, 0, run.text);
    assert.match(run.text, /raderat 2 st .* 1 st behålls\.$/);
    assert.deepEqual(readdirSync(w.slask), ['pågår']);
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
