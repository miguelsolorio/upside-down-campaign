// The art of stage 4.4, Vecna's lair (docs/level-13.md): the Creel House's Upside Down skin (the rooms rotted and overgrown, red veins that pulse, a window
// that flashes red, spores), the five attic tiles in Vine nest with the knot of vines and the roots laid over the baked stage, Vecna as an actor of his own
// (Rooted, ten poses, the tendrils a layer of eight frames under every one, float over his shadow at his z) and his portrait, the memory orb standing,
// marked and severed, the debris, the whip and the blaze, the lair on the map with its plate, and the sheet pages. Pure pixel work, so Node runs it:
// sprites and tiles are Px buffers and the draw code uses the software canvas from canvas-helpers.ts, so import that first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, count, cols, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import { EM_DASH } from '../src/core/text.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, Expr, FxView } from '../src/core/types.ts';
import type { NodeState } from '../src/core/mapdata.ts';
import { hash2, px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { topRow } from '../src/gfx/actor_kit.ts';
import { ORB_H, orbLookOf, orbPx } from '../src/gfx/actor_orb.ts';
import { TENDRIL_TICKS, VECNA_H, VECNA_W, WRITHE, bodyPx, tendrilOf, tendrilsPx, vecnaPoseOf, vecnaPx } from '../src/gfx/actor_vecna.ts';
import { BILLY_PORTRAIT } from '../src/gfx/data/portraits_l9.ts';
import { PORTRAITS } from '../src/gfx/data/portraits.ts';
import { fills } from '../src/gfx/var/kit.ts';
import { ATTIC_ROOM } from '../src/gfx/var/attic.ts';
import { ATTIC_A } from '../src/gfx/var/attic_a.ts';
import { GAME_POSES, POSE_ORDER } from '../src/gfx/var/vecna_kit.ts';
import { ctxAt } from '../src/gfx/var/look_kit.ts';
import { nightTile } from '../src/gfx/night.ts';
import { ATTIC_TILES, ORB_AT, atticNear, eaveWest, lairLayers } from '../src/gfx/tile_attic.ts';
import { CREEL_TILES, creelNear, creelTile, upsidePulses } from '../src/gfx/tile_creel.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { udTile } from '../src/gfx/tile_ud.ts';
import { lair } from '../src/gfx/map_lair.ts';
import { HZ, LAND, LEGS, ORDER, POS, hzAt } from '../src/gfx/map_geo.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');
const { drawPortrait } = await import('../src/gfx/ui.ts');
const { drawFx } = await import('../src/gfx/fx.ts');
const { drawProp } = await import('../src/gfx/props.ts');
const { bakeStage, drawStage } = await import('../src/gfx/tiles.ts');
const { HOUSE } = await import('../src/gfx/sheet_l11.ts');
const { ATTIC, L13_PAGES } = await import('../src/gfx/sheet_l13.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const src = (f: string): string => readFileSync(`${ROOT}${f}`, 'utf8');
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const opaque = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const colorsIn = (p: Px): number => new Set(p.d).size;
const REDS: ColorName[] = ['blood0', 'blood1', 'red', 'hot', 'pink'];
const redsIn = (p: Px): number => p.d.filter((v) => REDS.some((n) => px32(n) === v)).length;
const differ = (a: Px, b: Px): number => a.d.reduce((n, v, i) => n + (v !== b.d[i] ? 1 : 0), 0);
const letters = (names: TileName[]): string => Object.entries(TILES).filter(([, d]) => names.includes(d.name)).map(([ch]) => ch).join('');
const nameOf = (ch: string): TileName => (TILES[ch] as { name: TileName }).name;

const NEARS: Near[] = [
  ...(['creelfloor', 'creelwall', 'creelcap', 'creelrug', 'atticfloor', 'atticwall', 'atticroof', 'atticeave'] as TileName[]).map(around),
  { n: 'creelcap', e: 'creelwin', s: 'creelfloor', w: 'creelwall' }, { n: 'atticwall', e: 'atticfloor', s: 'atticfloor', w: 'atticeave' }, { n: 'atticroof', e: 'atticeave', s: 'atticeave', w: 'atticroof' },
];
const paint = (n: TileName, i: number, skin: 'upside' | undefined, phase?: number): { c: TileCtx; day: Px; night: Px } => {
  const c: TileCtx = { tx: 3 + i * 5, ty: 2 + i * 3, near: NEARS[i % NEARS.length] as Near };
  const day = (ATTIC_TILES.includes(n) ? udTile(n, c) : creelTile(n, c, skin, phase)) as Px;
  return { c, day, night: nightTile(day, n, c) };
};

// ---------------------------------------------------------------- the attic
test('the five attic tiles are painted in Vine nest in place of the flat stand-ins: a drawing, not a fill and a frame, fully opaque by day and by night', () => {
  assert.equal(ATTIC_TILES.length, 5);
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of ATTIC_TILES) {
    assert.ok(names.has(n), n);
    for (let i = 0; i < 40; i++) {
      const { day, night } = paint(n, i, undefined);
      for (const [what, p] of [['day', day], ['night', night]] as [string, Px][]) {
        assert.ok(p.w === 16 && p.h === 16, `${n} is 16 by 16`);
        assert.ok(opaque(p), `${n} is opaque ${what} (${i})`);
        assert.ok(colorsIn(p) >= 3, `${n} is a drawing (${what}): ${colorsIn(p)} colors`);
      }
    }
  }
  const stub = src('src/gfx/tile_ud.ts');
  assert.doesNotMatch(stub, /FLAT|'blood0'/, 'the flat stand-ins are gone from the hook');
  assert.match(stub, /atticTile/);
  assert.ok(!same(Object.assign(screen(16, 16), { px: paint('atticfloor', 3, undefined).day.d }), Object.assign(screen(16, 16), { px: paint('atticrug', 3, undefined).day.d })));
});

