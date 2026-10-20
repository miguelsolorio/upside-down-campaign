// The mouse driver (world/mouseplay.ts): keys win over the mouse, what ends a goal, the right click Special and its aim, the Crit
// column, the marker and reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK_FRAMES, NO_TICK, NUDGE, createMousePlay } from '../src/world/mouseplay.ts';
import type { MousePlay } from '../src/world/mouseplay.ts';
import { DEADZONE } from '../src/combat/hero.ts';
import { arena, idle, inp, makeSim, makeWhite, tc, tf } from './sim-helpers.ts';
import type { PartyHud, Sim, SimInput } from '../src/core/types.ts';
import { click, walkTo, step, until, actor, stub } from './mouse-helpers.ts';

// ---------------------------------------------------------------- keys win
function liveWalk(): { sim: Sim; mouse: MousePlay } {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  step(sim, mouse, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 5; i++) step(sim, mouse);
  assert.equal(mouse.marker()?.live, true);
  return { sim, mouse };
}

test('keys win: movement, Attack, a swap, or the Crit key each drop the goal at once and pass through unchanged', () => {
  const cancels: [string, Partial<SimInput>][] = [
    ['mx', { mx: -1 }], ['my', { my: 0.4 }], ['attackPressed', { attackPressed: true }], ['attackHeld', { attackHeld: true }],
    ['swapTo', { swapTo: 1 }], ['swapTo 0', { swapTo: 0 }], ['swapDelta', { swapDelta: 1 }], ['swapDelta back', { swapDelta: -1 }],
    ['burstPressed', { burstPressed: true }],
  ];
  for (const [name, over] of cancels) {
    const { sim, mouse } = liveWalk();
    const keys = inp(over);
    const out = mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos());
    assert.equal(out, keys, `${name}: the keys as they were`);
    assert.equal(mouse.marker()?.live, false, `${name}: the goal ended`);
    // And it stays ended.
    const idleKeys = idle();
    assert.equal(mouse.drive(idleKeys, NO_TICK, sim.view(), sim.heroPos()), idleKeys, `${name}: still ended`);
  }
});

test('keys win: a Special key does not stop a walk, and rides along with it', () => {
  const { sim, mouse } = liveWalk();
  const out = mouse.drive(inp({ specialPressed: true, specialHeld: true }), NO_TICK, sim.view(), sim.heroPos());
  assert.equal(mouse.marker()?.live, true);
  assert.ok(out.mx > 0.9, 'still walking');
  assert.equal(out.specialPressed, true);
  assert.equal(out.specialHeld, true);
});

test('keys win: a click in a tick with a movement key held is ignored, not even marked', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const keys = inp({ mx: 1 });
  assert.equal(mouse.drive(keys, walkTo(tc(18), tf(8)), sim.view(), sim.heroPos()), keys);
  assert.equal(mouse.marker(), null);
  const next = idle();
  assert.equal(mouse.drive(next, NO_TICK, sim.view(), sim.heroPos()), next, 'and it does not start when the key comes up');
  // The same for Attack held, a swap, and an attack click.
  for (const over of [{ attackHeld: true }, { attackPressed: true }, { swapTo: 2 }, { swapDelta: -1 as const }, { mx: 0, my: -1 }]) {
    const m = createMousePlay(grid);
    const k = inp(over);
    assert.equal(m.drive(k, walkTo(tc(18), tf(8)), sim.view(), sim.heroPos()), k);
    assert.equal(m.marker(), null);
  }
  const m2 = createMousePlay(grid);
  const k2 = inp({ mx: 1 });
  m2.drive(k2, click({ kind: 'attack', id: 'rat', x: 100, y: 100 }), stub({ foes: [actor('enemy', 'rat', 100, 100)] }), { x: 50, y: 100 });
  assert.equal(m2.marker(), null);
});

test('keys win: a click on the active hero stops the walk', () => {
  const { sim, mouse } = liveWalk();
  const out = mouse.drive(idle(), click('stop'), sim.view(), sim.heroPos());
  assert.equal(mouse.marker()?.live, false);
  assert.deepEqual(out, idle());
  const none = createMousePlay(arena(24, 16));
  assert.equal(none.drive(idle(), click('stop'), sim.view(), sim.heroPos()).mx, 0);
  assert.equal(none.marker(), null, 'and with no goal it does nothing');
});

// ---------------------------------------------------------------- the party changes under the goal
test('goal ends on a swap: the hero it was for is no longer the active one', () => {
  const { sim, mouse } = liveWalk();
  // The swap goes through the sim by hand, as a click on the portrait would; the next drive sees another hero.
  sim.step(inp({ swapTo: 1 }));
  const active = sim.view().hud.party.find((p) => p.active);
  assert.equal(active?.id, 'dustin');
  const keys = idle();
  assert.equal(mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos()), keys);
  assert.equal(mouse.marker()?.live, false);
});

