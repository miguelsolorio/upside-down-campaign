// The final fight (stage 5.3, docs/level-16.md): the spine (the stage, who plays it, the map), then the three phases on the real stage's grid and
// spawns: Vecna, the Mind Flayer and its chest, the channel with its reset and its finish, the Final Roll event, the music beats, and the bot
// clearing seeded fights. The whole-stage run of the bot is at the bottom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, STAGE_ORDER, closesChapter, defaultParty, needsPicks, partyFor, pickParty, requiredFor, rosterFor } from '../src/core/campaign.ts';
import { ENEMY_DEFS, xOf } from '../src/enemies/defs.ts';
import { hurtChannel } from '../src/combat/channel.ts';
import { KNEEL_WAIT, SINK_WAIT } from '../src/combat/finale.ts';
import { MAP_PLACE } from '../src/core/mapdata.ts';
import { POS, ORDER } from '../src/gfx/map_geo.ts';
import { rollFinal, finishOf } from '../src/ui/finalroll_logic.ts';
import { endsCampaign } from '../src/ui/format.ts';
import { createRng } from '../src/core/rng.ts';
import { createDirector } from '../src/world/triggers.ts';
import { stageName, stageStart } from '../src/world/stage.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { HeroId, SimEvent } from '../src/core/types.ts';
import { idle, inp, ofType } from './sim-helpers.ts';
import { playStage, stageKit, stageXp, tileOf } from './stage-helpers.ts';
import { PARTY, S53, SPIDER_IDS, VECNA_IDS, active, fy, hero, hit, kind, legs, phasesOf, put, px, rig, steps, still, toChannel, toSpider, until } from './finale-helpers.ts';

const CHEST = ENEMY_DEFS.flayer5.x.chestT as number;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------- the spine
test('5.3 is the last stage, closes the chapter and the campaign, and is on the map below the horizon next to the Abyss', () => {
  assert.equal(STAGE_ORDER[STAGE_ORDER.length - 1], '5.3');
  assert.equal(closesChapter('5.3'), true);
  assert.equal(endsCampaign('5.3'), true);
  assert.equal(CHAPTERS[5]?.title, 'Chapter five');
  assert.equal(MAP_PLACE['5.3'], 'heart');
  assert.deepEqual(ORDER.slice(-3), ['5.1', '5.2', '5.3']);
  const heart = POS['5.3'] as { x: number; y: number }, abyss = POS['5.2'] as { x: number; y: number };
  assert.ok(heart.y > 98 + 20, 'below the horizon');
  assert.ok(dist(heart, abyss) < 80 && dist(heart, abyss) > 20, 'beside the Abyss, clear of it');
});

test('Eleven and Will are required, locked in whoever was picked, and walk in at the party\'s average less one if they were behind', () => {
  assert.deepEqual(requiredFor('5.3'), ['eleven', 'will']);
  assert.equal(needsPicks('5.3'), true);
  assert.equal(rosterFor('5.3').length, 10);
  const fixed = pickParty('5.3', ['mike', 'dustin', 'robin', 'nancy']);
  assert.ok(fixed.includes('eleven') && fixed.includes('will'), 'both come in, in the place of the last picks');
  assert.deepEqual(fixed.slice(0, 2), ['mike', 'dustin'], 'the lead and the next pick stay');
  assert.deepEqual(pickParty('5.3', ['eleven', 'will', 'mike', 'dustin']), ['eleven', 'will', 'mike', 'dustin'], 'either may lead');
  const jump = defaultParty('5.3');
  assert.deepEqual(jump.map((s) => s.id), ['mike', 'dustin', 'eleven', 'will']);
  assert.equal(jump[0]?.level, 11, 'the lead walks into the last stage at Lv 11');
  const known = [{ id: 'mike' as HeroId, level: 11 }, { id: 'dustin' as HeroId, level: 10 }, { id: 'eleven' as HeroId, level: 4 }, { id: 'will' as HeroId, level: 4 }];
  const party = partyFor('5.3', known, ['mike', 'dustin', 'eleven', 'will']);
  for (const id of ['eleven', 'will']) assert.ok((party.find((s) => s.id === id)?.level ?? 0) >= 7, `${id} caught up from Lv 4`);
});

