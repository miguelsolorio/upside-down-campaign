// Stage 3.2, the Russian base, in the real sim: Robin's cipher doors answer only her and close again when she steps away, door1 and door2
// hold everyone once shut and open again, the breaker answers only a shot (and not a swing, a spray or a beam), re-arms, and its hint does
// not come back, the power box stuns Grigori where the map puts it, and whole headless runs of the bot through the Key chamber with a
// shooter in the party and without one. The map, the budget, the beats and the scripts are in stage32.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty, rosterFor } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { DECODE_FADE, DECODE_FRAMES } from '../src/combat/props.ts';
import { REARM_FRAMES, ZAP_FRAMES } from '../src/combat/powerbox.ts';
import { HINT_AFTER, createPuzzleTracker } from '../src/world/puzzles.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { STAGE_32 as S } from '../src/world/stages/stage32.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { Difficulty, HeroId, PartySeed, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { idle, runUntil, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, props } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
const px = (tx: number): number => tx * 16 + 8;
const fy = (ty: number): number => ty * 16 + 12;
/** One hero on the stage with its props and no enemies, so nothing interrupts what a test is looking at. The rest of `party` trails. */
const solo = (id: HeroId, tx: number, ty: number, party: PartySeed[] = [{ id, level: 5 }], extra: SimSpawn[] = []) =>
  createSim({ ...simOptions(S, grid, { party, start: { x: px(tx), y: fy(ty) } }), spawns: [...propsOnly, ...extra] });
type Solo = ReturnType<typeof solo>;
/** Face (mx, my) with a nudge too small to walk anywhere, then press `key` once. */
const aim = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  ({ ...idle, ...(f < 6 ? { mx: mx * 0.2, my: my * 0.2 } : f === 6 ? { mx: mx * 0.2, my: my * 0.2, ...key } : {}) });
const is = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const poked = (e: SimEvent, id: string, hero: HeroId): boolean => e.t === 'poked' && e.propId === id && e.hero === hero;
const state = (sim: Solo, id: string): string | undefined => sim.view().props.find((p) => p.id === id)?.state;
const walk = (sim: Solo, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};
const stand = (sim: Solo, frames: number): void => { for (let f = 0; f < frames; f++) sim.step(idle); };
const ROSTER = rosterFor('3.2');
const NANCY: PartySeed[] = [{ id: 'nancy', level: 5 }, { id: 'mike', level: 7 }];

// ---------------------------------------------------------------- Robin's doors
test('cipher1: Robin standing close decodes it in 45 frames, and it fades again if she steps away; nobody else opens it', () => {
  const c = prop('cipher1');
  const sim = solo('robin', c.tx, c.ty - 1);
  const k = (): number => sim.view().props.find((p) => p.id === 'cipher1')?.k ?? 0;
  stand(sim, 20);
  assert.ok(k() > 0.4 && k() < 0.5, `20 frames in, k is ${k().toFixed(2)}`);
  // She is somewhere else: it falls by 1/90 a frame, not all the way at once.
  sim.dev.teleport(px(c.tx), fy(c.ty - 5));
  stand(sim, 25);
  assert.ok(k() > 0.1 && k() < 0.25, `25 frames away, k is ${k().toFixed(2)}`);
  assert.equal(state(sim, 'cipher1'), 'closed');
  // Back at the door, stood there long enough: it opens, with the stage told once.
  const back = solo('robin', c.tx, c.ty - 1);
  const e = runUntil(back, DECODE_FRAMES + 3, () => idle, (ev) => is(ev, 'propCleared', 'cipher1'));
  assert.ok(e, 'it opens in about 45 frames');
  assert.equal(state(back, 'cipher1'), 'open');
  assert.ok(DECODE_FRAMES === 45 && DECODE_FADE === 90, 'the spec\'s rates');
  assert.ok(walk(back, 90, 0, 1).y > c.ty * 16 + 32, 'and the way south is open');
  // Everyone else can stand there as long as they like.
  for (const id of ROSTER.filter((h) => h !== 'robin')) {
    const s = solo(id, c.tx, c.ty - 1);
    stand(s, 300);
    assert.equal(state(s, 'cipher1'), 'closed', `${id} standing at it does nothing`);
  }
  // A hero without `read` who pushes it for 20 frames or swings at it is a try. Robin never is.
  const mike = solo('mike', c.tx, c.ty - 1);
  assert.ok(runUntil(mike, 90, aim(0, 1, { attackPressed: true }), (ev) => poked(ev, 'cipher1', 'mike')), 'a swing is a try');
  const push = solo('mike', c.tx, c.ty - 1);
  assert.ok(runUntil(push, 90, () => ({ ...idle, my: 1 }), (ev) => poked(ev, 'cipher1', 'mike')), 'and so is leaning on it');
  const robin = solo('robin', c.tx, c.ty - 1);
  const tries: SimEvent[] = [];
  for (let f = 0; f < 30; f++) tries.push(...robin.step(aim(0, 1, { attackPressed: true })(f)));
  assert.ok(!tries.some((ev) => ev.t === 'poked'), 'Robin is not');
});

test('cipher1: shut, it holds a walking hero; opened by flag, the whole corridor is open. cipher2 is the same across the barracks doorway', () => {
  const c = prop('cipher1');
  const hold = walk(solo('mike', c.tx, c.ty - 1), 120, 0, 1);
  assert.ok(hold.y < c.ty * 16 + 1, `cipher1 holds a hero walking south at y ${hold.y.toFixed(0)}`);
  const flag = solo('mike', c.tx, c.ty - 1);
  flag.openProp('cipher1');
  flag.step(idle);
  assert.equal(state(flag, 'cipher1'), 'open');
  assert.ok(walk(flag, 90, 0, 1).y > c.ty * 16 + 32, 'opened, the way through is clear');
  const d = prop('cipher2');
  const east = walk(solo('mike', d.tx - 1, d.ty), 120, 1, 0);
  assert.ok(east.x < d.tx * 16 + 1, 'cipher2 holds a hero walking east into the barracks');
  const decoded = solo('robin', d.tx - 1, d.ty);
  assert.ok(runUntil(decoded, DECODE_FRAMES + 3, () => idle, (ev) => is(ev, 'propCleared', 'cipher2')), 'Robin reads it from the hall side');
  assert.ok(walk(decoded, 90, 1, 0).x > d.tx * 16 + 16, 'and the barracks is open');
});

// ---------------------------------------------------------------- the doors
test('door1 and door2: spawned open, a shut door holds the whole party and an open one lets them through; closing one on a hero moves him clear', () => {
  for (const id of ['door1', 'door2']) {
    const d = prop(id);
    const sim = solo('mike', d.tx - 1, d.ty);
    assert.equal(state(sim, id), 'open');
    assert.ok(walk(sim, 60, 1, 0).x > d.tx * 16 + 16, `${id} spawns open, the way into the chamber is clear`);
    const back = solo('mike', d.tx - 1, d.ty);
    back.closeProp(id);
    back.step(idle);
    assert.equal(state(back, id), 'closed');
    assert.ok(walk(back, 90, 1, 0).x < d.tx * 16, `${id}, shut, holds a hero walking east`);
    back.openProp(id);
    back.step(idle);
    assert.equal(state(back, id), 'open');
    assert.ok(walk(back, 90, 1, 0).x > d.tx * 16 + 16, `${id} opens again at the clear`);
    // A hero standing inside it when it shuts is put on open floor.
    const trapped = solo('mike', d.tx, d.ty);
    trapped.closeProp(id);
    trapped.step(idle);
    const p = trapped.heroPos();
    const [tx, ty] = tileOf(p.x, p.y);
    assert.ok(!(tx === d.tx && ty >= d.ty && ty < d.ty + 2), `${id} does not leave a hero in it (he is at ${tx},${ty})`);
  }
});

// ---------------------------------------------------------------- the breaker
test('breaker1: a shot from Nancy or Lucas lights it and fires the power box; a swing, a spray, a beam and a scoop do not', () => {
  const b = prop('breaker1');
  const lit = (id: HeroId, tx: number, ty: number, key: Partial<SimInput>, party?: PartySeed[]): boolean =>
    runUntil(solo(id, tx, ty, party), 90, aim(0, -1, key), (e) => is(e, 'targetHit', 'breaker1')) !== null;
  // A shot flies over the machine and the rock: from the row under the machine, from the middle of the chamber, from the far side of it.
  for (const [tx, ty] of [[b.tx, 26], [b.tx, 29], [b.tx, 33]] as const) {
    assert.ok(lit('nancy', tx, ty, { attackPressed: true }), `Nancy's shot lights it from ${tx},${ty}`);
    assert.ok(lit('lucas', tx, ty, { attackPressed: true }) || ty > 29, `Lucas's shot lights it from ${tx},${ty}`);
  }
  assert.ok(lit('lucas', b.tx, 28, { attackPressed: true }), 'Lucas\'s slingshot lights it from four tiles out');
  // Nobody else has `shoot`, and nothing else they carry reaches it from the nearest floor.
  for (const id of ROSTER.filter((h) => h !== 'lucas' && h !== 'nancy')) {
    assert.ok(!lit(id, b.tx, 26, { attackPressed: true }), `${id}'s basic does not light it`);
    assert.ok(!lit(id, b.tx, 26, { specialPressed: true }), `${id}'s special does not light it`);
  }
  // The shot fires every power box: the plate shows lit for 30 frames, and goes back.
  const sim = solo('nancy', b.tx, 28);
  assert.ok(runUntil(sim, 90, aim(0, -1, { attackPressed: true }), (e) => is(e, 'targetHit', 'breaker1')));
  assert.equal(state(sim, 'powerbox1'), 'lit');
  stand(sim, ZAP_FRAMES + 2);
  assert.equal(state(sim, 'powerbox1'), 'closed');
  assert.equal(state(sim, 'breaker1'), 'lit', 'the breaker stays lit for a while');
  // It re-arms 300 frames after it was lit and can be shot again.
  stand(sim, REARM_FRAMES);
  assert.equal(state(sim, 'breaker1'), 'closed');
  assert.ok(runUntil(sim, 90, aim(0, -1, { attackPressed: true }), (e) => is(e, 'targetHit', 'breaker1')), 'a second shot lights it again');
  assert.equal(state(sim, 'powerbox1'), 'lit');
});

test('the power box: Grigori on the plate when it fires is stunned, and on his walk from his bed to the upper door he crosses it', () => {
  const b = prop('breaker1'), box = prop('powerbox1');
  const grigori = (tx: number, ty: number): SimSpawn => ({ kind: 'enemy', id: 'grigori', type: 'grigori', tx, ty, group: 'boss', dormant: true });
  const sim = solo('nancy', b.tx, 26, NANCY, [grigori(box.tx + 1, box.ty + 1)]);
  sim.dev.god = true;
  sim.spawnGroup('boss');
  const e = runUntil(sim, 120, aim(0, -1, { attackPressed: true }), (ev) => is(ev, 'targetHit', 'breaker1'));
  assert.ok(e, 'Nancy shot the breaker from under it');
  stand(sim, 4);
  const g = sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'grigori');
  assert.equal(g?.pose, 'stun', 'he was on the plate');
  assert.ok((sim.view().hud.boss?.hp ?? 1e9) < (sim.view().hud.boss?.hpMax ?? 0), 'and it cost him HP');
  // Where he starts, a hero by the upper door brings him over the plate.
  const spawn = S.spawns.find((s) => s.kind === 'enemy' && s.id === 'grigori') as Extract<SimSpawn, { kind: 'enemy' }>;
  const d2 = prop('door2');
  const walkIn = solo('mike', d2.tx + 2, d2.ty + 1, undefined, [grigori(spawn.tx, spawn.ty)]);
  walkIn.dev.god = true;
  walkIn.spawnGroup('boss');
  let crossed = false;
  for (let f = 0; f < 900 && !crossed; f++) {
    walkIn.step(idle);
    const a = walkIn.view().actors.find((x) => x.kind === 'enemy' && x.id === 'grigori');
    if (a && a.x >= box.tx * 16 && a.x < box.tx * 16 + 32 && a.y - 4 >= box.ty * 16 && a.y - 4 < box.ty * 16 + 32) crossed = true;
  }
  assert.ok(crossed, 'Grigori walks over the power box on his way to a hero at the upper door');
});

