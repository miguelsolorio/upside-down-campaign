// Erica's cart over the map (docs/map-screen.md, "Erica's cart"): her portrait and one dry line, a row per item (icon, name, price,
// how many are carried out of three), the purse and a one-line legend, in a panel the way the party picks draws, inside inFrame with
// the gfx primitives. ui/shop_logic.ts holds the rules; this file turns input into those calls and draws the result. ui/map.ts opens
// it with Special and takes the Progress back on close.
import type { Game } from '../core/scene.ts';
import type { Progress } from '../core/progress.ts';
import type { ColorName } from '../gfx/palette.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { hitIndex } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawPortrait, drawText, drawTinyText } from '../gfx/index.ts';
import { brackets, dither, outline, plate, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';
import { boughtBetween, createShop, legend, lineFor, moveTo, purchase, purse, rowsOf, step } from './shop_logic.ts';
import type { ShopRow, ShopState } from './shop_logic.ts';

// The layout, in frame px: the panel, the portrait, a row and the pitch between rows. Two rows, centered between the map's
// top strip and its party band.
const PX = 4, PW = 248, PH = 110;
const PY = 48;
const FACE = { x: PX + 8, y: PY + 17 };
const ROW_X = PX + 8, ROW_W = PW - 16, ROW_H = 20, PITCH = 24;
const ROW_Y = PY + 49;
const rowRect = (i: number): Rect => ({ x: ROW_X, y: ROW_Y + i * PITCH, w: ROW_W, h: ROW_H });
/** The click cell of a row: the row and the gap under it, so the cells meet and the mouse is always over one. */
const cell = (i: number): Rect => ({ x: ROW_X, y: ROW_Y + i * PITCH - 2, w: ROW_W, h: PITCH });

export interface ShopOpts {
  /** The record the cart opens on: its purse and stash. */
  progress: Progress;
  /** Esc, Backspace or B: the cart shuts, with the Progress it leaves. */
  onClose(p: Progress): void;
}

/** The panel, driven by whoever owns it: map.ts calls update while it is open and draws it after the map. */
export interface ShopPanel {
  update(g: Game): void;
  draw(ctx: Ctx): void;
  /** The state, for tests. */
  state(): ShopState;
}

export function createShopPanel(opts: ShopOpts): ShopPanel {
  let s = createShop(opts.progress);
  let done = false;

  /** Moves the cursor. The same object back means it stayed. */
  const move = (next: ShopState): void => {
    if (next === s) return;
    s = next;
    audio.sfx('select');
  };
  /** Buys one of row `i`: the register for a buy, the refusal sound for a grey row. */
  const buyRow = (i: number): void => {
    const next = purchase(s, i);
    audio.sfx(boughtBetween(s, next) ? 'buy' : 'cancel');
    s = next;
  };
  const close = (): void => {
    done = true;
    audio.sfx('cancel');
    opts.onClose(s.progress);
  };

  /** The mouse: moving onto a row takes the cursor, a click on a row buys one. */
  function mouse(g: Game): void {
    const i = g.input;
    const cells = rowsOf(s).map((_, k) => cell(k));
    const hover = toFrame(i.hover());
    const over = hitIndex(cells, hover);
    if (over >= 0) {
      i.point();
      if (i.moved()) move(moveTo(s, over));
    }
    const at = hitIndex(cells, toFrame(i.clicked()));
    if (at >= 0) buyRow(at);
  }

  return {
    state: () => s,
    update(g) {
      if (done) return;
      const i = g.input;
      // X is special and cancel together, so Esc and Backspace are cancel without special. A touch screen's B is that pair
      // too, so its way out is the pause button.
      if ((i.pressed('cancel') && !i.pressed('special')) || i.pressed('pause')) { close(); return; }
      if (i.pressed('attack') || i.pressed('confirm')) { buyRow(s.cursor); return; }
      const dir = i.pressed('up') ? 'up' : i.pressed('down') ? 'down' : null;
      if (dir) { move(step(s, dir)); return; }
      mouse(g);
    },
    draw(ctx) {
      plate(ctx, PX, PY, PW, PH);
      drawText(ctx, "ERICA'S CART", PX + 8, PY + 6, 'white');
      drawPurse(ctx, purse(s), PX + PW - 8, PY + 6);
      drawFace(ctx, s);
      rowsOf(s).forEach((r, k) => drawRow(ctx, r, rowRect(k)));
      const c = rowRect(s.cursor);
      brackets(ctx, c.x - 3, c.y - 3, c.w + 6, c.h + 6);
      const line = legend(getPromptDevice(), labelOf('attack'), labelOf('pause')).join('  ');
      drawTinyText(ctx, line, PX + 8, PY + PH - 12, 'mist');
    },
  };
}

// ---------------------------------------------------------------- the panel
/** The purse, right-aligned at x: a PURSE caption, the quarter and the count, as the HUD's coins read. */
function drawPurse(ctx: Ctx, quarters: number, x: number, y: number): void {
  const text = `x${quarters}`;
  const w = drawText(ctx, text, x, y, 'white', { align: 'right' });
  drawIcon(ctx, 'quarter', x - w - 10, y);
  drawTinyText(ctx, 'PURSE', x - w - 10 - 24, y + 1, 'mist');
}

/** Erica and what she says. She smiles at a sale and sets her jaw at a refusal. */
function drawFace(ctx: Ctx, s: ShopState): void {
  const { x, y } = FACE;
  outline(ctx, x - 1, y - 1, 26, 26, 'bone');
  drawPortrait(ctx, 'erica', s.note === 'bought' ? 'happy' : s.note ? 'determined' : 'neutral', x, y);
  const color: ColorName = s.note === 'bought' ? 'yellow' : s.note ? 'hot' : 'bone';
  drawText(ctx, lineFor(s), x + 34, y + 9, color);
}

/** One item: its icon, name, price and how many are carried out of three. A row that can't be bought is grey. */
function drawRow(ctx: Ctx, r: ShopRow, at: Rect): void {
  const { x, y, w, h } = at;
  const on = r.live;
  outline(ctx, x, y, w, h, on ? 'bone' : 'grey1');
  const text: ColorName = on ? 'white' : 'grey2';
  drawIcon(ctx, r.item, x + 8, y + 6);
  drawText(ctx, r.name, x + 24, y + 7, text);
  drawIcon(ctx, 'quarter', x + 88, y + 6);
  drawText(ctx, String(r.price), x + 99, y + 7, text);
  drawText(ctx, `${r.carried} OF ${r.max}`, x + w - 8, y + 7, on ? 'yellow' : 'grey2', { align: 'right' });
  // The art keeps its colors, so a grey row dims it with a checker of the panel's ink.
  if (!on) {
    dither(ctx, x + 8, y + 6, 8, 8, 'ink', 2);
    dither(ctx, x + 88, y + 6, 8, 8, 'ink', 2);
  }
}
