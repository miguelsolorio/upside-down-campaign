// Stage 4.3 in play: whole headless runs of the bot through the street, the alley's mirror, the park and the three clocks, up the ladder and
// through the whole rooftop song (the curses fire and end, the song plays to its end with Eddie planted, he falls and is gone from the party
// but kept in its snapshot), a retry from each string of lights with the kills and the broken props carried over, and the real play scene on
// a fake canvas (the strings, the roof beat shutting the door, the retry opening it again). The map, the budget and the route are in
// stage43.test.ts, the beats and the scripts in stage43-story.test.ts.
//
// The runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: the number the stage ships with is the lead's to tune
// (docs/level-12.md, "Result"). These runs prove the route, the beats, the curses and the song, whatever it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim, SimEvent } from '../src/core/types.ts';
import type { PlayOptions, StageData } from '../src/world/types.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { SONG_BOT, SONG_CARELESS, botSong } from '../src/world/rooftop.ts';
import type { Song } from '../src/world/rooftop.ts';
import { createDirector } from '../src/world/triggers.ts';
import { CHARTS } from '../src/solo/index.ts';
import { S, kit } from './stage43-helpers.ts';
import { idle, stageXp } from './stage-helpers.ts';

/** The factor the bot clears at on chief every time (20 seeds of 20), under what the lead will ship. */
const ROUTE_MULT = 1;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l12_start', 'l12_street', 'l12_clock1', 'l12_mirror_hint', 'l12_clock2', 'l12_park', 'l12_clock3', 'l12_roof', 'l12_solo', 'l12_fall'];

interface Run {
  done: boolean; allDown: boolean; frames: number; xp: number; said: string[]; steps: string[]; events: SimEvent[]; sim: Sim;
  songs: number; songFrames: number; atSong: { active: string | undefined; ring: number | undefined; ids: string[] } | null; atFall: string[] | null;
}

/** Plays the stage whole: the bot walks the waypoints, the director runs the beats, the dialogue is skipped, the song is the solo's bot. */
function play(stage: StageData, seed: number, party: PartySeed[], careless = false): Run {
  const grid = stageGrid(stage);
  const sim = createSim(simOptions(stage, grid, { party, seed, difficulty: 'chief' }));
  const bot = createBot({ grid, waypoints: stage.waypoints, careless });
  const said: string[] = [], steps: string[] = [], events: SimEvent[] = [];
  let song: Song | null = null, songs = 0, songFrames = 0, atSong: Run['atSong'] = null, atFall: string[] | null = null;
  const ids = (): string[] => sim.view().hud.party.map((p) => p.id);
  const dir = createDirector(stage.beats, stage.waves, {
    sim: () => sim,
    say: (id, done) => {
      said.push(id);
      if (id === 'l12_fall') atFall = ids();
      done();
    },
    scare: (done) => done(),
    open: (id) => { steps.push(`open ${id}`); sim.openProp(id); },
    music: (track) => { steps.push(`music ${track}`); },
    light: (id) => { steps.push(`light ${id}`); sim.openProp(id); sim.healParty(0.5); },
    jingle: () => undefined, finish: () => undefined,
    solo: (chart, done) => {
      songs++;
      song = botSong(sim, chart, done, careless ? SONG_CARELESS : SONG_BOT);
      const hud = sim.view().hud;
      atSong = { active: hud.party.find((p) => p.active)?.id, ring: hud.solo?.ring, ids: ids() };
    },
  });
  let allDown = false, f = 0;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(song ? idle : bot.next(sim));
    dir.events(ev);
    if (song) { songFrames++; song.step(); if (song.done) song = null; }
    for (const e of ev) {
      if (e.t === 'cursed' || e.t === 'curseEnd' || e.t === 'allDown') events.push(e);
      if (e.t === 'allDown') allDown = true;
    }
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  return { done: dir.finished(), allDown, frames: f, xp: sim.stats().xpEarned, said, steps, events, sim, songs, songFrames, atSong, atFall };
}

