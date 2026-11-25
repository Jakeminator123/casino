// Skyddar: publiceringsskyddet – kopian räknas som publicerad bara när den rena commiten svarar, aldrig ett smutsigt bygge.
import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForPublishedCommit} from './publish-ready.ts';

const SITE = 'https://dealer.example', SHA = 'a'.repeat(40), OLD = 'b'.repeat(40);
const meta = (sourceCommit = SHA, sourceDirty = false) => Response.json({sourceCommit, sourceDirty});

type Probe = {url: string; init: RequestInit; at: number; timeout: number; signal: AbortSignal};
function world(reply: (probe: Probe, advance: (ms: number) => void) => Response | Promise<Response>) {
  let now = 0;
  const alarms = new Map<AbortSignal, {controller: AbortController; until: number; timeout: number}>();
  const calls: Probe[] = [];
  function advance(ms: number) {
    now += ms;
    for (const [signal, {controller, until}] of alarms) {
      if (now >= until) {
        controller.abort(new DOMException('Tidsgräns', 'TimeoutError'));
        alarms.delete(signal);
      }
    }
  }
  const run = (cookie?: string, sha = SHA) => waitForPublishedCommit(SITE, sha, {
    cookie,
    now: () => now,
    sleep: async (ms) => advance(ms),
    timeoutSignal(timeout) {
      const controller = new AbortController();
      alarms.set(controller.signal, {controller, until: now + timeout, timeout});
      return controller.signal;
    },
    fetch: async (url, init = {}) => {
      const signal = init.signal!;
      const probe = {url: String(url), init, at: now, timeout: alarms.get(signal)!.timeout, signal};
      calls.push(probe);
      return reply(probe, advance);
    },
  });
  return {run, calls, time: () => now};
}

test('an old, dirty or failed answer in between starts the count over: two clean answers in a row are needed', async () => {
  const replies = [meta(), meta(OLD), meta(), meta(SHA, true), meta(), Response.json({sourceCommit: SHA, sourceDirty: false}, {status: 503}), meta(), meta()];
  const w = world(() => replies.shift()!);
  const result = await w.run();
  assert.equal(result.ready, true);
  assert.equal(result.attempts, 8);
});

test('a wrong or incomplete hash, a dirty marker or an unreadable response never passes', async () => {
  const failures = [
    () => meta(OLD),
    () => meta(SHA.slice(0, 7)),
    () => meta(SHA, true),
    () => Response.json({sourceCommit: SHA}),
    () => new Response('<!doctype html>'),
    () => Response.json({sourceCommit: SHA, sourceDirty: false}, {status: 401}),
    () => { throw Error('network failed'); },
  ];
  for (const reply of failures) {
    const w = world(reply);
    assert.equal((await w.run()).ready, false);
    assert.equal(w.time(), 30_000);
  }
  const short = world(() => meta());
  await assert.rejects(short.run(undefined, SHA.slice(0, 7)), /full commit-hash/);
  assert.equal(short.calls.length, 0);
});