test('the stage pays 350 XP before xpMult, which takes the lead to Lv 12 by the clear', () => {
  const base = S53.spawns.reduce((n, e) => n + (e.kind === 'enemy' ? ENEMY_DEFS[e.type].xp : 0), 0);
  assert.equal(base, 350, 'two Flayed, three demobats, Vecna and the Mind Flayer; his orbs and its legs pay nothing');
  assert.ok(base >= 300 && base <= 360);
  assert.equal(S53.xpMult, 5, 'set by the pace pass (docs/pace.md, "Chapter 5")');
  assert.ok(stageXp(S53) - 4 >= 1061, 'the stage pays more than the 1061 that carry a lead from the start of Lv 11 to the cap (stageXp counts the four legs at 1 each: they pay 0)');
});

test('the map: 36 by 44 tiles, a round arena of 22 with the rim all round it, and the marks left and right of its centre', () => {
  const rows = S53.rows;
  assert.deepEqual([rows[0]?.length, rows.length], [36, 44]);
  const at = (x: number, y: number): string => rows[y]?.[x] ?? '?';
  assert.ok(new Set(rows.join('')).size === 3 && [...'õôó'].every((c) => rows.join('').includes(c)), 'heartfloor, heartwall and heartrim, and nothing else');
  // Every wall tile that has the arena's floor beside it is the rim; the arena is a disc.
  const arenaFloor = (x: number, y: number): boolean => (x + 0.5 - 18) ** 2 + (y + 0.5 - 14) ** 2 <= 10.6 ** 2;
  let across = 0;
  for (let y = 0; y < 44; y++) {
    for (let x = 0; x < 36; x++) {
      if (arenaFloor(x, y)) { assert.equal(at(x, y), 'õ', `${x},${y} is the arena's floor`); if (y === 14) across++; }
      else if (at(x, y) !== 'õ' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => arenaFloor(x + (dx as number), y + (dy as number)))) assert.equal(at(x, y), 'ó', `${x},${y} is the rim`);
    }
  }
  assert.equal(across, 22, 'about 22 across');
  const marks = (S53.finale?.channelers ?? []).map((c) => [c.tx, c.ty]);
  assert.deepEqual(marks, [[12, 14], [23, 14]]);
  assert.ok(marks.every(([x, y]) => at(x as number, y as number) === 'õ'));
  assert.equal(18 - ((marks[0] as number[])[0] as number) - 0.5, ((marks[1] as number[])[0] as number) + 0.5 - 18, 'the same distance either side of the centre');
});

test('the route reaches the arena once the vines are burned, and every spawn stands on floor', () => {
  const kit = stageKit(S53);
  const shut = kit.flood(new Set());
  const open = kit.flood(new Set(['burn1']));
  const reach = (seen: Uint8Array, x: number, y: number): boolean => seen[kit.idx(x, y)] === 1;
  assert.ok(reach(shut, 18, 34) && !reach(shut, 18, 31), 'burn1 shuts the corridor to the antechamber');
  for (const [x, y] of [[18, 29], [18, 26], [18, 18], [12, 14], [23, 14], [18, 4]]) assert.ok(reach(open, x as number, y as number), `${x},${y} is reachable`);
  for (const e of [...kit.enemies, ...kit.items]) assert.equal(kit.grid.solid[kit.idx(e.tx, e.ty)], 0, `${e.id} is on floor`);
  const [sx, sy] = tileOf(S53.start.x, S53.start.y);
  assert.ok(reach(shut, sx, sy));
  assert.equal(kit.items.filter((i) => i.item === 'eggo').length, 3);
  assert.equal(kit.items.filter((i) => i.item === 'coke').length, 3);
  assert.ok(S53.checkpoints.some((c) => c.prop === 'lights_heart'), 'one save point for the whole fight');
  assert.equal(S53.checkpoints.length, 1);
  assert.equal(stageName('5.3'), 'Vecna inside the Mind Flayer');
  assert.deepEqual(stageStart('5.3'), S53.start);
});

