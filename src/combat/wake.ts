// Waking a dormant group: Sim.spawnGroup, and the final fight when a phase brings the next boss up (combat/finale.ts).
import type { S } from './state.ts';
import { alertEnemy } from './damage.ts';
import { dust } from './fx.ts';
import { wakeFlayed } from '../enemies/flayed.ts';
import { wakeFlayer } from '../enemies/flayer.ts';

/** Wakes every dormant enemy of `group`, already hunting. A Creel ghoul only starts to watch for a hero; a Flayed rises, the Mind Flayer comes in. */
export function wakeGroup(s: S, group: string): void {
  for (const e of s.enemies) {
    if (!e.dormant || e.dead || e.group !== group) continue;
    // A ghoul stays in its mirror: waking it only lets it step out when a hero comes near (enemies/ghoul.ts).
    if (e.ghoul) { e.ghoul.awake = true; continue; }
    e.dormant = false;
    dust(s, e.x, e.y, 4);
    alertEnemy(s, e);
    // A Flayed comes up out of its puddle before it hunts.
    wakeFlayed(e);
    wakeFlayer(s, e);
  }
}
