// The klaxon's red glow along the edge of the screen. Pure timing and shape, no DOM, so Node can test it: the play scene
// rings it from the `alarm` step (DirectorEnv.alarm), ticks it once per update and draws what level() says.
//
// It fades in, breathes slowly while the alarm is up, and fades out. It never blinks: a breath takes 2.5 s, well under
// the three flashes a second that photosensitive players are warned about. With Reduce flashing on it doesn't breathe at all,
// it holds one steady dim level between the fade in and the fade out.

/** How long the glow stays up after a ring, before the fade out. A ring while it is up gives it the full time again. */
export const HOLD_FRAMES = 300;
/** The fade in and the fade out, in frames. */
export const FADE_IN = 36;
export const FADE_OUT = 90;
/** One breath of the glow, bright to bright. */
export const BREATH_FRAMES = 150;
/** The glow's strength at the dim and the bright end of a breath, and the one steady level Reduce flashing holds. */
export const DIM = 0.45;
export const BRIGHT = 1;
export const STEADY = 0.55;

export interface Klaxon {
  /** The alarm sounds. */
  ring(): void;
  /** Call once per update tick. */
  tick(): void;
  /** How strong the glow is right now, 0 to 1. 0 when there is no alarm. */
  level(calm: boolean): number;
  /** Forget the alarm, for a retry or a load. */
  clear(): void;
}

export function createKlaxon(): Klaxon {
  /** Frames the glow will stay up for, counting down. */
  let hold = 0;
  /** The fade, 0 to 1. It climbs and falls at a fixed rate, so a ring during a fade out never makes the glow jump. */
  let fade = 0;
  /** Frames since the glow came up, which the breath follows. */
  let age = 0;
  return {
    ring() { hold = HOLD_FRAMES; },
    tick() {
      if (hold > 0) { hold--; fade = Math.min(1, fade + 1 / FADE_IN); }
      else fade = Math.max(0, fade - 1 / FADE_OUT);
      age = fade > 0 ? age + 1 : 0;
    },
    level(calm) {
      if (fade <= 0) return 0;
      // Starts each breath dim, so the glow comes up from nothing instead of in at full.
      const breath = 0.5 - 0.5 * Math.cos((age / BREATH_FRAMES) * Math.PI * 2);
      return fade * (calm ? STEADY : DIM + (BRIGHT - DIM) * breath);
    },
    clear() { hold = 0; fade = 0; age = 0; },
  };
}

/** The glow's bands from the screen's edge inward: how deep each reaches in px, and the share of the glow's strength it draws at. */
export const BANDS: readonly { w: number; a: number }[] = [
  { w: 3, a: 0.45 }, { w: 8, a: 0.32 }, { w: 14, a: 0.2 }, { w: 22, a: 0.11 }, { w: 32, a: 0.05 },
];
