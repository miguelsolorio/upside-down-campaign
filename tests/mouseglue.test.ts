// The mouse glue (world/mouseglue.ts), pure: a fake source for the clicks and hand-made views. A scene test's fake input has none of the
// mouse methods, a touch has only clicked(), and a mouse has all of them. What each does with the strip, the field and the side bands of a
// wide screen is here; the driver those ticks feed is in mouseplay-*.test.ts and the whole scene in mouse-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEW_TOP, setScreenWidth } from '../src/core/config.ts';
import { critRect } from '../src/ui/hudlayout.ts';
import { toWorld } from '../src/world/mousepick.ts';
import { readMouse, wantsHand } from '../src/world/mouseglue.ts';
import type { MouseSource } from '../src/world/mouseglue.ts';
import { NO_TICK } from '../src/world/mouseplay.ts';
import type { PartyHud, SimView, Vec2 } from '../src/core/types.ts';
import { actor, stub } from './mouse-helpers.ts';

const CAM = { x: 0, y: 0 };
const at = (x: number, y: number): Vec2 => ({ x, y });
/** A world point as the screen shows it under a camera. */
const onScreen = (wx: number, wy: number, cam = CAM): Vec2 => at(wx - cam.x, wy - cam.y + VIEW_TOP);

/** A source whose buttons are what a test sets: only the methods it names exist, like the fakes in the scene tests. */
function source(o: { clicked?: Vec2; mouse?: Vec2; right?: Vec2; held?: boolean; hover?: Vec2 } = {}, mouseMethods = true): MouseSource {
  const base: MouseSource = { clicked: () => o.clicked ?? o.mouse ?? null, hover: () => o.hover ?? null };
  if (!mouseMethods) return base;
  return { ...base, mouseClicked: () => o.mouse ?? null, rightClicked: () => o.right ?? null, rightHeld: () => o.held ?? false };
}

const ME = at(100, 100);
const BENCH = at(150, 100);
/** Mike (active) and Dustin on the bench, standing at ME and BENCH, with a rat at (60, 100). Quarters are 0, so the Crit column is at its home. */
function party(over: { ready?: boolean; benchOver?: Partial<PartyHud>; withBenchActor?: boolean } = {}): SimView {
  const v = stub({
    ready: over.ready ?? false,
    foes: [
      actor('enemy', 'rat', 60, 100),
      actor('hero', 'mike', ME.x, ME.y),
      ...(over.withBenchActor === false ? [] : [actor('hero', 'dustin', BENCH.x, BENCH.y)]),
    ],
  });
  v.hud.party.push({ id: 'dustin', level: 1, ko: false, active: false, ...over.benchOver } as PartyHud);
  v.hud.quarters = 0;
  return v;
}

test('a source with no mouse methods gives the frozen NO_TICK and no swap', () => {
  const r = readMouse(source({ hover: at(100, 100) }, false), party(), CAM);
  assert.equal(r.tick, NO_TICK);
  assert.equal(r.swapTo, -1);
});

test('a source whose mouse did nothing gives NO_TICK too', () => {
  const r = readMouse(source(), party(), CAM);
  assert.equal(r.tick, NO_TICK);
  assert.equal(r.swapTo, -1);
});

test('a click on the Crit column bursts only once the die is full, and a finger tap counts', () => {
  const r = critRect(0);
  const centre = at(r.x + r.w / 2, r.h / 2);
  assert.ok(centre.y < VIEW_TOP);
  assert.equal(readMouse(source({ mouse: centre }), party({ ready: false }), CAM).tick, NO_TICK, 'not full: nothing');
  assert.equal(readMouse(source({ mouse: centre }), party({ ready: true }), CAM).tick.burst, true, 'full: a burst');
  // A finger has clicked() and no mouseClicked().
  assert.equal(readMouse(source({ clicked: centre }), party({ ready: true }), CAM).tick.burst, true, 'a tap is a burst too');
  // Elsewhere on the strip, or the same x below it, is not the Crit column.
  assert.equal(readMouse(source({ mouse: at(r.x + r.w + 20, 4) }), party({ ready: true }), CAM).tick.burst, false);
  assert.equal(readMouse(source({ mouse: at(centre.x, VIEW_TOP + 4) }), party({ ready: true }), CAM).tick.burst, false);
});

