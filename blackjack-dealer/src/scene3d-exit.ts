// The dealer leaves the table: how the view follows a whole-body exit film (a film of the bank whose frame says it stands
// behind the table, src/game-page.ts). The 3D page's trial of it went with its film, which showed the hands without tattoos
// (removed on Jakob's word 2026-11-26); the game has no exit film until a new one is made.
//
// The film begins in the rest pose with her hands on the table and is drawn in the usual layers until they have left it
// (behindFrom); from there it stands behind the 3D table while the camera backs away along its line of sight as she rises,
// until she and the whole table are in the picture; she walks out of it and her legs show beside the table's end. (First tried in the game with the camera in its place, tilting up and turning after her: Jakob found looking up
// at her not pretty, and the turn showed where the film's own frame ends, which cut her.)
import {solveCamera, type FilmCamera} from './scene3d-geometry.ts';

// rise: the film's frames in which she stands up, for a film whose record does not say (motion.frame.rise). When she stands the camera has moved back along its line of sight by
// `back` of its distance to the table's dealer-side edge and `lift` upward (scene units), and the view has this tilt and zoom.
export const EXIT_VIEW = {rise: [38, 64], back: 0.75, lift: 0.05, pitch: -5.5, zoom: 0.9};

export type ExitView = {yaw: number; pitch: number; zoom: number; dy: number; dz: number};
/**
 * The view at a frame of the exit film. `from` is the view she is seen in before she rises (tilt in degrees, zoom); the
 * camera then backs away along that view's own line of sight, so nothing in the picture slides sideways. `rise`: the frames
 * in which she stands up in this film (its record's motion.frame.rise). `entering`: the film is an entrance, and the same
 * way is gone backwards: the camera stands back while she walks in, and comes home over the frames in which she sits down.
 */
export function exitView(frame: number, camera: FilmCamera, from: {pitch: number; zoom: number}, rise: readonly number[] = EXIT_VIEW.rise, entering = false): ExitView {
  const [a, b] = rise, t = Math.min(1, Math.max(0, (frame - a) / (b - a))), eased = t * t * (3 - 2 * t), risen = entering ? 1 - eased : eased;
  const solved = solveCamera(camera), slope = solved.pitch - from.pitch * Math.PI / 180, reach = EXIT_VIEW.back * solved.edgeDistance * risen; // slope: radians below the horizontal
  return {yaw: 0, pitch: from.pitch + (EXIT_VIEW.pitch - from.pitch) * risen, zoom: from.zoom + (EXIT_VIEW.zoom - from.zoom) * risen, dz: reach * Math.cos(slope), dy: reach * Math.sin(slope) + EXIT_VIEW.lift * risen};
}
