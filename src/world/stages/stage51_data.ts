// Stage 5.1, Hawkins under lockdown: who and what stands where. A stub until World builds it (docs/level-14.md): a string of lights on the
// sidewalk and a pool of light over the rift. Pure data. Coordinates are tiles; a prop's tx, ty is its top-left tile and its w and h are px.
// The map is in stage51.ts.
import type { LightSource, SimSpawn } from '../../core/types.ts';

export const SPAWNS: SimSpawn[] = [
  { kind: 'prop', id: 'lights_street', prop: 'lights', tx: 2, ty: 2, w: 48, h: 16 },
];

export const LIGHTS: LightSource[] = [
  // The rift in the asphalt glows red.
  { x: 7 * 16 + 8, y: 5 * 16 + 12, r: 40, flicker: 0.3 },
];
