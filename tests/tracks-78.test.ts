// The ten effects made for Levels 7 and 8 (stages 3.1 and 3.2): pistol, shotgun, scoop, babble, rifle, melt, grab,
// decode, stash and buy. They replace stand-ins that borrowed Level 3 and 4 effects, so these tests check that nothing
// is borrowed any more, that every number is in range, and that each sound is built the way its design says. Nobody
// listens to these in a test, so the rest is proof from numbers. The stingers and blips are in tracks-78-voices.test.ts.
// Peak and clipping need a rendered signal, which Node can't make. They were measured with an offline render in the
// browser (renderWith in render.ts) and are recorded below next to a fingerprint of the recipe that was measured. If a
// recipe changes, its fingerprint stops matching and the test says to measure it again. The stub context in
// audio-helpers.ts plays the real code and checks the level that comes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS78, SFX78 } from '../src/audio/sfx_levels78.ts';
import type { Sfx78 } from '../src/audio/sfx_levels78.ts';
import { SFX34 } from '../src/audio/sfx_levels34.ts';
import { LIMITER } from '../src/audio/engine.ts';
import { BLIPS } from '../src/audio/cues.ts';
import { midiToHz } from '../src/audio/dsp.ts';
import type { Ns, Part, Tn } from '../src/audio/sfx_kit.ts';
import { play, peakOf, print } from './audio-helpers.ts';

const NEW = ['pistol', 'shotgun', 'scoop', 'babble', 'rifle', 'melt', 'grab', 'decode', 'stash', 'buy'] as const;
/** The Level 3 and 4 effect each one stood in for. */
const STAND_INS: Record<Sfx78, keyof typeof SFX34> = {
  pistol: 'chomp', shotgun: 'thud', scoop: 'acid', babble: 'petals', rifle: 'chomp',
  melt: 'acid', grab: 'lunge', decode: 'reveal', stash: 'reveal', buy: 'reveal',
};

// ---------------------------------------------------------------- what the offline renders said

/**
 * unit: the largest sample before the limiter with the effect alone at gain 1. peak: the largest sample after the
 * limiter at LEVELS78 (limiter reduction 0 dB and nothing clipped in every one). Targets: impacts near 0.5 and the
 * shotgun, the biggest, a little above; the rifle, which plays three times in a row, well under; the pitched and
 * interface sounds from 0.3 to 0.4.
 */
const MEASURED: Record<Sfx78, { print: string; unit: number; peak: number; target: number }> = {
  pistol: { print: 'c189463d', unit: 1.8384, peak: 0.5, target: 0.5 },
  shotgun: { print: '7e203223', unit: 2.0128, peak: 0.5998, target: 0.6 },
  scoop: { print: 'ede0da40', unit: 0.4553, peak: 0.3, target: 0.3 },
  babble: { print: '38a8972c', unit: 0.6598, peak: 0.3002, target: 0.3 },
  rifle: { print: '3affca47', unit: 0.8895, peak: 0.38, target: 0.38 },
  melt: { print: '394aba02', unit: 0.8768, peak: 0.42, target: 0.42 },
  grab: { print: 'a56e9bcb', unit: 0.6979, peak: 0.4501, target: 0.45 },
  decode: { print: 'f32f26d8', unit: 1.1711, peak: 0.3501, target: 0.35 },
  stash: { print: 'a367dec6', unit: 1.1645, peak: 0.36, target: 0.36 },
  buy: { print: 'd5ca8110', unit: 1.3426, peak: 0.4, target: 0.4 },
};
/** Three rifle rounds 0.12 s apart: the burst's peak after the limiter, and the limiter's reduction. */
const MEASURED_BURST = { peak: 0.3893, limiterDb: 0 };

// ---------------------------------------------------------------- the effects are their own

const tones = (id: Sfx78): Tn[] => SFX78[id].parts.filter((p): p is Tn => p.k === 't');
const noises = (id: Sfx78): Ns[] => SFX78[id].parts.filter((p): p is Ns => p.k === 'n');
const length = (id: Sfx78): number => Math.max(...SFX78[id].parts.map((p) => p.at + p.d));
const lowest = (id: Sfx78): number => Math.min(...tones(id).map((t) => Math.min(t.f, t.f2 ?? t.f)));
/** The highest corner frequency of any filter the effect's noise goes through. */
const brightest = (id: Sfx78): number => Math.max(0, ...noises(id).map((n) => Math.max(n.f?.freq ?? 0, n.f?.freqEnd ?? 0)));

