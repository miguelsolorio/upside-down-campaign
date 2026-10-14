import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedGain, HERO_DEFS } from '../src/heroes/index.ts';
import { POINT_VALUE, STAT_KEYS, xpToNext } from '../src/progression/index.ts';
import { agent, arena, inp, makeSim, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { footBlocked } from '../src/combat/space.ts';
import { hurtHero } from '../src/combat/damage.ts';
import type { SimSpawn, SimEvent, Sim, LevelUpInfo } from '../src/core/types.ts';
import { SWAP_COOLDOWN, SWAP_LOCK } from '../src/combat/party.ts';

const levelUps = (ev: SimEvent[]): LevelUpInfo[] => ofType(ev, 'levelUp').map((e) => e.info);
const activeId = (sim: Sim): string => sim.view().hud.party.find((p) => p.active)?.id ?? '';

test('swap: swapDelta and swapTo change the active hero, and the party cycles quickly', () => {
  const sim = makeSim();
  assert.equal(activeId(sim), 'mike');
  const ev = press(sim, { swapDelta: 1 }, 1);
  const sw = ofType(ev, 'swap');
  assert.equal(sw.length, 1);
  assert.deepEqual([sw[0]?.from, sw[0]?.to], ['mike', 'dustin']);
  assert.ok(sfxIds(ev).includes('swap'));
  assert.equal(activeId(sim), 'dustin');
  // A request right behind it waits out the short lock and lands. It does not wait for the 90-frame cooldown.
  press(sim, { swapDelta: 1 }, SWAP_LOCK + 2);
  assert.equal(activeId(sim), 'lucas');
  // swapDelta wraps and goes backwards, and swapTo picks a slot.
  press(sim, { swapDelta: 1 }, SWAP_LOCK + 2);
  assert.equal(activeId(sim), 'mike');
  press(sim, { swapDelta: -1 }, SWAP_LOCK + 2);
  assert.equal(activeId(sim), 'lucas');
  press(sim, { swapTo: 1 }, SWAP_LOCK + 2);
  assert.equal(activeId(sim), 'dustin');
  // Swapping to the active hero or an empty slot does nothing.
  press(sim, { swapTo: 1 }, 1);
  press(sim, { swapTo: 3 }, 1);
  assert.equal(activeId(sim), 'dustin');
});

test('swap: a tap every few frames walks the whole party, one hero a tap once the lock is over', () => {
  const sim = makeSim();
  const seen: string[] = [activeId(sim)];
  for (let i = 0; i < 6; i++) {
    press(sim, { swapDelta: 1 }, SWAP_LOCK);
    seen.push(activeId(sim));
  }
  assert.deepEqual(seen, ['mike', 'dustin', 'lucas', 'mike', 'dustin', 'lucas', 'mike']);
});

test('swap: the HUD reports how recharged the swap is, from 0 up to 1 over the cooldown', () => {
  const sim = makeSim();
  const ready = (): number => sim.view().hud.swapReady;
  assert.equal(ready(), 1, 'ready at the start');
  press(sim, { swapDelta: 1 }, 1);
  assert.ok(ready() < 0.05, `just swapped: ${ready()}`);
  run(sim, 44);
  const half = ready();
  assert.ok(half > 0.4 && half < 0.6, `halfway: ${half}`);
  run(sim, 50);
  assert.equal(ready(), 1, 'ready again after 90 frames');
});

test('swap: the incoming hero is invulnerable for 20 frames and lands a shockwave', () => {
  const sim = makeSim({ spawns: [agent('a', 5, 8, 'g')], seed: 9 });
  let blinks = 0, lastBlink = -1;
  const evs: SimEvent[] = [];
  evs.push(...sim.step(inp({ swapDelta: 1 })));
  for (let f = 1; f < 40; f++) {
    evs.push(...sim.step(inp()));
    const me = sim.view().actors.find((a) => a.kind === 'hero' && a.blink);
    if (me) { blinks++; lastBlink = f; }
  }
  assert.ok(blinks > 5, `blinked ${blinks} frames`);
  assert.ok(lastBlink <= 21, `still blinking at ${lastBlink}`);
  const hits = ofType(evs, 'hit').filter((h) => h.onEnemy);
  assert.ok(hits.length >= 1, 'the shockwave hit the agent next to the hero');
  assert.ok(sim.view().actors.some((a) => a.kind === 'enemy' && a.bar !== null));
});

test('swap: only a swap after the full cooldown brings the invulnerability and shockwave', () => {
  const { sim, s } = makeWhite({ spawns: [agent('a', 5, 8, 'g')], seed: 9 });
  const me = (): { invuln: number } => s.heroes[s.active] as { invuln: number };
  const first = press(sim, { swapDelta: 1 }, 1);
  assert.ok(me().invuln > 0, 'the first swap is invulnerable');
  first.push(...run(sim, 12));
  assert.ok(ofType(first, 'hit').some((h) => h.onEnemy), 'and lands a shockwave on the agent beside it');
  // A quick swap lands at once but brings neither, and does not restart the cooldown.
  const quick = press(sim, { swapDelta: 1 }, 14);
  assert.equal(activeId(sim), 'lucas');
  assert.equal(me().invuln, 0, 'a quick swap brings no invulnerability');
  assert.equal(ofType(quick, 'hit').filter((h) => h.onEnemy).length, 0, 'and no shockwave');
  assert.ok(s.swapCd < SWAP_COOLDOWN - 20, `the cooldown kept running: ${s.swapCd}`);
  // Once the cooldown has run out, a swap is the full one again.
  run(sim, SWAP_COOLDOWN);
  press(sim, { swapDelta: 1 }, 1);
  assert.ok(me().invuln > 0, 'a swap after the cooldown is invulnerable again');
});

test('the bench trails the active hero as followers with no collision', () => {
  const sim = makeSim({ start: { x: tc(3), y: tf(8) } });
  run(sim, 100, inp({ mx: 1 }));
  const heroes = sim.view().actors.filter((a) => a.kind === 'hero');
  assert.equal(heroes.length, 3);
  const lead = sim.heroPos();
  const others = heroes.filter((h) => Math.abs(h.x - lead.x) > 0.01);
  assert.equal(others.length, 2);
  for (const o of others) {
    assert.ok(o.x < lead.x - 5 && o.x > tc(3), `follower at ${o.x}, lead ${lead.x}`);
    assert.equal(o.anim, 'walk');
  }
  run(sim, 120);
  for (const h of sim.view().actors.filter((a) => a.kind === 'hero')) assert.equal(h.anim, 'idle');
});

/** The leader's feet, and the feet of every hero who is not standing exactly on them. */
function standing(sim: Sim): { lead: { x: number; y: number }; others: { x: number; y: number }[] } {
  const lead = sim.heroPos();
  const others = sim.view().actors.filter((a) => a.kind === 'hero').map((a) => ({ x: a.x, y: a.y }))
    .filter((q) => Math.hypot(q.x - lead.x, q.y - lead.y) > 0.01);
  return { lead, others };
}

test('stopping: nobody steps back. Walking or standing they keep the same gap, and the ones further back only close up', () => {
  const sim = makeSim({ start: { x: tc(5), y: tf(8) } });
  const others = (): { id: string; x: number; y: number }[] => {
    const active = sim.view().hud.party.find((m) => m.active)?.id;
    return sim.view().actors.filter((a) => a.kind === 'hero' && a.id !== active).map((a) => ({ id: a.id, x: a.x, y: a.y }));
  };
  const gapOf = (f: { x: number; y: number }): number => Math.hypot(f.x - sim.heroPos().x, f.y - sim.heroPos().y);
  // A steady walk right. The nearest follower already keeps its gap (14 px) rather than the 11 px his trail would give.
  run(sim, 120, inp({ mx: 1 }));
  const walking = others().map(gapOf).sort((p, q) => p - q);
  assert.ok(walking[0]! >= 13.5 && walking[0]! <= 17, `the nearest follower walks ${walking[0]!.toFixed(1)} px behind`);
  // He stops. For the next three seconds no follower may move away from him or back along where he came from.
  let prev = others();
  let moves = 0;
  for (let f = 0; f < 180; f++) {
    sim.step(inp());
    const now = others();
    for (const o of now) {
      const before = prev.find((q) => q.id === o.id)!;
      assert.ok(o.x >= before.x - 1e-6, `frame ${f}: ${o.id} stepped back from ${before.x.toFixed(2)} to ${o.x.toFixed(2)}`);
      assert.ok(gapOf(o) <= gapOf(before) + 1e-6, `frame ${f}: ${o.id} moved away from the standing leader (${gapOf(before).toFixed(2)} to ${gapOf(o).toFixed(2)})`);
      if (Math.hypot(o.x - before.x, o.y - before.y) > 0.01) moves++;
    }
    prev = now;
  }
  const rest = others().map(gapOf).sort((p, q) => p - q);
  assert.ok(rest[0]! >= 13.5, `the nearest follower stops ${rest[0]!.toFixed(1)} px behind, not on top of him`);
  assert.ok(rest[1]! >= 18.5, `and the next one ${rest[1]!.toFixed(1)} px behind`);
  assert.ok(rest[1]! <= 24, 'close enough to stack up behind him');
  assert.ok(moves > 0, 'the one further back did still close up');
});

test('standing still: the followers wait just behind the leader, stacked close together, and never on top of him', () => {
  const sim = makeSim({ start: { x: tc(5), y: tf(8) } });
  run(sim, 60, inp({ mx: 1 }));
  run(sim, 200);
  const { lead, others } = standing(sim);
  assert.equal(others.length, 2, 'neither follower is hidden on his feet');
  for (const o of others) {
    assert.ok(o.x < lead.x - 10 && o.x > lead.x - 30, `a follower at ${o.x.toFixed(1)} should be close behind (left of) the leader at ${lead.x.toFixed(1)}`);
    assert.ok(Math.abs(o.y - lead.y) < 3, 'in a line with him');
  }
  assert.ok(Math.abs(others[0]!.x - others[1]!.x) <= 12, 'and stacked against each other');
});

test('standing still: "behind" is the way he walked, whichever of the four that was', () => {
  const cases: [string, Partial<Parameters<typeof inp>[0]>, (o: { x: number; y: number }, l: { x: number; y: number }) => boolean][] = [
    ['right', { mx: 1 }, (o, l) => o.x < l.x - 10 && Math.abs(o.y - l.y) < 3],
    ['left', { mx: -1 }, (o, l) => o.x > l.x + 10 && Math.abs(o.y - l.y) < 3],
    ['down', { my: 1 }, (o, l) => o.y < l.y - 10 && Math.abs(o.x - l.x) < 3],
    ['up', { my: -1 }, (o, l) => o.y > l.y + 10 && Math.abs(o.x - l.x) < 3],
  ];
  for (const [name, input, behind] of cases) {
    const sim = makeSim({ start: { x: tc(12), y: tf(8) } });
    run(sim, 40, inp(input));
    run(sim, 200);
    const { lead, others } = standing(sim);
    assert.equal(others.length, 2, `walked ${name}: nobody is on his feet`);
    for (const o of others) assert.ok(behind(o, lead), `walked ${name}: a follower at ${o.x.toFixed(1)},${o.y.toFixed(1)} is not behind the leader at ${lead.x.toFixed(1)},${lead.y.toFixed(1)}`);
    for (const h of sim.view().actors.filter((a) => a.kind === 'hero')) assert.equal(h.anim, 'idle', `walked ${name}: everyone has stopped walking`);
    for (const h of sim.view().actors.filter((a) => a.kind === 'hero')) assert.equal(h.dir, name, `walked ${name}: everyone faces that way`);
  }
});

test('standing still: a knockback does not change which side is behind him', () => {
  const { sim, s } = makeWhite({ start: { x: tc(12), y: tf(8) } });
  run(sim, 40, inp({ mx: 1 }));
  run(sim, 100);
  const lead = s.heroes[0]!;
  hurtHero(s, lead, lead.x + 20, lead.y, 1, 10);
  run(sim, 120);
  const { lead: at, others } = standing(sim);
  assert.equal(others.length, 2);
  for (const o of others) assert.ok(o.x < at.x - 10, `a follower at ${o.x.toFixed(1)} should still be left of the leader at ${at.x.toFixed(1)}`);
});

test('standing still: they walk to their spots at a steady pace and never sprint, even after a swap', () => {
  const sim = makeSim({ start: { x: tc(12), y: tf(8) } });
  const last = new Map<string, { x: number; y: number }>();
  let fastest = 0;
  const watch = (): void => {
    for (const a of sim.view().actors.filter((q) => q.kind === 'hero')) {
      const before = last.get(a.id);
      if (before && a.id !== sim.view().hud.party.find((m) => m.active)?.id) fastest = Math.max(fastest, Math.hypot(a.x - before.x, a.y - before.y));
      last.set(a.id, { x: a.x, y: a.y });
    }
  };
  const go = (n: number, input = inp()): void => { for (let i = 0; i < n; i++) { sim.step(input); watch(); } };
  go(60, inp({ mx: 1 }));
  go(80);
  press(sim, { swapDelta: 1 });
  last.clear();
  go(120);
  go(40, inp({ my: 1 }));
  go(80);
  assert.ok(fastest <= 2.01, `a follower moved ${fastest.toFixed(2)} px in one frame`);
});

test('standing against a wall or in a one-tile corridor: nobody rests inside a wall or on top of him', () => {
  // Against the west wall, with "behind" being that wall: they take the free spots beside him instead.
  const wall = makeWhite({ start: { x: tc(1), y: tf(8) } });
  run(wall.sim, 200);
  for (const h of wall.s.heroes) assert.ok(!footBlocked(wall.s, h.x, h.y), `${h.id} is standing in the wall at ${h.x.toFixed(1)},${h.y.toFixed(1)}`);
  const w = standing(wall.sim);
  assert.equal(w.others.length, 2);
  assert.ok(w.others.every((o) => Math.hypot(o.x - w.lead.x, o.y - w.lead.y) >= 8), 'and none of them is hidden on his feet');

  // A corridor one tile wide, running north and south, walked up: behind him is open, and nobody is in a wall.
  const marks: Record<string, string> = {};
  for (let y = 2; y <= 13; y++) { marks[`9,${y}`] = 'T'; marks[`11,${y}`] = 'T'; }
  const hall = makeWhite({ grid: arena(24, 16, marks), start: { x: tc(10), y: tf(10) } });
  run(hall.sim, 60, inp({ my: -1 }));
  run(hall.sim, 200);
  for (const h of hall.s.heroes) assert.ok(!footBlocked(hall.s, h.x, h.y), `${h.id} is inside the corridor wall at ${h.x.toFixed(1)},${h.y.toFixed(1)}`);
  const c = standing(hall.sim);
  assert.ok(c.others.length === 2 && c.others.every((o) => o.y > c.lead.y + 10), 'they wait behind him, down the corridor');
});

test('standing still, then walking again: the followers leave their spots and trail him', () => {
  const sim = makeSim({ start: { x: tc(5), y: tf(8) } });
  run(sim, 100);
  run(sim, 90, inp({ mx: 1 }));
  const { lead, others } = standing(sim);
  assert.equal(others.length, 2);
  for (const o of others) {
    assert.ok(o.x < lead.x - 5, `a follower at ${o.x.toFixed(1)} should be behind the leader at ${lead.x.toFixed(1)}`);
    assert.ok(Math.abs(o.y - lead.y) < 6, 'on his path');
  }
  assert.ok(sim.view().actors.filter((a) => a.kind === 'hero' && Math.abs(a.x - lead.x) > 0.01).every((a) => a.anim === 'walk'));
});

test('KO: hp 0 drops the hero, the next living hero swaps in, and the last KO ends the run', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike' }, { id: 'dustin' }] });
  const h0 = s.heroes[0];
  assert.ok(h0);
  h0.hp = 0;
  let ev = sim.step(inp());
  assert.ok(ofType(ev, 'heroKO').some((e) => e.hero === 'mike'));
  assert.ok(ofType(ev, 'swap').some((e) => e.from === 'mike' && e.to === 'dustin'), 'auto-swap');
  assert.equal(activeId(sim), 'dustin');
  assert.equal(sim.view().hud.party[0]?.ko, true);
  assert.equal(sim.party()[0]?.hp, 0);
  assert.equal(sim.stats().kos, 1);
  assert.equal(ofType(ev, 'allDown').length, 0);
  // The KO'd hero lies where it fell and is no longer a follower.
  assert.ok(sim.view().actors.some((a) => a.kind === 'hero' && a.id === 'mike' && a.anim === 'ko'));
  (s.heroes[1] as { hp: number }).hp = 0;
  // The KO freezes the action for a few ticks (hit-stop), so the next one is noticed a moment later.
  ev = run(sim, 8, inp());
  assert.equal(ofType(ev, 'allDown').length, 1);
  assert.deepEqual(run(sim, 30, inp({ mx: 1, attackHeld: true })).filter((e) => e.t !== 'sfx'), []);
  // A light heals and revives everyone.
  sim.healParty(1);
  assert.ok(sim.party().every((p) => p.hp === p.hpMax));
  assert.ok(sim.view().hud.party.every((p) => !p.ko));
  run(sim, 5, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > tc(4), 'the party can move again');
});

