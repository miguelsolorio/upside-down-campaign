// Sheet pages for Hawkins Middle School (stage 1.3): the 13 tiles by day and at night, two little school stages (hall and
// classroom, cafeteria and gym) by day and at night with the pools the game paints, and the new props. The Demogorgon and
// the two effects are in sheet_demo.ts. Everything is built from the legend in core/tiles.ts, so it shows the tiles the
// way the stage will bake them.
import type { PropKind, PropState } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawProp } from './props.ts';
import { paintGlow } from './glow.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage, samplePx, tileSample } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import type { Page } from './sheet_a.ts';
import { SCHOOL_TILES } from './tile_school.ts';
import { DEMO_PAGES } from './sheet_demo.ts';

const nightCache = new Map<string, HTMLCanvasElement>();
/** A tile sample at night: the day sample repainted the way a night stage bakes it. */
function nightSample(name: TileName, v: number): HTMLCanvasElement {
  const key = `${name}${v}`;
  let c = nightCache.get(key);
  if (!c) {
    c = nightTile(samplePx(name, v), name, { tx: 5 + v * 3, ty: 4 + v * 7, near: { n: name, e: name, s: name, w: name } }).toCanvas();
    nightCache.set(key, c);
  }
  return c;
}

// Hall and classroom: the facade and the lot, the locker hall, the science room with its chalkboard, trophy case and desks.
const HALL = [
  '%%%%%%%%%%%%%%%%',
  '%%%%%%%%%%%%%%%%',
  'gggg====_===gggg',
  'KKKKKKKKKKKKKKKK',
  'KAAAAAAAAAAAAAAK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KKKKKKKKKKKKKKKK',
  'KJQQQJJRRJJJJJJK',
  'KnPPnPPnPPnPPnnK',
  'KnnnnnnnnnnnnnnK',
  'KnPPnPPnPPnPPnnK',
];
// Cafeteria and gym: checker floor, tables, the serving counter, then the bleachers over the court.
const CAFE = [
  'KKKKKKKKKKKKKKKK',
  'KJJJJJJJJJJJJJJK',
  'KjjjjjjjjjjjjjjK',
  'KjIIIIjjjIIIIjjK',
  'KjjjjjjjjjjjjjjK',
  'KjIIIIjjjIIIIjjK',
  'KjjjZZZZZZZZjjjK',
  'KjjjjjjjjjjjjjjK',
  'KKKKKKKKKKKKKKKK',
  'K##############K',
  'KuuuuuuuuuuuuuuK',
  'KuuuuuuuuuuuuuuK',
];
// A bare room for the props: wall faces on top, with a gap for a doorway.
const ROOM = [
  'KKKKKKKKKKKKKKKK',
  'KJJJJJJJJJJJJJJK',
  'KJJJJJJJJJJnnJJK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KnnnnnnnnnnnnnnK',
  'KKKKKKKKKKKKKKKK',
];

const baked = new Map<string, BakedStage>();
function bake(key: string, rows: string[], night: boolean): BakedStage {
  const k = `${key}${night}`;
  let b = baked.get(k);
  if (!b) { b = bakeStage(rows, night); baked.set(k, b); }
  return b;
}

/** Draws a baked stage under the HUD strip, with the pools of a night stage when asked. */
function stagePage(ctx: Ctx, key: string, rows: string[], night: boolean, t: number, lamps: [number, number, number][]): BakedStage {
  const stage = bake(key, rows, night);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.save();
  ctx.translate(0, VIEW_TOP);
  drawStage(ctx, stage, 0, 0, t);
  if (night) paintGlow(ctx, [...lamps.map(([x, y, r]) => ({ x, y: y + VIEW_TOP, r, flicker: 0.4 })), ...stage.windows.map((w) => ({ x: w.x, y: w.y + VIEW_TOP, r: 30, k: 1.1 }))], t);
  ctx.restore();
  return stage;
}

