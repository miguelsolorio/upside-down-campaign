// Dustin, the Bard. Basic: a lobbed candy bar that blasts on landing and then lures enemies for three seconds.
// Special: Farrah spray, a burning cone.
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, Pos, S } from '../combat/state.ts';
import { angleDiff, dist, pointSolid } from '../combat/space.ts';
import { addFx, dust, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { beginAct, later, rad } from './common.ts';

/** Walks from (ox, oy) toward (tx, ty) and stops at the last open point, so a throw never lands in a tree. */
export function clipThrow(s: S, ox: number, oy: number, tx: number, ty: number): Pos {
  const n = Math.max(1, Math.ceil(dist(ox, oy, tx, ty) / 4));
  let lx = ox, ly = oy;
  for (let i = 1; i <= n; i++) {
    const x = ox + ((tx - ox) * i) / n, y = oy + ((ty - oy) * i) / n;
    if (pointSolid(s, x, y)) break;
    lx = x; ly = y;
  }
  return { x: lx, y: ly };
}

export function dustinBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.dustin.basic;
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'lure');
  later(s, h, d.at, () => {
    const ox = h.x, oy = h.y;
    let tx = ox + Math.cos(aim) * d.reach, ty = oy + Math.sin(aim) * d.reach;
    // Light aim assist: land on the nearest enemy inside the cone.
    let best: Enemy | null = null;
    let bestD = d.x.assist;
    for (const e of s.enemies) {
      if (e.dead || e.dormant) continue;
      const dd = dist(ox, oy, e.x, e.y);
      if (dd < 24 || dd >= bestD) continue;
      if (angleDiff(Math.atan2(e.y - oy, e.x - ox), aim) > rad(d.x.cone)) continue;
      best = e; bestD = dd;
    }
    if (best) { tx = best.x; ty = best.y; }
    const end = clipThrow(s, ox, oy, tx, ty);
    const onLand = (): void => {
      addFx(s, 'blast', end.x, end.y - 2, 'down', 0, 14, d.x.blast * 2, d.x.blast * 2);
      sfx(s, 'candyPop');
      dust(s, end.x, end.y, 3);
      for (const e of s.enemies) {
        if (e.dead || e.dormant || dist(end.x, end.y, e.x, e.y) > d.x.blast + 4) continue;
        hitEnemy(s, h, e, { power: d.power, kb: d.kb, angle: Math.atan2(e.y - end.y, e.x - end.x) });
      }
      s.lure = { x: end.x, y: end.y, age: 0, life: d.x.lure, pull: d.x.pull };
    };
    s.projs.push(newProj({
      kind: 'candy', mine: true, x: ox, y: oy, vx: 0, vy: 0, life: d.x.land, r: 3, by: h.id,
      lob: { sx: ox, sy: oy, ex: end.x, ey: end.y, onLand },
    }));
  });
}

export function dustinSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.dustin.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'flame');
  later(s, h, d.at, () => {
    s.zones.push({
      x: h.x + Math.cos(aim) * 4, y: h.y - 7 + Math.sin(aim) * 4, angle: aim, r: d.reach, half: rad(d.x.half),
      age: 0, life: d.x.life, tick: d.x.tick, power: d.power, burn: d.x.burn, burnTick: d.x.burnTick,
      by: h.id, cds: new Map(),
    });
  });
}
