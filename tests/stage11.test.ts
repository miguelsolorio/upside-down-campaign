import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { STAGE_11 as S } from '../src/world/stages/stage11.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Beat, TileRect } from '../src/world/types.ts';
import type { Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';

const grid = stageGrid(S);
const idx = (tx: number, ty: number): number => ty * grid.w + tx;
const tileOf = (x: number, y: number): [number, number] => [Math.floor(x / 16), Math.floor((y - 4) / 16)];
const SOLID_KINDS = new Set(['log', 'gate', 'van', 'crate', 'floodlight']);

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
type Prop = Extract<SimSpawn, { kind: 'prop' }>;
const enemies = S.spawns.filter((s): s is Enemy => s.kind === 'enemy');
const items = S.spawns.filter((s) => s.kind === 'item') as Extract<SimSpawn, { kind: 'item' }>[];
const props = S.spawns.filter((s): s is Prop => s.kind === 'prop');
const npcs = S.spawns.filter((s) => s.kind === 'npc') as Extract<SimSpawn, { kind: 'npc' }>[];
const [startTx, startTy] = tileOf(S.start.x, S.start.y);

/** Solid tiles plus the footprint of every solid prop that is not open yet. */
function blocked(open: Set<string>): Uint8Array {
  const b = new Uint8Array(grid.solid);
  for (const p of props) {
    if (open.has(p.id) || !(p.solid ?? SOLID_KINDS.has(p.prop))) continue;
    const w = p.w ?? (p.prop === 'van' ? 48 : 16), h = p.h ?? (p.prop === 'van' ? 32 : 16);
    for (let y = p.ty; y < p.ty + Math.ceil(h / 16); y++) for (let x = p.tx; x < p.tx + Math.ceil(w / 16); x++) b[idx(x, y)] = 1;
  }
  return b;
}

/** Four-way flood fill from the start tile. */
function flood(open: Set<string>, from: [number, number] = [startTx, startTy]): Uint8Array {
  const b = blocked(open);
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [idx(from[0], from[1])];
  seen[stack[0] as number] = 1;
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % grid.w, y = (i / grid.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
      const j = idx(nx, ny);
      if (seen[j] || b[j]) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  return seen;
}

const rectTiles = (r: TileRect): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = r.ty; y < r.ty + r.h; y++) for (let x = r.tx; x < r.tx + r.w; x++) out.push([x, y]);
  return out;
};

// ---------------------------------------------------------------- the map
test('stage 1.1: the map is 48 by 40 and uses only legend characters', () => {
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const ch of row) assert.ok(TILES[ch], `unknown tile '${ch}' in row ${y}`);
  }
  assert.equal(grid.w, 48);
  assert.equal(grid.h, 40);
  for (let x = 0; x < 48; x++) assert.ok(grid.solid[idx(x, 0)] && grid.solid[idx(x, 39)], 'top and bottom edges are solid');
  for (let y = 0; y < 40; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(47, y)], 'left and right edges are solid');
});

