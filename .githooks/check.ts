// The push check of the whole casino repo: .githooks/pre-push runs it on every git push, "npm run check" in a project runs
// it on origin/main..HEAD. Every file the outgoing commits add or change is read as Git stores it (not as the working tree
// has it), and an environment file, media, a file over 5 MB or what looks like a key stops the push. Then each top folder
// the commits touch runs its own "npm test" in the working tree as it is, and a change in .githooks/ runs its tests. Only
// file names are printed, never a value that matched. Tested in .githooks/check.test.ts.
//
//   node .githooks/check.ts                     the commits of origin/main..HEAD
//   node .githooks/check.ts --range <a>..<b>    another range; a single commit means all of its history
//   node .githooks/check.ts --install           core.hooksPath = .githooks, so that git push starts the hook
//   node .githooks/check.ts --pre-push          the hook: Git's lines on stdin (<local ref> <local sha> <remote ref> <remote sha>)
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export type Finding = {level: 'RED' | 'WARN'; path: string; message: string};
/** A file as a commit has it: its name in the repo and its blob. */
export type Change = {path: string; blob: string};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LIMIT = 5 * 1024 * 1024;
const ZERO = /^0+$/, OID = /^[0-9a-f]{40,64}$/i;

// A hook gets GIT_DIR and the rest exported relative to where Git started it; every git here reads the repo it is pointed at.
const GIT_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];
const cleanEnv = () => { const env = {...process.env}; for (const key of GIT_VARS) delete env[key]; return env; };
function git(root: string, args: string[], input?: string): Buffer {
  const r = spawnSync('git', args, {cwd: root, env: cleanEnv(), input, maxBuffer: 2 ** 31 - 1});
  if (r.error || r.status !== 0) throw Error(`git ${args[0]}: ${r.error?.message ?? r.stderr.toString().trim()}`);
  return r.stdout;
}
const lines = (out: Buffer) => out.toString('utf8').split('\n').map(s => s.trim()).filter(Boolean);
const revList = (root: string, args: string[]) => lines(git(root, ['rev-list', ...args]));