test('each attic tile is what Vine nest paints on the sheet, baked in the stage\'s own neighbors with a roof column either side of the room', () => {
  const look = ATTIC_A[0] as (typeof ATTIC_A)[number], room = ATTIC_ROOM;
  const NAME: Record<string, string> = { '#': 'Ć', W: 'ć', '.': 'Ĉ', r: 'ĉ', '<': 'Ċ', '>': 'Ċ' };
  const stage = room.map.map((r) => `Ć${[...r].map((ch) => NAME[ch]).join('')}Ć`);
  const w = 18 * 16, b = bakeStage(stage, true, 'upside') as unknown as { canvas: FakeCanvas };
  const block = (tx: number, ty: number): number[] => { const out: number[] = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.push(b.canvas.px[(ty * 16 + y) * w + tx * 16 + x] as number); return out; };
  let checked = 0;
  for (let ty = 0; ty < room.map.length; ty++) {
    for (let tx = 1; tx <= 16; tx++) {
      const ch = room.map[ty]?.[tx - 1] as string, n = nameOf(NAME[ch] as string);
      const want = look.tile({ ...ctxAt(room, tx - 1, ty), tx, ty, v: hash2(tx, ty, 11) & 3 }, 0);
      assert.deepEqual(block(tx, ty), [...nightTile(want, n, { tx, ty, near: around(n) }).d], `${ch} at ${tx},${ty}`);
      checked++;
    }
  }
  assert.equal(checked, 160);
});

test('a roof with roof above it is the wall\'s face and not a second ridge, an eave finds the wall it runs along, and the room\'s own tiles come out at their best on the sheet', () => {
  const at = (n: TileName, near: Partial<Near>, tx = 7, ty = 5): Px => udTile(n, { tx, ty, near: { ...around(n), ...near } }) as Px;
  assert.ok(differ(at('atticroof', { n: 'atticroof' }), at('atticroof', { n: 'atticfloor' })) >= 60, 'the ridge is only on the top row');
  assert.ok(same(Object.assign(screen(16, 16), { px: at('atticroof', { n: 'atticroof' }).d }), Object.assign(screen(16, 16), { px: at('atticwall', {}).d })) || differ(at('atticroof', { n: 'atticroof' }), at('atticwall', {})) <= 40, 'a stacked roof tile is the knee wall\'s kind of tile');
  assert.ok(differ(at('atticroof', { n: 'atticroof' }, 4, 0), at('atticroof', { n: 'atticroof' }, 4, 3)) >= 60, 'the first row of a stage is a ridge whatever is "above" it');
  assert.ok(differ(at('atticeave', { w: 'atticroof', e: 'atticeave' }), at('atticeave', { w: 'atticeave', e: 'atticroof' })) >= 40, 'the west eave and the east one differ');
  const row = (xs: string): TileName => nameOf(xs);
  const names = [...'ĆĊĊĊĈĈĈĈĈĈĈĊĊĊĆ'].map(row), at2 = (x: number): TileName | '' => (x < 0 || x >= names.length ? '' : (names[x] as TileName));
  assert.deepEqual([1, 2, 3, 11, 12, 13].map((x) => eaveWest((xx) => at2(xx), x, 0)), [true, true, true, false, false, false], 'a run of eaves belongs to the wall at its end');
  assert.equal(eaveWest((x) => (x === 0 ? 'atticfloor' : x === 1 ? 'atticeave' : 'atticfloor'), 1, 0), true, 'an eave with floor on both sides goes to the nearer end');
  for (const n of ATTIC_TILES) for (let v = 0; v < 3; v++) assert.ok(udTile(n, { tx: 5 + v * 3, ty: 4 + v * 7, near: atticNear(n, v, around(n)) }), `${n} ${v}`);
});

test('the vines hang into a knot over the rug and the roots run to his feet, as laid over the baked stage: they sway in four steps and are drawn at the stage\'s step', () => {
  const names = [...ATTIC.join('')].map(nameOf);
  const layers = lairLayers(names, 18);
  assert.deepEqual(layers.map((l) => l.id), ['roots', 'knot']);
  for (const l of layers) {
    const steps = [0, 1, 2, 3].map((p) => l.draw(p));
    assert.equal(new Set(steps.map((p) => p.d.join())).size, 4, `${l.id} moves in four steps`);
    assert.ok(redsIn(steps[0] as Px) > 400, `${l.id} is drawn in reds`);
    assert.equal(steps[0]?.d.join(), l.draw(4).d.join(), 'and comes round');
  }
  const knot = layers[1] as (typeof layers)[number], rugTop = 4 * 16, rugCx = 9 * 16;
  assert.equal(knot.x, rugCx - 128, 'the knot is centered on the rug');
  assert.equal(knot.y, rugTop - 64, 'and starts 64 px over its top edge');
  assert.ok((knot.draw(0).d as Uint32Array).slice(0, 256).some((v) => v), 'the vines hang from the first row');
  assert.deepEqual(lairLayers(names.map((n) => (n === 'atticrug' ? 'atticfloor' : n)), 18), [], 'no rug, no knot');
  assert.equal(ORB_AT.x + ORB_AT.top + ORB_AT.bottom, 38);
  const frame = (key: string, rowsOf: string[], t: number): FakeCanvas => { const c = screen(288, 160); drawStage(ctxOf(c), bakeStage(rowsOf, true, key === 'plain' ? undefined : 'upside'), 0, 0, t); return c; };
  const topRed = (c: FakeCanvas): number => { let n = 0; for (let y = 32; y < 96; y++) for (let x = 100; x < 190; x++) if (REDS.some((r) => px32(r) === c.px[y * 288 + x])) n++; return n; };
  assert.ok(topRed(frame('lair', ATTIC, 0)) > topRed(frame('plain', ATTIC, 0)) + 300, 'the knot hangs over the middle of the baked attic');
  assert.ok(!same(frame('lair', ATTIC, 0), frame('lair', ATTIC, 16)) && !same(frame('lair', ATTIC, 16), frame('lair', ATTIC, 32)), 'and sways');
  const rugOnly = (c: FakeCanvas): number => count(c, 'hot');
  assert.ok(rugOnly(frame('lair', ATTIC, 0)) > 0);
});