test('the ten effects are registered, each with its own recipe, and none is a stand-in or shares a part', () => {
  for (const id of NEW) {
    assert.equal(SFX[id], SFX78[id], `${id} is the one the game plays`);
    const old = STAND_INS[id];
    assert.notEqual(SFX78[id], SFX34[old]);
    assert.notDeepEqual(SFX78[id].parts, SFX34[old].parts, `${id} sounds unlike ${old}`);
    assert.ok(SFX78[id].parts.length >= 4, `${id} is built from parts, not a stub`);
    for (const other of Object.keys(SFX) as (keyof typeof SFX)[]) {
      if (other === id) continue;
      assert.notEqual(SFX[id], SFX[other], `${id} shares a recipe with ${other}`);
      assert.notEqual(SFX[id].parts, SFX[other].parts, `${id} shares its parts with ${other}`);
      assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
    }
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
  assert.equal(new Set(NEW.map((id) => SFX78[id])).size, 10);
});

test('every part of the ten is in range, at the pitch jitter and at a semitone either way', () => {
  for (const id of NEW) {
    const r = SFX78[id];
    assert.ok(r.j >= 0 && r.j <= 0.08, `${id} jitter ${r.j}`);
    const top = 1 + r.j + 0.06;
    for (const p of r.parts as Part[]) {
      assert.ok(p.d > 0 && p.at >= 0 && p.v > 0 && p.v <= 1, `${id} part timing or volume`);
      if (p.k === 't') {
        for (const f of [p.f, p.f2 ?? p.f]) assert.ok(f * (1 - r.j - 0.06) >= 20 && f * top <= 8000, `${id} tone ${f}`);
        if (p.vib) assert.ok(p.vib.rate > 0 && p.vib.cents > 0 && p.vib.delay >= 0, `${id} vibrato`);
      } else {
        assert.ok(p.c > 0 && p.c * top <= 50000 && (p.c2 === undefined || (p.c2 > 0 && p.c2 * top <= 50000)), `${id} clock ${p.c}`);
        if (p.f) for (const f of [p.f.freq, p.f.freqEnd ?? p.f.freq]) assert.ok(f >= 20 && f <= 20000, `${id} filter ${f}`);
        if (p.rise !== undefined) assert.ok(p.rise > 0 && p.rise < p.d, `${id} swell`);
      }
    }
  }
});

test('the effects run the lengths the design asks for', () => {
  const span: Record<Sfx78, [number, number]> = {
    pistol: [0.12, 0.3], shotgun: [0.6, 0.9], scoop: [0.2, 0.35], babble: [0.45, 0.7], rifle: [0.06, 0.12],
    melt: [0.5, 0.7], grab: [0.4, 0.6], decode: [0.7, 1], stash: [0.3, 0.5], buy: [0.7, 1],
  };
  for (const id of NEW) assert.ok(length(id) >= span[id][0] && length(id) <= span[id][1], `${id} runs ${length(id).toFixed(2)} s`);
  assert.ok(length('rifle') < length('pistol') / 2, 'a round of the burst is half a pistol shot');
  assert.ok(length('shotgun') > 3 * length('pistol'), 'the shotgun is long next to the pistol');
});

// ---------------------------------------------------------------- levels

test('levels are measured: every recipe matches what was rendered, and each peak is where it should be', () => {
  for (const id of NEW) {
    const m = MEASURED[id];
    assert.equal(print(SFX78[id]), m.print, `${id} changed since it was measured: render it again (audio lab, E) and update MEASURED`);
    assert.ok(LEVELS78[id] > 0.2 && LEVELS78[id] < 1, `${id} level ${LEVELS78[id]}`);
    const peak = m.unit * LEVELS78[id];
    assert.ok(Math.abs(peak - m.peak) < 0.01, `${id} peaks at ${peak.toFixed(3)} at its level, the render said ${m.peak}`);
    assert.ok(Math.abs(m.peak - m.target) <= 0.03, `${id} peaks at ${m.peak}, wanted ${m.target}`);
    const limiter = 10 ** (LIMITER.threshold / 20);
    assert.ok(m.peak < limiter * 0.8, `${id} stays well under the limiter (${limiter.toFixed(2)})`);
  }
  // Impacts near 0.5 with the rest, the shotgun a little above, the rifle well under, the pitched ones near 0.3.
  for (const id of ['pistol', 'grab'] as const) assert.ok(MEASURED[id].peak >= 0.44 && MEASURED[id].peak <= 0.55, id);
  assert.ok(MEASURED.shotgun.peak > MEASURED.pistol.peak && MEASURED.shotgun.peak <= 0.65);
  assert.ok(MEASURED.rifle.peak < 0.4 && MEASURED.rifle.peak < MEASURED.pistol.peak);
  for (const id of ['scoop', 'babble', 'decode', 'stash'] as const) assert.ok(MEASURED[id].peak <= 0.4, `${id} is a quiet one`);
  assert.ok(MEASURED_BURST.peak < 0.45 && MEASURED_BURST.limiterDb < 0.1, 'three rounds in a row peak under 0.45 with the limiter idle');
  assert.ok(MEASURED_BURST.peak < MEASURED.pistol.peak, 'and a burst of three is quieter than one pistol shot');
});

test('what the game plays is what was measured: the level in the mix is LEVELS78 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    const parts = SFX78[id].parts;
    assert.equal(out.voices.length, parts.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...parts.map((p) => p.v)) * LEVELS78[id]) < 1e-9, `${id} plays at its level`);
    assert.ok(top < 0.7, `${id} no voice is near the limiter`);
  }
});

