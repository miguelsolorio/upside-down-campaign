// Spawn builders for the guard, warden, hazard and camera tests. Not a test file.
import type { SimSpawn } from '../src/core/types.ts';

type EnemySpawn = Extract<SimSpawn, { kind: 'enemy' }>;

export const guardAt = (tx: number, ty: number, extra: Partial<EnemySpawn> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'g', type: 'guard', tx, ty, group: 'g', ...extra });

export const wardenAt = (tx: number, ty: number, extra: Partial<EnemySpawn> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'w', type: 'warden', tx, ty, group: 'w', ...extra });
