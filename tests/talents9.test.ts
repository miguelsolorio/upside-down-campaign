// The Lv 9 talents (docs/game-design.md, "Heroes"): each unlocks at Lv 9 and not at Lv 8 and does what it says. Here are the data and
// the callout, Overload, Volley, Hive link, King Steve, Final girl, Dry wit and the sheet. Oath, Extra life, Cerebro (the ones with a
// once-a-stage flag that a stage and a retry start unspent), the defense and the bot are in tests/talents9-lives.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { HERO_DEFS, HERO_IDS } from '../src/heroes/index.ts';
import { LV9, TALENTS, TALENT_TEXT_MAX, hasTalent, talentGainedAt, xpToNext } from '../src/progression/index.ts';
import { heroSheet } from '../src/heroes/charsheet.ts';
import { atk9, witBonus } from '../src/heroes/talents9.ts';
import { heroAtk, hitEnemy } from '../src/combat/damage.ts';
import { confuse } from '../src/combat/confuse.ts';
import type { S } from '../src/combat/state.ts';
import { hasEmDash } from '../src/core/text.ts';
import { arena, idle, inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { enemy, fell, floaters, hero } from './talents9-helpers.ts';

const NAMES: Record<HeroId, string> = {
  eleven: 'Overload', mike: 'Oath', dustin: 'Cerebro', lucas: 'Volley', will: 'Hive link', steve: 'King Steve', nancy: 'Final girl',
  robin: 'Dry wit', max: 'Extra life', hopper: 'Berserk', eddie: 'Encore',
};

// ------------------------------------------------------------------ the data

test('each hero has a Lv 9 talent, unlocked at Lv 9 and not at Lv 8, with a short line and no em dash', () => {
  assert.equal(LV9, 9);
  for (const id of HERO_IDS) {
    const t = TALENTS[id][2];
    assert.equal(t?.name, NAMES[id], id);
    assert.equal(t?.level, 9);
    assert.equal(talentGainedAt(id, 9), t);
    assert.equal(hasTalent(id, 8, LV9), false, `${id} not at 8`);
    assert.equal(hasTalent(id, 9, LV9), true, `${id} at 9`);
    assert.equal(hasTalent(id, 12, LV9), true);
    assert.ok(t && t.text.length <= TALENT_TEXT_MAX && !hasEmDash(t.text) && !hasEmDash(t.name), `${id}: "${t?.text}"`);
    const row = (level: number) => heroSheet(id, level).moves.filter((m) => m.kind === 'talent')[2];
    assert.equal(row(8)?.locked, true, `${id} locked on the sheet at 8`);
    assert.equal(row(9)?.locked, false, `${id} on at 9`);
    assert.equal(row(9)?.note, t?.text);
  }
});

test('reaching Lv 9 brings the Lv 9 talent\'s NEW TALENT callout, once, for every hero', () => {
  for (const id of HERO_IDS) {
    const { sim } = makeWhite({ party: [{ id, level: 8 }, { id: id === 'mike' ? 'dustin' : 'mike', level: 8 }] });
    sim.dev.giveXp(xpToNext(8));
    const ups = ofType(sim.step(inp()), 'levelUp').map((e) => e.info).filter((u) => u.hero === id);
    assert.deepEqual(ups.map((u) => u.to), [9], id);
    assert.deepEqual(ups[0]?.talent, { name: NAMES[id], text: TALENTS[id][2]?.text }, id);
    sim.dev.giveXp(xpToNext(9));
    const more = ofType(sim.step(inp()), 'levelUp').map((e) => e.info).filter((u) => u.hero === id);
    assert.equal(more[0]?.talent, null, `${id} gains nothing at 10`);
  }
});

// ------------------------------------------------------------------ Eleven: Overload

function overRig(level: number) {
  const rig = makeWhite({ party: [{ id: 'eleven', level }], spawns: [rat('line', 9, 8), rat('side', 9, 9)] });
  for (const e of rig.s.enemies) { e.hp = e.hpMax = 9999; }
  return rig;
}

test('Overload: from Lv 9 the Mind Blast is wider and stuns every foe it crosses', () => {
  const { sim, s } = overRig(9);
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.eleven.special.at + 1);
  const wide = sim.view().fx.find((f) => f.kind === 'beam');
  assert.equal(wide?.h, HERO_DEFS.eleven.special.x.overWidth * 2, 'drawn wider');
  assert.ok(enemy(s, 0).hp < 9999, 'the foe on the line is hit');
  assert.ok(enemy(s, 1).hp < 9999, 'and the one 16 px off the line, which the plain beam misses');
  assert.ok(enemy(s, 0).stat.stun > 30 && enemy(s, 1).stat.stun > 30, 'both stunned');
  const low = overRig(8);
  press(low.sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.eleven.special.at + 1);
  assert.equal(low.sim.view().fx.find((f) => f.kind === 'beam')?.h, HERO_DEFS.eleven.special.x.width * 2);
  assert.ok(enemy(low.s, 0).hp < 9999, 'the foe on the line is hit at Lv 8 too');
  assert.equal(enemy(low.s, 1).hp, 9999, 'the one off the line is not');
  assert.equal(enemy(low.s, 0).stat.stun, 0, 'and nothing is stunned');
});

