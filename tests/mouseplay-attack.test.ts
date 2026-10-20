// The mouse driver (world/mouseplay.ts): a click on an enemy. The hero closes in, faces it and holds Attack until it falls, the
// shooters line their shot up, Hopper taps, and a kill never chains into a neighbour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { footOf } from '../src/world/mousepick.ts';
import { MARK_FRAMES, MISS_MAX, NO_TICK, NUDGE, STUCK_TICKS, TRACK_R, createMousePlay } from '../src/world/mouseplay.ts';
import type { MouseTick } from '../src/world/mouseplay.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { arena, idle, makeSim, rat } from './sim-helpers.ts';
import type { ActorView, SimInput, SimView } from '../src/core/types.ts';
import { click, dist, step, until, wall, foeOf, attack, actor, stub } from './mouse-helpers.ts';

// ---------------------------------------------------------------- attacking
test('attack: Mike walks up to a rat, hits it until it is dead, and the goal ends with the kill', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid, party: [{ id: 'mike' }], spawns: [rat('r1', 14, 8)] });
  const mouse = createMousePlay(grid);
  const target = foeOf(sim, 'rat') as ActorView;
  const reach = HERO_DEFS.mike.basic.reach;
  let chasing = 0, swinging = 0;
  step(sim, mouse, attack(target));
  for (let i = 1; i < 900 && mouse.marker()?.live; i++) {
    const rv = foeOf(sim, 'rat') as ActorView;
    const d = dist(sim.heroPos(), footOf(rv));
    const out = step(sim, mouse);
    // Held only inside reach (with the hysteresis), never while closing in from afar.
    if (out.attackHeld) { swinging++; assert.ok(d <= reach + 2 + 1e-6, `swung at ${d} px`); }
    else if (d > reach + 2) chasing++;
    if (out.attackHeld) assert.ok(Math.hypot(out.mx, out.my) <= NUDGE + 1e-9, 'a swing only turns him');
    else if (mouse.marker()?.live && d > reach + 2) assert.ok(Math.hypot(out.mx, out.my) > 0.9, 'a chase walks');
  }
  assert.equal(mouse.marker()?.live, false);
  assert.equal(mouse.marker()?.kind, 'attack');
  assert.equal(sim.enemiesAlive(), 0, 'the rat is dead');
  assert.ok(chasing > 20, `chased for ${chasing} ticks`);
  assert.ok(swinging > 0, 'and swung');
  // With the kill the driver lets go: the next tick is the keys.
  const keys = idle();
  assert.equal(mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos()), keys);
});

test('attack: the marker follows the target, and stays on its last spot after the kill', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid, party: [{ id: 'mike' }], spawns: [rat('r1', 14, 8)] });
  const mouse = createMousePlay(grid);
  const target = foeOf(sim, 'rat') as ActorView;
  step(sim, mouse, attack(target));
  assert.deepEqual(mouse.marker(), { kind: 'attack', x: target.x, y: target.y, age: 0, live: true });
  for (let i = 0; i < 100; i++) step(sim, mouse);
  const moved = mouse.marker();
  assert.ok(moved && moved.live && dist(moved, footOf(foeOf(sim, 'rat') as ActorView)) < 6, 'the marker is on the rat as it walks');
  assert.ok(moved.x !== target.x, 'and the rat did walk');
  for (let i = 0; i < 900 && mouse.marker()?.live; i++) step(sim, mouse);
  const last = mouse.marker();
  assert.equal(last?.live, false);
  assert.ok(last && dist(last, sim.heroPos()) < 40, 'the last spot is where the rat died, by the hero');
});

test('attack: the hysteresis, closing in at reach - 4 and letting go above reach + 2 for a swing', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const hero = { x: 100, y: 100 };
  const rv = (d: number): SimView => stub({ foes: [actor('enemy', 'rat', 100 + d, 100)] });
  const go = click({ kind: 'attack', id: 'rat', x: 140, y: 100 });
  const held = (d: number, tick: MouseTick = NO_TICK): boolean => mouse.drive(idle(), tick, rv(d), hero).attackHeld;
  assert.equal(HERO_DEFS.mike.basic.reach, 28);
  assert.equal(held(40, go), false, 'far: closing in');
  assert.equal(held(27), false, '27 px is outside 24');
  assert.equal(held(24), true, 'at 24 he stands and fights');
  assert.equal(held(29), true, '29 px: still fighting');
  assert.equal(held(30), true, '30 px: the edge of the hysteresis');
  assert.equal(held(31), false, '31 px: out of reach, closing in again');
  assert.equal(held(27), false, 'and not back in until 24');
  assert.equal(held(23), true);
});

