// ?bot=1 and headless tests. Owner: Sim agent.
// Plays the stage by itself: A* on the grid toward the next waypoint, fight whatever is close, dash at alerts and
// inbound darts, swap when the active hero is low. Gates are skipped: the bot calls sim.openProp itself when it
// reaches a waypoint flagged `open`, and sim.spawnGroup at one flagged `wake`. No randomness: same sim, same bot.
import type { Grid, HeroId, Sim, SimInput, SimView, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Nav, Pos } from './state.ts';
import { astar, buildNav, nearestFree } from './nav.ts';

export interface BotWaypoint extends Vec2 { /** Prop id to open when reached. */ open?: string; /** Group to wake when reached. */ wake?: string }

export interface Bot {
  next(sim: Sim): SimInput;
  /** True once the last waypoint is reached. */
  done(): boolean;
}

interface Foe { x: number; y: number; kind: string; alert: boolean; d: number; ang: number }

/** How each hero likes to fight: stand `hold` px from the target and act within `reach`. */
const STYLE: Record<HeroId, { hold: number; reach: number }> = {
  mike: { hold: 20, reach: 34 },
  eleven: { hold: 26, reach: 38 },
  dustin: { hold: 70, reach: 110 },
  lucas: { hold: 92, reach: 140 },
};

/** Just above the sim's 0.15 dead zone: turns the hero to face a target without walking anywhere. */
const NUDGE = 0.2;
const ENGAGE = 120;
const CHASE = 260;
const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const snap8 = (a: number): number => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
function angDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

