// Effects for Levels 10 and 11 (stages 4.1 and 4.2): Hopper's haymaker, Eddie's Flying V, one pulse of his solo and the
// feedback that cuts it short, a grandfather clock's chime, a hero lifted by the curse, Max's Walkman and a Creel ghoul stepping
// out of a mirror. Each is its own recipe and sits in its own part of the spectrum, said in its comment: haymaker is the low-mid
// body blow (70 Hz to 1.5 kHz), vswing the one with a chord in it (160 to 660 Hz under a whoosh), riff a chord stab with
// nothing above 1.4 kHz in it, feedback the highest held tone (1.2 to 3.8 kHz), chime the lowest ring (under 420 Hz), curse the
// one low sweep that climbs, walkman the bright notes behind a clunk (1.2 to 2.2 kHz), and ghoul the shriek that falls.
// Pure data in the shape sfx.ts plays. LEVELS1011 is the gain for each, measured with an offline render (the audio lab's E key,
// renderWith in render.ts): see the note above it.
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1011 = 'haymaker' | 'vswing' | 'riff' | 'feedback' | 'chime' | 'curse' | 'walkman' | 'ghoul';

// haymaker: Hopper's slow punch, 0.4 s. A gust of lowpassed noise swells over 0.15 s as the fist comes round (it opens from
// 280 Hz to 1.5 kHz, with a coarse register of noise under it for the weight of the air), and the fist lands at 0.16 s: a triangle
// thud falling from 170 Hz to 72 Hz with a pulse under it at 86 Hz, a slap of noise through a lowpass falling from 1.5 kHz to
// 320 Hz, a short knuckle crack round 1 kHz and a low settle falling to 130 Hz. It lives between 70 Hz and 1.5 kHz: nothing
// under 60 Hz, which slam, bash and thud own, and nothing above 1.5 kHz, where swing hisses and hit bites. Bash is a whoosh
// with a thump at the end; this is a body blow, dull and heavy.
const HAYMAKER = R([
  N(15, 9000, 0.18, 0.6, { f: lp(280, 1500), rise: 0.15 }),
  N(7, 2600, 0.17, 0.3, { f: lp(420, 760), rise: 0.12 }),
  T('tri', 170, 0.15, 0.9, { at: 0.16, f2: 72 }),
  T('p25', 86, 0.14, 0.32, { at: 0.16, f2: 63 }),
  N(15, 9000, 0.1, 0.8, { at: 0.16, f: lp(1500, 320) }),
  N(7, 12000, 0.025, 0.4, { at: 0.16, f: bp(1050, undefined, 1.4) }),
  N(15, 7000, 0.22, 0.45, { at: 0.2, f: lp(420, 130), rise: 0.01 }),
], 0.03);

// vswing: Eddie's Flying V, 0.6 s. A whoosh of noise climbs from 500 Hz to 2.2 kHz as the guitar comes round, and at
// 0.13 s, where the swing lands, a power chord rings out of it: E3, B3 and E4 (165, 247 and 330 Hz) on the pulse waves with the
// root and the fifth sagging a little as they ring, a second B3 thirteen cents sharp of the first so the chord beats like a
// guitar that is slightly out, a thin E5 on top and a pick scrape of noise round 2.4 kHz. The chord is the whole idea: swing
// and bash have no pitch at all, and nothing else in the fight rings between 160 and 660 Hz.
const VSWING = R([
  N(15, 30000, 0.15, 0.55, { f: bp(500, 2200, 1.2), rise: 0.11 }),
  N(7, 16000, 0.02, 0.35, { at: 0.13, f: bp(2400, undefined, 1.6) }),
  T('p25', 164.8, 0.5, 0.5, { at: 0.13, f2: 158 }),
  T('p25', 247, 0.5, 0.42, { at: 0.13, f2: 237 }),
  T('p50', 329.6, 0.45, 0.3, { at: 0.13 }),
  T('p25', 248.8, 0.4, 0.25, { at: 0.13 }),
  T('p12', 659.3, 0.3, 0.1, { at: 0.13 }),
], 0.03);

