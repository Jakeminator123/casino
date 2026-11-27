// What game.html sets by itself when no look is asked for (src/game-page.ts), and the words of its address that are its own.
// Pure and small: the page reads it at once, while the look (src/game-look.ts) is read only when the address asks for one.
// The studio's base preset basgrund is this look (GAME in studio/lib/scene-presets.ts); a change here is made there too.

/** The scene as the game sets it: the picture filling the stage, the first room (its blur is the room's own,
 *  data/scene-rooms.json), the tray and the drawn cards on, and a room changed under a shimmer. How the picture is framed
 *  (zoom, pitch, yaw) is the play view's (src/play-view.ts), not the game's own. */
export const GAME_OWN = {format: 'fill', room: 'panorama', tray: true, cards: true, roomShift: 'shimmer'} as const;

/** The address's words that are the game's and never a key of the look; the Casino writes some of them into its frame
 *  (studio/lib/casino.ts gameSrc). trad: the one tree the game plays, komposition: the trees put together, uppsattning: the
 *  table and camera it shows (live or forra, src/uppsattning.ts; src/game-page.ts). */
export const OWN_WORDS: readonly string[] = ['table', 'tema', 'bricka', 'chatt', 'robot', 'inbaddad', 'dealer', 'diagnos', 'dealTempo', 'trad', 'komposition', 'uppsattning'];
