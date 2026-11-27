// Mäter hur dockans KROPP ritas genom en rörelse: det mat.ts inte ser. mat.ts mäter rörelsens punkter; här stegas
// editorn 60 gånger per sekund och varje gång läses var modellens axlar, armbågar, handleder och fingrar hamnade mot
// rörelsens punkter, och hur handleden och underarmen vreds (window.editor.state()). Ett hack är ett värde som byter
// fart tvärt mellan två steg. Hittade 2026-11-26 att kvinnans överkropp vreds ett halvt varv i fyra rutor när kortet
// lades på plats 5 (ryggens uträkning i dealer3d/src/figure-model.ts), som Jakob såg som att det "hackar till".
//
//   node standarddocka/verktyg/kropp.ts [--plats 4 | --alla | --runda] [--docka kvinna] [--port 4321]  (porten titta.ts tar)
//
// SPÄRR (slutar rött): en axel, armbåge eller handled som på ett steg flyttar sig SPARR millimeter eller mer från
// rörelsens punkt och inte fortsätter åt samma håll. Resten skrivs som värt att titta på: vinklarnas häftigaste byten
// av fart (underarmens vridning när kortet vänds är snabb med avsikt) och fingrarnas. Kör editorn genom titta.ts, i ett
// headless Chrome under det delade låset, en körning per plats.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const arg = (n: string, f?: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : f; };
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), docka = arg('--docka', 'man')!, RUNDA = process.argv.includes('--runda');
const platser = RUNDA ? [0] : process.argv.includes('--alla') ? [1, 2, 3, 4, 5, 6, 7] : [Number(arg('--plats', '4'))];
const HZ = 60, SPARR = 20, VISA = 4, LEDER = ['axelR', 'axelL', 'armbageR', 'armbageL', 'handledR', 'handledL'];
const KOR = `(() => { const e = window.editor, n = Math.round(e.state().langd * ${HZ}), ut = []; for (let i = 0; i <= n; i++) { e.setTime(i / ${HZ}); const s = e.state(), m = x => Math.max(...x.flat()); ut.push({t: i / ${HZ}, axelR: s.axelFranPunktenMm.R, axelL: s.axelFranPunktenMm.L, armbageR: s.armbageFranPunktenMm.R, armbageL: s.armbageFranPunktenMm.L, handledR: s.handledFranPunktenMm.R, handledL: s.handledFranPunktenMm.L, fingrarR: m(s.fingrarFranPunkternaMm.R), fingrarL: m(s.fingrarFranPunkternaMm.L), handledGraderR: s.handledGrader.ritad[0], handledGraderL: s.handledGrader.ritad[1], underarmVridR: s.vridning.underarm[0], underarmVridL: s.vridning.underarm[1]}); } return {delar: e.state().delar, rader: ut}; })()`;

let rott = false;
for (const plats of platser) {
  const vad = RUNDA ? `hela rundan, ${docka}` : `plats ${plats}, ${docka}`;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'standarddocka/verktyg/titta.ts'), ...(RUNDA ? ['--runda'] : ['--plats', String(plats)]), '--docka', docka, ...(arg('--port') ? ['--port', arg('--port')!] : []), '--kor', KOR], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64e6});
  if (r.status !== 0) { console.log(`${vad}: titta.ts föll: ${r.stderr.slice(-400)}`); rott = true; continue; }
  const {rader} = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))) as {rader: Record<string, number>[]};
  const fynd = Object.keys(rader[0]).filter(k => k !== 't').flatMap(namn => rader.slice(2).map((rad, i) => { const fore = rader[i + 1][namn] - rader[i][namn], efter = rad[namn] - rader[i + 1][namn]; return {namn, t: rader[i + 1].t, fore, efter, ryck: Math.abs(efter - fore)}; }));
  const sparr = fynd.filter(f => LEDER.includes(f.namn) && f.ryck >= SPARR), ovrigt = fynd.filter(f => !sparr.includes(f) && f.ryck >= VISA).sort((a, b) => b.ryck - a.ryck).slice(0, 6);
  const rad = (f: typeof fynd[number]) => `    ${f.t.toFixed(2)} s  ${f.namn.padEnd(14)} steget före ${f.fore.toFixed(1)}, steget efter ${f.efter.toFixed(1)}`;
  console.log(`${vad}: ${rader.length} steg. ${sparr.length ? `SPÄRR: kroppen hoppar (millimeter från rörelsens punkt) vid ${[...new Set(sparr.map(f => f.t.toFixed(2)))].slice(0, 8).join(', ')} s` : 'Ingen spärr: axlar, armbågar och handleder följer rörelsens punkter jämnt.'}`);
  for (const f of sparr.sort((a, b) => b.ryck - a.ryck).slice(0, 8)) console.log(rad(f));
  if (ovrigt.length) { console.log('  Värt att titta på (grader eller millimeter per steg):'); for (const f of ovrigt) console.log(rad(f)); }
  if (sparr.length) rott = true;
}
if (rott) process.exitCode = 1;
