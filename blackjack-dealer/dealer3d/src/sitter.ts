// Hur en riggad docka sitter under bordet (dealer3d/src/figure-model.ts ställer låren och smalbenen så). Rent: ingen I/O
// och ingen three.js.
import type {Vec3} from '../../src/space.ts';

/**
 * Låren framåt under bordet, lite utåt och lite nedåt: så har dockan alltid suttit (`fall` 0,08). Sitter höften högre än
 * `fran` (meter, filten är 0) lutar de mer nedåt, `brant` för varje meter, så att låren går under bordets sarg (16 cm
 * under filten) när standarddockan sitter högre (Jakob valde 2026-11-26 axlarna 0,31 m över filten: höften 0,16 m under
 * den). Dockor som sitter lägre (Paow 0,278 m, den vita standarddockan 0,2 m) ritas som förut.
 */
export const LAR = {ut: 0.12, fall: 0.08, fran: -0.19, brant: 6};
/** Lårets riktning (från höft- till knäleden, behöver inte vara en enhetsvektor) för höften på höjden `hoftY`; `hoger`: hans högra lår. */
export const larRiktning = (hoftY: number, hoger: boolean): Vec3 => [hoger ? -LAR.ut : LAR.ut, -(LAR.fall + Math.max(0, hoftY - LAR.fran) * LAR.brant), 1];
