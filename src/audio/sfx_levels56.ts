// Effects for Levels 5 and 6 (stages 2.2 and 2.3): the Alpha's howl, Max's skate, a cracked wall breaking, Steve's
// Babysit, the Gate rumbling and shutting. Each is its own recipe and sits in its own part of the spectrum:
// howl in the mids (the roar owns the low end), skate and crack in the mids and highs, taunt in the bright mids,
// rumble and gateShut below 400 Hz. Pure data in the shape sfx.ts plays. LEVELS56 is the gain for each, measured
// with an offline render (the audio lab's E key, or renderWith in render.ts).
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx56 = 'howl' | 'skate' | 'crack' | 'taunt' | 'rumble' | 'gateShut';

// howl: the Alpha calling its pack, a little over a second. A pulse slides up from 240 Hz to 520 Hz (0.34 s), leans
// on a long note that creeps to 610 Hz with a slow wobble in it, then sags to 340 Hz in three steps, each softer, as
// the breath runs out. The steps going up are each a little louder than the last, so the call swells. A thin triangle
// an octave up gives it the whistle of a real throat. Two thinner voices answer from further off, a fourth above,
// and a breath of air opens and closes it. Nothing under 200 Hz: the roar has the low end, and a howl is a long
// clear note.
const WOBBLE = { rate: 6.5, cents: 55, delay: 0.04 };
const HOWL = R([
  T('p25', 240, 0.34, 0.26, { f2: 520, hold: true }),
  T('p25', 520, 0.34, 0.34, { at: 0.34, f2: 610, hold: true, vib: WOBBLE }),
  T('p25', 610, 0.14, 0.32, { at: 0.68, f2: 520, hold: true }),
  T('p25', 520, 0.12, 0.2, { at: 0.82, f2: 430, hold: true }),
  T('p25', 430, 0.2, 0.12, { at: 0.94, f2: 340 }),
  T('tri', 480, 0.3, 0.12, { f2: 1040, hold: true }),
  T('tri', 1040, 0.38, 0.14, { at: 0.3, f2: 1220, hold: true, vib: WOBBLE }),
  T('tri', 1220, 0.14, 0.1, { at: 0.68, f2: 1000, hold: true }),
  T('tri', 1000, 0.3, 0.06, { at: 0.82, f2: 700 }),
  T('p12', 520, 0.3, 0.07, { at: 0.3, f2: 780, hold: true, vib: { rate: 5.5, cents: 60, delay: 0.05 } }),
  T('p12', 780, 0.45, 0.08, { at: 0.6, f2: 560 }),
  T('p12', 640, 0.3, 0.05, { at: 0.46, f2: 940, hold: true, vib: { rate: 7.5, cents: 60, delay: 0.05 } }),
  T('p12', 940, 0.35, 0.06, { at: 0.76, f2: 700 }),
  N(15, 30000, 0.55, 0.22, { f: bp(1500, 2400, 1), rise: 0.22 }),
  N(15, 20000, 0.3, 0.2, { at: 0.78, f: bp(1200, 600, 0.8), rise: 0.04 }),
], 0.03);

// skate: Max's board rolling, four tenths of a second. A hiss of noise round 1.4 kHz is the wheels, a lowpassed
// periodic rasp under it is the concrete (a buzz in the low hundreds, which is what a slab sounds like through
// a deck), and eleven small gritty ticks a thirtieth of a second apart are pebbles going under. Two pavement
// joints go by, each a front wheel and then a back wheel, a thunk and a click. It stays quiet because it plays
// every time Max dashes.
const GRIT = Array.from({ length: 11 }, (_, i) =>
  N(7, 9000 + ((i * 1733) % 5000), 0.02, 0.42 - (i % 3) * 0.06, { at: i * 0.034, f: bp(2200 + ((i * 613) % 900), undefined, 1.8) }));
const JOINTS = [0.11, 0.27].flatMap((at) => [
  T('tri', 190, 0.04, 0.4, { at, f2: 95 }),
  N(15, 22000, 0.02, 0.5, { at, f: hp(2500) }),
  T('tri', 170, 0.04, 0.34, { at: at + 0.045, f2: 85 }),
  N(15, 22000, 0.02, 0.4, { at: at + 0.045, f: hp(2800) }),
]);
const SKATE = R([
  N(15, 26000, 0.4, 0.4, { f: bp(1500, 1100, 0.7), rise: 0.05 }),
  N(7, 3600, 0.4, 0.55, { f: lp(420, 300), rise: 0.06 }),
  ...GRIT,
  ...JOINTS,
], 0.06);

