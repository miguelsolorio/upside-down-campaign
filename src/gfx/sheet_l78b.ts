// Sheet pages for levels 7 and 8, second half: Starcourt Mall and the Russian base (their tiles, painted and at night, then a sample
// room baked and lit the way the stage is), the props in every state, and the effects. Everything is baked and drawn the way a night
// stage is, so it shows what the stages will.
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
import { drawStage, samplePx, tileSample } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head, prop } from './sheet_l56b.ts';
import { MALL_TILES } from './tile_mall.ts';
import { BASE_TILES } from './tile_base.ts';
import { RISE_FRAMES } from './actor_goo.ts';
import { ROLL_FRAMES } from './props_l78.ts';

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

/** Three variants painted and three at night, five names to a row. */
function index(ctx: Ctx, names: TileName[], t: number, label: string): void {
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawText(ctx, label, 4, 3, 'bone');
  names.forEach((n, i) => {
    const col = i % 5, cx = 2 + col * 51, cy = 16 + ((i / 5) | 0) * 50;
    for (let v = 0; v < 3; v++) { ctx.drawImage(tileSample(n, v, t), cx + v * 17, cy); ctx.drawImage(nightSample(n, v), cx + v * 17, cy + 17); }
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
  });
}

// ---------------------------------------------------------------- the mall
// ( cap, ) wall face, { lit shop, } shut shop, ? glass doors, ¢ floor, " band, y planter, > fountain, ` railing, £ counter, ¨ goo, ÷ service floor, Þ lift, j checker.
const MALL = [
  '((((((((((((((((',
  ')){{{)}}})??))){)',
  '¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢',
  '¢y¢`````````¢¢y¢',
  '¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢',
  '¢""""""""""""""¢',
  '¢¢¢¢¢>>>>¢¢¨¨¢¢¢',
  '¢£££¢>>>>¢¢¨¨¨¢¢',
  '¢¢¢¢¢>>>>¢¢¢¨¨¢¢',
  '¢y¢¢¢¢¢¢¢¢¢¢¢¢y¢',
  '((((((((((((((((',
  ')))))))))))))))÷',
  '÷÷÷÷÷÷÷÷÷÷÷÷÷÷ÞÞ',
];
const MALL_LIGHTS: Glow[] = [
  { x: 40, y: 38, r: 28, k: 1 }, { x: 104, y: 38, r: 28, k: 1 }, { x: 232, y: 38, r: 22, k: 0.9 }, { x: 80, y: 150, r: 40, k: 1.1, flicker: 0.4 }, { x: 120, y: 110, r: 30, k: 0.8 },
];

