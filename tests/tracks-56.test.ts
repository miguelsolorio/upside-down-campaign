// The six effects, two stingers and two speech blips made for Levels 5 and 6 (stages 2.2 and 2.3): howl, skate, crack,
// taunt, rumble and gateShut; Max's and Steve's tag-in stingers; Steve's mid square and Hopper's low saw. They
// replace stand-ins that borrowed Level 3 and 4 effects and the old stinger and blip data, so these tests check
// that nothing is borrowed any more, that every number is in range, and that each sound is built the way its design
// says. Nobody listens to these in a test, so the rest is proof from numbers.
// Peak and clipping need a rendered signal, which Node can't make. They were measured with an offline render in
// the browser (renderWith in render.ts, the audio lab's E key) and are recorded below next to a fingerprint of the
// data that was measured. If a recipe, a cue or a blip changes, its fingerprint stops matching and the test says
// to measure it again. The stub context in this file plays the real code and checks the level that comes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS56, SFX56 } from '../src/audio/sfx_levels56.ts';
import type { Sfx56 } from '../src/audio/sfx_levels56.ts';
import { BLIPS, playBlip, playCue } from '../src/audio/cues.ts';
import { JINGLES, STINGERS } from '../src/audio/tracks/jingles.ts';
import type { Cue } from '../src/audio/tracks/jingles.ts';
import { note } from '../src/audio/tracks/theory.ts';
import { evalCoefs, midiToHz, sawCoefs } from '../src/audio/dsp.ts';
import { LIMITER } from '../src/audio/engine.ts';
import type { Ns, Part, Tn } from '../src/audio/sfx_kit.ts';
import type { Speaker } from '../src/core/types.ts';

const NEW = ['howl', 'skate', 'crack', 'taunt', 'rumble', 'gateShut'] as const;
const STAND_INS: Record<Sfx56, keyof typeof SFX> = {
  howl: 'roar', skate: 'lunge', crack: 'thud', taunt: 'petals', rumble: 'thud', gateShut: 'roar',
};

/** FNV-1a of the data, so a measured number can't outlive the thing it was measured from. */
function print(x: unknown): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(x)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------- what the offline renders said

/**
 * unit: the largest sample before the limiter with the effect alone at gain 1. peak: the largest sample after the
 * limiter at LEVELS56 (limiter reduction 0 dB and nothing clipped in every one). Targets: impacts near 0.5, the
 * finale a little above, taunt a hero's ability call, and skate and rumble quiet because they repeat.
 */
const MEASURED: Record<Sfx56, { print: string; unit: number; peak: number; target: number }> = {
  howl: { print: '00840a21', unit: 0.5514, peak: 0.499, target: 0.5 },
  skate: { print: '443836b7', unit: 1.438, peak: 0.302, target: 0.3 },
  crack: { print: '5f460fa5', unit: 1.0553, peak: 0.496, target: 0.5 },
  taunt: { print: 'f34a3e55', unit: 0.8278, peak: 0.447, target: 0.45 },
  rumble: { print: '541900dd', unit: 1.0296, peak: 0.278, target: 0.28 },
  gateShut: { print: 'b596c90d', unit: 1.697, peak: 0.594, target: 0.6 },
};
const MEASURED_CUES: Record<'max' | 'steve', { print: string; peak: number }> = {
  max: { print: 'c4ec8586', peak: 0.45 },
  steve: { print: 'f475e147', peak: 0.446 },
};
const MEASURED_BLIPS: Record<'steve' | 'hopper', { print: string; peak: number }> = {
  steve: { print: '45926e37', peak: 0.196 },
  hopper: { print: '13162a72', peak: 0.234 },
};

// ---------------------------------------------------------------- a stub of Web Audio that records what the synth asks for

interface Stub {
  param: { value: number; setValueAtTime(v: number): void; linearRampToValueAtTime(v: number): void; exponentialRampToValueAtTime(v: number): void };
  [k: string]: unknown;
}
interface Played {
  /** Every gain that feeds the destination: one per part, cue note or blip. */
  voices: number[][];
  /** The frequencies each pitched voice was set to, and the wave it was given. */
  tones: { freq: number[]; wave: { real: Float32Array; imag: Float32Array } }[];
}

