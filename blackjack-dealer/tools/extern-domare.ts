// The external judge (the skill doma): a second, independent eye from another maker's model, beside the judge on this
// computer. It sends a proof's material (the sheets and close-ups tools/domare-underlag.ts made, shrunk) and the
// checklist with the owner's words (read from ../.claude/skills/doma/SKILL.md, so that it stands in one place) to
// OpenAI's model for images, and gets back a verdict in the judge's own form. A paid call, on Jakob's word (2026-11-27:
// "ja kör openai_api_key som jag lagt i roten nu"); every call is booked in .runtime/extern-domare/liggare.jsonl.
//   node tools/extern-domare.ts <provmapp> [--bilder a.png,b.png] [--torr]
// <provmapp> is assets/proofs/<namn> or a slask proof's prov/ folder; its material must lie in
// ../slask/blackjack-dealer/domare/<namn>/. --bilder names files (in the proof or the material) instead of the choice
// made here; --torr shows what would be sent and what it would cost, and sends nothing.
// What may be sent: pictures of dolls and of made-up persons only. Never a file under live-bj/ (the film of real dealers
// and everything with frames from it) or private/ (his own photos), never a key, never a path (only file names), and
// never his name: the words sent call him "ägaren". The key is read by this script from the environment or a
// .env.local (the repo root's first), and is never printed.
// Caps: at most MAX_PROOF dollars per proof and MAX_NIGHT dollars in all within NIGHT_HOURS, counted from the ledger;
// a call whose worst case would pass a cap is not made.
import {existsSync, readFileSync, readdirSync, mkdirSync, appendFileSync, writeFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

export const MODEL = 'gpt-6.2-astra';   // OpenAI's flagship, text and images in (developers.openai.com/api/docs/models, read 2026-11-27)
// Dollars per token, standard tier, short context (the pricing page, read 2026-11-27): input $8 per million, cache writes
// $10, cached input $0.40, output $40. Input is counted at the cache-write rate, the higher, so that the cost is never low.
export const PRICE = {input: 10 / 1e6, cached: 0.4 / 1e6, output: 40 / 1e6};
export const MAX_PROOF = 0.5, MAX_NIGHT = 5, NIGHT_HOURS = 12;
const MAX_IMAGES = 6, LONG_SIDE = 1600, MAX_OUTPUT = 6000;
const SELF = fileURLToPath(import.meta.url), PROJECT = path.resolve(path.dirname(SELF), '..'), CASINO = path.resolve(PROJECT, '..');
const LEDGER = path.join(PROJECT, '.runtime', 'extern-domare', 'liggare.jsonl');

/** Refused: a file under live-bj/ or private/, or one outside the repo. */
export function refused(file: string): string | null {
  const rel = path.relative(CASINO, path.resolve(file));
  const parts = rel.split(/[\\/]/);
  if (path.isAbsolute(rel) || parts[0] === '..') return 'ligger utanför repot';
  if (parts[0] === 'live-bj') return 'ligger under live-bj/ (riktiga dealrar)';
  if (parts.includes('private')) return 'ligger under private/ (hans egna foton)';
  return null;
}

/** The words sent never carry his name or a path. */
export const scrub = (text: string) => text.replace(/Jakobs/g, 'ägarens').replace(/Jakob/g, 'ägaren').replace(/[A-Za-z]:\\[^\s)]*/g, '').replace(/\/(?:Users|home)\/[^\s)]*/g, '');

/** The checklist: the skill's section on what he fails, in its own words. */
function checklist(): string {
  const skill = readFileSync(path.join(CASINO, '.claude', 'skills', 'doma', 'SKILL.md'), 'utf8');
  const head = '## Vad Jakob fäller på', at = skill.indexOf(head);
  if (at < 0) throw new Error('Skillen doma saknar avsnittet "Vad Jakob fäller på".');
  const end = skill.indexOf('\n## ', at + head.length);
  return scrub(skill.slice(at, end < 0 ? undefined : end).trim());
}

type Entry = {tid: string; prov: string; modell: string; filer: string[]; input: number; cached: number; output: number; reasoning: number; kostnad: number; dom?: string};
const ledger = (): Entry[] => existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const recent = (rows: Entry[]) => rows.filter((r) => Date.now() - Date.parse(r.tid) < NIGHT_HOURS * 36e5);

