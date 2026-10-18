// The Hellfire solo (src/solo): the judge's windows, the streak and the ring, the three-miss end, the bot, the charts staying in
// time with the `solo` track, and the scene that drives them. The track's own checks are in tracks-solo.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, barSeconds } from '../src/audio/tracks/compile.ts';
import { SOLO, SOLO_SECTIONS } from '../src/audio/tracks/solo.ts';
import { CHARTS, GEM_STEPS, LANE_SPLIT, chartOf as readChart, laneOf, riff, rooftop } from '../src/solo/chart.ts';
import type { Chart, Lane } from '../src/solo/chart.ts';
import { HIT_WINDOW, MAX_MISSES, PERFECT_WINDOW, RING_MAX, RING_START, createJudge, ringRadius } from '../src/solo/judge.ts';
import { botInput, botPresses, createSoloBot, runBot } from '../src/solo/bot.ts';
import { createSolo } from '../src/solo/index.ts';
import type { SoloInput } from '../src/solo/index.ts';
import type { Action } from '../src/core/bindings.ts';

/** A chart of notes you place by hand, one lane and frame each. */
const chartOf = (notes: [Lane, number][], length = 600): Chart => ({
  id: 'riff', bar: 0, bars: 4, length, notes: notes.map(([lane, frame]) => ({ lane, frame })).sort((a, b) => a.frame - b.frame),
});

// ---------------------------------------------------------------- the windows

test('a press within 6 frames of a note is a hit, early or late, and 7 frames is nothing', () => {
  for (const off of [-6, -5, -3, 0, 3, 5, 6]) {
    const j = createJudge(chartOf([[0, 100]]));
    assert.notEqual(j.press(0, 100 + off), 'empty', `${off} frames off`);
    assert.equal(j.hits, 1);
  }
  for (const off of [-7, -8, 7, 12]) {
    const j = createJudge(chartOf([[0, 100]]));
    assert.equal(j.press(0, 100 + off), 'empty', `${off} frames off`);
    assert.equal(j.hits, 0);
  }
  assert.deepEqual([HIT_WINDOW, PERFECT_WINDOW, MAX_MISSES], [6, 2, 3]);
});

test('within 2 frames is a perfect, 3 to 6 is a plain hit', () => {
  for (const [off, want] of [[0, 'perfect'], [-2, 'perfect'], [2, 'perfect'], [-3, 'hit'], [3, 'hit'], [-6, 'hit'], [6, 'hit']] as const) {
    const j = createJudge(chartOf([[1, 100]]));
    assert.equal(j.press(1, 100 + off), want, `${off} frames off`);
    assert.equal(j.perfects, want === 'perfect' ? 1 : 0);
  }
});

test('a press on the wrong lane is nothing, and does not use up the note', () => {
  const j = createJudge(chartOf([[2, 100]]));
  assert.equal(j.press(0, 100), 'empty');
  assert.equal(j.press(1, 100), 'empty');
  assert.equal(j.press(2, 100), 'perfect');
});

test('a note passes its window on the seventh frame: it is still a hit at 6 and a miss at 7', () => {
  const j = createJudge(chartOf([[0, 100]]));
  assert.deepEqual(j.advance(106), [], 'frame 106 is the last frame of the window');
  assert.equal(j.stateOf(0), 'pending');
  assert.deepEqual(j.advance(107), [0]);
  assert.equal(j.stateOf(0), 'miss');
  assert.equal(j.misses, 1);
  assert.equal(j.press(0, 107), 'empty', 'a miss cannot be struck late');
  const late = createJudge(chartOf([[0, 100]]));
  late.advance(106);
  assert.equal(late.press(0, 106), 'hit', 'a press on the last frame still counts, once advance has run for that frame');
  assert.deepEqual(late.advance(107), []);
});

test('a note is struck once, and a press takes the nearest note in its lane, the earlier one on a tie', () => {
  const j = createJudge(chartOf([[0, 100], [0, 110]]));
  assert.equal(j.press(0, 103), 'hit', 'closer to the first');
  assert.equal(j.stateOf(0), 'hit');
  assert.equal(j.stateOf(1), 'pending');
  const k = createJudge(chartOf([[0, 100], [0, 110]]));
  assert.equal(k.press(0, 105), 'hit', 'a tie goes to the note that is passing');
  assert.equal(k.stateOf(0), 'hit');
  assert.equal(k.press(0, 105), 'hit', 'and the second press takes the next note');
  assert.equal(k.stateOf(1), 'hit');
  assert.equal(k.press(0, 105), 'empty', 'with no note left there is nothing to strike');
});

