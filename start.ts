// Ingången till hela casino-repot: startar studion i blackjack-dealer (servern tools/preview.ts på http://127.0.0.1:4319)
// och visar dess startsida i webbläsaren, i den flik som redan är öppen om det finns en. Studion är navet: därifrån nås
// filmerna, dockans editor, avatarerna, måtten och livebordet. Verkstäderna med en egen server (dockans editor,
// kortpaketets visare) startar studion själv första gången deras sida öppnas, och stoppar dem när den själv stoppas.
//   node start.ts          startar studion om den inte går och visar startsidan (det STARTA studion.cmd gör)
//   node start.ts stoppa   stoppar studion och de verkstäder den har startat
//   node start.ts status   säger om studion går
// Första gången på en ny dator installeras paketen och studion byggs (några minuter). Ingen sökväg till en viss dator:
// mapparna hittas från den här filens plats.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

const DEALER = path.join(import.meta.dirname, 'blackjack-dealer');
const word = (process.argv[2] ?? '').toLowerCase();

const [major] = process.versions.node.split('.').map(Number);
if (major < 24) { console.error(`Studion behöver Node 24 (den här datorn har ${process.versions.node}). Installera Node 24 från nodejs.org.`); process.exit(1); }

/** blackjack-dealer's own tool, run in its folder, with its output in this window. */
const tool = (...args: string[]) => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/preview.ts', ...args], {cwd: DEALER, stdio: 'inherit'}).status ?? 1;

if (word === 'stoppa' || word === 'stop') process.exit(tool('--stop'));
if (word === 'status') process.exit(tool('--status'));
if (word) { console.error(`Okänt ord: ${word}. Skriv node start.ts, node start.ts stoppa eller node start.ts status.`); process.exit(1); }

// three.js and the server's other packages (the studio's own are installed by the server's first start).
if (!existsSync(path.join(DEALER, 'node_modules'))) {
  console.log('Installerar paketen (en gång).');
  // npm is a .cmd on Windows and runs only through the shell there; the words are fixed.
  const r = process.platform === 'win32' ? spawnSync('npm ci', {cwd: DEALER, stdio: 'inherit', shell: true}) : spawnSync('npm', ['ci'], {cwd: DEALER, stdio: 'inherit'});
  if (r.status !== 0) { console.error('npm ci misslyckades i blackjack-dealer.'); process.exit(1); }
}
process.exit(tool('--open', '/studio/'));