test('attack: a shooter closes in to 0.7 of his reach and lets go past 0.95', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const reach = HERO_DEFS.lucas.basic.reach;
  // The rat stands still on his row and the hero is moved, so it stays inside TRACK_R of where it was last seen.
  const foes = [actor('enemy', 'rat', 300, 100)];
  const held = (d: number, tick: MouseTick = NO_TICK): boolean => mouse.drive(idle(), tick, stub({ hero: 'lucas', foes }), { x: 300 - d, y: 100 }).attackHeld;
  const go = click({ kind: 'attack', id: 'rat', x: 300, y: 100 });
  assert.equal(held(140, go), false);
  assert.equal(held(0.7 * reach + 1), false);
  assert.equal(held(0.7 * reach - 1), true);
  assert.equal(held(0.95 * reach - 1), true, 'still fighting at 0.95');
  assert.equal(held(0.95 * reach + 1), false, 'and out past it');
  assert.equal(held(0.7 * reach + 1), false, 'not back in until 0.7');
});

test('attack: no swing without a clear line to the enemy, unless it is a flyer or the Mind Flayer', () => {
  // A wall tile at x = 12 (192 to 208). The hero stands at its left, the enemy 20 px away on its right.
  const grid = arena(24, 16, wall(1, 14));
  const hero = { x: 188, y: 140 };
  for (const [id, expected] of [['rat', false], ['demobat', true], ['flayer', true], ['flayer5', true]] as const) {
    const mouse = createMousePlay(grid);
    const v = stub({ foes: [actor('enemy', id, 208, 140)] });
    const out = mouse.drive(idle(), click({ kind: 'attack', id, x: 208, y: 140 }), v, hero);
    assert.equal(out.attackHeld, expected, id);
  }
});

test('attack: Lucas lines the shot up on one of eight directions before he fires', () => {
  const grid = arena(24, 16);
  const hero = { x: 60, y: 100 };
  const go = (foe: ActorView): MouseTick => click({ kind: 'attack', id: 'rat', ...footOf(foe) });
  // 100 px right and 30 down: 29.9 px off the line, far past MISS_MAX. He steps down the perpendicular, not firing.
  const off = actor('enemy', 'rat', 160, 130);
  const mouse = createMousePlay(grid);
  const strafe = mouse.drive(idle(), go(off), stub({ hero: 'lucas', foes: [off] }), hero);
  assert.equal(strafe.attackHeld, false);
  assert.ok(Math.abs(strafe.mx) < 1e-9 && strafe.my === 1, `strafed ${strafe.mx}, ${strafe.my}`);
  // The same from the other side of the line.
  const above = actor('enemy', 'rat', 160, 70);
  const strafeUp = createMousePlay(grid).drive(idle(), go(above), stub({ hero: 'lucas', foes: [above] }), hero);
  assert.equal(strafeUp.my, -1);
  assert.equal(strafeUp.attackHeld, false);
  // On the line he fires, and the nudge turns him to it without walking him off.
  const on = actor('enemy', 'rat', 160, 102);
  const fire = createMousePlay(grid).drive(idle(), go(on), stub({ hero: 'lucas', foes: [on] }), hero);
  assert.equal(fire.attackHeld, true);
  assert.ok(fire.mx > 0.19 && Math.hypot(fire.mx, fire.my) <= NUDGE + 1e-9);
  // MISS_MAX is the line: across it he steps, short of it he fires.
  const d = Math.hypot(100, 5);
  assert.ok(d * Math.sin(Math.atan2(5, 100)) < MISS_MAX);
  // Will and Nancy are shooters too, and Dustin's spray is wide enough that he is not.
  for (const [id, strafes] of [['will', true], ['nancy', true], ['dustin', false], ['robin', false]] as const) {
    const foe = actor('enemy', 'rat', 100, 114);
    const out = createMousePlay(grid).drive(idle(), go(foe), stub({ hero: id, foes: [foe] }), { x: 60, y: 100 });
    assert.equal(out.attackHeld, !strafes, id);
  }
});

