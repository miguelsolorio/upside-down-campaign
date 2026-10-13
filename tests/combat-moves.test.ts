import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/combat/init.ts';
import { hurtHero } from '../src/combat/damage.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { arena, inp, makeWhite, ofType, press, rat, agent, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { S } from '../src/combat/state.ts';
import type { PartySeed, SimEvent, SimSpawn } from '../src/core/types.ts';

/** Pins every enemy in place so a test can measure where a move reaches. */
function pin(s: S): void {
  for (const e of s.enemies) { e.stat.stun = 99999; e.aware = false; }
}
function place(s: S, i: number, x: number, y: number): void {
  const e = s.enemies[i];
  assert.ok(e);
  e.x = x; e.y = y; e.hx = x; e.hy = y;
}
const hpOf = (s: S, i: number): number => (s.enemies[i] as { hp: number }).hp;

function open(spawns: SimSpawn[], party: PartySeed[], seed = 1): ReturnType<typeof makeWhite> {
  const w = makeWhite({ party, spawns, seed, start: { x: 200, y: 200 } });
  return w;
}

test('Mike bat: a wide arc in front, nothing behind or out of reach', () => {
  const spawns = [rat('a', 1, 1), rat('b', 1, 1), rat('c', 1, 1), rat('d', 1, 1), rat('e', 1, 1)];
  const { sim, s } = open(spawns, [{ id: 'mike' }]);
  pin(s);
  place(s, 0, 226, 200); // straight ahead
  place(s, 1, 218, 182); // about 45 degrees up
  place(s, 2, 180, 200); // behind
  place(s, 3, 250, 200); // too far
  place(s, 4, 200, 226); // directly below, 90 degrees off
  run(sim, 1, inp({ mx: 0.2 }));
  const ev = press(sim, { attackPressed: true }, 12);
  assert.ok(hpOf(s, 0) < 10 || s.enemies[0]?.dead, 'front hit');
  assert.ok(hpOf(s, 1) < 10 || s.enemies[1]?.dead, 'diagonal hit');
  assert.equal(hpOf(s, 2), 10, 'behind untouched');
  assert.equal(hpOf(s, 3), 10, 'out of reach untouched');
  assert.equal(hpOf(s, 4), 10, 'off to the side untouched');
  assert.ok(sfxIds(ev).includes('swing'));
});

test('Mike bat: three taps chain, the third swing is wider, harder and stuns', () => {
  const { sim, s } = open([agent('a', 1, 1)], [{ id: 'mike' }]);
  pin(s);
  const e = s.enemies[0]!;
  const widths: number[] = [];
  const stunAfter: number[] = [];
  const seen = new Set<object>();
  const grab = (): void => {
    for (const fx of sim.view().fx) if (fx.kind === 'slash' && !seen.has(fx)) { seen.add(fx); widths.push(fx.w); }
  };
  run(sim, 1, inp({ mx: 0.2 }));
  for (let tap = 0; tap < 4; tap++) {
    // Put a fresh, unaware agent in front for each swing.
    e.hp = 24; e.x = 224; e.y = 200; e.vx = 0; e.vy = 0; e.stat.stun = 0; e.stagger = 0; e.aware = false; e.mode = 'idle'; e.cd = 999;
    sim.step(inp({ attackPressed: true }));
    for (let f = 0; f < 16; f++) { sim.step(inp()); grab(); }
    assert.ok(e.hp < 24, `swing ${tap + 1} connected`);
    stunAfter.push(e.stat.stun);
    if (tap === 2) run(sim, 20); // the third swing has a longer recovery
  }
  // Taps one to three are the chain, the fourth starts over.
  assert.deepEqual(widths.slice(0, 4), [28, 28, 33, 28]);
  assert.equal(stunAfter[0], 0);
  assert.equal(stunAfter[1], 0);
  assert.ok((stunAfter[2] ?? 0) >= 15, `third swing stuns, ${stunAfter[2]} frames left`);
  assert.equal(stunAfter[3], 0);
  assert.equal(HERO_DEFS.mike.basic.x.stun, 30);
});

