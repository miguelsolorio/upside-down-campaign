// What Audio made for the second half of chapter 4 (docs/level-12.md and docs/level-13.md): the seven effects of stages 4.3 and 4.4
// and Vecna's speech blip. They replace stand-ins, so these tests check that nothing is borrowed any more, that every effect
// renders, peaks where its gain says and is distinct from the others, and that each is built the way its comment says.
// Peak and loudness need a rendered signal, so this renders in Node on the offline context in offline-audio.ts, through the same synth
// and mix graph as the game, the way tests/audio-ch4.test.ts does for the first half. A noise burst's peak depends on where in the
// noise loop it starts, and the game starts it somewhere else on every play, so an effect's level is the median peak over eight
// starts, not one render. The audio lab (?audio=1, E for an effect) gives the same figures in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS1213, SFX1213 } from '../src/audio/sfx_level1213.ts';
import type { Sfx1213 } from '../src/audio/sfx_level1213.ts';
import { BLIPS, playBlip } from '../src/audio/cues.ts';
import { LIMITER } from '../src/audio/engine.ts';
import { renderWith } from '../src/audio/render.ts';
import type { Ns, Recipe, Tn } from '../src/audio/sfx_kit.ts';
import type { SfxId, Speaker } from '../src/core/types.ts';
import { installOfflineAudio } from './offline-audio.ts';
import { bands, centroid, distance, energyDb, share } from './audio-analysis.ts';
import { peakOf, play } from './audio-helpers.ts';

installOfflineAudio();

const NEW = ['screech', 'flap', 'bolt', 'whip', 'orb', 'debris', 'vecna'] as const;
/** The peak after the limiter each should have, median over eight starts. Blows near 0.5, the glass near 0.35, screech under ghoul's 0.38, flap the quietest. */
const TARGET: Record<Sfx1213, number> = { screech: 0.32, flap: 0.2, bolt: 0.5, whip: 0.45, orb: 0.35, debris: 0.5, vecna: 0.5 };

const toneParts = (r: Recipe): Tn[] => r.parts.filter((p): p is Tn => p.k === 't');
const noiseParts = (r: Recipe): Ns[] => r.parts.filter((p): p is Ns => p.k === 'n');
const tones = (id: Sfx1213): Tn[] => toneParts(SFX1213[id]);
const noises = (id: Sfx1213): Ns[] => noiseParts(SFX1213[id]);
const lengthOf = (r: Recipe): number => Math.max(...r.parts.map((p) => p.at + p.d));
const lowest = (id: Sfx1213): number => Math.min(...tones(id).map((t) => Math.min(t.f, t.f2 ?? t.f)));
const cornerOf = (r: Recipe): number => Math.max(0, ...noiseParts(r).map((n) => Math.max(n.f?.freq ?? 0, n.f?.freqEnd ?? 0)));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
};
/** The band of a filtered noise part falls over the sound. */
const falls = (n: Ns): boolean => n.f?.freqEnd !== undefined && n.f.freqEnd < n.f.freq;

/** One effect alone through the mix graph. `shift` moves its start, which moves where its noise starts in the loop. */
const renderSfx = (id: SfxId, shift = 0) => renderWith(lengthOf(SFX[id]) + 0.15, (ctx, g, t0) => playSfx(ctx, g.sfx, id, t0 + shift));
const samplesOf = async (id: SfxId): Promise<Float32Array> => (await renderSfx(id)).samples;

// ---------------------------------------------------------------- the seven effects

