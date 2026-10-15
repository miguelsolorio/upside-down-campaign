// Sim.closeProp, run-time spawns and the defense (docs/level-6.md): the seals, the clock and the rift, the ward falling, enemies
// favoring her and the hero or Babysit pulling them off, and the bot keeping her alive. The Alpha is in alpha.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { DefenseDef, Difficulty, SimEvent } from '../src/core/types.ts';
import { hurtWard, wantsWard } from '../src/combat/defense.ts';
import { bringUp } from '../src/combat/spawns.ts';
import { footBlocked } from '../src/combat/space.ts';
import { createBot } from '../src/combat/bot.ts';
import type { Enemy } from '../src/combat/state.ts';
import { arena, inp, makeWhite, ofType, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { SMALL_DEFENSE, alphaRig, countOf, defenseRig, onlyMove } from './alpha-helpers.ts';

const seal = (extra: Record<string, unknown> = {}) =>
  ({ kind: 'prop', id: 'seal1', prop: 'vines', tx: 8, ty: 5, w: 16, h: 48, solid: false, state: 'open', ...extra }) as const;
const ward = (r: ReturnType<typeof defenseRig>) => r.sim.view().hud.ward;
const actor = (r: ReturnType<typeof defenseRig>, id: string) => r.sim.view().actors.find((a) => a.id === id);
const riftK = (r: ReturnType<typeof defenseRig>) => r.sim.view().props.find((p) => p.id === 'rift')?.k;
const waveDogs = (r: ReturnType<typeof defenseRig>): Enemy[] => r.s.enemies.filter((e) => e.rt === 'wave' && !e.dead);
/** Puts the whole party in a far corner of the hall, away from the ward and the burrows. */
const hide = (r: ReturnType<typeof defenseRig>): void => r.sim.dev.teleport(tc(1) + 4, tf(12));

// ---------------------------------------------------------------- the seals
test('closeProp: an open seal is shut and solid again, quietly, and a hero standing in it is moved to the nearest open tile', () => {
  const { sim, s } = makeWhite({ spawns: [seal()], start: { x: tc(8) + 3, y: tf(6) } });
  const p = s.props[0]!;
  assert.equal(p.solid, false);
  assert.equal(p.hitBy, undefined, 'nothing burns a seal: vines spawned open have no default hitBy');
  const h = s.heroes[0]!;
  assert.equal(footBlocked(s, h.x, h.y), false);
  sim.closeProp('seal1');
  assert.equal(p.state, 'closed');
  assert.equal(p.solid, true);
  assert.equal(footBlocked(s, h.x, h.y), false, 'he is out of it');
  assert.ok(Math.hypot(h.x - (tc(8) + 3), h.y - tf(6)) <= 24, `moved ${Math.hypot(h.x - (tc(8) + 3), h.y - tf(6)).toFixed(0)} px`);
  assert.equal(sim.view().props[0]?.state, 'closed');
  const events = run(sim, 3);
  assert.equal(ofType(events, 'propCleared').length, 0, 'closing a seal is not a puzzle solved');
  // Open it again and it is cleared, as any vines are.
  sim.openProp('seal1');
  assert.equal(ofType(run(sim, 2), 'propCleared').length, 1);
  assert.equal(p.solid, false);
});

test('closeProp: a hero clear of the seal stays put, a shut one does nothing, and nobody walks through a seal once it is shut', () => {
  const { sim, s } = makeWhite({ spawns: [seal()], start: { x: tc(3), y: tf(6) } });
  const h = s.heroes[0]!;
  sim.closeProp('seal1');
  assert.deepEqual([h.x, h.y], [tc(3), tf(6)]);
  sim.closeProp('seal1');
  sim.closeProp('nothing');
  run(sim, 200, inp({ mx: 1 }));
  assert.ok(h.x < tc(8) - 6, `stopped at the seal (x ${h.x.toFixed(0)})`);
});

test('closeProp: the tie goes to the Alpha\'s side, so a hero in a doorway lands inside the arena', () => {
  const { sim, s } = makeWhite({
    spawns: [seal(), { kind: 'enemy', id: 'alpha', type: 'alpha', tx: 14, ty: 6, group: 'boss', dormant: true }],
    start: { x: tc(8), y: tf(6) },
  });
  sim.closeProp('seal1');
  const h = s.heroes[0]!;
  assert.ok(h.x > tc(8), `east, toward the Alpha: ${h.x}`);
});

test('closeProp: a prop that is not open is left alone', () => {
  const { sim, s } = makeWhite({ spawns: [{ kind: 'prop', id: 'g', prop: 'gate', tx: 8, ty: 5 }] });
  sim.closeProp('g');
  assert.equal(s.props[0]?.state, 'closed');
  sim.openProp('g');
  sim.closeProp('g');
  assert.equal(s.props[0]?.state, 'closed');
  assert.equal(s.props[0]?.solid, true, 'a gate shuts solid');
});

// ---------------------------------------------------------------- the clock
test('defend: nothing happens before it starts, and without a defense it does nothing at all', () => {
  const r = defenseRig();
  run(r.sim, 120);
  assert.equal(ward(r), null);
  assert.equal(riftK(r), undefined);
  assert.equal(waveDogs(r).length, 0);
  const e = actor(r, 'eleven');
  assert.ok(e && e.anim === 'idle' && e.bar === null && e.strained === false, 'Eleven is an npc with no bar');
  const plain = makeWhite();
  plain.sim.defend();
  run(plain.sim, 10);
  assert.equal(plain.sim.view().hud.ward, null);
});

test('defend: the clock starts, Eleven channels with a bar and a nosebleed, the rift closes with it, and Hopper is scenery', () => {
  const r = defenseRig();
  r.sim.dev.god = true;
  r.sim.defend();
  r.sim.defend();
  run(r.sim, 1);
  assert.deepEqual(ward(r), { name: 'ELEVEN', hp: 400, hpMax: 400, left: 1799, total: 1800 });
  const e = actor(r, 'eleven');
  assert.ok(e && e.kind === 'npc' && e.anim === 'cast' && e.strained === true, 'cast and the nosebleed');
  assert.deepEqual(e.bar, { hp: 400, hpMax: 400 });
  const h = actor(r, 'hopper');
  assert.ok(h && h.anim === 'idle' && h.bar === null && h.strained === false, 'Hopper has no bar and no part in it');
  run(r.sim, 899);
  assert.equal(ward(r)?.left, 900);
  assert.ok(Math.abs((riftK(r) ?? -1) - 0.5) < 0.001, `k at the half: ${riftK(r)}`);
  run(r.sim, 450);
  assert.ok(Math.abs((riftK(r) ?? -1) - 0.75) < 0.001);
});

test('defend: the clock always runs, near the ward or far, fighting or not', () => {
  for (const away of [false, true]) {
    const r = defenseRig();
    r.sim.dev.god = true;
    r.sim.defend();
    if (away) hide(r);
    run(r.sim, 600);
    assert.equal(ward(r)?.left, 1200);
  }
});

test('defend: the Gate rumbles about every ten seconds', () => {
  const r = defenseRig({ defense: { ...SMALL_DEFENSE, frames: 2700 } });
  r.sim.dev.god = true;
  r.sim.defend();
  const at: number[] = [];
  for (let f = 1; f <= 2700; f++) if (sfxIds(r.sim.step(inp())).includes('rumble')) at.push(f);
  assert.equal(at.length, 4);
  assert.deepEqual(at.slice(1).map((n, i) => n - (at[i] as number)), [600, 600, 600]);
});

test('defended: at 0 the Gate shuts once, with a sound, a shake and a flash, and the rift reads k = 1', () => {
  const r = defenseRig();
  r.sim.dev.god = true;
  r.sim.defend();
  const before = run(r.sim, 1799);
  assert.equal(countOf(before, 'defended'), 0);
  assert.equal(riftK(r) !== undefined && (riftK(r) as number) < 1, true);
  const end = r.sim.step(inp());
  assert.equal(countOf(end, 'defended'), 1);
  assert.ok(sfxIds(end).includes('gateShut'));
  assert.ok(r.s.shake > 1 && r.s.flash > 0.5, `shake ${r.s.shake}, flash ${r.s.flash}`);
  assert.equal(riftK(r), 1);
  assert.equal(ward(r)?.left, 0);
  const after = run(r.sim, 600);
  assert.equal(countOf(after, 'defended'), 0, 'not again');
  assert.equal(countOf(after, 'wardDown'), 0);
  assert.equal(riftK(r), 1);
  assert.equal(actor(r, 'eleven')?.anim, 'idle', 'she is done channeling');
});

test('defended: every run-time enemy still up dies for no XP and no kill event, and the halls are left alone', () => {
  const r = defenseRig({
    spawns: [
      { kind: 'npc', id: 'eleven', tx: 10, ty: 4, dir: 'down' }, { kind: 'prop', id: 'rift', prop: 'rift', tx: 9, ty: 1, w: 64, h: 48 },
      rat('hall', 1, 12, 'halls', { dormant: true }),
    ],
  });
  r.sim.dev.god = true;
  r.sim.defend();
  bringUp(r.s, 'howl', 'howl1', 'demodog', undefined, [{ x: tc(3), y: tf(10) }], 2);
  const events = run(r.sim, 1800);
  assert.equal(countOf(events, 'defended'), 1);
  assert.equal(countOf(events, 'kill'), 0, 'no kills reported');
  assert.equal(r.sim.stats().kills, 0);
  assert.equal(r.sim.stats().xpEarned, 0, 'and no XP');
  assert.equal(r.s.enemies.filter((e) => e.rt !== null && !e.dead).length, 0, 'every wave and howl enemy is down');
  run(r.sim, 30);
  assert.equal(r.sim.enemiesAlive(), 1, 'only the dormant rat is left');
});

// ---------------------------------------------------------------- the ward falls
test('wardDown: if her HP hits 0 first it is reported once, the clock stops, she shows ko, and the waves stop', () => {
  const r = defenseRig({ defense: { ...SMALL_DEFENSE, hp: 150 } });
  hide(r);
  r.sim.defend();
  let down = 0, at = -1;
  const events: SimEvent[] = [];
  for (let f = 1; f <= 1800 && !events.some((e) => e.t === 'defended'); f++) {
    const ev = r.sim.step(inp());
    events.push(...ev);
    if (ev.some((e) => e.t === 'wardDown')) { down++; if (at < 0) at = f; }
  }
  assert.equal(down, 1);
  assert.ok(at > 60 && at < 1800, `she fell at ${at}`);
  assert.deepEqual(ofType(events, 'wardDown'), [{ t: 'wardDown', id: 'eleven' }]);
  const left = ward(r)?.left as number;
  const seen = r.s.enemies.length;
  const after = run(r.sim, 900);
  assert.equal(countOf(after, 'wardDown'), 0, 'once');
  assert.equal(countOf(after, 'defended'), 0, 'and the Gate never shuts');
  assert.equal(ward(r)?.left, left, 'the clock stopped');
  assert.equal(ward(r)?.hp, 0);
  assert.equal(actor(r, 'eleven')?.anim, 'ko');
  assert.equal(actor(r, 'eleven')?.bar, null);
  assert.ok(r.s.enemies.length <= seen, 'no more waves come up');
  assert.ok(left > 0 && left < 1800);
});

test('ward: her damage scales with difficulty and the stage factor like a hero\'s, and her HP does not', () => {
  const range = (mult: number, foe: number): [number, number] => {
    const f = (spread: number): number => Math.max(1, Math.round((1 * 30 * spread - 2) * mult * foe));
    return [f(0.9), f(1.1)];
  };
  const seen: Record<string, number> = {};
  for (const [difficulty, mult] of [['kid', 0.7], ['chief', 1], ['upside', 1.4]] as [Difficulty, number][]) {
    for (const foe of [1, 1.5]) {
      const r = defenseRig({ difficulty, enemyMult: foe, defense: { ...SMALL_DEFENSE, waves: [] } });
      r.sim.defend();
      run(r.sim, 1);
      assert.equal(ward(r)?.hpMax, 400, 'fixed');
      const [lo, hi] = range(mult, foe);
      let sum = 0;
      for (let i = 0; i < 6; i++) {
        const dmg = hurtWard(r.s, 1, 30);
        assert.ok(dmg >= lo && dmg <= hi, `${difficulty} x ${foe}: ${dmg} outside ${lo} to ${hi}`);
        sum += dmg;
      }
      seen[`${difficulty}@${foe}`] = sum;
    }
  }
  const at = (k: string): number => seen[k] as number;
  assert.ok(at('kid@1') < at('chief@1') && at('chief@1') < at('upside@1'));
  assert.ok(at('chief@1') < at('chief@1.5'));
});

test('ward: heroes never hurt her, whatever they swing or cast at her', () => {
  const party = [{ id: 'dustin' as const, level: 6 }, { id: 'mike' as const, level: 6 }, { id: 'eleven' as const, level: 6 }];
  const r = defenseRig({ defense: { ...SMALL_DEFENSE, waves: [] }, start: { x: tc(10), y: tf(5) } }, party);
  r.sim.defend();
  for (let i = 0; i < 240; i++) r.sim.step(inp({ my: -0.3, attackHeld: true, specialPressed: i % 40 === 0 }));
  for (let s = 1; s <= 2; s++) { r.sim.step(inp({ swapTo: s })); for (let i = 0; i < 120; i++) r.sim.step(inp({ my: -0.3, attackHeld: true, specialPressed: i % 40 === 0 })); }
  assert.equal(ward(r)?.hp, 400);
  assert.equal(r.s.defense?.hp, 400);
});

// ---------------------------------------------------------------- who they go for
test('targeting: a wave enemy favors the ward, unless the hero is within 40 px, hit it in the last 90 frames, or Babysit holds it', () => {
  const r = defenseRig();
  r.sim.defend();
  run(r.sim, 2);
  const dog = waveDogs(r)[0] as Enemy;
  assert.ok(dog, 'a wave is up');
  const hero = r.s.heroes[0]!;
  assert.equal(wantsWard(r.s, dog, hero), true, 'the default is her');
  hero.x = dog.x + 41; hero.y = dog.y;
  assert.equal(wantsWard(r.s, dog, hero), true, 'a hero 41 px away is not near enough');
  hero.x = dog.x + 40;
  assert.equal(wantsWard(r.s, dog, hero), false, 'at 40 px he is');
  hero.x = dog.x + 90;
  dog.hitAt = r.s.frame - 90;
  assert.equal(wantsWard(r.s, dog, hero), false, 'he hit it 90 frames ago');
  dog.hitAt = r.s.frame - 91;
  assert.equal(wantsWard(r.s, dog, hero), true, 'and 91 frames ago he did not');
  dog.taunt = 1;
  assert.equal(wantsWard(r.s, dog, hero), false, 'taunted onto Steve');
  dog.taunt = 0;
  const pup = bringUp(r.s, 'howl', 'howl1', 'demodog', undefined, [{ x: tc(3), y: tf(10) }], 1)[0] as Enemy;
  assert.equal(wantsWard(r.s, pup, hero), false, 'a howl pup goes for the hero');
  assert.equal(wantsWard(defenseRig().s, dog, hero), false, 'and before the defense starts, nobody goes for her');
});

test('targeting: with the hero away they go for her, and she takes the hits instead of him', () => {
  const r = defenseRig({ defense: { ...SMALL_DEFENSE, hp: 4000, waves: [{ at: 0, n: 3, type: 'demodog' }] } });
  hide(r);
  r.sim.defend();
  run(r.sim, 600);
  assert.ok((ward(r)?.hp ?? 4000) < 4000, 'she was hit');
  assert.equal(r.sim.stats().damageTaken, 0, 'and he was not');
  assert.ok(waveDogs(r).some((e) => e.onWard), 'locked on her');
});

test('targeting: Babysit holds them on Steve, so while it lasts she is not hit, and without it she is', () => {
  const play = (cast: boolean) => {
    const party = [{ id: 'steve' as const, level: 6 }, { id: 'mike' as const, level: 6 }];
    const defense = { ...SMALL_DEFENSE, hp: 4000, waves: [{ at: 0, n: 3, type: 'demodog' as const }] };
    const r = defenseRig({ seed: 3, defense, start: { x: tc(10), y: tf(5) } }, party);
    const steve = r.s.heroes[0]!;
    steve.st.hp = steve.hp = 4000;
    r.sim.defend();
    run(r.sim, 150);
    if (cast) { r.sim.step(inp({ specialPressed: true })); run(r.sim, 10); }
    const held = r.s.enemies.filter((e) => e.taunt > 0).length;
    const at = ward(r)?.hp as number;
    run(r.sim, 140);
    return { held, lost: at - (ward(r)?.hp as number) };
  };
  const control = play(false);
  assert.equal(control.held, 0);
  assert.ok(control.lost > 0, 'without it she is hit');
  const babysat = play(true);
  assert.ok(babysat.held >= 2, `${babysat.held} of them held`);
  assert.equal(babysat.lost, 0, 'with it she is not');
});

// ---------------------------------------------------------------- run-time spawns
test('run-time spawns: the defense\'s waves come up awake with dust, one XP each, from the burrows nearest the ward, in turn', () => {
  const r = defenseRig();
  r.sim.dev.god = true;
  r.sim.defend();
  const frames: { fx: { kind: string }[] }[] = [];
  for (let i = 0; i < 2; i++) { r.sim.step(inp()); frames.push({ fx: r.sim.view().fx }); }
  const dogs = waveDogs(r);
  assert.equal(dogs.length, 3);
  assert.ok(dogs.every((d) => !d.dormant && d.aware && d.xp === 1 && d.drop === 0 && d.group === 'defense' && d.kind === 'demodog'));
  assert.ok(frames.some((f) => f.fx.some((x) => x.kind === 'dust')));
  assert.equal(new Set(dogs.map((d) => d.id)).size, 3);
  // Eleven stands at (10, 4). The four burrows are (2, 2), (19, 2), (4, 6) and (17, 6), all within the span of the nearest.
  const spots = new Set(dogs.map((d) => `${Math.floor(d.hx / 16)},${Math.floor(d.hy / 16)}`));
  assert.equal(spots.size, 3, 'three different burrows, in turn');
  assert.equal(r.sim.view().actors.filter((a) => a.id === 'demodog').length, 3);
  run(r.sim, 480);
  assert.equal(r.s.enemies.filter((e) => e.rt === 'wave').length, 6, 'the second wave at 8 s');
  const elite = r.s.enemies.filter((e) => e.elite);
  assert.equal(elite.length, 0);
  run(r.sim, 600);
  const last = r.s.enemies.filter((e) => e.elite && e.rt === 'wave');
  assert.equal(last.length, 4, 'an elite wave at 18 s');
  assert.ok(last.every((e) => e.xp === 1), 'still one XP');
});

test('run-time spawns: the defense\'s waves keep the burrows far from the ward out of it', () => {
  const r = defenseRig({ burrows: [{ tx: 8, ty: 3 }, { tx: 12, ty: 3 }, { tx: 2, ty: 12 }, { tx: 20, ty: 12 }] });
  r.sim.defend();
  run(r.sim, 2);
  for (const d of waveDogs(r)) assert.ok(d.hy < tf(5), `a dog at ${d.hx}, ${d.hy}: only the two burrows by the rift`);
});

test('run-time spawns: they are never skipped, so a rebuilt sim with every id in skipSpawns still brings them all', () => {
  const first = defenseRig();
  first.sim.defend();
  run(first.sim, 500);
  const ids = first.s.enemies.filter((e) => e.rt !== null).map((e) => e.id);
  assert.ok(ids.length >= 6);
  const again = defenseRig({ skipSpawns: [...ids, 'eleven-not-an-id'] });
  again.sim.defend();
  run(again.sim, 500);
  assert.deepEqual(again.s.enemies.filter((e) => e.rt !== null).map((e) => e.id), ids, 'the same ones, made up the same way');

  // The howl too: with the pups' ids in the skip list the Alpha still calls three.
  const ar = alphaRig();
  onlyMove(ar, null);
  ar.sim.dev.god = true;
  ar.boss.hp = ar.boss.hpMax * 0.7;
  run(ar.sim, 5);
  const pups = ar.s.enemies.filter((e) => e.rt === 'howl').map((e) => e.id);
  assert.equal(pups.length, 3);
  const rebuilt = alphaRig({ skipSpawns: pups });
  onlyMove(rebuilt, null);
  rebuilt.boss.hp = rebuilt.boss.hpMax * 0.7;
  run(rebuilt.sim, 5);
  assert.equal(rebuilt.s.enemies.filter((e) => e.rt === 'howl').length, 3);
});

test('run-time spawns: with no burrows listed they come up on open floor round the Alpha or the ward', () => {
  const r = defenseRig({ burrows: [] });
  r.sim.defend();
  run(r.sim, 2);
  assert.equal(waveDogs(r).length, 3);
  for (const d of waveDogs(r)) assert.equal(footBlocked(r.s, d.hx, d.hy), false);
});

// ---------------------------------------------------------------- the bot
function defendWithBot(seed: number, party = defaultParty('2.3'), careless = false) {
  const waves = [[0, 3], [7, 3], [14, 4], [22, 3], [30, 4], [37, 3]] as const;
  const defense: DefenseDef = {
    npc: 'eleven', hp: 400, frames: 2700, prop: 'rift',
    waves: [...waves.map(([s, n]) => ({ at: s * 60, n, type: 'demodog' as const })), { at: 22 * 60, n: 1, type: 'demodog', tier: 'elite' }],
  };
  const r = defenseRig({ seed, defense, enemyMult: 1 }, party);
  const grid = arena(22, 14);
  const bot = createBot({ grid, waypoints: [{ x: tc(11), y: tf(7) }], careless });
  r.sim.defend();
  let result = 'time', near = 0, frames = 0, taunts = 0;
  const w = { x: tc(10), y: tf(4) };
  for (let f = 0; f < 3200; f++) {
    const ev = r.sim.step(bot.next(r.sim));
    frames++;
    const p = r.sim.heroPos();
    if (Math.hypot(p.x - w.x, p.y - w.y) <= 56) near++;
    if (sfxIds(ev).includes('taunt')) taunts++;
    if (ev.some((e) => e.t === 'defended')) { result = 'held'; break; }
    if (ev.some((e) => e.t === 'wardDown')) { result = 'fell'; break; }
    if (ev.some((e) => e.t === 'allDown')) { result = 'wiped'; break; }
  }
  return { result, near: near / frames, taunts, hp: ward(r)?.hp ?? 0 };
}

test('bot: in a small hall with the real waves it keeps Eleven alive on most seeds, and stays within reach of her', () => {
  const runs = Array.from({ length: 12 }, (_, i) => defendWithBot(i + 1));
  const alive = runs.filter((o) => o.result === 'held');
  assert.ok(alive.length >= 9, `held ${alive.length} of 12 (${runs.map((o) => o.result).join(', ')})`);
  assert.ok(runs.every((o) => o.result !== 'fell'), `Eleven fell in ${runs.filter((o) => o.result === 'fell').length}`);
  const near = runs.reduce((n, o) => n + o.near, 0) / runs.length;
  assert.ok(near > 0.85, `within 56 px of her ${(near * 100).toFixed(0)}% of the time`);
});

test('bot: with Steve in the party it casts Babysit when two or more are on her, and without him it still holds', () => {
  const withSteve = Array.from({ length: 8 }, (_, i) => defendWithBot(i + 1));
  assert.ok(withSteve.filter((o) => o.taunts > 0).length >= 6, `Babysit cast in ${withSteve.filter((o) => o.taunts > 0).length} of 8`);
  const party = [{ id: 'mike' as const, level: 6 }, { id: 'dustin' as const, level: 5 }, { id: 'lucas' as const, level: 5 }];
  const without = Array.from({ length: 8 }, (_, i) => defendWithBot(i + 1, party));
  assert.equal(without.reduce((n, o) => n + o.taunts, 0), 0);
  assert.ok(without.filter((o) => o.result === 'held').length >= 5, `held ${without.filter((o) => o.result === 'held').length} of 8`);
});
