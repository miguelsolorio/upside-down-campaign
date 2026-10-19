// What Vecna's phases, a hit and his death do to him, and how it looks (docs/level-13.md, "Vecna"). combat/damage.ts, combat/kills.ts,
// combat/view.ts, combat/sim.ts and enemies/orb.ts call these; the brain, the clock, the heal and the rocks are in vecna.ts.
//
// Clock (100%): he walks at the hero and whips. Float (60%): he rises (z 24, pose 'float') out of reach of melee and area hits, which find nothing
// to hit and do nothing; a shot, a beam, the party burst and a solo pulse (HitOpts.air, HitOpts.beam) still reach him. A broken orb pulls him
// down for 300 frames (pose 'stun', x1.5), and he rises again. Burn (25%): he comes down, burning, and the whip and the clock both quicken.
// `phase` events once each, in order: { t: 'phase', spawnId, phase } with 2 at 60% and 3 at 25%, whatever took him there.
//
// What the view carries for gfx, all worked out from the state (so nothing goes stale when he dies):
//   the whip's line while he winds up and lashes: ActorView.aim is its tip (x, y his feet, the line 60 px long at most), with pose 'whip' and the
//     "!" through the wind-up, as a Mind Flayer leg's line is warned. ActorView.t counts the wind-up.
//   'whip': the lash itself, for the frames it is out. x, y where it begins on the floor (his feet), angle, w its length, h its width, t from 0.
//   'debris': a rock falling onto its mark, then its splash. x, y are the mark all the way down, h > 0 the rock's height over it (0 once it has
//     landed), w the splash's diameter. t counts from the throw, life the flight and then the last SPLASH frames, which are the splash.
//   'mark': the shadow on the floor where a rock will land (w the splash's diameter, h its radius), from the throw until it lands.
//   'blaze': the fire over him in Burn, w by h its size, t the frames since Burn began.
import type { ActorView, FxView, Vec2 } from '../core/types.ts';
import type { Enemy, S, VecnaState } from '../combat/state.ts';
import { dirOfAngle } from '../combat/state.ts';
import type { HitOpts } from '../combat/damage.ts';
import { floater, flashScreen, sfx, shake } from '../combat/fx.ts';
import { liftOrbCurse } from '../combat/curse.ts';
import { newVecna } from '../combat/vecna_state.ts';
import { xOf } from './defs.ts';

/** Frames before a hit that finds him too high may say so again. */
const MISS_GAP = 90;
/** How high a rock starts over its mark, in px. */
const DROP = 52;

const byId = (p: Enemy, q: Enemy): number => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0);

/** Vecna is awake, alive and in the fight: the attic's clock can't be broken while he is. */
export const fightOn = (s: S): boolean => s.enemies.some((e) => e.vecna !== null && !e.dead && !e.dormant && e.hp > 0);

/** He is in the air: Float, and not pulled down. */
export const vecnaFloating = (e: Enemy): boolean => e.vecna !== null && e.vecna.phase === 2 && e.vecna.move !== 'down';

/** True when a hit with these options can reach him: always, but in Float only a shot, a beam, the burst or a solo pulse. */
export const vecnaReached = (e: Enemy, o: Pick<HitOpts, 'air' | 'beam'>): boolean => !vecnaFloating(e) || o.air === true || o.beam === true;

/** A swing or a blast found him too high: a word over him, now and then, so the hit isn't just silent. */
export function vecnaMiss(s: S, e: Enemy): void {
  const v = e.vecna as VecnaState;
  if (s.frame - v.missAt < MISS_GAP) return;
  v.missAt = s.frame;
  floater(s, 'TOO HIGH', e.x, e.y - 40, 'mist', false, 36);
}

/** How much of a hit he takes: half again while a broken orb has him on the floor. */
export const vecnaTakes = (e: Enemy): number => (e.vecna?.move === 'down' ? (xOf(e).downMul as number) : 1);

/** The pose gfx draws: stun on the floor, whip and throw, the chime, then Float's and Burn's own. Clock walks and stands. */
/** The tip of the whip's line while he winds up and lashes, for ActorView.aim. Null otherwise. */
export const vecnaAim = (v: VecnaState): Vec2 | null =>
  v.lash ? { x: v.lash.ox + Math.cos(v.lash.angle) * v.lash.len, y: v.lash.oy + Math.sin(v.lash.angle) * v.lash.len } : null;

export function vecnaPose(v: VecnaState): ActorView['pose'] {
  if (v.move === 'down') return 'stun';
  if (v.move === 'wind' || v.move === 'lash') return 'whip';
  if (v.move === 'throw') return 'throw';
  if (v.curseT > 0) return 'curse';
  return v.phase === 2 ? 'float' : v.phase === 3 ? 'burn' : undefined;
}

