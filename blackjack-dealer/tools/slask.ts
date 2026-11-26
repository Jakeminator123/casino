// The scratch folder (slasken): <project>/../slask/blackjack-dealer, in the casino repo's slask, or the folder DEALER_SLASK
// names. Git ignores it and it lies outside the project, and everything in it is temporary: `npm run stada`
// (tools/scratch-clean.ts) deletes what has not changed for three hours. A task folder may carry a note on what it is and who owns
// it, and `node ../slask/slask.ts` lists them all (casino/AGENTS.md, "Tillfälligt och producerat"). The Python scripts compute the same path
// themselves.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SLASK = path.resolve(process.env.DEALER_SLASK || path.join(REPO, '..', 'slask', 'blackjack-dealer'));
