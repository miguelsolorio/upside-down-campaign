// The bot's play against the Creel ghoul (bot.ts calls this). It reads only what a player sees: a ghoul's "!", its dash and where it stands,
// and where the bot stood when the "!" appeared. Nothing here reaches into the sim.
//
//   dodge: the lunge's line is locked as the wind-up begins, along where the hero stood. The bot steps off it, sideways, during the wind-up
//     and stays off it while the ghoul lunges. Every other moment of the fight is an ordinary melee fight (bot.ts).
import type { SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

const X = ENEMY_DEFS.ghoul.x;
/** Half the width of the lane the lunge sweeps, in px: the box a touch hurts in, and a little more. */
const LANE = 14;
/** How far along the line the lunge reaches, in px. */
const REACH = X.lungeT * X.lungeSpeed + 12;
/** A ghoul winding up closer than this is on top of the hero: there is no line worth leaving. */
const CLOSE = 8;
/** A player needs a moment to see the "!". The bot waits this many frames before it leaves the lane. */
const REACT = 2;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** A ghoul's lunge line: from where it began winding up, along the unit vector through where the bot stood then. */
interface Line { ax: number; ay: number; ux: number; uy: number; age: number }

export interface GhoulSense {
  /** Call every frame. A step off a lunge line the bot stands on, or null. */
  dodge(v: SimView, hx: number, hy: number, walkable: (x: number, y: number) => boolean): [number, number] | null;
}

export function createGhoulSense(): GhoulSense {
  let lines: Line[] = [];
  let side = 1;

  return {
    dodge(v, hx, hy, walkable) {
      const gs = v.actors.filter((a) => a.kind === 'enemy' && a.id === 'ghoul' && a.anim !== 'ko');
      const live: Line[] = [];
      for (const g of gs) {
        const winding = g.alert;
        const running = !g.alert && g.anim === 'dash';
        if (!winding && !running) continue;
        // A lunge in flight belongs to the line it began on: the ghoul is on it, no further than its reach.
        let line = lines.find((l) => {
          const rx = g.x - l.ax, ry = g.y - l.ay;
          return Math.abs(rx * l.uy - ry * l.ux) < 3 && rx * l.ux + ry * l.uy > -2 && rx * l.ux + ry * l.uy <= REACH;
        });
        if (!line) {
          // A new "!": the line begins at the ghoul and runs through where the bot stands as it appears.
          if (!winding) continue;
          const d = dist(hx, hy, g.x, g.y);
          if (d <= CLOSE) continue;
          line = { ax: g.x, ay: g.y, ux: (hx - g.x) / d, uy: (hy - g.y) / d, age: 0 };
        }
        if (!live.includes(line)) live.push(line);
      }
      lines = live;
      for (const l of lines) l.age++;
      for (const l of lines) {
        if (l.age <= REACT) continue;
        const rx = hx - l.ax, ry = hy - l.ay;
        const along = rx * l.ux + ry * l.uy;
        const lat = rx * l.uy - ry * l.ux;
        if (along < -6 || along > REACH || Math.abs(lat) >= LANE) continue;
        if (Math.abs(lat) > 1.5) side = lat > 0 ? 1 : -1;
        for (const sg of [side, -side]) {
          const px = l.uy * sg, py = -l.ux * sg;
          if (walkable(hx + px * 12, hy + py * 12)) { side = sg; return [px, py]; }
        }
      }
      return null;
    },
  };
}