// ------------------------------------------------------------------ Lucas: Volley

function volleyShots(level: number) {
  const { sim, s } = makeWhite({ party: [{ id: 'lucas', level }] });
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.lucas.special.at + 1);
  return { s, shots: s.projs.filter((p) => p.kind === 'rock' && p.mine) };
}

test('Volley: from Lv 9 Triple shot fires five rocks in a 14 degree fan, each as strong as before, and still hides him', () => {
  const { s, shots } = volleyShots(9);
  assert.equal(shots.length, 5);
  const degrees = shots.map((p) => Math.round((Math.atan2(p.vy, p.vx) * 180) / Math.PI)).sort((a, b) => a - b);
  assert.deepEqual(degrees, [-28, -14, 0, 14, 28]);
  assert.ok(shots.every((p) => p.power === HERO_DEFS.lucas.special.power));
  assert.ok(s.t6.camo > 0, 'Camo rides on the same cast');
  const low = volleyShots(8);
  assert.equal(low.shots.length, 3);
  assert.ok(low.shots.every((p) => p.power === HERO_DEFS.lucas.special.power));
});

// ------------------------------------------------------------------ Will: Hive link

const hidden = (id: string, tx: number): SimSpawn => ({ kind: 'prop', id, prop: 'hidden', tx, ty: 7, w: 16, h: 32, hitBy: 'sense' });
function hiveRig(willLevel: number) {
  return makeWhite({
    grid: arena(40, 16), party: [{ id: 'mike' }, { id: 'will', level: willLevel }], start: { x: tc(4), y: tf(8) },
    spawns: [hidden('near', 16), hidden('far', 32)],
  });
}
const cleared = (ev: SimEvent[], id: string): boolean => ofType(ev, 'propCleared').some((e) => e.propId === id);

test('Hive link: a charged swap to a Lv 9 Will shows a hidden path 192 px off, and one 440 px off stays hidden', () => {
  const { sim, s } = hiveRig(9);
  assert.equal(cleared(run(sim, 30), 'near'), false, 'Mike sees nothing');
  const ev = [...sim.step(inp({ swapTo: 1 })), ...run(sim, 10)];
  assert.ok(s.t6.hive >= HERO_DEFS.will.special.x.hive - 11, 'the link is up');
  assert.ok(cleared(ev, 'near'), 'the near path showed');
  assert.ok(sfxIds(ev).includes('reveal'));
  assert.equal(cleared(run(sim, 60), 'far'), false, 'the far one is out of reach');
  assert.equal(floaters(sim, 'HIVE'), 0, 'its callout has passed');
});

test('Hive link: a Lv 8 Will, a quick swap, and a hero who tags out all get nothing; it ends after 8 s', () => {
  const low = hiveRig(8);
  low.sim.step(inp({ swapTo: 1 }));
  assert.equal(low.s.t6.hive, 0);
  assert.equal(cleared(run(low.sim, 60), 'near'), false);
  const quick = hiveRig(9);
  quick.s.swapCd = 100;
  quick.sim.step(inp({ swapTo: 1 }));
  assert.equal(quick.s.t6.hive, 0, 'inside the swap cooldown');
  const { sim, s } = hiveRig(9);
  sim.step(inp({ swapTo: 1 }));
  run(sim, 40);
  sim.step(inp({ swapTo: 0 }));
  run(sim, 2);
  assert.equal(s.t6.hive, 0, 'tagging out ends it');
  const full = hiveRig(9);
  full.sim.step(inp({ swapTo: 1 }));
  run(full.sim, HERO_DEFS.will.special.x.hive + 2);
  assert.equal(full.s.t6.hive, 0, 'and so does the clock');
});

// ------------------------------------------------------------------ Steve: King Steve, Nancy: Final girl

