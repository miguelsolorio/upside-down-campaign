// The five effects and the speech blip made for Level 9 (stage 3.3, the food court): legslam, sever, shatter, boom and
// reach, and Billy's blip. They replace stand-ins that borrowed Level 3 and 4 effects and Steve's square, so these tests
// check that nothing is borrowed any more, that every number is in range, and that each sound is built the way its design
// says. Nobody listens to these in a test, so the rest is proof from numbers.
// Peak and loudness need a rendered signal, which Node can't make. They were measured with an offline render in the
// browser (renderWith in render.ts, the audio lab's E key) and are recorded below next to a fingerprint of the data that
// was measured. If a recipe or the blip changes, its fingerprint stops matching and the test says to measure it again.
// The stub context in audio-helpers.ts plays the real code and checks the level that comes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS9, SFX9 } from '../src/audio/sfx_level9.ts';
import type { Sfx9 } from '../src/audio/sfx_level9.ts';
import { SFX34 } from '../src/audio/sfx_levels34.ts';
import { SFX56 } from '../src/audio/sfx_levels56.ts';
import { LIMITER } from '../src/audio/engine.ts';
import { BLIPS, playBlip } from '../src/audio/cues.ts';
import type { Ns, Part, Recipe, Tn } from '../src/audio/sfx_kit.ts';
import type { Speaker } from '../src/core/types.ts';
import { play, peakOf, print } from './audio-helpers.ts';

const NEW = ['legslam', 'sever', 'shatter', 'boom', 'reach'] as const;
/** The Level 3 and 4 effect each one stood in for. */
const STAND_INS: Record<Sfx9, keyof typeof SFX34> = {
  legslam: 'thud', sever: 'chomp', shatter: 'acid', boom: 'roar', reach: 'reveal',
};

// ---------------------------------------------------------------- what the offline renders said

/**
 * unit: the largest sample before the limiter with the effect alone at gain 1. peak: the largest sample after the
 * limiter at LEVELS9 (limiter reduction 0 dB and nothing clipped in every one). Targets: impacts near 0.5; boom, which
 * is far below the mall, under gateShut's 0.594; reach, a soft chime, near 0.3 with the other pitched sounds.
 */
const MEASURED: Record<Sfx9, { print: string; unit: number; peak: number; target: number }> = {
  legslam: { print: 'a220cee8', unit: 1.4863, peak: 0.4994, target: 0.5 },
  sever: { print: '4c59e525', unit: 1.9482, peak: 0.5007, target: 0.5 },
  shatter: { print: '49f8de12', unit: 2.5411, peak: 0.5006, target: 0.5 },
  boom: { print: 'f29efd4a', unit: 1.3576, peak: 0.4996, target: 0.5 },
  reach: { print: '6057f216', unit: 0.4836, peak: 0.3003, target: 0.3 },
};
/** gateShut's peak after the limiter, from tests/tracks-56.test.ts. */
const GATE_SHUT_PEAK = 0.594;
/**
 * Billy's blip at the centre of its range: the peak after the limiter, and its A-weighted energy in dB (the ear's view
 * of how loud it is). The other speakers' blips, from the same render: Mike 11.9, Dustin 8.4, Lucas 9.1, Eleven 9.6,
 * Will 10, Max 8.8, Steve 10.9, Robin 9, Nancy 8.7, Erica 10, so the median is 9.6.
 */
const MEASURED_BILLY = { print: '78968ec6', peak: 0.2206, energyDb: 9.7 };
const BLIP_MEDIAN_DB = 9.6;

// ---------------------------------------------------------------- the effects are their own

const parts = (r: Recipe): Part[] => r.parts;
const toneParts = (r: Recipe): Tn[] => parts(r).filter((p): p is Tn => p.k === 't');
const noiseParts = (r: Recipe): Ns[] => parts(r).filter((p): p is Ns => p.k === 'n');
const tones = (id: Sfx9): Tn[] => toneParts(SFX9[id]);
const noises = (id: Sfx9): Ns[] => noiseParts(SFX9[id]);
const lengthOf = (r: Recipe): number => Math.max(...parts(r).map((p) => p.at + p.d));
const length = (id: Sfx9): number => lengthOf(SFX9[id]);
const lowest = (id: Sfx9): number => Math.min(...tones(id).map((t) => Math.min(t.f, t.f2 ?? t.f)));
const highest = (id: Sfx9): number => Math.max(...tones(id).map((t) => Math.max(t.f, t.f2 ?? t.f)));
/** The highest corner frequency of any filter the recipe's noise goes through. */
const cornerOf = (r: Recipe): number => Math.max(0, ...noiseParts(r).map((n) => Math.max(n.f?.freq ?? 0, n.f?.freqEnd ?? 0)));
const brightest = (id: Sfx9): number => cornerOf(SFX9[id]);
const falling = (v: number[]): boolean => v.every((x, i) => !i || x < v[i - 1]);