test('hint: the breaker names Lucas, then Nancy, and never nags a party with neither; once lit it is solved for good, re-arming included', () => {
  const b = prop('breaker1');
  const look = (sim: Solo, tracker: ReturnType<typeof createPuzzleTracker>, party: HeroId[]): void =>
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party });
  const attempt = (party: PartySeed[]): { hero: HeroId | null; hint: string | null } => {
    const sim = solo(party[0]?.id as HeroId, b.tx, 26, party);
    const tracker = createPuzzleTracker(S.puzzles);
    look(sim, tracker, party.map((p) => p.id));
    for (let f = 0; f < 60; f++) {
      for (const e of sim.step(aim(0, -1, { attackPressed: true })(f))) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
      look(sim, tracker, party.map((p) => p.id));
    }
    const stuck = tracker.highlight();
    return { hero: stuck?.hero ?? null, hint: stuck?.hint ?? null };
  };
  const seeds = (...ids: HeroId[]): PartySeed[] => ids.map((id) => ({ id, level: 5 }));
  assert.deepEqual(attempt(seeds('mike', 'lucas', 'nancy', 'eleven')), { hero: 'lucas', hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT' });
  assert.deepEqual(attempt(seeds('mike', 'eleven', 'robin', 'nancy')), { hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER PISTOL' }, 'the default party has Nancy but not Lucas');
  assert.deepEqual(attempt(seeds('mike', 'eleven', 'robin', 'dustin')), { hero: null, hint: null }, 'no shooter: no hint, however long he swings at it');
  // Lit by Nancy, then re-armed: the puzzle does not come back, however long the party stands there.
  const party = seeds('nancy', 'mike', 'eleven', 'robin');
  const sim = solo('nancy', b.tx, 28, party);
  const tracker = createPuzzleTracker(S.puzzles);
  const ids = party.map((p) => p.id);
  look(sim, tracker, ids);
  for (let f = 0; f < 60; f++) { sim.step(aim(0, -1, { attackPressed: true })(f)); look(sim, tracker, ids); }
  assert.equal(state(sim, 'breaker1'), 'lit');
  assert.equal(tracker.highlight(), null, 'solved while it is lit');
  for (let f = 0; f < REARM_FRAMES + HINT_AFTER + 60; f++) { sim.step(idle); look(sim, tracker, ids); }
  assert.equal(state(sim, 'breaker1'), 'closed', 're-armed');
  assert.equal(tracker.highlight(), null, 'and still solved: the hint does not come back');
  tracker.reset();
  look(sim, tracker, ids);
  for (let f = 0; f < HINT_AFTER; f++) { sim.step(idle); look(sim, tracker, ids); }
  assert.equal(tracker.highlight()?.id, 'breaker', 'a retry forgets, and the clock names her again');
});

// ---------------------------------------------------------------- whole runs
interface Play { done: boolean; allDown: boolean; frames: number; bossAt: number; xp: number; said: string[]; lit: number; stunned: number; doorsShut: boolean; doorsOpen: boolean; music: string[] }

/** Plays the whole stage with the bot, with the numbers the Key chamber adds: when the boss woke, shots on the breaker, frames stunned. */
function play(seed: number, party: PartySeed[], difficulty: Difficulty = 'chief', careless = false, max = 30000): Play {
  const sim = createSim(simOptions(S, grid, { party, seed, difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
  const said: string[] = [], music: string[] = [];
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id),
    music: (t) => { music.push(t); }, jingle: () => undefined, finish: () => undefined,
  });
  let allDown = false, bossAt = -1, lit = 0, stunned = 0, doorsShut = false, f = 0;
  const door = (id: string): string | undefined => sim.view().props.find((p) => p.id === id)?.state;
  for (; f < max && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    if (ev.some((e) => e.t === 'allDown')) allDown = true;
    if (ev.some((e) => is(e, 'targetHit', 'breaker1'))) lit++;
    if (sim.view().actors.some((a) => a.kind === 'enemy' && a.id === 'grigori' && a.pose === 'stun')) stunned++;
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
    if (bossAt < 0 && dir.hasFired('grigori')) bossAt = f;
    if (bossAt >= 0 && !dir.finished() && door('door1') === 'closed' && door('door2') === 'closed') doorsShut = true;
  }
  return { done: dir.finished(), allDown, frames: f, bossAt, xp: sim.stats().xpEarned, said, lit, stunned, doorsShut, doorsOpen: door('door1') === 'open' && door('door2') === 'open', music };
}
const NO_SHOOTER: PartySeed[] = [{ id: 'mike', level: 7 }, { id: 'eleven', level: 5 }, { id: 'robin', level: 5 }, { id: 'dustin', level: 5 }];
const runs = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
/**
 * The scripts a bot run plays. It opens cipher1 by flag before it reaches the hint (so the done script comes first), never reads
 * cipher2, and passes through the lab and the control room into the chamber.
 */
const ROUTE = ['l8_start', 'l8_bay', 'l8_cipher_done', 'l8_cipher_hint', 'l8_lab', 'l8_control', 'l8_grigori', 'l8_clear'];

test('whole run: the bot reaches the chamber, the doors shut behind it and open at the clear, the music turns, and it wins most of the time on chief', () => {
  let clears = 0, boxed = 0;
  for (const seed of runs(10)) {
    const r = play(seed, defaultParty('3.2'));
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    assert.ok(r.xp >= 190 && r.xp <= 240, `seed ${seed}: the stage pays ${r.xp} XP`);
    assert.deepEqual(r.said, ROUTE, `seed ${seed}: the scripts play in route order, and the barracks is never read`);
    assert.ok(r.doorsShut && r.doorsOpen, `seed ${seed}: both doors shut during the fight and are open at the clear`);
    assert.deepEqual(r.music, ['clock'], 'and the music turns to the boss track once');
    assert.ok(r.frames >= 60 * 60 && r.frames <= 60 * 240, `seed ${seed}: ${(r.frames / 60).toFixed(0)} s`);
    const boss = (r.frames - r.bossAt) / r.frames;
    assert.ok(boss >= 0.2 && boss <= 0.7, `seed ${seed}: the fight is ${(boss * 100).toFixed(0)}% of the run`);
    if (r.lit >= 1 && r.stunned >= 60) boxed++;
  }
  assert.ok(clears >= 6, `cleared ${clears} of 10`);
  assert.ok(boxed >= clears * 0.6, `the bot used the power box in ${boxed} of ${clears} wins`);
});

test('whole run: with no shooter in the party the bot never touches the breaker and flanks Grigori down, more slowly', () => {
  let clears = 0, withShooter = 0, without = 0;
  for (const seed of runs(6)) {
    const a = play(seed, NO_SHOOTER);
    assert.ok(a.done || a.allDown, `seed ${seed} got stuck after ${a.frames} frames`);
    assert.equal(a.lit, 0, `seed ${seed}: nobody can shoot the breaker`);
    assert.equal(a.stunned, 0);
    const b = play(seed, defaultParty('3.2'));
    if (a.done && b.done) { clears++; without += a.frames - a.bossAt; withShooter += b.frames - b.bossAt; }
  }
  assert.ok(clears >= 3, `both parties cleared the same seed in ${clears} of 6`);
  assert.ok(without > withShooter * 1.4, `flanking alone took ${(without / clears / 60).toFixed(0)} s a fight against ${(withShooter / clears / 60).toFixed(0)} s with a shooter`);
});

test('whole run: kid is a walk, and a bot that never dodges and upside both finish, in a win or a wipe', () => {
  const kid = runs(10).filter((seed) => play(seed, defaultParty('3.2'), 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let upside = 0;
  for (const seed of runs(10)) {
    const b = play(seed, defaultParty('3.2'), 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    const u = play(seed, defaultParty('3.2'), 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
    if (u.done) upside++;
  }
  assert.ok(upside >= 2, `upside cleared ${upside} of 10`);
});