// ---------------------------------------------------------------- whole runs
test('stage 4.3: the bot clears the stage on chief, through every beat in order, three clocks cursed and broken by Eddie, the song played to its end', () => {
  const party = defaultParty('4.3');
  assert.deepEqual(party.map((p) => p.id), ['mike', 'dustin', 'robin', 'eddie'], 'a party with Eddie in it');
  for (const seed of [1, 2, 3, 4]) {
    const run = play(PLAYED, seed, party);
    const tag = `seed ${seed}`;
    assert.ok(run.done && !run.allDown, `${tag} clears`);
    assert.deepEqual(run.said, ORDER, `${tag}: every beat, in order`);
    assert.deepEqual(run.steps, ['light lights_roof', 'music clock'], `${tag}: the ladder lights its string, the bot opens mirror1 itself, and the roof beat changes the music`);
    assert.equal(run.events.filter((e) => e.t === 'cursed').length, 3, `${tag}: three curses, one for each clock`);
    assert.ok(run.events.filter((e) => e.t === 'cursed').every((e) => e.t === 'cursed' && e.hero !== 'eddie' && e.hero !== 'max'), `${tag}: they take a hero who is neither Eddie nor Max`);
    const ended = run.events.filter((e) => e.t === 'curseEnd');
    assert.deepEqual(ended.map((e) => (e.t === 'curseEnd' ? e.how : null)), ['clock', 'clock', 'clock'], `${tag}: each curse ends when its clock breaks`);
    const order = run.events.map((e) => e.t).filter((t) => t !== 'allDown');
    assert.deepEqual(order, ['cursed', 'curseEnd', 'cursed', 'curseEnd', 'cursed', 'curseEnd'], `${tag}: one at a time, each ended before the next begins`);
    const clocks = run.sim.view().props.filter((p) => p.kind === 'clock');
    assert.deepEqual(clocks.map((c) => [c.id, c.state]), [['clock1', 'open'], ['clock2', 'open'], ['clock3', 'open']], `${tag}: all three broken`);
    assert.equal(run.sim.view().props.find((p) => p.id === 'mirror1')?.state, 'open', `${tag}: and the mirror`);
    assert.equal(run.sim.view().props.find((p) => p.id === 'door_roof')?.state, 'closed', `${tag}: the roof beat shut the door and nothing opened it`);
    assert.ok(run.xp >= 0.7 * stageXp(PLAYED), `${tag}: ${run.xp} XP, most of the foes`);
    assert.ok(run.frames > 60 * 60 && run.frames < 60 * 300, `${tag}: ${(run.frames / 60).toFixed(0)} s`);
  }
});

test('stage 4.3: the song plays to its end with Eddie up and planted, and he falls: gone from the party, his level kept in its snapshot', () => {
  const run = play(PLAYED, 2, defaultParty('4.3'));
  assert.ok(run.done && !run.allDown);
  assert.equal(run.songs, 1, 'the song starts once');
  assert.ok(Math.abs(run.songFrames - CHARTS.rooftop.length) < 20, `${run.songFrames} frames for a chart of ${CHARTS.rooftop.length}`);
  assert.deepEqual(run.atSong, { active: 'eddie', ring: run.atSong?.ring, ids: run.atSong?.ids }, 'Eddie is the active hero when the song starts');
  assert.ok((run.atSong?.ring ?? 0) > 0 || run.atSong?.ring === undefined, 'with the ring of his solo');
  assert.equal(run.atFall?.includes('eddie'), false, 'he is gone from the party before the party speaks');
  assert.deepEqual(run.sim.view().hud.party.map((p) => p.id), ['mike', 'dustin', 'robin'], 'and from the HUD');
  assert.equal(run.sim.view().actors.some((a) => a.kind === 'hero' && a.id === 'eddie'), false, 'and the field');
  const eddie = run.sim.party().find((p) => p.id === 'eddie');
  assert.ok(eddie && eddie.level >= 5, 'but the snapshot keeps him, at his level, for the progress');
  assert.deepEqual(run.sim.party().map((p) => p.id), ['mike', 'dustin', 'robin', 'eddie']);
  assert.equal(run.sim.view().hud.solo, null, 'the song is over for the sim');
});

test('stage 4.3: the careless bot (seven notes in ten) gets the whole way to the roof: nothing before the song wipes it, whatever the song does', () => {
  for (const seed of [1, 2, 3]) {
    const run = play(PLAYED, seed, defaultParty('4.3'), true);
    assert.ok(run.said.includes('l12_roof'), `seed ${seed} reaches the roof`);
    assert.ok(run.done || (run.allDown && run.said.includes('l12_solo')), `seed ${seed} either clears or loses on the roof`);
    assert.equal(run.events.filter((e) => e.t === 'cursed').length, 3, `seed ${seed}: all three clocks curse`);
  }
});

// ---------------------------------------------------------------- a retry from each string
/** What the party carries into a retry from `light`: the beats played, the groups gone, the strings lit, the mirror shattered and the clocks broken before it. */
const CARRIED: Record<string, { fired: string[]; cleared: string[]; open: string[] }> = {
  lights_tear: { fired: ['start'], cleared: [], open: ['lights_tear'] },
  lights_park: {
    fired: ['start', 'street', 'clock1', 'mirror_hint', 'clock2'], cleared: ['street', 'bats1', 'alley'],
    open: ['lights_tear', 'lights_park', 'mirror1', 'clock1', 'clock2'],
  },
  lights_roof: {
    fired: ['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3'], cleared: ['street', 'bats1', 'alley', 'park', 'bats2'],
    open: ['lights_tear', 'lights_park', 'lights_roof', 'mirror1', 'clock1', 'clock2', 'clock3', 'door_roof'],
  },
};
const LEFT: Record<string, string[]> = {
  lights_tear: ORDER.slice(1),
  lights_park: ORDER.slice(5),
  lights_roof: ORDER.slice(7),
};

