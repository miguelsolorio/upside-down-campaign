// Effects for Levels 12 and 13 (stages 4.3 and 4.4): a demobat's dive, a flock passing, the storm's thunder, Vecna's vine lash, a
// memory orb breaking, a thrown rock landing and his call as a phase turns. Each is its own recipe and sits in its own part of the
// spectrum, said in its comment: screech is the highest chirp there is (2.6 to 6.2 kHz, all of it climbing), flap the soft breath of
// the low mids (360 Hz to 1.4 kHz), bolt the rolling rumble (90 to 720 Hz, noise and nothing pitched), whip the swish and crack of the
// upper mids and lower highs (1.4 to 5.8 kHz), orb the glass and the gloop (a ring of glass over 2 kHz and a plop under 700 Hz),
// debris the thump and clatter of a rock (a thud falling from 150 Hz to 60 Hz under grit round 1 to 2 kHz) and vecna the lowest
// voice (36 to 300 Hz, pitched and wavering). Pure data in the shape sfx.ts plays. LEVELS1213 is the gain for each, measured with
// an offline render (renderWith in render.ts): see the note above it.
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1213 = 'screech' | 'flap' | 'bolt' | 'whip' | 'orb' | 'debris' | 'vecna';

// screech: a demobat's dive, a third of a second. Two chirps climb one after the other, the way a bat's pitch rises as it comes
// at you: a 25 percent pulse from 2.6 kHz to 4.4 kHz under a fast vibrato (24 Hz, 140 cents), then a second from 3 kHz to 5.4 kHz
// (28 Hz, 160 cents) at 0.13 s. A triangle rides each well off any harmonic of it (3.7 kHz to 6 kHz, 4.2 kHz to 6.2 kHz), so the
// two do not blend into one clean tone, and a click of noise above 4 kHz and a thin hiss round 4.5 to 6 kHz go with them. Nothing
// is under 2 kHz and everything climbs. Ghoul is a shriek that falls (1.3 kHz to 540 Hz), feedback leans slowly and holds, and
// spotted is a pair of pings; this is the only hard, fast, high chirp.
const SCREECH = R([
  N(7, 20000, 0.012, 0.3, { f: hp(4000) }),
  T('p25', 2600, 0.14, 0.42, { f2: 4400, hold: true, vib: { rate: 24, cents: 140, delay: 0 } }),
  T('tri', 3700, 0.14, 0.14, { f2: 6000, hold: true }),
  T('p25', 3000, 0.2, 0.4, { at: 0.13, f2: 5400, hold: true, vib: { rate: 28, cents: 160, delay: 0 } }),
  T('tri', 4200, 0.2, 0.12, { at: 0.13, f2: 6200, hold: true }),
  N(15, 44100, 0.3, 0.08, { f: bp(4500, 6000, 2), rise: 0.15 }),
], 0.03);

// flap: a flock passing, over half a second. Ten wingbeats of soft noise come in two layers a few hundredths apart so they never
// line up: five through a band that opens from 340 Hz to 620 Hz and five through a lower one (300 Hz to 520 Hz), each swelling over
// a twentieth of a second before it falls, each a little quieter than the last as the flock goes by. A breath of lowpassed air
// (500 Hz to 900 Hz) binds them and a faint leathery rasp of short-register noise sits behind. It repeats every time bats come up,
// so it is soft and has nothing hard in it: no tone, no click, three quarters of it between 360 Hz and 1.4 kHz and next to nothing
// over that.
const FLAP = R([
  N(15, 12000, 0.55, 0.18, { f: lp(500, 900), rise: 0.2 }),
  ...[0, 0.11, 0.2, 0.3, 0.38].map((at, i) => N(15, 9000, 0.09, 0.5 - i * 0.06, { at, f: bp(340 + i * 40, 620, 1.4), rise: 0.045 })),
  ...[0.05, 0.16, 0.26, 0.35, 0.45].map((at, i) => N(15, 9000, 0.1, 0.34 - i * 0.05, { at, f: bp(300 + i * 30, 520, 1.4), rise: 0.05 })),
  N(7, 3000, 0.45, 0.1, { f: bp(700, 500, 1.2), rise: 0.15 }),
], 0.03);

