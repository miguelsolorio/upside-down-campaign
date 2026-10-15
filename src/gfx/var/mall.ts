// The card canvas for mall-variations.html: a look's sample mall room beside its sample base room, each at 2x, then the tiles and
// props one by one under each, then both rooms at their real size, 1x. One canvas per look, so it can be exported as one image.
// draw(phase, lit) repaints it for one step of the machine and for the power box fired or at rest.
import type { Ctx } from '../canvas.ts';
import { PAL } from '../palette.ts';
import type { Px } from '../px.ts';
import { cardCanvas, flat, label, zoom } from './kit.ts';
import { ROOM_H, ROOM_W, baseRoom, legends, mallRoom } from './mall_kit.ts';
import type { Look } from './mall_kit.ts';
import { LOOKS } from './mall_looks.ts';

export type { Look } from './mall_kit.ts';
export { LOOKS };

const K = 2, PAD = 8, GAP = 8;
const COL = ROOM_W * K;
export const CARD_W = PAD + COL + GAP + COL + PAD;
const TOP = 12;
const ROOM_Y = PAD + TOP;
const LEG_Y = ROOM_Y + ROOM_H * K + 10;
const LEG_H = 130;
const ONE_Y = LEG_Y + LEG_H + 12;
export const CARD_H = ONE_Y + ROOM_H + PAD;

/** Lays items out left to right in a column, wrapping, each at 2x with its name under it. */
function flow(g: Ctx, items: { name: string; px: Px }[], x0: number, y0: number, width: number, bg: string): void {
  let x = x0, y = y0, rowH = 0;
  for (const it of items) {
    const w = it.px.w * K, h = it.px.h * K;
    if (x + w > x0 + width) { x = x0; y += rowH + 8; rowH = 0; }
    g.fillStyle = bg;
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    zoom(g, it.px, x, y, K);
    const nw = it.name.length * 6;
    label(g, it.name, x + Math.max(-2, (w - nw) / 2), y + h + 3, 'slate');
    x += Math.max(w, nw) + 6;
    rowH = Math.max(rowH, h + 10);
  }
}

function paint(g: Ctx, look: Look, phase: number, lit: boolean): void {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const mall = mallRoom(look), base = baseRoom(look, phase, lit);
  const bx = PAD + COL + GAP;
  label(g, `MALL, ${look.night ? 'AFTER CLOSING' : 'BY DAY'}`, PAD, PAD, 'mist');
  label(g, `BASE, ${look.night ? 'AFTER CLOSING' : 'BY DAY'}${lit ? ', POWER BOX FIRED' : ''}`, bx, PAD, 'mist');
  zoom(g, mall, PAD, ROOM_Y, K);
  zoom(g, base, bx, ROOM_Y, K);
  const L = legends(look, phase);
  flow(g, L.mall, PAD, LEG_Y, COL, '#10142a');
  flow(g, L.base, bx, LEG_Y, COL, '#10142a');
  label(g, 'AT 1X', PAD, ONE_Y - 10, 'slate');
  flat(g, mall, PAD, ONE_Y);
  flat(g, base, bx, ONE_Y);
  const note = look.night
    ? ['AFTER CLOSING. BOTH STAGES USE', 'THE NIGHT ART, WITH POOLS OF', 'LIGHT AT THE NEON, THE FOUNTAIN', 'AND THE MACHINE.']
    : ['BY DAY. BOTH STAGES USE THE DAY', 'ART AS IT IS PAINTED. THERE IS NO', 'DARKNESS LAYER AND NO POOLS.'];
  note.forEach((t, i) => label(g, t, PAD + ROOM_W + 12, ONE_Y + 4 + i * 11, 'slate'));
  ['UNDER EACH ROOM: THE TILES AND', "PROPS ONE BY ONE, IN THE LOOK'S", 'OWN LIGHT. THE POWER BOX AND THE', 'SWITCH SHOW AT REST AND FIRED.'].forEach((t, i) => label(g, t, bx + ROOM_W + 12, ONE_Y + 4 + i * 11, 'slate'));
}

export interface MallCard { canvas: HTMLCanvasElement; draw: (phase: number, lit: boolean) => void }

export function mallCard(look: Look): MallCard {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'black');
  c.setAttribute('data-snap', `mall-${look.slug}`);
  c.setAttribute('aria-label', `${look.name}: a sample mall room ${look.night ? 'after closing' : 'by day'} beside a matching base room, with the tiles and props one by one`);
  const draw = (phase: number, lit: boolean): void => paint(g, look, phase & 3, lit);
  draw(0, false);
  return { canvas: c, draw };
}