test('goal ends when the active hero is knocked out, whether or not the party swaps', () => {
  // Down to 0 HP: the sim tags the next hero in.
  const a = makeWhite();
  const ma = createMousePlay(arena(24, 16));
  step(a.sim, ma, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 5; i++) step(a.sim, ma);
  a.s.heroes[0]!.hp = 0;
  a.sim.step(idle());
  assert.equal(a.sim.view().hud.party.find((p) => p.active)?.id, 'dustin');
  const keysA = idle();
  assert.equal(ma.drive(keysA, NO_TICK, a.sim.view(), a.sim.heroPos()), keysA);
  assert.equal(ma.marker()?.live, false);
  // Knocked out and still the active one (nobody to swap to): no goal for a hero who cannot move.
  const b = makeWhite({ party: [{ id: 'mike' }] });
  const mb = createMousePlay(arena(24, 16));
  step(b.sim, mb, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 5; i++) step(b.sim, mb);
  b.s.heroes[0]!.ko = true;
  b.s.heroes[0]!.hp = 0;
  b.sim.step(idle());
  const hud = b.sim.view().hud.party[0] as PartyHud;
  assert.ok(hud.active && hud.ko);
  const keysB = idle();
  assert.equal(mb.drive(keysB, NO_TICK, b.sim.view(), b.sim.heroPos()), keysB);
  assert.equal(mb.marker()?.live, false);
  // And a click while he is down is not taken up.
  assert.equal(mb.drive(keysB, walkTo(tc(18), tf(8)), b.sim.view(), b.sim.heroPos()), keysB);
  assert.equal(mb.marker()?.live, false);
});

test('goal ends while Eddie plays his Hellfire solo, and a click then is not taken up', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const hero = { x: 100, y: 100 };
  const out = mouse.drive(idle(), walkTo(200, 100), stub(), hero);
  assert.ok(out.mx > 0.9 && mouse.marker()?.live);
  const keys = idle();
  assert.equal(mouse.drive(keys, NO_TICK, stub({ solo: true }), hero), keys);
  assert.equal(mouse.marker()?.live, false);
  const m2 = createMousePlay(grid);
  assert.equal(m2.drive(keys, walkTo(200, 100), stub({ solo: true }), hero), keys);
  assert.equal(m2.marker(), null);
});

test('no active hero in the view ends the goal and refuses a click', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const hero = { x: 100, y: 100 };
  mouse.drive(idle(), walkTo(200, 100), stub(), hero);
  const v = stub();
  (v.hud.party[0] as PartyHud).active = false;
  const keys = idle();
  assert.equal(mouse.drive(keys, NO_TICK, v, hero), keys);
  assert.equal(mouse.marker()?.live, false);
  const m2 = createMousePlay(grid);
  assert.equal(m2.drive(keys, walkTo(200, 100), v, hero), keys);
  assert.equal(m2.marker(), null);
});

// ---------------------------------------------------------------- the Special
test('right click: Special is pressed for one tick only, and the hero faces the cursor in eight directions', () => {
  const dirs: [string, number, number][] = [
    ['right', 30, 0], ['down right', 30, 30], ['down', 0, 30], ['down left', -30, 30], ['left', -30, 0],
    ['up left', -30, -30], ['up', 0, -30], ['up right', 30, -30],
  ];
  for (const [name, dx, dy] of dirs) {
    const { sim, s } = makeWhite();
    const mouse = createMousePlay(arena(24, 16));
    const h = sim.heroPos();
    // The cursor is measured from the chest, 7 px above the feet.
    const cursor = { x: h.x + dx, y: h.y - 7 + dy };
    const out = mouse.drive(idle(), { ...NO_TICK, special: cursor }, sim.view(), h);
    assert.equal(out.specialPressed, true, name);
    assert.ok(Math.hypot(out.mx, out.my) > DEADZONE && Math.hypot(out.mx, out.my) <= NUDGE + 1e-9, `${name}: a nudge`);
    sim.step(out);
    const aim = s.heroes[0]!.aim;
    const want = Math.atan2(dy, dx);
    assert.ok(Math.abs(Math.cos(aim) - Math.cos(want)) < 1e-9 && Math.abs(Math.sin(aim) - Math.sin(want)) < 1e-9, `${name}: aim ${aim}`);
    // The next tick has no press.
    const next = mouse.drive(idle(), NO_TICK, sim.view(), sim.heroPos());
    assert.equal(next.specialPressed, false, `${name}: one tick`);
  }
});

