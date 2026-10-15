// The art of level 9, stage 3.3 (docs/level-9.md): the food court's tiles (Neon Strip) with their variants and the night remap, Flayed Billy
// (Lifeguard) on his 24 px cell with the veins fading as the reach climbs, and the Mind Flayer (Meat Spider): the body, the four legs drawn
// from a root to a tip, the effects and the goo pools, and the sheet pages and the map plate. Pure pixel work, so Node runs it: the actors
// and effects draw on a small software canvas (FakeCanvas below), so the tests can look at the pixels they put down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, count, cols, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import type { ActorView, FxView, PoolView } from '../src/core/types.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { Px } from '../src/gfx/px.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { nightSprite, nightTile } from '../src/gfx/night.ts';
import { FOOD_TILES } from '../src/gfx/tile_food.ts';
import { BPOSES } from '../src/gfx/data/billy.ts';
import type { BPoseName } from '../src/gfx/data/billy.ts';
import { BILLY_PAL } from '../src/gfx/data/billy.ts';
import { FREED_PAL, VEIN_STEPS, billyPoseOf, billyRoles, composeBilly, veinStep } from '../src/gfx/actor_billy.ts';
import { PORTRAITS } from '../src/gfx/data/portraits.ts';
import { STEVE_PORTRAIT } from '../src/gfx/data/portraits_l56.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';
import { ORDER } from '../src/gfx/map_geo.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');
const { drawFx } = await import('../src/gfx/fx.ts');
const { drawPool } = await import('../src/gfx/fx_l9.ts');
const { FLAYER_RISE, legPts } = await import('../src/gfx/actor_flayer.ts');
const { L9_PAGES } = await import('../src/gfx/sheet_l9.ts');
const { L9B_PAGES } = await import('../src/gfx/sheet_l9b.ts');

// ---------------------------------------------------------------- tiles
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const day = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
const nearFor = (name: TileName, i: number): Near => (i % 3 === 0 ? around(name) : i % 3 === 1 ? { n: 'stall', e: name, s: 'foodfloor', w: 'foodfloor' } : { n: 'foodfloor', e: 'foodfloor', s: 'stallcap', w: name });
const variants = (name: TileName): number => {
  const seen = new Set<string>();
  for (let ty = 3; ty < 9; ty++) for (let tx = 3; tx < 9; tx++) seen.add(Array.from(day(name, { tx, ty, near: around(name) }).d).join());
  return seen.size;
};