// ---------------------------------------------------------------- phase one: Vecna
test('defend starts the fight: phase one, the bar says VECNA with his four orbs, and he and they are awake', () => {
  const r = rig();
  const v = kind(r, 'vecna');
  assert.equal(v.dormant, true);
  assert.equal(r.s.enemies.filter((e) => e.kind === 'orb').length, 4);
  assert.equal(r.sim.view().hud.boss, null, 'no bar before it starts');
  r.sim.defend();
  assert.deepEqual(phasesOf(steps(r, 2)), [1]);
  r.sim.defend();
  assert.deepEqual(phasesOf(steps(r, 2)), [], 'it starts once');
  assert.equal(v.dormant, false);
  assert.ok(r.s.enemies.filter((e) => e.kind === 'orb').every((o) => !o.dormant), 'the orbs wake with him');
  const bar = r.sim.view().hud.boss;
  assert.deepEqual({ name: bar?.name, phase: bar?.phase, parts: bar?.parts }, { name: 'VECNA', phase: 1, parts: [1, 1, 1, 1] });
  assert.equal(r.sim.view().hud.channel, null);
});

test('phase one is 4.4\'s Vecna kit run at 1.3 times his pace, with the clock chiming every 12 s: the stage\'s own numbers over his def\'s', () => {
  const r = rig();
  const v = kind(r, 'vecna'), X = xOf(v);
  assert.deepEqual([X.speedMul, X.chimeEvery, X.sinkT], [1.3, 720, 64]);
  assert.equal(X.whipEvery, ENEMY_DEFS.vecna.x.whipEvery, 'the rest of the kit is chapter 4\'s');
  assert.ok(v.vecna && v.vecna.orbs.length === 4, 'he finds his four orbs');
  r.sim.defend();
  steps(r, 2);
  assert.equal(v.vecna!.chimeCd, 718, 'the clock starts at 720 frames from the wake');
  // He walks 1.3 times as fast as 4.4's Vecna does (0.4 px a frame), from the same spot toward a hero with a clear line.
  put(r, v.x, v.y + 120);
  const at = v.y;
  steps(r, 20);
  assert.ok(v.y - at >= 0.4 * 1.3 * 20 * 0.9 && v.y - at <= 0.4 * 1.3 * 20 * 1.05, `moved ${(v.y - at).toFixed(1)} px in 20 frames`);
  // His whip winds up for 1/1.3 of 4.4's frames.
  assert.equal(Math.round(ENEMY_DEFS.vecna.windup / 1.3), 11);
});

test('the clock chimes at 12 s and curses a hero, who is let go when the Walkman plays or the marked orb breaks, and falls at the fourth chime', () => {
  // The clock counts the sim's own ticks (a hit-stop frame is not one), so it chimes a few frames after 720 of them.
  const cursed = (r: ReturnType<typeof rig>): { who: HeroId; at: number; ev: SimEvent[] } => {
    r.sim.defend();
    let at = 0;
    const ev = until(r, () => { at++; return r.s.house.curses.length > 0; }, 900);
    return { who: ofType(ev, 'cursed')[0]!.hero, at, ev };
  };
  // A hero cursed at the first chime, then Max swapped to with her Walkman: the curse ends 'walkman' and nobody is down.
  let walkman = false;
  for (let seed = 1; seed <= 12 && !walkman; seed++) {
    const r = rig({ seed, party: [{ id: 'mike', level: 11 }, { id: 'max', level: 9 }, { id: 'dustin', level: 10 }, { id: 'eleven', level: 8 }] });
    r.s.house.walkman = true;
    const c = cursed(r);
    assert.ok(c.at >= 719 && c.at <= 800, `the first chime came after ${c.at} frames`);
    if (c.who === 'max') continue;
    // Away from Max and back by a quick swap (the party's own swap off a cursed hero is forced, and does not play it).
    const maxIdx = r.s.heroes.findIndex((h) => h.id === 'max');
    const other = r.s.heroes.findIndex((h, i) => i !== maxIdx && h.id !== c.who);
    const ev2 = [...steps(r, 1, inp({ swapTo: other })), ...steps(r, 12), ...steps(r, 1, inp({ swapTo: maxIdx })), ...steps(r, 2)];
    assert.deepEqual(ofType(ev2, 'curseEnd').map((x) => [x.hero, x.how]), [[c.who, 'walkman']]);
    assert.equal(hero(r, c.who).ko, false);
    walkman = true;
  }
  assert.ok(walkman, 'a seed whose curse is not on Max');
  // Left alone, the curse counts its four chimes 240 frames apart and takes the fourth hero out.
  const r = rig({ seed: 3 });
  cursed(r);
  const first = r.s.house.curses[0]!;
  assert.equal(first.gap, 240, 'a third of 12 s between chimes');
  kind(r, 'vecna').dormant = true;
  const ev = until(r, () => r.s.house.curses.length === 0, 900);
  assert.deepEqual(ofType(ev, 'curseEnd').map((x) => x.how), ['ko']);
  assert.equal(first.hero.ko, true, 'the fourth chime knocked them out');
});

