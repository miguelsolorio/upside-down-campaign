// The clock curse and Max's Walkman (docs/level-11.md, "The curse" and "Max's Walkman"): who a chime takes, the four chimes, the cursed hero
// hanging in place, the ways out (the clock breaks, the Walkman plays), a party that runs out of heroes who can fight, and a clock that takes
// `hits` basic attacks from anyone without the riff. The bot under a curse is in tests/curse-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import { startCurse } from '../src/combat/curse.ts';
import { awayFrom } from '../src/combat/party.ts';
import type { Hero, S } from '../src/combat/state.ts';
import { inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
const clock = (id = 'clock1', tx = 12, extra: Partial<Extract<SimSpawn, { kind: 'prop' }>> = {}): SimSpawn =>
  ({ kind: 'prop', id, prop: 'clock', tx, ty: 3, w: 16, h: 32, ...extra });

/** A party of `ids` at Lv 6 in a hall with a grandfather clock at tile (12, 3), the first hero up. */
function rig(ids: HeroId[], over: Parameters<typeof makeWhite>[0] = {}) {
  return makeWhite({ party: ids.map((id) => ({ id, level: 6 })), start: { x: tc(6), y: tf(9) }, spawns: [clock()], ...over });
}
const cursed = (ev: SimEvent[]): string[] => ofType(ev, 'cursed').map((e) => e.hero);
const hud = (sim: Sim, i: number) => sim.view().hud.party[i];
const body = (sim: Sim, id: string) => sim.view().actors.find((a) => a.kind === 'hero' && a.id === id && a.anim !== 'ko');

test('the curse takes the active hero, chimes at once, and the party swaps away from them', () => {
  const { sim, s } = rig(['mike', 'dustin', 'lucas']);
  sim.curse?.('clock1');
  const ev = run(sim, 1);
  assert.deepEqual(ofType(ev, 'cursed'), [{ t: 'cursed', hero: 'mike' }]);
  assert.ok(sfxIds(ev).includes('chime'), 'the first chime is at once');
  assert.ok(sim.view().fx.some((f) => f.kind === 'chime'), 'and a ring comes off the clock');
  assert.deepEqual(ofType(ev, 'swap').map((e) => [e.from, e.to]), [['mike', 'dustin']], 'dustin is up');
  assert.equal(hud(sim, 0)?.curse, 1);
  assert.equal(hud(sim, 1)?.curse, undefined);
  const mike = body(sim, 'mike');
  assert.equal(mike?.curse, 1, 'the clock mark and its pip');
  assert.equal(mike?.z, 4, 'a little off the floor');
  assert.equal(hero(s, 0).ko, false);
});

test('four chimes 300 frames apart, 4 px higher each, and the fourth knocks the hero out like any KO', () => {
  const { sim } = rig(['mike', 'dustin', 'lucas']);
  sim.curse?.('clock1');
  run(sim, 1);
  const at = (n: number): { curse: number | undefined; z: number | undefined } => {
    run(sim, n);
    return { curse: hud(sim, 0)?.curse, z: body(sim, 'mike')?.z };
  };
  assert.deepEqual(at(298), { curse: 1, z: 4 }, 'after 299 frames it is still the first');
  assert.deepEqual(at(1), { curse: 2, z: 8 }, 'the second chimes on the 300th');
  assert.deepEqual(at(299), { curse: 2, z: 8 });
  assert.deepEqual(at(1), { curse: 3, z: 12 });
  const chimes: number[] = [];
  let ko: SimEvent[] = [];
  for (let f = 0; f < 301; f++) {
    const ev = sim.step(inp());
    if (sfxIds(ev).includes('chime')) chimes.push(f);
    if (ev.some((e) => e.t === 'heroKO')) ko = ev;
  }
  assert.deepEqual(chimes, [299], 'one more chime, the fourth, on the 900th frame');
  assert.deepEqual(ofType(ko, 'heroKO'), [{ t: 'heroKO', hero: 'mike' }]);
  assert.deepEqual(ofType(ko, 'curseEnd'), [{ t: 'curseEnd', hero: 'mike', how: 'ko' }]);
  assert.equal(hud(sim, 0)?.ko, true);
  assert.equal(hud(sim, 0)?.curse, undefined);
  assert.equal(sim.stats().kos, 1, 'it counts as a KO');
  run(sim, 600);
  assert.equal(ofType(run(sim, 1), 'cursed').length, 0, 'and the clock does not chime again');
});

test('the cursed hero hangs where the curse found them: no moving, no swap to them, no regen', () => {
  const { sim, s } = rig(['mike', 'dustin', 'lucas']);
  hero(s, 0).hp = 10; hero(s, 0).mp = 1;
  const { x, y } = hero(s, 0);
  sim.curse?.('clock1');
  run(sim, 1);
  run(sim, 90, inp({ mx: 1 }));
  assert.ok(hero(s, 1).x > x + 40, 'the party walked on');
  assert.equal(hero(s, 0).x, x);
  assert.equal(hero(s, 0).y, y);
  assert.equal(body(sim, 'mike')?.x, x, 'and he is drawn where he hung');
  assert.equal(hero(s, 0).hp, 10, 'no regen on the bench');
  assert.equal(hero(s, 0).mp, 1);
  // Nobody can swap to him, by slot or by cycling.
  assert.deepEqual(ofType(press(sim, { swapTo: 0 }, 30), 'swap'), []);
  assert.equal(s.active, 1);
  const cycled = ofType(press(sim, { swapDelta: -1 }, 30), 'swap');
  assert.deepEqual(cycled.map((e) => e.to), ['lucas'], 'backwards from dustin skips him and lands on lucas');
});

test('who the curse takes: not Eddie or Max, the next standing hero in party order who is neither', () => {
  const who = (ids: HeroId[], up = 0, ko: number[] = []): string[] => {
    const { sim, s } = rig(ids);
    if (up > 0) { sim.step(inp({ swapTo: up })); run(sim, 30); }
    for (const i of ko) { hero(s, i).ko = true; hero(s, i).hp = 0; }
    sim.curse?.('clock1');
    return cursed(run(sim, 1));
  };
  assert.deepEqual(who(['mike', 'dustin']), ['mike'], 'the active hero');
  assert.deepEqual(who(['eddie', 'mike', 'dustin']), ['mike'], 'Eddie is spared');
  assert.deepEqual(who(['max', 'dustin', 'eddie', 'mike']), ['dustin'], 'Max is too');
  assert.deepEqual(who(['mike', 'max', 'eddie', 'dustin'], 1), ['dustin'], 'from Max on, skipping Eddie, not back to Mike');
  assert.deepEqual(who(['eddie', 'mike', 'dustin'], 0, [1]), ['dustin'], 'a hero who is down is skipped');
  assert.deepEqual(who(['mike', 'max']), ['mike'], 'Max stays on the bench');
  // Nothing when it would take the last hero standing.
  assert.deepEqual(who(['mike']), []);
  assert.deepEqual(who(['eddie', 'max']), [], 'nobody to take but the two it spares');
  assert.deepEqual(who(['eddie', 'max', 'mike']), ['mike']);
  assert.deepEqual(who(['mike', 'dustin'], 0, [1]), [], 'the last one standing');
});

test('nothing happens for a clock that is broken, one that has chimed, or a prop that is not a clock', () => {
  const { sim } = makeWhite({ party: [{ id: 'mike' }, { id: 'dustin' }], spawns: [clock(), clock('clock2', 14), { kind: 'prop', id: 'log', prop: 'log', tx: 5, ty: 5 }] });
  sim.curse?.('nothing');
  sim.curse?.('log');
  sim.openProp('clock2');
  sim.curse?.('clock2');
  assert.deepEqual(cursed(run(sim, 2)), [], 'a broken clock and the rest do not chime');
  sim.curse?.('clock1');
  assert.deepEqual(cursed(run(sim, 1)), ['mike']);
  sim.openProp('clock1');
  run(sim, 5);
  sim.curse?.('clock1');
  assert.deepEqual(cursed(run(sim, 1)), [], 'a clock that has chimed never chimes again');
});

test('a party that runs out of heroes who can fight is down: the cursed ones cannot be swapped to', () => {
  const two = rig(['mike', 'dustin']);
  two.sim.curse?.('clock1');
  run(two.sim, 1);
  assert.equal(two.s.active, 1);
  hero(two.s, 1).hp = 0;
  const ev = run(two.sim, 3);
  assert.ok(ev.some((e) => e.t === 'allDown'), 'dustin falls with mike still hanging');
  const three = rig(['mike', 'dustin', 'lucas']);
  three.sim.curse?.('clock1');
  run(three.sim, 1);
  hero(three.s, 1).hp = 0;
  const swaps = ofType(run(three.sim, 3), 'swap');
  assert.deepEqual(swaps.map((e) => e.to), ['lucas'], 'with a third he swaps to lucas, not to the one hanging');
  // A wipe ends the curse: getting up from it leaves nobody hanging.
  two.sim.healParty(1);
  assert.equal(hud(two.sim, 0)?.curse, undefined);
  assert.equal(body(two.sim, 'mike')?.z, 0);
  assert.equal(hud(two.sim, 0)?.ko, false);
});

test('the chime gap is a parameter: a curse can chime every 60 frames', () => {
  const { sim, s } = rig(['mike', 'dustin']);
  const h = startCurse(s, 'clock1', 60);
  assert.equal(h, hero(s, 0));
  awayFrom(s);
  const seen: number[] = [];
  let koAt = -1;
  for (let f = 1; f <= 260; f++) {
    const ev = sim.step(inp());
    if (sfxIds(ev).includes('chime')) seen.push(f);
    if (ev.some((e) => e.t === 'heroKO') && koAt < 0) koAt = f;
  }
  assert.deepEqual(seen, [1, 60, 120, 180], 'the first at once, then every 60 frames');
  assert.equal(koAt, 180, 'and the fourth knocks him out');
});

// ------------------------------------------------------------------ the ways out

/** Eddie up, Mike cursed, and Eddie stood where his swing reaches the clock. */
function eddieRig(extra: Partial<Extract<SimSpawn, { kind: 'prop' }>> = {}) {
  const r = rig(['eddie', 'mike', 'dustin'], { spawns: [clock('clock1', 12, extra)] });
  r.sim.curse?.('clock1');
  run(r.sim, 1);
  r.sim.dev.teleport(tc(12), 96);
  return r;
}

test('breaking the clock that chimed lifts the curse at once: the hero floats down and is back on the bench as they were', () => {
  const r = eddieRig();
  const hpBefore = hero(r.s, 1).hp;
  assert.equal(hero(r.s, 1).ko, false);
  run(r.sim, 100);
  assert.equal(hud(r.sim, 1)?.curse, 1);
  const ev = press(r.sim, { attackPressed: true, my: -0.2 }, 20);
  assert.deepEqual(ofType(ev, 'curseEnd'), [{ t: 'curseEnd', hero: 'mike', how: 'clock' }]);
  assert.equal(hud(r.sim, 1)?.curse, undefined);
  assert.equal(r.s.props[0]?.state, 'open');
  assert.equal(r.s.props[0]?.solid, true, 'the clock is smashed and still solid');
  assert.equal(body(r.sim, 'mike')?.curse, undefined);
  run(r.sim, 20);
  assert.equal(body(r.sim, 'mike')?.z, 0, 'he floated down');
  assert.equal(hero(r.s, 1).hp, hpBefore);
  assert.deepEqual(ofType(press(r.sim, { swapTo: 1 }, 1), 'swap').map((e) => e.to), ['mike'], 'and the party can swap to him again');
  // It never chimes again.
  r.sim.curse?.('clock1');
  assert.deepEqual(cursed(run(r.sim, 2)), []);
  assert.equal(ofType(run(r.sim, 1000), 'heroKO').length, 0, 'and the curse that was lifted never knocks anyone out');
});

test('the riff breaks the clock at once, even one that asks for hits; the ring and the solo reach it too', () => {
  const swing = eddieRig({ hits: 3 });
  assert.equal(ofType(press(swing.sim, { attackPressed: true, my: -0.2 }, 20), 'curseEnd').length, 1, 'one swing');
  const solo = eddieRig();
  solo.sim.dev.teleport(tc(12), 120);
  hero(solo.s, 0).mp = 18;
  const ev = press(solo.sim, { specialPressed: true }, 60);
  assert.deepEqual(ofType(ev, 'curseEnd').map((e) => e.how), ['clock'], 'a pulse of the solo');
});

test('a clock that takes `hits` breaks under that many basic attacks from up close by a hero without the riff, and not before', () => {
  // Max is up, Mike is cursed.
  const r = rig(['max', 'mike', 'dustin'], { spawns: [clock('clock1', 12, { hits: 3 })] });
  r.sim.curse?.('clock1');
  run(r.sim, 1);
  assert.equal(hud(r.sim, 1)?.curse, 1);
  // From 40 px away, or facing away, an attack is not a hit.
  r.sim.dev.teleport(tc(12), 80 + 40);
  const far = press(r.sim, { attackPressed: true, my: -0.2 }, 30);
  assert.equal(ofType(far, 'curseEnd').length, 0);
  r.sim.dev.teleport(tc(12), 96);
  press(r.sim, { attackPressed: true, my: 0.2 }, 30);
  assert.equal(r.s.props[0]?.struck, 0, 'swung the other way');
  // Up close and aimed at it, each swing counts, and the third breaks it.
  const out: SimEvent[][] = [];
  for (let n = 1; n <= 3; n++) {
    out.push(press(r.sim, { attackPressed: true, my: -0.2 }, 30));
    assert.equal(r.s.props[0]?.struck, n, `after ${n}`);
  }
  assert.deepEqual(out.map((ev) => ofType(ev, 'curseEnd').length), [0, 0, 1], 'the third lifts the curse');
  assert.deepEqual(ofType(out[2]!, 'propCleared').map((e) => e.propId), ['clock1']);
});

test('a clock with no `hits` is broken by nobody but the riff: Mike\'s swings are tries', () => {
  const r = makeWhite({ party: [{ id: 'mike' }], start: { x: tc(12), y: 96 }, spawns: [clock()] });
  let poked = 0;
  for (let n = 0; n < 4; n++) poked += ofType(press(r.sim, { attackPressed: true, my: -0.2 }, 50), 'poked').length;
  assert.ok(poked >= 1, 'it is a try');
  assert.equal(r.s.props[0]?.state, 'closed');
});

test('only the clock that chimed lifts its curse', () => {
  const r = rig(['mike', 'dustin', 'lucas'], { spawns: [clock('clock1', 12), clock('clock2', 14)] });
  r.sim.curse?.('clock1');
  run(r.sim, 1);
  r.sim.openProp('clock2');
  assert.equal(ofType(run(r.sim, 2), 'curseEnd').length, 0);
  assert.equal(hud(r.sim, 0)?.curse, 1);
  r.sim.openProp('clock1');
  assert.deepEqual(ofType(run(r.sim, 1), 'curseEnd').map((e) => e.how), ['clock']);
});

// ------------------------------------------------------------------ Max's Walkman

test('the Walkman: a swap to Max while it is ready plays it, ends every curse and keeps the party safe for 480 frames', () => {
  const r = rig(['mike', 'max', 'dustin'], { walkman: true, spawns: [clock(), clock('clock2', 14)] });
  assert.deepEqual(r.sim.view().hud.walkman, { ready: 1, on: 0 });
  r.sim.curse?.('clock1');
  const forced = run(r.sim, 1);
  assert.deepEqual(ofType(forced, 'swap').map((e) => e.to), ['max'], 'the forced swap after the curse lands on Max');
  assert.equal(ofType(forced, 'walkman').length, 0, 'and a forced swap does not play it');
  assert.equal(hud(r.sim, 0)?.curse, 1);
  // Away and back by a quick swap.
  press(r.sim, { swapTo: 2 }, 12);
  const ev = press(r.sim, { swapTo: 1 });
  assert.deepEqual(ofType(ev, 'walkman'), [{ t: 'walkman' }]);
  assert.ok(sfxIds(ev).includes('walkman'));
  assert.deepEqual(ofType(ev, 'curseEnd'), [{ t: 'curseEnd', hero: 'mike', how: 'walkman' }]);
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'walkman'), 'notes round her');
  assert.equal(hud(r.sim, 0)?.curse, undefined);
  assert.deepEqual(r.sim.view().hud.walkman, { ready: 0, on: 480 });
  // 480 frames in which no hero can be cursed.
  run(r.sim, 100);
  r.sim.curse?.('clock2');
  assert.deepEqual(cursed(run(r.sim, 1)), [], 'while it plays, a clock does nothing');
  assert.deepEqual(r.sim.view().hud.walkman, { ready: 101 / 1800, on: 379 });
  run(r.sim, 380);
  assert.equal(r.sim.view().hud.walkman?.on, 0);
  r.sim.curse?.('clock2');
  assert.deepEqual(cursed(run(r.sim, 1)), ['dustin'], 'then the next chime curses the next hero after Max');
});

