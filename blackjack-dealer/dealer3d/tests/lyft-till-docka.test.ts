// Skyddar: kontrakten – Danilos och Frasses rörelser vid livebordet kommer ur filmen av de riktiga dealrarna, inte ur den
// förra standarddockans koreografi (Jakob 2026-11-27, om vänsterhanden i bytet: "en kvarleva från gamla dockan eller förra
// standarddockans rörelsemönster"). dealer3d/tools/lyft-till-docka.ts importerar ingenting ur dealer3d/src/koreo-giv.ts
// (KOREO, nyckelgreppet, version A eller B), och i en giv står varje handled där lyftet har den i filmens bild (tvärs
// synlinjen från livebordets kamera, jämnad som verktyget jämnar det) där handen är lyftets, och högst KONTAKT därifrån där en kontakt har rättat den.
//   node --test dealer3d/tests/lyft-till-docka.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {KONTAKT, LYFT, lugna, pa, type Lyft} from '../tools/lyft-till-docka.ts';
import {LIVE_CAMERA} from '../../src/table-live.ts';

const VERKTYGET = fileURLToPath(new URL('../tools/lyft-till-docka.ts', import.meta.url));

test('lyft-till-docka.ts tar ingenting ur den förra standarddockans koreografi (koreo-giv.ts)', () => {
  const kod = readFileSync(VERKTYGET, 'utf8'), importer = [...kod.matchAll(/^import[^;]*from\s+'([^']+)'/gm)].map(m => m[1]);
  assert.ok(importer.length > 0, 'verktyget har importer');
  assert.deepEqual(importer.filter(x => /koreo-giv/.test(x)), [], 'lyft-till-docka.ts importerar ur koreo-giv.ts');
  assert.doesNotMatch(kod, /\bKOREO\b\s*[.[]/, 'lyft-till-docka.ts använder KOREO');
});

test('i Danilos giv till plats 4 står handlederna där lyftet har dem', () => {
  const fil = path.join(LYFT, 'kameran-mitten-plats-4.json'), lyft = JSON.parse(readFileSync(fil, 'utf8')) as Lyft, ut = pa(fil, 'danilo');
  for (const s of ['R', 'L'] as const) {
    const jamnad = lugna(lyft.frames.map(f => f[s].w)), kod = ut.handen[s];
    let lyftets = 0;
    // (tvärs synlinjen från livebordets kamera, det filmens bild visar: djupet längs den är ett lyfts osäkra led och förankras vid kontakterna)
    ut.frames.forEach((f, t) => { if (t >= lyft.frames.length) return; const q = jamnad[t], u0 = [q[0], q[1] - LIVE_CAMERA.height, q[2]], ul = Math.hypot(...u0), u = u0.map(x => x / ul);
      const dv = f[s].w.map((x, k) => x - q[k]), along = dv.reduce((sum, x, k) => sum + x * u[k], 0), d = Math.hypot(...dv.map((x, k) => x - along * u[k]));
      if (kod[t] === 'l') { lyftets++; assert.ok(d <= 0.0015, `${s} handled ${Math.round(d * 1000)} mm från lyftet tvärs synlinjen i ruta ${t}, där handen är lyftets`); }
      if (kod[t] === 'k') assert.ok(d <= KONTAKT + 0.001, `${s} handled ${Math.round(d * 1000)} mm från lyftet tvärs synlinjen i ruta ${t}, en kontakt får högst ${KONTAKT * 1000} mm`); });
    assert.ok(lyftets + [...kod].filter(k => k === 'k').length > ut.frames.length / 3, `${s}: handen är lyftets i för få rutor`);
  }
});
