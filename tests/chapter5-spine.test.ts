// The spine of chapter 5's first two stages (docs/chapter-5.md, docs/level-14.md, docs/level-15.md): the contracts (foe kinds, effects, view
// fields, the drop layer), the 31 tiles and where the game paints them, the campaign (the chapter five card, the roster, who is locked in,
// Hopper's and Will's catch-up), the map's nodes, the stand-in foes and effects, and the two stub stages: their maps, reachability, light
// and music, beats and words. The stages' real content comes with their builds. Bakes through the software canvas from canvas-helpers.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCanvas } from './canvas-helpers.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf, closesChapter, defaultParty, needsPicks, nextStage, opensChapter, partyFor, pickParty, poolFor, requiredFor, rosterFor } from '../src/core/campaign.ts';
import { MAP_PLACE } from '../src/core/mapdata.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { TILES, buildGrid } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, EnemyKind, FxView, HeroId, PartySeed, SfxId } from '../src/core/types.ts';
import { createSim } from '../src/combat/index.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { isShieldedKind } from '../src/enemies/shield.ts';
import { SFX } from '../src/audio/sfx.ts';
import { LEVELS1415, SFX1415 } from '../src/audio/sfx_level1415.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { BAND_Y, HZ, ORDER, POS, hzAt } from '../src/gfx/map_geo.ts';
import { paintLand } from '../src/gfx/map_land.ts';
import { ABYSS_TILES } from '../src/gfx/ch5/abyss_tiles.ts';
import { HEART_TILES } from '../src/gfx/ch5/heart_tiles.ts';
import { CORE, LOCKDOWN_SOLID, LOCKDOWN_TILES } from '../src/gfx/ch5/lockdown_tiles.ts';
import { ch5Tile, isCh5Pulse, nightName } from '../src/gfx/tile_ch5.ts';
import type { Near } from '../src/gfx/tile_ground.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { ROWS as ROWS_51, STAGE_51 } from '../src/world/stages/stage51.ts';
import { ROWS as ROWS_52, STAGE_52 } from '../src/world/stages/stage52.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import { botRoute, idle, playStage, rectTiles, stageKit, tileOf } from './stage-helpers.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { bakeStage, samplePx } = await import('../src/gfx/tiles.ts');

const MEMBERS: HeroId[] = ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy', 'hopper'];
// 5.1 is built (tests/stage51*.test.ts); only the stand-ins are held to the stub checks below.
// 5.2 is built too (tests/stage52*.test.ts), so no stand-in is left.
const STAGES: [string, StageData, string[]][] = [];
const CH5_TILES = [...LOCKDOWN_TILES, ...ABYSS_TILES, ...HEART_TILES] as TileName[];
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });

// ---------------------------------------------------------------- the legend
test('chapter 5 has 31 tiles, each with a character of its own that is one UTF-16 unit, and chapter 4 and the earlier ones keep theirs', () => {
  assert.equal(CH5_TILES.length, 31);
  assert.equal(new Set(CH5_TILES).size, 31);
  const chars = Object.entries(TILES);
  for (const name of CH5_TILES) {
    const own = chars.filter(([, d]) => d.name === name);
    assert.equal(own.length, 1, `${name} has exactly one character`);
    assert.equal((own[0] as [string, unknown])[0].length, 1, `${name} is one UTF-16 unit, so row[x] reads one tile`);
  }
  // The characters chapter 4 took are still its own, and the legend has no tile twice.
  assert.equal(TILES['È']?.name, 'snow');
  assert.equal(TILES['ê']?.name, 'creelfurn');
  assert.equal(new Set(chars.map(([, d]) => d.name)).size, chars.length);
  assert.ok(chars.length >= 178, `${chars.length} tiles in the legend: 147 before chapter 5`);
});

