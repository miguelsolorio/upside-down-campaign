// Eleven's Sensory tank (Lv 6) in the sim, and the bot's use of the Lv 6 talents (combat/bot_talents.ts): Mike's screen for Rally,
// the holds for Will's heal, Nancy's Molotov and Eleven's Sensory tank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, PartyHud, SimEvent, SimInput, SimSpawn, SimView } from '../src/core/types.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { HOLD_FRAMES } from '../src/heroes/hold.ts';
import { coldSpot } from '../src/heroes/cold.ts';
import { createCaster } from '../src/combat/bot_talents.ts';
import type { CastFoe } from '../src/combat/bot_talents.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { idle, inp, makeWhite, ofType, rat, run, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
const down = inp({ specialPressed: true, specialHeld: true });
const held = inp({ specialHeld: true });
function hold(sim: { step(i: SimInput): SimEvent[] }, n: number): SimEvent[] {
  const out = [...sim.step(down)];
  for (let i = 1; i < n; i++) out.push(...sim.step(held));
  return out;
}

// ------------------------------------------------------------------ Eleven: Sensory tank

function senseRig(level: number, extra: SimSpawn[] = []) {
  const rig = makeWhite({ party: [{ id: 'eleven', level }, { id: 'mike' }], start: { x: tc(4), y: tf(8) }, spawns: [rat('h', 13, 8, 'g', { hidden: true }), ...extra] });
  const e = rig.s.enemies[0] as Enemy;
  e.stat.stun = 99999;
  return { ...rig, e };
}
const shows = (sim: { view(): SimView }): boolean => sim.view().actors.find((a) => a.id === 'rat')?.hidden === false;

test('Sensory tank: from Lv 6 the hold shows a hidden foe 144 px off, and it takes Cold spot\'s 15% more', () => {
  const { sim, s, e } = senseRig(6);
  assert.equal(shows(sim), false, 'hidden before');
  const mp = hero(s, 0).mp;
  hold(sim, HOLD_FRAMES);
  assert.ok(Math.abs(hero(s, 0).mp - (mp - HERO_DEFS.eleven.special.x.senseMp)) < 0.5);
  assert.ok(s.t6.sense > HERO_DEFS.eleven.special.x.sense - 5);
  assert.equal(shows(sim), true, 'shown');
  assert.equal(coldSpot(s, e), true);
  sim.step(inp());
  run(sim, HERO_DEFS.eleven.special.x.sense);
  assert.equal(s.t6.sense, 0);
  assert.equal(shows(sim), false, 'hidden again after 8 s');
});

test('Sensory tank: a hidden path 104 px off opens, which a plain sense needs 40 px for', () => {
  const path: SimSpawn = { kind: 'prop', id: 'hidden1', prop: 'hidden', tx: 11, ty: 7, w: 16, h: 32, hitBy: 'sense' };
  const plain = senseRig(5, [path]);
  const before = run(plain.sim, 60);
  assert.equal(ofType(before, 'propCleared').length, 0, 'out of reach without it');
  const { sim } = senseRig(6, [path]);
  const ev = [...hold(sim, HOLD_FRAMES), ...run(sim, 5)];
  assert.ok(ofType(ev, 'propCleared').some((p) => p.propId === 'hidden1'));
});

test('Sensory tank: it ends when she tags out, and below Lv 6 a press is the Mind Blast at once', () => {
  const { sim, s } = senseRig(6);
  hold(sim, HOLD_FRAMES);
  sim.step(inp());
  run(sim, 30);
  sim.step(inp({ swapTo: 1 }));
  run(sim, 2);
  assert.equal(s.t6.sense, 0);
  const low = senseRig(5);
  const mp = hero(low.s, 0).mp;
  low.sim.step(down);
  assert.ok(Math.abs(hero(low.s, 0).mp - (mp - HERO_DEFS.eleven.special.mp)) < 0.5);
  assert.equal(low.s.t6.sense, 0);
});

