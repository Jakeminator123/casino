// Brings one film of a doll into the repo's media and the register of rendered reference films, so that an order can name it
// (node tools/order-new.ts … --reference <id>), and a person's guidance picture made of its first frame beside it:
//   node tools/doll-reference-put.ts <run folder | film.mp4> --id <id> --from READY-C --to P5.C1 [--shape ROUND_TRIP] [--doll paow]
//                                    [--lays RH|LH] [--motion dealer3d/data/<file>.json] [--note "<text>"]
//                                    [--uppsattning live|forra] [--kamera kameran|plats-7] [--dry]
//   node tools/doll-reference-put.ts --id <id> --person <name> --styrbild <picture.png> --utseende "<his look in the text's words>"
//                                    [--om "<how the picture was made>"] [--dry]
// A run folder (dealer3d/tools/render-reference.ts) holds referens.mp4, renderkvitto.json, rorelse.json and kortplan.json; a
// film is read where it lies, such as the editor's recording in ../standarddocka/klipp/ (its receipt is the editor's state,
// which says the set-up and the doll). They are copied to assets/references/docka/<id>/ (the film as source.mp4) with a
// receipt.json of their hashes, and the film gets one entry in data/rendered-references.json. An id is never used twice: a
// film made again gets a new id (docs/SYSTEM.md, "Dockan").
// --uppsattning: the set-up it is filmed at (src/uppsattning.ts); absent, the doll's own table (Danilo and Frasse the live
// table's), else the former standard, as every run of render-reference.ts. A film of another set-up than the former must be
// that set-up's picture (1728 × 972 at the live table). --kamera: which of that set-up's cameras it is taken through (the
// live table's own, "kameran", or a seat's, "plats-7"); a film of the live table always says it, the live table's own when
// nothing is said. Neither field is written for the former standard, so its entries are as before.
// --person: a guidance picture for a person (a styrbild: the film's first frame made into him, in the film's picture), copied
// beside the film as styrbild-<person>.png and named in its entry with his look in the words the text says it with
// (src/order-prompts.ts personPrompt); his trial over the film is then node tools/order-new.ts --person <name> … --reference <id>.
// A film whose motion is read off a real deal (the motion file's made.way "read", or a chain of such cycles) gets fromDeal,
// the deal it is read off: an order with it as its reference film is another way of making a film than one with a built
// cycle (src/order-ways.ts), and that way is tried with a pilot of its own.
import {copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {UPPSATTNING, dockansUppsattning, lasUppsattning, DATATS_FORVAL} from '../src/uppsattning.ts';
import {uppsattningField, uppsattningOf} from '../src/order-model.ts';

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const id = flag('--id'), dry = args.includes('--dry'), person = flag('--person');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const register = 'data/rendered-references.json', reg = JSON.parse(readFileSync(register, 'utf8')) as {films: Record<string, unknown>[]};
const write = () => writeFileSync(register, JSON.stringify(reg, null, 2) + '\n');
const sizeOf = (file: string) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], {encoding: 'utf8'})).streams[0] as {width: number; height: number};

