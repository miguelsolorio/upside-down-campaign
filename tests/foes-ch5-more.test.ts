// The rest of chapter 5's foes (foes-ch5.test.ts has the trooper, the Commander, the twins and the bot's flank step): the Lab agent in
// hazmat, the foe Demogorgon (a Demogorgon's swipe, charge and wall stun with no petals, leap or pin), the twins' marks and their state in the
// void, the void and the ring's edge as the bot sees them, and the bot's clears of a room of troopers, the Commander's bay and the ring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { createBot } from '../src/combat/bot.ts';
import { EDGE, createVoidSense } from '../src/combat/bot_void.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { astar, buildNav } from '../src/combat/nav.ts';
import type { Grid, SimView } from '../src/core/types.ts';
import { stageGrid } from '../src/world/options.ts';
import { STAGE_52 } from '../src/world/stages/stage52.ts';
import { createRng } from '../src/core/rng.ts';
import { buildSim } from '../src/combat/sim.ts';
import { footBlocked } from '../src/combat/space.ts';
import type { HeroId, SimInput } from '../src/core/types.ts';
import { arena, inp, run, tc, tf } from './sim-helpers.ts';
import { PARTY_52, PARTY_51, actorOf, botFight, foe, hall, hurt, pair, ringGrid, ring, slay, steady, streak, unit } from './foes-ch5-helpers.ts';

const D = ENEMY_DEFS;
const WILL = [{ id: 'will' as const, level: 7 }];

test('trooper: like a guard, he turns to the hero only after 12 frames with the hero in his blind side', () => {
  const r = hall('trooper', 20, { dir: 'right' }, undefined, true);
  run(r.sim, 11);
  assert.equal(foe(r.s).dir, 'right', 'still facing away after 11');
  run(r.sim, 4);
  assert.equal(foe(r.s).dir, 'left', 'and facing Mike once the delay is over');
});

test('agent5: the 1.2 agent\'s brain on its own numbers: a 24 frame "!", then a dart with its ATK, held 70 to 100 px out', () => {
  const darts = (type: 'agent' | 'agent5'): { atk: number[]; alerts: number } => {
    const r = hall(type, 80);
    steady(r.s);
    const atk: number[] = [];
    let alerts = 0, longest = 0;
    for (let f = 0; f < 140; f++) {
      r.sim.step(inp());
      for (const p of r.s.projs) if (!p.mine && !atk.includes(p.atk)) atk.push(p.atk);
      if (actorOf(r.sim, type)?.alert) alerts++; else if (alerts) { longest = Math.max(longest, alerts); alerts = 0; }
    }
    return { atk, alerts: longest };
  };
  assert.deepEqual(darts('agent'), { atk: [10], alerts: 24 });
  assert.deepEqual(darts('agent5'), { atk: [38], alerts: 24 });
  assert.ok(D.agent5.hp > D.agent.hp * 3 && D.agent5.def > D.agent.def, 'a hazmat agent at chapter 5 numbers, not a factor');
});

