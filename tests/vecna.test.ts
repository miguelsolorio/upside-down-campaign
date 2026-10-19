// Vecna's three phases (docs/level-13.md, "Vecna"): the slow walk and the vine whip, Float's rise out of melee reach and its rocks, a broken orb
// pulling him down, Burn's quicker whip, the phase events, the boss bar, the boss rules and his death taking the orbs with him. The clock, the
// orbs and the per-spawn tuning are in tests/vecna-clock.test.ts, the bot in tests/vecna-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FxView, SimEvent } from '../src/core/types.ts';
import { confuse, isBoss } from '../src/combat/confuse.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { inp, makeWhite, ofType, sfxIds, tc, tf } from './sim-helpers.ts';
import type { VRig } from './vecna-helpers.ts';
import { VECNA, VX, at, atticSpawns, bodyView, breakOrb, hammer, place, setShare, steps, toFloat, until, vRig } from './vecna-helpers.ts';

const fx = (r: VRig, kind: FxView['kind']): FxView[] => r.sim.view().fx.filter((f) => f.kind === kind);
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const hits = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => h.onEnemy);

/** Vecna 22 px above the hero, who stands still at tile (10, 10): a whip's reach and a hero in it. */
function close(r: VRig): void {
  at(r, tc(10), tf(10));
  place(r, tc(10), tf(10) - 22);
}

// ------------------------------------------------------------------ Clock

test('Clock: he walks at the hero at 0.4 px a frame and stops 26 px short, facing him', () => {
  const r = vRig();
  const y0 = r.body.y;
  steps(r, 60);
  assert.ok(Math.abs(r.body.y - y0 - 60 * VECNA.speed) < 0.5, `moved ${r.body.y - y0}`);
  assert.equal(r.body.dir, 'down');
  steps(r, 400);
  assert.ok(Math.abs(r.hero.y - r.body.y - VX.hold) < 2, `stops ${r.hero.y - r.body.y} px short`);
  assert.equal(r.body.z, 0, 'on the floor');
  assert.equal(r.v.phase, 1);
  assert.equal(bodyView(r)?.pose, undefined, 'standing or walking: no pose');
});

test('Clock: the whip winds up 24 frames under the "!", the line locked, then lashes 10 frames and hurts a hero on the line once', () => {
  const r = vRig();
  close(r);
  r.v.whipCd = 0;
  const first = r.sim.step(inp());
  assert.equal(r.v.move, 'wind');
  assert.ok(sfxIds(first).includes('alert'));
  const v0 = bodyView(r);
  assert.equal(v0?.alert, true, 'the red "!"');
  assert.equal(v0?.pose, 'whip');
  const aim = v0?.aim;
  assert.ok(aim && Math.abs(aim.x - (v0?.x ?? 0)) < 0.5, 'the line points down, at the hero');
  const len = (aim?.y ?? 0) - (v0?.y ?? 0);
  assert.ok(len > 20 && len <= VX.whipLen, `${len} px long`);
  assert.equal(fx(r, 'whip').length, 0, 'warned only: the lash is not out yet');
  // The hero steps off the line sideways during the wind-up: the line stays where it was locked.
  const ev: SimEvent[] = [];
  for (let f = 0; f < VECNA.windup - 1; f++) ev.push(...r.sim.step(inp()));
  assert.equal(r.v.move, 'wind', 'still winding up');
  assert.equal(hurt(ev).length, 0, 'nothing lands during the wind-up');
  assert.deepEqual(bodyView(r)?.aim, aim, 'and the line stays where it was locked');
  ev.push(...r.sim.step(inp()));
  assert.equal(r.v.move, 'lash');
  const lash = fx(r, 'whip')[0] as FxView;
  assert.ok(lash, 'the lash is out');
  assert.equal(lash.h, VX.whipHalf * 2, 'with a width');
  assert.equal(lash.w, len);
  assert.equal(lash.life, VX.lashT);
  assert.ok(Math.abs(lash.angle - Math.PI / 2) < 0.01);
  assert.equal(lash.t, 0);
  assert.ok(sfxIds(ev).includes('whip'));
  // The hit stops the clock for a few frames, so the lash is out a little longer than ten.
  ev.push(...until(r, () => r.v.move !== 'lash', 40).ev);
  const taken = hurt(ev);
  assert.equal(taken.length, 1, 'one hit, however long the lash is out');
  assert.equal(r.v.move, 'walk');
  assert.equal(fx(r, 'whip').length, 0);
  assert.equal(bodyView(r)?.aim, undefined, 'and the line is gone');
});

