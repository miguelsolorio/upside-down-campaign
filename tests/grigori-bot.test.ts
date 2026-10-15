// The bot against Grigori (src/combat/bot_grigori.ts, bot_box.ts, bot_hold.ts), in a small chamber built in tests/grigori-helpers.ts: it
// beats him on chief with a shooter in the party and without one, flanks in his recovery, sidesteps the grab, swaps to Nancy or Lucas to
// shoot the breaker when his feet are on the plate, and swaps out of a hold. The bot is given no flag to open or wake anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import type { PartySeed, Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import type { Enemy, Hero } from '../src/combat/state.ts';
import { arena, idle, makeWhite, ofType, sfxIds, tc, tf } from './sim-helpers.ts';
import type { GRig } from './grigori-helpers.ts';
import { NO_SHOOTER, ON_PLATE, WITH_SHOOTER, bossView, gRig, park } from './grigori-helpers.ts';

const grid = arena(18, 12);
const bot = (careless = false) => createBot({ grid, waypoints: [{ x: tc(3), y: tf(6) }], careless });

/** The bot fights the rig until Grigori is dead, the party is down or `max` frames pass. The rig's sim is wrapped to see any flag the bot sets. */
function fight(r: GRig, careless = false, max = 14400) {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const b = bot(careless);
  let won = false, down = false, f = 0, stunned = 0, lit = 0, held = 0;
  for (; f < max; f++) {
    const ev = r.sim.step(b.next(spied));
    if (ev.some((e) => e.t === 'allDown')) down = true;
    if (ev.some((e) => e.t === 'kill' && e.kind === 'grigori')) won = true;
    if (ev.some((e) => e.t === 'targetHit')) lit++;
    if (r.g.move === 'stun') stunned++;
    if (r.s.hold) held++;
    if (down || won) break;
  }
  return { won, down, frames: f, calls, lit, stunned, held, taken: r.sim.stats().damageTaken };
}

const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

test('bot: it beats Grigori on chief in at least 9 of 10 seeds with a shooter in the party and without one, and the shooter makes it quicker', () => {
  const avg = (party: PartySeed[]) => {
    const fights = seeds(10).map((seed) => fight(gRig({ seed }, false, party)));
    for (const f of fights) assert.deepEqual(f.calls, [], 'with no flags from the bot');
    const wins = fights.filter((f) => f.won);
    assert.ok(wins.length >= 9, `${wins.length}/10`);
    return { frames: wins.reduce((n, f) => n + f.frames, 0) / wins.length, fights };
  };
  const without = avg(NO_SHOOTER), withNancy = avg(WITH_SHOOTER);
  assert.ok(withNancy.frames < without.frames * 0.75, `with a shooter ${(withNancy.frames / 60).toFixed(0)} s, without ${(without.frames / 60).toFixed(0)} s`);
  assert.ok(without.frames / 60 >= 40, 'flanking alone is a long fight');
  assert.ok(withNancy.fights.filter((f) => f.stunned >= 150).length >= 8, 'with a shooter he is stunned on the plate in most fights');
  assert.ok(without.fights.every((f) => f.lit === 0 && f.stunned === 0), 'without one the breaker is left alone');
});

test('bot: with Nancy or Lucas in the party and his feet on the plate, it swaps to them and shoots the breaker, and he is stunned', () => {
  for (const shooter of ['nancy', 'lucas'] as const) {
    const party: PartySeed[] = [{ id: 'mike', level: 7 }, { id: 'eleven', level: 5 }, { id: 'robin', level: 5 }, { id: shooter, level: 5 }];
    const r = gRig({ start: { x: tc(4), y: tf(6) } }, true, party);
    park(r, ON_PLATE.x, ON_PLATE.y);
    r.hero.st.hp = 900; r.hero.hp = 900;
    const b = bot();
    const events: SimEvent[] = [];
    let swapAt = -1, litAt = -1;
    for (let f = 0; f < 240 && litAt < 0; f++) {
      const ev = r.sim.step(b.next(r.sim));
      events.push(...ev);
      if (swapAt < 0 && ev.some((e) => e.t === 'swap' && e.from === 'mike' && e.to === shooter)) swapAt = f;
      if (ev.some((e) => e.t === 'targetHit' && e.propId === 'breaker1')) litAt = f;
    }
    assert.ok(swapAt >= 0, `${shooter}: it swapped to them`);
    assert.ok(litAt > swapAt, `${shooter}: and shot the breaker (${litAt})`);
    run(r, 4);
    assert.equal(r.g.move, 'stun', `${shooter}: Grigori is stunned`);
  }
});

function run(r: GRig, n: number): void { for (let i = 0; i < n; i++) r.sim.step(bot().next(r.sim)); }

test('bot: with no shooter in the party it never goes for the breaker, even with his feet on the plate', () => {
  const r = gRig({ start: { x: tc(4), y: tf(6) } }, true, NO_SHOOTER);
  park(r, ON_PLATE.x, ON_PLATE.y);
  const b = bot();
  let lit = false;
  for (let f = 0; f < 240; f++) if (r.sim.step(b.next(r.sim)).some((e) => e.t === 'targetHit')) lit = true;
  assert.equal(lit, false);
});

