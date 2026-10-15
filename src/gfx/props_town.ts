// Props for stage 2.1: the arcade cabinet with its live attract screen, and the hidden path through the corn. The cabinet
// is 16 wide and 24 tall, standing on its footprint (bottom aligned, centered): marquee, a 10 by 8 screen drawn live from
// PropView.t, a control panel and a coin door, in the colors its id picks. Five games loop on the screens, and the cabinet
// with the id `digdug` alternates a dig with a high-score table that scrolls MADMAX at the top. The hidden path is corn until
// it opens, then a dark gap with the stalks parted. Static art is cached by drawProp (and repainted at night like any prop).
import type { PropView } from '../core/types.ts';
import { hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { drawTinyText } from './font.ts';
import type { ColorName } from './palette.ts';
import type { ArtFn } from './props_lab2.ts';
import { rim } from './props_lab2.ts';
import { Px } from './px.ts';
import { barnObject } from './tile_barn.ts';
import { createRng } from '../core/rng.ts';

export const ARCADE_W = 16, ARCADE_H = 24;
const SCREEN = { x: 3, y: 6, w: 10, h: 8 } as const;
/** Body, shade, trim: the cabinet colors an id can pick. */
const BODIES: [ColorName, ColorName, ColorName][] = [['blue', 'dusk', 'sky'], ['purple', 'purple0', 'magenta'], ['red', 'blood1', 'hot'], ['teal1', 'teal0', 'cyan'], ['pine2', 'pine1', 'leaf']];

/** Which look and which game an id gets: the same every frame. The Dig Dug cabinet is its own. */
export function arcadeLook(id: string): { body: number; game: number; digdug: boolean } {
  const h = hash2(id.length, id.charCodeAt(id.length - 1) || 0, id.split('').reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) | 0, 7));
  return { body: h % BODIES.length, game: (h >>> 8) % 5, digdug: id === 'digdug' };
}

// ---------------------------------------------------------------- the cabinet
/** The cabinet without its screen: marquee, bezel, panel with a stick and two buttons, the coin door, painted sides. */
export function arcadeArt(body: number): Px {
  const [main, shade, trim] = BODIES[body % BODIES.length] as [ColorName, ColorName, ColorName];
  const p = new Px(ARCADE_W, ARCADE_H);
  p.rect(2, 0, 12, 4, 'ink').rect(2, 0, 12, 1, trim).rect(3, 1, 10, 2, 'night');
  for (let i = 0; i < 5; i++) p.rect(4 + i * 2, 1 + (i & 1), 1, 1 + ((i + 1) & 1), trim).set(5 + i * 2, 2, 'white');
  p.rect(1, 4, 14, 1, shade).rect(1, 4, 1, 19, shade).rect(14, 4, 1, 19, shade);
  p.rect(2, 5, 12, 10, 'ink').rect(2, 5, 12, 1, 'grey1').rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 'black');
  p.rect(1, 15, 14, 1, 'grey3').rect(1, 16, 14, 3, 'grey2').rect(1, 18, 14, 1, 'grey1');
  p.rect(4, 16, 1, 2, 'grey1').disc(4.5, 16, 1.4, 'hot').set(4, 15, 'pink');
  p.rect(8, 16, 2, 2, 'red').set(8, 16, 'hot').rect(11, 16, 2, 2, 'yellow').set(11, 16, 'cream');
  p.rect(2, 19, 12, 4, main).rect(2, 19, 12, 1, trim).rect(3, 19, 1, 4, trim).rect(12, 19, 1, 4, shade);
  p.rect(5, 20, 6, 3, 'ink').rect(6, 21, 1, 1, 'amber').rect(9, 21, 1, 1, 'amber').rect(7, 22, 2, 1, 'grey2');
  p.rect(1, 22, 14, 1, shade).rect(0, 23, 16, 1, 'ink');
  for (let y = 5; y < 15; y += 2) p.set(1, y, trim);
  return p;
}

