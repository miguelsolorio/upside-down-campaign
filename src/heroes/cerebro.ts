// Dustin's Cerebro (Lv 9, a held Special, hold.ts): he calls Suzie on the radio, once a stage, and every living hero's MP goes up by
// 30 percent of their max. It costs no MP and ends the hold: once it is spent, his Special casts on the press again (holdsSpecial).
// The flag is in S.t6, which every stage and retry starts afresh.
// What gfx sees: three 'ring's of different sizes round Dustin (the radio waves), a small 'ring' on every hero who got MP, a SUZIE
// floater and the MP it brought, and the 'decode' sound, a keypad run, as the call.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';
import { beginAct } from './common.ts';

/** Casts it. The caller has checked the hold and the cooldown. */
export function callSuzie(s: S, h: Hero): void {
  const d = HERO_DEFS.dustin.special;
  beginAct(h, d, 'special');
  s.t6.cerebro = true;
  sfx(s, 'decode');
  for (const [w, life] of [[28, 18], [44, 26], [60, 34]] as const) addFx(s, 'ring', h.x, h.y - 8, h.dir, 0, life, w, w);
  for (const o of s.heroes) {
    if (o.ko) continue;
    o.mp = Math.min(o.st.mp, o.mp + o.st.mp * d.x.suzieMp);
    if (o !== h) addFx(s, 'ring', o.x, o.y - 6, o.dir, 0, 20, 20, 20);
  }
  floater(s, 'SUZIE', h.x, h.y - 38, 'cyan', true, 54);
  floater(s, `MP +${Math.round(d.x.suzieMp * 100)}%`, h.x, h.y - 22, 'sky', false, 54);
}
