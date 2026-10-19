// The clock curse and Max's Walkman (docs/level-11.md, "The curse" and "Max's Walkman"). The state is S.house (house.ts).
//
//   Sim.curse(prop) has a standing clock chime and curses one hero: the active hero, or if that is Eddie or Max the next standing hero in
//     party order who is neither. It does nothing if nobody else would be left standing, while the Walkman is on, or for a clock that is broken
//     or has chimed before. { t: 'cursed', hero }.
//   The chimes: the first at once, then one every CHIME_FRAMES (a curse takes its own gap, so a later stage can chime faster). Each is sfx
//     `chime`, fx `chime` over the clock and 4 px more height for the hero. The fourth knocks the hero out like any KO, and the curse ends.
//   The cursed hero hangs where the curse found them, benched or not: no moving, attacking, being hurt or swapped to. The party swaps away
//     from the active one at once (party.ts, awayFrom), and with nobody else standing the party is down (reapHeroes).
//   The ways out: the clock that chimed breaks (liftCurse, from props.ts), or Max plays the Walkman (swapped). Either way, and on the KO,
//     { t: 'curseEnd', hero, how }, and that clock never chimes again.
//   The Walkman: a swap to Max while it is ready plays it. Forced swaps don't. Every curse ends, no hero can be cursed for WALKMAN_ON
//     frames, and it is ready again WALKMAN_CD frames after it played.
//   Vecna's clock (enemies/vecna_phase.ts) starts curses of its own with beginCurse: it picks a random standing hero (fightTarget) and marks
//     a memory orb, which the curse remembers (Curse.orb). Breaking that orb lifts the curse (liftOrbCurse, curseEnd 'orb'). The attic's
//     clock never breaks and chimes again and again, so none of the one-clock rules above apply to it.
import type { HudView } from '../core/types.ts';
import type { Hero, S } from './state.ts';
import { activeHero } from './state.ts';
import type { Curse } from './house.ts';
import { CHIME_LIFT, cursedBy, isCursed, standing } from './house.ts';
import { addFx, sfx } from './fx.ts';
import { BODY_Y } from './space.ts';

/** Frames between one chime and the next. */
export const CHIME_FRAMES = 300;
/** The chime that knocks the hero out. */
export const CHIMES = 4;
/** Frames the Walkman protects the party for, and frames after it played before it is ready again. */
export const WALKMAN_ON = 480;
export const WALKMAN_CD = 1800;
/** Eddie breaks the clock and Max plays the Walkman, so neither is ever the one the lesson cursed. */
const SPARED = new Set(['eddie', 'max']);

/** The hero a curse takes, or null when nobody else would be left standing. */
export function curseTarget(s: S): Hero | null {
  const n = s.heroes.length;
  for (let k = 0; k < n; k++) {
    const h = s.heroes[(s.active + k) % n] as Hero;
    if (h.ko || isCursed(s, h) || SPARED.has(h.id)) continue;
    return s.heroes.some((o) => o !== h && !o.ko && !isCursed(s, o)) ? h : null;
  }
  return null;
}

function chime(s: S, c: Curse): void {
  const clock = s.props.find((p) => p.id === c.clock);
  c.chimes++;
  c.t = 0;
  c.hero.z = c.chimes * CHIME_LIFT;
  sfx(s, 'chime');
  if (clock) addFx(s, 'chime', clock.x + clock.w / 2, clock.y + clock.h / 2, 'down', 0, 30, 40, 0);
}

/** A curse begins on `hero`: the first chime sounds at once. `clock` is the prop that chimed ('' for none), `orb` the orb it marked. */
export function beginCurse(s: S, hero: Hero, clock: string, gap: number, orb = ''): void {
  const hs = s.house;
  hs.down.delete(hero);
  const c: Curse = { hero, clock, chimes: 0, t: 0, gap, orb };
  hs.curses.push(c);
  hero.vx = 0; hero.vy = 0; hero.holdT = 0;
  s.events.push({ t: 'cursed', hero: hero.id });
  chime(s, c);
  sfx(s, 'curse');
}

/**
 * The clock `propId` chimes for the first time and curses a hero. Returns the hero, or null when nothing happened. The caller swaps the party
 * away if it was the active one (party.ts).
 */