/** The pictures to send, best first: per film the face over time, a sheet from the middle and the hands; then the proof's own pictures. */
function choose(proofDir: string, material: string): string[] {
  const out: string[] = [];
  const films = existsSync(material) ? readdirSync(material).filter((d) => statSync(path.join(material, d)).isDirectory() && existsSync(path.join(material, d, 'titta-har.txt'))).sort() : [];
  const perFilm = films.map((f) => {
    const d = path.join(material, f);
    const sheets = readdirSync(d).filter((n) => /^blad-\d+\.png$/.test(n)).sort();
    // the last panel: where films lie side by side, the doll (the source) comes first and the result last
    const dels = readdirSync(d).filter((n) => /^del-\d+$/.test(n)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
    const del1 = path.join(d, dels.at(-1) ?? 'del-1');
    const has = (n: string) => existsSync(path.join(del1, n)) ? [path.join(del1, n)] : [];
    return [...has('ansiktet-over-tiden.png'), ...(sheets.length ? [path.join(d, sheets[Math.floor(sheets.length / 2)])] : []), ...has('narbild-hogerhanden-01.png'), ...has('narbild-vansterhanden-01.png')];
  });
  for (let k = 0; out.length < MAX_IMAGES && perFilm.some((l) => l.length > k); k++) for (const l of perFilm) if (l[k] && out.length < MAX_IMAGES) out.push(l[k]);
  const own = readdirSync(proofDir).filter((n) => /\.(png|jpg)$/.test(n)).sort().map((n) => path.join(proofDir, n));
  for (const p of own) if (out.length < MAX_IMAGES) out.push(p);
  return out;
}

const describe = (file: string) => {
  const n = path.basename(file);
  if (n === 'ansiktet-over-tiden.png') return 'ansiktet vid 0, 25, 50, 75 och 100 % av filmen (rutnumret i hörnet); del-k är den k:te filmen där flera ligger bredvid varandra';
  if (/^blad-/.test(n)) return 'blad med var tredje ruta i hel bild (rutnummer och sekund ovanför varje ruta)';
  if (/^narbild-/.test(n)) return `närbild av ${n.includes('hoger') ? 'figurens högra hand' : n.includes('vanster') ? 'figurens vänstra hand' : 'ansiktet'}, varannan ruta (röd ram: ett ryck; orange: fingrar med fel längd; blå: handen hittas inte)`;
  return 'provets egen bild';
};

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const dry = args.includes('--torr');
  const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--bilder');
  if (!target || !existsSync(target)) { console.error('node tools/extern-domare.ts <provmapp> [--bilder a.png,b.png] [--torr]'); process.exit(2); }
  const proofDir = path.resolve(target);
  const name = path.basename(proofDir) === 'prov' ? path.basename(path.dirname(proofDir)) : path.basename(proofDir);
  const material = path.join(CASINO, 'slask', 'blackjack-dealer', 'domare', name);
  const files = opt('--bilder') ? opt('--bilder')!.split(',').map((n) => [path.join(proofDir, n), path.join(material, n)].find(existsSync) ?? n) : choose(proofDir, material);
  for (const f of files) {
    const why = refused(f);
    if (why) { console.error(`Vägrar ${path.basename(f)}: den ${why}.`); process.exit(2); }
    if (!existsSync(f)) { console.error(`Finns inte: ${path.basename(f)}.`); process.exit(2); }
  }
  if (!files.length) { console.error(`Inget underlag: kör först node tools/domare-underlag.ts ${target}`); process.exit(2); }

  const info = existsSync(path.join(proofDir, 'proof.json')) ? JSON.parse(readFileSync(path.join(proofDir, 'proof.json'), 'utf8')) : {};
  const measures = existsSync(material) ? readdirSync(material).filter((d) => existsSync(path.join(material, d, 'titta-har.txt')))
    .map((d) => scrub(readFileSync(path.join(material, d, 'titta-har.txt'), 'utf8')).split('\n').filter((l) => /^(Underlag|DEL|  Darr|  Ansiktets|    slutet|  Blicken|  Hög|  Vän)/.test(l)).join('\n')).join('\n\n').slice(0, 6000) : '';
  const images = await Promise.all(files.map(async (f) => {
    const img = sharp(f).resize({width: LONG_SIDE, height: LONG_SIDE, fit: 'inside', withoutEnlargement: true}).jpeg({quality: 85});
    const {data, info: meta} = await img.toBuffer({resolveWithObject: true});
    // its name relative to the material or the proof, never a whole path
    const from = path.relative(material, f).startsWith('..') ? proofDir : material;
    return {name: path.relative(from, f).split(path.sep).join('/'), what: describe(f), data, w: meta.width, h: meta.height};
  }));
  const prompt = [
    'Du är en oberoende domare som dömer bilder och filmer av en blackjackdealer i ägarens ställe: en 3D-docka, eller en framställd person (ingen riktig människa) gjord av en filmmodell. Ägaren är inte programmerare och dömer med ögat, strängt. Du kan inte se filmen; du ser blad med rutor ur den och närbilder.',
    `Provet heter "${scrub(String(info.title ?? name))}". Döm det du ser, inte vad provet säger om sig självt.`,
    'Checklistan, med ägarens egna ord:', checklist(),
    'Bilderna, i ordning:', ...images.map((im, i) => `${i + 1}. ${im.name}: ${im.what}`),
    measures ? `Mått som säger var det är värt att titta (de dömer inte):\n${measures}` : '',
    'Svara på svenska i JSON: domen som ägaren skulle fälla den (Bra, Nja eller Inte bra), de tre tyngsta skälen med fil och ruta eller sekund, det du skulle rätta utöver det, och hur säker du är (hög, medel, låg).',
  ].filter(Boolean).join('\n\n');

  // the cost before the call: patches of 32 pixels times 1.2 per picture, the text at about 3 characters a token, the output at its cap
  const imageTokens = images.reduce((s, im) => s + Math.ceil(Math.ceil(im.w / 32) * Math.ceil(im.h / 32) * 1.2), 0);
  const worst = (imageTokens + prompt.length / 3) * PRICE.input + MAX_OUTPUT * PRICE.output;
  const rows = recent(ledger());
  const spentProof = rows.filter((r) => r.prov === name).reduce((s, r) => s + r.kostnad, 0), spentNight = rows.reduce((s, r) => s + r.kostnad, 0);
  console.log(`${name}: ${images.length} bilder (${images.map((i) => i.name).join(', ')}), ungefär ${imageTokens} bildtecken; värsta kostnad ${worst.toFixed(3)} USD. Hittills: provet ${spentProof.toFixed(3)}, natten ${spentNight.toFixed(3)} USD.`);
  if (spentProof + worst > MAX_PROOF) { console.error(`Stannar: taket ${MAX_PROOF} USD per prov skulle passeras.`); process.exit(3); }
  if (spentNight + worst > MAX_NIGHT) { console.error(`Stannar: taket ${MAX_NIGHT} USD för natten skulle passeras.`); process.exit(3); }
  if (dry) { console.log('--torr: inget skickat.'); return; }

  if (!process.env.OPENAI_API_KEY) for (const f of [path.join(CASINO, '.env.local'), '.env.local']) { try { process.loadEnvFile(f); } catch { /* not there */ } if (process.env.OPENAI_API_KEY) break; }
  if (!process.env.OPENAI_API_KEY) { console.error('Ingen OPENAI_API_KEY i miljön eller i .env.local: den externa rösten saknas, och domen står på domaren ensam.'); process.exit(4); }

  const schema = {type: 'object', additionalProperties: false, required: ['dom', 'skal', 'ratta', 'sakerhet'], properties: {
    dom: {type: 'string', enum: ['Bra', 'Nja', 'Inte bra']},
    skal: {type: 'array', items: {type: 'object', additionalProperties: false, required: ['vad', 'fil', 'ruta'], properties: {vad: {type: 'string'}, fil: {type: 'string'}, ruta: {type: 'string'}}}},
    ratta: {type: 'array', items: {type: 'string'}},
    sakerhet: {type: 'string', enum: ['hög', 'medel', 'låg']},
  }};
  const body = {
    model: MODEL, max_output_tokens: MAX_OUTPUT, reasoning: {effort: 'medium'}, store: false,
    text: {format: {type: 'json_schema', name: 'dom', strict: true, schema}},
    input: [{role: 'user', content: [{type: 'input_text', text: prompt}, ...images.map((im) => ({type: 'input_image', detail: 'high', image_url: `data:image/jpeg;base64,${im.data.toString('base64')}`}))]}],
  };
  const res = await fetch('https://api.openai.com/v1/responses', {method: 'POST', headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const json: any = await res.json().catch(() => ({}));
  const u = json.usage ?? {};
  const cached = u.input_tokens_details?.cached_tokens ?? 0;
  const cost = ((u.input_tokens ?? 0) - cached) * PRICE.input + cached * PRICE.cached + (u.output_tokens ?? 0) * PRICE.output;
  let verdict: any = null;
  const text = (json.output ?? []).flatMap((o: any) => o.type === 'message' ? o.content ?? [] : []).find((c: any) => c.type === 'output_text')?.text;
  try { verdict = text ? JSON.parse(text) : null; } catch { verdict = null; }
  mkdirSync(path.dirname(LEDGER), {recursive: true});
  appendFileSync(LEDGER, JSON.stringify({tid: new Date().toISOString(), prov: name, modell: json.model ?? MODEL, filer: images.map((i) => i.name), input: u.input_tokens ?? 0, cached, output: u.output_tokens ?? 0,
    reasoning: u.output_tokens_details?.reasoning_tokens ?? 0, kostnad: Math.round(cost * 1e5) / 1e5, dom: verdict?.dom ?? `fel ${res.status}`}) + '\n');
  if (!res.ok || !verdict) { console.error(`Inget svar att läsa (HTTP ${res.status}): ${String(json.error?.message ?? json.status ?? '').slice(0, 300)}. Kostnad ${cost.toFixed(4)} USD.`); process.exit(1); }
  mkdirSync(material, {recursive: true});
  writeFileSync(path.join(material, 'extern-dom.json'), JSON.stringify({modell: json.model ?? MODEL, tid: new Date().toISOString(), kostnad_usd: Math.round(cost * 1e4) / 1e4, filer: images.map((i) => i.name), ...verdict}, null, 1));
  console.log(`Extern domare (OpenAI, ${json.model ?? MODEL}): ${verdict.dom} (${verdict.sakerhet}); ${cost.toFixed(4)} USD.`);
  for (const s of verdict.skal) console.log(`- ${s.vad} [${s.fil}, ${s.ruta}]`);
  if (verdict.ratta?.length) console.log(`Skulle rätta: ${verdict.ratta.join('; ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await main();