test('solid and walkable tiles: the house front and the army wall stop you, the rift and the bridges do not, the void is solid and a drop', () => {
  const def = (n: TileName) => Object.values(TILES).find((d) => d.name === n) as (typeof TILES)[string];
  for (const n of LOCKDOWN_TILES) assert.equal(def(n).solid, LOCKDOWN_SOLID.has(n), `${n}: solid iff LOCKDOWN_SOLID`);
  for (const n of ['rift0', 'rift1', 'rift2'] as TileName[]) assert.ok(!def(n).solid, `${n} is walked over`);
  for (const n of ['abysslawn', 'abyssroad', 'abyssline', 'abyssporch', 'abyssclass', 'abyssbridgeh', 'abyssbridgev'] as TileName[]) assert.ok(!def(n).solid && !def(n).drop, `${n} is walked on`);
  for (const n of ['abysscliff', 'abyssunder', 'abyssgap'] as TileName[]) assert.ok(def(n).solid && def(n).drop, `${n} is solid and a drop`);
  assert.deepEqual(HEART_TILES.map((n) => def(n).solid), [false, true, true]);
  assert.equal(Object.values(TILES).filter((d) => d.drop).length, 3, 'nothing else is a drop');
});

test('buildGrid lists the drops: a layer only a stage with a void has, one on each solid tile that is a drop', () => {
  const g = buildGrid(['ù®û', 'ú®ø']);
  assert.deepEqual(g.solid, new Uint8Array([1, 0, 1, 1, 0, 0]));
  assert.deepEqual(g.drop, new Uint8Array([1, 0, 1, 1, 0, 0]));
  assert.equal(buildGrid(['..', '.T']).drop, undefined, 'a stage without a void has no layer');
  assert.equal(stageGrid(STAGE_51).drop, undefined);
  const void52 = stageGrid(STAGE_52);
  assert.ok(void52.drop && void52.drop.length === void52.solid.length);
  for (let i = 0; i < void52.solid.length; i++) assert.ok(!void52.drop[i] || void52.solid[i], 'a drop is always solid');
});

// ---------------------------------------------------------------- the painters
/** The tiles a tile is drawn beside when it looks its best: a rock face under an island's edge, the rock tapering under it, a rim with floor to its north (where the heartbeat lights it). */
const nearOf = (n: TileName): Near => {
  switch (n) {
    case 'abysscliff': return { n: 'abyssroad', e: n, s: 'abyssunder', w: n };
    case 'abyssunder': return { n: 'abysscliff', e: n, s: 'abyssgap', w: n };
    case 'abyssroad': case 'abysslawn': case 'abyssline': case 'abyssporch': case 'abyssclass': return { n: 'abyssgap', e: n, s: 'abysscliff', w: n };
    case 'heartrim': return { n: 'heartfloor', e: n, s: 'heartwall', w: n };
    case 'heartwall': return { n: 'heartwall', e: n, s: 'heartfloor', w: n };
    default: return around(n);
  }
};

test('the game paints all 31 tiles: 16 by 16, the lockdown and the heart opaque, the Abyss cut to its islands, and the void clear', () => {
  for (const name of CH5_TILES) {
    for (const v of [0, 1, 2]) {
      const px = samplePx(name, v);
      assert.equal(px.w, 16, `${name} is 16 wide`);
      assert.equal(px.h, 16, `${name} is 16 tall`);
      const opaque = px.d.every((p) => p >>> 24 === 255);
      if (name === 'abyssgap') assert.ok(px.d.filter((p) => p !== 0).length <= 8, 'the void is clear, bar a speck of debris');
      else if (name.startsWith('abyss')) assert.ok(px.d.some((p) => p >>> 24 === 255), `${name} has something in it`);
      else assert.ok(opaque, `${name} is opaque (${v})`);
      // A drawing, and not a fill and a frame, beside what it is meant to be seen beside.
      const seen = ch5Tile(name, { tx: 5 + v * 3, ty: 4 + v * 7, near: nearOf(name) }) as { d: Uint32Array };
      if (name !== 'abyssgap') assert.ok(new Set(seen.d).size >= 3, `${name} is a drawing and not a fill and a frame`);
    }
  }
  assert.equal(ch5Tile('grass', { tx: 1, ty: 1, near: around('grass') }), null, 'a tile that is not chapter 5');
  assert.equal(ch5Tile('snow', { tx: 1, ty: 1, near: around('snow') }), null);
});