test('the five effects are registered, each with its own recipe, and none is a stand-in or shares a part', () => {
  for (const id of NEW) {
    assert.equal(SFX[id], SFX9[id], `${id} is the one the game plays`);
    const old = STAND_INS[id];
    assert.notEqual(SFX9[id], SFX34[old]);
    assert.notDeepEqual(SFX9[id].parts, SFX34[old].parts, `${id} sounds unlike ${old}`);
    assert.ok(SFX9[id].parts.length >= 8, `${id} is built from parts, not a stub`);
    for (const other of Object.keys(SFX) as (keyof typeof SFX)[]) {
      if (other === id) continue;
      assert.notEqual(SFX[id], SFX[other], `${id} shares a recipe with ${other}`);
      assert.notEqual(SFX[id].parts, SFX[other].parts, `${id} shares its parts with ${other}`);
      assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
    }
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
  assert.equal(new Set(NEW.map((id) => SFX9[id])).size, 5);
  assert.deepEqual(Object.keys(SFX9).sort(), [...NEW].sort());
});

test('every part of the five is in range, at the pitch jitter and at a semitone either way', () => {
  for (const id of NEW) {
    const r = SFX9[id];
    assert.ok(r.j >= 0 && r.j <= 0.08, `${id} jitter ${r.j}`);
    const top = 1 + r.j + 0.06;
    for (const p of r.parts) {
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
  const span: Record<Sfx9, [number, number]> = {
    legslam: [0.4, 0.6], sever: [0.4, 0.6], shatter: [1.2, 1.8], boom: [2.4, 3.2], reach: [1.2, 1.7],
  };
  for (const id of NEW) assert.ok(length(id) >= span[id][0] && length(id) <= span[id][1], `${id} runs ${length(id).toFixed(2)} s`);
  assert.ok(length('boom') > lengthOf(SFX56.gateShut) * 1.3, 'the boom is long next to the Gate shutting');
  assert.ok(length('shatter') > 2 * length('legslam'), 'glass rings on after a strike is over');
});

// ---------------------------------------------------------------- levels

test('levels are measured: every recipe matches what was rendered, and each peak is where it should be', () => {
  for (const id of NEW) {
    const m = MEASURED[id];
    assert.equal(print(SFX9[id]), m.print, `${id} changed since it was measured: render it again (audio lab, E) and update MEASURED`);
    assert.ok(LEVELS9[id] > 0.1 && LEVELS9[id] <= 1, `${id} level ${LEVELS9[id]}`);
    const peak = m.unit * LEVELS9[id];
    assert.ok(Math.abs(peak - m.peak) < 0.01, `${id} peaks at ${peak.toFixed(3)} at its level, the render said ${m.peak}`);
    assert.ok(Math.abs(m.peak - m.target) <= 0.03, `${id} peaks at ${m.peak}, wanted ${m.target}`);
    const limiter = 10 ** (LIMITER.threshold / 20);
    assert.ok(m.peak < limiter * 0.8, `${id} stays well under the limiter (${limiter.toFixed(2)})`);
  }
  // Impacts near 0.5 with the rest, the far-off boom under gateShut, the soft chime near 0.3.
  for (const id of ['legslam', 'sever', 'shatter'] as const) assert.ok(MEASURED[id].peak >= 0.45 && MEASURED[id].peak <= 0.55, id);
  assert.ok(MEASURED.boom.peak < GATE_SHUT_PEAK && MEASURED.boom.peak >= 0.45, 'boom is quieter than gateShut');
  assert.ok(MEASURED.reach.peak <= 0.35 && MEASURED.reach.peak < MEASURED.legslam.peak, 'reach is the soft one');
});

test('what the game plays is what was measured: the level in the mix is LEVELS9 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    const ps = SFX9[id].parts;
    assert.equal(out.voices.length, ps.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...ps.map((p) => p.v)) * LEVELS9[id]) < 1e-9, `${id} plays at its level`);
    assert.ok(top < 0.5, `${id} no voice is near full scale`);
  }
});