export function createBot(opts: { grid: Grid; waypoints: BotWaypoint[] }): Bot {
  const base = buildNav(opts.grid);
  let nav: Nav = base;
  const learned = new Set<number>();
  let wi = 0;
  let frame = 0;
  let path: Pos[] = [];
  let pathGoal = -1;
  let pathAge = 0;
  let lastDash = -999, lastSwap = -999, lastSpecial = -999;
  let dealt = 0, dealtAt = 0;
  let stillT = 0;
  let lastX = Number.NaN, lastY = Number.NaN;
  let lastMag = 0;
  let alerts = new Map<string, number>();

  const tileOf = (x: number, y: number): Pos => ({ x: Math.floor(x / TILE), y: Math.floor((y - 4) / TILE) });
  const idle = (): SimInput => ({
    mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false,
    dashPressed: false, swapDelta: 0, swapTo: -1, burstPressed: false,
  });

  function clearLine(ax: number, ay: number, bx: number, by: number): boolean {
    const n = Math.ceil(dist(ax, ay, bx, by) / 4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const tx = Math.floor((ax + (bx - ax) * t) / TILE), ty = Math.floor((ay + (by - ay) * t - 4) / TILE);
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
      if (a.kind !== 'enemy' || a.anim === 'ko') continue;
      out.push({ x: a.x, y: a.y, kind: a.id, alert: a.alert, d: dist(hx, hy, a.x, a.y), ang: Math.atan2(a.y - hy, a.x - hx) });
    }
    return out.sort((p, q) => p.d - q.d);
  }

  /** Foes behind walls or water that no route reaches are ignored for a while, so the bot does not pace at the creek. */
  const reach = new Map<string, { ok: boolean; until: number }>();
  function reachable(hx: number, hy: number, f: Foe): boolean {
    if (f.d < 36 || clearLine(hx, hy, f.x, f.y)) return true;
    const key = `${Math.floor(f.x / TILE)},${Math.floor((f.y - 4) / TILE)}`;
    const hit = reach.get(key);
    if (hit && frame < hit.until) return hit.ok;
    const h = tileOf(hx, hy), g = tileOf(f.x, f.y);
    const gt = nearestFree(nav, g.x, g.y) ?? g;
    const p = astar(nav, h.x, h.y, gt.x, gt.y);
    const ok = p !== null && p.length * TILE <= f.d * 2.5 + 100;
    reach.set(key, { ok, until: frame + 45 });
    return ok;
  }

  /** The nearest inbound dart that will pass within a body width of the hero: its time to impact and a side to step. */
  function dartThreat(v: SimView, hx: number, hy: number): { tti: number; sx: number; sy: number } | null {
    let best: { tti: number; sx: number; sy: number } | null = null;
    const speed = ENEMY_DEFS.agent.x.dart;
    for (const f of v.fx) {
      if (f.kind !== 'dart') continue;
      const vx = Math.cos(f.angle), vy = Math.sin(f.angle);
      const rx = hx - f.x, ry = hy - 7 - f.y;
      const along = rx * vx + ry * vy;
      const lat = rx * vy - ry * vx;
      if (along < 0 || along > 100 || Math.abs(lat) > 11) continue;
      const tti = along / speed;
      if (best && best.tti <= tti) continue;
      let side = lat >= 0 ? -1 : 1;
      const probe = tileOf(hx - vy * side * 22, hy + vx * side * 22);
      if (nav.blocked[probe.y * nav.w + probe.x] === 1) side = -side;
      best = { tti, sx: -vy * side, sy: vx * side };
    }
    return best;
  }

  /** Winding-up rats and agents next to the hero: returns the frames their alert has been showing. */
  function trackAlerts(foes: Foe[]): Map<string, number> {
    const next = new Map<string, number>();
    for (const f of foes) {
      if (!f.alert) continue;
      const key = `${Math.round(f.x)},${Math.round(f.y)}`;
      next.set(key, (alerts.get(key) ?? 0) + 1);
    }
    alerts = next;
    return next;
  }

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
    const me = v.hud.party.find((p) => p.active);
    if (!me || me.ko) return out;
    const { x: hx, y: hy } = sim.heroPos();
    const style = STYLE[me.id];
    let wp: Vec2 | undefined = opts.waypoints[wi] ? goalOf(opts.waypoints[wi] as BotWaypoint) : undefined;

    // Arrived at a waypoint? Trigger it and aim for the next one.
    if (wp && dist(hx, hy, wp.x, wp.y) < 10) {
      reachWaypoint(sim);
      wp = opts.waypoints[wi] ? goalOf(opts.waypoints[wi] as BotWaypoint) : undefined;
    }

    const foes = foesOf(v, hx, hy).filter((f) => reachable(hx, hy, f));
    const near = foes[0];
    const fighting = near !== undefined && (near.d < ENGAGE || (sim.aggro() && near.d < CHASE));
    const alertAges = trackAlerts(foes);

    // Stuck detection: learn the tile ahead is blocked and route around it.
    if (lastMag > 0.3 && dist(hx, hy, lastX, lastY) < 0.05) stillT++; else stillT = 0;
    lastX = hx; lastY = hy;

    let mx = 0, my = 0;
    const hpFrac = me.hp / me.hpMax;

    // Swap out a hurt hero for the healthiest bench hero.
    if (hpFrac < 0.35 && frame - lastSwap > 100) {
      let best = -1, bestFrac = hpFrac + 0.3;
      v.hud.party.forEach((p, i) => {
        if (!p.ko && !p.active && p.hp / p.hpMax > bestFrac) { best = i; bestFrac = p.hp / p.hpMax; }
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

    if (fighting && near) {
      // Inbound dart: step aside, and dash if it is about to land.
      const threat = desperate ? null : dartThreat(v, hx, hy);
      let dodged = false;
      if (threat && threat.tti < 34) {
        mx = threat.sx; my = threat.sy; dodged = true;
        if (threat.tti <= 11 && frame - lastDash > 44) { out.dashPressed = true; lastDash = frame; }
      }
      // A rat or agent winding up right next to us: dash just before it lands.
      for (const f of foes) {
        if (f.alert && f.d < 40 && !dodged && !desperate && frame - lastDash > 44) {
          const age = alertAges.get(`${Math.round(f.x)},${Math.round(f.y)}`) ?? 0;
          if (age >= 19 && f.kind === 'rat') {
            out.dashPressed = true; lastDash = frame;
            mx = -Math.sin(f.ang); my = Math.cos(f.ang); dodged = true;
          }
        }
      }
      if (!dodged) {
        const a8 = snap8(near.ang);
        const miss = near.d * Math.sin(angDiff(near.ang, a8));
        // Rockets need a line within a body width; Push, bat and spray cover wide cones.
        const aligned = desperate || me.id !== 'lucas' || miss < 9;
        const hold = desperate ? 16 : style.hold;
        if (near.d > hold + 6) {
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
        if (near.d <= style.reach && aligned) {
          out.attackHeld = true;
          if (frame - lastSpecial > 60) {
            const cost = HERO_DEFS[me.id].special.mp;
            const group = foes.filter((f) => f.d < 60).length;
            let use = false;
            if (me.id === 'lucas') use = near.d > 28 && me.mp >= cost;
            else if (me.id === 'dustin') use = (near.d < 50 || group >= 2) && me.mp >= cost;
            else if (me.id === 'eleven') use = near.d < 120 && me.mp >= cost && miss < 12 && (group >= 2 || near.kind === 'agent');
            if (use) { out.specialPressed = true; lastSpecial = frame; }
          }
        }
      }
      if (v.hud.burstReady && foes.filter((f) => f.d < 190).length >= 2) out.burstPressed = true;
    } else if (wp) {
      const item = pickupNear(v, hx, hy, hpFrac, me.mp / me.mpMax);
      const goal = item ?? wp;
      [mx, my] = walkTo(hx, hy, goal.x, goal.y);
    }

    // Anything still pinned against a wall for half a second: mark the tile ahead as blocked and replan.
    if (Math.hypot(mx, my) > 0.5 && stillT > 30) {
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

/** A pickup worth a detour: Eggos when hurt, Cokes when dry, quarters when they are right there. */
function pickupNear(v: SimView, hx: number, hy: number, hpFrac: number, mpFrac: number): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = 1e9;
  for (const it of v.items) {
    const d = dist(hx, hy, it.x, it.y);
    const reach = it.kind === 'quarter' ? 40 : it.kind === 'eggo' ? (hpFrac < 0.7 ? 120 : 24) : mpFrac < 0.5 ? 100 : 24;
    if (d < reach && d < bestD) { best = { x: it.x, y: it.y }; bestD = d; }
  }
  return best;
}
