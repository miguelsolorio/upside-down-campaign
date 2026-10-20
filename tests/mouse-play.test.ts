// The mouse in the real play scene, headless: a fake canvas and a fake game around createPlayScene, with a fake input that has the mouse's
// three methods and gives a click for one tick when a test sets it. A click on the ground walks the active hero there, a right click
// casts his Special, the mark shows where the walk is going, and under the bot the mouse is never read. The glue is in mouseglue.test.ts
// and the driver in mouseplay-*.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { Sim, Vec2 } from '../src/core/types.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { PAL } from '../src/gfx/palette.ts';

// ---------------------------------------------------------------- a fake canvas that remembers its fillRects
const noop = (): undefined => undefined;
const rects: { color: string; x: number; y: number; w: number; h: number }[] = [];
function fakeCtx(): unknown {
  const own: Record<string, unknown> = {};
  return new Proxy(own, {
    get(t, k: string) {
      if (k === 'createImageData' || k === 'getImageData') return (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'fillRect') return (x: number, y: number, w: number, h: number) => { rects.push({ color: String(t.fillStyle), x, y, w, h }); };
      return k in t ? t[k] : noop;
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
}
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => { const c: Record<string, unknown> = { width: 1, height: 1 }; c.getContext = () => fakeCtx(); return c; },
};
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');
const { VIEW_TOP } = await import('../src/core/config.ts');

// ---------------------------------------------------------------- a fake game
/** What the mouse does on the next tick: set by a test, read once and cleared, like a click latch. */
let left: Vec2 | null = null, right: Vec2 | null = null;
let reads = 0;
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: () => false, pressed: () => false, released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'mouse', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => left, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false, party: noop, partySize: () => null, interrupted: () => false,
    mouseClicked: () => { reads++; return left; }, rightClicked: () => { reads++; return right; }, rightHeld: () => { reads++; return false; },
  } as unknown as Game['input'],
  settings: { difficulty: 'chief', shake: 1, reduceFlashing: false } as unknown as Game['settings'],
  flags: { bot: false, god: true, dev: false, level: 0, seed: 1, party: null } as unknown as Game['flags'],
  scenes: {
    push(s: Scene) { stack.push(s); s.enter?.(game); },
    pop() { stack.pop(); },
    top: () => stack[stack.length - 1] ?? null,
    go: noop, update: noop, draw: noop,
  } as unknown as Game['scenes'],
  frame: 0,
};
interface Handle { sim: Sim; camera: { x: number; y: number } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;

/** A scene on stage 1.1 with a party of Mike and Dustin, run for two ticks so the first view is in. */
function start(bot = false): { scene: Scene; tick(n?: number): void; draw(): void } {
  stack.length = 0; left = right = null; reads = 0; rects.length = 0;
  (game.flags as { bot: boolean }).bot = bot;
  const scene = createPlayScene({ stageId: '1.1', party: [{ id: 'mike' }, { id: 'dustin' }], onClear: noop, onQuit: noop, onStartOver: noop });
  scene.enter?.(game);
  const tick = (n = 1): void => {
    for (let i = 0; i < n; i++) {
      game.frame++;
      (stack[stack.length - 1] ?? scene).update(game);
      left = right = null;
    }
  };
  tick(2);
  return { scene, tick, draw: () => scene.draw(fakeCtx() as never, game) };
}

/** Where a world point is on the screen, under the camera the scene has now. */
const screenOf = (w: Vec2): Vec2 => ({ x: w.x - live().camera.x, y: w.y - live().camera.y + VIEW_TOP });
const mp = (): number => live().sim.view().hud.party.find((m) => m.active)?.mp ?? NaN;

test('a click on the ground 40 px to the hero\'s right walks him there', () => {
  const s = start();
  const from = live().sim.heroPos();
  left = screenOf({ x: from.x + 40, y: from.y });
  s.tick();
  s.tick(60);
  const to = live().sim.heroPos();
  assert.ok(to.x >= from.x + 20, `he walked right: ${from.x} to ${to.x}`);
  assert.ok(Math.abs(to.y - from.y) < 12, 'and stayed on his row');
});

test('a right click in the field casts the active hero\'s Special', () => {
  const s = start();
  const before = mp();
  const hero = live().sim.heroPos();
  right = screenOf({ x: hero.x + 30, y: hero.y - 6 });
  s.tick();
  s.tick(4);
  const cost = HERO_DEFS.mike.special.mp;
  assert.ok(cost > 0);
  assert.equal(before - mp(), cost, 'the Special\'s MP is spent');
});

test('the walk\'s mark is drawn in the leaf green while he walks, and is gone a little after he arrives', () => {
  const s = start();
  const from = live().sim.heroPos();
  const spot = { x: from.x + 40, y: from.y };
  left = screenOf(spot);
  s.tick();
  rects.length = 0;
  s.draw();
  const leaf = rects.filter((r) => r.color === PAL.leaf && r.w === 1 && r.h === 1);
  assert.equal(leaf.length, 16, 'a ring of single pixels');
  const xs = leaf.map((r) => r.x), ys = leaf.map((r) => r.y);
  assert.deepEqual([Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1], [9, 5], '9 by 5');
  // The spot snaps to the middle of its tile, so the ring is within half a tile of the click.
  const at = screenOf(spot), mid = { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 };
  assert.ok(Math.abs(mid.x - at.x) <= 8 && Math.abs(mid.y - at.y) <= 8, `around the spot: ${JSON.stringify(mid)} for ${JSON.stringify(at)}`);
  // He gets there, then the mark blinks out over MARK_FRAMES and goes.
  s.tick(150);
  rects.length = 0;
  s.draw();
  assert.equal(rects.filter((r) => r.color === PAL.leaf && r.w === 1 && r.h === 1).length, 0, 'no ring once he has arrived and it has faded');
});

test('under the bot the mouse is never read, so a click moves nothing and the scene runs on', () => {
  const s = start(true);
  const hero = live().sim.heroPos();
  left = screenOf({ x: hero.x + 40, y: hero.y });
  right = screenOf({ x: hero.x + 30, y: hero.y });
  assert.doesNotThrow(() => s.tick(61));
  assert.equal(reads, 0, 'the mouse methods were not called');
  s.draw();
  assert.equal(rects.filter((r) => r.color === PAL.leaf && r.w === 1 && r.h === 1).length, 0, 'and no mark was drawn');
});