test('KO by damage: a hero standing in front of three upside-down agents goes down', () => {
  const sim = makeSim({
    party: [{ id: 'eleven' }, { id: 'dustin' }],
    difficulty: 'upside',
    spawns: [agent('a1', 8, 7, 'g'), agent('a2', 8, 9, 'g'), agent('a3', 9, 8, 'g')],
    seed: 21,
  });
  let ko = false, down = false;
  for (let f = 0; f < 6000 && !down; f++) {
    const ev = sim.step(inp());
    if (ofType(ev, 'heroKO').length) ko = true;
    if (ofType(ev, 'allDown').length) down = true;
  }
  assert.ok(ko && down, 'both heroes fell');
  assert.equal(sim.stats().kos, 2);
});

test('recruit: joins at the party average level minus one, min 1, and removes the npc', () => {
  const npc: SimSpawn = { kind: 'npc', id: 'eleven', tx: 6, ty: 8, dir: 'left' };
  const sim = makeSim({
    party: [{ id: 'mike', level: 3 }, { id: 'dustin', level: 3 }, { id: 'lucas', level: 3 }],
    spawns: [npc],
  });
  assert.ok(sim.view().actors.some((a) => a.kind === 'npc' && a.id === 'eleven'));
  sim.recruit('eleven');
  const p = sim.party();
  assert.equal(p.length, 4);
  assert.deepEqual([p[3]?.id, p[3]?.level, p[3]?.xp], ['eleven', 2, 0]);
  assert.ok(!sim.view().actors.some((a) => a.kind === 'npc'));
  assert.equal(sim.view().hud.party.length, 4);
  sim.recruit('eleven');
  assert.equal(sim.party().length, 4, 'no duplicates');
  const low = makeSim({ spawns: [npc] });
  low.recruit('eleven');
  assert.equal(low.party()[3]?.level, 1, 'never below level 1');
  // Rounded average: 3, 3, 2 gives 2.67, which rounds to 3, minus one is 2.
  const mixed = makeSim({ party: [{ id: 'mike', level: 3 }, { id: 'dustin', level: 3 }, { id: 'lucas', level: 2 }] });
  mixed.recruit('eleven');
  assert.equal(mixed.party()[3]?.level, 2);
  run(mixed, 3, inp({ swapTo: 3 }));
  assert.equal(activeId(mixed), 'eleven');
});

