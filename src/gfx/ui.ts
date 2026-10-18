// UI art: portraits, icons, panels and bars. Portraits and icons are built once and cached as canvases.
import type { CharId, Expr, IconId, PanelStyle } from '../core/types.ts';
import { settings } from '../core/settings.ts';
import type { ColorName } from './palette.ts';
import type { Part } from './data/types.ts';
import { Px } from './px.ts';
import { hash2, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { EXPR, HEAD, NOSE, PORTRAITS, SHOULDERS } from './data/portraits.ts';
import type { PortraitSpec, Shirt } from './data/portraits.ts';
import { BULB_COLORS, BULB_ICON, ICON_ART } from './data/icons.ts';
import { HOPPER4_PORTRAIT } from './data/hopper4.ts';
import { hopperInPrison } from './looks.ts';

// ---------------------------------------------------------------- portraits
const SHARED: Record<string, ColorName> = { e: 'ink', w: 'white', m: 'blood1', r: 'rose', z: 'cyan' };

function shirtRole(kind: Shirt, x: number, y: number): string {
  switch (kind) {
    case 'stripes': return ((y - 18) >> 1) & 1 ? 'b' : 'a';
    case 'plaid': {
      const v = x % 6 < 2, h = (y - 18) % 5 < 2;
      return v ? 'b' : h ? 'c' : 'a';
    }
    case 'jacket': return (x === 11 || x === 12) && y >= 20 ? 'b' : 'a';
    case 'cardigan': return y >= 20 && x >= 9 && x <= 14 ? 'b' : 'a';
    default: return 'a';
  }
}

function camoRole(x: number, y: number): string {
  const n = hash2(x >> 1, y >> 1, 3) % 5;
  return n < 2 ? 'g' : n < 4 ? 'G' : 'H';
}

// Grayscale portraits stay inside the palette: each pixel's brightness picks a step on the grey ramp.
const GRAY_RAMP: ColorName[] = ['ink', 'grey1', 'grey2', 'grey3', 'bone'];
const GRAY_CUTS = [28, 80, 140, 215];
function toGray(px: Px): void {
  for (let i = 0; i < px.d.length; i++) {
    const v = px.d[i] as number;
    if (v === 0) continue;
    const luma = 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
    let k = 0;
    while (k < GRAY_CUTS.length && luma >= (GRAY_CUTS[k] as number)) k++;
    px.d[i] = px32(GRAY_RAMP[k] as ColorName);
  }
}

/** Hopper wears the Telogreika from chapter 4 (looks.ts): his portrait is the prison one, and cached apart from the Uniform's. */
const inPrison = (who: CharId): boolean => who === 'hopper' && hopperInPrison();
const portraitKey = (who: CharId, expr: Expr, gray: boolean, prison = inPrison(who)): string => `${who}${prison ? ':prison' : ''}:${expr}${gray ? ':gray' : ''}`;

function buildPortrait(who: CharId, expr: Expr, gray = false, prison = inPrison(who)): HTMLCanvasElement {
  const spec: PortraitSpec = prison && who === 'hopper' ? HOPPER4_PORTRAIT : PORTRAITS[who];
  const px = new Px(24, 24).fill(spec.bg);
  const color = (ch: string): ColorName | null => {
    if (ch === 'S') return spec.pal.s ?? null;
    return spec.pal[ch] ?? SHARED[ch] ?? null;
  };
  const draw = (part: Part, fill?: (ch: string, x: number, y: number) => string): void => {
    part.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        let ch = row[i] as string;
        if (ch === '.') continue;
        if (fill) ch = fill(ch, i, part.y + j);
        const c = color(ch);
        if (c) px.set(i, part.y + j, c);
      }
    });
  };
  const shirtFill = (ch: string, x: number, y: number): string => (ch === 'A' ? shirtRole(spec.shirt, x, y) : ch);
  const camoFill = (ch: string, x: number, y: number): string => (ch === 'C' ? camoRole(x, y) : ch);
  draw(SHOULDERS, shirtFill);
  for (const p of spec.trim) draw(p);
  for (const p of spec.back) draw(p);
  draw(HEAD);
  draw(NOSE);
  // The face goes on before the front hair, so a cap or a bandana hides eyebrows the way it would in life.
  // The sweat drop is the exception: it sits on top of whatever is on the head.
  const late: Part[] = [];
  for (const p of EXPR[expr]) {
    // A character's own grin replaces the plain smile, which is the layer that starts on row 13.
    if (expr === 'happy' && spec.grin && p.y === 13) { for (const g of spec.grin) draw(g); continue; }
    if (p.rows.some((r) => r.includes('z'))) late.push(p); else draw(p);
  }
  for (const p of spec.front) draw(p, camoFill);
  for (const p of late) draw(p);
  px.frame(0, 0, 24, 24, 'ink');
  if (gray) toGray(px);
  return px.toCanvas();
}