if (person) {
  // ── A person's guidance picture beside a film that is registered ──────────
  const picture = flag('--styrbild'), look = flag('--utseende')?.trim(), how = flag('--om')?.trim();
  if (!id || !picture || !look) throw Error('Använd: node tools/doll-reference-put.ts --id <film> --person <namn> --styrbild <bild.png> --utseende "<hans utseende i textens ord>" [--om "<hur bilden gjordes>"] [--dry]');
  if (!/^[a-z0-9]+$/.test(person)) throw Error(`${person}: en person skrivs med små bokstäver och siffror (tomasz).`);
  const entry = reg.films.find(f => f.id === id) as {id: string; styrbilder?: Record<string, unknown>; uppsattning?: string} | undefined;
  if (!entry) throw Error(`${id} finns inte i ${register}: för in filmen först.`);
  if (!/\.png$/i.test(picture) || !existsSync(picture)) throw Error(`${picture} är ingen PNG som finns.`);
  if (look.length > 300) throw Error('Utseendet är högst 300 tecken: det står i texten till filmmodellen.');
  const folder = `assets/references/docka/${id}`, name = `styrbild-${person}.png`, to = `${folder}/${name}`;
  if (entry.styrbilder?.[person] || existsSync(to)) throw Error(`${id} har redan en styrbild för ${person} (${to}): en ny styrbild hör till en ny film, eller ta bort den gamla raden och filen först.`);
  // The film's first frame made into him: in the film's own picture, or it is a picture of another camera.
  const setup = uppsattningOf(entry), frame = UPPSATTNING[setup].bild, size = sizeOf(picture);
  if (size.width !== frame.width || size.height !== frame.height) throw Error(`${picture} är ${size.width} × ${size.height}, inte filmens ${frame.width} × ${frame.height} (${UPPSATTNING[setup].namn}): en styrbild görs i filmens bildutsnitt.`);
  const styrbild = {path: to, sha256: sha(picture), width: size.width, height: size.height, look, ...(how ? {from: how} : {})};
  if (dry) { console.log(JSON.stringify({written: false, film: id, person, styrbild}, null, 2)); process.exit(0); }
  mkdirSync(folder, {recursive: true});
  copyFileSync(picture, to);
  if (sha(to) !== styrbild.sha256) throw Error(`${to} blev inte bilden som lästes.`);
  entry.styrbilder = {...(entry.styrbilder ?? {}), [person]: styrbild};
  const receiptFile = `${folder}/receipt.json`;
  if (existsSync(receiptFile)) { const receipt = JSON.parse(readFileSync(receiptFile, 'utf8')); receipt.files = {...(receipt.files ?? {}), [name]: {from: path.relative(process.cwd(), path.resolve(picture)).split(path.sep).join('/'), sha256: styrbild.sha256}}; writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n'); }
  write();
  console.log(JSON.stringify({written: true, film: id, person, styrbild}, null, 2));
  process.exit(0);
}

// ── A film ──────────────────────────────────────────────────────────────────
const run = args[0], edge = flag('--from') && flag('--to') ? `${flag('--from')}>${flag('--to')}` : undefined, shape = flag('--shape'), doll = flag('--doll'), lays = flag('--lays') ?? 'RH', motion = flag('--motion'), note = flag('--note');
if (!run || run.startsWith('--') || !id || !edge) throw Error('Använd: node tools/doll-reference-put.ts <körningens mapp | film.mp4> --id <id> --from READY-C --to P5.C1 [--shape ROUND_TRIP] [--doll paow] [--lays RH|LH] [--motion <fil>] [--note "<text>"] [--uppsattning live|forra] [--kamera kameran|plats-7] [--dry]');
if (!/^docka-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw Error(`${id}: ett id börjar med docka- och har små bokstäver, siffror och bindestreck.`);
if (shape && shape !== 'ROUND_TRIP') throw Error('--shape är ROUND_TRIP eller utelämnas.');
const word = flag('--uppsattning'), said = word === undefined ? null : lasUppsattning(word);
if (word !== undefined && (!said || word === 'standard')) throw Error('--uppsattning är live eller forra.');
const setup = said ?? dockansUppsattning(doll) ?? DATATS_FORVAL, camera = flag('--kamera') ?? (setup !== DATATS_FORVAL ? 'kameran' : undefined);
if (camera !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(camera)) throw Error(`--kamera ${camera}: ett ord som editorns (kameran, plats-7).`);

if (reg.films.some(f => f.id === id)) throw Error(`${id} finns redan i ${register}: en film som görs om får ett nytt id.`);
const to = `assets/references/docka/${id}`;
if (existsSync(to)) throw Error(`${to} finns redan.`);
// A run folder holds referens.mp4 and its receipts; a film is read where it lies.
const single = /\.mp4$/i.test(run) && existsSync(run) && statSync(run).isFile();
const film = single ? run : path.join(run, 'referens.mp4');
if (!existsSync(film)) throw Error(`${film} saknas.`);

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'json', film], {encoding: 'utf8'})).streams[0];
const [n, d] = String(probe.r_frame_rate).split('/').map(Number), fps = n / (d || 1), frames = Number(probe.nb_read_frames), seconds = Math.round((frames / fps) * 1000) / 1000;
// A film of another set-up than the former is that set-up's picture, or it was taken through another camera than its.
const frame = UPPSATTNING[setup].bild;
if (setup !== DATATS_FORVAL && (probe.width !== frame.width || probe.height !== frame.height)) throw Error(`${film} är ${probe.width} × ${probe.height}, inte ${UPPSATTNING[setup].namn.toLowerCase()}s ${frame.width} × ${frame.height}.`);
const files: Record<string, {from: string; sha256: string}> = {'source.mp4': {from: single ? path.relative(process.cwd(), path.resolve(film)).split(path.sep).join('/') : 'referens.mp4', sha256: sha(film)}};
if (!single) for (const name of ['renderkvitto.json', 'rorelse.json', 'kortplan.json']) if (existsSync(path.join(run, name))) files[name] = {from: name, sha256: sha(path.join(run, name))};
/** The deal a motion file is read off: its own film where it was made by reading, else the first read cycle of a chain. */
const readOff = (file: string): string | null => {
  if (!existsSync(file)) return null;
  const m = JSON.parse(readFileSync(file, 'utf8')) as {film?: string; made?: {way?: string; cycles?: string[]}};
  if (m.made?.way === 'read') return m.film ?? null;
  return (m.made?.cycles ?? []).map(readOff).find(Boolean) ?? null;
};
const fromDeal = motion ? readOff(motion) : null;
const where = {...uppsattningField(setup), ...(camera ? {camera} : {})};
const receipt = {id, sourceRun: path.basename(run), files, video: {width: probe.width, height: probe.height, fps, frames, seconds}, edge, lays, ...(doll ? {doll} : {}), state: 'kandidat', ...(shape ? {shape} : {}),
  ...(motion ? {motion: {path: motion, sha256: sha(motion), ...(doll ? {doll} : {})}} : {}), ...(note ? {note} : {}), ...where, copiedAt: new Date().toISOString(), copiedBy: 'huvudagenten, tools/doll-reference-put.ts'};
const entry = {id, edge, path: `${to}/source.mp4`, sha256: files['source.mp4'].sha256, seconds, ...(fromDeal ? {fromDeal} : {}), lays, ...(shape ? {shape} : {}), check: null, ...(doll ? {doll} : {}), ...where};
if (dry) { console.log(JSON.stringify({written: false, entry, receipt}, null, 2)); process.exit(0); }
mkdirSync(to, {recursive: true});
for (const [name, f] of Object.entries(files)) copyFileSync(single && name === 'source.mp4' ? film : path.join(run, f.from), path.join(to, name));
writeFileSync(path.join(to, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
reg.films.push(entry);
write();
console.log(JSON.stringify({written: true, entry}, null, 2));
