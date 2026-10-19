// SWAP on the touch screen with one hero (Hopper alone in 4.1): the key and its printed word fade, a second hero lights them
// again, and a screen that says no party size keeps SWAP as it was. The canvas is a recorder, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutTouch } from '../src/core/touchlayout.ts';
import type { TouchLayout } from '../src/core/touchlayout.ts';
import { drawShell } from '../src/ui/touchdraw.ts';
import type { TouchView } from '../src/ui/touchdraw.ts';
import type { C2D } from '../src/ui/touchshapes.ts';
import { drawKeys, swapDims } from '../src/ui/touchkeys.ts';
import { DARK, LIGHT, UNAVAILABLE } from '../src/ui/touchtheme.ts';

const layout: TouchLayout = layoutTouch({ w: 375, h: 667, dpr: 2 });
const swap = { x: layout.buttons.swap.x + layout.buttons.swap.w / 2, y: layout.buttons.swap.y + layout.buttons.swap.h / 2 };

/** One thing the page painted: how faint it was, where its last circle sat, and the word if it was text. */
interface Paint { alpha: number; at: { x: number; y: number } | null; text?: string }

/** A 2D context that records each fill, stroke and word with the opacity it was drawn at. Anything else is a no-op. */
function recorder(): { ctx: C2D; paints: Paint[] } {
  const paints: Paint[] = [];
  const saved: number[] = [];
  const props: Record<string, unknown> = {};
  let alpha = 1;
  let at: Paint['at'] = null;
  const gradient = { addColorStop() { /* a no-op gradient */ } };
  const ctx = new Proxy(props, {
    get(t, k) {
      if (k === 'globalAlpha') return alpha;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'beginPath') return () => { at = null; };
      if (k === 'arc') return (x: number, y: number) => { at = { x, y }; };
      if (k === 'fill' || k === 'stroke') return () => { paints.push({ alpha, at }); };
      if (k === 'fillText') return (text: string) => { paints.push({ alpha, at, text }); };
      if (k === 'save') return () => { saved.push(alpha); };
      if (k === 'restore') return () => { alpha = saved.pop() ?? 1; };
      if (k in t) return t[k as string];
      return () => gradient;
    },
    set(t, k, v) {
      if (k === 'globalAlpha') alpha = v as number;
      else t[k as string] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as C2D, paints };
}

/** Drawn at the key's centre, give or take the dome's shadow (a few px); the A and B keys sit 60 px or more away. */
const near = (p: Paint, c: { x: number; y: number }): boolean => !!p.at && Math.hypot(p.at.x - c.x, p.at.y - c.y) < 4;

test('touch SWAP: one hero dims it, two or more and a screen with no party size keep it lit', () => {
  assert.equal(swapDims(1), true, 'Hopper alone has nobody to swap to');
  assert.equal(swapDims(2), false);
  assert.equal(swapDims(4), false);
  assert.equal(swapDims(null), false, 'a menu says nothing, so SWAP stays as it was');
  assert.equal(swapDims(undefined), false);
});

test('touch SWAP: the key is faint with one hero, and only the key', () => {
  const view = (party: number | null): TouchView => ({ layout, held: new Set(), dpad: null, burstReady: false, party, theme: LIGHT });
  const solo = recorder();
  drawKeys(solo.ctx, view(1), LIGHT);
  const pair = recorder();
  drawKeys(pair.ctx, view(2), LIGHT);
  assert.equal(solo.paints.length, pair.paints.length, 'the same paints in the same order, only fainter');

  const faint = solo.paints.flatMap((p, i) => (p.alpha === UNAVAILABLE ? [i] : []));
  assert.ok(faint.length > 0, 'the SWAP key is painted faint');
  const first = faint[0] as number, last = faint[faint.length - 1] as number;
  assert.equal(last - first + 1, faint.length, 'the faint paints are one run: the key and its arrow, not the A, B, D-pad or CRIT');
  assert.ok(near(solo.paints[first] as Paint, swap), 'and the run starts on the SWAP key');
  assert.deepEqual(pair.paints.filter((p) => p.alpha !== 1), [], 'two heroes: nothing is faint');
});

test('touch SWAP: the socket and the printed word fade with the key, in both shells', () => {
  for (const T of [LIGHT, DARK]) {
    const solo = recorder();
    drawShell(solo.ctx, layout, T, true);
    const word = solo.paints.filter((p) => p.text === 'SWAP');
    assert.deepEqual(word.map((p) => p.alpha), [UNAVAILABLE], `${T.name}: SWAP is printed faint`);
    const socket = solo.paints.filter((p) => p.alpha === UNAVAILABLE && p.text === undefined);
    assert.ok(socket.length > 0 && socket.every((p) => near(p, swap)), `${T.name}: only SWAP's socket is faint`);

    const pair = recorder();
    drawShell(pair.ctx, layout, T, false);
    assert.deepEqual(pair.paints.filter((p) => p.text === 'SWAP').map((p) => p.alpha), [1], `${T.name}: SWAP is lit with two heroes`);
    assert.deepEqual(pair.paints.filter((p) => p.alpha !== 1), [], `${T.name}: nothing is faint with two heroes`);
  }
});