const portraits = new Map<string, HTMLCanvasElement>();
/** 24x24 portrait with its top-left at x,y. `gray` draws it in greys, for a hero who is down. `prison` picks Hopper's look in place of the chapter's (the sheet shows both). */
export function drawPortrait(ctx: Ctx, who: CharId, expr: Expr, x: number, y: number, gray = false, prison = inPrison(who)): void {
  const key = portraitKey(who, expr, gray, prison);
  let c = portraits.get(key);
  if (!c) { c = buildPortrait(who, expr, gray, prison); portraits.set(key, c); }
  ctx.drawImage(c, Math.round(x), Math.round(y));
}

// ---------------------------------------------------------------- icons
const D20_ROWS = ['...kk...', '..kffk..', 'kkfeefkk', 'kfewfefk', 'kfeeeefk', 'kksssskk', '..kssk..', '...kk...'];
const D20_PAL: Record<string, ColorName> = { k: 'ink', f: 'bone', e: 'grey2', w: 'white', s: 'grey3' };
const D20_GLOW: Record<string, ColorName> = { k: 'ink', f: 'yellow', e: 'orange', w: 'white', s: 'amber' };
const D20_HOT: Record<string, ColorName> = { k: 'ink', f: 'cream', e: 'amber', w: 'white', s: 'yellow' };

const iconCache = new Map<string, HTMLCanvasElement>();
function iconCanvas(key: string, build: () => Px): HTMLCanvasElement {
  let c = iconCache.get(key);
  if (!c) { c = build().toCanvas(); iconCache.set(key, c); }
  return c;
}

/** The quarter: a 7 px coin in the corner of the 8x8 icon. A lit rim on the top left, a shaded one on the bottom right,
 * a bone face with a glint, and a stamped mark. r is the lit rim, s the shaded rim, f the face, w the glint, m the mark. */
const QUARTER_ROWS = ['..rrr...', '.rfffs..', 'rfwmffs.', 'rffmffs.', 'rfffffs.', '.sfffs..', '..sss...', '........'];
const QUARTER_PAL: Record<string, ColorName> = { r: 'grey3', s: 'grey2', f: 'bone', w: 'white', m: 'grey3' };
function quarterPx(): Px {
  return new Px(8, 8).art(QUARTER_ROWS, QUARTER_PAL);
}

/** 8x8 icons. t drives the blink of the arrow, the nudge of the cursor and the d20 glow. */
export function drawIcon(ctx: Ctx, icon: IconId, x: number, y: number, t = 0): void {
  x = Math.round(x); y = Math.round(y);
  if (icon.startsWith('bulb')) {
    ctx.drawImage(iconCanvas(icon, () => new Px(8, 8).art(BULB_ICON, BULB_COLORS[icon] as Record<string, ColorName>)), x, y);
    if (icon !== 'bulbOff' && !settings.reduceFlashing && (t % 120) < 6) rect(ctx, x + 2, y + 3, 1, 1, 'white');
    return;
  }
  switch (icon) {
    case 'd20':
      ctx.drawImage(iconCanvas('d20', () => new Px(8, 8).art(D20_ROWS, D20_PAL)), x, y);
      return;
    case 'd20Glow': {
      const hot = settings.reduceFlashing ? false : ((t >> 3) & 3) === 1;
      ctx.drawImage(iconCanvas(hot ? 'd20h' : 'd20g', () => new Px(8, 8).art(D20_ROWS, hot ? D20_HOT : D20_GLOW)), x, y);
      if (!settings.reduceFlashing) {
        const s = (t >> 3) & 3;
        for (const [dx, dy] of [[0, 0], [7, 0], [0, 7], [7, 7]] as [number, number][]) if (((dx + dy + s) & 1) === 0) rect(ctx, x + dx, y + dy, 1, 1, s === 1 ? 'white' : 'yellow');
      }
      return;
    }
    case 'quarter':
      ctx.drawImage(iconCanvas('quarter', quarterPx), x, y);
      return;
    case 'arrow':
      ctx.drawImage(iconCanvas('arrow', () => new Px(8, 8).art(ICON_ART.arrow.rows, ICON_ART.arrow.map)), x, y + ((t >> 4) & 1));
      return;
    case 'cursor':
      ctx.drawImage(iconCanvas('cursor', () => new Px(8, 8).art(ICON_ART.cursor.rows, ICON_ART.cursor.map)), x + ((t >> 3) & 1), y);
      return;
    default: {
      const art = ICON_ART[icon];
      if (!art) return;
      ctx.drawImage(iconCanvas(icon, () => new Px(8, 8).art(art.rows, art.map, art.ox ?? 0, art.oy ?? 0)), x, y);
    }
  }
}

