// Stage 3.3 in the real play scene, headless: a fake canvas and a fake game around createPlayScene. Hopper leaves at the lift and does not
// come back on a retry; the clear runs the boom (the `boom` sfx, then the doors and the finish); a freed Billy lies where he fell after a
// retry. aftermath.ts, which holds the boom's look and the two retry rules, is tested on its own at the end. The map, the budget and the
// bot are in stage33.test.ts, the beats and the scripts in stage33-story.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim, SimOptions, SimView } from '../src/core/types.ts';
import type { PlayOptions } from '../src/world/types.ts';
import { BOOM_FRAMES, boomView, deadBilly, leavers } from '../src/world/aftermath.ts';
import { audio } from '../src/audio/index.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createSim } from '../src/combat/index.ts';
import { S, rectTiles } from './stage33-helpers.ts';
import { idle } from './stage-helpers.ts';

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
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
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
interface Handle { sim: Sim; retry(): void; director: { hasFired(id: string): boolean } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;
const npc = (id: string): SimView['actors'][number] | undefined => sim().view().actors.find((a) => a.kind === 'npc' && a.id === id);

const PARTY: PartySeed[] = [{ id: 'mike', level: 7 }, { id: 'dustin', level: 6 }, { id: 'robin', level: 4 }, { id: 'eleven', level: 3 }];

/** A scene on stage 3.3. `cleared` counts the times the stage's clear reached the results. `at` puts the lead on a tile and ticks a few frames. */
function start(): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '3.3', party: PARTY, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
  const scene = createPlayScene(opts);
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
  return { tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); }, cleared: () => cleared };
}

// ---------------------------------------------------------------- Hopper
test('scene: Hopper leaves when the start beat ends, and a retry from the string by the lift does not bring him back', () => {
  const data = S.spawns.filter((s) => s.kind === 'npc');
  assert.deepEqual(data.map((n) => n.id), ['hopper'], 'the stage spawns him by the lift');
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.equal(npc('hopper'), undefined, 'and he is gone from the view');
  s.at(5, 32);
  s.tick(1, 'interact');
  assert.equal(prop('lights_hall').state, 'open', 'the party lit the string by the lift');
  live().retry();
  assert.equal(npc('hopper'), undefined, 'a retry from it does not put him back at the lift');
  assert.ok(live().director.hasFired('start'));
});

// ---------------------------------------------------------------- the clear
test('scene: the clear plays the boom sfx, opens both doors and reaches the results, and a retry stands Billy\'s body where he fell', () => {
  const heard: string[] = [];
  const real = audio.sfx;
  audio.sfx = (id) => { heard.push(id); };
  try {
    const s = start();
    sim().dev.god = true;
    const billy = S.spawns.find((e) => e.kind === 'enemy' && e.id === 'billy') as { tx: number; ty: number };
    assert.equal(npc('billy'), undefined, 'there is no body while he is up');
    // Everything dies at once: Billy's group clears, the Mind Flayer's wakes empty and clears, and the beats run on to the end.
    sim().dev.killAll();
    s.tick(30);
    assert.ok(heard.includes('boom'), 'the boom sfx played');
    assert.equal(prop('door1').state, 'open');
    assert.equal(prop('door2').state, 'open');
    assert.equal(s.cleared(), 0, 'and the results wait for the clear\'s fade');
    s.tick(90);
    assert.equal(s.cleared(), 1, 'the stage reaches its results once');
    const body = npc('billy');
    assert.ok(body, 'Billy lies on the floor where he fell');
    assert.deepEqual([Math.floor((body?.x ?? 0) / 16), Math.floor(((body?.y ?? 0) - 4) / 16)], [billy.tx, billy.ty]);
    // A retry builds no Billy, and puts the body back.
    live().retry();
    assert.equal(sim().view().actors.some((a) => a.kind === 'enemy' && a.id === 'billy'), false);
    const again = npc('billy');
    assert.ok(again && Math.abs(again.x - (body?.x ?? 0)) < 1 && Math.abs(again.y - (body?.y ?? 0)) < 1, 'and the body is where it was');
  } finally {
    audio.sfx = real;
  }
});

