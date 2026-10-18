// What Audio made for chapter 4 (docs/level-10.md and docs/level-11.md): the Kamchatka track, the eight effects of stages 4.1 and
// 4.2, Eddie's speech blip and Hopper's and Eddie's stingers. They replace stand-ins, so these tests check that nothing is
// borrowed any more, that every number is in range, and that each sound is built the way its comment says.
// Peak and loudness need a rendered signal. The older audio tests recorded measurements taken in the browser; these render in Node,
// on the offline context in offline-audio.ts, through the same synth, sequencer and mix graph. That context reproduces Chrome's
// RMS to within 0.05 dB on Sour and Starcourt, their base peaks to within 6 percent, and the peaks of the effects made of tones
// (reach, scoop, babble, howl) to within 3 percent. A noise burst's peak depends on where in the noise loop it starts, and the
// game starts it somewhere else on every play, so an effect's level is the median peak over eight starts, not one render. The
// audio lab (?audio=1, E for an effect, R for a track) gives the same figures in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS1011, SFX1011 } from '../src/audio/sfx_level1011.ts';
import type { Sfx1011 } from '../src/audio/sfx_level1011.ts';
import { BLIPS, playBlip, playCue } from '../src/audio/cues.ts';
import { LIMITER } from '../src/audio/engine.ts';
import { renderOffline, renderWith } from '../src/audio/render.ts';
import { KAMCHATKA } from '../src/audio/tracks/kamchatka.ts';
import { MIRKWOOD } from '../src/audio/tracks/mirkwood.ts';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { STINGERS } from '../src/audio/tracks/jingles.ts';
import type { Cue } from '../src/audio/tracks/jingles.ts';
import { DRUM_SECONDS, note } from '../src/audio/tracks/theory.ts';
import { compile, findOverlaps, maxVoices } from '../src/audio/tracks/compile.ts';
import type { DrumEv, NoiseChannel, NoteEv, PitchedChannel, PitchedSlot, Track } from '../src/audio/tracks/types.ts';
import type { Ns, Recipe, Tn } from '../src/audio/sfx_kit.ts';
import type { SfxId, Speaker } from '../src/core/types.ts';
import { installOfflineAudio } from './offline-audio.ts';
import { bands, centroid, distance, energyDb, share } from './audio-analysis.ts';
import { peakOf, play } from './audio-helpers.ts';

installOfflineAudio();

// ---------------------------------------------------------------- Kamchatka

const K = KAMCHATKA;
const M = MIRKWOOD;
const pitched = (t: Track, slot: PitchedSlot, layer: string): PitchedChannel => {
  const c = t.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  assert.ok(c && c.slot !== 'noi', `${t.id} has a ${layer} ${slot} channel`);
  return c as PitchedChannel;
};
const noisy = (t: Track, layer: string): NoiseChannel => {
  const c = t.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  assert.ok(c, `${t.id} has a ${layer} noise channel`);
  return c as NoiseChannel;
};
/** 'bar:step:midi' for every note, and 'bar:step:drum' for every hit. */
const keys = (bars: readonly (readonly NoteEv[])[]): string[] => bars.flatMap((evs, bar) => evs.map((e) => `${bar}:${e.step}:${e.midi}`));
const hitKeys = (bars: readonly (readonly DrumEv[])[]): string[] => bars.flatMap((hs, bar) => hs.map((h) => `${bar}:${h.step}:${h.drum}`));
const subset = (small: readonly string[], big: readonly string[]): boolean => small.every((k) => big.includes(k));
const count = (bars: readonly (readonly unknown[])[]): number => bars.reduce((n, b) => n + b.length, 0);
const seconds = (t: Track): number => compile(t).loop * compile(t).stepSec;

test('Kamchatka is registered, is its own track, and is slower than Mirkwood, which it is not under another id', () => {
  assert.equal(TRACKS.kamchatka, K);
  assert.ok(TRACK_IDS.includes('kamchatka'));
  assert.deepEqual([K.id, K.title], ['kamchatka', 'Kamchatka']);
  assert.notEqual(K, M);
  assert.equal(new Set(Object.values(TRACKS)).size, TRACK_IDS.length, 'every track is its own');
  assert.notDeepEqual(K.channels, M.channels);
  for (const [slot, layer] of [['tri', 'base'], ['p1', 'base'], ['p2', 'combat'], ['p3', 'combat']] as const) {
    assert.notDeepEqual(pitched(K, slot, layer).inst, pitched(M, slot, layer).inst, `${layer} ${slot} is a new instrument`);
  }
  for (const [i, c] of K.channels.entries()) assert.notEqual(c.bars, M.channels[i].bars, `${c.layer} ${c.slot} bars are not Mirkwood's array`);
  for (const id of TRACK_IDS) if (id !== 'kamchatka') assert.notEqual(TRACKS[id].bpm, K.bpm, `${id} has another tempo`);
  assert.deepEqual([K.bpm, M.bpm], [60, 76]);
  assert.ok(Math.abs(seconds(K) - 128) < 1e-9 && Math.abs(seconds(M) - 101.05) < 0.01, 'a loop 27 seconds longer');
});