function play(run: (ctx: BaseAudioContext, dest: AudioNode) => void): Played {
  const dest = {};
  const made: Record<string, unknown>[] = [];
  const param = (log: number[]): Stub['param'] => ({
    value: 0,
    setValueAtTime: (v) => { log.push(v); },
    linearRampToValueAtTime: (v) => { log.push(v); },
    exponentialRampToValueAtTime: (v) => { log.push(v); },
  });
  const node = (extra: Record<string, unknown>): Record<string, unknown> => {
    const n: Record<string, unknown> = {
      connect: (to: unknown) => { n.to = to; },
      disconnect: () => {}, start: () => {}, stop: () => {}, ...extra,
    };
    made.push(n);
    return n;
  };
  const ctx = {
    createGain: () => { const log: number[] = []; return node({ gain: param(log), log }); },
    createOscillator: () => {
      const freq: number[] = [];
      const n: Record<string, unknown> = node({
        frequency: param(freq), detune: { value: 0 }, freq, setPeriodicWave: (w: unknown) => { n.wave = w; },
      });
      return n;
    },
    createPeriodicWave: (real: Float32Array, imag: Float32Array) => ({ real, imag }),
    createBufferSource: () => node({ playbackRate: param([]), buffer: null, loop: false }),
    createBiquadFilter: () => node({ type: '', Q: { value: 0 }, frequency: param([]) }),
    createBuffer: (_c: number, length: number) => ({ length, copyToChannel: () => {} }),
  };
  run(ctx as unknown as BaseAudioContext, dest as unknown as AudioNode);
  return {
    voices: made.filter((n) => n.to === dest).map((n) => n.log as number[]),
    tones: made.filter((n) => n.wave).map((n) => ({ freq: n.freq as number[], wave: n.wave as Played['tones'][number]['wave'] })),
  };
}
const peakOf = (log: number[]): number => Math.max(...log);

// ---------------------------------------------------------------- the effects are their own

const tones = (id: Sfx56): Tn[] => SFX56[id].parts.filter((p): p is Tn => p.k === 't');
const noises = (id: Sfx56): Ns[] => SFX56[id].parts.filter((p): p is Ns => p.k === 'n');
const length = (id: Sfx56): number => Math.max(...SFX56[id].parts.map((p) => p.at + p.d));
const lowest = (id: Sfx56): number => Math.min(...tones(id).map((t) => Math.min(t.f, t.f2 ?? t.f)));
const highest = (id: Sfx56): number => Math.max(...tones(id).map((t) => Math.max(t.f, t.f2 ?? t.f)));