test('a press on an empty lane costs nothing: no miss, no streak lost, no ring lost', () => {
  const j = createJudge(chartOf([[0, 100], [0, 200]]));
  j.press(0, 100);
  const before = [j.streak, j.ring, j.misses, j.missesInRow];
  for (let f = 0; f < 600; f += 7) { j.press(1, f); j.press(2, f); }
  assert.deepEqual([j.streak, j.ring, j.misses, j.missesInRow], before);
  assert.equal(j.ended, false);
});

// ---------------------------------------------------------------- the streak and the ring

test('a hit adds to the streak, a miss resets it, and the best streak is kept', () => {
  const j = createJudge(chartOf([[0, 50], [1, 100], [2, 150], [0, 200], [1, 250]]));
  j.press(0, 50); j.press(1, 100); j.press(2, 150);
  assert.deepEqual([j.streak, j.bestStreak], [3, 3]);
  j.advance(207);
  assert.deepEqual([j.streak, j.bestStreak, j.misses], [0, 3, 1]);
  j.press(1, 250);
  assert.deepEqual([j.streak, j.bestStreak], [1, 3]);
});

test('a hit widens the ring a step and a perfect two, a miss shrinks it a step, between 0 and the widest', () => {
  const j = createJudge(chartOf([[0, 100], [0, 200], [0, 300]]));
  assert.equal(j.ring, RING_START);
  j.press(0, 103);
  assert.equal(j.ring, RING_START + 1, 'a hit');
  j.press(0, 200);
  assert.equal(j.ring, RING_START + 3, 'a perfect');
  j.advance(307);
  assert.equal(j.ring, RING_START + 2, 'a miss');
  const wide = createJudge(chartOf(Array.from({ length: 12 }, (_, i) => [0, 100 + 20 * i] as [Lane, number])));
  for (let i = 0; i < 12; i++) wide.press(0, 100 + 20 * i);
  assert.equal(wide.ring, RING_MAX, 'the ring stops at the widest');
  const gone = createJudge(chartOf([[0, 10], [1, 30], [0, 50]]));
  gone.press(0, 10);
  gone.advance(30 + 7);
  gone.press(0, 50);
  assert.ok(gone.ring >= 0);
  assert.ok(ringRadius(0) < ringRadius(RING_START) && ringRadius(RING_START) < ringRadius(RING_MAX), 'a wider step is a wider ring');
  assert.equal(ringRadius(-3), ringRadius(0));
  assert.equal(ringRadius(99), ringRadius(RING_MAX));
});

test('the ring never goes below zero', () => {
  const j = createJudge(chartOf([[0, 10], [1, 50]]));
  j.advance(100);
  assert.equal(j.ring, 0);
  assert.equal(j.misses, 2);
  assert.equal(j.ended, false, 'two misses do not end it');
});

// ---------------------------------------------------------------- three misses in a row

test('three misses in a row end the solo, and nothing is judged after', () => {
  const j = createJudge(chartOf([[0, 50], [1, 100], [2, 150], [0, 200]]));
  j.advance(57);
  j.advance(107);
  assert.equal(j.ended, false);
  assert.deepEqual(j.advance(157), [2]);
  assert.equal(j.ended, true);
  assert.equal(j.missesInRow, MAX_MISSES);
  assert.equal(j.press(0, 200), 'empty', 'the fourth note cannot be struck');
  assert.deepEqual(j.advance(300), []);
  assert.equal(j.misses, 3);
  const r = j.result('feedback', 157);
  assert.deepEqual([r.reason, r.notes, r.played, r.hits, r.misses], ['feedback', 4, 3, 0, 3]);
});

test('a hit between misses resets the count, so two, a hit and two never end it', () => {
  const j = createJudge(chartOf([[0, 50], [0, 100], [1, 150], [0, 200], [0, 250], [0, 300]]));
  j.advance(107);
  assert.equal(j.missesInRow, 2);
  j.press(1, 150);
  assert.equal(j.missesInRow, 0);
  j.advance(257);
  assert.equal(j.missesInRow, 2);
  assert.equal(j.ended, false);
  j.press(0, 300);
  assert.equal(j.ended, false);
  assert.equal(j.misses, 4);
});