test('its layers are base and combat, 32 bars each, in the voices Mirkwood uses, and it stays inside five voices', () => {
  assert.deepEqual([...K.layers], ['base', 'combat']);
  assert.equal(K.bars, 32);
  assert.equal(K.channels.length, 6);
  for (const c of K.channels) assert.equal(c.bars.length, 32, `${c.layer} ${c.slot} has 32 bars`);
  const slots = (t: Track, layer: string): string[] => t.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots(K, 'base'), ['noi', 'p1', 'tri']);
  assert.deepEqual(slots(K, 'combat'), ['noi', 'p2', 'p3']);
  assert.deepEqual([slots(K, 'base'), slots(K, 'combat')], [slots(M, 'base'), slots(M, 'combat')]);
  assert.deepEqual(findOverlaps(K), []);
  assert.ok(maxVoices(K) <= 5 && maxVoices(K, ['base']) <= 5 && maxVoices(K, ['combat']) <= 5);
});

test("it is Mirkwood's key and harmony, and every note is one of Mirkwood's", () => {
  assert.deepEqual([K.tonic, K.mode, K.bars], [M.tonic, M.mode, M.bars]);
  assert.deepEqual([...K.chromatic], [8], 'G sharp, the leading tone of the closing E, is the one exception');
  assert.deepEqual([...K.harmony], [...M.harmony]);
  // The bells: the same bar, step and note, with a third let go and every G sharp kept.
  const bells = pitched(K, 'p1', 'base').bars;
  const was = pitched(M, 'p1', 'base').bars;
  assert.ok(subset(keys(bells), keys(was)), "every bell is one of Mirkwood's");
  assert.deepEqual([count(was), count(bells)], [48, 33]);
  const sharps = (bars: readonly (readonly NoteEv[])[]): number => bars.flat().filter((e) => e.midi % 12 === 8).length;
  assert.equal(sharps(bells), sharps(was));
  // The drone: the same notes an octave up, on the same steps and as long.
  pitched(K, 'tri', 'base').bars.forEach((evs, bar) => evs.forEach((e, i) => {
    const w = pitched(M, 'tri', 'base').bars[bar][i];
    assert.deepEqual([e.step, e.len, e.midi], [w.step, w.len, w.midi + 12], `drone bar ${bar + 1}`);
  }));
  // The combat bass is Mirkwood's an octave up, and the stabs keep Mirkwood's notes. Both drop some. The drums and the ticks are Mirkwood's hits.
  assert.ok(subset(keys(pitched(K, 'p2', 'combat').bars), keys(pitched(M, 'p2', 'combat').bars.map((bar) => bar.map((e) => ({ ...e, midi: e.midi + 12 }))))));
  assert.ok(subset(keys(pitched(K, 'p3', 'combat').bars), keys(pitched(M, 'p3', 'combat').bars)));
  assert.ok(subset(hitKeys(noisy(K, 'base').bars.map((hs) => hs.filter((h) => h.drum !== 'wind'))), hitKeys(noisy(M, 'base').bars)));
  assert.ok(subset(hitKeys(noisy(K, 'combat').bars), hitKeys(noisy(M, 'combat').bars)));
});

test('it is thinner: fewer bells, a drone and a bass an octave up, a bass on the beats only and half the stabs', () => {
  assert.ok(count(pitched(K, 'p1', 'base').bars) >= (2 / 3) * count(pitched(M, 'p1', 'base').bars), 'a third of the bells, not most');
  const low = (t: Track, slot: PitchedSlot, layer: string): number => Math.min(...pitched(t, slot, layer).bars.flat().map((e) => e.midi));
  assert.ok(low(K, 'tri', 'base') >= low(M, 'tri', 'base') + 12 && low(K, 'tri', 'base') >= 55, `the lowest drone note is ${low(K, 'tri', 'base')}`);
  assert.ok(low(K, 'p2', 'combat') >= low(M, 'p2', 'combat') + 12 && low(K, 'p2', 'combat') >= 45, `and the lowest bass note ${low(K, 'p2', 'combat')}`);
  pitched(K, 'p2', 'combat').bars.forEach((evs, bar) => {
    assert.deepEqual(evs.map((e) => e.step), [0, 4, 8, 12], `bar ${bar + 1}: the four beats`);
    assert.equal(pitched(M, 'p2', 'combat').bars[bar].length, 8);
  });
  pitched(K, 'p3', 'combat').bars.forEach((evs, bar) => {
    assert.deepEqual(evs.map((e) => e.step), [6, 14], `bar ${bar + 1}: two off-beats`);
    assert.equal(pitched(M, 'p3', 'combat').bars[bar].length, 4);
  });
  assert.ok(compile(K).notes.length < 0.7 * compile(M).notes.length, `${compile(K).notes.length} notes against ${compile(M).notes.length}`);
});

