// The damage formula and the two hit pipelines: hero hits enemy, enemy hits hero.
// Deaths and KOs are not handled here. They are noticed afterward by reapEnemies and reapHeroes,
// so every hit event comes before its kill event.
import type { SfxId, Utility } from '../core/types.ts';
import { HERO_DEFS, critChance } from '../heroes/defs.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { breakShield, cancelAttack, guarding, inFront, isShielded } from '../enemies/shield.ts';
import { demoImmovable, demoPoke, demoSettle, demoStunned } from '../enemies/demo_hit.ts';
import { alphaImmovable, alphaTakes } from '../enemies/alpha_hit.ts';
import { COLD_BONUS, coldSpot } from '../heroes/cold.ts';
import { heroDef, steveTakes } from '../heroes/steve_guard.ts';
import { hasTalent } from '../progression/talents.ts';
import { INSPIRATION_ATK } from '../progression/xp.ts';
import type { Enemy, Hero, Rng, S } from './state.ts';
import { dist, distToSegment, BODY_Y } from './space.ts';
import { floater, flashScreen, hitstop, sfx, shake, sparks } from './fx.ts';

export const SPREAD_LO = 0.9;
export const SPREAD_HI = 1.1;
export const HERO_HIT_INVULN = 45;
export const HERO_HURT_FRAMES = 12;

/** damage = max(1, round(power x ATK x spread - DEF x 0.5)) */
export function rollDamage(power: number, atk: number, def: number, spread: number): number {
  return Math.max(1, Math.round(power * atk * spread - def * 0.5));
}

/** Lowest and highest non-crit damage the formula can give. */
export function damageRange(power: number, atk: number, def: number): { min: number; max: number } {
  return { min: rollDamage(power, atk, def, SPREAD_LO), max: rollDamage(power, atk, def, SPREAD_HI) };
}

export function spreadRoll(rng: Rng): number {
  return SPREAD_LO + (SPREAD_HI - SPREAD_LO) * rng();
}

/** A hero's ATK right now, with Inspiration. */
export function heroAtk(s: S, h: Hero): number {
  return h.st.atk * (s.inspire > 0 ? 1 + INSPIRATION_ATK : 1);
}

export interface HitOpts {
  power: number;
  /** Knockback speed in px per frame, before the target's weight. */
  kb?: number;
  /** Knockback direction in radians. */
  angle?: number;
  stagger?: number;
  stun?: number;
  burn?: { frames: number; tick: number; dmg: number };
  util?: Utility;
  noCrit?: boolean;
  sfx?: SfxId;
  hitstop?: number;
  shake?: number;
  /** Ignores a guard's shield: the crit. */
  pierce?: boolean;
  /** Eleven's Mind Blast beam: the only thing that hurts a pinned Demogorgon. */
  beam?: boolean;
}

/** Makes an enemy notice the hero, and its group-mates within earshot. */
export function alertEnemy(s: S, e: Enemy): void {
  if (e.dead || e.dormant || e.aware) return;
  e.aware = true;
  e.mode = 'chase';
  e.modeT = 0;
  e.lostT = 0;
  e.cd = Math.max(e.cd, 30 + (e.uid % 4) * 10);
  for (const o of s.enemies) {
    if (o !== e && !o.dead && !o.dormant && !o.aware && o.group === e.group && dist(o.x, o.y, e.x, e.y) < 140) alertEnemy(s, o);
  }
}

