// Sheet pages for levels 5 and 6, second half: the tunnels (tiles, then a sample room with veins that pulse, a drop and a crack), the
// overrun Lab (tiles, then the Gate chamber with its rift, tears, seals and a cracked wall), and the props and effects one by one.
// Everything is baked and drawn the way a night stage is, so it shows what the stages will.
import type { PropKind, PropState } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawProp } from './props.ts';
import { drawFx } from './fx.ts';
import { paintGlow } from './glow.ts';
import type { Glow } from './glow.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage, samplePx, tileSample } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { TUNNEL_TILES } from './tile_tunnel.ts';
import { FLESH_TILES } from './tile_flesh.ts';

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

const baked = new Map<string, BakedStage>();
export function bake(key: string, rows: string[]): BakedStage {
  let b = baked.get(key);
  if (!b) { b = bakeStage(rows, true); baked.set(key, b); }
  return b;
}

export const prop = (kind: PropKind, id: string, x: number, y: number, w: number, h: number, state: PropState, t: number, k?: number) => ({ id, kind, x, y, w, h, state, t, ...(k === undefined ? {} : { k }) });
export const head = (ctx: Ctx, text: string): void => {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
  drawText(ctx, text, 6, 6, 'white');
  drawText(ctx, 'UP DOWN', 4, 214, 'slate');
};

/** Three variants painted (as the tiles are written, in soil browns and reds) and three at night, for each name, in a grid. */
export function index(ctx: Ctx, names: TileName[], t: number, label: string): void {
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawText(ctx, label, 4, 3, 'bone');
  names.forEach((n, i) => {
    const col = i % 4, cx = 2 + col * 64, cy = 16 + ((i / 4) | 0) * 62;
    for (let v = 0; v < 3; v++) { ctx.drawImage(tileSample(n, v, t), cx + v * 17, cy); ctx.drawImage(nightSample(n, v), cx + v * 17, cy + 17); }
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
  });
}

// ---------------------------------------------------------------- the tunnels
// 1 floor, 2 cap, 3 wall face, 4 roots, 5 veins, 6 nest, 7 ladder.
const TUNNEL = [
  '2222222222222222',
  '2333333333323332',
  '2141441441115512',
  '2414411414511512',
  '2411466666455112',
  '2441166666451522',
  '2411411444155112',
  '2222222221111122',
  '2333333321111332',
  '2141144111554412',
  '2441141154441112',
  '2222222222222772',
  '2222222222222772',
];
const TUNNEL_LIGHTS: Glow[] = [{ x: 150, y: 80, r: 30 }, { x: 94, y: 70, r: 26 }, { x: 184, y: 104, r: 28 }];

const tunnels: Page = {
  title: 'TUNNELS',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      index(ctx, TUNNEL_TILES, t, 'STAGE 2.2 TILES: PAINTED, THEN AT NIGHT');
      drawText(ctx, 'UP DOWN', 4, 214, 'slate');
      return;
    }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, bake('tunnel', TUNNEL), 0, 0, t);
    if (sub === 1) {
      drawProp(ctx, prop('gap', 'g1', 160, 112, 16, 32, 'closed', t), true);
      drawProp(ctx, prop('gap', 'g2', 96, 112, 32, 16, 'open', t), true);
      drawProp(ctx, prop('crack', 'c1', 160, 128, 32, 16, 'closed', t), true);
      drawProp(ctx, prop('crack', 'c2', 208, 160, 32, 16, 'open', t), true);
      drawActor(ctx, view('max', 70, 90, { kind: 'hero', dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('steve', 52, 94, { kind: 'hero', dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('demodog', 120, 80, { kind: 'enemy', dir: 'left', anim: 'walk', t }));
    }
    ctx.restore();
    paintGlow(ctx, TUNNEL_LIGHTS.map((g) => ({ ...g, y: g.y + VIEW_TOP })), t);
    head(ctx, sub === 1 ? 'THE TUNNELS AT NIGHT: GAP, CRACK' : 'THE TUNNELS AT NIGHT: VEINS PULSE');
  },
};

// ---------------------------------------------------------------- the overrun Lab
// V roof edge, W wall face, 9 flesh wall, 8 flesh floor, ! tear, o lab floor.
const GATE = [
  'VVVVVVVVVVVVVVVV',
  'V99999999999999V',
  'V88888888888888V',
  'V88!888888!88o8V',
  'V8888888888888oV',
  'V88!8888888!88oV',
  'VVVVV88888VVVVVV',
  'VWWWW88888WWWWWV',
  'VooooooooooooooV',
  'VoooooooO8888ooV',
  'V88oo88oo8888o8V',
  'V8888888888888oV',
  'VVVVVVVVVVVVVVVV',
];

const lab: Page = {
  title: 'LAB OVERRUN',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      index(ctx, FLESH_TILES, t, 'STAGE 2.3 TILES: PAINTED, THEN AT NIGHT');
      (['labfloor', 'labwall'] as TileName[]).forEach((n, i) => { ctx.drawImage(tileSample(n, 0, t), 2 + i * 20, 160); });
      drawTinyText(ctx, 'THE LAB TILES THEY GROW OVER', 44, 164, 'mist');
      drawText(ctx, 'UP DOWN', 4, 214, 'slate');
      return;
    }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, bake('gate', GATE), 0, 0, t);
    const open = sub === 1;
    drawProp(ctx, prop('rift', 'rift', 96, 16, 64, 48, 'closed', t, open ? 0 : Math.min(1, (t % 240) / 200)), true);
    drawProp(ctx, prop('vines', 'seal1', 16, 128, 32, 16, 'open', t), true);
    drawProp(ctx, prop('vines', 'seal2', 80, 128, 32, 16, 'closed', t), true);
    drawProp(ctx, prop('crack', 'c1', 192, 112, 16, 32, 'closed', t), true);
    drawProp(ctx, prop('crack', 'c2', 224, 112, 16, 32, 'open', t), true);
    drawProp(ctx, prop('gap', 'g1', 144, 144, 16, 32, 'closed', t), true);
    drawActor(ctx, view('eleven', 120, 76, { kind: 'npc', dir: 'up', anim: 'cast', strained: true, t }));
    drawActor(ctx, view('hopper', 136, 76, { kind: 'npc', dir: 'up', anim: 'idle', t }));
    drawActor(ctx, view('alpha', 60, 100, { kind: 'enemy', dir: 'right', anim: 'walk', t }));
    ctx.restore();
    paintGlow(ctx, [{ x: 128, y: 72 + VIEW_TOP, r: 52, k: 1.2 }], t);
    head(ctx, open ? 'THE GATE WIDE OPEN, ELEVEN CHANNELING' : 'THE GATE CLOSING OVER THE DEFENSE');
  },
};