// ---------------------------------------------------------------- the house in the Upside Down
test('the Upside Down skin paints the Creel House\'s letters rotted and overgrown, differing from Abandoned on every one but the dark top of the wall, with more red, opaque by day and by night', () => {
  let different = 0;
  for (const n of CREEL_TILES) {
    let upRed = 0, oldRed = 0;
    for (let i = 0; i < 12; i++) {
      const old = paint(n, i, undefined), up = paint(n, i, 'upside');
      for (const [what, p] of [['day', up.day], ['night', up.night]] as [string, Px][]) {
        assert.ok(opaque(p), `${n} upside is opaque ${what} (${i})`);
        assert.ok(n === 'creelcap' || colorsIn(p) >= 4, `${n} upside is a drawing (${what})`);
      }
      if (n !== 'creelcap') {
        assert.ok(differ(up.day, old.day) >= 30, `${n} differs from Abandoned (${differ(up.day, old.day)} px)`);
        upRed += redsIn(up.night); oldRed += redsIn(old.night);
        assert.equal(redsIn(up.night), redsIn(up.day), 'the night pass keeps every red');
      } else assert.ok(opaque(up.night));
      different++;
    }
    // The rug is the exception: Abandoned's is already a red one, and the Upside Down's is dark with the veins across it.
    if (n !== 'creelcap' && n !== 'creelrug') assert.ok(upRed > oldRed + 20, `${n} has more red in the Upside Down (${upRed} against ${oldRed})`);
    if (n === 'creelrug') assert.ok(upRed > 200, `the rug is dark with red veins (${upRed})`);
  }
  assert.equal(different, 8 * 12);
  assert.ok(!same(Object.assign(screen(16, 16), { px: paint('creelwin', 2, 'upside').day.d }), Object.assign(screen(16, 16), { px: paint('creelwin', 2, 'upside', 0).day.d })), 'the window\'s flash is another step of it');
  const rot = (n: TileName, i: number): number => redsIn(paint(n, i, 'upside').day);
  assert.ok(rot('creelwall', 1) > 20 && rot('creelfloor', 0) > 30 && rot('creelrug', 0) > 40, 'vines up the wall, veins over the boards and the rug');
  assert.ok(redsIn(paint('creelstairs', 4, 'upside').day) > redsIn(paint('creelstairs', 4, undefined).day) + 8 && redsIn(paint('creelfurn', 4, 'upside').day) > 12, 'a vine up the stairs and round the sheets');
  assert.ok(!same(Object.assign(screen(16, 16), { px: paint('creelfurn', 4, 'upside').day.d }), Object.assign(screen(16, 16), { px: creelTile('creelfurn', paint('creelfurn', 4, undefined).c, true)!.d })), 'not Blood red\'s velvet either');
  assert.deepEqual(CREEL_TILES.filter((n) => upsidePulses(n, 4)), ['creelwin', 'creelfloor', 'creelrug', 'creelhole'], 'the tiles that move');
  assert.ok(!upsidePulses('creelfloor', 5) && !upsidePulses('creelwall', 4), 'the veins are on the even rows and the walls stand still');
});

test('the house bakes fully painted by day and by night in the Upside Down, its window flashes red and its veins pulse at their steps, and the other skins stay still', () => {
  for (const night of [false, true]) {
    const b = bakeStage(HOUSE, night, 'upside') as unknown as { canvas: FakeCanvas; pulses: { name: TileName }[] };
    assert.ok(b.canvas.px.every((v) => v >>> 24 === 255), `${night ? 'night' : 'day'} has no see-through pixel`);
    const kinds = new Set(b.pulses.map((p) => p.name));
    assert.ok(kinds.has('creelwin') && kinds.has('creelfloor') && kinds.has('creelhole'), 'the window, the boards and the hole pulse');
  }
  const baked = bakeStage(HOUSE, true, 'upside');
  const frame = (t: number): FakeCanvas => { const c = screen(256, 192); drawStage(ctxOf(c), baked, 0, 0, t); return c; };
  assert.ok(!same(frame(0), frame(16)) && !same(frame(16), frame(32)) && !same(frame(32), frame(48)), 'the stage moves from step to step');
  assert.ok(count(frame(0), 'hot') > count(frame(48), 'hot') + 8, 'the window flashes (step 0) and then goes back to red glass');
  for (const skin of [undefined, 'memory'] as const) {
    const b = bakeStage(HOUSE, true, skin) as unknown as { pulses: { name: TileName }[] };
    assert.ok(!b.pulses.some((p) => p.name === 'creelwin' || p.name === 'creelfloor'), `${skin ?? 'Abandoned'} does not pulse`);
  }
  const still = bakeStage(HOUSE, true, 'upside') as unknown as { canvas: FakeCanvas };
  const plain = bakeStage(HOUSE, true) as unknown as { canvas: FakeCanvas };
  assert.notDeepEqual([...still.canvas.px], [...plain.canvas.px], 'it is another house than Abandoned');
  const mixed = Array.from({ length: 12 }, (_, y) => Array.from({ length: 20 }, (_, x) => (letters([...CREEL_TILES, ...ATTIC_TILES])[hash2(x, y, 5) % 13] as string)).join(''));
  for (const night of [false, true]) assert.ok((bakeStage(mixed, night, 'upside') as unknown as { canvas: FakeCanvas }).canvas.px.every((v) => v >>> 24 === 255), 'any mix of the thirteen bakes without a gap');
  const attic = (id: string): FakeCanvas => { const c = screen(40, 40); drawProp(ctxOf(c), { id, kind: 'clock', x: 4, y: 2, w: 16, h: 32, state: 'closed', t: 0 }, true); return c; };
  assert.ok(!same(attic('clock_attic'), attic('clock')) && count(attic('clock_attic'), 'red') > count(attic('clock'), 'red'), 'the attic\'s clock is Vecna\'s, with a vine up its trunk');
});

