// Eddie, the Warlock (docs/level-11.md, "Eddie"). Basic: the Flying V, swung like an axe in a wide arc. Where the arc ends a small sound
// ring (fx 'riff', 28 px across) hits any foe the arc missed for half the swing. His Special, the Hellfire solo, is in eddie_solo.ts.
//   Metalhead (Lv 3) and Hellfire DM (Lv 6) are in hellfire.ts, because the damage code reads them.
//   The riff: the arc, the ring and every solo pulse shatter a haunted mirror or the clock they reach (props.ts, riffCone and riffRing).
//
// What gfx sees: a 'slash' fx for the arc, then a 'riff' fx at its far end, w the ring's diameter.
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { BODY_Y, dist, los } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import type { HitOpts } from '../combat/damage.ts';
import { hitEnemy } from '../combat/damage.ts';
import { riffCone, riffRing } from '../combat/props.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';
import { markFoe } from './hellfire.ts';

/** How much wider than the swing's arc a mirror still counts as reached, in radians. */
const PROP_SLACK = 0.3;

/** One of Eddie's hits on a foe. From Lv 6 a boss or an elite he hits carries the Hellfire DM mark. */
export function eddieHit(s: S, h: Hero, e: Enemy, o: HitOpts): number {
  const dmg = hitEnemy(s, h, e, o);
  if (dmg > 0) markFoe(s, h, e);
  return dmg;
}

export function eddieBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.eddie.basic;
  const half = rad(d.x.half);
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'vswing');
  later(s, h, d.at, () => {
    addFx(s, 'slash', h.x, h.y - BODY_Y, h.dir, aim, 10, d.reach, chord(d.reach, half));
    riffCone(s, h, aim, d.reach, half + PROP_SLACK);
    const struck = new Set<Enemy>();
    coneHits(s, h, aim, d.reach, half, (e, a) => {
      struck.add(e);
      eddieHit(s, h, e, { power: d.power, kb: d.kb, angle: a });
    });
    // The sound ring where the arc ends.
    const r = d.x.ring;
    const rx = h.x + Math.cos(aim) * d.reach, ry = h.y - BODY_Y + Math.sin(aim) * d.reach;
    addFx(s, 'riff', rx, ry, h.dir, aim, 14, r * 2, r * 2);
    riffRing(s, rx, ry, r);
    for (const e of s.enemies) {
      if (struck.has(e) || e.dead || e.dormant || e.hp <= 0) continue;
      if (dist(rx, ry, e.x, e.y - BODY_Y) > r || !los(s, h.x, h.y, e.x, e.y)) continue;
      eddieHit(s, h, e, { power: d.x.ringPower, kb: d.kb, angle: Math.atan2(e.y - h.y, e.x - h.x), hitstop: 1, shake: 0.4 });
    }
  });
}
