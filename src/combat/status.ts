// Status effects. Burn, stun and confuse are live on enemies and slow is a cheap speed cut. Curse exists as a type only.
import type { Hero, Statuses, S } from './state.ts';
import { floater } from './fx.ts';
import { UNHURT_CAP } from './state.ts';
import { demoSettle, isPinned } from '../enemies/demo_hit.ts';
import { billySettle, isBillyPinned } from '../enemies/billy_hit.ts';
import { flayerShielded } from '../enemies/flayer_hit.ts';
import { sever } from '../enemies/flayer_legs.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

export const BURN_PERIOD = 30;

/** Speed multiplier from statuses. Stun is handled by the callers as "cannot act". */
export function speedMul(st: Statuses): number {
  return st.slow > 0 ? 0.55 : 1;
}

/** Ticks every enemy's statuses. Burn deals its damage here and credits the hero that lit it. */
export function tickEnemyStatus(s: S): void {
  for (const e of s.enemies) {
    if (e.dead || e.dormant) continue;
    const st = e.stat;
    if (st.stun > 0) st.stun--;
    if (st.slow > 0) st.slow--;
    // Confusion ends: a bump wind-up that was under way goes back to chasing, so the enemy's own brain does not read it.
    if (st.confuse > 0 && --st.confuse === 0 && e.mode === 'windup') { e.mode = 'chase'; e.modeT = 0; }
    if (e.taunt > 0) e.taunt--;
    if (st.burn > 0) {
      st.burn--;
      st.burnTick--;
      if (st.burnTick <= 0) {
        st.burnTick = BURN_PERIOD;
        // A pinned Demogorgon or Billy, and a Mind Flayer behind its legs, take nothing from fire. Any other keeps its floor of 1 until it is
        // pinned (Billy is pinned at 0). Fire is double for a vine.
        const tick = e.kind === 'vine' ? st.burnDmg * ENEMY_DEFS.vine.x.burnMul : st.burnDmg;
        const dmg = isPinned(e) || isBillyPinned(e) || flayerShielded(e) ? 0 : Math.min(tick, Math.max(0, e.hp));
        if (dmg > 0) {
          e.hp -= tick;
          if (e.demo) demoSettle(s, e, false, null);
          billySettle(s, e);
          sever(s, e);
          e.flash = Math.max(e.flash, 0.5);
          e.hurtSeen = true;
          s.stats.damageDealt += dmg;
          floater(s, String(tick), e.x, e.y - 15, 'orange', false, 30);
        }
      }
      if (st.burn <= 0) st.burnDmg = 0;
    }
  }
}

/** Slows the active hero or any other: the speed cut lasts at least `frames` more. A fresh slow says so. */
export function slowHero(s: S, h: Hero, frames: number): void {
  if (h.stat.slow <= 0 && !h.ko) floater(s, 'SLOW', h.x, h.y - 20, 'purple', false, 30);
  h.stat.slow = Math.max(h.stat.slow, frames);
}

/** Ticks every hero's statuses: only slow is live on a hero. Also the clocks Steve's kit reads: Babysit and the unhurt count. */
export function tickHeroStatus(s: S): void {
  for (const h of s.heroes) {
    if (h.stat.slow > 0) h.stat.slow--;
    if (h.unhurt < UNHURT_CAP) h.unhurt++;
  }
  if (s.babysit > 0) s.babysit--;
}
