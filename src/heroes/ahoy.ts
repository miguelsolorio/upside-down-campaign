// Steve's Ahoy (Lv 6): a charged swap to him (the one with the shockwave) is a tag-in leap. If a foe he can see is within leapR px he
// jumps at it, over leap frames along an arc, and lands just short of it. The landing hits everything within leapHit px for
// leapPower and stuns it leapStun frames. A boss takes the hit but not the stun (hitEnemy). No foe in reach, no leap: an ordinary swap.
// He still has the swap's invulnerability for most of the jump. A swap away or a KO ends the leap where he is.
//
// What gfx sees: Steve's z rising and falling through the leap, then a 'nova' and dust where he lands, and an AHOY floater.
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero, dirOfVec } from '../combat/state.ts';
import { dist, los } from '../combat/space.ts';
import { addFx, dust, floater, sfx, shake } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { clipThrow } from './dustin.ts';

/** He lands this far short of the foe, so he comes down beside it and not inside it. */
const SHORT = 8;
/** The top of the arc in px. */
const HEIGHT = 16;

/** Steve has just been swapped in with a charge: leap if he can. */
export function startAhoy(s: S, h: Hero): void {
  if (h.id !== 'steve' || !hasTalent('steve', h.level, LV6)) return;
  const x = HERO_DEFS.steve.special.x;
  let foe: Enemy | null = null;
  let best = x.leapR;
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0) continue;
    const d = dist(h.x, h.y, e.x, e.y);
    if (d <= best && los(s, h.x, h.y, e.x, e.y)) { foe = e; best = d; }
  }
  if (!foe) return;
  const k = Math.max(0, best - SHORT) / Math.max(1, best);
  const end = clipThrow(s, h.x, h.y, h.x + (foe.x - h.x) * k, h.y + (foe.y - h.y) * k);
  s.t6.leap = { sx: h.x, sy: h.y, tx: end.x, ty: end.y, t: 0, n: x.leap };
  h.dir = dirOfVec(foe.x - h.x, foe.y - h.y, h.dir);
  h.aim = Math.atan2(foe.y - h.y, foe.x - h.x);
  sfx(s, 'swing');
}

/** One frame of the leap: Steve moves along it, and on the last frame he lands. */
export function stepLeap(s: S): void {
  const l = s.t6.leap;
  if (!l) return;
  const h = activeHero(s);
  if (h.id !== 'steve' || h.ko) { s.t6.leap = null; return; }
  l.t++;
  const k = Math.min(1, l.t / l.n);
  h.x = l.sx + (l.tx - l.sx) * k;
  h.y = l.sy + (l.ty - l.sy) * k;
  h.z = 4 * HEIGHT * k * (1 - k);
  h.vx = 0; h.vy = 0;
  if (l.t < l.n) return;
  s.t6.leap = null;
  h.z = 0;
  land(s, h);
}

function land(s: S, h: Hero): void {
  const x = HERO_DEFS.steve.special.x;
  addFx(s, 'nova', h.x, h.y, h.dir, 0, 16, x.leapHit * 2, x.leapHit);
  dust(s, h.x, h.y, 6);
  shake(s, 2);
  sfx(s, 'thud');
  floater(s, 'AHOY', h.x, h.y - 26, 'sky', true, 40);
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0 || dist(h.x, h.y, e.x, e.y) > x.leapHit + 4) continue;
    hitEnemy(s, h, e, { power: x.leapPower, kb: 2, angle: Math.atan2(e.y - h.y, e.x - h.x), stun: x.leapStun, stagger: 18, hitstop: 3 });
  }
}
