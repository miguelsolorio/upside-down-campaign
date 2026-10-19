// The art of stage 5.1 (src/gfx/ch5): every tile, prop and pose paints into a pixel buffer without throwing, in palette colors, the same
// way twice; the rift's tiles join; the troopers and the Commander keep every role painted, face four ways, stay inside their cell and
// differ from pose to pose; the Commander's cracked shield differs from the whole one; the mock scene builds. Pure pixel work, so Node runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.ts';
import type { TileName } from '../src/core/tiles.ts';
import { hash2, px32 } from '../src/gfx/canvas.ts';
import { nightTile } from '../src/gfx/night.ts';
import { COLOR_NAMES, PAL } from '../src/gfx/palette.ts';
import { Px } from '../src/gfx/px.ts';
import type { TileCtx } from '../src/gfx/tile_ground.ts';
import { COMMANDER_CELL, COMMANDER_PAL, COMMANDER_POSES, commanderPx, composeCommander } from '../src/gfx/ch5/commander.ts';
import type { CommanderPose } from '../src/gfx/ch5/commander.ts';
import { LOCKDOWN_LAB, LOCKDOWN_SOLID, LOCKDOWN_TILES, LOCKDOWN_TOWN, duskTile, lockdownGround, lockdownObject } from '../src/gfx/ch5/lockdown_tiles.ts';
import type { LockdownTile } from '../src/gfx/ch5/lockdown_tiles.ts';
import {
  LOCKDOWN_PROP_SIZE, barricadeArt, barrierArt, boomArt, boothArt, coneLift, curfewSignArt, floodlightArt, floodlightConeArt, sandbagArt, tentArt, truckArt,
} from '../src/gfx/ch5/lockdown_props.ts';
import { CORE, SCENE_H, SCENE_W, lockdownScene, paintLockdownTile } from '../src/gfx/ch5/lockdown_scene.ts';
import { DIRS, unmapped } from '../src/gfx/ch5/troop_kit.ts';
import type { View } from '../src/gfx/ch5/troop_kit.ts';
import { TROOPER_CELL, TROOPER_PAL, TROOPER_POSES, composeTrooper, trooperPx } from '../src/gfx/ch5/trooper.ts';
import type { TrooperPose } from '../src/gfx/ch5/trooper.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const PALETTE = new Set<number>(COLOR_NAMES.map((n) => px32(n)));
const VIEWS: View[] = ['down', 'up', 'side'];
const INK = 107;

const near = (n: TileName): TileCtx['near'] => ({ n, e: n, s: n, w: n });
const ctxOf = (tx: number, ty: number, n: TileName): TileCtx => ({ tx, ty, near: near(n) });
const opaque = (p: Px): number => p.d.reduce((n, v) => n + (v ? 1 : 0), 0);
const same = (a: Px, b: Px): boolean => a.d.length === b.d.length && a.d.every((v, i) => v === b.d[i]);
const colorsIn = (p: Px): Set<number> => new Set(Array.from(p.d).filter((v) => v));
const paint = (name: LockdownTile, tx: number, ty: number, n: TileName = 'road'): Px => {
  const c = ctxOf(tx, ty, n);
  return (lockdownGround(name, c, createRng(hash2(tx, ty, 9))) ?? lockdownObject(name, c, createRng(hash2(tx, ty, 9)))) as Px;
};

// ---------------------------------------------------------------- tiles
test('every lockdown tile paints a whole 16 px tile in palette colors, the same twice, at any place', () => {
  for (const name of LOCKDOWN_TILES) {
    for (const [tx, ty] of [[0, 0], [3, 2], [4, 7], [11, 5], [20, 13]] as [number, number][]) {
      const a = paint(name, tx, ty), b = paint(name, tx, ty);
      assert.equal(a.w, 16, name); assert.equal(a.h, 16, name);
      assert.equal(opaque(a), 256, `${name} at ${tx},${ty} has holes`);
      assert.ok(same(a, b), `${name} at ${tx},${ty} is not repeatable`);
      for (const v of colorsIn(a)) assert.ok(PALETTE.has(v), `${name} uses a color outside the palette`);
    }
  }
});

