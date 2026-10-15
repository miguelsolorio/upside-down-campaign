// Picks layout 3, Grid: three cards by two, each a framed tile with the face on the left and the name, level and gate beside
// it. Every hero gets the same room, and the frame carries the state: amber lead, bone party, slate bench.
import { outline } from '../kit.ts';
import type { PicksOption } from './picks_kit.ts';
import { brackets, drawGate, drawLevel, drawMark, drawName, legendLine, look, plate, startRow, title } from './picks_kit.ts';
import { drawPortrait } from '../../gfx/index.ts';

const PX = 4, PW = 248, PY = 35, PH = 136;
const CW = 74, CH = 44, GX = 80, GY = 50;

export const GRID: PicksOption = {
  slug: 'grid',
  name: 'Grid',
  note: 'Three cards by two. The face sits left of its name, level and gate, with the place or LEAD under the face.',
  draw(ctx, s) {
    plate(ctx, PX, PY, PW, PH);
    title(ctx, s, PX + 8, PY + 6, PX + PW - 8);
    s.rows.forEach((r, i) => {
      const x = PX + 7 + (i % 3) * GX, y = PY + 17 + Math.floor(i / 3) * GY;
      outline(ctx, x, y, CW, CH, look(r).frame);
      drawPortrait(ctx, r.id, 'neutral', x + 5, y + 5);
      drawName(ctx, r, x + 34, y + 6);
      drawLevel(ctx, r, x + 34, y + 16);
      drawGate(ctx, r, x + 34, y + 26);
      drawMark(ctx, r, x + 5, y + 34);
      if (s.cursor === i) brackets(ctx, x - 3, y - 3, CW + 6, CH + 6);
    });
    startRow(ctx, s, PX + 7, PY + 119, 56);
    legendLine(ctx, s, PX + PW - 8, PY + 122, 'right');
  },
};
