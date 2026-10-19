// Deaths: kill events, XP, quarter drops, group-cleared, and removing bodies after their death animation.
import { cancelAttack } from '../enemies/shield.ts';
import { advancePhase } from '../enemies/vecna_phase.ts';
import { clearAlpha } from '../enemies/alpha_hit.ts';
import { ENEMY_DEFS, xOf } from '../enemies/defs.ts';
import { releaseHold } from '../enemies/hold.ts';
import { leaveBilly } from '../enemies/billy_hit.ts';
import { glassDeath, inGlass } from '../enemies/ghoul_hit.ts';
import { enrageMate } from '../enemies/twin.ts';
import { batDeath } from '../enemies/demobat_hit.ts';
import { clearFlayer, doomLegs, legHeld } from '../enemies/flayer_hit.ts';
import { doomOrbs, orbHeld } from '../enemies/orb.ts';
import { clearVecna } from '../enemies/vecna_phase.ts';
import { hasTalent } from '../progression/talents.ts';
import type { Enemy, S } from './state.ts';
import { activeHero } from './state.ts';
import { addFx, dust, sfx } from './fx.ts';
import { hurtHero } from './damage.ts';
import { dist } from './space.ts';
import { slowHero } from './status.ts';
import { awardXp } from './party.ts';

const DEATH_FRAMES = 22;
/** Vecna as 5.3's phase one runs him: his spawn sets sinkT, and he sinks into the floor for that many frames in anim 'ko' instead of flickering out. */
export const sinks = (e: Enemy): boolean => e.vecna !== null && xOf(e).sinkT !== undefined;
/** Frames a dead body stays on the field: the final boss's Vecna sinks for sinkT, its Mind Flayer kneels for the rest of the stage (it is drawn with pose 'down'). */
export const deathFrames = (e: Enemy): number => (sinks(e) ? (xOf(e).sinkT as number) : e.kind === 'flayer5' ? Infinity : DEATH_FRAMES);
export const COMPASS_DROP = 0.1;
/** Max's High score talent: the same bonus to quarter drops as Dustin's Compass, and the two stack. */
export const HIGH_SCORE_DROP = 0.1;

function dropChance(s: S, base: number): number {
  const dustin = s.heroes.find((h) => h.id === 'dustin');
  const max = s.heroes.find((h) => h.id === 'max');
  return base + (dustin && hasTalent('dustin', dustin.level) ? COMPASS_DROP : 0) + (max && hasTalent('max', max.level) ? HIGH_SCORE_DROP : 0);
}

/** Frames the goo is drawn. */
const GOO_FRAMES = 22;

/**
 * A melting rat bursts when it dies, by any cause (a hit, a burn, a bump, a power box): a goo splash of x.burst px around it. The
 * active hero inside it takes power 0.5 (the rat's ATK) and is slowed for x.slow frames. It hurts nobody else. `melt` sfx and a 'goo' fx.
 */
function meltBurst(s: S, e: Enemy): void {
  const x = ENEMY_DEFS.melter.x;
  addFx(s, 'goo', e.x, e.y, 'down', 0, GOO_FRAMES, x.burst * 2, x.burst);
  sfx(s, 'melt');
  const h = activeHero(s);
  if (h.ko || s.over || dist(e.x, e.y, h.x, h.y) > x.burst) return;
  hurtHero(s, h, e.x, e.y, x.power, e.atk, 1.2);
  if (!s.god) slowHero(s, h, x.slow);
}

function kill(s: S, e: Enemy): void {
  cancelAttack(s, e);
  clearAlpha(s, e);
  clearFlayer(s, e);
  clearVecna(s, e);
  releaseHold(s, e);
  e.dead = true;
  e.deadT = 0;
  e.aware = false;
  e.mode = 'idle';
  e.hp = 0;
  e.anim = 'ko';
  e.animT = 0;
  e.vx *= 1.4; e.vy *= 1.4;
  const by = e.by ?? activeHero(s).id;
  s.stats.kills++;
  s.stats.killsByKind[e.kind] = (s.stats.killsByKind[e.kind] ?? 0) + 1;
  s.events.push({ t: 'kill', kind: e.kind, spawnId: e.id, group: e.group, by, xp: e.xp, x: e.x, y: e.y });
  sfx(s, 'kill');
  dust(s, e.x, e.y, 4);
  if (!s.seq) s.burst = Math.min(1, s.burst + 0.06);
  // The roll is always drawn so the random stream does not depend on the Compass talent. A run-time spawn (a howl's pup or a
  // defense wave's enemy) drops nothing: a failed defense, retried, can't be farmed. Nor does a ghoul that died in its mirror.
  if (s.rng() < dropChance(s, e.drop) && e.rt === null && !inGlass(e) && e.orb === null) {
    s.items.push({ id: `drop${s.nextDrop++}`, kind: 'quarter', x: e.x, y: e.y, t: 0 });
  }
  awardXp(s, e.xp);
  if (e.kind === 'melter') meltBurst(s, e);
  // A ghoul dies as glass.
  glassDeath(s, e);
  // A demobat dies in a flash of sparks.
  batDeath(s, e);
  // Freed, Billy stays on the floor as scenery (enemies/billy_hit.ts). The twin left standing enrages (enemies/twin.ts).
  leaveBilly(s, e);
  enrageMate(s, e);
  if (!s.cleared.has(e.group) && !s.enemies.some((o) => o.group === e.group && !o.dead)) {
    s.cleared.add(e.group);
    s.events.push({ t: 'groupCleared', group: e.group });
  }
}

/** Notices enemies at 0 HP, in array order, then drops bodies that finished their animation. */
export function reapEnemies(s: S): void {
  let remove = false;
  // The Mind Flayer at 0 HP takes its legs with it, so the body and all four die in this pass. A cut leg waits on the floor until then.
  // Vecna at 0 HP takes his orbs the same way.
  doomLegs(s);
  doomOrbs(s);
  for (const e of s.enemies) {
    // A blow that takes Vecna from above a phase line straight to 0 still plays the phases it crossed, in order, before he falls.
    if (!e.dead && !e.dormant && e.hp <= 0 && e.vecna) advancePhase(s, e);
    if (!e.dead && !e.dormant && e.hp <= 0 && !legHeld(e) && !orbHeld(e)) kill(s, e);
    if (e.dead) {
      e.deadT++;
      if (e.deadT > deathFrames(e)) remove = true;
    }
  }
  if (remove) s.enemies = s.enemies.filter((e) => !(e.dead && e.deadT > deathFrames(e)));
}
