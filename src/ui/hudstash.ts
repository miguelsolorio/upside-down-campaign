// Erica's stash in the top strip (docs/level-7.md, "Erica and the stash"): a mini Eggo and a mini Coke with a tiny count each, in the
// MP column's caption row (ui/hudlayout.ts says why there). Frameless like the rest of the strip, and the counts are grey like the
// captions. The icons are drawn for this size, 5 px tall, not cut down from the 8 px pickups.
import type { Stash, StashItem } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { drawTinyText } from '../gfx/index.ts';
import { box } from './kit.ts';
import type { Ctx } from './kit.ts';
import { STASH_ICON_W, STASH_Y, stashCells } from './hudlayout.ts';

/** An Eggo: a tan rim round a checker of amber and orange, the waffle. A Coke: a grey rim, a red can lit on the left. */
export const STASH_ART: Record<StashItem, { rows: string[]; map: Record<string, ColorName> }> = {
  eggo: { rows: ['.sss.', 'saoas', 'soaos', 'saoas', '.sss.'], map: { s: 'soil3', a: 'amber', o: 'orange' } },
  coke: { rows: ['ggg', 'hrd', 'rwr', 'hrd', 'ggg'], map: { g: 'grey3', h: 'hot', r: 'red', d: 'blood1', w: 'white' } },
};
/** The count's color: quiet, like a caption. */
const COUNT_COLOR: ColorName = 'mist';

/** Draws the stash, or nothing when it is empty. Call it with the strip's origin already moved to the active hero's side. */
export function drawStash(ctx: Ctx, stash: Stash | undefined): void {
  for (const c of stashCells(stash)) {
    const art = STASH_ART[c.item];
    art.rows.forEach((row, j) => {
      for (let i = 0; i < STASH_ICON_W[c.item]; i++) {
        const color = art.map[row[i] as string];
        if (color) box(ctx, c.x + i, STASH_Y + j, 1, 1, color);
      }
    });
    drawTinyText(ctx, String(c.count), c.x + STASH_ICON_W[c.item] + 1, STASH_Y, COUNT_COLOR);
  }
}