test('the seven effects are registered, each with its own recipe, none a stand-in and none sharing a part with any other sound', () => {
  assert.deepEqual(Object.keys(SFX1213).sort(), [...NEW].sort());
  assert.deepEqual(Object.keys(LEVELS1213).sort(), [...NEW].sort());
  for (const id of NEW) {
    assert.equal(SFX[id], SFX1213[id], `${id} is the one the game plays`);
    // The stand-ins were one or two parts each.
    assert.ok(SFX1213[id].parts.length >= 5, `${id} is built from parts, not a stub`);
    for (const other of Object.keys(SFX) as SfxId[]) {
      if (other === id) continue;
      assert.notEqual(SFX[id], SFX[other], `${id} shares a recipe with ${other}`);
      assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
    }
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
});

test('every part is in range, at the pitch jitter and a semitone either way, and each effect runs the length its design asks for', () => {
  const span: Record<Sfx1213, [number, number]> = {
    screech: [0.3, 0.36], flap: [0.5, 0.6], bolt: [0.45, 0.55], whip: [0.14, 0.2], orb: [0.4, 0.48], debris: [0.35, 0.45], vecna: [1, 1.2],
  };
  for (const id of NEW) {
    const r = SFX1213[id];
    assert.ok(lengthOf(r) >= span[id][0] && lengthOf(r) <= span[id][1], `${id} runs ${lengthOf(r).toFixed(2)} s`);
    assert.ok(r.j >= 0 && r.j <= 0.04, `${id} jitter ${r.j}`);
    const top = 1 + r.j + 0.06;
    for (const p of r.parts) {
      assert.ok(p.d > 0 && p.at >= 0 && p.v > 0 && p.v <= 1, `${id} part timing or volume`);
      if (p.k === 't') {
        for (const f of [p.f, p.f2 ?? p.f]) assert.ok(f * (1 - r.j - 0.06) >= 20 && f * top <= 8000, `${id} tone ${f}`);
        if (p.vib) assert.ok(p.vib.rate > 0 && p.vib.cents > 0 && p.vib.delay >= 0, `${id} vibrato`);
      } else {
        assert.ok(p.c > 0 && p.c * top <= 50000, `${id} clock ${p.c}`);
        if (p.f) for (const f of [p.f.freq, p.f.freqEnd ?? p.f.freq]) assert.ok(f >= 20 && f <= 20000, `${id} filter ${f}`);
        if (p.rise !== undefined) assert.ok(p.rise > 0 && p.rise < p.d, `${id} swell`);
      }
    }
  }
  // The thunder is low and short, the lash is shorter than its own ten frames and the call is the one long sound.
  assert.ok(lengthOf(SFX1213.bolt) <= 0.55 && lengthOf(SFX1213.whip) < 0.2 && lengthOf(SFX1213.screech) < 0.4);
  assert.ok(lengthOf(SFX1213.vecna) > 1 && NEW.every((id) => id === 'vecna' || lengthOf(SFX1213[id]) < 0.6));
  assert.ok(lengthOf(SFX1213.vecna) > 1.5 * lengthOf(SFX.growl), 'his call outlasts the growl');
});

// ---------------------------------------------------------------- levels

test('every effect renders: not silent, not broken, and gone when its recipe ends', async () => {
  for (const id of NEW) {
    const r = await renderSfx(id);
    assert.ok(r.samples.every(Number.isFinite), `${id} has no NaN`);
    assert.ok(r.metrics.peak > 0.1 && r.metrics.clipped === 0, `${id} peak ${r.metrics.peak}`);
    const tail = r.samples.slice(Math.round((lengthOf(SFX1213[id]) + 0.05) * 44100));
    assert.ok(Math.max(...tail.map(Math.abs)) < 0.01, `${id} is gone when its recipe ends`);
  }
}, { timeout: 60000 });

test('levels are measured: each effect peaks where its gain says, with the limiter idle', async () => {
  const limiter = 10 ** (LIMITER.threshold / 20);
  for (const id of NEW) {
    assert.ok(LEVELS1213[id] > 0.1 && LEVELS1213[id] <= 1, `${id} level ${LEVELS1213[id]}`);
    // Vecna has no noise to start anywhere; the others start in eight places.
    const shifts = noises(id).length ? [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * 0.00137) : [0];
    const runs = await Promise.all(shifts.map((s) => renderSfx(id, s)));
    const peak = median(runs.map((r) => r.metrics.peak));
    assert.ok(Math.abs(peak - TARGET[id]) <= 0.025, `${id} peaks at ${peak.toFixed(3)}, wanted ${TARGET[id]}`);
    assert.ok(Math.max(...runs.map((r) => r.metrics.peak)) < limiter * 0.8, `${id} stays well under the limiter (${limiter.toFixed(2)})`);
    assert.ok(Math.max(...runs.map((r) => r.metrics.limiterDb)) < 0.01, `${id} leaves the limiter alone`);
  }
  // Blows near 0.5 with the rest, the lash a little under, the glass with the chimes, the flock softest of all.
  for (const id of ['bolt', 'debris', 'vecna'] as const) assert.ok(TARGET[id] >= 0.45, `${id} is a blow`);
  assert.ok(TARGET.whip < TARGET.bolt && TARGET.orb <= 0.35 && TARGET.screech < 0.38, 'and the rest sit under them');
  assert.equal(Math.min(...NEW.map((id) => TARGET[id])), TARGET.flap, 'flap is the quietest of the seven');
}, { timeout: 60000 });

test('what the game plays is what was measured: the level in the mix is LEVELS1213 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    const ps = SFX1213[id].parts;
    assert.equal(out.voices.length, ps.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...ps.map((p) => p.v)) * LEVELS1213[id]) < 1e-9 && top < 0.5, `${id} plays at its level`);
  }
});