// ---------------------------------------------------------------- Vecna
const view = (id: string, over: Partial<ActorView> = {}): ActorView => ({
  kind: 'enemy', id: id as ActorView['id'], x: 32, y: 96, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const sprite = (v: ActorView, w = 64, h = 112): FakeCanvas => { const c = screen(w, h); drawActor(ctxOf(c), v); return c; };
const vc = (over: Partial<ActorView> = {}): FakeCanvas => sprite(view('vecna', over));
const noShadow = (c: FakeCanvas): FakeCanvas => Object.assign(screen(c.w, c.h), { px: c.px.map((v) => (v === px32('black') ? 0 : v)) });

test('Vecna keeps to five fill colors and the ink outline in all ten poses and every step of his tendrils, with no fire in his frames', () => {
  assert.equal(GAME_POSES.length, 10);
  const all: Px[] = [];
  for (const p of GAME_POSES) for (let f = 0; f < WRITHE; f += 3) { const px = vecnaPx(p, f); assert.deepEqual([px.w, px.h], [VECNA_W, VECNA_H], p); all.push(px); }
  assert.deepEqual([VECNA_W, VECNA_H], [36, 61]);
  assert.equal(fills(...all), 5, 'grey, dark grey, bone, red and dark red');
  for (const n of ['orange', 'amber', 'yellow'] as ColorName[]) assert.ok(all.every((p) => !p.d.includes(px32(n))), `no ${n}: the fire is the blaze effect`);
  const sheetPoses = new Set(POSE_ORDER);
  assert.ok(GAME_POSES.slice(0, 8).every((p) => sheetPoses.has(p)) && GAME_POSES.slice(8).join() === 'walkB,stun', 'the sheet\'s eight, the walk\'s other step and the stun');
  assert.equal(new Set(GAME_POSES.map((p) => vecnaPx(p, 0).d.join())).size, 10, 'ten different frames');
});

test('his tendrils are a layer of their own that loops eight frames under every body frame: the body never moves, the tendrils always do', () => {
  assert.equal(WRITHE, 8);
  for (const p of GAME_POSES) {
    const layer = Array.from({ length: WRITHE }, (_, f) => tendrilsPx(p, f).d.join());
    assert.equal(new Set(layer).size, 8, `${p}: eight different frames of the layer`);
    assert.equal(tendrilsPx(p, 8).d.join(), layer[0], `${p}: and the loop comes round`);
    assert.equal(new Set(Array.from({ length: WRITHE }, (_, f) => vecnaPx(p, f).d.join())).size, 8, `${p}: so the whole frame moves in all eight`);
    const body = bodyPx(p), whole = vecnaPx(p, 3);
    for (let y = 0; y < VECNA_H; y++) for (let x = 0; x < VECNA_W; x++) { const b = body.get(x, y); if (b) assert.equal(whole.get(x, y), b, `${p}: the body is over the tendrils at ${x},${y}`); }
  }
  assert.ok(fills(...Array.from({ length: WRITHE }, (_, f) => tendrilsPx('stand', f))) === 1 && tendrilsPx('stand', 0).d.includes(px32('blood1')), 'dark red, nothing else');
  assert.ok(differ(tendrilsPx('burn', 0), tendrilsPx('stand', 0)) > 8, 'they grow from the shoulders, so they follow the pose');
  assert.ok(painted(Object.assign(screen(36, 16), { px: tendrilsPx('stand', 0).d.slice(0, 16 * 36) })) > 8, 'they rise into the rows of headroom over his head');
  assert.deepEqual([0, 5, 6, 47, 48].map((t) => tendrilOf({ t })), [0, 0, 1, 7, 0]);
  assert.equal(TENDRIL_TICKS, 6);
  const at = (t: number, over: Partial<ActorView> = {}): FakeCanvas => vc({ t, ...over });
  assert.ok(!same(at(0), at(6)) && same(at(0), at(48)), 'in the game they step with the view\'s t and loop in 48 frames');
  for (const over of [{ pose: 'float' as const, z: 12 }, { pose: 'burn' as const }, { anim: 'walk' as const }, { pose: 'stun' as const }]) assert.ok(!same(at(0, over), at(12, over)) || over.anim === 'walk', `they writhe in ${JSON.stringify(over)} too`);
});

test('he does nine things from the sim\'s views: stand, a slow walk on two feet, the curse, the whip, the float, the throw, the burn, the stun and a hurt flinch, and his KO is the stun thinning away', () => {
  const ask = (over: Partial<ActorView>): string => vecnaPoseOf({ anim: 'idle', pose: undefined, t: 0, ...over }).pose;
  assert.equal(ask({}), 'stand');
  assert.deepEqual([0, 16, 32, 48, 64].map((t) => ask({ anim: 'walk', t })), ['walk', 'stand', 'walkB', 'stand', 'walk'], 'walk, stand, the other foot, stand');
  for (const p of ['curse', 'whip', 'float', 'throw', 'burn', 'stun'] as const) assert.equal(ask({ pose: p }), p);
  assert.equal(ask({ anim: 'hurt' }), 'hurt');
  assert.equal(ask({ pose: 'float', anim: 'hurt' }), 'float', 'a hit in the air flashes him and keeps the float');
  assert.equal(ask({ anim: 'ko', t: 0 }), 'stun');
  assert.deepEqual([0, 24, 40, 56, 200].map((t) => vecnaPoseOf({ anim: 'ko', pose: undefined, t }).fade), [0, 1, 2, 3, 3], 'the KO thins in steps');
  const ko = [30, 46, 62].map((t) => painted(vc({ anim: 'ko', t })));
  assert.ok(ko[0]! > ko[1]! && ko[1]! > ko[2]! && ko[2]! > 0, `thinning: ${ko}`);
  const sheet = new Map(['stand', 'curse', 'whip', 'throw', 'burn', 'stun'].map((p) => [p, vc({ pose: p as ActorView['pose'], z: 0 }).px.join()]));
  assert.equal(new Set(sheet.values()).size, 6, 'every pose draws its own frame through drawActor');
  assert.ok(painted(vc({})) > 400 && rows(vc({}))[1] <= 96, 'his feet are on the floor line');
  assert.ok(!same(vc({}), sprite(view('billy'))) && painted(sprite(view('billy'))) > 100, 'he is no longer Billy');
});

test('he floats at his z over a shadow that stays on the floor, turns round to face left, flashes white when hit, and wears the d20 of a mark over his tendrils', () => {
  const flat = vc({ pose: 'float', z: 0 }), high = vc({ pose: 'float', z: 24 }), higher = vc({ pose: 'float', z: 30 });
  assert.equal(rows(noShadow(high))[0], rows(noShadow(flat))[0] - 24, 'z lifts the body');
  const shadowRow = (c: FakeCanvas): number => { let r = -1; c.px.forEach((v, i) => { if (v === px32('black')) r = Math.max(r, (i / c.w) | 0); }); return r; };
  assert.equal(shadowRow(high), shadowRow(flat), 'on the floor, where he was');
  assert.ok(count(high, 'black') > 0 && count(high, 'black') < count(flat, 'black') && count(higher, 'black') <= count(high, 'black'), 'smaller the higher he rides');
  const right = noShadow(vc({ dir: 'right', anim: 'walk', t: 0 })), left = noShadow(vc({ dir: 'left', anim: 'walk', t: 0 }));
  assert.ok(!same(right, left));
  let mirrored = 0;
  for (let y = 0; y < right.h; y++) for (let x = 0; x < right.w; x++) if (right.px[y * right.w + x] !== 0 && left.px[y * left.w + 63 - x] === right.px[y * right.w + x]) mirrored++;
  assert.ok(mirrored > 0.99 * painted(right), 'left is the frame turned round');
  const hit = vc({ anim: 'hurt', flash: 1 });
  assert.ok(count(hit, 'white') > 150 && count(hit, 'blood1') === 0 && count(hit, 'grey2') === 0, 'the hit flash is all white');
  const marked = vc({ marked: true }), plain = vc({});
  assert.ok(rows(marked)[0] < rows(plain)[0] - 6 && count(marked, 'red') > count(plain, 'red'), 'the d20 of Eddie\'s mark over his head');
  assert.ok(rows(vc({ alert: true }))[0] < rows(plain)[0] - 5, 'and the "!" of a wind-up');
  assert.ok(painted(vc({ blink: true })) === 0 || count(vc({ blink: true }), 'ink') === 0, 'a blink hides him');
});

// ---------------------------------------------------------------- the orb
test('the memory orb is its own sprite in three looks: standing and pulsing in four steps, lit red when marked with no d20 over it, and a snapped stalk when severed', () => {
  const stand = [0, 1, 2, 3].map((p) => orbPx('stand', p));
  assert.equal(new Set(stand.map((p) => p.d.join())).size, 3, 'a pulse of four steps: swell, peak, back, dim');
  assert.deepEqual([stand[0]?.w, stand[0]?.h, ORB_H], [16, 26, 26]);
  const marked = orbPx('marked', 1), plain = orbPx('stand', 1), cut = orbPx('severed', 0);
  assert.ok(count(Object.assign(screen(16, 26), { px: marked.d }), 'hot', 'pink') > count(Object.assign(screen(16, 26), { px: plain.d }), 'hot', 'pink') + 8, 'the marked one is lit red, hotter at the heart');
  assert.ok(count(Object.assign(screen(16, 26), { px: marked.d }), 'bone') > 8 && count(Object.assign(screen(16, 26), { px: plain.d }), 'bone') === 0, 'with the sheet\'s ring of bone dots round it');
  assert.ok(topRow(cut) >= 11 && topRow(plain) <= 1, 'the stalk is cut off short');
  assert.ok(!cut.d.includes(px32('white')) && redsIn(cut) > 15, 'no glow left, only stalk, limp tendrils and the husk');
  assert.equal(orbLookOf({ pose: 'severed', marked: true, t: 0 }).look, 'severed', 'a broken orb cannot be marked');
  assert.deepEqual([0, 8, 16, 24, 32].map((t) => orbLookOf({ pose: undefined, marked: false, t }).phase), [0, 1, 2, 3, 0]);
  const oc = (over: Partial<ActorView>): FakeCanvas => sprite(view('orb', { x: 16, y: 40, ...over }), 32, 48);
  for (const [name, over] of [['stand', {}], ['marked', { marked: true }], ['severed', { pose: 'severed' as const }]] as [string, Partial<ActorView>][]) {
    const look = name as 'stand' | 'marked' | 'severed', top = topRow(orbPx(look, 0));
    assert.equal(rows(oc({ ...over, y: 40 }))[0], 40 - ORB_H + top, `${name}: nothing over its head, so no d20 on the marked orb`);
  }
  assert.ok(!same(oc({}), oc({ marked: true })) && !same(oc({}), oc({ pose: 'severed' })) && !same(oc({}), sprite(view('pod', { x: 16, y: 40 }), 32, 48)), 'three looks, none of them the pod');
  assert.ok(count(oc({ flash: 1 }), 'white') > 80, 'a hit flashes it white');
});

// ---------------------------------------------------------------- his portrait
test('Vecna\'s portrait is his own skull on a dark red ground, six faces that all differ, five fill colors, and nothing of Billy\'s left in the borrowed slot', () => {
  const p = PORTRAITS.vecna;
  assert.notEqual(p, BILLY_PORTRAIT);
  assert.equal(p.bg, 'blood0');
  assert.doesNotMatch(src('src/gfx/data/portraits.ts'), /vecna: BILLY_PORTRAIT|borrows Billy/);
  const faces = (['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'] as Expr[]).map((e) => { const c = screen(24, 24); drawPortrait(ctxOf(c), 'vecna', e, 0, 0); return c; });
  for (const f of faces) assert.equal(painted(f), 24 * 24);
  assert.equal(new Set(faces.map((f) => f.px.join())).size, 6, 'six faces, all different');
  for (const f of faces) assert.ok(count(f, 'grey2') > 150 && count(f, 'blood0') > 40, 'ash grey flesh on the ground');
  const bg = px32('blood0'), ink = px32('ink'), used = new Set<number>();
  for (const f of faces) for (const v of f.px) if (v !== bg && v !== ink) used.add(v);
  assert.ok(used.size <= 5, `${used.size} fill colors`);
  assert.ok(count(faces[1] as FakeCanvas, 'bone') > count(faces[0] as FakeCanvas, 'bone') && count(faces[5] as FakeCanvas, 'red') !== count(faces[0] as FakeCanvas, 'red'), 'the grin shows more teeth, a shocked face has its own eyes');
  const billy = screen(24, 24);
  drawPortrait(ctxOf(billy), 'billy', 'neutral', 0, 0);
  assert.ok(!same(faces[0] as FakeCanvas, billy));
  const shared = new Set(['e', 'm', 'w', 'r', 'z', 'S', 'A']);
  for (const part of [...p.back, ...p.trim, ...(p.head ?? []), ...Object.values(p.faces ?? {}).flat()]) for (const row of part.rows) {
    assert.equal(row.length, 24, 'rows are 24 wide');
    for (const ch of row) assert.ok(ch === '.' || (p.pal[ch] ?? (shared.has(ch) ? 'x' : undefined)), `role ${ch} has a color`);
  }
});

// ---------------------------------------------------------------- the effects
const fxAt = (kind: FxView['kind'], over: Partial<FxView> = {}, w = 90, h = 90): FakeCanvas => {
  const c = screen(w, h);
  drawFx(ctxOf(c), { kind, x: 45, y: 60, dir: 'right', angle: 0, t: 0, life: 40, w: 20, h: 0, ...over });
  return c;
};

test('debris is a rock lobbed onto its mark with its own shadow widening as it falls, then a splash: the rock is over its mark, the shadow is gone at the landing, and h sets its height', () => {
  const air = [4, 14, 24, 27].map((t) => fxAt('debris', { t }));
  assert.ok(air.every((c) => painted(c) > 20), 'drawn all through the fall');
  assert.ok(count(air[3] as FakeCanvas, 'black') > count(air[0] as FakeCanvas, 'black') * 1.5, 'its shadow widens and fills as it comes down');
  const rowsOf = air.map((c) => rows(Object.assign(screen(90, 90), { px: c.px.map((v) => (v === px32('black') ? 0 : v)) }))[0]);
  assert.ok(rowsOf[0]! < rowsOf[1]! && rowsOf[1]! < rowsOf[2]! && rowsOf[2]! < rowsOf[3]!, `the rock comes down: ${rowsOf}`);
  assert.ok(rowsOf[3]! < 60 - 2, 'but is still over the mark in the last step');
  const high = fxAt('debris', { t: 10, h: 40 }), low = fxAt('debris', { t: 10, h: 10 });
  const top = (c: FakeCanvas): number => rows(Object.assign(screen(90, 90), { px: c.px.map((v) => (v === px32('black') ? 0 : v)) }))[0];
  assert.equal(top(low) - top(high), 30, 'the sim\'s h is the rock\'s height over its mark');
  const lands = [28, 31, 35, 39].map((t) => fxAt('debris', { t }));
  assert.ok(count(lands[0] as FakeCanvas, 'white') > 3 && count(lands[0] as FakeCanvas, 'black') === 0, 'a crack of white where it lands, the mark gone');
  const [x0, x1] = cols(lands[2] as FakeCanvas);
  assert.ok(x1 - x0 >= 14 && x1 - x0 <= 30, `a ring of dust widening toward w: ${x1 - x0} px`);
  assert.ok(painted(lands[3] as FakeCanvas) < painted(lands[1] as FakeCanvas), 'and thinning away');
  const wide = cols(fxAt('debris', { t: 34, w: 40 }))[1] - cols(fxAt('debris', { t: 34, w: 40 }))[0];
  assert.ok(wide > cols(fxAt('debris', { t: 34 }))[1] - cols(fxAt('debris', { t: 34 }))[0] + 6, 'w is the splash\'s diameter');
});

test('the whip is a vine lash from the hand along its angle, w long, that shoots out, cracks with a spark at the tip and thins away; the blaze is seven tongues of fire in a loop of ten frames', () => {
  const lash = (t: number, over: Partial<FxView> = {}): FakeCanvas => fxAt('whip', { x: 6, y: 45, t, life: 16, w: 60, h: 8, ...over });
  const [a0, a1] = cols(lash(6));
  assert.ok(a1 - a0 >= 54 && a1 - a0 <= 66, `reaches w along its angle: ${a1 - a0}`);
  const down = fxAt('whip', { x: 45, y: 6, t: 6, life: 16, w: 60, h: 8, angle: Math.PI / 2 });
  assert.ok(rows(down)[1] - rows(down)[0] >= 54 && cols(down)[1] - cols(down)[0] < 14, 'and along any other');
  assert.ok(cols(lash(1))[1] - cols(lash(1))[0] < cols(lash(6))[1] - cols(lash(6))[0] - 20, 'it shoots out');
  assert.ok(count(lash(5), 'white') >= 4 && count(lash(14), 'white') === 0, 'a spark at the tip as it cracks');
  assert.ok(!same(lash(5), lash(8)) && painted(lash(14)) < painted(lash(8)) / 2, 'a wave runs down it and it thins away');
  assert.ok(count(lash(6), 'blood0', 'blood1') > 30 && count(lash(6), 'red') > 10, 'dark red vine with a lit edge');
  const blaze = (t: number): FakeCanvas => fxAt('blaze', { x: 45, y: 75, t, life: 999999, w: 28, h: 40 });
  assert.ok(painted(blaze(0)) > 120 && count(blaze(0), 'orange') > 20 && count(blaze(0), 'amber') > 10 && count(blaze(0), 'yellow') > 4, 'fire colors');
  assert.ok(same(blaze(0), blaze(10)) && same(blaze(0), blaze(20)) && !same(blaze(0), blaze(2)) && !same(blaze(2), blaze(4)), 'a loop of ten, so a new one every 30 stands where the last stopped');
  const [b0, b1] = cols(blaze(0));
  assert.ok(b1 - b0 >= 22 && b1 - b0 <= 40 && rows(blaze(0))[1] <= 75 && 75 - rows(blaze(0))[0] >= 36, `about w across, from his feet up his whole height: ${b1 - b0} px, rows ${rows(blaze(0))}`);
  assert.ok(count(sprite(view('vecna', { pose: 'burn' })), 'orange') === 0, 'the burn pose is without fire: the blaze is the effect over him');
  const warned = (t: number, aim = true): FakeCanvas => vc({ pose: 'whip', t, ...(aim ? { aim: { x: 5, y: 96 } } : {}) });
  assert.ok(count(warned(4), 'hot', 'red') > count(warned(4, false), 'hot', 'red') + 10 && cols(warned(4))[0] <= 5, 'the line the lash will follow is drawn on the floor from his feet to the tip while he winds up');
  assert.ok(!same(warned(4), warned(6)) && painted(warned(20)) > painted(warned(4)), 'its dashes march, and it is solid for the last of the wind-up');
  assert.ok(count(vc({ pose: 'curse', aim: { x: 5, y: 96 } }), 'hot') === count(vc({ pose: 'curse' }), 'hot'), 'and only for the whip');
});

// ---------------------------------------------------------------- the map
const states = (s: NodeState): Record<string, NodeState> => Object.fromEntries(ORDER.map((id) => [id, id === '4.4' ? s : ORDER.indexOf(id) < ORDER.indexOf('4.4') ? 'cleared' : 'locked']));
const count5 = (px: Px, x0: number, y0: number, x1: number, y1: number, ns: ColorName[]): number => { const set = new Set(ns.map((n) => px32(n))); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (set.has(px.get(x, y))) n++; return n; };

test('Vecna\'s lair hangs in the Upside Down on the right under the town with its plate, lit when open and in greys when locked, the Creel House\'s twin turned upside down, and the route comes down to it from Upside Down Hawkins', () => {
  const p = POS['4.4'] as { x: number; y: number };
  assert.ok(p.y > HZ + 25 && p.y < 160, 'a node in the Upside Down half');
  for (const id of ORDER) if (id !== '4.4') { const q = POS[id] as { x: number; y: number }; assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 18, `clear of node ${id}`); }
  assert.equal(LAND.lair.x, p.x, 'its picture hangs under the node');
  assert.ok(LAND.lair.top > p.y && LAND.lair.top - p.y <= 14, 'near enough for the token to stand over it');
  const twin = lair(true), dark = lair(false);
  assert.deepEqual([twin.w, twin.h], [44, 26]);
  const earth = (px: Px, y0: number, y1: number): number => count5(px, 0, y0, 44, y1, ['blood0', 'blood1']);
  assert.ok(earth(twin, 0, 9) > 3 * earth(twin, 17, 26), 'the clod of earth is at the top and the house hangs from it');
  assert.ok(count5(twin, 0, 0, 44, 26, ['hot']) >= 3 && count5(dark, 0, 0, 44, 26, ['hot', 'pink', 'red']) === 0, 'windows lit red while open, dark when not');
  const open = paintLand(states('open')), shut = paintLand(states('locked'));
  const x0 = LAND.lair.x - 22, box: [number, number, number, number] = [x0, LAND.lair.top, x0 + 44, LAND.lair.top + 26];
  assert.ok(count5(open.px, ...box, ['red', 'hot', 'purple', 'magenta']) >= 60, 'purple walls with red windows on the map');
  const GREYS = (['ink', 'grey1', 'grey2', 'grey3', 'bone'] as ColorName[]).map((n) => px32(n)), art = lair(false);
  let greyed = 0, lit = 0;
  for (let y = 0; y < 26; y++) for (let x = 0; x < 44; x++) if (art.get(x, y)) { if (GREYS.includes(shut.px.get(x0 + x, LAND.lair.top + y))) greyed++; if (open.px.get(x0 + x, LAND.lair.top + y) === twin.get(x, y)) lit++; }
  assert.ok(greyed === painted(Object.assign(screen(44, 26), { px: art.d })) && lit === greyed, 'its own pixels are all greys when its stage is locked, and its own colors when it is open');
  const plates = open.plates.filter((q) => q.name === 'VECNA' || q.name === 'LAIR');
  assert.equal(plates.length, 2, 'one stacked sign, VECNA over LAIR');
  for (const q of plates) assert.ok(q.ud && q.point === 'up' && Math.abs(q.cx - p.x) <= 1 && q.y > LAND.lair.top + 20 && q.state === 'open', `${q.name} is a plate under the picture, pointing up`);
  const [vecna, lairPlate] = [plates.find((q) => q.name === 'VECNA'), plates.find((q) => q.name === 'LAIR')] as [(typeof plates)[number], (typeof plates)[number]];
  assert.ok(vecna.y < lairPlate.y, 'the one nearest the picture is on top');
  assert.ok(lairPlate.y + 9 <= 196, 'and the stack stays clear of the party band');
  for (const q of open.plates) if (!plates.includes(q)) { const r = plateRect(q); for (const s of plates) { const m = plateRect(s); assert.ok(r.x1 <= m.x0 || m.x1 <= r.x0 || r.y1 <= m.y0 || m.y1 <= r.y0, `${s.name} is clear of ${q.name}`); } }
  assert.equal(shut.plates.find((q) => q.name === 'LAIR')?.state, 'locked');
  const leg = LEGS[ORDER.indexOf('4.3')] as (typeof LEGS)[number], last = leg.pts[leg.pts.length - 1] as [number, number], first = leg.pts[0] as [number, number];
  assert.ok(Math.abs(last[0] - p.x) < 1e-6 && Math.abs(last[1] - p.y) < 1e-6, 'the leg from Upside Down Hawkins ends at the node');
  assert.ok(Math.abs(first[0] - (POS['4.3'] as { x: number }).x) < 1e-6 && first[1] > hzAt(first[0]), 'and starts down there too');
  const roots = count5(open.px, x0 + 8, hzAt(p.x) + 2, x0 + 36, LAND.lair.top - 1, ['blood1', 'red']);
  assert.ok(roots >= 20, `roots from the cut edge of the earth down to the clod: ${roots}`);
  assert.doesNotMatch(src('src/gfx/map_geo.ts'), /stand-in spot until Art places it/, '4.4 is no longer a stand-in');
});

// ---------------------------------------------------------------- the sheet
test('the sheet has the house, the attic, Vecna and his effects, each page painting on every sub page and at several times, and nothing borrowed is left in the actors', () => {
  assert.deepEqual(L13_PAGES.map((q: { title: string }) => q.title), ['THE CREEL HOUSE: UPSIDE DOWN', "VECNA'S ATTIC: VINE NEST", 'VECNA: ROOTED', "VECNA'S EFFECTS"]);
  assert.deepEqual(L13_PAGES.map((q: { subs: number }) => q.subs), [2, 2, 5, 1]);
  for (const page of L13_PAGES as { title: string; subs: number; draw(ctx: CanvasRenderingContext2D, t: number, sub: number): void }[]) {
    for (let sub = 0; sub < page.subs; sub++) {
      for (const t of [0, 3, 45, 300]) {
        const c = screen(256, 224);
        page.draw(ctxOf(c), t, sub);
        assert.ok(painted(c) > 3000, `${page.title} ${sub} at ${t}`);
      }
    }
  }
  assert.match(src('src/gfx/sheet.ts'), /\.\.\.L13_PAGES/);
  const at = (t: number): string => { const c = screen(256, 224); (L13_PAGES[0] as { draw(ctx: CanvasRenderingContext2D, t: number, sub: number): void }).draw(ctxOf(c), t, 1); return c.px.join(); };
  assert.notEqual(at(0), at(32), 'the house moves');
  for (const row of ATTIC) for (const ch of row) assert.ok(TILES[ch], `${ch} is a tile letter`);
  const actors = src('src/gfx/actors.ts');
  assert.doesNotMatch(actors, /BORROWED|vecna: 'billy'|orb: 'pod'/, 'nothing is borrowed any more');
  assert.match(actors, /case 'vecna'/);
  assert.match(actors, /case 'orb'/);
  assert.match(actors, /const ALIAS[^\n]*pitdemo: 'demogorgon'/, 'the pit\'s Demogorgon is still an alias for good');
});

test('the new files stay under 500 lines with no em dashes', () => {
  for (const f of [
    'src/gfx/tile_attic.ts', 'src/gfx/tile_creel.ts', 'src/gfx/tile_ud.ts', 'src/gfx/tile_ch4.ts', 'src/gfx/tiles.ts', 'src/gfx/actors.ts', 'src/gfx/actor_vecna.ts', 'src/gfx/actor_orb.ts',
    'src/gfx/fx_vecna.ts', 'src/gfx/fx.ts', 'src/gfx/map_lair.ts', 'src/gfx/map_geo.ts', 'src/gfx/map_land.ts', 'src/gfx/sheet_l13.ts', 'src/gfx/sheet.ts', 'src/gfx/props_ch4.ts',
    'src/gfx/data/vecna_portrait.ts', 'src/gfx/data/portraits.ts', 'src/gfx/ui.ts', 'src/gfx/var/vecna_kit.ts', 'src/gfx/var/vecna_opts.ts', 'src/gfx/var/vecna_scary.ts', 'src/gfx/var/attic_fx.ts', 'tests/art-ch4d.test.ts',
  ]) {
    const text = src(f);
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
});
