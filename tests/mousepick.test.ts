import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setScreenWidth, VIEW_TOP } from '../src/core/config.ts';
import { footOf, inField, isFoe, pickAt, toWorld } from '../src/world/mousepick.ts';
import type { ActorView, CharId, EnemyKind, HudView, PartyHud, SimView, Vec2 } from '../src/core/types.ts';

function actor(kind: ActorView['kind'], id: CharId | EnemyKind, x: number, y: number, over: Partial<ActorView> = {}): ActorView {
  return {
    kind, id, x, y, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null,
    ...over,
  };
}
const foe = (id: EnemyKind, x: number, y: number, over: Partial<ActorView> = {}): ActorView => actor('enemy', id, x, y, over);
const hero = (id: CharId, x: number, y: number, over: Partial<ActorView> = {}): ActorView => actor('hero', id, x, y, over);

/** A stub view: the picker reads only the actors. */
function view(actors: ActorView[], party: Partial<PartyHud>[] = []): SimView {
  const hud = { party, burst: 0, burstReady: false, solo: null } as unknown as HudView;
  return {
    actors, fx: [], items: [], props: [], hazards: [], pools: [], floaters: [], hud, focus: { x: 0, y: 0 }, shake: { x: 0, y: 0 }, flash: 0,
  };
}

const at = (x: number, y: number): Vec2 => ({ x, y });

test('toWorld: adds the camera, drops the HUD strip and takes off the shake', () => {
  const w = toWorld(at(10, VIEW_TOP + 30), { x: 100, y: 50 });
  assert.deepEqual(w, { x: 110, y: 80 });
  const s = toWorld(at(10, VIEW_TOP + 30), { x: 100, y: 50 }, at(2, -1));
  assert.deepEqual(s, { x: 108, y: 81 });
  // A camera that has not moved: the top of the field is the top of the world.
  assert.deepEqual(toWorld(at(0, VIEW_TOP), { x: 0, y: 0 }), { x: 0, y: 0 });
});

test('inField: below the strip and inside the band, at 256 wide', () => {
  assert.equal(VIEW_TOP, 20);
  assert.equal(inField(at(0, 20)), true);
  assert.equal(inField(at(255.9, 223)), true);
  assert.equal(inField(at(256, 100)), false, 'the right edge is outside');
  assert.equal(inField(at(-0.1, 100)), false);
  assert.equal(inField(at(100, 19.9)), false, 'the strip is not the field');
  assert.equal(inField(at(100, 5)), false);
});

test('inField: reads the live width, a wider screen has side bars and a taller strip', () => {
  setScreenWidth(640);
  try {
    // 640 wide: the clear band is 448 wide, centered, so it runs 96 to 544. The strip is 26 tall.
    assert.equal(inField(at(95.9, 100)), false);
    assert.equal(inField(at(96, 100)), true);
    assert.equal(inField(at(543.9, 100)), true);
    assert.equal(inField(at(544, 100)), false);
    assert.equal(inField(at(300, 25.9)), false);
    assert.equal(inField(at(300, 26)), true);
    // toWorld follows the same strip.
    assert.deepEqual(toWorld(at(96, 26), { x: 5, y: 7 }), { x: 101, y: 7 });
  } finally {
    setScreenWidth(256);
  }
  assert.equal(inField(at(100, 19.9)), false);
  assert.equal(inField(at(100, 20)), true);
});

test('pickAt: an enemy is hit at its foot, its body and 8 px above, and not 30 px away', () => {
  const v = view([foe('rat', 100, 100)]);
  const rat = { kind: 'enemy', id: 'rat', x: 100, y: 100 };
  assert.deepEqual(pickAt(v, at(100, 100)), rat, 'the foot');
  assert.deepEqual(pickAt(v, at(100, 93)), rat, 'the body');
  assert.deepEqual(pickAt(v, at(100, 92)), rat, '8 px above');
  assert.deepEqual(pickAt(v, at(100, 80)), rat, 'the top of the box, 20 px above');
  assert.deepEqual(pickAt(v, at(109, 100)), rat, 'the side of the box');
  assert.deepEqual(pickAt(v, at(100, 103)), rat, '3 px below');
  assert.deepEqual(pickAt(v, at(100, 130)), { kind: 'ground', x: 100, y: 130 }, '30 px below');
  assert.deepEqual(pickAt(v, at(130, 100)), { kind: 'ground', x: 130, y: 100 }, '30 px to the side');
  assert.deepEqual(pickAt(v, at(100, 79)), { kind: 'ground', x: 100, y: 79 }, 'above the box');
  assert.deepEqual(pickAt(v, at(100, 104)), { kind: 'ground', x: 100, y: 104 }, 'below the box');
  assert.deepEqual(pickAt(v, at(110, 100)), { kind: 'ground', x: 110, y: 100 }, 'beside the box');
});