// ---------------------------------------------------------------- pistol, shotgun, rifle

test('pistol is one crisp crack: everything starts in the first 30 ms, bright on top, nothing pitched rings', () => {
  for (const p of SFX78.pistol.parts) assert.ok(p.at <= 0.03, `part at ${p.at}`);
  const crack = noises('pistol').filter((n) => n.d <= 0.03);
  assert.ok(crack.length >= 2 && crack.every((n) => n.f && n.f.type !== 'lowpass' && n.f.freq >= 1600), 'a click through a high band');
  assert.ok(noises('pistol').some((n) => n.d >= 0.08 && n.f?.type === 'bandpass' && n.f.freqEnd! < n.f.freq), 'the bang falls underneath');
  assert.equal(tones('pistol').length, 1);
  assert.ok(tones('pistol')[0].f2! < tones('pistol')[0].f && tones('pistol')[0].d <= 0.1 && !tones('pistol')[0].hold, 'a short thump, no held note');
  assert.ok(noises('pistol').some((n) => n.d >= 0.12 && n.rise !== undefined && n.v <= 0.15), 'a quiet breath of room behind it');
  assert.ok(brightest('pistol') >= 4000 && brightest('pistol') > brightest('rifle'), 'brighter than the rifle');
});

test('shotgun is wide and heavy: the lowest sound of the ten, a long blast, and a pump click after it has died', () => {
  assert.ok(lowest('shotgun') <= 40, 'the boom falls to 38 Hz');
  for (const id of NEW) if (id !== 'shotgun') assert.ok(lowest(id) > lowest('shotgun') + 15, `${id} stays out of the shotgun's low end`);
  const boom = tones('shotgun').find((t) => t.at === 0 && t.f >= 100)!;
  assert.ok(boom.w === 'tri' && boom.f2! <= 40 && boom.d >= 0.4 && boom.v >= 0.7, 'a big boom');
  assert.ok(tones('shotgun').some((t) => t.w === 'p25' && t.f <= 80 && t.at === 0), 'a second voice an octave under');
  const blast = noises('shotgun').find((n) => n.f?.type === 'lowpass' && n.d >= 0.4 && n.f.freq >= 1000)!;
  assert.ok(blast.f!.freqEnd! <= 150 && blast.v >= 0.9, 'the blast sinks from 1.4 kHz to 120 Hz');
  const wide = noises('shotgun').filter((n) => n.at < 0.1 && n.d >= 0.03);
  assert.ok(wide.some((n) => n.f!.type === 'bandpass' && n.f!.q! <= 0.5) && wide.some((n) => n.f!.type === 'lowpass'), 'a wide band and a low one');
  // The pump: two clacks after the blast is gone, the second higher and softer than the first.
  const blastEnd = Math.max(...SFX78.shotgun.parts.filter((p) => p.at < 0.1).map((p) => p.at + p.d));
  const pump = SFX78.shotgun.parts.filter((p) => p.at >= 0.4).sort((a, b) => a.at - b.at);
  assert.ok(blastEnd <= 0.5 && pump.length === 6, `${pump.length} pump parts after ${blastEnd.toFixed(2)} s`);
  const first = pump.filter((p) => p.at === pump[0].at);
  const second = pump.filter((p) => p.at === pump[pump.length - 1].at);
  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.ok(second[0].at - first[0].at >= 0.08 && second[0].at - first[0].at <= 0.2, 'a slide back and a slide forward');
  const knock = (parts: Part[]): Tn => parts.find((p): p is Tn => p.k === 't')!;
  assert.ok(knock(second).f > knock(first).f && knock(second).v < knock(first).v, 'forward is higher and softer');
  assert.ok(first.filter((p) => p.k === 'n').every((p) => p.d <= 0.03), 'each is a click');
});