// bolt: the storm's thunder, half a second, low and short. A crack of white noise through a band falling from 1.8 kHz to 600 Hz
// opens it, and the roll follows at once: lowpassed noise sinking from 900 Hz to 170 Hz, a coarse register of short noise rumbling
// under it (420 Hz to 130 Hz), a triangle thump falling from 200 Hz to 95 Hz and a second, softer roll at 0.2 s as it echoes off
// the houses. All noise and a thump, nothing pitched and nothing over 2 kHz, mostly 90 to 720 Hz. Slam, boom and thud are one blow
// each; this is the one that is a crack first and a rumble after.
const BOLT = R([
  N(15, 44100, 0.04, 0.9, { f: bp(1800, 600, 0.8) }),
  N(15, 9000, 0.5, 0.9, { f: lp(900, 170), rise: 0.03 }),
  N(7, 2600, 0.45, 0.5, { at: 0.04, f: lp(420, 130), rise: 0.1 }),
  T('tri', 200, 0.2, 0.4, { at: 0.03, f2: 95 }),
  N(15, 7000, 0.3, 0.4, { at: 0.2, f: lp(480, 140), rise: 0.06 }),
], 0.03);

// whip: Vecna's vine lashes, a sixth of a second. A swish of noise opens through a band climbing from 900 Hz to 3.4 kHz over a
// thin pulse whistling up from 900 Hz to 2.8 kHz, and at 0.08 s the lash lands: a crack of short-register noise round 2.4 kHz
// falling to 1.7 kHz, a click above 3.5 kHz, a pulse snapping down from 1.8 kHz to 700 Hz and a wet slap of short noise (1.1 kHz
// to 500 Hz), because a vine is green. Swing is a plain swish with no snap, dash a bright one with no weight and bash a heavy one;
// this is the one with a whistle in front and a crack and a slap behind. It comes every 80 to 120 frames in the fight, so it is
// short and has next to nothing under 500 Hz.
const WHIP = R([
  N(15, 30000, 0.1, 0.4, { f: bp(900, 3400, 1.6), rise: 0.075 }),
  T('p12', 900, 0.09, 0.14, { f2: 2800, hold: true }),
  N(7, 9000, 0.05, 0.9, { at: 0.08, f: bp(2400, 1700, 1.4) }),
  N(15, 44100, 0.012, 0.4, { at: 0.085, f: hp(3500) }),
  T('p12', 1800, 0.06, 0.3, { at: 0.085, f2: 700 }),
  N(7, 5000, 0.07, 0.4, { at: 0.09, f: bp(1100, 500, 2) }),
], 0.03);

// orb: a memory orb breaks, under half a second, glassy and wet. A click of white noise above 3.5 kHz and a crack of short noise
// (3 kHz falling to 1.8 kHz) split the shell, and three pings ring out of it, triangles that sag six percent as they die: 2.1 kHz,
// 3.3 kHz and 4.6 kHz, which are not harmonics of each other, so it rings like glass and not like a chord. Under them a splash of
// lowpassed noise falls from 1.2 kHz to 250 Hz, and three glugs plop out of it, each a triangle falling an octave in 0.08 s
// (620 Hz, 480 Hz and 380 Hz, each lower and softer than the last), with three softening drips between them (a band round 800 Hz
// sinking to 560 Hz).
// Shatter, the skylight, is all highs and breaks for a second and a half; this has the low plops that make it wet, and it rings
// for a third of that.
const ORB = R([
  N(15, 44100, 0.015, 0.7, { f: hp(3500) }),
  N(7, 20000, 0.05, 0.5, { at: 0.005, f: bp(3000, 1800, 1.8) }),
  ...[[0.01, 2100], [0.025, 3300], [0.04, 4600]].map(([at, f], i) => T('tri', f, 0.3 - i * 0.04, 0.4 - i * 0.05, { at, f2: f * 0.94 })),
  N(15, 12000, 0.22, 0.7, { at: 0.03, f: lp(1200, 250), rise: 0.01 }),
  ...[[0.1, 620], [0.19, 480], [0.32, 380]].map(([at, f], i) => T('tri', f, 0.08, 0.4 - i * 0.08, { at, f2: f * 0.5 })),
  ...[0.14, 0.26, 0.4].map((at, i) => N(7, 6000, 0.03, 0.4 - i * 0.1, { at, f: bp(800, 560, 1.6) })),
], 0.04);