test('attack: a sidestep pinned against a wall closes in on the target instead, and gives up if even that does not move him', () => {
  const grid = arena(24, 16);
  const hero = { x: 60, y: 100 };
  const foe = actor('enemy', 'rat', 160, 130);
  const go = click({ kind: 'attack', id: 'rat', ...footOf(foe) });
  const view = stub({ hero: 'lucas', foes: [foe] });
  const mouse = createMousePlay(grid);
  // The hero is held where he is, as if the wall were under his feet: the sidestep goes nowhere.
  const outs: SimInput[] = [];
  for (let i = 0; i < STUCK_TICKS - 1; i++) outs.push(mouse.drive(idle(), i === 0 ? go : NO_TICK, view, hero));
  assert.ok(Math.abs(outs[0]!.mx) < 1e-9 && outs[0]!.my === 1, 'first he sidesteps');
  const turned = outs.findIndex((o) => o.mx > 0.9);
  assert.ok(turned >= 4 && turned <= 12, `closed in after ${turned} ticks`);
  assert.ok(outs.slice(turned).every((o) => o.mx > 0.9 && o.my > 0 && !o.attackHeld), 'and kept on toward the rat, not firing');
  assert.equal(mouse.marker()?.live, true);
  mouse.drive(idle(), NO_TICK, view, hero);
  assert.equal(mouse.marker()?.live, false, 'STUCK_TICKS without moving ends the goal');
});

test('attack: Lucas gets a rat that is off his line, and kills it', () => {
  const grid = arena(24, 16);
  // Lucas starts at tile row 8 and the rat three rows below, off every line to him until it comes closer.
  const sim = makeSim({ grid, party: [{ id: 'lucas' }], spawns: [rat('r1', 14, 11)] });
  const mouse = createMousePlay(grid);
  const target = foeOf(sim, 'rat') as ActorView;
  const took = until(sim, mouse, attack(target), 1500);
  assert.ok(took > 0, 'the goal ended');
  assert.equal(sim.enemiesAlive(), 0, 'the rat is dead');
});

test('attack: Hopper at Lv 6 taps Attack, press and let go in turn, and kills a rat', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid, party: [{ id: 'hopper', level: 6 }], spawns: [rat('r1', 12, 8)] });
  assert.equal(sim.view().hud.party[0]?.level, 6);
  const mouse = createMousePlay(grid);
  const target = foeOf(sim, 'rat') as ActorView;
  const outs: SimInput[] = [];
  step(sim, mouse, attack(target));
  for (let i = 1; i < 1200 && mouse.marker()?.live; i++) {
    const d = dist(sim.heroPos(), footOf(foeOf(sim, 'rat') as ActorView));
    const out = step(sim, mouse);
    if (out.attackHeld || out.attackPressed || d <= HERO_DEFS.hopper.basic.reach + 2) outs.push(out);
  }
  assert.equal(sim.enemiesAlive(), 0, 'the rat is dead');
  assert.ok(outs.some((o) => o.attackPressed && o.attackHeld), 'a press with the key down');
  assert.ok(outs.some((o) => !o.attackPressed && !o.attackHeld), 'and a tick with it up, which is the swing');
  for (let i = 1; i < outs.length - 1; i++) {
    const o = outs[i] as SimInput;
    if (o.attackPressed) assert.equal(o.attackHeld, true, 'a press always comes with the key down');
  }
  // The pulse is strict: no two presses back to back while he stands and fights.
  let run = 0;
  for (const o of outs) { run = o.attackPressed ? run + 1 : 0; assert.ok(run <= 1, 'two presses in a row'); }
});

test('attack: Hopper before Lv 6 just holds Attack like everyone else', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const foe = actor('enemy', 'rat', 120, 100);
  const go = click({ kind: 'attack', id: 'rat', x: 120, y: 100 });
  const view = stub({ hero: 'hopper', level: 5, foes: [foe] });
  for (let i = 0; i < 4; i++) {
    const out = mouse.drive(idle(), i === 0 ? go : NO_TICK, view, { x: 100, y: 100 });
    assert.equal(out.attackHeld, true);
    assert.equal(out.attackPressed, false);
  }
});