test('the six effects are registered, each with its own recipe, and none is a stand-in or shares a part', () => {
  for (const id of NEW) {
    assert.equal(SFX[id], SFX56[id], `${id} is the one the game plays`);
    const old = STAND_INS[id];
    assert.notEqual(SFX[id], SFX[old]);
    assert.notDeepEqual(SFX[id].parts, SFX[old].parts, `${id} sounds unlike ${old}`);
    for (const other of Object.keys(SFX) as (keyof typeof SFX)[]) {
      if (other === id) continue;
      assert.notEqual(SFX[id], SFX[other], `${id} shares a recipe with ${other}`);
      assert.notEqual(SFX[id].parts, SFX[other].parts, `${id} shares its parts with ${other}`);
      assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
    }
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
  assert.equal(new Set(NEW.map((id) => SFX56[id])).size, 6);
});

test('every part of the six is in range, at the pitch jitter and at a semitone either way', () => {
  for (const id of NEW) {
    const r = SFX56[id];
    assert.ok(r.j >= 0 && r.j <= 0.08, `${id} jitter ${r.j}`);
    assert.ok(r.parts.length >= 8, `${id} is built from parts, not a stub`);
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
  const span: Record<Sfx56, [number, number]> = {
    howl: [0.9, 1.3], skate: [0.25, 0.6], crack: [0.4, 0.8], taunt: [0.3, 0.7], rumble: [0.5, 0.95], gateShut: [1.5, 2.2],
  };
  for (const id of NEW) assert.ok(length(id) >= span[id][0] && length(id) <= span[id][1], `${id} runs ${length(id).toFixed(2)} s`);
  assert.ok(length('rumble') < 1, 'the rumble is under a second');
  assert.ok(length('gateShut') > 2 * length('crack') && length('gateShut') > 2 * 0.6, 'the shut is long next to a slam');
});

// ---------------------------------------------------------------- levels

test('levels are measured: every recipe matches what was rendered, and each peak is where it should be', () => {
  for (const id of NEW) {
    const m = MEASURED[id];
    assert.equal(print(SFX56[id]), m.print, `${id} changed since it was measured: render it again (audio lab, E) and update MEASURED`);
    assert.ok(LEVELS56[id] > 0.1 && LEVELS56[id] <= 1, `${id} level ${LEVELS56[id]}`);
    const peak = m.unit * LEVELS56[id];
    assert.ok(Math.abs(peak - m.peak) < 0.01, `${id} peaks at ${peak.toFixed(3)} at its level, the render said ${m.peak}`);
    assert.ok(Math.abs(m.peak - m.target) <= 0.03, `${id} peaks at ${m.peak}, wanted ${m.target}`);
    const limiter = 10 ** (LIMITER.threshold / 20);
    assert.ok(m.peak < limiter * 0.8, `${id} stays well under the limiter (${limiter.toFixed(2)})`);
  }
  // Impacts near 0.5 with the rest, the finale a little above, the two that repeat quiet.
  for (const id of ['howl', 'crack'] as const) assert.ok(MEASURED[id].peak >= 0.45 && MEASURED[id].peak <= 0.55, id);
  assert.ok(MEASURED.gateShut.peak > MEASURED.howl.peak && MEASURED.gateShut.peak <= 0.65);
  assert.ok(MEASURED.rumble.peak <= 0.3 && MEASURED.skate.peak <= 0.32, 'rumble and skate repeat, so they stay quiet');
  assert.ok(MEASURED.rumble.peak < MEASURED.taunt.peak && MEASURED.taunt.peak < MEASURED.crack.peak);
});

test('what the game plays is what was measured: the level in the mix is LEVELS56 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    const parts = SFX56[id].parts;
    assert.equal(out.voices.length, parts.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...parts.map((p) => p.v)) * LEVELS56[id]) < 1e-9, `${id} plays at its level`);
    assert.ok(top < 0.5, `${id} no voice is near full scale`);
  }
});

// ---------------------------------------------------------------- howl, skate, crack, taunt, rumble, gateShut

test('howl rises: a long pulse climbs an octave and more, wobbles, and a pack answers on top of it', () => {
  const lead = tones('howl').filter((t) => t.w === 'p25');
  const rise = lead.find((t) => t.at === 0)!;
  assert.ok(rise.f2! >= 2 * rise.f, `${rise.f} to ${rise.f2} Hz`);
  assert.ok(rise.d >= 0.3 && rise.hold, 'a held slide, not a pluck');
  const held = lead.filter((t) => t.vib);
  assert.ok(held.length >= 1 && held[0].vib!.rate >= 5 && held[0].vib!.rate <= 8, 'a slow wobble');
  // Louder going up, softer coming down.
  const steps = lead.filter((t) => t.hold).sort((a, b) => a.at - b.at);
  assert.ok(steps[1].v > steps[0].v && steps[steps.length - 1].v < steps[1].v, 'it swells, then thins');
  // The call ends lower than its peak: the last lead note sags.
  const last = [...lead].sort((a, b) => a.at - b.at).pop()!;
  assert.ok(last.f2! < last.f && last.f2! < Math.max(...lead.map((t) => t.f2 ?? t.f)) * 0.6, 'it sags at the end');
  // Whistle and pack: other voices above the lead, starting later.
  assert.ok(tones('howl').filter((t) => t.w === 'tri').length >= 3, 'a triangle whistle an octave up');
  const pack = tones('howl').filter((t) => t.w === 'p12' && t.at >= 0.3);
  assert.ok(pack.length >= 4, 'two voices answer');
  assert.ok(pack.every((t) => t.v < Math.min(...lead.filter((l) => l.hold).map((l) => l.v))), 'the pack is further off, so quieter');
  assert.ok(noises('howl').some((n) => n.rise !== undefined && n.rise >= 0.2 && n.at === 0), 'a breath in');
  assert.ok(noises('howl').some((n) => n.at >= 0.7), 'and a breath out');
});