// ---------------------------------------------------------------- the attract screens
/** The top-left of the cabinet being drawn, so the screen painters can work in screen px. */
let OX = 0, OY = 0;
const P = (ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void => rect(ctx, OX + SCREEN.x + x, OY + SCREEN.y + y, w, h, c);

/** A space shooter: two rows of invaders that shuffle, a ship that slides and a shot that climbs. */
function shooter(ctx: Ctx, t: number): void {
  const sx = ((t >> 4) % 4) - 1;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) P(ctx, 1 + i * 2 + sx + (row & 1), 1 + row * 2, 1, 1, row ? 'yellow' : 'leaf');
  const sh = Math.round(4 + Math.sin(t / 40) * 3);
  P(ctx, sh, 7, 3, 1, 'cyan'); P(ctx, sh + 1, 6, 1, 1, 'cyan');
  const by = 6 - ((t >> 1) % 6);
  if (by >= 3) P(ctx, sh + 1, by, 1, 1, 'white');
}
/** A maze chaser: blue walls, a row of dots and a yellow mouth that eats along it, with a ghost behind. */
function chaser(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 1, 'blue'); P(ctx, 0, 7, 10, 1, 'blue'); P(ctx, 2, 3, 6, 1, 'blue');
  const x = (t >> 3) % 10;
  for (let i = 0; i < 10; i += 2) if (i > x) { P(ctx, i, 2, 1, 1, 'cream'); P(ctx, i, 5, 1, 1, 'cream'); }
  P(ctx, x, 5, 2, 2, 'yellow');
  if ((t >> 2) & 1) P(ctx, x + 1, 5, 1, 1, 'black');
  P(ctx, (x + 6) % 10, 5, 2, 2, 'hot'); P(ctx, (x + 6) % 10, 5, 1, 1, 'white');
}
/** A racer: a road with a dashed center line that scrolls toward you, and a car that weaves. */
function racer(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 3, 'sky'); P(ctx, 0, 3, 10, 5, 'grey2'); P(ctx, 0, 3, 1, 5, 'leaf'); P(ctx, 9, 3, 1, 5, 'leaf');
  for (let y = 3 + ((t >> 2) % 3); y < 8; y += 3) P(ctx, 4, y, 1, 1, 'white');
  const cx = 3 + Math.round(Math.sin(t / 30) * 2);
  P(ctx, cx, 5, 3, 2, 'hot'); P(ctx, cx + 1, 5, 1, 1, 'white');
}
/** A platformer: a ground strip, a ledge, a hero that hops and a coin that spins. */
function hopper(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 7, 'blue'); P(ctx, 0, 7, 10, 1, 'soil2'); P(ctx, 5, 4, 4, 1, 'soil3');
  const ph = t % 60, x = 1 + Math.floor(ph / 9), y = 5 - (ph < 30 ? Math.round(Math.sin((ph / 30) * Math.PI) * 3) : 0);
  P(ctx, x, y, 1, 2, 'hot'); P(ctx, x, y - 1, 1, 1, 'pink');
  if ((t >> 3) & 1) P(ctx, 7, 2, 1, 1, 'yellow'); else P(ctx, 7, 2, 2, 1, 'yellow');
}
/** A title screen: a block logo and an INSERT COIN bar that blinks once a second. */
function title(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 8, 'purple0');
  for (let i = 0; i < 5; i++) P(ctx, 1 + i * 2, 1 + (i & 1), 1, 3, i & 1 ? 'magenta' : 'cyan');
  if (((t >> 5) & 1) === 0) P(ctx, 1, 6, 8, 1, 'white');
}

const GAMES = [shooter, chaser, racer, hopper, title];

/** Dig Dug: dirt with a tunnel, the digger tunnelling after a red monster; every other half minute the screen shows its scores. */
function dig(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 1, 'sky'); P(ctx, 0, 1, 10, 7, 'soil2'); P(ctx, 0, 1, 10, 1, 'pine3');
  P(ctx, 0, 4, 10, 1, 'soil1'); P(ctx, 0, 6, 10, 1, 'soil3');
  const x = (t >> 3) % 12 - 1;
  P(ctx, 0, 3, Math.max(0, Math.min(10, x + 1)), 2, 'ink');
  P(ctx, x, 3, 2, 2, 'white'); P(ctx, x + 1, 3, 1, 1, 'blue');
  P(ctx, Math.min(9, x + 4), 3, 2, 2, 'hot'); P(ctx, Math.min(9, x + 4), 3, 1, 1, 'white');
}

