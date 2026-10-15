// Picks layout 4, Slots: the party is four slots in order, with the lead first, and the heroes left over wait on a bench
// below. What you pick is what you see in the slots. The slots are the result and the bench is where you choose from.
import { drawPortrait, drawText } from '../../gfx/index.ts';
import { outline } from '../kit.ts';
import type { PickRow, PicksOption } from './picks_kit.ts';
import { brackets, drawGate, drawLevel, drawMark, drawName, face, legendLines, look, plate, startRow, title } from './picks_kit.ts';

const PX = 4, PW = 248, PY = 26, PH = 155;
const SW = 54, SH = 70, SPITCH = 60;
const CW = 74, CH = 44, BPITCH = 80;

export const SLOTS: PicksOption = {
  slug: 'slots',
  name: 'Slots',
  note: 'Four slots in party order, the lead first and amber, with who is left on a bench under them. Slots hold the result, the bench is what you pick from.',
  draw(ctx, s) {
    plate(ctx, PX, PY, PW, PH);
    title(ctx, s, PX + 8, PY + 6, PX + PW - 8);
    const party = s.rows.filter((r) => r.slot > 0).sort((a, b) => a.slot - b.slot);
    const bench = s.rows.filter((r) => r.slot === 0);
    const cursor = s.rows[s.cursor] as PickRow;
    party.forEach((r, i) => {
      const x = PX + 7 + i * SPITCH, y = PY + 17, cx = x + SW / 2;
      outline(ctx, x, y, SW, SH, look(r).frame);
      drawMark(ctx, r, cx, y + 5, 'center');
      face(ctx, r.id, cx - 12, y + 13, look(r).frame);
      drawName(ctx, r, cx, y + 41, 'center');
      drawLevel(ctx, r, cx, y + 50, 'center');
      drawGate(ctx, r, cx, y + 60, 'center');
      if (r === cursor) brackets(ctx, x - 3, y - 3, SW + 6, SH + 6);
    });
    const by = PY + 17 + SH + 8;
    drawText(ctx, 'BENCH', PX + 7, by, 'mist');
    bench.forEach((r, i) => {
      const x = PX + 7 + i * BPITCH, y = by + 10;
      outline(ctx, x, y, CW, CH, look(r).frame);
      drawPortrait(ctx, r.id, 'neutral', x + 5, y + 5);
      drawName(ctx, r, x + 34, y + 6);
      drawLevel(ctx, r, x + 34, y + 16);
      drawGate(ctx, r, x + 34, y + 26);
      if (r === cursor) brackets(ctx, x - 3, y - 3, CW + 6, CH + 6);
    });
    legendLines(ctx, s, PX + PW - 8, by + 10);
    startRow(ctx, s, PX + PW - 8 - 72, by + 10 + CH - 11, 72);
  },
};