test('howl is nothing like the roar: no tone under 200 Hz, where the roar lives, and the roar has nothing above 130', () => {
  assert.ok(lowest('howl') >= 200, `lowest ${lowest('howl')}`);
  assert.ok(highest('howl') >= 1000 && highest('howl') <= 1400, 'the whistle tops out near 1.2 kHz');
  for (const t of SFX.roar.parts.filter((p): p is Tn => p.k === 't')) assert.ok(t.f <= 130, 'the roar stays low');
  for (const n of noises('howl')) assert.ok(n.f?.type === 'bandpass' && n.f.freq >= 600, 'only bands of air');
  assert.ok(length('howl') < length('gateShut') && length('howl') < SFX.roar.parts.reduce((m, p) => Math.max(m, p.at + p.d), 0), 'shorter than the roar');
});

test('skate rolls: a hiss, a rasp under it, a regular grit of ticks and two pavement joints', () => {
  const grit = noises('skate').filter((n) => n.m === 7 && n.d <= 0.03);
  assert.ok(grit.length >= 8, `${grit.length} ticks`);
  const gaps = grit.slice(1).map((n, i) => n.at - grit[i].at);
  assert.ok(gaps.every((g) => Math.abs(g - gaps[0]) < 0.002 && g > 0.02 && g < 0.05), 'evenly spaced, a thirtieth of a second apart');
  assert.ok(noises('skate').some((n) => n.m === 15 && n.d >= 0.35 && n.f?.type === 'bandpass'), 'wheel hiss');
  assert.ok(noises('skate').some((n) => n.m === 7 && n.d >= 0.35 && n.f?.type === 'lowpass' && n.f.freq <= 450), 'concrete rasp');
  // Each joint is a thunk and a click for the front wheel, then again for the back one.
  const thunks = tones('skate').filter((t) => t.f2! < t.f).map((t) => t.at).sort((a, b) => a - b);
  assert.equal(thunks.length, 4);
  assert.ok(thunks[1] - thunks[0] > 0.03 && thunks[1] - thunks[0] < 0.06 && thunks[3] - thunks[2] > 0.03 && thunks[3] - thunks[2] < 0.06, 'wheelbase');
  assert.ok(thunks[2] - thunks[0] >= 0.1, 'two joints');
  assert.ok(lowest('skate') >= 60, 'a board has no sub bass');
  assert.ok(SFX56.skate.j >= 0.05, 'it plays every dash, so the pitch moves');
});

test('crack breaks: a knock, eight splits that thin out, grit sliding down, three chunks falling lower and softer, dust', () => {
  const knock = tones('crack').find((t) => t.at === 0)!;
  assert.ok(knock.w === 'tri' && knock.f >= 400 && knock.f2! <= 250 && knock.d <= 0.1, 'a wooden knock');
  const splits = noises('crack').filter((n) => n.m === 7 && n.d <= 0.03);
  assert.equal(splits.length, 8);
  const gaps = splits.map((n, i) => (i ? n.at - splits[i - 1].at : 0)).slice(1);
  assert.ok(gaps[gaps.length - 1] > 2 * gaps[0], 'they thin out');
  assert.ok(splits.every((n, i) => !i || n.v < splits[i - 1].v), 'and soften');
  assert.ok(splits[splits.length - 1].at <= 0.35 && splits[0].at < 0.05);
  const grit = noises('crack').find((n) => n.d >= 0.4)!;
  assert.ok(grit.f!.type === 'bandpass' && grit.f!.freqEnd! < grit.f!.freq / 2, 'grit slides down');
  const chunks = tones('crack').filter((t) => t.at >= 0.1).sort((a, b) => a.at - b.at);
  assert.equal(chunks.length, 3);
  chunks.forEach((c, i) => {
    if (i) assert.ok(c.f < chunks[i - 1].f && c.v < chunks[i - 1].v, `chunk ${i + 1} is lower and softer`);
  });
  assert.ok(noises('crack').some((n) => n.f?.type === 'highpass' && n.f.freq >= 4000 && n.d >= 0.3), 'dust');
  // Thud is the heavy low one: its boom drops to 30 Hz. The wall has none of that.
  assert.ok(lowest('crack') >= 38 && Math.min(...SFX.thud.parts.filter((p): p is Tn => p.k === 't').map((t) => t.f2 ?? t.f)) <= 35);
});

