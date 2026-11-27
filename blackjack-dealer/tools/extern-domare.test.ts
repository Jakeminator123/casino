// Skyddar: personer – inget ur filmen av riktiga dealrar (live-bj/) eller hans egna foton (private/) skickas till den
// externa domaren, och orden som skickas bär varken hans namn eller en sökväg.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {refused, scrub} from './extern-domare.ts';

const root = path.resolve('..');

test('a file under live-bj/, private/ or outside the repo is refused', () => {
  assert.match(refused(path.join(root, 'live-bj', 'rutor', 'jamfor', 'x.png')) ?? '', /live-bj/);
  assert.match(refused(path.join(root, 'blackjack-dealer', 'private', 'referenser', 'x.png')) ?? '', /private/);
  assert.match(refused(path.join(root, '..', 'x.png')) ?? '', /utanför/);
  assert.equal(refused(path.join(root, 'slask', 'blackjack-dealer', 'domare', 'p', 'blad-01.png')), null);
  assert.equal(refused(path.join(root, 'blackjack-dealer', 'assets', 'proofs', 'p', 'a.png')), null);
});

test('the words sent carry neither his name nor a path', () => {
  const out = scrub('Jakobs dom: Jakob såg C:\\Users\\someone\\film.mp4 och /Users/someone/x.png');
  assert.doesNotMatch(out, /Jakob|Users|someone/);
  assert.match(out, /ägarens dom: ägaren såg/);
});
