// The bot and the void (bot.ts calls this). The Abyss's gaps, cliffs and rock are solid and a drop (Grid.drop), so the bot's map never routes
// onto them (nav.ts) and the bot never walks off an island. What it does read is the ring's edge during a twin Demogorgon's charge
// (docs/level-15.md): a hero with the void at his back has nowhere to step out of the lane, and the charge's shove pins him there. So while a
// twin is winding up (pose 'charge' under the red "!"), a bot within EDGE px of a drop walks away from it, to the open floor and a little
// farther, ahead of any other dodge. It reads only the grid and what a player sees: the pose and the "!".
import type { Grid, SimView } from '../core/types.ts';
import { TILE } from '../core/config.ts';

/** How near the edge, in px from the feet to the nearest drop tile, the bot starts to walk away from it, and how much farther it goes before it stops. */
export const EDGE = 30;
const EASE = 18;
/** How far the bot looks for a drop, in tiles, and how many directions it tries when it leaves. */
const LOOK = 3;
const DIRS = 16;
const TAU = Math.PI * 2;

export interface VoidSense {
  /** Call every frame. A step away from the edge while a twin winds up and the bot is near it, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
  /** Distance from a point to the nearest drop tile, in px, or Infinity with none within sight. */
  edgeDist(x: number, y: number): number;
}

export function createVoidSense(grid: Grid, walkable: (x: number, y: number) => boolean): VoidSense {
  const drop = grid.drop;
  /** Walking away from the edge: it carries on until it is EASE px clear, so the route does not pull it straight back. */
  let leaving = false;

  function edgeDist(x: number, y: number): number {
    if (!drop) return Infinity;
    const cx = Math.floor(x / TILE), cy = Math.floor((y - 4) / TILE);
    let best = Infinity;
    for (let ty = cy - LOOK; ty <= cy + LOOK; ty++) {
      for (let tx = cx - LOOK; tx <= cx + LOOK; tx++) {
        if (tx < 0 || ty < 0 || tx >= grid.w || ty >= grid.h || drop[ty * grid.w + tx] !== 1) continue;
        const dx = Math.max(tx * TILE - x, 0, x - (tx + 1) * TILE), dy = Math.max(ty * TILE - (y - 4), 0, (y - 4) - (ty + 1) * TILE);
        best = Math.min(best, Math.hypot(dx, dy));
      }
    }
    return best;
  }

  return {
    edgeDist,
    dodge(v, hx, hy) {
      if (!drop) return null;
      if (!v.actors.some((a) => a.kind === 'enemy' && a.id === 'twin' && a.pose === 'charge' && a.alert)) { leaving = false; return null; }
      const near = edgeDist(hx, hy);
      if (near > EDGE + (leaving ? EASE : 0)) { leaving = false; return null; }
      leaving = true;
      // The way that ends farthest from the edge within a few steps, over floor.
      let best: [number, number] | null = null;
      let bestScore = -1;
      for (let i = 0; i < DIRS; i++) {
        const a = (i * TAU) / DIRS;
        const ux = Math.cos(a), uy = Math.sin(a);
        if (!walkable(hx + ux * 12, hy + uy * 12)) continue;
        const score = edgeDist(hx + ux * 24, hy + uy * 24);
        if (score > bestScore) { bestScore = score; best = [ux, uy]; }
      }
      return best;
    },
  };
}
