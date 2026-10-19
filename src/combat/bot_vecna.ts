// The bot's play against Vecna (bot.ts calls this). It reads only what a player sees in the view: the orbs and which one the clock marked
// (ActorView.marked), Vecna's pose and height, the whip's line, the curses on the party's slots and the Walkman. Nothing here reaches into
// the sim, and nothing wakes or opens anything.
//
//   dodge: the whip's line is warned from the first frame of the wind-up (pose 'whip', ActorView.aim its tip), so the bot sidesteps out of it
//     by the shortest way. A debris mark on the floor is left by the Demogorgon's mark rule (bot_boss.ts), which takes any 'mark' fx. The
//     careless bot does neither.
//   plan, in this order:
//     1. Under a curse the marked orb comes first: breaking it lifts the curse, and the hero two levels above the one up, if there is one,
//        takes it on (Max's Walkman, if she is there and it is ready, is bot_curse.ts's and comes before this).
//     2. In Float (he is up in the air, out of a swing's reach) a hero who reaches him leads: Lucas, Will or Nancy, or Eleven while she has
//        the MP for a Mind Blast. With none in the party it breaks the nearest standing orb to pull him down, and waits for one to regrow when
//        none stands.
//     3. Otherwise it hits him: on the floor in Clock and Burn, and on the floor in Float while an orb has pulled him down.
//   The crit meter goes off when he is close.
import type { ActorView, PartyHud, SimView, Vec2 } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Finish } from './bot_boss.ts';
import type { Style } from './bot_billy.ts';
import { isShooter } from './bot_demobat.ts';
import { wantsSpecial } from './bot_talents.ts';

const X = ENEMY_DEFS.vecna.x;
const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** How far from the whip's line the bot stands clear: its half width and a little slack. */
const LINE_PAD = X.whipHalf + 6;
/** Frames a warning is up before the bot reacts: a player needs a moment to see it. */
const REACT = 2;
/** He is up when he is at least this high, in px (his height in Float is 24). */
const HIGH = 20;
/** Just above the sim's 0.15 dead zone: turns the hero to face a target without walking anywhere. */
const NUDGE = 0.2;
/** A shooter's aim is one of eight lines: the most it may be off one, in px, before it strafes. Eleven's beam is a little wider. */
const OFF_LINE = 9;
const OFF_BEAM = 12;
/** The crit meter goes off with him this close. */
const BURST_RANGE = 190;
/** Frames between two swaps, and between two Mind Blasts. */
const SWAP_GAP = 40;
const CAST_GAP = 45;
/** A hero this many levels above the one up takes over the marked orb. */
const LEVELS = 2;
/** A hero hurt below this share of HP does not lead. */
const FIT = 0.35;

export interface VecnaEnv {
  walkable(x: number, y: number): boolean;
  /** A unit step toward a point, round walls. */
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
  clearLine(ax: number, ay: number, bx: number, by: number): boolean;
  careless: boolean;
}

export interface VecnaSense {
  /** Call every frame. A step out of a whip's line, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
  /** The plan while Vecna is up, or null when he is not. */
  plan(v: SimView, hx: number, hy: number, style: Style): Finish | null;
}

const nearest = (list: ActorView[], x: number, y: number): ActorView | undefined => list.slice().sort((p, q) => dist(x, y, p.x, p.y) - dist(x, y, q.x, q.y))[0];
const isOrb = (a: ActorView): boolean => a.kind === 'enemy' && a.id === 'orb' && a.anim !== 'ko' && a.pose !== 'severed';
const snap8 = (a: number): number => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
const angDiff = (a: number, b: number): number => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

function toSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return dist(px, py, ax + vx * t, ay + vy * t);
}

/** The party member who can reach a Vecna in the air, preferring the one who is up: a shooter, or Eleven with the MP for a Mind Blast. */
function ranged(v: SimView): PartyHud | undefined {
  const can = (p: PartyHud): boolean =>
    !p.ko && (p.curse ?? 0) === 0 && p.hp >= p.hpMax * FIT && (isShooter(p.id) || (p.id === 'eleven' && p.mp >= HERO_DEFS.eleven.special.mp));
  return v.hud.party.find((p) => p.active && can(p)) ?? v.hud.party.find(can);
}

/** The standing hero two levels above the one who is up, the highest of them: the one to break an orb against the clock. */
function stronger(v: SimView, me: PartyHud): PartyHud | undefined {
  let best: PartyHud | undefined;
  for (const p of v.hud.party) {
    if (p.active || p.ko || (p.curse ?? 0) > 0 || p.hp < p.hpMax * FIT || p.level < me.level + LEVELS) continue;
    if (!best || p.level > best.level) best = p;
  }
  return best;
}

