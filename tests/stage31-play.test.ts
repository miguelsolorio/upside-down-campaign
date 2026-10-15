// Stage 3.1 in the real play scene, headless: a fake canvas and a fake game around createPlayScene. The purse and Erica's stash go into
// every sim the scene builds, the first and every retry; a stash item the sim spends is reported at once; the quarters a run picks up
// are banked at each lit string (and the items taken stay taken), read back on a resume and reported whole when the stage clears;
// and the panel's hint names whoever is in the party. The map, the budget and the scripts are in stage31.test.ts, the sim and the
// bot's runs in stage31-sim.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { HeroSnapshot, PartySeed, PropView, RunStats, Sim, StashItem } from '../src/core/types.ts';
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
const { loadSave } = await import('../src/core/save.ts');
const { STAGE_31 } = await import('../src/world/stages/stage31.ts');

// ---------------------------------------------------------------- a fake game
const pressed = new Set<string>();
let axis = { x: 0, y: 0 };
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => axis,
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
interface Handle { sim: Sim; retry(): void; hint: { puzzle: string; hero: string; text: string } | null; director: { hasFired(id: string): boolean } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;
const hud = () => sim().view().hud;

const PARTY: PartySeed[] = [{ id: 'mike', level: 6 }, { id: 'eleven', level: 5 }, { id: 'robin', level: 4 }, { id: 'nancy', level: 4 }];
interface Cleared { stats: RunStats; party: HeroSnapshot[]; quarters?: number }

/** A scene on stage 3.1 with the purse and the stash the flow would hand it. `stash` is read afresh on every build, like flow's. */
function start(over: Partial<PlayOptions> = {}): { scene: Scene; tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: Cleared[]; used: StashItem[]; stash: { eggo: number; coke: number } } {
  const stash = { eggo: 2, coke: 1 };
  const used: StashItem[] = [];
  const cleared: Cleared[] = [];
  stack.length = 0;
  pressed.clear();
  const scene = createPlayScene({
    stageId: '3.1', party: PARTY, purse: 7, stash: () => ({ ...stash }), onStashUsed: (item) => { used.push(item); stash[item]--; },
    onClear: (r) => { cleared.push(r); }, onQuit: noop, onStartOver: noop, ...over,
  });
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
  return { scene, tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); }, cleared, used, stash };
}

test('scene: the purse and the stash are in the first sim, and the HUD starts the coins at the purse', () => {
  const s = start();
  assert.equal(hud().quarters, 7, 'COINS start at the purse');
  assert.deepEqual(hud().stash, { eggo: 2, coke: 1 }, 'the sim has what was bought');
  s.tick(30);
  assert.equal(hud().quarters, 7);
  assert.deepEqual(s.used, []);
});

test('scene: a Coke the sim drinks is reported at once, and a retry builds the next sim with what is left', () => {
  const s = start();
  // Special until the active hero cannot pay for another: the stash gives a Coke, once.
  for (let n = 0; n < 1500 && s.used.length === 0; n++) s.tick(1, 'special');
  assert.deepEqual(s.used, ['coke'], 'the Coke is spent and reported');
  assert.deepEqual(s.stash, { eggo: 2, coke: 0 }, 'flow writes it back at once');
  assert.deepEqual(hud().stash, { eggo: 2, coke: 0 }, 'and the sim shows what is left');
  live().retry();
  assert.deepEqual(hud().stash, { eggo: 2, coke: 0 }, 'a retry reads the stash again, so the Coke does not come back');
  assert.equal(hud().quarters, 7, 'and the purse is still the purse');
  s.tick(5);
  assert.deepEqual(s.used, ['coke'], 'nothing else is spent');
});