// ------------------------------------------------------------------ the foe Demogorgon
test('demofoe: a 30 frame "!" and a swipe, a charge with a 36 frame wind-up that stuns it 120 frames against a wall, and half again the damage then', () => {
  const r = hall('demofoe', 24, {}, WILL);
  const e = foe(r.s);
  steady(r.s);
  r.h.st.def = 0;
  const frames: { ev: ReturnType<typeof run>; a: ReturnType<typeof actorOf> }[] = [];
  e.demo!.chargeCd = 1e9;
  for (let f = 0; f < 90; f++) frames.push({ ev: r.sim.step(inp()), a: actorOf(r.sim, 'demofoe') });
  const first = frames.findIndex((t) => t.a?.alert);
  assert.equal(streak(frames, first, (t) => t.a?.alert === true), 30);
  const swipe = frames.find((t) => hurt(t.ev).length > 0);
  assert.equal(hurt(swipe?.ev ?? [])[0]?.dmg, Math.round(D.demofoe.power * D.demofoe.atk), 'power 0.6 of its ATK');
  // The charge: it runs along the line locked at the end of the wind-up through the hero and into the west wall.
  r.sim.dev.god = true;
  e.demo!.chargeCd = 0;
  const seen: string[] = [];
  let wind = 0;
  for (let f = 0; f < 300 && e.demo!.move !== 'stun'; f++) {
    r.sim.step(inp());
    const a = actorOf(r.sim, 'demofoe');
    if (a?.pose === 'charge' && a.alert) wind++;
    if (a?.pose && seen.at(-1) !== a.pose) seen.push(a.pose);
  }
  assert.equal(wind, D.demofoe.x.chargeWindup);
  assert.deepEqual(seen, ['charge', 'stun']);
  assert.equal(streak(Array.from({ length: 200 }, () => { r.sim.step(inp()); return actorOf(r.sim, 'demofoe')?.pose; }), 0, (p) => p === 'stun') + 1, D.demofoe.x.stunT, 'a 2 s stun');
  const dazed = (() => { e.demo!.move = 'stun'; e.demo!.t = 99; return hitEnemy(r.s, r.h, e, { power: 1, angle: Math.PI, noCrit: true }); })();
  e.demo!.move = 'walk';
  const awake = hitEnemy(r.s, r.h, e, { power: 1, angle: Math.PI, noCrit: true });
  assert.ok(Math.abs(dazed - awake * D.demofoe.x.stunMul) <= 1, `${dazed} dazed, ${awake} awake`);
});

test('demofoe: no petals, no leap and no pin: at 10 percent HP it still only swipes and charges, and at 0 it dies', () => {
  const r = hall('demofoe', 90, {}, WILL);
  r.sim.dev.god = true;
  const e = foe(r.s);
  e.hp = Math.round(e.hpMax * 0.1);
  const poses = new Set<string>();
  for (let f = 0; f < 900; f++) {
    r.sim.step(inp());
    const a = actorOf(r.sim, 'demofoe');
    if (a?.pose) poses.add(a.pose);
    assert.equal(a?.petals, false, 'no petals');
  }
  assert.ok(poses.has('charge') && poses.has('stun'));
  assert.deepEqual([...poses].filter((p) => p === 'leap' || p === 'spit' || p === 'pinned'), []);
  assert.equal(r.s.globs.length, 0);
  // Three wall stuns on the 1.3 Demogorgon would pin it; here, a lethal blow kills.
  e.demo!.stuns = 9;
  hitEnemy(r.s, r.h, e, { power: 50, angle: Math.PI, noCrit: true });
  const ev = run(r.sim, 12);
  assert.ok(ev.some((x) => x.t === 'kill' && x.kind === 'demofoe') && !ev.some((x) => x.t === 'pinned'));
  assert.equal(e.dead, true);
});

// ------------------------------------------------------------------ the Commander and the twins, the small things
test('the Commander: asleep he shows no bar and is not drawn, awake the bar says THE COMMANDER', () => {
  const r = hall('commander', 140, { group: 'boss', dormant: true });
  assert.equal(r.sim.view().hud.boss, null);
  assert.equal(actorOf(r.sim, 'commander'), undefined);
  r.sim.spawnGroup('boss');
  assert.deepEqual(r.sim.view().hud.boss, { name: 'THE COMMANDER', hp: D.commander.hp, hpMax: D.commander.hp });
  foe(r.s).hp = 0;
  run(r.sim, 6);
  assert.equal(r.sim.view().hud.boss, null);
});

test('the twins: the second is marked for gfx to tint, and stays the second when the first is gone', () => {
  const r = pair();
  const seconds = (): boolean[] => r.sim.view().actors.filter((a) => a.id === 'twin').sort((p, q) => p.y - q.y).map((a) => a.second === true);
  assert.deepEqual(seconds(), [false, true], 'twin1 in the north, twin2 in the south');
  slay(r, 0);
  run(r.sim, 30);
  assert.deepEqual(seconds(), [true]);
});

test('the twins: an enraged twin walks 1.3 times as fast as a calm one', () => {
  const walk = (enraged: boolean): number => {
    const r = hall('twin', 190, { group: 'boss' }, WILL);
    const e = foe(r.s);
    e.demo!.chargeCd = 1e9;
    e.cd = 1e9;
    if (enraged) { e.ch5!.enraged = true; e.spd = D.twin.x.enrage; e.demo!.petals = true; e.demo!.spitCd = 1e9; }
    const x0 = e.x;
    run(r.sim, 20);
    return x0 - e.x;
  };
  const calm = walk(false);
  assert.ok(calm > 10, `${calm.toFixed(1)} px in 20 frames`);
  assert.ok(Math.abs(walk(true) / calm - 1.3) < 0.05);
});