test('pickAt: with nothing on the field a click is ground at the point', () => {
  assert.deepEqual(pickAt(view([]), at(33.5, 44.25)), { kind: 'ground', x: 33.5, y: 44.25 });
});

test('pickAt: where boxes overlap the nearest body centre wins, whatever the order', () => {
  const a = foe('rat', 100, 100), b = foe('agent', 108, 104);
  // Bodies are at (100, 93) and (108, 97).
  assert.equal(pickAt(view([a, b]), at(101, 93)).kind, 'enemy');
  assert.deepEqual(pickAt(view([a, b]), at(101, 93)), { kind: 'enemy', id: 'rat', x: 100, y: 100 });
  assert.deepEqual(pickAt(view([b, a]), at(101, 93)), { kind: 'enemy', id: 'rat', x: 100, y: 100 });
  assert.deepEqual(pickAt(view([a, b]), at(107, 97)), { kind: 'enemy', id: 'agent', x: 108, y: 104 });
  assert.deepEqual(pickAt(view([b, a]), at(107, 97)), { kind: 'enemy', id: 'agent', x: 108, y: 104 });
});

test('pickAt: an enemy that is out of the fight is skipped, and the click falls through to ground', () => {
  const skipped: [string, Partial<ActorView>][] = [
    ['ko', { anim: 'ko' }],
    ['hidden', { hidden: true }],
    ['a goo puddle', { puddle: true }],
    ['rising', { pose: 'rise' }],
    ['falling', { pose: 'fall' }],
    ['climbing', { pose: 'climb' }],
    ['severed', { pose: 'severed' }],
  ];
  for (const [name, over] of skipped) {
    const v = view([foe('flayed', 100, 100, over)]);
    assert.deepEqual(pickAt(v, at(100, 96)), { kind: 'ground', x: 100, y: 96 }, name);
    assert.equal(isFoe(v.actors[0] as ActorView), false, name);
  }
  // An npc is never a pick.
  assert.deepEqual(pickAt(view([actor('npc', 'joyce', 100, 100)]), at(100, 96)), { kind: 'ground', x: 100, y: 96 });
  // A ko'd enemy does not hide a live one behind it.
  const v = view([foe('rat', 100, 100, { anim: 'ko' }), foe('rat', 104, 102)]);
  assert.deepEqual(pickAt(v, at(102, 96)), { kind: 'enemy', id: 'rat', x: 104, y: 102 });
});

test('isFoe: a live enemy in a pose that is not a skipped one counts, a hero or npc does not', () => {
  assert.equal(isFoe(foe('rat', 0, 0)), true);
  for (const pose of ['charge', 'stun', 'spit', 'leap', 'pinned', 'crouch', 'howl', 'grab', 'warn', 'slam', 'down', 'flank'] as const) {
    assert.equal(isFoe(foe('demogorgon', 0, 0, { pose })), true, pose);
  }
  // Unlike the bot's filter, the player may pick the Mind Flayer, Vecna and an orb.
  for (const id of ['flayer', 'flayerleg', 'flayer5', 'leg5', 'vecna', 'orb'] as const) assert.equal(isFoe(foe(id, 0, 0)), true, id);
  assert.equal(isFoe(hero('mike', 0, 0)), false);
  assert.equal(isFoe(actor('npc', 'joyce', 0, 0)), false);
});

test('footOf: a Mind Flayer leg is at its tip, everything else at its feet', () => {
  assert.deepEqual(footOf(foe('flayerleg', 50, 60, { aim: at(90, 120) })), { x: 90, y: 120 });
  assert.deepEqual(footOf(foe('leg5', 50, 60, { aim: at(90, 120) })), { x: 90, y: 120 });
  assert.deepEqual(footOf(foe('flayerleg', 50, 60)), { x: 50, y: 60 }, 'no tip yet');
  assert.deepEqual(footOf(foe('rat', 50, 60, { aim: at(90, 120) })), { x: 50, y: 60 }, 'only a leg has a tip');
  assert.deepEqual(footOf(hero('mike', 5, 6)), { x: 5, y: 6 });
});

test('pickAt: a leg is picked at its tip, not at its root', () => {
  const v = view([foe('flayerleg', 50, 60, { aim: at(90, 120) })]);
  assert.deepEqual(pickAt(v, at(90, 118)), { kind: 'enemy', id: 'flayerleg', x: 90, y: 120 });
  assert.deepEqual(pickAt(v, at(50, 58)), { kind: 'ground', x: 50, y: 58 });
});

