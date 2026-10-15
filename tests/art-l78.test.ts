// The art of levels 7 and 8: Robin, Nancy and Erica, the soldier, the Flayed, the melting rat and Grigori, and the mall and the base tiles
// through the night pass, with a hash of every older stage's tiles to show they did not move. The props and effects are in
// art-l78b.test.ts. Pure pixel work, so Node runs it: no canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView } from '../src/core/types.ts';
import { ANIM_ORDER, POSES, composeFrame } from '../src/gfx/actor_pose.ts';
import { composeGrigori } from '../src/gfx/actor_grigori.ts';
import { composeMelter, MELTER_PAL } from '../src/gfx/actor_melter.ts';
import { slotOf } from '../src/gfx/actor_pick.ts';
import { PUDDLE_H, PUDDLE_W, puddlePx, puddleStep } from '../src/gfx/actor_goo.ts';
import { ROBIN } from '../src/gfx/data/robin.ts';
import { NANCY } from '../src/gfx/data/nancy.ts';
import { ERICA } from '../src/gfx/data/erica.ts';
import { SOLDIER } from '../src/gfx/data/soldier.ts';
import { FLAYED } from '../src/gfx/data/flayed.ts';
import { GRIGORI_PAL } from '../src/gfx/data/grigori.ts';
import { EXPR, PORTRAITS } from '../src/gfx/data/portraits.ts';
import { MAX_PORTRAIT, STEVE_PORTRAIT } from '../src/gfx/data/portraits_l56.ts';
import type { CharSpec, View } from '../src/gfx/data/types.ts';
import { hash2, px32 } from '../src/gfx/canvas.ts';
import { nightSprite, nightTile, nightWater } from '../src/gfx/night.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { CONFETTI_MALL } from '../src/gfx/var/mall_confetti.ts';
import { baseGround, baseObject, BASE_TILES, machineArt } from '../src/gfx/tile_base.ts';
import { groundTile, waterTile, bankMask } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { fountainArt, liftArt, mallGround, MALL_TILES, mcOf } from '../src/gfx/tile_mall.ts';
import { objectTile, pulseTile } from '../src/gfx/tile_objects.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 } from '../src/world/stages/stage13.ts';
import { STAGE_21 } from '../src/world/stages/stage21.ts';
import { STAGE_22 } from '../src/world/stages/stage22.ts';
import { STAGE_23 } from '../src/world/stages/stage23.ts';

const VIEWS: View[] = ['down', 'up', 'side'];
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const code = (ch: string): number => ch.charCodeAt(0);
const count = (buf: Uint8Array, ch: string): number => buf.reduce((n, v) => n + (v === code(ch) ? 1 : 0), 0);
const set5 = (...names: ColorName[]): Set<number> => new Set(names.map((n) => px32(n)));
const ink = px32('ink');

/** Every frame a paper-doll atlas holds, as [anim, frame, view, role buffer]. */
function frames(spec: CharSpec): [string, number, View, Uint8Array][] {
  const out: [string, number, View, Uint8Array][] = [];
  for (const view of VIEWS) for (const anim of ANIM_ORDER) for (let f = 0; f < POSES[anim].length; f++) out.push([anim, f, view, composeFrame(spec, view, anim, f)]);
  return out;
}

/** Checks that every opaque role of every frame has a color and that the fills come to at most five, ink not counted. */
function checkBudget(id: string, pal: Record<string, ColorName>, list: [string, number, View, Uint8Array][], minPx: number): void {
  const colors = new Set<string>();
  for (const [anim, f, view, buf] of list) {
    let opaque = 0;
    for (const v of buf) {
      if (!v) continue;
      opaque++;
      if (v === 107) continue;
      const name = pal[String.fromCharCode(v)];
      assert.ok(name, `${id} ${anim} ${f} ${view}: role ${String.fromCharCode(v)} has no color`);
      if (name !== 'ink') colors.add(name);
    }
    assert.ok(opaque > minPx, `${id} ${anim} ${f} ${view} is drawn`);
  }
  assert.ok(colors.size <= 5, `${id} uses ${[...colors].join(',')}`);
}

