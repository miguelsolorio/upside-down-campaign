// The party: building heroes, swapping, KOs, XP, level-ups, recruiting and healing.
import type { HeroId, LevelUpInfo, StatKey } from '../core/types.ts';
import { HERO_DEFS, fixedGain, statsAt } from '../heroes/defs.ts';
import {
  INSPIRATION_SECONDS, LEVEL_UP_HEAL, MAX_LEVEL, POINT_VALUE, STAT_KEYS, addXp, emptyStats, rollLevelUp, xpShare,
} from '../progression/xp.ts';
import { talentGainedAt } from '../progression/talents.ts';
import type { Hero, S, Stats } from './state.ts';
import { activeHero, noStatus } from './state.ts';
import { hitEnemy } from './damage.ts';
import { dist } from './space.ts';
import { addFx, dust, flashScreen, floater, hitstop, schedule, sfx, shake } from './fx.ts';

export const SWAP_COOLDOWN = 90;
export const SWAP_INVULN = 20;
const FORCED_SWAP_COOLDOWN = 45;
const SWAP_RADIUS = 34;
const BODY_FRAMES = 100;

export function makeHero(id: HeroId, level: number, xp: number, x: number, y: number, carried?: Partial<Stats>): Hero {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const bonus = emptyStats();
  for (const k of STAT_KEYS) bonus[k] = Math.max(0, Math.floor(carried?.[k] ?? 0));
  const st = statsAt(HERO_DEFS[id], lv, bonus);
  return {
    id, level: lv, xp, hp: st.hp, mp: st.mp, st, bonus, advantage: false, ko: false,
    x, y, dir: 'down', aim: Math.PI / 2, vx: 0, vy: 0, z: 0, moving: false, anim: 'idle', animT: 0,
    flash: 0, invuln: 0, blink: false, hurtT: 0, dashT: 0, dashCd: 0, dashX: 0, dashY: 0,
    actT: 0, act: null, lock: 1, actId: 0, cdBasic: 0, cdSpecial: 0, combo: 0, comboT: 0,
    stat: noStatus(), nosebled: false,
  };
}

/** Index of the next living hero after `from` in slot order, wrapping. -1 when there is none. */
export function nextLiving(s: S, from: number, step: 1 | -1): number {
  const n = s.heroes.length;
  for (let k = 1; k < n; k++) {
    const i = (from + step * k + n * 4) % n;
    if (!(s.heroes[i] as Hero).ko) return i;
  }
  return -1;
}

function shockwave(s: S, h: Hero): void {
  addFx(s, 'ring', h.x, h.y, h.dir, 0, 16, SWAP_RADIUS * 2, SWAP_RADIUS);
  dust(s, h.x, h.y, 5);
  sfx(s, 'push');
  for (const e of s.enemies) {
    if (e.dead || e.dormant || dist(h.x, h.y, e.x, e.y) > SWAP_RADIUS) continue;
    hitEnemy(s, h, e, { power: 0.6, kb: 3.5, angle: Math.atan2(e.y - h.y, e.x - h.x), stun: 24, hitstop: 1, shake: 1, sfx: 'hit' });
  }
}

/** Swaps the active hero to slot `idx`. Forced swaps (a KO) ignore the cooldown. */
export function trySwap(s: S, idx: number, forced = false): boolean {
  const to = s.heroes[idx];
  if (!to || idx === s.active || to.ko) return false;
  if (!forced && s.swapCd > 0) return false;
  const from = activeHero(s);
  from.actId++; from.actT = 0; from.act = null; from.dashT = 0; from.vx = 0; from.vy = 0;
  to.x = from.x; to.y = from.y;
  to.dir = from.dir; to.aim = from.aim; to.vx = 0; to.vy = 0;
  to.actId++; to.actT = 0; to.act = null; to.dashT = 0; to.hurtT = 0;
  to.z = 12;
  to.invuln = SWAP_INVULN;
  to.blink = true;
  s.active = idx;
  s.swapCd = forced ? FORCED_SWAP_COOLDOWN : SWAP_COOLDOWN;
  s.buf.attack = 0; s.buf.special = 0; s.buf.dash = 0;
  s.events.push({ t: 'swap', from: from.id, to: to.id });
  sfx(s, 'swap');
  schedule(s, 8, () => { if (activeHero(s) === to && !to.ko) shockwave(s, to); });
  return true;
}

/** Resolves the buffered swap request, if any. */
export function handleSwap(s: S): void {
  if (s.buf.swapT <= 0) return;
  s.buf.swapT--;
  let idx = -1;
  if (s.buf.swapTo >= 0) idx = s.buf.swapTo;
  else if (s.buf.swapDelta !== 0) idx = nextLiving(s, s.active, s.buf.swapDelta > 0 ? 1 : -1);
  const target = s.heroes[idx];
  if (!target || target.ko || idx === s.active) { s.buf.swapT = 0; return; }
  if (trySwap(s, idx)) s.buf.swapT = 0;
}

