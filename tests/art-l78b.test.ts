// The props and effects of levels 7 and 8: the shutter, the cipher door, the power box, the breaker and the kiosk, in each of their states, and
// the scoop, babble, bullet, goo, trap and arcs effects. Pure pixel work, so Node runs it: the props draw through recording stand-ins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FxView, PropView } from '../src/core/types.ts';
import { drawFx } from '../src/gfx/fx.ts';
import { PAL } from '../src/gfx/palette.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { Px } from '../src/gfx/px.ts';
import { swirl } from '../src/gfx/actor_goo.ts';
import { breakerArt, cipherArt, drawL78Prop, kioskArt, powerboxArt, shutterArt } from '../src/gfx/props_l78.ts';

// ---------------------------------------------------------------- props
const solidPx = (p: Px): number => p.d.filter((v) => v !== 0).length;

test('the shutter is a lattice under a housing, 48 by 16 or turned, and rolls up into the housing in steps', () => {
  const shut = shutterArt(48, 16, 0), up = shutterArt(48, 16, 1), half = shutterArt(48, 16, 0.5);
  assert.deepEqual([shut.w, shut.h], [48, 16]);
  assert.deepEqual([shutterArt(16, 48, 0).w, shutterArt(16, 48, 0).h], [16, 48]);
  assert.ok(solidPx(shut) > 48 * 16 * 0.95, 'shut it fills the opening');
  assert.ok(solidPx(up) < 48 * 6 && solidPx(up) >= 48 * 3, `rolled up it is only the housing (${solidPx(up)})`);
  assert.ok(solidPx(half) > solidPx(up) && solidPx(half) < solidPx(shut), 'in between it is part way');
  for (let k = 1; k <= 6; k++) assert.ok(solidPx(shutterArt(48, 16, k / 6)) <= solidPx(shutterArt(48, 16, (k - 1) / 6)), `rising at step ${k}`);
  const colors = new Set([...shut.d].filter((v) => v !== 0));
  assert.ok(colors.size <= 7, `${colors.size} colors`);
});

test('the cipher door turns its Cyrillic to English a letter at a time as k climbs, and the bar fills', () => {
  for (const [w, h] of [[32, 16], [16, 32]] as const) {
    const at = (k: number): Px => cipherArt(w, h, k);
    const cyan = (p: Px): number => p.d.filter((v) => v === px32('cyan')).length, amber = (p: Px): number => p.d.filter((v) => v === px32('amber')).length;
    assert.deepEqual([at(0).w, at(0).h], [w, h]);
    assert.ok(amber(at(0)) >= 20 && cyan(at(0)) === 0, `${w}x${h}: Cyrillic in amber at k 0`);
    let last = -1, lastAmber = 1e9;
    for (const k of [0.1, 0.3, 0.55, 0.8, 1]) {
      assert.ok(cyan(at(k)) > last, `${w}x${h}: more English at k ${k}`);
      assert.ok(amber(at(k)) <= lastAmber, `${w}x${h}: less Cyrillic at k ${k}`);
      last = cyan(at(k)); lastAmber = amber(at(k));
    }
    assert.equal(amber(at(1)) <= 12, true, 'all of the word is English at 1 (the keypad is amber too)');
    assert.notDeepEqual(Array.from(at(0.3).d), Array.from(at(0.6).d));
  }
});

test('the power box is a hazard bordered plate that arcs when lit, and the breaker is down when closed and thrown and sparking when lit', () => {
  const rest = powerboxArt(false), lit = powerboxArt(true);
  assert.deepEqual([rest.w, rest.h], [32, 32]);
  assert.ok(solidPx(rest) === 32 * 32, 'a plate, fully painted');
  assert.ok(lit.d.filter((v) => v === px32('white')).length > rest.d.filter((v) => v === px32('white')).length + 6, 'white arcs when lit');
  assert.ok(lit.d.filter((v) => v === px32('yellow')).length > rest.d.filter((v) => v === px32('yellow')).length + 8, 'yellow arcs');
  const down = breakerArt(false), up = breakerArt(true);
  assert.deepEqual([down.w, down.h], [16, 16]);
  const amberRows = (p: Px): number[] => { const ys: number[] = []; p.d.forEach((v, i) => { if (v === px32('amber')) ys.push((i / 16) | 0); }); return ys; };
  assert.ok(Math.min(...amberRows(down)) > Math.max(...amberRows(up)) - 1 || Math.min(...amberRows(down)) >= 7, 'the lever is down when closed');
  assert.ok(Math.max(...amberRows(up)) <= 7, 'and up when thrown');
  assert.ok(up.d.filter((v) => v === px32('yellow')).length >= 4, 'sparking');
});

