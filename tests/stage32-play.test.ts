// Stage 3.2 in the real play scene, headless: a fake canvas and a fake game around createPlayScene. A cipher door Robin has read stays
// open across a retry, the grigori beat shuts both doors and wakes Grigori, a retry from the control room's string puts the doors back
// open and the boss back to sleep, and the breaker's hint names whoever can shoot, goes when the breaker is lit and does not come back
// when it re-arms. The map, the budget and the scripts are in stage32.test.ts, the sim and the bot's runs in stage32-sim.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim } from '../src/core/types.ts';
import type { PlayOptions } from '../src/world/types.ts';

// ---------------------------------------------------------------- a fake canvas and a fake localStorage
const noop = (): undefined => undefined;
function fakeCtx(): unknown {
  const own: Record<string, unknown> = {};
  return new Proxy(own, {
    get(t, k: string) {
      if (k === 'createImageData' || k === 'getImageData') return (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 0 });
      return k in t ? t[k] : noop;
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
}
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => { const c: Record<string, unknown> = { width: 1, height: 1 }; c.getContext = () => fakeCtx(); return c; },
};
const disk = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (k: string) => disk.get(k) ?? null, setItem: (k: string, v: string) => { disk.set(k, v); }, removeItem: (k: string) => { disk.delete(k); } },
});
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');

// ---------------------------------------------------------------- a fake game
const pressed = new Set<string>();
let axis = { x: 0, y: 0 };
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => axis,
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false, party: noop, partySize: () => null, interrupted: () => false,
  } as unknown as Game['input'],
  settings: { difficulty: 'chief', shake: 1, reduceFlashing: false } as unknown as Game['settings'],
  flags: { bot: false, god: false, dev: false, level: 0, seed: 1, party: null } as unknown as Game['flags'],
  scenes: {
    push(s: Scene) { stack.push(s); s.enter?.(game); },
    pop() { stack.pop(); },
    top: () => stack[stack.length - 1] ?? null,
    go: noop, update: noop, draw: noop,
  } as unknown as Game['scenes'],
  frame: 0,
};
interface Handle { sim: Sim; retry(): void; hint: { puzzle: string; hero: string; text: string } | null; director: { hasFired(id: string): boolean } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;
const hud = () => sim().view().hud;


const PARTY: PartySeed[] = [{ id: 'mike', level: 7 }, { id: 'eleven', level: 5 }, { id: 'robin', level: 5 }, { id: 'nancy', level: 5 }];

/** A scene on stage 3.2. `at` puts the lead on a tile and ticks a few frames; `tick` runs frames with one key held. */
function start(party: PartySeed[] = PARTY): { scene: Scene; tick(n?: number, key?: string): void; at(tx: number, ty: number): void } {
  stack.length = 0;
  pressed.clear();
  axis = { x: 0, y: 0 };
  const scene = createPlayScene({ stageId: '3.2', party, onClear: noop, onQuit: noop, onStartOver: noop });
  scene.enter?.(game);
  const tick = (n = 1, key?: string): void => {
    for (let i = 0; i < n; i++) {
      game.frame++;
      if (key) pressed.add(key);
      (stack[stack.length - 1] ?? scene).update(game);
      pressed.clear();
    }
  };
  tick(2);
  return { scene, tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); } };
}

test('scene: a cipher door Robin has read stays open across a retry', () => {
  const s = start();
  sim().dev.god = true;
  s.at(15, 23);
  s.tick(1, 'interact');
  assert.equal(prop('lights_lab').state, 'open', 'the party lit the string by the lab');
  sim().openProp('cipher1');
  s.tick(2);
  assert.equal(prop('cipher1').state, 'open');
  live().retry();
  assert.equal(prop('cipher1').state, 'open', 'a retry from the lights does not shut it again');
  assert.equal(prop('cipher1').k, 1, 'and its letters are all English');
  assert.equal(prop('cipher2').state, 'closed', 'the barracks door, never read, is shut');
});

test('scene: the grigori beat shuts both doors and wakes him, and a retry from the control room puts the doors open and him back to sleep', () => {
  const s = start();
  sim().dev.god = true;
  s.at(19, 32);
  assert.ok(live().director.hasFired('control'), 'the control room beat fired');
  s.at(22, 34);
  s.tick(1, 'interact');
  assert.equal(prop('lights_control').state, 'open', 'the party lit the string, the save point for the fight');
  assert.equal(hud().boss, null, 'Grigori is asleep');
  assert.ok(!live().director.hasFired('grigori'));
  s.at(30, 33);
  s.tick(10);
  assert.ok(live().director.hasFired('grigori'), 'the party is inside the chamber');
  assert.equal(prop('door1').state, 'closed');
  assert.equal(prop('door2').state, 'closed');
  assert.equal(hud().boss?.name, 'GRIGORI', 'and he is awake, with his bar');
  live().retry();
  sim().dev.god = true;
  assert.equal(prop('door1').state, 'open', 'a retry stands at the string with the doors open');
  assert.equal(prop('door2').state, 'open');
  assert.equal(hud().boss, null, 'and Grigori asleep again');
  assert.ok(!live().director.hasFired('grigori'), 'the beat has not fired');
  assert.ok(live().director.hasFired('control'), 'the control room has');
});

test('scene: the breaker\'s hint names Nancy for the party the stage opens with, goes when it is lit, and does not come back when it re-arms', () => {
  const s = start();
  sim().dev.god = true;
  s.at(19, 32);
  s.at(30, 33);
  s.tick(10);
  assert.ok(live().director.hasFired('grigori'));
  // Stand under the breaker, a few tiles off the plate, facing north. Grigori comes for the party, and nobody falls in this test.
  s.at(36, 27);
  s.tick(300);
  assert.deepEqual(live().hint, { puzzle: 'breaker', hero: 'nancy', text: 'MAYBE NANCY SHOULD TRY HER PISTOL' }, 'five seconds in the chamber, Nancy is the one it names');
  // Swap to Nancy and shoot north.
  axis = { x: 0, y: -0.2 };
  s.tick(1, 'swap4');
  s.tick(30);
  for (let n = 0; n < 40 && prop('breaker1').state !== 'lit'; n++) s.tick(1, 'attack');
  assert.equal(prop('breaker1').state, 'lit', 'a shot from the floor under the machine lights it');
  axis = { x: 0, y: 0 };
  assert.equal(live().hint, null, 'and the hint goes');
  s.tick(300 + 60);
  assert.equal(prop('breaker1').state, 'closed', 'the breaker re-armed');
  s.tick(6 * 60);
  assert.equal(live().hint, null, 'and the hint did not come back');
});