test('XP: the active hero gets full XP from a kill, the bench gets half', () => {
  const sim = makeSim({ spawns: [rat('r', 20, 12, 'far')] });
  const ev: SimEvent[] = [];
  sim.dev.killAll();
  ev.push(...sim.step(inp()));
  const kill = ofType(ev, 'kill');
  assert.equal(kill.length, 1);
  assert.equal(kill[0]?.xp, 4);
  assert.equal(kill[0]?.kind, 'rat');
  assert.equal(kill[0]?.spawnId, 'r');
  assert.equal(kill[0]?.group, 'far');
  assert.deepEqual(sim.party().map((p) => p.xp), [4, 2, 2]);
  assert.equal(sim.stats().xpEarned, 4);
  assert.equal(sim.stats().kills, 1);
  assert.deepEqual(sim.stats().killsByKind, { rat: 1 });
});

test('level-up: heals, applies fixed growth plus the d20 bonus, and reports it', () => {
  const sim = makeSim({ seed: 3 });
  const before = sim.party()[0];
  assert.ok(before);
  sim.dev.giveXp(18);
  const ev = sim.step(inp());
  const info = levelUps(ev);
  assert.equal(info.length, 1, 'only the active hero crossed 18 XP');
  const i = info[0] as LevelUpInfo;
  assert.deepEqual([i.hero, i.from, i.to], ['mike', 1, 2]);
  assert.ok(i.roll >= 1 && i.roll <= 20);
  assert.equal(i.talent, null);
  const fixed = fixedGain(HERO_DEFS.mike, 1);
  let bonusUnits = 0;
  for (const k of STAT_KEYS) {
    const g = i.gains[k] ?? 0;
    assert.ok(g >= fixed[k], `${k} gain ${g} below fixed ${fixed[k]}`);
    bonusUnits += (g - fixed[k]) / POINT_VALUE[k];
  }
  assert.equal(bonusUnits, i.roll >= 20 ? 5 : Math.floor(i.roll / 5));
  const after = sim.party()[0];
  assert.equal(after?.level, 2);
  assert.equal(after?.hpMax, (before.hpMax) + (i.gains.hp ?? 0));
  assert.equal(after?.xp, 0);
  assert.deepEqual(sim.stats().levelUps, [{ hero: 'mike', from: 1, to: 2 }]);
  assert.equal(sim.party()[1]?.xp, 9, 'the bench got half');
});

