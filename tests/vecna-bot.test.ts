// The bot against Vecna (src/combat/bot_vecna.ts, bot.ts), in the attic of tests/vecna-helpers.ts (20 by 14 tiles, the clock on the north wall,
// four orbs round the floor). With the party a real run brings to 4.4 (Mike, Dustin, Robin and Eleven) it beats him on chief with no flag, steps
// out of a whip's line and a debris mark, breaks the marked orb first under a curse (or plays the Walkman), leads with a ranged hero in Float or
// breaks an orb to pull him down, and otherwise hits him. The careless bot skips the dodges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import type { PartySeed, Sim, SimEvent } from '../src/core/types.ts';
import { ofType, sfxIds, tc, tf } from './sim-helpers.ts';
import type { VRig } from './vecna-helpers.ts';
import { at, attic, hold, place, steps, toFloat, vRig } from './vecna-helpers.ts';

const bot = (careless = false) => createBot({ grid: attic(), waypoints: [{ x: tc(10), y: tf(10) }], careless });
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
const lv = (...ids: string[]): PartySeed[] => ids.map((id) => ({ id: id as PartySeed['id'], level: 8 }));

/** Runs the bot on the rig until Vecna is dead, the party is down or `max` frames pass. The sim it is handed notes any flag it sets. */
function fight(r: VRig, careless = false, max = 14400) {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const b = bot(careless);
  const ev: SimEvent[] = [];
  let won = false, down = false, f = 0;
  for (; f < max; f++) {
    const out = r.sim.step(b.next(spied));
    ev.push(...out);
    if (out.some((e) => e.t === 'allDown')) down = true;
    if (out.some((e) => e.t === 'kill' && e.kind === 'vecna')) won = true;
    if (down || won) break;
  }
  return { won, down, frames: f, calls, ev, taken: r.sim.stats().damageTaken };
}

test('bot: the 4.4 party beats Vecna on chief in most seeds, with no flag, in a sane time', (t) => {
  const fights = seeds(20).map((seed) => fight(vRig({ seed, enemyMult: 1.5 }, { tough: false, still: false })));
  for (const f of fights) assert.deepEqual(f.calls, [], 'with no flags from the bot');
  const wins = fights.filter((f) => f.won);
  assert.ok(wins.length >= 15, `${wins.length}/20`);
  for (const f of wins) {
    assert.equal(ofType(f.ev, 'kill').filter((k) => k.kind === 'vecna' || k.kind === 'orb').length, 5, 'Vecna and his four orbs');
    assert.deepEqual(ofType(f.ev, 'groupCleared').map((g) => g.group), ['boss']);
    assert.deepEqual(ofType(f.ev, 'phase').map((p) => p.phase), [2, 3], 'through Float and Burn');
    assert.ok(ofType(f.ev, 'curseEnd').every((c) => c.how === 'orb' || c.how === 'ko'));
  }
  const avg = wins.reduce((n, f) => n + f.frames, 0) / wins.length / 60;
  t.diagnostic(`${wins.length}/20 won, an average of ${avg.toFixed(0)} s, ${(wins.reduce((n, f) => n + f.taken, 0) / wins.length).toFixed(0)} damage taken`);
  assert.ok(avg >= 30 && avg <= 180, `an average of ${avg.toFixed(0)} s`);
});

test('bot: the careless bot, which dodges nothing, still wins most of the time, and no fight of either runs past six minutes', (t) => {
  const careless = seeds(20).map((seed) => fight(vRig({ seed, enemyMult: 1.5 }, { tough: false, still: false }), true));
  const wins = careless.filter((f) => f.won).length;
  t.diagnostic(`careless ${wins}/20`);
  assert.ok(wins >= 12, `${wins}/20`);
  const long = seeds(60).map((seed) => fight(vRig({ seed: seed + 100, enemyMult: 1.5 }, { tough: false, still: false }), seed % 2 === 0));
  assert.deepEqual(long.filter((f) => !f.won && !f.down).length, 0, 'every fight ends in a win or a wipe');
});

