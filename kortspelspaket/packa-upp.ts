// Packar upp Card Games Animation Pack (The Mighty Cat) ur de tre filer Jakob köpte, så som varje program själv lägger dem:
//   node kortspelspaket/packa-upp.ts [--fran <mapp>]      (förval: mappen Hämtade filer, ~/Downloads)
//   paket/fbx/     de rena animationerna (CardGamesAnimationPack.zip)
//   paket/unity/   ett Unity-projekts Assets/ (CardGamesAnimPack-600.unitypackage), med .meta-filerna som håller ihop
//                  demoscenen: Unity hittar prefab, material och animationer genom dem
//   paket/unreal/  Unreal Engine 5.5-projektet (CardGameAnimPack55.zip)
// Macens skräpfiler (__MACOSX, .DS_Store) tas inte med. En ny körning tömmer paket/ först. Packas upp med tar, som finns
// i Windows 10 och senare och på en Mac.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, readdir, readFile, rename, rm, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const FROM = path.resolve(arg('--fran') ?? path.join(homedir(), 'Downloads'));
const OUT = fileURLToPath(new URL('./paket/', import.meta.url));
const FILES = {fbx: 'CardGamesAnimationPack.zip', unity: 'CardGamesAnimPack-600.unitypackage', unreal: 'CardGameAnimPack55.zip'};

function tar(args: string[]) {
  const r = spawnSync('tar', args, {stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8'});
  if (r.error) throw Error(`tar kunde inte köras: ${r.error.message}`);
  if (r.status !== 0) throw Error(`tar ${args.join(' ')}: ${r.stderr.trim()}`);
}
const unzip = (file: string, dest: string) => tar(['-xf', file, '-C', dest, '--exclude', '__MACOSX', '--exclude', '.DS_Store']);

async function count(dir: string): Promise<{files: number; bytes: number}> {
  let files = 0, bytes = 0;
  for (const e of await readdir(dir, {withFileTypes: true, recursive: true})) {
    if (e.isFile()) { files++; bytes += (await stat(path.join(e.parentPath, e.name))).size; }
  }
  return {files, bytes};
}

/**
 * Ett .unitypackage är ett tar.gz med en mapp per tillgång (dess GUID): `pathname` säger var den ska ligga i projektet,
 * `asset` är själva filen och `asset.meta` Unitys uppgifter om den. Här läggs de där Unity själv lägger dem vid import.
 */
async function unpackUnity(file: string, dest: string) {
  const temp = path.join(OUT, '.uppackning');
  await mkdir(temp, {recursive: true});
  tar(['-xzf', file, '-C', temp]);
  for (const guid of await readdir(temp)) {
    const dir = path.join(temp, guid), named = path.join(dir, 'pathname');
    if (!existsSync(named)) continue;
    const where = (await readFile(named, 'utf8')).split('\n')[0].trim();
    if (!where.startsWith('Assets/') || where.split('/').includes('..')) throw Error(`Konstig sökväg i paketet: ${where}`);
    const target = path.join(dest, ...where.split('/'));
    await mkdir(path.dirname(target), {recursive: true});
    if (existsSync(path.join(dir, 'asset'))) await rename(path.join(dir, 'asset'), target);
    else await mkdir(target, {recursive: true});
    if (existsSync(path.join(dir, 'asset.meta'))) await rename(path.join(dir, 'asset.meta'), target + '.meta');
  }
  await rm(temp, {recursive: true, force: true});
}

const missing = Object.values(FILES).filter(f => !existsSync(path.join(FROM, f)));
if (missing.length) { console.error(`Hittar inte ${missing.join(', ')} i ${FROM}. Ange mappen med --fran.`); process.exit(1); }

await rm(OUT, {recursive: true, force: true});
for (const [part, name] of Object.entries(FILES)) {
  const dest = path.join(OUT, part), file = path.join(FROM, name);
  await mkdir(dest, {recursive: true});
  process.stdout.write(`${name} → paket/${part}/ ... `);
  if (part === 'unity') await unpackUnity(file, dest); else unzip(file, dest);
  const {files, bytes} = await count(dest);
  console.log(`${files} filer, ${(bytes / 1e6).toFixed(0)} MB`);
}
console.log(`Klart: ${OUT}`);
