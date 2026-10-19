// What Audio made for stages 5.1 and 5.2 (docs/level-14.md, docs/level-15.md): the Commander's whistle, the clang of a hit on a riot shield,
// the shield breaking for good and a twin Demogorgon dropping into the void. They replace stand-ins, so these tests check that every number is in
// range, that each sound is built the way its comment says, and that each peaks where it should. Like audio-ch4.test.ts they render in Node on the
// offline context in offline-audio.ts, and an effect's level is the median peak over eight starts, because a noise burst's peak depends on where
// in the noise loop it starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS1415, SFX1415 } from '../src/audio/sfx_level1415.ts';
import type { Sfx1415 } from '../src/audio/sfx_level1415.ts';
import { LIMITER } from '../src/audio/engine.ts';
import { renderWith } from '../src/audio/render.ts';
import type { Ns, Recipe, Tn } from '../src/audio/sfx_kit.ts';
import type { SfxId } from '../src/core/types.ts';
import { installOfflineAudio } from './offline-audio.ts';
import { share } from './audio-analysis.ts';
import { peakOf, play } from './audio-helpers.ts';

installOfflineAudio();

const NEW = ['whistle', 'clang', 'shieldBreak', 'fall'] as const;
/** The peak after the limiter each should have, median over eight starts. Impacts near 0.5, tones near 0.3, a long whoosh near 0.4. */
const TARGET: Record<Sfx1415, number> = { whistle: 0.3, clang: 0.45, shieldBreak: 0.5, fall: 0.4 };
const toneParts = (r: Recipe): Tn[] => r.parts.filter((p): p is Tn => p.k === 't');
const noiseParts = (r: Recipe): Ns[] => r.parts.filter((p): p is Ns => p.k === 'n');
const tones = (id: Sfx1415): Tn[] => toneParts(SFX1415[id]);
const lengthOf = (r: Recipe): number => Math.max(...r.parts.map((p) => p.at + p.d));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
};
const renderSfx = (id: SfxId, shift = 0) => renderWith(lengthOf(SFX[id]) + 0.15, (ctx, g, t0) => playSfx(ctx, g.sfx, id, t0 + shift));