/** A hero hits an enemy. Returns the damage dealt (0 if the target was already down). */
export function hitEnemy(s: S, by: Hero, e: Enemy, o: HitOpts): number {
  if (e.dead || e.dormant || e.hp <= 0) return 0;
  // A boss has poise: the Demogorgon and the Alpha are never staggered, stunned or broken off a wind-up by a hit.
  const boss = e.demo !== null || e.alpha !== null;
  // A pinned Demogorgon shrugs off everything but the beam. It reports the try and takes nothing.
  if (boss && demoPoke(s, by.id, e, o.beam === true)) return 0;
  const spread = spreadRoll(s.rng);
  const critRoll = s.rng();
  // A guard with its shield up stops a hit that comes from inside its front arc. The rolls above are drawn either way.
  const shielded = isShielded(e);
  const up = shielded && guarding(e);
  const sx = ENEMY_DEFS[e.kind].x;
  const blocked = up && !o.pierce && inFront(e, (o.angle ?? Math.atan2(e.y - by.y, e.x - by.x)) + Math.PI);
  // Mike's fiat crit waits for a hit that gets through: a block neither crits nor spends it.
  const first = s.armed;
  if (!blocked) s.armed = false;
  const fiat = first && by.id === 'mike' && hasTalent('mike', by.level);
  const crit = !blocked && !o.noCrit && (fiat || critRoll < critChance(HERO_DEFS[by.id], by.level));
  let dmg = rollDamage(o.power, heroAtk(s, by), e.def, spread);
  if (crit) dmg *= 2;
  if (blocked) dmg = Math.max(1, Math.round(dmg * sx.block));
  // Dazed against a wall, the Demogorgon takes half again as much.
  if (boss && demoStunned(e)) dmg = Math.round(dmg * ENEMY_DEFS.demogorgon.x.stunMul);
  // The Alpha takes double while it howls and half again while it is dazed.
  if (e.alpha) dmg = Math.round(dmg * alphaTakes(e));
  // Fire is double for a vine. Will's Cold spot makes a hidden enemy near him take 15 percent more.
  if (o.burn && e.kind === 'vine') dmg *= ENEMY_DEFS.vine.x.burnMul;
  if (coldSpot(s, e)) dmg = Math.round(dmg * COLD_BONUS);
  const dealt = Math.min(dmg, e.hp);
  e.hp -= dmg;
  e.flash = 1;
  e.hurtSeen = true;
  e.by = by.id;
  e.hitAt = s.frame;
  e.noLure = 240;

  const rooted = e.kind === 'vine' || e.kind === 'pod';
  const kb = (boss && (demoImmovable(e) || alphaImmovable(e))) || rooted ? 0 : (o.kb ?? 0) / ENEMY_DEFS[e.kind].weight;
  if (kb > 0) {
    const a = o.angle ?? 0;
    e.vx += Math.cos(a) * kb;
    e.vy += Math.sin(a) * kb;
  }
  if (boss) {
    // A boss has poise: no stagger, no stun status, and no wind-up broken by a hit. Its floor and its pin are settled here.
    demoSettle(s, e, o.beam === true, by.id);
  } else if (!shielded) {
    e.stagger = Math.max(e.stagger, o.stagger ?? (kb >= 3.2 ? 16 : 10));
    if (e.mode === 'windup' || e.mode === 'lunge') { e.mode = 'chase'; e.modeT = 0; }
  } else {
    // A shove hard enough breaks the shield. A guard has poise: only a break or the burst staggers it.
    const breaks = up && (o.kb ?? 0) >= sx.breakKb && e.grace <= 0;
    if (breaks) {
      e.stagger = Math.max(e.stagger, sx.breakT);
      breakShield(s, e);
      floater(s, 'BREAK', e.x, e.y - 33, 'yellow', false, 36);
    } else if (o.pierce) {
      e.stagger = Math.max(e.stagger, o.stagger ?? 10);
      cancelAttack(s, e);
    }
  }
  if (o.stun && !boss) e.stat.stun = Math.max(e.stat.stun, o.stun);
  if (o.burn) {
    e.stat.burn = Math.max(e.stat.burn, o.burn.frames);
    e.stat.burnTick = Math.min(e.stat.burnTick || o.burn.tick, o.burn.tick);
    e.stat.burnDmg = Math.max(e.stat.burnDmg, o.burn.dmg);
  }
  alertEnemy(s, e);

  floater(s, String(dmg), e.x, e.y - 15, crit ? 'yellow' : blocked ? 'mist' : 'white', crit);
  if (blocked) floater(s, 'BLOCK', e.x, e.y - 24, 'sky', false, 30);
  if (crit) {
    floater(s, 'NAT 20', e.x, e.y - 24, 'yellow', true, 52);
    s.events.push({ t: 'natTwenty', hero: by.id, source: 'crit' });
    flashScreen(s, 0.3);
    sfx(s, 'crit');
  } else {
    sfx(s, blocked ? 'block' : o.sfx ?? 'hit');
  }
  s.events.push({ t: 'hit', dmg, crit, x: e.x, y: e.y - BODY_Y, onEnemy: true });
  s.stats.damageDealt += dealt;
  if (!s.seq && !blocked) s.burst = Math.min(1, s.burst + 0.015);
  hitstop(s, o.hitstop ?? (blocked ? 1 : crit ? 5 : e.hp <= 0 ? 3 : 2));
  shake(s, o.shake ?? (blocked ? 0.4 : crit ? 2 : e.hp <= 0 ? 1.4 : 0.7));
  sparks(s, e.x, e.y - BODY_Y, crit ? 5 : 3);
  return dmg;
}