test('level-up: it chimes and floats LEVEL UP over the hero in the same tick, with nothing for the player to dismiss', () => {
  const sim = makeSim({ seed: 3 });
  sim.dev.giveXp(18);
  const ev = sim.step(inp());
  assert.equal(levelUps(ev).length, 1);
  assert.ok(sfxIds(ev).includes('levelUp'), 'the chime comes from the sim, so the play scene needs no screen to play it');
  assert.ok(sim.view().floaters.some((f) => f.text === 'LEVEL UP'));
  // The sim keeps running on its own, so the effect can play while the player moves.
  const before = sim.view().focus.x;
  run(sim, 30, inp({ mx: 1 }));
  assert.ok(sim.view().focus.x > before, 'the hero moved on after the level-up');
});

test('level-up: two levels in one tick report both but float a single LEVEL UP', () => {
  const sim = makeSim({ seed: 3 });
  sim.dev.giveXp(76);
  const ev = sim.step(inp());
  const ups = levelUps(ev);
  assert.deepEqual(ups.filter((u) => u.hero === 'mike').map((u) => u.to), [2, 3]);
  const heroes = new Set(ups.map((u) => u.hero));
  assert.ok(ups.length > heroes.size, 'someone gained more than one level');
  assert.equal(sim.view().floaters.filter((f) => f.text === 'LEVEL UP').length, heroes.size, 'one floater per hero, not per level');
});

