// The mock scenes of chapter5-abyss.html, each a 256 by 224 frame drawn the way the game will draw it: the Abyss (the backdrop, then the
// island tiles, a vine bridge and a hole in the floor, with heroes and a Demogorgon for scale), the heart (arena tiles, the channel
// marks, the spider with Vecna in its chest, a hero on each mark, the pulsing glow), and the ending (the basement, then THE END). They
// are for looking at, and they show what each painter needs from the stage that registers it. Pure drawing on a Ctx, so Node can run it.
import type { Ctx } from '../canvas.ts';
import { composeDemo } from '../actor_demo.ts';
import { drawFlayerLeg } from '../actor_flayer.ts';
import type { ActorView } from '../../core/types.ts';
import { Px } from '../px.ts';
import type { TileCtx } from '../tile_ground.ts';
import { drawAbyssBg } from './abyss_bg.ts';
import { abyssTile } from './abyss_tiles.ts';
import { drawFinaleSpider } from './finale_boss.ts';
import { drawTheEnd, endingStill } from './finale_end.ts';
import { heroPx } from './finale_party.ts';
import { drawChannelMark, drawHeartGlow, heartTile } from './heart_tiles.ts';

export { heroPx };

/** The Demogorgon, shut, facing the camera. */
export const demoPx = (): Px => composeDemo('down', 'stand', 0, false);

const tileCache = new Map<string, HTMLCanvasElement>();

/** A tile painted once per place, neighbors and phase, as the stage baker does: the canvas for a tile, or null when the painter has none. */
export function tileCanvas(paint: (name: string, c: TileCtx, phase: number) => Px | null, name: string, c: TileCtx, phase: number): HTMLCanvasElement | null {
  const key = `${name}|${c.tx}|${c.ty}|${c.near.n}|${c.near.e}|${c.near.s}|${c.near.w}|${phase}`;
  let hit = tileCache.get(key);
  if (!hit) {
    const px = paint(name, c, phase);
    if (!px) return null;
    hit = px.toCanvas();
    tileCache.set(key, hit);
  }
  return hit;
}

/** A letter map of tiles to stage: draws every tile through `paint` with its four neighbors, tile (0, 0) at the frame's corner. */
export function drawMap(ctx: Ctx, rows: readonly string[], names: Record<string, string>, paint: (name: string, c: TileCtx, phase: number) => Px | null, phase = 0, gap = 'abyssgap'): void {
  const at = (x: number, y: number): string => names[rows[y]?.[x] ?? ' '] ?? gap;
  for (let ty = 0; ty < rows.length; ty++) {
    for (let tx = 0; tx < (rows[0] as string).length; tx++) {
      const c = tileCanvas(paint, at(tx, ty), { tx, ty, near: { n: at(tx, ty - 1), e: at(tx + 1, ty), s: at(tx, ty + 1), w: at(tx - 1, ty) } as TileCtx['near'] }, phase);
      if (c) ctx.drawImage(c, tx * 16, ty * 16);
    }
  }
}

/** A sprite with its feet at (x, y), the way an actor is placed, with a flat shadow under it. */
export function stand(ctx: Ctx, p: Px, x: number, y: number): void {
  ctx.drawImage(new Px(12, 3).ellipse(6, 1.5, 6, 1.5, 'black').toCanvas(), Math.round(x - 6), Math.round(y - 2));
  ctx.drawImage(p.toCanvas(), Math.round(x - p.w / 2), Math.round(y - p.h + 1));
}

// ---------------------------------------------------------------- the Abyss
const ABYSS_NAMES: Record<string, string> = {
  g: 'abysslawn', r: 'abyssroad', l: 'abyssline', p: 'abyssporch', c: 'abyssclass', k: 'abysscliff', u: 'abyssunder', ' ': 'abyssgap', h: 'abyssbridgeh', v: 'abyssbridgev',
};

/** Draws a rectangle of one tile letter into a map, for laying out islands. */
export function lay(rows: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) (rows[y] as string[])[x] = ch;
}

/** An island: its floor, the cliff face under its south edge and the rock under that. */
function island(rows: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  lay(rows, x0, y0, x1, y1, ch);
  lay(rows, x0, y1 + 1, x1, y1 + 1, 'k');
  lay(rows, x0, y1 + 2, x1, y1 + 2, 'u');
}