const title = (ctx: Ctx, text: string): void => {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
  drawText(ctx, text, 6, 6, 'white');
  drawText(ctx, 'UP DOWN', 200, 6, 'slate');
};

const prop = (kind: PropKind, x: number, y: number, w: number, h: number, state: PropState, t: number) => ({ id: `${kind}${x}${y}`, kind, x, y, w, h, state, t });

const tiles: Page = {
  title: 'SCHOOL',
  subs: 5,
  draw(ctx, t, sub) {
    if (sub === 0) {
      ctx.fillStyle = PAL.night;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      drawText(ctx, 'SCHOOL TILES: DAY THEN NIGHT, THREE EACH', 4, 3, 'bone');
      SCHOOL_TILES.forEach((n, i) => {
        const col = i % 7, blockY = i < 7 ? 14 : 112, cx = 2 + col * 36;
        ctx.drawImage(tileSample(n, 0), cx, blockY);
        ctx.drawImage(tileSample(n, 1), cx + 17, blockY);
        ctx.drawImage(tileSample(n, 2), cx, blockY + 17);
        ctx.drawImage(nightSample(n, 0), cx + 17, blockY + 17);
        ctx.drawImage(nightSample(n, 1), cx, blockY + 34);
        ctx.drawImage(nightSample(n, 2), cx + 17, blockY + 34);
        drawText(ctx, n.toUpperCase().slice(0, 6), cx, blockY + 53, 'mist');
      });
      drawText(ctx, 'UP DOWN', 4, 214, 'slate');
      return;
    }
    const night = sub === 2 || sub === 4, hall = sub <= 2;
    stagePage(ctx, hall ? 'hall' : 'cafe', hall ? HALL : CAFE, night, t, hall ? [[40, 80, 26], [216, 80, 26], [120, 120, 20]] : [[24, 56, 22], [232, 56, 22], [128, 150, 40]]);
    title(ctx, `${hall ? 'HALL AND SCIENCE ROOM' : 'CAFETERIA AND GYM'} ${night ? 'AT NIGHT' : 'BY DAY'}`);
  },
};

const props: Page = {
  title: 'SCHOOL PROPS',
  subs: 2,
  draw(ctx, t, sub) {
    const night = sub === 1;
    const stage = bake('room', ROOM, night);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, stage, 0, 0, t);
    drawProp(ctx, prop('firebox', 24, 16, 16, 16, 'closed', t), night);
    drawProp(ctx, prop('firebox', 72, 16, 16, 16, 'lit', t), night);
    drawProp(ctx, prop('vines', 176, 32, 32, 16, 'closed', t), night);
    drawProp(ctx, prop('vines', 176, 112, 32, 16, 'open', t), night);
    drawProp(ctx, prop('vines', 32, 80, 16, 32, 'closed', t), night);
    drawProp(ctx, prop('vines', 64, 80, 16, 32, 'open', t), night);
    drawProp(ctx, prop('van', 32, 130, 48, 28, 'closed', t), night);
    drawProp(ctx, prop('van', 112, 130, 32, 16, 'open', t), night);
    drawProp(ctx, prop('van', 112, 156, 48, 28, 'open', t), night);
    ctx.restore();
    title(ctx, night ? 'FIREBOX, VINES, VAN AT NIGHT' : 'FIREBOX, VINES, VAN BY DAY');
    const label = (s: string, x: number, y: number): void => { drawText(ctx, s, x, y + VIEW_TOP, 'bone', { shadow: true }); };
    label('DARK', 22, 38); label('LIT', 74, 38); label('CLOSED', 168, 54); label('BURNED', 168, 134);
    label('CLOSED', 22, 116); label('BURNED', 58, 116); label('UPRIGHT', 36, 160); label('TIPPED', 108, 150);
  },
};

export const PAGES_D: Page[] = [tiles, props, ...DEMO_PAGES];