test('rifle is one short round of a burst: a tenth of a second, dull, nothing above 3 kHz, nothing long', () => {
  assert.ok(length('rifle') <= 0.1);
  assert.ok(brightest('rifle') <= 3000, `brightest corner ${brightest('rifle')}`);
  assert.ok(noises('rifle').every((n) => n.f?.type !== 'highpass'), 'no air on top');
  assert.ok(noises('rifle').some((n) => n.f?.type === 'bandpass' && n.f.freq >= 1500 && n.d <= 0.03), 'a flat crack');
  assert.ok(tones('rifle').length === 1 && tones('rifle')[0].f2! < tones('rifle')[0].f, 'a thump');
  assert.ok(SFX78.rifle.j >= 0.05, 'three in a row do not repeat exactly');
  // Three rounds fit inside a burst: a round is over well before the next one at 0.12 s.
  assert.ok(length('rifle') < 0.12 / 1.2);
  assert.ok(MEASURED.rifle.peak < MEASURED.pistol.peak && LEVELS78.rifle * Math.max(...SFX78.rifle.parts.map((p) => p.v)) < 0.4);
});

// ---------------------------------------------------------------- scoop, babble

test('scoop is a soft wet plop: a bubble that swells up, a smaller one after, a slosh, and nothing above 1.4 kHz', () => {
  const bubbles = tones('scoop');
  assert.equal(bubbles.length, 2);
  assert.ok(bubbles.every((t) => t.w === 'tri' && t.f2! >= 2 * t.f && !t.hold), 'two triangle bubbles swelling up an octave or more');
  assert.ok(bubbles[1].v < bubbles[0].v && bubbles[1].d < bubbles[0].d && bubbles[1].at > 0.08, 'the second is smaller and later');
  assert.ok(noises('scoop').every((n) => n.f && n.f.freq <= 1400 && (n.f.freqEnd ?? 0) <= 1400), 'every band is under 1.4 kHz');
  assert.ok(Math.max(...bubbles.map((t) => t.f2!)) <= 700);
  assert.ok(noises('scoop').filter((n) => n.rise !== undefined).length >= 3, 'soft starts: nothing hits at full level');
  assert.ok(noises('scoop').some((n) => n.m === 15 && n.f?.type === 'lowpass' && n.d >= 0.1), 'a slow slosh');
  assert.ok(brightest('scoop') < brightest('pistol') / 2 && brightest('scoop') < 1500);
  assert.ok(MEASURED.scoop.peak <= 0.3);
});

