// The final fight's finish (docs/level-16.md, "The Final Roll"): play stops on the sim's finalRoll event, the Final Roll plays, Joyce runs in with
// her axe for about a second and a half, and the clear beat fires as the axe comes down, its boom flashing white unless Reduce flashing is on.
// The timeline is world/ending.ts's; the play scene running it on the real stage is in finale-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimView } from '../src/core/types.ts';
import { createRng } from '../src/core/rng.ts';
import { rollFinal } from '../src/ui/finalroll_logic.ts';
import { createFinalRollScene } from '../src/ui/finalroll.ts';
import { ATTACK_FRAMES, FLASH_FRAMES, JOYCE_FRAMES, RUN_FRAMES, STRIKE_AT, calm, createEnding, flashAt, joyceRoute, joyceView } from '../src/world/ending.ts';
import type { FinalRollEvent } from '../src/world/ending.ts';
import { joycePoseOf } from '../src/gfx/ch5/finale_joyce.ts';

const HEROES: HeroId[] = ['mike', 'dustin', 'eleven', 'will'];
const event = (seed = 4): FinalRollEvent => ({ t: 'finalRoll', heroes: HEROES, roll: rollFinal(HEROES, createRng(seed)) });
const BODY = { x: 296, y: 76 };

test('Joyce\'s run-in is about a second and a half, and the axe comes down inside her chop', () => {
  assert.ok(JOYCE_FRAMES >= 80 && JOYCE_FRAMES <= 100, `${JOYCE_FRAMES} frames`);
  assert.equal(JOYCE_FRAMES, RUN_FRAMES + ATTACK_FRAMES);
  const route = joyceRoute(BODY);
  const poseAt = (t: number) => joycePoseOf(joyceView(t, route));
  const down = STRIKE_AT - RUN_FRAMES;
  assert.equal(poseAt(RUN_FRAMES + 1), 'raise', 'the axe goes up first');
  assert.equal(poseAt(STRIKE_AT), 'swing', 'and comes down as the beat fires');
  assert.ok(down > 0 && down < ATTACK_FRAMES);
  assert.equal(poseAt(RUN_FRAMES + ATTACK_FRAMES - 1), 'follow', 'then follows through');
  assert.equal(joyceView(JOYCE_FRAMES + 40, route).anim, 'idle', 'and she stands where she stopped');
});

test('she runs up from the south, below the body, and stops in front of it', () => {
  const route = joyceRoute(BODY);
  assert.equal(route.from.x, BODY.x);
  assert.ok(route.from.y > route.to.y + 100, 'she starts well below where she stops');
  assert.ok(route.to.y > BODY.y && route.to.y - BODY.y < 40, 'and stops just in front of the body');
  const start = joyceView(0, route), mid = joyceView(RUN_FRAMES >> 1, route), arrived = joyceView(RUN_FRAMES, route);
  assert.deepEqual([start.y, start.anim], [route.from.y, 'walk']);
  assert.ok(mid.y < start.y && mid.y > arrived.y, 'she closes the distance, never backing up');
  assert.equal(arrived.y, route.to.y);
  for (let t = 1; t < RUN_FRAMES; t++) assert.ok(joyceView(t, route).y <= joyceView(t - 1, route).y);
  assert.equal(start.dir, 'up');
  assert.equal(start.kind, 'npc');
  assert.equal(start.id, 'joyce');
});

test('the boom flashes white and fades, and there is none with Reduce flashing', () => {
  assert.equal(flashAt(0, false), 1);
  let last = 1;
  for (let t = 1; t < FLASH_FRAMES; t++) { const f = flashAt(t, false); assert.ok(f <= last && f > 0, `fading at ${t}`); last = f; }
  assert.equal(flashAt(FLASH_FRAMES, false), 0);
  assert.equal(flashAt(-1, false), 0, 'before the boom there is none');
  for (let t = -2; t < FLASH_FRAMES + 3; t++) assert.equal(flashAt(t, true), 0, `Reduce flashing at ${t}`);
});

