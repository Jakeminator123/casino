// "Ta bort provet" in Granska, Prov (DELETE /api/proofs/<id>, tools/preview.ts): a proof's folder goes on Jakob's click, and
// his click is his word, also for paid films (the root AGENTS.md: paid media goes only on his word). It goes the way
// everything removed on his word goes (tools/media-thin.ts removeOnWord): into the trash .runtime/papperskorg/<day>/ for 14
// days, with a receipt in .runtime/cleanup/, and refused while a register still points at it (a card in Beslut, the
// online copy's release, a role in Material): the pointer goes first. The proof's films waiting for his verdict in the
// slask (slask/<project>/granska/<id>/) follow it into the same day's trash. His notes (data/proof-notes.json) are never
// touched: a note on a proof that is gone stays his.
import {cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync} from 'node:fs';
import path from 'node:path';
import {removeOnWord, TRASH} from './media-thin.ts';

export const PROOF_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export type ProofRemoval = {removed: string[]; refused: string | null};

/** Where a pointer stands, in the studio's words (the registers of media-thin.ts WORD_POINTERS, and a draft order). */
const POINTERS: [RegExp, string][] = [
  [/data\/decisions\.json/, 'Det har ett kort i Beslut: svara på kortet, så tas det bort när svaret är utfört.'],
  [/data\/studio-release\.json/, 'Det finns med i kopian på nätet.'],
  [/data\/media-roles\.json/, 'En bild ur det har en roll i Material.'],
  [/data\/dealer-(?:trees|compositions)\.json/, 'Det används i Karta.'],
  [/data\/speech-patches\.json/, 'Det används av en munlapp.'],
  [/data\/orders\//, 'Ett utkast till beställning använder det.'],
];
export const refusalWords = (reason: string): string =>
  POINTERS.find(([p]) => p.test(reason))?.[1] ?? (/skyddad/.test(reason) ? 'Det är skyddat också på ditt ord.' : 'Det gick inte att ta bort.');

export async function removeProof(repo: string, id: string, o: {slask?: string; now?: number} = {}): Promise<ProofRemoval> {
  if (!PROOF_ID.test(id)) throw new Error('Inget prov heter så.');
  const unit = `assets/proofs/${id}`;
  if (!existsSync(path.join(repo, unit))) throw new Error('Provet finns inte längre.');
  const now = o.now ?? Date.now(), trash = path.join(repo, TRASH);
  mkdirSync(trash, {recursive: true});
  const {result} = await removeOnWord([unit], {repo, why: `Jakob tryckte Ta bort provet i Prov (${id})`, trash, receiptDir: path.join(repo, '.runtime/cleanup'), now});
  if (result.refused.length) return {removed: [], refused: result.refused.map(r => refusalWords(r.reason)).join(' ')};
  if (result.error) throw new Error(result.error);
  const removed = [unit];
  const slask = o.slask ?? path.resolve(repo, '..', 'slask'), day = new Date(now).toISOString().slice(0, 10);
  const projects = existsSync(slask) ? readdirSync(slask, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name) : [];
  for (const project of projects) {
    const dir = path.join(slask, project, 'granska', id);
    if (!existsSync(dir)) continue;
    const to = path.join(trash, day, 'slask', project, 'granska', id);
    mkdirSync(path.dirname(to), {recursive: true});
    try { renameSync(dir, to); } catch { cpSync(dir, to, {recursive: true}); rmSync(dir, {recursive: true, force: true}); }
    removed.push(`slask/${project}/granska/${id}`);
  }
  return {removed, refused: null};
}
