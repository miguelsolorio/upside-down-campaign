// Picks layout 2, List: a drawer down the left of the map, one row to a hero, in the menu's own manner (the yellow pointer
// and a quiet bar on the cursor row). The right half of the map stays open, so the stage's node and the lead's token show.
import { drawIcon } from '../../gfx/index.ts';
import { box } from '../kit.ts';
import type { PicksOption } from './picks_kit.ts';
import { drawGate, drawLevel, drawMark, drawName, head, legendLines, look, startRow, title } from './picks_kit.ts';

const W = 152, TOP = 10, H = 186;
const ROW_Y = 27, PITCH = 22;

export const LIST: PicksOption = {
  slug: 'list',
  name: 'List',
  note: 'A drawer on the left, one row to a hero: head, name, level, gate, then the place or LEAD. The right half of the map stays open.',
  draw(ctx, s, t) {
    box(ctx, 0, TOP, W, H, 'ink');
    box(ctx, W - 1, TOP, 1, H, 'slate');
    title(ctx, s, 8, 15, W - 8);
    s.rows.forEach((r, i) => {
      const y = ROW_Y + i * PITCH;
      if (s.cursor === i) {
        box(ctx, 1, y, W - 3, PITCH, 'night');
        drawIcon(ctx, 'cursor', 3, y + 7, t);
      }
      head(ctx, r.id, 13, y + 3, look(r).frame);
      drawName(ctx, r, 34, y + 7);
      drawLevel(ctx, r, 75, y + 7);
      drawGate(ctx, r, 98, y + 8);
      drawMark(ctx, r, W - 8, y + 8, 'right');
    });
    const by = ROW_Y + 6 * PITCH + 7;
    startRow(ctx, s, 8, by + 7, 76);
    legendLines(ctx, s, W - 8, by);
  },
};
