// Skyddar: publiceringsskyddet – kontrollen före push stoppar nycklar, .env-filer, media, stora filer och sökvägar till en
// viss dator.
// The push check (.githooks/check.ts): what stops, what goes through, and which commits a push brings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {changes, inspectBlob, machinePaths, outgoing, scan, testRuns} from './check.ts';

// Each fake key is put together here, so that this file never looks like one to the check.
const KEYS = [
  'gh' + 'p_' + 'A1b2C3d4'.repeat(5),
  's' + 'k-proj-' + 'x9'.repeat(24),
  'key' + '_' + 'ab12'.repeat(32),
  'vercel_blob_rw_' + 'Store123' + '_' + 'Q'.repeat(30),
  'ms' + 'y_' + 'M'.repeat(36),
  '-----BEGIN ' + 'PRIVATE KEY-----',
];
const red = (name: string, body: string | Buffer) => inspectBlob(name, Buffer.isBuffer(body) ? body : Buffer.from(body)).filter(f => f.level === 'RED');

test('a key, an environment file, a filled example, media, a key file and a large file stop', () => {
  for (const key of KEYS) {
    const found = red('src/settings.ts', `export const value = '${key}';\n`);
    assert.equal(found.length, 1, key.slice(0, 6));
    assert.ok(found[0].message.includes('hemlighet') && !found[0].message.includes(key), 'the finding names the kind, never the value');
  }
  assert.equal(red('docs/x.txt', 'RUNWAY_API_KEY=' + 'r'.repeat(30) + '\n').length, 1, 'a filled line of an environment');
  for (const name of ['.env', 'blackjack-dealer/.env.local', 'avatar-auto-pipeline/.ENV.production']) assert.equal(red(name, '').length, 1, name);
  assert.equal(red('avatar-auto-pipeline/.env.example', 'OPENAI_API_KEY=\nMESHY_API_KEY=abc\n').length, 1, 'an example with a value');
  for (const name of ['assets/a.mp4', 'output/dealer.glb', 'x/photo.JPG', 'models/hand.task', 'tools/blender.zip', 'cert.pem']) assert.equal(red(name, 'x').length, 1, name);
  assert.equal(red('studio/app/favicon.ico', Buffer.alloc(200 * 1024)).length, 1, 'an icon over the icon limit is media');
  assert.ok(red('data/big.json', Buffer.alloc(5 * 1024 * 1024 + 1, 'a')).some(f => f.message.includes('5 MB')));
});

test('an example with empty values, ordinary code, a small icon and the check itself go through', () => {
  assert.deepEqual(red('avatar-auto-pipeline/.env.example', '# Nycklar\nOPENAI_API_KEY=\nANTHROPIC_API_KEY_FOR_THE_BOT=""\nexport RUNWAY_API_KEY= # tom\n'), []);
  assert.deepEqual(red('src/a.ts', 'const key = process.env.OPENAI_API_KEY;\nconst token = "kort";\nexport const ask = "sk-" + id;\n'), []);
  assert.deepEqual(red('studio/app/favicon.ico', Buffer.alloc(4000)), []);
  assert.deepEqual(red('studio/app/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'), []);
  for (const file of ['check.ts', 'check.test.ts', 'pre-push']) assert.deepEqual(red(`.githooks/${file}`, readFileSync(new URL(file, import.meta.url))), [], file);
  assert.deepEqual(inspectBlob('tools/x.bin', Buffer.from([1, 0, 2])).map(f => f.level), ['WARN'], 'unknown binary content is only a warning');
});

// Each real-looking path is put together here as well (a user kalle, a folder jobb, a server nas: no example names), so
// that this file never holds one.
const PATHS = [
  'C:' + '/Users/' + 'kalle/x.png',
  'D:' + '\\' + 'jobb\\film.mp4',
  'c:' + '\\\\' + 'jobb\\\\x',
  'file:///' + 'E:' + '/jobb/x.json',
  '/c/' + 'Users/kalle/dev',
  '/d/' + 'jobb/tmp',
  '/mnt/d/' + 'jobb/x',
  '/Users/' + 'kalle/Desktop',
  '/home/' + 'kalle/x',
  '\\\\' + 'nas\\media\\x.mp4',
  '\\\\\\\\' + 'nas\\\\media',
  '\\\\?\\' + 'D:' + '\\jobb',
  '\\\\wsl$\\Ubuntu\\home\\' + 'kalle',
  'C:\\Users\\' + 'Anna Bergström\\x',
  'C:/Users/' + 'Someone2/x',
];