// riff: one pulse of Eddie's solo, a power chord stab of 0.16 s, played every half second for six seconds under the music. It has
// to be easy to live with, so it is soft and dark and short: A3 and E4 on the 25 percent pulse, A4 on the square and a triangle
// at A2 under them, no noise at all, and almost nothing above 1.4 kHz (the ear's sharpest hearing, where a repeated sound
// tires it). It decays inside a tenth of a second. Its pitch moves three percent between plays, and the chord moves as one, so
// the fifth stays in tune. LEVELS1011 puts it at a peak of 0.2, well under the music's 0.45 to 0.8.
const RIFF = R([
  T('p25', 220, 0.16, 0.5),
  T('p25', 329.6, 0.15, 0.36),
  T('p50', 440, 0.12, 0.18),
  T('tri', 110, 0.14, 0.4),
], 0.03);

// feedback: the squeal of a solo cut short, 0.6 s. A 25 percent pulse leans up from 1.25 kHz to 1.9 kHz under a slow, wide
// vibrato (6.5 Hz, 55 cents), with a triangle an octave over it (2.5 kHz to 3.8 kHz) and another an octave under, and a fizz of
// pitched noise round 3 kHz swelling in beneath them like an amp about to go. At 0.5 s it is cut: the tones stop dead, and in
// the silence a thump falling from 130 Hz to 60 Hz and a click of noise above 3 kHz go off, the amp switched off. It is the
// highest held tone there is. Beam sweeps up to 1.8 kHz fast and shakes at 20 Hz; this leans slowly and wavers, and nothing
// else holds a tone over 2 kHz.
const FEEDBACK = R([
  T('p25', 1250, 0.5, 0.4, { f2: 1900, hold: true, vib: { rate: 6.5, cents: 55, delay: 0.08 } }),
  T('tri', 2500, 0.5, 0.22, { f2: 3800, hold: true, vib: { rate: 6.5, cents: 55, delay: 0.08 } }),
  T('tri', 625, 0.5, 0.18, { f2: 950, hold: true }),
  N(7, 26000, 0.5, 0.12, { f: bp(2600, 3600, 3), rise: 0.25 }),
  T('tri', 130, 0.1, 0.7, { at: 0.5, f2: 60 }),
  N(15, 30000, 0.012, 0.45, { at: 0.5, f: hp(3000) }),
], 0.01);

// chime: a grandfather clock's low bell, 1.7 s, a little wrong. A tick of pitched noise for the strike, then a hum at 98 Hz (G2),
// the prime at 196 Hz doubled by a second prime 5.5 Hz sharp so the strike beats like a cracked bell, a minor third at 233 Hz
// and a fifth at 294 Hz over it, the nominal at 392 Hz, and one partial at 417 Hz that belongs to no chord. All triangles, left
// to ring, with no air. It is the lowest sound that rings: reach, the other long soft bell, is warm and all above 349 Hz, and
// this is under 420 Hz and out of tune with itself. It sounds four times in a curse, five seconds apart, so it is a bell and not
// a siren: it has next to no pitch jitter and is never louder than 0.35.
const CHIME = R([
  N(7, 9000, 0.02, 0.3, { f: bp(1800, undefined, 1.5) }),
  T('tri', 98, 1.7, 0.45),
  T('tri', 196, 1.5, 0.5),
  T('tri', 201.5, 1.4, 0.38),
  T('tri', 233, 1, 0.24),
  T('tri', 294, 0.8, 0.2),
  T('tri', 392, 0.75, 0.22),
  T('tri', 417, 0.55, 0.12),
], 0.01);

// curse: a hero is lifted, 1.1 s. A gust of lowpassed noise swells over 0.75 s (250 Hz opening to 1 kHz) with a coarse register
// rumbling under it, and two triangles rise from 85 Hz and 88 Hz to 240 Hz and 248 Hz, a little apart so they waver, the first
// under a slow vibrato. All of it is under 1 kHz and all of it climbs: growl and logPush fall or hold, and the climb is what
// lifts. The low whoosh, with nothing sharp in it.
const CURSE = R([
  N(15, 9000, 1.1, 0.7, { f: lp(250, 1000), rise: 0.75 }),
  N(7, 1800, 1, 0.35, { f: lp(400, 800), rise: 0.6 }),
  T('tri', 85, 1, 0.5, { f2: 240, vib: { rate: 4, cents: 35, delay: 0.1 } }),
  T('tri', 88, 1, 0.32, { f2: 248 }),
], 0.02);

