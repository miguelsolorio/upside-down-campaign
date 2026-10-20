// Capture mode (?capture=1): how the demo recorder runs the game (scripts/demo/record.mjs, docs/demo.md). There is no animation
// frame loop. The recorder calls __ud.cap.step(n), which runs n fixed ticks and one render, so every frame is exact and a
// second run on the same code is the same run. The audio API logs each music, phase, intensity, effect, jingle, stinger and
// blip call against the tick it happened on, and the recorder renders the sound offline from that log (demo/audio.ts).
import { flags } from './flags.ts';

export type CapKind = 'music' | 'phase' | 'intensity' | 'sfx' | 'jingle' | 'stinger' | 'blip' | 'section' | 'sectionStop';

/** What a call carries besides its id. `rate` is an effect's pitch. A section (Eddie's solo song) has a first `bar`, a count of `bars`,
 * and a `lead` in seconds, and `before` is the track the stage wanted, which comes back when it stops. A stop has the `fade` in seconds. */
export interface CapExtra { rate?: number; bar?: number; bars?: number; lead?: number; before?: string | null; fade?: number }

/** One call into the audio API. `id` is the track, effect, cue or speaker, or the number for phase and intensity. */
export interface CapEvent extends CapExtra { tick: number; kind: CapKind; id: string | number | null }

export interface Capture {
  /** Runs n fixed ticks, then one render. Returns the ticks run since boot. */
  step(n: number): number;
  /** Runs n fixed ticks and no render, for getting to a moment fast. Returns the ticks run since boot. */
  advance(n: number): number;
  /** Ticks run since boot. */
  ticks(): number;
  /** Every audio call so far, in order. */
  events: CapEvent[];
  /** How many calls of this kind (and id, when given) have been logged. */
  count(kind: CapKind, id?: string | number | null): number;
  /** The last call of this kind, or null. */
  last(kind: CapKind): CapEvent | null;
}

/** The width of the game's frame in capture mode: 5x of it is 1920 wide, so every pixel of the video is a whole game pixel. */
export const CAPTURE_W = 384;

// On from the first line of the page's run when ?capture=1 is there, so the music the title asks for as it opens is in the log.
let active = flags.capture;
let ticks = 0;
let events: CapEvent[] = [];

/** True while a capture is running (the flag, or a test that started one). */
export function capturing(): boolean {
  return active;
}

/** Logs an audio call against the tick it happens in. Does nothing unless a capture is running. */
export function capLog(kind: CapKind, id: string | number | null, extra: CapExtra = {}): void {
  if (!active) return;
  if (extra.rate === undefined || extra.rate === 1) delete extra.rate;
  events.push({ tick: ticks, kind, id, ...extra });
}

/** Ticks run since boot, for the code that logs. */
export function capTicks(): number {
  return ticks;
}

/** Clears the log and the tick count, for tests that start more than one capture. */
export function resetCapture(): void {
  ticks = 0;
  events = [];
}

/** Starts a capture over the game's own tick and render. What the page logged before this (the title's music, at boot) stays. */
export function createCapture(tick: () => void, render: () => void): Capture {
  active = true;
  const advance = (n: number): number => {
    const count = Math.max(0, Math.floor(n));
    for (let i = 0; i < count; i++) { tick(); ticks++; }
    return ticks;
  };
  return {
    advance,
    step(n) { advance(n); render(); return ticks; },
    ticks: () => ticks,
    get events() { return events; },
    count: (kind, id) => events.reduce((n, e) => n + (e.kind === kind && (id === undefined || e.id === id) ? 1 : 0), 0),
    last(kind) {
      for (let i = events.length - 1; i >= 0; i--) if ((events[i] as CapEvent).kind === kind) return events[i] as CapEvent;
      return null;
    },
  };
}

/** Puts the capture on window.__ud for the recorder, which drives it from outside the page. */
export function exposeCapture(cap: Capture): void {
  const w = globalThis as unknown as { __ud?: Record<string, unknown> };
  if (w.__ud) w.__ud.cap = cap;
}