test('scene: an Eggo is eaten when the active hero drops under a quarter of their HP, and that too is reported and kept off the next sim', () => {
  const s = start();
  // The melting rats at the vent: stand among them, with no one to fight back, until the stash feeds the hero.
  s.at(19, 35);
  for (let n = 0; n < 2400 && !s.used.includes('eggo'); n++) {
    if (hud().party.every((p) => p.ko)) break;
    s.tick(1);
  }
  assert.ok(s.used.includes('eggo'), 'the stash fed an Eggo to the hero in trouble');
  assert.equal(s.stash.eggo, 1);
  const before = hud().stash.eggo;
  assert.equal(before, 1, 'the sim has one less');
  live().retry();
  assert.equal(hud().stash.eggo, 1, 'a retry starts with one less');
});

test('scene: the quarters picked up are banked at each lit string, the items taken stay taken, and a retry keeps the bank', () => {
  const s = start();
  const q = (id: string): { tx: number; ty: number } => STAGE_31.spawns.find((p) => p.id === id) as unknown as { tx: number; ty: number };
  const grab = (id: string): void => s.at(q(id).tx, q(id).ty);
  grab('q01');
  grab('q02');
  assert.equal(hud().quarters, 9, 'two quarters on top of the purse');
  // Light the first string: the two are banked. The save carries them, and the checkpoint is the lights.
  s.at(4, 35);
  assert.equal(prop('lights_entry').state, 'off');
  s.tick(1, 'interact');
  assert.equal(prop('lights_entry').state, 'open', 'the party lit the string');
  assert.equal(loadSave()?.quarters, 2, 'the save holds the two quarters');
  assert.ok(loadSave()?.killed.includes('q01') && loadSave()?.killed.includes('q02'), 'and the two items as taken');
  // A third after the lights, then a retry: it is lost, and picked up again for nothing more than the one.
  grab('q03');
  assert.equal(hud().quarters, 10);
  live().retry();
  assert.equal(hud().quarters, 9, 'a retry stands at the lights with the purse and the two banked');
  const items = sim().view().items;
  const near = (id: string): boolean => items.some((it) => it.kind === 'quarter' && Math.hypot(it.x - (q(id).tx * 16 + 8), it.y - (q(id).ty * 16 + 12)) < 20);
  assert.ok(!near('q01') && !near('q02'), 'the two taken quarters do not come back');
  assert.ok(near('q03'), 'the one picked up after the lights is on the floor again');
  grab('q03');
  assert.equal(hud().quarters, 10);
  // Clear the stage: every quarter of the whole run, retries included, is reported once.
  sim().dev.killAll();
  s.tick(5);
  assert.ok(live().director.hasFired('level_clear'), 'the last wave is down');
  s.tick(90);
  assert.equal(s.cleared.length, 1, 'the scene reports the clear once');
  assert.equal(s.cleared[0]?.quarters, 3, 'three quarters in all: two banked and one since');
  assert.equal(s.cleared[0]?.stats.quarters, 1, 'where the last sim only counts its own');
});

test('scene: a CONTINUE from the save starts the coins at the purse plus the bank, and a clear after it reports the sum', () => {
  const first = start();
  first.at(7, 35);
  first.at(4, 35);
  first.tick(1, 'interact');
  const save = loadSave();
  assert.equal(save?.quarters, 1);
  assert.ok(save);
  const again = start({ resume: save, purse: 5 });
  assert.equal(hud().quarters, 6, 'the purse and the one quarter banked');
  again.at(14, 36);
  assert.equal(hud().quarters, 7);
  sim().dev.killAll();
  again.tick(5);
  again.tick(90);
  assert.equal(again.cleared[0]?.quarters, 2, 'the bank and the quarter since');
  const item = sim().view().items;
  assert.ok(!item.some((it) => Math.hypot(it.x - (7 * 16 + 8), it.y - (35 * 16 + 12)) < 20), 'the quarter taken before the save is not on the floor');
});

test('scene: a clear with no lit string reports every quarter the run picked up, and stats are not the only count', () => {
  const s = start({ purse: 0 });
  s.at(7, 35);
  s.at(14, 36);
  sim().dev.killAll();
  s.tick(5);
  s.tick(90);
  assert.equal(s.cleared[0]?.quarters, 2);
  assert.equal(s.cleared[0]?.stats.quarters, 2);
});

