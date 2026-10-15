// The bot's pick of an item to detour for (bot.ts calls this). It reads only the view.
import type { SimView, Vec2 } from '../core/types.ts';

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** A pickup worth a detour: Eggos when hurt, Cokes when dry, quarters when they are right there. */
export function pickupNear(v: SimView, hx: number, hy: number, hpFrac: number, mpFrac: number): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = 1e9;
  for (const it of v.items) {
    const d = dist(hx, hy, it.x, it.y);
    const reach = it.kind === 'quarter' ? 40 : it.kind === 'eggo' ? (hpFrac < 0.7 ? 120 : 24) : mpFrac < 0.5 ? 100 : 24;
    if (d < reach && d < bestD) { best = { x: it.x, y: it.y }; bestD = d; }
  }
  return best;
}