test('King Steve: under 30% HP a Lv 9 Steve hits 30% harder, and a Lv 8 Steve does not', () => {
  const atk = (level: number, frac: number): number => {
    const { s } = makeWhite({ party: [{ id: 'steve', level }] });
    const h = hero(s, 0);
    h.hp = h.st.hp * frac;
    return heroAtk(s, h) / h.st.atk;
  };
  assert.equal(atk(9, 1), 1);
  assert.equal(atk(9, 0.3), 1, 'exactly 30% is not under it');
  assert.ok(Math.abs(atk(9, 0.29) - 1.3) < 1e-9);
  assert.ok(Math.abs(atk(9, 0.05) - 1.3) < 1e-9);
  assert.equal(atk(8, 0.05), 1);
});

test('King Steve: it shows once when it switches on, and again only after he has been healed past it', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 9 }] });
  const h = hero(s, 0);
  let shown = 0, was = false;
  const watch = (n: number): void => {
    for (let i = 0; i < n; i++) {
      sim.step(idle());
      const now = floaters(sim, 'KING STEVE') > 0;
      if (now && !was) shown++;
      was = now;
    }
  };
  watch(5);
  assert.equal(shown, 0);
  h.hp = h.st.hp * 0.2;
  watch(150);
  assert.equal(shown, 1, 'once, not every frame');
  h.hp = h.st.hp * 0.9;
  watch(5);
  h.hp = h.st.hp * 0.2;
  watch(5);
  assert.equal(shown, 2);
});

test('Final girl: with two allies down a Lv 9 Nancy hits 40% harder; one down, Nancy down or Lv 8 changes nothing', () => {
  const rig = (level: number) => makeWhite({ party: [{ id: 'nancy', level }, { id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }] });
  const ratio = (s: S): number => atk9(s, hero(s, 0));
  const { sim, s } = rig(9);
  assert.equal(ratio(s), 1);
  fell(sim, hero(s, 1));
  assert.equal(ratio(s), 1, 'one ally down');
  assert.equal(floaters(sim, 'FINAL GIRL'), 0);
  fell(sim, hero(s, 2));
  assert.ok(Math.abs(ratio(s) - 1.4) < 1e-9, 'two down');
  assert.ok(Math.abs(heroAtk(s, hero(s, 0)) / hero(s, 0).st.atk - 1.4) < 1e-9);
  run(sim, 10);
  assert.equal(floaters(sim, 'FINAL GIRL'), 1, 'and she says so, once the hit-stop of the fall is over');
  fell(sim, hero(s, 3));
  assert.ok(Math.abs(ratio(s) - 1.4) < 1e-9, 'three down');
  hero(s, 0).ko = true;
  assert.equal(ratio(s), 1, 'not when she is down herself');
  const low = rig(8);
  fell(low.sim, hero(low.s, 1)); fell(low.sim, hero(low.s, 2));
  assert.equal(ratio(low.s), 1, 'a Lv 8 Nancy');
});

// ------------------------------------------------------------------ Robin: Dry wit

test('Dry wit: a confused foe takes 25% more from the party while a Lv 9 Robin is up in it', () => {
  const dealt = (robin: { level: number; ko?: boolean } | null, confused: boolean): number => {
    const party = robin ? [{ id: 'mike' as const }, { id: 'robin' as const, level: robin.level }] : [{ id: 'mike' as const }];
    const { s } = makeWhite({ party, spawns: [rat('a', 6, 8)] });
    const e = enemy(s, 0);
    e.hp = e.hpMax = 9999;
    if (robin?.ko) hero(s, 1).ko = true;
    if (confused) confuse(s, e, 120);
    return hitEnemy(s, hero(s, 0), e, { power: 10, noCrit: true });
  };
  const base = dealt(null, true);
  assert.equal(dealt({ level: 9 }, true), Math.round(base * 1.25), 'Robin on the bench at Lv 9');
  assert.equal(dealt({ level: 8 }, true), base, 'Lv 8');
  assert.equal(dealt({ level: 9, ko: true }, true), base, 'Robin down');
  assert.equal(dealt({ level: 9 }, false), dealt(null, false), 'a foe that is not confused');
  const { s } = makeWhite({ party: [{ id: 'robin', level: 9 }], spawns: [rat('a', 6, 8)] });
  assert.equal(witBonus(s, enemy(s, 0)), 1);
});

// ------------------------------------------------------------------ the sheet

test('the sheet says what Volley and Overload do', () => {
  const lucas = heroSheet('lucas', 9).moves.find((m) => m.kind === 'special');
  assert.equal(lucas?.hits, 5);
  assert.equal(lucas?.note, '5 rocks in a fan');
  assert.equal(heroSheet('lucas', 8).moves.find((m) => m.kind === 'special')?.hits, 3);
  assert.match(heroSheet('eleven', 9).moves.find((m) => m.kind === 'special')?.note ?? '', /stuns/);
  assert.doesNotMatch(heroSheet('eleven', 8).moves.find((m) => m.kind === 'special')?.note ?? '', /stuns/);
});
