// Skyddar: beställningarna – kredittaket för anrop genom API-nyckeln: anropet står i liggaren innan det går, två samtidiga anrop tappar aldrig varandras post och ryms aldrig båda i det som är kvar av agenternas dygn.
// tools/runway-api.ts send against a ledger in a temporary folder and a Runway that charges nothing: no call leaves the machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NotSent, send, type Runway } from './runway-api.ts';
import { API_LEDGER } from './order-mandate.ts';

type Entry = { name: string; requestedAt?: string; taskId?: string; status?: string };
const ledgerOf = async (root: string): Promise<Entry[]> => JSON.parse(await readFile(path.join(root, API_LEDGER), 'utf8')).orders;

async function folder(t: { after(fn: () => Promise<void>): void }, perDayCredits: number) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'runway-api-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'data/orders'), { recursive: true });
  await writeFile(path.join(root, 'data/order-policy.json'), JSON.stringify({ enabled: true, maxPerOrder: 2000, timeZone: 'Europe/Stockholm', mandate: { id: 'test-staende', askAbove: 500, perDayCredits } }));
  return root;
}
/** A Runway that charges nothing. Its calls wait until `together` of them have gone, so that they are under way at once;
 *  each notes whether the ledger had its entry, with no task id, when it went. */
function pretend(root: string, together: number) {
  const posted: string[] = [], bookedFirst: boolean[] = [];
  let go!: () => void; const gate = new Promise<void>((resolve) => { go = resolve; });
  const runway: Runway = {
    filled: async (body) => ({ body, files: {} }),
    balance: async () => 5000,
    post: async (_endpoint, body) => {
      const n = (body as { n: string }).n;
      bookedFirst.push((await ledgerOf(root)).some((e) => e.name === `prov-${n}` && !!e.requestedAt && !e.taskId));
      posted.push(n);
      if (posted.length === together) go();
      await gate;
      return { ok: true, status: 200, json: { id: `task-${n}` } };
    },
  };
  return { runway, posted, bookedFirst };
}
const call = (n: string, credits: number) => ({ name: `prov-${n}`, what: 'prov', endpoint: '/v1/image_to_video', body: { n }, expectCredits: credits });

test('two calls at once both keep their entry in the ledger, each written before its call went', async (t) => {
  const root = await folder(t, 2500), { runway, posted, bookedFirst } = pretend(root, 2);
  const sent = await Promise.all(['a', 'b'].map((n) => send(call(n, 300), {}, root, runway)));
  assert.deepEqual(sent.map((e) => e.taskId).sort(), ['task-a', 'task-b']);
  assert.deepEqual(posted.sort(), ['a', 'b']);
  assert.deepEqual(bookedFirst, [true, true]);
  const book = await ledgerOf(root);
  assert.deepEqual(book.map((e) => [e.name, e.status, e.taskId]).sort(), [['prov-a', 'LAGD', 'task-a'], ['prov-b', 'LAGD', 'task-b']]);
});

test('two calls at once never both fit in what is left of the agents\' day, the floor holds, and one name is sent once', async (t) => {
  const root = await folder(t, 500), { runway, posted } = pretend(root, 1);
  const both = await Promise.allSettled(['a', 'b'].map((n) => send(call(n, 300), {}, root, runway)));
  assert.deepEqual(both.map((b) => b.status).sort(), ['fulfilled', 'rejected']);
  assert.match(String((both.find((b) => b.status === 'rejected') as PromiseRejectedResult).reason), /ryms inte i agenternas/);
  assert.equal(posted.length, 1);
  assert.equal((await ledgerOf(root)).length, 1);

  // The floor holds against the pot as it stands when the call is about to go: refused before anything is sent or written.
  const low = await folder(t, 2500), floor = pretend(low, 1);
  const policy = JSON.parse(await readFile(path.join(low, 'data/order-policy.json'), 'utf8'));
  await writeFile(path.join(low, 'data/order-policy.json'), JSON.stringify({ ...policy, minBalance: 4800 }));
  await assert.rejects(send(call('d', 300), {}, low, floor.runway), (error: Error) => error instanceof NotSent && /golvet 4800/.test(error.message));
  assert.deepEqual(floor.posted, []);

  const again = await folder(t, 2500), twice = pretend(again, 1);
  const same = await Promise.allSettled([send(call('c', 100), {}, again, twice.runway), send(call('c', 100), {}, again, twice.runway)]);
  assert.deepEqual(same.map((b) => b.status).sort(), ['fulfilled', 'rejected']);
  assert.match(String((same.find((b) => b.status === 'rejected') as PromiseRejectedResult).reason), /redan i liggaren/);
  assert.deepEqual(twice.posted, ['c']);
});