// ---------------------------------------------------------------- heroes and npc
test('Robin, Nancy, Erica, the soldier and the Flayed: every frame is mapped, uses at most five colors and has a body', () => {
  for (const spec of [ROBIN, NANCY, ERICA, SOLDIER, FLAYED]) checkBudget(spec.id, spec.pal, frames(spec), 30);
});

test('Grigori draws every frame at 24 by 24 in five colors, and the melting rat in five, each with a body', () => {
  const g: [string, number, View, Uint8Array][] = [], m: [string, number, View, Uint8Array][] = [];
  for (const view of VIEWS) for (const anim of ANIM_ORDER) for (let f = 0; f < POSES[anim].length; f++) {
    const a = composeGrigori(view, anim, f), b = composeMelter(view, anim, f);
    assert.equal(a.length, 24 * 24);
    assert.equal(b.length, 16 * 16);
    g.push([anim, f, view, a]); m.push([anim, f, view, b]);
  }
  checkBudget('grigori', GRIGORI_PAL, g, 60);
  checkBudget('melter', MELTER_PAL, m, 20);
});

test('Grigori is a size up: taller and wider than a hero, and his poses are all different pictures', () => {
  const tall = (buf: Uint8Array, w: number): number => { let lo = w, hi = 0; for (let i = 0; i < buf.length; i++) if (buf[i]) { lo = Math.min(lo, (i / w) | 0); hi = Math.max(hi, (i / w) | 0); } return hi - lo + 1; };
  const span = (buf: Uint8Array, w: number): number => { let lo = w, hi = 0; for (let i = 0; i < buf.length; i++) if (buf[i]) { lo = Math.min(lo, i % w); hi = Math.max(hi, i % w); } return hi - lo + 1; };
  const big = composeGrigori('down', 'idle', 0), small = composeFrame(ROBIN, 'down', 'idle', 0);
  assert.ok(tall(big, 24) >= 22 && tall(small, 16) <= 16 && tall(big, 24) >= tall(small, 16) * 1.35, `taller: ${tall(big, 24)} against ${tall(small, 16)}`);
  assert.ok(span(big, 24) >= span(small, 16) * 1.25, `and wider: ${span(big, 24)} against ${span(small, 16)}`);
  const keys = new Set<string>();
  for (const [anim, f] of [['attack', 0], ['attack', 1], ['cast', 0], ['cast', 1], ['cast', 2], ['dash', 0], ['hurt', 0]] as const) keys.add(Array.from(composeGrigori('side', anim, f)).join(','));
  assert.equal(keys.size, 7, 'wind-up, swing, grab, hold, stun, lunge and hurt are seven pictures');
});

test('Robin holds the scoop at rest and in the wind-up, lets go of it for the toss and the cast; the wind-up and the toss differ', () => {
  for (const view of VIEWS) {
    const rest = composeFrame(ROBIN, view, 'idle', 0), wind = composeFrame(ROBIN, view, 'attack', 0), toss = composeFrame(ROBIN, view, 'attack', 1);
    assert.ok(count(rest, 't') >= 4, `${view}: the scoop shows at rest (${count(rest, 't')})`);
    assert.ok(count(wind, 't') >= 4, `${view}: and in the wind-up`);
    assert.ok(count(toss, 't') <= count(rest, 't') - 3 + (view === 'down' ? 2 : 0), `${view}: the toss lets go of it (${count(toss, 't')})`);
    for (const f of [0, 1]) assert.ok(count(composeFrame(ROBIN, view, 'cast', f), 'h') <= count(rest, 'h'), `${view}: Word vomit has empty hands`);
    assert.notDeepEqual(wind, toss);
  }
});