/** The stage rebuilt at a string the way the play scene does it, and run to the end. `extra` is kept open too, `dead` groups skipped. */
function retry(light: string, o: { extra?: string[]; dead?: string[]; careless?: boolean; stage?: StageData; party?: PartySeed[] } = {}): { sim: Sim; said: string[]; done: boolean; events: SimEvent[]; songs: number; allDown: boolean } {
  const { extra = [], dead = [], careless = false, stage = PLAYED, party = defaultParty('4.3') } = o;
  const cp = stage.checkpoints.find((c) => c.prop === light) as (typeof PLAYED.checkpoints)[number];
  const have = CARRIED[light] as (typeof CARRIED)[string];
  const gone = kit.enemies.filter((e) => have.cleared.includes(e.group) || dead.includes(e.group)).map((e) => e.id);
  const grid = stageGrid(stage);
  const sim = createSim(simOptions(stage, grid, { party, start: { x: cp.x, y: cp.y }, seed: 5, difficulty: 'chief', skipSpawns: gone, openProps: [...have.open, ...extra] }));
  const said: string[] = [], events: SimEvent[] = [];
  let song: Song | null = null, songs = 0;
  const dir = createDirector(stage.beats, stage.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id), jingle: () => undefined, finish: () => undefined,
    solo: (chart, done) => { songs++; song = botSong(sim, chart, done, careless ? SONG_CARELESS : SONG_BOT); },
  });
  dir.restore({ fired: have.fired, cleared: have.cleared });
  const bot = createBot({ grid, waypoints: routeFrom(stage.waypoints, cp) });
  let allDown = false;
  for (let f = 0; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(song ? idle : bot.next(sim));
    dir.events(ev);
    if (song) { song.step(); if (song.done) song = null; }
    for (const e of ev) {
      if (e.t === 'cursed' || e.t === 'curseEnd') events.push(e);
      if (e.t === 'allDown') allDown = true;
    }
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  return { sim, said, done: dir.finished(), events, songs, allDown };
}

for (const light of ['lights_tear', 'lights_park', 'lights_roof']) {
  test(`stage 4.3: a retry from ${light}, with the kills and the broken props carried over, walks on and clears`, () => {
    const r = retry(light);
    assert.ok(r.done && !r.allDown, 'the stage is cleared');
    assert.deepEqual(r.said, LEFT[light], 'the beats that were left play, and the ones before the string do not play again');
    assert.equal(r.songs, 1, 'the song is played once');
    assert.equal(r.sim.view().hud.party.some((p) => p.id === 'eddie'), false, 'and Eddie falls at the end');
    assert.equal(r.sim.party().some((p) => p.id === 'eddie'), true, 'but stays in the snapshot');
    // Every clock still standing whole at the string curses again (a retry rebuilds the stage, and a broken clock stays broken).
    const cursed = r.events.filter((e) => e.t === 'cursed').length;
    assert.equal(cursed, light === 'lights_tear' ? 3 : light === 'lights_park' ? 1 : 0, 'the clocks left are cursed again, the broken ones are not');
  });
}