test('Vecna at 0 HP sinks: ko for sinkT frames with no flicker, his orbs go with him and the curses they marked, XP paid, and phase two begins a beat in', () => {
  const r = rig();
  r.sim.defend();
  until(r, () => r.s.house.curses.length > 0, 900);
  assert.equal(r.s.house.curses.length, 1, 'a curse is on a hero when he falls');
  const v = kind(r, 'vecna'), h = active(r);
  const xp = r.sim.stats().xpEarned;
  v.hp = 0;
  const ev = steps(r, 1);
  assert.equal(r.s.house.curses.length, 0, 'the curse is lifted with him');
  assert.equal(ofType(ev, 'kill').filter((k) => k.kind === 'vecna').length, 1);
  assert.equal(ofType(ev, 'kill').filter((k) => k.kind === 'orb').length, 4, 'and the four orbs');
  assert.ok(r.sim.stats().xpEarned > xp);
  let blinked = false, last = 0;
  for (let i = 0; i < xOf(v).sinkT! - 2; i++) {
    r.sim.step(idle());
    const a = r.sim.view().actors.find((o) => o.id === 'vecna');
    assert.ok(a, `still there ${i} frames in`);
    assert.equal(a.anim, 'ko');
    assert.ok(a.t > last, 't counts the sink');
    last = a.t;
    blinked ||= a.blink;
  }
  assert.equal(blinked, false, 'he sinks, he does not flicker out');
  steps(r, 8);
  assert.equal(r.sim.view().actors.some((o) => o.id === 'vecna'), false, 'gone once the floor has him');
  assert.equal(h.hp > 0, true);
});

// ---------------------------------------------------------------- phase two: the Mind Flayer and its chest
test('phase two begins SINK_WAIT frames after Vecna goes down: the party is back on its feet and the bar says THE MIND FLAYER with its four legs', () => {
  const r = rig();
  r.sim.defend();
  steps(r, 2);
  const mike = active(r), dustin = hero(r, 'dustin');
  dustin.ko = true; dustin.hp = 0; mike.hp = 40;
  kind(r, 'vecna').hp = 0;
  const ev = [...steps(r, SINK_WAIT - 4)];
  assert.deepEqual(phasesOf(ev), [], 'not yet');
  assert.equal(kind(r, 'flayer5').dormant, true);
  ev.push(...steps(r, 8));
  assert.deepEqual(phasesOf(ev), [2]);
  assert.equal(kind(r, 'flayer5').dormant, false);
  assert.ok(legs(r).every((l) => !l.dormant));
  assert.equal(dustin.ko, false, 'the fallen stand up');
  assert.ok(mike.hp > 40, 'and everyone gets a share of their HP back');
  const bar = r.sim.view().hud.boss;
  assert.deepEqual({ name: bar?.name, phase: bar?.phase, parts: bar?.parts?.length }, { name: 'THE MIND FLAYER', phase: 2, parts: 4 });
});

