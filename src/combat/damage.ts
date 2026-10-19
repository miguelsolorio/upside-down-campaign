// The damage formula and the two hit pipelines: hero hits enemy, enemy hits hero.
// Deaths and KOs are not handled here. They are noticed afterward by reapEnemies and reapHeroes,
// so every hit event comes before its kill event.
import type { SfxId, Utility } from '../core/types.ts';
import { HERO_DEFS, critChance } from '../heroes/defs.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { breakShield, cancelAttack, guarding, inFront, isShielded } from '../enemies/shield.ts';
import { demoImmovable, demoPoke, demoSettle, demoStunned, isFinisher } from '../enemies/demo_hit.ts';
import { ghoulTakes } from '../enemies/ghoul_hit.ts';
import { hasRiotShield, isSmash, smashShield } from '../enemies/ch5_hit.ts';
import { alphaImmovable, alphaTakes } from '../enemies/alpha_hit.ts';
import { grigoriGuards, grigoriImmovable, grigoriTakes } from '../enemies/grigori_hit.ts';
import { billyImmovable, billyPoke, billySettle, billyTakes } from '../enemies/billy_hit.ts';
import { flayerBlock, flayerRooted, flayerTakes } from '../enemies/flayer_hit.ts';
import { legHit } from '../enemies/flayer_legs.ts';
import { HOLD_BREAK_KB, isHolding, releaseHold, untouchable } from '../enemies/hold.ts';
import { COLD_BONUS, coldSpot } from '../heroes/cold.ts';
import { heroDef, steveTakes } from '../heroes/steve_guard.ts';
import { hasTalent } from '../progression/talents.ts';
import { rallyMul } from '../heroes/rally.ts';
import { markMul, metalMul } from '../heroes/hellfire.ts';
import { atk9, berserkUp, witBonus } from '../heroes/talents9.ts';
import { screenCovers } from './bonds.ts';
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

/** A hero's ATK right now, with bonds, Inspiration, Rally, the Lv 9 talents of Steve and Nancy, and Eddie's Metalhead. */
export function heroAtk(s: S, h: Hero): number {
  return h.st.atk * (1 + h.bond.atk) * (s.inspire > 0 ? 1 + INSPIRATION_ATK : 1) * rallyMul(s) * atk9(s, h) * metalMul(h);
}