// ---------------------------------------------------------------- each in its own part of the spectrum

test('each sits in its own part of the spectrum, and they climb from vecna up to screech', async () => {
  const s = Object.fromEntries(await Promise.all(NEW.map(async (id) => [id, await samplesOf(id)]))) as Record<Sfx1213, Float32Array>;
  const [swing, ghoul, feedback, shatter, slam, boom, thud] = await Promise.all(
    (['swing', 'ghoul', 'feedback', 'shatter', 'slam', 'boom', 'thud'] as const).map(samplesOf),
  );

  // screech: the highest chirp. Nothing under 2.4 kHz, two chirps that both climb, a fast vibrato, where the ghoul falls.
  assert.ok(lowest('screech') >= 2400 && share(s.screech, 2000, 22050) >= 0.95 && share(s.screech, 2880, 22050) >= 0.8);
  assert.ok(tones('screech').every((t) => t.f2! > t.f), 'every tone climbs');
  const chirps = tones('screech').filter((t) => t.w === 'p25');
  assert.ok(chirps.length === 2 && chirps[1].at > chirps[0].at + 0.1 && chirps.every((t) => t.hold && t.vib!.rate >= 20), 'two held chirps, shaking fast');
  assert.ok(centroid(s.screech) > 4000 && centroid(s.screech) > 2 * centroid(ghoul) && centroid(s.screech) > 2 * centroid(feedback));
  assert.ok(toneParts(SFX.ghoul).every((t) => t.f2! < t.f), 'where the ghoul falls');
  assert.ok(noises('screech').every((n) => n.f!.type !== 'lowpass' && (n.f!.freq >= 4000)), 'no low noise under it');

  // flap: soft. No tone, ten wingbeats that all swell in, a band of air, and three quarters of it between 360 Hz and 1.4 kHz.
  assert.equal(tones('flap').length, 0, 'no tone');
  assert.ok(noises('flap').every((n) => n.rise !== undefined && n.v <= 0.5), 'nothing starts hard and nothing is loud');
  assert.ok(noises('flap').filter((n) => n.d <= 0.1 && n.f!.type === 'bandpass').length === 10, 'ten wingbeats');
  assert.ok(cornerOf(SFX1213.flap) <= 1000 && Math.min(...noises('flap').map((n) => n.f!.freq)) >= 300);
  assert.ok(share(s.flap, 360, 1440) >= 0.7 && share(s.flap, 1440, 22050) <= 0.12 && share(s.flap, 0, 180) <= 0.08, 'low mids, no hiss and no thump');
  assert.ok(centroid(s.flap) > 500 && centroid(s.flap) < 900);

  // bolt: the storm's thunder. Noise and one thump, a crack first and two rolls after it, mostly 90 to 720 Hz, nothing over 2 kHz.
  assert.ok(tones('bolt').length === 1 && tones('bolt')[0].f <= 250 && tones('bolt')[0].f2! < tones('bolt')[0].f, 'one thump, and it falls');
  const crack = noises('bolt').find((n) => n.at === 0)!;
  assert.ok(crack.d <= 0.05 && crack.f!.type === 'bandpass' && falls(crack), 'a crack first');
  const rolls = noises('bolt').filter((n) => n.m === 15 && n.f!.type === 'lowpass' && falls(n) && n.d >= 0.3);
  assert.ok(rolls.length === 2 && rolls[1].at >= 0.15 && rolls[1].v < rolls[0].v, 'two rolls, the second softer');
  assert.ok(cornerOf(SFX1213.bolt) <= 1800 && share(s.bolt, 90, 720) >= 0.65 && share(s.bolt, 2000, 22050) <= 0.02);
  assert.ok(centroid(s.bolt) > centroid(slam) && centroid(s.bolt) > centroid(thud) && centroid(s.bolt) > 2 * centroid(boom), 'above the blows');

  // whip: the swish and crack of the upper mids. A whistle that climbs, a crack at 0.08 s, a click, a snap that falls and a wet slap.
  const whistle = tones('whip').find((t) => t.at === 0)!;
  assert.ok(whistle.hold && whistle.f2! > 2 * whistle.f, 'a whistle in front');
  const lash = noises('whip').filter((n) => n.at >= 0.08 && n.at <= 0.09);
  assert.ok(lash.some((n) => n.m === 7 && n.f!.type === 'bandpass' && n.f!.freq >= 2000 && n.v >= 0.8), 'the crack');
  assert.ok(lash.some((n) => n.f!.type === 'highpass' && n.f!.freq >= 3000 && n.d <= 0.02), 'a click');
  assert.ok(lash.some((n) => n.m === 7 && falls(n) && n.f!.freq <= 1200), 'and the wet slap');
  assert.ok(tones('whip').some((t) => t.at >= 0.08 && t.f2! < t.f * 0.5), 'the snap falls');
  assert.ok(share(s.whip, 1440, 5760) >= 0.6 && share(s.whip, 0, 720) <= 0.05 && centroid(s.whip) > 2500 && centroid(s.whip) < 5000);
  assert.ok(distance(bands(s.whip), bands(swing)) >= 0.15, 'not the swing');

  // orb: glass over wet. Three pings that are not harmonics of one another over a splash and three glugs that fall an octave each.
  const pings = tones('orb').filter((t) => t.f >= 2000);
  assert.ok(pings.length === 3 && pings.every((t) => t.w === 'tri' && Math.abs(t.f2! / t.f - 0.94) < 1e-9), 'three pings, each sagging six percent');
  for (const [i, a] of pings.entries()) {
    for (const b of pings.slice(i + 1)) {
      const ratio = Math.max(a.f, b.f) / Math.min(a.f, b.f);
      for (const harmonic of [1, 1.25, 4 / 3, 1.5, 2, 2.5, 3, 4]) assert.ok(Math.abs(ratio / harmonic - 1) > 0.03, `${a.f} and ${b.f} ring as a chord`);
    }
  }
  const glugs = tones('orb').filter((t) => t.f < 700);
  assert.ok(glugs.length === 3 && glugs.every((t, k) => Math.abs(t.f2! / t.f - 0.5) < 1e-9 && (k === 0 || (t.f < glugs[k - 1].f && t.v < glugs[k - 1].v))), 'glugs');
  assert.ok(noises('orb').some((n) => n.f!.type === 'lowpass' && falls(n) && n.f!.freq >= 1000 && n.d >= 0.2), 'a splash');
  assert.ok(noises('orb').some((n) => n.at === 0 && n.f!.type === 'highpass' && n.f!.freq >= 3000), 'and a click opens it');
  assert.ok(share(s.orb, 2000, 22050) >= 0.2 && share(s.orb, 0, 720) >= 0.35, 'glass on top and wet below');
  assert.ok(centroid(s.orb) < centroid(shatter) / 3 && lengthOf(SFX1213.orb) < lengthOf(SFX.shatter) / 2, 'where shatter is all highs and four times as long');

  // debris: a thump and a clatter. A triangle falling from 150 Hz to 60 Hz, six chips that each fall and soften, dust, nothing high.
  const thump = tones('debris')[0];
  assert.ok(tones('debris').length === 1 && thump.f === 150 && thump.f2 === 60 && thump.at === 0 && thump.d <= 0.15);
  const chips = noises('debris').filter((n) => n.m === 7);
  assert.ok(chips.length === 6 && chips.every((n, k) => k === 0 || (n.at > chips[k - 1].at && n.f!.freq < chips[k - 1].f!.freq && n.v < chips[k - 1].v)), 'chips');
  assert.ok(noises('debris').some((n) => n.m === 15 && n.f!.type === 'bandpass' && falls(n) && n.f!.freq <= 1000), 'a crunch');
  assert.ok(noises('debris').some((n) => n.f!.type === 'lowpass' && falls(n) && n.d >= 0.3), 'and dust');
  assert.ok(share(s.debris, 60, 180) >= 0.4 && share(s.debris, 720, 2880) >= 0.18 && share(s.debris, 0, 2880) >= 0.95);
  assert.ok(lengthOf(SFX1213.debris) > 3 * lengthOf(SFX.rockHit) && noiseParts(SFX.rockHit).length < 2, 'rockHit is one knock');

  // vecna: the lowest voice, pitched, long and slow. Two saws a few hertz apart that beat, a pulse that roughens, a sub, breath and pops.
  const saws = tones('vecna').filter((t) => t.w === 'saw');
  assert.ok(saws.length === 2 && Math.abs(saws[1].f - saws[0].f) >= 2 && Math.abs(saws[1].f - saws[0].f) <= 5 && saws.every((t) => t.f2! < t.f), 'beating saws');
  assert.ok(saws[0].vib!.rate <= 4, 'a slow vibrato');
  const rasp = tones('vecna').find((t) => t.w === 'p12')!;
  assert.ok(rasp.vib!.rate >= 20 && rasp.f > saws[0].f * 1.9 && rasp.f < saws[0].f * 2.1, 'a pulse an octave over, shaking fast');
  assert.ok(lowest('vecna') >= 30 && lowest('vecna') <= 40 && Math.max(...tones('vecna').map((t) => t.f)) <= 200, 'between 36 Hz and 200 Hz in the tones');
  assert.ok(noises('vecna').filter((n) => n.m === 7).length === 4 && cornerOf(SFX1213.vecna) <= 700, 'four pops and a breath, nothing high');
  assert.ok(share(s.vecna, 0, 360) >= 0.8 && share(s.vecna, 1440, 22050) <= 0.08 && centroid(s.vecna) < 400);
  assert.ok(tones('vecna').some((t) => t.w === 'saw') && NEW.every((id) => id === 'vecna' || tones(id).every((t) => t.w !== 'saw')), 'the only saw of the seven');

  // The centroids climb in this order, each at least a fifth over the last: vecna, bolt, debris, flap, orb, whip, screech.
  const ladder = ['vecna', 'bolt', 'debris', 'flap', 'orb', 'whip', 'screech'] as const;
  for (const [i, id] of ladder.entries()) {
    if (i > 0) assert.ok(centroid(s[id]) > centroid(s[ladder[i - 1]]) * 1.2, `${id} (${centroid(s[id]).toFixed(0)} Hz) is higher than ${ladder[i - 1]}`);
  }
  // No two of the seven read alike: their octave-band spectra are at least a quarter of the way apart.
  for (const [i, a] of NEW.entries()) {
    for (const b of NEW.slice(i + 1)) assert.ok(distance(bands(s[a]), bands(s[b])) >= 0.25, `${a} and ${b}: ${distance(bands(s[a]), bands(s[b])).toFixed(2)}`);
  }
}, { timeout: 60000 });