test('the rift glows, the Abyss and the heart move with the pulse, and the void and the bridges stand still', () => {
  const spots: [number, number][] = [[5, 4], [8, 9], [13, 6], [21, 12], [30, 3], [34, 17]];
  const at = (n: TileName, phase: number, [tx, ty]: [number, number]) => ch5Tile(n, { tx, ty, near: nearOf(n) }, phase) as { d: Uint32Array };
  for (const n of ['rift0', 'rift1', 'rift2', 'abysslawn', 'abyssroad', 'abysscliff', 'abyssunder', 'heartfloor', 'heartwall', 'heartrim'] as TileName[]) {
    assert.ok(isCh5Pulse(n), `${n} pulses`);
    assert.ok(spots.some((p) => [1, 2, 3].some((ph) => at(n, ph, p).d.some((v, i) => v !== at(n, 0, p).d[i]))), `${n} changes with the phase, somewhere`);
  }
  for (const n of ['abyssgap', 'abyssbridgeh', 'abyssbridgev', 'lockroad', 'armywall'] as TileName[]) assert.ok(!isCh5Pulse(n), `${n} is baked once`);
});

test('a lockdown tile goes through the night pass as the town tile it is built on, and the rest as themselves', () => {
  for (const n of LOCKDOWN_TILES) assert.equal(nightName(n), CORE[n]);
  assert.equal(nightName('lockline'), 'roadline');
  assert.equal(nightName('armywall'), 'labwall');
  assert.equal(nightName('abysslawn'), 'abysslawn');
  assert.equal(nightName('grass'), 'grass');
  // The road line lies along the road beside it, which it reads as the town's own road.
  const along = ch5Tile('lockline', { tx: 4, ty: 4, near: { n: 'lockwalk', e: 'lockroad', s: 'lockroad', w: 'lockroad' } }) as { d: Uint32Array };
  const across = ch5Tile('lockline', { tx: 4, ty: 4, near: { n: 'lockroad', e: 'lockwalk', s: 'lockroad', w: 'lockwalk' } }) as { d: Uint32Array };
  assert.notDeepEqual(along.d, across.d, 'the double line turns with the street');
});

test('baking a stage: 5.1 is opaque, 5.2 leaves the void clear for the backdrop and is not baked at night', () => {
  const cell = (b: unknown, tx: number, ty: number, W: number): number[] => {
    const c = (b as { canvas: FakeCanvas }).canvas;
    return Array.from({ length: 256 }, (_, i) => c.px[(ty * 16 + ((i / 16) | 0)) * W + tx * 16 + (i % 16)] as number);
  };
  const night = bakeStage(ROWS_51, true), dusk = bakeStage(ROWS_51, false);
  const w51 = ROWS_51[0]?.length ?? 0, h51 = ROWS_51.length;
  assert.deepEqual([night.w, night.h], [w51 * 16, h51 * 16]);
  for (let ty = 0; ty < h51; ty++) for (let tx = 0; tx < w51; tx++) assert.ok(cell(night, tx, ty, night.w).every((p) => p >>> 24 === 255), `5.1 ${tx},${ty} is opaque at night`);
  assert.notDeepEqual(cell(night, 5, 3, night.w), cell(dusk, 5, 3, dusk.w), 'night is not day');
  const abyss = bakeStage(ROWS_52, false);
  assert.deepEqual([abyss.w, abyss.h], [(ROWS_52[0]?.length ?? 0) * 16, ROWS_52.length * 16]);
  assert.ok(cell(abyss, 1, 1, abyss.w).filter((p) => p !== 0).length <= 8, 'the void, deep in it, is clear bar a speck of debris');
  assert.ok(cell(abyss, 9, 35, abyss.w).every((p) => p >>> 24 === 255), 'the lawn is opaque');
  assert.ok(cell(abyss, 19, 35, abyss.w).some((p) => p === 0) && cell(abyss, 19, 35, abyss.w).some((p) => p >>> 24 === 255), 'a bridge shows the void between its slats');
});