test('Mike bat: waiting too long resets the chain', () => {
  const { sim } = open([], [{ id: 'mike' }]);
  const widths: number[] = [];
  const seen = new Set<object>();
  const grab = (): void => {
    for (const fx of sim.view().fx) if (fx.kind === 'slash' && !seen.has(fx)) { seen.add(fx); widths.push(fx.w); }
  };
  run(sim, 1, inp({ mx: 0.2 }));
  for (const gap of [0, 14, 14, 90, 14, 14]) {
    for (let f = 0; f < gap; f++) { sim.step(inp()); grab(); }
    sim.step(inp({ attackPressed: true }));
    for (let f = 0; f < 10; f++) { sim.step(inp()); grab(); }
  }
  // 28, 28, 33, then the 90-frame pause resets: 28, 28, 33.
  assert.deepEqual(widths, [28, 28, 33, 28, 28, 33]);
});

test('Mike DM screen: costs 6 MP, blocks darts, stands for five seconds', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike' }], start: { x: tc(4), y: tf(8) }, spawns: [agent('a', 9, 8, 'g')], seed: 8,
  });
  run(sim, 1, inp({ mx: 0.2 }));
  const mp0 = sim.view().hud.party[0]?.mp ?? 0;
  const ev = press(sim, { specialPressed: true }, 10);
  assert.ok(sfxIds(ev).includes('shield'));
  const mp1 = sim.view().hud.party[0]?.mp ?? 0;
  assert.ok(mp0 - mp1 >= 5 && mp0 - mp1 <= 6, `spent ${mp0 - mp1}`);
  const shield = sim.view().fx.find((f) => f.kind === 'shield');
  assert.ok(shield, 'the screen is drawn');
  assert.equal(shield.life, 300);
  assert.ok(shield.x > s.heroes[0]!.x, 'planted in front of Mike');
  const hp0 = sim.party()[0]?.hp ?? 0;
  run(sim, 270);
  assert.equal(sim.party()[0]?.hp, hp0, 'every dart bounced off the screen');
  assert.ok(sim.stats().damageTaken === 0);
  run(sim, 60);
  assert.ok(!sim.view().fx.some((f) => f.kind === 'shield'), 'gone after five seconds');
});

test('Mike DM screen: damage from behind it is halved', () => {
  const mk = (withShield: boolean): number => {
    const s = createState({
      grid: arena(24, 16), party: [{ id: 'dustin' }], start: { x: 200, y: 200 }, spawns: [], seed: 5,
    });
    if (withShield) s.shield = { x: 220, y: 193, angle: 0, half: 15, age: 0, life: 300 };
    return hurtHero(s, s.heroes[0]!, 260, 200, 1.0, 20, 2);
  };
  const plain = mk(false), halved = mk(true);
  assert.ok(plain >= 10, `plain ${plain}`);
  assert.equal(halved, Math.max(1, Math.round(plain / 2)));
});

test('Dustin candy lure: lands after about 24 frames with a blast, then pulls enemies within 64 px for three seconds', () => {
  const { sim, s } = open([rat('a', 1, 1), rat('b', 1, 1)], [{ id: 'dustin' }]);
  pin(s);
  // The candy lands 76 px ahead at x = 276. The rats stand 55 px beyond it: inside the 64 px pull, outside the
  // 110 px aim assist and the rats' own notice range.
  place(s, 0, 330, 190);
  place(s, 1, 330, 212);
  for (const e of s.enemies) e.stat.stun = 0;
  s.enemies.forEach((e) => { e.wanderT = 99999; });
  run(sim, 1, inp({ mx: 0.2 }));
  const evs: SimEvent[] = [];
  evs.push(...sim.step(inp({ attackPressed: true })));
  let landed = -1;
  for (let f = 1; f < 90; f++) {
    evs.push(...sim.step(inp()));
    if (landed < 0 && sim.view().fx.some((x) => x.kind === 'blast')) landed = f;
  }
  assert.ok(sfxIds(evs).includes('lure'));
  assert.ok(sfxIds(evs).includes('candyPop'));
  assert.ok(landed >= 24 && landed <= 36, `landed after ${landed} frames`);
  for (const e of s.enemies) {
    assert.ok(Math.hypot(e.x - 276, e.y - 200) < 12, `enemy near the candy: ${e.x},${e.y}`);
  }
  assert.ok(sim.view().fx.some((x) => x.kind === 'candy'), 'the candy stays on the ground');
  run(sim, 200);
  assert.ok(!sim.view().fx.some((x) => x.kind === 'candy'), 'it is gone after three seconds');
});

