// Rumble: which sim events earn a pulse, which pulse wins when several do, and the player that hands it to the pads.
// Fake pads with a recording motor stand in for the browser's vibrationActuator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PULSES, createRumbler, cueOf, pickCue } from '../src/core/rumble.ts';
import type { Actuator, RumbleCue, RumblePad } from '../src/core/rumble.ts';
import type { SimEvent } from '../src/core/types.ts';
import { loadSettings, saveSettings, settings } from '../src/core/settings.ts';

const HIT_HERO: SimEvent = { t: 'hit', dmg: 3, crit: false, x: 0, y: 0, onEnemy: false };
const HIT_FOE: SimEvent = { t: 'hit', dmg: 9, crit: true, x: 0, y: 0, onEnemy: true };
const KO: SimEvent = { t: 'heroKO', hero: 'mike' };
const LEVEL: SimEvent = { t: 'levelUp', info: { hero: 'mike', from: 1, to: 2, roll: 10, advantage: false, gains: {}, talent: null } };
const sfx = (id: 'slam' | 'thud' | 'hurt' | 'swing'): SimEvent => ({ t: 'sfx', id });

interface Played { type: string; startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }

function motor(log: Played[], opts: { reject?: boolean; throws?: boolean } = {}): Actuator {
  return {
    playEffect(type, params) {
      if (opts.throws) throw new Error('no motor');
      log.push({ type, ...params });
      return opts.reject ? Promise.reject(new Error('page in the background')) : Promise.resolve('complete');
    },
  };
}
function padWith(actuator: Actuator | null | undefined): RumblePad {
  return { buttons: [], axes: [], mapping: 'standard', connected: true, vibrationActuator: actuator };
}
function rig(pads: RumblePad[], on = true) {
  let now = 1000;
  const env = { on };
  const r = createRumbler({ pads: () => pads, now: () => now, enabled: () => env.on });
  return { r, env, advance: (ms: number) => { now += ms; } };
}

// ---------------------------------------------------------------- the pattern choice
test('the hero being hit, a KO, a level-up, a boss slam and a boss landing each earn a pulse', () => {
  assert.equal(cueOf(HIT_HERO), 'hurt');
  assert.equal(cueOf(KO), 'ko');
  assert.equal(cueOf(LEVEL), 'levelUp');
  assert.equal(cueOf(sfx('slam')), 'slam');
  assert.equal(cueOf(sfx('thud')), 'landing');
});

test('a hit the party lands, other sounds and other events earn nothing', () => {
  assert.equal(cueOf(HIT_FOE), null, 'hitting an enemy is not a hit taken');
  assert.equal(cueOf(sfx('hurt')), null, 'the hurt sound also plays when the ward is hit, so the hit event is what counts');
  assert.equal(cueOf(sfx('swing')), null);
  assert.equal(cueOf({ t: 'burst' }), null);
  assert.equal(cueOf({ t: 'allDown' }), null);
});

test('the strongest cue of a tick wins: KO over slam over landing over hurt over level-up', () => {
  assert.equal(pickCue([]), null);
  assert.equal(pickCue([HIT_FOE, sfx('swing')]), null);
  assert.equal(pickCue([LEVEL, HIT_HERO]), 'hurt');
  assert.equal(pickCue([HIT_HERO, sfx('thud')]), 'landing');
  assert.equal(pickCue([sfx('thud'), sfx('slam'), HIT_HERO]), 'slam');
  assert.equal(pickCue([sfx('slam'), HIT_HERO, KO, LEVEL]), 'ko');
});

test('every pulse is short and weak, and the level-up buzzes only the small motor', () => {
  for (const [cue, p] of Object.entries(PULSES) as [RumbleCue, (typeof PULSES)[RumbleCue]][]) {
    assert.ok(p.ms > 0 && p.ms <= 250, `${cue} is a blip`);
    assert.ok(p.strong <= 0.5 && p.weak <= 0.5, `${cue} is gentle`);
    assert.ok(p.strong > 0 || p.weak > 0, `${cue} is felt`);
  }
  assert.equal(PULSES.levelUp.strong, 0);
  assert.ok(PULSES.ko.ms > PULSES.hurt.ms, 'a KO outlasts a scratch');
});

// ---------------------------------------------------------------- the player
test('a hit plays one dual-rumble of the hurt pulse on a pad that has a motor', () => {
  const log: Played[] = [];
  const { r } = rig([padWith(motor(log))]);
  r.play([HIT_FOE, HIT_HERO]);
  assert.deepEqual(log, [{ type: 'dual-rumble', startDelay: 0, duration: 80, weakMagnitude: 0.15, strongMagnitude: 0.3 }]);
});