// ---------------------------------------------------------------- aftermath.ts
const fakeView = (): SimView => ({
  actors: [], fx: [], items: [], hazards: [], pools: [], floaters: [], focus: { x: 0, y: 0 }, shake: { x: 1, y: -1 }, flash: 0,
  props: [
    { id: 'a', kind: 'lights', state: 'open', x: 0, y: 0, w: 48, h: 16, t: 0 }, { id: 'b', kind: 'lights', state: 'lit', x: 0, y: 0, w: 48, h: 16, t: 0 },
    { id: 'c', kind: 'lights', state: 'off', x: 0, y: 0, w: 48, h: 16, t: 0 }, { id: 'd', kind: 'door', state: 'open', x: 0, y: 0, w: 16, h: 32, t: 0 },
  ],
} as unknown as SimView);

test('boomView: every lit lights prop goes dark and stays dark, the shake dies away over 90 frames, and the sim\'s own view is not touched', () => {
  const v = fakeView();
  assert.equal(BOOM_FRAMES, 90);
  for (const t of [0, 45, 89, 90, 5000]) {
    const b = boomView(v, t, 1);
    assert.deepEqual(b.props.map((p) => p.state), ['off', 'off', 'off', 'open'], `lights are dark ${t} frames after, and a door is left alone`);
  }
  assert.deepEqual(v.props.map((p) => p.state), ['open', 'lit', 'off', 'open'], 'the view the scene reads is unchanged');
  assert.equal(v.props[0]?.kind, 'lights');
  const swing = (t: number): number => { const b = boomView(v, t, 1); return Math.max(Math.abs(b.shake.x - 1), Math.abs(b.shake.y + 1)); };
  const early = Math.max(...[1, 2, 3, 4, 5, 6].map(swing)), late = Math.max(...[80, 81, 82, 83, 84, 85].map(swing));
  assert.ok(early >= 3 && late < early, `the shake starts at ${early} px and falls to ${late}`);
  assert.deepEqual(boomView(v, 90, 1).shake, v.shake, 'it is over after 90 frames');
  assert.deepEqual(boomView(v, 3, 0).shake, v.shake, 'and with the shake setting at 0 it never starts');
});

test('deadBilly: a freed Billy is an npc where he fell, or on his spawn tile with no record of it; leavers: npcs a fired beat sent away', () => {
  const o: SimOptions = simOptions(S, stageGrid(S), { party: PARTY });
  assert.equal(deadBilly(o, [], new Map()), o, 'with Billy alive the options are unchanged');
  assert.equal(deadBilly(o, ['kit_a'], new Map()), o, 'and so for any other kill');
  const spawn = S.spawns.find((e) => e.kind === 'enemy' && e.id === 'billy') as { tx: number; ty: number };
  const fallback = deadBilly(o, ['billy'], new Map()).spawns.at(-1);
  assert.deepEqual(fallback, { kind: 'npc', id: 'billy', tx: spawn.tx, ty: spawn.ty, dir: 'right' }, 'on his spawn tile after a load');
  const there = deadBilly(o, ['billy'], new Map([['billy', { x: 21 * 16 + 9, y: 8 * 16 + 14 }]])).spawns.at(-1);
  assert.deepEqual(there, { kind: 'npc', id: 'billy', tx: 21, ty: 8, dir: 'right' }, 'on the tile of the kill\'s x and y');
  assert.equal(o.spawns.some((e) => e.kind === 'npc' && e.id === 'billy'), false, 'the stage\'s own spawns are not touched');
  const freed = deadBilly({ ...o, skipSpawns: ['billy', 'kit_a'] }, ['billy', 'kit_a'], new Map());
  assert.deepEqual(freed.skipSpawns, ['kit_a'], 'he leaves the skip list, which would drop the npc too');
  assert.equal(freed.spawns.some((e) => e.kind === 'enemy' && e.id === 'billy'), false, 'and the enemy is out of the spawns');
  // The body is in the sim, and Billy is not.
  const s = createSim(deadBilly({ ...o, skipSpawns: ['billy'] }, ['billy'], new Map()));
  s.step(idle);
  assert.ok(s.view().actors.some((a) => a.kind === 'npc' && a.id === 'billy') && !s.view().actors.some((a) => a.kind === 'enemy' && a.id === 'billy'));
  assert.deepEqual(leavers(S.beats, []), []);
  assert.deepEqual(leavers(S.beats, ['kitchen']), []);
  assert.deepEqual(leavers(S.beats, ['kitchen', 'start']), ['hopper']);
  assert.ok(rectTiles({ tx: 0, ty: 0, w: 1, h: 1 }).length === 1);
});