// walkman: Max's Walkman, 0.65 s. A cassette clunk: a burst of pitched noise through a band falling from 650 Hz to 380 Hz over
// a triangle thump falling from 150 Hz to 70 Hz, a latch click round 2.2 kHz and a quiet whirr of the motor winding up. Then four
// bright notes up a D major seventh (D6, F sharp 6, A6 and C sharp 7, 1.2 kHz to 2.2 kHz), the first, second and last with the
// wobble of a tape that has been played too often, the last left to ring over its octave. Pickup, heal and levelUp climb plain
// triads and have no clunk; this has the clunk and the wobble, and ends on the major seventh.
const WALKMAN = R([
  N(7, 5200, 0.035, 0.8, { f: bp(650, 380, 2.4) }),
  T('tri', 150, 0.07, 0.8, { f2: 70 }),
  N(15, 14000, 0.012, 0.35, { at: 0.05, f: bp(2200, undefined, 2) }),
  N(7, 9000, 0.12, 0.14, { at: 0.07, f: bp(900, 1500, 2), rise: 0.06 }),
  T('p25', 1175, 0.09, 0.3, { at: 0.17, hold: true, vib: { rate: 5, cents: 35, delay: 0 } }),
  T('p25', 1480, 0.09, 0.3, { at: 0.26, hold: true, vib: { rate: 5, cents: 35, delay: 0 } }),
  T('p25', 1760, 0.09, 0.3, { at: 0.35, hold: true }),
  T('p12', 2217, 0.3, 0.26, { at: 0.44, vib: { rate: 5, cents: 45, delay: 0 } }),
  T('tri', 1109, 0.3, 0.14, { at: 0.44 }),
], 0.01);

// ghoul: a Creel ghoul steps out of a mirror, 0.55 s. A crack of noise above 5 kHz, and a shriek that falls: a triangle from 1.3 kHz
// to 540 Hz under a fast, wide vibrato (10 Hz, 120 cents), a pulse doubling it a little sharp, a second shriek an octave over it,
// a band of hiss falling from 5.2 kHz to 3 kHz and two pings of glass that fall too (3.1 kHz to 2.4 kHz, 2.3 kHz to 1.9 kHz).
// Everything falls: feedback and beam climb, and spotted is a rising pair of pings, so this is the one that screams downward.
const GHOUL = R([
  N(15, 44100, 0.012, 0.5, { f: hp(5000) }),
  N(15, 44100, 0.5, 0.2, { f: bp(5200, 3000, 2.5), rise: 0.08 }),
  T('tri', 1300, 0.55, 0.55, { f2: 540, vib: { rate: 10, cents: 120, delay: 0 } }),
  T('p25', 1330, 0.55, 0.22, { f2: 555, vib: { rate: 8.5, cents: 100, delay: 0.04 } }),
  T('tri', 2600, 0.4, 0.2, { f2: 1080, vib: { rate: 10, cents: 120, delay: 0 } }),
  T('tri', 3136, 0.35, 0.18, { at: 0.03, f2: 2400 }),
  T('tri', 2349, 0.3, 0.14, { at: 0.12, f2: 1900 }),
], 0.03);

export const SFX1011: Record<Sfx1011, Recipe> = {
  haymaker: HAYMAKER, vswing: VSWING, riff: RIFF, feedback: FEEDBACK, chime: CHIME, curse: CURSE, walkman: WALKMAN, ghoul: GHOUL,
};

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced at): haymaker
 * 0.5, vswing 0.42, riff 0.2, feedback 0.3, chime 0.35, curse 0.4, walkman 0.3, ghoul 0.38. The two blows are impacts and sit near
 * 0.5 with the rest; feedback, chime and walkman are tones and sit near 0.3 to 0.35; curse is a low whoosh that a small speaker
 * loses, so it sits at 0.4; and riff, which repeats every half second for six seconds, is the quietest sound there is. A noise
 * burst's peak depends on where in the noise loop it starts, and the game starts it somewhere new on every play (the seed is
 * the start time), so each is the median of eight starts: one render in the lab can read up to 20 percent either way on the
 * effects whose peak comes from noise (haymaker, vswing, feedback, curse, walkman, ghoul), and none on riff and chime, whose
 * peaks are tone.
 */
export const LEVELS1011: Record<Sfx1011, number> = {
  haymaker: 0.378, vswing: 0.326, riff: 0.245, feedback: 0.281, chime: 0.297, curse: 0.42, walkman: 0.367, ghoul: 0.417,
};