test('Dustin candy lure: aims itself at the nearest enemy in front', () => {
  const { sim, s } = open([agent('a', 1, 1)], [{ id: 'dustin' }]);
  pin(s);
  place(s, 0, 290, 215);
  run(sim, 1, inp({ mx: 0.2 }));
  const evs = press(sim, { attackPressed: true }, 40);
  const hits = ofType(evs, 'hit').filter((h) => h.onEnemy);
  assert.equal(hits.length, 1, 'the blast hit the agent');
  const d = hits[0]?.dmg ?? 0;
  assert.ok((d >= 6 && d <= 8) || (d >= 12 && d <= 16), `blast damage ${d}`);
});

test('Dustin Farrah spray: 8 MP, a cone, burn status that keeps ticking after the flames stop', () => {
  const { sim, s } = open([agent('front', 1, 1), agent('back', 1, 1)], [{ id: 'dustin' }]);
  pin(s);
  place(s, 0, 236, 200);
  place(s, 1, 164, 200);
  run(sim, 1, inp({ mx: 0.2 }));
  const mp0 = sim.view().hud.party[0]?.mp ?? 0;
  const ev = press(sim, { specialPressed: true }, 50);
  assert.ok(sfxIds(ev).includes('flame'));
  const mp1 = sim.view().hud.party[0]?.mp ?? 0;
  assert.ok(mp0 - mp1 > 7 && mp0 - mp1 <= 8, `spent ${mp0 - mp1}`);
  const front = s.enemies[0]!, back = s.enemies[1]!;
  assert.ok(front.hp < 24, 'hit by the cone');
  assert.equal(back.hp, 24, 'nothing behind');
  assert.ok(front.stat.burn > 0, 'burning');
  assert.equal(sim.view().actors.find((a) => a.kind === 'enemy' && a.x > 200)?.tint, 'orange');
  const hpNow = front.hp;
  run(sim, 100);
  assert.ok(front.hp < hpNow, 'burn kept ticking');
  assert.equal(HERO_DEFS.dustin.special.x.burn, 180);
});

test('Lucas wrist rocket: eight-way, passes over solid terrain, stops at range', () => {
  const grid = arena(24, 16, { '7,8': '~', '8,8': '~' });
  const { sim, s } = makeWhite({ party: [{ id: 'lucas' }], grid, start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 1, 1), rat('b', 1, 1)], seed: 2 });
  pin(s);
  place(s, 0, tc(11), tf(8));   // 112 px away, behind two creek tiles
  place(s, 1, tc(4) + 190, tf(8)); // beyond the 152 px range
  run(sim, 1, inp({ mx: 0.2 }));
  const ev = press(sim, { attackPressed: true }, 60);
  assert.ok(sfxIds(ev).includes('rock'));
  assert.ok(sfxIds(ev).includes('rockHit'));
  assert.ok(hpOf(s, 0) < 10 || s.enemies[0]!.dead, 'hit across the creek');
  assert.equal(hpOf(s, 1), 10, 'out of range');
  // Diagonal aim: a rocket fired down-right moves equally in x and y.
  const d = makeWhite({ party: [{ id: 'lucas' }], start: { x: 200, y: 200 } });
  run(d.sim, 1, inp({ mx: 0.2, my: 0.2 }));
  press(d.sim, { attackPressed: true }, 4);
  const rock = d.sim.view().fx.find((f) => f.kind === 'rock');
  assert.ok(rock, 'rocket in flight');
  assert.ok(Math.abs(rock.angle - Math.PI / 4) < 1e-6, `angle ${rock.angle}`);
});