test('taunt is a brass call: three notes up a major triad, a stacked pulse, tongued, with a sag at the end', () => {
  const sq = tones('taunt').filter((t) => t.w === 'p50').sort((a, b) => a.at - b.at);
  const thin = tones('taunt').filter((t) => t.w === 'p25');
  assert.equal(sq.length, 4, 'three notes, the third in two pieces (a scoop and a sag)');
  assert.equal(thin.length, sq.length, 'a narrower pulse stacked on every square note');
  sq.forEach((t, i) => assert.ok(thin[i].at === t.at && thin[i].f === t.f && thin[i].d === t.d && thin[i].v < t.v, `note ${i + 1} is doubled`));
  const heads = [sq[0], sq[1], sq[2]].map((t) => t.f2!);
  const [g, c, e] = [392, 523, 659];
  heads.forEach((f, i) => assert.ok(Math.abs(f - [g, c, e][i]) < 8, `note ${i + 1} lands near ${[g, c, e][i]} Hz`));
  assert.ok(sq[0].f < sq[0].f2! && sq[1].f < sq[1].f2!, 'each of the first two scoops up into the note');
  const last = sq[3];
  assert.ok(last.vib && last.f2! < last.f && last.d >= 0.25, 'the held note wobbles and sags');
  assert.ok(noises('taunt').filter((n) => n.d <= 0.04 && n.f?.type === 'bandpass').length >= 3, 'a blat of breath on each note');
  assert.ok(tones('taunt').some((t) => t.w === 'tri' && t.f <= 330), 'a triangle an octave down');
  assert.ok(lowest('taunt') >= 150 && highest('taunt') <= 1400, 'bright mids');
  assert.ok(sq.every((t) => t.hold), 'held notes: a horn, not a pluck');
});

test('rumble is soft and low: it swells in, beats, stays under 300 Hz and is gone in under a second', () => {
  for (const t of tones('rumble')) assert.ok(Math.max(t.f, t.f2 ?? t.f) <= 130, `tone ${t.f} is low`);
  for (const n of noises('rumble')) assert.ok(n.f?.type === 'lowpass' && n.f.freq <= 300, 'noise is lowpassed under 300 Hz');
  // No sharp start: everything near the start is noise that swells in or a tone that has not begun.
  for (const p of SFX56.rumble.parts) if (p.at < 0.1) assert.ok(p.k === 'n' && p.rise !== undefined && p.rise >= 0.2, 'it swells in');
  const pair = tones('rumble').filter((t) => t.w === 'tri' && t.hold);
  assert.equal(pair.length, 2);
  const beat = Math.abs(pair[0].f - pair[1].f);
  assert.ok(beat >= 3 && beat <= 10, `the pair beats at ${beat} Hz`);
  assert.ok(Math.abs(pair[0].f2! - pair[1].f2!) >= 1, 'and keeps beating as they sink');
  assert.ok(pair.every((t) => t.f2! < t.f), 'they sink');
  assert.ok(tones('rumble').some((t) => t.w === 'p25' && t.vib && t.f >= 2 * 50), 'a buzz a small speaker can hear');
  assert.ok(length('rumble') < 1);
  // Quiet enough to repeat every ten seconds: no part is a loud knock.
  assert.ok(Math.max(...SFX56.rumble.parts.map((p) => p.v)) * LEVELS56.rumble < 0.2);
});