test('the twins: it can\'t be hit while it is in the void, and the fall never kills', () => {
  const r = ring(WILL, [[12, 8]]);
  r.sim.dev.god = true;
  r.sim.dev.teleport(tc(12), tf(3));
  const t = r.twins[0] as ReturnType<typeof foe>;
  t.demo!.chargeCd = 0;
  t.hp = 5;
  for (let f = 0; f < 200 && t.demo?.move !== 'fall'; f++) r.sim.step(inp());
  assert.equal(t.hp, 1, 'the fall left it one HP');
  for (const move of ['fall', 'below', 'climb'] as const) {
    while (t.demo?.move !== move) r.sim.step(inp());
    assert.equal(hitEnemy(r.s, r.h, t, { power: 9, angle: 0, noCrit: true }), 0, `no hit lands in ${move}`);
    assert.equal(t.hp, 1);
  }
  run(r.sim, 60);
  assert.equal(t.dead, false);
  assert.ok(hitEnemy(r.s, r.h, t, { power: 1, angle: 0, noCrit: true }) > 0, 'back in play it can be hit');
});

test('the twins: a charge that ends on an ordinary wall stuns it, as any charge does: only a drop makes it fall', () => {
  const r = hall('twin', 150, { group: 'boss' }, WILL);
  r.sim.dev.god = true;
  const t = foe(r.s);
  t.demo!.chargeCd = 0;
  for (let f = 0; f < 300 && t.demo?.move !== 'stun'; f++) r.sim.step(inp());
  assert.equal(t.demo?.move, 'stun');
  assert.equal(t.hp, t.hpMax, 'and nothing was lost');
  assert.equal(actorOf(r.sim, 'twin')?.pose, 'stun');
});

// ------------------------------------------------------------------ the void and the bot
test('the bot\'s map treats every drop as wall, even one a grid forgot to make solid, and no route crosses the Abyss\'s void', () => {
  const g: Grid = { w: 5, h: 5, solid: new Uint8Array(25), drop: new Uint8Array(25) };
  for (let y = 1; y < 4; y++) (g.drop as Uint8Array)[y * 5 + 2] = 1;
  const nav = buildNav(g);
  assert.deepEqual([nav.blocked[2 * 5 + 2], nav.blocked[1 * 5 + 2], nav.blocked[0 * 5 + 2], nav.blocked[2 * 5 + 1]], [1, 1, 0, 0]);
  const path = astar(nav, 0, 2, 4, 2) ?? [];
  assert.ok(path.length > 0 && path.every((p) => !(p.x === 2 && p.y >= 1 && p.y <= 3)), 'round the gap, not over it');
  assert.ok(path.length > 4, 'a detour, longer than the four steps across');
  const abyss = stageGrid(STAGE_52);
  const nav52 = buildNav(abyss);
  for (let i = 0; i < abyss.solid.length; i++) if (abyss.drop?.[i]) assert.equal(nav52.blocked[i], 1, `tile ${i}`);
});

test('the bot never walks onto the void: a waypoint on it is moved to the nearest island floor, and it stands there', () => {
  const grid = ringGrid();
  const r = ring(WILL, []);
  r.sim.dev.god = true;
  const bot = createBot({ grid, waypoints: [{ x: tc(12), y: tf(0) }] });
  for (let f = 0; f < 900 && !bot.done(); f++) r.sim.step(bot.next(r.sim));
  assert.ok(bot.done(), 'it got there');
  const p = r.sim.heroPos();
  const tx = Math.floor(p.x / 16), ty = Math.floor((p.y - 4) / 16);
  assert.deepEqual([grid.solid[ty * grid.w + tx], grid.drop?.[ty * grid.w + tx]], [0, 0], `on floor at ${tx},${ty}`);
  assert.ok(ty <= 4, 'at the near edge of the island, as close as it can get to the waypoint');
});

