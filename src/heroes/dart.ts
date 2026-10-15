// Dustin's Dart (Lv 6). The pollywog Dustin found in 2.1 comes when he calls: a Farrah spray calls Dart for 12 s, and then he can't
// be called again until 30 s after the call. Dart can't be hurt and nothing goes for him. He runs at the nearest foe he can see
// within dartSeek px of the active hero and bites it every dartBite frames, as Dustin (his ATK, his kills). With no foe he trots
// at the active hero's heels, and if the party leaves him far behind he catches up at once.
//
// What gfx sees: a 'pet' fx where he stands, `dir` his facing, `t` his frames out, w 1 for the few frames of a bite.
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero, dirOfVec } from '../combat/state.ts';
import type { Pet } from '../combat/talent_state.ts';
import { dist, los, moveBody } from '../combat/space.ts';
import { dust, floater, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';

/** Frames a bite shows after it lands. */
const BITE_SHOWN = 8;
/** How far behind the active hero he trots, and how far he can fall behind before he catches up at once. */
const HEEL = 14;
const LEASH = 160;

/** A spray went off: call Dart if Dustin has the talent and Dart isn't out or resting. */
export function callDart(s: S, h: Hero): void {
  if (h.id !== 'dustin' || !hasTalent('dustin', h.level, LV6) || s.t6.dart || s.t6.dartRest > 0) return;
  const x = HERO_DEFS.dustin.special.x;
  s.t6.dart = { x: h.x, y: h.y + 2, dir: h.dir, age: 0, life: x.dart, bite: 0, target: -1, t: 0 };
  s.t6.dartRest = x.dartRest;
  dust(s, h.x, h.y, 3);
  floater(s, 'DART!', h.x, h.y - 24, 'amber', false, 36);
  sfx(s, 'reveal');
}

/** True for the few frames after a bite, so gfx can show it. */
export function petBiting(p: Pet): boolean {
  return p.bite > HERO_DEFS.dustin.special.x.dartBite - BITE_SHOWN;
}

function alive(e: Enemy): boolean {
  return !e.dead && !e.dormant && e.hp > 0;
}

/** The foe Dart is after: the one he had while it lasts and stays near the party, else the nearest he can see. */
function pickTarget(s: S, p: Pet, lead: Hero): Enemy | null {
  const seek = HERO_DEFS.dustin.special.x.dartSeek;
  const kept = s.enemies.find((e) => e.uid === p.target && alive(e) && dist(e.x, e.y, lead.x, lead.y) <= seek * 1.5);
  if (kept) return kept;
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of s.enemies) {
    if (!alive(e) || dist(e.x, e.y, lead.x, lead.y) > seek) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < bestD && los(s, p.x, p.y, e.x, e.y)) { best = e; bestD = d; }
  }
  return best;
}

/** One frame of Dart: he goes after a foe or trots behind the party, bites, and leaves when his time is up. */
export function stepDart(s: S): void {
  if (s.t6.dartRest > 0) s.t6.dartRest--;
  const p = s.t6.dart;
  if (!p) return;
  p.age++; p.t++;
  if (p.bite > 0) p.bite--;
  const dustin = s.heroes.find((h) => h.id === 'dustin');
  if (!dustin || p.age >= p.life) {
    s.t6.dart = null;
    dust(s, p.x, p.y, 3);
    return;
  }
  const x = HERO_DEFS.dustin.special.x;
  const lead = activeHero(s);
  if (dist(p.x, p.y, lead.x, lead.y) > LEASH) { p.x = lead.x; p.y = lead.y + 2; p.target = -1; }
  const foe = pickTarget(s, p, lead);
  p.target = foe ? foe.uid : -1;
  const gx = foe ? foe.x : lead.x, gy = foe ? foe.y : lead.y;
  const d = dist(p.x, p.y, gx, gy);
  const stop = foe ? x.dartReach - 2 : HEEL;
  if (d > stop) {
    const step = Math.min(x.dartSpeed, d - stop);
    const ux = (gx - p.x) / d, uy = (gy - p.y) / d;
    moveBody(s, p, ux * step, uy * step);
    p.dir = dirOfVec(ux, uy, p.dir);
  }
  if (foe && p.bite <= 0 && dist(p.x, p.y, foe.x, foe.y) <= x.dartReach) {
    p.bite = x.dartBite;
    p.dir = dirOfVec(foe.x - p.x, foe.y - p.y, p.dir);
    hitEnemy(s, dustin, foe, { power: x.dartPower, kb: 1, angle: Math.atan2(foe.y - p.y, foe.x - p.x), hitstop: 0, shake: 0, sfx: 'chomp' });
  }
}