test('level-up: the Lv 3 talent shows up exactly once, at level 3', () => {
  for (const id of ['mike', 'dustin', 'lucas', 'eleven'] as const) {
    const sim = makeSim({ party: [{ id }, { id: id === 'mike' ? 'dustin' : 'mike' }] });
    sim.dev.giveXp(76);
    const ups = levelUps(sim.step(inp())).filter((u) => u.hero === id);
    assert.deepEqual(ups.map((u) => u.to), [2, 3]);
    assert.equal(ups[0]?.talent, null);
    assert.equal(ups[1]?.talent?.name, HERO_DEFS[id].talent.name);
    assert.equal(ups[1]?.talent?.text, HERO_DEFS[id].talent.text);
    const more = levelUps((sim.dev.giveXp(117), sim.step(inp()))).filter((u) => u.hero === id);
    assert.equal(more[0]?.talent, null);
  }
});

test('level-up: a natural 20 gives five points, a full heal, 20 s of Inspiration and two events', () => {
  let found = false;
  for (let seed = 1; seed < 400 && !found; seed++) {
    const { sim, s } = makeWhite({ seed });
    (s.heroes[0] as { hp: number }).hp = 5;
    sim.dev.giveXp(18);
    const ev = sim.step(inp());
    const info = levelUps(ev)[0];
    if (!info || info.roll !== 20) continue;
    found = true;
    assert.ok(ofType(ev, 'natTwenty').some((n) => n.source === 'levelUp' && n.hero === 'mike'));
    assert.ok(sfxIds(ev).includes('natTwenty'));
    const p = sim.party()[0];
    assert.equal(p?.hp, p?.hpMax, 'full heal');
    assert.equal(sim.view().hud.inspiration, 20);
    const fixed = fixedGain(HERO_DEFS.mike, 1);
    let pts = 0;
    for (const k of STAT_KEYS) pts += ((info.gains[k] ?? 0) - fixed[k]) / POINT_VALUE[k];
    assert.equal(pts, 5);
    run(sim, 600);
    assert.equal(sim.view().hud.inspiration, 10, 'counts down in seconds');
  }
  assert.ok(found, 'no seed rolled a 20');
});

