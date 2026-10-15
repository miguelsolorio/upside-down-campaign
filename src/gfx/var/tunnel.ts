// The five tunnel looks in card order, and the card canvas for tunnel-variations.html: the sample room at night at 3x, the same
// room at its real size, then the tiles and the two props one by one. One canvas per look, so it can be exported as one image.
// draw(phase) repaints it for one step of the veins' pulse.
import type { Ctx } from '../canvas.ts';
import { PAL } from '../palette.ts';
import { COLD } from './tunnel_cold.ts';
import { GUT } from './tunnel_gut.ts';
import { HIVE } from './tunnel_hive.ts';
import { MINE } from './tunnel_mine.ts';
import { ROOTS } from './tunnel_roots.ts';
import { ROOM_H, ROOM_W, crackOf, gapOf, legend, roomPx } from './tunnel_kit.ts';
import type { Look } from './tunnel_kit.ts';
import { cardCanvas, flat, label, zoom } from './kit.ts';

export type { Look } from './tunnel_kit.ts';
export const TUNNEL_OPTS: Look[] = [ROOTS, COLD, GUT, MINE, HIVE];

const K = 3, PAD = 8, SIDE = 264;
export const CARD_W = PAD + ROOM_W * K + 12 + SIDE + PAD;
export const CARD_H = PAD + ROOM_H * K + PAD;

export interface TunnelCard { canvas: HTMLCanvasElement; draw: (phase: number) => void }

function paint(g: Ctx, look: Look, phase: number): void {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const room = roomPx(look, phase);
  zoom(g, room, PAD, PAD, K);
  const rx = PAD + ROOM_W * K + 12;
  label(g, 'THE ROOM AT 1X', rx, PAD, 'mist');
  flat(g, room, rx, PAD + 12);
  const ly = PAD + 12 + ROOM_H + 16;
  legend(look, phase).forEach((t, i) => {
    const x = rx + i * 38;
    zoom(g, t.px, x, ly, 2);
    label(g, t.name, x + (32 - t.name.length * 6) / 2, ly + 36, 'slate');
  });
  const py = ly + 56;
  zoom(g, gapOf(look), rx, py, 2);
  label(g, 'GAP', rx + 4, py + 68, 'slate');
  zoom(g, crackOf(look), rx + 52, py + 32, 2);
  label(g, 'CRACK', rx + 52 + 17, py + 68, 'slate');
}

export function tunnelCard(look: Look): TunnelCard {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'black');
  c.setAttribute('data-snap', `tunnel-${look.slug}`);
  c.setAttribute('aria-label', `${look.name}: a sample tunnel room at night with floor, cap and wall, roots, veins, a nest, a gap and a crack`);
  const draw = (phase: number): void => paint(g, look, phase & 3);
  draw(0);
  return { canvas: c, draw };
}
