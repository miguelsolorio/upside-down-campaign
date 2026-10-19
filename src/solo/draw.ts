// Draws the note highway of the Hellfire solo in game pixels, on the 256 by 224 frame: the neck of Eddie's Flying V coming
// out from under him in perspective with its fret wires scrolling, the notes growing as they come, the three strum targets on
// the bone line, the streak counter on the left and the ring on the right. It draws the highway and nothing else: the stage
// draws Eddie, the ring and the bats. The art is the owner's pick on solo-variations.html ("The neck"), from art.ts and neck.ts.
import type { Ctx } from '../gfx/canvas.ts';
import { dot, rect, ringPx } from '../gfx/canvas.ts';
import { drawText } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import { Px } from '../gfx/px.ts';
import { settings } from '../core/settings.ts';
import { bigText, blinkOn, dither } from '../ui/kit.ts';
import { GREY, HUES, gem, target } from './art.ts';
import type { GemSize, Hue } from './art.ts';
import { BEAT_FRAMES, LANE_COUNT } from './chart.ts';
import type { Chart, Lane } from './chart.ts';
import { HIT_WINDOW, RING_MAX } from './judge.ts';
import type { EndReason, Judge } from './judge.ts';
import { NECK_B, STRUM, laneX, neckBed, neckFrets, rowOf, strumLine } from './neck.ts';
import type { Surface } from './neck.ts';

/** What the highway draws from: the clock, the judge and the little bits of feeling the scene keeps. */
export interface HighwayView {
  chart: Chart;
  judge: Judge;
  /** Frames since the music started: negative in the lead-in, while the first notes come down. */
  t: number;
  /** Frames a note takes from the far end of the neck to the strum line. */
  travel: number;
  /** Frames since each lane's target was struck by a hit, or -1 for never. */
  struck: readonly number[];
  /** Frames since each lane was pressed at all, hit or not, or -1. */
  pressed: readonly number[];
  /** The newest verdict, shown over its lane for a moment. */
  floater: { word: 'PERFECT' | 'HIT' | 'MISS'; lane: Lane; age: number } | null;
  /** Frames since the solo ended, or -1 while it plays. */
  outro: number;
  reason: EndReason | null;
  paused: boolean;
  /** Misses in a row that end the solo. Infinity draws a count in place of the three pips. */
  maxMisses: number;
  /** What each lane's button is called on the device in hand. */
  keys: readonly [string, string, string];
}

const FRAME_W = 256, FRAME_H = 224;
const surface = (ctx: Ctx): Surface => ({ rect: (x, y, w, h, c) => rect(ctx, x, y, w, h, c), set: (x, y, c) => dot(ctx, x, y, c) });

interface Kit { bed: HTMLCanvasElement; gems: Map<string, HTMLCanvasElement>; targets: Map<string, HTMLCanvasElement> }
let kit: Kit | null = null;
function getKit(): Kit {
  if (!kit) {
    const bed = new Px(FRAME_W, FRAME_H);
    neckBed(bed);
    kit = { bed: bed.toCanvas(), gems: new Map(), targets: new Map() };
  }
  return kit;
}
function gemCanvas(lane: Lane | 'miss', size: GemSize): HTMLCanvasElement {
  const k = getKit(), key = `${lane}${size}`;
  let c = k.gems.get(key);
  if (!c) { c = gem(lane === 'miss' ? GREY : (HUES[lane] as Hue), size).toCanvas(); k.gems.set(key, c); }
  return c;
}
function targetCanvas(lane: Lane, lit: boolean): HTMLCanvasElement {
  const k = getKit(), key = `${lane}${lit}`;
  let c = k.targets.get(key);
  if (!c) { c = target(HUES[lane] as Hue, lit).toCanvas(); k.targets.set(key, c); }
  return c;
}

const WORD_COLOR: Record<'PERFECT' | 'HIT' | 'MISS', ColorName> = { PERFECT: 'yellow', HIT: 'cream', MISS: 'mist' };

/** The wires, one on each beat. They scroll at the notes' own speed, so the song's pulse runs down the neck. */
function frets(v: HighwayView): { y: number; dot: boolean }[] {
  const out: { y: number; dot: boolean }[] = [];
  for (let k = Math.ceil((v.t - 4) / BEAT_FRAMES); k * BEAT_FRAMES <= v.t + v.travel; k++) {
    const z = 1 - (k * BEAT_FRAMES - v.t) / v.travel;
    out.push({ y: rowOf(z), dot: k % 2 !== 0 });
  }
  return out;
}

function drawNotes(ctx: Ctx, v: HighwayView): void {
  const { notes } = v.chart;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    const dt = n.frame - v.t;
    if (dt > v.travel) break;
    if (dt < -(HIT_WINDOW + 10)) continue;
    const s = v.judge.stateOf(i);
    if (s === 'hit' || s === 'perfect') continue;
    const z = 1 - dt / v.travel, y = rowOf(z);
    if (y > NECK_B + 2) continue;
    const g = gemCanvas(s === 'miss' ? 'miss' : n.lane, z < 0.35 ? 'small' : z < 0.7 ? 'mid' : 'big');
    ctx.drawImage(g, Math.round(laneX(n.lane, y) - g.width / 2), Math.round(y - g.height / 2));
  }
}

