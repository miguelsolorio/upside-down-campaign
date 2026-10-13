import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import type { BotWaypoint } from '../src/combat/bot.ts';
import { buildGrid } from '../src/core/tiles.ts';
import type { Difficulty, SimSpawn } from '../src/core/types.ts';

// A Level-1-shaped course: 48 by 40 tiles. Yard in the south-west, trail, a creek with a ford, a fence gate,
// the dump clearing, a shed where Eleven joins, a forest bend with a log, and the Lab road with three ambush waves.
const W = 48, H = 40;
const cells: string[][] = [];
for (let y = 0; y < H; y++) { cells.push(new Array(W).fill('T')); }
const carve = (x0: number, y0: number, x1: number, y1: number, c = '.'): void => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y]![x] = c; };
// regions
carve(2, 30, 10, 37);            // yard
carve(11, 33, 19, 35, '-');      // trail east
carve(17, 25, 19, 35, '-');      // trail north to the creek
carve(17, 22, 30, 24, '-');      // trail to creek crossing
carve(20, 20, 22, 28, '~');      // creek
carve(20, 24, 22, 25, 'w');      // ford
carve(23, 24, 24, 25, '-');
carve(25, 12, 38, 26);           // dump clearing
carve(38, 14, 41, 16, '-');      // path to shed
carve(40, 9, 46, 14);            // shed area
carve(42, 5, 44, 9, '-');        // forest bend north
carve(30, 2, 45, 6, '=');        // lab road
carve(24, 2, 30, 4, '-');
// scatter some bushes in clearings
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = cells[y]![x]; if ((c === '.' || c === '-') && ((x * 7 + y * 13) % 29 === 0)) cells[y]![x] = 'b'; }
// the fence line at x = 24 with the doorway at y = 24..25 (gate), keep both rows free of bushes
const rows = cells.map((r) => r.join(''));
const grid = buildGrid(rows);

const spawns: SimSpawn[] = [
  { kind: 'prop', id: 'gate1', prop: 'gate', tx: 24, ty: 24, h: 32 },
  { kind: 'prop', id: 'log1', prop: 'log', tx: 43, ty: 8, w: 48 },
  { kind: 'prop', id: 'target1', prop: 'target', tx: 21, ty: 22 },
  { kind: 'npc', id: 'eleven', tx: 43, ty: 12, dir: 'left' },
];
const rats1 = [[14, 34], [15, 33], [14, 35], [16, 34]];
rats1.forEach(([x, y], i) => spawns.push({ kind: 'enemy', id: `r1_${i}`, type: 'rat', tx: x!, ty: y!, group: 'rats1', dormant: true }));
[[18, 28, 18, 24], [19, 23, 29, 23]].forEach(([x, y, bx, by], i) => spawns.push({ kind: 'enemy', id: `a1_${i}`, type: 'agent', tx: x!, ty: y!, group: 'agents1', patrol: [{ tx: x!, ty: y! }, { tx: bx!, ty: by! }] }));
[[28, 14], [34, 18], [30, 22], [36, 24]].forEach(([x, y], i) => spawns.push({ kind: 'enemy', id: `r2_${i}`, type: 'rat', tx: x!, ty: y!, group: 'rats2' }));
[[34, 20, 38, 20], [28, 18, 28, 24], [37, 14, 37, 17]].forEach(([x, y, bx, by], i) => spawns.push({ kind: 'enemy', id: `a2_${i}`, type: 'agent', tx: x!, ty: y!, group: 'agents2', patrol: [{ tx: x!, ty: y! }, { tx: bx!, ty: by! }] }));
for (let w = 1; w <= 3; w++) for (let i = 0; i < 3; i++) spawns.push({ kind: 'enemy', id: `am${w}_${i}`, type: 'agent', tx: 36 + w * 2 + (i % 2), ty: 3 + i, group: `ambush${w}`, dormant: true });
for (const [x, y] of [[15, 34], [22, 36], [30, 15], [40, 12]]) spawns.push({ kind: 'item', id: `eg${x}`, item: 'eggo', tx: x!, ty: y! });
for (let i = 0; i < 12; i++) spawns.push({ kind: 'item', id: `q${i}`, item: 'quarter', tx: 5 + i * 3, ty: 31 + (i % 3) });

const T = (t: number): number => t * 16 + 8, F = (t: number): number => t * 16 + 12;
const waypoints: BotWaypoint[] = [
  { x: T(8), y: F(33) }, { x: T(14), y: F(34), wake: 'rats1' }, { x: T(18), y: F(30) }, { x: T(18), y: F(23) }, { x: T(21), y: F(24) },
  { x: T(23), y: F(24), open: 'gate1' }, { x: T(26), y: F(24) }, { x: T(32), y: F(18) }, { x: T(39), y: F(15) }, { x: T(43), y: F(12) },
  { x: T(43), y: F(10), open: 'log1' }, { x: T(43), y: F(6) }, { x: T(36), y: F(4), wake: 'ambush1' }, { x: T(40), y: F(4) }, { x: T(44), y: F(4) },
];


interface CourseRun { done: boolean; allDown: boolean; frames: number; levels: number[]; kills: number; kos: number; xp: number }

function playCourse(seed: number, difficulty: Difficulty = 'chief'): CourseRun {
  const sim = createSim({ grid, party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }], start: { x: T(4), y: F(33) }, spawns, seed, difficulty });
  const bot = createBot({ grid, waypoints });
  let f = 0, recruited = false, wave = 1, allDown = false;
  for (; f < 30000 && !bot.done() && !allDown; f++) {
    for (const e of sim.step(bot.next(sim))) {
      // World wakes each ambush wave when the previous one is cleared.
      if (e.t === 'groupCleared' && e.group.startsWith('ambush') && wave < 3) { wave++; sim.spawnGroup(`ambush${wave}`); }
      if (e.t === 'allDown') allDown = true;
    }
    // Eleven joins at the shed.
    if (!recruited && sim.heroPos().x > T(41) && sim.heroPos().y < F(15)) { sim.recruit('eleven'); recruited = true; }
  }
  const st = sim.stats();
  return { done: bot.done(), allDown, frames: f, levels: sim.party().map((p) => p.level), kills: st.kills, kos: st.kos, xp: st.xpEarned };
}

test('course: the course has the right enemy budget (8 rats, 14 agents, 144 XP)', () => {
  const rats = spawns.filter((s) => s.kind === 'enemy' && s.type === 'rat').length;
  const agents = spawns.filter((s) => s.kind === 'enemy' && s.type === 'agent').length;
  assert.deepEqual([rats, agents], [8, 14]);
});

test('course: the bot walks it end to end, opens the gate and the log, wakes the waves, and nobody drops', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const r = playCourse(seed);
    assert.ok(r.done, `seed ${seed} did not finish (${r.frames} frames)`);
    assert.ok(!r.allDown, `seed ${seed} was wiped`);
    assert.equal(r.kos, 0);
    assert.ok(r.frames < 12000, `seed ${seed} took ${r.frames} frames`);
    assert.equal(r.levels[0], 3, `the lead ends at Lv 3, got ${r.levels.join(',')}`);
    assert.ok(Math.max(...r.levels) < 4);
    assert.ok(r.xp <= 144);
  }
});

test('course: kid and upside play it too', () => {
  for (const difficulty of ['kid', 'upside'] as const) {
    let ok = 0;
    for (let seed = 1; seed <= 5; seed++) if (playCourse(seed, difficulty).done) ok++;
    assert.ok(ok >= 4, `${difficulty}: ${ok}/5`);
  }
});