// ---------------------------------------------------------------- panels and bars
/** One pixel outline with the four corner pixels left out. */
function notched(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void {
  rect(ctx, x + 1, y, w - 2, 1, c);
  rect(ctx, x + 1, y + h - 1, w - 2, 1, c);
  rect(ctx, x, y + 1, 1, h - 2, c);
  rect(ctx, x + w - 1, y + 1, 1, h - 2, c);
}

export function drawPanel(ctx: Ctx, x: number, y: number, w: number, h: number, style: PanelStyle = 'dialog'): void {
  x = Math.round(x); y = Math.round(y);
  if (style === 'hud') {
    rect(ctx, x, y, w, h, 'ink');
    rect(ctx, x, y + h - 2, w, 1, 'shadow');
    rect(ctx, x, y + h - 1, w, 1, 'slate');
    return;
  }
  const dialog = style === 'dialog';
  rect(ctx, x + 1, y + 1, w - 2, h - 2, dialog ? 'night' : 'shadow');
  notched(ctx, x, y, w, h, 'ink');
  notched(ctx, x + 1, y + 1, w - 2, h - 2, dialog ? 'bone' : 'mist');
  notched(ctx, x + 2, y + 2, w - 4, h - 4, dialog ? 'slate' : 'dusk');
  if (dialog) rect(ctx, x + 3, y + 1, w - 6, 1, 'white');
}

const LIGHT: Partial<Record<ColorName, ColorName>> = {
  red: 'hot', hot: 'pink', pine2: 'pine3', pine3: 'leaf', blue: 'sky', teal1: 'cyan', amber: 'yellow', orange: 'amber',
  yellow: 'cream', cyan: 'white', sky: 'white', purple: 'magenta', leaf: 'cream', pink: 'white', rose: 'pink', mist: 'bone', slate: 'mist',
};
const DARK: Partial<Record<ColorName, ColorName>> = {
  red: 'blood1', hot: 'red', pine3: 'pine2', pine2: 'pine1', leaf: 'pine3', blue: 'dusk', sky: 'blue', cyan: 'teal1', yellow: 'amber',
  amber: 'orange', orange: 'soil2', purple: 'purple0', magenta: 'purple', pink: 'rose', rose: 'blood1', mist: 'slate', slate: 'dusk', teal1: 'teal0',
};

/** A bar of exactly w by h. Taller bars get a lit top row and a shaded bottom row. */
export function drawBar(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, color: ColorName, back: ColorName = 'ink'): void {
  x = Math.round(x); y = Math.round(y);
  rect(ctx, x, y, w, h, back);
  const f = Math.max(0, Math.min(1, frac));
  const n = f > 0 ? Math.max(1, Math.round(w * f)) : 0;
  if (n <= 0) return;
  rect(ctx, x, y, n, h, color);
  if (h >= 3) rect(ctx, x, y, n, 1, LIGHT[color] ?? 'white');
  if (h >= 4) rect(ctx, x, y + h - 1, n, 1, DARK[color] ?? 'black');
}

/** A bar of exactly w by h that fills from the bottom up. The vertical twin of drawBar: the left column is lit and the right shaded. */
export function drawBarV(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, color: ColorName, back: ColorName = 'ink'): void {
  x = Math.round(x); y = Math.round(y);
  rect(ctx, x, y, w, h, back);
  const f = Math.max(0, Math.min(1, frac));
  const n = f > 0 ? Math.max(1, Math.round(h * f)) : 0;
  if (n <= 0) return;
  rect(ctx, x, y + h - n, w, n, color);
  if (w >= 3) rect(ctx, x, y + h - n, 1, n, LIGHT[color] ?? 'white');
  if (w >= 3) rect(ctx, x + w - 1, y + h - n, 1, n, DARK[color] ?? 'black');
}

/** Builds every portrait up front so the first dialogue box has no hitch. */
export function warmUi(): void {
  for (const who of Object.keys(PORTRAITS) as CharId[]) {
    for (const e of Object.keys(EXPR) as Expr[]) {
      for (const prison of who === 'hopper' ? [false, true] : [false]) {
        const key = portraitKey(who, e, false, prison);
        if (!portraits.has(key)) portraits.set(key, buildPortrait(who, e, false, prison));
      }
    }
  }
}
