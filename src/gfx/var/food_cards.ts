// The cards of foodcourt-variations.html: one canvas per look, with the three sample rooms at 2x (a corner of the arena, a kitchen and a
// run of escalator, all at night), then the tiles one by one at 3x beside the Confetti mall's for continuity, then the same three rooms
// at their real size, 1x. The canvas carries everything, so it can be exported as one image. The painters and the rooms are in food.ts
// and food_*.ts, the looks in food_looks.ts.
import { PAL } from '../palette.ts';
import { flat, label, cardCanvas, zoom } from './kit.ts';
import { foodLegend, foodRoom } from './food.ts';
import type { FoodLook } from './food.ts';

export { FOOD_LOOKS } from './food_looks.ts';
export type { FoodLook } from './food.ts';

const K = 2, GAP = 12, PAD = 8;
const A_W = 14 * 16, K_W = 8 * 16, E_W = 6 * 16;
export const CARD_W = PAD + (A_W + K_W + E_W) * K + 2 * GAP + PAD;
const ROOM_Y = PAD + 12;
const LEG_Y = ROOM_Y + 9 * 16 * K + 20;
const ONE_Y = LEG_Y + 48 + 34;
export const CARD_H = ONE_Y + 9 * 16 + PAD;

/** One look's card canvas. */
export function foodCard(look: FoodLook): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'black');
  const arena = foodRoom(look, 'arena'), kitchen = foodRoom(look, 'kitchen'), esc = foodRoom(look, 'escalator');
  const kx = PAD + A_W * K + GAP, ex = kx + K_W * K + GAP;
  label(g, 'THE COURT, A CORNER OF IT', PAD, PAD, 'mist');
  label(g, 'A KITCHEN', kx, PAD, 'mist');
  label(g, 'THE ESCALATOR', ex, PAD, 'mist');
  zoom(g, arena, PAD, ROOM_Y, K);
  zoom(g, kitchen, kx, ROOM_Y, K);
  zoom(g, esc, ex, ROOM_Y, K);
  ['AT NIGHT, UNDER THE CONFETTI MALL.', 'POOLS OF LIGHT AT THE MENU BOARDS,', 'THE SKYLIGHT, THE FRYERS, THE GOO.'].forEach((t, i) => label(g, t, kx, ROOM_Y + 6 * 16 * K + 8 + i * 11, 'slate'));
  label(g, 'EVERY TILE BELOW IS ONE PAINTER', PAD, LEG_Y - 14, 'mist');
  let x = PAD;
  for (const t of foodLegend(look)) {
    if (t.mall && t.name === 'FLOOR') label(g, 'CONFETTI MALL, FOR CONTINUITY', x, LEG_Y - 14, 'mist');
    g.fillStyle = PAL.night;
    g.fillRect(x - 1, LEG_Y - 1, 50, 50);
    zoom(g, t.px, x, LEG_Y, 3);
    label(g, t.name, x + (48 - t.name.length * 6) / 2, LEG_Y + 52, t.mall ? 'cream' : 'slate');
    x += 62;
  }
  label(g, 'AT 1X', PAD, ONE_Y - 12, 'slate');
  flat(g, arena, PAD, ONE_Y);
  flat(g, kitchen, PAD + A_W + GAP, ONE_Y);
  flat(g, esc, PAD + A_W + K_W + 2 * GAP, ONE_Y);
  c.setAttribute('data-snap', `foodcourt-${look.slug}`);
  c.setAttribute('aria-label', `${look.name}: a corner of the food court at night, a kitchen and an escalator, with each tile one by one beside the Confetti mall's tiles`);
  return c;
}