// ---------------------------------------------------------------- Vecna's blip

const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
const range = (w: Speaker): [number, number] => [BLIPS[w].midi - BLIPS[w].spread, BLIPS[w].midi + BLIPS[w].spread];
/** Plays a blip with the first random number picking the semitone, the second the cents and the third where the crackle starts in the noise. */
const blipAt = (who: Speaker, pick: number, seed = 0.5) => (ctx: BaseAudioContext, dest: AudioNode, t = 0): void => {
  let k = 0;
  playBlip(ctx, dest, who, t, () => (k++ === 0 ? pick : k === 3 ? seed : 0.5));
};
/** The blips whose loudness the other tests recorded: A-weighted energy 8.4 to 11.9 dB, median 9.6. Vecna's, at the centre of its range. */
const OTHERS = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy', 'erica', 'billy', 'eddie'] as const;
const BLIP_MEDIAN_DB = 9.6;
const MEASURED_VECNA = { peak: 0.265, energyDb: 9.52 };

test("Vecna's blip is a very low, slow thin pulse with a crackle: just over Hopper, who stays the lowest voice and the only saw", () => {
  const b = BLIPS.vecna;
  assert.equal(b.wave, 'p12', 'a thin pulse, not a saw');
  const [lo, hi] = range('vecna');
  assert.ok(lo >= 24 && hi <= 96 && b.spread >= 1 && b.spread <= 4, `${lo} to ${hi}`);
  // Hopper is the lowest voice and the only saw; Vecna sits just above him, and below every other voice.
  assert.ok(b.midi > BLIPS.hopper.midi && b.midi <= BLIPS.hopper.midi + 3, 'just above Hopper');
  assert.equal(BLIPS.hopper.wave, 'saw');
  for (const w of Object.keys(BLIPS) as Speaker[]) {
    if (w === 'hopper' || w === 'vecna') continue;
    assert.ok(BLIPS[w].midi > b.midi, `${w} is above Vecna`);
    assert.notEqual(BLIPS[w].wave, 'saw', `${w} is not a saw`);
  }
  // Billy's growl is a wobble in the pitch and stays his alone; Vecna's roughness is in noise and the pitch stays clean.
  assert.ok(b.rough === undefined && b.vibrato === undefined, 'no growl, no warble');
  for (const w of Object.keys(BLIPS) as Speaker[]) if (w !== 'billy') assert.equal(BLIPS[w].rough, undefined, `${w} is not rough`);
  assert.ok(range('billy')[0] >= hi, "and Billy's growl is above it");
  // Slow: the longest blip there is, a soft start, and it sags.
  for (const w of Object.keys(BLIPS) as Speaker[]) if (w !== 'vecna') assert.ok(BLIPS[w].dur < b.dur, `${w} is quicker than Vecna`);
  assert.ok(b.dur >= 0.1 && b.dur <= 0.15 && b.attack >= 0.008 && b.attack < b.dur / 4 && b.vol >= 0.1 && b.vol <= 0.3, 'timing and level');
  assert.ok(b.bend !== undefined && b.bend <= -2 && b.bend >= -3, 'it sags two semitones');
  // The crackle: pops of noise, in the blip, round the upper mids. Nobody else has one.
  const c = b.crackle!;
  assert.ok(c.at.length === 3 && c.at.every((f, i) => f > 0 && f < 1 && (i === 0 || f > c.at[i - 1])), 'three pops, inside the blip, in order');
  assert.ok(c.at.every((f) => f * b.dur + c.dur <= b.dur + 0.02) && c.dur >= 0.005 && c.dur <= 0.03, 'each short');
  assert.ok(c.freq >= 1200 && c.freq <= 2500 && c.vol > 0 && c.vol <= 1, 'round 1.8 kHz');
  for (const w of Object.keys(BLIPS) as Speaker[]) if (w !== 'vecna') assert.equal(BLIPS[w].crackle, undefined, `${w} does not crackle`);
  // The stand-in was a pulse on A sharp 2 with no crackle.
  assert.notDeepEqual({ ...b, crackle: undefined }, { wave: 'p12', midi: 46, spread: 1, dur: 0.12, vol: 0.26, attack: 0.01, bend: -2, crackle: undefined }, 'not the stand-in');
});

