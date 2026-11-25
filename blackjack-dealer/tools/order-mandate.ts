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

/** The agents' day against the standing mandate: the main agent's approvals among `orders` and the direct calls of the day of `at`. */
export async function readMandateBudget(root: string, policy: Pick<Policy, 'mandate' | 'timeZone'>, orders: readonly Order[], at: string): Promise<MandateBudget> {
  return mandateBudgetOf(policy.mandate, orders, await readDirectCalls(root), at, policy.timeZone ?? 'Europe/Stockholm');
}

/** Worktree copies have separate order media. Paid starts use the owning checkout and race for one shared lock there. */
export async function withStartLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const git = await lstat(path.join(root, '.git')).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; });
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