/** A broken orb pulls him to the floor for downT frames, if he is in Float. Another break while he is down starts the count again. */
export function pullDown(s: S, e: Enemy): void {
  const v = e.vecna;
  if (!v || v.phase !== 2 || e.hp <= 0) return;
  v.move = 'down';
  v.t = xOf(e).downT as number;
  v.lash = null;
  e.mode = 'recover';
  floater(s, 'DOWN', e.x, e.y - 40, 'yellow', true, 60);
}

/**
 * Notices that his HP crossed a phase line, and moves him on: Float at 60%, Burn at 25%, each once and in order. Float cancels a whip and
 * Burn a throw; Burn brings the next whip and the next chime forward to its quicker pace.
 */
export function advancePhase(s: S, e: Enemy): void {
  const v = e.vecna as VecnaState, X = xOf(e), sm = X.speedMul as number;
  while (v.phase < 3 && e.hp <= e.hpMax * (v.phase === 1 ? X.floatAt : X.burnAt)) {
    v.phase++;
    s.events.push({ t: 'phase', spawnId: e.id, phase: v.phase });
    sfx(s, 'vecna');
    shake(s, 5);
    flashScreen(s, 0.25);
    if (v.move === 'wind' || v.move === 'lash' || v.move === 'throw') { v.move = 'walk'; v.t = 0; v.lash = null; e.mode = 'chase'; }
    if (v.phase === 2) {
      v.throwCd = Math.round((X.throwEvery * 0.5) / sm);
    } else {
      v.fireAt = s.frame;
      v.chimeCd = Math.min(v.chimeCd, Math.round(X.chimeEvery / 2));
      v.whipCd = Math.min(v.whipCd, Math.round(X.burnWhipEvery / sm));
    }
  }
}

/** Each Vecna finds his orbs (the orbs of his group, in id order), and each orb its Vecna. Called once the spawns are built. */
export function linkVecna(s: S): void {
  const orbs = s.enemies.filter((e) => e.orb !== null).sort(byId);
  for (const b of s.enemies) {
    if (!b.vecna) continue;
    b.vecna.orbs = orbs.filter((o) => o.group === b.group);
    for (const o of b.vecna.orbs) if (o.orb) o.orb.body = b;
  }
}

/** Called when his group wakes: every timer starts over, and he calls once. */
export function wakeVecna(s: S, e: Enemy): void {
  const v = e.vecna;
  if (!v) return;
  const f = newVecna(xOf(e));
  v.whipCd = f.whipCd; v.throwCd = f.throwCd; v.chimeCd = f.chimeCd; v.healCd = f.healCd;
  sfx(s, 'vecna');
  shake(s, 4);
  flashScreen(s, 0.2);
}

/** He died: the rocks in the air and the lash are gone, and every curse his orbs were marked for is lifted (the orbs go with him). */
export function clearVecna(s: S, e: Enemy): void {
  const v = e.vecna;
  if (!v) return;
  for (const o of v.orbs) liftOrbCurse(s, o.id);
  v.rocks = [];
  v.lash = null;
  v.move = 'walk';
  e.z = 0;
}

/** The effects his state shows (see the header), for the view to add. A dead Vecna shows none. */
export function vecnaFx(s: S): FxView[] {
  const out: FxView[] = [];
  for (const e of s.enemies) {
    const v = e.vecna;
    if (!v || e.dead || e.dormant) continue;
    const X = xOf(e);
    const l = v.lash;
    if (l && l.t >= l.wind) {
      out.push({ kind: 'whip', x: l.ox, y: l.oy, dir: dirOfAngle(l.angle), angle: l.angle, t: l.t - l.wind, life: l.life - l.wind, w: l.len, h: (X.whipHalf as number) * 2 });
    }
    for (const r of v.rocks) {
      const splash = (X.throwSplash as number) * 2;
      const angle = Math.atan2(r.ty - r.sy, r.tx - r.sx);
      const life = r.life + (X.splashT as number);
      if (r.age < r.life) {
        const q = 1 - r.age / r.life;
        out.push({ kind: 'debris', x: r.tx, y: r.ty, dir: 'down', angle, t: r.age, life, w: splash, h: Math.round(DROP * q * q) + 2 });
        out.push({ kind: 'mark', x: r.tx, y: r.ty, dir: 'down', angle: 0, t: r.age, life: r.life + 1, w: splash, h: X.throwSplash as number });
      } else {
        out.push({ kind: 'debris', x: r.tx, y: r.ty, dir: 'down', angle, t: r.age, life, w: splash, h: 0 });
      }
    }
    if (v.phase === 3) out.push({ kind: 'blaze', x: e.x, y: e.y, dir: e.dir, angle: 0, t: s.frame - v.fireAt, life: 999999, w: 28, h: 40 });
  }
  return out;
}