test('the eight food court tiles are in the legend and painted: more than a fill and a frame, opaque, 16 by 16', () => {
  assert.equal(FOOD_TILES.length, 8);
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of FOOD_TILES) {
    assert.ok(names.has(n), n);
    for (let i = 0; i < 6; i++) {
      const p = day(n, { tx: 7 + i * 3, ty: 9 + i, near: nearFor(n, i) });
      assert.equal(p.w, 16);
      assert.equal(p.h, 16);
      assert.ok(p.d.every((v) => v >>> 24 === 255), `${n} is opaque`);
      assert.ok(new Set(p.d).size >= 3, `${n} is a drawing (${new Set(p.d).size} colors)`);
    }
  }
  const src = readFileSync(new URL('../src/gfx/tile_food.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /FLAT|stand-ins until Art/);
});

test('floors and stalls do not look stamped: tiles vary from one position to the next', () => {
  for (const n of ['foodfloor', 'skyfloor', 'kitchenfloor', 'stall', 'fryer', 'foodband'] as TileName[]) assert.ok(variants(n) >= 4, `${n}: ${variants(n)} different tiles in 36`);
  // The awning and the escalator are one thing that runs on from tile to tile.
  for (const n of ['stallcap', 'escalator'] as TileName[]) assert.ok(variants(n) >= 1, n);
});

test('every food court tile survives the night remap: the same pass the sheet runs, opaque, its colors not collapsed', () => {
  for (const n of FOOD_TILES) {
    for (let i = 0; i < 6; i++) {
      const c: TileCtx = { tx: 3 + i * 5, ty: 2 + i * 3, near: nearFor(n, i) };
      const d = day(n, c), night = nightTile(d, n, c);
      assert.ok(night.d.every((v) => v >>> 24 === 255), `${n}: opaque at night`);
      assert.deepEqual(Array.from(night.d), Array.from(nightSprite(d).d), `${n}: the night pass leaves the tile as the sheet shows it`);
      assert.ok(new Set(night.d).size >= Math.max(2, Math.floor(new Set(d.d).size * 0.6)), `${n}: ${new Set(night.d).size} colors of ${new Set(d.d).size} survive`);
    }
  }
});

test('the neon is every light there is: the tubes and studs stay bright at night on a floor that stays dark', () => {
  const night = (n: TileName): Px => { const c: TileCtx = { tx: 5, ty: 4, near: around(n) }; return nightTile(day(n, c), n, c); };
  const lit = (n: TileName): number => night(n).d.filter((v) => lum(v) >= 90).length;
  assert.ok(lit('foodfloor') >= 4, 'a stud in every diamond');
  assert.ok(lit('foodband') >= 30, 'the two tubes');
  assert.ok(lit('stall') >= 30, 'the menu board');
  assert.ok(lit('fryer') >= 20, 'the oil and the strips');
  const avg = (n: TileName): number => night(n).d.reduce((s, v) => s + lum(v), 0) / 256;
  assert.ok(avg('foodfloor') < 40 && avg('kitchenfloor') < 60, `${avg('foodfloor').toFixed(0)} and ${avg('kitchenfloor').toFixed(0)}`);
});

test('a table in the court is the court\'s, with its ring of light, and the goo lies on the court\'s floor', () => {
  const court = objectTile('table', { tx: 4, ty: 6, near: { n: 'foodfloor', e: 'foodband', s: 'foodfloor', w: 'stall' } }) as Px;
  const school = objectTile('table', { tx: 4, ty: 6, near: around('schoolfloor') }) as Px;
  assert.notDeepEqual(Array.from(court.d), Array.from(school.d), 'the school keeps its own table');
  assert.ok(court.d.filter((v) => v === px32('cyan')).length >= 12, 'cyan tube light');
  const near: Near = { n: 'foodfloor', e: 'foodfloor', s: 'goo', w: 'foodband' };
  const goo = objectTile('goo', { tx: 4, ty: 6, near }) as Px, floor = groundTile('foodfloor', { tx: 4, ty: 6, near }) as Px;
  let showing = 0;
  for (let i = 0; i < 256; i++) if (goo.d[i] === floor.d[i]) showing++;
  assert.ok(showing >= 20 && showing < 256, `the floor shows through at ${showing} px`);
});

// ---------------------------------------------------------------- Billy
const VIEWS = ['down', 'up', 'side'] as const;
const POSE_NAMES = Object.keys(BPOSES) as BPoseName[];
const known = new Set([...Object.keys(BILLY_PAL), ...Object.keys(FREED_PAL), 'k'].map((c) => c.charCodeAt(0)));

test('every pose in every view is a 24 by 24 role buffer with something in it and no letter the palettes lack', () => {
  for (const v of VIEWS) for (const name of POSE_NAMES) {
    const buf = composeBilly(v, BPOSES[name], 1);
    assert.equal(buf.length, 24 * 24);
    assert.ok(buf.filter((b) => b).length >= 90, `${v} ${name}`);
    for (const b of buf) if (b) assert.ok(known.has(b), `${v} ${name}: '${String.fromCharCode(b)}'`);
  }
});

test('Billy is taller and wider than a hero on the 16 px cell, and kneeling he is lower than standing', () => {
  const extent = (buf: Uint8Array): { h: number; w: number; top: number } => {
    let top = 24, bot = -1, l = 24, r = -1;
    buf.forEach((b, i) => { if (b) { const y = (i / 24) | 0, x = i % 24; top = Math.min(top, y); bot = Math.max(bot, y); l = Math.min(l, x); r = Math.max(r, x); } });
    return { h: bot - top + 1, w: r - l + 1, top };
  };
  const idle = extent(composeBilly('down', BPOSES.idle, 1)), kneel = extent(composeBilly('down', BPOSES.pinned, 1));
  assert.ok(idle.h >= 22 && idle.w >= 18, `${idle.h} by ${idle.w}`);
  assert.ok(kneel.top >= idle.top + 3 && kneel.h <= idle.h - 3, `kneeling: top ${kneel.top} against ${idle.top}`);
  assert.ok(extent(composeBilly('up', BPOSES.pinned, 1)).top >= extent(composeBilly('up', BPOSES.idle, 1)).top + 3, 'and from behind');
  const side = extent(composeBilly('side', BPOSES.pinned, 1)), freed = extent(composeBilly('side', BPOSES.freed, 0));
  assert.ok(side.top >= extent(composeBilly('side', BPOSES.idle, 1)).top + 1 && freed.top >= side.top + 2, 'slumped lower still');
});

test('his poses are all different: the jab, the charge, the run, the grab, the hold, the stun, the kneel and the free man', () => {
  for (const v of ['side', 'down'] as const) {
    const names: BPoseName[] = v === 'side'
      ? ['idle', 'walkA', 'walkB', 'jabWind', 'jab', 'charge', 'run', 'grab', 'hold', 'stunA', 'stunB', 'hurt', 'pinned', 'freed']
      : ['idle', 'walkA', 'jabWind', 'jab', 'grab', 'hold', 'stunA', 'stunB', 'hurt', 'pinned', 'freed'];
    const seen = new Map<string, string>();
    for (const n of names) {
      const key = Array.from(composeBilly(v, BPOSES[n], 1)).join();
      assert.ok(!seen.has(key), `${v}: ${n} is the same as ${seen.get(key)}`);
      seen.set(key, n);
    }
  }
});

test('the sim picks the pose: the jab winds up under the "!" and then strikes, the charge and the grab follow pose, the stun sways, the npc is slumped', () => {
  const asked = (over: Partial<Pick<ActorView, 'kind' | 'anim' | 't' | 'alert' | 'pose'>>): Pick<ActorView, 'kind' | 'anim' | 't' | 'alert' | 'pose'> => ({ kind: 'enemy', anim: 'idle', t: 0, alert: false, ...over });
  assert.equal(billyPoseOf(asked({})), 'idle');
  assert.equal(billyPoseOf(asked({ t: 30 })), 'idleB');
  assert.deepEqual([0, 7, 14, 21].map((t) => billyPoseOf(asked({ anim: 'walk', t }))), ['walkA', 'idle', 'walkB', 'idle']);
  assert.equal(billyPoseOf(asked({ anim: 'attack', alert: true })), 'jabWind');
  assert.equal(billyPoseOf(asked({ anim: 'attack' })), 'jab');
  assert.equal(billyPoseOf(asked({ anim: 'attack', pose: 'charge', alert: true })), 'charge');
  assert.equal(billyPoseOf(asked({ anim: 'dash', pose: 'charge' })), 'run');
  assert.equal(billyPoseOf(asked({ anim: 'attack', pose: 'grab', alert: true })), 'grab');
  assert.equal(billyPoseOf(asked({ anim: 'attack', pose: 'grab', t: 4 })), 'hold', 'the hold shakes');
  assert.notEqual(billyPoseOf(asked({ anim: 'hurt', pose: 'stun', t: 0 })), billyPoseOf(asked({ anim: 'hurt', pose: 'stun', t: 8 })));
  assert.equal(billyPoseOf(asked({ anim: 'idle', pose: 'pinned' })), 'pinned');
  assert.equal(billyPoseOf(asked({ kind: 'npc' })), 'freed');
});

test('the veins fade as the reach climbs: all there at 0, fewer at each step, gone at 1, and the free man has his color back', () => {
  assert.equal(VEIN_STEPS, 4);
  assert.deepEqual([0, 0.1, 0.5, 0.9, 1, 2, -1].map(veinStep), [0, 0, 2, 4, 4, 4, 0]);
  const veins = (step: number): number => billyRoles('side', 'pinned', step).buf.filter((b) => b === 'v'.charCodeAt(0)).length;
  const counts = [0, 1, 2, 3, 4].map(veins);
  assert.ok(counts[0] > counts[1]! && counts[1]! > counts[2]! && counts[2]! > counts[3]! && counts[3]! > 0, `fading: ${counts.join(' ')}`);
  assert.equal(counts[4], 0, 'none left');
  assert.equal(billyRoles('side', 'pinned', 0).pal, BILLY_PAL);
  assert.equal(billyRoles('side', 'pinned', 4).pal, FREED_PAL, 'the last step is the free man');
  assert.equal(billyRoles('side', 'freed', 0).pal, FREED_PAL);
  assert.equal(FREED_PAL.s, 'skin1', 'a summer\'s tan');
  assert.equal(FREED_PAL.v, FREED_PAL.s, 'and no veins');
  assert.notEqual(BILLY_PAL.s, FREED_PAL.s);
});

const bview = (over: Partial<ActorView>): ActorView => ({ kind: 'enemy', id: 'billy', x: 100, y: 120, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over });
const drawn = (v: ActorView): FakeCanvas => { const c = screen(200, 160); drawActor(ctxOf(c), v); return c; };

test('drawn, Billy stands on his feet in a 24 px cell, kneels with the veins fading, and a freed one lies slumped as an npc', () => {
  for (const dir of ['down', 'up', 'left', 'right'] as const) {
    const c = drawn(bview({ dir }));
    const [top, bottom] = rows(c), [l, r] = cols(c);
    assert.ok(bottom <= 120 && top >= 120 - 24 && r - l + 1 <= 24, `${dir}: in the cell, feet on y`);
    assert.ok(painted(c) > 250, dir);
  }
  const pinned = (k: number): FakeCanvas => drawn(bview({ pose: 'pinned', k, dir: 'right' }));
  assert.ok(count(pinned(0), 'purple0') > count(pinned(0.6), 'purple0') && count(pinned(0.6), 'purple0') > count(pinned(1), 'purple0'), 'the veins go');
  assert.equal(count(pinned(1), 'purple0'), 0, 'none at 1');
  assert.ok(count(pinned(1), 'skin1') > 40, 'the tan is back');
  const free = drawn(bview({ kind: 'npc', dir: 'right' }));
  assert.ok(rows(free)[0] > rows(drawn(bview({ dir: 'right' })))[0] + 3, 'slumped: lower than he stood');
  assert.ok(count(free, 'skin1') > 40 && count(free, 'purple0') === 0);
  // A hit flashes him white and a blink skips him.
  assert.ok(count(drawn(bview({ flash: 1 })), 'white') > 200 && count(drawn(bview({ flash: 1 })), 'red') === 0);
  assert.equal(painted(drawn(bview({ blink: true }))), 0);
  assert.ok(painted(drawn(bview({ alert: true, anim: 'attack' }))) > painted(drawn(bview({ anim: 'attack' }))), 'the "!"');
});

test('the left view is the right turned round about his cell, shadow apart', () => {
  const body = (c: FakeCanvas): Map<string, number> => new Map([...c.px].map((v, i) => [i, v] as [number, number]).filter(([, v]) => v !== 0 && v !== px32('black')));
  const l = drawn(bview({ dir: 'left', anim: 'attack' })), r = drawn(bview({ dir: 'right', anim: 'attack' })), lm = body(l);
  const turned = new Map([...body(r)].map(([i, v]) => [((i / 200) | 0) * 200 + (199 - (i % 200)), v] as [number, number]));
  assert.equal(lm.size, turned.size);
  for (const [i, v] of lm) assert.equal(turned.get(i), v);
  assert.ok(!same(l, r));
});

test('his portrait is his own, on the shared head with every expression, and the Steve stand-in is gone', () => {
  assert.notEqual(PORTRAITS.billy, STEVE_PORTRAIT);
  assert.equal(PORTRAITS.billy.bg, 'blood1');
  assert.equal(PORTRAITS.billy.shirt, 'plain');
  const shared = new Set(['S', 'A', 'e', 'w', 'm', 'r', 'z']);
  for (const part of [...PORTRAITS.billy.front, ...PORTRAITS.billy.back, ...PORTRAITS.billy.trim]) for (const row of part.rows) {
    assert.equal(row.length, 24, 'rows are 24 wide');
    for (const ch of row) assert.ok(ch === '.' || shared.has(ch) || PORTRAITS.billy.pal[ch], `role ${ch} has a color`);
  }
  assert.equal(PORTRAITS.billy.pal.h, 'yellow', 'a bleached mullet');
  const src = readFileSync(new URL('../src/gfx/data/portraits.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /billy: STEVE_PORTRAIT/);
});

test('Billy has his six faces in the dialogue box, all different', async () => {
  const { drawPortrait } = await import('../src/gfx/ui.ts');
  const faces = (['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'] as const).map((e) => { const c = screen(24, 24); drawPortrait(ctxOf(c), 'billy', e, 0, 0); return c; });
  for (let i = 0; i < faces.length; i++) {
    assert.ok(painted(faces[i] as FakeCanvas) >= 400, `face ${i}`);
    for (let j = i + 1; j < faces.length; j++) assert.ok(!same(faces[i] as FakeCanvas, faces[j] as FakeCanvas), `faces ${i} and ${j}`);
  }
});

// ---------------------------------------------------------------- the Mind Flayer
const view = (id: 'flayer' | 'flayerleg', over: Partial<ActorView>): ActorView =>
  ({ kind: 'enemy', id, x: 200, y: 80, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over });
const body = (over: Partial<ActorView> = {}): FakeCanvas => { const c = screen(420, 200); drawActor(ctxOf(c), view('flayer', { x: 210, y: 80, ...over })); return c; };
const legView = (over: Partial<ActorView> = {}): ActorView => view('flayerleg', { x: 120, y: 60, aim: { x: 120, y: 116 }, ...over });
const leg = (over: Partial<ActorView> = {}): FakeCanvas => { const c = screen(420, 300); drawActor(ctxOf(c), legView(over)); return c; };

test('the body fills the wall: about 200 px wide and 80 tall around its feet, in raw meat red with a head of bone and ink, and 212 is the widest thing in the game', () => {
  const c = body();
  const [l, r] = cols(c), [top, bottom] = rows(c);
  assert.ok(r - l + 1 >= 190 && r - l + 1 <= 212, `${r - l + 1} wide`);
  assert.ok(top <= 80 - 38 && bottom >= 80 + 18 && bottom <= 80 + 38, `rows ${top} to ${bottom} around feet at 80`);
  assert.ok(painted(c) > 6000);
  assert.ok(count(c, 'red', 'blood1', 'rose') > 2500, 'meat');
  assert.ok(count(c, 'bone') >= 20 && count(c, 'amber', 'yellow') >= 4, 'fangs and four lit eyes');
  assert.ok(Math.abs((l + r) / 2 - 210) <= 3, 'centered on x');
});

test('the body breathes and sways, rises through the skylight over 40 frames, and lies with its head on the floor', () => {
  assert.ok(!same(body({ t: 0 }), body({ t: 24 })), 'a breath');
  assert.ok(!same(body({ t: 0 }), body({ t: 40 })), 'the head sways');
  assert.ok(same(body({ t: 0 }), body({ t: 1 })));
  assert.equal(FLAYER_RISE, 40);
  const riseAt = (t: number): number => painted(((): FakeCanvas => { const c = screen(420, 200); drawActor(ctxOf(c), view('flayer', { x: 210, y: 44, pose: 'rise', t })); return c; })());
  const seen = [0, 10, 20, 30, 40].map(riseAt);
  assert.equal(seen[0], 0, 'nothing on the screen at the start: it is still above it');
  for (let i = 1; i < seen.length; i++) assert.ok((seen[i] as number) > (seen[i - 1] as number), `coming down: ${seen.join(' ')}`);
  assert.equal(riseAt(40), painted(((): FakeCanvas => { const c = screen(420, 200); drawActor(ctxOf(c), view('flayer', { x: 210, y: 44, t: 40 })); return c; })()), 'and at 40 it is where it stands');
  const down = body({ pose: 'down' }), up = body();
  assert.ok(!same(down, up));
  const lowest = (c: FakeCanvas): number => { let m = 0; c.px.forEach((v, i) => { if (v === px32('bone')) m = Math.max(m, (i / c.w) | 0); }); return m; };
  assert.ok(lowest(down) > lowest(up) + 6, 'the head is lower on the floor');
  assert.ok(count(down, 'blood0') > count(up, 'blood0') + 30, 'a hole where it was');
  assert.ok(count(down, 'grey2') >= 4 && count(up, 'grey2') === 0, 'the eyes go grey');
});

test('a body hit flashes white, a dead one flashes and thins out in the frames the sim keeps it, a blinking one is skipped', () => {
  assert.ok(count(body({ flash: 1 }), 'white') > 4000 && count(body({ flash: 1 }), 'red') === 0);
  assert.ok(count(body({ anim: 'ko', t: 2 }), 'white') > 4000, 'it flashes first');
  const dead = (t: number): number => painted(body({ anim: 'ko', t }));
  assert.ok(dead(6) > dead(12) && dead(12) > dead(18) && dead(18) > 0, `${dead(6)} ${dead(12)} ${dead(18)}`);
  assert.equal(painted(body({ blink: true })), 0);
});

test('a leg is a line from its root to its tip, pixel snapped, with a claw at the tip, and left legs bow left and right legs bow right', () => {
  const idle = leg();
  assert.ok(count(idle, 'blood0', 'blood1', 'red') > 120, 'a tube of flesh');
  assert.ok(count(idle, 'bone') >= 5, 'the claw');
  const [top, bottom] = rows(idle);
  assert.ok(bottom >= 116 && bottom <= 124, `the claw reaches the tip: ${bottom}`);
  assert.ok(top < 60, 'the knee rises above the root');
  const mean = (c: FakeCanvas): number => { let s = 0, n = 0; c.px.forEach((v, i) => { if (v) { s += i % c.w; n++; } }); return s / n; };
  const right = (() => { const c = screen(420, 300); drawActor(ctxOf(c), legView({ x: 280, aim: { x: 280, y: 116 } })); return c; })();
  assert.ok(mean(idle) < 118 && mean(right) > 282, `bows out: ${mean(idle).toFixed(1)} and ${mean(right).toFixed(1)}`);
  // The tip is wherever the sim says: a long leg after a slam reaches there.
  const far = leg({ aim: { x: 60, y: 200 } });
  assert.ok(rows(far)[1] >= 200 && rows(far)[1] <= 208 && cols(far)[0] <= 62, 'to the far tip');
  assert.ok(!same(idle, far));
});

test('a warned leg is raised and its line is drawn on the floor from the root to the tip, dashed in red, marching, with an X where it lands', () => {
  const tip = { x: 190, y: 190 };
  const warn = (t: number): FakeCanvas => leg({ pose: 'warn', anim: 'attack', t, aim: tip });
  const w = warn(4);
  // Points along the line from (120, 60) to the tip, away from the leg's own drawing, are red or hot.
  let hit = 0, total = 0;
  for (let k = 80; k < 190; k += 2) {
    const x = Math.round(120 + ((tip.x - 120) * (k - 60)) / (tip.y - 60)), y = k;
    total++;
    if ([0, 1].some((dx) => [0, 1].some((dy) => w.px[(y + dy) * w.w + x + dx] === px32('hot') || w.px[(y + dy) * w.w + x + dx] === px32('red')))) hit++;
  }
  assert.ok(hit >= total * 0.45 && hit < total, `${hit} of ${total} points of the line: dashed`);
  assert.equal(w.px[tip.y * w.w + tip.x], px32('white'), 'the X is centered on the tip');
  assert.ok(count(w, 'hot') > count(leg({ pose: 'slam', anim: 'attack', aim: tip }), 'hot') + 40, 'a slam draws no line');
  assert.ok(!same(warn(4), warn(7)), 'the dashes march');
  assert.ok(same(warn(4), warn(10)), 'six frames to a dash');
  assert.ok(count(warn(30), 'hot') > count(warn(4), 'hot') - 1, 'it flashes in its last frames');
  assert.ok(rows(w)[0] <= 60 - 30, 'the leg is raised over the body');
  assert.ok(count(w, 'amber') >= 8, 'its claw is hot');
});

test('a slam strikes down the line to the tip, a severed leg is a stump with a raw cut end, and a dead one is the same', () => {
  const tip = { x: 190, y: 190 };
  const slam = leg({ pose: 'slam', anim: 'attack', aim: tip });
  assert.ok(rows(slam)[1] >= 190 && rows(slam)[1] <= 198, 'down to the tip');
  assert.ok(count(slam, 'bone') >= 4, 'a bone claw');
  const cut = leg({ pose: 'severed', aim: tip }), dead = leg({ anim: 'ko', aim: tip });
  for (const c of [cut, dead]) {
    const [t, b] = rows(c), [l, r] = cols(c);
    assert.ok(t >= 40 && b <= 90 && l >= 100 && r <= 140, `a stump by the root: rows ${t} to ${b}, cols ${l} to ${r}`);
    assert.ok(count(c, 'bone') >= 2 && count(c, 'hot') >= 4, 'raw flesh round a pale core');
    assert.ok(painted(c) < painted(slam) / 3);
  }
  assert.ok(same(cut, dead));
  assert.equal(painted(leg({ blink: true })), 0);
  // The legs hang from the body: while it rises they come down with it.
  const c = screen(420, 300), g = ctxOf(c);
  drawActor(g, view('flayer', { x: 200, y: 44, pose: 'rise', t: 10 }));
  const before = painted(c);
  drawActor(g, legView());
  assert.ok(painted(c) > before, 'drawn');
  assert.ok(rows(c)[1] < 140, 'but short of the floor');
});

test('a hit leg shows a bar over its tip, and a severed one shows none', () => {
  drawActor(ctxOf(screen(420, 200)), view('flayer', { x: 210, y: 44 }));
  const bars = (v: ActorView): number => { const s = screen(420, 300); drawActor(ctxOf(s), v); return count(s, 'blood0'); };
  assert.ok(bars(legView({ bar: { hp: 30, hpMax: 90 } })) >= bars(legView()) + 8, 'the bar: its dark back over the tip');
  assert.equal(bars(legView({ bar: { hp: 30, hpMax: 90 }, pose: 'severed' })), bars(legView({ pose: 'severed' })), 'none on a stump');
});

test('legPts: idle and slam rise to a knee and come down on the tip, a warn is raised, a stump is short', () => {
  for (const side of [-1, 1]) {
    const idle = legPts('idle', side, [0, 56]), slam = legPts('slam', side, [40, 130]);
    assert.deepEqual(idle[0], [0, 0]);
    assert.deepEqual(idle[idle.length - 1], [0, 56]);
    assert.ok((idle[1] as number[])[1]! < 0 && Math.sign((idle[1] as number[])[0]!) === side, 'a knee above the root, out to the side');
    assert.deepEqual(slam[slam.length - 1], [40, 130]);
    assert.ok((slam[1] as number[])[1]! < 0);
    const warn = legPts('warn', side, [40, 130]);
    assert.ok(warn.every((p) => p[1] <= 0) && warn.length === 3, 'raised');
    const stump = legPts('severed', side, [40, 130]);
    assert.ok(stump.length === 2 && Math.hypot(...(stump[1] as [number, number])) < 24);
  }
});

// ---------------------------------------------------------------- effects
const fx = (kind: FxView['kind'], over: Partial<FxView> = {}): FxView => ({ kind, x: 150, y: 100, dir: 'down', angle: 1, t: 0, life: 12, w: 0, h: 0, ...over });
const fxOn = (f: FxView): FakeCanvas => { const c = screen(420, 300); drawFx(ctxOf(c), f); return c; };

test('slam: a flash, spokes, a ring of dust and drops of goo at the tip, spreading over 12 frames', () => {
  const at = (t: number): FakeCanvas => fxOn(fx('slam', { t, life: 12, w: 140 }));
  assert.ok(painted(at(0)) > 8 && painted(at(4)) > 40, `${painted(at(0))} then ${painted(at(4))}`);
  const [l0, r0] = cols(at(2)), [l1, r1] = cols(at(10));
  assert.ok(r1 - l1 > r0 - l0, 'it spreads');
  assert.ok(count(at(4), 'white') > 6 && count(at(4), 'amber') > 3 && count(at(4), 'purple', 'magenta') >= 2);
  const [l, r] = cols(at(6)), [t, b] = rows(at(6));
  assert.ok(l >= 150 - 40 && r <= 150 + 40 && t >= 100 - 40 && b <= 100 + 40, 'round the tip');
  assert.ok(painted(at(11)) < painted(at(5)), 'and thins out');
});

test('glass: shafts of light, then panes and shards falling in a spread across the body and landing on the floor', () => {
  const at = (t: number): FakeCanvas => fxOn(fx('glass', { x: 200, y: 44, t, life: 40, w: 128 }));
  assert.ok(painted(at(3)) > 30 && count(at(3), 'white') > 10);
  assert.ok(painted(at(20)) > 100 && count(at(20), 'sky', 'cyan', 'white') === painted(at(20)));
  const [l, r] = cols(at(20));
  assert.ok(l >= 200 - 64 - 12 && r <= 200 + 64 + 12, `across the spread: ${l} to ${r}`);
  const low = (t: number): number => rows(at(t))[1];
  assert.ok(low(36) > low(24) && low(24) > low(14), `falling: ${low(14)} ${low(24)} ${low(36)}`);
  assert.ok(painted(at(39)) < painted(at(28)), 'and gone by the end');
});

test('sweep: for 40 frames a hatched band with marching dashes, then the strike, white and hot across its full width, thinning out', () => {
  const band = { x: 20, y: 100, w: 300, h: 24, life: 52 };
  const at = (t: number): FakeCanvas => fxOn(fx('sweep', { ...band, t }));
  const warn = at(10), near = at(34), strike = at(42), late = at(50);
  assert.ok(count(warn, 'hot') >= 40 && count(warn, 'blood1') > 1000, 'the warning: dashes and a dither');
  assert.ok(count(near, 'red') > count(warn, 'red') + 1000, 'brighter in its last 12 frames');
  assert.equal(count(warn, 'white', 'cream'), 0, 'no strike yet');
  assert.ok(count(strike, 'white') >= 300 * 2 && count(strike, 'hot') >= 300 * 2 && count(strike, 'cream') >= 300, 'the strike');
  assert.ok(painted(late) < painted(strike), 'thinning out');
  for (const c of [warn, near, strike, late]) { const [t, b] = rows(c), [l, r] = cols(c); assert.ok(t >= 100 && b <= 123 && l >= 20 && r <= 319, `inside the band: ${t} to ${b}`); }
  assert.ok(!same(at(10), at(13)), 'the dashes march');
  assert.equal(painted(at(-1)), painted(at(0)), 'a band made this tick (t of -1) shows its first frame');
  assert.equal(painted(fxOn(fx('sweep', { w: 0, h: 24 }))), 0);
});

const poolOn = (p: Partial<PoolView>): FakeCanvas => { const c = screen(120, 90); drawPool(ctxOf(c), { x: 60, y: 45, r: 20, t: 0, life: 480, ...p }); return c; };

test('a pool of goo creeps out when it lands, lies purple with a dark rim and a few bright specks, and dries to nothing at the end', () => {
  assert.ok(painted(poolOn({ t: 2 })) < painted(poolOn({ t: 8 })) && painted(poolOn({ t: 8 })) < painted(poolOn({ t: 24 })), 'spreading');
  assert.ok(painted(poolOn({ t: 24 })) > 500, `${painted(poolOn({ t: 24 }))} px at full`);
  const [l, r] = cols(poolOn({ t: 200 })), [t, b] = rows(poolOn({ t: 200 }));
  assert.ok(l >= 60 - 26 && r <= 60 + 26 && t >= 45 - 17 && b <= 45 + 17, 'round its center');
  assert.ok(r - l + 1 >= 36 && b - t + 1 >= 20, `${r - l + 1} by ${b - t + 1}: 20 px across, about`);
  const full = poolOn({ t: 200 });
  assert.equal(count(full, 'purple', 'purple0', 'magenta'), painted(full), 'three colors');
  assert.ok(count(full, 'magenta') >= 3 && count(full, 'purple0') > 60 && count(full, 'purple') > 100);
  assert.ok(painted(poolOn({ t: 400 })) < painted(poolOn({ t: 200 })) && painted(poolOn({ t: 470 })) < painted(poolOn({ t: 420 })) / 2, 'drying');
  assert.ok(painted(poolOn({ t: 479 })) < 200);
  assert.ok(painted(poolOn({ t: 300 })) > painted(poolOn({ t: 24 })) - 40, 'it creeps a little wider as it lies');
});

test('the world draws the pools on the floor with the hazards, under everything that moves', () => {
  const src = readFileSync(new URL('../src/world/render.ts', import.meta.url), 'utf8');
  const pool = src.indexOf('drawPool(ctx, p)'), hazards = src.indexOf('drawHazard(ctx, h'), items = src.indexOf('drawItem(ctx, it)'), actors = src.indexOf('drawActor(ctx, e.actor)');
  assert.ok(pool > hazards && pool < items && items < actors, 'after the hazards and before the items and the actors');
  assert.match(src, /for \(const p of view\.pools\)/);
});

// ---------------------------------------------------------------- the sheet and the map
test('the sheet has the food court, Billy and the Mind Flayer, each page painting on every sub page and in the list', () => {
  assert.deepEqual([...L9_PAGES, ...L9B_PAGES].map((p) => p.title), ['FOOD COURT', 'BILLY', 'MIND FLAYER']);
  for (const page of [...L9_PAGES, ...L9B_PAGES]) {
    for (let sub = 0; sub < page.subs; sub++) {
      for (const t of [0, 45, 300]) {
        const c = screen(256, 224);
        page.draw(ctxOf(c), t, sub);
        assert.ok(painted(c) > 5000, `${page.title} ${sub} at ${t}`);
      }
    }
  }
  assert.deepEqual([L9_PAGES[0]?.subs, L9_PAGES[1]?.subs, L9B_PAGES[0]?.subs], [3, 5, 4]);
  const sheet = readFileSync(new URL('../src/gfx/sheet.ts', import.meta.url), 'utf8');
  assert.match(sheet, /\.\.\.L9_PAGES, \.\.\.L9B_PAGES/);
});

test('the map names the food court with a plate of its own: stacked under STARCOURT\'s over the dome, grey while the stage is locked', () => {
  const states = (s3: 'locked' | 'open' | 'cleared'): Record<string, 'locked' | 'open' | 'cleared'> => Object.fromEntries(ORDER.map((id) => [id, id === '3.3' ? s3 : 'cleared']));
  for (const s of ['locked', 'open', 'cleared'] as const) {
    const plates = paintLand(states(s)).plates;
    const fc = plates.find((p) => p.name === 'FOOD COURT'), sc = plates.find((p) => p.name === 'STARCOURT');
    assert.ok(fc && sc, 'both plates');
    assert.equal(fc.state, s);
    assert.equal(fc.cx, sc.cx, 'one sign');
    assert.equal(fc.y, sc.y + 8, 'FOOD COURT hangs from the bottom border of STARCOURT, so its plate covers the pointer above');
    assert.equal(fc.point, 'down');
    assert.ok(sc.y > 14, 'clear of the top strip');
    const box = (p: { cx: number; y: number; name: string }): [number, number, number, number] => { const w = p.name.length * 4 + 5, x = Math.round(p.cx - w / 2); return [x, p.y, x + w, p.y + 9]; };
    for (const o of plates) if (o !== fc && o !== sc) {
      const a = box(fc), b = box(o);
      assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], `FOOD COURT clear of ${o.name}`);
    }
    assert.ok(plateRect(fc).y1 < 37 + 4, 'above the dome');
  }
  const [open, shut] = [paintLand(states('open')).px, paintLand(states('locked')).px];
  assert.notDeepEqual(Array.from(open.d), Array.from(shut.d), 'the dome is grey while it is locked');
});