// ---------------------------------------------------------------- props and effects
const props: Page = {
  title: 'PROPS AND FX',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const stage = bake('props', Array.from({ length: 12 }, (_, y) => (y === 0 ? '2'.repeat(16) : y === 1 ? '3'.repeat(16) : '1'.repeat(16))));
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, stage, 0, 0, t);
    const label = (s: string, x: number, y: number): void => { drawTinyText(ctx, s, x, y, 'mist'); };
    if (sub === 0) {
      drawProp(ctx, prop('gap', 'a', 16, 40, 16, 32, 'closed', t), true); drawProp(ctx, prop('gap', 'b', 44, 56, 32, 16, 'open', t), true);
      label('GAP BOTH WAYS', 8, 76);
      drawProp(ctx, prop('crack', 'c', 104, 40, 32, 16, 'closed', t), true); drawProp(ctx, prop('crack', 'd', 148, 40, 16, 32, 'closed', t), true);
      label('CRACK CLOSED', 104, 76);
      drawProp(ctx, prop('crack', 'e', 184, 40, 32, 16, 'open', t), true); drawProp(ctx, prop('crack', 'f', 224, 40, 16, 32, 'open', t), true);
      label('RUBBLE WHEN OPEN', 180, 76);
      drawProp(ctx, prop('vines', 'seal1', 16, 100, 32, 16, 'open', t), true); drawProp(ctx, prop('vines', 'seal2', 60, 100, 32, 16, 'closed', t), true);
      label('SEAL OPEN, SHUT', 16, 120);
      [0, 0.2, 0.5, 0.8, 1].forEach((k, i) => drawProp(ctx, prop('rift', 'r', 100 + i * 31 - 22, 88, 64, 48, 'closed', t, k), true));
      label('RIFT K 0 TO 1', 100, 140);
    } else {
      const k = t % 120;
      drawFx(ctx, { kind: 'trail', x: 20, y: 40, dir: 'right', angle: 0, t: k % 30, life: 24, w: 72, h: 10 });
      drawFx(ctx, { kind: 'trail', x: 24, y: 70, dir: 'right', angle: 0.5, t: k % 30, life: 24, w: 60, h: 10 });
      label('TRAIL', 8, 84);
      drawActor(ctx, view('alpha', 130, 70, { kind: 'enemy', dir: 'down', pose: 'howl', t }));
      drawFx(ctx, { kind: 'howl', x: 130, y: 54, dir: 'right', angle: 0, t: k % 60, life: 50, w: 96, h: 48 });
      label('HOWL', 120, 84);
      drawActor(ctx, view('steve', 208, 70, { kind: 'hero', dir: 'down', anim: 'cast', t }));
      drawFx(ctx, { kind: 'taunt', x: 208, y: 70, dir: 'right', angle: 0, t: k % 50, life: 34, w: 144, h: 0 });
      label('TAUNT', 198, 84);
      drawActor(ctx, view('eleven', 60, 150, { kind: 'npc', dir: 'down', anim: 'cast', strained: true, t }));
      label('ELEVEN CHANNELS', 30, 164);
    }
    ctx.restore();
    head(ctx, sub === 0 ? 'PROPS AT NIGHT' : 'EFFECTS, LIVE');
  },
};

export const L56B_PAGES: Page[] = [tunnels, lab, props];