/** True when the DM screen's dome sits on the line from a source to a target (both in ground coordinates). */
export function behindShield(s: S, sx: number, sy: number, tx: number, ty: number): boolean {
  const sh = s.shield;
  if (!sh) return false;
  return distToSegment(sh.x, sh.y, sx, sy - BODY_Y, tx, ty - BODY_Y) <= sh.half;
}

/** The part of a hit on a hero that does not depend on where the damage came from. */
function wound(s: S, h: Hero, dmg: number, angle: number, kb: number, color: 'hot' | 'sky'): number {
  // Steve's Hair of steel can cover the hit and his Babysit cuts it. A covered hit does nothing at all.
  dmg = steveTakes(s, h, dmg);
  if (dmg === 0) return 0;
  h.unhurt = 0;
  h.hp = Math.max(0, h.hp - dmg);
  h.invuln = HERO_HIT_INVULN;
  h.blink = true;
  h.hurtT = HERO_HURT_FRAMES;
  h.flash = 1;
  h.actId++; h.actT = 0; h.act = null;
  h.vx += Math.cos(angle) * kb;
  h.vy += Math.sin(angle) * kb;
  floater(s, String(dmg), h.x, h.y - 18, color);
  s.events.push({ t: 'hit', dmg, crit: false, x: h.x, y: h.y - BODY_Y, onEnemy: false });
  sfx(s, 'hurt');
  hitstop(s, 3);
  shake(s, 2);
  if (!s.seq) s.burst = Math.min(1, s.burst + 0.04);
  s.stats.damageTaken += dmg;
  return dmg;
}

/**
 * An enemy hits the active hero from (sx, sy). power x atk is the enemy's attack, scaled by difficulty after
 * the formula. Returns the damage taken, 0 if the hit was ignored (invulnerable, KO, god mode).
 */
export function hurtHero(s: S, h: Hero, sx: number, sy: number, power: number, atk: number, kb = 2.6): number {
  if (h.ko || s.over || s.god || h.invuln > 0) return 0;
  const spread = spreadRoll(s.rng);
  let dmg = Math.max(1, Math.round((power * atk * spread - heroDef(s, h) * 0.5) * s.mult * s.foeMult));
  const shielded = behindShield(s, sx, sy, h.x, h.y);
  if (shielded) dmg = Math.max(1, Math.round(dmg * 0.5));
  return wound(s, h, dmg, Math.atan2(h.y - sy, h.x - sx), kb, shielded ? 'sky' : 'hot');
}

/**
 * A fixed hit on the active hero, such as a floor hazard: `dmg` scaled by difficulty, not by DEF, and not halved by the
 * DM screen. It throws the hero along `angle` (default: away from (sx, sy)) and starts the usual invulnerability.
 */
export function hurtHeroFlat(s: S, h: Hero, sx: number, sy: number, dmg: number, kb = 4, angle?: number): number {
  if (h.ko || s.over || s.god || h.invuln > 0) return 0;
  return wound(s, h, Math.max(1, Math.round(dmg * s.mult)), angle ?? Math.atan2(h.y - sy, h.x - sx), kb, 'hot');
}