test('it is colder: thin bells, a drone with no vibrato, and a longer, brighter echo', () => {
  const bell = pitched(K, 'p1', 'base').inst;
  const was = pitched(M, 'p1', 'base').inst;
  assert.deepEqual([bell.wave, was.wave], ['p12', 'p25'], 'the bells go from the 25 to the 12.5 percent pulse');
  assert.ok((bell.send ?? 0) > (was.send ?? 0), 'and sing into the echo harder');
  assert.ok((pitched(K, 'p3', 'combat').inst.send ?? 0) > (pitched(M, 'p3', 'combat').inst.send ?? 0), 'as do the stabs');
  assert.equal(pitched(K, 'tri', 'base').inst.vib, undefined, 'the drone is still');
  assert.ok(pitched(M, 'tri', 'base').inst.vib, "where Mirkwood's breathes");
  const echo = (t: Track): number => (t.echo!.beats * 60) / t.bpm;
  assert.ok(echo(K) >= 1 && echo(K) > 1.5 * echo(M), `${echo(K)} s of echo against ${echo(M).toFixed(2)}`);
  assert.ok(K.echo!.cutoff > M.echo!.cutoff && K.echo!.feedback > M.echo!.feedback);
});

test('it has wind: a gust takes the first half of every second bar, and nothing on the noise voice starts under it', () => {
  const gust = DRUM_SECONDS.wind / compile(K).stepSec;
  assert.ok(Math.abs(gust - 6.8) < 1e-9, 'the gust is 6.8 steps at this tempo');
  const gusts = noisy(K, 'base').bars.map((hs) => hs.filter((h) => h.drum === 'wind'));
  gusts.forEach((g, bar) => assert.deepEqual(g.map((h) => h.step), bar % 2 === 0 ? [0] : [], `bar ${bar + 1}`));
  const strengths = new Set(gusts.flat().map((g) => g.vel));
  assert.ok(strengths.size >= 3 && Math.max(...strengths) === 1 && Math.min(...strengths) >= 0.5, 'some gusts are stronger than others');
  for (const layer of ['base', 'combat']) {
    noisy(K, layer).bars.forEach((hs, bar) => {
      for (const h of hs) if (h.drum !== 'wind' && bar % 2 === 0) assert.ok(h.step >= 8, `${layer} bar ${bar + 1} ${h.drum} at ${h.step}`);
    });
  }
  // The ticks keep Mirkwood's steps where the wind leaves room, at four-fifths of the level. The combat drums are Mirkwood's minus what the gust stands on.
  noisy(M, 'base').bars.forEach((ticks, bar) => {
    const want = bar % 2 === 0 ? ticks.filter((h) => h.step >= 8) : ticks;
    const now = noisy(K, 'base').bars[bar].filter((h) => h.drum !== 'wind');
    assert.deepEqual(now.map((h) => [h.step, h.drum, h.vel]), want.map((h) => [h.step, h.drum, (h.vel ?? 1) * 0.8]), `bar ${bar + 1} ticks`);
  });
  noisy(M, 'combat').bars.forEach((drums, bar) => {
    const want = bar % 2 === 0 ? drums.filter((h) => h.step >= 8) : drums;
    assert.deepEqual(noisy(K, 'combat').bars[bar], want, `bar ${bar + 1} drums`);
  });
});

/**
 * Peak after the limiter, the largest gain reduction and loudness of one loop and the first seconds of the next, base alone and
 * with the combat mix. The other tracks, rendered the same way: base peaks 0.46 to 0.70 at -16.2 to -18.5 dB, combat peaks 0.67 to
 * 0.76 at -16.9 to -18.3 dB. Kamchatka is the thin one and sits at the quiet end.
 */
test('base and combat render without clipping, with the limiter idle, and as loud as the other tracks', async () => {
  const base = await renderOffline('kamchatka', 134);
  const combat = await renderOffline('kamchatka', 134, { combat: true });
  for (const [name, m] of [['base', base], ['combat', combat]] as const) {
    assert.ok(m.peak < 0.9 && m.limiterDb < 3 && m.clipped === 0, `${name}: peak ${m.peak}, limiter ${m.limiterDb}, clipped ${m.clipped}`);
    assert.ok(Math.abs(m.seconds - 134) < 1e-3);
  }
  assert.ok(base.peak >= 0.4 && base.peak <= 0.75, `base peak ${base.peak}`);
  assert.ok(combat.peak >= 0.6 && combat.peak <= 0.82 && combat.peak > base.peak, `combat peak ${combat.peak}`);
  assert.ok(base.rmsDb >= -18.6 && base.rmsDb <= -16.2, `base ${base.rmsDb} dB`);
  assert.ok(combat.rmsDb >= -19 && combat.rmsDb <= -16.5, `combat ${combat.rmsDb} dB`);
  const mirkwood = await renderOffline('mirkwood', 106);
  assert.ok(Math.abs(base.rmsDb - mirkwood.rmsDb) < 1.5, `${base.rmsDb} dB against Mirkwood's ${mirkwood.rmsDb}`);
}, { timeout: 60000 });

// ---------------------------------------------------------------- the eight effects

