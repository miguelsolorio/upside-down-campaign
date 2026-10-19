// The channel (docs/level-16.md, phase three of the final fight). Eleven and Will walk to two marks and hold them like 2.3's ward
// (combat/defense.ts), each with a bar of their own, while the party plays its other two heroes and holds the line for `frames` against
// waves of demodogs and Flayed that go for the channelers.
//
//   channelers: the two heroes of FinaleDef.channelers who are in the party. They stay in S.heroes but are held (isChanneling): never swapped to,
//     never trailing the leader, no regen. A KO'd one stands up for it. With either of them the active hero, the party swaps away first.
//   walk: until both stand on their marks (1.6 px a frame, 180 frames at most, then they are put there) nothing comes and no clock runs.
//   on: the clock counts down from `frames`, and the waves come up at the stage's burrows `at` frames in, round the rim in turn. A wave
//     enemy goes for the nearest channeler standing (wantsWard in defense.ts, unless the hero is within 40 px of it, hit it lately or Babysit
//     holds it); the damage a channeler takes scales with difficulty and enemyMult like the ward's, and heroes never hurt them. God mode makes
//     them immune.
//   a fall: a channeler at 0 HP starts it over (channelFalls): both at full, the clock back at `frames`, the waves from the first, and every
//     run-time enemy still up dies for nothing, so a lost channel can't snowball. { t: 'channelReset' }.
import type { ActorView, HudView } from '../core/types.ts';
import { CHAR_NAMES, TILE } from '../core/config.ts';
import type { Channeler, Finale } from './finale_state.ts';
import { channelOn, isChanneling } from './finale_state.ts';
import type { Enemy, Hero, S } from './state.ts';
import { activeHero } from './state.ts';
import { dust, flashScreen, floater, shake, sfx, sparks } from './fx.ts';
import { spreadRoll } from './damage.ts';
import { healParty, nextLiving, trySwap } from './party.ts';
import { moveBody, BODY_Y, dist } from './space.ts';
import { bringUp } from './spawns.ts';

export { channelOn, isChanneling };

/** A channeler's DEF: a wave enemy's bite uses its usual numbers against it. */
export const CHAN_DEF = 4;
/** The share of everyone's HP and MP a fall gives back (healParty), along with the channel starting again. */
export const RESET_HEAL = 0.2;
/** Frames the walk to the marks may take, and its pace in px a frame. */
export const WALK_MAX = 180;
export const WALK_SPEED = 1.6;

