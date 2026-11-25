// npm run stada: empties the slask (tools/slask.ts), where everything is temporary. Each top-level entry whose newest file is
// older than --dygn days (default 7) is deleted; --torr lists what would go and deletes nothing. A file counts from the later
// of its last write and its last change, so one copied or moved in with an old write time counts from when it arrived.
// Links and junctions are never followed: one is judged by its own date and removed as a link, whatever it points at.
import {lstatSync, readdirSync, rmdirSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REPO, SLASK} from './slask.ts';

const DAY = 864e5;
const inside = (child: string, parent: string) => { const r = path.relative(parent, child); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
const gb = (bytes: number) => (bytes / 1e9).toFixed(2).replace('.', ',') + ' GB';

/** The newest change and the bytes of an entry, measured with lstat only. */
function measure(p: string): {newest: number; bytes: number} {
  const st = lstatSync(p), out = {newest: Math.max(st.mtimeMs, st.ctimeMs), bytes: st.isFile() ? st.size : 0};
  if (st.isDirectory() && !st.isSymbolicLink()) for (const name of readdirSync(p)) {
    const inner = measure(path.join(p, name));
    out.newest = Math.max(out.newest, inner.newest); out.bytes += inner.bytes;
  }
  return out;
}

/** Deletes an entry; a link is removed as a link and never entered. */
function remove(p: string): void {
  const st = lstatSync(p);
  if (st.isSymbolicLink()) { try { unlinkSync(p); } catch { rmdirSync(p); } }
  else if (st.isDirectory()) { for (const name of readdirSync(p)) remove(path.join(p, name)); rmdirSync(p); }
  else unlinkSync(p);
}

export type Options = {slask?: string; repo?: string; now?: number; out?: (line: string) => void; err?: (line: string) => void};

export function stada(argv: string[], o: Options = {}): number {
  const out = o.out ?? (line => console.log(line)), err = o.err ?? (line => console.error(line));
  const slask = path.resolve(o.slask ?? SLASK), repo = path.resolve(o.repo ?? REPO), now = o.now ?? Date.now();
  let days = 7, dry = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--torr') dry = true;
    else if (argv[i] === '--dygn' && /^[1-9]\d*$/.test(argv[i + 1] ?? '')) days = Number(argv[++i]);
    else { err(`[stada] Okänt eller ogiltigt: ${argv[i]}. Använd: npm run stada [-- --torr] [--dygn N] (N minst 1).`); return 1; }
  }
  if (path.parse(slask).root === slask || path.relative(slask, repo) === '' || inside(repo, slask) || inside(slask, repo)) {
    err(`[stada] Vägrar: slasken ${slask} är en hel disk, är repot, rymmer repot eller ligger i det.`); return 1;
  }
  const top = lstatSync(slask, {throwIfNoEntry: false});
  if (!top) { out(`Slasken ${slask} finns inte; inget att städa.`); return 0; }
  if (top.isSymbolicLink() || !top.isDirectory()) { err(`[stada] Vägrar: slasken ${slask} är en länk eller ingen mapp.`); return 1; }

  const limit = now - days * DAY, gone: string[] = [], left: string[] = [];
  let kept = 0, bytes = 0;
  for (const name of readdirSync(slask).sort()) {
    const entry = path.join(slask, name);
    try {
      const m = measure(entry);
      if (m.newest >= limit) { kept++; continue; }
      if (dry) out(`raderas ${gb(m.bytes).padStart(9)}  ${name}`); else remove(entry);
      gone.push(name); bytes += m.bytes;
    } catch { left.push(name); }
  }
  const when = new Date(now).toLocaleString('sv-SE', {dateStyle: 'short', timeStyle: 'short'});
  out(`stada ${when}${dry ? ', torrkörning (inget raderat)' : ''}: ${dry ? 'skulle radera' : 'raderat'} ${gone.length} st (${gb(bytes)}) i ${slask} som inte ändrats på ${days} dygn; ${kept} st behålls${left.length ? `; ${left.length} st gick inte att läsa eller radera: ${left.join(', ')}` : ''}.`);
  return left.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = stada(process.argv.slice(2));
