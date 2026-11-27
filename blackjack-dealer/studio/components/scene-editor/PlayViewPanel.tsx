"use client";

// The group Spelvy in Scen's panel (Jakob 2026-11-25: the recording is one standard, what the player sees another, the look on
// top; src/play-view.ts). Visa: the film as it is recorded (Inspelningen), or what the player sees on a computer (Dator) or a
// phone (Mobil). Under it the framing's three sliders, "Spara som spelvy" (the sliders as the play view's Dator or Mobil, for
// every look), "Återställ till spelvyn" and the switch that gives this look a framing of its own; without it a saved look
// follows the play view. The online copy saves nothing, and neither the save nor the switch is there. The editor
// (useSceneEditor) does the work; this only draws it.
import { RotateCcw, Save } from "lucide-react";
import type { SceneState } from "../../../src/scene3d-view.ts";
import { keySpec, type SceneKey } from "../../lib/scene-keys.ts";
import type { Visa } from "../../lib/scene-presets.ts";
import { Button, SegmentedControl, Switch } from "../ui";
import { KeyControl, KeyRow } from "./KeyControl";

// The catalogue keeps Visa's choices in the order of the game's copy (src/game-look.ts KEYS); the panel shows them so.
const ORDER: readonly Visa[] = ["desk", "fill", "mob"];
const TITLE: Record<Visa, string> = { desk: "Filmens egen ruta, som den spelas in. Standarden för alla filmer.", fill: "Det spelaren ser.", mob: "Det spelaren ser." };
const FRAMING: readonly SceneKey[] = ["zoom", "pitch", "yaw"];

export function PlayViewPanel({
  visa,
  current,
  baseline,
  differ,
  onVisa,
  onChange,
  onReset,
  atView,
  onBackToView,
  canSave,
  savingView,
  onSaveView,
  own,
  onOwn,
  table,
}: {
  visa: Visa;
  current: SceneState;
  baseline: SceneState;
  differ: ReadonlySet<SceneKey>;
  onVisa: (visa: Visa) => void;
  onChange: (key: SceneKey, value: unknown) => void;
  onReset: (key: SceneKey) => void;
  /** The sliders stand on the play view for what Visa shows. */
  atView: boolean;
  onBackToView: () => void;
  canSave: boolean;
  savingView: boolean;
  onSaveView: () => void;
  /** The look has a framing of its own: a save keeps zoom, pitch and yaw. */
  own: boolean;
  onOwn: (on: boolean) => void;
  /** The menu's table and camera, by its name (src/uppsattning.ts): each has its own play view. */
  table: string;
}) {
  const format = keySpec("format")!;
  const options = format.kind === "choice" ? ORDER.map((value) => ({ value, label: format.options.find((o) => o.value === value)?.label ?? value, title: TITLE[value] })) : [];
  const recording = visa === "desk";
  const which = visa === "mob" ? "Mobil" : "Dator";
  return (
    <div className="flex flex-col">
      <KeyRow label={format.label} help={format.help} who={format.who} differs={false}>
        <SegmentedControl size="sm" label={format.label} value={visa} onChange={(v: Visa) => onVisa(v)} options={options} />
      </KeyRow>
      <div className="divide-y divide-line/70">
        {FRAMING.map((key) => (
          <KeyControl key={key} spec={keySpec(key)!} value={current[key]} base={baseline[key]} differs={differ.has(key)} onChange={(value) => onChange(key, value)} onReset={() => onReset(key)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 py-2">
        {canSave ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<Save />}
            disabled={recording || savingView}
            loading={savingView}
            onClick={onSaveView}
            title={recording ? "Välj Dator eller Mobil under Visa" : `Zoom och vridning som spelvy för ${which} vid ${table}. Den gäller alla utseenden som inte har en egen inramning.`}
          >
            Spara som spelvy
          </Button>
        ) : null}
        <Button size="sm" variant="quiet" icon={<RotateCcw />} disabled={recording || atView} onClick={onBackToView} title={recording ? "Välj Dator eller Mobil under Visa" : `Zoom och vridning som i spelvyn för ${which}`}>
          Återställ till spelvyn
        </Button>
      </div>
      {canSave ? (
        <KeyRow
          label="Egen inramning i det här utseendet"
          help="På: utseendet sparas med sin egen zoom och vridning. Av: det följer spelvyn, också när den ändras."
          differs={false}
          control={<Switch size="sm" checked={own} onChange={onOwn} aria-label="Egen inramning i det här utseendet" />}
        />
      ) : null}
      <p className="pt-1 text-xs text-dim">Spelvyn gäller {table}: varje bord och kamera i menyn har sin egen, som Casino och spelet visar.</p>
      <p className="pb-1 pt-1.5 text-xs text-faint">Vrida och zooma håller filmen exakt. Att flytta kameran (sidled, höjd, djup) ger en ungefärlig bild: dealern är en platt film.</p>
    </div>
  );
}
