"use client";

// The studio's one choice of table and camera (lib/uppsattning-val.ts), for every view: const { id, set } = useSetup().
// The address's word (?uppsattning=live|forra) chooses and is remembered, as a link with ?dealer= is; else the remembered
// choice of this browser; else the source's default (the live table). A click in the menu (SetupSwitch) chooses and
// remembers. The memory is a convenience of this browser: in a private window the choice lasts as long as the tab.
import { useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADRESSORD, UPPSATTNING_MEMORY, VALETS_FORVAL, chooseUppsattning, lasUppsattning, type UppsattningId } from "../../lib/uppsattning-val.ts";

type SetupState = { id: UppsattningId; set: (id: UppsattningId) => void };
const SetupContext = createContext<SetupState | null>(null);

const remembered = (): string | null => {
  try { return window.localStorage.getItem(UPPSATTNING_MEMORY); } catch { return null; }
};
const remember = (id: UppsattningId) => {
  try { window.localStorage.setItem(UPPSATTNING_MEMORY, id); } catch { /* private window */ }
};

/** Reads the address's word and the memory once the page is in the browser, and again when the word changes. */
function FromAddress({ onChoose }: { onChoose: (id: UppsattningId, fromAddress: boolean) => void }) {
  const word = useSearchParams().get(ADRESSORD);
  useEffect(() => onChoose(chooseUppsattning(word, remembered()), !!lasUppsattning(word)), [word, onChoose]);
  return null;
}

export function SetupProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<UppsattningId>(VALETS_FORVAL);
  const chosen = useCallback((next: UppsattningId, fromAddress: boolean) => {
    setId(next);
    if (fromAddress) remember(next);
  }, []);
  const set = useCallback((next: UppsattningId) => {
    setId(next);
    remember(next);
  }, []);
  const value = useMemo(() => ({ id, set }), [id, set]);
  return (
    <SetupContext.Provider value={value}>
      <Suspense fallback={null}>
        <FromAddress onChoose={chosen} />
      </Suspense>
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup(): SetupState {
  return useContext(SetupContext) ?? { id: VALETS_FORVAL, set: () => {} };
}
