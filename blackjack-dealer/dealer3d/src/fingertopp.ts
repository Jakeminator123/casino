// Fingertoppen på en riggad dockas hud. Fingrarnas tredje ben har ingen svans i modellen (en GLB bär bara benens
// huvuden, och Blenders svans är påhittad), så toppen mäts på huden: de hörn som hänger på det tredje benet, deras
// längdaxel, fingrets slut längs den och fingrets radie strax innan. Toppens punkt är mitt i fingertoppens rundning, en
// radie innanför slutet: där rörelsens toppkula (hand-rule.ts DRAWN) har sin mitt, så att kulan och huden rör kortet på
// samma ställe. Mäts så av dealer3d/src/figure-model.ts (hur det tredje benet riktas). Rent: ingen I/O och ingen three.js.
import {add, dot, length, mul, sub, unit, type Vec3} from '../../src/space.ts';

const medel = (p: Vec3[]): Vec3 => mul(p.reduce((s, q) => add(s, q), [0, 0, 0] as Vec3), 1 / p.length);
/** Huvudaxeln i ett moln av punkter (potensmetoden på kovariansen), åt samma håll som `ungefar`. */
function huvudaxel(moln: Vec3[], ungefar: Vec3): Vec3 {
  const c = medel(moln), C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of moln) { const d = sub(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
  let v = unit(ungefar); for (let k = 0; k < 100; k++) v = unit([0, 1, 2].map(i => C[i][0] * v[0] + C[i][1] * v[1] + C[i][2] * v[2]) as Vec3);
  return dot(v, ungefar) < 0 ? mul(v, -1) : v;
}
/**
 * Toppen för fingret vars tredje ben börjar i `h3` (det andra i `h2`), ur hudens hörn `moln` på det tredje benet:
 * `punkt` mitt i toppens rundning, `radie` fingrets radie 5–10 mm innanför slutet, `vinkel` (grader) mellan det tredje
 * benet (från h3 till punkten) och det andra. Null om hörnen inte räcker.
 */
export function fingertopp(h2: Vec3, h3: Vec3, moln: Vec3[]): {punkt: Vec3; radie: number; vinkel: number} | null {
  if (moln.length < 20) return null;
  const d = huvudaxel(moln, sub(medel(moln), h3)), s = moln.map(p => dot(sub(p, h3), d)), slut = Math.max(...s);
  const snitt = moln.filter((_, i) => s[i] > slut - 0.010 && s[i] < slut - 0.005); if (snitt.length < 6) return null;
  const mitt = medel(snitt), radie = snitt.reduce((x, p) => { const q = sub(p, mitt); return x + length(sub(q, mul(d, dot(q, d)))); }, 0) / snitt.length;
  const punkt = add(mitt, mul(d, slut - radie - dot(sub(mitt, h3), d)));
  return {punkt, radie, vinkel: Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(punkt, h3)), unit(sub(h3, h2)))))) * 180 / Math.PI};
}