test('pickAt: the big sprites have bigger boxes', () => {
  // A rat is 9 px each side and 20 up. A Demogorgon, a pit Demogorgon and a twin are 18 and 40, an Alpha 18 and 26, a demodog 14 and 22.
  const cases: [EnemyKind, number, number][] = [
    ['demogorgon', 18, 40], ['pitdemo', 18, 40], ['twin', 18, 40], ['alpha', 18, 26], ['demodog', 14, 22], ['rat', 9, 20],
  ];
  for (const [id, hw, up] of cases) {
    const v = view([foe(id, 200, 200)]);
    assert.equal(pickAt(v, at(200 + hw, 200 - up)).kind, 'enemy', `${id} corner`);
    assert.equal(pickAt(v, at(200 - hw, 203)).kind, 'enemy', `${id} bottom corner`);
    assert.equal(pickAt(v, at(200 + hw + 1, 200)).kind, 'ground', `${id} wider`);
    assert.equal(pickAt(v, at(200, 200 - up - 1)).kind, 'ground', `${id} taller`);
    assert.equal(pickAt(v, at(200, 204)).kind, 'ground', `${id} lower`);
  }
});

test('pickAt: the box rises with the enemy, so a hop or a knockback arc is picked in the air', () => {
  const v = view([foe('rat', 100, 100, { z: 12 })]);
  assert.equal(pickAt(v, at(100, 88)).kind, 'enemy', 'the foot as drawn, 12 px up');
  assert.equal(pickAt(v, at(100, 68)).kind, 'enemy', 'the top, 32 px above the ground');
  assert.equal(pickAt(v, at(100, 67)).kind, 'ground');
  assert.equal(pickAt(v, at(100, 92)).kind, 'ground', 'the box has left the ground under it');
  // The pick still reports the foot on the ground, which is where the hero walks to.
  assert.deepEqual(pickAt(v, at(100, 88)), { kind: 'enemy', id: 'rat', x: 100, y: 100 });
  // The body centre uses z too: a lifted rat 12 px up beats a grounded one whose body is farther from the point.
  const w = view([foe('rat', 100, 100, { z: 12 }), foe('agent', 100, 90)]);
  assert.deepEqual(pickAt(w, at(100, 81)), { kind: 'enemy', id: 'rat', x: 100, y: 100 });
});

test('pickAt: a hero who is standing is a hero pick, a knocked-out one is not', () => {
  const v = view([hero('lucas', 100, 100)]);
  assert.deepEqual(pickAt(v, at(100, 100)), { kind: 'hero', id: 'lucas' });
  assert.deepEqual(pickAt(v, at(100, 85)), { kind: 'hero', id: 'lucas' }, '15 px up is inside the 16');
  assert.deepEqual(pickAt(v, at(108, 95)), { kind: 'hero', id: 'lucas' }, '8 px aside');
  assert.equal(pickAt(v, at(109, 95)).kind, 'ground', 'the hero box is 8 each side');
  assert.equal(pickAt(v, at(100, 83)).kind, 'ground', 'and 16 up');
  const ko = view([hero('lucas', 100, 100, { anim: 'ko' })]);
  assert.deepEqual(pickAt(ko, at(100, 96)), { kind: 'ground', x: 100, y: 96 });
});

test('pickAt: the nearest hero wins when two stand together', () => {
  const v = view([hero('mike', 100, 100), hero('dustin', 106, 100)]);
  assert.deepEqual(pickAt(v, at(99, 95)), { kind: 'hero', id: 'mike' });
  assert.deepEqual(pickAt(v, at(107, 95)), { kind: 'hero', id: 'dustin' });
});

test('pickAt: an enemy beats a hero standing in the same spot', () => {
  const v = view([hero('mike', 100, 100), foe('rat', 102, 100)]);
  assert.deepEqual(pickAt(v, at(100, 94)), { kind: 'enemy', id: 'rat', x: 102, y: 100 });
  // The hero is still there to pick where the enemy's box does not reach.
  assert.deepEqual(pickAt(v, at(92.5, 94)), { kind: 'hero', id: 'mike' });
  // And an enemy that cannot be hit does not shadow him.
  const v2 = view([hero('mike', 100, 100), foe('rat', 102, 100, { hidden: true })]);
  assert.deepEqual(pickAt(v2, at(100, 94)), { kind: 'hero', id: 'mike' });
});
