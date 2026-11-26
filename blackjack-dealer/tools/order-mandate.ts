import { lstat, mkdir, open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { mandateBudgetOf, type DirectCall, type MandateBudget, type Order, type Policy } from '../src/order-model.ts';
import { StoreError } from './placement-store.ts';

/** The API key's ledger (tools/runway-api.ts), outside Git: every direct call, written before it is sent. */
export const API_LEDGER = '.runtime/runway-api/ledger.json';

/** The direct calls in this checkout's ledger; none when it does not exist, null when it cannot be read. */
export async function readDirectCalls(root: string): Promise<DirectCall[] | null> {
  try {
    const book = JSON.parse((await readFile(path.join(root, API_LEDGER), 'utf8')).replace(/^\uFEFF/, '')) as { orders?: unknown };
    return Array.isArray(book.orders) ? (book.orders as DirectCall[]) : null;
  } catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT' ? [] : null; }
}

/** The agents' day against the standing mandate: the main agent's approvals among `orders` and the direct calls of the day of
 *  `at`. Read it under withLedgerLock when something is committed on it. */
export async function readMandateBudget(root: string, policy: Pick<Policy, 'mandate' | 'timeZone'>, orders: readonly Order[], at: string): Promise<MandateBudget> {
  return mandateBudgetOf(policy.mandate, orders, await readDirectCalls(root), at, policy.timeZone ?? 'Europe/Stockholm');
}

/** The `.git` of the checkout `root` lies in: in the project's folder or above it (the casino repo's root), or null. */
async function dotGitOf(root: string) {
  for (let dir = path.resolve(root); ; dir = path.dirname(dir)) {
    const entry = await lstat(path.join(dir, '.git')).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; });
    if (entry || path.dirname(dir) === dir) return entry;
  }
}

/** The lock beside the API key's ledger. */
export const LEDGER_LOCK = '.runtime/runway-api/ledger.lock';
const busy = (error: unknown) => ['EEXIST', 'EPERM', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '');
/**
 * The agents' day is read and committed to under one lock, across processes: an agent's approval in Beställ
 * (tools/order-store.ts approve) and every write to the API key's ledger (tools/runway-api.ts). Without it two processes
 * each see the same credits left and both commit, or one ledger write drops another's call. Waits for the other process;
 * a lock left by a process that was stopped stays, as the start lock does, until someone has looked at the ledger.
 */
export async function withLedgerLock<T>(root: string, action: () => Promise<T> | T, waitMs = 30_000): Promise<T> {
  const lock = path.join(root, LEDGER_LOCK);
  await mkdir(path.dirname(lock), { recursive: true });
  const until = Date.now() + waitMs;
  let handle;
  for (;;) {
    try { handle = await open(lock, 'wx'); break; }
    catch (error) {
      if (!busy(error)) throw error;
      if (Date.now() > until) throw new StoreError(409, `Liggaren för krediterna är låst (${LEDGER_LOCK}) sedan mer än ${Math.round(waitMs / 1000)} s. Pågår inget godkännande eller betalt anrop har en avbruten körning lämnat låset: se efter i ${API_LEDGER} att inget anrop står halvskrivet, och ta sedan bort låset.`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try { return await action(); }
  finally { await handle.close(); await rm(lock, { force: true }); }
}

/** Worktree copies have separate order media. Paid starts use the owning checkout and race for one shared lock there. */
export async function withStartLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const git = await dotGitOf(root);
  if (git && !git.isDirectory()) throw new StoreError(403, 'Starta betalda order i huvudcheckouten med den gemensamma kvittoliggaren.');
  const directory = path.join(root, '.runtime');
  await mkdir(directory, { recursive: true });
  const lock = path.join(directory, 'order-start.lock');
  let handle;
  try { handle = await open(lock, 'wx'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new StoreError(409, 'En annan tagning startas just nu. Kontrollera kvittot innan du försöker igen.');
  }
  try { return await action(); }
  finally { await handle.close(); await rm(lock, { force: true }); }
}
