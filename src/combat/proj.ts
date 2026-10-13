// Things that fly, burn or stand in the world after a move: projectiles, lobbed candy, the spray cone,
// the lure and the DM screen.
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Hero, Proj, S, Zone } from './state.ts';
import { activeHero } from './state.ts';
import { angleDiff, BODY_Y, pointSolid, propBlocks } from './space.ts';
import { sparks, sfx } from './fx.ts';
import { hitEnemy, hurtHero, heroAtk } from './damage.ts';
import { isTargetFor, lightTarget } from './props.ts';
import { BURN_PERIOD } from './status.ts';

export function newProj(p: Partial<Proj> & Pick<Proj, 'kind' | 'mine' | 'x' | 'y' | 'vx' | 'vy' | 'life' | 'r'>): Proj {
  return {
    age: 0, by: null, power: 1, kb: 0, atk: 0, util: null, hit: [], lob: null, ox: p.x, oy: p.y + BODY_Y, pierce: 0, ...p,
  };
}

const HURT_HALF_W = 6;
const HURT_H = 14;

function heroById(s: S, id: Proj['by']): Hero | undefined {
  return s.heroes.find((h) => h.id === id);
}

/** Moves one projectile a half step and resolves what it touches. Returns false when it is spent. */
function collide(s: S, p: Proj, hero: Hero): boolean {
  const gy = p.y + BODY_Y;
  const sh = s.shield;
  if (!p.mine && sh && Math.hypot(p.x - sh.x, p.y - sh.y) <= sh.half + p.r) {
    sparks(s, p.x, p.y, 3);
    sfx(s, 'rockHit');
    return false;
  }
  // Enemy darts stop at trees and walls. Hero shots fly over terrain, because the creek is solid and Lucas has to cross it.
  if (!p.mine && pointSolid(s, p.x, gy)) { sparks(s, p.x, p.y, 2); return false; }
  for (const pr of s.props) {
    if (p.x < pr.x - p.r || p.x > pr.x + pr.w + p.r || gy < pr.y - p.r || gy > pr.y + pr.h + p.r) continue;
    if (p.mine && isTargetFor(pr, p.util)) {
      lightTarget(s, pr);
      sparks(s, p.x, p.y, 4);
      return false;
    }
    if (propBlocks(pr) && p.x >= pr.x && p.x <= pr.x + pr.w && gy >= pr.y && gy <= pr.y + pr.h) {
      sparks(s, p.x, p.y, 2);
      return false;
    }
  }
  if (p.mine) {
    const by = heroById(s, p.by);
    if (!by) return false;
    for (const e of s.enemies) {
      if (e.dead || e.dormant || e.hp <= 0 || p.hit.includes(e.uid)) continue;
      if (Math.abs(p.x - e.x) > HURT_HALF_W + p.r || p.y < e.y - HURT_H - p.r || p.y > e.y + p.r) continue;
      p.hit.push(e.uid);
      hitEnemy(s, by, e, { power: p.power, kb: p.kb, angle: Math.atan2(p.vy, p.vx), sfx: 'rockHit', util: p.util ?? undefined });
      if (p.pierce <= 0) return false;
      p.pierce--;
    }
  } else if (!hero.ko) {
    if (Math.abs(p.x - hero.x) <= HURT_HALF_W + p.r && p.y >= hero.y - HURT_H - p.r && p.y <= hero.y + p.r) {
      hurtHero(s, hero, p.ox, p.oy, p.power, p.atk, p.kb);
      sparks(s, p.x, p.y, 3);
      return false;
    }
  }
  return true;
}

export function updateProjectiles(s: S): void {
  const hero = activeHero(s);
  const keep: Proj[] = [];
  for (const p of s.projs) {
    p.age++;
    if (p.lob) {
      const t = Math.min(1, p.age / p.life);
      p.x = p.lob.sx + (p.lob.ex - p.lob.sx) * t;
      p.y = p.lob.sy + (p.lob.ey - p.lob.sy) * t;
      if (p.age >= p.life) p.lob.onLand();
      else keep.push(p);
      continue;
    }
    let alive = true;
    for (let k = 0; k < 2 && alive; k++) {
      p.x += p.vx / 2;
      p.y += p.vy / 2;
      alive = collide(s, p, hero);
    }
    if (p.age >= p.life) alive = false;
    if (alive) keep.push(p);
  }
  s.projs = keep;
}

function updateZone(s: S, z: Zone): void {
  z.age++;
  const by = heroById(s, z.by);
  for (const [uid, cd] of z.cds) z.cds.set(uid, cd - 1);
  if (!by) return;
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0) continue;
    if ((z.cds.get(e.uid) ?? 0) > 0) continue;
    const dx = e.x - z.x, dy = e.y - BODY_Y - z.y;
    const d = Math.hypot(dx, dy);
    if (d > z.r + 6 || (d >= 9 && angleDiff(Math.atan2(dy, dx), z.angle) > z.half)) continue;
    z.cds.set(e.uid, z.tick);
    hitEnemy(s, by, e, {
      power: z.power, kb: HERO_DEFS.dustin.special.kb, angle: Math.atan2(dy, dx), stagger: 4, hitstop: 0, shake: 0,
      burn: { frames: z.burn, tick: BURN_PERIOD, dmg: Math.max(1, Math.round(heroAtk(s, by) * 0.22)) }, noCrit: true,
    });
  }
  // Fire lights anything that asks to be burned.
  for (const pr of s.props) {
    if (!isTargetFor(pr, 'burn')) continue;
    const cx = Math.max(pr.x, Math.min(z.x, pr.x + pr.w)), cy = Math.max(pr.y, Math.min(z.y + BODY_Y, pr.y + pr.h));
    const dx = cx - z.x, dy = cy - BODY_Y - z.y;
    if (Math.hypot(dx, dy) <= z.r && angleDiff(Math.atan2(dy, dx), z.angle) <= z.half + 0.3) lightTarget(s, pr);
  }
}

/** Ages zones, the lure and the screen, and removes the ones that ran out. */
export function updateAreas(s: S): void {
  for (const z of s.zones) updateZone(s, z);
  if (s.zones.length > 0) s.zones = s.zones.filter((z) => z.age < z.life);
  if (s.lure) {
    s.lure.age++;
    if (s.lure.age >= s.lure.life) s.lure = null;
  }
  if (s.shield) {
    s.shield.age++;
    if (s.shield.age >= s.shield.life) s.shield = null;
  }
}