const NEW = ['haymaker', 'vswing', 'riff', 'feedback', 'chime', 'curse', 'walkman', 'ghoul'] as const;
/** The peak after the limiter each should have, median over eight starts. Impacts near 0.5, interface sounds near 0.3. */
const TARGET: Record<Sfx1011, number> = { haymaker: 0.5, vswing: 0.42, riff: 0.2, feedback: 0.3, chime: 0.35, curse: 0.4, walkman: 0.3, ghoul: 0.38 };

const toneParts = (r: Recipe): Tn[] => r.parts.filter((p): p is Tn => p.k === 't');
const noiseParts = (r: Recipe): Ns[] => r.parts.filter((p): p is Ns => p.k === 'n');
const tones = (id: Sfx1011): Tn[] => toneParts(SFX1011[id]);
const noises = (id: Sfx1011): Ns[] => noiseParts(SFX1011[id]);
const lengthOf = (r: Recipe): number => Math.max(...r.parts.map((p) => p.at + p.d));
const lowest = (id: Sfx1011): number => Math.min(...tones(id).map((t) => Math.min(t.f, t.f2 ?? t.f)));
const highest = (id: Sfx1011): number => Math.max(...tones(id).map((t) => Math.max(t.f, t.f2 ?? t.f)));
const cornerOf = (r: Recipe): number => Math.max(0, ...noiseParts(r).map((n) => Math.max(n.f?.freq ?? 0, n.f?.freqEnd ?? 0)));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
};

/** One effect alone through the mix graph. `shift` moves its start, which moves where its noise starts in the loop. */
const renderSfx = (id: SfxId, shift = 0) => renderWith(lengthOf(SFX[id]) + 0.15, (ctx, g, t0) => playSfx(ctx, g.sfx, id, t0 + shift));
const samplesOf = async (id: SfxId): Promise<Float32Array> => (await renderSfx(id)).samples;

test('the eight effects are registered, each with its own recipe, and none shares a part with any other sound', () => {
  assert.deepEqual(Object.keys(SFX1011).sort(), [...NEW].sort());
  assert.deepEqual(Object.keys(LEVELS1011).sort(), [...NEW].sort());
  for (const id of NEW) {
    assert.equal(SFX[id], SFX1011[id], `${id} is the one the game plays`);
    assert.ok(SFX1011[id].parts.length >= 4, `${id} is built from parts, not a stub`);
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
  const span: Record<Sfx1011, [number, number]> = {
    haymaker: [0.35, 0.45], vswing: [0.55, 0.7], riff: [0.1, 0.2], feedback: [0.55, 0.65], chime: [1.5, 1.9],
    curse: [1, 1.2], walkman: [0.6, 0.8], ghoul: [0.5, 0.6],
  };
  for (const id of NEW) {
    const r = SFX1011[id];
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
  // Haymaker lands where Hopper's fist does (frame 10 of 22 at 60 fps) and the Flying V where Eddie's guitar does (frame 8 of 18).
  const lands = (id: Sfx1011): number => Math.min(...tones(id).filter((t) => t.v >= 0.3 && t.at > 0).map((t) => t.at));
  assert.ok(Math.abs(lands('haymaker') - 10 / 60) < 0.015 && Math.abs(lands('vswing') - 8 / 60) < 0.015);
});

// ---------------------------------------------------------------- levels

test('every effect renders: not silent, not broken, and gone when its recipe ends', async () => {
  for (const id of NEW) {
    const r = await renderSfx(id);
    assert.ok(r.samples.every(Number.isFinite), `${id} has no NaN`);
    assert.ok(r.metrics.peak > 0.1 && r.metrics.clipped === 0, `${id} peak ${r.metrics.peak}`);
    const tail = r.samples.slice(Math.round((lengthOf(SFX1011[id]) + 0.05) * 44100));
    assert.ok(Math.max(...tail.map(Math.abs)) < 0.01, `${id} is gone when its recipe ends`);
  }
}, { timeout: 60000 });

test('levels are measured: each effect peaks where it should, with the limiter idle', async () => {
  const limiter = 10 ** (LIMITER.threshold / 20);
  for (const id of NEW) {
    assert.ok(LEVELS1011[id] > 0.1 && LEVELS1011[id] <= 1, `${id} level ${LEVELS1011[id]}`);
    // Effects with no noise part sound the same wherever they start.
    const shifts = noises(id).length ? [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * 0.00137) : [0];
    const runs = await Promise.all(shifts.map((s) => renderSfx(id, s)));
    const peak = median(runs.map((r) => r.metrics.peak));
    assert.ok(Math.abs(peak - TARGET[id]) <= 0.025, `${id} peaks at ${peak.toFixed(3)}, wanted ${TARGET[id]}`);
    assert.ok(Math.max(...runs.map((r) => r.metrics.peak)) < limiter * 0.8, `${id} stays well under the limiter (${limiter.toFixed(2)})`);
    assert.ok(Math.max(...runs.map((r) => r.metrics.limiterDb)) < 0.01, `${id} leaves the limiter alone`);
  }
  assert.ok(TARGET.haymaker >= 0.45 && TARGET.vswing >= 0.4, 'the two blows are impacts');
  assert.equal(Math.min(...NEW.map((id) => TARGET[id])), TARGET.riff, 'riff is the quietest of the eight');
}, { timeout: 60000 });

test('what the game plays is what was measured: the level in the mix is LEVELS1011 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    const ps = SFX1011[id].parts;
    assert.equal(out.voices.length, ps.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...ps.map((p) => p.v)) * LEVELS1011[id]) < 1e-9 && top < 0.5, `${id} plays at its level`);
  }
});

