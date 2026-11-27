// What lies on the table but is no key of the scene's state: the chip tray's model, the 3D shoe and the chips, and the table's own
// things that no film shows. Each is a module of the lab (src/game3d-props.ts, game3d-tray.ts, game3d-chips.ts), read from the lab
// server the first time it is asked for, and laid in the scene as a prop, as the game (src/game-page.ts, the tray and liveProps) and
// the lab's 3D page (src/scene3d-ui.ts chipsLab, shoe) do it. At the live table (the scene's set-up, src/uppsattning.ts: no tray) the
// game lays no tray but the table's clear shoe and discard box with their cards, drawn from the measures: so does Scen, whatever
// Brickans modell says, and the former standard's tray comes back with it. Nothing here is saved; a new scene starts without them
// and the view asks again.
import { UPPSATTNING, type UppsattningId } from "../../../src/uppsattning.ts";
import { labModule } from "../../lib/lab.ts";
import type { Scene } from "../stage/engines.ts";

type Props = typeof import("../../../src/game3d-props.ts");
type Trays = typeof import("../../../src/game3d-tray.ts");
type ChipsModule = typeof import("../../../src/game3d-chips.ts");
type Geometry = typeof import("../../../src/scene3d-geometry.ts");
type Freeable = { group: { traverse(fn: (o: unknown) => void): void } };

/** The tray: the scene's built one (state key tray), Jakob's model as the game lays it, or the house tray with its own chips (lab trial). */
export type TrayModel = "byggd" | "jakobs" | "huset";
export type ExtrasState = { tray: TrayModel; shoe: boolean; chips: boolean };
export type ExtrasNote = { what: "tray" | "shoe" | "chips"; text: string } | null;

const BETS: Record<number, number[]> = { 2: [25, 25, 100], 4: [5, 5, 25], 6: [100, 500] };
const now = () => performance.now() / 1000;

// A model read from a GLB has nothing to free once the scene's renderer is gone, but its geometries and materials are let go anyway.
function free(prop: Freeable | null) {
  prop?.group.traverse((o) => {
    const mesh = o as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
    mesh.geometry?.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) m.dispose();
  });
}