test('Clock: a hero who stepped out of the line is not hurt', () => {
  const r = vRig();
  close(r);
  r.v.whipCd = 0;
  r.sim.step(inp());
  // 30 px sideways in the wind-up.
  at(r, tc(10) + 30, tf(10));
  const ev = steps(r, VECNA.windup + VX.lashT + 5);
  assert.equal(hurt(ev).length, 0);
});

test('Clock: the whip comes about every 120 frames while the hero is in reach, and not out of reach', () => {
  const r = vRig();
  r.s.god = true;
  const starts: number[] = [];
  let was = r.v.move;
  r.v.whipCd = 0;
  for (let f = 0; f < 1000; f++) {
    close(r);
    r.sim.step(inp());
    if (r.v.move === 'wind' && was !== 'wind') starts.push(f);
    was = r.v.move;
  }
  assert.ok(starts.length >= 7, `${starts.length} whips`);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] as number) - (starts[i - 1] as number);
    assert.ok(gap >= 108 && gap <= 132, `a gap of ${gap}`);
  }
  // Out of reach (the hero 90 px away behind a hold of 26) he walks instead.
  const far = vRig();
  at(far, tc(10), tf(12));
  place(far, tc(10), tf(3));
  far.v.whipCd = 0;
  steps(far, 30);
  assert.equal(far.v.move, 'walk');
});

test('Clock: the whip hurts for his power times his ATK and pushes the hero back', () => {
  const r = vRig({}, { tough: true });
  close(r);
  r.v.whipCd = 0;
  const ev = steps(r, VECNA.windup + 6);
  const dmg = hurt(ev)[0]?.dmg ?? 0;
  const def = r.hero.st.def;
  const lo = Math.round(VECNA.power * VECNA.atk * 0.9 - def * 0.5), hi = Math.round(VECNA.power * VECNA.atk * 1.1 - def * 0.5);
  assert.ok(dmg >= lo && dmg <= hi, `${dmg} in ${lo} to ${hi}`);
  assert.ok(r.hero.vy > 0.5, 'shoved along the lash');
});

// ------------------------------------------------------------------ Float

test('Float: at 60% he rises to z 24 in pose float, and the phase event comes once', () => {
  const r = vRig();
  setShare(r, 0.61);
  assert.equal(steps(r, 2).filter((e) => e.t === 'phase').length, 0, 'not yet at 61%');
  setShare(r, 0.6);
  const ev = steps(r, 1);
  assert.deepEqual(ofType(ev, 'phase'), [{ t: 'phase', spawnId: 'vecna', phase: 2 }]);
  assert.ok(sfxIds(ev).includes('vecna'));
  assert.equal(r.v.phase, 2);
  const later = steps(r, VX.riseT + 40);
  assert.equal(ofType(later, 'phase').length, 0, 'once');
  assert.equal(r.body.z, VX.floatZ);
  assert.equal(bodyView(r)?.z, VX.floatZ);
  assert.equal(bodyView(r)?.pose, 'float');
});

test('Float: a swing or a blast does nothing to him, and says why; a shot, a beam and the burst still land', () => {
  const r = vRig();
  toFloat(r);
  const before = r.body.hp;
  assert.equal(hammer(r, r.body), 0, 'a swing');
  assert.equal(r.body.hp, before);
  assert.ok(r.s.floaters.some((f) => f.text === 'TOO HIGH'));
  const n = r.s.floaters.length;
  assert.equal(hammer(r, r.body), 0);
  assert.equal(r.s.floaters.length, n, 'and it does not say it on every swing');
  assert.ok(hammer(r, r.body, 6, true) > 0, 'a shot or the burst (air)');
  const hp = r.body.hp;
  assert.ok(hitEnemy(r.s, r.hero, r.body, { power: 6, noCrit: true, beam: true }) > 0, 'a beam');
  assert.ok(r.body.hp < hp);
  // Floating, he is no more able to be moved or stunned than on the floor.
  hitEnemy(r.s, r.hero, r.body, { power: 6, noCrit: true, air: true, kb: 6, stun: 60 });
  assert.equal(r.body.vx, 0);
  assert.equal(r.body.stat.stun, 0);
});