test('stage 4.3: a wipe on the roof is retried from lights_roof with the party the first try left (Eddie\'s level and all), and the second try clears', () => {
  // Foes that no party outlasts on the roof: the first try loses the song, with Eddie knocked out.
  const brutal: StageData = { ...PLAYED, enemyMult: 6 };
  const first = retry('lights_roof', { stage: brutal, careless: true });
  assert.ok(first.allDown && !first.done, 'the first try is a wipe');
  assert.equal(first.songs, 1, 'on the roof, in the song');
  assert.deepEqual(first.said, ['l12_roof', 'l12_solo'], 'after the roof beat and Eddie\'s word');
  assert.equal(first.sim.view().props.find((p) => p.id === 'door_roof')?.state, 'closed', 'with the door shut behind them');
  const carried = first.sim.party().map((p) => ({ id: p.id, level: p.level, xp: p.xp, bonus: p.bonus }));
  assert.ok(carried.some((p) => p.id === 'eddie'), 'Eddie is still in the party the wipe leaves');
  const second = retry('lights_roof', { party: carried });
  assert.ok(second.done && !second.allDown, 'the second try clears from the same string');
  assert.deepEqual(second.said, LEFT.lights_roof, 'with the roof beat, the song and the fall all played again');
});

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
interface Handle { sim: Sim; retry(): void; director: { hasFired(id: string): boolean }; stage: { storm?: boolean; flashBaked: unknown; baked: unknown } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;

/** A scene on stage 4.3. `at` puts the active hero on a tile and ticks a few frames. */
function start(party: PartySeed[] = defaultParty('4.3')): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '4.3', party, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
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
const heroTile = (): [number, number] => { const p = sim().heroPos(); return [Math.floor(p.x / 16), Math.floor((p.y - 4) / 16)]; };

// ---------------------------------------------------------------- the scene
test('scene: the party starts at the tear in the storm with Eddie in it, and each string lights and saves the place, so a retry stands the party by it with it still lit', () => {
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.deepEqual(sim().party().map((p) => p.id), ['mike', 'dustin', 'robin', 'eddie']);
  assert.equal(sim().view().hud.party.length, 4);
  assert.equal(live().stage.storm, true, 'the stage has its storm');
  assert.ok(live().stage.flashBaked && live().stage.flashBaked !== live().stage.baked, 'and the bolt\'s bake of the same letters');
  for (const c of S.checkpoints) {
    s.at(Math.floor(c.x / 16), Math.floor((c.y - 4) / 16));
    s.tick(1, 'interact');
    assert.equal(prop(c.prop).state, 'open', `${c.prop} is lit`);
    s.at(4, 29);
    live().retry();
    s.tick(2);
    const [tx, ty] = heroTile();
    assert.deepEqual([tx, ty], [Math.floor(c.x / 16), Math.floor((c.y - 4) / 16)], `a retry stands the party by ${c.prop}`);
    assert.equal(prop(c.prop).state, 'open', `and ${c.prop} is still lit`);
  }
});

test('scene: a clock beat chimes the clock and lifts a hero, a retry from the last string has no curse and the clock whole, and mirror1 stays open once shattered', () => {
  const s = start();
  sim().dev.god = true;
  const lights = S.checkpoints[0] as (typeof S.checkpoints)[number];
  s.at(Math.floor(lights.x / 16), Math.floor((lights.y - 4) / 16));
  s.tick(1, 'interact');
  s.at(13, 33);
  assert.ok(live().director.hasFired('clock1'), 'the beat fired on the sidewalk in front of the yard');
  s.tick(5);
  assert.ok(sim().view().hud.party.some((p) => (p.curse ?? 0) > 0), 'a hero is cursed, with the clock mark on their slot');
  live().retry();
  s.tick(3);
  assert.ok(!sim().view().hud.party.some((p) => (p.curse ?? 0) > 0), 'the retry has no curse');
  assert.ok(!live().director.hasFired('clock1'), 'and the beat plays again, since the string was lit before it');
  assert.equal(prop('clock1').state, 'closed', 'with the clock whole');
  s.at(13, 33);
  assert.ok(live().director.hasFired('clock1'));
  sim().openProp('clock1');
  s.tick(2);
  assert.equal(prop('clock1').state, 'open');
  assert.ok(!sim().view().hud.party.some((p) => (p.curse ?? 0) > 0), 'breaking it lifts the curse');
});

test('scene: the roof beat shuts door_roof behind the party and a retry from lights_roof opens it again, with the roof to play once more', () => {
  const s = start();
  sim().dev.god = true;
  s.at(29, 22);
  assert.ok(live().director.hasFired('park'), 'the park beat fired at the gate');
  s.tick(300);
  const lights = S.checkpoints[2] as (typeof S.checkpoints)[number];
  s.at(Math.floor(lights.x / 16), Math.floor((lights.y - 4) / 16));
  s.tick(1, 'interact');
  assert.equal(prop('lights_roof').state, 'open');
  assert.equal(prop('door_roof').state, 'open', 'the ladder is open at the foot of it');
  s.at(38, 14);
  s.at(38, 7);
  assert.ok(live().director.hasFired('roof'), 'the roof beat fired on the deck');
  assert.equal(prop('door_roof').state, 'closed', 'and shut the door behind the party');
  s.tick(2);
  const [rx, ry] = heroTile();
  assert.ok(rx >= 30 && rx <= 45 && ry >= 2 && ry <= 11, 'the party is on the deck, behind a shut door');
  live().retry();
  s.tick(3);
  assert.equal(prop('door_roof').state, 'open', 'a retry opens the door again');
  assert.ok(!live().director.hasFired('roof'), 'and the roof beat plays again');
  assert.deepEqual(heroTile(), [Math.floor(lights.x / 16), Math.floor((lights.y - 4) / 16)], 'at lights_roof');
  assert.equal(sim().view().hud.party.some((p) => p.id === 'eddie'), true, 'with Eddie in the party');
});
