// Stage 5.2, the Abyss: who and what stands where. A stub until World builds it (docs/level-15.md): a string of lights on the landing.
// Pure data. Coordinates are tiles; a prop's tx, ty is its top-left tile and its w and h are px. The map is in stage52.ts.
import type { LightSource, SimSpawn } from '../../core/types.ts';

export const SPAWNS: SimSpawn[] = [
  { kind: 'prop', id: 'lights_landing', prop: 'lights', tx: 3, ty: 3, w: 48, h: 16 },
];

/** The Abyss is a day stage and its lights props make their own glow: nothing is always on. */
export const LIGHTS: LightSource[] = [];