// crack: a cracked wall gives way under Steve's bat, half a second. A wooden knock (a triangle that
// drops from 520 Hz to 210 Hz and a click of noise) lands first, and the stone answers with a run of eight
// sharp splits that thin out over a third of a second. Behind them grit grinds down from 900 Hz to 280 Hz as
// the face of the wall slides, three chunks hit the floor, each lower and softer, and dust hisses on top.
// Nothing under 40 Hz and no long boom: thud is the heavy low one, this is a brittle wall and it breaks in the mids.
const SPLITS = [0.03, 0.055, 0.075, 0.11, 0.135, 0.19, 0.25, 0.31].map((at, i) =>
  N(7, 12000 + ((i * 2113) % 7000), 0.025, 0.75 - i * 0.05, { at, f: bp(1400 + ((i * 577) % 1600), undefined, 1.2) }));
const CHUNKS = [[0.12, 125, 0.4], [0.24, 98, 0.34], [0.38, 80, 0.28]] as const;
const CRACK = R([
  T('tri', 520, 0.07, 0.5, { f2: 210 }),
  N(15, 30000, 0.03, 0.9, { f: bp(2200, 900, 0.9) }),
  ...SPLITS,
  N(15, 14000, 0.45, 0.65, { f: bp(900, 280, 0.9), rise: 0.03 }),
  ...CHUNKS.flatMap(([at, f, v]) => [
    T('tri', f, 0.12, v, { at, f2: f / 2 }),
    N(15, 9000, 0.1, v * 1.1, { at, f: lp(500, 200) }),
  ]),
  N(15, 44100, 0.35, 0.09, { at: 0.2, f: hp(4500), rise: 0.05 }),
], 0.04);

// taunt: Steve's Babysit, a brassy call, half a second. Three notes up a major triad (G4, C5, E5) on a square
// with a narrower pulse stacked on it, which is as close to a horn as these voices get, each started with a
// breathy blat of noise like a tongue. The last note is held, wobbles, then sags a little at the end, the way
// a trombone does when the player has run out of air, because it is Steve. A triangle an octave down keeps it
// warm. All of it sits above 190 Hz and below 1.4 kHz.
const NOTES = [[0, 370, 392, 0.1], [0.11, 494, 523, 0.1]] as const;
const TAUNT = R([
  ...NOTES.flatMap(([at, from, f, d]) => [
    T('p50', from, d, 0.3, { at, f2: f, hold: true }),
    T('p25', from, d, 0.2, { at, f2: f, hold: true }),
    T('tri', f / 2, d, 0.22, { at, hold: true }),
    N(15, 22000, 0.03, 0.4, { at, f: bp(1700, 900, 1.2) }),
  ]),
  T('p50', 622, 0.1, 0.32, { at: 0.22, f2: 659, hold: true }),
  T('p50', 659, 0.28, 0.32, { at: 0.32, f2: 620, hold: true, vib: { rate: 6, cents: 28, delay: 0.1 } }),
  T('p25', 622, 0.1, 0.2, { at: 0.22, f2: 659, hold: true }),
  T('p25', 659, 0.28, 0.2, { at: 0.32, f2: 620, hold: true, vib: { rate: 6, cents: 28, delay: 0.1 } }),
  T('tri', 330, 0.38, 0.24, { at: 0.22, f2: 310, hold: true }),
  N(15, 22000, 0.03, 0.4, { at: 0.22, f: bp(1700, 900, 1.2) }),
], 0.03);

