// Shared by the epilogue still tests: a context that only keeps the rectangles a still fills, by palette name, clipped to the screen.
import assert from 'node:assert/strict';
import { SCREEN_H } from '../src/core/config.ts';
import { PAL } from '../src/gfx/palette.ts';

const HEX = new Map<string, string>(Object.entries(PAL).map(([name, hex]) => [hex, name]));

/** What `draw` paints on a `screenW` by SCREEN_H screen: the palette name of every pixel (null where nothing was painted), how many
 * rectangles it took, and every alpha it set. Every rectangle must be in the palette, in whole pixels and have an area; one that runs
 * off the screen is clipped, as a canvas does. */
export function paintStill(draw: (ctx: CanvasRenderingContext2D) => void, screenW: number): { names: (string | null)[]; fills: number; alphas: Set<number> } {
  const names: (string | null)[] = new Array<string | null>(screenW * SCREEN_H).fill(null);
  const alphas = new Set<number>();
  let fills = 0;
  let dx = 0;
  let alpha = 1;
  const stack: { dx: number; style: string }[] = [];
  const ctx = {
    fillStyle: '#000000',
    set globalAlpha(v: number) { alpha = v; alphas.add(v); },
    get globalAlpha(): number { return alpha; },
    save() { stack.push({ dx, style: this.fillStyle }); },
    restore() { const s = stack.pop(); if (s) { dx = s.dx; this.fillStyle = s.style; } },
    translate(x: number, y: number) { assert.equal(y, 0); dx += x; },
    fillRect(x: number, y: number, w: number, h: number) {
      const name = HEX.get(this.fillStyle);
      assert.ok(name, `${this.fillStyle} is in the palette`);
      assert.ok(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(w) && Number.isInteger(h), `whole pixels: ${x} ${y} ${w} ${h}`);
      assert.ok(w > 0 && h > 0, `a rectangle with area: ${x} ${y} ${w} ${h}`);
      fills++;
      for (let j = Math.max(0, y); j < Math.min(SCREEN_H, y + h); j++) for (let i = Math.max(0, x + dx); i < Math.min(screenW, x + dx + w); i++) names[j * screenW + i] = name;
    },
  };
  draw(ctx as unknown as CanvasRenderingContext2D);
  return { names, fills, alphas };
}