test('each sits in its own part of the spectrum', () => {
  // legslam: nothing under 55 Hz, the crack above 3.5 kHz. Thud, slam and gateShut own the sub bass.
  assert.ok(lowest('legslam') >= 55 && brightest('legslam') >= 3500);
  assert.ok(lowest('legslam') > Math.min(...toneParts(SFX34.thud).map((t) => t.f2 ?? t.f)) + 20, 'above where thud goes');
  // sever: tones from 90 Hz up, the tear climbing to 3.2 kHz and a snap above 4 kHz.
  assert.ok(lowest('sever') >= 85 && brightest('sever') >= 4000);
  // shatter: nothing under 200 Hz, no lowpass anywhere, and the highest corner of the five.
  assert.ok(lowest('shatter') >= 200 && highest('shatter') >= 6000);
  assert.ok(noises('shatter').every((n) => n.f && n.f.type !== 'lowpass'), 'no lowpass: it has no body');
  // boom: nothing above 520 Hz, the only one of the five that stays that low.
  assert.ok(brightest('boom') <= 520 && highest('boom') <= 140);
  // reach: no note above 800 Hz and no air above 1.2 kHz.
  assert.ok(highest('reach') <= 800 && brightest('reach') <= 1200);
  for (const id of NEW) {
    if (id !== 'shatter') assert.ok(brightest(id) < brightest('shatter'), `${id} is not as bright as shatter`);
    if (id !== 'boom') assert.ok(brightest(id) > brightest('boom'), `${id} is brighter than boom`);
  }
});

// ---------------------------------------------------------------- legslam, sever, shatter, boom, reach

test('legslam is a heavy wet strike with a crack on top: a thump, a falling squelch, a slop, a bubble and drips', () => {
  const thump = tones('legslam').find((t) => t.w === 'tri' && t.at === 0)!;
  assert.ok(thump.f >= 180 && thump.f2! <= 70 && thump.v >= 0.7 && !thump.hold, 'a thump falling from 190 Hz to 68 Hz');
  const under = tones('legslam').find((t) => t.w === 'p25')!;
  assert.ok(Math.abs(under.f * 2 - thump.f) <= 5 && under.v < thump.v && under.f2! >= 55, 'a pulse an octave under it');
  const click = noises('legslam').find((n) => n.at === 0 && n.f?.type === 'highpass')!;
  assert.ok(click.f!.freq >= 3500 && click.d <= 0.03, 'a click of white noise above 3.5 kHz');
  const slap = noises('legslam').find((n) => n.at === 0 && n.f?.type === 'bandpass' && n.f.freq >= 3500)!;
  assert.ok(slap.m === 15 && slap.f!.freqEnd! < slap.f!.freq && slap.d <= 0.06, 'a slap through a band that falls');
  const squelch = noises('legslam').find((n) => n.m === 7 && n.d >= 0.15)!;
  assert.ok(squelch.f!.type === 'bandpass' && squelch.f!.freq >= 600 && squelch.f!.freqEnd! <= 300 && squelch.f!.q! >= 2, 'wet: a squelch falling from 700 Hz to 260 Hz');
  assert.ok(Math.max(click.v, slap.v) < squelch.v && Math.max(click.v, slap.v) < thump.v, 'the crack is on top, not the body');
  const slop = noises('legslam').find((n) => n.f?.type === 'lowpass' && n.d >= 0.4)!;
  assert.ok(slop.f!.freqEnd! <= 200 && slop.rise !== undefined, 'a slop that settles to 160 Hz');
  const bubble = tones('legslam').find((t) => t.at > 0.05)!;
  assert.ok(bubble.f2! >= 2.5 * bubble.f && bubble.v < 0.3, 'a bubble climbing out of it');
  const drips = noises('legslam').filter((n) => n.m === 7 && n.at >= 0.15).sort((a, b) => a.at - b.at);
  assert.equal(drips.length, 4);
  assert.ok(drips.every((n) => n.d <= 0.03) && falling(drips.map((n) => n.v)), 'four drips, each softer');
  assert.ok(lowest('legslam') >= 55, 'a leg, not a wall: nothing under 55 Hz');
  assert.ok(brightest('legslam') > cornerOf(SFX34.thud), 'a crack brighter than anything in thud');
  assert.ok(SFX9.legslam.j >= 0.04, 'it lands every few seconds in the fight, so the pitch moves');
});

