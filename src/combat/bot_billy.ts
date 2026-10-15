// The bot's play against Flayed Billy (bot.ts calls this). It reads only what a player sees in the view: his "!", his pose and anim, where
// he stands, the party bar and the reach (ActorView.k). Nothing here reaches into the sim.
//
//   charge: the "!" with pose 'charge'. The line is locked where the bot stands when it ends, so it backs away while the "!" is up (more
//     room to leave the lane, and a wall closer behind it to stun him on), then steps sideways out of the lane once he runs, reading
//     his heading from where he was a frame ago.
//   grab: the "!" with pose 'grab'. It backs off until it is clear of his reach. A hold is the swap's (bot_hold.ts, called by bot.ts).
//   stun: pose 'stun' on a wall. It goes straight for him and swings, whatever else is nearer. The Crit meter goes off at him too (bot.ts).
//   pinned: pose 'pinned'. It swaps to Eleven and walks up until it stands within 24 px of him, and stands there while the reach climbs
//     and the Flayed he called go at her. With Eleven down it swings at him instead: a try stands her back up.
import type { ActorView, SimView, Vec2 } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import type { Finish } from './bot_boss.ts';

const X = ENEMY_DEFS.billy.x;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** Sideways distance from the charge line that clears his body. */
const LANE = 16;
/** Frames the bot waits after he starts to run before it leaves the lane: a player needs a moment to see it. */
const REACT = 1;
/** The bot backs away from a planted charge while he is closer than this, in px. */
const BACK_OFF = 110;
/** Clear of a grab: its reach plus a step. */
const SAFE = (X.grabHit as number) + 10;
/** How close Eleven stands to a pinned Billy. The reach is 32 px, so this leaves room for a step of slop. */
const STAND = 24;

export interface BillyEnv {
  walkable(x: number, y: number): boolean;
  /** A unit step toward a point, round walls. */
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
}

/** How close the active hero likes to stand to what it fights, and how far it reaches. */
export interface Style { hold: number; reach: number }

export interface BillySense {
  /** Call every frame. A step out of the way of a charge or a grab, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
  /** The plan against a pinned Billy, or null while he is not pinned. */
  reach(v: SimView, hx: number, hy: number, style: Style): Finish | null;
  /** The plan against a stunned Billy, or null. */
  punish(v: SimView, hx: number, hy: number, style: Style): Finish | null;
}

const find = (v: SimView, pred: (a: ActorView) => boolean): ActorView | undefined =>
  v.actors.find((a) => a.kind === 'enemy' && a.id === 'billy' && a.anim !== 'ko' && pred(a));

export function createBillySense(env: BillyEnv): BillySense {
  let prev: Vec2 | null = null;
  let side = 1;
  let runAge = 0;

  /** A step straight away from (fx, fy), bending round walls. */
  function away(hx: number, hy: number, fx: number, fy: number): [number, number] | null {
    const a = Math.atan2(hy - fy, hx - fx);
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
      const ux = Math.cos(a + off), uy = Math.sin(a + off);
      if (env.walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
    }
    return null;
  }

  /** He is running along the line from (p) to (bx, by): get out of its lane. */
  function leaveLane(hx: number, hy: number, bx: number, by: number, p: Vec2): [number, number] | null {
    const sp = dist(p.x, p.y, bx, by);
    if (sp < 2) return null;
    const ux = (bx - p.x) / sp, uy = (by - p.y) / sp;
    const rx = hx - bx, ry = hy - by;
    const along = rx * ux + ry * uy;
    const lat = rx * uy - ry * ux;
    if (along < -6 || Math.abs(lat) >= LANE) return null;
    if (Math.abs(lat) > 1.5) side = lat > 0 ? -1 : 1;
    for (const sg of [side, -side]) {
      const px = -uy * sg, py = ux * sg;
      if (env.walkable(hx + px * 12, hy + py * 12)) { side = sg; return [px, py]; }
    }
    return null;
  }

  function dodge(v: SimView, hx: number, hy: number): [number, number] | null {
    const b = find(v, (a) => a.pose !== 'pinned');
    const was = prev;
    prev = b ? { x: b.x, y: b.y } : null;
    if (!b) { runAge = 0; return null; }
    const d = dist(hx, hy, b.x, b.y);
    if (b.pose === 'grab' && b.alert) return d < SAFE ? away(hx, hy, b.x, b.y) : null;
    if (b.pose !== 'charge') { runAge = 0; return null; }
    // Planted under the "!": it will run at wherever the hero stands when this ends, so use the time to back off.
    if (b.alert) { runAge = 0; return d < BACK_OFF ? away(hx, hy, b.x, b.y) : null; }
    runAge = was && dist(was.x, was.y, b.x, b.y) >= 2 ? runAge + 1 : 0;
    return was && runAge > REACT ? leaveLane(hx, hy, b.x, b.y, was) : null;
  }

  function reach(v: SimView, hx: number, hy: number, style: Style): Finish | null {
    const b = find(v, (a) => a.pose === 'pinned');
    const me = v.hud.party.find((p) => p.active);
    if (!b || !me) return null;
    const out: Finish = { swapTo: -1, mv: [0, 0], cast: false, attack: false };
    const slot = v.hud.party.findIndex((p) => p.id === 'eleven' && !p.ko);
    const d = dist(hx, hy, b.x, b.y);
    if (me.id === 'eleven') {
      if (d > STAND) out.mv = env.walkTo(hx, hy, b.x, b.y);
      return out;
    }
    if (slot >= 0) {
      // She is on the bench: the swap comes first, and the walk starts while it lands.
      out.swapTo = slot;
      out.mv = env.walkTo(hx, hy, b.x, b.y);
      return out;
    }
    // She is down, or not in the party: a swing at him is a try, and a try stands her back up.
    if (d > style.hold + 6) out.mv = env.walkTo(hx, hy, b.x, b.y);
    else {
      const a = Math.atan2(b.y - hy, b.x - hx);
      out.mv = [Math.cos(a) * 0.2, Math.sin(a) * 0.2];
    }
    out.attack = d <= style.reach;
    return out;
  }

  function punish(v: SimView, hx: number, hy: number, style: Style): Finish | null {
    const b = find(v, (a) => a.pose === 'stun');
    if (!b) return null;
    const d = dist(hx, hy, b.x, b.y);
    if (d > style.hold + 6) return { swapTo: -1, mv: env.walkTo(hx, hy, b.x, b.y), cast: false, attack: d <= style.reach };
    const a = Math.atan2(b.y - hy, b.x - hx);
    return { swapTo: -1, mv: [Math.cos(a) * 0.2, Math.sin(a) * 0.2], cast: false, attack: true };
  }

  return { dodge, reach, punish };
}