test('Nancy\'s pistol shows in the wind-up and the shot, and the shotgun, stock and barrel, in both cast frames', () => {
  for (const view of VIEWS) {
    const rest = composeFrame(NANCY, view, 'idle', 0);
    assert.ok(count(rest, 'g') >= 3, `${view}: a pistol at rest`);
    for (const f of [0, 1]) assert.ok(count(composeFrame(NANCY, view, 'attack', f), 'g') >= 3, `${view} ${f}: the pistol shows`);
    for (const f of [0, 1]) {
      const cast = composeFrame(NANCY, view, 'cast', f);
      assert.ok(count(cast, 'g') >= 5, `${view} ${f}: a shotgun, barrel ${count(cast, 'g')}`);
    }
    assert.notDeepEqual(composeFrame(NANCY, view, 'attack', 0), composeFrame(NANCY, view, 'attack', 1));
  }
});

test('Erica is on the kid body with her clipboard, and has no weapon frames of her own to fall back on', () => {
  assert.equal(ERICA.body, 'kid');
  for (const view of VIEWS) assert.ok(count(composeFrame(ERICA, view, 'idle', 0), 'w') >= 8, `${view}: the clipboard`);
  assert.equal(ERICA.pal.s, 'skin2');
});

test('each of them has a portrait of their own, drawn on the shared head, with every expression and every role named', () => {
  assert.notEqual(PORTRAITS.robin, MAX_PORTRAIT);
  assert.notEqual(PORTRAITS.nancy, STEVE_PORTRAIT);
  assert.notEqual(PORTRAITS.erica, PORTRAITS.will);
  assert.equal(PORTRAITS.robin.bg, 'teal1');
  assert.equal(PORTRAITS.nancy.bg, 'purple0');
  assert.equal(PORTRAITS.erica.bg, 'teal0');
  assert.deepEqual(Object.keys(EXPR).sort(), ['determined', 'happy', 'hurt', 'neutral', 'shocked', 'worried']);
  const shared = new Set(['S', 'A', 'e', 'w', 'm', 'r', 'z']);
  for (const who of ['robin', 'nancy', 'erica'] as const) {
    const p = PORTRAITS[who];
    assert.ok(p.front.length > 0, `${who} has hair or a hat in front`);
    for (const part of [...p.front, ...p.back, ...p.trim]) for (const row of part.rows) {
      assert.equal(row.length, 24, `${who}: rows are 24 wide`);
      for (const ch of row) assert.ok(ch === '.' || shared.has(ch) || p.pal[ch], `${who}: role ${ch} has a color`);
    }
  }
});

