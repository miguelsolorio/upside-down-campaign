// The Lv 9 talents that are only a number or a flag: Steve's King Steve, Nancy's Final girl and Robin's Dry wit, and the HUD's
// word on the once-a-stage ones. heroAtk (combat/damage.ts) reads atk9, hitEnemy reads witBonus, and updateTalents floats a callout
// from tickTalents9 when King Steve or Final girl switches on. Oath, Cerebro, Hive link and Extra life are in oath.ts, cerebro.ts,
// hive.ts and extralife.ts.
import { HERO_DEFS } from './defs.ts';
import { LV9, hasTalent } from '../progression/talents.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { addFx, floater } from '../combat/fx.ts';

/** King Steve: Steve stands with the talent and under 30 percent of his max HP. */
export function kingUp(h: Hero): boolean {
  return h.id === 'steve' && !h.ko && hasTalent('steve', h.level, LV9) && h.hp < h.st.hp * HERO_DEFS.steve.special.x.kingHp;
}

/** Final girl: Nancy stands with the talent and two other heroes are down. */
export function girlUp(s: S, h: Hero): boolean {
  return h.id === 'nancy' && !h.ko && hasTalent('nancy', h.level, LV9)
    && s.heroes.filter((o) => o !== h && o.ko).length >= HERO_DEFS.nancy.special.x.girlDown;
}

/** What King Steve and Final girl multiply the hero's ATK by right now. */
export function atk9(s: S, h: Hero): number {
  if (kingUp(h)) return 1 + HERO_DEFS.steve.special.x.kingAtk;
  return girlUp(s, h) ? 1 + HERO_DEFS.nancy.special.x.girlAtk : 1;
}

/** Dry wit: a confused foe takes 25 percent more from every hero while Robin, with the talent, is in the party and up. */
export function witBonus(s: S, e: Enemy): number {
  if (e.stat.confuse <= 0) return 1;
  const r = s.heroes.find((h) => h.id === 'robin');
  return r && !r.ko && hasTalent('robin', r.level, LV9) ? 1 + HERO_DEFS.robin.special.x.wit : 1;
}

/** Floats the callout the moment a spell switches on, over the hero when they are the one fighting. The flag is kept either way. */
function announce(s: S, h: Hero | undefined, on: boolean, was: boolean, text: string): void {
  if (!on || was || !h || h !== activeHero(s)) return;
  floater(s, text, h.x, h.y - 24, 'yellow', true, 50);
  addFx(s, 'ring', h.x, h.y - 6, h.dir, 0, 22, 36, 36);
}

/** Once a tick: King Steve's and Final girl's callouts. */
export function tickTalents9(s: S): void {
  const steve = s.heroes.find((h) => h.id === 'steve');
  const nancy = s.heroes.find((h) => h.id === 'nancy');
  const king = !!steve && kingUp(steve), girl = !!nancy && girlUp(s, nancy);
  announce(s, steve, king, s.t6.king, 'KING STEVE');
  announce(s, nancy, girl, s.t6.girl, 'FINAL GIRL');
  s.t6.king = king;
  s.t6.girl = girl;
}

/** The HUD's word on a hero's once-a-stage talent (Oath, Cerebro, Extra life): 'ready' or 'spent', undefined for anyone without one. */
export function onceOf(s: S, h: Hero): 'ready' | 'spent' | undefined {
  const spent = h.id === 'mike' ? s.t6.oath : h.id === 'dustin' ? s.t6.cerebro : h.id === 'max' ? s.t6.extra : undefined;
  if (spent === undefined || !hasTalent(h.id, h.level, LV9)) return undefined;
  return spent ? 'spent' : 'ready';
}
