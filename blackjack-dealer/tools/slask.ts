// The scratch folder (slasken): <repo>/../slask/dealer, beside the repos, or the folder DEALER_SLASK names. It lies outside
// Git and outside the repo, and everything in it is temporary: `npm run stada` (tools/scratch-clean.ts) deletes what has not
// changed for a week. The Python scripts compute the same path themselves.
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SLASK = path.resolve(process.env.DEALER_SLASK || path.join(REPO, '..', 'slask', 'dealer'));

/** A folder in the slask (the slask itself without parts), created when it is missing. */
export function slaskDir(...parts: string[]): string {
  const dir = path.join(SLASK, ...parts);
  mkdirSync(dir, {recursive: true});
  return dir;
}