test('level-up: a roll of 1 gives nothing and the next roll has advantage', () => {
  let found = false;
  for (let seed = 1; seed < 400 && !found; seed++) {
    const { sim } = makeWhite({ seed });
    sim.dev.giveXp(18);
    const first = levelUps(sim.step(inp()))[0];
    if (!first || first.roll !== 1) continue;
    found = true;
    assert.equal(first.advantage, false);
    const fixed = fixedGain(HERO_DEFS.mike, 1);
    for (const k of STAT_KEYS) assert.equal(first.gains[k] ?? 0, fixed[k], 'a 1 adds only the fixed growth');
    sim.dev.giveXp(58);
    const second = levelUps(sim.step(inp()))[0];
    assert.equal(second?.advantage, true);
    sim.dev.giveXp(117);
    const third = levelUps(sim.step(inp()))[0];
    assert.equal(third?.advantage, second?.roll === 1, 'advantage only carries after another 1');
  }
  assert.ok(found, 'no seed rolled a 1');
});

test('XP curve through the sim: the cap is level 12 and nothing levels past it', () => {
  const sim = makeSim({ party: [{ id: 'mike' }] });
  sim.dev.giveXp(100000);
  const ups = levelUps(sim.step(inp()));
  assert.equal(ups.length, 11);
  const p = sim.party()[0];
  assert.equal(p?.level, 12);
  const hud = sim.view().hud.party[0];
  assert.equal(hud?.xp, hud?.xpNext, 'a full bar at the cap');
  sim.dev.giveXp(1000);
  assert.equal(levelUps(sim.step(inp())).length, 0);
  assert.equal(xpToNext(1), 18);
});

