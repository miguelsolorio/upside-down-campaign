// The art of stage 4.2, the Hellfire Club and the Creel House (docs/level-11.md): Eddie in the Hellfire Club look as an actor of his own and his
// portrait, the Creel ghoul as the Glass wraith, the eighteen tiles of the club (in Storm) and the house (in Abandoned, with Blood red for
// memory) by day, by night and in the memory skin, the mirror and the clock, the riff, chime and walkman and the small glass, the clock of a
// curse and the d20 of a marked foe, the Creel House on the map, and the sheet pages. Pure pixel work, so Node runs it: sprites and tiles are Px
// buffers and the draw code uses the software canvas from canvas-helpers.ts, so import that first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, count, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import { EM_DASH } from '../src/core/text.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, AnimId, Dir, Expr, FxKind, PropKind, PropState } from '../src/core/types.ts';
import type { NodeState } from '../src/core/mapdata.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { EDDIE_KEYS, eddiePx, eddieRoles } from '../src/gfx/actor_eddie.ts';
import { ghoulPoseOf, ghoulPx } from '../src/gfx/actor_ghoul.ts';
import { clockPx } from '../src/gfx/actor_mark.ts';
import { EDDIE_PICK, EDDIE_PORTRAIT } from '../src/gfx/data/eddie.ts';
import { PORTRAITS } from '../src/gfx/data/portraits.ts';
import { fills, paintRoles, unmapped } from '../src/gfx/var/kit.ts';
import { GPOSES } from '../src/gfx/var/ghoul_kit.ts';
import { CLUB_TILES, clubTile, flameAt, windowPhase } from '../src/gfx/tile_club.ts';
import { CREEL_TILES, creelTile } from '../src/gfx/tile_creel.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { CREEL_OPTS, CREEL_ROOM } from '../src/gfx/var/creel.ts';
import { HELLFIRE_OPTS, HELLFIRE_ROOM } from '../src/gfx/var/hellfire.ts';
import { ctxAt } from '../src/gfx/var/look_kit.ts';
import type { Room, StageLook } from '../src/gfx/var/look_kit.ts';
import { creelHouse } from '../src/gfx/map_house.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';
import { LAND, LEGS, ORDER, POS, TOP_H } from '../src/gfx/map_geo.ts';
import { nightTile } from '../src/gfx/night.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor, drawHeroBar } = await import('../src/gfx/actors.ts');
const { drawPortrait } = await import('../src/gfx/ui.ts');
const { drawProp } = await import('../src/gfx/props.ts');
const { drawFx } = await import('../src/gfx/fx.ts');
const { bakeStage, drawStage, samplePx } = await import('../src/gfx/tiles.ts');
const { CLUB, HOUSE, L11_PAGES } = await import('../src/gfx/sheet_l11.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const src = (f: string): string => readFileSync(`${ROOT}${f}`, 'utf8');
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const view = (id: string, over: Partial<ActorView> = {}): ActorView => ({
  kind: 'hero', id: id as ActorView['id'], x: 20, y: 40, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const sprite = (v: ActorView, w = 48, h = 56): FakeCanvas => { const c = screen(w, h); drawActor(ctxOf(c), v); return c; };
const enemy = (id: string, over: Partial<ActorView> = {}): FakeCanvas => sprite(view(id, { kind: 'enemy', ...over }));
const face = (who: 'eddie' | 'steve', expr: Expr): FakeCanvas => { const c = screen(24, 24); drawPortrait(ctxOf(c), who, expr, 0, 0); return c; };
const opaque = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const colorsIn = (p: Px): number => new Set(p.d).size;
const REDS: ColorName[] = ['blood0', 'blood1', 'red', 'hot'];
const redsIn = (p: Px): number => p.d.filter((v) => REDS.some((n) => px32(n) === v)).length;
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const ANIMS: AnimId[] = ['idle', 'walk', 'attack', 'cast', 'dash', 'hurt', 'ko'];

// ---------------------------------------------------------------- Eddie
test('Eddie keeps to five fill colors and the ink outline in every frame of every facing, paints every role, and ends at the frame\'s top and sides in the outline, so the Flying V is never cut', () => {
  const pal = EDDIE_PICK.spec.pal, all: Px[] = [];
  for (const view of ['down', 'up', 'side'] as const) {
    for (const key of EDDIE_KEYS) {
      const roles = eddieRoles(view, key);
      assert.deepEqual(unmapped(roles, pal), [], `${view} ${key} has unpainted roles`);
      const px = paintRoles(roles, 28, pal);
      all.push(px);
      assert.ok(painted(Object.assign(screen(28, 22), { px: px.d.slice() })) > 120, `${view} ${key} is drawn`);
      const edge = (x: number, y: number): boolean => !px.get(x, y) || px.get(x, y) === px32('ink');
      for (let x = 0; x < 28; x++) assert.ok(edge(x, 0), `${view} ${key} is cut off at the top edge (${x})`);
      for (let y = 0; y < 22; y++) assert.ok(edge(0, y) && edge(27, y), `${view} ${key} is cut off at a side edge (${y})`);
    }
  }
  assert.ok(fills(...all) <= 5, `${fills(...all)} fill colors`);
  assert.equal(EDDIE_KEYS.length, 12);
});

test('Eddie is the owner\'s Hellfire Club pick, and every anim of every facing draws his own frames, not Steve\'s: idle breathes, the walk steps, the swing winds up and lands, the solo loops its two frames', () => {
  assert.equal(EDDIE_PICK.slug, 'hellfire');
  assert.equal(PORTRAITS.eddie, EDDIE_PORTRAIT);
  const steve = sprite(view('steve'));
  for (const dir of DIRS) {
    for (const anim of ANIMS) {
      const c = sprite(view('eddie', { dir, anim, t: 0 }));
      assert.ok(painted(c) > 120, `${dir} ${anim}`);
      assert.ok(!same(c, sprite(view('steve', { dir, anim, t: 0 }))), `${dir} ${anim} is not Steve`);
    }
  }
  assert.ok(!same(sprite(view('eddie')), steve));
  const at = (anim: AnimId, t: number, dir: Dir = 'right'): FakeCanvas => sprite(view('eddie', { anim, t, dir }));
  assert.ok(!same(at('idle', 0), at('idle', 30)) && same(at('idle', 0), at('idle', 60)), 'idle breathes every 30 frames');
  assert.equal(new Set([0, 7, 14, 21].map((t) => at('walk', t).px.join())).size, 3, 'the walk steps with one foot, stands, steps with the other and stands again');
  assert.ok(same(at('walk', 7), at('walk', 21)) && same(at('walk', 0), at('walk', 28)), 'and loops');
  assert.ok(!same(at('attack', 0), at('attack', 8)) && same(at('attack', 8), at('attack', 17)), 'the swing winds up for 8 frames and then lands');
  assert.ok(!same(at('cast', 0), at('cast', 8)) && same(at('cast', 0), at('cast', 16)) && same(at('cast', 8), at('cast', 24)), 'the solo loops its two frames while he plays');
  assert.ok(!same(at('hurt', 0), at('idle', 0)) && !same(at('ko', 0), at('idle', 0)) && same(at('dash', 0), at('walk', 0)));
  assert.ok(!same(at('idle', 0, 'left'), at('idle', 0, 'right')), 'left is the side view turned round');
  assert.ok(!same(at('walk', 0, 'down'), at('walk', 0, 'up')), 'front and back differ');
  assert.ok(count(sprite(view('eddie', { flash: 1 })), 'white') > 100 && count(sprite(view('eddie', { flash: 1 })), 'red') === 0, 'the hit flash is all white');
  // Feet on the line he stands on, whatever the frame: the lowest painted row is the one under y.
  for (const t of [0, 7, 30]) assert.ok(Math.abs(rows(at('walk', t))[1] - 40) <= 1, `feet at ${rows(at('walk', t))[1]}`);
});

test('Eddie\'s portrait is the pick on its dark red ground, with the tongue-out grin for the happy face, and the five other expressions all differ', () => {
  assert.equal(EDDIE_PORTRAIT.bg, 'blood1');
  const faces = (['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'] as Expr[]).map((e) => face('eddie', e));
  for (const f of faces) assert.equal(painted(f), 24 * 24);
  assert.equal(new Set(faces.map((f) => f.px.join())).size, 6, 'six faces, all different');
  assert.ok(count(faces[0] as FakeCanvas, 'blood1') > 30, 'on its dark red ground');
  assert.ok(count(faces[1] as FakeCanvas, 'white') >= count(faces[0] as FakeCanvas, 'white') + 4 && count(faces[1] as FakeCanvas, 'rose') >= 2, 'a wide grin with teeth and the tongue out for the happy face');
  assert.ok(!same(faces[1] as FakeCanvas, face('steve', 'happy')));
  assert.ok(!same(faces[0] as FakeCanvas, face('steve', 'neutral')), 'not Steve\'s');
  const bar = screen(48, 56);
  drawHeroBar(ctxOf(bar), view('eddie', { bar: { hp: 20, hpMax: 40 } }), 'leaf');
  const [top, bottom] = rows(bar);
  assert.ok(bottom < 40 - 12 && top >= 40 - 24, `his bar sits over his head: ${top} to ${bottom}`);
});

// ---------------------------------------------------------------- the ghoul
test('the ghoul is the Glass wraith in five fill colors and the ink outline, drawn from its own frames: rise is stepping out of the glass, walk the drift, attack the lunge, hurt and a shatter that thins away', () => {
  assert.equal(fills(...GPOSES.map((p) => ghoulPx(p))), 5);
  const g = (over: Partial<ActorView>): FakeCanvas => enemy('ghoul', { y: 44, ...over });
  assert.ok(!same(g({}), enemy('flayed', { y: 44 })) && painted(g({})) > 100, 'not the Flayed\'s sprite');
  assert.equal(ghoulPoseOf({ anim: 'idle', pose: 'rise', t: 2 }).pose, 'glass');
  assert.equal(ghoulPoseOf({ anim: 'idle', pose: 'rise', t: 20 }).pose, 'step');
  assert.ok(!same(g({ pose: 'rise', t: 20 }), g({ t: 0 })), 'stepping out is not standing');
  assert.equal(new Set([0, 8, 16, 24].map((t) => g({ anim: 'walk', t }).px.join())).size, 3, 'stand, drift A, stand, drift B');
  assert.ok(same(g({ anim: 'attack', t: 3 }), g({ anim: 'dash', t: 3 })), 'the wind-up and the lunge are one pose');
  assert.equal(ghoulPoseOf({ anim: 'attack', t: 0 }).pose, 'lunge');
  assert.equal(ghoulPoseOf({ anim: 'dash', t: 0 }).pose, 'lunge');
  assert.equal(ghoulPoseOf({ anim: 'hurt', t: 0 }).pose, 'hurt');
  assert.equal(ghoulPoseOf({ anim: 'ko', t: 0 }).pose, 'shatter');
  assert.ok(count(g({ flash: 1 }), 'white') > 60, 'a hit flashes it white');
  const left = [0, 12, 20, 30].map((t) => painted(g({ anim: 'ko', t })));
  assert.ok(left[0]! > left[1]! && left[1]! > left[2]! && left[2]! > left[3]! && left[3]! > 0, `the shatter thins away: ${left}`);
  assert.ok(count(g({ elite: true }), 'red') > 0 && count(g({ elite: true }), 'cyan') === 0 && count(g({}), 'cyan') > 0, 'an elite\'s cracks run red');
  const low = g({ z: 3 }), flat = g({ z: 0 });
  assert.equal(rows(low)[0], rows(flat)[0] - 3, 'z lifts it off the floor');
  assert.equal(rows(low)[1], rows(flat)[1], 'and leaves its shadow on it');
  assert.ok(!same(g({ dir: 'left', anim: 'walk', t: 24 }), g({ dir: 'right', anim: 'walk', t: 24 })), 'facing turns the frame round');
});

// ---------------------------------------------------------------- the tiles
const NAMES: TileName[] = [...CLUB_TILES, ...CREEL_TILES];
const NEARS: Near[] = [
  ...(['clubfloor', 'clubwall', 'clubcap', 'clubwindow', 'clubposter', 'dndtable', 'creelfloor', 'creelwall', 'creelcap', 'creelrug', 'creelwin', 'creelstairs', 'creelfurn'] as TileName[]).map(around),
  { n: 'clubcap', e: 'clubwindow', s: 'clubfloor', w: 'clubwall' }, { n: 'clubwindow', e: 'clubfloor', s: 'clubfloor', w: 'clubfloor' }, { n: 'creelcap', e: 'creelwin', s: 'creelfloor', w: 'creelwall' },
  { n: 'creelwall', e: 'creelfloor', s: 'creelfloor', w: 'creelrug' }, { n: 'creelstairs', e: 'creelfurn', s: 'creelstairs', w: 'creelfloor' },
];
const names = new Set(Object.values(TILES).map((t) => t.name));
const paintTile = (n: TileName, tx: number, ty: number, near: Near, blk?: TileCtx['blk']): { c: TileCtx; day: Px; night: Px; memory: Px } => {
  const c: TileCtx = { tx, ty, near, ...(blk ? { blk } : {}) };
  const day = (clubTile(n, c) ?? creelTile(n, c)) as Px;
  return { c, day, night: nightTile(day, n, c), memory: (creelTile(n, c, true) ?? day) as Px };
};

test('the eighteen 4.2 tiles are painted in place of the flat stand-ins: a drawing, not a fill and a frame, fully opaque by day, by night and in the memory skin', () => {
  assert.equal(NAMES.length, 18);
  for (const n of NAMES) {
    assert.ok(names.has(n), n);
    for (let i = 0; i < NEARS.length * 2; i++) {
      const { day, night, memory } = paintTile(n, 3 + i * 5, 2 + i * 3, NEARS[i % NEARS.length] as Near, n === 'dndtable' ? { ox: i % 3, oy: i & 1, w: 3, h: 2 } : undefined);
      for (const [what, p] of [['day', day], ['night', night], ['memory', memory], ['memory night', nightTile(memory, n, { tx: 0, ty: 0, near: around(n) })]] as [string, Px][]) {
        assert.ok(p.w === 16 && p.h === 16, `${n} is 16 by 16`);
        assert.ok(opaque(p), `${n} is opaque ${what} (${i})`);
        assert.ok(colorsIn(p) >= (n === 'clubcap' || n === 'creelcap' ? 1 : 3), `${n} is a drawing, not a fill and a frame (${what}): ${colorsIn(p)} colors`);
      }
    }
  }
  const tiles = src('src/gfx/tile_ch4.ts');
  assert.doesNotMatch(tiles, /FLAT|MEMORY|clubcap:|creelwall:/, 'the flat stand-ins are gone');
  assert.doesNotMatch(src('src/gfx/props.ts'), /Stand-ins until/, 'and the props\'');
  assert.doesNotMatch(src('src/gfx/data/portraits.ts'), /eddie: STEVE_PORTRAIT/, 'and Eddie\'s portrait');
  for (const n of NAMES) assert.ok(clubTile(n, { tx: 1, ty: 1, near: around(n) }) || creelTile(n, { tx: 1, ty: 1, near: around(n) }), `${n} has a painter`);
});

/** The sheet's room turned into the stage's tile characters, one letter at a time. */
const stageRows = (room: Room, legend: Record<string, string>): string[] => room.map.map((r) => [...r].map((c) => legend[c] as string).join(''));

test('the tiles are the owner\'s picks as drawn: baked, each one is what Storm, Abandoned and Blood red paint on the sheets', () => {
  const stormLook = HELLFIRE_OPTS.find((l) => l.slug === 'storm') as StageLook;
  const club = stageRows(HELLFIRE_ROOM, { '#': 'Ø', W: 'Ù', C: 'Ú', P: 'Û', w: 'Ü', D: 'Ý', S: 'ß', '.': 'à', d: 'á' });
  const house = stageRows(CREEL_ROOM, { '#': 'ã', W: 'ä', M: 'ä', m: 'ä', w: 'å', '.': 'æ', r: 'ç', x: 'è' });
  const same = (rowsOf: string[], room: Room, look: StageLook, skin: 'memory' | undefined, phase: number, skip: string): number => {
    const baked = (bakeStage(rowsOf, false, skin) as unknown as { canvas: FakeCanvas }).canvas;
    let checked = 0;
    for (let ty = 1; ty < room.map.length - 1; ty++) {
      for (let tx = 1; tx < 15; tx++) {
        if (skip.includes(room.map[ty]?.[tx] as string)) continue;
        const want = look.tile(ctxAt(room, tx, ty), phase).d;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(baked.px[(ty * 16 + y) * 256 + tx * 16 + x], want[y * 16 + x], `${look.name} ${room.map[ty]?.[tx]} at ${tx},${ty} (${x},${y})`);
        checked++;
      }
    }
    return checked;
  };
  assert.ok(same(club, HELLFIRE_ROOM, stormLook, undefined, 1, '') >= 60, 'the club\'s walls, board, posters, windows, door, shelf, floor and desks');
  assert.ok(same(house, CREEL_ROOM, CREEL_OPTS[1] as StageLook, undefined, 0, 'Mm') >= 70, 'the house in Abandoned');
  assert.ok(same(house, CREEL_ROOM, CREEL_OPTS[2] as StageLook, 'memory', 0, 'Mm') >= 70, 'and in Blood red');
});

test('whole rooms bake fully painted by day, by night and in the memory skin: the club and the house, and the memory skin only turns the house', () => {
  for (const [name, rowsOf] of [['club', CLUB], ['house', HOUSE]] as [string, string[]][]) {
    assert.equal(rowsOf.length, 12, name);
    for (const r of rowsOf) assert.equal([...r].length, 16, `${name} rows are 16 wide`);
    for (const [night, skin] of [[false, undefined], [true, undefined], [false, 'memory'], [true, 'memory']] as [boolean, 'memory' | undefined][]) {
      const b = bakeStage(rowsOf, night, skin) as unknown as { canvas: FakeCanvas };
      assert.equal(b.canvas.w, 256);
      assert.ok(b.canvas.px.every((v) => v >>> 24 === 255), `${name} ${night ? 'night' : 'day'} ${skin ?? ''} has no see-through pixel`);
    }
  }
  const px = (rowsOf: string[], skin?: 'memory'): number[] => [...(bakeStage(rowsOf, true, skin) as unknown as { canvas: FakeCanvas }).canvas.px];
  assert.deepEqual(px(CLUB, 'memory'), px(CLUB), 'the club bakes the same in the memory skin');
  assert.notDeepEqual(px(HOUSE, 'memory'), px(HOUSE), 'the house does not');
});

test('Blood red holds at night: the night pass leaves its reds alone, and every house tile is different in it than in Abandoned', () => {
  for (const n of CREEL_TILES) {
    const c: TileCtx = { tx: 6, ty: 5, near: around(n) };
    const old = creelTile(n, c) as Px, blood = creelTile(n, c, true) as Px;
    assert.notDeepEqual([...old.d], [...blood.d], `${n} differs in memory`);
    assert.equal(redsIn(nightTile(blood, n, c)), redsIn(blood), `${n}: the night pass keeps every red`);
  }
  for (const n of ['creelwall', 'creelwin', 'creelrug', 'creelfurn'] as TileName[]) {
    const c: TileCtx = { tx: 6, ty: 5, near: { n: 'creelcap', e: n, s: 'creelfloor', w: n } };
    assert.ok(redsIn(nightTile(creelTile(n, c, true) as Px, n, c)) >= 25, `${n} is red at night in memory`);
  }
  assert.ok(redsIn(creelTile('creelwall', { tx: 6, ty: 5, near: around('creelwall') }, true) as Px) > 4 * redsIn(creelTile('creelwall', { tx: 6, ty: 5, near: around('creelwall') }) as Px));
});

test('the club\'s pictures read their neighbors: a run of posters is the banner, the table is one picture over its block, its candles light their feet at night and sway in four steps', () => {
  const poster = (blk?: TileCtx['blk']): string => (clubTile('clubposter', { tx: 4, ty: 1, near: { n: 'clubcap', e: 'clubwall', s: 'clubfloor', w: 'clubwall' }, ...(blk ? { blk } : {}) }) as Px).d.join();
  const banner = [0, 1].map((ox) => poster({ ox, oy: 0, w: 2, h: 1 }));
  assert.ok(new Set([poster(), ...banner]).size === 3, 'a single poster, the left half and the right half of the banner differ');
  assert.ok(count(Object.assign(screen(16, 16), { px: (clubTile('clubposter', { tx: 4, ty: 1, near: around('clubposter'), blk: { ox: 0, oy: 0, w: 2, h: 1 } }) as Px).d }), 'blood1') > 5, 'the banner has its demon');
  const piece = (ox: number, oy: number, phase = 0): Px => clubTile('dndtable', { tx: 6 + ox, ty: 4 + oy, near: around('dndtable'), blk: { ox, oy, w: 5, h: 3 } }, phase) as Px;
  const grid = [0, 1, 2, 3, 4].flatMap((ox) => [0, 1, 2].map((oy) => piece(ox, oy)));
  assert.ok(new Set(grid.map((p) => p.d.join())).size >= 12, 'fifteen pieces of one picture, nearly all different');
  assert.ok(grid.filter(flameAt).length >= 5 && !flameAt(clubTile('clubfloor', { tx: 1, ty: 1, near: around('clubfloor') }) as Px), 'a flame in each corner of the cloth, one at the front, and nowhere else');
  assert.notEqual(piece(0, 0, 0).d.join(), piece(0, 0, 1).d.join(), 'the candles sway');
  assert.equal(new Set([0, 1, 2, 3].map((p) => piece(0, 0, p).d.join())).size, 4, 'in four steps');
  assert.equal(bakeStage(CLUB, true).windows.length, 5, 'five candle pools at night');
  assert.equal(bakeStage(CLUB, false).windows.length, 0, 'and none by day');
  const brick = (n: TileName): Px => nightTile(clubTile(n, { tx: 5, ty: 3, near: around(n) }) as Px, n, { tx: 5, ty: 3, near: around(n) });
  assert.ok(count(Object.assign(screen(16, 16), { px: brick('clubwall').d }), 'orange') === 0, 'nothing else on the club\'s walls is a flame');
});

test('the window has rain on its glass and lightning now and then, and the floor under it catches the flash; calm never flashes', () => {
  const glass = (phase: number): string => (clubTile('clubwindow', { tx: 7, ty: 1, near: { n: 'clubcap', e: 'clubwindow', s: 'clubfloor', w: 'clubwall' } }, phase) as Px).d.join();
  assert.equal(new Set([0, 1, 2, 3].map(glass)).size, 4, 'a flash and three steps of rain');
  const floor = (phase: number): string => (clubTile('clubfloor', { tx: 7, ty: 2, near: { n: 'clubwindow', e: 'clubfloor', s: 'clubfloor', w: 'clubfloor' } }, phase) as Px).d.join();
  assert.notEqual(floor(0), floor(1), 'the flash lights the floor under it');
  const flashes = Array.from({ length: 28 * 16 }, (_, t) => windowPhase(t)).filter((p) => p === 0).length;
  assert.ok(flashes > 20 && flashes < 60, `a double flash every 7 seconds: ${flashes} frames of 448`);
  assert.ok(Array.from({ length: 5000 }, (_, t) => windowPhase(t, true)).every((p) => p >= 1 && p <= 3), 'Reduce flashing keeps the rain and drops the lightning');
  // In a baked stage: the window is a pulse tile, drawn over the baked rain as the steps pass.
  const stage = bakeStage(CLUB, true);
  const crop = (t: number): string => { const c = screen(256, 224); drawStage(ctxOf(c), stage, 0, 0, t); const out: number[] = []; for (let y = 16; y < 48; y++) for (let x = 112; x < 144; x++) out.push(c.px[y * 256 + x] as number); return out.join(); };
  assert.notEqual(crop(16), crop(32), 'the rain moves and the bolt flashes');
  assert.equal(new Set([16, 48, 80, 112].map(crop)).size, 3, 'rain in three steps, then round again');
  const table = (t: number): string => { const c = screen(256, 224); drawStage(ctxOf(c), stage, 0, 0, t); const out: number[] = []; for (let y = 48; y < 96; y++) for (let x = 96; x < 176; x++) out.push(c.px[y * 256 + x] as number); return out.join(); };
  assert.notEqual(table(0), table(16), 'and the candles move in the stage');
});

test('the house reads its neighbors: the stairs are one flight with a runner down the middle and a post at each end, a run of furniture is one long piece, 1959 has a sofa where 1986 has a sheet', () => {
  const stairs = (near: Near, memory = false): string => (creelTile('creelstairs', { tx: 5, ty: 5, near }, memory) as Px).d.join();
  const flights = [{ n: 'creelstairs', e: 'creelfloor', s: 'creelstairs', w: 'creelfloor' }, { n: 'creelstairs', e: 'creelstairs', s: 'creelstairs', w: 'creelfloor' }, { n: 'creelstairs', e: 'creelstairs', s: 'creelstairs', w: 'creelstairs' }, { n: 'creelstairs', e: 'creelfloor', s: 'creelstairs', w: 'creelstairs' }] as Near[];
  assert.equal(new Set(flights.map((n) => stairs(n))).size, 4, 'one tile, the left end, the middle and the right end differ');
  const foot = (memory: boolean): string => stairs({ n: 'creelstairs', e: 'creelfloor', s: 'creelfloor', w: 'creelfloor' }, memory);
  assert.notEqual(foot(false), stairs({ n: 'creelstairs', e: 'creelfloor', s: 'creelstairs', w: 'creelfloor' }), 'the foot of a flight has its newel post');
  assert.notEqual(foot(false), foot(true), 'and the house in memory has its own');
  const furn = (near: Near, memory = false): string => (creelTile('creelfurn', { tx: 5, ty: 5, near }, memory) as Px).d.join();
  const one = { n: 'creelfloor', e: 'creelfloor', s: 'creelfloor', w: 'creelfloor' } as Near, run = { ...one, e: 'creelfurn' } as Near;
  assert.notEqual(furn(one), furn(run), 'a piece that goes on is not one on its own');
  assert.notEqual(furn(one), furn(one, true), 'and the sheet is a sofa in 1959');
  assert.ok(redsIn(creelTile('creelfurn', { tx: 5, ty: 5, near: run }, true) as Px) > 30 && redsIn(creelTile('creelfurn', { tx: 5, ty: 5, near: run }) as Px) < 5, 'red velvet, then grey');
  const hole = creelTile('creelhole', { tx: 5, ty: 5, near: around('creelhole') }) as Px;
  assert.ok(hole.d.filter((v) => v === px32('black')).length > 30, 'the hole is a hole');
});

// ---------------------------------------------------------------- props
const prop = (kind: PropKind, x: number, y: number, w: number, h: number, state: PropState, t = 0, k?: number) => ({ id: 'p', kind, x, y, w, h, state, t, ...(k === undefined ? {} : { k }) });
const propPx = (p: ReturnType<typeof prop>, night = false): FakeCanvas => { const c = screen(80, 64); drawProp(ctxOf(c), p, night); return c; };

test('the mirror shows the ghouls in its glass by k and shatters to an empty frame with shards, on a wall and across a doorway', () => {
  for (const w of [16, 32]) {
    const whole = (k: number, t = 0): FakeCanvas => propPx(prop('mirror', 16, 16, w, 16, 'closed', t, k)), broken = propPx(prop('mirror', 16, 16, w, 16, 'open'));
    assert.ok(painted(whole(1)) > 100 && painted(broken) > 40, `${w} wide`);
    assert.ok(!same(whole(1), whole(0)), 'a ghoul in the glass shows');
    assert.ok(!same(whole(1), broken), 'whole and shattered differ');
    assert.ok(count(whole(1), 'hot') > 0 && count(whole(0), 'hot') === 0, 'its eyes glow');
    if (w === 32) {
      assert.ok(!same(whole(1), whole(0.4)), 'two ghouls, then one');
      assert.equal(broken.px[(16 + 8) * 80 + 16 + 16], 0, 'the doorway of a shattered mirror is clear, for the party to walk through');
      assert.ok(whole(1).px[(16 + 8) * 80 + 16 + 16] !== 0, 'and glass while it is whole');
    }
    const [r0, r1] = rows(whole(1));
    assert.ok(r0 >= 16 && r1 < 32, `${w} stays inside its rectangle`);
    assert.ok(!same(propPx(prop('mirror', 16, 16, w, 16, 'closed', 0, 1), true), whole(1)), 'repainted for the night');
  }
});

test('the clock ticks whole and stands smashed once it is broken: a cracked face, the glass door open and the pendulum fallen', () => {
  const clock = (state: PropState, t = 0, night = false): FakeCanvas => propPx(prop('clock', 20, 8, 16, 32, state, t), night);
  assert.ok(painted(clock('closed')) > 250 && painted(clock('open')) > 250);
  assert.ok(!same(clock('closed'), clock('open')), 'smashed is not whole');
  assert.equal(new Set([0, 16, 32, 48].map((t) => clock('closed', t).px.join())).size, 3, 'the pendulum swings out, back, over and back');
  assert.ok(same(clock('open', 0), clock('open', 48)), 'a smashed one is still');
  assert.ok(count(clock('closed'), 'black') < count(clock('open'), 'black'), 'with its face and its door gone dark');
  const [r0, r1] = rows(clock('closed'));
  assert.ok(r0 >= 8 && r1 <= 40, 'on its 16 by 32 footprint');
  assert.ok(!same(clock('closed', 0, true), clock('closed')));
});

// ---------------------------------------------------------------- effects
const fx = (kind: FxKind, p: number, w: number, life: number, x = 40, y = 40): FakeCanvas => {
  const c = screen(120, 120);
  drawFx(ctxOf(c), { kind, x: x + 20, y: y + 20, dir: 'down', angle: 0, t: Math.round(p * life), life, w, h: w });
  return c;
};

test('riff is a sound ring that widens to w and thins to nothing, in the club\'s red and white', () => {
  for (const [w, life] of [[28, 14], [80, 18]] as [number, number][]) {
    const mid = fx('riff', 0.5, w, life), late = fx('riff', 0.95, w, life);
    assert.ok(painted(mid) > 30, `${w}`);
    assert.ok(painted(late) < painted(mid), 'it thins out');
    assert.equal(painted(mid), count(mid, 'white', 'cream', 'hot', 'red', 'blood1'), 'in the club\'s red and white only');
    const reach = (c: FakeCanvas): number => { let m = 0; c.px.forEach((v, i) => { if (v) m = Math.max(m, Math.hypot((i % 120) - 60, ((i / 120) | 0) - 60)); }); return m; };
    assert.ok(reach(fx('riff', 0.95, w, life)) > w / 2 - 4 && reach(fx('riff', 0.95, w, life)) < w / 2 + 8, `${w}: it ends about w across, ${reach(fx('riff', 0.95, w, life))}`);
    assert.ok(reach(fx('riff', 0.1, w, life)) < reach(fx('riff', 0.5, w, life)), 'and widens');
  }
  assert.ok(painted(fx('riff', 0.5, 80, 18)) > painted(fx('riff', 0.5, 28, 14)) * 2, 'a pulse of the solo is bigger than the swing\'s ring');
});

test('chime is a ring off the clock face and walkman is notes round Max, each different at every step of its life and gone at the end', () => {
  for (const [kind, w, life] of [['chime', 40, 30], ['walkman', 48, 60]] as [FxKind, number, number][]) {
    const steps = [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => fx(kind, p, w, life));
    assert.equal(new Set(steps.map((c) => c.px.join())).size, 5, `${kind} moves`);
    for (const c of steps) assert.ok(painted(c) > 6, kind);
    assert.ok(painted(steps[4] as FakeCanvas) < painted(steps[2] as FakeCanvas) + 40, `${kind} thins`);
  }
  assert.ok(count(fx('walkman', 0.5, 48, 60), 'pink', 'cyan', 'yellow', 'white', 'magenta', 'sky') > 20, 'the tape\'s colors');
  assert.ok(count(fx('chime', 0.5, 40, 30), 'bone', 'white', 'mist', 'cream') > 20, 'a bone ring');
});

test('the small glass is a burst of shards across w, in 16 and 32 px; the skylight\'s big one is still the skylight', () => {
  const extent = (c: FakeCanvas): [number, number] => [rows(c)[1] - rows(c)[0], c.px.reduce((m, v, i) => (v ? Math.max(m, Math.abs((i % 120) - 60)) : m), 0)];
  for (const w of [16, 32]) {
    const c = fx('glass', 0.4, w, 20);
    assert.ok(painted(c) > 10, `${w} draws`);
    assert.ok(extent(c)[0] < 40 && extent(c)[1] < 40, `${w} stays small: ${extent(c)}`);
    assert.ok(painted(fx('glass', 0.98, w, 20)) < painted(c) + 5);
  }
  const big = screen(256, 200);
  drawFx(ctxOf(big), { kind: 'glass', x: 128, y: 100, dir: 'down', angle: 0, t: 4, life: 40, w: 128, h: 0 });
  assert.ok(painted(big) > 100 && rows(big)[1] - rows(big)[0] > 40, 'the skylight, with its shafts');
});

// ---------------------------------------------------------------- the marks
test('a cursed hero wears the clock with its pips, the sounded ones red, over his head; a marked foe wears the d20; nothing else changes', () => {
  assert.deepEqual([clockPx(0).w, clockPx(0).h], [15, 17]);
  assert.deepEqual([0, 1, 2, 3].map((n) => clockPx(n).d.filter((v) => v === px32('red')).length), [0, 4, 8, 12], 'a red pip of 4 pixels for each chime sounded');
  assert.ok(count(Object.assign(screen(15, 17), { px: clockPx(2).d }), 'blood1') > 20 && count(Object.assign(screen(15, 17), { px: clockPx(2).d }), 'bone') > 20, 'a dark red rim round a bone face');
  const plain = sprite(view('mike')), cursed = (n: number): FakeCanvas => sprite(view('mike', { curse: n }));
  const head = rows(plain)[0];
  for (const n of [1, 2, 3]) {
    assert.ok(painted(cursed(n)) > painted(plain) + 100, `chime ${n}: the clock is drawn`);
    assert.ok(rows(cursed(n))[0] < head - 10 && rows(cursed(n))[1] === rows(plain)[1], 'over his head and nowhere else');
    assert.ok(!same(cursed(n), cursed(n + 1)), 'one more pip each chime');
  }
  assert.ok(painted(sprite(view('mike', { curse: 2, blink: true }))) === 0, 'a flicker hides it with him');
  const tall = (over: Partial<ActorView>): FakeCanvas => sprite(view('mike', { y: 60, curse: 1, ...over }), 48, 72);
  assert.equal(rows(tall({ z: 4 }))[0], rows(tall({}))[0] - 4, 'a hero lifted by the curse carries it up');
  const marked = enemy('ghoul', { y: 44, marked: true }), unmarked = enemy('ghoul', { y: 44 });
  assert.ok(painted(marked) > painted(unmarked) + 20 && count(marked, 'hot') > count(unmarked, 'hot'), 'the d20 is drawn over the foe');
  assert.ok(rows(marked)[0] < rows(unmarked)[0] - 5 && rows(marked)[1] === rows(unmarked)[1], 'above its head');
  const alert = enemy('ghoul', { y: 44, marked: true, alert: true, bar: { hp: 5, hpMax: 10 } });
  assert.ok(!same(alert, enemy('ghoul', { y: 44, alert: true, bar: { hp: 5, hpMax: 10 } })) && count(alert, 'hot') > 0, 'beside the "!" and over the bar');
  assert.ok(same(sprite(view('mike', { marked: false })), plain));
});

// ---------------------------------------------------------------- the map
const states = (s: NodeState): Record<string, NodeState> => Object.fromEntries(ORDER.map((id) => [id, id === '4.2' ? s : 'cleared']));
const count5 = (px: Px, x0: number, y0: number, x1: number, y1: number, ns: ColorName[]): number => { const set = new Set(ns.map((n) => px32(n))); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (set.has(px.get(x, y))) n++; return n; };

test('the Creel House stands on its hill at the edge of Hawkins with its plate and its node, dark with one window lit when open and in greys when locked', () => {
  const house = creelHouse(), box: [number, number, number, number] = [LAND.creel.x - 24, LAND.creel.base - 26, LAND.creel.x + 24, LAND.creel.base + 2];
  assert.ok(house.w <= 50 && house.h <= 28 && painted(Object.assign(screen(house.w, house.h), { px: house.d })) > 600, 'a bold shape about 48 px wide');
  const open = paintLand(states('open')), shut = paintLand(states('locked'));
  const dark: ColorName[] = ['night', 'shadow', 'dusk', 'ink'], lit: ColorName[] = ['amber', 'yellow'];
  assert.ok(count5(open.px, ...box, dark) > 250, `the house is the darkest thing in the sky: ${count5(open.px, ...box, dark)}`);
  assert.ok(count5(open.px, ...box, lit) >= 4, 'one window lit');
  assert.equal(count5(shut.px, ...box, lit) + count5(shut.px, ...box, ['night', 'shadow', 'dusk']), 0, 'in greys when its stage is locked');
  const plate = open.plates.find((p) => p.name === 'CREEL HOUSE');
  assert.ok(plate && plate.state === 'open' && plate.point === 'down' && plate.ud === false, 'a CREEL HOUSE plate over the roof');
  assert.equal(shut.plates.find((p) => p.name === 'CREEL HOUSE')?.state, 'locked');
  assert.ok(plate!.y > TOP_H + 4 && Math.abs(plate!.cx - LAND.creel.x) <= 2, 'clear of the top bar, over the house');
  const r = plateRect(plate!);
  for (const o of open.plates) if (o !== plate) { const q = plateRect(o); assert.ok(r.x1 <= q.x0 || q.x1 <= r.x0 || r.y1 <= q.y0 || q.y1 <= r.y0, `clear of ${o.name}`); }
  const n = POS['4.2'] as { x: number; y: number };
  assert.ok(Math.abs(n.x - LAND.creel.x) <= 6 && n.y > LAND.creel.base && n.y - LAND.creel.base <= 14, 'node 4.2 is in front of the house');
  assert.ok(count5(open.px, 135, 52, 165, 79, ['soil2', 'soil1', 'blood1', 'blood0']) > 150, 'the school beside it is untouched');
  const leg = LEGS[ORDER.indexOf('4.1')] as (typeof LEGS)[number], last = leg.pts[leg.pts.length - 1] as [number, number];
  assert.ok(Math.hypot(last[0] - n.x, last[1] - n.y) < 1e-6, 'the leg from the Kamchatka inset ends on it');
  assert.ok(leg.len > 120, 'a long flight');
});

// ---------------------------------------------------------------- the sheet
test('the sheet has Eddie, the ghoul, the club, the house in both skins and the new effects, each page painting on every sub page and at several times', () => {
  assert.deepEqual(L11_PAGES.map((p) => p.title), ['EDDIE: HELLFIRE CLUB', 'CREEL GHOUL: GLASS WRAITH', 'THE HELLFIRE CLUB', 'THE CREEL HOUSE', 'CHAPTER 4 EFFECTS']);
  assert.deepEqual(L11_PAGES.map((p) => p.subs), [5, 2, 2, 4, 2]);
  for (const page of L11_PAGES) {
    for (let sub = 0; sub < page.subs; sub++) {
      for (const t of [0, 45, 300]) {
        const c = screen(256, 224);
        page.draw(ctxOf(c), t, sub);
        assert.ok(painted(c) > 5000, `${page.title} ${sub} at ${t}`);
      }
    }
  }
  assert.match(src('src/gfx/sheet.ts'), /\.\.\.L11_PAGES/);
  assert.ok(new Set(DIRS.map((_, sub) => { const c = screen(256, 224); (L11_PAGES[0] as (typeof L11_PAGES)[number]).draw(ctxOf(c), 0, sub); return c.px.join(); })).size === 4, 'each facing is its own page');
});

test('the new files stay under 500 lines with no em dashes', () => {
  for (const f of [
    'src/gfx/actor_eddie.ts', 'src/gfx/actor_ghoul.ts', 'src/gfx/actor_mark.ts', 'src/gfx/actors.ts', 'src/gfx/data/eddie.ts', 'src/gfx/data/portraits.ts', 'src/gfx/tile_club.ts', 'src/gfx/tile_creel.ts',
    'src/gfx/tile_ch4.ts', 'src/gfx/tiles.ts', 'src/gfx/night.ts', 'src/gfx/props_ch4.ts', 'src/gfx/props.ts', 'src/gfx/fx_ch4.ts', 'src/gfx/fx.ts', 'src/gfx/map_house.ts', 'src/gfx/map_land.ts',
    'src/gfx/map_geo.ts', 'src/gfx/sheet_l11.ts', 'src/gfx/sheet.ts', 'src/gfx/var/eddie_kit.ts', 'tests/art-ch4b.test.ts', 'tests/art-ch4a.test.ts',
  ]) {
    const text = src(f);
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
});
