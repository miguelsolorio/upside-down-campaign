// Pure helpers for the UI: bulbs, clocks, typewriter, fades. No DOM, no audio, so Node can test them.

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------------------------------------------------------------- HP segments
// The HUD drew a string of bulbs here once, which is why these are named for them. Each bulb is now one segment of the bar.
/** Most segments the HUD bar shows. Past this, each segment stands for more than 10 HP. */
export const MAX_BULBS = 16;

/** One segment per 10 max HP, rounded up, at least one. */
export function bulbCount(hpMax: number, cap: number = MAX_BULBS): number {
  if (!(hpMax > 0)) return 1;
  return Math.max(1, Math.min(cap, Math.ceil(hpMax / 10)));
}

/** How full segment i of n is, 0..1. Each owns 10 HP, the last one may own fewer. Capped bars share HP evenly. */
export function bulbFill(hp: number, hpMax: number, i: number, n: number): number {
  const per = n * 10 >= hpMax ? 10 : hpMax / n;
  const start = i * per;
  const len = Math.min(per, hpMax - start);
  if (len <= 0) return 0;
  return clamp01((hp - start) / len);
}

/** At or below this share of max HP the bar is red and blinks. */
export const LOW_HP = 0.3;
export function isLowHp(hp: number, hpMax: number): boolean {
  return hp > 0 && hpMax > 0 && hp / hpMax <= LOW_HP;
}

/** Whether a lit segment is dark on this frame while HP is low. About one frame in five, never when flashing is reduced. */
export function bulbDark(t: number, i: number, low: boolean, reduceFlashing: boolean): boolean {
  if (!low || reduceFlashing) return false;
  return ((((t >> 2) * 7) + i * 13) % 5) === 0;
}

/** The bar's color: green above half, yellow above LOW_HP, red at or below it. Red is also where the blink starts. */
export function hpTone(hp: number, hpMax: number): 'leaf' | 'yellow' | 'hot' {
  const r = hpMax > 0 ? hp / hpMax : 0;
  return r > 0.5 ? 'leaf' : r > LOW_HP ? 'yellow' : 'hot';
}

/** The color an HP bar shows on frame t: its tone, except that low HP blinks to a dark red. The HUD and the bars over the
 * heroes both ask here, so they blink in step. */
export function hpBarColor(hp: number, hpMax: number, t: number, reduceFlashing: boolean): 'leaf' | 'yellow' | 'hot' | 'blood1' {
  if (isLowHp(hp, hpMax) && bulbDark(t, 0, true, reduceFlashing)) return 'blood1';
  return hpTone(hp, hpMax);
}

// ---------------------------------------------------------------- XP notches and MP casts
/** Notches in the XP row under HP. */
export const XP_NOTCHES = 10;

/** Up to `n` equal notches across `w` px with a 1 px gap, as x offsets and widths. The positions are spread so the last
 * notch ends on the edge. A bar too narrow for n notches of at least 1 px gets fewer. */
export function notchSpans(w: number, n: number): { x: number; w: number }[] {
  const count = Math.max(1, Math.min(n, Math.floor((w + 1) / 2)));
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.round((i * (w + 1)) / count);
    const b = Math.round(((i + 1) * (w + 1)) / count) - 1;
    out.push({ x: a, w: b - a });
  }
  return out;
}

/** How full notch i of n is for a 0..1 fraction. */
export function notchFill(frac: number, i: number, n: number): number {
  return clamp01(frac * n - i);
}

export interface MpCell { x: number; w: number; fill: number; ready: boolean }
/** The MP bar as cells to draw, and 1 px ticks to cut into it. */
export interface MpBar { cells: MpCell[]; ticks: number[] }
/** A cast segment needs this many px, gap included. Below it the bar is one piece with a tick per cast. */
export const MP_MIN_PITCH = 3;

/** The MP bar for a special that costs `cost`, in `w` px. One segment per cast: a segment is `ready` when it is full and
 * holds a whole cast, so a bright one can be cast now and a dim one is still charging. The last segment is shorter when
 * max MP is not a multiple of the cost. With too many casts for the width, it is one bar with a tick at every cast. */