/** A SimView with just a twin on show, for the sense that reads only what a player sees. */
const viewOf = (pose: string | undefined, alert: boolean): SimView =>
  ({ actors: [{ kind: 'enemy', id: 'twin', x: 190, y: 120, dir: 'down', anim: 'attack', t: 0, flash: 0, blink: false, strained: false, tint: null, alert, z: 0, bar: null, pose }] }) as unknown as SimView;

test('the bot keeps off the ring\'s edge while a twin winds up: within 30 px of a drop it walks away, and only then', () => {
  const grid = ringGrid();
  const walkable = (x: number, y: number): boolean => grid.solid[Math.floor((y - 4) / 16) * grid.w + Math.floor(x / 16)] === 0;
  const sense = createVoidSense(grid, walkable);
  const edge = { x: tc(12), y: tf(2) + 4 };
  assert.ok(sense.edgeDist(edge.x, edge.y) < EDGE, 'a hero by the north edge');
  const step = sense.dodge(viewOf('charge', true), edge.x, edge.y);
  assert.ok(step !== null && step[1] > 0.3, 'walks south, away from it');
  const after = sense.edgeDist(edge.x + (step?.[0] ?? 0) * 24, edge.y + (step?.[1] ?? 0) * 24);
  assert.ok(after > sense.edgeDist(edge.x, edge.y) + 10, `${sense.edgeDist(edge.x, edge.y).toFixed(0)} px from the drop, then ${after.toFixed(0)}`);
  assert.equal(sense.dodge(viewOf('charge', false), edge.x, edge.y), null, 'not while the twin is running or idle');
  assert.equal(sense.dodge(viewOf(undefined, false), edge.x, edge.y), null);
  assert.equal(sense.dodge(viewOf('charge', true), tc(12), tf(11)), null, 'and not from the middle of the ring');
  const hall = createVoidSense(stageGrid({ ...STAGE_52, rows: ['TTT', 'T.T', 'TTT'] }), () => true);
  assert.equal(hall.dodge(viewOf('charge', true), 24, 28), null, 'a stage without a void has no edge');
});

test('the bot at the ring\'s edge when a twin winds up walks away from it during the wind-up', () => {
  const r = ring(WILL, [[12, 8]]);
  r.sim.dev.god = true;
  r.sim.dev.teleport(tc(12), tf(3));
  const t = r.twins[0] as ReturnType<typeof foe>;
  t.demo!.chargeCd = 0;
  const sense = createVoidSense(ringGrid(), () => true);
  const bot = createBot({ grid: ringGrid(), waypoints: [{ x: tc(12), y: tf(3) }] });
  const dist = (): number => { const p = r.sim.heroPos(); return sense.edgeDist(p.x, p.y); };
  let start = -1, end = -1;
  for (let f = 0; f < 200; f++) {
    r.sim.step(bot.next(r.sim));
    const a = actorOf(r.sim, 'twin');
    if (a?.pose === 'charge' && a.alert) { if (start < 0) start = dist(); end = dist(); } else if (start >= 0) break;
  }
  assert.ok(start >= 0, 'a wind-up was seen');
  assert.ok(end > start + 10 && end >= EDGE, `${start.toFixed(0)} px from the drop at the "!", ${end.toFixed(0)} at its end`);
});

// ------------------------------------------------------------------ the bot clears them
test('the bot clears a room of troopers and agents, the Commander\'s bay and the twins\' ring on HARD, and a bot that does not dodge mostly does too', () => {
  const room = [
    unit('t1', 'trooper', 14, 5), unit('t2', 'trooper', 15, 8), unit('t3', 'trooper', 14, 11), unit('a1', 'agent5', 20, 6), unit('a2', 'agent5', 20, 10),
  ];
  const bay = [unit('c', 'commander', 15, 8, { group: 'boss', dir: 'left' })];
  const twins = [unit('w1', 'twin', 10, 6, { group: 'boss', dir: 'down' }), unit('w2', 'twin', 14, 6, { group: 'boss', dir: 'down' })];
  let careless = 0;
  for (const seed of [1, 2, 3]) {
    for (const [name, spawns, extra] of [
      ['room', room, {}],
      ['bay', bay, { grid: undefined, start: [3, 8] as [number, number], goal: [26, 8] as [number, number] }],
      ['ring', twins, { grid: ringGrid(), party: PARTY_52, start: [12, 16] as [number, number], goal: [12, 4] as [number, number] }],
    ] as const) {
      const o = { seed, party: PARTY_51, max: 9000, ...extra };
      const f = botFight(spawns, o);
      assert.ok(f.cleared && f.frames < 9000, `${name}, seed ${seed}: ${f.frames} frames, ${f.taken} damage taken`);
      assert.ok(f.taken < 330, `${name}, seed ${seed}: ${f.taken} damage taken`);
      if (botFight(spawns, { ...o, careless: true }).cleared) careless++;
    }
  }
  assert.ok(careless >= 7, `${careless} of 9 for the bot that doesn't dodge`);
}, { timeout: 120000 });