/** Notices heroes at 0 HP: KO, auto-swap to the next living hero, or the end of the run. */
export function reapHeroes(s: S): void {
  for (let i = 0; i < s.heroes.length; i++) {
    const h = s.heroes[i] as Hero;
    if (h.ko || h.hp > 0) continue;
    h.ko = true;
    h.hp = 0;
    h.invuln = 0; h.blink = false; h.dashT = 0; h.actT = 0; h.act = null; h.actId++;
    h.anim = 'ko'; h.animT = 0;
    s.stats.kos++;
    s.events.push({ t: 'heroKO', hero: h.id });
    sfx(s, 'ko');
    shake(s, 3);
    hitstop(s, 5);
    s.bodies.push({ id: h.id, x: h.x, y: h.y, dir: h.dir, t: 0 });
    if (i !== s.active) continue;
    const next = nextLiving(s, i, 1);
    if (next >= 0) {
      trySwap(s, next, true);
    } else {
      s.over = true;
      s.events.push({ t: 'allDown' });
    }
  }
}

export function ageBodies(s: S): void {
  for (const b of s.bodies) b.t++;
  if (s.bodies.length > 0 && !s.over) s.bodies = s.bodies.filter((b) => b.t < BODY_FRAMES);
}

/** `show` is false for all but the last level of a batch, so a big XP drop floats one LEVEL UP, not several on top of each other. */
function levelUp(s: S, h: Hero, from: number, to: number, show = true): void {
  const def = HERO_DEFS[h.id];
  const fixed = fixedGain(def, from);
  const roll = rollLevelUp(s.rng, def.weights, h.advantage);
  const usedAdvantage = h.advantage;
  h.advantage = roll.nextAdvantage;
  const gains: Partial<Record<StatKey, number>> = {};
  for (const k of STAT_KEYS) {
    const extra = roll.spread[k] * POINT_VALUE[k];
    h.bonus[k] += extra;
    const g = fixed[k] + extra;
    if (g > 0) gains[k] = g;
  }
  const oldHp = h.st.hp, oldMp = h.st.mp;
  h.level = to;
  h.st = statsAt(def, to, h.bonus);
  if (!h.ko) {
    const frac = roll.natTwenty ? 1 : LEVEL_UP_HEAL;
    h.hp = Math.min(h.st.hp, h.hp + (h.st.hp - oldHp) + h.st.hp * frac);
    h.mp = Math.min(h.st.mp, h.mp + (h.st.mp - oldMp) + h.st.mp * frac);
  }
  const talent = talentGainedAt(h.id, to);
  const info: LevelUpInfo = {
    hero: h.id, from, to, roll: roll.roll, advantage: usedAdvantage, gains,
    talent: talent ? { name: talent.name, text: talent.text } : null,
  };
  s.events.push({ t: 'levelUp', info });
  s.stats.levelUps.push({ hero: h.id, from, to });
  if (!h.ko) {
    if (show) floater(s, 'LEVEL UP', h.x, h.y - 22, 'yellow', true, 60);
    sfx(s, 'levelUp');
  }
  if (roll.natTwenty) {
    s.inspire = INSPIRATION_SECONDS * 60;
    s.events.push({ t: 'natTwenty', hero: h.id, source: 'levelUp' });
    sfx(s, 'natTwenty');
    flashScreen(s, 0.4);
  }
}

/** XP from a kill or the dev panel: full for the active hero, half for everyone else. */
export function awardXp(s: S, n: number): void {
  if (n <= 0) return;
  s.stats.xpEarned += n;
  s.heroes.forEach((h, i) => {
    const r = addXp(h.level, h.xp, xpShare(n, i === s.active));
    h.xp = r.xp;
    r.gained.forEach((to, k) => levelUp(s, h, to - 1, to, k === r.gained.length - 1));
  });
}

/** Dev tool: sets the active hero's level, drops its d20 bonus and recomputes stats. */
export function setActiveLevel(s: S, n: number): void {
  const h = activeHero(s);
  h.level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(n)));
  h.bonus = emptyStats();
  h.st = statsAt(HERO_DEFS[h.id], h.level, h.bonus);
  h.xp = 0;
  h.hp = h.st.hp;
  h.mp = h.st.mp;
  h.ko = false;
}

/** Joins at the party's average level minus one (min 1) and removes the matching npc. */
export function recruitHero(s: S, id: HeroId): void {
  s.npcs = s.npcs.filter((n) => n.id !== id);
  if (s.heroes.some((h) => h.id === id)) return;
  const avg = s.heroes.reduce((a, h) => a + h.level, 0) / Math.max(1, s.heroes.length);
  const a = activeHero(s);
  const h = makeHero(id, Math.max(1, Math.round(avg) - 1), 0, a.x, a.y);
  h.dir = a.dir;
  s.heroes.push(h);
}

/** Heals HP and MP by a fraction of max. KO'd heroes get back up with at least 1 HP. */
export function healParty(s: S, frac: number): void {
  if (s.over) {
    // Getting up after a wipe: drop whatever was in flight.
    s.hitstop = 0; s.projs = []; s.zones = []; s.timers = []; s.seq = null;
  }
  for (const h of s.heroes) {
    if (h.ko) { h.ko = false; h.hp = 0; h.anim = 'idle'; h.animT = 0; }
    h.hp = Math.min(h.st.hp, Math.max(1, h.hp + h.st.hp * frac));
    h.mp = Math.min(h.st.mp, h.mp + h.st.mp * frac);
  }
  s.over = false;
  s.bodies = [];
}