export function mpBar(w: number, mp: number, mpMax: number, cost: number): MpBar {
  if (!(mpMax > 0)) return { cells: [], ticks: [] };
  const casts = cost > 0 ? Math.ceil(mpMax / cost) : 0;
  const pitch = casts > 0 ? Math.floor((w + 1) / casts) : 0;
  if (casts > 0 && pitch >= MP_MIN_PITCH) {
    const cells: MpCell[] = [];
    for (let i = 0; i < casts; i++) {
      const len = Math.min(cost, mpMax - i * cost);
      const fill = clamp01((mp - i * cost) / len);
      cells.push({ x: i * pitch, w: Math.max(2, Math.round(((pitch - 1) * len) / cost)), fill, ready: fill >= 1 && len >= cost });
    }
    return { cells, ticks: [] };
  }
  const ticks: number[] = [];
  if (cost > 0) for (let k = 1; k * cost < mpMax; k++) ticks.push(Math.round((w * k * cost) / mpMax));
  return { cells: [{ x: 0, w, fill: clamp01(mp / mpMax), ready: mp >= cost }], ticks };
}

// ---------------------------------------------------------------- clocks and numbers
/** Frames to m:ss. Seconds are floored and minutes do not wrap. */
export function formatTime(frames: number, fps = 60): string {
  const s = Math.max(0, Math.floor(frames / fps));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A number that climbs to its target over `dur` frames, starting at frame `from`. */
export function countUp(target: number, t: number, from: number, dur: number): number {
  return Math.round(target * clamp01((t - from) / dur));
}

// ---------------------------------------------------------------- the foes row on the results screen
const FOE_NAMES: Record<string, string> = {
  agent: 'AGENTS', rat: 'RATS', guard: 'GUARDS', warden: 'WARDEN', demogorgon: 'DEMOGORGON', demodog: 'DEMODOGS', vine: 'VINES', pod: 'PODS',
  alpha: 'ALPHA', melter: 'MELTING RATS', flayed: 'FLAYED', soldier: 'SOLDIERS', grigori: 'GRIGORI',
  billy: 'BILLY', flayer: 'MIND FLAYER',
  kguard: 'CAMP GUARDS', kbaton: 'BATON GUARDS', pitdemo: 'DEMOGORGON', ghoul: 'GHOULS',
};
/** What the foes row calls a kind. A kind it doesn't know gets an S. */
export const foeName = (kind: string): string => FOE_NAMES[kind] ?? `${kind.toUpperCase()}S`;

/**
 * The foes row as lines of text, each at most `maxChars` wide. Entries read "AGENTS x6" and sit two spaces apart; a
 * line fills before the next starts. The layout comes from the final counts, so it never reflows while a count climbs,
 * and `shown` maps a final count to the one on screen. If the mix needs more than `maxLines`, the row falls back to one
 * "TOTAL x37" line. No kinds gives no lines.
 */
export function foeLines(kinds: [string, number][], maxChars: number, maxLines = 3, shown: (n: number) => number = (n) => n): string[] {
  const lines: string[] = [];
  const finals: string[] = [];
  for (const [kind, n] of kinds) {
    const entry = (c: number): string => `${foeName(kind)} x${c}`;
    const last = finals.length - 1;
    if (last >= 0 && (finals[last] as string).length + 2 + entry(n).length <= maxChars) {
      finals[last] += `  ${entry(n)}`;
      lines[last] += `  ${entry(shown(n))}`;
    } else {
      finals.push(entry(n));
      lines.push(entry(shown(n)));
    }
  }
  if (lines.length <= maxLines) return lines;
  return [`TOTAL x${shown(kinds.reduce((s, [, n]) => s + n, 0))}`];
}

// ---------------------------------------------------------------- typewriter
/** How many characters are showing after `frames` frames of typing. */
export function typeCount(frames: number, total: number, cps = 30, fps = 60): number {
  return Math.max(0, Math.min(total, Math.floor((frames * cps) / fps)));
}

/** Frames until the whole line is showing. */
export function typeFrames(total: number, cps = 30, fps = 60): number {
  return Math.ceil((total * fps) / cps);
}

/** A speech blip on every second character, never on a space. n is how many characters are showing. */
export function wantsBlip(n: number, ch: string): boolean {
  return n % 2 === 0 && ch.trim() !== '';
}

/** Splits wrapped lines into pages that fit the box. Scripts are written to fit, so this is usually one page. */
export function pagesOf(lines: string[], rows = 3): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < lines.length; i += rows) out.push(lines.slice(i, i + rows));
  return out.length ? out : [['']];
}

