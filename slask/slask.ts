// The slask: every project's temporary work (AGENTS.md, "Tillfälligt och producerat"), with its register and its cleaner. Of this folder Git
// keeps only this file (.gitignore), and search sees only this file (.ignore).
//
// The register is built bottom up each time it is asked for. Each task folder, slask/<project>/<task>/, and each folder
// that waits for Jakob's verdict, slask/<project>/granska/<name>/, carries its own note, lapp.json: what it is, which chat
// or tool owns it, when, and when it may go. The register is counted from the folders and their notes and kept nowhere,
// so it cannot go stale; --json gives a tool the same list. (A database would add nothing for a few dozen folders.)
//
//   node slask/slask.ts                            the register: per project and folder its size, files, last change,
//                                                  note, and when the three-hour rule takes it
//   node slask/slask.ts --json                     the same, for a tool
//   node slask/slask.ts lapp <project>/<folder> <owner> "<what>" ["<when it may go>"]
//                                                  writes the folder's note and makes the folder; <folder> may be
//                                                  granska/<name>, and the owner is a chat's name in inbox/ or a tool
//   node slask/slask.ts stada [--torr] [--timmar N]  the three-hour rule in every project; --torr lists and deletes nothing
//
// The three-hour rule (Jakob 2026-11-26: "Slasken ska raderas var 3 timme om arbete inte används"): an entry at the top of
// a project's folder whose newest file is older than N hours (3) is deleted, whole;
// granska/ never, however old, and nothing that lies beside this file. A file counts from the later of its last write and
// its last change, so one copied or moved in with an old write time counts from when it arrived. Links and junctions are
// never followed: one is judged by its own date and removed as a link, whatever it points at. blackjack-dealer's
// npm run stada (tools/scratch-clean.ts) is this rule on its own part of the slask, or on
// the folder DEALER_SLASK names; its server runs the rule at start and every third hour while it is up (tools/preview.ts:
// on every project, or on that folder). The register sees only this folder. Tested in blackjack-dealer/tools/scratch-clean.test.ts.
import {existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF), CASINO = path.resolve(HERE, '..');
const HOUR = 36e5, UNUSED = 3, WAITING = 'granska', NOTE = 'lapp.json';
const NAME = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