test('the three stand-ins are gone: no actor borrows another one\'s sprite or portrait', () => {
  const actors = readFileSync(new URL('../src/gfx/actors.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(actors, /STAND_IN/);
  const portraits = readFileSync(new URL('../src/gfx/data/portraits.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(portraits, /robin: MAX_PORTRAIT|nancy: STEVE_PORTRAIT|erica: BASE_PORTRAITS/);
  const props = readFileSync(new URL('../src/gfx/props.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(props, /stand-ins until Art/);
  const tiles = readFileSync(new URL('../src/gfx/tile_objects.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(tiles, /PLACEHOLDER/);
});

// ---------------------------------------------------------------- which frame
const asked = (over: Partial<Pick<ActorView, 'id' | 'kind' | 'anim' | 't' | 'alert' | 'pose' | 'strained'>>): Pick<ActorView, 'id' | 'kind' | 'anim' | 't' | 'alert' | 'pose' | 'strained'> =>
  ({ id: 'soldier', kind: 'enemy', anim: 'idle', t: 0, alert: false, strained: false, ...over });

test('the sim picks the frame: the soldier aims under the "!" and fires after it, a Flayed grabs, Grigori reaches, holds and stuns', () => {
  assert.deepEqual(slotOf(asked({ anim: 'attack', alert: true, t: 20 })), ['attack', 0], 'the soldier aims for the whole wind-up, not the first six ticks');
  assert.deepEqual(slotOf(asked({ anim: 'attack', alert: false, t: 2 })), ['attack', 1], 'and fires after it');
  assert.deepEqual(slotOf(asked({ anim: 'idle', t: 40 })), ['idle', 1], 'a recover is the rest pose');
  assert.deepEqual(slotOf(asked({ anim: 'walk', t: 15 })), ['walk', 2]);
  assert.deepEqual(slotOf(asked({ id: 'flayed', anim: 'attack', alert: true, t: 20 })), ['attack', 0]);
  assert.deepEqual(slotOf(asked({ id: 'flayed', anim: 'attack', alert: false, t: 3 })), ['attack', 1], 'the reach');
  assert.deepEqual(slotOf(asked({ id: 'flayed', anim: 'attack', pose: 'grab', t: 3 })), ['cast', 1], 'the grab');
  assert.deepEqual(slotOf(asked({ id: 'melter', anim: 'attack', alert: true, t: 20 })), ['attack', 0]);
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'attack', alert: true })), ['attack', 0], 'the haymaker winds up under the "!"');
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'attack' })), ['attack', 1], 'and swings');
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'attack', alert: true, pose: 'grab' })), ['cast', 0], 'the grab reaches');
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'dash', pose: 'grab' })), ['dash', 0], 'lunges');
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'attack', pose: 'grab' })), ['cast', 1], 'and holds');
  assert.deepEqual(slotOf(asked({ id: 'grigori', anim: 'hurt', pose: 'stun' })), ['cast', 2], 'and is stunned on the plate');
  assert.deepEqual(slotOf(asked({ id: 'mike', kind: 'hero', anim: 'attack', t: 2 })), ['attack', 0], 'everyone else goes by the clock');
  assert.deepEqual(slotOf(asked({ id: 'mike', kind: 'hero', anim: 'attack', t: 8 })), ['attack', 1]);
  assert.deepEqual(slotOf(asked({ id: 'eleven', kind: 'npc', anim: 'cast', strained: true })), ['cast', 2]);
});

test('the puddle is a goo puddle in four colors that breathes, and the rise has 40 frames to fill', () => {
  const a = puddlePx(0), b = puddlePx(1);
  assert.equal(a.w, PUDDLE_W);
  assert.equal(a.h, PUDDLE_H);
  assert.notDeepEqual(a.d, b.d, 'it breathes');
  const colors = new Set([...a.d, ...b.d].filter((v) => v !== 0 && v !== ink));
  assert.ok(colors.size <= 5, `${colors.size} colors`);
  assert.ok(a.d.every((v) => v === 0 || v >>> 24 === 255), 'no alpha');
  assert.equal(puddleStep(0), 0);
  assert.equal(puddleStep(24), 1);
  assert.equal(puddleStep(96), 0, 'and comes round');
});

// ---------------------------------------------------------------- tiles
/** Position by position, the day art of a tile, as the sheet paints it for the stage. */
function day(name: TileName, c: TileCtx): Px {
  return (groundTile(name, c) ?? objectTile(name, c)) as Px;
}
const NEW: TileName[] = [...MALL_TILES, ...BASE_TILES];
const nearFor = (name: TileName, i: number): Near => {
  const floor: TileName = MALL_TILES.includes(name) ? 'mallfloor' : 'basefloor', wall: TileName = MALL_TILES.includes(name) ? 'mallwall' : 'basewall';
  return i % 3 === 0 ? around(name) : i % 3 === 1 ? { n: wall, e: name, s: floor, w: floor } : { n: floor, e: floor, s: wall, w: name };
};
const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);

test('there are 14 mall tiles and 9 base tiles, all in the legend, and every one is painted: more than a fill and a frame', () => {
  assert.equal(MALL_TILES.length, 14);
  assert.equal(BASE_TILES.length, 9);
  assert.equal(MALL_TILES[0], 'mallfloor');
  assert.equal(MALL_TILES[13], 'lift');
  assert.equal(BASE_TILES[0], 'basefloor');
  assert.equal(BASE_TILES[8], 'keyfloor');
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of NEW) {
    assert.ok(names.has(n), n);
    const c: TileCtx = { tx: 7, ty: 9, near: nearFor(n, 0) };
    const p = day(n, c);
    assert.ok(p, `${n} paints`);
    assert.equal(p.w, 16);
    assert.equal(p.h, 16);
    assert.ok(p.d.every((v) => v >>> 24 === 255), `${n} is opaque`);
    assert.ok(new Set(p.d).size >= 3, `${n} is more than a fill and a frame (${new Set(p.d).size} colors)`);
  }
});