test('the Crit column moves right as the coin count grows, and the click follows it', () => {
  const v = party({ ready: true });
  v.hud.quarters = 156;
  const far = critRect(156), home = critRect(0);
  assert.ok(far.x > home.x);
  assert.equal(readMouse(source({ mouse: at(far.x + far.w - 1, 4) }), v, CAM).tick.burst, true);
  assert.equal(readMouse(source({ mouse: at(home.x + 1, 4) }), v, CAM).tick.burst, false, 'the old left edge is a coin count now');
});

test('a click on the field: a foe is attacked, bare ground is walked to, the active hero is a stop', () => {
  const foe = readMouse(source({ mouse: onScreen(60, 98) }), party(), CAM);
  assert.deepEqual(foe.tick.go, { kind: 'attack', id: 'rat', x: 60, y: 100 }, 'the goal carries the foe\'s foot');
  assert.equal(foe.swapTo, -1);

  const ground = readMouse(source({ mouse: onScreen(200, 150) }), party(), CAM);
  assert.deepEqual(ground.tick.go, { kind: 'walk', x: 200, y: 150 });

  const me = readMouse(source({ mouse: onScreen(ME.x, ME.y - 6) }), party(), CAM);
  assert.equal(me.tick.go, 'stop');
  assert.equal(me.swapTo, -1);
});

test('a click on a standing bench hero swaps to him and walks nowhere', () => {
  const r = readMouse(source({ mouse: onScreen(BENCH.x, BENCH.y - 6) }), party(), CAM);
  assert.equal(r.swapTo, 1, 'his slot in the party');
  assert.equal(r.tick, NO_TICK, 'and the driver gets nothing');
});

test('a bench hero a click cannot swap to is just a spot: cursed, channeling, or not in the party', () => {
  const spot = onScreen(BENCH.x, BENCH.y - 6);
  const w = toWorld(spot, CAM);
  for (const benchOver of [{ curse: 2 }, { channeling: true }] as Partial<PartyHud>[]) {
    const r = readMouse(source({ mouse: spot }), party({ benchOver }), CAM);
    assert.equal(r.swapTo, -1);
    assert.deepEqual(r.tick.go, { kind: 'walk', x: w.x, y: w.y }, `walks to the click for ${JSON.stringify(benchOver)}`);
  }
  // A hero on the field who is not in the HUD's party at all.
  const v = party();
  v.hud.party.pop();
  const r = readMouse(source({ mouse: spot }), v, CAM);
  assert.equal(r.swapTo, -1);
  assert.deepEqual(r.tick.go, { kind: 'walk', x: w.x, y: w.y });
});

test('the camera and the shake move where a click lands', () => {
  const cam = { x: 30, y: 12 };
  const v = party();
  v.shake = at(2, -1);
  const w = readMouse(source({ mouse: at(100, VIEW_TOP + 40) }), v, cam).tick.go;
  assert.deepEqual(w, { kind: 'walk', ...toWorld(at(100, VIEW_TOP + 40), cam, at(2, -1)) });
  assert.deepEqual(w, { kind: 'walk', x: 128, y: 53 });
  // A foe is found under the same camera.
  const hit = readMouse(source({ mouse: onScreen(60, 98, cam) }), party(), cam).tick.go;
  assert.deepEqual(hit, { kind: 'attack', id: 'rat', x: 60, y: 100 });
});