test('riff sits well under the music and will not tire the ear: quiet, short, soft and dark, a chord that stays in tune', async () => {
  const r = await renderSfx('riff');
  assert.ok(r.metrics.peak <= 0.21, `peak ${r.metrics.peak}`);
  const music = await renderOffline('hawkins', 20);
  assert.ok(music.peak > 2 * r.metrics.peak, `the music peaks at ${music.peak}, more than twice the stab`);
  // It decays inside a tenth of a second, so twelve stabs in six seconds are under a third of the time.
  const loud = r.samples.reduce((last, v, i) => (Math.abs(v) > r.metrics.peak * 0.1 ? i : last), 0) / 44100;
  assert.ok(loud <= 0.16 && loud / 0.5 <= 0.35, `it lasts ${loud.toFixed(3)} s of every half second`);
  assert.equal(noises('riff').length, 0, 'no noise');
  assert.ok(share(r.samples, 1440, 22050) <= 0.08, 'almost nothing where the ear is sharpest');
  assert.ok(SFX1011.riff.j <= 0.03 && tones('riff').every((t) => t.f2 === undefined), 'it moves a little between plays, the chord as one, with no glide');
  const fs = tones('riff').map((t) => t.f).sort((a, b) => a - b);
  assert.ok(Math.abs(fs[1] / fs[0] - 2) < 0.01 && Math.abs(fs[2] / fs[1] - 1.5) < 0.01 && Math.abs(fs[3] / fs[2] - 4 / 3) < 0.01, `A, A, E, A: ${fs}`);
}, { timeout: 60000 });

// ---------------------------------------------------------------- each in its own part of the spectrum

test('each sits in its own part of the spectrum', async () => {
  const s = Object.fromEntries(await Promise.all(NEW.map(async (id) => [id, await samplesOf(id)]))) as Record<Sfx1011, Float32Array>;
  const [slam, bash, swing, reach] = await Promise.all((['slam', 'bash', 'swing', 'reach'] as const).map(samplesOf));
  // haymaker: the low-mid body blow. Nothing under 60 Hz (slam, bash and thud own the sub bass), nothing above 1.5 kHz in the recipe.
  assert.ok(lowest('haymaker') >= 60 && cornerOf(SFX1011.haymaker) <= 1500);
  assert.ok(share(s.haymaker, 90, 1440) >= 0.8 && share(s.haymaker, 2880, 22050) <= 0.02, 'in the low mids');
  assert.ok(centroid(slam) < centroid(s.haymaker) && centroid(s.haymaker) < centroid(bash), 'between slam and bash');
  assert.ok(share(bash, 1440, 22050) > 2 * share(s.haymaker, 1440, 22050), 'bash has the hiss that haymaker lacks');
  // vswing: a chord in it, 160 to 400 Hz under a whoosh, which swing has none of and bash little.
  assert.ok(tones('vswing').filter((t) => t.v >= 0.25).every((t) => t.f >= 150 && t.f <= 400));
  assert.ok(share(s.vswing, 160, 720) >= 0.7 && share(swing, 160, 720) < 0.1 && share(bash, 160, 720) < 0.4, 'the chord is most of what you hear');
  assert.ok(noises('vswing').some((n) => n.f?.type === 'bandpass' && n.rise !== undefined && n.f.freqEnd! > n.f.freq), 'and the whoosh climbs');
  // feedback: the highest held tone, three of them from 600 Hz to 3.8 kHz. Beam stops at 1.8 kHz and shakes at 20 Hz; this wavers at 6.5.
  const held = tones('feedback').filter((t) => t.hold);
  assert.ok(held.length === 3 && Math.min(...held.map((t) => t.f)) >= 600 && highest('feedback') >= 3500);
  assert.ok(share(s.feedback, 1200, 5760) >= 0.5 && centroid(s.feedback) > 2000);
  assert.ok(Math.max(...toneParts(SFX.beam).map((t) => t.f2 ?? t.f)) <= 1800 && highest('feedback') > 2 * 1800);
  const waver = tones('feedback').find((t) => t.vib)!.vib!;
  assert.ok(waver.rate < 8 && waver.cents >= 50);
  // chime: the lowest ring. Under 420 Hz, more than a second long, and two primes a few hertz apart: they beat, a little wrong.
  assert.ok(highest('chime') <= 420 && lowest('chime') >= 90 && tones('chime').filter((t) => t.d >= 1).length >= 4);
  assert.ok(share(s.chime, 0, 420) >= 0.95 && centroid(s.chime) < centroid(reach) / 2, 'lower than reach');
  const primes = tones('chime').filter((t) => t.f >= 190 && t.f <= 205).sort((a, b) => a.f - b.f);
  assert.ok(primes.length === 2 && primes[1].f - primes[0].f >= 3 && primes[1].f - primes[0].f <= 8);
  // curse: everything under 1 kHz and everything climbs, where growl and logPush fall or hold.
  assert.ok(highest('curse') <= 300 && cornerOf(SFX1011.curse) <= 1000);
  assert.ok(share(s.curse, 90, 1000) >= 0.7 && share(s.curse, 1000, 22050) <= 0.06, 'a low whoosh with nothing sharp in it');
  assert.ok(tones('curse').every((t) => t.f2! > t.f * 2.5) && noises('curse').every((n) => n.f!.type === 'lowpass' && n.f!.freqEnd! > n.f!.freq && n.rise! >= 0.5));
  for (const id of ['growl', 'logPush'] as const) assert.ok(toneParts(SFX[id]).every((t) => (t.f2 ?? t.f) <= t.f), `${id} falls or holds`);
  // walkman: a clunk below 700 Hz, then four bright notes, 1.2 to 2.2 kHz, over an octave sparkle, with the wobble of a tape.
  const notes = tones('walkman').filter((t) => t.f >= 1000 && t.at > 0.1).sort((a, b) => a.at - b.at);
  assert.ok(notes.length === 5 && notes[0].f >= 1100 && Math.max(...notes.map((t) => t.f)) <= 2300 && notes.filter((t) => t.vib).length >= 3);
  const clunk = noises('walkman').find((n) => n.at === 0)!;
  assert.ok(clunk.m === 7 && clunk.f!.freq <= 700 && clunk.d <= 0.05 && share(s.walkman, 1000, 5760) >= 0.6);
  // ghoul: it falls. Every voice glides down, as does the hiss, which feedback, beam and spotted (a rising pair of pings) never do.
  assert.ok(tones('ghoul').every((t) => t.f2! < t.f) && noises('ghoul').filter((n) => n.d > 0.1).every((n) => n.f!.freqEnd! < n.f!.freq));
  assert.ok(share(s.ghoul, 500, 1500) >= 0.6 && share(s.ghoul, 1500, 22050) >= 0.2, 'a shriek with glass over it');
  assert.ok(toneParts(SFX.spotted).some((t) => t.f > toneParts(SFX.spotted)[0].f));
  // No two of the eight read alike: their octave-band spectra are at least a fifth of the way apart.
  for (const [i, a] of NEW.entries()) {
    for (const b of NEW.slice(i + 1)) assert.ok(distance(bands(s[a]), bands(s[b])) >= 0.2, `${a} and ${b}: ${distance(bands(s[a]), bands(s[b])).toFixed(2)}`);
  }
}, { timeout: 60000 });

