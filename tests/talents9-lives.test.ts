// The Lv 9 talents that catch a fall or start a stage unspent (docs/game-design.md, "Heroes"): Max's Extra life, Mike's Oath and
// Dustin's Cerebro, which a stage and a retry hand back, then the defense they must not break and the bot's use of Cerebro. The rest
// are in tests/talents9.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { HOLD_FRAMES } from '../src/heroes/hold.ts';
import { hurtHero } from '../src/combat/damage.ts';
import { createBot } from '../src/combat/bot.ts';
import { createCaster } from '../src/combat/bot_talents.ts';
import { arena, botFight, idle, inp, makeWhite, ofType, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { defenseRig } from './alpha-helpers.ts';
import { down, enemy, fell, floaters, hero, hold } from './talents9-helpers.ts';

// ------------------------------------------------------------------ Max: Extra life

test('Extra life: a KO leaves a Lv 9 Max at 1 HP with 2 s of invulnerability, once a stage', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'max', level: 9 }, { id: 'mike' }] });
  const m = hero(s, 0);
  const ev = fell(sim, m);
  assert.equal(m.ko, false, 'still up');
  assert.equal(m.hp, 1);
  assert.equal(s.active, 0, 'and still in play');
  assert.equal(ofType(ev, 'heroKO').length, 0, 'no KO was reported');
  assert.equal(s.stats.kos, 0);
  assert.equal(s.bodies.length, 0);
  assert.ok(sfxIds(ev).includes('levelUp'));
  assert.equal(floaters(sim, '1UP'), 1);
  assert.equal(hurtHero(s, m, 0, 0, 1, 20), 0, 'nothing hurts her now');
  run(sim, 60);
  assert.equal(hurtHero(s, m, 0, 0, 1, 20), 0, 'a second in');
  run(sim, 62);
  assert.ok(hurtHero(s, m, 0, 0, 1, 20) > 0, 'and after 2 s it does');
  const again = fell(sim, m);
  assert.equal(m.ko, true, 'the second fall is a real KO');
  assert.equal(ofType(again, 'heroKO').length, 1);
  assert.equal(s.active, 1);
});

test('Extra life: not at Lv 8, and when she is the last one standing the run goes on', () => {
  const low = makeWhite({ party: [{ id: 'max', level: 8 }, { id: 'mike' }] });
  assert.equal(ofType(fell(low.sim, hero(low.s, 0)), 'heroKO').length, 1);
  const { sim, s } = makeWhite({ party: [{ id: 'max', level: 9 }] });
  assert.equal(ofType(fell(sim, hero(s, 0)), 'allDown').length, 0, 'saved');
  assert.equal(s.over, false);
  run(sim, 130);
  assert.equal(ofType(fell(sim, hero(s, 0)), 'allDown').length, 1, 'the second fall ends it');
});

test('Extra life: a hold on her lets go, and a curse is no different: any fall to 0 HP is caught', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'max', level: 9 }, { id: 'mike' }], spawns: [rat('a', 5, 8)] });
  s.hold = { by: enemy(s, 0), hero: hero(s, 0), t: 0 };
  fell(sim, hero(s, 0));
  assert.equal(s.hold, null);
  assert.equal(hero(s, 0).ko, false);
});

// ------------------------------------------------------------------ Mike: Oath

function oathRig(over: { mike?: number } = {}) {
  return makeWhite({ party: [{ id: 'dustin', level: 9 }, { id: 'mike', level: over.mike ?? 9 }, { id: 'lucas', level: 9 }] });
}

test('Oath: the first ally to fall, with Mike standing, gets up 1.5 s later at half HP beside the leader', () => {
  const { sim, s } = oathRig();
  const d = hero(s, 0), m = hero(s, 1);
  fell(sim, d);
  assert.equal(d.ko, true, 'down at first');
  assert.equal(s.active, 1, 'Mike took over');
  assert.equal(floaters(sim, 'OATH'), 1);
  assert.equal(sim.view().hud.party[1]?.once, 'spent');
  run(sim, 80);
  assert.equal(d.ko, true, 'still down a beat later');
  run(sim, 15);
  assert.equal(d.ko, false, 'up after 1.5 s');
  assert.ok(Math.abs(d.hp - Math.ceil(d.st.hp * 0.5)) < 0.5, `${d.hp} of ${d.st.hp}`);
  assert.ok(Math.hypot(d.x - m.x, d.y - m.y) < 8, 'beside the leader');
  assert.equal(s.bodies.length, 0);
  assert.equal(s.stats.kos, 1, 'the fall still counts');
  assert.equal(floaters(sim, 'UP'), 1);
  assert.equal(s.over, false);
  // One a stage: the next ally to fall stays down.
  const l = hero(s, 2);
  fell(sim, l);
  run(sim, 200);
  assert.equal(l.ko, true);
  assert.equal(sim.view().hud.party[1]?.once, 'spent');
});