// ---------------------------------------------------------------- the campaign
test('chapter five is its own chapter: the card says Chapter five, The last campaign, 5.1 opens it, and 5.3 closes it and 5.2 does not', () => {
  assert.deepEqual(CHAPTERS[5], { title: 'Chapter five', subtitle: 'The last campaign' });
  assert.deepEqual(STAGE_ORDER.slice(-3), ['5.1', '5.2', '5.3']);
  assert.equal(chapterOf('5.1'), 5);
  assert.equal(opensChapter('5.1'), true);
  assert.equal(opensChapter('5.2'), false);
  assert.equal(closesChapter('5.1'), false);
  assert.equal(closesChapter('5.2'), false, '5.3 closes chapter 5');
  assert.equal(closesChapter('5.3'), true);
  assert.equal(nextStage('5.3'), null, '5.3 is the last stage of the campaign');
  assert.equal(nextStage('4.4'), '5.1');
  assert.equal(nextStage('5.1'), '5.2');
  assert.equal(nextStage('5.2'), '5.3');
});

test('5.1 and 5.2 are for everyone met but Eddie, four picked, with Hopper locked in 5.1 and Will in 5.2', () => {
  for (const id of ['5.1', '5.2']) {
    assert.deepEqual([...rosterFor(id)].sort(), [...MEMBERS].sort());
    assert.ok(!rosterFor(id).includes('eddie'), 'Eddie fell in 4.3');
    assert.equal(needsPicks(id), true);
    assert.equal(rosterFor(id).length, 10);
  }
  assert.deepEqual(requiredFor('5.1'), ['hopper']);
  assert.deepEqual(requiredFor('5.2'), ['will']);
  // A pick without them is fixed up: the required hero takes the place of the last pick that is not the lead.
  assert.deepEqual(pickParty('5.1', ['mike', 'dustin', 'robin', 'nancy']), ['mike', 'dustin', 'robin', 'hopper']);
  assert.deepEqual(pickParty('5.2', ['mike', 'dustin', 'robin', 'hopper']), ['mike', 'dustin', 'robin', 'will']);
  assert.deepEqual(pickParty('5.1', ['hopper', 'mike', 'dustin', 'robin']), ['hopper', 'mike', 'dustin', 'robin'], 'Hopper may lead');
  assert.deepEqual(pickParty('5.1', ['eddie', 'mike', 'dustin', 'robin']).includes('eddie'), false, 'Eddie is not in the pool');
  for (const id of ['5.1', '5.2']) assert.equal(pickParty(id, []).length, 4);
});

test('a ?stage= jump into chapter five walks in with the lead at Lv 10, and the locked hero already caught up to the party', () => {
  for (const [id, locked] of [['5.1', 'hopper'], ['5.2', 'will']] as [string, HeroId][]) {
    const party = defaultParty(id);
    assert.equal(party.length, 4);
    assert.equal(party[0]?.id, 'mike');
    assert.equal(party[0]?.level, 10, 'the lead walks into chapter 5 at Lv 10');
    assert.ok(party.some((s) => s.id === locked), `${locked} is in the party`);
    const rest = party.filter((s) => s.id !== locked), mean = rest.reduce((n, s) => n + (s.level ?? 1), 0) / rest.length;
    assert.equal(party.find((s) => s.id === locked)?.level, Math.floor(mean) - 1, `${locked} is at the others' average less one`);
    // The same four a real run would pick and fix up.
    assert.deepEqual(pickParty(id, party.map((s) => s.id)), party.map((s) => s.id));
  }
});

