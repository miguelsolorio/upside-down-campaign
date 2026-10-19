// Outlined text (gfx/outline.ts) is the six passes of glyphs it replaces, drawn once as a cached canvas: pixel for pixel the same, anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ctxOf, same, screen } from './canvas-helpers.ts';
import { drawText, textWidth } from '../src/gfx/font.ts';
import { outlinedText } from '../src/gfx/outline.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';

const OUTLINE = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]] as const;

function direct(text: string, x: number, y: number, color: ColorName, align: 'left' | 'center'): ReturnType<typeof screen> {
  const c = screen(120, 40), g = ctxOf(c);
  for (const [dx, dy] of OUTLINE) drawText(g, text, x + dx, y + dy, 'ink', { align });
  drawText(g, text, x, y, color, { align });
  return c;
}
function cached(text: string, x: number, y: number, color: ColorName, align: 'left' | 'center'): ReturnType<typeof screen> {
  const c = screen(120, 40);
  outlinedText(ctxOf(c), text, x, y, color, align);
  return c;
}

test('outlined text is pixel for pixel the six passes it replaces, left and centered, at any position', () => {
  for (const text of ['9', '12', '+3', 'LEVEL UP', 'NAT 20', 'ATTACK']) {
    for (const color of ['white', 'yellow', 'mist'] as ColorName[]) {
      for (const align of ['left', 'center'] as const) {
        for (const [x, y] of [[10, 8], [60, 20], [33.4, 11.6]]) {
          assert.ok(same(direct(text, x, y, color, align), cached(text, x, y, color, align)), `${text} ${color} ${align} at ${x},${y}`);
        }
      }
    }
  }
});

test('outlined text returns its advance width, and draws nothing for no text', () => {
  const c = screen(60, 20);
  assert.equal(outlinedText(ctxOf(c), 'LEVEL UP', 4, 4, 'white'), textWidth('LEVEL UP'));
  const blank = screen(60, 20);
  assert.equal(outlinedText(ctxOf(blank), '', 4, 4, 'white'), 0);
  assert.ok(same(blank, screen(60, 20)));
});

test('outlined text rings every glyph in ink: each side of a white pixel is white or ink, never the floor', () => {
  const c = cached('LEVEL UP', 10, 10, 'white', 'left');
  const white = px32('white'), ink = px32('ink');
  let seen = 0;
  for (let y = 1; y < c.h - 1; y++) {
    for (let x = 1; x < c.w - 1; x++) {
      if (c.px[y * c.w + x] !== white) continue;
      seen++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const v = c.px[(y + dy) * c.w + x + dx];
        assert.ok(v === white || v === ink, `the pixel beside white at ${x},${y} is ${v}`);
      }
    }
  }
  assert.ok(seen > 20, `${seen} white pixels`);
});
