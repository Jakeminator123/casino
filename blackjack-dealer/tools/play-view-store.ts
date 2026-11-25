// The play view's file (data/play-view.json; src/play-view.ts says what it is): how the game frames the picture on a
// computer and on a phone, one for every look. The lab server (tools/preview.ts, /api/play-view) reads it for its pages and
// writes it on Jakob's click in Scen ("Spara som spelvy"). Like the preset store: every write is checked, made against the
// revision the page last read (If-Match), queued, and written to a temporary file that is renamed into place. A file that
// is missing is the game's framings as they were (PLAY_VIEW), with no revision, and the first save writes it.
import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import {StoreError} from './placement-store.ts';
import {PLAY_VIEW, validatePlayView, type PlayView} from '../src/play-view.ts';

/** Bytes of the file the server takes. */
export const PLAY_VIEW_BYTES = 2048;
export type StoredPlayView = PlayView & {revision: string | null};

export function playViewStore(root: string) {
  const file = path.join(root, 'data/play-view.json'); let queue = Promise.resolve();
  const revision = (text: string) => '"' + createHash('sha256').update(text).digest('hex') + '"';
  const readText = async () => { try { return await readFile(file, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; } };
  // The file as the pages get it. A file that does not hold up is an error of the studio, not of the page.
  function parse(text: string): StoredPlayView {
    let value: unknown; try { value = JSON.parse(text); } catch { throw new StoreError(500, 'Spelvyn är inte giltig JSON.'); }
    const {view, errors} = validatePlayView(value); if (!view) throw new StoreError(500, `Spelvyn håller inte: ${errors.join('; ')}.`);
    const updatedAt = typeof (value as {updatedAt?: unknown}).updatedAt === 'string' ? (value as {updatedAt: string}).updatedAt : '';
    return {...view, updatedAt, revision: revision(text)};
  }
  async function load(): Promise<{view: StoredPlayView}> { const text = await readText(); return {view: text === null ? {...PLAY_VIEW, revision: null} : parse(text)}; }
  /** Saves the play view against the revision last read (none while there is no file). The answer is the view as kept. */
  async function save(value: unknown, expected: string | undefined): Promise<{view: StoredPlayView}> {
    const {view, errors} = validatePlayView(value);
    if (!view) throw new StoreError(400, `Spelvyn håller inte: ${errors.join('; ')}.`);
    const task = queue.then(async () => {
      const before = await readText();
      if (before !== null && !expected) throw new StoreError(428, 'Läs spelvyn innan du sparar över den.');
      if (before !== null && revision(before) !== expected) throw new StoreError(409, 'Spelvyn har ändrats i en annan flik. Läs in den igen.');
      if (before === null && expected) throw new StoreError(409, 'Spelvyn finns inte längre. Spara den som ny.');
      const kept: PlayView = {...view, updatedAt: new Date().toISOString()}, text = JSON.stringify(kept, null, 2) + '\n';
      await mkdir(path.dirname(file), {recursive: true}); const temporary = path.join(path.dirname(file), `.${randomUUID()}.tmp`); await writeFile(temporary, text, {flag: 'wx'}); await rename(temporary, file);
      return {view: {...kept, revision: revision(text)}};
    });
    queue = task.then(() => {}, () => {}); return task;
  }
  return {load, save};
}