test('babble is fast garbled talk: eleven short beeps on the pulse, uneven, wandering, with slides and consonants', () => {
  const beeps = tones('babble');
  assert.equal(beeps.length, 11);
  assert.ok(beeps.every((t) => t.w === 'p25' && t.hold), "Robin's pulse, flat and sharp-edged");
  assert.ok(beeps.every((t) => Math.min(t.f, t.f2 ?? t.f) >= 500 && Math.max(t.f, t.f2 ?? t.f) <= 1400), 'between 500 Hz and 1.4 kHz');
  assert.ok(beeps.slice(0, -1).every((t) => t.d <= 0.04) && beeps[beeps.length - 1].d >= 0.08, 'each short, the last longer');
  const starts = beeps.map((t) => t.at);
  const gaps = starts.slice(1).map((a, i) => Math.round((a - starts[i]) * 1000));
  assert.ok(new Set(gaps).size >= 6, `${new Set(gaps).size} different gaps: uneven`);
  assert.ok(Math.min(...gaps) >= 35 && Math.max(...gaps) <= 65, 'but always fast');
  assert.ok(Math.max(...starts) <= 0.55, 'a run, not a sentence');
  const turns = beeps.slice(2).filter((t, i) => (t.f - beeps[i + 1].f) * (beeps[i + 1].f - beeps[i].f) < 0).length;
  assert.ok(turns >= 5, `${turns} changes of direction: garbled`);
  assert.equal(beeps.filter((t) => t.f2 !== undefined).length, 4, 'four slide');
  assert.ok(beeps.some((t) => t.f2! > t.f) && beeps.some((t) => t.f2! < t.f), 'up and down');
  const last = beeps[beeps.length - 1];
  assert.ok(last.f2! < last.f, 'the last one sags');
  const ticks = noises('babble');
  assert.equal(ticks.length, 4);
  assert.ok(ticks.every((n) => n.m === 7 && n.d <= 0.012), 'consonants');
  assert.ok(ticks.every((n) => beeps.some((t) => t.at === n.at)), 'each tick starts a beep');
  // Robin's voice, in range: her blip is the same pulse, centred at 77 (698 Hz).
  assert.equal(BLIPS.robin.wave, 'p25');
  assert.ok(Math.abs(beeps.reduce((a, t) => a + t.f, 0) / beeps.length - midiToHz(BLIPS.robin.midi)) < 250);
});

// ---------------------------------------------------------------- melt, grab

test('melt bursts and runs out: a splat, a squelch that falls, bubbles that rise, wet pops that thin out, a slop', () => {
  const splat = noises('melt').find((n) => n.at === 0 && n.m === 15)!;
  assert.ok(splat.f!.freqEnd! <= splat.f!.freq / 3 && splat.d <= 0.1 && splat.v >= 0.9, 'a splat falling from 1.4 kHz to 400 Hz');
  assert.ok(tones('melt').some((t) => t.at === 0 && t.f2! <= t.f / 3 && t.f2! <= 60), 'and a drop to 60 Hz');
  const squelch = noises('melt').find((n) => n.m === 7 && n.d >= 0.3)!;
  assert.ok(squelch.f!.type === 'bandpass' && squelch.f!.freq >= 1400 && squelch.f!.freqEnd! <= 300 && squelch.f!.q! >= 2, 'the band falls from 1.5 kHz to 260 Hz');
  const bubbles = tones('melt').filter((t) => t.at > 0.05);
  assert.equal(bubbles.length, 3);
  assert.ok(bubbles.every((t) => t.f2! > 2 * t.f), 'each climbs as it comes up');
  assert.ok(bubbles.every((t, i) => !i || (t.at > bubbles[i - 1].at && t.v <= bubbles[i - 1].v + 1e-9) || t.at > 0.25), 'and they thin out');
  const pops = noises('melt').filter((n) => n.m === 7 && n.d <= 0.02).sort((a, b) => a.at - b.at);
  assert.equal(pops.length, 5);
  assert.ok(pops.every((n, i) => !i || n.v < pops[i - 1].v), 'each pop is softer');
  assert.ok(pops[4].at - pops[3].at < 0.1 && pops[1].at - pops[0].at >= 0.1, 'and they space out and stop');
  const slop = noises('melt').find((n) => n.f?.type === 'lowpass' && n.d >= 0.25)!;
  assert.ok(slop.f!.freqEnd! <= 200 && slop.rise !== undefined, 'a slop that settles to 160 Hz');
  assert.ok(brightest('melt') <= 1600, 'wet and mid: nothing bright');
  // Petals, the other squelch, climbs. Melt falls.
  assert.ok(noises('melt').filter((n) => n.f?.freqEnd && n.f.freqEnd > n.f.freq).length === 0, 'no band of melt rises');
});