test('sever is a wet tear and a snap: a band that climbs, eight fibres, then at 0.2 s a click, a crack, a falling pulse and a gush', () => {
  const tear = noises('sever').find((n) => n.at === 0 && n.m === 15 && n.d >= 0.15)!;
  assert.ok(tear.f!.type === 'bandpass' && tear.f!.freqEnd! >= 3 * tear.f!.freq && tear.rise !== undefined, 'a band that climbs from 900 Hz to 3.2 kHz');
  const squelch = noises('sever').find((n) => n.at === 0 && n.m === 7 && n.d >= 0.15)!;
  assert.ok(squelch.f!.freqEnd! > squelch.f!.freq && squelch.f!.q! >= 2, 'and a wet squelch rises under it');
  const fibres = noises('sever').filter((n) => n.m === 7 && n.d <= 0.02 && n.at < 0.2).sort((a, b) => a.at - b.at);
  assert.equal(fibres.length, 8);
  assert.ok(fibres.every((n, i) => !i || (n.at - fibres[i - 1].at >= 0.019 && n.v > fibres[i - 1].v)), 'eight fibres, each louder and none on top of the last');
  const snap = SFX9.sever.parts.filter((p) => p.at === 0.2);
  assert.equal(snap.length, 4, 'the snap is four parts at once');
  const click = noises('sever').find((n) => n.at === 0.2 && n.f?.type === 'highpass')!;
  assert.ok(click.f!.freq >= 4000 && click.d <= 0.015 && click.v === 1, 'a click above 4 kHz: the loudest part');
  assert.ok(Math.max(...SFX9.sever.parts.map((p) => p.v)) === click.v);
  assert.ok(noises('sever').filter((n) => n.f?.type === 'highpass' && n.f.freq >= 4000).length === 1, 'one snap, where chomp bites twice');
  const crack = noises('sever').find((n) => n.at === 0.2 && n.f?.type === 'bandpass')!;
  assert.ok(crack.f!.freq >= 2500 && crack.f!.freqEnd! < crack.f!.freq && crack.d <= 0.05, 'a hard crack round 2.8 kHz');
  const bone = tones('sever').find((t) => t.at === 0.2 && t.w === 'p12')!;
  assert.ok(bone.f >= 1400 && bone.f2! <= bone.f / 3, 'a thin pulse falling like a bone going');
  const knock = tones('sever').find((t) => t.at === 0.2 && t.w === 'tri')!;
  assert.ok(knock.f2! <= 100 && knock.d <= 0.1, 'and a small knock');
  const gush = noises('sever').find((n) => n.at > 0.2 && n.f?.type === 'lowpass')!;
  assert.ok(gush.f!.freqEnd! <= 300 && gush.d >= 0.2 && gush.rise !== undefined, 'a gush that falls away after the snap');
  const drips = tones('sever').filter((t) => t.at >= 0.3);
  assert.equal(drips.length, 2);
  assert.ok(drips.every((t) => t.f2! < t.f) && drips[1].v < drips[0].v, 'two drips, falling and softer');
  assert.ok(lowest('sever') >= 85, 'nothing deep: this is a tear, not a boom');
  assert.ok(length('sever') <= 0.6);
});