// ---------------------------------------------------------------- Eddie's blip

const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
const range = (w: Speaker): [number, number] => [BLIPS[w].midi - BLIPS[w].spread, BLIPS[w].midi + BLIPS[w].spread];
/** Plays a blip with the first random number picking the semitone and the second the cents. */
const blipAt = (who: Speaker, pick: number) => (ctx: BaseAudioContext, dest: AudioNode, t = 0): void => {
  let k = 0;
  playBlip(ctx, dest, who, t, () => (k++ === 0 ? pick : 0.5));
};
/** The blips whose loudness the other tests recorded: A-weighted energy 8.4 to 11.9 dB, median 9.6. Eddie's, at the centre of its range. */
const OTHERS = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy', 'erica', 'billy'] as const;
const BLIP_MEDIAN_DB = 9.6;
const MEASURED_EDDIE = { peak: 0.189, energyDb: 9.7 };

test("Eddie's blip is a clean 25 percent pulse that trembles, unlike every other voice", () => {
  const b = BLIPS.eddie;
  assert.equal(b.wave, 'p25', 'a pulse');
  assert.ok(b.vibrato && b.vibrato.rate >= 8 && b.vibrato.rate <= 20 && b.vibrato.cents >= 100 && b.vibrato.delay === 0, 'with a warble deep enough to hear in a blip');
  assert.ok(b.rough === undefined && b.bend === undefined, "not Billy's growl, and it does not droop or lean");
  for (const w of Object.keys(BLIPS) as Speaker[]) if (w !== 'eddie') assert.equal(BLIPS[w].vibrato, undefined, `${w} has no warble`);
  assert.ok(BLIPS.billy.rough!.rate > 2 * b.vibrato!.rate, "Billy's roughness is a growl, three times as fast");
  const [lo, hi] = range('eddie');
  assert.ok(lo >= 24 && hi <= 96 && b.spread >= 1 && b.spread <= 4, `${lo} to ${hi}`);
  assert.ok(b.dur >= 0.06 && b.dur <= 0.1 && b.attack > 0 && b.attack < b.dur / 2 && b.vol >= 0.1 && b.vol <= 0.3, 'timing and level');
  assert.ok(b.dur > BLIPS.mike.dur && b.dur > BLIPS.max.dur, 'long enough for the warble to turn over');
  assert.ok(b.midi > BLIPS.steve.midi && b.midi < BLIPS.max.midi, 'between Steve and Max');
  for (const w of Object.keys(BLIPS) as Speaker[]) {
    if (w !== 'eddie') assert.ok(!(BLIPS[w].wave === b.wave && range(w)[0] <= hi && range(w)[1] >= lo), `${w} is the same pulse on the same notes`);
  }
  assert.notDeepEqual({ ...b, vibrato: undefined }, { wave: 'p25', midi: 62, spread: 3, dur: 0.05, vol: 0.2, attack: 0.003, vibrato: undefined }, 'not the stand-in');
});