/** The channeler the enemy `e` should go for: the nearest one standing, while the channel runs. Null when it is not running or nobody is up. */
export function channelFor(s: S, e: Enemy): Channeler | null {
  if (!channelOn(s)) return null;
  let best: Channeler | null = null, bestD = Infinity;
  for (const c of (s.finale as Finale).chans) {
    const d = dist(e.x, e.y, c.x, c.y);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/** True for a ward target that is a channeler (enemies pass the target they locked on to hurtWard). */
export const isChanneler = (at: object): at is Channeler => 'hpMax' in at && 'hero' in at;

/** Every run-time enemy still up dies for no XP and no kill event, as the Gate's closing does it (combat/defense.ts). */
export function dropRuntime(s: S): void {
  for (const e of s.enemies) {
    if (e.dead || e.rt === null) continue;
    e.dead = true; e.deadT = 0; e.aware = false; e.mode = 'idle'; e.hp = 0; e.anim = 'ko'; e.animT = 0; e.vx = 0; e.vy = 0; e.z = 0;
    dust(s, e.x, e.y, 4);
  }
}

/** A channeler fell: both are back at full, the clock and the waves start again, and what was up is gone. */
function channelFalls(s: S, f: Finale, c: Channeler): void {
  f.resets++;
  f.left = f.total;
  f.next = 0;
  for (const o of f.chans) { o.hp = o.hpMax; o.flash = 0; }
  dropRuntime(s);
  // The party that held the line gets its breath back too, so a lost channel is a second try and not a slide.
  healParty(s, RESET_HEAL);
  s.events.push({ t: 'channelReset', hero: c.hero.id });
  sfx(s, 'ko');
  shake(s, 5);
  flashScreen(s, 0.3);
  for (const o of f.chans) floater(s, 'AGAIN', o.x, o.y - 30, 'yellow', true, 70);
}

/**
 * An enemy hits a channeler: power x atk less their DEF, scaled by difficulty and the stage's enemyMult. Returns the damage, 0 if they are
 * not there to be hit (the channel isn't running, god mode). At 0 HP the channel starts again.
 */
export function hurtChannel(s: S, c: Channeler, power: number, atk: number): number {
  const f = s.finale;
  if (!f || !channelOn(s) || s.over || s.god) return 0;
  const dmg = Math.max(1, Math.round((power * atk * spreadRoll(s.rng) - CHAN_DEF * 0.5) * s.mult * s.foeMult));
  c.hp = Math.max(0, c.hp - dmg);
  c.flash = 1;
  floater(s, String(dmg), c.x, c.y - 18, 'hot');
  sfx(s, 'hurt');
  sparks(s, c.x, c.y - BODY_Y, 3);
  if (c.hp <= 0) channelFalls(s, f, c);
  return dmg;
}

/** The feet position of a tile, as an actor standing on it. */
const feet = (tx: number, ty: number): { x: number; y: number } => ({ x: tx * TILE + TILE / 2, y: ty * TILE + 12 });

/**
 * Phase three begins: the channelers are chosen from the party, stood up if they were down, held where they are, and the party swaps away
 * from the active one if it is a channeler. The walk to the marks starts next tick.
 */
export function startChannel(s: S, f: Finale): void {
  f.chans = [];
  f.on = false;
  f.left = f.total;
  f.next = 0;
  for (const d of f.def.channelers) {
    const h = s.heroes.find((o) => o.id === d.hero);
    if (!h) continue;
    const at = feet(d.tx, d.ty);
    const hpMax = f.def.hp;
    f.chans.push({ x: at.x, y: at.y, ward: true, flow: { tx: -1, ty: -1, dist: null, nav: null, age: 0 }, hero: h, hp: hpMax, hpMax, flash: 0 });
    h.ko = false;
    h.hp = Math.max(h.hp, 1);
    h.vx = 0; h.vy = 0; h.holdT = 0; h.actId++; h.actT = 0; h.act = null; h.dash = null;
  }
  s.bodies = s.bodies.filter((b) => !f.chans.some((c) => c.hero.id === b.id));
  if (isChanneling(s, activeHero(s))) {
    const next = nextLiving(s, s.active, 1);
    if (next >= 0) trySwap(s, next, true);
  }
}

/** One step of the walk to the marks. Returns true once every channeler stands on theirs. */
function walkToMarks(s: S, f: Finale): boolean {
  let all = true;
  for (const c of f.chans) {
    const h = c.hero;
    const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy);
    h.animT++;
    if (d <= WALK_SPEED || f.t >= WALK_MAX) {
      h.x = c.x; h.y = c.y;
      h.moving = false; h.anim = 'cast';
      continue;
    }
    all = false;
    moveBody(s, h, (dx / d) * WALK_SPEED, (dy / d) * WALK_SPEED);
    h.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    h.moving = true; h.anim = 'walk';
  }
  return all;
}

/**
 * One tick of the channel (combat/finale.ts calls it in phase three): the walk, then the clock and the waves. Returns true on the tick the
 * clock runs out with every channeler standing.
 */
export function stepChannel(s: S, f: Finale): boolean {
  for (const c of f.chans) if (c.flash > 0) c.flash = Math.max(0, c.flash - 0.12);
  if (!f.on) {
    if (!walkToMarks(s, f)) return false;
    f.on = true;
    f.t = 0;
    sfx(s, 'rumble');
    shake(s, 2);
    return false;
  }
  for (const c of f.chans) { c.hero.anim = 'cast'; c.hero.animT++; c.hero.moving = false; }
  const waves = f.def.waves, elapsed = f.total - f.left;
  while (f.next < waves.length && (waves[f.next] as { at: number }).at <= elapsed) {
    const w = waves[f.next++] as Finale['def']['waves'][number];
    bringUp(s, 'wave', 'channel', w.type, w.tier, s.burrows.length > 0 ? s.burrows.map((b) => feet(b.tx, b.ty)) : [{ x: f.chans[0]?.x ?? 0, y: f.chans[0]?.y ?? 0 }], w.n, f.cursor);
    f.cursor += w.n;
  }
  if (elapsed > 0 && elapsed % 600 === 0) { sfx(s, 'rumble'); shake(s, 2); }
  return --f.left <= 0;
}

// ---------------------------------------------------------------- what the view shows
/** The ActorView of a channeler's hero: held on the mark, casting, with the channeler's own bar. Null for anyone else. */
export function channelView(s: S, h: Hero, base: ActorView): ActorView | null {
  const c = s.finale?.chans.find((o) => o.hero === h);
  if (!c) return null;
  return {
    ...base, x: h.x, y: h.y, anim: h.anim === 'walk' ? 'walk' : 'cast', t: h.animT, flash: c.flash, blink: false, strained: h.id === 'eleven', tint: null, z: 0,
    bar: { hp: Math.max(c.hp > 0 ? 1 : 0, Math.ceil(c.hp)), hpMax: c.hpMax },
  };
}

/** HudView.channel: null before phase three. */
export function channelHud(s: S): HudView['channel'] {
  const f = s.finale;
  if (!f || f.phase < 3) return null;
  return {
    on: f.on, left: Math.max(0, f.left), total: f.total,
    channelers: f.chans.map((c) => ({ id: c.hero.id, name: CHAR_NAMES[c.hero.id].toUpperCase(), hp: Math.max(c.hp > 0 ? 1 : 0, Math.ceil(c.hp)), hpMax: c.hpMax })),
  };
}