test('Float: Mike\'s swing finds nothing, and Lucas\'s shot lands', () => {
  const melee = vRig({ party: [{ id: 'mike', level: 8 }, { id: 'lucas', level: 8 }] });
  setShare(melee, 0.61);
  steps(melee, 1);
  place(melee, tc(10) + 22, tf(10));
  at(melee, tc(10), tf(10));
  melee.hero.dir = 'right'; melee.hero.aim = 0;
  const hp0 = melee.body.hp;
  steps(melee, 30, inp({ attackPressed: true, attackHeld: true }));
  assert.ok(melee.body.hp < hp0, 'on the floor Mike\'s swing lands');
  toFloat(melee);
  const hp1 = melee.body.hp;
  steps(melee, 60, inp({ attackPressed: true, attackHeld: true }));
  assert.equal(melee.body.hp, hp1, 'in Float it does not');
  melee.sim.step(inp({ swapTo: 1 }));
  steps(melee, 20);
  const lucas = melee.s.heroes[melee.s.active];
  assert.equal(lucas?.id, 'lucas');
  place(melee, tc(10) + 80, tf(10));
  at(melee, tc(10), tf(10));
  lucas!.dir = 'right'; lucas!.aim = 0;
  const hp2 = melee.body.hp;
  steps(melee, 60, inp({ attackPressed: true, attackHeld: true }));
  assert.ok(melee.body.hp < hp2, 'but Lucas\'s shot does');
});

test('Float: every 150 frames he throws a rock at the hero: a 24 frame wind-up, a shadow mark, 40 frames in the air, a 20 px splash for 0.8', () => {
  const r = vRig();
  toFloat(r);
  at(r, tc(10), tf(10));
  r.v.throwCd = 0;
  const first = r.sim.step(inp());
  assert.equal(r.v.move, 'throw');
  assert.ok(sfxIds(first).includes('alert'));
  assert.equal(bodyView(r)?.pose, 'throw');
  assert.equal(bodyView(r)?.alert, true);
  const ev: SimEvent[] = [];
  for (let f = 0; f < VECNA.windup; f++) ev.push(...r.sim.step(inp()));
  assert.ok(sfxIds(ev).includes('debris'), 'it leaves his hand');
  const mark = fx(r, 'mark')[0] as FxView;
  assert.ok(mark, 'the shadow is down');
  assert.equal(mark.x, r.hero.x);
  assert.equal(mark.y, r.hero.y);
  assert.equal(mark.h, VX.throwSplash, 'a radius of 20');
  assert.equal(mark.w, VX.throwSplash * 2);
  const rock = fx(r, 'debris')[0] as FxView;
  assert.ok(rock && rock.h >= 1, 'a rock in the air');
  assert.equal(rock.x, r.hero.x, 'over its mark');
  assert.equal(rock.y, r.hero.y);
  assert.equal(rock.w, VX.throwSplash * 2);
  const lower = (steps(r, 5), fx(r, 'debris')[0] as FxView);
  assert.ok(lower.h < rock.h, 'falling');
  assert.equal(hurt(ev).length, 0);
  const land = until(r, () => fx(r, 'mark').length === 0, 60);
  assert.ok(land.frames + 5 >= VX.throwT - 2 && land.frames + 5 <= VX.throwT + 2, `${land.frames + 5} frames in the air`);
  const taken = hurt(land.ev);
  assert.equal(taken.length, 1, 'the hero who stood in it');
  assert.ok(sfxIds(land.ev).includes('debris'));
  const splash = fx(r, 'debris')[0] as FxView;
  assert.equal(splash.h, 0, 'landed');
  assert.equal(splash.w, VX.throwSplash * 2);
  assert.equal(splash.life, VX.throwT + VX.splashT, 'its last frames are the splash');
  steps(r, VX.splashT + 8);
  assert.equal(fx(r, 'debris').length, 0, 'and the splash fades');
});

test('Float: a hero who steps out of the mark is not hurt, and the rocks come about every 150 frames', () => {
  const r = vRig();
  toFloat(r);
  r.s.god = false;
  at(r, tc(10), tf(10));
  r.v.throwCd = 0;
  const ev: SimEvent[] = [];
  let was = r.v.move;
  const starts: number[] = [];
  for (let f = 0; f < 1200; f++) {
    // The hero walks clear of every mark the moment it is down, and back to the middle between.
    const m = fx(r, 'mark')[0];
    if (m) at(r, m.x + 40, m.y); else at(r, tc(10), tf(10));
    ev.push(...r.sim.step(inp()));
    if (r.v.move === 'throw' && was !== 'throw') starts.push(f);
    was = r.v.move;
  }
  assert.equal(hurt(ev).length, 0, 'never hit');
  assert.ok(starts.length >= 6, `${starts.length} throws`);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] as number) - (starts[i - 1] as number);
    assert.ok(gap >= 135 && gap <= 165, `a gap of ${gap}`);
  }
});