export interface HitOpts {
  power: number;
  /** Knockback speed in px per frame, before the target's weight. */
  kb?: number;
  /** The most a shove may leave the enemy moving at, before its weight. A volley of pellets sets it so five hits do not stack. */
  kbCap?: number;
  /** Knockback direction in radians. */
  angle?: number;
  stagger?: number;
  stun?: number;
  burn?: { frames: number; tick: number; dmg: number };
  util?: Utility;
  noCrit?: boolean;
  /** The hit crits, if it gets through a guard: a solo pulse struck on the beat. */
  crit?: boolean;
  sfx?: SfxId;
  hitstop?: number;
  shake?: number;
  /** Ignores a guard's shield: the crit. */
  pierce?: boolean;
  /** Eleven's Mind Blast beam: the only thing that hurts a pinned Demogorgon. */
  beam?: boolean;
  /** Hopper's ground slam: the only thing that hurts the pinned pit Demogorgon. */
  slam?: boolean;
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
  if (e.dead || e.dormant || e.hp <= 0 || untouchable(e)) return 0;
  // A boss has poise: the Demogorgon, the Alpha, Grigori, Billy and the Mind Flayer and its legs are never staggered, stunned or broken off a
  // wind-up by a hit.
  const boss = e.demo !== null || e.alpha !== null || e.grigori !== null || e.billy !== null || flayerRooted(e) || e.kind === 'vecna5';
  // A pinned Demogorgon shrugs off everything but the beam, and a pinned Billy everything at all. They report the try and take nothing. So
  // does the Mind Flayer's body while a leg stands.
  const finisher = isFinisher(e, by.id, o.beam === true, o.slam === true);
  if (boss && (demoPoke(s, by.id, e, finisher) || billyPoke(s, by.id, e) || flayerBlock(s, e))) return 0;
  const spread = spreadRoll(s.rng);
  const critRoll = s.rng();
  // A guard with its shield up stops a hit that comes from inside its front arc. The rolls above are drawn either way.
  const shielded = isShielded(e);
  const up = shielded && guarding(e);
  const sx = ENEMY_DEFS[e.kind].x;
  // Grigori's front guard works the same way, with no shield to break: it is down only while he is stunned on the power box.
  const guardUp = up || (e.grigori !== null && grigoriGuards(e));
  const blocked = guardUp && !o.pierce && inFront(e, (o.angle ?? Math.atan2(e.y - by.y, e.x - by.x)) + Math.PI);
  // A smash (Steve's bat, Hopper's haymaker and slam) on a trooper's or the Commander's shield breaks it for good, whichever side it lands on.
  const smashed = up && hasRiotShield(e) && isSmash(by) && smashShield(s, e);
  // Mike's fiat crit waits for a hit that gets through: a block neither crits nor spends it.
  const first = s.armed;
  if (!blocked) s.armed = false;
  const fiat = first && by.id === 'mike' && hasTalent('mike', by.level);
  const crit = !blocked && !o.noCrit && (o.crit === true || fiat || critRoll < critChance(HERO_DEFS[by.id], by.level) + by.bond.crit);
  let dmg = rollDamage(o.power, heroAtk(s, by), e.def, spread);
  if (crit) dmg *= 2;
  // A riot shield (the trooper's, the Commander's) lets nothing through: block 0 is no damage at all, not the 1 the rest take.
  if (blocked) dmg = sx.block <= 0 ? 0 : Math.max(1, Math.round(dmg * sx.block));
  // Dazed against a wall, the Demogorgon takes half again as much.
  if (boss && demoStunned(e)) dmg = Math.round(dmg * ENEMY_DEFS[e.kind].x.stunMul);
  // The Alpha takes double while it howls and half again while it is dazed. Grigori and Billy take half again while they are stunned.
  if (e.alpha) dmg = Math.round(dmg * alphaTakes(e));
  if (e.grigori) dmg = Math.round(dmg * grigoriTakes(e));
  if (e.billy) dmg = Math.round(dmg * billyTakes(e));
  // The Mind Flayer's head takes half again while it is down.
  if (e.flayer) dmg = Math.round(dmg * flayerTakes(e));
  // Fire is double for a vine. Will's Cold spot makes a hidden enemy near him take 15 percent more, and a lit string of lights a ghoul half again.
  if (o.burn && e.kind === 'vine') dmg *= ENEMY_DEFS.vine.x.burnMul;
  if (e.ghoul) dmg = Math.round(dmg * ghoulTakes(s, e));
  if (coldSpot(s, e)) dmg = Math.round(dmg * COLD_BONUS);
  // Eddie's Hellfire DM: a marked boss or elite takes 20 percent more from the whole party.
  dmg = Math.round(dmg * markMul(s, e));
  // Robin's Dry wit makes a confused foe take a quarter more.
  if (e.stat.confuse > 0) dmg = Math.round(dmg * witBonus(s, e));
  const dealt = Math.min(dmg, e.hp);
  e.hp -= dmg;
  e.flash = 1;
  e.hurtSeen = true;
  e.by = by.id;
  e.hitAt = s.frame;
  e.noLure = 240;

