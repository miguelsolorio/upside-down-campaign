// One frame of the Lv 6 talents' clocks, Dart and Steve's leap. The sim runs it right after the active hero acts.
import type { S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { tickHeal } from './cleric.ts';
import { stepDart } from './dart.ts';
import { stepLeap } from './ahoy.ts';

export function updateTalents(s: S): void {
  const t = s.t6;
  if (t.rally > 0) t.rally--;
  // Camo is Lucas's own: it ends when he tags out.
  if (t.camo > 0) t.camo = activeHero(s).id === 'lucas' ? t.camo - 1 : 0;
  if (t.camoCd > 0) t.camoCd--;
  if (t.sense > 0) t.sense--;
  tickHeal(s);
  stepDart(s);
  stepLeap(s);
}