test('stage 1.1: the start and every spawn tile are walkable, and the start is quiet', () => {
  assert.equal(grid.solid[idx(startTx, startTy)], 0, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(grid.solid[idx(s.tx, s.ty)], 0, `${s.kind} ${'id' in s ? s.id : ''} at ${s.tx},${s.ty}`);
  for (const p of props) assert.equal(grid.solid[idx(p.tx, p.ty)], 0, `prop ${p.id} sits on open ground`);
  for (const e of enemies) {
    const d = Math.hypot(e.tx - startTx, e.ty - startTy);
    assert.ok(d > 8, `${e.id} is ${d.toFixed(1)} tiles from the start`);
  }
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique');
});

test('stage 1.1: the spawn budget matches docs/level-1.md', () => {
  const count = (g: string): number => enemies.filter((e) => e.group === g).length;
  assert.equal(enemies.filter((e) => e.type === 'rat').length, 8);
  assert.equal(enemies.filter((e) => e.type === 'agent').length, 14);
  assert.deepEqual([count('rats1'), count('agents1'), count('rats2'), count('agents2'), count('ambush1'), count('ambush2'), count('ambush3')], [4, 2, 4, 3, 3, 3, 3]);
  for (const g of ['rats1', 'ambush1', 'ambush2', 'ambush3']) assert.ok(enemies.filter((e) => e.group === g).every((e) => e.dormant), `${g} is dormant`);
  for (const g of ['agents1', 'agents2']) assert.ok(enemies.filter((e) => e.group === g).every((e) => (e.patrol?.length ?? 0) >= 2), `${g} patrols`);
  assert.ok(enemies.filter((e) => e.group === 'rats2').every((e) => !e.dormant), 'rats2 is awake');
  const kinds = (k: string): number => items.filter((i) => i.item === k).length;
  assert.deepEqual([kinds('eggo'), kinds('coke'), kinds('quarter')], [4, 2, 12]);
  assert.deepEqual(props.map((p) => p.id).sort(), ['bike', 'flood1', 'flood2', 'gate1', 'lights_shed', 'lights_yard', 'log1', 'sign1', 'target1', 'van']);
  assert.deepEqual(npcs.map((n) => n.id).sort(), ['eleven', 'joyce']);
  const gate = props.find((p) => p.id === 'gate1');
  const log = props.find((p) => p.id === 'log1');
  const target = props.find((p) => p.id === 'target1');
  assert.equal(gate?.prop, 'gate');
  assert.equal(log?.pushBy, 'push');
  assert.equal(target?.hitBy, 'shoot');
  assert.equal(S.music, 'mirkwood');
});

test('stage 1.1: the stage is worth between 130 and 175 XP', () => {
  const xp = enemies.reduce((sum, e) => sum + ENEMY_DEFS[e.type].xp, 0);
  assert.equal(xp, 144);
  assert.ok(xp >= 130 && xp <= 175);
});

// ---------------------------------------------------------------- reachability
test('stage 1.1: gate1 and log1 are the only way to the Lab road', () => {
  const lab = S.beats.find((b) => b.id === 'ambush')!.when as { rect: TileRect };
  const [lx, ly] = [lab.rect.tx, lab.rect.ty + 2];
  const shut = flood(new Set());
  assert.ok(shut[idx(startTx, startTy)]);
  assert.equal(shut[idx(lx, ly)], 0, 'Lab road is cut off while both are solid');
  assert.equal(flood(new Set(['gate1']))[idx(lx, ly)], 0, 'the gate alone is not enough');
  assert.equal(flood(new Set(['log1']))[idx(lx, ly)], 0, 'the log alone is not enough');
  assert.equal(flood(new Set(['gate1', 'log1']))[idx(lx, ly)], 1, 'open, the route runs through');
  // Before the gate: the yard, the trail, the bend and the agent clearing are open.
  const [rx, ry] = [28, 31];
  assert.equal(shut[idx(rx, ry)], 1, 'the rat bend is reachable at the start');
  assert.equal(shut[idx(34, 22)], 1, 'the south bank is reachable at the start');
  // Past the gate and before the log: the creek, the dump and the shed.
  const mid = flood(new Set(['gate1']));
  for (const [x, y] of [[37, 14], [22, 12], [6, 12], [11, 9]]) assert.equal(mid[idx(x as number, y as number)], 1, `${x},${y} after the gate`);
  assert.equal(mid[idx(11, 5)], 0, 'the forest bend is past the log');
});

test('stage 1.1: every enemy, item, light and npc can be reached once the way is open', () => {
  const open = flood(new Set(['gate1', 'log1']));
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty}`);
  for (const p of props.filter((q) => q.prop === 'lights' || q.prop === 'target')) {
    const reach = rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: Math.ceil((p.w ?? 16) / 16) + 2, h: Math.ceil((p.h ?? 16) / 16) + 2 })
      .some(([x, y]) => open[idx(x, y)] === 1 && grid.solid[idx(x, y)] === 0);
    assert.ok(reach, `${p.id} has open ground next to it`);
  }
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    assert.equal(open[idx(x, y)], 1, `checkpoint ${c.prop}`);
    assert.ok(props.some((p) => p.id === c.prop && p.prop === 'lights'));
  }
  // Nothing is boxed in: every open tile of the map has an open neighbor.
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (grid.solid[idx(x, y)]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !grid.solid[idx(x + dx!, y + dy!)]).length;
    assert.ok(n > 0, `walkable tile ${x},${y} is boxed in`);
  }
});

test('stage 1.1: the bot waypoints are reachable in order', () => {
  const open = new Set<string>();
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y}`);
    if (w.open) open.add(w.open);
  });
  assert.ok(open.has('gate1') && open.has('log1'));
  assert.ok(S.waypoints.some((w) => w.wake === 'ambush1'));
});

// ---------------------------------------------------------------- beats
const BEAT_IDS = ['start', 'tut_attack', 'tut_special', 'tut_swap', 'agents1', 'gate_lucas', 'scare', 'rats2', 'eleven_meet', 'push_gate', 'agents2', 'ambush', 'level_clear'];
const SCRIPT_IDS = ['l1_start', 'l1_tut_attack', 'l1_tut_special', 'l1_tut_swap', 'l1_agents', 'l1_gate_hint', 'l1_gate_open', 'l1_scare', 'l1_eleven_meet', 'l1_eleven_join', 'l1_push_hint', 'l1_log_cleared', 'l1_ambush_start', 'l1_ambush_clear', 'l1_clear'];