test('the chest takes no hit until a hit on a leg opens it for 5 s, and only hits on the open chest move the bar', () => {
  const r = rig();
  toSpider(r);
  still(r);
  const body = kind(r, 'flayer5');
  const bar = (): number => r.sim.view().hud.boss?.hp ?? -1;
  const view = (): { open?: boolean; k?: number; pose?: string } => r.sim.view().actors.find((a) => a.id === 'flayer5') ?? {};
  const full = bar();
  assert.equal(view().open, undefined, 'shut');
  assert.equal(hit(r, body, 5), 0, 'a hit on a shut chest does nothing');
  assert.equal(bar(), full);
  const leg = legs(r)[0]!;
  assert.ok(hit(r, leg, 1) > 0);
  const ev = steps(r, 1);
  assert.equal(view().open, true);
  assert.ok((view().k ?? 0) > 0.95 && (view().k ?? 2) <= 1, 'the window just opened');
  assert.ok(ofType(ev, 'sfx').some((e) => e.id === 'reveal'));
  assert.ok(hit(r, body, 5) > 0 && bar() < full, 'a hit on the open chest moves the bar');
  // A second leg hit while it is open does not stretch the window.
  steps(r, 100);
  const left = body.fin!.open;
  hit(r, legs(r)[1]!, 1);
  assert.equal(body.fin!.open, left);
  steps(r, left + 6);
  assert.equal(view().open, undefined, 'shut again after chestT frames');
  const now = bar();
  assert.equal(hit(r, body, 5), 0);
  assert.equal(bar(), now);
  // And with every leg cut the head comes down and the chest is open with it, at the head's bonus.
  for (const l of legs(r)) { l.hp = 1; hit(r, l, 5); }
  steps(r, 8);
  assert.equal(body.flayer!.move, 'down');
  assert.equal(view().open, true);
  const dealt = hit(r, body, 5);
  assert.ok(dealt > 0 && bar() < now);
});

test('the Mind Flayer at 0 HP kneels for the rest of the stage, and KNEEL_WAIT frames later the channel begins', () => {
  const r = rig();
  toSpider(r);
  const body = kind(r, 'flayer5');
  const xp = r.sim.stats().xpEarned;
  const ev = [...toChannel(r)];
  assert.equal(ofType(ev, 'groupCleared').filter((g) => g.group === 'flayer').length, 1);
  assert.deepEqual(phasesOf(ev), [3]);
  assert.ok(r.sim.stats().xpEarned >= xp + ENEMY_DEFS.flayer5.xp, 'the body paid');
  assert.equal(legs(r).length, 0, 'the legs went with it');
  steps(r, 400);
  const a = r.sim.view().actors.find((o) => o.id === 'flayer5');
  assert.deepEqual({ pose: a?.pose, anim: a?.anim, blink: a?.blink, open: a?.open }, { pose: 'down', anim: 'idle', blink: false, open: undefined });
  assert.equal(body.dead, true);
  assert.ok(KNEEL_WAIT > 0);
});

// ---------------------------------------------------------------- phase three: the channel
test('the channel: Eleven and Will walk to their marks, held like a ward with a bar each, and the party plays the other two', () => {
  const r = rig();
  toSpider(r);
  // Eleven has the lead when the Mind Flayer goes down: the party swaps away from her.
  const slot = r.s.heroes.findIndex((h) => h.id === 'eleven');
  steps(r, 20);
  r.sim.step(inp({ swapTo: slot }));
  assert.equal(active(r).id, 'eleven');
  toChannel(r);
  assert.ok(!['eleven', 'will'].includes(active(r).id), 'she is not the active hero any more');
  const hud = r.sim.view().hud;
  assert.deepEqual(hud.channel?.channelers.map((c) => [c.id, c.hp, c.hpMax]), [['eleven', 380, 380], ['will', 380, 380]]);
  assert.equal(hud.channel?.on, false, 'the clock waits for the marks');
  assert.deepEqual({ name: hud.boss?.name, phase: hud.boss?.phase }, { name: 'THE CHANNEL', phase: 3 });
  assert.deepEqual(hud.party.filter((p) => p.channeling).map((p) => p.id), ['eleven', 'will']);
  // Swaps skip them: a press at their slot, and a step to the next, both leave the active hero alone.
  const lead = active(r).id;
  for (const id of ['eleven', 'will'] as const) {
    r.sim.step(inp({ swapTo: r.s.heroes.findIndex((h) => h.id === id) }));
    steps(r, 10);
    assert.equal(active(r).id, lead, `no swap to ${id}`);
  }
  for (let i = 0; i < 6; i++) { r.sim.step(inp({ swapDelta: 1 })); steps(r, 8); assert.ok(!['eleven', 'will'].includes(active(r).id), 'cycling skips them'); }
  until(r, () => r.s.finale?.on === true, 400);
  const view = r.sim.view();
  for (const [id, tx] of [['eleven', 12], ['will', 23]] as const) {
    const a = view.actors.find((o) => o.kind === 'hero' && o.id === id)!;
    assert.deepEqual([a.x, a.y, a.anim], [px(tx), fy(14), 'cast'], `${id} is on her mark, casting`);
    assert.deepEqual(a.bar, { hp: 380, hpMax: 380 });
  }
  assert.equal(view.actors.find((o) => o.id === 'eleven')?.strained, true);
  assert.equal(view.hud.channel?.on, true);
  assert.ok((view.hud.channel?.left ?? 0) <= 2400 && (view.hud.channel?.left ?? 0) > 2400 - 600, 'the clock started when they arrived');
  assert.equal(view.hud.channel?.total, 2400);
});