test('right click: a cursor off the 8-way lines snaps to the nearest, aimed from the chest', () => {
  const { sim, s } = makeWhite();
  const mouse = createMousePlay(arena(24, 16));
  const h = sim.heroPos();
  // 60 right and 20 down from the chest: 18 degrees, which snaps to straight right.
  sim.step(mouse.drive(idle(), { ...NO_TICK, special: { x: h.x + 60, y: h.y - 7 + 20 } }, sim.view(), h));
  assert.ok(Math.abs(s.heroes[0]!.aim) < 1e-9);
  // 12 px right and 7 px above the feet is 12 px right of the chest: straight right, not up and right.
  const w = makeWhite();
  const m2 = createMousePlay(arena(24, 16));
  const h2 = w.sim.heroPos();
  w.sim.step(m2.drive(idle(), { ...NO_TICK, special: { x: h2.x + 12, y: h2.y - 7 } }, w.sim.view(), h2));
  assert.ok(Math.abs(w.s.heroes[0]!.aim) < 1e-9);
});

test('right click: held keys steer the aim, not the cursor; a point on the hero or the HUD strip aims nothing', () => {
  const { sim } = makeWhite();
  const mouse = createMousePlay(arena(24, 16));
  const h = sim.heroPos();
  const keys = inp({ mx: -1 });
  const out = mouse.drive(keys, { ...NO_TICK, special: { x: h.x + 50, y: h.y } }, sim.view(), h);
  assert.equal(out.mx, -1);
  assert.equal(out.my, 0);
  assert.equal(out.specialPressed, true);
  // The strip has no spot to aim at.
  const strip = mouse.drive(idle(), { ...NO_TICK, special: true }, sim.view(), h);
  assert.equal(strip.specialPressed, true);
  assert.equal(strip.mx, 0);
  assert.equal(strip.my, 0);
  // A click on the chest itself has no direction.
  const on = mouse.drive(idle(), { ...NO_TICK, special: { x: h.x, y: h.y - 7 } }, sim.view(), h);
  assert.equal(on.specialPressed, true);
  assert.equal(on.mx, 0);
});

test('right click: the cast spends MP, and the hero fires it where he was pointed', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'lucas' }] });
  const mouse = createMousePlay(arena(24, 16));
  const h = sim.heroPos();
  const before = s.heroes[0]!.mp;
  sim.step(mouse.drive(idle(), { ...NO_TICK, special: { x: h.x, y: h.y - 7 + 40 } }, sim.view(), h));
  assert.ok(s.heroes[0]!.mp < before, 'Triple shot was cast');
  assert.ok(Math.abs(s.heroes[0]!.aim - Math.PI / 2) < 1e-9, 'straight down');
});

test('right click: the held button is mirrored in specialHeld, with or without a press, on top of the keys', () => {
  const { sim } = makeWhite();
  const mouse = createMousePlay(arena(24, 16));
  const h = sim.heroPos();
  const held = mouse.drive(idle(), { ...NO_TICK, specialHeld: true }, sim.view(), h);
  assert.equal(held.specialHeld, true);
  assert.equal(held.specialPressed, false);
  assert.equal(mouse.drive(inp({ specialHeld: true }), NO_TICK, sim.view(), h).specialHeld, true, 'the key alone');
  assert.equal(mouse.drive(inp({ specialHeld: true }), { ...NO_TICK, specialHeld: true }, sim.view(), h).specialHeld, true);
  const keys = idle();
  const off = mouse.drive(keys, NO_TICK, sim.view(), h);
  assert.equal(off.specialHeld, false);
  assert.equal(off, keys, 'and released: the keys as they were');
  // A held right button does not stop a walk.
  mouse.drive(idle(), walkTo(tc(18), tf(8)), sim.view(), h);
  const walking = mouse.drive(idle(), { ...NO_TICK, specialHeld: true }, sim.view(), h);
  assert.equal(walking.specialHeld, true);
  assert.ok(walking.mx > 0.9);
  assert.equal(mouse.marker()?.live, true);
});

test('right click during a walk: the Special does not end the walk, which picks up on the next tick', () => {
  const { sim, mouse } = liveWalk();
  const h = sim.heroPos();
  const aimed = mouse.drive(idle(), { ...NO_TICK, special: { x: h.x - 40, y: h.y - 7 } }, sim.view(), h);
  assert.equal(aimed.specialPressed, true);
  assert.ok(aimed.mx < 0 && Math.hypot(aimed.mx, aimed.my) <= NUDGE + 1e-9, 'a turn to the cursor for this tick');
  assert.equal(mouse.marker()?.live, true);
  const next = mouse.drive(idle(), NO_TICK, sim.view(), h);
  assert.ok(next.mx > 0.9, 'and on again');
  assert.equal(next.specialPressed, false);
});