/** The Abyss's map for the scene: four islands, a bridge between two of them and two more going down, and a hole in the lawn. */
export function abyssRows(): string[] {
  const rows = Array.from({ length: 14 }, () => Array.from({ length: 16 }, () => ' '));
  island(rows, 1, 2, 4, 4, 'c');
  island(rows, 10, 2, 14, 5, 'r');
  lay(rows, 10, 4, 14, 4, 'l');
  lay(rows, 5, 3, 9, 3, 'h');
  island(rows, 0, 8, 6, 10, 'g');
  (rows[9] as string[])[3] = ' ';
  island(rows, 9, 9, 14, 11, 'p');
  lay(rows, 2, 5, 2, 7, 'v');
  lay(rows, 12, 6, 12, 8, 'v');
  return rows.map((r) => r.join(''));
}

/** The Abyss: the backdrop, then the island tiles, heroes on a bridge and an island, a Demogorgon on the porch. */
export function abyssScene(ctx: Ctx, t: number, heroes: Px[], foe: Px): void {
  drawAbyssBg(ctx, t, 0, 0);
  drawMap(ctx, abyssRows(), ABYSS_NAMES, abyssTile, (t >> 4) & 3);
  stand(ctx, heroes[0] as Px, 7 * 16 + 8, 3 * 16 + 13);
  stand(ctx, heroes[1] as Px, 2 * 16 + 8, 6 * 16 + 14);
  stand(ctx, heroes[2] as Px, 12 * 16 + 8, 4 * 16 + 14);
  stand(ctx, foe, 11 * 16 + 8, 11 * 16 + 4);
  stand(ctx, heroes[3] as Px, 3 * 16 + 10, 10 * 16 + 10);
}

// ---------------------------------------------------------------- the heart
const HEART_NAMES: Record<string, string> = { f: 'heartfloor', w: 'heartwall', e: 'heartrim' };

/** The arena's map: a circle of floor of radius r tiles round (cx, cy), the wall that touches it as the rim, and wall beyond. */
export function heartRows(cx = 8, cy = 7.5, r = 5.6): string[] {
  const floor = (x: number, y: number): boolean => Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.0) <= r;
  return Array.from({ length: 14 }, (_, y) => Array.from({ length: 16 }, (_, x) => (floor(x, y) ? 'f' : floor(x + 1, y) || floor(x - 1, y) || floor(x, y + 1) || floor(x, y - 1) ? 'e' : 'w')).join(''));
}

/** An ActorView with the fields a drawer reads, for placing the boss and its legs. */
export function view(over: Partial<ActorView> & Pick<ActorView, 'id' | 'x' | 'y'>): ActorView {
  return { kind: 'enemy', dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over };
}

/** The heart: the arena tiles, the glow, the two marks (Eleven's dim, Will's lit), the spider with Vecna in its chest, its legs, and the heroes. */
export function heartScene(ctx: Ctx, t: number, open: boolean, heroes: Px[]): void {
  drawMap(ctx, heartRows(), HEART_NAMES, heartTile, (t >> 4) & 3, 'heartwall');
  drawHeartGlow(ctx, t, 128, 120);
  drawChannelMark(ctx, 'eleven', 92, 156, t, false);
  drawChannelMark(ctx, 'will', 164, 156, t, true);
  const bar = (): void => {};
  const body = view({ id: 'flayer', x: 128, y: 74, t });
  drawFinaleSpider(ctx, body, open);
  const legs: [number, number, number, number, 'warn' | undefined][] = [[96, 82, 76, 140, undefined], [60, 84, 40, 140, undefined], [160, 82, 180, 140, undefined], [196, 84, 214, 140, 'warn']];
  for (const [x, y, tx, ty, pose] of legs) drawFlayerLeg(ctx, view({ id: 'flayerleg', x, y, aim: { x: tx, y: ty }, anim: pose ? 'attack' : 'idle', ...(pose ? { pose } : {}), t: t + x }), bar);
  stand(ctx, heroes[0] as Px, 92, 156);
  stand(ctx, heroes[1] as Px, 164, 156);
  stand(ctx, heroes[2] as Px, 128, 192);
  stand(ctx, heroes[3] as Px, 214, 176);
}

/** The ending: the card over the basement, or the basement alone. */
export function endScene(ctx: Ctx, t: number, card: boolean): void {
  if (card) drawTheEnd(ctx, 256, 0, t, 1); else ctx.drawImage(endingStill(256, 0), 0, 0);
}