export function createExtras(scene: Scene, onNote: (note: ExtrasNote) => void) {
  let gone = false;
  let want: ExtrasState = { tray: "byggd", shoe: false, chips: false };
  let tray: { kind: TrayModel; remove: () => void; prop: Freeable } | null = null;
  let trayAsked = 0;
  let shoe: { remove: () => void; off: () => void; prop: Freeable } | null = null;
  let shoeAsked = 0;
  let chips: { made: ReturnType<ChipsModule["createChips"]>; remove: () => void; off: () => void } | null = null;
  let chipsLoad: Promise<void> | null = null;
  let gloss = 0.5;
  // The table the scene stands at (setTable), and its own shoe and box when it has them (the live table's liveProps).
  let table: UppsattningId = scene.uppsattning;
  let own: { remove: () => void; prop: Freeable } | null = null;
  let ownAsked = 0;

  async function setTray(kind: TrayModel) {
    want = { ...want, tray: kind };
    const asked = ++trayAsked;
    const laid: TrayModel = UPPSATTNING[table].bricka ? kind : "byggd"; // a table without a tray gets none (the scene hides its built one)
    if (tray?.kind === laid) return;
    if (tray) {
      tray.remove();
      free(tray.prop);
      tray = null;
      scene.notch(null);
    }
    if (laid === "byggd") return;
    try {
      const made =
        laid === "jakobs"
          ? await (await labModule<Props>("game3d-props")).loadTray(scene)
          : (await labModule<Trays>("game3d-tray")).createHouseTray(scene);
      if (gone || asked !== trayAsked) return;
      scene.notch(made.notch);
      tray = { kind: laid, remove: scene.addProp(made), prop: made };
      onNote(null);
    } catch {
      if (!gone && asked === trayAsked) onNote({ what: "tray", text: laid === "jakobs" ? "Jakobs bricka (assets/props/tray.glb) finns inte på den här datorn." : "Husets bricka kunde inte läsas." });
    }
  }

  // The table's own things that no film shows, as the game lays them: at a table without a tray (the live table) its clear shoe and
  // discard box with their cards (liveProps), and no tray; at the former standard the tray, and the shoe is the film's.
  async function setTable(id: UppsattningId) {
    if (id === table && (own || UPPSATTNING[id].bricka)) return;
    table = id;
    void setTray(want.tray);
    const asked = ++ownAsked;
    if (own) {
      own.remove();
      free(own.prop);
      own = null;
    }
    if (UPPSATTNING[id].bricka) return;
    try {
      const made = (await labModule<Props>("game3d-props")).liveProps(scene);
      if (gone || asked !== ownAsked) return free(made);
      own = { remove: scene.addProp(made), prop: made };
    } catch {
      if (!gone && asked === ownAsked) onNote({ what: "shoe", text: `${UPPSATTNING[id].namn}s sko och låda kunde inte läsas.` });
    }
  }

  async function setShoe(on: boolean) {
    want = { ...want, shoe: on };
    const asked = ++shoeAsked;
    if (!on) {
      if (shoe) {
        shoe.remove();
        shoe.off();
        free(shoe.prop);
        shoe = null;
        scene.hideFilm(null);
      }
      return;
    }
    if (shoe) return;
    try {
      const [m, g] = await Promise.all([labModule<Props>("game3d-props"), labModule<Geometry>("scene3d-geometry")]);
      const camera = scene.status().camera;
      const at = (p: number[]) => g.filmToScene(camera, p[0], p[1]);
      const prop = await m.loadShoe(scene, { rear: at(m.FILM_SHOE.rear), front: at(m.FILM_SHOE.front), far: at(m.FILM_SHOE.far) });
      if (gone || asked !== shoeAsked || shoe) return;
      const box = m.FILM_SHOE.box;
      // the film's own shoe is left undrawn, except in a film with a frame of its own (a whole body), whose box holds something else
      const off = scene.onFrame(() => scene.hideFilm(scene.players.part?.frame ? null : box));
      shoe = { remove: scene.addProp(prop), off, prop };
      onNote(null);
    } catch {
      if (!gone && asked === shoeAsked) onNote({ what: "shoe", text: "Skomodellen (assets/props/shoe.glb) finns inte på den här datorn." });
    }
  }

  function loadChips() {
    chipsLoad ??= labModule<ChipsModule>("game3d-chips").then((m) => {
      if (gone) return;
      const made = m.createChips(scene);
      made.setGloss(gloss);
      chips = { made, remove: scene.addProp(made), off: scene.onFrame(() => void made.update(now())) };
    });
    return chipsLoad;
  }

  return {
    /** What is asked for now; each part changes only when it differs. */
    async apply(next: ExtrasState) {
      if (next.tray !== want.tray) void setTray(next.tray);
      if (next.shoe !== want.shoe) void setShoe(next.shoe);
      if (next.chips !== want.chips) {
        want = { ...want, chips: next.chips };
        try {
          if (next.chips || chips) await loadChips();
          if (!gone) chips?.made.set(next.chips ? BETS : {}, now());
        } catch {
          if (!gone) onNote({ what: "chips", text: "Markerna kunde inte läsas." });
        }
      }
    },
    /** The chips' gloss (state key chipGloss, which only the page that lays chips reads). */
    gloss(value: number) {
      gloss = value;
      chips?.made.setGloss(value);
    },
    /** The table the scene stands at now (the menu's Bord och kamera): its own shoe and box, and whether it has a tray. */
    table: setTable,
    dispose() {
      if (gone) return;
      gone = true;
      tray?.remove();
      shoe?.remove();
      shoe?.off();
      chips?.remove();
      chips?.off();
      chips?.made.dispose();
      own?.remove();
      free(tray?.prop ?? null);
      free(shoe?.prop ?? null);
      free(own?.prop ?? null);
      tray = shoe = chips = own = null;
    },
  };
}
export type Extras = ReturnType<typeof createExtras>;