test('one advance can miss several notes, and stops at the third', () => {
  const j = createJudge(chartOf([[0, 50], [1, 60], [2, 70], [0, 80], [1, 90]]));
  assert.deepEqual(j.advance(500), [0, 1, 2]);
  assert.equal(j.ended, true);
  assert.equal(j.misses, 3);
});

test('the result sums up the run', () => {
  const j = createJudge(chartOf([[0, 50], [1, 100], [2, 150], [0, 200]]));
  j.press(0, 50); j.press(1, 104); j.advance(157); j.press(0, 200);
  const r = j.result('finished', 260);
  assert.deepEqual(
    [r.reason, r.notes, r.played, r.hits, r.perfects, r.misses, r.bestStreak, r.frames],
    ['finished', 4, 4, 3, 2, 1, 2, 260],
  );
  assert.equal(r.accuracy, 0.75);
  assert.equal(r.ring, j.ring);
});

// ---------------------------------------------------------------- the bot

test('the bot at 100 percent, on the beat, strikes every note of both charts perfectly', () => {
  for (const c of [riff, rooftop]) {
    for (const jitter of [0, 1, 2]) {
      const r = runBot(c, { accuracy: 1, jitter, seed: 7 });
      assert.deepEqual([r.reason, r.hits, r.misses, r.perfects, r.bestStreak], ['finished', c.notes.length, 0, c.notes.length, c.notes.length], `${c.id} jitter ${jitter}`);
      assert.equal(r.accuracy, 1);
    }
  }
});

test('the bot at 100 percent with the widest jitter that still hits strikes every note, and some of them are not perfect', () => {
  for (const c of [riff, rooftop]) {
    const r = runBot(c, { accuracy: 1, jitter: HIT_WINDOW, seed: 3 });
    assert.deepEqual([r.reason, r.hits, r.misses], ['finished', c.notes.length, 0], c.id);
    assert.ok(r.perfects > 0 && r.perfects < r.hits, `${c.id}: ${r.perfects} perfects of ${r.hits}`);
  }
  const late = runBot(rooftop, { accuracy: 1, jitter: HIT_WINDOW + 3, seed: 3 });
  assert.ok(late.misses > 0, 'a bot that can be 9 frames off misses some');
});

test('the bot at 70 percent hits about 70 percent of what it plays, and on the long song three in a row end it', () => {
  let hits = 0, played = 0, cutShort = 0, finished = 0;
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
  for (const seed of seeds) {
    const r = runBot(riff, { accuracy: 0.7, jitter: 3, seed });
    hits += r.hits; played += r.played;
    if (r.reason === 'feedback') cutShort++; else finished++;
  }
  const rate = hits / played;
  assert.ok(rate > 0.6 && rate < 0.8, `the riff hit rate ${rate.toFixed(2)}`);
  assert.ok(cutShort > 0 && finished > cutShort, `${cutShort} of 40 riffs cut short, ${finished} finished`);
  const song = seeds.map((seed) => runBot(rooftop, { accuracy: 0.7, jitter: 3, seed }));
  const ended = song.filter((r) => r.reason === 'feedback');
  assert.ok(ended.length >= 30, `${ended.length} of 40 rooftops cut short by feedback`);
  for (const r of ended) assert.ok(r.misses >= MAX_MISSES);
  const mean = song.reduce((a, r) => a + r.hits / r.played, 0) / song.length;
  assert.ok(mean > 0.62 && mean < 0.78, `${mean.toFixed(2)} of the notes played were hit`);
});

test('the bot is the same every time for a seed, and different across seeds', () => {
  const a = botPresses(rooftop, { accuracy: 0.8, jitter: 4, seed: 5 });
  assert.deepEqual(a, botPresses(rooftop, { accuracy: 0.8, jitter: 4, seed: 5 }));
  assert.notDeepEqual(a, botPresses(rooftop, { accuracy: 0.8, jitter: 4, seed: 6 }));
  assert.ok(a.every((p, i) => !i || a[i - 1]!.frame <= p.frame), 'in frame order');
});

test('stray presses on lanes with no note near them cost nothing', () => {
  const clean = runBot(rooftop, { accuracy: 1, jitter: 2, seed: 9 });
  const noisy = runBot(rooftop, { accuracy: 1, jitter: 2, seed: 9, stray: 6 });
  assert.equal(noisy.misses, 0);
  assert.equal(noisy.reason, 'finished');
  assert.equal(noisy.hits, clean.hits);
  assert.equal(createSoloBot(rooftop, { accuracy: 1, jitter: 2, seed: 9, stray: 6 }).presses.length > rooftop.notes.length, true);
});

