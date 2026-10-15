// What the dev panel (?dev=1) is given: the sim's debug switches, plus suggestions for its group and prop boxes that come
// from the stage being played. Pure apart from the sim and director it is handed, so Node can test it.
import type { DevHooks, Sim, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { KEPT_PROPS } from './options.ts';
import type { Director } from './triggers.ts';
import type { StageData } from './types.ts';

/**
 * The enemy groups and the props worth opening in this stage, each in the order the stage data lists them. A prop is worth
 * opening when it has a closed and an open state (a gate, a door, a log, lights...); tanks, racks and bikes are scenery.
 */
export function devSuggestions(stage: Pick<StageData, 'spawns'>): { groups: string[]; props: string[] } {
  const groups: string[] = [];
  const props: string[] = [];
  for (const s of stage.spawns) {
    if (s.kind === 'enemy' && !groups.includes(s.group)) groups.push(s.group);
    if (s.kind === 'prop' && KEPT_PROPS.has(s.prop)) props.push(s.id);
  }
  return { groups, props };
}

/** The live pieces of the play scene the hooks reach into. They are read each time, since a retry rebuilds the sim. */
export interface DevSource {
  stage: Pick<StageData, 'spawns' | 'time'>;
  sim(): Sim;
  director(): Director;
  checkpoint(): Vec2;
}

export function devHooks(src: DevSource): DevHooks {
  const { groups, props } = devSuggestions(src.stage);
  return {
    groups,
    props,
    get god() { return src.sim().dev.god; },
    set god(v: boolean) { src.sim().dev.god = v; },
    get hitboxes() { return src.sim().dev.hitboxes; },
    set hitboxes(v: boolean) { src.sim().dev.hitboxes = v; },
    giveXp: (n) => src.sim().dev.giveXp(n),
    setLevel: (n) => src.sim().dev.setLevel(n),
    killAll: () => src.sim().dev.killAll(),
    teleport: (x, y) => src.sim().dev.teleport(x, y),
    spawnGroup: (g) => src.sim().spawnGroup(g),
    openProp: (id) => src.sim().openProp(id),
    recruit: (id) => src.sim().recruit(id),
    state: () => {
      const sim = src.sim();
      const p = sim.heroPos();
      const cp = src.checkpoint();
      return {
        tile: `${(p.x / TILE) | 0},${((p.y - 4) / TILE) | 0}`, aggro: sim.aggro(), alive: sim.enemiesAlive(),
        beats: src.director().snapshot().fired.join(' '), busy: src.director().busy(), time: src.stage.time,
        checkpoint: `${(cp.x / TILE) | 0},${(cp.y / TILE) | 0}`, frame: sim.stats().frames,
      };
    },
  };
}