test('the walkable and the solid painters split the tiles between them, and know no others', () => {
  const c = ctxOf(3, 2, 'road');
  for (const name of LOCKDOWN_TILES) {
    const g = lockdownGround(name, c, createRng(1)), o = lockdownObject(name, c, createRng(1));
    if (LOCKDOWN_SOLID.has(name)) { assert.equal(g, null, `${name} is solid`); assert.ok(o, `${name} has no solid painter`); } else { assert.ok(g, `${name} has no ground painter`); assert.equal(o, null, `${name} is walkable`); }
  }
  assert.equal(lockdownGround('nope' as LockdownTile, c, createRng(1)), null);
  assert.equal(lockdownObject('nope' as LockdownTile, c, createRng(1)), null);
  assert.deepEqual([...LOCKDOWN_TOWN, ...LOCKDOWN_LAB], [...LOCKDOWN_TILES]);
  assert.equal(new Set(LOCKDOWN_TILES).size, LOCKDOWN_TILES.length);
});

test('the dusk filter dims the ground and leaves the lights alone, and the night pass takes every tile', () => {
  const lights = new Set<number>((['amber', 'yellow', 'orange', 'cream', 'red', 'hot'] as const).map((n) => px32(n)));
  for (const name of LOCKDOWN_TILES) {
    const day = paint(name, 3, 2), dusk = duskTile(day, 1);
    assert.equal(opaque(dusk), 256, name);
    assert.ok(same(duskTile(day, 0), day), `${name}: k 0 is the day tile`);
    for (let i = 0; i < 256; i++) if (lights.has(day.d[i] as number)) assert.equal(dusk.d[i], day.d[i], `${name} dims a light`);
    const night = nightTile(day, CORE[name], ctxOf(3, 2, 'road'));
    assert.equal(opaque(night), 256, name);
  }
  const walk = paint('lockwalk', 1, 1);
  const lum = (p: Px): number => Array.from(p.d).reduce((n, v) => n + (v & 255) + ((v >> 8) & 255) + ((v >> 16) & 255), 0);
  assert.ok(lum(duskTile(walk)) < lum(walk), 'dusk dims a pale sidewalk');
});

test('the rift is three tiles that join: the glow meets at each seam', () => {
  const hot = px32('hot');
  const rows = (p: Px, x: number): number[] => Array.from({ length: 16 }, (_, y) => y).filter((y) => p.get(x, y) === hot);
  const [a, b, c] = (['rift0', 'rift1', 'rift2'] as const).map((n) => paint(n, 4, 6));
  for (const p of [a, b, c]) assert.ok(rows(p as Px, 7).length + rows(p as Px, 8).length > 0, 'a rift tile has its crack in the middle');
  const meet = (l: Px, r: Px): number => rows(l, 15).filter((y) => rows(r, 0).includes(y)).length;
  assert.ok(meet(a as Px, b as Px) > 0, 'rift0 and rift1 do not meet');
  assert.ok(meet(b as Px, c as Px) > 0, 'rift1 and rift2 do not meet');
  assert.equal(rows(a as Px, 0).length, 0, 'rift0 starts inside its tile');
  const glow = new Set([px32('red'), px32('blood1'), px32('hot')]);
  const lit = (p: Px): number => Array.from(p.d).filter((v) => glow.has(v)).length;
  assert.ok(lit(a as Px) > 12 && lit(b as Px) > lit(a as Px) && lit(c as Px) > 12, 'the middle tile is the widest');
  assert.notDeepEqual(Array.from(paint('rift1', 4, 6, 'road').d), Array.from((lockdownGround('rift1', ctxOf(4, 6, 'road'), createRng(hash2(4, 6, 9)), true) as Px).d), 'the glow breathes');
});