test('Oath: not at Lv 8, not for a Mike who is down, and a Mike who falls in the beat breaks it without spending it', () => {
  const low = oathRig({ mike: 8 });
  fell(low.sim, hero(low.s, 0));
  run(low.sim, 200);
  assert.equal(hero(low.s, 0).ko, true, 'Lv 8');
  const { sim, s } = oathRig();
  fell(sim, hero(s, 1));
  fell(sim, hero(s, 0));
  run(sim, 200);
  assert.equal(hero(s, 0).ko, true, 'Mike was down first');
  assert.equal(s.t6.oath, false);
  const broke = oathRig();
  fell(broke.sim, hero(broke.s, 0));
  run(broke.sim, 30);
  fell(broke.sim, hero(broke.s, 1));
  run(broke.sim, 200);
  assert.equal(hero(broke.s, 0).ko, true, 'nobody was raised');
  assert.equal(broke.s.t6.oath, false, 'and the oath is not spent');
});

test('Oath: a wipe and a retry start it unspent, and the sim a new stage builds does too', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin', level: 9 }, { id: 'mike', level: 9 }] });
  fell(sim, hero(s, 0));
  run(sim, 100);
  assert.equal(hero(s, 0).ko, false);
  assert.equal(s.t6.oath, true);
  hero(s, 0).hp = -1; hero(s, 1).hp = -1;
  assert.equal(ofType(sim.step(idle()), 'allDown').length, 1, 'wiped');
  sim.healParty(0.5);
  assert.equal(s.t6.oath, false, 'a retry that gets up starts it afresh');
  assert.equal(hero(s, 0).ko, false);
  fell(sim, hero(s, 0));
  run(sim, 100);
  assert.equal(hero(s, 0).ko, false, 'and it raises again');
  assert.equal(oathRig().s.t6.oath, false, 'a new stage');
});

// ------------------------------------------------------------------ Dustin: Cerebro

function suzieRig(level = 9) {
  const rig = makeWhite({ party: [{ id: 'dustin', level }, { id: 'mike', level: 9 }, { id: 'lucas', level: 9 }] });
  for (const h of rig.s.heroes) h.mp = 0;
  return rig;
}

test('Cerebro: holding Special calls Suzie, who fills every living hero\'s MP by 30%, for no MP', () => {
  const { sim, s } = suzieRig();
  hero(s, 2).ko = true;
  hero(s, 2).hp = 0;
  const ev = hold(sim, HOLD_FRAMES);
  for (const i of [0, 1]) {
    const h = hero(s, i);
    assert.ok(h.mp >= h.st.mp * 0.3 && h.mp <= h.st.mp * 0.33, `${h.id} has ${h.mp} of ${h.st.mp}`);
  }
  assert.equal(hero(s, 2).mp, 0, 'a hero who is down gets none');
  assert.equal(s.t6.cerebro, true);
  assert.ok(sfxIds(ev).includes('decode'), 'the radio');
  assert.equal(floaters(sim, 'SUZIE'), 1);
  assert.ok(sim.view().fx.filter((f) => f.kind === 'ring').length >= 3, 'the waves');
  assert.equal(sim.view().hud.party[0]?.once, 'spent');
});

test('Cerebro: once a stage, and then Dustin\'s Special casts on the press again', () => {
  const { sim, s } = suzieRig();
  hold(sim, HOLD_FRAMES);
  sim.step(inp());
  run(sim, 60);
  const d = hero(s, 0);
  d.mp = d.st.mp;
  const others = [hero(s, 1).mp, hero(s, 2).mp];
  hold(sim, HOLD_FRAMES);
  assert.ok(Math.abs(hero(s, 1).mp - others[0]!) < 1 && Math.abs(hero(s, 2).mp - others[1]!) < 1, 'no second call');
  sim.step(inp());
  run(sim, 60);
  d.mp = d.st.mp;
  sim.step(down);
  assert.ok(d.mp <= d.st.mp - HERO_DEFS.dustin.special.mp + 0.5, 'the spray went on the press');
  assert.equal(sim.view().actors.find((a) => a.id === 'dustin')?.charge, undefined, 'and no ring');
});