// debris: a thrown rock lands, four tenths of a second. A thump comes first, a triangle falling from 150 Hz to 60 Hz, with a crunch
// of white noise through a band falling from 900 Hz to 400 Hz on top of it. Then the rock breaks and the pieces skitter: six chips
// of short-register noise a few hundredths apart, each through a band a little lower and softer than the one before (2.2 kHz down
// to 1.1 kHz), and a cloud of dust, lowpassed noise settling from 800 Hz to 250 Hz. It lives between 60 Hz and 2.5 kHz, and it is
// the only one with a clatter in it. RockHit is a single dull knock a quarter of the length, and crack is a brittle wall; this
// falls apart.
const DEBRIS = R([
  T('tri', 150, 0.14, 0.7, { f2: 60 }),
  N(15, 12000, 0.1, 0.8, { f: bp(900, 400, 0.8) }),
  ...[0.05, 0.1, 0.16, 0.22, 0.29, 0.36].map((at, i) => N(7, 7000, 0.025, 0.5 - i * 0.06, { at, f: bp(2200 - i * 220, undefined, 1.6) })),
  N(15, 8000, 0.3, 0.3, { at: 0.06, f: lp(800, 250), rise: 0.03 }),
], 0.04);

// vecna: his call as a phase turns, a little over a second. Two sawtooths three hertz apart fall from 88 Hz and 91 Hz to 62 Hz and
// 64 Hz, so they beat slowly, the first under a slow vibrato (3 Hz, 60 cents); a 12.5 percent pulse an octave over them falls from
// 176 Hz to 124 Hz under a fast one (22 Hz, 160 cents) and roughens it; a triangle falls from 44 Hz to 36 Hz for the weight; breath,
// lowpassed noise from 500 Hz to 200 Hz, swells in over a quarter of a second; and four pops of short noise round 600 Hz crackle
// across it, like his voice. Everything is between 36 Hz and 500 Hz except the saws' own harmonics. Growl is a snarl of pulses
// that ends in two thirds of a second, and boom is noise with nothing above 520 Hz; this is the one low voice that is long,
// pitched and slow.
const VECNA = R([
  T('saw', 88, 1, 0.5, { f2: 62, vib: { rate: 3, cents: 60, delay: 0.1 } }),
  T('saw', 91, 1, 0.3, { f2: 64 }),
  T('p12', 176, 0.9, 0.2, { f2: 124, vib: { rate: 22, cents: 160, delay: 0 } }),
  T('tri', 44, 1, 0.25, { at: 0.1, f2: 36 }),
  N(15, 7000, 0.9, 0.4, { f: lp(500, 200), rise: 0.25 }),
  ...[0.2, 0.28, 0.45, 0.6].map((at, i) => N(7, 3000, 0.02, 0.3 - i * 0.05, { at, f: bp(600, undefined, 1.2) })),
], 0.03);

export const SFX1213: Record<Sfx1213, Recipe> = {
  screech: SCREECH, flap: FLAP, bolt: BOLT, whip: WHIP, orb: ORB, debris: DEBRIS, vecna: VECNA,
};

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced at): screech
 * 0.32, flap 0.2, bolt 0.5, whip 0.45, orb 0.35, debris 0.5, vecna 0.5. Bolt, debris and vecna are blows and sit near 0.5 with the
 * other heavy sounds (boom 0.48, slam above it); whip is a lash that comes every second or two in the fight, so it sits a little
 * under at 0.45; orb is glass and sits at 0.35 with the chimes. Screech is the highest sound there is, where the ear hears best, so
 * it is 0.32, under ghoul's 0.38; and flap, which repeats every time bats come up and is meant to sit under the fight, is 0.2 with
 * riff, the quietest. A noise burst's peak depends on where in the noise loop it starts, and the game starts it somewhere new on
 * every play (the seed is the start time), so each is the median of eight starts: one render in the lab can read 15 to 30 percent
 * either way on the effects whose peak comes from noise (flap, bolt, whip, orb, debris), 4 percent on screech and none on vecna,
 * whose peak is tone.
 */
export const LEVELS1213: Record<Sfx1213, number> = {
  screech: 0.336, flap: 0.531, bolt: 0.436, whip: 0.486, orb: 0.317, debris: 0.443, vecna: 0.581,
};
