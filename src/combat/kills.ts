// Deaths: kill events, XP, quarter drops, group-cleared, and removing bodies after their death animation.
import { cancelAttack } from '../enemies/shield.ts';
import { hasTalent } from '../progression/talents.ts';
import type { Enemy, S } from './state.ts';
import { activeHero } from './state.ts';
import { dust, sfx } from './fx.ts';
import { awardXp } from './party.ts';

const DEATH_FRAMES = 22;
export const COMPASS_DROP = 0.1;

function dropChance(s: S, base: number): number {
  const dustin = s.heroes.find((h) => h.id === 'dustin');
  return base + (dustin && hasTalent('dustin', dustin.level) ? COMPASS_DROP : 0);
}

function kill(s: S, e: Enemy): void {
  cancelAttack(s, e);
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
  // The roll is always drawn so the random stream does not depend on the Compass talent.
  if (s.rng() < dropChance(s, e.drop)) {
    s.items.push({ id: `drop${s.nextDrop++}`, kind: 'quarter', x: e.x, y: e.y, t: 0 });
  }
  awardXp(s, e.xp);
  if (!s.cleared.has(e.group) && !s.enemies.some((o) => o.group === e.group && !o.dead)) {
    s.cleared.add(e.group);
    s.events.push({ t: 'groupCleared', group: e.group });
  }
}

/** Notices enemies at 0 HP, in array order, then drops bodies that finished their animation. */
export function reapEnemies(s: S): void {
  let remove = false;
  for (const e of s.enemies) {
    if (!e.dead && !e.dormant && e.hp <= 0) kill(s, e);
    if (e.dead) {
      e.deadT++;
      if (e.deadT > DEATH_FRAMES) remove = true;
    }
  }
  if (remove) s.enemies = s.enemies.filter((e) => !(e.dead && e.deadT > DEATH_FRAMES));
}
