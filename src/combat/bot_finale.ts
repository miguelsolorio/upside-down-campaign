// The bot's play in the final fight's first phase (bot.ts calls this; docs/level-16.md). It reads only what a player sees in the view: Vecna's
// "!" and pose and the warning ring growing round him. The rest of the fight is other plans': his orbs are dodged like a dart (bot_threat.ts),
// the Mind Flayer is bot_flayer.ts's and the channel is bot_ward.ts's, the same leash and the same fight as the Gate's ward.
//
//   dodge: when his blast is winding up, the ring round him is the blast's reach. The bot steps straight away from him until it is clear of it.
import type { SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

const X = ENEMY_DEFS.vecna5.x;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** Frames the ring has been up before the bot reacts: a player needs a moment to see it. */
const REACT = 2;
/** How far past the ring's edge the bot goes. */
const MARGIN = 8;

export interface FinaleEnv {
  walkable(x: number, y: number): boolean;
}

export interface FinaleSense {
  /** Call every frame. A step out of Vecna's blast while it winds up, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
}

export function createFinaleSense(env: FinaleEnv): FinaleSense {
  return {
    dodge(v, hx, hy) {
      const vecna = v.actors.find((a) => a.kind === 'enemy' && a.id === 'vecna5' && a.anim !== 'ko' && a.alert);
      if (!vecna || dist(hx, hy, vecna.x, vecna.y) >= X.blastR + MARGIN) return null;
      const ring = v.fx.find((f) => f.kind === 'ring' && f.life === X.blastWind && dist(f.x, f.y, vecna.x, vecna.y) < 8);
      if (!ring || ring.t < REACT) return null;
      // Straight away from him, bending round a wall.
      const a = Math.atan2(hy - vecna.y, hx - vecna.x);
      for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
        const ux = Math.cos(a + off), uy = Math.sin(a + off);
        if (env.walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
      }
      return [Math.cos(a), Math.sin(a)];
    },
  };
}