test('grab is a fleshy lunge and a catch: a dull rising whoosh, then at 0.16 s a slap, a thump, a squeeze and a creak, and a second grip', () => {
  const whoosh = noises('grab').find((n) => n.at === 0 && n.d >= 0.15)!;
  assert.ok(whoosh.f!.type === 'bandpass' && whoosh.f!.freqEnd! >= 5 * whoosh.f!.freq && whoosh.rise !== undefined, 'a band that rises from 250 Hz to 1.5 kHz');
  assert.ok(whoosh.f!.freqEnd! <= 1600, 'dull: none of the highs the Demogorgon has');
  const catches = SFX78.grab.parts.filter((p) => p.at >= 0.15 && p.at <= 0.22);
  assert.ok(catches.length >= 4, 'the catch is several parts at once');
  const slap = noises('grab').find((n) => n.at === 0.16 && n.d <= 0.06)!;
  assert.ok(slap.v >= 0.9 && slap.f!.type === 'bandpass', 'a wet slap');
  const thump = tones('grab').find((t) => t.at === 0.16)!;
  assert.ok(thump.f2! <= 60 && thump.f >= 140 && thump.v >= 0.5, 'a thump falling to 55 Hz');
  const squeeze = noises('grab').find((n) => n.m === 7 && n.d >= 0.2)!;
  assert.ok(squeeze.f!.freqEnd! > squeeze.f!.freq && squeeze.rise !== undefined && squeeze.f!.q! >= 2, 'a squeeze that swells upward');
  const creak = tones('grab').find((t) => t.vib)!;
  assert.ok(creak.vib!.rate >= 12 && creak.f2! < creak.f && creak.v <= 0.2, 'a quiet wobbling creak');
  const grip = tones('grab').find((t) => t.at >= 0.3)!;
  assert.ok(grip.v < thump.v && grip.f2! < grip.f, 'the second grip is smaller');
  assert.ok(brightest('grab') < 1600 && brightest('grab') < 2500, 'under the lunge, which goes to 2.6 kHz');
  assert.ok(Math.max(...noises('grab').map((n) => n.f!.freqEnd ?? n.f!.freq)) < Math.max(...SFX34.lunge.parts.filter((p): p is Ns => p.k === 'n').map((n) => n.f!.freq)));
});

// ---------------------------------------------------------------- decode, stash, buy

test('decode is a keypad and a lock: four beeps of two tones climbing, a bolt, and a chime', () => {
  const beeps = tones('decode').filter((t) => t.hold && t.at <= 0.25);
  assert.equal(beeps.length, 8, 'four keys, two tones each');
  const keys = [0, 0.08, 0.16, 0.24].map((at) => beeps.filter((t) => t.at === at).map((t) => t.f).sort((a, b) => a - b));
  assert.deepEqual(keys, [[697, 1209], [770, 1336], [852, 1477], [941, 1477]], 'the four phone keypad pairs');
  assert.ok(keys.every((k, i) => !i || (k[0] > keys[i - 1][0] && k[1] >= keys[i - 1][1])), 'both tones climb');
  assert.ok(beeps.every((t) => t.w === 'tri' && t.d <= 0.06), 'flat and short');
  const bolt = tones('decode').find((t) => t.at >= 0.35 && t.at <= 0.4)!;
  assert.ok(bolt.f >= 140 && bolt.f2! <= 60 && bolt.v >= 0.5, 'a bolt sliding back: a thump falling to 55 Hz');
  assert.ok(noises('decode').some((n) => n.at === 0.36 && n.f?.type === 'highpass' && n.d <= 0.02), 'with a click');
  const chime = tones('decode').filter((t) => t.at >= 0.5 && t.w === 'p25').sort((a, b) => a.at - b.at);
  assert.equal(chime.length, 2);
  assert.ok(chime[1].f > chime[0].f * 1.4, 'a chime that rises: C then a high G');
  assert.ok(chime[1].at > 0.5 && chime[1].d >= 0.25 && !chime[1].hold, 'the last note rings out');
  assert.ok(length('decode') > 0.8, 'the bolt and the chime come after the beeps');
  assert.ok(lowest('decode') >= 50, 'no deep boom: this is a door lock, not the Gate');
  // Reveal, the stand-in, is a run of triangle bells with air on top. Decode has beeps, a thump and no air.
  assert.ok(noises('decode').every((n) => n.f?.type !== 'highpass' || n.d <= 0.02), 'no hiss of air');
});