test('Float: he does not whip, and Clock and Burn do not throw', () => {
  const r = vRig();
  toFloat(r);
  close(r);
  r.v.whipCd = 0;
  steps(r, 20);
  assert.notEqual(r.v.move, 'wind');
  const c = vRig();
  c.v.throwCd = 0;
  steps(c, 60);
  assert.notEqual(c.v.move, 'throw');
  const b = vRig();
  setShare(b, 0.2);
  steps(b, 5);
  b.v.throwCd = 0;
  steps(b, 60);
  assert.notEqual(b.v.move, 'throw');
  assert.equal(b.v.rocks.length, 0);
});

test('Float: breaking an orb pulls him down for 300 frames: pose stun, x1.5, on the floor and open to a swing, then he rises again', () => {
  const r = vRig();
  toFloat(r);
  breakOrb(r, 1);
  assert.equal(r.v.move, 'down');
  assert.equal(bodyView(r)?.pose, 'stun');
  until(r, () => r.body.z === 0, 60);
  const hp = r.body.hp;
  const dmg = hammer(r, r.body, 2);
  assert.ok(dmg > 0, 'a swing lands');
  assert.equal(r.body.hp, hp - dmg);
  // Half again as much as when he stood on the floor in Clock, on the same roll.
  const plain = vRig({ seed: 4 });
  const base = hammer(plain, plain.body, 2);
  const fresh = vRig({ seed: 4 });
  toFloat(fresh);
  breakOrb(fresh, 1);
  const down = hammer(fresh, fresh.body, 2);
  assert.ok(down >= Math.floor(base * 1.3), `${down} against ${base}`);
  // 300 frames from the break (a hit stops the clock for three).
  const timed = vRig();
  toFloat(timed);
  breakOrb(timed, 1);
  const gone = until(timed, () => timed.v.move !== 'down', 400);
  assert.ok(gone.frames >= VX.downT && gone.frames <= VX.downT + 4, `${gone.frames} frames down`);
  until(r, () => r.v.move !== 'down', 400);
  assert.equal(hammer(r, r.body, 2), 0, 'out of reach again');
  steps(r, VX.riseT + 2);
  assert.equal(r.body.z, VX.floatZ);
});

test('Float: another orb broken while he is down starts the 300 frames over; in Clock and Burn a broken orb does not pull him down', () => {
  const r = vRig();
  toFloat(r);
  breakOrb(r, 1);
  steps(r, 200);
  assert.equal(r.v.move, 'down');
  breakOrb(r, 2);
  assert.equal(r.v.t, VX.downT, 'back to the full count');
  const c = vRig();
  breakOrb(c, 1);
  assert.equal(c.v.move, 'walk');
  const b = vRig();
  setShare(b, 0.2);
  steps(b, 3);
  breakOrb(b, 1);
  assert.notEqual(b.v.move, 'down');
});

// ------------------------------------------------------------------ Burn

test('Burn: at 25% the phase event comes once, he comes down on fire, and the blaze is over him', () => {
  const r = vRig();
  toFloat(r);
  setShare(r, 0.25);
  const ev = steps(r, 1);
  assert.deepEqual(ofType(ev, 'phase'), [{ t: 'phase', spawnId: 'vecna', phase: 3 }]);
  steps(r, VX.riseT + 2);
  assert.equal(r.body.z, 0, 'on the floor');
  assert.equal(bodyView(r)?.pose, 'burn');
  const blaze = fx(r, 'blaze');
  assert.equal(blaze.length, 1);
  assert.equal(blaze[0]?.x, r.body.x);
  assert.equal(blaze[0]?.y, r.body.y);
  assert.ok(hammer(r, r.body, 2) > 0, 'a swing lands');
  assert.equal(ofType(steps(r, 200), 'phase').length, 0);
  assert.equal(fx(vRig(), 'blaze').length, 0, 'no fire before Burn');
});

test('Burn: the whip comes every 80 frames, not 120', () => {
  const r = vRig();
  setShare(r, 0.2);
  r.s.god = true;
  const starts: number[] = [];
  let was = r.v.move;
  for (let f = 0; f < 900; f++) {
    close(r);
    r.sim.step(inp());
    if (f === 0) r.v.whipCd = 0;
    if (r.v.move === 'wind' && was !== 'wind') starts.push(f);
    was = r.v.move;
  }
  assert.ok(starts.length >= 9, `${starts.length} whips`);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] as number) - (starts[i - 1] as number);
    assert.ok(gap >= 72 && gap <= 88, `a gap of ${gap}`);
  }
});

