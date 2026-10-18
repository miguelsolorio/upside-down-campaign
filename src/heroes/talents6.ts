// One frame of the Lv 6 and Lv 9 talents' clocks: Dart, Steve's leap, Hive link, the Oath's beat and the callouts of King Steve and
// Final girl, and Eddie's solo and his Hellfire DM marks. The sim runs it right after the active hero acts.
import type { S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { tickHeal } from './cleric.ts';
import { stepDart } from './dart.ts';
import { stepLeap } from './ahoy.ts';
import { stepStand } from './eddie_solo.ts';
import { tickMarks } from './hellfire.ts';
import { stepOath } from './oath.ts';
import { tickTalents9 } from './talents9.ts';

export function updateTalents(s: S): void {
  const t = s.t6;
  if (t.rally > 0) t.rally--;
  // Camo is Lucas's own: it ends when he tags out.
  if (t.camo > 0) t.camo = activeHero(s).id === 'lucas' ? t.camo - 1 : 0;
  if (t.camoCd > 0) t.camoCd--;
  // So is Eleven's Sensory tank.
  if (t.sense > 0) t.sense = activeHero(s).id === 'eleven' ? t.sense - 1 : 0;
  // Will's Hive link is his own too: it ends when he tags out.
  if (t.hive > 0) t.hive = activeHero(s).id === 'will' ? t.hive - 1 : 0;
  tickHeal(s);
  stepDart(s);
  stepLeap(s);
  stepStand(s);
  tickMarks(s);
  stepOath(s);
  tickTalents9(s);
}