test("Eddie's blip reaches the synth as a pulse with a vibrato on it, at its volume and on its notes", () => {
  const b = BLIPS.eddie;
  for (const [pick, semis] of [[0, -b.spread], [0.999, b.spread]] as const) {
    const made: { frequency: { value: number } }[] = [];
    const out = play((ctx, dest) => {
      const make = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = () => { const o = make(); made.push(o as unknown as { frequency: { value: number } }); return o; };
      blipAt('eddie', pick)(ctx, dest);
    });
    assert.deepEqual([out.tones.length, out.voices.length, made.length], [1, 1, 2], 'the voice and the low oscillator that bends its pitch');
    assert.equal(made[1].frequency.value, b.vibrato!.rate, 'at the vibrato rate');
    assert.equal(out.tones[0].freq.length, 1, 'no glide: the warble is the only movement');
    assert.ok(Math.abs(Math.log2(out.tones[0].freq[0] / hz(b.midi + semis))) < 15 / 1200, `starts on its note ${semis}`);
    assert.ok(Math.abs(peakOf(out.voices[0]) - b.vol) < 1e-9, 'peaks at its volume');
  }
  const wave = play(blipAt('eddie', 0.5)).tones[0].wave;
  assert.ok(Math.abs(wave.imag[4]) < 1e-6 && Math.abs(wave.real[4]) < 1e-6 && Math.abs(wave.imag[1]) > 0.2, 'a 25 percent pulse: no fourth harmonic, plenty of the first');
});

test("Eddie's blip was set by how loud it sounds, like the others: A-weighted energy near their median", async () => {
  const energy = async (who: Speaker): Promise<{ peak: number; db: number }> => {
    const r = await renderWith(0.3, (ctx, g, t0) => blipAt(who, 0.5)(ctx, g.sfx, t0));
    return { peak: r.metrics.peak, db: energyDb(r.samples) };
  };
  const eddie = await energy('eddie');
  assert.ok(Math.abs(eddie.peak - MEASURED_EDDIE.peak) < 0.01 && Math.abs(eddie.peak - BLIPS.eddie.vol) < 0.015, `peak ${eddie.peak}`);
  assert.ok(Math.abs(eddie.db - MEASURED_EDDIE.energyDb) < 0.3 && Math.abs(eddie.db - BLIP_MEDIAN_DB) <= 1.5, `${eddie.db.toFixed(2)} dB`);
  const others = await Promise.all(OTHERS.map(async (w) => (await energy(w)).db));
  assert.ok(Math.abs(median(others) - BLIP_MEDIAN_DB) < 0.2, `the median of the others is ${median(others).toFixed(2)}`);
  assert.ok(eddie.db >= Math.min(...others) && eddie.db <= Math.max(...others), 'inside the range they span');
});

// ---------------------------------------------------------------- the stingers

const HEROES = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy'] as const;
const shape = (c: Cue): string => JSON.stringify(c.notes.map((n) => [n.w, n.midi]));

test("Hopper's and Eddie's stingers are two to four melody notes, in range, short, and unlike every other", () => {
  for (const h of ['hopper', 'eddie'] as const) {
    const c = STINGERS[h];
    // Hopper's thin octave shimmer and Eddie's bass are colour under the tune, as Mike's bass is under his.
    const tune = c.notes.filter((n) => n.w !== (h === 'hopper' ? 'p12' : 'tri'));
    assert.ok(tune.length >= 2 && tune.length <= 4, `${h} has ${tune.length} melody notes`);
    assert.ok(c.length > 0.3 && c.length < 1.1, `${h} runs ${c.length.toFixed(2)} s: a tag-in stays short`);
    assert.ok(c.duck > 0 && c.duck <= c.length && c.duckDb >= 3 && c.duckDb <= 9, `${h} ducks the music`);
    assert.ok(c.gain >= 0.5 && c.gain <= 2, `${h} gain ${c.gain}`);
    for (const n of c.notes) {
      assert.ok(Math.min(n.midi, n.to ?? n.midi) >= 36 && Math.max(n.midi, n.to ?? n.midi) <= 96, `${h} note ${n.midi}`);
      assert.ok(n.at >= 0 && n.dur > 0 && n.vol > 0 && n.vol <= 0.35 && n.at + n.dur <= c.length, `${h} note timing and volume`);
    }
    for (const other of [...HEROES, 'scare', h === 'hopper' ? 'eddie' : 'hopper'] as const) {
      assert.notEqual(shape(STINGERS[other]), shape(c), `${h} is not ${other}`);
      if (other !== 'scare') assert.notEqual(STINGERS[other].notes[0].midi, c.notes[0].midi, `${h} does not start where ${other} starts`);
    }
  }
  assert.equal(new Set([...HEROES, 'hopper', 'eddie'].map((h) => STINGERS[h as keyof typeof STINGERS])).size, 11);
  // The stand-ins were two triangle notes, C3 then G2, and a square run E3, G3, A3.
  assert.notDeepEqual(STINGERS.hopper.notes.map((n) => n.midi), [note('C3'), note('G2')]);
  assert.notDeepEqual(STINGERS.eddie.notes.map((n) => n.midi), [note('E3'), note('G3'), note('A3')]);
});