test('Lucas triple shot: 5 MP, three rockets in a fan', () => {
  const { sim } = makeWhite({ party: [{ id: 'lucas' }], start: { x: 200, y: 200 } });
  run(sim, 1, inp({ mx: 0.2 }));
  const mp0 = sim.view().hud.party[0]?.mp ?? 0;
  press(sim, { specialPressed: true }, 10);
  const rocks = sim.view().fx.filter((f) => f.kind === 'rock');
  assert.equal(rocks.length, 3);
  const angles = rocks.map((r) => r.angle).sort((a, b) => a - b);
  assert.ok(Math.abs(angles[0]! + angles[2]!) < 1e-6 && angles[2]! > 0.25, 'symmetric fan');
  const mp1 = sim.view().hud.party[0]?.mp ?? 0;
  assert.ok(mp0 - mp1 > 4 && mp0 - mp1 <= 5);
});

test('Lucas shoot lights a target; a closed gate stops the shot; Eleven push clears a log, Mike does not', () => {
  const props: SimSpawn[] = [
    { kind: 'prop', id: 'target1', prop: 'target', tx: 12, ty: 8, hitBy: 'shoot' },
    { kind: 'prop', id: 'gate1', prop: 'gate', tx: 9, ty: 5, h: 16 },
    { kind: 'prop', id: 'log1', prop: 'log', tx: 7, ty: 11, pushBy: 'push' },
  ];
  const a = makeWhite({ party: [{ id: 'lucas' }], spawns: props, start: { x: tc(4), y: tf(8) } });
  run(a.sim, 1, inp({ mx: 0.2 }));
  const ev = press(a.sim, { attackPressed: true }, 50);
  const hit = ofType(ev, 'targetHit');
  assert.equal(hit.length, 1);
  assert.equal(hit[0]?.propId, 'target1');
  assert.equal(a.sim.view().props.find((p) => p.id === 'target1')?.state, 'lit');
  assert.ok(sfxIds(ev).includes('targetHit'));
  const again = press(a.sim, { attackPressed: true }, 50);
  assert.equal(ofType(again, 'targetHit').length, 0, 'lit once');

  // A rocket into the closed gate goes no further.
  const g = makeWhite({
    party: [{ id: 'lucas' }], start: { x: tc(4), y: tf(5) },
    spawns: [{ kind: 'prop', id: 'gate1', prop: 'gate', tx: 7, ty: 5 }, { kind: 'prop', id: 'target1', prop: 'target', tx: 10, ty: 5 }],
  });
  run(g.sim, 1, inp({ mx: 0.2 }));
  const ev2 = press(g.sim, { attackPressed: true }, 60);
  assert.equal(ofType(ev2, 'targetHit').length, 0, 'the gate absorbed it');
  g.sim.openProp('gate1');
  run(g.sim, 30);
  const ev3 = press(g.sim, { attackPressed: true }, 60);
  assert.equal(ofType(ev3, 'targetHit').length, 1, 'open gate lets it through');

  // Mike's bat does nothing to a log. Eleven's push clears it and the way opens.
  const mk = (id: 'mike' | 'eleven'): ReturnType<typeof makeWhite> => makeWhite({
    party: [{ id }], start: { x: tc(4), y: tf(11) }, spawns: [{ kind: 'prop', id: 'log1', prop: 'log', tx: 6, ty: 11 }],
  });
  const m = mk('mike');
  run(m.sim, 1, inp({ mx: 1 }));
  run(m.sim, 40, inp({ mx: 1 }));
  const evM = press(m.sim, { attackPressed: true }, 20);
  assert.equal(ofType(evM, 'propCleared').length, 0);
  run(m.sim, 60, inp({ mx: 1 }));
  assert.ok(m.sim.heroPos().x < 6 * 16, 'still blocked');

  const e = mk('eleven');
  run(e.sim, 40, inp({ mx: 1 }));
  assert.ok(e.sim.heroPos().x < 6 * 16, 'blocked before the push');
  const evE = press(e.sim, { attackPressed: true }, 20);
  const cleared = ofType(evE, 'propCleared');
  assert.equal(cleared.length, 1);
  assert.equal(cleared[0]?.propId, 'log1');
  assert.ok(sfxIds(evE).includes('logPush'));
  assert.equal(e.sim.view().props.find((p) => p.id === 'log1')?.state, 'open');
  run(e.sim, 60, inp({ mx: 1 }));
  assert.ok(e.sim.heroPos().x > 6 * 16 + 8, 'walks through');
});