  const rooted = e.kind === 'vine' || e.kind === 'pod';
  // A Flayed shambles through light hits: one with less than HOLD_BREAK_KB neither moves it, staggers it nor breaks its reach, and one
  // with more knocks it back and makes it let go of a held hero. Knockback is the counter the design names. Without this a bat
  // swinging every 11 frames kept it staggered all the way in, and no Flayed ever landed a grab.
  const holding = e.kind === 'flayed' && isHolding(s, e);
  const planted = e.kind === 'flayed';
  const breaksHold = planted && (o.kb ?? 0) >= HOLD_BREAK_KB;
  if (holding && breaksHold) releaseHold(s, e);
  const kb = (boss && (demoImmovable(e) || alphaImmovable(e) || grigoriImmovable(e) || billyImmovable(e) || flayerRooted(e))) || rooted || (planted && !breaksHold) ? 0 : (o.kb ?? 0) / ENEMY_DEFS[e.kind].weight;
  if (kb > 0) {
    const a = o.angle ?? 0;
    e.vx += Math.cos(a) * kb;
    e.vy += Math.sin(a) * kb;
    const cap = o.kbCap === undefined ? Infinity : o.kbCap / ENEMY_DEFS[e.kind].weight;
    const speed = Math.hypot(e.vx, e.vy);
    if (speed > cap) { e.vx *= cap / speed; e.vy *= cap / speed; }
  }
  if (boss) {
    // A boss has poise: no stagger, no stun status, and no wind-up broken by a hit. Its floor and its pin are settled here.
    demoSettle(s, e, finisher);
    billySettle(s, e);
    legHit(s, e);
  } else if (!shielded) {
    if (!(planted && !breaksHold)) {
      e.stagger = Math.max(e.stagger, o.stagger ?? (kb >= 3.2 ? 16 : 10));
      if (e.mode === 'windup' || e.mode === 'lunge') { e.mode = 'chase'; e.modeT = 0; }
    }
  } else {
    // A shove hard enough breaks the shield. A guard has poise: only a break or the burst staggers it.
    const breaks = up && (o.kb ?? 0) >= sx.breakKb && e.grace <= 0;
    if (breaks || smashed) {
      e.stagger = Math.max(e.stagger, sx.breakT);
      breakShield(s, e);
      if (!smashed) floater(s, 'BREAK', e.x, e.y - 33, 'yellow', false, 36);
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

  if (dmg > 0) floater(s, String(dmg), e.x, e.y - 15, crit ? 'yellow' : blocked ? 'mist' : 'white', crit);
  if (blocked) floater(s, 'BLOCK', e.x, e.y - 24, 'sky', false, 30);
  if (crit) {
    floater(s, 'NAT 20', e.x, e.y - 24, 'yellow', true, 52);
    s.events.push({ t: 'natTwenty', hero: by.id, source: 'crit' });
    flashScreen(s, 0.3);
    sfx(s, 'crit');
  } else {
    // A smash that broke the shield has played shieldBreak already. A blocked hit on a riot shield rings (clang), on a guard's it thuds (block).
    if (!smashed) sfx(s, blocked ? (hasRiotShield(e) ? 'clang' : 'block') : o.sfx ?? 'hit');
  }
  // A blow a riot shield bounced did no damage and is not a hit: its sound is the clang.
  if (dmg > 0) s.events.push({ t: 'hit', dmg, crit, x: e.x, y: e.y - BODY_Y, onEnemy: true });
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
function wound(s: S, h: Hero, dmg: number, angle: number, kb: number, color: 'hot' | 'sky', invuln = HERO_HIT_INVULN): number {
  // Steve's Hair of steel can cover the hit and his Babysit cuts it. A covered hit does nothing at all.
  dmg = steveTakes(s, h, dmg);
  if (dmg === 0) return 0;
  h.unhurt = 0;
  h.hp = Math.max(0, h.hp - dmg);
  h.invuln = Math.max(h.invuln, invuln);
  h.blink = true;
  h.flash = 1;
  // Hopper's Berserk (Lv 9): low on HP, nothing makes him flinch or knocks him back.
  if (!berserkUp(h)) {
    h.hurtT = HERO_HURT_FRAMES;
    h.actId++; h.actT = 0; h.act = null;
    h.vx += Math.cos(angle) * kb;
    h.vy += Math.sin(angle) * kb;
  }
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
 * the formula. Returns the damage taken, 0 if the hit was ignored (invulnerable, KO, god mode). `invuln` is how many frames of
 * invulnerability the hit leaves (a rifle round leaves a few, so the next round of its burst can land).
 */
export function hurtHero(s: S, h: Hero, sx: number, sy: number, power: number, atk: number, kb = 2.6, invuln = HERO_HIT_INVULN): number {
  if (h.ko || s.over || s.god || h.invuln > 0) return 0;
  const spread = spreadRoll(s.rng);
  let dmg = Math.max(1, Math.round((power * atk * spread - heroDef(s, h) * 0.5) * s.mult * s.foeMult));
  const shielded = behindShield(s, sx, sy, h.x, h.y) || screenCovers(s, h);
  if (shielded) dmg = Math.max(1, Math.round(dmg * 0.5));
  return wound(s, h, dmg, Math.atan2(h.y - sy, h.x - sx), kb, shielded ? 'sky' : 'hot', invuln);
}

/**
 * A fixed hit on the active hero, such as a floor hazard: `dmg` scaled by difficulty, not by DEF, and not halved by the
 * DM screen. It throws the hero along `angle` (default: away from (sx, sy)) and starts the usual invulnerability.
 */
export function hurtHeroFlat(s: S, h: Hero, sx: number, sy: number, dmg: number, kb = 4, angle?: number): number {
  if (h.ko || s.over || s.god || h.invuln > 0) return 0;
  return wound(s, h, Math.max(1, Math.round(dmg * s.mult)), angle ?? Math.atan2(h.y - sy, h.x - sx), kb, 'hot');
}