test('Hopper comes back to 5.1 at the level of the party he joins, less one, as Eleven does to 3.3, and nobody else catches up', () => {
  // Hopper left Kamchatka at Lv 5 (docs/level-10.md) and the others played 4.2 to 4.4.
  const known: PartySeed[] = [
    { id: 'mike', level: 10, xp: 40 }, { id: 'dustin', level: 9, xp: 120 }, { id: 'robin', level: 7, xp: 30 }, { id: 'nancy', level: 7, xp: 0 },
    { id: 'hopper', level: 5, xp: 77, bonus: { atk: 2 } },
  ];
  const picks: HeroId[] = ['mike', 'dustin', 'robin', 'hopper'];
  const party = partyFor('5.1', known, picks);
  assert.deepEqual(party.map((s) => s.id), picks);
  // Mike 10, Dustin 9 and Robin 7 average 8.67: he walks in at Lv 7 with no XP toward 8, and his d20 bonus carries.
  assert.deepEqual(party.find((s) => s.id === 'hopper'), { id: 'hopper', level: 7, xp: 0, bonus: { atk: 2 } });
  assert.deepEqual(party.find((s) => s.id === 'mike'), { id: 'mike', level: 10, xp: 40, bonus: undefined }, 'the others walk in as they are');
  assert.equal(party.find((s) => s.id === 'robin')?.level, 7);
  // A Hopper who is already ahead keeps his level and his XP.
  const ahead = known.map((s) => (s.id === 'hopper' ? { ...s, level: 9, xp: 15 } : s));
  assert.deepEqual(partyFor('5.1', ahead, picks).find((s) => s.id === 'hopper'), { id: 'hopper', level: 9, xp: 15, bonus: { atk: 2 } });
  // The picks panel shows him at the level he will play at, and in the pool at his own when the picks leave him out.
  assert.equal(poolFor('5.1', known, picks).find((s) => s.id === 'hopper')?.level, 7);
  assert.equal(partyFor('5.1', known, ['mike', 'dustin', 'robin', 'nancy']).find((s) => s.id === 'hopper')?.level, 7, 'locked in, so he is in whoever was picked');
  // 4.2 keeps its own rule: only Eddie catches up there, and Hopper is in nobody's party before 5.1.
  assert.deepEqual(partyFor('4.2', known, ['mike', 'dustin', 'robin', 'nancy']).map((s) => s.id).includes('hopper'), false);
});

test('Will comes back to 5.2 the same way: a Lv 4 Will from chapter 2 walks in at the party\'s average less one, and one who kept up keeps his level', () => {
  const known: PartySeed[] = [
    { id: 'mike', level: 10 }, { id: 'dustin', level: 9 }, { id: 'robin', level: 7 }, { id: 'will', level: 4, xp: 20 }, { id: 'hopper', level: 7 },
  ];
  const picks: HeroId[] = ['mike', 'dustin', 'robin', 'will'];
  assert.equal(partyFor('5.2', known, picks).find((s) => s.id === 'will')?.level, 7);
  assert.equal(partyFor('5.2', known.map((s) => (s.id === 'will' ? { ...s, level: 8 } : s)), picks).find((s) => s.id === 'will')?.level, 8);
  assert.deepEqual(partyFor('5.2', known, ['mike', 'dustin', 'robin', 'hopper']).map((s) => s.id), picks, 'Will takes Hopper\'s place on the way to 5.2');
  assert.equal(partyFor('5.1', known, ['mike', 'will', 'dustin', 'hopper']).find((s) => s.id === 'will')?.level, 4, 'Will catches up in 5.2 and nowhere else');
});

// ---------------------------------------------------------------- the map
test('5.1, 5.2 and 5.3 are on the map, in the Upside Down half below the horizon, with their places and a plate each', () => {
  assert.equal(MAP_PLACE['5.1'], 'lockdown');
  assert.equal(MAP_PLACE['5.2'], 'abyss');
  assert.equal(MAP_PLACE['5.3'], 'heart');
  assert.deepEqual(ORDER.slice(-3), ['5.1', '5.2', '5.3']);
  for (const id of ['5.1', '5.2', '5.3']) {
    const p = POS[id] as { x: number; y: number };
    assert.ok(p.y > hzAt(p.x) + 20 && p.y < BAND_Y - 20 && p.y > HZ, `${id} hangs well below the horizon`);
  }
  const done = Object.fromEntries(STAGE_ORDER.map((id) => [id, 'cleared' as const]));
  const names = paintLand(done).plates.map((p) => p.name);
  assert.ok(names.includes('LOCKDOWN') && names.includes('ABYSS') && names.includes('HEART'));
});

// ---------------------------------------------------------------- the foes and the effects
test('the five new foes are in the bestiary with starting numbers, and the shield carriers run the riot guard\'s brain', () => {
  const kinds: EnemyKind[] = ['trooper', 'agent5', 'commander', 'demofoe', 'twin'];
  for (const k of kinds) {
    const d = ENEMY_DEFS[k];
    assert.equal(d.kind, k);
    assert.ok(d.hp > 0 && d.atk > 0 && d.xp > 0 && d.speed > 0, k);
  }
  assert.equal(ENEMY_DEFS.commander.name, 'The Commander');
  assert.ok(ENEMY_DEFS.commander.hp >= 500 && ENEMY_DEFS.twin.hp >= 500, 'the two mini-bosses are boss sized');
  assert.ok(ENEMY_DEFS.trooper.hp > ENEMY_DEFS.agent5.hp);
  for (const k of kinds) assert.equal(isShieldedKind(k), k === 'trooper' || k === 'commander', k);
});