test('gateShut is the big low slam: deeper than thud, long, with a draining top, aftershocks, debris and a throbbing tail', () => {
  assert.ok(lowest('gateShut') <= 26 && lowest('gateShut') < lowest('crack'), 'the boom falls to 26 Hz');
  const boom = tones('gateShut').find((t) => t.at === 0 && t.f >= 90)!;
  assert.ok(boom.w === 'tri' && boom.f2! <= 30 && boom.d >= 0.8 && boom.v >= 0.7, 'a big boom');
  const drain = tones('gateShut').find((t) => t.w === 'p50')!;
  assert.ok(drain.f >= 500 && drain.f2! <= 100 && drain.d >= 0.7 && drain.vib, 'the rift draining out of the top');
  assert.ok(noises('gateShut').filter((n) => n.m === 7 && n.d <= 0.02).length >= 6, 'debris');
  const knocks = tones('gateShut').filter((t) => t.at >= 0.5 && t.at < 0.9 || t.at === 0.95);
  assert.equal(knocks.length, 2, 'two aftershocks');
  assert.ok(knocks[1].v < knocks[0].v && knocks[0].v < boom.v, 'each softer');
  const tail = tones('gateShut').filter((t) => t.at >= 0.9 && t.f <= 50 && t.f2 !== undefined && t.d >= 0.9);
  assert.equal(tail.length, 2, 'a tail of two sub tones');
  assert.ok(Math.abs(tail[0].f - tail[1].f) <= 4 && tail[0].f !== tail[1].f, 'a few hertz apart, so they throb');
  assert.ok(length('gateShut') - Math.min(...tail.map((t) => t.at)) >= 0.85, 'and ring out past the impact');
  assert.ok(noises('gateShut').some((n) => n.d >= 1.4 && n.f?.type === 'lowpass' && n.f.freqEnd! <= 80), 'a long low rumble');
  assert.ok(length('gateShut') > length('rumble') * 2 && SFX56.gateShut.parts.length > SFX.slam.parts.length, 'bigger than the rumble and than slam');
  assert.ok(MEASURED.gateShut.peak > MEASURED.rumble.peak * 2);
});

// ---------------------------------------------------------------- the stingers

const HEROES = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve'] as const;
const melody = (c: Cue) => c.notes.filter((n) => n.w !== 'tri' || c === STINGERS.eleven || c === STINGERS.will);

test("Max's and Steve's tag-in stingers are two to four notes, in range, short, and unlike every other", () => {
  for (const h of ['max', 'steve'] as const) {
    const c = STINGERS[h];
    const tune = melody(c);
    assert.ok(tune.length >= 2 && tune.length <= 4, `${h} has ${tune.length} notes`);
    assert.ok(c.length > 0.3 && c.length < 1.1, `${h} runs ${c.length.toFixed(2)} s: a tag-in stays short`);
    assert.ok(c.duck > 0 && c.duck <= c.length && c.duckDb >= 3 && c.duckDb <= 9, `${h} ducks the music`);
    assert.ok(c.gain >= 0.5 && c.gain <= 2, `${h} gain ${c.gain}`);
    for (const n of c.notes) {
      const [lo, hi] = [Math.min(n.midi, n.to ?? n.midi), Math.max(n.midi, n.to ?? n.midi)];
      assert.ok(lo >= 36 && hi <= 96, `${h} note ${n.midi}`);
      assert.ok(n.at >= 0 && n.dur > 0 && n.vol > 0 && n.vol <= 0.35, `${h} note timing and volume`);
      assert.ok(n.at + n.dur <= c.length, `${h} note ends inside the cue`);
    }
    for (const x of c.hits) assert.ok(x.at >= 0 && x.dur > 0 && x.vol > 0 && x.vol <= 0.2 && x.freq >= 20 && x.freq <= 20000, `${h} hit`);
    const shape = (k: Cue): string => JSON.stringify(k.notes.map((n) => [n.w, n.midi]));
    for (const other of [...HEROES.filter((o) => o !== h), 'scare'] as const) {
      assert.notEqual(shape(STINGERS[other]), shape(c), `${h} is not ${other}`);
      if (other !== 'scare') assert.notEqual(STINGERS[other].notes[0].midi, c.notes[0].midi, `${h} does not start where ${other} starts`);
    }
    // The stand-ins were A4 and E5 for Max, D4 and A4 for Steve.
    assert.notDeepEqual(tune.map((n) => n.midi), h === 'max' ? [note('A4'), note('E5')] : [note('D4'), note('A4')]);
  }
  assert.equal(new Set(HEROES.map((h) => STINGERS[h])).size, 7);
});

