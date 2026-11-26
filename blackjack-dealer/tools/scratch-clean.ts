// npm run stada: the casino slask's three-hour rule (../slask/slask.ts) on this project's part of the slask (tools/slask.ts).
// Each top-level entry whose newest file is older than --timmar hours (default 3) is deleted; --torr lists what would go
// and deletes nothing. granska/ is never touched: what lies there waits for Jakob's verdict, however old it is
// (casino/AGENTS.md, "Tillfälligt och producerat"). Links are never followed. The server runs the rule when it starts and every third hour
// (tools/preview.ts);
// `node ../slask/slask.ts` shows the register of the whole slask, and `node ../slask/slask.ts stada` cleans every project.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stada as rule, type Options} from '../../slask/slask.ts';
import {REPO, SLASK} from './slask.ts';

export type {Options};
export const stada = (argv: string[], o: Options = {}): number => rule(argv, {slask: SLASK, repo: REPO, ...o});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = stada(process.argv.slice(2));
