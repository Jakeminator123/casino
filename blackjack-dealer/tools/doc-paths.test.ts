import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// A path the documents name is there (Jakob 2026-11-20, in Beslut: "dokumentation ändras utifrån vad som faktiskt
// finns"): every path in backticks or as a link in this project's .md files and in casino's skills
// (.claude/skills/*/SKILL.md) names a file or folder, read from the document's own folder, the project's folder or the
// casino repo's root. Skipped: addresses, placeholders and patterns, paths outside the repo, and what Git ignores
// (media, .runtime/, studio/out/): it lives on a machine and never in a checkout, so the answer is the same without media.

const PROJECT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CASINO = path.resolve(PROJECT, '..');

function git(cwd: string, args: string[], input?: string): string {
  const env = {...process.env};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', args, {cwd, env, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']});
}

/** The documents: tracked or new files that Git does not ignore, as absolute paths. */
function documents(): string[] {
  const list = (cwd: string, spec: string) => git(cwd, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', spec])
    .split('\0').filter(Boolean).map(f => path.join(cwd, f)).filter(f => existsSync(f));
  return [...new Set([...list(PROJECT, '*.md'), ...list(CASINO, '.claude/skills/*/SKILL.md')])];
}

/** The paths one line names: links, and in backticks what has a slash or is a .md file. */
export function mentions(line: string): string[] {
  const found = [...line.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]);
  for (const [, ref] of line.matchAll(/`([^`\s]+)`/g)) if (ref.includes('/') || /\.md$/.test(ref)) found.push(ref);
  return found
    .map(p => p.replace(/[),.;:]+$/, '').replace(/:\d+(?:[–-]\d+)?$/, '').replace(/[#?].*$/, ''))
    .filter(p => p && !/^[a-z]+:/i.test(p) && !p.startsWith('/') && !p.startsWith('-') && !/[*<>{}$|=]|\.\.\.|…/.test(p))
    .filter(p => !/^[\w-]+(?:\.[\w-]+)+\//.test(p)); // a web address without its scheme (docs.example.com/x)
}

/**
 * Where a path named in a document may lie, inside the casino repo. A path whose first folder is nowhere (`origin/main`,
 * a file in a model's weights folder) is no path in the repo and gets no places; a lone .md name is always looked for.
 */
export function placesOf(doc: string, named: string): string[] {
  const bases = [path.dirname(doc), PROJECT, CASINO];
  const parts = named.split('/'), first = parts.slice(0, parts.findIndex(s => s !== '..' && s !== '.') + 1).join('/');
  if (parts.length > 1 && !bases.some(base => existsSync(path.resolve(base, first)))) return [];
  const places = bases.map(base => path.resolve(base, named));
  return [...new Set(places)].filter(p => p === CASINO || p.startsWith(CASINO + path.sep));
}

/** Of these places, the ones Git ignores, asked both as a file and as a folder. */
function ignored(places: string[]): Set<string> {
  if (!places.length) return new Set();
  const rel = places.map(p => path.relative(CASINO, p).replace(/\\/g, '/'));
  let out = '';
  try { out = git(CASINO, ['check-ignore', '--stdin', '-z'], rel.flatMap(p => [p, `${p}/`]).join('\0') + '\0'); }
  catch (error) { const e = error as {status?: number; stdout?: string}; if (e.status !== 1) throw error; out = e.stdout ?? ''; }
  const hit = new Set(out.split('\0').filter(Boolean).map(p => p.replace(/\/$/, '')));
  return new Set(places.filter((p, i) => hit.has(rel[i])));
}

test('a path the documents name is there', () => {
  const docs = documents();
  assert.ok(docs.some(d => d.endsWith(`${path.sep}AGENTS.md`)) && docs.some(d => d.endsWith('SKILL.md')), 'the documents were found');
  const named = docs.flatMap(doc => readFileSync(doc, 'utf8').split('\n').flatMap((line, i) =>
    mentions(line).map(p => ({doc, at: i + 1, p, places: placesOf(doc, p)})))).filter(m => m.places.length);
  const skip = ignored([...new Set(named.flatMap(m => m.places).filter(p => !existsSync(p)))]);
  const dead = named.filter(m => !m.places.some(p => existsSync(p) || skip.has(p)))
    .map(m => `${path.relative(CASINO, m.doc).replace(/\\/g, '/')}:${m.at} ${m.p}`);
  assert.deepEqual(dead, [], 'a document names a path that is not there: change the document in the same change');
});

test('what counts as a path in a line, and where it is looked for', () => {
  assert.deepEqual(placesOf(path.join(PROJECT, 'README.md'), 'origin/main'), []);
  assert.ok(placesOf(path.join(PROJECT, 'README.md'), 'src/borta.ts').length > 0);
  assert.deepEqual(mentions('`src/a.ts:12` och [x](../b.md#del), `README.md` och `npm test`'), ['../b.md', 'src/a.ts', 'README.md']);
  assert.deepEqual(mentions('`assets/<id>/x.png` `data/*.json` `/scene3d.html` [y](https://x.se/a) `docs.dev.runwayml.com/guides`'), []);
});