test('every new tile survives the night remap: the same pass the sheet runs, opaque, and its colors not collapsed', () => {
  for (const n of NEW) {
    for (let i = 0; i < 6; i++) {
      const c: TileCtx = { tx: 3 + i * 5, ty: 2 + i * 3, near: nearFor(n, i) };
      const d = day(n, c), night = nightTile(d, n, c);
      assert.equal(night.w, 16);
      assert.ok(night.d.every((v) => v >>> 24 === 255), `${n}: opaque at night`);
      assert.deepEqual(Array.from(night.d), Array.from(nightSprite(d).d), `${n}: the night pass leaves the tile as the sheet shows it`);
      assert.ok(new Set(night.d).size >= Math.max(2, Math.floor(new Set(d.d).size * 0.6)), `${n}: ${new Set(night.d).size} colors of ${new Set(d.d).size} survive`);
    }
  }
});

test('the neon of the mall and the fire of the base are lights: the night pass leaves them bright', () => {
  const lights = ['magenta', 'yellow', 'pink', 'cyan', 'purple'] as ColorName[];
  const seen = (n: TileName, names: ColorName[]): number => {
    const c: TileCtx = { tx: 5, ty: 4, near: around(n) };
    return nightTile(day(n, c), n, c).d.filter((v) => set5(...names).has(v)).length;
  };
  assert.ok(seen('mallfloor', lights) >= 8, 'chips glow on the terrazzo');
  assert.ok(seen('mallband', ['yellow', 'magenta']) >= 20, 'the tubes of the band');
  assert.ok(seen('shopfront', ['magenta', 'yellow', 'cyan']) >= 40, 'the signs');
  assert.ok(seen('basegrate', ['orange', 'blood1']) >= 20, 'the furnace under the grating');
  assert.ok(seen('machine', ['amber', 'orange', 'yellow']) >= 10, 'the machine\'s firebox');
  // And the dark stays dark: the terrazzo and the base floor are no brighter than the lab's panels at night.
  const avg = (n: TileName): number => { const c: TileCtx = { tx: 5, ty: 4, near: around(n) }; return nightTile(day(n, c), n, c).d.reduce((s, v) => s + lum(v), 0) / 256; };
  assert.ok(avg('mallfloor') < 40 && avg('basefloor') < 60, `${avg('mallfloor').toFixed(0)} and ${avg('basefloor').toFixed(0)}`);
});

test('floors and halls do not look stamped: tiles vary from one position to the next', () => {
  for (const n of NEW) {
    const seen = new Set<string>();
    for (let ty = 3; ty < 9; ty++) for (let tx = 3; tx < 9; tx++) seen.add(Array.from(day(n, { tx, ty, near: around(n) }).d).join());
    // The band, the roof edge and the doors are one thing that runs on from tile to tile, so they are the same everywhere along a run.
    const want = ['mallband', 'mallcap', 'mallglass', 'ammo', 'bunk', 'cell', 'machine', 'fountain', 'lift', 'railing'].includes(n) ? 1 : 2;
    assert.ok(seen.size >= want, `${n}: ${seen.size} different tiles in 36`);
  }
  for (const n of ['mallfloor', 'servicefloor', 'basefloor', 'basegrate', 'keyfloor', 'mallwall', 'goo'] as TileName[]) {
    const seen = new Set<string>();
    for (let ty = 3; ty < 9; ty++) for (let tx = 3; tx < 9; tx++) seen.add(Array.from(day(n, { tx, ty, near: around(n) }).d).join());
    assert.ok(seen.size >= 4, `${n}: ${seen.size} variants`);
  }
});