test('shatter is glass: a wall of bright noise, a crack, fifteen shards that thin out, and twelve pings that fall', () => {
  const wall = noises('shatter').find((n) => n.at === 0 && n.f?.type === 'highpass')!;
  assert.ok(wall.f!.freq >= 3500 && wall.d >= 0.1 && wall.v >= 0.9, 'white noise above 3.5 kHz, as loud as it gets');
  const band = noises('shatter').find((n) => n.at === 0 && n.f?.type === 'bandpass' && n.d >= 0.25)!;
  assert.ok(band.f!.freq >= 5500 && band.f!.freqEnd! <= 4000, 'and a wide band falling from 6 kHz');
  const crack = noises('shatter').find((n) => n.m === 15 && n.d <= 0.05 && n.f?.type === 'bandpass')!;
  assert.ok(crack.f!.freq >= 2500 && crack.v >= 0.9, 'a hard crack under it');
  assert.ok(noises('shatter').some((n) => n.m === 7 && n.f?.type === 'bandpass' && n.f.freq <= 2000 && n.d >= 0.1), 'a crunch of the pane');
  const shards = noises('shatter').filter((n) => n.m === 7 && n.d <= 0.03 && n.f?.type === 'bandpass' && n.f.freq >= 4200).sort((a, b) => a.at - b.at);
  assert.equal(shards.length, 15);
  assert.ok(falling(shards.map((n) => n.v)), 'each softer than the last');
  const gaps = shards.slice(1).map((n, i) => n.at - shards[i].at);
  assert.ok(gaps[gaps.length - 1] > 2 * gaps[0] && shards[14].at <= 0.9, 'and they thin out');
  assert.ok(shards.every((n) => n.f!.freq <= 8400 && n.f!.q! >= 1.5), 'narrow bands in the highs');
  const pings = tones('shatter').filter((t) => t.f >= 2500).sort((a, b) => a.at - b.at);
  assert.equal(pings.length, 12);
  assert.ok(pings.every((t) => t.w === 'tri' && !t.hold && t.d >= 0.15), 'triangle pings left to ring');
  assert.ok(pings[0].f >= 6000 && pings[11].f <= 2800, 'falling from 6.4 kHz to 2.6 kHz');
  const mean = (a: Tn[]): number => a.reduce((s, t) => s + t.f, 0) / a.length;
  assert.ok(mean(pings.slice(0, 4)) > mean(pings.slice(-4)) + 1500, 'a tinkle that falls, if not in a straight line');
  assert.ok(falling(pings.map((t) => t.v)), 'and quietens');
  assert.ok(pings[0].at <= 0.1 && pings[11].at >= 1.2, 'over a second and a quarter');
  const dust = noises('shatter').find((n) => n.d >= 0.9)!;
  assert.ok(dust.f!.type === 'highpass' && dust.f!.freq >= 6000 && dust.rise !== undefined && dust.v <= 0.2, 'a fizz of dust swelling above it');
  assert.ok(highest('shatter') >= 6000 && brightest('shatter') >= 6000, 'the brightest thing there is');
});

test('boom is far off and muffled: lowpassed noise that swells in and sinks, a boom, a wobbling sub, a buzz and three collapses', () => {
  for (const n of noises('boom')) assert.ok(n.f?.type === 'lowpass' && Math.max(n.f.freq, n.f.freqEnd ?? 0) <= 520, 'every band of noise is lowpassed under 520 Hz');
  const rumble = noises('boom').find((n) => n.d >= 2.5)!;
  assert.ok(rumble.f!.freq <= 300 && rumble.f!.freqEnd! <= 50 && rumble.rise! >= 0.1 && rumble.v >= 0.9, 'a long rumble that swells in and sinks to 45 Hz');
  assert.ok(noises('boom').filter((n) => n.d >= 2).every((n) => n.rise! >= 0.1), 'nothing long starts hard');
  assert.ok(noises('boom').some((n) => n.m === 7 && n.d >= 2), 'with a coarse layer under it');
  const bump = noises('boom').find((n) => n.d <= 0.15)!;
  assert.ok(bump.f!.freq <= 520 && bump.f!.freqEnd! <= 150, 'the only short noise is a dull bump');
  const boom = tones('boom').find((t) => t.w === 'tri' && t.f >= 60)!;
  assert.ok(boom.f2! <= 28 && boom.d >= 1 && boom.v >= 0.7 && boom.at > 0, 'a boom falling from 70 Hz to 26 Hz, after the swell begins');
  const sub = tones('boom').find((t) => t.w === 'tri' && t.vib)!;
  assert.ok(sub.hold && sub.vib!.rate >= 3 && sub.vib!.rate <= 8 && sub.vib!.cents >= 150 && sub.d >= 1.5, 'a sub that shakes');
  const buzz = tones('boom').find((t) => t.w === 'p25')!;
  assert.ok(buzz.f >= 2 * sub.f && buzz.f <= 140 && buzz.vib && buzz.f2! < buzz.f, 'and a buzz an octave up, for a small speaker');
  const collapses = tones('boom').filter((t) => t.at >= 0.5).sort((a, b) => a.at - b.at);
  assert.equal(collapses.length, 3);
  assert.deepEqual(collapses.map((t) => t.at), [0.7, 1.35, 2]);
  assert.ok(collapses.every((t, i) => !i || (t.f < collapses[i - 1].f && t.v < collapses[i - 1].v)), 'each lower and softer');
  const falls = noises('boom').filter((n) => n.at >= 0.5);
  assert.equal(falls.length, 3);
  assert.ok(falls.every((n, i) => !i || (n.f!.freq < falls[i - 1].f!.freq && n.v < falls[i - 1].v)), 'with a drop of rubble each time');
  // Against the Gate shutting: gateShut has a crack, a draining tone and ticks of debris. Boom has none of them.
  assert.ok(cornerOf(SFX56.gateShut) >= 3000 && brightest('boom') < cornerOf(SFX56.gateShut) / 5, 'quieter at the top than gateShut');
  assert.ok(toneParts(SFX56.gateShut).some((t) => t.w === 'p50' && t.f >= 500), 'gateShut drains a tone from 600 Hz');
  assert.ok(highest('boom') < 500, 'boom has no tone above 140 Hz');
  assert.ok(noises('boom').every((n) => n.d >= 0.1), 'no debris ticks');
  assert.ok(MEASURED.boom.peak < GATE_SHUT_PEAK);
  assert.ok(lowest('boom') <= 28 && lowest('boom') >= 22);
});

