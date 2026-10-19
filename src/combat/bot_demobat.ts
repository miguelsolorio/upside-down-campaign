// The bot's play against the demobats (bot.ts calls this). It reads only what a player sees: a bat's "!" and crouch, its dive, how high it
// flies, and who in the party shoots. Nothing here reaches into the sim.
//
//   dodge: a dive's line is locked as the wind-up begins, along where the hero stood. The bot steps off it, sideways, during the wind-up and
//     stays off it while the bat dives. The careless bot does not.
//   foe: a bat circling out of reach is not a target for a swing, so a hero who swings ignores it and walks on (it would circle him for ever and
//     the bot would chase it round). It becomes one when it is low, a dive's end or a stun, and close enough to reach. A hero who shoots, or
//     bursts, reaches a bat at any height, so it is always a target for him.
//   lead: when a flock is in sight and the party has a standing hero who shoots, that hero leads; when the flock is gone the bot swaps back.
import type { ActorView, HeroId, PartyHud, SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

const X = ENEMY_DEFS.demobat.x;
/** Half the width of the lane a dive sweeps, in px: the px a dive touches in, and a little more. */
const LANE = 14;
/** How far along the line a dive reaches, in px. */
const REACH = X.diveT * X.diveSpeed + 12;
/** A bat winding up closer than this is on top of the hero: there is no line worth leaving. */
const CLOSE = 8;
/** A player needs a moment to see the "!". The bot waits this many frames before it leaves the lane. */
const REACT = 2;
/** A flock this close is in sight, in px. */
const SEEN = 220;
/** A low bat is worth a swing when it is this much further than the swing reaches, in px. */
const SLACK = 12;
/** The heroes whose basic attack is a shot: it flies to a bat at any height. */
const SHOOTERS: ReadonlySet<HeroId> = new Set<HeroId>(['lucas', 'will', 'nancy']);
/** A shooter hurt below this share of HP does not take the lead. */
const FIT = 0.35;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const isBat = (a: ActorView): boolean => a.kind === 'enemy' && a.id === 'demobat' && a.anim !== 'ko';

/** A bat's dive line: from where it began winding up, along the unit vector through where the bot stood then. */
interface Line { ax: number; ay: number; ux: number; uy: number; age: number }

/** Whether a bat is a target for a hero `d` px away who reaches `reach` px with a swing (or shoots, for any bat). */
export function batFoe(a: ActorView, d: number, shooter: boolean, reach: number): boolean {
  return a.id !== 'demobat' || shooter || (a.z < X.low && d <= reach + SLACK);
}

export interface BatSense {
  /** Call every frame. A step off a dive line the bot stands on, or null. */
  dodge(v: SimView, hx: number, hy: number, walkable: (x: number, y: number) => boolean): [number, number] | null;
  /** The party slot to swap to, or -1. Call every frame. */
  lead(v: SimView, me: PartyHud, hx: number, hy: number): number;
}

export const isShooter = (id: HeroId): boolean => SHOOTERS.has(id);

export function createBatSense(): BatSense {
  let lines: Line[] = [];
  let side = 1;
  let back: HeroId | null = null;

  return {
    dodge(v, hx, hy, walkable) {
      const live: Line[] = [];
      for (const g of v.actors.filter(isBat)) {
        const winding = g.pose === 'crouch';
        const running = g.pose === 'charge';
        if (!winding && !running) continue;
        // A dive in flight belongs to the line it began on: the bat is on it, no further than its reach.
        let line = lines.find((l) => {
          const rx = g.x - l.ax, ry = g.y - l.ay;
          return Math.abs(rx * l.uy - ry * l.ux) < 3 && rx * l.ux + ry * l.uy > -2 && rx * l.ux + ry * l.uy <= REACH;
        });
        if (!line) {
          // A new "!": the line begins at the bat and runs through where the bot stands as it appears.
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

    lead(v, me, hx, hy) {
      const slot = (id: HeroId | null): number =>
        v.hud.party.findIndex((p) => p.id === id && !p.active && !p.ko && (p.curse ?? 0) === 0 && p.hp >= p.hpMax * FIT);
      if (v.actors.some((a) => isBat(a) && a.hidden !== true && dist(hx, hy, a.x, a.y) <= SEEN)) {
        if (SHOOTERS.has(me.id)) return -1;
        const pick = v.hud.party.find((p) => SHOOTERS.has(p.id) && slot(p.id) >= 0);
        if (!pick) return -1;
        back = me.id;
        return slot(pick.id);
      }
      // The flock is gone: whoever the shooter relieved takes the lead again.
      const was = back;
      back = null;
      return was !== null && SHOOTERS.has(me.id) ? slot(was) : -1;
    },
  };
}
