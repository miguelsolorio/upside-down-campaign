// What the interact key (Space) can use from where the hero stands: a string of Joyce's lights that isn't lit yet, or
// an arcade cabinet. Pure, so tests can call it with a list of props and a point.
import type { PropView, Vec2 } from '../core/types.ts';

/** Interact reaches this far (px) from the hero's feet to the edge of a prop. */
export const USE_REACH = 20;

/** True for a prop Space does something with right now. */
export function usable(p: PropView): boolean {
  if (p.kind === 'lights') return p.state !== 'open' && p.state !== 'lit';
  return p.kind === 'arcade';
}

/** The usable prop nearest the feet, within reach of its footprint, or null. */
export function nearUsable(props: readonly PropView[], at: Vec2, reach = USE_REACH): PropView | null {
  let best: PropView | null = null, bestD = Infinity;
  for (const p of props) {
    if (!usable(p)) continue;
    const qx = Math.max(p.x, Math.min(at.x, p.x + p.w)), qy = Math.max(p.y, Math.min(at.y, p.y + p.h));
    const d = Math.hypot(at.x - qx, at.y - qy);
    if (d > reach) continue;
    // On a tie the prop whose middle is closer wins, so the cabinet straight ahead beats the one beside it.
    if (!best || d < bestD || (d === bestD && centerDist(p, at) < centerDist(best, at))) { best = p; bestD = d; }
  }
  return best;
}

const centerDist = (p: PropView, at: Vec2): number => Math.hypot(at.x - (p.x + p.w / 2), at.y - (p.y + p.h / 2));