// ---------------------------------------------------------------- fades
/** 0..1 across a fade in, a hold and a fade out. */
export function fadeLevel(t: number, fadeIn: number, hold: number, fadeOut: number): number {
  if (t <= 0) return 0;
  if (t < fadeIn) return t / fadeIn;
  if (t < fadeIn + hold) return 1;
  const k = (t - fadeIn - hold) / fadeOut;
  return k >= 1 ? 0 : 1 - k;
}

/** Picks a step from a color ramp. a is 0..1. */
export function rampIndex(len: number, a: number): number {
  return Math.round(clamp01(a) * (len - 1));
}

// ---------------------------------------------------------------- title wall
/** Which letters of Joyce's wall are lit at frame t: R, then U, then N, then all three, then dark, on a 330 frame loop. */
export function wallLit(t: number): string {
  const p = ((t % 330) + 330) % 330;
  if (p < 50) return '';
  if (p < 90) return 'R';
  if (p < 130) return 'U';
  if (p < 170) return 'N';
  if (p < 260) return 'RUN';
  return '';
}

// ---------------------------------------------------------------- title launch
/** Frames the title plays out after START is chosen, before the game takes over. */
export const LAUNCH_FRAMES = 40;

/** 0..1 across the launch, 0 before it starts. */
export function launchLevel(launch: number): number {
  return clamp01(launch / LAUNCH_FRAMES);
}

// ---------------------------------------------------------------- settings
/** Volume steps of one tenth, clamped to 0..1. */
export function stepVolume(v: number, dir: -1 | 1): number {
  return Math.round(clamp01(v + dir * 0.1) * 10) / 10;
}
export function volSegments(v: number): number {
  return Math.round(clamp01(v) * 10);
}
/** A click on segment k (0 to 9) of a ten segment bar lights it and every one before it. A click on the top lit one turns
 * it off, so a mouse can reach zero. */
export function clickSegments(lit: number, k: number): number {
  const at = Math.max(0, Math.min(9, k));
  return lit === at + 1 ? at : at + 1;
}

const SHAKE_STEPS = [0, 0.5, 1];
/** Screen shake cycles off, half, full. Anything in between snaps to the nearest step first. */
export function cycleShake(v: number, dir: -1 | 1): number {
  let near = 0;
  SHAKE_STEPS.forEach((s, i) => { if (Math.abs(s - v) < Math.abs((SHAKE_STEPS[near] as number) - v)) near = i; });
  const n = SHAKE_STEPS.length;
  return SHAKE_STEPS[(near + dir + n) % n] as number;
}
export function shakeLabel(v: number): string {
  return v <= 0 ? 'OFF' : v < 1 ? 'HALF' : 'FULL';
}

// ---------------------------------------------------------------- the results title
const CHAPTER_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
/** The results screen's title is drawn at this whole-number scale, centered on the 256 px frame's middle, top at y 12. */
export const TITLE_SCALE = 2;
/** The 5 by 7 font advances 6 px a glyph, and a glyph's shadow sits 1 px right and down of it. */
const GLYPH_ADVANCE = 6;
/** The last stage of the whole campaign (docs/chapter-5.md): clearing it says CAMPAIGN COMPLETE on the results. */
export const CAMPAIGN_END = '5.3';
export const endsCampaign = (stageId: string): boolean => stageId === CAMPAIGN_END;
/** What the results screen says: CAMPAIGN COMPLETE at the campaign's end, CHAPTER n CLEAR when the stage closes a chapter
 * (docs/level-9.md, "The chapter end"), else the level's end or clear. */
export function resultsTitle(o: { chapter?: number; final?: boolean; level: number; campaignEnd?: boolean }): string {
  if (o.campaignEnd) return 'CAMPAIGN COMPLETE';
  if (o.chapter) return `CHAPTER ${CHAPTER_WORDS[o.chapter] ?? o.chapter} CLEAR`;
  return o.final ? `END OF LEVEL ${o.level}` : `LEVEL ${o.level} CLEAR`;
}
/** The pixels a title covers across a frame `frameW` wide, shadow included, as drawText and bigText place it: [left, right). */
export function titleSpan(text: string, frameW: number, scale = TITLE_SCALE): [number, number] {
  const left = Math.round(frameW / 2 / scale - (text.length * GLYPH_ADVANCE) / 2) * scale;
  return [left, left + (text.length * GLYPH_ADVANCE - 1) * scale + scale];
}
