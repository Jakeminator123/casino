// A doll's arm: two bones from the shoulder to the wrist, bent at the elbow toward a pole, and the turn the motions are
// built with. Pure: no I/O and no three.js.
import {add, cross, dot, length, mul, sub, unit, type Vec3} from '../../src/space.ts';
export type {Frame} from './doll.ts';

export type Arm = {shoulder: Vec3; elbow: Vec3; wrist: Vec3; reached: boolean};

/** A vector turned about a unit axis (Rodrigues). */
export const turned = (v: Vec3, axis: Vec3, angle: number): Vec3 => add(add(mul(v, Math.cos(angle)), mul(cross(axis, v), Math.sin(angle))), mul(axis, dot(axis, v) * (1 - Math.cos(angle))));
/** Two bones from shoulder to wrist, the elbow bent toward `pole`. A wrist out of reach is brought in along the line to it. */
export function arm(shoulder: Vec3, wrist: Vec3, pole: Vec3, bones: {upperArm: number; forearm: number}): Arm {
  const a = bones.upperArm, b = bones.forearm, far = length(sub(wrist, shoulder)), d = Math.max(Math.abs(a - b) + 1e-4, Math.min(a + b - 1e-4, far)), dir = unit(sub(wrist, shoulder));
  const along = (a * a - b * b + d * d) / (2 * d), out = Math.sqrt(Math.max(0, a * a - along * along)), side = unit(sub(pole, mul(dir, dot(pole, dir))));
  return {shoulder, elbow: add(add(shoulder, mul(dir, along)), mul(side, out)), wrist: add(shoulder, mul(dir, d)), reached: Math.abs(far - d) < 1e-6};
}