test('reach is warm and soft: five triangle bells up an F major ninth that ring into a chord, a sub, a wobble, an echo and a breath', () => {
  const bells = tones('reach').filter((t) => t.d >= 1 && t.at < 0.5 && t.f > 300).sort((a, b) => a.at - b.at);
  assert.equal(bells.length, 5);
  assert.ok(bells.every((t) => t.w === 'tri' && !t.hold && t.d >= 1), 'triangle bells, left to ring');
  [349.2, 440, 523.3, 659.3, 784].forEach((f, i) => assert.ok(Math.abs(bells[i].f - f) < 4, `bell ${i + 1} is ${f.toFixed(0)} Hz`));
  const gaps = bells.slice(1).map((t, i) => t.at - bells[i].at);
  assert.ok(gaps.every((g) => g >= 0.1 && g <= 0.12), 'a tenth of a second apart: slower than reveal');
  assert.ok(bells[0].at + bells[0].d > bells[4].at + 0.5, 'so the first is still ringing when the last arrives: they bloom into a chord');
  const sub = tones('reach').find((t) => t.at === 0 && t.f < 300)!;
  assert.ok(Math.abs(sub.f * 2 - bells[0].f) <= 1 && sub.v < bells[0].v, 'a triangle an octave under the first, for warmth');
  const wobble = tones('reach').find((t) => t.vib)!;
  assert.ok(wobble.vib!.rate >= 3 && wobble.vib!.rate <= 8 && wobble.vib!.cents <= 30 && Math.abs(wobble.f - bells[4].f) <= 4, 'the last note wobbles a little');
  const echo = tones('reach').filter((t) => t.at >= 0.7).sort((a, b) => a.at - b.at);
  assert.equal(echo.length, 2);
  assert.ok(echo.every((t) => Math.abs(t.f - bells[4].f) <= 4) && falling(echo.map((t) => t.v)) && echo[0].v < bells[4].v, 'its echo comes back twice, fainter');
  const air = noises('reach');
  assert.equal(air.length, 1);
  assert.ok(air[0].f!.type === 'lowpass' && air[0].f!.freqEnd! <= 1200 && air[0].rise! >= 0.3 && air[0].v <= 0.1, 'a breath of lowpassed air, swelling');
  assert.ok(tones('reach').every((t) => t.w === 'tri'), 'only triangles: no edge');
  assert.ok(highest('reach') <= 800 && lowest('reach') >= 170);
  assert.ok(!tones('reach').some((t) => t.hold) && !noises('reach').some((n) => n.f?.type === 'highpass'), 'no flat beeps and no air on top');
  assert.ok(SFX9.reach.j <= 0.03, 'a chime keeps its pitch');
  // Reveal, the stand-in, goes up to 2 kHz in bells and has air above 6 kHz. Heal's run is short and sharp-edged and is C E G C.
  assert.ok(highest('reach') < Math.max(...toneParts(SFX34.reveal).map((t) => t.f)) / 2.4);
  assert.ok(Math.max(...tones('reach').map((t) => t.v)) * LEVELS9.reach < 0.2, 'no note is loud');
});

// ---------------------------------------------------------------- Billy's blip