test('scene: the panel\'s hint names Nancy for the party the stage opens with, and Lucas when he is in it', () => {
  const s = start();
  // The vent rats are at the shutter too, and a hero who falls is a hero who swaps: nobody falls in this test.
  sim().dev.god = true;
  s.at(21, 34);
  assert.ok(live().director.hasFired('shutter_hint'), 'the hint beat fired at the shutter');
  assert.equal(live().hint, null, 'no hint yet');
  s.tick(300);
  assert.deepEqual(live().hint, { puzzle: 'shutter', hero: 'nancy', text: 'MAYBE NANCY SHOULD TRY HER PISTOL' }, 'five seconds in front of the panel, Nancy is the one it names');
  // Lucas in the party takes it over.
  const t = start({ party: [{ id: 'mike', level: 6 }, { id: 'lucas', level: 5 }, { id: 'robin', level: 4 }, { id: 'nancy', level: 4 }] });
  sim().dev.god = true;
  t.at(21, 34);
  t.tick(300);
  assert.deepEqual(live().hint, { puzzle: 'shutter', hero: 'lucas', text: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT' });
  // Hit the panel from the floor under it, facing it, and the puzzle is done.
  t.at(20, 34);
  axis = { x: 0, y: -0.2 };
  t.tick(8);
  t.tick(1, 'attack');
  axis = { x: 0, y: 0 };
  t.tick(6);
  assert.equal(prop('panel1').state, 'lit', 'the panel is lit');
  assert.equal(live().hint, null, 'and the hint goes');
  assert.equal(prop('shutter1').state, 'open', 'the shutter beat opened the shutter');
});

test('scene: neither cache nags without its hero, and the alt hint covers a party with no Lucas and no Nancy', () => {
  const s = start({ party: [{ id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'will', level: 4 }, { id: 'robin', level: 4 }] });
  sim().dev.god = true;
  s.at(21, 34);
  s.tick(300);
  assert.deepEqual(live().hint, { puzzle: 'shutter', hero: 'mike', text: 'MAYBE MIKE SHOULD HIT THE PANEL' });
  s.at(15, 26);
  assert.ok(live().director.hasFired('crack_hint'));
  s.tick(600);
  assert.ok(live().hint === null || live().hint?.puzzle !== 'crack', 'no hint for the crack without Steve');
});

test('taken: a spawn with no item left for it is taken, nearby quarters are matched one to one, and a spawn already skipped is left out', async () => {
  const { takenItems } = await import('../src/world/taken.ts');
  const q = (id: string, tx: number, ty: number) => ({ kind: 'item' as const, id, item: 'quarter' as const, tx, ty });
  const at = (tx: number, ty: number, kind: 'quarter' | 'eggo' = 'quarter') => ({ kind, x: tx * 16 + 8, y: ty * 16 + 12, t: 0 });
  const spawns = [q('a', 13, 21), q('b', 14, 21), q('c', 20, 20)];
  assert.deepEqual(takenItems(spawns, [at(13, 21), at(14, 21), at(20, 20)]), [], 'all still there');
  assert.deepEqual(takenItems(spawns, [at(14, 21), at(20, 20)]), ['a'], 'one of two neighbors taken: the one with nothing left for it');
  assert.deepEqual(takenItems(spawns, [at(13, 21)]), ['b', 'c'], 'two taken');
  assert.deepEqual(takenItems(spawns, []), ['a', 'b', 'c']);
  assert.deepEqual(takenItems(spawns, [at(14, 21)], new Set(['c'])), ['a'], 'a spawn the sim never had is not counted');
  const drifted = { kind: 'quarter' as const, x: 13 * 16 + 8 + 14, y: 21 * 16 + 12, t: 9 };
  assert.deepEqual(takenItems([q('a', 13, 21)], [drifted]), [], 'an item that drifted toward the hero is still the same one');
  assert.deepEqual(takenItems([q('a', 13, 21)], [at(13, 21, 'eggo')]), ['a'], 'and an Eggo is not a quarter');
});