test('a stage with all five stand-ins runs: they walk, fight and show up in the view, and the Commander and the twins fill the boss bar', () => {
  for (const [kind, name] of [['commander', 'THE COMMANDER'], ['twin', 'THE TWINS'], ['trooper', null], ['agent5', null], ['demofoe', null]] as [EnemyKind, string | null][]) {
    const sim = createSim({
      ...simOptions(STAGE_52, stageGrid(STAGE_52), { party: defaultParty('5.2'), seed: 3, difficulty: 'chief' }),
      spawns: [{ kind: 'enemy', id: 'foe', type: kind, tx: 9, ty: 35, group: 'g' }],
    });
    for (let f = 0; f < 240; f++) sim.step(idle);
    const v = sim.view();
    const foe = v.actors.find((a: ActorView) => a.kind === 'enemy');
    assert.equal(foe?.id, kind, `${kind} is in the view`);
    assert.equal(v.hud.boss?.name ?? null, name, `${kind}: the boss bar`);
  }
});

test('the four new effects are playable sounds of their own, and the sound vocabulary names them', () => {
  const ids: SfxId[] = ['whistle', 'clang', 'shieldBreak', 'fall'];
  for (const id of ids) {
    assert.equal(SFX[id], SFX1415[id as keyof typeof SFX1415], `${id} is the one the game plays`);
    assert.ok(SFX[id].parts.length > 0 && LEVELS1415[id as keyof typeof LEVELS1415] > 0, id);
    for (const other of Object.keys(SFX) as SfxId[]) if (other !== id) assert.notDeepEqual(SFX[id].parts, SFX[other].parts, `${id} is a copy of ${other}`);
  }
});

test('the view can say a shield is broken or the Commander cracked, and a twin falling, climbing or the second one', () => {
  // The contract: these compile, and the sim and gfx build on them (types_view.ts).
  const v: ActorView = {
    kind: 'enemy', id: 'twin', x: 0, y: 0, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null,
    pose: 'fall', k: 0.5, second: true, broken: true, cracked: true,
  };
  const fx: FxView = { kind: 'fall', x: 0, y: 0, dir: 'down', angle: 0, t: 0, life: 48, w: 24, h: 24 };
  const poses: NonNullable<ActorView['pose']>[] = ['plant', 'flank', 'fall', 'climb'];
  assert.deepEqual([v.pose, fx.kind, v.second, v.broken, v.cracked], ['fall', 'fall', true, true, true]);
  assert.equal(new Set(poses).size, 4);
});

