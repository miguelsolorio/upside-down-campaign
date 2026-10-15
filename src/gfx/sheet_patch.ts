// Sheet pages for stage 2.1 (docs/level-4.md): the 13 day tiles by day and at night, the Palace and Main Street with its
// cabinets, and the pumpkin patch with the barn, the corn, the hidden path closed and open, and the hole. The creatures, the
// effects and the map are in sheet_town.ts. Everything is built from the legend in core/tiles.ts, so it shows the tiles the
// way the stage will bake them.
import type { PropKind, PropState } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawProp } from './props.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage, samplePx, tileSample } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { PATCH_TILES } from './tile_town.ts';
import { TOWN_PAGES } from './sheet_town.ts';

const nightCache = new Map<string, HTMLCanvasElement>();
function nightSample(name: TileName, v: number): HTMLCanvasElement {
  const key = `${name}${v}`;
  let c = nightCache.get(key);
  if (!c) {
    c = nightTile(samplePx(name, v), name, { tx: 5 + v * 3, ty: 4 + v * 7, near: { n: name, e: name, s: name, w: name } }).toCanvas();
    nightCache.set(key, c);
  }
  return c;
}

// The Palace and Main Street: the arcade floor under its wall, the shop fronts, the sidewalk, the road and the far kerb.
const STREET = [
  '&&&&&&&&&&&&&&&&',
  '&++++++++++++++&',
  '&++++++++++++++&',
  '&++++++++++++++&',
  '&++++++++++++++&',
  '&++++++++++++++&',
  '&&&&&&&&&&&&&&&&',
  '@@@@@@@@@@@@@@@@',
  '////////////////',
  '================',
  '________________',
  '////////////////',
];
// The patch: the barn and its yard, the corn, then furrows with pumpkins, rot spreading and the hole.
const PATCH = [
  ']]]]]]]]::||||||',
  '[[[[[[[[::||||||',
  '::0:0:::::||||||',
  '^^^^^^^^^^^^^^^^',
  '^^*^$^*^^$^;;^^^',
  '^^^^^^;;;^^^;;;;',
  '^*^^$^^;;;;;;;;;',
  '^^^^^^;;;;<<<;;;',
  '^^^^^;;;;<<<<<;;',
  '^^^^;;;;;<<<<<;;',
  '^^^^^;;;;;<<<;;;',
  '||||||;;;;;;;;||',
];

const baked = new Map<string, BakedStage>();
function bake(key: string, rows: string[], night: boolean): BakedStage {
  const k = `${key}${night}`;
  let b = baked.get(k);
  if (!b) { b = bakeStage(rows, night); baked.set(k, b); }
  return b;
}

const title = (ctx: Ctx, text: string): void => {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
  drawText(ctx, text, 6, 6, 'white');
  drawText(ctx, 'UP DOWN', 200, 6, 'slate');
};
const prop = (kind: PropKind, id: string, x: number, y: number, w: number, h: number, state: PropState, t: number) => ({ id, kind, x, y, w, h, state, t });

const tiles: Page = {
  title: 'STREET AND PATCH',
  subs: 4,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      ctx.fillStyle = PAL.night;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      drawText(ctx, 'STAGE 2.1 TILES, DAY THEN NIGHT', 4, 3, 'bone');
      PATCH_TILES.forEach((n, i) => {
        const col = i % 7, blockY = i < 7 ? 14 : 112, cx = 2 + col * 36;
        ctx.drawImage(tileSample(n, 0), cx, blockY);
        ctx.drawImage(tileSample(n, 1), cx + 17, blockY);
        ctx.drawImage(tileSample(n, 2), cx, blockY + 17);
        ctx.drawImage(nightSample(n, 0), cx + 17, blockY + 17);
        ctx.drawImage(nightSample(n, 1), cx, blockY + 34);
        ctx.drawImage(nightSample(n, 2), cx + 17, blockY + 34);
        drawTinyText(ctx, n.toUpperCase().slice(0, 8), cx, blockY + 54, 'mist');
      });
      drawText(ctx, 'UP DOWN', 4, 214, 'slate');
      return;
    }
    const street = sub === 1, night = sub === 3;
    const stage = bake(street ? 'street' : 'patch', street ? STREET : PATCH, night);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, stage, 0, 0, t);
    if (street) {
      const ids = ['a1', 'a2', 'digdug', 'a4', 'a5'];
      ids.forEach((id, i) => drawProp(ctx, prop('arcade', id, 24 + i * 40, 32, 16, 16, 'closed', t)));
      ['b1', 'b2', 'b3', 'b4'].forEach((id, i) => drawProp(ctx, prop('arcade', id, 40 + i * 40, 80, 16, 16, 'closed', t + 90)));
      drawActor(ctx, view('max', 100, 66, { kind: 'npc', dir: 'up', anim: 'idle', t }));
      drawActor(ctx, view('mike', 120, 66, { dir: 'up', anim: 'idle', t }));
    } else {
      drawProp(ctx, prop('hidden', 'hid1', 192, 16, 16, 32, 'closed', t), night);
      drawProp(ctx, prop('hidden', 'hid2', 208, 16, 16, 32, 'open', Math.min(t, 40)), night);
      drawProp(ctx, prop('hidden', 'hid3', 224, 16, 16, 32, 'open', 60), night);
      drawActor(ctx, view('demodog', 40, 150, { kind: 'enemy', dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('demodog', 80, 160, { kind: 'enemy', dir: 'left', anim: 'dash', t }));
      drawActor(ctx, view('vine', 150, 132, { kind: 'enemy', dir: 'left', anim: 'idle', t }));
      drawActor(ctx, view('pod', 118, 124, { kind: 'enemy', dir: 'down', anim: 'attack', alert: true, t: t % 40 }));
      drawActor(ctx, view('mike', 60, 110, { dir: 'down', anim: 'idle', t }));
    }
    ctx.restore();
    title(ctx, `${street ? 'PALACE AND MAIN STREET' : 'THE PUMPKIN PATCH'}${night ? ' NIGHT' : ' DAY'}`);
  },
};

export const PAGES_E: Page[] = [tiles, ...TOWN_PAGES];