test('the kiosk is a striped, wheeled kiosk on its side, and a heap of purple when it is smashed', () => {
  const whole = kioskArt(32, 16, false), heap = kioskArt(32, 16, true);
  assert.deepEqual([whole.w, whole.h], [32, 16]);
  assert.ok(solidPx(whole) > 200 && solidPx(heap) < solidPx(whole) * 0.6 && solidPx(heap) > 40);
  assert.ok(whole.d.filter((v) => v === px32('magenta') || v === px32('pink')).length >= 40, 'the awning');
});

/** A stand-in 2D context that records the images and rects it is asked to draw. */
function stage(): { ctx: CanvasRenderingContext2D; images: [string, number, number][]; rects: number } {
  const images: [string, number, number][] = [];
  const log = { rects: 0 };
  const ctx = {
    fillStyle: '#000',
    fillRect() { log.rects++; },
    drawImage(img: { key: string }, ...a: number[]) { images.push([img.key, a[a.length === 3 ? 0 : a.length - 4] as number, a[a.length === 3 ? 1 : a.length - 3] as number]); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, images, get rects() { return log.rects; } };
}
const art = (key: string, build: () => Px): HTMLCanvasElement => { assert.ok(solidPx(build()) > 0, `${key} builds something`); return { key } as unknown as HTMLCanvasElement; };
const pv = (kind: PropView['kind'], state: PropView['state'], w: number, h: number, t = 0, k?: number): PropView => ({ id: kind, kind, x: 64, y: 64, w, h, state, t, ...(k === undefined ? {} : { k }) });

test('every prop draws in each of its states, at its size, over the right spot', () => {
  const cases: PropView[] = [
    pv('shutter', 'closed', 48, 16), pv('shutter', 'open', 48, 16, 0), pv('shutter', 'open', 48, 16, 9), pv('shutter', 'open', 48, 16, 40),
    pv('cipher', 'closed', 32, 16, 0, 0), pv('cipher', 'closed', 32, 16, 0, 0.5), pv('cipher', 'closed', 16, 32, 0, 0.9), pv('cipher', 'open', 32, 16, 0, 1), pv('cipher', 'open', 32, 16, 9, 1), pv('cipher', 'open', 16, 32, 40, 1),
    pv('powerbox', 'closed', 32, 32), pv('powerbox', 'lit', 32, 32, 5), pv('breaker', 'closed', 16, 16), pv('breaker', 'lit', 16, 16, 20),
  ];
  for (const v of cases) {
    for (const calm of [false, true]) {
      const s = stage();
      assert.equal(drawL78Prop(s.ctx, v, art, calm), true, `${v.kind} ${v.state} is drawn`);
      assert.ok(s.images.length >= 1, `${v.kind} ${v.state} t ${v.t} puts its picture down`);
    }
  }
  assert.equal(drawL78Prop(stage().ctx, pv('crate', 'closed', 16, 16), art, false), false, 'anything else is not this file\'s');
  // A shutter that has rolled up is its housing and nothing else; one that has just opened is still on its way.
  const key = (v: PropView): string => (stage().images, (() => { const s = stage(); drawL78Prop(s.ctx, v, art, false); return (s.images[0] as [string, number, number])[0]; })());
  assert.notEqual(key(pv('shutter', 'open', 48, 16, 0)), key(pv('shutter', 'open', 48, 16, 40)));
  assert.equal(key(pv('shutter', 'open', 48, 16, 40)), key(pv('shutter', 'open', 48, 16, 90)), 'rolled up stays rolled up');
  // The cipher door slides: the further in, the less of it is drawn.
  const width = (t: number): number => { const s = stage(); const img: number[] = []; const ctx = { ...s.ctx, drawImage: (_: unknown, ...a: number[]) => { img.push(a[a.length - 2] as number); } } as unknown as CanvasRenderingContext2D; drawL78Prop(ctx, pv('cipher', 'open', 32, 16, t, 1), art, false); return img[0] as number; };
  assert.ok(width(0) > width(9) && width(9) > width(40), `${width(0)}, ${width(9)}, ${width(40)}`);
  assert.equal(width(40), 6, 'and leaves a stub of its edge');
});

// ---------------------------------------------------------------- effects
/** A stand-in 2D context that records the rects it is asked to fill. */
function recorder(): { ctx: CanvasRenderingContext2D; rects: [number, number, number, number, string][] } {
  const rects: [number, number, number, number, string][] = [];
  const ctx = { fillStyle: '#000', fillRect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h, String(this.fillStyle)]); } };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