// ---------------------------------------------------------------- props
test('every prop paints at its size in palette colors', () => {
  const list: [keyof typeof LOCKDOWN_PROP_SIZE, Px][] = [
    ['truck', truckArt()], ['tent', tentArt()], ['sandbags', sandbagArt(32, 16)], ['barricade', barricadeArt(32)], ['barrier', barrierArt(32)],
    ['floodlight', floodlightArt(true)], ['cone', floodlightConeArt(0)], ['booth', boothArt()], ['boom', boomArt(false)], ['sign', curfewSignArt()],
  ];
  for (const [name, px] of list) {
    const [w, h] = LOCKDOWN_PROP_SIZE[name];
    assert.equal(px.w, w, `${name} width`); assert.equal(px.h, h, `${name} height`);
    assert.ok(opaque(px) > w * h * 0.12, `${name} is nearly empty`);
    for (const v of colorsIn(px)) assert.ok(PALETTE.has(v), `${name} uses a color outside the palette`);
  }
  assert.ok(opaque(floodlightArt(true)) > 0 && !same(floodlightArt(true), floodlightArt(false)), 'the lamps are lit or dark');
  assert.ok(!same(boomArt(true), boomArt(false)), 'the boom opens');
  const v = boomArt(false, true);
  assert.equal(v.w, 24); assert.equal(v.h, 48);
  for (const w of [16, 32, 48]) assert.equal(sandbagArt(w, 16).w, w);
  for (const w of [32, 48]) { assert.equal(barricadeArt(w).w, w); assert.equal(barrierArt(w).w, w); }
});

test('the floodlight cone is a layer of its own that lifts what it falls on, hard edged, with no dither of light and none', () => {
  const white = px32('white'), bone = px32('bone');
  for (const lean of [-1, 0, 1]) {
    const cone = floodlightConeArt(lean);
    assert.deepEqual([...colorsIn(cone)].sort(), [bone, white].sort(), 'the cone has two levels of light');
    assert.ok(opaque(cone) > 1500, 'the cone covers a good patch of ground');
    // solid: a lit pixel always has a lit neighbor on its row, so nothing is a dither of light and none
    let lonely = 0;
    for (let y = 0; y < cone.h; y++) for (let x = 0; x < cone.w; x++) if (cone.get(x, y) && !cone.get(x - 1, y) && !cone.get(x + 1, y)) lonely++;
    assert.ok(lonely < 20, `${lonely} lone light pixels`);
  }
  assert.ok(!same(floodlightConeArt(-1), floodlightConeArt(1)), 'the lamp turns');
  const ground = (): Px => new Px(80, 72).fill('grey1');
  const dark = ground(), lit = ground();
  coneLift(lit, floodlightConeArt(0), 0, 0);
  const lum = (p: Px): number => Array.from(p.d).reduce((n, v) => n + (v & 255) + ((v >> 8) & 255) + ((v >> 16) & 255), 0);
  assert.ok(lum(lit) > lum(dark) * 1.4, 'the cone brightens the ground');
  assert.doesNotThrow(() => coneLift(lit, floodlightConeArt(1), 8, 8));
  assert.doesNotThrow(() => coneLift(lit, floodlightConeArt(1), -30, 60), 'a cone half off the ground is fine');
});