test('Max is quick and dry: short plucks up a minor seventh on the 25 percent pulse, a pop, and no bass', () => {
  const c = STINGERS.max;
  assert.equal(c.notes.length, 4);
  assert.ok(c.notes.every((n) => n.w === 'p25' && n.ring && !n.vib && n.to === undefined), 'plucks, no wobble, no slide');
  const pcs = c.notes.map((n) => (n.midi - c.notes[0].midi) % 12);
  assert.deepEqual(pcs, [0, 3, 7, 10], 'a minor seventh chord, root first');
  assert.ok(c.notes.every((n, i) => !i || n.midi > c.notes[i - 1].midi), 'it only goes up');
  assert.ok(c.notes.slice(0, 3).every((n) => n.dur <= 0.1), 'three quick notes');
  assert.ok(c.notes[3].at < 0.3 && c.notes[3].at + c.notes[3].dur < 0.5, 'and it is over in half a second');
  assert.equal(c.hits.length, 1, 'one pop');
  assert.ok(c.hits[0].at === 0 && c.hits[0].filter === 'highpass' && c.hits[0].dur <= 0.03, 'a click on the first note');
  assert.ok(!c.notes.some((n) => n.w === 'tri'), 'nothing underneath');
  assert.equal(BLIPS.max.wave, 'p25', "the same pulse as Max's voice");
});

test('Steve is warm and a little goofy: a scoop, a step, a held note with a wobble, mid square over a triangle bass', () => {
  const c = STINGERS.steve;
  const tune = melody(c);
  assert.equal(tune.length, 3);
  assert.ok(tune.every((n) => n.w === 'p50'), "Steve's square");
  assert.ok(tune[0].to! - tune[0].midi >= 3, 'the first note scoops up a third or more');
  assert.ok(tune[2].vib && tune[2].dur > tune[1].dur * 1.5, 'the last is held and wobbles');
  assert.ok(tune.every((n, i) => !i || n.midi > (tune[i - 1].to ?? tune[i - 1].midi)), 'it climbs');
  const bass = c.notes.filter((n) => n.w === 'tri');
  assert.equal(bass.length, 1);
  assert.ok(bass[0].midi <= tune[0].midi - 12 && bass[0].at === 0 && bass[0].dur >= tune[2].at + tune[2].dur - 0.01, 'a bass under all of it');
  assert.equal(c.hits.length, 0, 'no noise: warm');
  assert.equal(BLIPS.steve.wave, 'p50');
});

test('the stingers were measured: the data is what was rendered, and both peak with the rest of the tag-ins', () => {
  for (const h of ['max', 'steve'] as const) {
    const m = MEASURED_CUES[h];
    assert.equal(print(STINGERS[h]), m.print, `${h}'s stinger changed since it was measured: render it again and update MEASURED_CUES`);
    assert.ok(m.peak >= 0.35 && m.peak <= 0.55, `${h} peaks at ${m.peak}, between Will's 0.38 and Mike's 0.50`);
    const out = play((ctx, dest) => playCue(ctx, dest, STINGERS[h], 0));
    assert.equal(out.voices.length, STINGERS[h].notes.length + STINGERS[h].hits.length, `${h} makes one voice per note and hit`);
    assert.equal(out.tones.length, STINGERS[h].notes.length);
    for (const t of out.tones) for (const f of t.freq) assert.ok(f >= 20 && f <= 4000, `${h} plays ${f} Hz`);
    for (const v of out.voices) assert.ok(peakOf(v) <= 0.35 * STINGERS[h].gain + 1e-9, `${h} no voice is loud on its own`);
  }
  for (const id of Object.keys(JINGLES)) assert.ok(JINGLES[id as keyof typeof JINGLES].gain > 0);
});

// ---------------------------------------------------------------- the speech blips

const hz = (m: number): number => midiToHz(m);
const range = (w: Speaker): [number, number] => [BLIPS[w].midi - BLIPS[w].spread, BLIPS[w].midi + BLIPS[w].spread];
/** Plays a blip with the first random number picking the semitone and the second the cents. */
const blipAt = (who: Speaker, pick: number) => play((ctx, dest) => {
  let k = 0;
  playBlip(ctx, dest, who, 0, () => (k++ === 0 ? pick : 0.5));
});