test('stage 1.1: every beat has a trigger, a real script id, and something to fire it', () => {
  const ids = S.beats.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, 'beat ids are unique');
  for (const id of BEAT_IDS) assert.ok(ids.includes(id), `beat ${id}`);
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['gate1', 'log1']));
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script), `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(w.rect.tx >= 0 && w.rect.ty >= 0 && w.rect.tx + w.rect.w <= 48 && w.rect.ty + w.rect.h <= 40, `${b.id} rect in the map`);
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
    } else if ('cleared' in w) {
      assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    } else if ('after' in w) {
      assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    } else {
      assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
    }
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  for (const id of SCRIPT_IDS) assert.ok(said.has(id), `${id} is played by some beat`);
  assert.deepEqual(S.beats.find((b) => b.id === 'rats2')!.steps, []);
  assert.deepEqual(S.beats.find((b) => b.id === 'agents2')!.steps, []);
  assert.equal(S.time, 'night', 'Mirkwood is a night stage');
});

// A scripted sim stand-in: it only has to answer the director.
function fakeEnv(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    recruit: (id: string) => { log.push(`recruit ${id}`); },
    party: () => [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim,
    say: (id, done) => { log.push(`say ${id}`); done(); },
    scare: (done) => { log.push('scare'); done(); },
    open: (id) => { log.push(`open ${id}`); },
    jingle: (id) => { log.push(`jingle ${id}`); },
    finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('director: rect beats fire once, chained beats follow, waves chain to the level clear', () => {
  const { env, log } = fakeEnv({ rats1: 4, ambush1: 3, ambush2: 3, ambush3: 3 });
  const d = createDirector(S.beats, S.waves, env);
  d.tick(startTx, startTy);
  d.tick(startTx, startTy);
  assert.deepEqual(log, ['say l1_start']);
  log.length = 0;
  d.tick(18, 33);
  assert.deepEqual(log, ['say l1_tut_attack', 'wake rats1']);
  log.length = 0;
  d.events([{ t: 'groupCleared', group: 'rats1' }]);
  assert.deepEqual(log, ['say l1_tut_special', 'say l1_tut_swap']);
  log.length = 0;
  d.tick(11, 9);
  assert.deepEqual(log, [], 'the push hint waits until Eleven has joined');
  d.tick(6, 11);
  assert.deepEqual(log, ['say l1_eleven_meet', 'recruit eleven', 'jingle recruit', 'say l1_eleven_join']);
  log.length = 0;
  d.tick(11, 9);
  assert.deepEqual(log, ['say l1_push_hint']);
  log.length = 0;
  d.events([{ t: 'propCleared', propId: 'log1' }, { t: 'targetHit', propId: 'target1' }]);
  assert.deepEqual(log, ['say l1_log_cleared', 'open gate1', 'say l1_gate_open']);
  log.length = 0;
  d.tick(37, 14);
  assert.deepEqual(log, ['scare', 'say l1_scare']);
  log.length = 0;
  d.tick(25, 4);
  assert.deepEqual(log, ['say l1_ambush_start', 'wake ambush1']);
  log.length = 0;
  d.events([{ t: 'groupCleared', group: 'ambush1' }]);
  d.events([{ t: 'groupCleared', group: 'ambush2' }]);
  assert.ok(!d.finished());
  d.events([{ t: 'groupCleared', group: 'ambush3' }]);
  assert.deepEqual(log, ['wake ambush2', 'wake ambush3', 'say l1_ambush_clear', 'say l1_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry that skipped the dead still reaches the next wave and the clear', () => {
  const { env, log } = fakeEnv({ rats1: 0, ambush1: 0, ambush2: 2, ambush3: 3 });
  const d = createDirector(S.beats, S.waves, env);
  d.tick(18, 33);
  assert.deepEqual(log, ['say l1_tut_attack', 'say l1_tut_special', 'say l1_tut_swap']);
  log.length = 0;
  d.tick(25, 4);
  assert.deepEqual(log, ['say l1_ambush_start', 'wake ambush2']);
  const snap = d.snapshot();
  assert.ok(snap.fired.includes('ambush') && snap.cleared.includes('ambush1'));
  log.length = 0;
  d.restore({ fired: ['start'], cleared: [] });
  d.tick(25, 4);
  assert.equal(log[0], 'say l1_ambush_start');
});

// ---------------------------------------------------------------- the puzzles, in the real sim
const idle: SimInput = { mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, dashPressed: false, swapDelta: 0, swapTo: -1, burstPressed: false };
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');

function runUntil(sim: Sim, frames: number, input: (f: number) => SimInput, stop: (e: SimEvent) => boolean): SimEvent | null {
  for (let f = 0; f < frames; f++) for (const e of sim.step(input(f))) if (stop(e)) return e;
  return null;
}

test('puzzles: Lucas can hit the lantern across the creek from the south bank, and the gate stops stray shots', () => {
  // Walk north into the fence to face the lantern, then fire. The run has props only, so no patrol interrupts it.
  const shoot = (tx: number): SimEvent | null => {
    const sim = createSim({ ...simOptions(S, grid, { party: [{ id: 'lucas' }], start: { x: tx * 16 + 8, y: 22 * 16 + 12 } }), spawns: propsOnly });
    return runUntil(sim, 90, (f) => (f < 20 ? { ...idle, my: -1 } : f === 20 ? { ...idle, my: -0.2, attackPressed: true } : idle), (e) => e.t === 'targetHit');
  };
  for (const tx of [40, 41]) assert.ok(shoot(tx), `a shot north from tile ${tx} lights the target`);
  assert.equal(shoot(37), null, 'a shot straight north from the gate does not reach the target');
  assert.equal(shoot(33), null, 'nor does one from the west bank');
});

test('puzzles: Eleven pushes the log out of the trail, and nobody else can', () => {
  const clear = (id: 'eleven' | 'mike'): boolean => {
    const sim = createSim({ ...simOptions(S, grid, { party: [{ id }], start: { x: 11 * 16 + 8, y: 9 * 16 + 12 } }), spawns: propsOnly });
    return runUntil(sim, 90, (f) => (f < 20 ? { ...idle, my: -1 } : f === 20 ? { ...idle, my: -0.2, attackPressed: true } : idle), (e) => e.t === 'propCleared') !== null;
  };
  assert.ok(clear('eleven'), 'Push clears log1');
  assert.ok(!clear('mike'), 'a bat does not');
});

// ---------------------------------------------------------------- a whole run
interface Run { done: boolean; allDown: boolean; frames: number; levels: number[]; xp: number; kos: number; said: string[] }

function playStage(seed: number): Run {
  const sim = createSim(simOptions(S, grid, { party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }], seed }));
  const bot = createBot({ grid, waypoints: S.waypoints });
  const said: string[] = [];
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim,
    say: (id, done) => { said.push(id); done(); },
    scare: (done) => done(),
    open: (id) => sim.openProp(id),
    jingle: () => undefined,
    finish: () => undefined,
  });
  let allDown = false, f = 0;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    if (ev.some((e) => e.t === 'allDown')) allDown = true;
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
  }
  const st = sim.stats();
  return { done: dir.finished(), allDown, frames: f, levels: sim.party().map((p) => p.level), xp: st.xpEarned, kos: st.kos, said };
}

test('headless run: the bot walks the whole stage, the beats fire in order, and the lead ends at Lv 3', () => {
  for (const seed of [1, 2, 3, 4]) {
    const r = playStage(seed);
    assert.ok(r.done, `seed ${seed} did not reach the level clear (${r.frames} frames, levels ${r.levels.join(',')})`);
    assert.ok(!r.allDown, `seed ${seed} was wiped`);
    assert.equal(r.levels[0], 3, `the lead ends at Lv 3, got ${r.levels.join(',')}`);
    assert.ok(Math.max(...r.levels) < 4, `nobody reaches Lv 4: ${r.levels.join(',')}`);
    assert.ok(r.xp <= 144 && r.xp >= 130, `xp ${r.xp}`);
    assert.ok(r.frames < 20000, `seed ${seed} took ${r.frames} frames`);
    const order = SCRIPT_IDS.filter((id) => r.said.includes(id));
    assert.deepEqual(r.said.filter((id) => order.includes(id)).slice(0, 4), ['l1_start', 'l1_tut_attack', 'l1_tut_special', 'l1_tut_swap']);
    assert.equal(r.said.at(-1), 'l1_clear');
    assert.ok(r.said.includes('l1_eleven_join') && r.said.includes('l1_log_cleared') && r.said.includes('l1_ambush_start'));
    assert.ok(r.said.indexOf('l1_eleven_join') < r.said.indexOf('l1_push_hint'), 'Eleven joins before the push hint');
  }
});