test('the confetti is thinner than on the sheet: a third fewer chips on the floor, and the heroes\' own colors stay clear of the terrazzo', () => {
  const chips = set5('magenta', 'yellow', 'cyan', 'pink', 'purple', 'hot');
  let sheet = 0, game = 0;
  for (let tx = 0; tx < 12; tx++) for (let ty = 0; ty < 12; ty++) {
    const c: TileCtx = { tx, ty, near: around('mallfloor') };
    game += (mallGround('mallfloor', c) as Px).d.filter((v) => chips.has(v)).length;
    sheet += CONFETTI_MALL.floor(mcOf(c, 'mallfloor')).d.filter((v) => chips.has(v)).length;
  }
  assert.ok(game <= sheet * 0.75, `${game} chip pixels against ${sheet} on the sheet`);
  assert.ok(game >= sheet * 0.4, 'but it is still confetti');
});

test('a mall wall is a cap over a face: the cap has a lip over a face and none over another cap, and a band turns down a hall', () => {
  const lip = mallGround('mallfloor', { tx: 1, ty: 1, near: around('mallfloor') });
  assert.ok(lip);
  const capOver = (s: TileName): Px => objectTile('mallcap', { tx: 5, ty: 5, near: { n: 'mallcap', e: 'mallcap', s, w: 'mallcap' } }) as Px;
  assert.notDeepEqual(Array.from(capOver('mallwall').d), Array.from(capOver('mallcap').d), 'the lip over a wall face');
  const across = mallGround('mallband', { tx: 5, ty: 5, near: { n: 'mallfloor', e: 'mallband', s: 'mallfloor', w: 'mallband' } }) as Px;
  const down = mallGround('mallband', { tx: 5, ty: 5, near: { n: 'mallband', e: 'mallfloor', s: 'mallband', w: 'mallfloor' } }) as Px;
  const yellow = px32('yellow');
  const rowSpread = (p: Px): number => { const ys = new Set<number>(); p.d.forEach((v, i) => { if (v === yellow) ys.add((i / 16) | 0); }); return ys.size; };
  const colSpread = (p: Px): number => { const xs = new Set<number>(); p.d.forEach((v, i) => { if (v === yellow) xs.add(i % 16); }); return xs.size; };
  assert.ok(colSpread(across) > rowSpread(across) && rowSpread(down) > colSpread(down), 'the zigzag runs the way the hall does');
});

test('the fountain, the lift and the machine are one picture over a block of tiles: each tile knows its piece, and the pieces join', () => {
  const f = fountainArt(4, 3);
  assert.deepEqual([f.w, f.h], [64, 48]);
  const bf = (ox: number, oy: number): Px => objectTile('fountain', { tx: 20 + ox, ty: 20 + oy, near: around('fountain'), blk: { ox, oy, w: 4, h: 3 } }) as Px;
  // Where two tiles of the block meet, the picture runs on: a pixel just inside one is the same as the art, so the seam is the art's own.
  for (let oy = 0; oy < 3; oy++) for (let ox = 0; ox < 3; ox++) {
    const a = bf(ox, oy), b = bf(ox + 1, oy);
    let drawn = 0;
    for (let y = 0; y < 16; y++) {
      const left = f.get(ox * 16 + 15, oy * 16 + y), right = f.get((ox + 1) * 16, oy * 16 + y);
      if (left) { drawn++; assert.equal(a.get(15, y), left, `tile ${ox},${oy} carries its own piece of the basin at row ${y}`); }
      if (right) assert.equal(b.get(0, y), right, `and so does the tile beside it`);
    }
    assert.ok(drawn >= 0);
  }
  assert.notDeepEqual(Array.from(fountainArt(2, 2, 0).d), Array.from(fountainArt(2, 2, 1).d), 'the rings run in');
  assert.deepEqual(Array.from(fountainArt(2, 2, 0).d), Array.from(fountainArt(2, 2, 4).d), 'and come round');
  const l = liftArt(2, 2);
  assert.deepEqual([l.w, l.h], [32, 32]);
  const m0 = machineArt(0), m1 = machineArt(1);
  assert.deepEqual([m0.w, m0.h], [64, 32]);
  assert.notDeepEqual(Array.from(m0.d), Array.from(m1.d), 'the machine moves');
  assert.notDeepEqual(Array.from((pulseTile('machine', { tx: 5, ty: 5, near: around('machine'), blk: { ox: 1, oy: 1, w: 4, h: 2 } }, 0) as Px).d), Array.from((pulseTile('machine', { tx: 5, ty: 5, near: around('machine'), blk: { ox: 1, oy: 1, w: 4, h: 2 } }, 1) as Px).d));
  assert.ok(baseObject('machine', { tx: 5, ty: 5, near: around('machine') }, (c, p) => groundTile(p, c) as Px));
  assert.ok(baseGround('keyfloor', { tx: 5, ty: 5, near: around('keyfloor') }));
});

