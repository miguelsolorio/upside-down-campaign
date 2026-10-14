// Status effects. Burn and stun are live. Slow is a cheap speed cut. Confuse and curse exist as types only.
import type { Statuses, S } from './state.ts';
import { floater } from './fx.ts';
import { demoSettle, isPinned } from '../enemies/demo_hit.ts';

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
    if (st.burn > 0) {
      st.burn--;
      st.burnTick--;
      if (st.burnTick <= 0) {
        st.burnTick = BURN_PERIOD;
        // A pinned Demogorgon takes nothing from fire. Any other keeps its floor of 1 until it is pinned.
        const dmg = isPinned(e) ? 0 : Math.min(st.burnDmg, Math.max(0, e.hp));
        if (dmg > 0) {
          e.hp -= st.burnDmg;
          if (e.demo) demoSettle(s, e, false, null);
          e.flash = Math.max(e.flash, 0.5);
          e.hurtSeen = true;
          s.stats.damageDealt += dmg;
          floater(s, String(st.burnDmg), e.x, e.y - 15, 'orange', false, 30);
        }
      }
      if (st.burn <= 0) st.burnDmg = 0;
    }
  }
}