test('a click that is only a touch is ignored in the field', () => {
  const touch = readMouse(source({ clicked: onScreen(200, 150) }), party(), CAM);
  assert.equal(touch.tick, NO_TICK);
  assert.equal(touch.swapTo, -1);
  // Even over a foe or a bench hero.
  assert.equal(readMouse(source({ clicked: onScreen(60, 98) }), party(), CAM).tick, NO_TICK);
  assert.equal(readMouse(source({ clicked: onScreen(BENCH.x, BENCH.y - 6) }), party(), CAM).swapTo, -1);
});

test('a click on the HUD strip does nothing to the field', () => {
  assert.equal(readMouse(source({ mouse: at(100, 4) }), party(), CAM).tick, NO_TICK);
});

test('a right click is the Special: aimed at the cursor in the field, unaimed on the strip, and holding it is passed on', () => {
  const field = readMouse(source({ right: onScreen(180, 120) }), party(), CAM).tick;
  assert.deepEqual(field.special, toWorld(onScreen(180, 120), CAM));
  assert.deepEqual(field.special, { x: 180, y: 120 });
  assert.equal(field.go, null);
  assert.equal(readMouse(source({ right: at(100, 4) }), party(), CAM).tick.special, true, 'the strip has no spot to aim at');
  const held = readMouse(source({ held: true }), party(), CAM).tick;
  assert.equal(held.specialHeld, true);
  assert.equal(held.special, null);
  // The aim follows the camera and the shake as well.
  const v = party();
  v.shake = at(1, 1);
  assert.deepEqual(readMouse(source({ right: at(50, VIEW_TOP + 10) }), v, { x: 10, y: 5 }).tick.special, { x: 59, y: 14 });
});

test('both buttons in one tick are both read', () => {
  const r = readMouse(source({ mouse: onScreen(200, 150), right: onScreen(60, 98) }), party(), CAM).tick;
  assert.deepEqual(r.go, { kind: 'walk', x: 200, y: 150 });
  assert.deepEqual(r.special, { x: 60, y: 98 });
});

test('on a wide screen a click in the faded side bands is ignored, and one inside the band is not', () => {
  setScreenWidth(640);
  try {
    const top = VIEW_TOP + 60;
    assert.equal(readMouse(source({ mouse: at(20, top) }), party(), CAM).tick, NO_TICK, 'left band');
    assert.equal(readMouse(source({ mouse: at(620, top) }), party(), CAM).tick, NO_TICK, 'right band');
    assert.deepEqual(readMouse(source({ mouse: at(320, top) }), party(), CAM).tick.go, { kind: 'walk', x: 320, y: 60 }, 'inside the band');
    assert.equal(wantsHand(at(20, top), party(), CAM), false);
  } finally {
    setScreenWidth(256);
  }
});

test('wantsHand: a foe, a swappable bench hero and the lit Crit column, and nothing else', () => {
  const r = critRect(0);
  const crit = at(r.x + r.w / 2, 4);
  assert.equal(wantsHand(null, party(), CAM), false);
  assert.equal(wantsHand(onScreen(60, 98), party(), CAM), true, 'a foe');
  assert.equal(wantsHand(onScreen(BENCH.x, BENCH.y - 6), party(), CAM), true, 'a bench hero');
  assert.equal(wantsHand(crit, party({ ready: true }), CAM), true, 'the lit Crit');
  assert.equal(wantsHand(onScreen(200, 150), party(), CAM), false, 'ground');
  assert.equal(wantsHand(onScreen(ME.x, ME.y - 6), party(), CAM), false, 'the active hero');
  assert.equal(wantsHand(crit, party({ ready: false }), CAM), false, 'the unlit Crit');
  assert.equal(wantsHand(at(100, 4), party({ ready: true }), CAM), false, 'the rest of the strip');
  assert.equal(wantsHand(onScreen(BENCH.x, BENCH.y - 6), party({ benchOver: { curse: 1 } }), CAM), false, 'a cursed hero');
  assert.equal(wantsHand(onScreen(BENCH.x, BENCH.y - 6), party({ benchOver: { ko: true } }), CAM), false, 'a hero who is down');
});
