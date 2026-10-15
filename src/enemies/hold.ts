// Holds (docs/level-7.md, docs/level-8.md): a Flayed or Grigori takes hold of the active hero. The hero can't move or attack until it
// lets go. One hold at a time, kept on S.hold. It ends when the holder's own timer runs out, and also, from here, whenever the holder
// can't keep it: a swap (the held hero is on the bench), the hero going down, or the holder dying, being stunned, confused or
// staggered. updateHolds runs before the brains every tick, because a confused or staggered enemy skips its own brain.
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { sfx } from '../combat/fx.ts';

/** A hit with at least this much knockback (before the target's weight) makes a Flayed let go. */
export const HOLD_BREAK_KB = 3;

/** The hero is the one being held. */
export const isHeld = (s: S, h: Hero): boolean => s.hold !== null && s.hold.hero === h;

/** This enemy is the one holding. */
export const isHolding = (s: S, e: Enemy): boolean => s.hold !== null && s.hold.by === e;

/** A hero a grab can take: up, standing in the field, not invulnerable, nobody else holding him, and not in god mode. */
export function canGrab(s: S, h: Hero): boolean {
  return !h.ko && !s.over && !s.god && h.invuln <= 0 && s.hold === null && h === activeHero(s);
}

/** Takes hold of the hero: `grab` sfx, his action is cut short and he stops where he stands. */
export function beginHold(s: S, e: Enemy, h: Hero): void {
  s.hold = { by: e, hero: h, t: 0 };
  h.vx = 0; h.vy = 0;
  h.actId++; h.actT = 0; h.act = null;
  sfx(s, 'grab');
}

/** Lets go. Returns true when `e` was the one holding. */
export function releaseHold(s: S, e: Enemy): boolean {
  if (!isHolding(s, e)) return false;
  s.hold = null;
  return true;
}

/** A shove away from the holder, with no damage: the Flayed's last act. The hero keeps whatever he took at the grab. */
export function shove(h: Hero, e: Enemy, kb: number): void {
  const a = Math.atan2(h.y - e.y, h.x - e.x);
  h.vx += Math.cos(a) * kb;
  h.vy += Math.sin(a) * kb;
}

/** Counts the hold and drops it when it can't go on. Called once a tick, before any enemy's brain. */
export function updateHolds(s: S): void {
  const hold = s.hold;
  if (!hold) return;
  const e = hold.by;
  const gone = e.dead || e.dormant || e.hp <= 0 || hold.hero.ko || hold.hero !== activeHero(s) || s.over;
  const disabled = e.stagger > 0 || e.stat.stun > 0 || e.stat.confuse > 0;
  if (gone || disabled) s.hold = null; else hold.t++;
}

/**
 * True while the enemy is coming up out of the goo, or is the Mind Flayer coming in through the skylight (and its legs with it), or is a
 * severed leg: it can't be hit or confused and it doesn't attack.
 */
export const untouchable = (e: Enemy): boolean =>
  (e.flayed !== null && e.flayed.move === 'rise') || (e.flayer !== null && e.flayer.move === 'rise') ||
  (e.leg !== null && (e.leg.move === 'severed' || e.leg.body?.flayer?.move === 'rise'));
