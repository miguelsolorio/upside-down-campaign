// Variant 4, "Roll for initiative": the basement table under Mike's lamp, the party's minis on it and a big d20
// in the middle. START rolls the die. It tumbles, lands on a natural 20, the minis cheer, and the game begins.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { hash2 } from '../../gfx/canvas.ts';
import { Px } from '../../gfx/px.ts';
import { drawIcon, drawLogo, drawText, paintGlow } from '../../gfx/index.ts';
import { bigText, box, dither } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { dieFace } from '../format.ts';
import { drawMenuBlock, fadeOut, promptOn } from './core.ts';
import type { TitleDesign, TitleView } from './core.ts';
import { bigActor, lightString } from './art.ts';
import { idleDieFace } from './timeline.ts';

const CX = 128;
const CY = 112;
const R = 34;
const LAND = 26;
const SIZE = 80;

type Look = 'bone' | 'hot';
const LOOK: Record<Look, { facets: ColorName[]; edge: ColorName; rim: ColorName }> = {
  bone: { facets: ['white', 'bone', 'grey3', 'grey2'], edge: 'grey2', rim: 'ink' },
  hot: { facets: ['white', 'cream', 'yellow', 'amber'], edge: 'orange', rim: 'ink' },
};

const sprites = new Map<Look, HTMLCanvasElement>();

/** A d20 seen along a vertex: a hexagon, a triangle in the middle, and ten lit facets. Baked once per look. */
function die(look: Look): HTMLCanvasElement {
  const hit = sprites.get(look);
  if (hit) return hit;
  const { facets, edge, rim } = LOOK[look];
  const px = new Px(SIZE, SIZE);
  const c = SIZE / 2;
  const ang = (deg: number): number => (deg * Math.PI) / 180;
  const V = [0, 1, 2, 3, 4, 5].map((k): [number, number] => [c + Math.cos(ang(-90 + 60 * k)) * R, c + Math.sin(ang(-90 + 60 * k)) * R]);
  const r2 = R * 0.6;
  const T = [0, 1, 2].map((k): [number, number] => [c + Math.cos(ang(-90 + 120 * k)) * r2, c + Math.sin(ang(-90 + 120 * k)) * r2]);
  type P = [number, number];
  const tris: { p: [P, P, P]; shade: number }[] = [
    { p: [T[0] as P, T[1] as P, T[2] as P], shade: 1 },
    { p: [T[0] as P, T[1] as P, V[1] as P], shade: 1 },
    { p: [T[1] as P, T[2] as P, V[3] as P], shade: 2 },
    { p: [T[2] as P, T[0] as P, V[5] as P], shade: 0 },
    { p: [V[0] as P, V[1] as P, T[0] as P], shade: 1 },
    { p: [V[1] as P, V[2] as P, T[1] as P], shade: 2 },
    { p: [V[2] as P, V[3] as P, T[1] as P], shade: 3 },
    { p: [V[3] as P, V[4] as P, T[2] as P], shade: 2 },
    { p: [V[4] as P, V[5] as P, T[2] as P], shade: 1 },
    { p: [V[5] as P, V[0] as P, T[0] as P], shade: 0 },
  ];
  const side = (a: P, b: P, p: P): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  for (const { p, shade } of tris) {
    const [a, b, d] = p;
    const x0 = Math.floor(Math.min(a[0], b[0], d[0])), x1 = Math.ceil(Math.max(a[0], b[0], d[0]));
    const y0 = Math.floor(Math.min(a[1], b[1], d[1])), y1 = Math.ceil(Math.max(a[1], b[1], d[1]));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const q: P = [x + 0.5, y + 0.5];
        const s1 = side(a, b, q), s2 = side(b, d, q), s3 = side(d, a, q);
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) px.set(x, y, facets[shade] as ColorName);
      }
    }
  }
  for (const { p } of tris) {
    px.line(p[0][0], p[0][1], p[1][0], p[1][1], edge).line(p[1][0], p[1][1], p[2][0], p[2][1], edge).line(p[2][0], p[2][1], p[0][0], p[0][1], edge);
  }
  for (let k = 0; k < 6; k++) {
    const a = V[k] as P, b = V[(k + 1) % 6] as P;
    px.line(a[0], a[1], b[0], b[1], rim);
  }
  // A shine on the upper left of the middle facet.
  px.set(Math.round(c - 5), Math.round(c - 1), 'white').set(Math.round(c - 4), Math.round(c - 2), 'white');
  const out = px.toCanvas();
  sprites.set(look, out);
  return out;
}

