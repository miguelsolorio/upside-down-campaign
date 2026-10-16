// The bot against the Mind Flayer (src/combat/bot_flayer.ts, bot.ts), in a walled court built in tests/flayer-helpers.ts (22 by 14 tiles, a row of
// stalls along the north wall), with the party a real run brings to 3.3 (Mike, Dustin, Robin and Eleven). It beats it on chief with no flag,
// steps off a warned line and out of a warned band and a pool, hits the nearest leg that is not warning, and goes for the head when it is down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBot } from '../src/combat/bot.ts';
import { createFlayerSense } from '../src/combat/bot_flayer.ts';
import { addPool } from '../src/combat/pools.ts';
import { startLine } from '../src/enemies/flayer_legs.ts';
import { STYLE } from '../src/combat/bot_style.ts';
import type { Sim, SimEvent } from '../src/core/types.ts';
import type { Enemy } from '../src/combat/state.ts';
import { ofType, tc, tf } from './sim-helpers.ts';
import type { FRig } from './flayer-helpers.ts';
import { FLAYER, FX, LEG, LX, at, court, cutAll, fRig, hold, legView, ls, until } from './flayer-helpers.ts';

const grid = court();
const bot = (careless = false) => createBot({ grid, waypoints: [{ x: tc(11), y: tf(10) }], careless });
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** The bot fights the rig until the Mind Flayer is dead, the party is down or `max` frames pass. The sim it is handed notes any flag it sets. */
function fight(r: FRig, max = 14400) {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const b = bot();
  const ev: SimEvent[] = [];
  let won = false, down = false, f = 0, downs = 0, wasDown = false, inPool = 0;
  for (; f < max; f++) {
    const out = r.sim.step(b.next(spied));
    ev.push(...out);
    if (out.some((e) => e.t === 'allDown')) down = true;
    if (out.some((e) => e.t === 'kill' && e.kind === 'flayer')) won = true;
    const isDown = r.f.move === 'down';
    if (isDown && !wasDown) downs++;
    wasDown = isDown;
    const h = r.s.heroes[r.s.active] as { x: number; y: number };
    if (r.s.pools.some((p) => Math.hypot(p.x - h.x, p.y - h.y) < 20)) inPool++;
    if (down || won) break;
  }
  return { won, down, frames: f, calls, downs, inPool, ev, taken: r.sim.stats().damageTaken };
}

test('bot: it beats the Mind Flayer on chief in at least 8 of 10 seeds, with no flag, in a sane time', (t) => {
  const fights = seeds(10).map((seed) => fight(fRig({ seed }, false, false)));
  for (const f of fights) assert.deepEqual(f.calls, [], 'with no flags from the bot');
  const wins = fights.filter((f) => f.won);
  assert.ok(wins.length >= 8, `${wins.length}/10`);
  for (const f of wins) {
    const kills = ofType(f.ev, 'kill').filter((k) => k.kind === 'flayer' || k.kind === 'flayerleg');
    assert.equal(kills.length, 5, 'the body and its four legs');
    assert.ok(ofType(f.ev, 'sfx').filter((e) => e.id === 'sever').length >= 4, 'it cut the legs');
    assert.ok(f.downs >= 1, 'and brought the head down');
    assert.equal(ofType(f.ev, 'groupCleared').filter((g) => g.group === 'flayer').length, 1);
  }
  const avg = wins.reduce((n, f) => n + f.frames, 0) / wins.length / 60;
  t.diagnostic(`${wins.length}/10 won, an average of ${avg.toFixed(0)} s, ${(wins.reduce((n, f) => n + f.taken, 0) / wins.length).toFixed(0)} damage taken`);
  // Not an instant win (the rise, four legs to cut and a head to bring down take well over ten seconds) and not a slog.
  assert.ok(avg >= 10 && avg <= 150, `an average of ${avg.toFixed(0)} s`);
});

test('bot: it stays out of the pools: under a tenth of the fight is spent in one', () => {
  const fights = seeds(5).map((seed) => fight(fRig({ seed }, false, false)));
  const share = fights.reduce((n, f) => n + f.inPool, 0) / fights.reduce((n, f) => n + f.frames, 0);
  assert.ok(share < 0.1, `${(share * 100).toFixed(1)} percent`);
});

// ------------------------------------------------------------------ dodging

/** Runs `frames` ticks of the bot, or of nothing, and counts the hits the party takes. */
function takenIn(r: FRig, frames: number, withBot: boolean): number {
  const b = bot();
  let n = 0;
  for (let f = 0; f < frames; f++) {
    const ev = r.sim.step(withBot ? b.next(r.sim) : { mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, swapDelta: 0, swapTo: -1, burstPressed: false });
    n += hurt(ev).length;
  }
  return n;
}

test('bot: it steps off a warned line, where a hero who stands still is hit', () => {
  const hitBy = (withBot: boolean): number => seeds(10).filter((seed) => {
    const r = fRig({ seed, god: false });
    at(r, tc(11), tf(10));
    startLine(r.s, r.legs[0] as Enemy, r.hero, LX.warn);
    return takenIn(r, LX.warn + LX.slamT + 4, withBot) > 0;
  }).length;
  assert.equal(hitBy(false), 10, 'a hero who stands there is hit every time');
  assert.ok(hitBy(true) <= 1, 'the bot is hit in at most one of ten');
});

