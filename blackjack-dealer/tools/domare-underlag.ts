// The judge's material (the skill doma, ../.claude/skills/doma/SKILL.md) for a film, a picture or a whole proof folder:
// tools/python/domare.py once per film (a sheet of every third frame whole; per figure mat.py's measures of shaking,
// the face's shape over time, the gaze and the hands' bones; close-ups of the face and each hand for every second
// frame where something happens; titta-har.txt that says where to look) and once per large picture (full-size pieces).
// Spends nothing, opens no browser, changes nothing it reads.
//   node tools/domare-underlag.ts <film.mp4 | bild.png | provmapp> [--ut <mapp>] [--delar CxR] [--steg 1] [--bara a.mp4,b.png] [--utan-matt]
// Run from blackjack-dealer/. Writes into ../slask/blackjack-dealer/domare/<provet>/<filen>/ unless --ut names a folder,
// and underlag.txt there with every film's titta-har.txt. --delar overrides the panels found (2x1: two films side by side);
// --utan-matt makes only the sheets (a film laid beside its source). A film of a real dealer (live-bj/) is read only with
// --ut inside live-bj/rutor/, which Git ignores: its frames never go into a proof, assets/, Git or a service.
import {spawn} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const PY = process.platform === 'win32' ? 'tools/python/.venv/Scripts/python.exe' : 'tools/python/.venv/bin/python';
const SCRIPT = 'tools/python/domare.py';
const AT_ONCE = 3;   // films measured at the same time (each runs mat.py once per panel)

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const target = args.find((a, i) => !a.startsWith('--') && !['--ut', '--delar', '--steg', '--bara'].includes(args[i - 1] ?? ''));
// A real dealer's film stays inside live-bj/rutor/ (repo rule: it never goes into a proof, Git or a service).
const insideLive = (p: string) => !path.relative(path.resolve('..', 'live-bj'), path.resolve(p)).startsWith('..');
if (target && insideLive(target) && !(option('--ut') && !path.relative(path.resolve('..', 'live-bj', 'rutor'), path.resolve(option('--ut')!)).startsWith('..'))) {
  console.error('En film ur live-bj/ (riktiga dealrar) läses bara med --ut inne i live-bj/rutor/, som Git inte har.');
  process.exit(2);
}
if (!target || !existsSync(target)) {
  console.error('node tools/domare-underlag.ts <film.mp4 | bild.png | provmapp> [--ut <mapp>] [--delar CxR] [--steg 1] [--bara a.mp4,b.png]');
  process.exit(2);
}
if (!existsSync(PY)) {
  console.error(`Python-miljön saknas (${PY}); tools/python/README.md säger hur den görs.`);
  process.exit(2);
}

const isDir = statSync(target).isDirectory();
const only = option('--bara')?.split(',').map((s) => s.trim()).filter(Boolean);
const files = (isDir ? readdirSync(target).map((f) => path.join(target, f)) : [target])
  .filter((f) => /\.(mp4|png|jpg)$/i.test(f) && statSync(f).isFile())
  .filter((f) => !only || only.includes(path.basename(f)))
  .sort();
// the proof's name: its folder, or the folder above a slask proof's prov/ (slask/<projekt>/granska/<namn>/prov/)
const folder = isDir ? path.resolve(target) : path.dirname(path.resolve(target));
const proofName = path.basename(folder) === 'prov' ? path.basename(path.dirname(folder)) : path.basename(folder);
const out = path.resolve(option('--ut') ?? path.join('..', 'slask', 'blackjack-dealer', 'domare', proofName));
mkdirSync(out, {recursive: true});

function run(file: string): Promise<string> {
  const film = /\.mp4$/i.test(file);
  const dir = path.join(out, path.basename(file).replace(/\.[^.]+$/, ''));
  const extra = film ? ['--delar', option('--delar') ?? 'auto', '--steg', option('--steg') ?? '1', ...(args.includes('--utan-matt') ? ['--utan-matt'] : [])] : [];
  return new Promise((resolve) => {
    const child = spawn(PY, ['-I', SCRIPT, film ? 'film' : 'bild', file, film ? dir : path.join(out, 'bilder'), ...extra], {stdio: ['ignore', 'pipe', 'pipe']});
    let said = '';
    child.stdout.on('data', (d) => { said += d; });
    child.stderr.on('data', (d) => { said += d; });
    child.on('close', (code) => {
      const head = `== ${path.basename(file)}${code ? ` (STANNADE, kod ${code})` : ''}`;
      console.log(`${head}${film && !code ? ` → ${path.relative(process.cwd(), dir)}` : ''}`);
      const words = film && !code && existsSync(path.join(dir, 'titta-har.txt')) ? readFileSync(path.join(dir, 'titta-har.txt'), 'utf8') : said.trim();
      resolve(`${head}\n${words}\n`);
    });
  });
}

const results: string[] = new Array(files.length);
let next = 0;
await Promise.all(Array.from({length: Math.min(AT_ONCE, files.length)}, async () => {
  while (next < files.length) {
    const i = next++;
    results[i] = await run(files[i]);
  }
}));
writeFileSync(path.join(out, 'underlag.txt'), `Underlag för domaren: ${proofName} (${files.length} filer). Måtten säger var det är värt att titta; domen fälls med ögat.\n\n${results.join('\n')}`);
console.log(`Underlaget ligger i ${path.relative(process.cwd(), out) || out}; underlag.txt samlar det.`);
