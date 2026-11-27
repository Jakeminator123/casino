// The card plan's picture and lens: the camera that Jakob's card plan (placements/default.json, the bank's picture 1764 x 1174)
// and the checks of the bank's films (src/deal-check.ts) are read through. It is what is left of the former standard's camera
// while the card plan and those checks are: nothing records, orders or shows through it (the standard is the live table,
// src/standard.ts). Pure, no I/O.
//
// World frame: x toward the picture's right, y up, z toward the camera; the felt is y = 0 and the camera stands at
// (0, height, 0) looking along -z, pitched down. Real metres. Pixels are pixel centres of the plan's picture, origin top left.
import {add, cardCorners, cross, dot, mul, sub, unit, type Pixel, type Vec3} from './space.ts';

/** The plan's picture: the bank's frame, in pixels. */
export const FILM = {width: 1764, height: 1174};
/** A pinhole without roll: focal length in pixels, pitch below the horizontal in radians, height over the felt in metres. */
export type Lens = {focalPx: number; pitch: number; height: number};
/** Any pinhole without roll: where it stands, where it looks, and its focal length in the plan's pixels. */
export type Eye = {position: Vec3; forward: Vec3; focalPx: number};
/** The lens the bank's films were shot through, under which a real card at seat 4 has its film size and shape (fitted 2026-11-17). */
export const TABLE_LENS: Lens = {focalPx: 2334, pitch: 0.4373194931932115, height: 1.1099955533438894};

const CX = (FILM.width - 1) / 2, CY = (FILM.height - 1) / 2;
const basis = (e: Eye) => { const f = unit(e.forward), r = unit(cross(f, [0, 1, 0])); return {f, r, u: cross(r, f)}; };
const ray = (e: Eye, px: number, py: number): Vec3 => { const {f, r, u} = basis(e); return add(add(f, mul(r, (px - CX) / e.focalPx)), mul(u, -(py - CY) / e.focalPx)); };

export const filmEye = (l: Lens): Eye => ({position: [0, l.height, 0], forward: [0, -Math.sin(l.pitch), -Math.cos(l.pitch)], focalPx: l.focalPx});
/** A world point as this eye sees it, in the plan's pixels; null behind the eye. */
export function see(e: Eye, p: Vec3): Pixel | null {
  const {f, r, u} = basis(e), d = sub(p, e.position), z = dot(d, f);
  return z > 1e-9 ? {x: CX + e.focalPx * dot(d, r) / z, y: CY - e.focalPx * dot(d, u) / z} : null;
}
/** The point where the ray through a pixel meets the horizontal plane `lift` metres over the felt; null at or above the horizon. */
export function onPlane(e: Eye, px: number, py: number, lift = 0): Vec3 | null {
  const d = ray(e, px, py); return d[1] > -1e-9 ? null : add(e.position, mul(d, (lift - e.position[1]) / d[1]));
}
/** The point of the felt a pixel shows, in metres; null at or above the horizon. */
export const pixelToFelt = (pixel: Pixel, lens: Lens = TABLE_LENS): Vec3 | null => onPlane(filmEye(lens), pixel.x, pixel.y);
/**
 * A real card lying on the felt at a pixel of the plan's picture, as the lens draws it: its four corners, for heading 0 top left,
 * top right, bottom right, bottom left. `heading` turns the card on the felt (radians, positive toward the picture's right);
 * `grow` draws a card that many times a real one about the same middle. Null for a place at or above the horizon.
 */
export function realCardQuad(place: Pixel, heading = 0, grow = 1, lens: Lens = TABLE_LENS): Pixel[] | null {
  const eye = filmEye(lens), at = onPlane(eye, place.x, place.y); if (!at) return null;
  const q = cardCorners(at, heading, grow).map(p => see(eye, p)); return q.every(Boolean) ? q as Pixel[] : null;
}
