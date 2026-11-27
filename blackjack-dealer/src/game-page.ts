// Page code of game.html: blackjack on top of the dealer's film in the 3D scene (?dealer=<id>, or the console's Dealer menu).
//
// Three parts meet here and stay apart. The engine (game/, in the lab server behind /api/game) owns rules, shuffle, card
// values and money. The 3D scene (src/scene3d-*.ts) owns the picture and the film queue. This page owns the bets in progress
// and the order of things: it sends a command, turns the answer into film beats, lets the film play, and shows each total
// when its card has landed. Seats are 1–7, seat 1 at camera left.
//
// The look is the game's own. The studio's Casino view plays another one calibrated in its Scen view: ?forval=<preset> and
// scene keys in the address (src/game-look.ts); without them the page is as before.
//
// The game plays only takes with a verdict (judgedBank in src/game-director.ts): Jakob's, or a provisional one given in his place.
// ?trad=<id> (Karta's Prova i Casino) narrows them to one tree's films (below, treeCut); ?komposition=<id> plays several trees
// put together (below, composition).
import {buildGraph, effectOf, type Graph} from './clip-graph.ts';
import {createScene, DEFAULTS, type SceneState} from './scene3d-view.ts';
import {readRegister} from './scene3d-room.ts';
import {cameraFromContract, filmPixel, filmToScene, sceneToSpot, solveCamera, spotToScene, viewUnder, type FilmCamera} from './scene3d-geometry.ts';
import {createLayout, slotOf} from './game-table.ts';
import {LINS, type Lins} from './card-plan.ts';
import {MOBILE_BELOW, PLAY_VIEW, readFraming, readPlayView, type PlayView} from './play-view.ts';
import {DATATS_FORVAL, UPPSATTNING, VALETS_FORVAL, lasUppsattning, type UppsattningId} from './uppsattning.ts';
import {GAME_OWN, OWN_WORDS} from './game-own.ts';
import {cardRecords, judgedBank} from './game-director.ts';
import {cardsChoice, cardWords, createFilm, type FilmPlayers} from './game-film.ts';
import {chipsFor, mountOverlay, type Action, type Anchors} from './game-overlay.ts';
import {mountPanel} from './game-panel.ts';
import {tableView, tableCards, cardFaces, shownBy, shownFor, lineOf, betTotal, handKey, mayAsk, collector, stageOf, CHIP_VALUES, DEALER_KEY, type PageState, type Settled} from './game-view.ts';
import type {Snapshot} from '../game/session.ts';

const THEMES = ['noir', 'scout', 'smaragd', 'bordeaux', 'midnatt']; // the console's themes, Scout's own (game.css)
const $ = (id: string) => document.getElementById(id)!, stage = $('stage'), picture = $('picture'), canvas = $('view') as HTMLCanvasElement, failBox = $('fail');
const fail = (message: string): never => { failBox.textContent = message; throw Error(message); };
const read = async (url: string, what: string) => { const res = await fetch(url).catch(() => null); if (!res?.ok) fail(`${what} kunde inte läsas (${url}).`); return res!.json(); };
const query = new URLSearchParams(location.search);
// Two framings, both by turning and zooming from the film camera's own place (exact for a flat film). Lying: the whole table
// with all seven rings. Standing (a stage narrower than tallBelow): the film's width is locked to the picture's, the view is
// zoomed in on seats 2–6, each ring whole inside the picture's width, her head and those rings inside a picture as short as
// 1.33 times its width, and it turns toward the seat in play. Where the console stands follows the stage's shape (placeConsole
// marks the stage, game.css lays it out): standing, under the picture; lying on a stage lower than sideBelow (a phone on its
// side), at the picture's right; else over the picture's lower edge.
const FRAMING = {sideBelow: 540, turnShare: 0.6, turnLimit: 40};
// The play view as the page knows it (src/play-view.ts): the game's own until the saved one has been read.
let playView: PlayView = PLAY_VIEW;
function placeConsole() {
  const box = stage.getBoundingClientRect(), standing = box.width / Math.max(1, box.height) < MOBILE_BELOW;
  stage.classList.toggle('tall', standing); stage.classList.toggle('side', !standing && box.height < FRAMING.sideBelow); // the picture box follows at once (game.css)
  return standing;
}
placeConsole();
stage.dataset.theme = THEMES.includes(query.get('tema') ?? '') ? query.get('tema')! : 'noir';
// The server keeps one session per table name; a second tab or a test opens game.html?table=<name> and plays its own.
const table = /^[a-z0-9-]{1,40}$/.test(query.get('table') ?? '') ? `?table=${query.get('table')}` : '';
// A look from the studio (src/game-look.ts). Its module is read only when the address holds more than the game's own words,
// so the page without them reads and does exactly what it did before. ?inbaddad=1 (the Casino view shows the game in a
// frame) hides nothing: the frame shows none of what this page shows, and src/preview-ui.ts keeps a framed page from
// taking the lab tab by itself. The game's own words: src/game-own.ts OWN_WORDS.
const forval = query.get('forval');
const lookAsked = [...query.keys()].some(word => !OWN_WORDS.includes(word) && !['kort', 'cardBack', 'cardFace'].includes(word)); // kort, cardBack, cardFace: how the card in her hand is shown (below), not a look
// The dealers the game offers, each with her own films: data/dealers.json's who are not paused (no dealer is named in the code).
// ?dealer=<id> (the studio's word, which the Casino view passes on) or the choice remembered from the console's Dealer menu;
// without either the first of them; with none, or a word that names no dealer of the register (the studio without a dealer), the
// table stands without a dealer ('').
const dealerRegister = await fetch('data/dealers.json').then(res => res.ok ? res.json() : null, () => null).catch(() => null) as {dealers?: {id?: unknown; name?: unknown; paused?: unknown}[]} | null;
const DEALERS = (Array.isArray(dealerRegister?.dealers) ? dealerRegister.dealers : []).flatMap(d => typeof d?.id === 'string' && /^[a-z0-9]+$/.test(d.id) && !d.paused ? [{id: d.id, label: typeof d.name === 'string' && d.name.trim() ? d.name.trim() : d.id, note: '', thumb: ''}] : []);
const dealerMemory = (() => { try { return localStorage.getItem('dealer.dealer'); } catch { return null; } })();
let dealer = query.has('dealer') ? DEALERS.find(d => d.id === query.get('dealer'))?.id ?? '' : DEALERS.find(d => d.id === dealerMemory)?.id ?? DEALERS[0]?.id ?? '';
const nameOf = (id: string) => DEALERS.find(d => d.id === id)?.label ?? id;
// One tree (?trad=<id>, Karta's Prova i Casino; Jakob 2026-11-23): her films cut to that tree's (src/dealer-trees.ts cutBank,
// from GET /api/trees?dealer=<id>&trad=<id>, tools/dealer-tree.ts treeCut). The tree's anchor at the shoe is played as the shoe,
// a take placed in no tree (Borta) follows, a take of another tree never plays, and a card the tree has no film for is laid
// without a hand. An unknown tree, a tree without films or no answer is said on the page, and the game plays as without the
// word. Without the word the game plays the trees that are spelas (src/dealer-trees.ts gameBank, from GET /api/trees?dealer=
// <id>&spel=1, tools/dealer-tree.ts gameCut): one such tree exactly as ?trad=<id> plays it; with several, the takes placed only
// in a tree being built or resting are left out, so that a tree's films do not leak into the plain game before he lets it play.
// A take of no tree stays. The copy on the net has no such list: its frozen bank carries the cut it was built with (gameCuts),
// and with neither the game plays all her judged films, saying nothing.
const treeWord = query.get('trad');
// The table and camera (src/uppsattning.ts; ?uppsattning=live|forra, the game's own word, which the Casino passes on): the word's,
// else the set-up of the films it plays (the tree's with ?trad=; without it the live table when a tree made under it is spelas,
// else the former standard: GET /api/trees playedCut). A film is never shown under another set-up's camera: a set-up without films
// of its own shows its table, shoe and cards without a dealer, and the page says so in its line.
const setupWord = lasUppsattning(query.get('uppsattning'));
const treeRead = !dealer ? Promise.resolve([null, null] as const) : Promise.all([fetch(`api/trees?dealer=${encodeURIComponent(dealer)}&${treeWord === null ? `spel=1${setupWord ? `&uppsattning=${setupWord}` : ''}` : `trad=${encodeURIComponent(treeWord)}`}`).then(async res => ({status: res.status, answer: await res.json().catch(() => null)}), () => null),
  import('./dealer-trees.ts').catch(() => null)]);