const fx = (kind: FxView['kind'], t: number, life: number, w: number, h: number, angle = 0): FxView => ({ kind, x: 100, y: 100, dir: 'right', angle, t, life, w, h });
const named = (hex: string): string => (Object.entries(PAL).find(([, v]) => v === hex)?.[0] ?? hex);
const reach = (rects: [number, number, number, number, string][]): number => Math.max(0, ...rects.map((q) => Math.hypot(q[0] - 100, q[1] - 100)));

test('a scoop in flight is a small tumbling cone of ice cream, and its splat grows to w, in pinks, and thins away', () => {
  const fly = recorder(); drawFx(fly.ctx, fx('scoop', 6, 22, 6, 12));
  assert.ok(fly.rects.length >= 10 && fly.rects.length <= 80, `${fly.rects.length} rects`);
  assert.ok(reach(fly.rects) <= 8, 'six wide');
  assert.ok(fly.rects.some((q) => named(q[4]) === 'pink') && fly.rects.some((q) => named(q[4]) === 'sand'), 'a pink scoop on a wafer');
  const sizes = [2, 4, 6].map((t) => { const r = recorder(); drawFx(r.ctx, fx('scoop', t, 14, 32, 32)); return r.rects.length; });
  assert.ok(sizes[0]! < sizes[1]! && sizes[1]! < sizes[2]!, `the splat grows: ${sizes.join(', ')}`);
  const wide = recorder(); drawFx(wide.ctx, fx('scoop', 6, 14, 32, 32));
  assert.ok(reach(wide.rects) <= 16 + 8, `it stops at its diameter: ${reach(wide.rects).toFixed(1)}`);
  const gone = recorder(); drawFx(gone.ctx, fx('scoop', 14, 14, 32, 32));
  assert.ok(gone.rects.length < sizes[2]! * 0.6, 'and is thinning at the end');
});

test('word vomit is a cone of letters from her mouth that spreads to its reach, in bright colors, and thins away', () => {
  const at = (t: number): ReturnType<typeof recorder> => { const r = recorder(); drawFx(r.ctx, fx('babble', t, 24, 56, 48)); return r; };
  assert.ok(at(14).rects.length > at(3).rects.length, 'it fills out');
  assert.ok(reach(at(14).rects) <= 56 + 12, `no further than its reach: ${reach(at(14).rects).toFixed(1)}`);
  assert.ok(reach(at(14).rects) > reach(at(3).rects), 'and spreads');
  const cols = new Set(at(14).rects.map((q) => named(q[4])));
  assert.ok(cols.size >= 3 && [...cols].every((c) => ['pink', 'yellow', 'cyan', 'white', 'magenta'].includes(c)), [...cols].join());
  assert.ok(at(23).rects.length < at(14).rects.length, 'it thins at the end');
  const up = recorder(); drawFx(up.ctx, fx('babble', 14, 24, 56, 48, -Math.PI / 2));
  assert.ok(up.rects.filter((q) => q[1] < 100).length > up.rects.filter((q) => q[1] > 100).length, 'and goes the way she aims');
});