// ---------------------------------------------------------------- the Crit
test('burst: a click on the lit Crit column fires it, and ends the goal; unlit, it fires nothing but still ends the goal', () => {
  const lit = makeWhite();
  lit.s.burst = 1;
  assert.equal(lit.sim.view().hud.burstReady, true);
  const mouse = createMousePlay(arena(24, 16));
  step(lit.sim, mouse, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 5; i++) step(lit.sim, mouse);
  const out = mouse.drive(idle(), { ...NO_TICK, burst: true }, lit.sim.view(), lit.sim.heroPos());
  assert.equal(out.burstPressed, true);
  assert.equal(out.mx, 0, 'the walk is over');
  assert.equal(mouse.marker()?.live, false);

  const dim = makeWhite();
  assert.equal(dim.sim.view().hud.burstReady, false);
  const m2 = createMousePlay(arena(24, 16));
  step(dim.sim, m2, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 5; i++) step(dim.sim, m2);
  const out2 = m2.drive(idle(), { ...NO_TICK, burst: true }, dim.sim.view(), dim.sim.heroPos());
  assert.equal(out2.burstPressed, false, 'gated on burstReady');
  assert.equal(m2.marker()?.live, false);
});

test('burst: the Crit key from the keyboard passes through, and a lit click adds to a key that is down', () => {
  const lit = makeWhite();
  lit.s.burst = 1;
  const mouse = createMousePlay(arena(24, 16));
  const keys = inp({ burstPressed: true });
  assert.equal(mouse.drive(keys, NO_TICK, lit.sim.view(), lit.sim.heroPos()), keys);
  assert.equal(mouse.drive(keys, { ...NO_TICK, burst: true }, lit.sim.view(), lit.sim.heroPos()).burstPressed, true);
});

test('burst: the Crit fires in the real sim off a click and drains the meter', () => {
  const { sim, s } = makeWhite();
  s.burst = 1;
  const mouse = createMousePlay(arena(24, 16));
  const out = step(sim, mouse, { ...NO_TICK, burst: true });
  assert.equal(out.burstPressed, true);
  for (let i = 0; i < 4; i++) step(sim, mouse);
  assert.ok(s.burst < 1, `the meter is ${s.burst}`);
});

// ---------------------------------------------------------------- the marker
test('marker: live while the goal is, then live: false and ageing for MARK_FRAMES ticks, then null', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  assert.equal(mouse.marker(), null);
  step(sim, mouse, walkTo(tc(18), tf(8)));
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: tc(18), y: tf(8), age: 0, live: true });
  for (let i = 1; i <= 10; i++) {
    step(sim, mouse);
    const m = mouse.marker();
    assert.ok(m && m.live && m.age === i, `live age ${m?.age}`);
  }
  // The player clicks the hero: the goal ends that tick.
  step(sim, mouse, click('stop'));
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: tc(18), y: tf(8), age: 0, live: false });
  for (let i = 1; i < MARK_FRAMES; i++) {
    step(sim, mouse);
    const m = mouse.marker();
    assert.ok(m && !m.live && m.age === i, `tick ${i}: ${JSON.stringify(m)}`);
    assert.equal(m.x, tc(18));
  }
  step(sim, mouse);
  assert.equal(mouse.marker(), null, 'gone after MARK_FRAMES');
  step(sim, mouse);
  assert.equal(mouse.marker(), null);
});

test('marker: a new goal brings a live marker back at once, and a copy cannot be used to change the driver', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  step(sim, mouse, walkTo(tc(18), tf(8)));
  step(sim, mouse, click('stop'));
  step(sim, mouse);
  step(sim, mouse, walkTo(tc(6), tf(3)));
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: tc(6), y: tf(3), age: 0, live: true });
  const m = mouse.marker();
  if (m) m.age = 99;
  assert.equal(mouse.marker()?.age, 0);
});

test('marker: a walk that arrives leaves its fading marker on the spot', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const took = until(sim, mouse, walkTo(tc(9), tf(8)), 400);
  assert.ok(took > 0);
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: tc(9), y: tf(8), age: 0, live: false });
});

test('reset: drops the goal and the marker', () => {
  const { sim, mouse } = liveWalk();
  mouse.reset();
  assert.equal(mouse.marker(), null);
  const keys = idle();
  assert.equal(mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos()), keys);
});