test('a tick with nothing worth a pulse plays nothing', () => {
  const log: Played[] = [];
  const { r } = rig([padWith(motor(log))]);
  r.play([HIT_FOE, sfx('swing'), { t: 'burst' }]);
  assert.equal(log.length, 0);
});

test('with RUMBLE off nothing plays, and turning it on again brings it back', () => {
  const log: Played[] = [];
  const { r, env } = rig([padWith(motor(log))], false);
  r.play([KO]);
  r.cue('ko');
  assert.equal(log.length, 0);
  env.on = true;
  r.play([KO]);
  assert.equal(log.length, 1);
});

test('a pad with no vibration motor is skipped without a sound, and the others still buzz', () => {
  const log: Played[] = [];
  const bare: RumblePad = { buttons: [], axes: [], mapping: 'standard', connected: true };
  const { r } = rig([bare, padWith(null), padWith(undefined), padWith({} as Actuator), padWith(motor(log))]);
  assert.doesNotThrow(() => r.play([HIT_HERO]));
  assert.equal(log.length, 1);
  const none = rig([bare]);
  assert.doesNotThrow(() => none.r.play([KO]));
  const empty = rig([]);
  assert.doesNotThrow(() => empty.r.play([KO]));
});

test('a motor that throws, or a promise that rejects, is ignored', async () => {
  const log: Played[] = [];
  const bad = rig([padWith(motor(log, { throws: true })), padWith(motor(log, { reject: true }))]);
  assert.doesNotThrow(() => bad.r.play([KO]));
  assert.equal(log.length, 1, 'the rejecting motor was still asked');
  // A rejection nobody handled would fail the process; give it a turn to prove there isn't one.
  await new Promise((done) => setImmediate(done));
});

test('every pad that can buzz gets the pulse', () => {
  const a: Played[] = [];
  const b: Played[] = [];
  const { r } = rig([padWith(motor(a)), padWith(motor(b))]);
  r.play([sfx('slam')]);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.equal(a[0]?.duration, PULSES.slam.ms);
});

test('a pulse still playing is only cut short by a stronger one', () => {
  const log: Played[] = [];
  const { r, advance } = rig([padWith(motor(log))]);
  r.play([sfx('slam')]);
  advance(50);
  r.play([HIT_HERO]);
  assert.equal(log.length, 1, 'a scratch does not cut a slam short');
  advance(50);
  r.play([KO]);
  assert.equal(log.length, 2, 'a KO does');
  assert.equal(log[1]?.duration, PULSES.ko.ms);
  advance(PULSES.ko.ms);
  r.play([LEVEL]);
  assert.equal(log.length, 3, 'once it has ended anything plays again');
});

test('the same cue twice in a row waits for the first to end', () => {
  const log: Played[] = [];
  const { r, advance } = rig([padWith(motor(log))]);
  r.play([HIT_HERO]);
  advance(PULSES.hurt.ms - 1);
  r.play([HIT_HERO]);
  assert.equal(log.length, 1);
  advance(1);
  r.play([HIT_HERO]);
  assert.equal(log.length, 2);
});

test('a pad without a motor does not hold the next pulse back', () => {
  const log: Played[] = [];
  const pads: RumblePad[] = [padWith(null)];
  const { r } = rig(pads);
  r.play([KO]);
  pads.push(padWith(motor(log)));
  r.play([HIT_HERO]);
  assert.equal(log.length, 1, 'the KO never played anywhere, so it has nothing to wait out');
});

test('RUMBLE is on out of the box, is saved with the settings, and a damaged value falls back to on', () => {
  const store = new Map<string, string>();
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    assert.equal(settings.rumble, true);
    settings.rumble = false;
    saveSettings();
    settings.rumble = true;
    loadSettings();
    assert.equal(settings.rumble, false, 'off stays off after a reload');
    const [key, raw] = [...store.entries()][0] as [string, string];
    store.set(key, JSON.stringify({ ...JSON.parse(raw), rumble: 'loud' }));
    loadSettings();
    assert.equal(settings.rumble, true);
    store.set(key, JSON.stringify({ musicVol: 0.5 }));
    loadSettings();
    assert.equal(settings.rumble, true, 'a save from before the row existed leaves it on');
  } finally {
    settings.rumble = true;
    if (was) Object.defineProperty(globalThis, 'localStorage', was);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
