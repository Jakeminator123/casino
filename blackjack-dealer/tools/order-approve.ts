// An approval from the chat: the same store function as Jakob's click in Beställ (tools/order-store.ts approve: nothing
// waits or is missing, the policy in data/order-policy.json, the way holds or this is its one pilot (src/order-ways.ts,
// Jakob 2026-11-24; no flag goes past it), the order's hash frozen). --mandate is the main agent's own, on the standing
// mandate (Jakob 2026-11-25: up to askAbove credits, within the agents' day), written as by huvudagent with its task.
// --jakob records Jakob's own yes from the chat, his words and the date, written as by jakob: a larger order goes only
// that way or by his click. Or a draft set aside (AVBRUTEN) with why. The route for his click keeps writing jakob and
// never takes "by" from a page. Placing stays tools/order-put.ts and ../.claude/skills/bestalla-film/SKILL.md.
//
//   node tools/order-approve.ts <id> --mandate "<the task, on whose word>"   the main agent approves a draft
//   node tools/order-approve.ts <id> --jakob "<his words and date>"         Jakob's yes from the chat
//   node tools/order-approve.ts <id> --set-aside "<why>"                    set a draft aside
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StoreError } from './placement-store.ts';
import { orderStore } from './order-store.ts';
import { credits } from '../src/order-model.ts';
import { wayAnswer } from '../src/order-ways.ts';

/** Approves or sets aside one draft in the repo at `root`; returns what the command prints. */
export async function approveCommand(root: string, args: string[], options: { now?: () => Date } = {}): Promise<Record<string, unknown>> {
  const [id, flag, text, ...rest] = args;
  if (!id || !['--mandate', '--jakob', '--set-aside'].includes(flag ?? '') || !text?.trim() || rest.length) throw new StoreError(400, 'Använd: node tools/order-approve.ts <id> --mandate "<uppdraget, på vems ord>" | --jakob "<Jakobs ord och datum>" | --set-aside "<varför>"');
  const store = orderStore(root, options);
  const { revision } = await store.load(id);
  if (flag === '--set-aside') {
    const { order } = await store.setAside(id, revision, text, 'huvudagenten');
    return { ok: true, id, status: order.status, setAside: order.setAside };
  }
  const { order, check } = await store.approve(id, revision, { by: flag === '--jakob' ? 'jakob' : 'huvudagent', mandate: text }).catch((error: StoreError) => {
    if (flag === '--mandate' && error.status === 403 && /Jakob avgör/.test(error.message)) throw new StoreError(403, `${error.message} Han klickar i Beställ, eller så förs hans ja från chatten in med node tools/order-approve.ts ${id} --jakob "<hans ord och datum>".`);
    throw error;
  });
  // What the approval rested on: the way's state and what it is counted from (his blocks in Granska, his yes in Beslut).
  const tried = await store.ways().catch(() => null), way = tried ? wayAnswer(order, tried.book, tried.methods, tried.rendered) : null;
  return {
    ok: true, id, title: order.title, status: order.status, approval: order.approval,
    ...(way ? { way: `${way.chip}: ${way.words}. ${way.basis}` } : {}),
    cost: { total: order.cost.total, worstTotal: order.cost.worstTotal },
    ...(check.day ? { day: { ...check.day, words: `Agenterna i dag: ${credits(check.day.after)} av ${credits(check.day.of)} krediter med den här (${credits(check.day.before)} före).` } } : {}),
    balanceAfter: check.balanceAfter,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  try {
    if (path.resolve(process.cwd()).toLowerCase() !== root.toLowerCase()) throw new StoreError(400, 'Kör från dealer-katalogen.');
    console.log(JSON.stringify(await approveCommand(root, process.argv.slice(2)), null, 2));
  } catch (error) { console.error(`[RÖD] ${(error as Error).message}`); process.exitCode = 1; }
}