test('the waves go for the channelers and not the hero who stands away, and a channeler falling starts it all again with both at full', () => {
  const r = rig();
  // The climb's bats wake within 160 px of the hero wherever he stands, and the party is not coming through the hall in this test: they are gone.
  r.s.enemies = r.s.enemies.filter((e) => e.group !== 'climb');
  toSpider(r);
  toChannel(r);
  until(r, () => r.s.finale?.on === true, 400);
  const f = r.s.finale!;
  const away = active(r);
  away.x = px(18); away.y = fy(29);
  r.s.trailX.fill(away.x); r.s.trailY.fill(away.y);
  const hp0 = away.hp;
  const ev = steps(r, 900);
  const wave = r.s.enemies.filter((e) => e.rt === 'wave' && !e.dead);
  assert.ok(wave.length > 0 || ofType(ev, 'channelReset').length > 0, 'a wave came up');
  assert.ok(f.chans.some((c) => c.hp < c.hpMax) || f.resets > 0, 'and went for the channelers');
  assert.equal(away.hp, hp0, 'the hero out of its way was not touched');
  // The fall: the clock and both channelers are back, what was up is gone, the party breathes in, and the waves begin again.
  f.left = 1500;
  const will = f.chans[1]!;
  const reset = f.resets;
  const ev2 = [];
  const dealt = hurtChannel(r.s, will, 1, 99999);
  ev2.push(...steps(r, 1));
  assert.ok(dealt > 0);
  assert.deepEqual(ofType(ev2, 'channelReset').map((e) => e.hero), ['will']);
  assert.equal(f.resets, reset + 1);
  assert.ok(f.left >= f.total - 1, 'the clock is back (a tick has run)');
  assert.deepEqual(f.chans.map((c) => c.hp), [380, 380]);
  assert.ok(f.next >= 1, 'and the first wave is up already');
  assert.ok(r.s.enemies.filter((e) => e.rt === 'wave' && !e.dead).length <= 2, 'only the first wave');
  assert.equal(f.done, false);
});

test('the channel runs out: one Final Roll of every hero still standing, channelers included, and the field is cleared', () => {
  const run = (): { ev: SimEvent[]; r: ReturnType<typeof rig> } => {
    const r = rig({ seed: 9 });
    toSpider(r);
    toChannel(r);
    until(r, () => r.s.finale?.on === true, 400);
    const dustin = hero(r, 'dustin');
    if (active(r) === dustin) r.sim.step(inp({ swapTo: 0 }));
    dustin.ko = true; dustin.hp = 0;
    r.s.finale!.left = 3;
    return { ev: steps(r, 5), r };
  };
  const { ev, r } = run();
  const rolls = ofType(ev, 'finalRoll');
  assert.equal(rolls.length, 1, 'once');
  const e = rolls[0]!;
  assert.deepEqual(e.heroes, ['mike', 'eleven', 'will'], 'the standing: party order, channelers in, Dustin down and out');
  assert.deepEqual(e.roll.rolls.map((x) => x.hero), e.heroes);
  for (const x of e.roll.rolls) assert.ok(x.dice.every((d) => d >= 1 && d <= 20) && x.keep === Math.max(...x.dice), 'two d20, the higher stays');
  assert.equal(e.roll.total, e.roll.rolls.reduce((n, x) => n + x.keep, 0));
  assert.equal(e.roll.finish, finishOf(e.roll.total, e.roll.rolls.map((x) => x.keep)));
  assert.equal(e.roll.nat20, e.roll.rolls.some((x) => x.keep === 20));
  assert.deepEqual(e.roll, run().ev.flatMap((x) => (x.t === 'finalRoll' ? [x.roll] : []))[0], 'the same seed gives the same roll');
  assert.equal(rollFinal(e.heroes, createRng(1)).rolls.length, 3, 'it is rollFinal');
  assert.ok(r.s.finale!.done);
  assert.equal(r.s.enemies.filter((o) => o.rt !== null && !o.dead).length, 0, 'nothing run-time is left up');
  assert.equal(r.sim.view().hud.channel?.left, 0);
  assert.deepEqual(ofType(steps(r, 900), 'finalRoll'), [], 'and it does not come again');
  assert.equal(ofType(steps(r, 1), 'allDown').length, 0);
});