test('dev.setLevel recomputes stats and heals; skipSpawns and openProps restore a checkpoint', () => {
  const spawns: SimSpawn[] = [
    rat('r1', 8, 8, 'a'), rat('r2', 9, 8, 'a'),
    { kind: 'prop', id: 'log1', prop: 'log', tx: 12, ty: 8 },
    { kind: 'prop', id: 'gate1', prop: 'gate', tx: 13, ty: 8 },
    { kind: 'prop', id: 'target1', prop: 'target', tx: 14, ty: 8 },
    { kind: 'item', id: 'eg1', item: 'eggo', tx: 6, ty: 8 },
  ];
  const sim = makeSim({ spawns, skipSpawns: ['r1', 'eg1'], openProps: ['log1', 'gate1', 'target1'] });
  assert.equal(sim.enemiesAlive(), 1);
  assert.equal(sim.view().items.length, 0);
  const st = Object.fromEntries(sim.view().props.map((p) => [p.id, p.state]));
  assert.deepEqual(st, { log1: 'open', gate1: 'open', target1: 'lit' });
  sim.dev.setLevel(5);
  const p = sim.party()[0];
  assert.equal(p?.level, 5);
  assert.equal(p?.hpMax, HERO_DEFS.mike.base.hp + Math.floor(HERO_DEFS.mike.growth.hp * 4));
  assert.equal(p?.hp, p?.hpMax);
});

test('pickups: eggo heals 40 percent, coke restores 50 percent MP, quarters count, magnet radius 18 px', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike' }],
    spawns: [
      { kind: 'item', id: 'e', item: 'eggo', tx: 6, ty: 8 },
      { kind: 'item', id: 'c', item: 'coke', tx: 8, ty: 8 },
      { kind: 'item', id: 'q', item: 'quarter', tx: 10, ty: 8 },
      { kind: 'item', id: 'far', item: 'quarter', tx: 10, ty: 12 },
    ],
  });
  const mike = s.heroes[0];
  assert.ok(mike);
  mike.hp = 10;
  mike.mp = 2;
  // Standing 24 px away from the eggo: out of the 18 px magnet radius, nothing happens.
  run(sim, 30);
  assert.equal(sim.view().items.length, 4);
  const evs: SimEvent[] = [];
  for (let f = 0; f < 200; f++) evs.push(...sim.step(inp({ mx: 1 })));
  const picks = ofType(evs, 'pickup');
  assert.deepEqual(picks.map((p) => p.item), ['eggo', 'coke', 'quarter']);
  assert.ok(picks.every((p) => p.hero === 'mike'));
  assert.ok(sfxIds(evs).includes('pickup') && sfxIds(evs).includes('heal'));
  assert.equal(sim.stats().quarters, 1);
  assert.equal(sim.view().hud.quarters, 1);
  assert.equal(sim.view().items.length, 1, 'the far quarter is untouched');
  // Eggo: +round(48 x 0.4) = 19. Coke: +round(16 x 0.5) = 8. HP and MP regen a hair on the way.
  assert.ok(mike.hp >= 29 && mike.hp < 31, `hp ${mike.hp}`);
  assert.ok(mike.mp >= 10 && mike.mp < 13, `mp ${mike.mp}`);
});

