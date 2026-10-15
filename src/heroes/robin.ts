// Robin, the Rogue. Basic: Scoop toss, a lobbed scoop of ice cream that lands on the nearest enemy, splashes and slows. Special:
// Word vomit, a babble cone that confuses every enemy in it, so they fight each other (combat/confuse.ts). Linguist (Lv 3) makes the
// confusion last longer. Triple scoop (Lv 6) throws two more scoops either side of the first, weaker. Reading cipher doors is her
// `read` utility (combat/props.ts), not a move.
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { angleDiff, BODY_Y, dist } from '../combat/space.ts';
import { addFx, dust, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { confuse } from '../combat/confuse.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';
import { clipThrow } from './dustin.ts';

/**
 * Where a lobbed throw lands: on the nearest enemy within `assist` px inside the cone of `cone` degrees (never farther than `reach`),
 * else at full reach along the aim. Robin's scoop and Nancy's Molotov use it. `angle` is the way the throw went.
 */
export function lobLanding(s: S, h: Hero, aim: number, reach: number, assist: number, cone: number): { x: number; y: number; angle: number } {
  const ox = h.x, oy = h.y;
  let best: Enemy | null = null;
  let bestD = assist;
  for (const e of s.enemies) {
    if (e.dead || e.dormant) continue;
    const dd = dist(ox, oy, e.x, e.y);
    if (dd >= bestD || angleDiff(Math.atan2(e.y - oy, e.x - ox), aim) > rad(cone)) continue;
    best = e; bestD = dd;
  }
  const a = best ? Math.atan2(best.y - oy, best.x - ox) : aim;
  const far = best ? Math.min(bestD, reach) : reach;
  return { ...clipThrow(s, ox, oy, ox + Math.cos(a) * far, oy + Math.sin(a) * far), angle: a };
}

/** One scoop from (ox, oy) to `end`: it splashes everything in reach for `power` and slows it. */
function scoop(s: S, h: Hero, ox: number, oy: number, end: { x: number; y: number }, power: number): void {
  const d = HERO_DEFS.robin.basic;
  const onLand = (): void => {
    // The splat: w is its diameter. In flight the same fx is 6 wide (view.ts).
    addFx(s, 'scoop', end.x, end.y - 2, 'down', 0, 14, d.x.blast * 2, d.x.blast * 2);
    dust(s, end.x, end.y, 3);
    for (const e of s.enemies) {
      if (e.dead || e.dormant || dist(end.x, end.y, e.x, e.y) > d.x.blast + 4) continue;
      hitEnemy(s, h, e, { power, kb: d.kb, angle: Math.atan2(e.y - end.y, e.x - end.x) });
      e.stat.slow = Math.max(e.stat.slow, d.x.slow);
    }
  };
  s.projs.push(newProj({
    kind: 'scoop', mine: true, x: ox, y: oy, vx: 0, vy: 0, life: d.x.land, r: 3, by: h.id,
    lob: { sx: ox, sy: oy, ex: end.x, ey: end.y, onLand },
  }));
}

export function robinBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.robin.basic;
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'scoop');
  later(s, h, d.at, () => {
    const ox = h.x, oy = h.y;
    const end = lobLanding(s, h, aim, d.reach, d.x.assist, d.x.cone);
    scoop(s, h, ox, oy, end, d.power);
    if (!hasTalent('robin', h.level, LV6)) return;
    // Triple scoop: two more, turned sideFan degrees either way from where the first went, as far out.
    const far = dist(ox, oy, end.x, end.y);
    for (const side of [-1, 1]) {
      const a = end.angle + side * rad(d.x.sideFan);
      scoop(s, h, ox, oy, clipThrow(s, ox, oy, ox + Math.cos(a) * far, oy + Math.sin(a) * far), d.power * d.x.sidePower);
    }
  });
}

export function robinSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.robin.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'babble');
  later(s, h, d.at, () => {
    const half = rad(d.x.half);
    const frames = hasTalent('robin', h.level) ? d.x.linguist : d.x.confuse;
    addFx(s, 'babble', h.x + Math.cos(aim) * 4, h.y - BODY_Y + Math.sin(aim) * 4, h.dir, aim, d.x.life, d.reach, chord(d.reach, half));
    coneHits(s, h, aim, d.reach, half, (e) => confuse(s, e, frames));
  });
}
