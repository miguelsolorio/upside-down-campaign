// The held Special (docs/game-design.md, "Controls": hold for the Lv 6 variant where a hero has one). Will's Cleric, Nancy's
// Molotov and Eleven's Sensory tank are held: from Lv 6 a tap casts the Special when the key comes up, and holding it for
// HOLD_FRAMES casts the variant. Before Lv 6, and for everyone else, Special casts on the press as it always has. Dustin joins them
// at Lv 9 with Cerebro, but only while it is unspent: once Suzie has been called this stage his Special casts on the press again.
//
// Hero.holdT counts the frames held. 0 is not holding, -1 is the variant fired and the key not yet up, so one long hold casts
// one variant. A press that comes up on the same frame (the bot's tap) casts the Special that frame.
import type { SimInput } from '../core/types.ts';
import { LV6, LV9, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { HERO_DEFS } from './defs.ts';
import { callSuzie } from './cerebro.ts';
import { castHeal, healReady } from './cleric.ts';
import { throwMolotov } from './molotov.ts';
import { sensoryTank } from './sensory.ts';

/** Frames Special is held for the variant: 0.4 s. */
export const HOLD_FRAMES = 24;
/** What a press buffers, the same as an attack's (combat/hero.ts). */
const TAP_BUFFER = 8;

/** True when this hero has a held variant at their level, and this stage. */
export function holdsSpecial(s: S, h: Hero): boolean {
  if (h.id === 'dustin') return hasTalent('dustin', h.level, LV9) && !s.t6.cerebro;
  return (h.id === 'will' || h.id === 'nancy' || h.id === 'eleven') && hasTalent(h.id, h.level, LV6);
}

/** What the variant costs. */
export function variantMp(h: Hero): number {
  const x = HERO_DEFS[h.id].special.x;
  return h.id === 'dustin' ? 0 : h.id === 'will' ? x.healMp : h.id === 'nancy' ? x.molMp : h.id === 'eleven' ? x.senseMp : 0;
}

/** False while the variant has a wait of its own (Will's heal). */
export function variantReady(s: S, h: Hero): boolean {
  return h.id !== 'will' || healReady(s);
}

/** Casts the variant. The caller has checked the cooldown and taken the MP. */
export function useVariant(s: S, h: Hero): void {
  if (h.id === 'will') castHeal(s, h);
  else if (h.id === 'nancy') throwMolotov(s, h);
  else if (h.id === 'eleven') sensoryTank(s, h);
  else if (h.id === 'dustin') callSuzie(s, h);
}

/**
 * Reads Special for a hero who holds it. Returns true while the hold is full (HOLD_FRAMES or more) and the key is still down,
 * until the caller casts the variant and sets holdT to -1. A key that comes up sooner buffers the plain Special in
 * `s.buf.special`, so the usual path casts it. One that comes up on a full ring the variant could not use (a cooldown) casts
 * nothing. While the key is down nothing is buffered.
 */
export function readHold(s: S, h: Hero, input: SimInput): boolean {
  if (h.holdT < 0) {
    if (!input.specialHeld) h.holdT = 0;
    s.buf.special = 0;
    return false;
  }
  // The press is in the buffer (bufferInput), so one made during hit-stop still starts the hold. The frame of the press is frame 1.
  if (h.holdT === 0 && s.buf.special > 0 && input.specialHeld) {
    h.holdT = 1;
    s.buf.special = 0;
    return false;
  }
  if (h.holdT === 0) return false;
  if (!input.specialHeld) {
    const full = h.holdT >= HOLD_FRAMES;
    h.holdT = 0;
    s.buf.special = full ? 0 : TAP_BUFFER;
    return false;
  }
  s.buf.special = 0;
  h.holdT = Math.min(HOLD_FRAMES, h.holdT + 1);
  return h.holdT >= HOLD_FRAMES;
}

/** How full the charge ring is, 0..1, or 0 when the hero isn't holding. */
export function chargeOf(s: S, h: Hero): number {
  return h.holdT > 0 && holdsSpecial(s, h) ? Math.min(1, h.holdT / HOLD_FRAMES) : 0;
}