function drawTargets(ctx: Ctx, v: HighwayView): void {
  for (let l = 0; l < LANE_COUNT; l++) {
    const lane = l as Lane, x = Math.round(laneX(lane, STRUM));
    const hit = v.struck[l]!, press = v.pressed[l]!;
    const lit = (hit >= 0 && hit < 8) || (press >= 0 && press < 3);
    ctx.drawImage(targetCanvas(lane, lit), x - 7, STRUM - 5);
    // A struck target sends a ring out, two on a perfect.
    if (hit >= 0 && hit < 10) ringPx(ctx, x, STRUM, 7 + hit, (HUES[l] as Hue).hi);
    drawText(ctx, v.keys[l]!, x, STRUM + 7, (HUES[l] as Hue).hi, { align: 'center', shadow: true });
  }
}

function drawColumns(ctx: Ctx, v: HighwayView): void {
  const j = v.judge;
  drawText(ctx, 'STREAK', 8, 148, 'mist', { shadow: true });
  bigText(ctx, j.streak > 0 ? `x${j.streak}` : '--', 8, 158, j.streak >= 20 ? 'hot' : j.streak >= 10 ? 'yellow' : 'amber', 2, 'left');
  drawText(ctx, 'MISSES', 8, 180, 'mist', { shadow: true });
  if (Number.isFinite(v.maxMisses)) {
    for (let i = 0; i < v.maxMisses; i++) {
      const x = 8 + i * 9;
      rect(ctx, x, 190, 7, 7, 'ink');
      rect(ctx, x + 1, 191, 5, 5, i < j.missesInRow ? 'hot' : 'grey1');
    }
  } else drawText(ctx, String(j.misses), 8, 190, j.misses ? 'hot' : 'grey3', { shadow: true });
  // The song, as a bar along the foot of the left column.
  rect(ctx, 8, 208, 44, 4, 'ink');
  rect(ctx, 9, 209, 42, 2, 'grey1');
  rect(ctx, 9, 209, Math.round((42 * Math.max(0, Math.min(v.t, v.chart.length))) / v.chart.length), 2, 'amber');
  drawText(ctx, 'RING', 208, 148, 'mist', { shadow: true });
  for (let i = 0; i < RING_MAX; i++) {
    rect(ctx, 208 + i * 5, 158, 4, 7, 'ink');
    rect(ctx, 209 + i * 5, 159, 2, 5, i < j.ring ? 'amber' : 'grey1');
  }
}

/** Draws the whole highway for this frame. Call it inside the scene's draw, over the stage. */
export function drawHighway(ctx: Ctx, v: HighwayView): void {
  const k = getKit();
  const shaking = v.reason === 'feedback' && v.outro >= 0 && v.outro < 18 && !settings.reduceFlashing;
  ctx.save();
  if (shaking) ctx.translate(v.outro % 2 ? 2 : -2, v.outro % 3 === 0 ? 1 : 0);
  ctx.drawImage(k.bed, 0, 0);
  neckFrets(surface(ctx), frets(v));
  strumLine(surface(ctx));
  if (v.outro < 0) drawNotes(ctx, v);
  drawTargets(ctx, v);
  const f = v.floater;
  if (f && f.age < 26 && v.outro < 0) {
    drawText(ctx, f.word, Math.round(laneX(f.lane, STRUM)), STRUM - 22 - (f.age >> 2), WORD_COLOR[f.word], { align: 'center', shadow: true });
  }
  ctx.restore();
  drawColumns(ctx, v);
  overlay(ctx, v);
}

/** The words over the whole frame: the count-in, the end of the solo, the pause. */
function overlay(ctx: Ctx, v: HighwayView): void {
  if (v.t < 0 && v.outro < 0) {
    if (blinkOn(v.t + 600, 30, 20)) drawText(ctx, 'GET READY', 128, 70, 'cream', { align: 'center', shadow: true });
    return;
  }
  if (v.outro >= 0 && v.reason === 'feedback') {
    if (v.outro < 4 && !settings.reduceFlashing) dither(ctx, 0, 0, FRAME_W, FRAME_H, 'white', 4);
    if (blinkOn(v.outro, 12, 8)) bigText(ctx, 'FEEDBACK', 128, 70, 'hot', 2);
  } else if (v.outro >= 0) {
    bigText(ctx, 'SOLO!', 128, 66, 'yellow', 2);
    drawText(ctx, `${v.judge.hits} OF ${v.chart.notes.length} HIT   BEST x${v.judge.bestStreak}`, 128, 86, 'cream', { align: 'center', shadow: true });
  }
  if (v.paused) {
    dither(ctx, 0, 0, FRAME_W, FRAME_H, 'black', 2);
    rect(ctx, 48, 84, 160, 36, 'black');
    drawText(ctx, 'PAUSED', 128, 92, 'yellow', { align: 'center' });
    drawText(ctx, `PRESS ${v.keys[0]} TO GO ON`, 128, 106, 'mist', { align: 'center' });
  }
}
