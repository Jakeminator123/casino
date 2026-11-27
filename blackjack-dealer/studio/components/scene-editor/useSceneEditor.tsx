"use client";

// const editor = useSceneEditor(firstLook): the scene editor of Bordet's Scen, Råfilm and Efterarbete (components/bordet/SceneBody.tsx), without a scene of its own.
// The view's stage builds the one scene and hands it here (editor.onScene); the editor drives that same object: every key
// of its state as a control (studio/lib/scene-keys.ts) in the panel (Scen: all groups but the cards' and chips', and over them
// the one choice for the cards, the drawn card in her hand; Efterarbete: only the cards' and chips'), every saved look as a
// chip in the bar over the scene (PresetBar) with basgrund, what the game shows today, as the baseline (a key that differs
// from it carries a brass dot and its own "återställ"), "Jämför med basgrund" (or hold B),
// the objects on the table and the cards' bend and gloss. Loading a preset makes it the look's origin: what has changed
// since is measured from it. Nothing here changes the game but "Använd i Casino", on his click; "Prova i Casino" shows the
// look there to try. The look travels in the address (address.ts): editor.lookText says it, and editor.ask takes a new one
// from outside. Saved: his own presets (data/scene-presets/, on his click, "Spara som…"), Casino's ("Använd i Casino") and,
// on a confirmed click, the cards' bend and gloss in his card plan. In the online copy nothing is saved.
// The play view (src/play-view.ts, Jakob 2026-11-25) is read when the editor starts: a look that names no framing is shown with
// its Dator, as the game shows it. Visa, first in the panel (PlayViewPanel), shows the film as recorded (Inspelningen) or what
// the player sees (Dator, Mobil); Scen opens on Dator. Visa is never saved with a look, and a look keeps zoom, pitch and yaw only
// when "Egen inramning" is on (lib/scene-presets.ts savedState). "Spara som spelvy" writes the play view, on his click. The
// scene stands under the menu's table and camera (useSetup, src/scene3d-view.ts setUppsattning), with that table's own shoe and
// box where it has them (extras.ts table), and each has its own play view (/api/play-view?uppsattning=live): the one read and
// saved is the chosen table's (Jakob 2026-11-27: "en annan vy som jag vill kunna ställa in för när jag eller en annan ska testa
// eller spela i casinot"). Which films play there is the view's (components/bordet/SceneBody.tsx): only those made at it.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { CARD_TAPER, LINS } from "../../../src/card-plan.ts";
import { PLAY_VIEW, sameFraming, type Framing, type PlayView } from "../../../src/play-view.ts";
import type { PlacementPlan } from "../../../src/placement-model.ts";
import type { RegisterRoom } from "../../../src/scene3d-room.ts";
import type { SceneState } from "../../../src/scene3d-view.ts";
import { asApiError, getRooms } from "../../lib/api.ts";
import { casinoAddress } from "../../lib/casino.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { placesOf } from "../../lib/rounds.ts";
import { BUILT_BLUR, keySpec, sameValue, type GroupId, type SceneKey } from "../../lib/scene-keys.ts";
import {
  BASE,
  CASINO_PRESET,
  RECORDING,
  SHIPPED,
  differences,
  effective,
  framingOf,
  hasOwnFraming,
  initialSceneState,
  isShipped,
  lookDifferences,
  matchPreset,
  patchOf,
  savedState,
  shownState,
  type Visa,
} from "../../lib/scene-presets.ts";
import type { Scene } from "../stage";
import { SegmentedControl, Skeleton, Switch, useToast } from "../ui";
import { askedPart, lookPart, type LookAsk } from "./address.ts";
import { CardMaterial, useCardMaterial } from "./CardMaterial";
import { ControlPanel, type Extra } from "./ControlPanel";
import { createExtras, type Extras, type ExtrasNote, type ExtrasState, type TrayModel } from "./extras.ts";
import { KeyControl, KeyRow } from "./KeyControl";
import { createPatcher } from "./patcher.ts";
import { PlayViewPanel } from "./PlayViewPanel";
import { PresetBar } from "./PresetBar";
import { deletePreset, getPlayView, listPresets, putPlayView, savePreset, type Preset } from "./presetApi.ts";
import { roomItems } from "./RoomGrid";
import { useSetup } from "../shell/SetupProvider";
import { choiceName } from "../../lib/uppsattning-val.ts";