test('pickups: heal and MP floaters are whole numbers even when regen left the stat fractional', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike' }],
    spawns: [
      { kind: 'item', id: 'e', item: 'eggo', tx: 6, ty: 8 },
      { kind: 'item', id: 'c', item: 'coke', tx: 7, ty: 8 },
    ],
  });
  const mike = s.heroes[0];
  assert.ok(mike);
  // Room left for the eggo and the coke is a long decimal, so the clamp to full is what sets the gain.
  mike.hp = mike.st.hp - 7.123456789;
  mike.mp = mike.st.mp - 3.987654321;
  const texts = new Set<string>();
  for (let f = 0; f < 120; f++) {
    sim.step(inp({ mx: 1 }));
    for (const fl of sim.view().floaters) texts.add(fl.text);
  }
  const gains = [...texts].filter((t) => t.startsWith('+'));
  assert.equal(gains.length, 2, `heal and MP floaters: ${[...texts].join(', ')}`);
  for (const t of gains) assert.match(t, /^\+\d+$/);
});

test('pickups: a full-HP hero does not waste an eggo, the most hurt bench hero eats it', () => {
  const { sim, s } = makeWhite({ spawns: [{ kind: 'item', id: 'e', item: 'eggo', tx: 5, ty: 8 }] });
  const lucas = s.heroes[2];
  assert.ok(lucas);
  lucas.hp = 10;
  run(sim, 20, inp({ mx: 1 }));
  assert.ok(lucas.hp >= 25, `lucas hp ${lucas.hp}`);
  assert.equal(sim.party()[0]?.hp, 48);
});

test('quarters drop from kills, and Dustin Compass adds ten points to the chance', () => {
  const count = (compass: boolean): number => {
    let drops = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const lvl = compass ? 3 : 2;
      const { sim } = makeWhite({ party: [{ id: 'mike' }, { id: 'dustin', level: lvl }], seed, spawns: [rat('r', 20, 12, 'g')] });
      sim.dev.killAll();
      sim.step(inp());
      if (sim.view().items.some((i) => i.kind === 'quarter')) drops++;
    }
    return drops;
  };
  const plain = count(false), boosted = count(true);
  assert.ok(plain > 20 && plain < 75, `plain ${plain}/300 (15%)`);
  assert.ok(boosted > plain + 10, `Compass ${boosted} vs ${plain}`);
});

test('a snapshot from party() carries the d20 bonus, so a rebuilt sim keeps the same stats', () => {
  const first = makeSim({ seed: 12 });
  first.dev.giveXp(76);
  first.step(inp());
  const snap = first.party();
  assert.equal(snap[0]?.level, 3);
  const again = makeSim({ party: snap.map((p) => p as unknown as { id: 'mike' | 'dustin' | 'lucas'; level: number; xp: number }), seed: 99 });
  assert.deepEqual(again.party().map((p) => [p.id, p.level, p.xp, p.hpMax]), snap.map((p) => [p.id, p.level, p.xp, p.hpMax]));
  // Without the extra field the stats fall back to base plus fixed growth.
  const bare = makeSim({ party: snap.map((p) => ({ id: p.id, level: p.level, xp: p.xp })), seed: 99 });
  const fixedOnly = HERO_DEFS.mike.base.hp + Math.floor(HERO_DEFS.mike.growth.hp * 2);
  assert.equal(bare.party()[0]?.hpMax, fixedOnly);
  assert.ok((snap[0]?.hpMax ?? 0) >= fixedOnly);
});
