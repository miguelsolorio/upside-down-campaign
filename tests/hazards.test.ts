// Floor hazards in the real sim: the cycle and its warning, the sound, the damage (flat, scaled by difficulty), the throw,
// the invulnerability, and who ignores them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hazardAt, HAZARD_WARN } from '../src/combat/hazards.ts';
import { createBot } from '../src/combat/bot.ts';
import { createSim } from '../src/combat/index.ts';
import { agent, arena, idle, inp, makeWhite, ofType, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { HazardDef, HazardView, SimEvent } from '../src/core/types.ts';

const panel = (over: Partial<HazardDef> = {}): HazardDef =>
  ({ id: 'z1', kind: 'electric', tx: 10, ty: 6, w: 3, h: 2, period: 150, on: 36, phase: 40, dmg: 14, ...over });
/** Mike in the middle of the panel, on the tile row 6. */
const inside = { x: tc(11), y: tf(6) };

function hazardRig(h: HazardDef, over: Parameters<typeof makeWhite>[0] = {}) {
  return makeWhite({ party: [{ id: 'mike', level: 3 }], start: inside, hazards: [h], ...over });
}

/** What the hazard clock says at hazard time k, written out again here on purpose. */
function expected(h: HazardDef, k: number): { state: string; t: number } {
  const pos = (((k - (h.phase ?? 0)) % h.period) + h.period) % h.period;
  if (pos < h.on) return { state: 'on', t: pos };
  if (pos >= h.period - HAZARD_WARN) return { state: 'warn', t: pos - (h.period - HAZARD_WARN) };
  return { state: 'off', t: pos - h.on };
}

test('hazard cycle: off, a 24 frame warning, then on for `on` frames, every `period`, offset by `phase`', () => {
  const h = panel({ phase: 40 });
  const { sim } = hazardRig(h, { start: { x: tc(3), y: tf(3) } });
  assert.equal(sim.view().hazards[0]?.state, 'off', 'before the first step it is off');
  const seen: HazardView[] = [];
  for (let k = 1; k <= 460; k++) {
    sim.step(idle());
    const v = sim.view().hazards[0] as HazardView;
    seen.push(v);
    const want = expected(h, k);
    assert.deepEqual([v.state, v.t], [want.state, want.t], `hazard frame ${k}`);
  }
  const runs = (state: string): number[] => {
    const out: number[] = [];
    let n = 0;
    for (const v of seen) {
      if (v.state === state) n++; else if (n > 0) { out.push(n); n = 0; }
    }
    return out;
  };
  assert.deepEqual(runs('warn'), [24, 24, 24].slice(0, runs('warn').length), 'every warning is 24 frames');
  assert.deepEqual(runs('on').slice(0, 2), [36, 36], 'on for 36 frames');
  const firstOn = seen.findIndex((v) => v.state === 'on') + 1;
  assert.equal(firstOn, 40, 'first on at the phase');
  assert.equal(seen[firstOn - 26]?.state, 'off');
  assert.equal(seen[firstOn - 25]?.state, 'warn', 'the warning starts 24 frames before');
  const starts = seen.map((v, i) => (v.state === 'on' && seen[i - 1]?.state !== 'on' ? i + 1 : -1)).filter((i) => i > 0);
  assert.deepEqual(starts, [40, 190, 340, 490].slice(0, starts.length), 'and repeats every period');
  assert.ok(starts.length >= 3);
});

test('hazard view: the rectangle in px, the kind and the id, and a stage without hazards reports none', () => {
  const { sim } = hazardRig(panel({ id: 'p9', kind: 'steam', tx: 4, ty: 5, w: 2, h: 3 }), { start: { x: tc(3), y: tf(3) } });
  const v = sim.view().hazards[0] as HazardView;
  assert.deepEqual([v.id, v.kind, v.x, v.y, v.w, v.h], ['p9', 'steam', 64, 80, 32, 48]);
  assert.deepEqual(makeWhite().sim.view().hazards, []);
});

test('hazardAt: a phase past the period, and a cycle with no room for the whole warning, still make sense', () => {
  const h = panel({ period: 100, on: 30, phase: 130 });
  assert.equal(hazardAt(h, 30).state, 'on');
  assert.equal(hazardAt(h, 29).state, 'warn');
  assert.equal(hazardAt(h, 60).state, 'off');
  const tight = panel({ period: 40, on: 30, phase: 0 });
  assert.deepEqual([hazardAt(tight, 29).state, hazardAt(tight, 30).state, hazardAt(tight, 39).state], ['on', 'warn', 'warn']);
});

test('hazard sound: zap for an electric panel and steam for a vent, once, when it goes on, and only when you could hear it', () => {
  for (const [kind, sound] of [['electric', 'zap'], ['steam', 'steam']] as const) {
    const near = hazardRig(panel({ kind, on: 36 }), { start: { x: tc(14), y: tf(8) } });
    const all: SimEvent[][] = [];
    for (let k = 1; k <= 160; k++) all.push(near.sim.step(idle()));
    const at = all.map((ev, i) => (sfxIds(ev).includes(sound) ? i + 1 : -1)).filter((i) => i > 0);
    assert.deepEqual(at, [40], `${sound} plays on the frame it turns on`);
    const far = hazardRig(panel({ kind }), { grid: arena(80, 16), start: { x: tc(70), y: tf(8) } });
    const heard = run(far.sim, 160).filter((e) => e.t === 'sfx');
    assert.equal(heard.length, 0, 'a vent far across the level is silent');
  }
});

test('hazard damage: a hero standing in it when it goes on takes dmg, flat: not reduced by DEF', () => {
  for (const id of ['mike', 'eleven'] as const) {
    const r = makeWhite({ party: [{ id, level: 3 }], start: inside, hazards: [panel()] });
    const ev = run(r.sim, 45);
    const hits = ofType(ev, 'hit').filter((h) => !h.onEnemy);
    assert.equal(hits.length, 1, `${id} is hit once`);
    assert.equal(hits[0]?.dmg, 14, `${id} takes exactly 14`);
    assert.ok(sfxIds(ev).includes('hurt'));
    assert.equal(r.s.stats.damageTaken, 14);
  }
});

test('hazard damage: difficulty scales it, kid by 0.7 and upside by 1.4', () => {
  const dmgAt = (difficulty: 'kid' | 'chief' | 'upside', dmg: number): number => {
    const r = makeWhite({ party: [{ id: 'mike', level: 3 }], start: inside, hazards: [panel({ dmg })], difficulty });
    return ofType(run(r.sim, 45), 'hit').filter((h) => !h.onEnemy)[0]?.dmg ?? 0;
  };
  assert.deepEqual([dmgAt('kid', 14), dmgAt('chief', 14), dmgAt('upside', 14)], [10, 14, 20]);
  assert.deepEqual([dmgAt('kid', 9), dmgAt('chief', 9), dmgAt('upside', 9)], [6, 9, 13]);
});

test('hazard damage: the DM screen does not soften it, and a warning or an off hazard does nothing', () => {
  const r = hazardRig(panel());
  r.s.shield = { x: r.s.heroes[0]!.x, y: r.s.heroes[0]!.y - 7, angle: 0, half: 30, age: 0, life: 9999 };
  const before = ofType(run(r.sim, 39), 'hit').filter((h) => !h.onEnemy);
  assert.equal(before.length, 0, 'nothing while it is off or warning, even standing in it');
  const hit = ofType(run(r.sim, 3), 'hit').filter((h) => !h.onEnemy);
  assert.equal(hit[0]?.dmg, 14);
});

test('hazard damage: the hero is thrown away from the center and gets 45 frames of invulnerability', () => {
  const h = panel({ tx: 10, ty: 4, w: 4, h: 4, on: 60, period: 200, phase: 10 });
  // Left of the center of a 4 by 4 panel.
  const r = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: 10 * 16 + 14, y: 6 * 16 + 12 }, hazards: [h] });
  const hero = r.s.heroes[0]!;
  const x0 = hero.x;
  const hitFrames: number[] = [];
  for (let f = 1; f <= 80; f++) {
    const ev = r.sim.step(idle());
    if (ofType(ev, 'hit').some((x) => !x.onEnemy)) {
      hitFrames.push(f);
      if (hitFrames.length === 1) {
        assert.equal(hero.invuln, 45, 'the usual 45 frames');
        assert.equal(hero.blink, true);
      }
    }
  }
  assert.ok(hero.x < x0 - 8, `thrown left, from ${x0} to ${hero.x.toFixed(1)}`);
  assert.equal(hitFrames[0], 10);
  assert.ok(hitFrames.length <= 2);
  if (hitFrames.length === 2) assert.ok((hitFrames[1] ?? 0) - (hitFrames[0] ?? 0) >= 45, 'never closer than the invulnerability');
});