test('attack: two rats side by side, and the goal ends with the one that was clicked', () => {
  const grid = arena(24, 16);
  // The second is 16 px behind the first, well inside TRACK_R of where the first dies.
  const sim = makeSim({ grid, party: [{ id: 'mike' }], spawns: [rat('r1', 14, 8), rat('r2', 15, 8)] });
  assert.ok(16 < TRACK_R);
  const mouse = createMousePlay(grid);
  const rats = sim.view().actors.filter((a) => a.kind === 'enemy');
  const first = rats.reduce((p, q) => (q.x < p.x ? q : p));
  step(sim, mouse, attack(first));
  let killed = -1;
  for (let i = 1; i < 1200 && mouse.marker()?.live; i++) {
    step(sim, mouse);
    if (killed < 0 && sim.enemiesAlive() < 2) killed = i;
  }
  assert.ok(killed > 0, 'the first rat died');
  assert.equal(mouse.marker()?.live, false, 'and the goal ended');
  // If the hero's own swings did not catch the second as well, it is still there and he does not go after it.
  const left = sim.enemiesAlive();
  const mark = mouse.marker() as NonNullable<ReturnType<typeof mouse.marker>>;
  for (let i = 0; i < 20 && left > 0; i++) {
    const keys = idle();
    assert.equal(mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos()), keys, 'the keys, untouched');
    sim.step(keys);
  }
  assert.ok(mark.age < MARK_FRAMES);
});

test('attack: a target that is out of the fight, or gone, ends the goal at once', () => {
  const grid = arena(24, 16);
  const hero = { x: 100, y: 100 };
  const go = click({ kind: 'attack', id: 'rat', x: 140, y: 100 });
  const cases: [string, ActorView[]][] = [
    ['dead', [actor('enemy', 'rat', 140, 100, { anim: 'ko' })]],
    ['hidden', [actor('enemy', 'rat', 140, 100, { hidden: true })]],
    ['gone', []],
    ['a different kind', [actor('enemy', 'agent', 140, 100)]],
    ['too far from where it was', [actor('enemy', 'rat', 140 + TRACK_R + 1, 100)]],
    ['a hero with its name', [actor('hero', 'mike', 140, 100)]],
  ];
  for (const [name, foes] of cases) {
    const mouse = createMousePlay(grid);
    const keys = idle();
    assert.equal(mouse.drive(keys, go, stub({ foes }), hero), keys, name);
    assert.equal(mouse.marker()?.live, false, name);
  }
  // One that moved less than TRACK_R is the same rat.
  const mouse = createMousePlay(grid);
  const out = mouse.drive(idle(), go, stub({ foes: [actor('enemy', 'rat', 140 + TRACK_R - 1, 100)] }), hero);
  assert.equal(mouse.marker()?.live, true);
  assert.ok(out.mx > 0.9);
});

test('attack: the nearest of two rats to where the first one was is the one followed', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const hero = { x: 40, y: 100 };
  const near = actor('enemy', 'rat', 150, 100), far = actor('enemy', 'rat', 150 + TRACK_R - 4, 100);
  mouse.drive(idle(), click({ kind: 'attack', id: 'rat', x: 148, y: 100 }), stub({ foes: [far, near] }), hero);
  assert.deepEqual(mouse.marker(), { kind: 'attack', x: 150, y: 100, age: 0, live: true });
});

test('attack: a leg is followed to its tip', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const leg = actor('enemy', 'flayerleg', 100, 40, { aim: { x: 180, y: 120 } });
  mouse.drive(idle(), click({ kind: 'attack', id: 'flayerleg', x: 180, y: 120 }), stub({ foes: [leg] }), { x: 40, y: 120 });
  assert.deepEqual(mouse.marker(), { kind: 'attack', x: 180, y: 120, age: 0, live: true });
});

test('attack: a chase that cannot get anywhere gives up as stuck', () => {
  // The rat is behind a wall that spans the arena.
  const grid = arena(24, 16, wall(1, 14));
  const sim = makeSim({ grid, party: [{ id: 'mike' }], spawns: [rat('r1', 20, 8, 'g', { dormant: false })] });
  const mouse = createMousePlay(grid);
  const foe = foeOf(sim, 'rat') as ActorView;
  const took = until(sim, mouse, attack(foe), 900);
  assert.ok(took > 0 && took < 400, `took ${took}`);
  assert.equal(sim.enemiesAlive(), 1, 'the rat lives');
});
