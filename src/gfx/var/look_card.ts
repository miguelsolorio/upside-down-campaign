// The card for a chapter 4 stage look (look_kit.ts): the sample room at 3x, and on the right the same room at its real size
// and the legend, each tile and prop at 2x with its name. draw(phase) repaints it for one step of anything that flickers.
import type { Ctx } from '../canvas.ts';
import { PAL } from '../palette.ts';
import { ROOM_H, ROOM_W, legend, roomPx } from './look_kit.ts';
import type { Room, StageLook } from './look_kit.ts';
import type { Made } from './ch4_page.ts';
import { cardCanvas, flat, label, zoom } from './kit.ts';

const K = 3, PAD = 8, SIDE = 272;
export const LOOK_W = PAD + ROOM_W * K + 12 + SIDE + PAD;
export const LOOK_H = PAD + ROOM_H * K + PAD;

function paint(g: Ctx, room: Room, look: StageLook, phase: number): void {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, LOOK_W, LOOK_H);
  const px = roomPx(room, look, phase);
  zoom(g, px, PAD, PAD, K);
  const rx = PAD + ROOM_W * K + 12;
  label(g, look.night ? 'THE ROOM AT 1X, NIGHT' : 'THE ROOM AT 1X, DAY', rx, PAD, 'mist');
  flat(g, px, rx, PAD + 12);
  let x = rx, y = PAD + 12 + ROOM_H + 14, rowH = 0;
  for (const t of legend(room, look, phase)) {
    const w = Math.max(t.px.w * 2, t.name.length * 6), h = t.px.h * 2 + 12;
    if (x + w > rx + SIDE) { x = rx; y += rowH + 6; rowH = 0; }
    zoom(g, t.px, x + Math.round((w - t.px.w * 2) / 2), y, 2);
    label(g, t.name, x + Math.round((w - t.name.length * 6) / 2), y + t.px.h * 2 + 3, 'slate');
    x += w + 8;
    rowH = Math.max(rowH, h);
  }
}

export function lookCard(room: Room, look: StageLook, sheet: string): Made {
  const { c, g } = cardCanvas(LOOK_W, LOOK_H, 'black');
  c.setAttribute('data-snap', `${sheet}-${look.slug}`);
  c.setAttribute('aria-label', `${look.name}: a sample room with its tiles and props`);
  const draw = (phase: number): void => paint(g, room, look, phase & 3);
  draw(0);
  return { canvas: c, draw };
}