test("Steve's blip is a mid square and Hopper's a low saw, and both are in range", () => {
  assert.equal(BLIPS.steve.wave, 'p50', 'mid square');
  assert.equal(BLIPS.hopper.wave, 'saw', 'low saw');
  for (const w of ['steve', 'hopper'] as const) {
    const b = BLIPS[w];
    const [lo, hi] = range(w);
    assert.ok(lo >= 24 && hi <= 96, `${w} sits between ${lo} and ${hi}`);
    assert.ok(b.dur >= 0.03 && b.dur <= 0.15 && b.attack > 0 && b.attack < b.dur / 2, `${w} timing`);
    assert.ok(b.vol >= 0.1 && b.vol <= 0.3 && b.spread >= 1 && b.spread <= 4, `${w} level and spread`);
    assert.ok(b.bend !== undefined && b.bend <= 0 && b.bend >= -3, `${w} droops a little`);
  }
  // Steve's square sits between Lucas's low one and Mike's, with no pitch in common with either.
  const [slo, shi] = range('steve');
  assert.ok(range('lucas')[1] < slo && shi < range('mike')[0], 'a ladder: Lucas, Steve, Mike');
  assert.equal(BLIPS.lucas.wave, 'p50');
  assert.equal(BLIPS.mike.wave, 'p50');
  // Hopper is the lowest voice there is, and the only saw.
  const others = (Object.keys(BLIPS) as Speaker[]).filter((w) => w !== 'hopper');
  for (const w of others) {
    assert.ok(BLIPS[w].midi > BLIPS.hopper.midi, `${w} is above Hopper`);
    assert.notEqual(BLIPS[w].wave, 'saw', `${w} is not a saw`);
  }
  assert.ok(BLIPS.hopper.dur > BLIPS.steve.dur && BLIPS.steve.dur > BLIPS.mike.dur, 'Hopper is slower than Steve, who is slower than Mike');
  // The stand-ins were a p50 at 50 for Hopper and at 62 for Steve.
  assert.notEqual(BLIPS.hopper.wave, 'p50');
  assert.notEqual(BLIPS.steve.midi, 62);
});

test('the blips reach the synth as the voice they claim, droop a semitone, and peak where they were measured', () => {
  for (const w of ['steve', 'hopper'] as const) {
    const b = BLIPS[w];
    const m = MEASURED_BLIPS[w];
    assert.equal(print(b), m.print, `${w}'s blip changed since it was measured: render it again and update MEASURED_BLIPS`);
    assert.ok(Math.abs(m.peak - b.vol) < 0.01, `${w} was measured at ${m.peak}, set to ${b.vol}`);
    for (const [pick, semis] of [[0, -b.spread], [0.999, b.spread]] as const) {
      const out = blipAt(w, pick);
      assert.equal(out.tones.length, 1);
      assert.equal(out.voices.length, 1);
      const [f0, f1] = out.tones[0].freq;
      assert.ok(Math.abs(Math.log2(f0 / hz(b.midi + semis))) < 15 / 1200, `${w} starts on its note ${semis}`);
      assert.ok(Math.abs(f1 / f0 - 2 ** (b.bend! / 12)) < 1e-9, `${w} ends a semitone under where it started`);
      assert.ok(Math.abs(peakOf(out.voices[0]) - b.vol) < 1e-9, `${w} peaks at its volume`);
    }
  }
  // A blip with no bend has no glide: Mike's is a flat tone.
  assert.equal(blipAt('mike', 0.5).tones[0].freq.length, 1);
  // Hopper's voice is a real sawtooth: harmonic n at 1/n, sine only, a falling ramp.
  const saw = blipAt('hopper', 0.5).tones[0].wave;
  for (let n = 1; n <= 12; n++) {
    assert.ok(Math.abs(saw.imag[n] * n - saw.imag[1]) < 1e-6 && saw.real[n] === 0, `harmonic ${n}`);
  }
  const square = blipAt('steve', 0.5).tones[0].wave;
  assert.ok(Math.abs(square.imag[2]) < 1e-6 && Math.abs(square.real[2]) < 1e-6, "Steve's is a square: no even harmonics");
});

test('the sawtooth table is a falling ramp', () => {
  const c = sawCoefs(1500);
  for (const [theta, want] of [[Math.PI / 2, 0.5], [Math.PI, 0], [(3 * Math.PI) / 2, -0.5], [0.8, 1 - 0.8 / Math.PI]] as const) {
    assert.ok(Math.abs(evalCoefs(c, theta) - want) < 0.02, `at ${theta.toFixed(2)}`);
  }
  assert.equal(c.imag[0], 0);
  assert.equal(c.real.every((x) => x === 0), true);
});