// ---------------------------------------------------------------- the foes
const borderOk = (buf: Uint8Array, C: number): string[] => {
  const out: string[] = [];
  const flare = new Set(['F', 'G', 'M', 'N'].map((c) => c.charCodeAt(0)));
  const chk = (x: number, y: number): void => { const v = buf[y * C + x] as number; if (v && v !== INK && !flare.has(v)) out.push(`${String.fromCharCode(v)}@${x},${y}`); };
  for (let i = 0; i < C; i++) { chk(i, 0); chk(i, C - 1); chk(0, i); chk(C - 1, i); }
  return out;
};
const bbox = (buf: Uint8Array, C: number): { w: number; h: number } => {
  let x0 = C, x1 = -1, y0 = C, y1 = -1;
  for (let i = 0; i < buf.length; i++) if (buf[i]) { const x = i % C, y = (i / C) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
const eq = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

test('the trooper has the poses the stage needs, with every role painted, in four facings', () => {
  const poses = Object.keys(TROOPER_POSES) as TrooperPose[];
  for (const need of ['walk', 'aim', 'burst', 'shield', 'flank', 'hurt']) assert.ok(poses.includes(need as TrooperPose), `no ${need} pose`);
  assert.equal(TROOPER_POSES.walk.length, 2);
  assert.equal(TROOPER_POSES.burst.length, 2);
  for (const k of Object.values(TROOPER_PAL)) assert.ok(k in PAL, `${k} is not a palette color`);
  for (const view of VIEWS) {
    for (const pose of poses) {
      for (let f = 0; f < TROOPER_POSES[pose].length; f++) {
        const buf = composeTrooper(view, pose, f);
        assert.equal(buf.length, TROOPER_CELL * TROOPER_CELL);
        assert.deepEqual(unmapped(buf, TROOPER_PAL), [], `${pose} ${f} ${view} has an unpainted role`);
        assert.ok(buf.some((v) => v === INK), `${pose} ${f} ${view} has no outline`);
        assert.deepEqual(borderOk(buf, TROOPER_CELL), [], `${pose} ${f} ${view} runs off its cell`);
        const { w, h } = bbox(buf, TROOPER_CELL);
        assert.ok(w >= 8 && h >= (pose === 'ko' ? 8 : 12), `${pose} ${f} ${view} is only ${w} by ${h}`);
        assert.ok(eq(buf, composeTrooper(view, pose, f)), 'repeatable');
      }
    }
  }
  for (const pose of poses) for (let f = 0; f < TROOPER_POSES[pose].length; f++) for (const d of DIRS) {
    const p = trooperPx(d, pose, f);
    assert.equal(p.w, TROOPER_CELL);
    for (const v of colorsIn(p)) assert.ok(PALETTE.has(v));
  }
});

test('the trooper turns: left is right mirrored, the front and back differ, every pose differs from the others', () => {
  for (const pose of Object.keys(TROOPER_POSES) as TrooperPose[]) {
    assert.ok(!same(trooperPx('left', pose, 0), trooperPx('right', pose, 0)) || pose === 'ko', `${pose}: left and right are the same picture`);
    assert.ok(!eq(composeTrooper('down', pose, 0), composeTrooper('up', pose, 0)), `${pose}: front and back are the same picture`);
  }
  const left = trooperPx('left', 'aim', 0), right = trooperPx('right', 'aim', 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(left.get(x, y), right.get(15 - x, y));
  for (const view of VIEWS) {
    const seen: Uint8Array[] = [];
    for (const [pose, f] of [['walk', 0], ['walk', 1], ['aim', 0], ['burst', 0], ['burst', 1], ['shield', 0], ['flank', 0], ['flank', 1], ['hurt', 0]] as [TrooperPose, number][]) {
      const buf = composeTrooper(view, pose, f);
      assert.ok(!seen.some((o) => eq(o, buf)), `${pose} ${f} ${view} repeats an earlier pose`);
      seen.push(buf);
    }
  }
  const burst = composeTrooper('side', 'burst', 0), aim = composeTrooper('side', 'aim', 0);
  const flame = (b: Uint8Array): number => b.filter((v) => v === 70 || v === 71).length;
  assert.ok(flame(burst) > 0 && flame(aim) === 0, 'a burst has a muzzle flash and an aim does not');
});

test('the Commander has the poses the fight needs, bigger than a trooper, with the shield cracked from half HP on', () => {
  const poses = Object.keys(COMMANDER_POSES) as CommanderPose[];
  for (const need of ['walk', 'plant', 'charge', 'stun']) assert.ok(poses.includes(need as CommanderPose), `no ${need} pose`);
  assert.equal(COMMANDER_POSES.plant.length, 2, 'the whistle has two beats');
  for (const k of Object.values(COMMANDER_PAL)) assert.ok(k in PAL, `${k} is not a palette color`);
  const tall = bbox(composeTrooper('down', 'idle', 0), TROOPER_CELL).h;
  for (const cracked of [false, true]) {
    for (const view of VIEWS) {
      for (const pose of poses) {
        for (let f = 0; f < COMMANDER_POSES[pose].length; f++) {
          const buf = composeCommander(view, pose, f, cracked);
          assert.equal(buf.length, COMMANDER_CELL * COMMANDER_CELL);
          assert.deepEqual(unmapped(buf, COMMANDER_PAL), [], `${pose} ${f} ${view} has an unpainted role`);
          assert.deepEqual(borderOk(buf, COMMANDER_CELL), [], `${pose} ${f} ${view} runs off its cell`);
          const { w, h } = bbox(buf, COMMANDER_CELL);
          if (pose !== 'ko' && pose !== 'stun') assert.ok(h > tall + 4 && w >= 14, `${pose} ${f} ${view} is only ${w} by ${h}`);
          if (cracked && pose !== 'ko') assert.ok(!eq(buf, composeCommander(view, pose, f, false)), `${pose} ${f} ${view}: a cracked shield looks whole`);
        }
      }
      assert.ok(!eq(composeCommander(view, 'plant', 0), composeCommander(view, 'plant', 1)), `${view}: the sound marks do not move`);
      assert.ok(!eq(composeCommander(view, 'stun', 0), composeCommander(view, 'stun', 1)), `${view}: the stars do not turn`);
      assert.ok(!eq(composeCommander(view, 'walk', 0), composeCommander(view, 'walk', 1)), `${view}: he does not step`);
      assert.ok(!eq(composeCommander(view, 'plant', 0), composeCommander(view, 'walk', 0)), `${view}: planted looks like walking`);
      assert.ok(!eq(composeCommander(view, 'charge', 0), composeCommander(view, 'walk', 0)), `${view}: a charge looks like walking`);
    }
  }
  const plant = composeCommander('side', 'plant', 0), walk = composeCommander('side', 'walk', 0);
  const marks = (b: Uint8Array): number => b.filter((v) => v === 77 || v === 78).length;
  assert.ok(marks(plant) > 0 && marks(walk) === 0, 'only the planted pose whistles');
  for (const d of DIRS) assert.equal(commanderPx(d, 'walk', 0).w, COMMANDER_CELL);
});

// ---------------------------------------------------------------- the scene and the files
test('the mock street scene builds a whole 256 by 224 frame at dusk and at night', () => {
  for (const night of [false, true]) {
    const s = lockdownScene(night);
    assert.equal(s.w, SCENE_W); assert.equal(s.h, SCENE_H);
    assert.equal(opaque(s), SCENE_W * SCENE_H, 'the frame has holes');
  }
  assert.ok(!same(lockdownScene(false), lockdownScene(true)));
  assert.ok(paintLockdownTile('lockroad', 0, 0, near('road')).w === 16);
});

test('the lockdown art files stay under 500 lines, with no em dashes, and nothing random', () => {
  const files = ['lockdown_tiles', 'lockdown_props', 'lockdown_scene', 'lockdown_page', 'trooper', 'commander', 'troop_kit'].map((f) => `src/gfx/ch5/${f}.ts`);
  files.push('chapter5-lockdown.html');
  const dash = String.fromCharCode(0x2014);
  for (const f of files) {
    const text = readFileSync(`${ROOT}${f}`, 'utf8');
    assert.ok(text.split('\n').length < 500, `${f} is ${text.split('\n').length} lines`);
    assert.ok(!text.includes(dash), `${f} has an em dash`);
    assert.ok(!text.includes('Math.random'), `${f} is not repeatable`);
  }
});
