// The light pools of the night stages. paintStageGlow lifts the stage's own pixels and never reads the canvas back, which stalls the
// frame; it has to give exactly what the first version of paintGlow gave (kept below as the reference) when it lifts what drawStage painted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ctxOf, same, screen } from './canvas-helpers.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../src/core/config.ts';
import { settings } from '../src/core/settings.ts';
import { BAYER4, hash2 } from '../src/gfx/canvas.ts';
import { bakeStage, drawStage, stagePixels } from '../src/gfx/tiles.ts';
import { paintGlow, paintStageGlow } from '../src/gfx/glow.ts';
import type { Glow } from '../src/gfx/glow.ts';

// Grass, a creek and shallows (water moves through four frames), the tunnels' veins and the Gate's tears (they pulse), and a pine.
const ROWS = [
  '.......~~~~.........,,,,,,',
  '.,..T..~~~~...wwww....,,,,',
  '......w~~~~...wwww..5555..',
  '..,,..wwwww.......!!!5555.',
  '.......,,,.......!!!!.....',
  '..TT..........>>>.........',
  '.,,...........>>>...,,,...',
  '..........................',
  '.......wwww......TT.......',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
];
const stage = bakeStage(ROWS.map((r) => r.padEnd(26, '.')), true);
const LIGHTS = (dx: number, dy: number): Glow[] => [
  { x: 60 + dx, y: VIEW_TOP + 50 + dy, r: 40, flicker: 0.3 },
  { x: 140 + dx, y: VIEW_TOP + 20 + dy, r: 64, k: 1.15, flicker: 0.1 },
  { x: 200 + dx, y: VIEW_TOP + 90 + dy, r: 30, k: 1.1 },
  { x: 8 + dx, y: VIEW_TOP + 4 + dy, r: 36 },
  { x: 400, y: VIEW_TOP + 40, r: 20 },
];

/** The pools as first written: a step for every pixel of the view with Math.hypot, then the whole view read back and lifted. */
function referenceGlow(ctx: CanvasRenderingContext2D, lights: readonly Glow[], t: number, level: number): void {
  const W = SCREEN_W, H = SCREEN_H - VIEW_TOP, step = new Uint8Array(W * H);
  const LIFT = [0, 0.3, 0.6, 0.95, 1.35], WARM = [255, 190, 90];
  lights.forEach((L, li) => {
    const jitter = !settings.reduceFlashing && L.flicker ? ((hash2(li, (t / 3) | 0, 31) % 200) - 100) / 100 : 0;
    const R = Math.round(L.r * (1 + (L.flicker ?? 0) * 0.14 * jitter));
    if (R < 2) return;
    const cx = Math.round(L.x), cy = Math.round(L.y) - VIEW_TOP;
    const k = (L.k ?? 1) * level * 4;
    for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++) {
      for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= R) continue;
        const f = 1 - d / R, q = f * f * (3 - 2 * f) * k, lo = Math.floor(q);
        const s = Math.min(4, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        if (s > (step[y * W + x] as number)) step[y * W + x] = s;
      }
    }
  });
  const img = ctx.getImageData(0, VIEW_TOP, W, H), px = img.data;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const s = step[i] as number;
    if (s === 0) continue;
    const lift = LIFT[s] as number;
    for (let c = 0; c < 3; c++) px[p + c] = Math.min(255, (px[p + c] as number) * (1 + lift) + (WARM[c] as number) * lift * 0.2);
  }
  ctx.putImageData(img, 0, VIEW_TOP);
}

const black = (c: ReturnType<typeof screen>): void => { const g = c.getContext(); g.fillStyle = '#000000'; g.fillRect(0, 0, c.w, c.h); };

function render(glow: 'ref' | 'old' | 'new' | 'none', camX: number, camY: number, t: number, level: number): ReturnType<typeof screen> {
  const c = screen(SCREEN_W, SCREEN_H), g = ctxOf(c);
  black(c);
  g.save();
  g.translate(-camX, VIEW_TOP - camY);
  drawStage(g, stage, camX, camY, t);
  g.restore();
  const lights = LIGHTS(-camX / 3, -camY / 3);
  if (glow === 'ref') referenceGlow(g, lights, t, level);
  if (glow === 'old') paintGlow(g, lights, t, level);
  if (glow === 'new') paintStageGlow(g, stage, camX, camY, lights, t, level);
  return c;
}

test('the stage glow and paintGlow give pixel for pixel what the first version gave', () => {
  let lit = 0;
  for (const [camX, camY] of [[0, 0], [37, 11], [120, 40], [-20, -14], [260, 90], [90, 150]]) {
    for (const t of [0, 5, 16, 33, 50, 70, 99, 130]) {
      for (const level of [1, 0.4]) {
        const was = render('ref', camX, camY, t, level), now = render('new', camX, camY, t, level);
        assert.ok(same(was, now), `camera ${camX},${camY} frame ${t} level ${level}`);
        assert.ok(same(was, render('old', camX, camY, t, level)), `paintGlow, camera ${camX},${camY} frame ${t} level ${level}`);
        lit += render('none', camX, camY, t, level).px.reduce((n, v, i) => n + (v !== was.px[i] ? 1 : 0), 0);
      }
    }
  }
  assert.ok(lit > 10000, `the pools lift something (${lit} pixels)`);
});

test('no pool in view, or a level of 0, leaves the picture alone', () => {
  const bare = render('none', 40, 20, 7, 1);
  const painted = (lights: Glow[], level: number): ReturnType<typeof screen> => {
    const c = render('none', 40, 20, 7, 1);
    paintStageGlow(ctxOf(c), stage, 40, 20, lights, 7, level);
    return c;
  };
  assert.ok(same(bare, painted([], 1)), 'no lights');
  assert.ok(same(bare, painted(LIGHTS(0, 0), 0)), 'level 0');
  assert.ok(same(bare, painted([{ x: 900, y: 900, r: 30 }], 1)), 'a pool far off screen');
});

test('stagePixels is what drawStage leaves: opaque, black past the stage, the moving tiles at their step', () => {
  const w = 40, h = 30;
  for (const [x, y, t] of [[0, 0, 0], [100, 20, 17], [-10, -5, 40], [350, 120, 70], [230, 40, 99]]) {
    const c = screen(w, h), g = ctxOf(c);
    black(c);
    g.save();
    g.translate(-x, -y);
    drawStage(g, stage, x, y, t);
    g.restore();
    const out = new Uint32Array(w * h);
    stagePixels(stage, x, y, w, h, t, out);
    assert.deepEqual(Array.from(out), Array.from(c.px), `rect ${x},${y} at frame ${t}`);
  }
});