test('bot: it backs off the haymaker, then goes round to his side and lands full hits before he turns', () => {
  // Five fights of 1800 frames each, a dozen haymakers apiece.
  const recoveries: { full: number; blocked: number; off: number }[] = [];
  const taken: number[] = [];
  for (const seed of seeds(5)) {
    const r = gRig({ seed, start: { x: tc(3), y: tf(6) } }, true, NO_SHOOTER);
    r.g.grabCd = 99999;
    const b = bot();
    let cur: { full: number; blocked: number; off: number } | null = null;
    let wasHay = false;
    for (let f = 0; f < 1800; f++) {
      const ev = r.sim.step(b.next(r.sim));
      const v = bossView(r)!;
      const hay = v.alert && v.pose === undefined;
      if (wasHay && !hay && r.g.move === 'recover') cur = { full: 0, blocked: 0, off: 0 };
      if (r.g.move !== 'recover' && cur) { recoveries.push(cur); cur = null; }
      wasHay = hay;
      if (!cur) continue;
      const blocked = sfxIds(ev).includes('block');
      for (const h of ev) if (h.t === 'hit' && h.onEnemy) { if (blocked) cur.blocked++; else cur.full++; }
      const face = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[v.dir];
      const ang = Math.atan2(r.hero.y - r.boss.y, r.hero.x - r.boss.x);
      const off = Math.abs(((ang - face) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (off > (70 * Math.PI) / 180) cur.off++;
    }
    taken.push(r.sim.stats().damageTaken);
  }
  assert.ok(recoveries.length >= 10, `${recoveries.length} recoveries seen`);
  const withFull = recoveries.filter((c) => c.full >= 1).length;
  assert.ok(withFull >= recoveries.length * 0.8, `${withFull}/${recoveries.length} recoveries ended with a full hit`);
  assert.ok(recoveries.filter((c) => c.off >= 12).length >= recoveries.length * 0.8, 'and the hero stood outside the front arc for a good part of the window');
  const full = recoveries.reduce((n, c) => n + c.full, 0), blocked = recoveries.reduce((n, c) => n + c.blocked, 0);
  assert.ok(full > blocked * 2, `${full} full hits against ${blocked} blocked`);
  assert.ok(taken.every((t) => t === 0), `damage taken ${taken.join(',')}`);
});

test('bot: it steps off the line of the grab\'s lunge, where a bot that never dodges is held', () => {
  const heldIn = (careless: boolean): number => seeds(10).filter((seed) => {
    const r = gRig({ seed, start: { x: tc(3), y: tf(6) } }, true, NO_SHOOTER);
    r.g.grabCd = 0;
    r.boss.cd = 99999;
    r.boss.x = tc(3) + 50; r.boss.hx = r.boss.x;
    const b = bot(careless);
    for (let f = 0; f < 120; f++) {
      r.sim.step(b.next(r.sim));
      if (r.s.hold) return true;
    }
    return false;
  }).length;
  const careful = heldIn(false), careless = heldIn(true);
  assert.ok(careful <= 1, `the careful bot was held in ${careful} of 10`);
  assert.ok(careless >= 7, `the careless bot was held in ${careless} of 10`);
});

test('bot: a swap frees it from a Flayed\'s hold and from Grigori\'s, at once', () => {
  // The foe takes hold while the hero stands still, then the bot plays on.
  const flayed = makeWhite({
    grid, party: NO_SHOOTER, start: { x: tc(6) - 18, y: tf(8) }, seed: 7,
    spawns: [{ kind: 'enemy', id: 'f', type: 'flayed', tx: 6, ty: 8, group: 'g' } as SimSpawn],
  });
  const lead = flayed.s.heroes[0] as Hero;
  lead.st.hp = 900; lead.hp = 900;
  while (!flayed.s.hold) flayed.sim.step(idle());
  const b = createBot({ grid, waypoints: [{ x: tc(6) - 18, y: tf(8) }] });
  let free = -1;
  for (let f = 0; f < 60 && free < 0; f++) {
    flayed.sim.step(b.next(flayed.sim));
    if (!flayed.s.hold) free = f;
  }
  assert.ok(free >= 0 && free <= 14, `the Flayed's hold was broken after ${free} frames`);
  assert.notEqual(flayed.s.heroes[flayed.s.active]?.id, 'mike', 'by a swap');

  const r = gRig({ start: { x: tc(3), y: tf(6) } }, true, NO_SHOOTER);
  r.g.grabCd = 0;
  r.boss.cd = 99999;
  r.boss.x = tc(3) + 50; r.boss.hx = r.boss.x;
  while (!r.s.hold) r.sim.step(idle());
  const b2 = bot();
  let out = -1;
  for (let f = 0; f < 60 && out < 0; f++) {
    r.sim.step(b2.next(r.sim));
    if (!r.s.hold) out = f;
  }
  assert.ok(out >= 0 && out <= 14, `Grigori's hold was broken after ${out} frames`);
  assert.notEqual(r.s.heroes[r.s.active]?.id, 'mike');
});

test('bot: it steps out of a soldier\'s burst like it does a dart, where one that never dodges takes every round', () => {
  const field = arena(32, 16);
  const taken = (careless: boolean): number[] => seeds(8).map((seed) => {
    const { sim, s } = makeWhite({
      grid: field, party: NO_SHOOTER, start: { x: tc(3), y: tf(8) }, seed,
      spawns: [{ kind: 'enemy', id: 's', type: 'soldier', tx: 10, ty: 8, group: 'g', dir: 'left' } as SimSpawn],
    });
    (s.heroes[0] as Hero).st.hp = 900; (s.heroes[0] as Hero).hp = 900;
    const b = createBot({ grid: field, waypoints: [{ x: tc(3), y: tf(8) }], careless });
    let n = 0;
    for (let f = 0; f < 150; f++) n += ofType(sim.step(b.next(sim)), 'hit').filter((h) => !h.onEnemy).length;
    return n;
  });
  const careful = taken(false), blind = taken(true);
  assert.ok(careful.every((n) => n <= 1), `careful: ${careful.join(',')}`);
  assert.ok(blind.every((n) => n >= 3), `careless: ${blind.join(',')}`);
});