const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
const range = (w: Speaker): [number, number] => [BLIPS[w].midi - BLIPS[w].spread, BLIPS[w].midi + BLIPS[w].spread];
/** Plays a blip with the first random number picking the semitone and the second the cents. */
const blipAt = (who: Speaker, pick: number) => play((ctx, dest) => {
  let k = 0;
  playBlip(ctx, dest, who, 0, () => (k++ === 0 ? pick : 0.5));
});

test("Billy's blip is a low rough square that drops at the end, unlike Steve's and Hopper's", () => {
  const b = BLIPS.billy;
  assert.equal(b.wave, 'p50', 'a square');
  const [lo, hi] = range('billy');
  assert.ok(lo >= 24 && hi <= 96, `${lo} to ${hi}`);
  assert.ok(hi <= range('lucas')[0], "no higher than the bottom of Lucas's low square");
  assert.ok(hi < range('steve')[0] && lo > range('hopper')[0], "under Steve's mid square and over Hopper's low saw");
  assert.equal(BLIPS.hopper.wave, 'saw');
  assert.notEqual(b.wave, BLIPS.hopper.wave);
  assert.ok(b.bend !== undefined && b.bend <= -2 && b.bend < (BLIPS.steve.bend ?? 0) && b.bend < (BLIPS.hopper.bend ?? 0), 'it drops by more than a semitone');
  assert.ok(b.rough && b.rough.rate >= 25 && b.rough.rate <= 70 && b.rough.cents >= 100 && b.rough.delay === 0, 'a fast, wide wobble: rough');
  for (const w of Object.keys(BLIPS) as Speaker[]) if (w !== 'billy') assert.equal(BLIPS[w].rough, undefined, `${w} is not rough`);
  assert.ok(b.attack <= 0.003 && b.attack < BLIPS.steve.attack, 'hard-edged');
  assert.ok(b.dur >= 0.05 && b.dur <= 0.1 && b.vol >= 0.1 && b.vol <= 0.3 && b.spread >= 1 && b.spread <= 4, 'timing and level');
  assert.ok(b.dur > BLIPS.steve.dur && b.dur < BLIPS.hopper.dur, 'slower than Steve and quicker than Hopper');
  // The stand-in was Steve's mid square a little lower: a p50 at 57 that bent down one semitone.
  assert.notDeepEqual(b, { wave: 'p50', midi: 57, spread: 2, dur: 0.06, vol: 0.2, attack: 0.004, bend: -1 }, 'not the stand-in');
  assert.notDeepEqual({ ...b, rough: undefined }, { ...BLIPS.steve, rough: undefined });
});

test("Billy's blip reaches the synth as a falling square at its level, and was set by how loud it sounds, not by peak", () => {
  const b = BLIPS.billy;
  const m = MEASURED_BILLY;
  assert.equal(print(b), m.print, "Billy's blip changed since it was measured: render it again and update MEASURED_BILLY");
  assert.ok(Math.abs(m.peak - b.vol) < 0.015, `measured at ${m.peak}, set to ${b.vol}`);
  assert.ok(Math.abs(m.energyDb - BLIP_MEDIAN_DB) <= 1.5, `carries ${m.energyDb} dB, against the others' ${BLIP_MEDIAN_DB}`);
  for (const [pick, semis] of [[0, -b.spread], [0.999, b.spread]] as const) {
    const out = blipAt('billy', pick);
    assert.equal(out.tones.length, 1);
    assert.equal(out.voices.length, 1);
    const [f0, f1] = out.tones[0].freq;
    assert.ok(Math.abs(Math.log2(f0 / hz(b.midi + semis))) < 15 / 1200, `starts on its note ${semis}`);
    assert.ok(Math.abs(f1 / f0 - 2 ** (b.bend! / 12)) < 1e-9, 'and ends three semitones under where it started');
    assert.ok(Math.abs(peakOf(out.voices[0]) - b.vol) < 1e-9, 'peaks at its volume');
  }
  const square = blipAt('billy', 0.5).tones[0].wave;
  assert.ok(Math.abs(square.imag[2]) < 1e-6 && Math.abs(square.real[2]) < 1e-6, "Billy's is a square: no even harmonics");
  // The growl is a second oscillator on the first one's pitch, which the stub does not count as a voice.
  assert.equal(blipAt('steve', 0.5).tones.length, 1);
});