const mall: Page = {
  title: 'MALL',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) { index(ctx, MALL_TILES, t, 'STARCOURT TILES: PAINTED, THEN AT NIGHT'); drawText(ctx, 'UP DOWN', 4, 214, 'slate'); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, bake('mall', MALL), 0, 0, t);
    const k = t % 240, open = k >= 120;
    if (sub === 1) {
      drawProp(ctx, prop('shutter', 's1', 112, 16, 48, 16, open ? 'open' : 'closed', open ? k - 120 : k), true);
      drawProp(ctx, prop('crate', 'c1', 176, 80, 32, 16, 'closed', t), true);
      drawProp(ctx, prop('crate', 'c2', 208, 128, 32, 16, 'open', t), true);
      drawProp(ctx, prop('firebox', 'f1', 96, 16, 16, 16, 'closed', t), true);
      drawActor(ctx, view('robin', 40, 100, { dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('nancy', 24, 104, { dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('erica', 64, 62, { kind: 'npc', dir: 'down', t }));
      drawActor(ctx, view('melter', 190, 136, { kind: 'enemy', dir: 'left', anim: 'walk', t }));
      drawActor(ctx, view('flayed', 208, 112, { kind: 'enemy', dir: 'left', anim: 'walk', t }));
      drawActor(ctx, view('flayed', 176, 150, { kind: 'enemy', dir: 'down', puddle: true, t }));
      drawActor(ctx, view('flayed', 150, 150, { kind: 'enemy', dir: 'down', pose: 'rise', t: t % (RISE_FRAMES + 30) }));
    } else {
      drawProp(ctx, prop('shutter', 's1', 16, 16, 48, 16, 'closed', t), true);
      for (let i = 0; i < 4; i++) drawProp(ctx, prop('shutter', `s${i}`, 16 + i * 56, 56, 48, 16, 'open', Math.round((i / 3) * ROLL_FRAMES)), true);
      drawProp(ctx, prop('shutter', 's9', 16, 96, 16, 32, 'closed', t), true);
      drawProp(ctx, prop('crate', 'c1', 112, 100, 32, 16, 'closed', t), true);
      drawProp(ctx, prop('crate', 'c2', 160, 100, 32, 16, 'open', t), true);
      drawProp(ctx, prop('crate', 'c3', 208, 100, 16, 16, 'closed', t), true);
      drawProp(ctx, prop('firebox', 'f1', 16, 150, 16, 16, 'closed', t), true);
      drawProp(ctx, prop('firebox', 'f2', 48, 150, 16, 16, 'lit', t), true);
      drawProp(ctx, prop('crack', 'k1', 96, 150, 32, 16, 'closed', t), true);
      drawProp(ctx, prop('crack', 'k2', 144, 150, 32, 16, 'open', t), true);
    }
    ctx.restore();
    if (sub === 1) paintGlow(ctx, MALL_LIGHTS.map((g) => ({ ...g, y: g.y + VIEW_TOP })), t);
    head(ctx, sub === 1 ? 'THE MALL AFTER CLOSING' : 'SHUTTER, KIOSK, FIREBOX, CRACK');
  },
};

// ---------------------------------------------------------------- the base
// ¯ cap, ¦ wall face, · floor, ° grating, ± ammo, § bunk, × cell, ¤ machine (4 by 2), º the chamber's floor.
const BASE = [
  '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯',
  '¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦',
  '·§§··¤¤¤¤····××·',
  '·§§··¤¤¤¤·······',
  '················',
  '°°°°°°°°°°°°°°°°',
  '·±±···ºººººº·±±·',
  '·±····ºººººº····',
  '······ºººººº····',
  '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯',
];
const BASE_LIGHTS: Glow[] = [
  { x: 112, y: 40, r: 44, k: 1 }, { x: 24, y: 44, r: 18, k: 0.7 }, { x: 232, y: 44, r: 22, k: 0.8 }, { x: 48, y: 52, r: 26, k: 0.6 }, { x: 176, y: 52, r: 26, k: 0.6 },
];

const base: Page = {
  title: 'BASE',
  subs: 4,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) { index(ctx, BASE_TILES, t, 'THE BASE TILES: PAINTED, THEN AT NIGHT'); drawText(ctx, 'UP DOWN', 4, 214, 'slate'); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, bake('base', BASE), 0, 0, t);
    const k = t % 300, lit = k >= 120 && k < 150;
    if (sub === 1) {
      drawProp(ctx, prop('powerbox', 'p1', 96, 96, 32, 32, lit ? 'lit' : 'closed', lit ? k - 120 : k), true);
      drawProp(ctx, prop('breaker', 'b1', 160, 16, 16, 16, k >= 118 && k < 420 ? 'lit' : 'closed', k >= 118 ? k - 118 : k), true);
      drawProp(ctx, prop('cipher', 'k1', 16, 112, 32, 16, 'closed', t, (t % 150) / 120), true);
      drawProp(ctx, prop('cipher', 'k2', 208, 16, 16, 32, 'closed', t, (t % 150) / 120), true);
      drawProp(ctx, prop('door', 'd1', 64, 128, 32, 16, 'closed', t), true);
      if (lit) drawFx(ctx, { kind: 'arcs', x: 112, y: 112, dir: 'down', angle: 0, t: k - 120, life: 31, w: 32, h: 32 });
      drawActor(ctx, view('grigori', 112, 90, { kind: 'enemy', dir: 'down', pose: lit ? 'stun' : undefined, anim: lit ? 'hurt' : 'walk', t }));
      drawActor(ctx, view('soldier', 56, 100, { kind: 'enemy', dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('soldier', 24, 100, { kind: 'enemy', dir: 'right', anim: 'attack', alert: ((t >> 5) & 1) === 1, t, elite: true }));
      drawActor(ctx, view('robin', 40, 150, { dir: 'up', anim: 'walk', t }));
    } else if (sub === 2) {
      for (let i = 0; i < 5; i++) drawProp(ctx, prop('cipher', `c${i}`, 8 + i * 48, 16, 32, 16, 'closed', t, i / 4), true);
      for (let i = 0; i < 4; i++) drawProp(ctx, prop('cipher', `o${i}`, 8 + i * 56, 56, 32, 16, 'open', Math.round((i / 3) * 18), 1), true);
      drawProp(ctx, prop('cipher', 'v0', 16, 104, 16, 32, 'closed', t, 0), true);
      drawProp(ctx, prop('cipher', 'v1', 48, 104, 16, 32, 'closed', t, 0.6), true);
      drawProp(ctx, prop('cipher', 'v2', 80, 104, 16, 32, 'open', 8, 1), true);
    } else {
      [false, true].forEach((l, i) => drawProp(ctx, prop('powerbox', `p${i}`, 24 + i * 48, 24, 32, 32, l ? 'lit' : 'closed', t), true));
      [false, true].forEach((l, i) => drawProp(ctx, prop('breaker', `b${i}`, 144 + i * 24, 32, 16, 16, l ? 'lit' : 'closed', t), true));
      drawFx(ctx, { kind: 'arcs', x: 72, y: 40, dir: 'down', angle: 0, t: t % 31, life: 31, w: 32, h: 32 });
    }
    ctx.restore();
    if (sub === 1) paintGlow(ctx, BASE_LIGHTS.map((g) => ({ ...g, y: g.y + VIEW_TOP })), t);
    head(ctx, sub === 1 ? 'THE BASE: BREAKER, PLATE' : sub === 2 ? 'CIPHER DOOR, K 0 TO 1, OPEN' : 'POWER BOX AND BREAKER');
  },
};

// ---------------------------------------------------------------- effects
const FX: Page = {
  title: 'CH3 FX',
  subs: 1,
  draw(ctx, t) {
    ctx.fillStyle = PAL.grey1;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawText(ctx, 'THE CHAPTER 3 EFFECTS, LIVE', 4, 3, 'white', { shadow: true });
    const label = (s: string, x: number, y: number): void => { drawTinyText(ctx, s, x, y, 'mist'); };
    const k = t % 60;
    const lob = Math.min(k, 22);
    drawActor(ctx, view('robin', 24, 60, { dir: 'right', anim: 'attack', t: k }));
    drawFx(ctx, { kind: 'scoop', x: 30 + lob * 2, y: 48 - Math.round(Math.sin((lob / 22) * Math.PI) * 14), dir: 'right', angle: 0, t: lob, life: 22, w: 6, h: 10 });
    if (k >= 22) drawFx(ctx, { kind: 'scoop', x: 74, y: 56, dir: 'down', angle: 0, t: Math.min(k - 22, 14), life: 14, w: 32, h: 32 });
    label('SCOOP', 8, 74);
    drawActor(ctx, view('robin', 112, 60, { dir: 'right', anim: 'cast', t: t % 40 }));
    drawFx(ctx, { kind: 'babble', x: 116, y: 54, dir: 'right', angle: 0, t: t % 40 > 24 ? 24 : t % 40, life: 24, w: 56, h: 48 });
    label('BABBLE', 112, 74);
    drawActor(ctx, view('nancy', 190, 60, { dir: 'right', anim: 'attack', t: k }));
    drawFx(ctx, { kind: 'bullet', x: 196 + (k % 40) * 1.5, y: 54, dir: 'right', angle: 0, t: k % 40, life: 36, w: 6, h: 6 });
    label('BULLET', 190, 74);
    drawFx(ctx, { kind: 'bullet', x: 8, y: 98, dir: 'right', angle: 0, t: t % 36, life: 36, w: 120, h: 8 });
    label('BULLET NANCY CRIT', 8, 106);
    drawFx(ctx, { kind: 'trap', x: 160, y: 98, dir: 'down', angle: 0, t: t % 600, life: 600, w: 14, h: 8 });
    drawFx(ctx, { kind: 'trap', x: 184, y: 98, dir: 'down', angle: 0, t: 560 + (t % 40), life: 600, w: 14, h: 8 });
    label('TRAP AND ITS LAST SECOND', 144, 106);
    const g = t % 40;
    drawActor(ctx, view('melter', 40, 150, { kind: 'enemy', dir: 'right', anim: g < 20 ? 'attack' : 'ko', alert: false, t: g }));
    drawFx(ctx, { kind: 'goo', x: 40, y: 152, dir: 'down', angle: 0, t: Math.max(0, g - 18), life: 22, w: 44, h: 22 });
    label('GOO', 8, 168);
    drawProp(ctx, prop('powerbox', 'p', 96, 130, 32, 32, g < 31 ? 'lit' : 'closed', g), true);
    drawFx(ctx, { kind: 'arcs', x: 112, y: 146, dir: 'down', angle: 0, t: g, life: 31, w: 32, h: 32 });
    label('ARCS', 96, 168);
    drawActor(ctx, view('flayed', 164, 150, { kind: 'enemy', dir: 'down', pose: 'rise', t: t % (RISE_FRAMES + 30) }));
    drawActor(ctx, view('flayed', 196, 150, { kind: 'enemy', dir: 'down', puddle: true, t }));
    drawActor(ctx, view('soldier', 228, 150, { kind: 'enemy', dir: 'left', confused: true, anim: 'walk', t }));
    label('RISE PUDDLE CONFUSED', 150, 168);
    drawText(ctx, 'LIVE LOOPS AT 1X', 4, 212, 'slate');
  },
};

export const L78B_PAGES: Page[] = [mall, base, FX];