const inside = (child: string, parent: string) => { const r = path.relative(parent, child); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
const size = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.ceil(bytes / 1e3)} kB`).replace('.', ',');
const stamp = (ms: number) => new Date(ms).toLocaleString('sv-SE', {dateStyle: 'short', timeStyle: 'short'});
const day = (ms: number) => new Date(ms).toLocaleDateString('sv-SE');
const oneLine = (text: unknown, max: number) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// ── The three-hour rule ───────────────────────────────────────────────────────────

export type Measure = {newest: number; bytes: number; files: number; types: Record<string, number>};

/** The newest change, bytes, files and file types of an entry, with lstat only: a link counts as itself and is never
 *  entered. A folder's note is not one of its files, but it is a change. */
export function measure(p: string, m: Measure = {newest: 0, bytes: 0, files: 0, types: {}}): Measure {
  const st = lstatSync(p);
  m.newest = Math.max(m.newest, st.mtimeMs, st.ctimeMs);
  if (st.isDirectory() && !st.isSymbolicLink()) { for (const name of readdirSync(p)) measure(path.join(p, name), m); return m; }
  if (path.basename(p) === NOTE) return m;
  const type = st.isSymbolicLink() ? 'länk' : path.extname(p).slice(1).toLowerCase() || 'utan ändelse';
  m.bytes += st.isFile() ? st.size : 0; m.files++; m.types[type] = (m.types[type] ?? 0) + 1;
  return m;
}

/** Deletes an entry; a link is removed as a link and never entered. */
function remove(p: string): void {
  const st = lstatSync(p);
  if (st.isSymbolicLink()) { try { unlinkSync(p); } catch { rmdirSync(p); } }
  else if (st.isDirectory()) { for (const name of readdirSync(p)) remove(path.join(p, name)); rmdirSync(p); }
  else unlinkSync(p);
}

function options(argv: string[]): {hours: number; dry: boolean} | string {
  const run = {hours: UNUSED, dry: false};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--torr') run.dry = true;
    else if (argv[i] === '--timmar' && /^[1-9]\d*$/.test(argv[i + 1] ?? '')) run.hours = Number(argv[++i]);
    else return `[stada] Okänt eller ogiltigt: ${argv[i]}. Använd: --torr (listar bara) och --timmar N (N minst 1).`;
  }
  return run;
}

export type Options = {slask?: string; repo?: string; now?: number; out?: (line: string) => void; err?: (line: string) => void};

/** The three-hour rule on one project's part of the slask (o.slask), which may never be a drive, the project (o.repo), a folder
 *  around it or one inside it. */
export function stada(argv: string[], o: Options = {}): number {
  const out = o.out ?? (line => console.log(line)), err = o.err ?? (line => console.error(line));
  const run = options(argv);
  if (typeof run === 'string') { err(run); return 1; }
  if (!o.slask || !o.repo) { err('[stada] Vägrar: slasken eller projektet är inte angivet.'); return 1; }
  const slask = path.resolve(o.slask), repo = path.resolve(o.repo), now = o.now ?? Date.now();
  if (path.parse(slask).root === slask || path.relative(slask, repo) === '' || inside(repo, slask) || inside(slask, repo)) {
    err(`[stada] Vägrar: slasken ${slask} är en hel disk, är repot, rymmer repot eller ligger i det.`); return 1;
  }
  const top = lstatSync(slask, {throwIfNoEntry: false});
  if (!top) { out(`Slasken ${slask} finns inte; inget att städa.`); return 0; }
  if (top.isSymbolicLink() || !top.isDirectory()) { err(`[stada] Vägrar: slasken ${slask} är en länk eller ingen mapp.`); return 1; }

  const limit = now - run.hours * HOUR, gone: string[] = [], left: string[] = [];
  let kept = 0, bytes = 0;
  for (const name of readdirSync(slask).sort()) {
    if (name === WAITING) { kept++; continue; }
    const entry = path.join(slask, name);
    try {
      const m = measure(entry);
      if (m.newest >= limit) { kept++; continue; }
      if (run.dry) out(`raderas ${size(m.bytes).padStart(9)}  ${name}`); else remove(entry);
      gone.push(name); bytes += m.bytes;
    } catch { left.push(name); }
  }
  out(`stada ${stamp(now)}${run.dry ? ', torrkörning (inget raderat)' : ''}: ${run.dry ? 'skulle radera' : 'raderat'} ${gone.length} st (${size(bytes)}) i ${slask} som inte ändrats på ${run.hours} timmar; ${kept} st behålls${left.length ? `; ${left.length} st gick inte att läsa eller radera: ${left.join(', ')}` : ''}.`);
  return left.length ? 1 : 0;
}

/** The three-hour rule on every project's part of the slask: each folder beside this file, which is the project of the same
 *  name in the repo. What lies loose beside this file (this file among it) is never touched. */
export function stadaAll(argv: string[], o: Omit<Options, 'slask' | 'repo'> & {root?: string; casino?: string} = {}): number {
  const run = options(argv);
  if (typeof run === 'string') { (o.err ?? (line => console.error(line)))(run); return 1; }
  const root = path.resolve(o.root ?? HERE), casino = path.resolve(o.casino ?? CASINO);
  const projects = readdirSync(root).sort().filter(name => lstatSync(path.join(root, name)).isDirectory());
  if (!projects.length) { (o.out ?? (line => console.log(line)))('Slasken har inga projektmappar; inget att städa.'); return 0; }
  let code = 0;
  for (const name of projects) code = Math.max(code, stada(argv, {...o, slask: path.join(root, name), repo: path.join(casino, name)}));
  return code;
}

// ── The notes and the register ──────────────────────────────────────────────

export type Note = {what: string; owner: string; at: string; until?: string};

/** A folder's note; null when it has none, 'oläslig' when it cannot be read as one. */
export function readNote(dir: string): Note | 'oläslig' | null {
  let text: string;
  try { text = readFileSync(path.join(dir, NOTE), 'utf8'); } catch (e) { return (e as NodeJS.ErrnoException).code === 'ENOENT' ? null : 'oläslig'; }
  try { const n = JSON.parse(text); return n && typeof n.what === 'string' && typeof n.owner === 'string' ? n as Note : 'oläslig'; } catch { return 'oläslig'; }
}

export type Item = {project: string; folder: string; kind: 'mapp' | 'fil' | 'länk'; waiting: boolean; bytes: number; files: number;
  types: Record<string, number>; changed: string; goes: string | null; due: boolean; note: Note | 'oläslig' | null; unreadable?: true};
export type Register = {at: string; hours: number; projects: {name: string; known: boolean}[]; items: Item[]; loose: string[]};

/** The register, counted from the folders and their notes. A project is known when the repo has a folder of the same name
 *  with its own AGENTS.md. */
export function register(root = HERE, now = Date.now(), hours = UNUSED, casino = CASINO): Register {
  const items: Item[] = [], loose: string[] = [], projects: Register['projects'] = [];
  const add = (project: string, folder: string, waiting: boolean) => {
    const full = path.join(root, project, folder), st = lstatSync(full, {throwIfNoEntry: false});
    if (!st) return;
    const kind = st.isSymbolicLink() ? 'länk' : st.isDirectory() ? 'mapp' : 'fil';
    let m: Measure = {newest: Math.max(st.mtimeMs, st.ctimeMs), bytes: 0, files: 0, types: {}}, unreadable = false;
    try { m = measure(full); } catch { unreadable = true; }
    const goes = waiting ? null : m.newest + hours * HOUR;
    items.push({project, folder, kind, waiting, bytes: m.bytes, files: m.files, types: m.types, changed: new Date(m.newest).toISOString(),
      goes: goes === null ? null : new Date(goes).toISOString(), due: goes !== null && goes < now, note: kind === 'mapp' ? readNote(full) : null,
      ...(unreadable ? {unreadable: true as const} : {})});
  };
  for (const name of readdirSync(root).sort()) {
    if (!lstatSync(path.join(root, name)).isDirectory()) { if (name !== path.basename(SELF)) loose.push(name); continue; }
    projects.push({name, known: existsSync(path.join(casino, name, 'AGENTS.md'))});
    for (const folder of readdirSync(path.join(root, name)).sort()) {
      const full = path.join(root, name, folder);
      if (folder === WAITING && lstatSync(full).isDirectory()) { for (const inner of readdirSync(full).sort()) add(name, `${WAITING}/${inner}`, true); continue; }
      add(name, folder, folder === WAITING);
    }
  }
  return {at: new Date(now).toISOString(), hours, projects, items, loose};
}

const sum = (items: Item[]) => items.reduce((s, i) => s + i.bytes, 0);
const kinds = (types: Record<string, number>) => {
  const all = Object.entries(types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return all.slice(0, 4).map(([t, n]) => `${t} ${n}`).join(', ') + (all.length > 4 ? ` och ${all.length - 4} typer till` : '');
};
const noteLine = (i: Item) => {
  if (i.kind === 'länk') return 'en länk, följs aldrig';
  if (i.kind === 'fil') return 'lös fil';
  const n = i.note;
  if (!n) return 'INGEN LAPP';
  if (n === 'oläslig') return 'LAPPEN GÅR INTE ATT LÄSA';
  const at = Date.parse(n.at);
  return `${n.owner}, ${Number.isFinite(at) ? day(at) : n.at}: ${n.what}${n.until ? ` Får gå: ${n.until}` : ''}`;
};

/** The register as text: a summary first, then each project with one line per folder and one for its note. */
export function show(r: Register): string {
  const folders = r.items.filter(i => i.kind === 'mapp'), due = r.items.filter(i => i.due), waiting = r.items.filter(i => i.waiting);
  const missing = folders.filter(i => !i.note || i.note === 'oläslig');
  const next = r.items.filter(i => i.goes && !i.due).map(i => Date.parse(i.goes!)).sort((a, b) => a - b)[0];
  const lines = [
    `Slasken: ${size(sum(r.items))} i ${folders.length} mappar under ${r.projects.length} projekt; ${waiting.length} väntar på Jakobs dom, ${missing.length} saknar lapp.`,
    `Tretimmarsregeln (det som inte ändrats på ${r.hours} timmar går, aldrig granska/) tar ` +
      (due.length ? `${due.length} nu (${size(sum(due))}): ${due.map(i => `${i.project}/${i.folder}`).join(', ')}` : 'inget nu') +
      (next ? `; nästa går ${stamp(next)}.` : '.'),
  ];
  for (const p of r.projects) {
    const mine = r.items.filter(i => i.project === p.name), width = Math.max(0, ...mine.map(i => i.folder.length));
    lines.push('', `${p.name}, ${size(sum(mine))}${p.known ? '' : ' (inget projekt med det namnet i repot)'}`);
    for (const i of mine) {
      const files = i.files ? `${i.files} ${i.files === 1 ? 'fil' : 'filer'} (${kinds(i.types)})` : 'tom';
      const state = i.waiting ? 'väntar på Jakobs dom' : i.due ? 'GÅR NU' : `går ${stamp(Date.parse(i.goes!))}`;
      lines.push(`  ${i.folder.padEnd(width)} ${size(i.bytes).padStart(9)}  ${files}, ändrad ${stamp(Date.parse(i.changed))}, ${state}`);
      lines.push(`    ${noteLine(i)}${i.unreadable ? ' (gick inte att läsa helt)' : ''}`);
    }
  }
  if (r.loose.length) lines.push('', `Lösa filer bredvid verktyget (regeln rör dem inte): ${r.loose.join(', ')}`);
  if (missing.length) lines.push('', 'Lapp saknas: node slask/slask.ts lapp <projekt>/<mapp> <ägare> "<vad>" ["<när den får gå>"]');
  return lines.join('\n');
}

/** Writes a folder's note, and makes the folder. */
function lapp(args: string[]): number {
  const [where = '', owner = '', what = '', until = ''] = args;
  const parts = where.replace(/\\/g, '/').replace(/^\/*(?:slask\/)?/, '').replace(/\/+$/, '').split('/');
  const shape = parts.length === 2 ? parts[1] !== WAITING : parts.length === 3 && parts[1] === WAITING;
  if (args.length < 3 || args.length > 4 || !shape || !parts.every(s => NAME.test(s)) || !oneLine(owner, 60) || !oneLine(what, 300)) {
    console.error('[lapp] Använd: node slask/slask.ts lapp <projekt>/<mapp> <ägare> "<vad>" ["<när den får gå>"]. <mapp> får vara ' +
      'granska/<namn>; ägaren är chattens namn i inbox/ eller verktygets sökväg.');
    return 1;
  }
  if (!existsSync(path.join(CASINO, parts[0], 'AGENTS.md'))) { console.error(`[lapp] ${parts[0]} är inget projekt i repot (en mapp i roten med egen AGENTS.md).`); return 1; }
  const dir = path.join(HERE, ...parts), st = lstatSync(dir, {throwIfNoEntry: false});
  if (st && (st.isSymbolicLink() || !st.isDirectory())) { console.error(`[lapp] slask/${parts.join('/')} är ingen mapp.`); return 1; }
  mkdirSync(dir, {recursive: true});
  const note: Note = {what: oneLine(what, 300), owner: oneLine(owner, 60), at: new Date().toISOString(), ...(oneLine(until, 200) ? {until: oneLine(until, 200)} : {})};
  writeFileSync(path.join(dir, NOTE), JSON.stringify(note, null, 1) + '\n');
  console.log(`Lappen skriven: slask/${parts.join('/')}/${NOTE}`);
  return 0;
}

function main(argv: string[]): number {
  if (argv[0] === 'stada') return stadaAll(argv.slice(1));
  if (argv[0] === 'lapp') return lapp(argv.slice(1));
  if (argv.length === 0 || (argv.length === 1 && argv[0] === '--json')) {
    const r = register();
    console.log(argv[0] === '--json' ? JSON.stringify(r, null, 1) : show(r));
    return 0;
  }
  console.error('Okänt. Använd: node slask/slask.ts [--json], node slask/slask.ts lapp <projekt>/<mapp> <ägare> "<vad>" ["<när den får gå>"] ' +
    'eller node slask/slask.ts stada [--torr] [--timmar N].');
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) process.exitCode = main(process.argv.slice(2));