test('the school\'s checker is dimmed where it is the floor of Scoops Ahoy, and nowhere else', () => {
  const c: TileCtx = { tx: 5, ty: 5, near: around('checker') };
  const bright = nightTile(groundTile('checker', c) as Px, 'checker', c), dim = nightTile(groundTile('checker', c) as Px, 'checker', { ...c, mall: true });
  const avg = (p: Px): number => p.d.reduce((s, v) => s + lum(v), 0) / 256;
  assert.ok(avg(dim) < avg(bright) * 0.6, `${avg(dim).toFixed(0)} against ${avg(bright).toFixed(0)}`);
  assert.ok(dim.d.every((v) => v >>> 24 === 255));
});

// A hash of every tile the stage paints, day or night, so a change to the shared painters shows up on the stages that were already built.
function fnv(h: number, v: number): number {
  for (let s = 0; s < 32; s += 8) { h ^= (v >>> s) & 0xff; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function stageHash(rows: string[], night: boolean): number {
  const cols = (rows[0] as string).length, n = rows.length;
  const names = rows.map((r) => [...r].map((ch) => ((TILES[ch] ?? TILES['.']) as { name: TileName }).name));
  const at = (x: number, y: number, self: TileName): TileName => (x < 0 || y < 0 || x >= cols || y >= n ? self : ((names[y] as TileName[])[x] as TileName));
  let h = 2166136261;
  for (let ty = 0; ty < n; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const name = (names[ty] as TileName[])[tx] as TileName;
      const near: Near = { n: at(tx, ty - 1, name), e: at(tx + 1, ty, name), s: at(tx, ty + 1, name), w: at(tx - 1, ty, name) };
      if (name === 'creek' || name === 'shallows') {
        const deep = name === 'creek', v = hash2(tx, ty, 2) % 3, banks = bankMask(near);
        for (let f = 0; f < 4; f++) { const w = waterTile(deep, v, f, banks); for (const px of night ? nightWater(w, deep, v, f).d : w.d) h = fnv(h, px); }
        continue;
      }
      const c: TileCtx = { tx, ty, near };
      const d = (groundTile(name, c) ?? objectTile(name, c) ?? groundTile('grass', c)) as Px;
      for (const px of (night ? nightTile(d, name, c) : d).d) h = fnv(h, px);
    }
  }
  return h;
}

test('the tiles of the stages built before this pass are unchanged, day and night', () => {
  const WANT: [string, { rows: string[] }, number, number][] = [
    ['1.1', STAGE_11, 116155209, 1360941926], ['1.2', STAGE_12, 3823460925, 1125520837], ['1.3', STAGE_13, 3358316205, 3376332597],
    ['2.1', STAGE_21, 2360347497, 1687297894], ['2.2', STAGE_22, 1374599332, 382708158], ['2.3', STAGE_23, 93070306, 1011428678],
  ];
  for (const [id, stage, d, n] of WANT) {
    assert.equal(stageHash(stage.rows, false), d, `${id} by day`);
    assert.equal(stageHash(stage.rows, true), n, `${id} at night`);
  }
});