test('openProp on a log or a gate between ticks reports through the next step', () => {
  const { sim } = makeWhite({
    spawns: [{ kind: 'prop', id: 'log1', prop: 'log', tx: 9, ty: 8 }, { kind: 'prop', id: 'gate1', prop: 'gate', tx: 9, ty: 5 }],
  });
  sim.openProp('log1');
  sim.openProp('gate1');
  const ev = sim.step(inp());
  assert.deepEqual(ofType(ev, 'propCleared').map((e) => e.propId), ['log1']);
  assert.ok(sfxIds(ev).includes('gateOpen'));
  const states = Object.fromEntries(sim.view().props.map((p) => [p.id, p.state]));
  assert.deepEqual(states, { log1: 'open', gate1: 'open' });
});

test('Eleven Push: a cone shove with knockback; Flip (Lv 3) hits harder and throws farther', () => {
  const run1 = (level: number): { dmg: number; moved: number } => {
    const { sim, s } = makeWhite({ party: [{ id: 'eleven', level }], spawns: [agent('a', 1, 1)], start: { x: 200, y: 200 }, seed: 12 });
    pin(s);
    place(s, 0, 222, 200);
    s.enemies[0]!.stat.stun = 99999;
    run(sim, 1, inp({ mx: 0.2 }));
    const ev = press(sim, { attackPressed: true }, 40);
    const hit = ofType(ev, 'hit').find((h) => h.onEnemy);
    assert.ok(hit, 'push connected');
    return { dmg: hit.dmg, moved: s.enemies[0]!.x - 222 };
  };
  const base = run1(2), flip = run1(3);
  assert.ok(base.moved > 12, `base shove ${base.moved}`);
  assert.ok(flip.moved > base.moved * 1.3, `Flip throws farther: ${flip.moved} vs ${base.moved}`);
  assert.ok(flip.dmg >= base.dmg, 'and hits harder');
});

test('Eleven Mind Blast: 8 MP, one beam pierces everything in line, strained under 25 percent MP', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'eleven' }], start: { x: 100, y: 200 },
    spawns: [agent('a', 1, 1), agent('b', 1, 1), agent('c', 1, 1), agent('side', 1, 1)], seed: 4,
  });
  pin(s);
  place(s, 0, 140, 200); place(s, 1, 180, 200); place(s, 2, 220, 200); place(s, 3, 180, 230);
  run(sim, 1, inp({ mx: 0.2 }));
  assert.equal(sim.view().actors.find((a) => a.id === 'eleven')?.strained, false);
  const ev = press(sim, { specialPressed: true }, 12);
  assert.ok(sfxIds(ev).includes('beam'));
  const hits = ofType(ev, 'hit').filter((h) => h.onEnemy);
  assert.equal(hits.length, 3, 'three enemies in the line, none to the side');
  assert.equal(hpOf(s, 3), 24);
  const beam = sim.view().fx.find((f) => f.kind === 'beam');
  assert.ok(beam && beam.w > 100, 'beam drawn');
  // 28 MP: after three casts she is under a quarter and strained, with one nosebleed sound.
  const noses: boolean[] = [];
  noses.push(sfxIds(ev).includes('nosebleed'));
  for (let i = 0; i < 2; i++) {
    for (const e of s.enemies) e.hp = 24; // keep them alive, a level-up would refill her MP
    run(sim, 45);
    noses.push(sfxIds(press(sim, { specialPressed: true }, 12)).includes('nosebleed'));
  }
  assert.deepEqual(noses, [false, false, true]);
  assert.equal(sim.view().actors.find((a) => a.id === 'eleven')?.strained, true);
  // With no MP left the special says no.
  run(sim, 45);
  const dry = press(sim, { specialPressed: true }, 2);
  assert.ok(sfxIds(dry).includes('noMp'));
  assert.equal(ofType(dry, 'hit').length, 0);
});