export function startCurse(s: S, propId: string, gap = CHIME_FRAMES): Hero | null {
  const hs = s.house;
  const clock = s.props.find((p) => p.id === propId);
  if (!clock || clock.kind !== 'clock' || clock.state === 'open' || hs.spent.has(propId) || hs.walkOn > 0 || s.over) return null;
  const hero = curseTarget(s);
  if (!hero) return null;
  hs.spent.add(propId);
  beginCurse(s, hero, propId, gap);
  return hero;
}

/** The hero Vecna's clock curses: a random hero who is standing and not cursed, and only while another is left standing. Null when none. */
export function fightTarget(s: S): Hero | null {
  const up = standing(s);
  return up.length < 2 ? null : (up[Math.floor(s.rng() * up.length)] as Hero);
}

/** A curse ends. Lifted, the hero floats back down to the bench as they were; on the KO they are down already. */
function endCurse(s: S, c: Curse, how: 'clock' | 'walkman' | 'orb' | 'ko'): void {
  s.house.curses = s.house.curses.filter((o) => o !== c);
  if (how === 'ko') c.hero.z = 0; else s.house.down.set(c.hero, c.hero.z);
  s.events.push({ t: 'curseEnd', hero: c.hero.id, how });
}

/** A clock breaks: the curse it chimed, if any, is lifted. */
export function liftCurse(s: S, clockId: string): void {
  for (const c of s.house.curses.filter((o) => o.clock === clockId)) endCurse(s, c, 'clock');
}

/** The memory orb `orbId` broke: every curse it was marked for is lifted. */
export function liftOrbCurse(s: S, orbId: string): void {
  for (const c of s.house.curses.filter((o) => o.orb === orbId)) endCurse(s, c, 'orb');
}

/** The orb is the one a curse counting marked, so breaking it would lift that curse. */
export const markedOrb = (s: S, orbId: string): boolean => s.house.curses.some((c) => c.orb === orbId);

/** A wipe or a getting up from one: no curse carries over. */
export function clearCurses(s: S): void {
  for (const c of s.house.curses) c.hero.z = 0;
  s.house.curses = [];
  s.house.down.clear();
  s.house.walkOn = 0;
}

/** The fourth chime: the hero is knocked out with the same rules as any KO (reapHeroes takes it from here), unless god mode is on. */
function fell(s: S, c: Curse): void {
  chime(s, c);
  if (!s.god) c.hero.hp = 0;
  endCurse(s, c, 'ko');
}

/** One frame of play: the chimes count, the Walkman's clocks run and a hero let go floats a little further down. */
export function updateCurse(s: S): void {
  const hs = s.house;
  if (hs.walkOn > 0) hs.walkOn--;
  if (hs.walkCd > 0) hs.walkCd--;
  for (const [h, z] of hs.down) {
    if (z <= 1) hs.down.delete(h); else hs.down.set(h, z - 1);
    if (h.ko) hs.down.delete(h);
  }
  for (const c of hs.curses.slice()) {
    if (++c.t < c.gap) continue;
    if (c.chimes + 1 >= CHIMES) fell(s, c); else chime(s, c);
  }
}

/** Called after an unforced swap: swapping to Max while the Walkman is ready plays it. */
export function swapped(s: S): void {
  const hs = s.house;
  const max = activeHero(s);
  if (max.id !== 'max' || !hs.walkman || hs.walkCd > 0) return;
  hs.walkCd = WALKMAN_CD;
  hs.walkOn = WALKMAN_ON;
  sfx(s, 'walkman');
  addFx(s, 'walkman', max.x, max.y - BODY_Y, 'down', 0, 60, 48, 0);
  s.events.push({ t: 'walkman' });
  for (const c of hs.curses.slice()) endCurse(s, c, 'walkman');
}

/** HudView.walkman: null unless the party has the Walkman and Max is in it. */
export function walkmanHud(s: S): HudView['walkman'] {
  const hs = s.house;
  if (!hs.walkman || !s.heroes.some((h) => h.id === 'max')) return null;
  return { ready: hs.walkCd > 0 ? Math.max(0, 1 - hs.walkCd / WALKMAN_CD) : 1, on: hs.walkOn };
}

/** The chimes sounded on a hero, or 0 when they are not cursed. */
export const chimesOn = (s: S, h: Hero): number => cursedBy(s, h)?.chimes ?? 0;