test('a bullet is a bright round with a tail and a flash at the muzzle at first; Nancy\'s crit is a long tracer', () => {
  const b = recorder(); drawFx(b.ctx, fx('bullet', 10, 36, 6, 6));
  assert.ok(b.rects.length >= 3 && b.rects.length <= 8, `${b.rects.length} rects`);
  assert.ok(b.rects.some((q) => named(q[4]) === 'white') && b.rects.some((q) => named(q[4]) === 'yellow'));
  const flash = recorder(); drawFx(flash.ctx, fx('bullet', 0, 36, 6, 6));
  assert.ok(flash.rects.length > b.rects.length, 'the muzzle flash');
  const down = recorder(); drawFx(down.ctx, fx('bullet', 10, 36, 6, 6, Math.PI / 2));
  assert.ok(down.rects.some((q) => q[1] > 100) && !down.rects.some((q) => q[0] > 103), 'it points the way it flies');
  const long = recorder(); drawFx(long.ctx, fx('bullet', 12, 36, 140, 8));
  assert.ok(Math.max(...long.rects.map((q) => q[0])) >= 100 + 60 && Math.max(...long.rects.map((q) => q[0])) <= 100 + 140 + 4, 'the crit streak runs out along its length');
});

test('a melting rat\'s goo spreads to a puddle w by h in purples with a dark rim, then dries to a dither', () => {
  const at = (t: number): ReturnType<typeof recorder> => { const r = recorder(); drawFx(r.ctx, fx('goo', t, 22, 44, 22)); return r; };
  assert.ok(at(2).rects.length < at(8).rects.length && at(8).rects.length > 200, 'it spreads');
  const cols = new Set(at(10).rects.map((q) => named(q[4])));
  assert.ok(cols.has('purple') && cols.has('ink') && [...cols].every((c) => ['purple', 'ink', 'magenta'].includes(c)), [...cols].join());
  const xs = at(10).rects.map((q) => q[0]), ys = at(10).rects.map((q) => q[1]);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= 44 + 14 && Math.max(...ys) - Math.min(...ys) <= 22 + 14, 'about its size');
  assert.ok(at(21).rects.length < at(10).rects.length * 0.7, 'and thins at the end');
});

test('the trap is a steel jaw trap 14 by 8 that blinks for its last second and a half', () => {
  const t = recorder(); drawFx(t.ctx, fx('trap', 100, 600, 14, 8));
  const xs = t.rects.map((q) => q[0]), ys = t.rects.map((q) => q[1]);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= 14 && Math.max(...ys) - Math.min(...ys) <= 8, 'it stays in its 14 by 8');
  assert.ok(t.rects.length > 12);
  const lastOn = recorder(), lastOff = recorder();
  drawFx(lastOn.ctx, fx('trap', 520, 600, 14, 8)); drawFx(lastOff.ctx, fx('trap', 528, 600, 14, 8));
  assert.ok(lastOn.rects.length === 0 || lastOff.rects.length === 0, 'one of them is dark');
  assert.ok(lastOn.rects.length + lastOff.rects.length > 0, 'and the other is lit');
});

test('the arcs web the plate with lightning, in electric colors, and never leave it by more than a few px', () => {
  const at = (t: number): ReturnType<typeof recorder> => { const r = recorder(); drawFx(r.ctx, fx('arcs', t, 31, 32, 32)); return r; };
  const a = at(6), b = at(8);
  assert.ok(a.rects.length > 40, `${a.rects.length} rects`);
  assert.ok([...new Set(a.rects.map((q) => named(q[4])))].every((c) => ['white', 'yellow', 'sky'].includes(c)), 'white, yellow and pale blue');
  for (const q of a.rects) assert.ok(q[0] >= 100 - 16 - 12 && q[0] <= 100 + 16 + 12 && q[1] >= 100 - 16 - 12 && q[1] <= 100 + 16 + 12, `on the plate: ${q[0]},${q[1]}`);
  assert.notDeepEqual(a.rects, b.rects, 'it is struck again every other frame');
  assert.deepEqual(at(6).rects, at(6).rects, 'and is the same for the same frame');
  assert.ok(at(30).rects.length < a.rects.length, 'it dies down at the end');
});

test('a confused enemy has a small swirl of cold sparks over its head that turns', () => {
  const at = (t: number): ReturnType<typeof recorder> => { const r = recorder(); swirl(r.ctx, 100, 100, t); return r; };
  const a = at(0), b = at(9);
  assert.equal(a.rects.length, 5);
  assert.ok(a.rects.every((q) => Math.abs(q[0] - 100) <= 5 && Math.abs(q[1] - 100) <= 2), 'small, and over the head');
  assert.ok(a.rects.every((q) => ['white', 'cyan', 'sky', 'blue'].includes(named(q[4]))), 'cold colors');
  assert.notDeepEqual(a.rects, b.rects, 'it turns');
});