test('hazard damage: a hero in a two tile lane is thrown across the lane and clear of it', () => {
  const lane = panel({ tx: 6, ty: 6, w: 8, h: 2, phase: 5, on: 36 });
  for (const dy of [-6, 6]) {
    const r = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(10), y: 7 * 16 + 4 + dy }, hazards: [lane] });
    const hero = r.s.heroes[0]!;
    const x0 = hero.x;
    run(r.sim, 30);
    assert.ok(Math.abs(hero.x - x0) < 4, 'thrown across the lane, not along it');
    const cy = hero.y - 4;
    assert.ok(cy < 96 || cy >= 128, `clear of the lane at y ${cy.toFixed(1)}`);
    assert.equal(dy < 0 ? cy < 96 : cy >= 128, true, 'on the side it was nearest to');
  }
});

test('hazard damage: a hero who steps in after it is on is hit then, and one who crosses between bursts is not', () => {
  const lane = panel({ tx: 8, ty: 4, w: 2, h: 8, phase: 100, on: 36, period: 150 });
  const careful = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(5), y: tf(8) }, hazards: [lane] });
  // Hazard time 0 to 75 is clear (the burst is at 100). Walk across in 30 frames.
  let hurt = 0;
  for (let f = 0; f < 100; f++) hurt += ofType(careful.sim.step(inp({ mx: 1 })), 'hit').filter((x) => !x.onEnemy).length;
  assert.ok(careful.sim.heroPos().x > tc(10), 'crossed');
  assert.equal(hurt, 0);
  const late = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(7), y: tf(8) }, hazards: [lane] });
  run(late.sim, 95);
  let caught = 0;
  for (let f = 0; f < 40; f++) caught += ofType(late.sim.step(inp({ mx: 1 })), 'hit').filter((x) => !x.onEnemy).length;
  assert.equal(caught >= 1, true, 'walking in as it fires hurts');
});