test("Vecna's blip reaches the synth as one falling pulse and three pops, at its volume and on its notes", () => {
  const b = BLIPS.vecna;
  const c = b.crackle!;
  for (const [pick, semis] of [[0, -b.spread], [0.5, 0], [0.999, b.spread]] as const) {
    const out = play(blipAt('vecna', pick));
    assert.deepEqual([out.tones.length, out.voices.length], [1, 1 + c.at.length], 'the voice and its pops');
    const [f0, f1] = out.tones[0].freq;
    assert.ok(Math.abs(Math.log2(f0 / hz(b.midi + semis))) < 15 / 1200, `starts on its note ${semis}`);
    assert.ok(Math.abs(f1 / f0 - 2 ** (b.bend! / 12)) < 1e-9, 'and ends two semitones under where it started');
    assert.ok(Math.abs(peakOf(out.voices[0]) - b.vol) < 1e-9, 'the voice peaks at its volume');
    for (const pop of out.voices.slice(1)) assert.ok(Math.abs(peakOf(pop) - c.vol) < 1e-9, 'and each pop at its own');
  }
  const wave = play(blipAt('vecna', 0.5)).tones[0].wave;
  assert.ok(Math.abs(wave.imag[8]) < 1e-6 && Math.abs(wave.real[8]) < 1e-6 && Math.hypot(wave.real[1], wave.imag[1]) > 0.4, 'a 12.5 percent pulse: no eighth harmonic, plenty of the first');
  // A speaker with no crackle makes one voice and spends no random number on it.
  assert.equal(play(blipAt('hopper', 0.5)).voices.length, 1);
  let spent = 0;
  play((ctx, dest) => playBlip(ctx, dest, 'hopper', 0, () => { spent++; return 0.5; }));
  assert.equal(spent, 2, 'a semitone and the cents');
});