// ------------------------------------------------------------------ the bot

const hud = (id: HeroId, level: number, over: Partial<PartyHud> = {}): PartyHud => ({
  id, name: id, level, hp: 50, hpMax: 50, mp: 40, mpMax: 40, mpCost: HERO_DEFS[id].special.mp, xp: 0, xpNext: 1, ko: false, active: true, ...over,
});
const view = (party: PartyHud[]): SimView => ({ hud: { party } }) as unknown as SimView;
const foe = (x: number, y: number, d: number): CastFoe => ({ x, y, d, kind: 'rat', burning: false });
const scene = (foes: CastFoe[], over = {}) => ({ near: foes[0] as CastFoe, foes, miss: 0, shielded: false, dart: false, ward: false, ...over });

test('bot: Mike puts up the screen for Rally from Lv 6 with two foes close or a dart coming, and never below', () => {
  const two = [foe(20, 0, 20), foe(30, 0, 30)];
  const cast = (level: number, foes: CastFoe[], over = {}): boolean => createCaster().cast(hud('mike', level), scene(foes, over), idle());
  assert.equal(cast(6, two), true);
  assert.equal(cast(5, two), false);
  assert.equal(cast(6, [foe(20, 0, 20)]), false, 'one foe is not worth it');
  assert.equal(cast(6, [foe(20, 0, 20)], { dart: true }), true);
});

test('bot: Nancy holds for the Molotov on two foes together 30 to 64 px out, and lets go after the ring fills', () => {
  const c = createCaster();
  const me = hud('nancy', 6);
  const out = idle();
  assert.equal(c.cast(me, scene([foe(50, 0, 50), foe(55, 10, 56)]), out), true);
  assert.equal(out.specialPressed && out.specialHeld, true);
  c.keep(view([me]), me, out, false);
  let frames = 1;
  for (let i = 0; i < 40; i++) {
    const o = idle();
    c.keep(view([me]), me, o, false);
    if (!o.specialHeld) break;
    frames++;
  }
  assert.ok(frames >= HOLD_FRAMES && frames <= HOLD_FRAMES + 3, `held ${frames} frames`);
  const lone = idle();
  assert.equal(createCaster().cast(me, scene([foe(20, 0, 20)]), lone), true);
  assert.equal(lone.specialHeld, false, 'one foe up close gets a tap of the Shotgun, not the Molotov');
  assert.equal(createCaster().cast(hud('nancy', 5), scene([foe(50, 0, 50), foe(55, 10, 56)]), idle()), false);
});

test('bot: Will holds for the heal with the party under half its HP, and not again for 10 s', () => {
  const c = createCaster();
  const me = hud('will', 6, { hp: 10 });
  const party = [me, hud('mike', 6, { hp: 20, active: false })];
  const out = idle();
  c.keep(view(party), me, out, false);
  assert.equal(out.specialHeld, true, 'it starts the hold');
  for (let i = 0; i < 40; i++) c.keep(view(party), me, idle(), false);
  const again = idle();
  c.keep(view(party), me, again, false);
  assert.equal(again.specialPressed, false, 'the heal is cooling down');
  const fine = idle();
  createCaster().keep(view([hud('will', 6), hud('mike', 6, { active: false })]), hud('will', 6), fine, false);
  assert.equal(fine.specialHeld, false, 'a healthy party needs no heal');
});

test('bot: Eleven holds Sensory tank between fights, with MP to spare for a Mind Blast', () => {
  const me = hud('eleven', 6);
  const calm = idle();
  createCaster().keep(view([me]), me, calm, true);
  assert.equal(calm.specialHeld, true);
  const fighting = idle();
  createCaster().keep(view([me]), me, fighting, false);
  assert.equal(fighting.specialHeld, false);
  const dry = idle();
  createCaster().keep(view([hud('eleven', 6, { mp: 10 })]), hud('eleven', 6, { mp: 10 }), dry, true);
  assert.equal(dry.specialHeld, false);
});