test('a path of one computer stops in every form, and the finding names the line, not the path', () => {
  for (const p of PATHS) {
    const found = red('docs/x.md', `En rad.\nSe ${p} här.\n`);
    assert.equal(found.length, 1, p);
    assert.ok(found[0].message.includes('rad 2') && !found[0].message.includes(p) && found[0].message.includes('someone'), p);
  }
  assert.equal(red('data/x.json', `{"from": "${'C:' + '\\\\Users\\\\' + 'kalle'}\\\\x.png"}`).length, 1, 'a path in JSON, its backslashes doubled');
  assert.equal(red('src/x.ts', `const a = '${'D:' + '\\\\\\\\' + 'jobb'}';`).length, 1, 'a string in code with four backslashes');
  assert.deepEqual(machinePaths(`a\nb ${PATHS[0]}\nc\n${PATHS[4]} och ${PATHS[7]}`), [2, 4]);
});

test('the made-up names of the tests, Windows\' own folders, a variable and what only looks like a path go through', () => {
  for (const fine of [
    'C:/Users/someone/dev', 'D:/x/y', 'C:/x.png', 'D:/exempel/tmp', 'C:\\Users\\Anna Berg\\Desktop', '/c/Users/x/y', '/Users/someone/y',
    '\\\\wsl$\\Ubuntu\\home\\x', '\\\\?\\c:\\x', '\\\\exempel\\media', 'c:\\\\Users\\\\someone\\\\x',
    'C:/Windows/Fonts/segoeui.ttf', 'C:\\Program Files\\Blender Foundation\\', 'C:/Program Files (x86)/x', 'C:/ProgramData/x',
    '%USERPROFILE%\\AppData\\Local', '$HOME/.config/x', '~/.claude/x', 'C:\\Users\\…', '/c/Users, /d/…',
    'https://example.com/a/b', 'git@github.com:x/y.git', 'kl. 21:40', 'assets/x/y.png', '../a/b', 'blackjack-dealer\\assets\\x', '/studio/karta/',
    '/^(\\d{4})T\\d\\d:\\d\\d$/', 'new RegExp(`const\\\\s+\\\\{[\\\\s\\\\S]*?\\\\}`)', "new RegExp('\\\\bword\\\\b')", 'e?s=i:/höjd/i.test(a)', 'new URL(e,"x:/")',
  ]) assert.deepEqual(red('docs/x.md', `Se ${fine} här.\n`), [], fine);
  assert.deepEqual(red('data/notes.json', '{"text": "Film B:' + '\\nbra, A:' + '\\tx"}'), [], 'in JSON a lone backslash is an escape, not a path');
  assert.deepEqual(red('assets/x.png', 'C:' + '/Users/' + 'kalle'), red('assets/x.png', 'x'), 'media is judged as media only');
});

test('a push brings the commits the remotes lack: for a new branch only its own, read from Git and not from the working tree', t => {
  const repo = mkdtempSync(path.join(tmpdir(), 'casino-check-'));
  t.after(() => rmSync(repo, {recursive: true, force: true}));
  const env = {...process.env};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  const git = (...args: string[]) => {
    const r = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], {cwd: repo, env, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  const commit = (file: string, body: string) => {
    writeFileSync(path.join(repo, file), body);
    git('add', '-f', '--', file);
    git('commit', '-q', '--no-verify', '-m', file);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  const pushed = commit('.env', 'KEY=x\n');
  git('update-ref', 'refs/remotes/origin/main', pushed);
  git('switch', '-q', '-c', 'ny');
  const first = commit('a.ts', 'export const a = 1;\n'), second = commit('b.png', 'x');
  const zero = '0'.repeat(40);

  const commits = outgoing(repo, `refs/heads/ny ${second} refs/heads/ny ${zero}\nrefs/heads/gammal ${zero} refs/heads/gammal ${pushed}\n`);
  assert.deepEqual(new Set(commits), new Set([first, second]), 'the commit on origin/main and the deleted ref bring nothing');
  assert.deepEqual(outgoing(repo, `refs/heads/ny ${second} refs/heads/ny ${first}\n`), [second], 'from a known remote commit');
  assert.deepEqual(outgoing(repo, ''), []);
  assert.throws(() => outgoing(repo, 'refs/heads/ny HEAD refs/heads/ny HEAD\n'), /Oväntad rad/);

  const files = changes(repo, commits);
  assert.deepEqual(files.map(f => f.path).sort(), ['a.ts', 'b.png']);
  rmSync(path.join(repo, 'b.png'));
  assert.deepEqual(scan(repo, files).map(f => f.path), ['b.png']);
  assert.deepEqual(testRuns(repo, ['.githooks/check.ts', 'a.ts']).map(r => r.command), ['node --test .githooks/*.test.ts']);
});