test('bot: it steps out of a warned sweep band, where a hero who stands still is hit', () => {
  const hitBy = (withBot: boolean): number => seeds(10).filter((seed) => {
    const r = fRig({ seed, god: false });
    r.f.phase2 = true;
    at(r, tc(11), tf(10));
    r.f.sweepCd = 0;
    return takenIn(r, LX.sweepWarn + LX.slamT + 6, withBot) > 0;
  }).length;
  assert.equal(hitBy(false), 10);
  assert.ok(hitBy(true) <= 1);
});

test('bot: standing in a pool it walks out of it', () => {
  const r = fRig({ god: false });
  addPool(r.s, r.hero.x, r.hero.y);
  const b = bot();
  for (let f = 0; f < 120; f++) r.sim.step(b.next(r.sim));
  const [p] = r.sim.view().pools;
  assert.ok(Math.hypot(r.hero.x - (p?.x ?? 0), r.hero.y - (p?.y ?? 0)) > 20, 'clear of it');
});

// ------------------------------------------------------------------ the target

/** The plan, from a hero at (hx, hy) on a view the test has dressed, with open floor all round. */
function planFor(r: FRig, hx: number, hy: number, dress: (v: ReturnType<Sim['view']>) => void) {
  const v = r.sim.view();
  dress(v);
  const sense = createFlayerSense({ walkable: () => true, walkTo: (ax, ay, gx, gy) => { const d = Math.hypot(gx - ax, gy - ay) || 1; return [(gx - ax) / d, (gy - ay) / d]; }, careless: false });
  return sense.plan(v, hx, hy, STYLE.mike);
}

const toward = (mv: [number, number], from: { x: number; y: number }, to: { x: number; y: number }): number => {
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return (mv[0] * (to.x - from.x) + mv[1] * (to.y - from.y)) / d;
};

test('bot: it goes for the nearest leg that is not warning', () => {
  const r = fRig();
  const hero = { x: 110, y: 135 };
  const tip1 = { x: tc(6), y: tf(2) + 56 }, tip2 = { x: tc(9), y: tf(2) + 56 };
  const open = planFor(r, hero.x, hero.y, () => undefined);
  assert.ok(open && toward(open.mv, hero, tip1) > 0.5, 'the nearest tip is the first leg\'s');
  const warned = planFor(r, hero.x, hero.y, (v) => {
    const first = v.actors.find((a) => a.id === 'flayerleg' && Math.abs(a.x - tc(6)) < 1);
    if (first) first.pose = 'warn';
  });
  assert.ok(warned && toward(warned.mv, hero, tip2) > 0.5, 'with it warning, the second leg\'s');
  assert.ok(warned && toward(warned.mv, hero, tip1) < toward(warned.mv, hero, tip2));
});

test('bot: with every leg cut or warning there is nothing to hit, and with the head down it goes for the head', () => {
  const r = fRig();
  const none = planFor(r, 110, 135, (v) => { for (const a of v.actors) if (a.id === 'flayerleg') a.pose = 'severed'; });
  assert.equal(none, null);
  const down = planFor(r, 184, 150, (v) => {
    for (const a of v.actors) { if (a.id === 'flayerleg') a.pose = 'severed'; if (a.id === 'flayer') a.pose = 'down'; }
  });
  assert.ok(down && down.mv[1] < -0.5, 'north, to the head in the stalls');
  const rising = planFor(r, 184, 150, (v) => { for (const a of v.actors) if (a.id === 'flayer') a.pose = 'rise'; });
  assert.equal(rising, null, 'and nothing while it rises');
});

test('bot: with the head down it walks to it and takes it down by more than a tenth of its HP', () => {
  const gone = seeds(4).map((seed) => {
    const r = fRig({ seed });
    cutAll(r);
    until(r, () => r.f.move === 'down');
    hold(r);
    const hp = r.body.hp;
    const b = bot();
    let nearest = 999;
    for (let f = 0; f < FX.downT - 20 && r.f.move === 'down'; f++) {
      r.sim.step(b.next(r.sim));
      nearest = Math.min(nearest, Math.hypot(r.hero.x - r.body.x, r.hero.y - r.body.y));
    }
    return { dealt: hp - r.body.hp, nearest };
  });
  for (const g of gone) assert.ok(g.dealt > FLAYER.hp / 10 && g.nearest < 60, `dealt ${g.dealt.toFixed(0)}, closest ${g.nearest.toFixed(0)}`);
});

test('bot: it hits a leg that is not warning: the legs\' HP fall while the scheduler is held', () => {
  const r = fRig({ seed: 2 });
  const b = bot();
  const total = () => r.legs.reduce((n, l) => n + l.hp, 0);
  const before = total();
  for (let f = 0; f < 600; f++) r.sim.step(b.next(r.sim));
  assert.ok(total() < before - LEG.hp, `${before} to ${total()}`);
  assert.ok(r.legs.some((l) => ls(l).move === 'severed'));
  assert.equal(legView(r, 1) !== undefined, true);
});

test('bot: it reads only the view: bot_flayer.ts imports no sim state', () => {
  const src = readFileSync(new URL('../src/combat/bot_flayer.ts', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  assert.ok(imports.every((i) => /core\/types|enemies\/defs|heroes\/defs|bot_boss|bot_billy/.test(i as string)), imports.join(', '));
});