// ---------------------------------------------------------------- the stub stages
for (const [id, S, rows] of STAGES) {
  const kit = stageKit(S);
  const open = new Set<string>();
  const inRect = (r: TileRect, [x, y]: [number, number]): boolean => x >= r.tx && x < r.tx + r.w && y >= r.ty && y < r.ty + r.h;
  const clear = S.beats.find((b) => b.id === 'level_clear');

  test(`stage ${id}: the map is rectangular, uses only its own tiles, and is solid all round`, () => {
    assert.equal(S.rows, rows);
    const w = rows[0]?.length ?? 0;
    for (const [y, row] of rows.entries()) {
      assert.equal(row.length, w, `row ${y} is ${row.length} wide`);
      for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
    }
    const names = new Set([...rows.join('')].map((c) => (TILES[c] as { name: TileName }).name));
    const mine = id === '5.1' ? new Set<string>([...LOCKDOWN_TILES, 'labcap']) : new Set<string>(ABYSS_TILES);
    for (const n of names) assert.ok(mine.has(n), `${n} belongs to ${id}`);
    for (const n of mine) if (n !== 'abyssbridgev') assert.ok(names.has(n as TileName), `${id} uses ${n}`);
    assert.deepEqual([kit.grid.w, kit.grid.h], [w, rows.length]);
    for (let x = 0; x < kit.grid.w; x++) assert.ok(kit.grid.solid[x] && kit.grid.solid[(kit.grid.h - 1) * kit.grid.w + x], `the top and bottom edges are solid at ${x}`);
    for (let y = 0; y < kit.grid.h; y++) assert.ok(kit.grid.solid[y * kit.grid.w] && kit.grid.solid[y * kit.grid.w + kit.grid.w - 1], `the left and right edges are solid at ${y}`);
  });

  test(`stage ${id}: its id, name, light and music are the spec's, and the lights are a save point`, () => {
    assert.equal(S.id, id);
    assert.ok(S.name.length > 0 && S.name.length <= 20);
    assert.deepEqual([S.time, S.music, S.backdrop], id === '5.1' ? ['night', 'lab', undefined] : ['day', 'upside', 'abyss']);
    assert.deepEqual(S.waves, []);
    assert.ok(S.checkpoints.length >= 1);
    for (const cp of S.checkpoints) {
      const p = kit.props.find((q) => q.id === cp.prop);
      assert.ok(p && p.prop === 'lights', `${cp.prop} is a lights prop`);
      assert.equal(kit.grid.solid[kit.idx(...tileOf(cp.x, cp.y))], 0, 'a retry puts the party on floor');
    }
  });

  test(`stage ${id}: the start is on floor, the clear is reachable from it, and the bot's route walks there`, () => {
    assert.equal(kit.grid.solid[kit.idx(kit.startTx, kit.startTy)], 0);
    const seen = kit.flood(open);
    assert.ok(clear && 'rect' in clear.when);
    const rect = (clear as { when: { rect: TileRect } }).when.rect;
    assert.ok(rectTiles(rect).some(([x, y]) => seen[kit.idx(x, y)]), 'some tile of the clear is reachable');
    assert.ok(rectTiles(rect).every(([x, y]) => !kit.grid.solid[kit.idx(x, y)]), 'the clear is all floor');
    assert.ok(!inRect(rect, [kit.startTx, kit.startTy]), 'the stage does not start in its clear');
    const route = botRoute(S, kit);
    assert.equal(route.missing, null, `no path to waypoint ${route.missing}`);
    assert.ok(inRect(rect, tileOf((S.waypoints.at(-1) as { x: number; y: number }).x, (S.waypoints.at(-1) as { x: number; y: number }).y)), 'the last waypoint is inside the clear');
    // Every floor tile is on the one floor: the start and the clear are one piece.
    for (const [x, y] of rectTiles({ tx: 0, ty: 0, w: kit.grid.w, h: kit.grid.h })) if (!kit.grid.solid[kit.idx(x, y)]) assert.ok(seen[kit.idx(x, y)], `${x},${y} is floor nobody can reach`);
  });

  test(`stage ${id}: its beats name scripts that exist, in words that fit and have no em dashes, and the clear finishes the stage`, () => {
    assert.ok(S.beats.some((b) => b.id === 'start'));
    const said = S.beats.flatMap((b) => b.steps.flatMap((s) => (s.t === 'say' ? [s.script] : [])));
    assert.ok(said.length >= 2);
    for (const sid of said) {
      assert.ok(sid.startsWith(id === '5.1' ? 'l14_' : 'l15_'), sid);
      const script = SCRIPTS[sid];
      assert.ok(script && script.lines.length >= 1, `${sid} exists`);
      for (const l of script.lines) assert.ok(fitsBox(l.text) && !hasEmDash(l.text), `${sid}: ${l.text}`);
    }
    assert.ok(clear?.steps.some((s) => s.t === 'finish'));
    assert.equal(chapterOf(id), 5);
  });

  test(`stage ${id}: the bot clears it on HARD from every seed with the party a jump brings, nothing stuck`, () => {
    for (const seed of [1, 2, 3]) {
      const run = playStage(S, seed, defaultParty(id), 6000);
      assert.ok(run.done && !run.allDown, `seed ${seed}: ${run.frames} frames`);
      assert.ok(run.said.length >= 2, 'its words played');
    }
  });
}

test('the stand-in stages have no foes yet: the XP budgets and the spawns come with the builds', () => {
  for (const [, S] of STAGES) assert.equal(S.spawns.filter((s) => s.kind === 'enemy').length, 0);
});