// Several trees put together (?komposition=<id>, Karta's Komposition; Jakob 2026-11-23): each tree plays its own films from its
// own anchors, a share says how often each is chosen, and where two trees meet a bridge is played (src/composition.ts, from
// GET /api/compositions?dealer=<id>&komposition=<id>, tools/dealer-composition.ts). The lab's only: the word is read when it is
// there, ?trad= goes first, and a composition that cannot be read, or whose trees have different hands (Jakob 2026-11-23: such
// trees are not put together), is said on the page while the game plays as without the word.
const compositionWord = treeWord === null ? query.get('komposition') : null;
const compositionRead = compositionWord === null || !dealer ? null : Promise.all([fetch(`api/compositions?dealer=${encodeURIComponent(dealer)}&komposition=${encodeURIComponent(compositionWord)}`).then(async res => ({status: res.status, answer: await res.json().catch(() => null)}), () => null),
  import('./composition.ts').catch(() => null)]);

const [contract, placements, bank, first, register, lookCode, presetAnswer, treeAnswer, compositionAnswer, playViewAnswer, livePlayViewAnswer] = await Promise.all([read('data/scene-contract.json', 'Scenkontraktet'), read('api/placements', 'Kortplanen'), read('api/clip-bank', 'Klippbanken'), read(`api/game${table}`, 'Spelet'), read('data/scene-rooms.json', 'Rumsregistret'),
  lookAsked ? import('./game-look.ts').catch(() => null) : null, forval ? fetch(`api/scene-presets/${encodeURIComponent(forval)}`).then(res => res.ok ? res.json() : null, () => null) : null, treeRead, compositionRead,
  // The play view (tools/play-view-store.ts). A page that cannot read it keeps the game's own: the copy on the net until it is published again.
  fetch('api/play-view').then(res => res.ok ? res.json() : null, () => null),
  // The live table's, saved in a file of its own (?uppsattning=live, data/play-view-live.json); an answer that does not say it is
  // the live table's (a server that has no such file yet) leaves the live table's own framing (src/uppsattning.ts spelvy).
  fetch('api/play-view?uppsattning=live').then(res => res.ok ? res.json() : null, () => null)]);
// The set-up (setupWord above): the word's, else the one the films were cut for; and whether its films may play (filmsFit).
const cutSaid = lasUppsattning((treeAnswer[0]?.answer as {uppsattning?: unknown} | null)?.uppsattning), cutSetups = (treeAnswer[0]?.answer as {setups?: unknown} | null)?.setups;
// Without a dealer the table is the choice's default (src/uppsattning.ts VALETS_FORVAL), and nothing of a dealer is shown.
const filmedUnder: UppsattningId = cutSaid ?? (dealer ? DATATS_FORVAL : VALETS_FORVAL), setup: UppsattningId = setupWord ?? filmedUnder;
const filmsFit = !!dealer && filmedUnder === setup && (setup === DATATS_FORVAL || Array.isArray(cutSetups) && cutSetups.includes(setup) || treeWord !== null);
const setupLine = !dealer ? 'Ingen dealer har filmer än.' : !filmsFit ? `Ingen film är godkänd för ${UPPSATTNING[setup].namn.toLowerCase()} än: bordet visas utan dealer.`
  : setupWord === null && treeWord === null && setup !== VALETS_FORVAL ? `${UPPSATTNING[VALETS_FORVAL].namn} har inga godkända filmer än: spelet visar ${UPPSATTNING[setup].namn.toLowerCase()}.` : null;
