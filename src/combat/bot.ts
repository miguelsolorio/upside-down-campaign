// ?bot=1 and headless tests. Owner: Sim agent.
// Plays the stage by itself: A* on the grid toward the next waypoint, fight whatever is close, step aside from
// inbound darts, swap when the active hero is low. Gates are skipped: the bot calls sim.openProp itself when it
// reaches a waypoint flagged `open`, and sim.spawnGroup at one flagged `wake`. No randomness: same sim, same bot.
// Guards: it circles to the blind side instead of hacking at the shield, burns them with Dustin's spray, lets Eleven's
// Push break them, hits them while they recover, and steps out of the Warden's slam. Against the Demogorgon it leaves the
// charge line and the marks on the floor, and swaps to Eleven for the finisher (bot_boss.ts). It backs away from a vine's lash and a
// pod's swell unless a demodog is closing in (bot_threat.ts). Against the Alpha it steps off the lunge line and the marks and hits it
// while it howls (bot_alpha.ts). In a defense it stays by the ward, fights what is nearest her, and casts Babysit with Steve when two
// are on her (bot_ward.ts). When to cast each hero's Special, the Lv 6 holds and Hopper's wind-up are in bot_talents.ts. Rifle
// bullets are dodged like darts, a swap frees a held hero (bot_hold.ts), and Grigori is fought by getting round him while he
// recovers, with the power box when there is a shooter (bot_grigori.ts). Billy's charge and grab are stepped out of, his wall stun is hit
// and Eleven is walked up to him once he kneels (bot_billy.ts). Against the Mind Flayer it steps off a warned line, band or pool and hits the
// nearest leg, then the head when it is down (bot_flayer.ts). It steps out of a ghoul's lunge line during the wind-up (bot_ghoul.ts), slams
// the pinned pit Demogorgon with Hopper (bot_boss.ts), and under a curse swaps to Max if her Walkman is ready, else to Eddie, and attacks the
// clock (bot_curse.ts), careless or not. It ignores hazards and cameras.
import type { Dir, EnemyKind, Grid, PropKind, Sim, SimInput, SimView, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import type { EnemyDef } from '../enemies/defs.ts';
import { DIR_ANGLE, isShieldedKind } from '../enemies/shield.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Nav, Pos } from './state.ts';
import { astar, buildNav, nearestFree } from './nav.ts';
import { createBossSense } from './bot_boss.ts';
import { createGhoulSense } from './bot_ghoul.ts';
import { createCurseSense } from './bot_curse.ts';
import { createDashCross } from './bot_dash.ts';
import { createAlphaSense, howlFirst } from './bot_alpha.ts';
import { WARD_REACH, createWardSense, holdPost } from './bot_ward.ts';
import { createGrigoriSense } from './bot_grigori.ts';
import { createBillySense } from './bot_billy.ts';
import { createFlayerSense } from './bot_flayer.ts';
import { STYLE } from './bot_style.ts';
import { holdSwap } from './bot_hold.ts';
import { pickupNear } from './bot_pick.ts';
import { backOffFrom, dartThreat, slamThreat } from './bot_threat.ts';
import { breaksGuard, createCaster } from './bot_talents.ts';

export interface BotWaypoint extends Vec2 {
  /** Prop id to open when reached. */ open?: string;
  /** Group to wake when reached. */ wake?: string;
  /**
   * On the near side of a gap: the bot swaps to the party hero who has `dash`, faces the next waypoint, casts the special
   * to cross, and carries on toward the next waypoint. There is no flag that opens a gap for it.
   */
  dash?: true;
}

export interface Bot {
  next(sim: Sim): SimInput;
  /** True once the last waypoint is reached. */
  done(): boolean;
}

interface Foe {
  x: number; y: number; kind: string; d: number; ang: number;
  dir: Dir;
  /** A guard with its shield up. */
  up: boolean;
  /** In a wind-up, under the red "!". */
  windup: boolean;
  burning: boolean;
  /** The Demogorgon's pose. */
  pose: string | undefined;
}

/** Furniture that never moves. The bot's map treats it as wall, so it does not walk into it and learn the hard way. */
const FURNITURE = new Set<PropKind>(['tank', 'rack', 'generator', 'arcade', 'gap', 'crack']);
const isGuard = isShieldedKind;
const defOf = (kind: string): EnemyDef => ENEMY_DEFS[kind as EnemyKind];
/** How far past the shield's edge the bot circles to, so the guard's slow turn has not caught up. */
const FLANK_MARGIN = (40 * Math.PI) / 180;

/** Just above the sim's 0.15 dead zone: turns the hero to face a target without walking anywhere. */
const NUDGE = 0.2;
const ENGAGE = 120;
const CHASE = 260;
const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const snap8 = (a: number): number => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
/** a - b wrapped to -PI..PI. */
function wrap(a: number): number {
  let d = a % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
const angDiff = (a: number, b: number): number => Math.abs(wrap(a - b));

/**
 * `careless` plays like a player who does not watch the telegraphs: it never sidesteps a dart, a slam or a bash and never
 * circles a shielded guard, it just walks up and hits. It is a floor for how hard a stage is on someone who is not
 * dodging well, which the careful default bot hides.
 */
export function createBot(opts: { grid: Grid; waypoints: BotWaypoint[]; careless?: boolean }): Bot {
  const careless = opts.careless === true;
  let base = buildNav(opts.grid);
  let nav: Nav = base;
  let propsRead = false;
  const learned = new Set<number>();
  let wi = 0;
  let frame = 0;
  let path: Pos[] = [];
  let pathGoal = -1;
  let pathAge = 0;
  let lastSwap = -999, lastSpecial = -999;
  let dealt = 0, dealtAt = 0;
  let stillT = 0;
  /** The party burst freezes the whole field for about 150 frames: a hero who does not move then is not stuck. */
  let frozenUntil = -1;
  let lastX = Number.NaN, lastY = Number.NaN;
  let lastMag = 0;

  const tileOf = (x: number, y: number): Pos => ({ x: Math.floor(x / TILE), y: Math.floor((y - 4) / TILE) });
  const idle = (): SimInput => ({
    mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false,
    swapDelta: 0, swapTo: -1, burstPressed: false,
  });

  function clearLine(ax: number, ay: number, bx: number, by: number, lift = 4): boolean {
    const n = Math.ceil(dist(ax, ay, bx, by) / 4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const tx = Math.floor((ax + (bx - ax) * t) / TILE), ty = Math.floor((ay + (by - ay) * t - lift) / TILE);
      if (tx < 0 || ty < 0 || tx >= nav.w || ty >= nav.h || nav.blocked[ty * nav.w + tx] === 1) return false;
    }
    return true;
  }

  /** Unit vector toward (gx, gy), along an A* route when the straight line is blocked or far. */
  function walkTo(hx: number, hy: number, gx: number, gy: number): [number, number] {
    const direct = dist(hx, hy, gx, gy) < 70 && clearLine(hx, hy, gx, gy);
    let tx = gx, ty = gy;
    if (!direct) {
      const g = tileOf(gx, gy);
      const gt = nearestFree(nav, g.x, g.y) ?? g;
      const gi = gt.y * nav.w + gt.x;
      if (gi !== pathGoal || pathAge > 30 || (path.length === 0 && dist(hx, hy, gx, gy) > 10)) {
        const h = tileOf(hx, hy);
        path = astar(nav, h.x, h.y, gt.x, gt.y) ?? [];
        pathGoal = gi;
        pathAge = 0;
      }
      pathAge++;
      while (path.length > 0) {
        const n = path[0] as Pos;
        if (dist(hx, hy, n.x * TILE + TILE / 2, n.y * TILE + 12) < 4.5) path.shift(); else break;
      }
      if (path.length > 0) {
        const n = path[0] as Pos;
        tx = n.x * TILE + TILE / 2; ty = n.y * TILE + 12;
      }
    }
    const d = dist(hx, hy, tx, ty) || 1;
    return [(tx - hx) / d, (ty - hy) / d];
  }

  function foesOf(v: SimView, hx: number, hy: number): Foe[] {
    const out: Foe[] = [];
    for (const a of v.actors) {
      // A hidden enemy is faint or gone on screen, so the bot does not see it until Will's Cold spot or its own strike shows it.
      // The Mind Flayer's body and legs are the plan's (bot_flayer.ts), not the nearest foe.
      if (a.kind !== 'enemy' || a.anim === 'ko' || a.hidden === true || a.puddle === true || a.pose === 'rise' || a.id === 'flayer' || a.id === 'flayerleg') continue;
      out.push({
        x: a.x, y: a.y, kind: a.id, d: dist(hx, hy, a.x, a.y), ang: Math.atan2(a.y - hy, a.x - hx),
        dir: a.dir, up: a.guarding === true, windup: a.alert, burning: a.tint === 'orange', pose: a.pose,
      });
    }
    return out.sort((p, q) => p.d - q.d);
  }

  /** Foes behind walls or water that no route reaches are ignored for a while, so the bot does not pace at the creek. */
  const reach = new Map<string, { ok: boolean; until: number }>();
  /** Foes the bot swung at through a wall until it gave up, by tile, and the frame it may try them again. */
  const givenUp = new Map<string, number>();
  const foeKey = (f: Foe): string => `${Math.floor(f.x / TILE)},${Math.floor((f.y - 4) / TILE)}`;
  function reachable(hx: number, hy: number, f: Foe): boolean {
    const key = foeKey(f);
    if ((givenUp.get(key) ?? -1) > frame) return false;
    if (f.d < 36 || clearLine(hx, hy, f.x, f.y)) return true;
    const hit = reach.get(key);
    if (hit && frame < hit.until) return hit.ok;
    const h = tileOf(hx, hy), g = tileOf(f.x, f.y);
    const gt = nearestFree(nav, g.x, g.y) ?? g;
    const p = astar(nav, h.x, h.y, gt.x, gt.y);
    const ok = p !== null && p.length * TILE <= f.d * 2.5 + 100;
    reach.set(key, { ok, until: frame + 45 });
    return ok;
  }

  /**
   * The item the bot is going for. Two guards against a loop: an item is only worth a detour when the walk to it is about
   * as short as the line to it (a Coke behind a wall is not, and is skipped for a while), and once the bot has committed
   * to one it keeps going for a few seconds instead of re-deciding every frame, so reach edges cannot flip its goal.
   */
  let pick: { x: number; y: number; until: number } | null = null;
  const skipped = new Map<string, number>();
  function pickupGoal(v: SimView, hx: number, hy: number, hpFrac: number, mpFrac: number): Vec2 | null {
    if (pick && frame < pick.until && v.items.some((it) => it.x === pick?.x && it.y === pick?.y)) return pick;
    pick = null;
    const c = pickupNear(v, hx, hy, hpFrac, mpFrac);
    if (!c) return null;
    const key = `${Math.floor(c.x)},${Math.floor(c.y)}`;
    if (frame < (skipped.get(key) ?? 0)) return null;
    if (!clearLine(hx, hy, c.x, c.y)) {
      const h = tileOf(hx, hy), g = tileOf(c.x, c.y);
      const p = astar(nav, h.x, h.y, g.x, g.y);
      if (p === null || p.length * TILE > dist(hx, hy, c.x, c.y) * 1.6 + 32) { skipped.set(key, frame + 120); return null; }
    }
    pick = { x: c.x, y: c.y, until: frame + 240 };
    return pick;
  }

  const walkable = (x: number, y: number, n: Nav = nav): boolean => {
    const t = tileOf(x, y);
    return t.x >= 0 && t.y >= 0 && t.x < n.w && t.y < n.h && n.blocked[t.y * n.w + t.x] === 0;
  };

  /** True when the hero stands in front of the guard's shield. */
  const inArc = (f: Foe, hx: number, hy: number): boolean =>
    angDiff(Math.atan2(hy - f.y, hx - f.x), DIR_ANGLE[f.dir]) <= (defOf(f.kind).x.arc * Math.PI) / 180;

  /**
   * The next point on a circle around a guard, `r` px out, a few degrees toward its blind side. The bot walks there each
   * tick, so it sweeps around the guard on whichever side is open. Null when walls block both ways.
   */
  function orbitPoint(f: Foe, hx: number, hy: number, r: number): [number, number] | null {
    const facing = DIR_ANGLE[f.dir];
    const phi = Math.atan2(hy - f.y, hx - f.x);
    const first = wrap(phi - facing) >= 0 ? 1 : -1;
    const arc = (defOf(f.kind).x.arc * Math.PI) / 180;
    for (const side of [first, -first]) {
      const delta = wrap(facing + side * (arc + FLANK_MARGIN) - phi);
      const step = Math.max(-0.4, Math.min(0.4, delta));
      const px = f.x + Math.cos(phi + step) * r, py = f.y + Math.sin(phi + step) * r;
      if (walkable(px, py) && clearLine(hx, hy, px, py)) return [px, py];
    }
    return null;
  }

  /** A step straight away from a foe, bending around walls. */
  function awayFrom(f: Foe, hx: number, hy: number): [number, number] {
    const a = Math.atan2(hy - f.y, hx - f.x);
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
      const ux = Math.cos(a + off), uy = Math.sin(a + off);
      if (walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
    }
    return [Math.cos(a), Math.sin(a)];
  }

  const boss = createBossSense({ walkable, clearLine, walkTo });
  const ghoul = createGhoulSense();
  const curse = createCurseSense();
  const cross = createDashCross();
  const alpha = createAlphaSense();
  const guardWard = createWardSense();
  const grig = createGrigoriSense({ walkable, walkTo });
  const bil = createBillySense({ walkable, walkTo });
  // The Mind Flayer's plan reads the map as built, not the tiles the stuck check has learned to avoid.
  const fl = createFlayerSense({ walkable: (x, y) => walkable(x, y, base), walkTo, careless });
  const caster = createCaster();

  /** A waypoint that sits inside a solid tile is moved to the nearest walkable one. */
  function goalOf(w: BotWaypoint): Vec2 {
    const t = tileOf(w.x, w.y);
    if (t.x >= 0 && t.y >= 0 && t.x < nav.w && t.y < nav.h && nav.blocked[t.y * nav.w + t.x] === 0) return w;
    const f = nearestFree(nav, t.x, t.y, 8);
    return f ? { x: f.x * TILE + TILE / 2, y: f.y * TILE + 12 } : w;
  }

  function reachWaypoint(sim: Sim): void {
    const w = opts.waypoints[wi];
    if (!w) return;
    if (w.open) {
      sim.openProp(w.open);
      learned.clear();
      nav = base;
    }
    if (w.wake) sim.spawnGroup(w.wake);
    wi++;
    path = [];
    pathGoal = -1;
  }

  function next(sim: Sim): SimInput {
    frame++;
    const out = idle();
    const v = sim.view();
    if (!propsRead) {
      // Solid furniture goes onto the map once, so neither the route nor a fight walks into it.
      propsRead = true;
      const rects = v.props.filter((p) => FURNITURE.has(p.kind));
      if (rects.length > 0) { base = buildNav(opts.grid, rects); nav = base; }
    }
    const me = v.hud.party.find((p) => p.active);
    const alone = v.hud.party.length === 1;
    if (!me || me.ko) return out;
    const { x: hx, y: hy } = sim.heroPos();
    // Eddie's solo plants him: the bot presses nothing until it is over, unless he is hurt enough to swap out (below).
    if (v.hud.solo && me.hp / me.hpMax >= 0.35) { lastMag = 0; return out; }
    const style = STYLE[me.id];
    let wp: Vec2 | undefined = opts.waypoints[wi] ? goalOf(opts.waypoints[wi] as BotWaypoint) : undefined;

    // Arrived at a waypoint? Trigger it and aim for the next one. A `dash` waypoint is crossed by hand first.
    let arrived = wp !== undefined && dist(hx, hy, wp.x, wp.y) < 10;
    if (opts.waypoints[wi]?.dash && (cross.active() || arrived)) {
      const after = opts.waypoints[wi + 1];
      if (!cross.step(v, out, hx, hy, after ? goalOf(after) : undefined)) { lastMag = 0; return out; }
      arrived = true;
    }
    if (arrived) {
      reachWaypoint(sim);
      wp = opts.waypoints[wi] ? goalOf(opts.waypoints[wi] as BotWaypoint) : undefined;
    }

    // The boss's marks and charge are read every frame, so its heading is known. A pinned boss is the finisher's.
    // A ghoul's lunge is only worth leaving when the hero is low: stepping off every one gives the next ghoul in line a free swing, and
    // the careful bot took more than the careless one that way (docs/level-11.md, "Result").
    const low = me ? me.hp < me.hpMax * 0.5 : false;
    const leave = boss.dodge(v, hx, hy) ?? alpha.dodge(v, hx, hy, walkable) ?? bil.dodge(v, hx, hy) ?? fl.dodge(v, hx, hy)
      ?? (low ? ghoul.dodge(v, hx, hy, walkable) : null);
    // Under a curse it goes for the clock, careless or not. A pinned boss has its finisher.
    const pin = boss.finish(v, hx, hy) ?? bil.reach(v, hx, hy, style) ?? curse.plan(v, hx, hy, walkTo);
    const fin = pin ?? (careless ? null : grig.plan(v, hx, hy, style) ?? bil.punish(v, hx, hy, style)) ?? fl.plan(v, hx, hy, style);
    const foes = foesOf(v, hx, hy).filter((f) => reachable(hx, hy, f));
    // In a defense, whatever is nearest the ward comes first. A howling Alpha comes before anything.
    const ward = guardWard.read(v);
    if (ward) foes.sort((p, q) => dist(p.x, p.y, ward.x, ward.y) - dist(q.x, q.y, ward.x, ward.y));
    howlFirst(foes);
    const near = foes[0];
    // An idle enemy the bot cannot see (behind a wall, say) does not pull it into a fight: at the engage radius that
    // would flip the goal every pixel between "go and get it" and "carry on along the route".
    const seen = near !== undefined && (near.d < 60 || clearLine(hx, hy, near.x, near.y));
    const fighting = near !== undefined && (ward
      ? dist(near.x, near.y, ward.x, ward.y) < WARD_REACH || near.d < ENGAGE
      : (near.d < ENGAGE && seen) || (sim.aggro() && near.d < CHASE));

    // Stuck detection: learn the tile ahead is blocked and route around it.
    // Stuck means going nowhere: within 3 px of where it was for the whole spell, even if corner assist rocks it back and forth.
    if (frame < frozenUntil || lastMag <= 0.3 || dist(hx, hy, lastX, lastY) > 3) { stillT = 0; lastX = hx; lastY = hy; } else stillT++;

    let mx = 0, my = 0;
    const hpFrac = me.hp / me.hpMax;

    // A Flayed, Grigori or Billy has hold of the hero: a swap frees him. Not while Eleven reaches a pinned Billy: she is standing there.
    const held = careless || pin ? -1 : holdSwap(v, hx, hy);
    if (held >= 0) { out.swapTo = held; lastSwap = frame; }
    // Swap out a hurt hero for the healthiest bench hero.
    if (hpFrac < 0.35 && frame - lastSwap > 100 && !pin) {
      let best = -1, bestFrac = hpFrac + 0.3;
      v.hud.party.forEach((p, i) => {
        if (!p.ko && !p.active && (p.curse ?? 0) === 0 && p.hp / p.hpMax > bestFrac) { best = i; bestFrac = p.hp / p.hpMax; }
      });
      if (best >= 0) { out.swapTo = best; lastSwap = frame; }
    }

    // Fighting for five seconds without landing a hit means the dodging has taken over: close in and trade blows.
    if (frame % 20 === 0) {
      const total = sim.stats().damageDealt;
      if (total > dealt) { dealt = total; dealtAt = frame; }
    }
    if (!fighting) dealtAt = frame;
    const desperate = frame - dealtAt > 300;
    // Five seconds of swinging at a foe on the far side of a wall (a pod over the nest wall, say): leave it and carry on.
    if (desperate && fighting && near && !clearLine(hx, hy, near.x, near.y)) { givenUp.set(foeKey(near), frame + 600); dealtAt = frame; }

    if (fin) {
      // Pinned: Eleven's Mind Blast is the only thing that hurts it. Swap to her, walk up and fire.
      [mx, my] = fin.mv;
      if (fin.swapTo >= 0) out.swapTo = fin.swapTo;
      out.specialPressed = fin.cast;
      out.attackHeld = fin.attack === true;
      if (fin.burst) { out.burstPressed = true; frozenUntil = frame + 170; }
    } else if (fighting && near) {
      // Inbound dart: step aside.
      const threat = desperate || careless ? null : dartThreat(v, hx, hy, walkable);
      let dodged = false;
      if (threat && threat.tti < 34) { mx = threat.sx; my = threat.sy; dodged = true; }
      // A Warden's slam reaches all around: get out of the ring. A bash only reaches the shield side: step back from it.
      const slam = careless ? null : slamThreat(v, foes);
      if (!dodged && slam) { [mx, my] = awayFrom(slam, hx, hy); dodged = true; }
      const bash = dodged || careless ? null : foes.find((f) => isGuard(f.kind) && f.windup && f.up && f.d <= defOf(f.kind).x.reach + 8 && inArc(f, hx, hy));
      if (!dodged && bash) { [mx, my] = awayFrom(bash, hx, hy); dodged = true; }
      // A vine's lash reaches 34 px and a swelling pod's cloud 28: back out of it.
      const near2 = dodged || careless ? null : backOffFrom(foes);
      if (!dodged && near2) { [mx, my] = awayFrom(near2, hx, hy); dodged = true; }
      if (!dodged) {
        const a8 = snap8(near.ang);
        const miss = near.d * Math.sin(angDiff(near.ang, a8));
        // Rockets need a line within a body width; Push, bat and spray cover wide cones.
        const aligned = desperate || (me.id !== 'lucas' && me.id !== 'will' && me.id !== 'nancy') || miss < 9;
        const hold = desperate ? 16 : style.hold;
        // A guard with its shield up and the hero in front of it: Dustin burns it, Eleven's Push breaks it, the rest circle
        // to its blind side. Once it recovers, is broken or turns its back, this is an ordinary fight again.
        const shielded = isGuard(near.kind) && near.up && inArc(near, hx, hy);
        const spray = me.id === 'dustin' && shielded && !near.burning && me.mp >= HERO_DEFS.dustin.special.mp;
        const orbit = shielded && !desperate && !careless && !breaksGuard(me) && !spray
          ? orbitPoint(near, hx, hy, Math.max(style.hold, near.kind === 'warden' ? 46 : 34)) : null;
        if (orbit) {
          [mx, my] = walkTo(hx, hy, orbit[0], orbit[1]);
        } else if (near.d > (spray ? 40 : hold) + 6 || (alone && !clearLine(hx, hy, near.x, near.y, 0))) {
          // A hero alone (Hopper in 4.1) close to a foe but round a corner, by the line a hit needs (feet to feet, combat/space.ts los),
          // walks to it rather than swing at the wall between. With a party a swap or a ranged hero breaks that stand-off, and the stages
          // built before were measured without it.
          [mx, my] = walkTo(hx, hy, near.x, near.y);
        } else if (!aligned) {
          // Strafe along the perpendicular to line up one of the eight shot directions.
          const px = -Math.sin(a8), py = Math.cos(a8);
          const sg = Math.sign((near.x - hx) * px + (near.y - hy) * py) || 1;
          mx = px * sg; my = py * sg;
        } else {
          // In position: face the target with a nudge too small to matter, and attack.
          const face = me.id === 'dustin' || me.id === 'eleven' ? near.ang : a8;
          mx = Math.cos(face) * NUDGE; my = Math.sin(face) * NUDGE;
        }
        if (near.d <= style.reach && aligned && !orbit) {
          out.attackHeld = true;
          // Each hero's Special, and the Lv 6 holds, are in bot_talents.ts.
          const scene = { near, foes, miss, shielded, dart: threat !== null, ward: ward !== null };
          if (frame - lastSpecial > 60 && caster.cast(me, scene, out)) lastSpecial = frame;
          caster.swing(me, scene, out);
        }
      }
      if (v.hud.burstReady && (foes.filter((f) => f.d < 190).length >= 2 || foes.some((f) => (f.pose === 'stun' || f.pose === 'howl') && f.d < 190))) {
        out.burstPressed = true;
        frozenUntil = frame + 170;
      }
    } else if (ward) {
      // Nothing to fight yet: wait beside her.
      const post = holdPost(ward, hx, hy);
      if (post) [mx, my] = walkTo(hx, hy, post.x, post.y);
    } else if (wp) {
      const item = pickupGoal(v, hx, hy, hpFrac, me.mp / me.mpMax);
      const goal = item ?? wp;
      [mx, my] = walkTo(hx, hy, goal.x, goal.y);
    }

    // In a defense: no straying from the ward, and Babysit when two are on her.
    if (ward) [mx, my] = guardWard.steer(v, ward, foes, hx, hy, mx, my, out, walkTo);
    // Will's heal, and a hold already going.
    caster.keep(v, me, out, !fighting);
    if (out.specialPressed) lastSpecial = frame;

    // Off a mark, out of the charge line, out of the swipe: that comes before whatever else the bot was doing.
    if (leave && !careless && !pin) {
      [mx, my] = leave;
      // A hero swinging at the bat moves at a third of his pace. Dodging means moving.
      out.attackHeld = false;
      out.specialPressed = false;
    }

    // Anything still pinned against a wall for half a second: mark the tile ahead as blocked and replan.
    if (Math.hypot(mx, my) > 0.5 && stillT > 30) {
      // Pinned on the way to an item (a quarter dropped under a shelf, say): the line is clear but the body clips a corner.
      // Give that item up for a good while instead of grinding at it.
      if (pick) { skipped.set(`${Math.floor(pick.x)},${Math.floor(pick.y)}`, frame + 900); pick = null; }
      const sx = Math.abs(mx) > 0.3 ? Math.sign(mx) : 0, sy = Math.abs(my) > 0.3 ? Math.sign(my) : 0;
      const ahead = tileOf(hx + sx * 9, hy + sy * 9);
      if (ahead.x >= 0 && ahead.y >= 0 && ahead.x < nav.w && ahead.y < nav.h) {
        learned.add(ahead.y * nav.w + ahead.x);
        const blocked = new Uint8Array(base.blocked);
        for (const i of learned) blocked[i] = 1;
        nav = { w: base.w, h: base.h, blocked };
      }
      path = []; pathGoal = -1; stillT = 0;
    }

    out.mx = mx;
    out.my = my;
    lastMag = Math.hypot(mx, my);
    return out;
  }

  return { next, done: () => wi >= opts.waypoints.length };
}
