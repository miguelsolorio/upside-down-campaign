// Which game each cabinet in the Palace plays, and the titles on the marquees. Pure data with no gfx import, so the
// cabinet art in gfx/props_town.ts can read it without a cycle.
import { ARCADE_GAMES } from './types.ts';
import type { ArcadeGameId } from './types.ts';

export const TITLES: Record<ArcadeGameId, string> = {
  digdug: 'DIG DUG', centipede: 'CENTIPEDE', dragonslair: "DRAGON'S LAIR", galaga: 'GALAGA', pacman: 'PAC-MAN', mspacman: 'MS. PAC-MAN',
};

/** Stage 2.1's cabinets by prop id. A few games stand twice, like in a real arcade. */
export const CABINET_GAMES: Readonly<Record<string, ArcadeGameId>> = {
  cab1: 'galaga', cab2: 'pacman', cab3: 'centipede', cab4: 'dragonslair', cab5: 'mspacman',
  cab6: 'centipede', cab7: 'mspacman', cab8: 'galaga', digdug: 'digdug',
};

/** The game a cabinet plays. A cabinet that isn't in the table gets one from its id, the same every time. */
export function gameFor(id: string): ArcadeGameId {
  const known = CABINET_GAMES[id];
  if (known) return known;
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ARCADE_GAMES[(h >>> 0) % ARCADE_GAMES.length] as ArcadeGameId;
}
