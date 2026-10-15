// Stage 1.3 in the real play scene, headless, on the same fake canvas and game as stage23-scene.test.ts: the scare fires by
// position, mid-cafeteria, and the whole level holds still while it plays, so the rats it can land among bite nobody.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { Sim } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { STAGE_13 as S } from '../src/world/stages/stage13.ts';
import type { Director } from '../src/world/triggers.ts';

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
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');

const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: () => false, pressed: () => false, released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false,
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
const play = createPlayScene({ stageId: '1.3', party: defaultParty('1.3'), onClear: noop, onQuit: noop, onStartOver: noop });
play.enter?.(game);
const live = (): { sim: Sim; director: Director } => (globalThis as unknown as { __ud: { play: { sim: Sim; director: Director } } }).__ud.play;
const sim = (): Sim => live().sim;
const fired = (id: string): boolean => live().director.hasFired(id);
const tick = (n = 1): void => {
  for (let i = 0; i < n; i++) { game.frame++; (stack[stack.length - 1] ?? play).update(game); }
};
const at = (tx: number, ty: number): void => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); };
const rats = (): string => sim().view().actors.filter((a) => a.kind === 'enemy').map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(' ');

test('scene: the scare fires mid-cafeteria with the rats still up, and nothing moves or bites until it is over', () => {
  tick(5);
  sim().openProp('van1');
  sim().openProp('vines1');
  at(25, 23);
  assert.ok(fired('cafeteria'), 'the doorway wakes the rats');
  tick(40);
  assert.ok(!fired('scare'), 'the rats waking is not the scare');
  assert.ok(sim().enemiesAlive('rats1') > 0);
  at(33, 22);
  assert.ok(fired('scare'), 'the scare fires mid-room');
  const frames = sim().stats().frames, hp = sim().party().map((p) => p.hp).join(), where = rats();
  tick(S.scare.frames - 10);
  assert.equal(sim().stats().frames, frames, 'the level holds still while the lights stutter');
  assert.equal(sim().party().map((p) => p.hp).join(), hp, 'nobody is bitten');
  assert.equal(rats(), where, 'and the rats stand where they were');
  tick(30);
  assert.ok(sim().stats().frames > frames, 'it plays on once the scare is over');
  assert.ok(fired('firebox_hint'), 'and the shoot hint follows it');
});
