// Picks layout 1, Row: all six faces in one strip across the middle of the map, a label block under each. The biggest faces
// of the five and the most map around the edges. The lead's frame is amber, the party's is bone, the bench's is slate.
import type { PicksOption } from './picks_kit.ts';
import { brackets, drawGate, drawLevel, drawMark, drawName, face, legendLine, look, plate, startRow, title } from './picks_kit.ts';

const PX = 4, PW = 248, PY = 44, PH = 112;
const X0 = 8, PITCH = 40;

export const ROW: PicksOption = {
  slug: 'row',
  name: 'Row',
  note: 'Six faces in one strip, a place or LEAD above each, name, level and gate below. The map stays in view above and below.',
  draw(ctx, s) {
    plate(ctx, PX, PY, PW, PH);
    title(ctx, s, PX + 8, PY + 6, PX + PW - 8);
    s.rows.forEach((r, i) => {
      const cx = X0 + i * PITCH + 20, fx = cx - 12, fy = PY + 25;
      drawMark(ctx, r, cx, PY + 16, 'center');
      face(ctx, r.id, fx, fy, look(r).frame);
      drawName(ctx, r, cx, PY + 53, 'center');
      drawLevel(ctx, r, cx, PY + 62, 'center');
      drawGate(ctx, r, cx, PY + 72, 'center');
      if (s.cursor === i) brackets(ctx, fx - 4, fy - 4, 32, 32);
    });
    startRow(ctx, s, 96, PY + 86, 64);
    legendLine(ctx, s, 128, PY + 101, 'center');
  },
};