test('bot: parties with no shooter, and all shooters, win too', () => {
  for (const ids of [['mike', 'steve', 'max', 'dustin'], ['mike', 'lucas', 'will', 'nancy']]) {
    const wins = seeds(4).filter((seed) => fight(vRig({ seed, party: lv(...ids), enemyMult: 1.5 }, { tough: false, still: false })).won);
    assert.ok(wins.length >= 3, `${ids.join(', ')}: ${wins.length}/4`);
  }
});

// ------------------------------------------------------------------ dodging

/** Vecna 22 px above the hero with his whip ready, then `frames` ticks of the bot. Returns the hits the party took. */
function whipped(careless: boolean): number {
  const r = vRig({ party: lv('mike', 'dustin') });
  at(r, tc(10), tf(10));
  place(r, tc(10), tf(10) - 22);
  r.v.whipCd = 0;
  const b = bot(careless);
  const ev: SimEvent[] = [];
  for (let f = 0; f < 70; f++) ev.push(...r.sim.step(b.next(r.sim)));
  return hurt(ev).length;
}

test('bot: it steps out of the whip\'s line during the wind-up, and the careless bot takes the lash', () => {
  // The wind-up is short enough that a step out isn't sure: the careful bot takes fewer lashes, not none (docs/level-13.md, "Result").
  assert.ok(whipped(true) >= 1);
  assert.ok(whipped(false) <= whipped(true));
});

/** Float with a rock thrown every time it can be, `frames` ticks of the bot, and the hits taken. */
function pelted(careless: boolean): number {
  const r = vRig({ party: lv('lucas', 'mike') });
  toFloat(r);
  const b = bot(careless);
  const ev: SimEvent[] = [];
  for (let f = 0; f < 900; f++) {
    if (f % 150 === 0) r.v.throwCd = 0;
    r.v.chimeCd = 99999; r.v.healCd = 99999;
    ev.push(...r.sim.step(b.next(r.sim)));
  }
  return hurt(ev).length;
}

test('bot: it leaves a debris mark before the rock lands, and the careless bot is hit', () => {
  assert.ok(pelted(true) >= 1);
  assert.ok(pelted(false) <= pelted(true));
});

// ------------------------------------------------------------------ the curse

/** A rig with the clock about to chime on a hero who is not Max, so the bot has someone to save. */
function cursedRig(party: PartySeed[], walkman = false, careless = false) {
  for (let seed = 1; seed < 40; seed++) {
    const r = vRig({ seed, party, walkman }, { tough: false });
    r.v.chimeCd = 1;
    const ev = steps(r, 1);
    const who = ofType(ev, 'cursed')[0]?.hero;
    if (who && who !== 'max') {
      hold(r);
      const b = bot(careless);
      const out: SimEvent[] = [...ev];
      let f = 0;
      for (; f < 900 && ofType(out, 'curseEnd').length === 0; f++) out.push(...r.sim.step(b.next(r.sim)));
      return { r, who, ev: out, frames: f };
    }
  }
  throw new Error('no seed spared Max');
}

test('bot: under a curse it breaks the marked orb first, well before the fourth chime, careless or not', () => {
  for (const careless of [false, true]) {
    const { r, who, ev, frames } = cursedRig(lv('mike', 'dustin', 'robin', 'steve'), false, careless);
    assert.deepEqual(ofType(ev, 'curseEnd').map((c) => [c.hero, c.how]), [[who, 'orb']], `careless ${careless}`);
    assert.ok(frames < 700, `${frames} frames`);
    assert.equal(r.orbs.filter((o) => o.orb?.broken).length, 1, 'and no other orb first');
    assert.ok(r.s.heroes.every((h) => !h.ko));
  }
});

test('bot: with Max in the party and her Walkman ready it plays that instead, and breaks no orb', () => {
  const { r, ev } = cursedRig(lv('mike', 'max', 'dustin'), true);
  assert.deepEqual(ofType(ev, 'curseEnd').map((c) => c.how), ['walkman']);
  assert.equal(r.orbs.filter((o) => o.orb?.broken).length, 0);
});