// ---------------------------------------------------------------- the charts

test('the riff is a 6 s solo of 10 to 12 notes and the rooftop a song of 120 to 160 that is over a minute', () => {
  assert.equal(riff.length, 360, 'the riff is exactly 6 s at 60 fps');
  assert.ok(riff.notes.length >= 10 && riff.notes.length <= 12, `${riff.notes.length} notes in the riff`);
  assert.ok(rooftop.length >= 60 * 60 && rooftop.length <= 75 * 60, `${rooftop.length / 60} s`);
  assert.ok(rooftop.notes.length >= 120 && rooftop.notes.length <= 160, `${rooftop.notes.length} notes on the rooftop`);
  assert.equal(CHARTS.riff, riff);
  assert.equal(CHARTS.rooftop, rooftop);
});

test('the rooftop gets denser: each fifth of the song has no fewer notes than the one two before it, and the last has twice the first', () => {
  const fifths = Array.from({ length: 5 }, (_, i) => rooftop.notes.filter((n) => Math.floor((n.frame * 5) / rooftop.length) === i).length);
  assert.ok(fifths[4]! >= 2 * fifths[0]!, `notes by fifth ${fifths.join(' ')}`);
  for (let i = 2; i < 5; i++) assert.ok(fifths[i]! >= fifths[i - 2]!, `fifth ${i + 1}: ${fifths.join(' ')}`);
  // And the fastest stretch is faster than the slowest, by notes in any ten seconds.
  const inTen = (from: number): number => rooftop.notes.filter((n) => n.frame >= from && n.frame < from + 600).length;
  const spans = Array.from({ length: Math.floor((rooftop.length - 600) / 60) }, (_, s) => inTen(s * 60));
  assert.ok(Math.max(...spans) >= 2 * Math.min(...spans.filter((n) => n > 0)));
});

test('every chart is in order, inside its section, playable, and uses all three lanes', () => {
  for (const c of [riff, rooftop]) {
    const lanes = [0, 0, 0];
    c.notes.forEach((n, i) => {
      lanes[n.lane]++;
      assert.ok(n.frame >= 0 && n.frame + HIT_WINDOW + 1 <= c.length, `${c.id} note ${i} at ${n.frame} leaves its window inside the ${c.length} frames`);
      if (i) {
        assert.ok(n.frame >= c.notes[i - 1]!.frame, `${c.id} in order`);
        assert.ok(n.frame - c.notes[i - 1]!.frame >= 12, `${c.id} notes ${i - 1} and ${i} are ${n.frame - c.notes[i - 1]!.frame} frames apart: two steps at least`);
      }
    });
    for (const l of lanes) assert.ok(l >= 0.15 * c.notes.length, `${c.id} lanes ${lanes.join(' ')}`);
  }
});

// ---------------------------------------------------------------- the charts are read off the track

test('the charts are the lead line: every lead note two steps long or more is a note, at its frame, on the lane its pitch says', () => {
  const lead = SOLO.channels.find((c) => c.slot === 'p1' && c.layer === 'base');
  assert.ok(lead && lead.slot !== 'noi');
  const bars = (lead as { bars: { step: number; len: number; midi: number }[][] }).bars;
  const sizes = SOLO.barSteps as readonly number[];
  const stepSec = 60 / SOLO.bpm / 4;
  // Built here from the raw bars, with no help from compile(), so the two readings of the track have to agree.
  for (const [id, sec] of Object.entries(SOLO_SECTIONS)) {
    const start = sizes.slice(0, sec.bar).reduce((a, b) => a + b, 0);
    const want: { lane: number; frame: number }[] = [];
    let at = start;
    for (let b = sec.bar; b < sec.bar + sec.bars; b++) {
      for (const e of bars[b]!) {
        if (e.len >= GEM_STEPS) want.push({ lane: e.midi < LANE_SPLIT[0] ? 0 : e.midi < LANE_SPLIT[1] ? 1 : 2, frame: Math.round((at + e.step - start) * stepSec * 60) });
      }
      at += sizes[b]!;
    }
    assert.ok(want.length > 0);
    assert.deepEqual(CHARTS[id as keyof typeof CHARTS].notes, want, `${id} is the lead line`);
  }
});