test('the phases: one hit from 70% to 20% gives Float then Burn, each once, and they never go back when he heals', () => {
  const r = vRig();
  setShare(r, 0.7);
  steps(r, 2);
  setShare(r, 0.2);
  const ev = steps(r, 3);
  assert.deepEqual(ofType(ev, 'phase').map((e) => e.phase), [2, 3]);
  r.body.hp = r.body.hpMax;
  r.v.healCd = 1;
  assert.equal(ofType(steps(r, 400), 'phase').length, 0);
  assert.equal(r.v.phase, 3);
});

// ------------------------------------------------------------------ the bar, the rules, the end

test('the boss bar is VECNA with the four orbs as its parts, 0 for a broken one', () => {
  const dormant = makeWhite({ grid: vRig().s.grid, spawns: atticSpawns(true), start: { x: tc(10), y: tf(10) }, enemyMult: 1 });
  assert.equal(dormant.sim.view().hud.boss, null, 'nothing before he wakes');
  const r = vRig();
  const bar = r.sim.view().hud.boss;
  assert.deepEqual(bar, { name: 'VECNA', hp: r.body.hpMax, hpMax: r.body.hpMax, parts: [1, 1, 1, 1] });
  hammer(r, r.orbs[1] as never, 1);
  breakOrb(r, 3);
  const parts = r.sim.view().hud.boss?.parts ?? [];
  assert.equal(parts.length, 4);
  assert.equal(parts[0], 1);
  assert.ok((parts[1] as number) > 0 && (parts[1] as number) < 1, 'a hurt orb is a share');
  assert.equal(parts[2], 0, 'a broken one is nothing');
  assert.equal(r.orbs.length, 4);
});

test('boss rules: no knockback, no stagger, no stun, no confusion, no trap', () => {
  for (const group of ['boss', 'elsewhere']) {
    const r = vRig({ spawns: atticSpawns(false).map((sp) => (sp.kind === 'enemy' ? { ...sp, group } : sp)) });
    for (const e of [r.body, r.orbs[0] as never as typeof r.body]) {
      hitEnemy(r.s, r.hero, e, { power: 2, noCrit: true, kb: 8, angle: 0, stun: 90, stagger: 40 });
      assert.equal(e.vx, 0, 'not shoved');
      assert.equal(e.vy, 0);
      assert.equal(e.stagger, 0);
      assert.equal(e.stat.stun, 0);
      confuse(r.s, e, 300);
      assert.equal(e.stat.confuse, 0, 'not confused');
      assert.equal(e.stagger, 0, 'and not even staggered');
      assert.equal(isBoss(e), true, 'so a trap walks over it');
    }
  }
});

test('his death takes the orbs with it in one pass: five kills, groupCleared once, no XP from the orbs, the curse lifted and the rocks gone', () => {
  const r = vRig({ xpMult: 1 });
  toFloat(r);
  r.v.chimeCd = 1;
  r.v.throwCd = 0;
  steps(r, VECNA.windup + 5);
  assert.equal(r.s.house.curses.length, 1, 'a curse is counting');
  assert.ok(r.v.rocks.length > 0, 'and a rock is in the air');
  breakOrb(r, 4);
  r.body.hp = 1;
  hammer(r, r.body, 60, true);
  const ev = steps(r, 12);
  const kills = ofType(ev, 'kill');
  assert.equal(kills.filter((k) => k.kind === 'vecna').length, 1);
  assert.equal(kills.filter((k) => k.kind === 'orb').length, 4, 'a broken orb goes too');
  assert.equal(kills.reduce((n, k) => n + (k.kind === 'orb' ? k.xp : 0), 0), 0);
  assert.equal(kills.find((k) => k.kind === 'vecna')?.xp, VECNA.xp);
  assert.deepEqual(ofType(ev, 'groupCleared').map((g) => g.group), ['boss']);
  assert.equal(r.sim.enemiesAlive('boss'), 0);
  assert.ok(ofType(ev, 'curseEnd').some((c) => c.how === 'orb'), 'the curse is lifted');
  assert.equal(r.s.house.curses.length, 0);
  steps(r, 60);
  assert.equal(fx(r, 'debris').length + fx(r, 'mark').length + fx(r, 'whip').length + fx(r, 'blaze').length, 0, 'nothing of his is left in the view');
  assert.equal(r.sim.view().hud.boss, null);
});

test('he dies only by HP: a fight left alone for a long while does not kill him or his orbs', () => {
  const r = vRig({}, { still: false });
  r.s.god = true;
  steps(r, 3000);
  assert.ok(!r.body.dead && r.body.hp > 0);
  assert.ok(r.orbs.every((o) => !o.dead && o.hp > 0));
});