test('hazards hurt only the active hero: not a KO, not god mode, not the bench', () => {
  const r = makeWhite({ party: [{ id: 'mike', level: 3 }, { id: 'dustin', level: 3 }], start: inside, hazards: [panel()] });
  r.s.heroes[1]!.x = tc(11); r.s.heroes[1]!.y = tf(6);
  const bench = r.s.heroes[1]!.hp;
  r.s.god = true;
  run(r.sim, 50);
  assert.equal(r.s.heroes[0]!.hp, r.s.heroes[0]!.st.hp, 'god mode');
  assert.equal(r.s.heroes[1]!.hp, bench, 'the bench follows the active hero and is not hurt');
});

test('hazards: enemies walk through them untouched', () => {
  const r = makeWhite({
    party: [{ id: 'mike', level: 3 }], start: { x: tc(3), y: tf(3) }, hazards: [panel({ phase: 5 })],
    spawns: [rat('r', 11, 6), agent('a', 10, 6)],
  });
  for (const e of r.s.enemies) { e.aware = false; e.cd = 9999; }
  const hp = r.s.enemies.map((e) => e.hp);
  run(r.sim, 20);
  assert.equal(r.sim.view().hazards[0]?.state, 'on');
  assert.deepEqual(r.s.enemies.map((e) => e.hp), hp);
});

test('hazards: the bot ignores them and walks the straight route', () => {
  const h = panel({ tx: 12, ty: 1, w: 2, h: 14, period: 60, on: 60, phase: 0 });
  const grid = arena(24, 16);
  const sim = createSim({ grid, party: [{ id: 'mike', level: 3 }], start: { x: tc(4), y: tf(8) }, spawns: [], hazards: [h], seed: 3 });
  const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(8) }] });
  let f = 0;
  for (; f < 600 && !bot.done(); f++) sim.step(bot.next(sim));
  assert.ok(bot.done(), 'reached the far side');
  assert.ok(f < 500, `took ${f} frames`);
  assert.ok(sim.stats().damageTaken > 0, 'and paid for it');
});