test('the frozen fight\'s own flash and shake, and its actors\' hit flashes, are taken out of the picture, the rest left', () => {
  const hurt = { id: 'demobat', flash: 0.9, x: 5 }, fine = { id: 'mike', flash: 0, x: 9 };
  const view = { flash: 0.7, shake: { x: 6, y: -3 }, actors: [hurt, fine], marker: 'kept' } as unknown as SimView;
  const calmed = calm(view);
  assert.equal(calmed.flash, 0);
  assert.deepEqual(calmed.actors.map((a) => [a.id, a.flash, a.x]), [['demobat', 0, 5], ['mike', 0, 9]], 'a hit flash caught at the freeze is not left white');
  assert.equal(hurt.flash, 0.9, 'the sim\'s own actors are not touched');
  assert.deepEqual(calmed.shake, { x: 0, y: 0 });
  assert.equal((calmed as unknown as { marker: string }).marker, 'kept');
  assert.equal(view.flash, 0.7, 'the sim\'s own view is not touched');
});

test('the finalRoll event holds play, plays the roll for the event\'s heroes, then runs Joyce and fires the beat once as the axe comes down', () => {
  const log: string[] = [];
  let done: () => void = () => undefined;
  let fired: FinalRollEvent | null = null;
  const e = event();
  const end = createEnding({
    roll: (ev, finished) => { log.push(`roll ${ev.heroes.join(',')} ${ev.roll.total}`); done = finished; },
    fire: (ev) => { log.push('fire'); fired = ev; },
    body: () => BODY,
  });
  assert.equal(end.holds(), false);
  assert.equal(end.on(), false);
  assert.equal(end.joyce(), null);
  end.start(e);
  assert.deepEqual(log, [`roll mike,dustin,eleven,will ${e.roll.total}`], 'the roll is the event\'s own');
  assert.equal(end.holds(), true, 'the sim is not stepped under the roll');
  assert.equal(end.on(), true);
  assert.equal(end.joyce(), null, 'Joyce waits for the roll');
  for (let i = 0; i < 400; i++) end.tick();
  assert.equal(log.length, 1, 'nothing runs while the roll plays');
  end.start(event(9));
  assert.equal(log.length, 1, 'a second event is ignored');
  done();
  assert.equal(end.holds(), true, 'and Joyce\'s run holds it too');
  assert.deepEqual(end.focus(), { x: BODY.x, y: BODY.y + 40 }, 'the camera goes to the body');
  assert.equal(end.joyce()?.anim, 'walk');
  for (let i = 0; i < STRIKE_AT - 1; i++) end.tick();
  assert.equal(fired, null, 'the beat waits for the axe');
  end.tick();
  assert.equal(fired, e, 'and gets the event');
  assert.equal(end.holds(), false, 'the sim runs again once the beat has the stage');
  for (let i = 0; i < 300; i++) end.tick();
  assert.equal(log.filter((l) => l === 'fire').length, 1, 'once');
  assert.equal(end.joyce()?.anim, 'idle', 'she stays in the picture, standing');
  end.clear();
  assert.deepEqual([end.on(), end.holds(), end.joyce(), end.focus()], [false, false, null, null], 'a retry clears it');
});

test('the boom starts the flash, which fades on the ending\'s clock and never shows with Reduce flashing', () => {
  const end = createEnding({ roll: () => undefined, fire: () => undefined, body: () => null });
  assert.equal(end.flash(false), 0);
  end.boomed();
  assert.equal(end.flash(false), 1);
  assert.equal(end.flash(true), 0);
  for (let i = 0; i < FLASH_FRAMES / 2; i++) end.tick();
  assert.ok(end.flash(false) > 0 && end.flash(false) < 0.5);
  for (let i = 0; i < FLASH_FRAMES; i++) end.tick();
  assert.equal(end.flash(false), 0);
});

test('the Final Roll scene plays the roll it is given, and ends itself with that roll', () => {
  const e = event(11);
  let result: unknown = null;
  const scene = createFinalRollScene({ heroes: e.heroes, roll: e.roll, onDone: (r) => { result = r; } });
  const g = { input: { pressed: () => false, clicked: () => null } } as never;
  for (let i = 0; i < 2000 && result === null; i++) scene.update(g);
  assert.equal(result, e.roll, 'the very roll of the event');
  // Without one it rolls its own from the random source it is given, the same each time for a seed.
  const own = (seed: number): unknown => {
    let out: unknown = null;
    const s = createFinalRollScene({ heroes: HEROES, rng: createRng(seed), onDone: (r) => { out = r; } });
    for (let i = 0; i < 2000 && out === null; i++) s.update(g);
    return out;
  };
  assert.deepEqual(own(3), rollFinal(HEROES, createRng(3)));
});
