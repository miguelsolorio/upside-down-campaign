// Pure timing for the title variants: no DOM, so Node can test it.

/** Frames the screen plays out after START is chosen, before the game takes over. */
export const LAUNCH_FRAMES = 40;

/** 0..1 across the launch, 0 before it starts. */
export function launchLevel(launch: number): number {
  if (launch <= 0) return 0;
  return Math.min(1, launch / LAUNCH_FRAMES);
}

/** Joyce's wall spells RIGHT HERE one letter at a time, then lights RUN together, then goes dark. 480 frame loop. */
export const WALL_MESSAGE = 'RIGHTHERE';
const STEP = 26;
const LEAD = 40;
const RUN_AT = LEAD + WALL_MESSAGE.length * STEP + 24;
const RUN_FOR = 96;
export const WALL_LOOP = RUN_AT + RUN_FOR + 60;

/** The letters lit on the wall at frame t. Letters stay lit as the message grows, and RUN replaces the message. */
export function wallMessageLit(t: number): string {
  const p = ((t % WALL_LOOP) + WALL_LOOP) % WALL_LOOP;
  if (p < LEAD) return '';
  if (p < RUN_AT) {
    const n = Math.min(WALL_MESSAGE.length, Math.floor((p - LEAD) / STEP) + 1);
    return WALL_MESSAGE.slice(0, n);
  }
  if (p < RUN_AT + RUN_FOR) return 'RUN';
  return '';
}

/** The d20 on the D&D title. Idle it turns a face every 50 frames and never shows 20, so the landing means something. */
export function idleDieFace(t: number): number {
  const k = Math.floor(t / 50);
  return ((Math.imul(k + 3, 0x9e3779b1) >>> 0) % 19) + 1;
}

/** The VHS tape counter, h:mm:ss, one tick per second of title time. It starts a few seconds in, like a tape that has been rolling. */
export function tapeClock(t: number): string {
  const s = Math.floor(t / 60) + 7;
  const m = Math.floor(s / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