test('the Walkman is ready again 1800 frames after it played, not before', () => {
  const r = rig(['mike', 'max', 'dustin'], { walkman: true });
  assert.equal(ofType(press(r.sim, { swapTo: 1 }), 'walkman').length, 1, 'the first swap to Max plays it');
  run(r.sim, 20);
  press(r.sim, { swapTo: 2 }, 12);
  assert.equal(ofType(press(r.sim, { swapTo: 1 }), 'walkman').length, 0, 'cooling down');
  const ready = r.sim.view().hud.walkman?.ready ?? 0;
  assert.ok(ready > 0 && ready < 0.1, `charging: ${ready}`);
  run(r.sim, 1800);
  assert.equal(r.sim.view().hud.walkman?.ready, 1, 'charged');
  press(r.sim, { swapTo: 2 }, 12);
  assert.equal(ofType(press(r.sim, { swapTo: 1 }), 'walkman').length, 1, 'and it plays again');
});

test('the Walkman is on the HUD only when the party has it and Max is in it, and a story beat can give it', () => {
  assert.equal(rig(['mike', 'max'], { walkman: false }).sim.view().hud.walkman, null, 'not yet given');
  assert.equal(rig(['mike', 'dustin'], { walkman: true }).sim.view().hud.walkman, null, 'no Max');
  const r = rig(['mike', 'max']);
  r.sim.giveWalkman?.();
  assert.deepEqual(r.sim.view().hud.walkman, { ready: 1, on: 0 });
  assert.equal(ofType(press(r.sim, { swapTo: 1 }, 1), 'walkman').length, 1, 'and it plays');
  const none = rig(['mike', 'max']);
  assert.equal(ofType(press(none.sim, { swapTo: 1 }, 1), 'walkman').length, 0, 'no Walkman, no music');
});