// ------------------------------------------------------------------ random play
const HEROES: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy', 'hopper'];

test('fuzz: every hero\'s moves against the new foes, in a hall and on the ring, break no invariant', () => {
  for (const [where, grid, spawns, start] of [
    ['hall', arena(40, 22), [
      unit('t1', 'trooper', 12, 8), unit('t2', 'trooper', 14, 12), unit('t3', 'trooper', 16, 6, { tier: 'elite' }), unit('a1', 'agent5', 18, 10), unit('d1', 'demofoe', 22, 14),
      unit('c', 'commander', 20, 16, { group: 'boss', dormant: true }),
    ], [3, 11]],
    ['ring', ringGrid(), [unit('w1', 'twin', 10, 6, { group: 'boss' }), unit('w2', 'twin', 14, 6, { group: 'boss' })], [12, 16]],
  ] as const) {
    for (let seed = 1; seed <= 8; seed++) {
      const rng = createRng(seed * 4099);
      const party = [0, 1, 2, 3].map((k) => ({ id: HEROES[(seed * 3 + k * 2) % HEROES.length] as HeroId, level: 10 }));
      const { sim, s } = buildSim({ grid, party, start: { x: tc(start[0]), y: tf(start[1]) }, spawns: [...spawns], difficulty: 'chief', seed });
      let input: SimInput = inp();
      for (let f = 0; f < 1800; f++) {
        if (f % 5 === 0) {
          const hold = rng() < 0.7, pick = (): number => (rng() < 0.4 ? 0 : rng() < 0.5 ? -1 : 1);
          input = {
            mx: hold ? input.mx : pick(), my: hold ? input.my : pick(), attackHeld: rng() < 0.5, attackPressed: rng() < 0.2, specialPressed: rng() < 0.06,
            specialHeld: false, swapDelta: rng() < 0.03 ? 1 : 0, swapTo: -1, burstPressed: rng() < 0.03,
          };
        }
        if (f === 200) sim.spawnGroup('boss');
        for (const e of sim.step(input)) if (e.t === 'hit') assert.ok(Number.isFinite(e.dmg) && e.dmg >= 1, `${where}: bad damage ${e.dmg}`);
        const v = sim.view();
        for (const a of v.actors) assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z) && (a.k === undefined || (a.k >= 0 && a.k <= 1)), `${where}: bad actor ${a.id}`);
        for (const e of s.enemies) {
          assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp) && e.hp <= e.hpMax, `${where}: bad ${e.kind} ${e.hp}/${e.hpMax}`);
          if (e.kind === 'twin' && e.demo && !['fall', 'below', 'climb'].includes(e.demo.move) && !e.dead) assert.ok(!footBlocked(s, e.x, e.y) || f < 5, `${where}: a twin inside the rock at ${e.x},${e.y}`);
        }
        assert.ok(s.enemies.filter((e) => e.rt === 'squad' && !e.dead).length <= 3, 'at most three of the squad');
        const bar = v.hud.boss;
        if (bar) assert.ok(bar.hp >= 0 && bar.hp <= bar.hpMax, `${where}: bar ${bar.hp}/${bar.hpMax}`);
        const act = s.heroes[s.active];
        if (act && !act.ko && f > 5) assert.ok(!footBlocked(s, act.x, act.y), `${where}: hero in rock at ${act.x},${act.y}`);
        if (s.over) break;
      }
    }
  }
}, { timeout: 120000 });
