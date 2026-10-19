// The whole rooftop chart played by world/rooftop.ts's botSong against a sim (docs/level-12.md, "The roof"): the roof on for the song and off at its
// end, the director told once, the careful bot (nine notes in ten) and the careless one (seven in ten), and a party that loses on the roof.
// The roof's own rules are in tests/rooftop.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Enemy } from '../src/combat/state.ts';
import { SONG_BOT, SONG_CARELESS, botSong } from '../src/world/rooftop.ts';
import { CHARTS } from '../src/solo/index.ts';
import { arena, idle, makeWhite, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';

const roofBats = (s: { enemies: Enemy[] }): Enemy[] => s.enemies.filter((e) => e.rt === 'roof' && !e.dead && e.hp > 0);

/** Burrows round the edge of an 18 by 12 deck. */
const BURROWS = [{ tx: 2, ty: 2 }, { tx: 9, ty: 1 }, { tx: 15, ty: 2 }, { tx: 1, ty: 6 }, { tx: 16, ty: 6 }, { tx: 2, ty: 10 }, { tx: 9, ty: 10 }, { tx: 15, ty: 10 }];

/** Plays the rooftop chart with the solo's bot against a sim, a frame at a time. Returns what happened. */
function playSong(seed: number, level: number, careless: boolean) {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike', level }, { id: 'eddie', level }, { id: 'lucas', level }], start: { x: tc(9), y: tf(6) }, grid: arena(18, 12),
    burrows: BURROWS, seed, difficulty: 'chief',
  });
  let done = 0;
  const song = botSong(sim, 'rooftop', () => { done++; }, careless ? SONG_CARELESS : SONG_BOT);
  let down = false, pulses = 0, f = 0;
  for (; f < 6000 && done === 0 && !down; f++) {
    song.step();
    const ev = sim.step(idle());
    if (ev.some((e) => e.t === 'allDown')) down = true;
    if (sfxIds(ev).includes('riff')) pulses++;
  }
  return { sim, s, song, done, down, pulses, frames: f };
}

test('botSong drives the whole rooftop chart against a sim: the roof on for the song, off at its end, and the director told once', () => {
  const r = playSong(1, 6, false);
  assert.equal(r.done, 1, 'done was called once');
  assert.equal(r.song.done, true);
  assert.equal(r.down, false);
  assert.equal(r.s.roof.on, false);
  assert.ok(Math.abs(r.frames - CHARTS.rooftop.length) < 12, `${r.frames} frames for a chart of ${CHARTS.rooftop.length}`);
  assert.ok(r.pulses > 100, `${r.pulses} pulses`);
  assert.ok(r.sim.stats().kills > 40, `${r.sim.stats().kills} bats killed`);
  assert.equal(r.sim.stats().xpEarned, 0, 'for no XP');
  assert.equal(r.sim.view().hud.solo, null);
  assert.ok(roofBats(r.s).length >= 4, 'and the flock is still circling when it ends');
  assert.equal(r.sim.view().hud.party[1]?.id, 'eddie');
});

test('the careful bot (nine notes in ten) clears the roof every time, the careless one (seven in ten) most of the time', () => {
  let careful = 0, careless = 0;
  const hurtCareless: number[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    if (!playSong(seed, 6, false).down) careful++;
    const c = playSong(seed, 6, true);
    if (!c.down) careless++;
    hurtCareless.push(c.sim.stats().damageTaken);
  }
  assert.equal(careful, 10);
  assert.ok(careless >= 5 && careless <= 10, `the careless bot cleared ${careless} of 10`);
  assert.ok(Math.max(...hurtCareless) > 0, 'and misses cost HP');
});

test('a party that loses on the roof is a wipe, reported once, and the song is over for the sim', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike', level: 2 }, { id: 'eddie', level: 1 }], start: { x: tc(9), y: tf(6) }, grid: arena(18, 12), burrows: BURROWS, seed: 3, difficulty: 'upside',
  });
  let done = 0;
  const song = botSong(sim, 'rooftop', () => { done++; }, SONG_CARELESS);
  let down = false;
  for (let f = 0; f < 6000 && done === 0 && !down; f++) {
    song.step();
    if (sim.step(idle()).some((e) => e.t === 'allDown')) down = true;
  }
  assert.equal(down, true, 'a Lv 1 Eddie on upside does not last the song');
  assert.equal(s.over, true);
  assert.equal(s.roof.on, false);
  assert.equal(ofType(run(sim, 5), 'allDown').length, 0, 'and the wipe is reported once');
});
