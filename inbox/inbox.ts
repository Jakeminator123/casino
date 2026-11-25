// The inbox: how chats that work in this repo at the same time tell each other what they are doing (Jakob 2026-11-25).
// Chats cannot talk to each other, and a chat is only awake while it answers, so each one leaves a short note here
// instead: one file per chat, <chat>.json beside this file, never in Git (.gitignore). A note says when the chat last
// began or ended a round, what Jakob asked it, what it says it is doing and which files it has taken, and a message to
// the others. The inbox cleans itself: a chat has one note, written over each round, and a note not touched for twelve
// hours is removed whenever anyone runs this file.
//
//   node inbox/inbox.ts                          every note
//   node inbox/inbox.ts skriv <chat> "<text>"    what you are doing and which files you take
//   node inbox/inbox.ts till <chat> "<text>"     a message to the other chats (an empty text takes it away)
//   node inbox/inbox.ts klar <chat>              your work is pushed: the note is removed
//   node inbox/inbox.ts hook                     for a tool's hooks: the event comes as JSON on stdin
//
// In Cursor the hooks do the rest (.cursor/hooks.json): when Jakob sends a prompt the chat's note is written with the
// first words of what he asked, the other chats' notes are shown to the agent after its next tool call and again
// whenever one of them changes, and when the round ends the note says that the chat rests. A chat's name there is the
// first eight characters of its conversation id; in a tool without hooks the agent chooses a short name of its own.
import {readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

type Note = {chat: string; at: string; state: 'arbetar' | 'vilar'; asked?: string; doing?: string; says?: string; seen?: string};

const dir = import.meta.dirname;
const HOURS = 12;
const name = (raw: unknown) => String(raw ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
const file = (chat: string) => path.join(dir, `${chat}.json`);
const oneLine = (text: unknown, max: number) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const clock = (iso: string) => new Date(iso).toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});

const read = (chat: string): Note | null => {
  try { return JSON.parse(readFileSync(file(chat), 'utf8')) as Note; } catch { return null; }
};
// Written beside and moved into place, so that a reader never meets half a note.
const write = (note: Note) => {
  const text = JSON.stringify(note, null, 1), half = `${file(note.chat)}.${process.pid}.tmp`;
  try { writeFileSync(half, text); renameSync(half, file(note.chat)); }
  catch { writeFileSync(file(note.chat), text); rmSync(half, {force: true}); }
};

/** Every live note, oldest first. What is too old, or cannot be read and has lain a while, is removed on the way. */
function notes(): Note[] {
  const live: Note[] = [], now = Date.now();
  for (const entry of readdirSync(dir)) {
    const at = path.join(dir, entry);
    if (entry.endsWith('.tmp')) { if (now - statSync(at).mtimeMs > 60e3) rmSync(at, {force: true}); continue; }
    if (!entry.endsWith('.json')) continue;
    let note: Note | null = null;
    try { note = JSON.parse(readFileSync(at, 'utf8')) as Note; } catch {}
    const written = note?.chat ? Date.parse(note.at) : NaN;
    if (note && now - written < HOURS * 3600e3) { live.push(note); continue; }
    // Too old. A file that cannot be read is left for a minute first: it may be a note on its way in.
    if (Number.isFinite(written) || now - statSync(at).mtimeMs > 60e3) rmSync(at, {force: true});
  }
  return live.sort((a, b) => a.at.localeCompare(b.at));
}

const line = (n: Note) =>
  `- ${n.chat}, ${n.state} sedan ${clock(n.at)}.` + (n.asked ? ` Jakob bad: "${n.asked}"` : '') + (n.doing ? ` Gör: ${n.doing}` : '') + (n.says ? ` Säger: ${n.says}` : '');

/** What a chat is shown of the others: who they are, and how it answers. */
const board = (chat: string, others: readonly Note[]) =>
  `Inkorgen (inbox/): andra chattar arbetar i samma repo. Rör inte filer som en annan har tagit. Du är chatten ${chat}: ` +
  `skriv vad du gör och vilka filer du tar med node inbox/inbox.ts skriv ${chat} "<text>", ett meddelande till de andra med ` +
  `node inbox/inbox.ts till ${chat} "<text>".\n${others.map(line).join('\n')}`;

/** What the others say, as one word: it changes when a chat gets a new question, a new line of its own or a new message. */
const digest = (others: readonly Note[]) =>
  createHash('sha256').update(JSON.stringify(others.map((n) => [n.chat, n.asked ?? '', n.doing ?? '', n.says ?? '']))).digest('hex').slice(0, 16);

async function hook() {
  let input: Record<string, unknown> = {};
  try {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    input = JSON.parse(text) as Record<string, unknown>;
  } catch {}
  const out = (value: object) => { process.stdout.write(JSON.stringify(value)); };
  const event = String(input.hook_event_name ?? '');
  const chat = name(input.conversation_id ?? input.session_id).slice(0, 8);
  if (!chat) return out({});
  const mine = read(chat);
  // Jakob has sent a prompt: the round begins. The others are shown again after the first tool call (seen is emptied).
  if (event === 'beforeSubmitPrompt') {
    write({...(mine ?? {}), chat, at: new Date().toISOString(), state: 'arbetar', asked: oneLine(input.prompt, 200), seen: ''});
    return out({continue: true});
  }
  // A chat without a note has not been given a prompt here (a subagent): it is told by the one that started it.
  if (!mine) return out({});
  if (event === 'stop') { write({...mine, at: new Date().toISOString(), state: 'vilar'}); return out({}); }
  if (event === 'postToolUse') {
    const others = notes().filter((n) => n.chat !== chat);
    const seen = others.length ? digest(others) : '';
    if (seen === (mine.seen ?? '')) return out({});
    write({...mine, seen});
    return out(others.length ? {additional_context: board(chat, others)} : {});
  }
  out({});
}

const [command, who, ...words] = process.argv.slice(2);
if (command === 'hook') await hook();
else if (command === 'skriv' || command === 'till') {
  const chat = name(who), text = oneLine(words.join(' '), command === 'skriv' ? 300 : 400);
  if (!chat || (command === 'skriv' && !text)) { console.error(`Skriv så här: node inbox/inbox.ts ${command} <chatt> "<text>"`); process.exit(1); }
  const note: Note = {...(read(chat) ?? {state: 'arbetar' as const}), chat, at: new Date().toISOString()};
  if (command === 'skriv') note.doing = text; else if (text) note.says = text; else delete note.says;
  write(note);
  console.log(`Inkorgen: lappen för ${chat} är skriven.`);
} else if (command === 'klar') {
  const chat = name(who);
  if (!chat) { console.error('Skriv så här: node inbox/inbox.ts klar <chatt>'); process.exit(1); }
  rmSync(file(chat), {force: true});
  console.log(`Inkorgen: lappen för ${chat} är borta.`);
} else {
  const all = notes();
  console.log(all.length ? `Inkorgen:\n${all.map(line).join('\n')}` : `Inkorgen är tom: ingen chatt har skrivit på ${HOURS} timmar.`);
}
