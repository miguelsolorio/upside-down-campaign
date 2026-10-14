// Random play against everything the hard Lab added: guards, a Warden, elites, hazards, cameras and solid furniture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { buildGrid } from '../src/core/tiles.ts';
import { footBlocked } from '../src/combat/space.ts';
import { buildSim } from '../src/combat/sim.ts';
import { tc, tf } from './sim-helpers.ts';
import type { HazardDef, SimInput, SimSpawn } from '../src/core/types.ts';

function level(): ReturnType<typeof buildGrid> {
  const rows: string[] = [];
  for (let y = 0; y < 22; y++) {
    let row = '';
    for (let x = 0; x < 40; x++) {
      let c = '.';
      if (x === 0 || y === 0 || x === 39 || y === 21) c = 'T';
      else if (x === 20 && y !== 11 && y !== 12) c = 'T';
      row += c;
    }
    rows.push(row);
  }
  return buildGrid(rows);
}

function randomInput(rng: () => number, prev: SimInput): SimInput {
  const hold = rng() < 0.8;
  const pick = (): number => (rng() < 0.5 ? 0 : rng() < 0.5 ? -1 : 1);
  return {
    mx: hold ? prev.mx : pick(), my: hold ? prev.my : pick(),
    attackHeld: rng() < 0.5, attackPressed: rng() < 0.2,
    specialPressed: rng() < 0.08, specialHeld: false,
    swapDelta: rng() < 0.02 ? (rng() < 0.5 ? -1 : 1) : 0,
    swapTo: rng() < 0.02 ? Math.floor(rng() * 5) - 1 : -1,
    burstPressed: rng() < 0.05,
  };
}

const HAZARDS: HazardDef[] = [
  { id: 'z1', kind: 'electric', tx: 10, ty: 8, w: 2, h: 6, period: 150, on: 36, phase: 20, dmg: 14 },
  { id: 'z2', kind: 'steam', tx: 26, ty: 9, w: 3, h: 3, period: 200, on: 60, dmg: 9 },
];

const SPAWNS: SimSpawn[] = [
  { kind: 'enemy', id: 'g1', type: 'guard', tx: 12, ty: 6, group: 'guards', patrol: [{ tx: 12, ty: 6 }, { tx: 16, ty: 14 }] },
  { kind: 'enemy', id: 'g2', type: 'guard', tx: 24, ty: 11, group: 'guards', tier: 'elite' },
  { kind: 'enemy', id: 'e1', type: 'agent', tx: 28, ty: 6, group: 'agents', tier: 'elite', patrol: [{ tx: 28, ty: 6 }, { tx: 32, ty: 6 }] },
  { kind: 'enemy', id: 'r1', type: 'rat', tx: 15, ty: 12, group: 'rats', tier: 'elite' },
  { kind: 'enemy', id: 'w1', type: 'warden', tx: 33, ty: 11, group: 'boss', dormant: true },
  { kind: 'enemy', id: 'a1', type: 'agent', tx: 34, ty: 14, group: 'boss', dormant: true },
  { kind: 'prop', id: 'cam1', prop: 'camera', tx: 8, ty: 1, hitBy: 'shoot', cam: { from: 40, to: 140, period: 200, range: 130, half: 30 } },
  { kind: 'prop', id: 'cam2', prop: 'camera', tx: 30, ty: 1, hitBy: 'shoot', cam: { from: 60, to: 120, period: 160, range: 110, half: 20 } },
  { kind: 'prop', id: 'tank1', prop: 'tank', tx: 6, ty: 10 },
  { kind: 'prop', id: 'rack1', prop: 'rack', tx: 18, ty: 4 },
  { kind: 'prop', id: 'gen1', prop: 'generator', tx: 22, ty: 16, w: 32, h: 16 },
  { kind: 'item', id: 'i1', item: 'eggo', tx: 8, ty: 11 },
];

test('fuzz: the hard Lab never breaks an invariant, on any difficulty', () => {
  const seen = { spotted: 0, zap: 0, steam: 0, block: 0, bash: 0, slam: 0 };
  for (const difficulty of ['kid', 'chief', 'upside'] as const) {
    for (let seed = 1; seed <= 5; seed++) {
      const { sim, s } = buildSim({
        grid: level(), party: [{ id: 'mike', level: 3 }, { id: 'dustin', level: 3 }, { id: 'lucas', level: 3 }, { id: 'eleven', level: 3 }],
        start: { x: tc(3), y: tf(11) }, spawns: SPAWNS, hazards: HAZARDS, difficulty, seed,
      });
      const rng = createRng(seed * 104729);
      let input: SimInput = randomInput(rng, { mx: 0, my: 0 } as SimInput);
      for (let f = 0; f < 2600; f++) {
        if (f % 5 === 0) input = randomInput(rng, input);
        if (f === 900) sim.spawnGroup('boss');
        if (f === 1800) sim.healParty(0.5);
        const ev = sim.step(input);
        for (const e of ev) {
          if (e.t === 'hit') assert.ok(Number.isFinite(e.dmg) && e.dmg >= 1, `bad damage ${e.dmg}`);
          if (e.t === 'spotted') { seen.spotted++; assert.ok(s.props.some((p) => p.id === e.propId && p.kind === 'camera')); }
          if (e.t === 'sfx' && e.id in seen) seen[e.id as 'zap']++;
        }
        const v = sim.view();
        for (const a of v.actors) {
          assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), `bad actor ${a.id} ${a.x},${a.y}`);
          if (a.kind === 'enemy' && (a.id === 'guard' || a.id === 'warden')) assert.equal(typeof a.guarding, 'boolean');
          else assert.equal(a.guarding, undefined);
          if (a.bar) assert.ok(a.bar.hp >= 0 && a.bar.hp <= a.bar.hpMax);
        }
        for (const h of s.heroes) assert.ok(Number.isFinite(h.hp) && h.hp >= 0 && h.hp <= h.st.hp + 1e-6, `hp ${h.hp}/${h.st.hp}`);
        const act = s.heroes[s.active]!;
        if (!act.ko) assert.ok(!footBlocked(s, act.x, act.y) || f < 5, `hero stuck in a wall at ${act.x},${act.y} frame ${f}`);
        for (const hz of v.hazards) {
          assert.ok(['off', 'warn', 'on'].includes(hz.state) && hz.t >= 0 && Number.isFinite(hz.t));
        }
        for (const p of v.props) {
          if (p.cam) {
            assert.ok(Number.isFinite(p.cam.angle) && p.cam.range > 0 && p.cam.half > 0);
            assert.equal(p.cam.live, p.state !== 'lit');
          }
        }
        if (v.hud.boss) {
          assert.equal(v.hud.boss.name, 'WARDEN');
          assert.ok(v.hud.boss.hp >= 0 && v.hud.boss.hp <= v.hud.boss.hpMax);
        }
        const rings = v.fx.filter((x) => x.kind === 'ring' && x.life === 45).length;
        assert.ok(rings <= 1, `${rings} slam telegraphs at once`);
        for (const e of s.enemies) {
          if (e.dead) continue;
          assert.ok(e.broken >= 0 && e.grace >= 0 && e.hp <= e.hpMax + 1e-6);
          assert.ok(!e.slam || e.kind === 'warden');
        }
        if (s.over) break;
      }
    }
  }
  // The run is rich enough to have touched every new system.
  for (const [what, n] of Object.entries(seen)) assert.ok(n > 0, `${what} never happened`);
});