/** The high-score table: a title line, MADMAX in yellow scrolling by on the first row, two more rows below. */
function scores(ctx: Ctx, t: number): void {
  P(ctx, 0, 0, 10, 8, 'night');
  P(ctx, 1, 0, 8, 1, 'hot');
  ctx.save();
  ctx.beginPath();
  ctx.rect(OX + SCREEN.x, OY + SCREEN.y + 1, SCREEN.w, 5);
  ctx.clip();
  const name = 'MADMAX', span = name.length * 4 + SCREEN.w;
  drawTinyText(ctx, name, OX + SCREEN.x + SCREEN.w - ((t / 5) | 0) % span, OY + SCREEN.y + 2, 'yellow');
  ctx.restore();
  P(ctx, 1, 7, 5, 1, 'cyan'); P(ctx, 7, 7, 2, 1, 'white');
}

/** The live part of a cabinet: the screen. x and y are the top-left of its 16 by 24 body. */
export function arcadeLive(ctx: Ctx, id: string, x: number, y: number, t: number, calm: boolean): void {
  const look = arcadeLook(id);
  const tt = calm ? 0 : t;
  OX = x; OY = y;
  if (look.digdug) {
    if (Math.floor(t / 270) % 2 === 0) dig(ctx, tt); else scores(ctx, tt);
    return;
  }
  (GAMES[look.game] as typeof shooter)(ctx, tt);
}

// ---------------------------------------------------------------- the hidden path
/** The corn wall, w by h, drawn from the corn tile (so it matches the walls beside it). */
function cornWall(w: number, h: number, tx: number, ty: number): Px {
  const out = new Px(w, h);
  for (let j = 0; j < Math.ceil(h / 16); j++) {
    for (let i = 0; i < Math.ceil(w / 16); i++) {
      const c = { tx: tx + i, ty: ty + j, near: { n: 'corn', e: 'corn', s: 'corn', w: 'corn' } as const };
      const t = barnObject('corn', c, createRng(hash2(c.tx, c.ty, 6)));
      if (t) out.blit(t, i * 16, j * 16);
    }
  }
  return out;
}

/** The path when it opens: stalks parted to either side, dark trampled ground between, `gap` px wide at most. */
export function hiddenArt(w: number, h: number, tx: number, ty: number, open: boolean, gap: number): Px {
  const wall = cornWall(w, h, tx, ty);
  if (!open || gap <= 0) return wall;
  const g = Math.min(gap, w - 4), x0 = (w - g) >> 1;
  for (let y = 0; y < h; y++) {
    const lean = Math.round(Math.sin(y * 0.5) * 0.7);
    for (let x = x0 + lean; x < x0 + lean + g; x++) {
      const edge = x === x0 + lean || x === x0 + lean + g - 1;
      wall.set(x, y, edge ? 'pine0' : (x + y) & 1 ? 'soil0' : (y & 3) === 0 ? 'soil1' : 'pine0');
    }
    if ((y & 3) === 1) wall.set(x0 + lean - 1, y, 'pine3').set(x0 + lean + g, y, 'sand');
  }
  for (let y = 3; y < h; y += 7) wall.set(x0 + 2 + (y % 3), y, 'soil2');
  return wall;
}

// ---------------------------------------------------------------- public
/** Draws an arcade cabinet or a hidden path. Returns false for any other kind. */
export function drawTownProp(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  if (v.kind === 'arcade') {
    const look = arcadeLook(v.id);
    const cx = x + ((w - ARCADE_W) >> 1), cy = y + h - ARCADE_H;
    ctx.drawImage(art(`arcade${look.body}`, () => rim(arcadeArt(look.body))), cx - 1, cy - 1);
    arcadeLive(ctx, v.id, cx, cy, v.t, calm);
    return true;
  }
  if (v.kind === 'hidden') {
    const open = v.state === 'open';
    const gap = open ? Math.min(8, calm ? 8 : 2 + Math.floor(v.t / 4)) : 0;
    ctx.drawImage(art(`hidden${w}x${h}@${x >> 4},${y >> 4}${open ? gap : 'c'}`, () => hiddenArt(w, h, x >> 4, y >> 4, open, gap)), x, y);
    return true;
  }
  return false;
}
