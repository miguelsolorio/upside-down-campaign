// The bot's play against Grigori (bot.ts calls this). It reads only what a player sees in the view: his "!", his pose and anim, which
// way he faces, where he stands, and the party bar. Nothing here reaches into the sim.
//
//   haymaker: the "!" with no pose. It backs off until it is clear of his 32 px reach and stands there. He faces the hero at once, so
//     the bot leaves along a diagonal: he turns to the nearest of four ways, and a hero on a diagonal is already 45 degrees off it.
//   grab: the "!" with pose 'grab', then the lunge. The line is locked when the wind-up begins, along where the bot stood. It steps
//     off the line, sideways, and stays off it until the lunge is over.
//   flank: after a swing or a lunge he recovers without turning. The bot goes to his side (78 degrees off the way he faces, past the
//     70 degree guard) and hits him there until he starts walking again.
//   the power box: bot_box.ts, when the party has a shooter.
//   held: a swap (bot_hold.ts, called by bot.ts).
// A stunned Grigori has no front guard, so the ordinary fight takes over, and the Crit meter goes off at him.
import type { ActorView, SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { DIR_ANGLE } from '../enemies/shield.ts';
import type { Finish } from './bot_boss.ts';
import { createBoxPlay, nearPlate } from './bot_box.ts';

const X = ENEMY_DEFS.grigori.x;
const RAD = Math.PI / 180;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** Clear of the haymaker: its reach plus a step. The bot stands this far off while the "!" is up. */
const SAFE = (X.reach as number) + 5;
/** Half the width of the lunge's lane, and how far along the line it reaches, in px. */
const LANE = 17;
const REACH = (X.lungeT as number) * (X.lungeSpeed as number) + 14;
/** Frames the bot waits after the "!" of a lunge appears before it leaves the lane. */
const REACT = 2;
/** The angle off his front the bot flanks from. The guard is 70 degrees. */
const SIDE = 78 * RAD;
/** Past this the guard is gone for a hit that lands a few frames later: his guard is 70 degrees. */
const PAST = 72 * RAD;
const NUDGE = 0.2;

export interface GrigoriEnv {
  walkable(x: number, y: number): boolean;
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
}

/** How close the active hero likes to stand to what it fights, and how far it reaches. */
export interface Style { hold: number; reach: number }

export interface GrigoriSense {
  /** One frame against Grigori, or null when he is not awake. `style` is how the active hero likes to fight. */
  plan(v: SimView, hx: number, hy: number, style: Style): Finish | null;
}

function wrap(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createGrigoriSense(env: GrigoriEnv): GrigoriSense {
  const box = createBoxPlay(env);
  let frame = 0;
  let wasHay = false, wasGrab = false;
  let recoverUntil = -1;
  let line: { ax: number; ay: number; ux: number; uy: number; age: number } | null = null;
  let side = 1;

  /** A step directly away from (fx, fy), bending round walls. */
  function away(hx: number, hy: number, fx: number, fy: number): [number, number] {
    const a = Math.atan2(hy - fy, hx - fx);
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
      const ux = Math.cos(a + off), uy = Math.sin(a + off);
      if (env.walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
    }
    return [Math.cos(a), Math.sin(a)];
  }

  /** The haymaker is coming: out of reach, along the diagonal nearest the way the bot is from him, and then still. */
  function retreat(g: ActorView, hx: number, hy: number): [number, number] {
    const d = dist(hx, hy, g.x, g.y);
    if (d >= SAFE + 3) return [0, 0];
    const bearing = Math.atan2(hy - g.y, hx - g.x);
    const diag = Math.round((bearing - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4;
    const tx = g.x + Math.cos(diag) * (SAFE + 8), ty = g.y + Math.sin(diag) * (SAFE + 8);
    if (!env.walkable(tx, ty)) return away(hx, hy, g.x, g.y);
    const m = Math.hypot(tx - hx, ty - hy) || 1;
    return [(tx - hx) / m, (ty - hy) / m];
  }

  /** Off the lunge's lane, sideways, once it has had REACT frames to be seen. Null while the bot is clear of it. */
  function sidestep(g: ActorView, hx: number, hy: number, winding: boolean): [number, number] | null {
    if (!line) {
      if (!winding) return null;
      const d = dist(hx, hy, g.x, g.y);
      if (d > REACH + 8) return [0, 0];
      line = { ax: g.x, ay: g.y, ux: (hx - g.x) / (d || 1), uy: (hy - g.y) / (d || 1), age: 0 };
    }
    line.age++;
    if (line.age <= REACT) return null;
    const rx = hx - line.ax, ry = hy - line.ay;
    const along = rx * line.ux + ry * line.uy;
    const lat = rx * line.uy - ry * line.ux;
    if (along < -6 || along > REACH || Math.abs(lat) >= LANE + 3) return [0, 0];
    if (Math.abs(lat) > 1.5) side = lat > 0 ? 1 : -1;
    for (const sg of [side, -side]) {
      const px = line.uy * sg, py = -line.ux * sg;
      if (env.walkable(hx + px * 12, hy + py * 12)) { side = sg; return [px, py]; }
    }
    return [0, 0];
  }

  /**
   * In his recovery: to his side, then hit him. The swing lands a few frames after the press and he does not turn, so the bot presses
   * once it is past the guard (72 degrees off his front, 70 being the edge) and in reach, and stands still to do it.
   */
  function flank(g: ActorView, hx: number, hy: number, style: Style): Finish {
    const face = DIR_ANGLE[g.dir];
    const off = Math.abs(wrap(Math.atan2(hy - g.y, hx - g.x) - face));
    const d = dist(hx, hy, g.x, g.y);
    if (off >= PAST && d <= style.reach) {
      const a = Math.atan2(g.y - hy, g.x - hx);
      return { swapTo: -1, mv: [Math.cos(a) * NUDGE, Math.sin(a) * NUDGE], cast: false, attack: true };
    }
    const r = Math.max(20, Math.min(32, style.hold + 6));
    let best: [number, number] | null = null, bestD = Infinity;
    for (const sg of [1, -1]) {
      const a = face + sg * SIDE;
      const qx = g.x + Math.cos(a) * r, qy = g.y + Math.sin(a) * r;
      if (!env.walkable(qx, qy)) continue;
      const dq = dist(hx, hy, qx, qy);
      if (dq < bestD) { best = [qx, qy]; bestD = dq; }
    }
    if (!best) return { swapTo: -1, mv: [0, 0], cast: false, attack: d <= style.reach };
    return { swapTo: -1, mv: env.walkTo(hx, hy, best[0], best[1]), cast: false, attack: false };
  }

  return {
    plan(v, hx, hy, style) {
      frame++;
      const g = v.actors.find((a) => a.kind === 'enemy' && a.id === 'grigori' && a.anim !== 'ko');
      if (!g) { wasHay = false; wasGrab = false; recoverUntil = -1; line = null; return null; }
      const hay = g.alert && g.pose === undefined;
      const grab = g.pose === 'grab' && (g.alert || g.anim === 'dash');
      const hold45 = g.pose === 'grab' && !g.alert && g.anim !== 'dash';
      const hp = v.hud.boss;
      const rage = hp !== null && hp.hp <= hp.hpMax * (X.rageAt as number);
      // A swing that has just landed or missed, or a lunge or a throw that has just ended: he recovers and doesn't turn.
      if (wasHay && !hay && g.pose === undefined) recoverUntil = frame + (rage ? X.rageRecover : X.recover) - 6;
      if (wasGrab && !grab && !hold45 && g.pose === undefined) recoverUntil = frame + (X.grabRecover as number) - 6;
      if ((wasGrab && hold45) || hay || grab || hold45 || g.pose === 'stun') recoverUntil = -1;
      if (g.anim === 'walk') recoverUntil = -1;
      wasHay = hay;
      wasGrab = grab || hold45;
      const d = dist(hx, hy, g.x, g.y);

      if (hay) { line = null; return { swapTo: -1, mv: d < SAFE + 3 ? retreat(g, hx, hy) : [0, 0], cast: false, attack: false }; }
      if (grab) {
        const mv = sidestep(g, hx, hy, g.alert);
        if (mv) return { swapTo: -1, mv, cast: false, attack: false };
        return null;
      }
      line = null;
      // The plates are firing: the bot keeps off them, and hits him from where it stands if he is in reach.
      if (nearPlate(v, hx, hy, true)) return { swapTo: -1, mv: [0, 0], cast: false, attack: d <= style.reach };
      if (g.pose === 'stun') return null;
      const shot = box.read(v, g, hx, hy);
      if (shot) return { swapTo: shot.swapTo, mv: shot.mv, cast: false, attack: shot.attack };
      if (frame < recoverUntil) return flank(g, hx, hy, style);
      return null;
    },
  };
}