test('Cerebro: not at Lv 8, where a press is the spray at once; a wipe and a retry give Suzie back', () => {
  const low = suzieRig(8);
  low.s.heroes[0]!.mp = low.s.heroes[0]!.st.mp;
  const mp = low.s.heroes[0]!.mp;
  low.sim.step(down);
  assert.ok(low.s.heroes[0]!.mp < mp - 7, 'the spray on the press');
  assert.equal(low.s.t6.cerebro, false);
  hold(low.sim, HOLD_FRAMES + 10);
  assert.equal(low.s.t6.cerebro, false);
  const { sim, s } = suzieRig();
  hold(sim, HOLD_FRAMES);
  assert.equal(s.t6.cerebro, true);
  for (const h of s.heroes) h.hp = -1;
  assert.equal(ofType(sim.step(idle()), 'allDown').length, 1);
  sim.healParty(0.5);
  assert.equal(s.t6.cerebro, false, 'Suzie is back');
  assert.equal(suzieRig().s.t6.cerebro, false, 'and in a new stage');
});

// ------------------------------------------------------------------ the defense

test('Extra life and Oath leave the defense alone: its clock runs on and the ward is not touched', () => {
  const r = defenseRig({ party: [{ id: 'max', level: 9 }, { id: 'dustin', level: 9 }, { id: 'mike', level: 9 }] });
  r.sim.defend();
  run(r.sim, 5);
  const ward0 = r.sim.view().hud.ward!;
  const events = [...fell(r.sim, hero(r.s, 0))];
  const after = r.sim.view().hud.ward!;
  assert.equal(hero(r.s, 0).ko, false, 'Max took the fall');
  assert.equal(after.left, ward0.left - 1, 'the clock ticked once');
  assert.equal(after.hp, ward0.hp);
  fell(r.sim, hero(r.s, 1));
  events.push(...run(r.sim, 100));
  assert.equal(hero(r.s, 1).ko, false, 'Mike raised Dustin');
  assert.equal(r.sim.view().hud.ward!.left, ward0.left - 102, 'and the clock never stopped');
  assert.equal(ofType(events, 'allDown').length + ofType(events, 'wardDown').length, 0);
  assert.equal(r.s.over, false);
});

// ------------------------------------------------------------------ the bot

const hud = (id: HeroId, level: number, over: Record<string, unknown> = {}) => ({
  id, name: id, level, hp: 50, hpMax: 50, mp: 40, mpMax: 40, mpCost: HERO_DEFS[id].special.mp, xp: 0, xpNext: 1, ko: false, active: true, ...over,
});
const view = (party: ReturnType<typeof hud>[]) => ({ hud: { party } }) as never;

test('bot: Dustin holds for Cerebro from Lv 9 when the party is low on MP, once, and lets go after the ring fills', () => {
  const dry = [hud('dustin', 9, { mp: 5, once: 'ready' }), hud('mike', 9, { mp: 5, active: false })];
  const c = createCaster();
  const out = idle();
  c.keep(view(dry), dry[0]!, out, false);
  assert.equal(out.specialPressed && out.specialHeld, true);
  let frames = 1;
  for (let i = 0; i < 40; i++) {
    const o = idle();
    c.keep(view(dry), dry[0]!, o, false);
    if (!o.specialHeld) break;
    frames++;
  }
  assert.ok(frames >= HOLD_FRAMES && frames <= HOLD_FRAMES + 3, `held ${frames} frames`);
  const none = (me: ReturnType<typeof hud>, party = dry): boolean => {
    const o = idle();
    createCaster().keep(view(party), me, o, false);
    return !o.specialHeld;
  };
  assert.equal(none(hud('dustin', 9, { mp: 5, once: 'spent' })), true, 'Suzie has been called');
  assert.equal(none(hud('dustin', 8, { mp: 5 })), true, 'Lv 8');
  const full = [hud('dustin', 9, { once: 'ready' }), hud('mike', 9, { active: false })];
  assert.equal(none(full[0]!, full), true, 'a party with MP to spare');
});

test('bot: a Lv 9 Dustin whose party is dry calls Suzie by himself', () => {
  const { sim, s } = suzieRig();
  const bot = createBot({ grid: arena(24, 16), waypoints: [{ x: tc(20), y: tf(8) }] });
  for (let i = 0; i < 90; i++) sim.step(bot.next(sim));
  assert.equal(s.t6.cerebro, true);
  assert.ok(hero(s, 1).mp > 0);
});

test('bot: parties of Lv 9 heroes play a fight to the end with every Lv 9 talent on', () => {
  for (const ids of [['mike', 'dustin', 'lucas', 'eleven'], ['will', 'max', 'steve', 'nancy'], ['robin', 'max', 'mike', 'will']] as const) {
    for (const seed of [1, 2]) {
      const r = botFight(seed, { party: ids.map((id) => ({ id, level: 9 })) });
      assert.equal(r.cleared, true, `${ids.join(' ')} seed ${seed}`);
    }
  }
});