test('stash is a bite and a fizz and a happy chirp: crunch, tick, thump, a fizz of air that pops, two notes sliding up', () => {
  const bite = noises('stash').find((n) => n.at === 0)!;
  assert.ok(bite.m === 7 && bite.d <= 0.03 && bite.f!.type === 'bandpass' && bite.f!.freq >= 1500 && bite.f!.freq <= 2500, 'a crunch round 1.9 kHz');
  assert.ok(noises('stash').some((n) => n.m === 15 && n.at > 0 && n.at <= 0.03 && n.d <= 0.03), 'a tick of white noise');
  const fizz = noises('stash').find((n) => n.d >= 0.25)!;
  assert.ok(fizz.f!.type === 'bandpass' && fizz.f!.freq >= 4500 && fizz.rise !== undefined && fizz.v <= 0.2, 'a quiet swell of air round 5 kHz');
  const pops = noises('stash').filter((n) => n.m === 7 && n.d <= 0.012 && n.at > 0.05).sort((a, b) => a.at - b.at);
  assert.equal(pops.length, 5);
  assert.ok(pops.every((n, i) => !i || n.v < pops[i - 1].v), 'five pops, each softer');
  const chirp = tones('stash').filter((t) => t.w === 'p25').sort((a, b) => a.at - b.at);
  assert.equal(chirp.length, 2);
  assert.ok(chirp.every((t) => t.f2! > t.f && !t.hold), 'two notes, each sliding up');
  assert.ok(chirp[1].f > chirp[0].f * 1.3, 'the second above the first');
  assert.ok(chirp[0].v >= fizz.v, 'the chirp is louder than the fizz: the sound is happy, not hissy');
  assert.ok(tones('stash').some((t) => t.w === 'p12' && t.f >= 2000), 'a thin shimmer on the second note');
  assert.ok(length('stash') < length('decode') && length('stash') < 0.5);
  // Nothing low and nothing long: it plays every time a stash item is used.
  assert.ok(lowest('stash') >= 100);
});

test('buy is a cash register: a drawer slams and one bell rings once, with a partial 2.4 times higher', () => {
  const bells = tones('buy').filter((t) => t.at === 0.08);
  assert.equal(bells.length, 3);
  const bell = bells.find((t) => t.w === 'tri' && t.d >= 0.7)!;
  assert.ok(bell.f >= 2000 && bell.f <= 2800 && bell.v >= 0.3 && !bell.hold, 'a triangle round 2.35 kHz that rings');
  const over = bells.find((t) => t.w === 'tri' && t.f > bell.f * 2)!;
  assert.ok(Math.abs(over.f / bell.f - 2.4) < 0.01 && over.d < bell.d && over.v < bell.v / 2, 'a quieter partial 2.4 times higher that dies sooner');
  assert.ok(bells.some((t) => t.w === 'p12' && t.f > bell.f && t.f < over.f), 'a thin pulse between');
  assert.equal(tones('buy').filter((t) => t.f >= 2000 && t.d >= 0.5 && t.f < bell.f * 1.3 && t.w === 'tri').length, 1, 'one ding, no run');
  const thump = tones('buy').find((t) => t.at === 0)!;
  assert.ok(thump.f2! <= 70 && thump.f >= 160 && thump.d <= 0.08, 'the drawer: a thump falling from 180 Hz to 70 Hz');
  assert.ok(noises('buy').some((n) => n.at === 0 && n.f?.type === 'lowpass'), 'a lowpassed burst with it');
  const clicks = noises('buy').filter((n) => n.m === 7 && n.d <= 0.012).map((n) => n.at);
  assert.deepEqual(clicks, [0, 0.03, 0.05], 'three ratchet clicks, softer each time');
  assert.ok(noises('buy').filter((n) => n.m === 7 && n.d <= 0.012).every((n, i, a) => !i || n.v < a[i - 1].v));
  assert.ok(lowest('buy') >= 70, 'nothing under 70 Hz');
  assert.ok(bell.at > thump.at + 0.05, 'the bell comes after the drawer');
  // The stand-in was reveal, a rising run of bells. This is the opposite: one.
  assert.ok(tones('buy').filter((t) => t.w === 'tri' && t.f >= 700 && t.f <= 3000).length === 1);
});