// ── What stops ──────────────────────────────────────────────────────────────
// The media and binary types of the repo's .gitignore, and the other media and models the
// projects make (Meshy's and Blender's 3D files, MediaPipe's and Python's model files, the portable Blender's programs).
const MEDIA = /\.(?:mp4|m4v|mov|webm|mkv|avi|wav|mp3|m4a|aac|flac|ogg|png|jpe?g|webp|avif|gif|bmp|tiff?|ico|heic|psd|glb|gltf|fbx|obj|stl|3mf|usdz|blend1?|hdr|exr|pdf|pt|pth|ckpt|onnx|safetensors|tflite|task|npy|npz|zip|7z|rar|gz|tgz|tar|bz2|xz|exe|dll|msi)$/i;
// Next.js reads a site's icons as files from its app folder (studio/app/), so a small one may go in.
const ICON = /(?:^|\/)(?:favicon|icon|apple-icon)\d*\.(?:ico|png)$/i, ICON_LIMIT = 100 * 1024;
const KEY_FILE = /\.(?:pem|p12|pfx)$/i;
// What a key or token looks like, by service; the last three catch a password in an address and a long value given to a
// name such as api_key or RUNWAY_API_KEY.
const SECRETS: [string, RegExp][] = [
  ['privat nyckel', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['OpenAI- eller Anthropic-nyckel', /\bsk-[A-Za-z0-9_-]{32,}/],
  ['GitHub-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['Runway-nyckel', /\bkey_[0-9a-f]{64,}/],
  ['Vercel-token', /\b(?:vercel_blob_rw_[A-Za-z0-9]{8,}_[A-Za-z0-9]{20,}|vc[aikpr]_[A-Za-z0-9]{24,})/],
  ['Meshy-nyckel', /\bmsy_[A-Za-z0-9]{24,}/],
  ['AWS-nyckel', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google-nyckel', /\bAIza[0-9A-Za-z_-]{35}/],
  ['Slack-token', /\bxox[abposr]-[0-9A-Za-z-]{10,}/],
  ['Stripe-nyckel', /\b[rs]k_live_[0-9A-Za-z]{20,}/],
  ['lösenord i en databasadress', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?):\/\/[^\s:@/]+:[^\s:@/]{12,}@/],
  ['nyckel i en tilldelning', /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_+/=.-]{24,}["']/i],
  ['nyckel i en miljörad', /^[ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[ \t]*=[ \t]*["']?[A-Za-z0-9_+/=-]{24,}/m],
];
// The example file of an environment may go in with empty values only (casino/.gitignore lets .env.example through).
const filled = (text: string) => text.split(/\r?\n/).some(line => {
  const assignment = /^\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=(.*)$/.exec(line);
  return !!assignment && !/^\s*(?:""|'')?\s*(?:#.*)?$/.test(assignment[1]);
});

/** What stops (RED) or is worth a look (WARN) in one file; tools/knowledge.ts runs the bot's knowledge through it too. */
export function inspectBlob(name: string, bytes: Buffer): Finding[] {
  const out: Finding[] = [], add = (level: Finding['level'], message: string) => out.push({level, path: name, message});
  const base = path.posix.basename(name), example = base.toLowerCase() === '.env.example', text = bytes.toString('utf8');
  const icon = ICON.test(name) && bytes.length <= ICON_LIMIT;
  if (/^\.env/i.test(base) && !example) add('RED', 'En miljöfil får inte publiceras; bara .env.example med tomma värden går in.');
  if (example && filled(text)) add('RED', '.env.example får bara ha tomma värden.');
  if (KEY_FILE.test(base)) add('RED', 'En nyckelfil får inte publiceras.');
  if (MEDIA.test(base) && !icon) add('RED', 'Media och binärer stannar utanför Git: repot är publikt.');
  if (bytes.length > LIMIT) add('RED', 'Filen är större än 5 MB.');
  const secret = SECRETS.find(([, pattern]) => pattern.test(text));
  if (secret) add('RED', `Ser ut som en hemlighet (${secret[0]}); utred utan att skriva ut värdet.`);
  if (!out.length && !icon && bytes.subarray(0, 8000).includes(0)) add('WARN', 'Binärt innehåll; hör filen hemma i Git?');
  return out;
}

// ── What a push brings ──────────────────────────────────────────────────────
/** The commits a push brings that the remote lacks, from Git's lines on stdin; a deleted ref brings none. */
export function outgoing(root: string, stdin: string): string[] {
  const commits = new Set<string>();
  for (const line of stdin.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    const [, local = '', , remote = ''] = line.split(/\s+/);
    if (!OID.test(local) || !OID.test(remote)) throw Error(`Oväntad rad från Git: ${line}`);
    if (ZERO.test(local)) continue;
    // The remote's commit, when it is here, is where the push starts; a new branch is measured against every remote.
    const known = !ZERO.test(remote) && spawnSync('git', ['cat-file', '-e', `${remote}^{commit}`], {cwd: root, env: cleanEnv()}).status === 0;
    for (const commit of revList(root, known ? [`${remote}..${local}`] : [local, '--not', '--remotes'])) commits.add(commit);
  }
  return [...commits];
}

/** The files the commits add or change (a rename as an addition), each name and content once; a submodule is no file. */
export function changes(root: string, commits: string[]): Change[] {
  const seen = new Map<string, Change>();
  for (const commit of commits) {
    const parts = git(root, ['diff-tree', '-r', '-m', '--root', '--no-commit-id', '--no-renames', '--diff-filter=AMT', '-z', commit]).toString('utf8').split('\0');
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const [, mode, , blob] = parts[i].replace(/^:/, '').split(' '), file = parts[i + 1];
      if (mode !== '160000' && blob) seen.set(`${blob} ${file}`, {path: file, blob});
    }
  }
  return [...seen.values()];
}

/** The findings of the files, each blob read once from Git; one over the limit is judged by its name and size only. */
export function scan(root: string, files: Change[]): Finding[] {
  const ids = [...new Set(files.map(f => f.blob))], bytes = new Map<string, Buffer>();
  if (!ids.length) return [];
  const sizes = new Map(lines(git(root, ['cat-file', '--batch-check'], ids.join('\n') + '\n')).map(line => {
    const [id, , size] = line.split(' ');
    if (!(Number(size) >= 0)) throw Error(`Git saknar filen ${id}.`);
    return [id, Number(size)] as const;
  }));
  const small = ids.filter(id => sizes.get(id)! <= LIMIT);
  if (small.length) {
    const raw = git(root, ['cat-file', '--batch'], small.join('\n') + '\n');
    for (let at = 0; at < raw.length;) {
      const end = raw.indexOf(10, at), [id, , size] = raw.subarray(at, end).toString().split(' '), n = Number(size);
      bytes.set(id, raw.subarray(end + 1, end + 1 + n));
      at = end + 2 + n;
    }
  }
  const found = files.flatMap(f => bytes.has(f.blob) ? inspectBlob(f.path, bytes.get(f.blob)!)
    : [...inspectBlob(f.path, Buffer.alloc(0)), {level: 'RED', path: f.path, message: 'Filen är större än 5 MB.'} as Finding]);
  return [...new Map(found.map(f => [`${f.path}\0${f.message}`, f])).values()];
}

// ── The tests ───────────────────────────────────────────────────────────────
type Run = {name: string; cwd: string; command: string};
/** The tests the changed files call for: "npm test" of each top folder whose package.json has one, and .githooks/ its own. */
export function testRuns(root: string, paths: string[]): Run[] {
  const runs: Run[] = [];
  for (const top of [...new Set(paths.filter(p => p.includes('/')).map(p => p.split('/')[0]))].sort()) {
    if (top === '.githooks') { runs.push({name: top, cwd: root, command: 'node --test .githooks/*.test.ts'}); continue; }
    let script: unknown;
    try { script = JSON.parse(readFileSync(path.join(root, top, 'package.json'), 'utf8'))?.scripts?.test; } catch { continue; }
    if (typeof script === 'string') runs.push({name: top, cwd: path.join(root, top), command: 'npm test'});
  }
  return runs;
}

function main(argv: string[]): number {
  if (argv.includes('--install')) {
    let before = '';
    try { before = lines(git(ROOT, ['config', '--get', 'core.hooksPath']))[0] ?? ''; } catch {}
    git(ROOT, ['config', '--local', 'core.hooksPath', '.githooks']);
    console.log(`core.hooksPath är .githooks (förut ${before || 'inget'}): git push kör nu .githooks/pre-push för hela repot.`);
    return 0;
  }
  let commits: string[], what: string;
  if (argv.includes('--pre-push')) [commits, what] = [outgoing(ROOT, readFileSync(0, 'utf8')), 'pushen'];
  else {
    const at = argv.indexOf('--range'), range = at >= 0 ? argv[at + 1] ?? '' : 'origin/main..HEAD';
    if (!range || range.startsWith('-')) throw Error('Använd: node .githooks/check.ts [--range <a>..<b>]');
    [commits, what] = [revList(ROOT, [range]), range];
  }
  if (!commits.length) { console.log(`Inga utgående commits (${what}): inget att kontrollera.`); return 0; }
  const files = changes(ROOT, commits), findings = scan(ROOT, files);
  console.log(`Kontrollen: ${commits.length} commits och ${files.length} filer (${what}).`);
  for (const f of findings) console.log(`[${f.level === 'RED' ? 'RÖD' : 'VARNING'}] ${f.path}: ${f.message}`);
  if (findings.some(f => f.level === 'RED')) { console.log('Rött: det här får inte pushas. Ta bort det röda ur commitarna; hoppa inte över kontrollen.'); return 1; }
  // The measures' printout (MATT.md, written by matt.ts from the measures where they stand in the code) must be the
  // code's. A stale one is not pushed: it is written anew here, and the push is made again with it committed.
  if (existsSync(path.join(ROOT, 'matt.ts')) && spawnSync(process.execPath, ['matt.ts', '--kolla'], {cwd: ROOT, env: cleanEnv(), stdio: 'ignore'}).status !== 0) {
    spawnSync(process.execPath, ['matt.ts'], {cwd: ROOT, env: cleanEnv(), stdio: 'inherit'});
    console.log('Rött: MATT.md stämde inte med måtten i koden och är nu skriven om (node matt.ts). Committa MATT.md och pusha igen.');
    return 1;
  }
  // The same for the ways of building a dealer doll (avatar-auto-pipeline/vagar.json is the source, checked against the
  // code; VAGAR.md is its printout). A computer without Python skips it and says so.
  const ways = path.join(ROOT, 'avatar-auto-pipeline');
  if (existsSync(path.join(ways, 'vagar.py'))) {
    const python = [path.join(ways, '.venv/Scripts/python.exe'), path.join(ways, '.venv/bin/python')].find(existsSync) ?? 'python';
    const check = spawnSync(python, ['-I', 'vagar.py', '--kolla'], {cwd: ways, env: cleanEnv(), stdio: 'ignore'});
    if (check.error) console.log('[VARNING] Python saknas: avatarvägarna (avatar-auto-pipeline/vagar.py --kolla) kontrollerades inte.');
    else if (check.status !== 0) {
      spawnSync(python, ['-I', 'vagar.py'], {cwd: ways, env: cleanEnv(), stdio: 'inherit'});
      console.log('Rött: avatarvägarna stämde inte (avatar-auto-pipeline/vagar.py). Stämmer vagar.json med koden är VAGAR.md nu skriven om: committa den och pusha igen. Annars står felet ovan: rätta vagar.json.');
      return 1;
    }
  }
  const runs = testRuns(ROOT, files.map(f => f.path));
  for (const run of runs) {
    const open = lines(git(ROOT, ['diff', '--name-only', 'HEAD', '--', run.name]));
    if (open.length) console.log(`[VARNING] ${run.name} har ocommittade ändringar (${open.slice(0, 5).join(', ')}${open.length > 5 ? ` och ${open.length - 5} till` : ''}); testerna körs ändå i arbetsträdet som det är.`);
    console.log(`Testerna i ${run.name}: ${run.command}`);
    const r = spawnSync(run.command, {cwd: run.cwd, env: cleanEnv(), shell: true, stdio: 'inherit'});
    if (r.status !== 0) { console.log(`Rött: testerna i ${run.name} gick inte igenom.`); return 1; }
  }
  console.log(`Grönt: inget stoppar${runs.length ? `, och testerna i ${runs.map(r => r.name).join(' och ')} gick igenom` : '; inga tester berördes'}.`);
  return 0;
}

const entry = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';
if (entry === fileURLToPath(import.meta.url).toLowerCase()) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(`[RÖD] ${(error as Error).message}`); process.exitCode = 1; }
}
