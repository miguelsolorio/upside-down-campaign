// The defense (docs/level-6.md, "The defense"): Sim.defend() starts a clock, the ward (Eleven) channels, and the waves come up
// from the burrows. The party keeps the enemies off her until the clock runs out.
//
//   Before it starts she is an ordinary npc with no bar. After, her view is anim 'cast' with strained true and a bar.
//   Enemies favor her (wantsWard): a wave enemy goes for her unless the active hero is within 40 px of it, hit it in the last 90
//   frames, or Steve's Babysit holds it. It picks again after each attack. Her HP is fixed (DefenseDef.hp); the damage she takes
//   scales with difficulty and enemyMult like damage to heroes. Heroes never hurt her. Hopper and any other npc are ignored.
//   The clock always runs. About every 10 s the Gate rumbles. At 0: `defended`, `gateShut`, a shake and a flash, every run-time
//   enemy still up dies for no XP, and the rift shows k = 1. If her HP hits 0 first: `wardDown` once, the clock stops, anim 'ko'.
import type { ActorView, HudView } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import type { Defense, Enemy, Hero, Npc, Pos, Prop, S } from './state.ts';
import { activeHero } from './state.ts';
import { dust, flashScreen, floater, shake, sfx, sparks } from './fx.ts';
import { spreadRoll } from './damage.ts';
import { bringUp, waveSpots } from './spawns.ts';
import { BODY_Y, dist } from './space.ts';

/** Her DEF: an enemy's bite or lunge uses its usual numbers against it. */
export const WARD_DEF = 4;
/** A wave enemy turns on a hero this close to it, or one who hit it within this many frames. */
export const HERO_NEAR = 40;
export const HIT_MEMORY = 90;
/** Frames between rumbles: about ten seconds. */
export const RUMBLE_EVERY = 600;

/** The ward's position while she can still be hurt, else null. */
export function wardPos(s: S): (Pos & { ward: true }) | null {
  const d = s.defense;
  return d && d.started && !d.down && !d.done ? d.pos : null;
}

/** Does this enemy go for the ward instead of the hero right now? Only wave enemies do, and the hero can pull them off. */
export function wantsWard(s: S, e: Enemy, hero: Hero): boolean {
  if (e.rt !== 'wave' || !wardPos(s)) return false;
  if (e.taunt > 0 || s.frame - e.hitAt <= HIT_MEMORY) return false;
  return dist(e.x, e.y, hero.x, hero.y) > HERO_NEAR;
}

/**
 * An enemy hits the ward. power x atk is the enemy's attack, less her DEF, scaled by difficulty and the stage's enemyMult like
 * damage to a hero. Returns the damage taken, 0 if she is not there to be hit (not started, down, done, god mode).
 */
export function hurtWard(s: S, power: number, atk: number): number {
  const d = s.defense;
  if (!d || !d.started || d.down || d.done || s.over || s.god) return 0;
  const dmg = Math.max(1, Math.round((power * atk * spreadRoll(s.rng) - WARD_DEF * 0.5) * s.mult * s.foeMult));
  d.hp = Math.max(0, d.hp - dmg);
  d.flash = 1;
  floater(s, String(dmg), d.pos.x, d.pos.y - 18, 'hot');
  sfx(s, 'hurt');
  sparks(s, d.pos.x, d.pos.y - BODY_Y, 3);
  if (d.hp <= 0) wardFalls(s, d);
  return dmg;
}

function wardFalls(s: S, d: Defense): void {
  d.down = true;
  d.hp = 0;
  d.animT = 0;
  s.events.push({ t: 'wardDown', id: d.def.npc });
  sfx(s, 'ko');
  shake(s, 3);
}

/** The clock ran out with her standing: the Gate is shut, and whatever is left of the run-time enemies dies for nothing. */
function gateShuts(s: S, d: Defense): void {
  d.done = true;
  d.left = 0;
  d.animT = 0;
  for (const e of s.enemies) {
    if (e.dead || e.rt === null) continue;
    e.dead = true; e.deadT = 0; e.aware = false; e.mode = 'idle'; e.hp = 0; e.anim = 'ko'; e.animT = 0; e.vx = 0; e.vy = 0; e.z = 0;
    dust(s, e.x, e.y, 4);
  }
  s.events.push({ t: 'defended' });
  sfx(s, 'gateShut');
  shake(s, 7);
  flashScreen(s, 0.7);
}

/** Sim.defend(): the clock starts, and she goes where her npc stands. Does nothing without a defense, or once it has started. */
export function startDefense(s: S): void {
  const d = s.defense;
  if (!d || d.started) return;
  d.started = true;
  d.animT = 0;
  const n = s.npcs.find((o) => o.id === d.def.npc);
  const rift = s.props.find((p) => p.id === d.def.prop);
  const h = activeHero(s);
  const at = n ?? (rift ? { x: rift.x + rift.w / 2, y: rift.y + rift.h + 8 } : h);
  d.pos = { x: at.x, y: at.y, ward: true };
}

/** One tick: the waves due, the rumble, and the clock. Runs after the enemies have had their turn. */
export function updateDefense(s: S): void {
  const d = s.defense;
  if (!d || !d.started) return;
  d.animT++;
  if (d.flash > 0) d.flash = Math.max(0, d.flash - 0.12);
  if (d.done || d.down) return;
  const elapsed = d.total - d.left;
  while (d.next < d.waves.length && (d.waves[d.next] as { at: number }).at <= elapsed) {
    const w = d.waves[d.next++] as Defense['waves'][number];
    bringUp(s, 'wave', 'defense', w.type, w.tier, waveSpots(s, d.pos.x, d.pos.y), w.n, d.cursor);
    d.cursor += w.n;
  }
  if (elapsed > 0 && elapsed % RUMBLE_EVERY === 0) { sfx(s, 'rumble'); shake(s, 2); }
  if (--d.left <= 0) gateShuts(s, d);
}

/** HudView.ward: null until the defense starts. */
export function wardHud(s: S): HudView['ward'] {
  const d = s.defense;
  if (!d || !d.started) return null;
  return { name: CHAR_NAMES[d.def.npc].toUpperCase(), hp: Math.max(d.down ? 0 : 1, Math.ceil(d.hp)), hpMax: d.hpMax, left: Math.max(0, d.left), total: d.total };
}

/** The ward's ActorView, or null for an npc that is not her. */
export function wardView(s: S, n: Npc): ActorView | null {
  const d = s.defense;
  if (!d || !d.started || n.id !== d.def.npc) return null;
  return {
    kind: 'npc', id: n.id, x: n.x, y: n.y, dir: n.dir, anim: d.down ? 'ko' : d.done ? 'idle' : 'cast', t: d.animT, flash: d.flash,
    blink: false, strained: true, tint: null, alert: false, z: 0,
    bar: d.done || d.down ? null : { hp: Math.max(1, Math.ceil(d.hp)), hpMax: d.hpMax },
  };
}

/** How far the Gate has closed, 0 to 1, for the defense's rift prop. Undefined for any other prop. */
export function riftK(s: S, p: Prop): number | undefined {
  const d = s.defense;
  if (!d || !d.started || p.id !== d.def.prop) return undefined;
  return d.done ? 1 : Math.max(0, Math.min(1, 1 - d.left / d.total));
}