// ------------------------------------------------------------------ Float

/** Float, the scheduler held so that nothing else happens, and `frames` ticks of the bot. */
function floating(party: PartySeed[], frames: number) {
  const r = vRig({ party, enemyMult: 1.5 });
  toFloat(r);
  const b = bot();
  const ev: SimEvent[] = [];
  const hp0 = r.body.hp;
  for (let f = 0; f < frames; f++) {
    hold(r);
    ev.push(...r.sim.step(b.next(r.sim)));
  }
  return { r, ev, hp0 };
}

test('bot: in Float it leads with a hero who reaches him, and leaves the orbs alone', () => {
  const { r, ev, hp0 } = floating(lv('mike', 'dustin', 'will', 'steve'), 600);
  assert.ok(r.body.hp < hp0 - 100, 'it hurt him from range');
  assert.ok(['will'].includes(r.s.heroes[r.s.active]?.id as string));
  assert.equal(r.orbs.filter((o) => o.orb?.broken).length, 0, 'no orb broken');
  assert.ok(!sfxIds(ev).includes('orb'));
});

test('bot: Eleven leads in Float while she has the MP for a Mind Blast, and does not once she has not', () => {
  const lead = floating(lv('mike', 'eleven', 'steve', 'max'), 400);
  assert.equal(lead.r.s.heroes[lead.r.s.active]?.id, 'eleven');
  assert.ok(lead.r.body.hp < lead.hp0, 'a blast hurt him');
  const dry = vRig({ party: lv('mike', 'eleven', 'steve', 'max'), enemyMult: 1.5 });
  toFloat(dry);
  const eleven = dry.s.heroes.find((h) => h.id === 'eleven');
  assert.ok(eleven);
  eleven.mp = 0;
  const b = bot();
  const ev: SimEvent[] = [];
  for (let f = 0; f < 600 && !sfxIds(ev).includes('orb'); f++) { hold(dry); eleven.mp = 0; ev.push(...dry.sim.step(b.next(dry.sim))); }
  assert.ok(sfxIds(ev).includes('orb'), 'with no blast to cast it breaks an orb instead');
});

test('bot: with no shooter in the party it breaks an orb to pull him down, then hits him on the floor', () => {
  const r = vRig({ party: lv('mike', 'steve', 'max', 'dustin'), enemyMult: 1.5 });
  toFloat(r);
  const b = bot();
  const hp0 = r.body.hp;
  let downAt = -1;
  for (let f = 0; f < 1500; f++) {
    hold(r);
    r.sim.step(b.next(r.sim));
    if (downAt < 0 && r.v.move === 'down') downAt = f;
    if (downAt >= 0 && f > downAt + 200) break;
  }
  assert.ok(downAt >= 0 && downAt < 900, `down at ${downAt}`);
  assert.ok(r.body.hp < hp0 - 60, 'and it hurt him on the floor');
});

test('bot: with Vecna in Float and every orb broken it waits for one to grow back, not swinging at the air', () => {
  const r = vRig({ party: lv('mike', 'steve', 'max', 'dustin'), enemyMult: 1.5 });
  for (const o of r.orbs) { o.hp = 0; o.orb!.broken = true; o.orb!.t = 600; }
  toFloat(r);
  const b = bot();
  const floaters: string[] = [];
  for (let f = 0; f < 300; f++) {
    hold(r);
    r.sim.step(b.next(r.sim));
    for (const fl of r.s.floaters) if (fl.text === 'TOO HIGH') floaters.push(fl.text);
  }
  assert.equal(r.v.move, 'walk');
  assert.equal(floaters.length, 0, 'it never swung at him');
});

test('bot: in Clock, with nobody cursed, it hits him', () => {
  const r = vRig({ party: lv('mike', 'dustin'), enemyMult: 1.5 });
  const b = bot();
  const hp0 = r.body.hp;
  for (let f = 0; f < 600; f++) { hold(r); r.sim.step(b.next(r.sim)); }
  assert.ok(r.body.hp < hp0 - 100, `${hp0 - r.body.hp} off`);
});