function basement(ctx: Ctx): void {
  box(ctx, 0, 0, SCREEN_W, 94, 'soil0');
  for (let x = 6; x < SCREEN_W; x += 12) box(ctx, x, 0, 1, 94, 'ink');
  for (let x = 0; x < SCREEN_W; x += 12) box(ctx, x + 1, 0, 1, 94, 'soil1');
  dither(ctx, 0, 0, SCREEN_W, 94, 'ink', 4);
  // The table.
  box(ctx, 0, 92, SCREEN_W, 3, 'soil3');
  box(ctx, 0, 95, SCREEN_W, 2, 'soil2');
  box(ctx, 0, 97, SCREEN_W, SCREEN_H - 97, 'soil1');
  for (let y = 101; y < SCREEN_H; y += 6) {
    for (let x = 0; x < SCREEN_W; x += 32) {
      const o = hash2(x >> 5, y, 4) % 24;
      box(ctx, x + o, y, 18 + (hash2(y, x, 4) % 10), 1, 'soil0');
    }
  }
  // A few things a basement table has on it.
  drawIcon(ctx, 'coke', 20, 168);
  drawIcon(ctx, 'eggo', 226, 176);
  drawIcon(ctx, 'quarter', 208, 190);
  drawIcon(ctx, 'quarter', 36, 190);
}

function prompt(ctx: Ctx, v: TitleView, cx: number, y: number): number {
  const sel = v.rows[0]?.selected ?? false;
  if (v.launch === 0 && (promptOn(v) || !sel)) bigText(ctx, 'PRESS START', cx, y, sel ? 'white' : 'mist', 2);
  return 26;
}

export const d20Design: TitleDesign = {
  id: 4,
  name: 'Roll for initiative',
  blurb: "Mike's basement table, the party's minis and a big d20. START rolls it, and it lands on a 20.",
  tradeoff: "Sells the d20, the game's one big idea, and the start press becomes a roll. The most game-specific, and it adds a table the rest of the game does not have.",
  credit: { y: 213, color: 'soil3' },
  draw(ctx, v) {
    basement(ctx);
    lightString(ctx, -6, 134, 0, 7, v.t, { chase: true });
    lightString(ctx, 122, SCREEN_W + 6, 0, 7, v.t + 30, { chase: true });
    paintGlow(ctx, [{ x: CX, y: CY + 4, r: 150, k: 1.05, flicker: 0.35 }], v.t, 1);

    const rolling = v.launch > 0;
    const landed = v.launch >= LAND;
    // Minis on the table. They cheer when the die lands.
    const minis = [{ id: 'mike', x: 40 }, { id: 'dustin', x: 72 }, { id: 'lucas', x: 184 }, { id: 'eleven', x: 216 }] as const;
    for (const m of minis) bigActor(ctx, m.id, m.x, 154, 2, landed ? v.launch - LAND : v.t, { anim: landed ? 'cast' : 'idle', strained: m.id === 'eleven' });

    // The die: a slow bob while it waits, a shake while it tumbles, a hop when it lands.
    const bob = settings.reduceFlashing ? 0 : Math.round(Math.sin(v.t / 24) * 1.5);
    const shake = rolling && !landed ? (hash2(v.launch, 1, 3) % 5) - 2 : 0;
    const hop = landed ? Math.max(0, 6 - (v.launch - LAND) * 2) : 0;
    const dx = CX - SIZE / 2 + shake;
    const dy = CY - SIZE / 2 + bob + (rolling && !landed ? (hash2(v.launch, 2, 3) % 5) - 2 : 0) - hop;
    // The die's shadow on the table, a little wider while it hops.
    const wide = hop > 0 ? 4 : 0;
    box(ctx, CX - 22 - wide, CY + R + 5, 44 + wide * 2, 3, 'soil0');
    box(ctx, CX - 14, CY + R + 8, 28, 2, 'soil0');
    ctx.drawImage(die(landed ? 'hot' : 'bone'), dx, dy);
    const n = rolling ? dieFace(v.launch, 20, 7, LAND) : idleDieFace(v.t);
    bigText(ctx, String(n), CX + shake, dy + SIZE / 2 - 4, landed ? 'blood1' : 'ink', 2, 'center', false);

    // A glint now and then, and a burst of sparks on the 20.
    const g = v.t % 150;
    if (!rolling && !settings.reduceFlashing && g < 10) {
      const gx = CX - 12, gy = CY - 20 + bob, s = g < 5 ? g : 10 - g;
      box(ctx, gx - s, gy, s * 2 + 1, 1, 'white');
      box(ctx, gx, gy - s, 1, s * 2 + 1, 'white');
    }
    if (landed) {
      const k = v.launch - LAND;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 26 + k * 5 + (i & 1) * 6;
        box(ctx, Math.round(CX + Math.cos(a) * r), Math.round(CY + Math.sin(a) * r * 0.8), 2, 2, i % 3 === 0 ? 'white' : i % 3 === 1 ? 'yellow' : 'amber');
      }
    }

    drawLogo(ctx, v.t, 128, 18);
    drawMenuBlock(ctx, v, 128, 160, { prompt, rowH: 13 });
    if (rolling) drawText(ctx, landed ? 'NATURAL 20!' : 'ROLLING...', 128, 164, landed ? 'yellow' : 'cream', { align: 'center', shadow: true });
    fadeOut(ctx, v.launch > 32 ? (v.launch - 32) / 8 : 0, 'ink');
  },
};
