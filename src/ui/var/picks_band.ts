// Picks layout 5, Band: the map's own party band, grown. It stays docked along the bottom and replaces the band, so nearly
// the whole map stays in view. The smallest type of the five: a head, then the place, level and gate in the 3 by 5 font.
import { drawTinyText } from '../../gfx/index.ts';
import { box } from '../kit.ts';
import type { PicksOption } from './picks_kit.ts';
import { brackets, drawMark, head, legendLine, look, startRow } from './picks_kit.ts';

const Y = 170, H = 54;
const PITCH = 41, X0 = 5;

export const BAND: PicksOption = {
  slug: 'band',
  name: 'Band',
  note: 'The map\'s party band grown to carry six, docked along the bottom so the stage and its token stay in view. All type is the small font.',
  draw(ctx, s) {
    box(ctx, 0, Y, 256, H, 'ink');
    box(ctx, 0, Y, 256, 1, 'blood1');
    box(ctx, 0, Y + 1, 256, 1, 'blood0');
    s.rows.forEach((r, i) => {
      const x = X0 + i * PITCH, l = look(r);
      head(ctx, r.id, x + 1, Y + 7, l.frame);
      drawMark(ctx, r, x + 20, Y + 7);
      drawTinyText(ctx, `LV${r.level}`, x + 20, Y + 13, l.level);
      if (r.gate) drawTinyText(ctx, r.gate, x + 20, Y + 19, 'mist');
      drawTinyText(ctx, r.name.toUpperCase(), x, Y + 27, l.name);
      if (s.cursor === i) brackets(ctx, x - 3, Y + 3, 43, 34);
    });
    startRow(ctx, s, 5, Y + 40, 72);
    legendLine(ctx, s, 251, Y + 43, 'right');
  },
};
