// Eleven, the Sorcerer. Basic: Push, a free cone shove that clears logs. Special: Mind Blast, a piercing beam.
// The Flip talent (Lv 3) makes Push hit harder and throw farther.
import { HERO_DEFS } from './defs.ts';
import { hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { angleDiff, BODY_Y, dist, distToSegment, nearestOnRect, pointSolid } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { clearProp, isPushable } from '../combat/props.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';

export function elevenBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.eleven.basic;
  const aim = h.aim;
  const flip = hasTalent('eleven', h.level);
  const reach = d.reach + (flip ? d.x.flipReach : 0);
  const power = d.power * (flip ? d.x.flipPower : 1);
  const kb = d.kb * (flip ? d.x.flipKb : 1);
  const half = rad(d.x.half);
  beginAct(h, d, 'basic');
  sfx(s, 'push');
  later(s, h, d.at, () => {
    addFx(s, 'push', h.x, h.y - BODY_Y, h.dir, aim, 10, reach, chord(reach, half));
    coneHits(s, h, aim, reach, half, (e, a) => {
      hitEnemy(s, h, e, { power, kb, angle: a, stagger: d.x.stagger, util: 'push' });
    });
    for (const p of s.props) {
      if (!isPushable(p)) continue;
      const q = nearestOnRect(p, h.x, h.y);
      if (dist(h.x, h.y, q.x, q.y) > reach + 4) continue;
      if (angleDiff(Math.atan2(q.y - h.y, q.x - h.x), aim) > half + 0.3) continue;
      clearProp(s, p);
    }
  });
}

export function elevenSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.eleven.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'beam');
  later(s, h, d.at, () => {
    const ox = h.x, oy = h.y - BODY_Y;
    const cx = Math.cos(aim), cy = Math.sin(aim);
    // The beam stops at the first wall or solid prop but passes through every enemy.
    let len = 0;
    while (len < d.reach && !pointSolid(s, ox + cx * (len + 4), oy + BODY_Y + cy * (len + 4))) len += 4;
    const ex = ox + cx * len, ey = oy + cy * len;
    addFx(s, 'beam', ox, oy, h.dir, aim, d.x.life, len, d.x.width * 2);
    for (const e of s.enemies) {
      if (e.dead || e.dormant || e.hp <= 0) continue;
      if (distToSegment(e.x, e.y - BODY_Y, ox, oy, ex, ey) > d.x.width + 6) continue;
      hitEnemy(s, h, e, { power: d.power, kb: d.kb, angle: aim, stagger: 18 });
    }
  });
}