// The dealer at the table: none where her films may not play (another table's, or no dealer at all); then there is no Dealer
// menu and the chat names nobody.
const seated = filmsFit ? dealer : '';
const liveView = UPPSATTNING.live.spelvy, liveSaved = (livePlayViewAnswer as {uppsattning?: unknown; view?: {dator?: unknown; mobil?: unknown}} | null)?.uppsattning === 'live' ? (livePlayViewAnswer as {view?: {dator?: unknown; mobil?: unknown}}).view : null;
playView = setup === 'live' ? {schemaVersion: 1, dator: readFraming(liveSaved?.dator, liveView.dator), mobil: readFraming(liveSaved?.mobil, liveView.mobil), updatedAt: ''} : readPlayView(playViewAnswer);
const registered = readRegister(register).rooms, roomIds = lookCode ? [...lookCode.BUILT_ROOMS, ...registered.map(r => r.id)] : [];
// The look over the game's own settings: with a preset its whole look, else the address's keys; {} when none is asked for.
// What could not be used is said in one line on the page, and the game plays with its own look in its place.
const look = lookCode?.readLook(query, roomIds) ?? null, preset = lookCode && look?.forval ? lookCode.presetFrom(presetAnswer, roomIds) : null;
const asked: Partial<SceneState> = lookCode && look ? lookCode.lookState(DEFAULTS, preset?.state ?? null, look.keys, id => registered.find(r => r.id === id)?.blur ?? lookCode.BUILT_BLUR[id] ?? 11, {...playView.dator, format: GAME_OWN.format}) : {};
const lookNote = lookCode && look ? lookCode.lookNotice(look.asked, !!preset, [...look.ignored, ...(preset?.dropped ?? [])]) : forval !== null ? 'Förvalet kunde inte läsas: spelet visar sitt eget utseende.' : null;
// The look's lens (the scene key lins; Lins in src/card-plan.ts), one for the scene and the lying cards: the address's, else
// the look's (Casino's saved look carries Bred lins; Jakob 2026-11-21), else Standard. Read once: the game does not change it.
const lins: Lins = asked.lins ?? LINS;
// The look's Kortens form (the scene key cardTaper; CARD_TAPER in src/card-plan.ts), how the lying cards are drawn under
// Standard: the address's or the look's, else the scene's default. Read once, as the lens.
const cardTaper = asked.cardTaper ?? DEFAULTS.cardTaper;
// The 360-degree rooms Jakob has let into the game (game: true in data/scene-rooms.json); a new room is tried in the lab first,
// and a look that chooses one is shown with it.
const panoramas = registered.filter(r => r.game || r.id === asked.room);
// ?fan=<px>: one fan step for every seat, for trying values; 0 and 1 are the scene's fan shadow when a look is read.
const fanWord = query.get('fan'), fanStep = fanWord !== null && Number.isFinite(Number(fanWord)) && !(lookCode && ['0', '1'].includes(fanWord)) ? Math.max(0, Math.min(80, Number(fanWord))) : null;
// The tree's cut (treeRead above, src/dealer-trees.ts treePlay), or in plain words why the game plays as without it; without
// the word, the played trees' cut (gameBank), without a line.
const treeCut = treeWord === null ? {bank: treeAnswer[1]?.gameBank(bank, treeAnswer[0], dealer) ?? bank, line: null as string | null}
  : treeAnswer[1]?.treePlay(bank, treeWord, treeAnswer[0], nameOf(dealer)) ?? {bank, line: `Trädet "${treeWord.slice(0, 40)}" kunde inte läsas. Spelet spelar som vanligt, med alla hennes filmer.`};
// The composition's cut (compositionRead above, src/composition.ts compositionPlay), or in plain words why the game plays as
// without it. With one, the bank the page plays from is its home tree's: the tree the hand rests in, with the rest and talk films.
const compositionCode = compositionAnswer?.[1] ?? null;
// (Compositions are the former standard's: a set-up without films of its own takes none of them.)
const composition = compositionWord === null || !filmsFit ? {cut: null, line: null as string | null}
  : compositionCode?.compositionPlay(compositionWord, compositionAnswer![0], nameOf(dealer)) ?? {cut: null, line: `Kompositionen "${compositionWord.slice(0, 40)}" kunde inte läsas. Spelet spelar som vanligt, med alla hennes filmer.`};