test('a frame is six times a sixteenth step, so the highway and the music share one clock with no rounding', () => {
  assert.equal(SOLO.bpm, 150);
  const c = compile(SOLO);
  assert.equal(c.stepSec * 60, 6);
  for (const ch of [riff, rooftop]) for (const n of ch.notes) assert.equal(n.frame % 6, 0);
  // The sections are the tune's own bars: the riff ends where the rooftop begins, and the whole track is both.
  assert.deepEqual([riff.bar, riff.bars, rooftop.bar, rooftop.bars], [0, 4, 4, 40]);
  assert.equal(riff.bar + riff.bars, rooftop.bar);
  assert.equal(riff.bars + rooftop.bars, SOLO.bars);
  const secs = (from: number, n: number): number => Array.from({ length: n }, (_, i) => barSeconds(SOLO, from + i)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(secs(riff.bar, riff.bars) * 60 - riff.length) < 1e-6, 'the riff chart runs as long as its bars');
  assert.ok(Math.abs(secs(rooftop.bar, rooftop.bars) * 60 - rooftop.length) < 1e-6, 'and so does the rooftop');
});

test('the chart follows the music: a slower tempo moves every note later, and the pitch bands pick the lanes', () => {
  // The same function that makes the real charts, on the same tune at 120 bpm: a step is 7.5 frames, not 6.
  const slow = readChart({ ...SOLO, bpm: 120 }, 'riff', SOLO_SECTIONS.riff);
  assert.equal(slow.notes.length, riff.notes.length);
  assert.equal(slow.length, 450);
  slow.notes.forEach((n, i) => {
    assert.equal(n.frame, Math.round((riff.notes[i]!.frame / 6) * 7.5), `note ${i}`);
    assert.equal(n.lane, riff.notes[i]!.lane);
  });
  assert.deepEqual([laneOf(74), laneOf(75), laneOf(82), laneOf(83)], [0, 1, 1, 2]);
});

// ---------------------------------------------------------------- the scene

/** An input that presses the actions in `held` on the next call to update, once. */
const press = (...actions: Action[]): SoloInput & { asked: Set<string>; offered: Set<string> } => {
  const set = new Set<string>(actions);
  const asked = new Set<string>();
  const offered = new Set<string>();
  return { pressed: (a) => { asked.add(a); return set.has(a); }, interrupted: () => false, offer: (a) => { offered.add(a); }, asked, offered };
};
const idle = botInput([]);

test('the scene plays a chart to the end with a bot, and its callbacks match the judge', () => {
  let hits = 0, perfects = 0, misses = 0, ended = 0;
  const lanesHit: number[] = [];
  const solo = createSolo({
    chart: riff, sound: false,
    onHit: (perfect, lane) => { hits++; if (perfect) perfects++; lanesHit.push(lane); },
    onMiss: () => { misses++; },
    onEnd: () => { ended++; },
  });
  const bot = createSoloBot(riff, { accuracy: 1, jitter: 1, seed: 2 });
  let ticks = 0;
  while (!solo.done && ticks++ < 2000) solo.update(botInput(bot.at(solo.frame)));
  assert.ok(solo.done && solo.over);
  assert.equal(ended, 1, 'onEnd fires once');
  assert.deepEqual([hits, misses], [riff.notes.length, 0]);
  assert.equal(perfects, hits);
  assert.deepEqual(lanesHit, riff.notes.map((n) => n.lane));
  const r = solo.result!;
  assert.deepEqual([r.reason, r.hits, r.misses, r.notes], ['finished', riff.notes.length, 0, riff.notes.length]);
  const direct = runBot(riff, { accuracy: 1, jitter: 1, seed: 2 });
  assert.deepEqual([r.hits, r.perfects, r.misses, r.bestStreak, r.ring], [direct.hits, direct.perfects, direct.misses, direct.bestStreak, direct.ring]);
  // The lead-in is a second of empty neck, then 6 s of song.
  assert.ok(ticks > 360 + 60 && ticks < 360 + 60 + 120, `${ticks} ticks`);
});

