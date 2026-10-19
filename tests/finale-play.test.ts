// Stage 5.3 in the real play scene on a fake canvas (docs/level-16.md): the arena's door starts the fight and brings `abyss` in, a retry after the
// phases are down starts where they left off (the kill list carries them), the phases step the music, the draw works for every new actor and effect,
// and the channel running out reaches the stage's results once. The sim is in finale-sim.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { Sim, SimView } from '../src/core/types.ts';
import type { PlayOptions } from '../src/world/types.ts';
import { audio } from '../src/audio/index.ts';

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

const pressed = new Set<string>();
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false, interrupted: () => false,
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
const view = (): SimView => sim().view();

/** A scene on stage 5.3 with the party a jump brings, the lead's tile set by `at`. `cleared` counts the times the clear reached the results. */
function start(): { tick(n?: number): void; at(tx: number, ty: number): void; draw(): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '5.3', party: defaultParty('5.3'), onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
  const scene = createPlayScene(opts);
  scene.enter?.(game);
  const tick = (n = 1): void => {
    for (let i = 0; i < n; i++) { game.frame++; (stack[stack.length - 1] ?? scene).update(game); pressed.clear(); }
  };
  tick(2);
  return { tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); }, draw: () => scene.draw(fakeCtx() as never, game), cleared: () => cleared };
}

test('scene: the arena door shuts behind the party, `abyss` comes in and the fight starts; the phases step the music; the draw copes with all of it', () => {
  const heard: string[] = [], phases: number[] = [];
  const realMusic = audio.music, realPhase = audio.phase;
  audio.music = (t) => { heard.push(t as string); };
  audio.phase = (n) => { phases.push(n); };
  try {
    const s = start();
    sim().dev.god = true;
    assert.equal(heard.at(-1), 'upside', 'the climb has its own track');
    assert.equal(view().hud.boss, null);
    s.at(18, 20);
    assert.ok(live().director.hasFired('vecna'));
    assert.equal(view().props.find((p) => p.id === 'door1')?.state, 'closed', 'door1 shuts behind them');
    assert.equal(heard.at(-1), 'abyss');
    assert.equal(view().hud.boss?.name, 'VECNA');
    s.tick(200);
    s.draw();
    // Everything dies at once: Vecna sinks, and with the Mind Flayer down already the channel begins. The draw copes with the sink, the kneeling body, the marks and the channelers.
    sim().dev.killAll();
    s.tick(60);
    s.draw();
    assert.equal(view().hud.boss?.name === 'THE CHANNEL' || view().hud.boss?.name === 'THE MIND FLAYER' || view().hud.boss?.name === 'VECNA', true);
    s.tick(160);
    s.draw();
    assert.equal(view().hud.boss?.name, 'THE CHANNEL');
    assert.deepEqual(phases, [2], 'the channel steps the music to its third tempo, the spider being down already');
    // God mode holds them: the clock runs out and the stage reaches its results once, the beat having played boom and opened the door.
    s.tick(2400 + 200);
    assert.equal(s.cleared(), 1, 'the stage reaches its results once');
    assert.equal(view().props.find((p) => p.id === 'door1')?.state, 'open');
  } finally {
    audio.music = realMusic;
    audio.phase = realPhase;
  }
});

test('scene: a retry after Vecna and the spider are down stands the party by the lights and starts the fight at the channel', () => {
  const s = start();
  sim().dev.god = true;
  const p = { tx: 16, ty: 28 };
  s.at(p.tx + 1, p.ty + 1);
  s.tick(1);
  pressed.add('interact');
  s.tick(1);
  assert.equal(view().props.find((q) => q.id === 'lights_heart')?.state, 'open', 'lights_heart is lit');
  s.at(18, 20);
  sim().dev.killAll();
  s.tick(260);
  assert.equal(view().hud.boss?.phase, 3, 'the channel is running');
  live().retry();
  s.tick(2);
  assert.equal(view().hud.boss, null, 'the retry starts at the lights with the door open and nobody awake');
  assert.equal(view().props.find((q) => q.id === 'door1')?.state, 'open');
  s.at(18, 20);
  s.tick(5);
  assert.equal(view().hud.boss?.name, 'THE CHANNEL', 'Vecna and the spider are in the kill list: the fight picks up at the channel');
  assert.equal(view().hud.channel?.channelers.length, 2);
});