const homeTree = composition.cut ? composition.cut.home ?? composition.cut.trees[0]?.tree ?? null : null;
// Under a set-up whose films the cut does not have, no film plays: the bank without takes (her talk films and rests among them).
const playedBank = !filmsFit ? {...bank, jobs: [], derived: [], edits: []} : composition.cut && compositionCode && homeTree ? compositionCode.treeBank(bank, composition.cut, homeTree) : treeCut.bank;
// The lying cards: under the live table each at its measured place through its own camera (src/game-table.ts liveLayout).
const plan = placements.plan ?? placements, judged = judgedBank(playedBank), graphs = new Map<string, Graph>(), layout = createLayout(plan, {fan: fanStep, lins, taper: cardTaper, uppsattning: setup});
const graphOf = (id: string) => { let g = graphs.get(id); if (!g) { g = buildGraph(judged, {dealer: id}); graphs.set(id, g); } return g; };
const graph = graphOf(dealer);
// A rest film can ask the scene to show another room for a moment (FilmEffect in src/clip-graph.ts: the champagne film's flash turns
// the room into the gambling den). The scene must have that room to do it, though it is no room the player can choose: it is given
// to the scene and left out of the Miljö menu.
const effectRooms = new Set(Object.values(judged.motions ?? {}).map(m => effectOf(m)?.room).filter((id): id is string => !!id));
const sceneRooms = registered.filter(r => panoramas.includes(r) || effectRooms.has(r.id));
// ── the picture: the 3D scene, seen a little from above so that all seven bet rings and the bar have room ──
// The scene fills the picture box (#picture). On a larger screen that is the whole stage and the console lies over its lower edge;
// on a phone it is the part of the stage the console leaves free (frame, below), so that nothing of the console covers the table.
const scene = createScene(canvas, picture, {contract, plan, urls: {plate: 'assets/scene/room.png', panorama: 'assets/scene/panorama-vegas.jpg', la: 'assets/scene/panorama-la.jpg', skog: 'assets/scene/panorama-skog.jpg'}, rooms: sceneRooms, onChange: () => {}, onMissingRoom: () => {}, uppsattning: setup});
// The framings (FRAMING) stand at the top, where the stage is told its shape.
// The lying framing is the play view's Dator, or the look's own where it names one (lookState lays the play view under the
// look); yaw, dy and dz are where the view comes to rest. Standing is always the play view's Mobil.
const lying = {pitch: asked.pitch ?? playView.dator.pitch, zoom: asked.zoom ?? playView.dator.zoom}, home = {yaw: asked.yaw ?? playView.dator.yaw, dy: asked.dy ?? 0, dz: asked.dz ?? 0};
const upright = {pitch: playView.mobil.pitch, zoom: playView.mobil.zoom};
const fixed = query.has('pitch') || query.has('zoom');
let tall = false, aimed = home.yaw; // aimed: the yaw the view is easing toward, degrees
function frame() {
  const now = placeConsole(); // and the scene follows the picture box (scene.resize, below)
  // Standing is always the play view's Mobil, also where the address pins a pitch or a zoom: those are a lying framing.
  if (now !== tall || !framed) { tall = now; framed = true; scene.set(tall ? upright : lying); aimed = tall ? playView.mobil.yaw : home.yaw; scene.set({yaw: aimed}); }
  scene.resize();
}
let framed = false;
// The rooms the player can choose between (the console's Bord menu): the register's rooms that are in the game, then the two
// built rooms. Each with the blur that suits it and the room sound it is heard with. The choice is kept in the browser.
const ROOMS = [
  ...panoramas.map(r => ({id: r.id, label: r.label, note: r.note, blur: r.blur, sound: r.sound})),
  {id: 'hall', label: 'Spelhallen', note: 'En spelhall med spelautomater och låg rök', blur: 11, sound: 'hall'}, {id: 'salong', label: 'Salongen', note: 'En stillsam salong', blur: 11, sound: 'salong'},
].map(r => ({...r, thumb: `assets/scene/thumbs/room-${r.id}.jpg`}));
const soundOf = (id: string) => ROOMS.find(r => r.id === id)?.sound ?? null;
const remembered = (() => { try { return localStorage.getItem('dealer.room'); } catch { return null; } })();
let room = ROOMS.find(r => r.id === (asked.room ?? query.get('room') ?? remembered))?.id ?? GAME_OWN.room;
// The drawn cards and how the card in her hand is shown (cardsChoice in src/game-film.ts): the address's cards= and kort= first, then
// the saved scene preset, then the player's remembered choice, then on. A saved look must survive an old browser setting.
const cardsMemory = (() => { try { return localStorage.getItem('dealer.cards'); } catch { return null; } })();
const cardsNow = cardsChoice({address: (look?.keys as {cards?: boolean} | undefined)?.cards, preset: preset?.state.cards, kort: query.get('kort'), memory: cardsMemory, inHand: asked.cardInHand});
scene.set({lins, format: GAME_OWN.format, room: room as never, blur: ROOMS.find(r => r.id === room)!.blur, tray: GAME_OWN.tray, cards: GAME_OWN.cards, pitch: Number(query.get('pitch') ?? lying.pitch), zoom: Number(query.get('zoom') ?? lying.zoom)});
// The look over the game's own settings, before the first picture. A room of it that the menu does not offer (a built room
// of the lab) is shown all the same, and the menu marks none. The table is built by now, so the room is changed with a cut,
// and the look's own way of changing rooms holds from then on.
if (Object.keys(asked).length) { scene.set({...asked, roomShift: 'cut'}); if (asked.roomShift) scene.set({roomShift: asked.roomShift}); room = asked.room ?? room; }
scene.set({cards: cardsNow.cards}); // over the look: see cardsNow
// The page's one line: which tree it plays (or why none), and what of the look could not be used.
const pageNote = [filmsFit ? treeCut.line : null, composition.line, setupLine, lookNote].filter(Boolean).join(' · ');
if (pageNote) { const note = Object.assign(document.createElement('p'), {textContent: pageNote}); note.setAttribute('role', 'status');
  note.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:30;margin:0;max-width:min(92%,680px);padding:6px 14px;border:1px solid rgba(226,191,109,.32);border-radius:999px;background:rgba(8,7,6,.84);color:#f6eedc;font-size:13px;pointer-events:none'; stage.append(note); }
scene.rebuild(); scene.start();
new ResizeObserver(frame).observe(stage); frame();
// Her films say the set-up they are made under, the cut's (a composition's are the former standard's), and the scene shows them only
// under it (src/scene3d-view.ts guardFilms).
const film = createFilm(scene.players as unknown as FilmPlayers, graph, layout, path => fetch(path).then(res => res.ok ? res.json() : null), Math.random, composition.cut ? DATATS_FORVAL : filmedUnder);
// A composition: each of its trees as a graph of its own (the home tree's is the page's own), and the composer that chooses among them.
if (composition.cut && compositionCode && homeTree) { const cut = composition.cut;
  film.compose({composer: compositionCode.createComposer(cut), graphs: Object.fromEntries(cut.trees.map(t => [t.tree, t.tree === homeTree ? graph : buildGraph(judgedBank(compositionCode.treeBank(bank, cut, t.tree)), {dealer})]))}); }
// The round's tempo (Jakob 2026-11-23: "spela upp dealerklipp i 1.5x eller 2x ... sparas i en komposition"): the composition's
// goes before the look's key filmTempo, and is set as that key, so the scene's queue plays the round's films with it
// (players.tempo; rest and speech keep their speed). A tree's own tempo, and a film's own speed (the bank's playbackSpeed),
// are laid on its films by the film player (src/game-film.ts filmRate: speed times tempo, the tempo never past 2×).
{ const cut = composition.cut, code = compositionCode;
  if (cut && code) scene.set({filmTempo: code.tempoOf(cut, null, scene.state.filmTempo)});
  film.tempo = {round: () => scene.state.filmTempo, tree: id => cut && code && cut.trees.some(t => t.tree === id && t.tempo !== undefined) ? code.tempoOf(cut, id, scene.state.filmTempo) : null}; }
// A bounded local A/B trial for silent card moves; speech and idle keep their own timing.
if (query.has('dealTempo')) film.dealTempo = Number(query.get('dealTempo'));
// How the card in her hand is shown (src/game-film.ts Carry) is a word in the address only, for the lab and for recordings:
// kort=hand (the drawn card in her hand, overriding the scene switch), kort=liggande (the film's own card in her hand, the
// drawn card once it lies), kort=matt (the film's card recoloured in her hand).
film.carry = cardsNow.carry;
// The film card's own colours recoloured (src/game-film.ts CardWords), a lab trial for recordings and Jakob's own eye: cardBack=dark,
// cardFace=paper. Without them the game is as before.
film.words = cardWords(query);

// ── state ──
let snapshot: Snapshot = first, paid: Snapshot | null = null; // snapshot: the round on the table. paid: the engine's state after that round was collected.
const page: PageState = {stage: 'BETTING', busy: false, dealerPlays: false, bets: {}, last: null, chip: 25, balance: snapshot.balance, shown: {}, settled: null, line: null, error: null};
// A round found in progress or settled when the page opens (the server keeps the session; a reload): its cards are laid out without
// film, the hole card closed until the engine turns it, and the controls are those of the phase the engine is in (stageOf, mayAsk).
page.stage = stageOf(snapshot);
if (page.stage !== 'BETTING') { const table = tableCards(snapshot); film.set({table, records: cardRecords(table, cardFaces(snapshot)), lying: [...table.hands.flatMap(h => h.cards), ...table.dealer]}); }
else film.rest();

// ── commands to the engine ──
async function send(command: Record<string, unknown>): Promise<Snapshot | null> {
  page.error = null;
  try {
    const res = await fetch(`api/game/command${table}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({...command, requestId: crypto.randomUUID(), expectedVersion: (paid ?? snapshot).ver})});
    const data = await res.json(); if (!res.ok) throw Error(data.error?.message ?? 'Spelet svarade inte.');
    return data as Snapshot;
  } catch (error) { page.error = (error as Error).message; render(); return null; }
}
// The settled round's collect, sent once: asked when the round is settled (present) and again by Ny runda if that answer has not come.
const collect = collector(send);
// Plays one answered step: film first, the totals as the cards land, then the engine's state as it is.
async function present(next: Snapshot, dealerPlays: boolean) {
  const table = tableCards(next);
  const settle = next.events.find(e => e.type === 'settle') as Settled | undefined;
  // The stakes leave the balance at once; what the round pays back shows when its film has played.
  if (page.stage === 'BETTING') { page.balance -= betTotal(page.bets); page.stage = 'ROUND'; }
  page.shown = shownFor(page.shown, snapshot, next); // a total stays with its own hand through a split (src/game-view.ts)
  snapshot = next; page.busy = true; page.dealerPlays = dealerPlays;
  render();
  const result = await film.play(next.events, {table, records: cardRecords(table, cardFaces(next))}, beat => {
    if (beat.kind !== 'DEAL' && beat.kind !== 'REVEAL' && beat.kind !== 'PLACE') return;
    const event = next.events.find(e => (e.type === 'deal' || e.type === 'reveal') && e.shoeDraw === beat.own!.shoeDraw), shown = event && shownBy(event);
    if (shown) { page.shown[shown.key] = shown; render(); }
    if (heard.table && beat.own) sound?.card(beat.kind === 'REVEAL' ? 'turn' : 'land', {pan: beat.own.slot.owner === 'P' ? panOf(beat.own.slot.seat) : 0});
  });
  gaps.push(...result.gaps); gaps.splice(0, Math.max(0, gaps.length - 40));
  page.busy = false; page.balance = next.balance; page.line = lineOf(next.events) ?? page.line;
  if (settle || next.view.round?.phase === 'settled') {
    page.stage = 'SETTLED'; page.settled = settle ?? page.settled; render();
    // What the round pays back reaches the balance when it is collected; the cards stay on the table until the next round.
    if (settle) settleChips(settle);
    paid = await collect(next.view.roundId); if (paid) page.balance = paid.balance;
  }
  render();
}

const round = () => snapshot.view.round;
// A chip let go over the felt lands in the nearest bet ring: past the rail the player only has to throw it roughly right.
function nearestSeat(clientX: number, clientY: number): number | null {
  const at = scene.pick(clientX, clientY); if (!at) return null;
  let best: {seat: number; distance: number} | null = null;
  for (const spot of scene.spots().bets) { const distance = Math.hypot(spot.x - at.x, spot.s - at.s); if (!best || distance < best.distance) best = {seat: Number(spot.id.slice(1)), distance}; }
  return best?.seat ?? null;
}
// Every control asks mayAsk (src/game-view.ts) first: it does only what the overlay offers it now, however it is pressed.
const controls: Parameters<typeof mountOverlay>[1] = {
  aim: nearestSeat,
  chip(value) { page.chip = value; render(); },
  bet(seat, value = page.chip) {
    if (!mayAsk(snapshot, page, 'bet')) return;
    const now = (page.bets[seat] ?? []).reduce((a, b) => a + b, 0);
    if (now + value > snapshot.limits.max || betTotal(page.bets) + value > page.balance) return;
    if (heard.table) sound?.chip(page.bets[seat]?.length ? 'stack' : 'felt', {height: page.bets[seat]?.length ?? 0, pan: panOf(seat)});
    page.bets[seat] = [...(page.bets[seat] ?? []), value]; order.push(seat); render();
    film.expect(Object.keys(page.bets).map(Number)); // her entry films are fetched now, not at Dela ut (src/game-film.ts expect)
  },
  // A chip picked up from a ring: the last one laid there. It leaves the order of laying too, so that Ångra still takes the latest.
  take(seat) {
    if (!mayAsk(snapshot, page, 'take') || !page.bets[seat]?.length) return;
    page.bets[seat] = page.bets[seat].slice(0, -1); if (!page.bets[seat].length) delete page.bets[seat];
    const at = order.lastIndexOf(seat); if (at >= 0) order.splice(at, 1); if (heard.table) sound?.chip('take', {pan: panOf(seat)}); render();
  },
  undo() { if (!mayAsk(snapshot, page, 'undo')) return; const seat = order.pop(); if (seat === undefined) return; page.bets[seat] = page.bets[seat].slice(0, -1); if (!page.bets[seat].length) delete page.bets[seat]; render(); },
  clear() { if (!mayAsk(snapshot, page, 'clear')) return; page.bets = {}; order.length = 0; render(); },
  rebet() { if (!mayAsk(snapshot, page, 'rebet') || !page.last) return; page.bets = Object.fromEntries(Object.entries(page.last).map(([seat, chips]) => [seat, [...chips]])); order.length = 0; for (const [seat, chips] of Object.entries(page.bets)) for (const _ of chips) order.push(Number(seat)); render(); film.expect(Object.keys(page.bets).map(Number)); },
  async deal() {
    if (!mayAsk(snapshot, page, 'deal')) return;
    panel.close(); // an open menu closes when the round begins
    const bets = Object.entries(page.bets).map(([seat, chips]) => ({seat: Number(seat), main: chips.reduce((a, b) => a + b, 0)}));
    // The rest on screen plays to its end and the deal follows it, with no rest queued between (src/game-film.ts leave); the loop
    // goes on if the engine does not answer. The same in every step below.
    page.busy = true; render(); film.leave();
    const next = await send({op: 'start', bets}); if (!next) { page.busy = false; render(); film.rest(); return; }
    page.last = page.bets; page.shown = {}; page.settled = null; page.line = null;
    await present(next, false);
  },
  async act(action: Action) {
    const r = round(); if (!mayAsk(snapshot, page, action) || !r || r.activeSeat === null) return;
    page.busy = true; render(); film.leave();
    const next = await send({op: 'act', seat: r.activeSeat, handIndex: r.active, action, roundId: snapshot.view.roundId, turnSeq: snapshot.view.turnSeq}); if (!next) { page.busy = false; render(); film.rest(); return; }
    await present(next, next.view.round?.phase === 'settled' || next.view.round?.phase === 'dealer');
  },
  async insurance(take: boolean) {
    if (!mayAsk(snapshot, page, 'insurance')) return; page.busy = true; render(); film.leave();
    const next = await send({op: 'insurance', roundId: snapshot.view.roundId, take}); if (!next) { page.busy = false; render(); film.rest(); return; }
    await present(next, next.view.round?.phase === 'settled');
  },
  async next() {
    if (!mayAsk(snapshot, page, 'next')) return; page.busy = true; render();
    const next = paid ?? await collect(snapshot.view.roundId); page.busy = false; if (!next) { render(); return; }
    snapshot = next; paid = null; Object.assign(page, {stage: 'BETTING', bets: {}, shown: {}, settled: null, line: null, balance: next.balance}); order.length = 0; taken.clear(); chips?.clearWinnings();
    film.set({table: {hands: [], dealer: []}, records: [], lying: []}); render();
  },
};
const overlay = mountOverlay(stage, controls);
const order: number[] = []; // the seats the chips were laid on, in order, for Ångra

// ── the console's menus (src/game-panel.ts): the room and the dealer, music and sound ──
// Sound is src/sound.ts's (the page Ljud tunes it), read the first time a menu is opened; everything is silent until the player
// switches something on. panOf: where a seat is heard, left to right.
type Sound = {unlock(): void; chip(kind: string, options?: object): void; card(kind: string, options?: object): void; ambience(room: string | null): void; music?(track: string | null): void; set(patch: object): void};
let sound: Sound | null = null, soundAsked: Promise<void> | null = null;
const heard = {table: false, ambience: false, track: null as string | null, music: 0.6}, panOf = (seat: number) => (seat - 4) / 3 * 0.8;
const loadSound = () => soundAsked ??= import('./sound.ts').then((m: {createSound(): Sound; MUSIC?: {id: string; label: string; note: string}[]}) => { sound = m.createSound(); sound.set({music: heard.music}); panel.set({tracks: m.MUSIC ?? []}); }).catch(() => {});
const withSound = (act: (s: Sound) => void) => void loadSound().then(() => { if (sound) { sound.unlock(); act(sound); } });
const panel = mountPanel(overlay.root.querySelector<HTMLElement>('.go-bar')!, ROOMS, seated ? DEALERS : [], {
  open() { void loadSound(); },
  room(id) {
    const next = ROOMS.find(r => r.id === id); if (!next || id === room || page.busy || page.stage === 'ROUND') return;
    room = id; // a look from the studio leaves the room the game remembers alone
    if (forval === null) try { localStorage.setItem('dealer.room', id); } catch { /* a private window keeps nothing */ }
    if (asked.roomShift === 'cut') scene.set({roomShift: 'cut', room: id, blur: next.blur} as never); // a look that changes rooms with a cut
    else scene.set({roomShift: GAME_OWN.roomShift, room: id, blur: next.blur} as never); // the background shimmers and changes under the shimmer
    if (heard.ambience) sound?.ambience(soundOf(id)); panel.set({room: id});
  },
  // Another dealer between rounds: the game opens again with her word (her films, her trees); no film of anyone leaving is played.
  dealer(id) {
    const next = DEALERS.find(d => d.id === id);
    if (!next || next.id === dealer || page.busy || page.stage === 'ROUND') return;
    try { localStorage.setItem('dealer.dealer', next.id); } catch { /* a private window keeps nothing */ }
    const address = new URL(location.href); address.searchParams.set('dealer', next.id); location.replace(address);
  },
  music(track) { heard.track = track; panel.set({track}); withSound(s => s.music?.(track)); },
  level(music) { heard.music = music; panel.set({music}); sound?.set({music}); },
  table(on) { heard.table = on; panel.set({table: on}); if (on) withSound(s => s.chip('stack', {height: 1, pan: 0})); },
  ambience(on) { heard.ambience = on; panel.set({ambience: on}); withSound(s => s.ambience(on ? soundOf(room) : null)); },
  // Off: nothing is drawn over the film, lying cards included; the film's own coloured cards show and the round plays as before.
  cards(on) { scene.set({cards: on}); panel.set({cards: on}); remember(on ? 'on' : 'off'); },
});
panel.set({room, dealer, cards: scene.state.cards});
// The menu's choice is kept also under a preset; a word in the address still wins over it when the page is opened (cardsNow).
function remember(value: 'on' | 'off') { try { localStorage.setItem('dealer.cards', value); } catch { /* a private window keeps nothing */ } }
// Jakob's chip tray (assets/props/tray.glb, local media) takes the place of the built tray when it can be read; game.html?tray=built keeps the built one.
// A trial, game.html?bricka=hus: the tray holds the house's own chips (src/game3d-tray.ts), a lost bet is carried into it and winnings out of it.
type HouseTray = {mouth(value: number, taking: boolean): {x: number; y: number; s: number}; add(value: number): boolean; remove(value: number): boolean};
let houseTray: HouseTray | null = null; const taken = new Set<number>(); // the seats whose chips the house has taken this round
// The live table has no tray (LIVE.tray) and no film whose shoe stands on it: its clear shoe and discard box are drawn from its
// measures (src/game3d-props.ts liveProps).
if (!UPPSATTNING[setup].bricka) void import('./game3d-props.ts').then(m => { scene.addProp(m.liveProps(scene)); }).catch(() => {});
else if (query.get('bricka') === 'hus') void import('./game3d-tray.ts').then(m => { const tray = m.createHouseTray(scene); scene.notch(tray.notch); scene.addProp(tray); houseTray = tray; }).catch(() => {});
else if (query.get('tray') !== 'built') void import('./game3d-props.ts').then(async m => { const tray = await m.loadTray(scene); scene.notch(tray.notch); scene.addProp(tray); }).catch(() => {});
// When a round is settled: a seat that got back less than it staked loses its chips to the tray, and what a seat got back
// beyond its stake is carried out of the tray and set down beside the bet. Only in the trial with the house's tray.
function settleChips(settle: Settled) {
  const tray = houseTray; if (!tray || !chips || !settle) return;
  const seats = new Map<number, {stake: number; returned: number}>();
  for (const hand of settle.hands) { const s = seats.get(hand.seat) ?? {stake: 0, returned: 0}; s.stake += hand.stake; s.returned += hand.returned; seats.set(hand.seat, s); }
  const now = seconds(), into = (value: number) => tray.mouth(value, false), outOf = (value: number) => tray.mouth(value, true);
  for (const [seat, s] of seats) {
    if (s.returned < s.stake) { taken.add(seat); chips.send(seat, into, now, value => { tray.add(value); }); if (s.returned > 0) chips.pay(seat, chipsFor(s.returned, [...CHIP_VALUES]), outOf, now + 0.7, value => { tray.remove(value); }); }
    else if (s.returned > s.stake) chips.pay(seat, chipsFor(s.returned - s.stake, [...CHIP_VALUES]), outOf, now, value => { tray.remove(value); });
  }
}
// The chips in the rings are 3D objects on the table when the module can be read; until then, and if it cannot, the overlay draws them flat.
type Spot3 = {x: number; y: number; s: number};
type Chips = {set(bets: Record<number, number[]>, now: number): void; update(now: number): boolean; send(seat: number, to: (value: number) => Spot3, now: number, arrive: (value: number) => void): void;
  pay(seat: number, values: number[], from: (value: number) => Spot3, now: number, leave: (value: number) => void): void; clearWinnings(): void};
let chips: Chips | null = null;
const seconds = () => performance.now() / 1000;
void import('./game3d-chips.ts').then(m => { const made = m.createChips(scene); if (asked.chipGloss !== undefined) made.setGloss(asked.chipGloss); scene.addProp(made); chips = made; stage.classList.add('chips3d'); render(); }).catch(() => {});
// The table chat as a dummy (src/game-chat.ts; game.html?chatt=0 leaves it out). The dealer's lines follow the round's phases and how it ended.
type Chat = {phase(phase: string, said?: string | null): void; say(text: string): void; dealer(name: string): void};
let chat: Chat | null = null, chatPhase = '', chatLine: string | null = null;
if (query.get('chatt') !== '0') void import('./game-chat.ts').then(m => { chat = m.mountChat(stage, seated ? {name: nameOf(seated)} : {}); render(); }).catch(() => {});
// The gaps the film met (for the console and the proof recorder).
const gaps: string[] = [];
const render = () => { const view = tableView(snapshot, page);
  panel.set({canChange: !page.busy && page.stage !== 'ROUND'});
  if (chat) { if (view.phase !== chatPhase) { chatPhase = view.phase; chat.phase(view.phase); } if (page.line !== chatLine) { chatLine = page.line; if (page.line && view.phase === 'SETTLED') chat.say(page.line.replace(/<[^>]+>/g, '')); } } chips?.set(Object.fromEntries(view.seats.map(s => [s.seat, taken.has(s.seat) ? [] : s.chips])), seconds()); if (view.phase === 'TURN' || view.phase === 'BETTING') { if (view.phase === 'TURN') byHand = false; aimAt(view.phase === 'TURN' ? snapshot.view.round?.activeSeat ?? null : null); } overlay.render(view); };

// ── where things are in the picture ──
// A film pixel on the felt as the scene's own table point (dealer metres: x across, s from the dealer's edge).
// Under the table's lens a card is a real one, 63 mm wide where the contract's is 31.5 mm in the dealer's metres, so the same step is twice as long.
// The dealer's total stands beside the far half of her card there (DEALER_TOTAL_FAR), between the tray and the logo, which under the lens lies just past her cards.
const TOTAL_LEFT = 0.036, TOTAL_LEFT_REAL = 0.072, DEALER_TOTAL_FAR = 0.03; // dealer metres from the first card's centre to the total, a little more than a card's width
const spotOf = (camera: FilmCamera, px: number, py: number) => { const p = filmToScene(camera, px, py); return sceneToSpot(camera, p[0], p[2]); };
function anchors(): Anchors {
  const camera = scene.status().camera, out: Anchors = {bets: {}, hands: {}}, table = tableCards(snapshot);
  for (const spot of scene.spots().bets) { const at = scene.project(spot.x, spot.s); if (at.visible) out.bets[Number(spot.id.slice(1))] = {x: at.x, y: at.y, ring: spot.radius * 2 * at.pxPerM}; }
  // A hand's total stands just left of its first card: the cards fan out to the right, so it is never under them.
  const lens = camera.source === 'lens', pin = (key: string, shoeDraw: number | undefined) => {
    const slot = shoeDraw === undefined ? null : slotOf(table, shoeDraw), centre = slot && layout.centre(slot), spot = centre && spotOf(camera, centre.x, centre.y), at = spot && scene.project(spot.x - (lens ? TOTAL_LEFT_REAL : TOTAL_LEFT), spot.s - (lens && key === DEALER_KEY ? DEALER_TOTAL_FAR : 0));
    if (at?.visible) out.hands[key] = {x: at.x, y: at.y};
  };
  const counts = new Map<number, number>();
  for (const hand of table.hands) { const n = counts.get(hand.seat) ?? 0; counts.set(hand.seat, n + 1); pin(handKey(hand.seat, n), hand.cards[0]); }
  pin(DEALER_KEY, table.dealer[0]);
  return out;
}
// Standing: the view turns toward a seat (most of the way, so the dealer stays in the picture) and eases there.
function aimAt(seat: number | null) {
  const spot = seat === null ? null : scene.spots().bets.find(b => b.id === `P${seat}`), camera = scene.status().camera;
  if (!tall || !spot) { aimed = tall ? playView.mobil.yaw : home.yaw; return; }
  let turn = Math.atan2(-spot.x * camera.scale, solveCamera(camera).edgeDistance - spot.s * camera.scale) * 180 / Math.PI * FRAMING.turnShare;
  // Under the table's lens the view turns about the film camera's own upright (src/scene3d-view.ts updateView), so the angle to the
  // seat is the one its ring has in the film, and the scene reads a yaw as written for the contract's camera (viewUnder), so the
  // turn is given as that camera's: the film then moves as far sideways in the picture as it does today (373 px against 383 at seat 7).
  // The live table's view is written for its own camera (src/scene3d-view.ts updateView): there the angle is taken as it is.
  if (camera.source === 'lens') { const at = filmPixel(camera, spotToScene(camera, spot.x, spot.s)), real = at ? Math.atan2(-(at.x - (camera.frame.width - 1) / 2), camera.focalPx) * 180 / Math.PI * FRAMING.turnShare : 0;
    turn = setup === 'live' ? real : viewUnder(cameraFromContract(contract), camera, {yaw: real, pitch: 0, dx: 0, dy: 0, dz: 0}).yaw; }
  aimed = Math.max(-FRAMING.turnLimit, Math.min(FRAMING.turnLimit, turn));
}
// A sideways drag on the picture turns the view by hand (standing: to reach the outer seats; lying: to look around); a double click turns it back.
// The view eases to the seat in play, to its own tilt and zoom, and the camera to its own place.
let turning: {x: number; yaw: number} | null = null, byHand = false;
const framing = () => tall ? upright : lying;
canvas.addEventListener('pointerdown', e => { turning = {x: e.clientX, yaw: scene.state.yaw}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!turning) return; const dx = e.clientX - turning.x; if (Math.abs(dx) > 4) byHand = true; if (byHand) scene.state.yaw = Math.max(-FRAMING.turnLimit, Math.min(FRAMING.turnLimit, turning.yaw + dx * 45 / canvas.clientHeight / Math.max(1, scene.state.zoom))); });
for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { turning = null; });
canvas.addEventListener('dblclick', () => { byHand = false; });
scene.onFrame(() => {
  chips?.update(seconds());
  if (!turning && !byHand && Math.abs(scene.state.yaw - aimed) > 0.02) scene.state.yaw += (aimed - scene.state.yaw) * 0.08;
  if (!fixed || tall) for (const key of ['pitch', 'zoom'] as const) { const left = framing()[key] - scene.state[key]; if (left) scene.state[key] = Math.abs(left) < 0.002 ? framing()[key] : scene.state[key] + left * 0.08; }
  for (const key of ['dy', 'dz'] as const) if (scene.state[key] !== home[key]) scene.state[key] = Math.abs(scene.state[key] - home[key]) < 0.002 ? home[key] : home[key] + (scene.state[key] - home[key]) * 0.9;
  const host = stage.getBoundingClientRect(), box = scene.canvas.getBoundingClientRect();
  overlay.place({left: box.left - host.left, top: box.top - host.top, width: box.width, height: box.height}, anchors());
});
render();

Object.assign(window, {game: {scene, film, page, state: () => snapshot, dealer: () => dealer, gaps, controls, uppsattning: setup, layout}}); // for the proof recorder and the console; not an interface
// ?diagnos=1: what this browser does with the game, as text on the picture (src/game-diagnosis.ts), for a fault that shows on one
// phone and in no recording. Read only when the address has the word.
if (query.get('diagnos') === '1') void import('./game-diagnosis.ts').then(m => m.createDiagnosis(stage, canvas, () => { const q = scene.players.diagnosis();
  return [`${page.stage}${page.busy ? ' upptagen' : ''} · hållen vila ${film.held ? 'ja' : 'nej'} · luckor ${gaps.length}`,
    `kö: ${q.paused ? 'står' : 'går'} · sträng ${q.strict ? 'JA' : 'nej'} · nekade ${q.stuck} · element ${q.pool}`, `på skärmen: ${q.onScreen ?? 'INGEN FILM'}`, ...(q.awaited ? [`väntad: ${q.awaited}`] : []),
    ...q.elements, ...q.events.slice(-10)]; }, {
  playback: () => { const video = scene.players.current?.video; return video ? {clip: scene.players.path, frame: scene.players.frame(), rate: video.playbackRate, paused: scene.players.paused} : null; },
  toggle: () => scene.players.toggle(),
  step: direction => scene.players.step(direction),
})).catch(() => null);