test("Vecna's blip was set by how loud it sounds, like the others: A-weighted energy near their median, and the crackle is heard", async () => {
  const measure = async (who: Speaker, seed = 0.5): Promise<{ peak: number; db: number; mids: number }> => {
    const r = await renderWith(0.3, (ctx, g, t0) => blipAt(who, 0.5, seed)(ctx, g.sfx, t0));
    return { peak: r.metrics.peak, db: energyDb(r.samples), mids: share(r.samples, 1000, 3000) };
  };
  const vecna = await measure('vecna');
  assert.ok(Math.abs(vecna.peak - MEASURED_VECNA.peak) < 0.01 && Math.abs(vecna.peak - BLIPS.vecna.vol) < 0.03, `peak ${vecna.peak}`);
  assert.ok(Math.abs(vecna.db - MEASURED_VECNA.energyDb) < 0.3 && Math.abs(vecna.db - BLIP_MEDIAN_DB) <= 1.5, `${vecna.db.toFixed(2)} dB`);
  const others = await Promise.all(OTHERS.map(async (w) => (await measure(w)).db));
  assert.ok(vecna.db >= Math.min(...others) && vecna.db <= Math.max(...others), 'inside the range they span');
  // Wherever the crackle starts in the noise loop it stays near that, and no pop turns it into a click louder than a word.
  for (const seed of [0.1, 0.3, 0.7, 0.9]) {
    const m = await measure('vecna', seed);
    assert.ok(Math.abs(m.db - BLIP_MEDIAN_DB) <= 1.5 && m.peak < 0.45 && m.peak > 0.2, `seed ${seed}: ${m.db.toFixed(2)} dB, peak ${m.peak.toFixed(3)}`);
  }
  // Without the crackle the same blip is quieter to the ear and has less in the mids; with it, three times the mids of the growl.
  const saved = BLIPS.vecna.crackle;
  BLIPS.vecna.crackle = undefined;
  const bare = await measure('vecna');
  BLIPS.vecna.crackle = saved;
  assert.ok(vecna.db > bare.db + 0.8 && vecna.mids > 1.3 * bare.mids, `${vecna.db.toFixed(2)} dB against ${bare.db.toFixed(2)} without it`);
  const growl = await measure('billy');
  assert.ok(vecna.mids > 2 * growl.mids, `${vecna.mids.toFixed(3)} of it in the mids against Billy's ${growl.mids.toFixed(3)}`);
}, { timeout: 60000 });