test('the four effects are registered, each with its own recipe, and none shares a part with any other sound', () => {
  assert.deepEqual(Object.keys(SFX1415).sort(), [...NEW].sort());
  assert.deepEqual(Object.keys(LEVELS1415).sort(), [...NEW].sort());
  for (const id of NEW) {
    assert.equal(SFX[id], SFX1415[id], `${id} is the one the game plays`);
    assert.ok(SFX1415[id].parts.length >= 4, `${id} is built from parts, not a stand-in`);
    for (const other of Object.keys(SFX) as SfxId[]) {
      if (other !== id) assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
    }
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
});

test('every part is in range at the pitch jitter, each effect runs its length, and each is built the way its design says', () => {
  const span: Record<Sfx1415, [number, number]> = { whistle: [0.5, 0.65], clang: [0.3, 0.4], shieldBreak: [0.45, 0.6], fall: [0.9, 1.1] };
  for (const id of NEW) {
    const r = SFX1415[id];
    assert.ok(lengthOf(r) >= span[id][0] && lengthOf(r) <= span[id][1], `${id} runs ${lengthOf(r).toFixed(2)} s`);
    assert.ok(r.j >= 0 && r.j <= 0.04, `${id} jitter ${r.j}`);
    for (const p of r.parts) {
      assert.ok(p.d > 0 && p.at >= 0 && p.v > 0 && p.v <= 1, `${id} part timing or volume`);
      if (p.k === 't') for (const f of [p.f, p.f2 ?? p.f]) assert.ok(f * 0.9 >= 20 && f * 1.1 <= 8000, `${id} tone ${f}`);
      else if (p.f) for (const f of [p.f.freq, p.f.freqEnd ?? p.f.freq]) assert.ok(f >= 20 && f <= 20000, `${id} filter ${f}`);
    }
  }
  // whistle: held tones between 2.6 and 3 kHz under a fast vibrato, two blasts, the second longer.
  const w = tones('whistle');
  assert.ok(w.every((t) => t.hold && t.vib !== undefined && t.vib.rate >= 20 && Math.min(t.f, t.f2 ?? t.f) >= 2600 && Math.max(t.f, t.f2 ?? t.f) <= 3000));
  assert.ok(new Set(w.map((t) => t.at)).size === 2 && Math.max(...w.map((t) => t.d)) > 2 * Math.min(...w.map((t) => t.d)));
  // clang: the partials of a struck plate, 1 : 2.76 : 5.4, and no thud under them.
  const c = tones('clang').filter((t) => t.w === 'tri').map((t) => t.f).sort((a, b) => a - b);
  assert.ok(Math.abs(c[1] / c[0] - 2.76) < 0.02 && Math.abs(c[2] / c[0] - 5.4) < 0.02, `partials ${c}`);
  assert.ok(Math.min(...tones('clang').map((t) => Math.min(t.f, t.f2 ?? t.f))) >= 600);
  // shieldBreak: a clunk that falls to 62 Hz, then pings that each come later and lower.
  const pings = tones('shieldBreak').filter((t) => t.f >= 1400).sort((a, b) => a.at - b.at);
  assert.ok(pings.length >= 6 && pings.every((p, i) => i === 0 || (p.at > (pings[i - 1] as Tn).at && p.f < (pings[i - 1] as Tn).f)), 'six pings falling away');
  assert.equal(Math.min(...tones('shieldBreak').map((t) => t.f2 ?? t.f)), 62);
  // fall: everything falls.
  assert.ok(tones('fall').every((t) => (t.f2 ?? t.f) < t.f * 0.2), 'the cry slides down to nothing');
  assert.ok(noiseParts(SFX1415.fall).every((n) => n.f !== undefined && (n.f.freqEnd ?? n.f.freq) < n.f.freq * 0.3), 'and the wind with it');
});

test('every effect renders, is gone when its recipe ends, and peaks where it should with the limiter idle', async () => {
  const limiter = 10 ** (LIMITER.threshold / 20);
  for (const id of NEW) {
    assert.ok(LEVELS1415[id] > 0.1 && LEVELS1415[id] <= 1, `${id} level ${LEVELS1415[id]}`);
    const shifts = noiseParts(SFX1415[id]).length ? [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * 0.00137) : [0];
    const runs = await Promise.all(shifts.map((s) => renderSfx(id, s)));
    for (const r of runs) assert.ok(r.samples.every(Number.isFinite) && r.metrics.clipped === 0, `${id} renders clean`);
    const tail = (runs[0] as (typeof runs)[number]).samples.slice(Math.round((lengthOf(SFX1415[id]) + 0.05) * 44100));
    assert.ok(Math.max(...tail.map(Math.abs)) < 0.01, `${id} is gone when its recipe ends`);
    const peak = median(runs.map((r) => r.metrics.peak));
    assert.ok(Math.abs(peak - TARGET[id]) <= 0.025, `${id} peaks at ${peak.toFixed(3)}, wanted ${TARGET[id]}`);
    assert.ok(Math.max(...runs.map((r) => r.metrics.peak)) < limiter * 0.8 && Math.max(...runs.map((r) => r.metrics.limiterDb)) < 0.01, `${id} leaves the limiter alone`);
  }
  assert.ok(TARGET.shieldBreak >= 0.45 && TARGET.clang >= 0.4, 'the two metal sounds are impacts');
  assert.equal(Math.min(...NEW.map((id) => TARGET[id])), TARGET.whistle, 'the whistle is a tone, the quietest');
}, { timeout: 60000 });

test('what the game plays is what was measured: the level in the mix is LEVELS1415 times the recipe', () => {
  for (const id of NEW) {
    const out = play((ctx, dest) => playSfx(ctx, dest, id, 0));
    assert.equal(out.voices.length, SFX1415[id].parts.length, `${id} makes one voice per part`);
    const top = Math.max(...out.voices.map(peakOf));
    assert.ok(Math.abs(top - Math.max(...SFX1415[id].parts.map((p) => p.v)) * LEVELS1415[id]) < 1e-9 && top < 0.5, `${id} plays at its level`);
  }
});

test('each sits in its own part of the spectrum: the whistle is all high, the clang rings mid, the fall is low and the break is bright', async () => {
  const [whistle, clang, brk, fall] = await Promise.all(NEW.map(async (id) => (await renderSfx(id)).samples));
  assert.ok(share(whistle as Float32Array, 1440, 22050) > 0.95, 'whistle above 1.4 kHz');
  assert.ok(share(clang as Float32Array, 360, 1440) > 0.6 && share(clang as Float32Array, 0, 360) < 0.05, 'clang between 360 Hz and 1.4 kHz, no thud');
  assert.ok(share(brk as Float32Array, 1440, 22050) > 0.3 && share(brk as Float32Array, 90, 180) > 0.2, 'shieldBreak: a clunk and a bright clatter');
  assert.ok(share(fall as Float32Array, 0, 1440) > 0.8, 'fall below 1.4 kHz');
}, { timeout: 60000 });