// rumble: the Gate tearing at the floor, eight tenths of a second. Two triangles a few hertz apart (58 and 64)
// sink together and beat against each other, so the floor seems to heave; a rough pulse an octave up shudders
// over them (small speakers lose the lowest notes, so the buzz is what they hear), lowpassed noise swells in under
// 240 Hz and two stones shift. Everything is soft: it swells in over a quarter of a second instead of starting with
// a knock, nothing is above 300 Hz, and the tones fade in a second step, because it repeats every ten seconds under
// the music.
const RUMBLE = R([
  T('tri', 58, 0.45, 0.28, { at: 0.1, f2: 48, hold: true }),
  T('tri', 48, 0.3, 0.2, { at: 0.55, f2: 42 }),
  T('tri', 64, 0.4, 0.24, { at: 0.12, f2: 50, hold: true }),
  T('tri', 50, 0.3, 0.18, { at: 0.52, f2: 43 }),
  T('p25', 116, 0.45, 0.12, { at: 0.15, f2: 96, hold: true, vib: { rate: 9, cents: 160, delay: 0 } }),
  T('p25', 96, 0.25, 0.08, { at: 0.6, f2: 84 }),
  N(15, 5000, 0.85, 0.7, { f: lp(240, 120), rise: 0.25 }),
  N(7, 2400, 0.7, 0.3, { at: 0.1, f: lp(280, 150), rise: 0.2 }),
  T('tri', 70, 0.12, 0.25, { at: 0.34, f2: 44 }),
  T('tri', 62, 0.12, 0.2, { at: 0.56, f2: 40 }),
], 0.05);

// gateShut: the Gate closes for good, a little under two seconds. A crack and a boom that falls from 100 Hz to
// 26 Hz hit together, a long low rumble of noise runs for a second and a half, and a thin tone drains out of
// the top, from 600 Hz down to 70, as the rift seals behind it. Debris ticks fall around the impact, two
// aftershocks land at half a second and a second, and the tail is two sub tones three hertz apart that throb
// as they die away. The biggest low sound in the game: slam and thud are shorter and have no tail.
const DEBRIS = [[0.2, 0.4], [0.3, 0.34], [0.42, 0.3], [0.6, 0.24], [0.7, 0.2], [0.85, 0.18], [1.05, 0.14]] as const;
const GATE_SHUT = R([
  N(15, 30000, 0.1, 0.9, { f: bp(1100, 300, 0.7) }),
  T('tri', 100, 0.9, 0.75, { f2: 26 }),
  T('p25', 62, 0.6, 0.35, { f2: 24 }),
  T('tri', 52, 1.4, 0.35, { at: 0.05, f2: 36 }),
  N(15, 7000, 1.5, 0.85, { f: lp(420, 60), rise: 0.03 }),
  N(7, 2600, 0.9, 0.4, { at: 0.05, f: lp(240, 90) }),
  T('p50', 600, 0.8, 0.1, { at: 0.05, f2: 70, hold: true, vib: { rate: 14, cents: 90, delay: 0 } }),
  N(15, 44100, 0.9, 0.18, { at: 0.08, f: bp(3000, 500, 0.8) }),
  T('tri', 70, 0.25, 0.28, { at: 0.55, f2: 30 }),
  N(15, 8000, 0.3, 0.3, { at: 0.55, f: lp(300, 80) }),
  T('tri', 60, 0.25, 0.18, { at: 0.95, f2: 28 }),
  N(15, 8000, 0.3, 0.2, { at: 0.95, f: lp(260, 70) }),
  ...DEBRIS.map(([at, v], i) => N(7, 11000 + i * 1300, 0.015, v, { at, f: hp(2500) })),
  T('tri', 41, 0.9, 0.3, { at: 0.9, f2: 34 }),
  T('tri', 44, 0.9, 0.26, { at: 0.9, f2: 37 }),
], 0.03);

export const SFX56: Record<Sfx56, Recipe> = {
  howl: HOWL, skate: SKATE, crack: CRACK, taunt: TAUNT, rumble: RUMBLE, gateShut: GATE_SHUT,
};

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced
 * at): howl 0.5, skate 0.3, crack 0.5, taunt 0.45, rumble 0.28, gateShut 0.6. Impacts sit near 0.5 like the rest;
 * gateShut is the finale and sits a little above; skate and rumble are the ones that repeat, so they are quiet.
 */
export const LEVELS56: Record<Sfx56, number> = {
  howl: 0.905, skate: 0.21, crack: 0.47, taunt: 0.54, rumble: 0.27, gateShut: 0.35,
};
