// The basement epilogue's clock and its last die (docs/level-16.md, "The ending"). Pure: no DOM, no audio, so Node can test it.
// The scene fades up on the basement and reads l16_basement, then waits for the music's last bar, which is a d20 rolling to a stop
// (audio/tracks/ending.ts), and rolls the die across the table to land as the music ends. If the music is not there to wait for,
// because the browser has not let sound play, or the reader was slow enough that it has run out, the die rolls at once with its own
// sounds. Nothing here can hang: every wait has a ceiling.

/** A slow fade up from black, and a beat of the room in silence before the first line. */
export const FADE_IN = 90;
export const HOLD = 40;
/** A quiet beat after the last line, before the die leaves Will's hand. */
export const SETTLE = 36;
/** The music's last bar at 72 bpm: four beats of 5/6 s, which is 200 frames. Its die rattles through the bar and lands on a tock three
 * quarters of the way in, so the die on the table tumbles until then and rests for the chord that rings out the bar. */
export const BAR_FRAMES = 200;
export const ROLL_LEN = 160;
/** The landed die rests this long at least, and this long at most, waiting for the music to run out. */
export const LAND_MIN = 45;
export const LAND_MAX = 600;
/** The hint that confirm rolls now shows after this many frames of waiting. */
export const HINT_AT = 180;

/** Frames after the music began at which the die should leave Will's hand: the start of the last bar, so it lands on the tock. */
export const rollStartAt = (trackSeconds: number): number => Math.max(0, Math.round(trackSeconds * 60) - BAR_FRAMES);

/** How black the screen is `t` frames into the fade up, 1 to 0. */
export const blackAt = (t: number): number => Math.max(0, Math.min(1, 1 - t / FADE_IN));

/** The die may leave Will's hand: the music's last bar is due (or has passed), there is no music to wait for, or the player said so. */
export function mayRoll(since: number, startAt: number, audioLive: boolean, ended: boolean, asked: boolean): boolean {
  return asked || !audioLive || ended || since >= startAt;
}

/** The scene may move on to THE END: the die has rested a beat and the music has run out (or never could), or it rested the longest. */
export function mayLeave(rested: number, audioLive: boolean, ended: boolean): boolean {
  return rested >= LAND_MAX || (rested >= LAND_MIN && (ended || !audioLive));
}

/** Where the die lies at rest, the middle of the sprite the room is drawn with (gfx/ch5/finale_end.ts: 9 by 10 at 144, 114). */
export const REST = { x: 149, y: 119 } as const;
/** Where the roll starts: on the table in front of Will, who sits at its left end. */
export const FROM = { x: 96, y: 119 } as const;
/** The die's radius in px: 5 makes it as wide as the sprite on the table. */
export const DIE_RADIUS = 5;
/** Frames into the roll at which the die strikes the table: the clatters, when its own sound plays. */
export const BOUNCES: readonly number[] = [0, 40, 80, 120];

export interface DiePose { x: number; y: number; lift: number; angle: number; squash: number; landed: boolean }
const TAU = Math.PI * 2;

/** The die `t` frames into the roll: it skims across the table, hopping and slowing, and ends upright at REST. */
export function dieAt(t: number): DiePose {
  const p = Math.max(0, Math.min(1, t / ROLL_LEN));
  const slow = 1 - (1 - p) ** 3;
  const turn = 1 - (1 - p) ** 2;
  const wobble = 0.35 + 0.65 * Math.abs(Math.cos(t * 0.3));
  return {
    x: FROM.x + (REST.x - FROM.x) * slow,
    y: FROM.y + (REST.y - FROM.y) * slow + Math.sin(p * Math.PI * 6) * (1 - p) * 2,
    lift: Math.abs(Math.sin(p * Math.PI * 4)) * (1 - p) ** 1.2 * 15,
    angle: turn * TAU * 3,
    squash: wobble + (1 - wobble) * p ** 3,
    landed: p >= 1,
  };
}