// What the mouse changes in the scene's state behind the page's back (SceneCanvas: drag, wheel, double click), and what the
// scene may set itself (a room it does not have becomes the salon; cards that cannot be read are switched off).
const PULLED: SceneKey[] = ["yaw", "pitch", "zoom", "dx", "dy", "dz", "sway", "room", "cards"];
// The objects as the game lays them (src/game-page.ts 201-221): Jakob's tray; the shoe is the film's; chips only with bets.
const GAME_EXTRAS: ExtrasState = { tray: "jakobs", shoe: false, chips: false };
const shipped = (): Preset[] => SHIPPED.map((p) => ({ ...p, shipped: true, revision: null }));
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && !["checkbox", "radio", "button", "range"].includes(t.type)));

export type SceneEditor = ReturnType<typeof useSceneEditor>;

export function useSceneEditor(firstLook: () => LookAsk) {
  const toast = useToast();

  // ── the look asked for: the address, read once and again when it changes from outside (ask) ──
  const [asked, setAsked] = useState(firstLook);
  const [origin, setOrigin] = useState(asked.forval);
  const [needApply, setNeedApply] = useState(true);
  /** The address asked for another look (call it while rendering, as the address is read). */
  const ask = (next: LookAsk) => {
    setAsked(next);
    setOrigin(next.forval);
    setNeedApply(true);
  };

  // ── presets: the three that ship at once, the lab's list when it answers ──
  const [presets, setPresets] = useState<Preset[]>(shipped);
  const [presetsRead, setPresetsRead] = useState(false);
  const reloadPresets = useCallback(async () => {
    try {
      setPresets((await listPresets()).presets);
    } catch (error) {
      toast({ tone: "bad", title: "Förvalen kunde inte läsas", detail: asApiError(error).message });
    } finally {
      setPresetsRead(true);
    }
  }, [toast]);
  useEffect(() => {
    void reloadPresets();
  }, [reloadPresets]);
  const presetOf = useCallback((name: string) => presets.find((p) => p.name === name) ?? null, [presets]);

  // ── the menu's table and camera (Bord och kamera): the scene is built under it, and each has its own play view ──
  const { id: setup } = useSetup();

  // ── the play view: one framing for a computer and one for a phone, for every look; the game's own until it is read ──
  const [view, setView] = useState<PlayView>(PLAY_VIEW);
  const [viewRevision, setViewRevision] = useState<string | null>(null);
  const [viewRead, setViewRead] = useState(false);
  const readView = useCallback(async () => {
    setViewRead(false);
    try {
      const { revision, ...read } = await getPlayView(setup);
      setView(read);
      setViewRevision(revision);
    } catch (error) {
      // the copy on the net from before the play view has none: it shows the game's own, as its game does
      if (!isSnapshot) toast({ tone: "bad", title: "Spelvyn kunde inte läsas", detail: `${asApiError(error, "Spelvyn").message} Scen visar spelets egen inramning.` });
    } finally {
      setViewRead(true);
    }
  }, [toast, setup]);
  useEffect(() => {
    void readView();
  }, [readView]);

  // ── Visa: the recording, or what the player sees on a computer or a phone; Scen opens on Dator. While Visa shows another, the
  // framing Dator has for the look is kept here, so that the look (what a save keeps, the address) stays what Dator shows. ──
  const [visa, setVisa] = useState<Visa>("fill");
  const [kept, setKept] = useState<Framing | null>(null);
  // The look's own framing: on when the look opened names one; a save keeps zoom, pitch and yaw only then.
  const [own, setOwn] = useState(false);

  // ── the rooms of the register ──
  const [register, setRegister] = useState<RegisterRoom[]>([]);
  useEffect(() => {
    let gone = false;
    getRooms().then(
      (r) => !gone && setRegister(r.rooms),
      () => {},
    );
    return () => {
      gone = true;
    };
  }, []);
  const rooms = useMemo(() => roomItems(register), [register]);
  const blurOf = useCallback((room: string) => register.find((r) => r.id === room)?.blur ?? BUILT_BLUR[room] ?? 11, [register]);

  // ── the scene, as the stage hands it over ──
  const sceneRef = useRef<Scene | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [defaults, setDefaults] = useState<SceneState | null>(null);
  const [live, setLive] = useState<PlacementPlan | null>(null);
  const [current, setCurrent] = useState<SceneState | null>(null);
  const [comparing, setComparing] = useState(false);
  const comparingRef = useRef(false);
  const patcher = useMemo(() => createPatcher(() => sceneRef.current), []);
  useEffect(() => () => patcher.dispose(), [patcher]);

  // A look's whole state as looks are compared: the play view's Dator under it (a look's own framing goes first), and the
  // format left at the scene's own, since it is Scen's Visa and no part of a look.
  const lookOf = useCallback((state: Partial<SceneState>) => (defaults ? { ...effective(defaults, state, view.dator), format: defaults.format } : null), [defaults, view.dator]);
  // The baseline under the same Visa as the scene, so that a key differs only when the picture does.
  const baseline = useMemo(() => {
    const look = lookOf(presetOf(BASE)?.state ?? SHIPPED[0].state);
    return look ? shownState(look, visa, view.mobil) : null;
  }, [lookOf, presetOf, visa, view.mobil]);
  const initial = initialSceneState({ asked, current, comparison: comparing ? baseline : null, needApply, view: { ...view.dator, format: visa } });
  const originState = useMemo(() => lookOf((presetOf(origin) ?? presetOf(BASE))?.state ?? {}), [lookOf, presetOf, origin]);
  // The look on screen: Dator's framing (kept while Visa shows another), the format left out.
  const look = useMemo(() => (current && defaults ? { ...current, ...(visa !== "fill" && kept ? kept : {}), format: defaults.format } : null), [current, defaults, visa, kept]);
  const differ = useMemo(() => new Set(current && baseline ? differences(current, baseline) : []), [current, baseline]);
  const active = look && defaults ? (matchPreset(look, defaults, presets, origin, view.dator)?.name ?? null) : null;
  const changedFromOrigin = !!(look && originState && lookDifferences(look, originState).length);

  // Shows a look's whole state (with the play view's Dator) under Visa, and makes it the look on screen.
  const show = useCallback(
    (state: Partial<SceneState>, name: string) => {
      const s = sceneRef.current;
      if (!s || !defaults) return;
      const whole = effective(defaults, state, view.dator);
      const target = shownState(whole, visa, view.mobil);
      patcher.now(patchOf(target, { ...s.state })); // the scene is told first; the panel follows it
      setCurrent(target);
      setKept(framingOf(whole));
      setOrigin(name);
    },
    [defaults, view, visa, patcher],
  );

  // The scene under the menu's table and camera (src/scene3d-view.ts setUppsattning): another choice builds it anew under its
  // camera and table, and the look is shown again with that table's play view once it is read.
  const builtUnder = useRef<string | null>(null);
  useEffect(() => {
    if (!scene) return;
    scene.setUppsattning(setup);
    if (builtUnder.current !== null && builtUnder.current !== setup) setNeedApply(true);
    builtUnder.current = setup;
  }, [scene, setup]);

  // The look the address asks for, once the scene is there and the preset it names and the play view are known.
  useEffect(() => {
    if (!needApply || !sceneRef.current || !defaults || !viewRead || !(presetsRead || isShipped(origin))) return;
    let preset = presetOf(origin);
    if (!preset) {
      toast({ tone: "info", title: `Förvalet ${origin} finns inte`, detail: "Basgrunden visas i stället." });
      preset = presetOf(BASE);
    }
    show({ ...preset?.state, ...asked.patch }, preset?.name ?? BASE);
    setOwn(hasOwnFraming(preset?.state ?? {}));
    setNeedApply(false);
  }, [needApply, scene, defaults, viewRead, presetsRead, origin, asked, presetOf, show, toast]);

  // What the mouse did to the scene comes back into the panel; keys still on their way to the scene are not read back.
  const pull = useCallback(() => {
    const s = sceneRef.current;
    if (!s || comparingRef.current) return;
    const pending = patcher.pending();
    setCurrent((was) => {
      if (!was) return was;
      let next: SceneState | null = null;
      for (const key of PULLED) {
        if (pending.has(key) || sameValue(s.state[key], was[key])) continue;
        next ??= { ...was };
        (next as Record<string, unknown>)[key] = s.state[key];
      }
      return next ?? was;
    });
  }, [patcher]);
  const pullFrame = useRef(0);
  const pullSoon = useCallback(() => {
    if (!pullFrame.current)
      pullFrame.current = requestAnimationFrame(() => {
        pullFrame.current = 0;
        pull();
      });
  }, [pull]);
  useEffect(() => () => cancelAnimationFrame(pullFrame.current), []);

  // ── changes ──
  const change = (key: SceneKey, value: unknown) => {
    const patch = { [key]: value } as Partial<SceneState>;
    if (key === "room") patch.blur = blurOf(String(value)); // each room with the blur that suits it, as the lab and the game do
    setCurrent((was) => (was ? { ...was, ...patch } : was));
    patcher.set(patch);
  };
  // Scen's one choice for the cards (Jakob 2026-11-24: the overlay as one choice he sets before the Casino, "det är för mycket
  // val"): the drawn card also in her hand. Turning it on turns the drawn cards on too, which it needs; "Använd i Casino" saves
  // it with the look, and the Casino then draws the card in her hand as Scen does.
  const overlay = (on: boolean) => {
    const patch: Partial<SceneState> = on && !current?.cards ? { cards: true, cardInHand: true } : { cardInHand: on };
    setCurrent((was) => (was ? { ...was, ...patch } : was));
    patcher.set(patch);
  };
  const pick = (name: string) => {
    const preset = presetOf(name);
    if (!sceneRef.current || !defaults || !preset) return;
    show(preset.state, name);
    setOwn(hasOwnFraming(preset.state));
  };
  // The framing is set: in the panel, and in the scene at the next frame.
  const frame = (patch: Partial<SceneState>) => {
    setCurrent((was) => (was ? { ...was, ...patch } : was));
    patcher.set(patch);
  };
  // Visa: Inspelningen is the film's own frame, Dator the look's framing (the play view's, or its own), Mobil the play view's.
  const showAs = (next: Visa) => {
    if (!current || next === visa) return;
    const dator = visa === "fill" ? framingOf(current) : (kept ?? view.dator);
    setKept(dator);
    setVisa(next);
    frame({ ...(next === "fill" ? dator : next === "mob" ? view.mobil : RECORDING), format: next });
  };
  // The framing the play view has for what Visa shows (none for the recording).
  const viewFraming = visa === "mob" ? view.mobil : visa === "fill" ? view.dator : null;
  const backToView = () => {
    if (viewFraming) frame({ ...viewFraming });
  };
  // Off: the look follows the play view again, and Dator shows it so.
  const ownFraming = (on: boolean) => {
    setOwn(on);
    if (on) return;
    if (visa === "fill") frame({ ...view.dator });
    else setKept(view.dator);
  };
  const compare = useCallback(
    (on: boolean) => {
      const s = sceneRef.current;
      if (on === comparingRef.current || !s || !current || !baseline) return;
      comparingRef.current = on;
      setComparing(on);
      // a cut, not the shimmer, when the room differs: the comparison is at once
      if (on) patcher.now({ ...patchOf(baseline, { ...s.state }), roomShift: "cut" });
      else {
        s.set({ ...patchOf(current, { ...s.state }), roomShift: "cut" });
        s.set({ roomShift: current.roomShift });
      }
    },
    [current, baseline, patcher],
  );
  // Hold B to see the baseline.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "KeyB" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      compare(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyB") compare(false);
    };
    const leave = () => compare(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", leave);
    };
  }, [compare]);

  // ── the objects on the table ──
  const [want, setWant] = useState<ExtrasState>(GAME_EXTRAS);
  const [note, setNote] = useState<ExtrasNote>(null);
  const extras = useRef<Extras | null>(null);
  useEffect(() => {
    if (!scene) return;
    const made = createExtras(scene, setNote);
    extras.current = made;
    return () => {
      made.dispose();
      if (extras.current === made) extras.current = null;
    };
  }, [scene]);
  useEffect(() => {
    void extras.current?.apply(want);
  }, [scene, want]);
  // The chosen table's own things that no film shows: at the live table its clear shoe and box, and no tray (as the game lays it).
  useEffect(() => {
    void extras.current?.table(setup);
  }, [scene, setup]);
  const chipGloss = current?.chipGloss;
  useEffect(() => {
    if (chipGloss !== undefined) extras.current?.gloss(chipGloss);
  }, [scene, chipGloss]);

  // ── the cards' material in the placement plan (its card places also tell the round how far a second card moves) ──
  const card = useCardMaterial({ live, onSaved: () => {} });
  const places = useMemo(() => placesOf(card.plan), [card.plan]);

  // ── saving ──
  const canSave = !isSnapshot;
  const [savingCasino, setSavingCasino] = useState(false);
  // A named preset: revision is the one last read when the name exists, null for a new one. The look's lens is one of its keys
  // (lins): saved with it like the rest, Bred lins as lins=bred, Standard as the scene's default. Visa is never saved, and the
  // framing only when the look has its own (savedState).
  const saveAs = async (name: string, label: string, about: string, revision: string | null) => {
    if (!look || !defaults) return;
    try {
      await savePreset(name, { label, about, state: savedState(look, defaults, own) }, revision);
    } catch (error) {
      void reloadPresets(); // made or changed in another tab: the bar shows it as the lab holds it, and the next try can work
      throw error;
    }
    await reloadPresets();
    setOrigin(name);
    toast({ tone: "ok", title: `Sparat som ${label}`, detail: "Finns bland förvalen." });
  };
  const useInCasino = async () => {
    if (!canSave || savingCasino || !presetsRead || !current || !defaults) return;
    setSavingCasino(true);
    const lens = current.lins === "bred" ? "Bred lins" : "Standard";
    try {
      await saveAs(CASINO_PRESET, "Casino", "Casinos sparade visning, vald i Filmverkstaden.", presetOf(CASINO_PRESET)?.revision ?? null);
      toast({ tone: "ok", title: "Casino använder den här visningen", detail: `Med ${lens}. Sparat för nästa gång du öppnar Casino; Casinot på nätet får det vid nästa publicering.` });
    } catch (error) {
      toast({ tone: "bad", title: "Casino-valet kunde inte sparas", detail: asApiError(error).message });
    } finally {
      setSavingCasino(false);
    }
  };
  // One of his own, against the revision last read.
  const remove = async (p: Preset) => {
    if (!p.revision) return;
    try {
      await deletePreset(p.name, p.revision);
    } catch (error) {
      void reloadPresets();
      throw error;
    }
    await reloadPresets();
    if (origin === p.name) setOrigin(BASE);
  };
  // The sliders as the play view's Dator or Mobil, whichever Visa shows, for every look; against the revision last read.
  const [savingView, setSavingView] = useState(false);
  const saveView = async () => {
    if (!canSave || savingView || !current || visa === "desk") return;
    const framing = framingOf(current);
    const name = visa === "mob" ? "Mobil" : "Dator";
    setSavingView(true);
    try {
      const { revision, ...saved } = await putPlayView({ dator: visa === "fill" ? framing : view.dator, mobil: visa === "mob" ? framing : view.mobil }, viewRevision, setup);
      setView(saved);
      setViewRevision(revision);
      toast({ tone: "ok", title: `Spelvyn för ${name} är sparad: ${choiceName(setup)}`, detail: "Den gäller alla utseenden vid det bordet, i Casino och i spelet." });
    } catch (error) {
      const e = asApiError(error, "Spelvyn");
      if (e.status === 409) {
        await readView();
        toast({ tone: "info", title: "Spelvyn har ändrats i en annan flik", detail: "Den är inläst på nytt." });
      } else toast({ tone: "bad", title: "Spelvyn kunde inte sparas", detail: e.message });
    } finally {
      setSavingView(false);
    }
  };

  // ── what the panel shows beside the keys ──
  const trayModels = [
    { value: "byggd" as const, label: "Byggd", title: "Scenens eget markerbräde (reglaget Markerbräde)" },
    { value: "jakobs" as const, label: "Jakobs", title: "Jakobs bricka, som spelet lägger den" },
    { value: "huset" as const, label: "Husets marker", title: "Brickan med husets egna marker (prov)" },
  ];
  const extraRows: Partial<Record<GroupId, Extra[]>> = {
    bord: [
      {
        id: "tray-model",
        label: "Brickans modell",
        words: "bricka marker bräde tray jakobs huset",
        node: (
          <KeyRow
            label="Brickans modell"
            help="Brickan i bordet. Spelet lägger Jakobs; den och husets tar markerbrädets plats."
            differs={want.tray !== GAME_EXTRAS.tray}
            onReset={() => setWant({ ...want, tray: GAME_EXTRAS.tray })}
            resetLabel="Återställ till spelets: Jakobs"
          >
            <SegmentedControl size="sm" label="Brickans modell" value={want.tray} onChange={(tray: TrayModel) => setWant({ ...want, tray })} options={trayModels} />
            {note?.what === "tray" ? <p className="mt-1.5 text-xs text-[#f0b07a]">{note.text}</p> : null}
          </KeyRow>
        ),
      },
      {
        id: "shoe",
        label: "Sko i 3D",
        words: "sko shoe prov modell",
        node: (
          <KeyRow
            label="Sko i 3D"
            help="Prov: Jakobs skomodell står där filmens sko står, och filmens sko ritas inte. En hand som sträcks in över skon klipps."
            differs={want.shoe}
            control={<Switch size="sm" checked={want.shoe} onChange={(shoe) => setWant({ ...want, shoe })} aria-label="Sko i 3D" />}
          >
            {note?.what === "shoe" ? <p className="text-xs text-[#f0b07a]">{note.text}</p> : null}
          </KeyRow>
        ),
      },
    ],
    kort: [
      {
        id: "chips",
        label: "Insatser på bordet",
        words: "marker insatser chips glans",
        node: (
          <KeyRow
            label="Insatser på bordet"
            help="Lägger marker på plats 2, 4 och 6, så att markernas glans syns."
            differs={false}
            control={<Switch size="sm" checked={want.chips} onChange={(chips) => setWant({ ...want, chips })} aria-label="Insatser på bordet" />}
          >
            {note?.what === "chips" ? <p className="text-xs text-[#f0b07a]">{note.text}</p> : null}
          </KeyRow>
        ),
      },
      {
        id: "card-material",
        label: "Kortens böjning och glans",
        words: "kort böjning glans material plan",
        node: <CardMaterial state={card} cardsOn={!!current?.cards} canSave={canSave} />,
      },
    ],
  };

  const originPreset = presetOf(origin) ?? presetOf(BASE);
  const settled = !!(look && originState && !needApply);
  // The keys that differ from the preset the look started from: what a link carries beside the preset's name.
  const keys = settled ? patchOf(look!, originState!) : asked.patch;
  const forval = settled ? (originPreset?.name ?? BASE) : asked.forval;

  const bar = (
    <PresetBar
      presets={presets}
      active={active}
      origin={originPreset?.name ?? BASE}
      changed={changedFromOrigin}
      differ={current ? differ.size : null}
      canSave={canSave && !!current}
      comparing={comparing}
      onPick={pick}
      onSave={saveAs}
      onDelete={remove}
      onCompare={compare}
      onResetAll={() => pick(BASE)}
    />
  );
  // The panel with only what is laid over the film (Bordet's Efterarbete): the cards' and chips' group. Their look is changed
  // there (Jakob 2026-11-17, "Knappen Efterarbete"), so Scen's panel has every group but that one, and of the cards only whether
  // the drawn card is in her hand too: one switch over the groups (Jakob 2026-11-24, "Det bör rimligtvis ställas in i 'Scen'").
  const cardChoice =
    current && baseline ? (
      <KeyControl spec={keySpec("cardInHand")!} value={current.cardInHand} base={baseline.cardInHand} differs={differ.has("cardInHand")} onChange={(on) => overlay(!!on)} onReset={() => overlay(!!baseline.cardInHand)} />
    ) : null;
  const afterwork =
    current && baseline ? (
      <ControlPanel current={current} baseline={baseline} differ={differ} rooms={rooms} extras={extraRows} onChange={change} onReset={(k) => change(k, baseline[k])} only={["kort"]} />
    ) : null;
  const spelvy =
    current && baseline ? (
      <PlayViewPanel
        visa={visa}
        current={current}
        baseline={baseline}
        differ={differ}
        onVisa={showAs}
        onChange={change}
        onReset={(k) => change(k, baseline[k])}
        atView={!!viewFraming && sameFraming(framingOf(current), viewFraming)}
        onBackToView={backToView}
        canSave={canSave}
        savingView={savingView}
        onSaveView={() => void saveView()}
        own={own}
        onOwn={ownFraming}
        table={choiceName(setup)}
      />
    ) : null;
  const panel =
    current && baseline ? (
      <ControlPanel
        current={current}
        baseline={baseline}
        differ={differ}
        rooms={rooms}
        extras={extraRows}
        onChange={change}
        onReset={(k) => change(k, baseline[k])}
        without={["kort"]}
        first={cardChoice}
        bodies={{ spelvy }}
      />
    ) : (
      <div className="flex flex-col gap-3 p-4" aria-busy>
        <Skeleton className="h-8 w-full rounded-md" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );

  return {
    ask,
    /** What the stage builds the scene with. */
    initial,
    /** The stage's scene is built: from now on the editor drives it. */
    onScene: (made: Scene, defs: SceneState, plan: PlacementPlan | null) => {
      sceneRef.current = made;
      setScene(made);
      setDefaults(defs);
      setLive(plan);
      setCurrent((was) => was ?? ({ ...made.state } as SceneState));
    },
    /** The scene's own onChange: a room it does not have, cards it cannot read. */
    onSceneChange: pullSoon,
    /** For the area round the scene: what the mouse does to the camera comes back into the panel. */
    pointer: {
      onPointerMove: (e: PointerEvent) => {
        if (e.buttons) pullSoon();
      },
      onPointerUp: pullSoon,
      onWheel: pullSoon,
      onDoubleClick: pullSoon,
    },
    /** The scene is there and the panel can show it. */
    ready: !!(current && baseline),
    comparing,
    /** The preset the look started from, its label, and how many keys differ from basgrund. */
    forval,
    label: originPreset?.label ?? "Basgrund",
    changed: changedFromOrigin,
    count: differ.size,
    /** The look as the address writes it: "forval=levande&dust=0.8". */
    lookText: settled ? lookPart(forval, look!, originState!) : askedPart(asked),
    /** The Casino view with this look (its lens among the keys). */
    casino: casinoAddress(forval, keys),
    /** The look's lens now (the key lins): Standard or Bred lins. */
    lins: current?.lins ?? initial.lins ?? LINS,
    /** The look's form of the game's cards (the key cardTaper), for the cards Scen lays in a round. */
    cardTaper: current?.cardTaper ?? initial.cardTaper ?? CARD_TAPER.chosen,
    savingCasino,
    useInCasino,
    /** Card places from Jakob's plan for the round; read: the plan has been read, or could not be. */
    plan: card.plan,
    places,
    placesRead: card.read,
    bar,
    panel,
    afterwork,
  };
}
