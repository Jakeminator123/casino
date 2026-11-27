"use client";

// <SetupNote />: in a view that does not follow the menu's choice of table and camera yet (Filmverkstaden), a quiet line
// that says what is chosen and that it does not hold here: the recording and the orders still go by the former standard
// until the order path reads the choice.
import { isSnapshot } from "../../lib/mode.ts";
import { NAMN, choiceName } from "../../lib/uppsattning-val.ts";
import { Tooltip } from "../ui/Tooltip";
import { useSetup } from "./SetupProvider";
import { SETUP_REACH } from "./SetupSwitch";

export function SetupNote() {
  const { id } = useSetup();
  if (isSnapshot) return null;
  return (
    <Tooltip content={<span className="max-w-64">{SETUP_REACH}</span>}>
      <span className="truncate text-faint">
        {NAMN}: {choiceName(id)} · gäller inte här än
      </span>
    </Tooltip>
  );
}