test('a retry that finds a boss already in the kill list starts at the next phase', () => {
  const second = rig({ skip: VECNA_IDS });
  second.sim.defend();
  assert.deepEqual(phasesOf(steps(second, 2)), [2]);
  assert.equal(kind(second, 'flayer5').dormant, false);
  const third = rig({ skip: [...VECNA_IDS, ...SPIDER_IDS] });
  third.sim.defend();
  assert.deepEqual(phasesOf(steps(third, 2)), [3]);
  assert.equal(third.sim.view().hud.channel?.channelers.length, 2);
});

// ---------------------------------------------------------------- the beats
test('the beats: the arena door starts the fight, the phases step the music up, and the Final Roll ends the stage', () => {
  const log: string[] = [];
  let defended = 0;
  const sim = { enemiesAlive: () => 1, spawnGroup: () => undefined, closeProp: (id: string) => { log.push(`close ${id}`); }, defend: () => { defended++; }, party: () => [] };
  const env = {
    sim: () => sim, say: (id: string, done: () => void) => { log.push(`say ${id}`); done(); }, scare: (d: () => void) => d(), open: (id: string) => { log.push(`open ${id}`); },
    music: (t: string) => { log.push(`music ${t}`); }, phase: (n: number) => { log.push(`phase ${n}`); }, boom: () => { log.push('boom'); },
    jingle: () => undefined, finish: () => { log.push('finish'); },
  } as unknown as DirectorEnv;
  const dir = createDirector(S53.beats, S53.waves, env);
  dir.tick(18, 20);
  assert.deepEqual(log, ['close door1', 'music abyss', 'say l16_vecna'], 'the door shuts, then the fight\'s own track');
  assert.equal(defended, 1, 'and the fight starts');
  log.length = 0;
  dir.events([{ t: 'bossPhase', phase: 1 }]);
  assert.deepEqual(log, [], 'abyss starts at its own tempo');
  dir.events([{ t: 'bossPhase', phase: 2 }]);
  assert.deepEqual(log, ['phase 1', 'say l16_spider']);
  log.length = 0;
  dir.events([{ t: 'bossPhase', phase: 3 }]);
  assert.deepEqual(log, ['phase 2', 'say l16_channel']);
  log.length = 0;
  assert.equal(dir.finished(), false);
  dir.events([{ t: 'finalRoll', heroes: [], roll: rollFinal([], createRng(1)) }]);
  assert.deepEqual(log, ['boom', 'say l16_clear', 'open door1', 'finish']);
  assert.equal(dir.finished(), true);
});

// ---------------------------------------------------------------- the bot
test('the bot clears seeded fights on chief, careful and careless, through every phase, and ends the stage a Lv 12 lead', () => {
  const careful = [1, 2, 3, 4].map((seed) => playStage(S53, seed, PARTY, 40000, 'chief', false));
  assert.ok(careful.filter((x) => x.done && !x.allDown).length >= 3, `${careful.filter((x) => x.done).length} of 4 careful clears`);
  const careless = [1, 2, 3, 4].map((seed) => playStage(S53, seed, PARTY, 40000, 'chief', true));
  assert.ok(careless.filter((x) => x.done && !x.allDown).length >= 2, `${careless.filter((x) => x.done).length} of 4 careless clears`);
  for (const run of [...careful, ...careless].filter((x) => x.done)) {
    assert.deepEqual(run.said.filter((s) => ['l16_vecna', 'l16_spider', 'l16_channel', 'l16_clear'].includes(s)), ['l16_vecna', 'l16_spider', 'l16_channel', 'l16_clear'], 'every phase, in order');
    assert.equal(run.said[run.said.length - 1], 'l16_clear');
    assert.ok(run.steps.includes('open door1'));
  }
  const lead = careful.find((x) => x.done);
  assert.equal(lead?.party.find((p) => p.id === 'mike')?.level, 12, 'the lead reaches the cap by the clear');
});