export function createVecnaSense(env: VecnaEnv): VecnaSense {
  let frame = 0;
  let lastSwap = -999;
  let lastCast = -999;

  /** The shortest way out of the whip's line to open floor, as a unit step. */
  function escape(hx: number, hy: number, ax: number, ay: number, bx: number, by: number): [number, number] | null {
    let best: [number, number] | null = null;
    let bestL = Infinity;
    for (let i = 0; i < 16; i++) {
      const ux = Math.cos((i * TAU) / 16), uy = Math.sin((i * TAU) / 16);
      for (let l = 4; l <= 40 && l < bestL; l += 4) {
        const x = hx + ux * l, y = hy + uy * l;
        if (!env.walkable(x, y)) break;
        if (toSeg(x, y, ax, ay, bx, by) >= LINE_PAD + 2) { best = [ux, uy]; bestL = l; break; }
      }
    }
    return best;
  }

  function dodge(v: SimView, hx: number, hy: number): [number, number] | null {
    if (env.careless) return null;
    const a = v.actors.find((o) => o.kind === 'enemy' && o.id === 'vecna' && o.pose === 'whip' && o.aim !== undefined);
    if (!a || !a.aim || a.t < REACT) return null;
    return toSeg(hx, hy, a.x, a.y, a.aim.x, a.aim.y) < LINE_PAD ? escape(hx, hy, a.x, a.y, a.aim.x, a.aim.y) : null;
  }

  /** Walks to the target and, in position, swings or shoots. A shooter lines up one of its eight shots first; Eleven casts her beam when asked. */
  function attack(me: PartyHud, hx: number, hy: number, t: Vec2, style: Style, beam: boolean): Finish {
    const out: Finish = { swapTo: -1, mv: [0, 0], cast: false, attack: false };
    const d = dist(hx, hy, t.x, t.y);
    if (d > style.hold + 6 || !env.clearLine(hx, hy, t.x, t.y)) { out.mv = env.walkTo(hx, hy, t.x, t.y); return out; }
    const ang = Math.atan2(t.y - hy, t.x - hx);
    const a8 = snap8(ang);
    const miss = d * Math.sin(angDiff(ang, a8));
    const aims = isShooter(me.id) || (beam && me.id === 'eleven');
    if (aims && miss >= (me.id === 'eleven' ? OFF_BEAM : OFF_LINE)) {
      // Strafe along the perpendicular to line the shot up.
      const px = -Math.sin(a8), py = Math.cos(a8);
      const sg = Math.sign((t.x - hx) * px + (t.y - hy) * py) || 1;
      out.mv = [px * sg, py * sg];
      return out;
    }
    const face = aims ? a8 : ang;
    out.mv = [Math.cos(face) * NUDGE, Math.sin(face) * NUDGE];
    const near = { x: t.x, y: t.y, kind: 'vecna', d, burning: false };
    if (beam && me.id === 'eleven') {
      if (me.mp >= HERO_DEFS.eleven.special.mp && d <= HERO_DEFS.eleven.special.reach - 12 && frame - lastCast > CAST_GAP) { out.cast = true; lastCast = frame; }
    } else {
      out.attack = d <= style.reach;
      // The Specials that hurt one big foe: Dustin's spray up close, Lucas's triple shot, Will's fireball, Nancy's shotgun.
      if (out.attack && me.id !== 'eleven' && frame - lastCast > CAST_GAP && wantsSpecial(me, { near, foes: [near], miss, shielded: false, dart: false, ward: false })) { out.cast = true; lastCast = frame; }
    }
    return out;
  }

  function plan(v: SimView, hx: number, hy: number, style: Style): Finish | null {
    frame++;
    const vec = v.actors.find((a) => a.kind === 'enemy' && a.id === 'vecna' && a.anim !== 'ko' && a.hidden !== true);
    const me = v.hud.party.find((p) => p.active);
    if (!vec || !me) return null;
    const orbs = v.actors.filter(isOrb);
    const cursed = v.hud.party.some((p) => (p.curse ?? 0) > 0);
    const air = vec.pose !== 'stun' && vec.z >= HIGH;
    let who: PartyHud = me;
    let target: ActorView | undefined = vec;
    let beam = false;
    const marked = cursed ? orbs.find((o) => o.marked === true) : undefined;
    if (marked) {
      target = marked;
      who = stronger(v, me) ?? me;
    } else if (air) {
      const lead = ranged(v);
      if (lead) { who = lead; beam = true; } else target = nearest(orbs, hx, hy);
    }
    // Nothing to hit while he floats and every orb is broken: wait for one to grow back.
    if (!target) return { swapTo: -1, mv: [0, 0], cast: false };
    const idle: Finish = { swapTo: -1, mv: [0, 0], cast: false, attack: false };
    const out = who === me ? attack(me, hx, hy, target, style, beam) : idle;
    if (who !== me && frame - lastSwap > SWAP_GAP) {
      out.swapTo = v.hud.party.findIndex((p) => p.id === who.id);
      lastSwap = frame;
    }
    out.burst = v.hud.burstReady && dist(hx, hy, vec.x, vec.y) < BURST_RANGE;
    return out;
  }

  return { dodge, plan };
}
