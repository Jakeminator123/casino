// Vilken docka editorn visar, ur adressens ord (?docka=), och vad sidan säger när ordet inte passar (ett ord som inte passar
// ger aldrig ett tekniskt fel). Dockorna är livebordets, Danilo och Frasse (blackjack-dealer/src/standard.ts dockor), och en
// persons docka ur sina bilder (blackjack-dealer/dealer3d/src/persondockor.ts). Ren kod: läser bara de två, så att reglerna
// prövas utan webbläsare (blackjack-dealer/tools/editor-dockval.test.ts).
import {STANDARD} from '../../blackjack-dealer/src/standard.ts';
import {PERSONDOCKOR} from '../../blackjack-dealer/dealer3d/src/persondockor.ts';

/** Dockorna vid livebordet: Danilo och Frasse (standard.ts dockor), och en persons docka ur sina bilder (dealer3d/src/persondockor.ts, avatar-auto-pipeline steg 15). */
export const dockorna = (): readonly string[] => [...STANDARD.dockor, ...Object.keys(PERSONDOCKOR)];

/** En docka i hans ord: namnet, och han (han, honom, hans). */
export type Dockord = {namn: string; han: string; honom: string; hans: string};
/** En docka heter som dealern eller personen, med stor bokstav; en kvinnas docka (persondockor.ts `kvinna`) är hon. */
export const dockord = (docka: string): Dockord => { const hon = PERSONDOCKOR[docka]?.kvinna === true;
  return {namn: docka.charAt(0).toUpperCase() + docka.slice(1), han: hon ? 'hon' : 'han', honom: hon ? 'henne' : 'honom', hans: hon ? 'hennes' : 'hans'}; };

/** Ett ord ur adressen som det står i en rad han läser: kort och på en rad. */
const citat = (ord: string) => `”${ord.replace(/\s+/g, ' ').slice(0, 40)}”`;

export type Dockval = {docka: string; rad: string};
/** Dockan: ?docka= när den sitter vid livebordet, annars den förvalda (den första i listan, Danilo), med en rad på vanlig svenska om vad som visas i stället ('' när allt passar). */
export function dockval(dockaSkriven: string | null | undefined): Dockval {
  const dockaOrd = dockaSkriven?.toLowerCase(), dockor = dockorna(), forval = dockor[0];
  if (!dockaOrd || dockor.includes(dockaOrd)) return {docka: dockaOrd || forval, rad: ''};
  return {docka: forval, rad: `Det finns ingen docka som heter ${citat(dockaOrd)}. Här visas ${dockord(forval).namn}.`};
}

// ---- de lyfta rörelserna ------------------------------------------------------------------------------------------
// En docka har sina rörelser lyfta ur filmen (blackjack-dealer/dealer3d/tools/lyft-till-docka.ts): lyft-<docka>-p<plats> är
// en giv till platsen och lyft-<docka>-vantan-<n> en väntan. `finns` är rörelserna som finns, som editorns server listar dem
// (GET /blackjack-dealer/dealer3d/data/).
const PLATSNR = [1, 2, 3, 4, 5, 6, 7];
/** Platserna dockan har en lyft giv till, i nummerordning. */
export const lyftaPlatser = (finns: ReadonlySet<string>, docka: string): number[] => PLATSNR.filter(p => finns.has(`lyft-${docka}-p${p}`));
/**
 * Platsen vars lyfta giv visas när han ber om `onskad`: den själv om dockan har en giv dit, annars den närmaste dockan har (den
 * lägre vid lika långt), och `rad` säger det när han själv bad om platsen (`sagd`). null när dockan inte har någon lyft giv.
 */
export function lyftPlats(finns: ReadonlySet<string>, docka: string, onskad: number, sagd: boolean): {plats: number; rad: string} | null {
  const har = lyftaPlatser(finns, docka); if (!har.length) return null;
  if (har.includes(onskad)) return {plats: onskad, rad: ''};
  const plats = har.reduce((a, b) => Math.abs(b - onskad) < Math.abs(a - onskad) ? b : a);
  return {plats, rad: sagd ? `${dockord(docka).namn} har ingen giv till plats ${onskad} lyft ur filmen än. Här visas given till plats ${plats}.` : ''};
}
/**
 * Platserna ordnade som en dealer ger dem: närmast skon först (i filmen av livebordet börjar varje giv där, 10 av 10), räknat ur
 * läget, avståndet från kortplatsens första kort (P<plats>.C1) till skons front, och inte ur numret, så att ordningen står sig
 * när platserna numreras om.
 */
export function fransSkon(platser: readonly number[]): number[] {
  const kort = new Map(STANDARD.kortplatser().map(k => [k.id, k.at])), [sx, , sz] = STANDARD.sko.front;
  const avstand = (p: number) => { const at = kort.get(`P${p}.C1`); return at ? Math.hypot(at[0] - sx, at[2] - sz) : Infinity; };
  return [...platser].sort((a, b) => avstand(a) - avstand(b) || a - b);
}
/** Hela sekvensen (?sekvens=1): väntan 1, dockans alla lyfta givar närmast skon först, och väntan 2; bara de som finns. */
export function helaSekvensen(finns: ReadonlySet<string>, docka: string): string[] {
  // (givarna går från ankaret vid skon till ankaret vid skon, A2.3: vägen dit ur vilan och hem dit är egna rörelser)
  return ['vantan-1', 'till-skon', ...fransSkon(lyftaPlatser(finns, docka)).map(p => `p${p}`), 'hem', 'vantan-2'].filter(x => finns.has(`lyft-${docka}-${x}`));
}
/** En rörelse i hans ord: en lyft giv är "given till plats N", en väntan "väntan N"; ett annat namn står som det är. */
export const rorelsensOrd = (namn: string): string => { if (/^lyft-[a-z0-9]+-till-skon$/.test(namn)) return 'ur vilan till skon'; if (/^lyft-[a-z0-9]+-hem$/.test(namn)) return 'från skon hem till vilan';
  const m = /^lyft-[a-z0-9]+-(?:p(\d+)|vantan-(\d+))$/.exec(namn); return !m ? namn : m[1] ? `given till plats ${m[1]}` : `väntan ${m[2]}`; };