test('the scene ends in feedback after three misses in a row, calls onEnd at once, and is done after its closing beat', () => {
  const ended: string[] = [];
  let misses = 0;
  const solo = createSolo({ chart: riff, sound: false, onMiss: () => { misses++; }, onEnd: (r) => ended.push(r.reason) });
  let ticks = 0;
  while (!solo.over && ticks++ < 2000) solo.update(idle);
  assert.deepEqual([misses, ended], [3, ['feedback']]);
  assert.equal(solo.done, false, 'the squeal and the shake still play');
  const r = solo.result!;
  assert.deepEqual([r.reason, r.hits, r.misses, r.played, r.notes], ['feedback', 0, 3, 3, riff.notes.length]);
  // Third note at frame 48 plus its window: it ends on frame 55 of the song.
  assert.equal(solo.frame, riff.notes[2]!.frame + HIT_WINDOW + 1);
  let after = 0;
  while (!solo.done && after++ < 500) solo.update(press('attack'));
  assert.ok(solo.done && after > 20 && after < 120, `${after} ticks of outro`);
  assert.equal(ended.length, 1);
});

test('the scene reads Attack, Special and burst, and Space for the Crit lane unless Attack came with it', () => {
  const hit = (...actions: Action[]): number[] => {
    const lanes: number[] = [];
    // A note in every lane at frame 0, so the first tick at frame 0 can strike one.
    const c = chartOf([[0, 0], [1, 0], [2, 0]], 300);
    const solo = createSolo({ chart: c, sound: false, travel: 0, onHit: (_p, lane) => lanes.push(lane) });
    solo.update(press(...actions));
    return lanes.sort();
  };
  assert.deepEqual(hit('attack'), [0]);
  assert.deepEqual(hit('special'), [1]);
  assert.deepEqual(hit('burst'), [2]);
  assert.deepEqual(hit('interact'), [2], 'Space is Crit');
  assert.deepEqual(hit('attack', 'interact'), [0], 'a controller A or the touch A is Attack, not Crit');
  assert.deepEqual(hit('attack', 'special', 'burst'), [0, 1, 2]);
  assert.deepEqual(hit('up', 'left', 'confirm', 'swapNext'), [], 'nothing else is a lane');
  const input = press();
  createSolo({ chart: riff, sound: false }).update(input);
  assert.deepEqual([...input.offered].sort(), ['attack', 'burst', 'special'], 'the touch screen is asked to show all three buttons');
});

test('the scene pauses when the window loses focus, holds still, and goes on from the bar line after a press', () => {
  const solo = createSolo({ chart: rooftop, sound: false });
  const bot = createSoloBot(rooftop, { accuracy: 1, jitter: 0 });
  while (solo.frame < 700) solo.update(botInput(bot.at(solo.frame)));
  const at = solo.frame, ring = solo.ring;
  const lost = { ...idle, interrupted: () => true };
  solo.update(lost);
  for (let i = 0; i < 100; i++) solo.update(idle);
  assert.equal(solo.frame, at, 'time stood still');
  assert.equal(solo.ring, ring, 'and so did the score');
  solo.update(press('attack'));
  assert.ok(solo.frame < at, `it went back to a bar line (${solo.frame} from ${at})`);
  assert.ok((solo.frame + 60) % 96 === 0, 'a bar is 96 frames and it waits one lead-in before it');
  const back = solo.frame;
  solo.update(idle);
  assert.equal(solo.frame, back + 1, 'and runs again');
});

test('stop() ends it as a quit at once, and an ended scene ignores input', () => {
  let seen = '';
  const solo = createSolo({ chart: rooftop, sound: false, onEnd: (r) => { seen = r.reason; } });
  for (let i = 0; i < 100; i++) solo.update(idle);
  solo.stop();
  assert.deepEqual([seen, solo.done, solo.over], ['quit', true, true]);
  solo.update(press('attack'));
  assert.equal(solo.result!.hits, 0);
});

test('the misses in a row that end a solo can be set: five ends it on the fifth, Infinity never does', () => {
  const notes = Array.from({ length: 8 }, (_, i) => [0, 50 + 40 * i] as [Lane, number]);
  const five = createJudge(chartOf(notes), 5);
  five.advance(50 + 40 * 3 + 7);
  assert.equal(five.ended, false, 'four misses');
  five.advance(50 + 40 * 4 + 7);
  assert.equal(five.ended, true);
  const never = createJudge(chartOf(notes), Infinity);
  never.advance(1000);
  assert.deepEqual([never.misses, never.ended, never.ring], [8, false, 0]);
  const solo = createSolo({ chart: riff, sound: false, maxMisses: Infinity });
  let ticks = 0;
  while (!solo.done && ticks++ < 2000) solo.update(idle);
  assert.deepEqual([solo.result!.reason, solo.result!.misses, solo.result!.hits], ['finished', riff.notes.length, 0]);
});
