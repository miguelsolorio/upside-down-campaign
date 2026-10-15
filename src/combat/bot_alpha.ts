// The bot's play against the Demodog Alpha (bot.ts calls this). It reads only what a player sees in the view: the Alpha's "!",
// its pose and where it stands, and where the bot stood when the wind-up began. Nothing here reaches into the sim.
//
//   dodge: during a lunge's wind-up the line is already locked, along where the hero stood when it began. The bot steps off that
//     line, sideways, and stays off it while the Alpha runs. A bite's wind-up (the Alpha right on top of it) is not dodged.
//   crouch: the pounce lands where the bot stands when the crouch ends, so it backs off while the Alpha is crouching, and steps
//     off the mark when it grows (bot_boss.ts reads every `mark` fx).
//   hit it while it howls: howlFirst puts a howling Alpha at the front of the foes, and the bot uses the Crit meter on it.
import type { SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

const X = ENEMY_DEFS.alpha.x;
/** Half the width of the lane the lunge sweeps, in px: the body plus a little. */
const LANE = 17;
/** An Alpha winding up closer than this is biting, not lunging. */
const BITE_NEAR = 36;
/** How far along the line the lunge reaches, in px. */
const REACH = (X.lungeT as number) * (X.lungeSpeed as number) + 12;
/** A player needs a moment to see the "!". The bot waits this many frames before it leaves the lane. */
const REACT = 3;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** A step straight away from (fx, fy), bending round walls. */
function away(hx: number, hy: number, fx: number, fy: number, walkable: (x: number, y: number) => boolean): [number, number] | null {
  const a = Math.atan2(hy - fy, hx - fx);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const ux = Math.cos(a + off), uy = Math.sin(a + off);
    if (walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
  }
  return null;
}

interface Line { ax: number; ay: number; ux: number; uy: number; age: number }

export interface AlphaSense {
  /** Call every frame. A step off the lunge line, or null. */
  dodge(v: SimView, hx: number, hy: number, walkable: (x: number, y: number) => boolean): [number, number] | null;
}

/** Puts a howling Alpha first: it is rooted, it takes double damage, and nothing else is worth hitting. */
export function howlFirst<T extends { kind: string; pose: string | undefined }>(foes: T[]): void {
  const i = foes.findIndex((f) => f.kind === 'alpha' && f.pose === 'howl');
  if (i > 0) foes.unshift(foes.splice(i, 1)[0] as T);
}

export function createAlphaSense(): AlphaSense {
  let line: Line | null = null;
  let side = 1;

  return {
    dodge(v, hx, hy, walkable) {
      const al = v.actors.find((a) => a.kind === 'enemy' && a.id === 'alpha' && a.anim !== 'ko');
      if (al && al.pose === 'crouch') {
        line = null;
        return away(hx, hy, al.x, al.y, walkable);
      }
      const winding = al !== undefined && al.alert && al.pose === undefined;
      const running = al !== undefined && !al.alert && al.anim === 'dash' && al.pose === undefined;
      if (!al || (!winding && !running)) { line = null; return null; }
      if (!line) {
        // The line begins at the Alpha and runs through where the bot stands as the "!" appears.
        if (!winding) return null;
        const d = dist(hx, hy, al.x, al.y);
        if (d <= BITE_NEAR) return null;
        line = { ax: al.x, ay: al.y, ux: (hx - al.x) / d, uy: (hy - al.y) / d, age: 0 };
      }
      line.age++;
      if (line.age <= REACT) return null;
      const rx = hx - line.ax, ry = hy - line.ay;
      const along = rx * line.ux + ry * line.uy;
      const lat = rx * line.uy - ry * line.ux;
      if (along < -6 || along > REACH || Math.abs(lat) >= LANE) return null;
      if (Math.abs(lat) > 1.5) side = lat > 0 ? 1 : -1;
      for (const sg of [side, -side]) {
        const px = line.uy * sg, py = -line.ux * sg;
        if (walkable(hx + px * 12, hy + py * 12)) { side = sg; return [px, py]; }
      }
      return null;
    },
  };
}