test('Hopper walks in low and goes soft: two heavy steps up the A minor triad, a held triangle, a boot under the first', () => {
  const c = STINGERS.hopper;
  const [a, b, third] = c.notes;
  assert.deepEqual([a.w, b.w, third.w], ['p50', 'p50', 'tri'], 'a low square, then a soft triangle');
  assert.deepEqual([a.midi, b.midi, third.midi], [note('A2'), note('C3'), note('E3')], 'the minor triad, from the note of his voice');
  assert.equal(a.midi, BLIPS.hopper.midi);
  assert.ok(Math.max(...c.notes.filter((n) => n.w !== 'p12').map((n) => n.midi)) < note('D4'), 'nothing high');
  assert.ok(third.vib && third.dur > 1.5 * b.dur, 'the last is held and wobbles');
  assert.ok(c.notes.some((n) => n.w === 'p12' && n.ring && n.midi === third.midi + 12), 'with a thin octave shimmer over it');
  assert.equal(c.hits.length, 1);
  assert.ok(c.hits[0].at === 0 && c.hits[0].filter === 'lowpass' && c.hits[0].freq <= 400 && c.hits[0].freqEnd! < c.hits[0].freq, 'a boot in snow: a thud of lowpassed noise');
});

test('Eddie climbs the A minor pentatonic on the pulse, and the last note bends up and wails, over a scrape and a low A', () => {
  const c = STINGERS.eddie;
  const lead = c.notes.filter((n) => n.w === 'p25');
  assert.deepEqual(lead.map((n) => n.midi), [note('A4'), note('C5'), note('D5'), note('E5')], 'a lick up the pentatonic');
  assert.ok(lead.every((n, i) => !i || (n.at > lead[i - 1].at && n.midi > lead[i - 1].midi)), 'it only climbs');
  assert.equal(lead[3].to, note('G5'), 'the last note bends up a tone');
  assert.ok(lead[3].vib && lead[3].dur > 3 * lead[2].dur && lead.every((n) => !n.ring), 'and wails, held and not plucked');
  const bass = c.notes.find((n) => n.w === 'tri')!;
  assert.ok(bass.midi === note('A2') && bass.dur >= lead[3].at + lead[3].dur - 0.05, 'a low A under the whole lick');
  assert.ok(c.hits.length === 1 && c.hits[0].at === 0 && c.hits[0].filter === 'highpass' && c.hits[0].dur <= 0.05, 'a pick scrape on the first note');
});

test('the stingers were measured: both peak and carry their weight with the rest of the tag-ins', async () => {
  const cue = async (h: keyof typeof STINGERS) => {
    const r = await renderWith(STINGERS[h].length + 0.3, (ctx, g, t0) => playCue(ctx, g.sfx, STINGERS[h], t0));
    return { peak: r.metrics.peak, db: energyDb(r.samples), limiterDb: r.metrics.limiterDb };
  };
  for (const h of ['hopper', 'eddie'] as const) {
    const m = await cue(h);
    assert.ok(m.peak >= 0.35 && m.peak <= 0.55, `${h} peaks at ${m.peak.toFixed(3)}, between Will's 0.38 and Mike's 0.50`);
    assert.ok(m.db >= 23 && m.db <= 27 && m.limiterDb < 0.01, `${h} carries ${m.db.toFixed(2)} dB, with Mike's 24.1 and Steve's 26`);
    const out = play((ctx, dest) => playCue(ctx, dest, STINGERS[h], 0));
    assert.equal(out.voices.length, STINGERS[h].notes.length + STINGERS[h].hits.length, `${h} makes one voice per note and hit`);
    assert.equal(out.tones.length, STINGERS[h].notes.length);
    for (const v of out.voices) assert.ok(peakOf(v) <= 0.35 * STINGERS[h].gain + 1e-9, `${h} no voice is loud on its own`);
  }
  // The same render reads four stingers measured in the browser (Mike 24.1 dB, Steve 26, Robin 25.3, Nancy 25.7) to within 0.1 dB.
  for (const [h, db] of [['mike', 24.1], ['steve', 26], ['robin', 25.3], ['nancy', 25.7]] as const) {
    assert.ok(Math.abs((await cue(h)).db - db) < 0.1, h);
  }
}, { timeout: 60000 });
