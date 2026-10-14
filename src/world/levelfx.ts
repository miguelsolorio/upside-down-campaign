// The level-up effect that plays in the world, so the game never stops for one. Pure timing and shape curves
// with no DOM, so Node can test them. The play scene feeds it each level-up event, ticks it once per update, and
// render.ts draws what list() returns around the hero.
import type { HeroId, LevelUpInfo } from '../core/types.ts';

/** Whole effect, at the sim's 60 Hz: about a second and a half. */
export const LEVELFX_FRAMES = 96;
/** The ring at the hero's feet grows over this many frames, then is gone. */
export const RING_FRAMES = 26;
/** Sparkles circling up the hero. */
export const SPARKLES = 6;
/** The talent callout is up between these two frames of the effect. */
export const TALENT_FROM = 18;
export const TALENT_TO = 84;

export interface LevelFx {
  hero: HeroId;
  /** The level reached. */
  to: number;
  /** New talent name, if this level grants one. */
  talent: string | null;
  nat20: boolean;
  /** Frames since it began. */
  t: number;
}

export interface LevelFxTracker {
  push(info: LevelUpInfo): void;
  /** Call once per update tick that the sim runs. */
  tick(): void;
  list(): readonly LevelFx[];
  /** Frames since this hero's newest effect began, or null if none is playing. */
  since(hero: HeroId): number | null;
  /** Forget everything, for a retry or a load. */
  clear(): void;
}

export function createLevelFx(): LevelFxTracker {
  let live: LevelFx[] = [];
  return {
    push(info) {
      live.push({ hero: info.hero, to: info.to, talent: info.talent?.name ?? null, nat20: info.roll === 20, t: 0 });
    },
    tick() {
      for (const f of live) f.t++;
      live = live.filter((f) => f.t < LEVELFX_FRAMES);
    },
    list: () => live,
    since(hero) {
      let best: number | null = null;
      for (const f of live) if (f.hero === hero && (best === null || f.t < best)) best = f.t;
      return best;
    },
    clear() { live = []; },
  };
}

/** Radius of the ring at the hero's feet in px: eases out from 3 to `max`, or 0 once it has faded. */
export function ringRadius(t: number, max = 22): number {
  if (t < 0 || t >= RING_FRAMES) return 0;
  const u = t / RING_FRAMES;
  return Math.round(3 + (max - 3) * (1 - (1 - u) * (1 - u)));
}

/** Where sparkle `i` is, in px from the hero's feet, or null when it is not showing. They start one after another,
 * circle the hero and rise, each for 40 frames. */
export function sparkle(t: number, i: number): { dx: number; dy: number; bright: boolean } | null {
  const age = t - i * 6;
  if (age < 0 || age >= 40) return null;
  const a = (i / SPARKLES) * Math.PI * 2 + age * 0.09;
  return { dx: Math.round(Math.cos(a) * 9), dy: -Math.round(4 + age * 0.55), bright: ((age >> 2) & 1) === 0 };
}

/** The new-talent callout holds still for about a second, long enough to read, after the ring has cleared. */
export function talentShowing(t: number): boolean {
  return t >= TALENT_FROM && t < TALENT_TO;
}

/** Whether the HUD highlight is lit this frame: on alternate 8-frame blocks while the effect plays, steady with Reduce flashing. */
export function hudPulse(since: number | null, reduceFlashing: boolean): boolean {
  if (since === null) return false;
  return reduceFlashing || ((since >> 3) & 1) === 0;
}
