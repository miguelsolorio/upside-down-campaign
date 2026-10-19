// The clock curse's and Max's Walkman's pieces of the top strip (docs/level-11.md, "The curse" and "Max's Walkman"): four pips on a
// cursed hero's slot, and a small tape on Max's. ui/hudlayout.ts says where they go. Frameless like the rest of the strip, and drawn for
// this size, not cut down from the world's clock mark.
import type { HudView } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { box } from './kit.ts';
import type { Ctx } from './kit.ts';
import { CURSE_PIPS, CURSE_PIP_GAP, CURSE_PIP_H, CURSE_PIP_W, TAPE_MARK_DY, TAPE_W } from './hudlayout.ts';

/** A chime sounded is red, one still to come is dim. The face of a cursed hero is framed in the same red. */
export const PIP_SOUNDED: ColorName = 'hot';
export const PIP_WAITING: ColorName = 'dusk';
export const CURSE_FRAME: ColorName = 'red';

/** The pips of a cursed hero, one per chime, true for those sounded (`PartyHud.curse` is 1 to 3, so the fourth stays dim until the KO).
 * Null when the hero is not cursed. */
export function cursePips(curse: number | undefined): boolean[] | null {
  const n = typeof curse === 'number' && Number.isFinite(curse) ? Math.max(0, Math.min(CURSE_PIPS, Math.floor(curse))) : 0;
  return n > 0 ? Array.from({ length: CURSE_PIPS }, (_, i) => i < n) : null;
}

/** The pips as a column from (x, y), the first chime on top. Draws nothing for a hero who is not cursed. */
export function drawCurse(ctx: Ctx, x: number, y: number, curse: number | undefined): void {
  cursePips(curse)?.forEach((sounded, i) => box(ctx, x, y + i * (CURSE_PIP_H + CURSE_PIP_GAP), CURSE_PIP_W, CURSE_PIP_H, sounded ? PIP_SOUNDED : PIP_WAITING));
}

// ---------------------------------------------------------------- the tape
type Walkman = NonNullable<HudView['walkman']>;

/** What the tape shows. `ready` is a full recharge (lit), `fill` how much of the label has filled while it isn't (0 to 3 of its 4 px),
 * `on` that it is protecting, which turns the label green and puts a line under it. `dead` is Max down: grey and still. */
export interface TapeLook { ready: boolean; fill: number; on: boolean; dead: boolean }

export function tapeLook(w: Walkman, dead = false): TapeLook {
  const ready = Number.isFinite(w.ready) ? Math.max(0, Math.min(1, w.ready)) : 0;
  return { ready: ready >= 1, fill: Math.min(3, Math.floor(ready * 4)), on: w.on > 0, dead };
}

/** A cassette, 6 by 5: the body round it, the label on top (four px, the recharge fills it), two reels and the head's window. */
const TAPE_ROWS = ['bbbbbb', 'bllllb', 'bkbbkb', 'bbkkbb', 'bbbbbb'];
const BODY = { dead: 'dusk', ready: 'bone', dim: 'slate' } as const;
const REEL = { dead: 'ink', ready: 'ink', dim: 'night' } as const;

/** The tape's pixels, row by row, null where it is clear. */
export function tapePixels(look: TapeLook): (ColorName | null)[][] {
  const tone = look.dead ? 'dead' : look.ready ? 'ready' : 'dim';
  return TAPE_ROWS.map((row) => [...row].map((c, i): ColorName | null => {
    if (c === 'b') return BODY[tone];
    if (c === 'k') return REEL[tone];
    if (look.dead) return 'shadow';
    if (look.on) return 'leaf';
    return look.ready ? 'yellow' : i - 1 < look.fill ? 'mist' : 'dusk';
  }));
}

/** The tape with its top left at (x, y), and the protecting line under it while Max's Walkman is on. */
export function drawTape(ctx: Ctx, x: number, y: number, w: Walkman, dead = false): void {
  const look = tapeLook(w, dead);
  tapePixels(look).forEach((row, j) => row.forEach((c, i) => { if (c) box(ctx, x + i, y + j, 1, 1, c); }));
  if (look.on && !look.dead) box(ctx, x, y + TAPE_MARK_DY, TAPE_W, 1, 'leaf');
}
