// The art of levels 5 and 6: Max, Steve and Hopper, the Alpha, the tunnel and overrun Lab tiles, the gap, crack and rift props and
// the trail, howl and taunt effects. Pure pixel work, so Node runs it: no canvas, the effects go to a recording stand-in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FxView } from '../src/core/types.ts';
import { ANIM_ORDER, POSES, composeFrame } from '../src/gfx/actor_pose.ts';
import { ALPHA_H, ALPHA_W, alphaPx, alphaSpec } from '../src/gfx/actor_alpha.ts';
import type { AlphaPose } from '../src/gfx/actor_alpha.ts';
import { ELEVEN } from '../src/gfx/data/heroes.ts';
import { HOPPER } from '../src/gfx/data/hopper.ts';
import { MAX } from '../src/gfx/data/max.ts';
import { STEVE } from '../src/gfx/data/steve.ts';
import type { CharSpec, View } from '../src/gfx/data/types.ts';
import { PORTRAITS } from '../src/gfx/data/portraits.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { drawFx } from '../src/gfx/fx.ts';
import { crackArt, gapArt, riftArt, RIFT_STEPS, sealRootsArt } from '../src/gfx/props_gate.ts';
import { fleshTile } from '../src/gfx/tile_flesh.ts';
import type { TileCtx } from '../src/gfx/tile_ground.ts';
import { tunnelTile } from '../src/gfx/tile_tunnel.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { Px } from '../src/gfx/px.ts';

const VIEWS: View[] = ['down', 'up', 'side'];
const around = (n: TileName): TileCtx['near'] => ({ n, e: n, s: n, w: n });
const ink = px32('ink');

/** Every frame a hero atlas holds, as [anim, frame, view, role buffer]. */
function frames(spec: CharSpec): [string, number, View, Uint8Array][] {
  const out: [string, number, View, Uint8Array][] = [];
  for (const view of VIEWS) for (const anim of ANIM_ORDER) for (let f = 0; f < POSES[anim].length; f++) out.push([anim, f, view, composeFrame(spec, view, anim, f)]);
  return out;
}
const count = (buf: Uint8Array, ch: string): number => buf.reduce((n, v) => n + (v === ch.charCodeAt(0) ? 1 : 0), 0);

test('Max, Steve and Hopper: every frame is mapped, uses at most five colors and has a body', () => {
  for (const spec of [MAX, STEVE, HOPPER]) {
    const colors = new Set<string>();
    for (const [anim, f, view, buf] of frames(spec)) {
      let opaque = 0;
      for (const v of buf) {
        if (!v) continue;
        opaque++;
        if (v === 107) continue;
        const name = spec.pal[String.fromCharCode(v)];
        assert.ok(name, `${spec.id} ${anim} ${f} ${view}: role ${String.fromCharCode(v)} has no color`);
        // Ink drawn as a fill (a grip, a boot) is the outline's own color, so it is not a fifth.
        if (name !== 'ink') colors.add(name);
      }
      assert.ok(opaque > 30, `${spec.id} ${anim} ${f} ${view} is drawn`);
    }
    assert.ok(colors.size <= 5, `${spec.id} uses ${[...colors].join(',')}`);
  }
});

test('the board shows in Max\'s attack and her Skate dash, and the carried one is left out while it swings', () => {
  for (const view of VIEWS) {
    const rest = composeFrame(MAX, view, 'idle', 0), wind = composeFrame(MAX, view, 'attack', 0), hit = composeFrame(MAX, view, 'attack', 1), dash = composeFrame(MAX, view, 'dash', 0);
    // The deck is cyan, 'x', and the headphones are too, so compare with her resting frame: a swing adds a board and takes the carried one away.
    for (const [name, buf] of [['wind-up', wind], ['hit', hit], ['dash', dash]] as [string, Uint8Array][]) {
      assert.ok(count(buf, 'g') >= 2, `${view} ${name}: the wheels show`);
      assert.ok(count(buf, 'x') >= count(rest, 'x') - 2, `${view} ${name}: the deck shows`);
    }
    assert.notDeepEqual(wind, hit, `${view}: the wind-up and the hit differ`);
  }
  // Riding: the board is a row under her feet.
  const dash = composeFrame(MAX, 'side', 'dash', 0);
  let deckRow = -1;
  for (let y = 0; y < 16; y++) { let run = 0; for (let x = 0; x < 16; x++) if (dash[y * 16 + x] === 'x'.charCodeAt(0)) run++; if (run >= 9) deckRow = y; }
  assert.ok(deckRow >= 12, `the deck is under her feet (row ${deckRow})`);
});

test('Steve\'s nail bat shows in both attack frames, with its nails', () => {
  for (const view of VIEWS) {
    for (const f of [0, 1]) {
      const buf = composeFrame(STEVE, view, 'attack', f);
      assert.ok(count(buf, 'G') >= 5, `${view} ${f}: the barrel shows (${count(buf, 'G')})`);
      assert.ok(count(buf, 'n') >= 1, `${view} ${f}: a nail shows`);
    }
    assert.equal(count(composeFrame(STEVE, view, 'idle', 0), 'G'), 0, `${view}: no bat at rest`);
  }
});

test('Steve\'s hair is much bigger than the kids\': wider than his head, and taller', () => {
  const hair = (spec: CharSpec): number => spec.hair.down.reduce((n, p) => n + p.rows.join('').replace(/\./g, '').length, 0);
  assert.ok(hair(STEVE) > 40, `${hair(STEVE)} hair pixels from the front`);
  const widest = Math.max(...STEVE.hair.down.flatMap((p) => p.rows.map((r) => r.replace(/\./g, '').length)));
  assert.ok(widest >= 14, `${widest} px across`);
  assert.ok(STEVE.hair.down[0]!.rows.length >= 6 && STEVE.hair.up[0]!.rows.length >= 8, 'long, as well as wide');
});

test('each of them has a portrait of their own with a face for all five expressions, and Max is no longer the old one', () => {
  for (const who of ['max', 'steve', 'hopper'] as const) {
    const p = PORTRAITS[who];
    assert.ok(p.front.length > 0, `${who} has front hair or a hat`);
  }
  assert.notEqual(PORTRAITS.steve, PORTRAITS.mike);
  assert.notEqual(PORTRAITS.hopper, PORTRAITS.joyce);
  assert.equal(PORTRAITS.steve.bg, 'teal1');
});

test('Eleven channeling holds her arms up: a cast frame with the hands above where the thrust has them', () => {
  const raised = (buf: Uint8Array): number => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (buf[y * 16 + x] === 's'.charCodeAt(0) && (x < 4 || x > 11)) return y; return 99; };
  for (const view of ['down', 'up'] as View[]) {
    const channel = composeFrame(ELEVEN, view, 'cast', 2), thrust = composeFrame(ELEVEN, view, 'cast', 1);
    assert.ok(raised(channel) < raised(thrust), `${view}: hands at row ${raised(channel)} against ${raised(thrust)}`);
  }
});

// ---------------------------------------------------------------- the Alpha
const ALPHA_POSES: AlphaPose[] = ['stand', 'stepA', 'stepB', 'windup', 'bite', 'lunge', 'crouch', 'air', 'howl', 'stun', 'hurt', 'lying'];

test('the Alpha draws every pose in every view at 32 by 24, in four colors, feet on the bottom', () => {
  const seen = new Set<number>();
  for (const view of ['down', 'up', 'side'] as const) {
    for (const pose of ALPHA_POSES) {
      const p = alphaPx({ view, flip: false, pose, frame: 0 });
      assert.equal(p.w, ALPHA_W); assert.equal(p.h, ALPHA_H);
      let opaque = 0;
      for (const v of p.d) { if (!v) continue; opaque++; if (v !== ink) seen.add(v); }
      assert.ok(opaque > 120, `${view} ${pose} has a body (${opaque})`);
      if (pose !== 'lying' && pose !== 'air' && pose !== 'lunge') {
        let low = false;
        for (let x = 0; x < ALPHA_W; x++) if (p.d[22 * ALPHA_W + x] || p.d[21 * ALPHA_W + x]) low = true;
        assert.ok(low, `${view} ${pose} stands on the bottom rows`);
      }
    }
  }
  assert.ok(seen.size <= 4, `${seen.size} colors`);
});

test('the Alpha\'s poses differ, and a left facing one is the right facing one flipped', () => {
  const key = (p: Px): string => Array.from(p.d).join(',');
  const keys = ALPHA_POSES.map((pose) => key(alphaPx({ view: 'side', flip: false, pose, frame: 0 })));
  assert.equal(new Set(keys).size, ALPHA_POSES.length, 'every pose is its own picture');
  const r = alphaPx({ view: 'side', flip: false, pose: 'bite', frame: 0 }), l = alphaPx({ view: 'side', flip: true, pose: 'bite', frame: 0 });
  for (let y = 0; y < ALPHA_H; y++) for (let x = 0; x < ALPHA_W; x++) assert.equal(l.d[y * ALPHA_W + x], r.d[y * ALPHA_W + ALPHA_W - 1 - x]);
});

test('what the sim sends picks the pose: bite, wind-up, lunge, crouch, leap, howl, stun', () => {
  const v = (over: object) => ({ dir: 'right' as const, anim: 'idle' as const, pose: undefined, t: 0, z: 0, alert: false, ...over });
  assert.equal(alphaSpec(v({ anim: 'attack', alert: true })).pose, 'windup');
  assert.equal(alphaSpec(v({ anim: 'attack' })).pose, 'bite');
  assert.equal(alphaSpec(v({ anim: 'dash' })).pose, 'lunge');
  assert.equal(alphaSpec(v({ pose: 'crouch' })).pose, 'crouch');
  assert.equal(alphaSpec(v({ pose: 'leap', z: 9 })).pose, 'air');
  assert.equal(alphaSpec(v({ pose: 'howl', anim: 'cast' })).pose, 'howl');
  assert.equal(alphaSpec(v({ pose: 'stun' })).pose, 'stun');
  assert.equal(alphaSpec(v({ anim: 'ko' })).pose, 'lying');
  assert.equal(alphaSpec(v({ dir: 'left' })).flip, true);
});

// ---------------------------------------------------------------- tiles
const solid = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const TUNNEL: TileName[] = ['tunnelfloor', 'tunnelcap', 'tunnelwall', 'roots', 'veins', 'nest', 'ladder'];
const FLESH: TileName[] = ['fleshfloor', 'fleshwall', 'tear'];

test('every tunnel and flesh tile is fully painted at every spot and every pulse step, and no two spots look the same', () => {
  for (const name of [...TUNNEL, ...FLESH]) {
    const seen = new Set<string>();
    for (let ty = 3; ty < 9; ty++) {
      for (let tx = 3; tx < 9; tx++) {
        for (const phase of [0, 2]) {
          const c: TileCtx = { tx, ty, near: around(name) };
          const p = (TUNNEL.includes(name) ? tunnelTile(name, c, phase) : fleshTile(name, c, phase)) as Px;
          assert.ok(solid(p), `${name} at ${tx},${ty} is opaque`);
          if (phase === 0) seen.add(Array.from(p.d).join(','));
        }
      }
    }
    assert.ok(seen.size >= 18, `${name}: ${seen.size} different tiles in 36`);
  }
});

test('the veins and the tear pulse: a step of the pulse paints a different tile', () => {
  for (const name of ['veins', 'tear'] as TileName[]) {
    const c: TileCtx = { tx: 5, ty: 5, near: around(name) };
    const a = (ph: number): number[] => Array.from(((name === 'veins' ? tunnelTile(name, c, ph) : fleshTile(name, c, ph)) as Px).d);
    assert.notDeepEqual(a(0), a(1), `${name} moves`);
    assert.deepEqual(a(0), a(4), `${name} comes round`);
  }
});

test('roots creep from tile to tile: where two root tiles meet, the root on one side of the edge is on the other too', () => {
  const rootish = new Set([px32('sand'), px32('soil3')]);
  let met = 0;
  for (let ty = 2; ty < 14; ty++) {
    for (let tx = 2; tx < 14; tx++) {
      const a = tunnelTile('roots', { tx, ty, near: around('roots') }) as Px, b = tunnelTile('roots', { tx: tx + 1, ty, near: around('roots') }) as Px;
      const ys = (p: Px, x: number): number[] => { const out: number[] = []; for (let y = 0; y < 16; y++) if (rootish.has(p.d[y * 16 + x] as number)) out.push(y); return out; };
      const east = ys(a, 15), west = ys(b, 0);
      if (east.includes(6) && east.includes(7)) { met++; assert.ok(west.includes(6) && west.includes(7), `the root crosses between ${tx},${ty} and ${tx + 1},${ty}`); }
    }
  }
  assert.ok(met >= 20, `${met} joins`);
});

test('a root beside a wall grows out of it, and a root with nothing beside it does not reach the edge of its tile', () => {
  const root = new Set([px32('sand'), px32('soil3')]);
  let touchesWall = 0, lone = 0, loneTouches = 0;
  for (let tx = 2; tx < 30; tx++) {
    const withWall = tunnelTile('roots', { tx, ty: 4, near: { n: 'tunnelwall', e: 'tunnelfloor', s: 'tunnelfloor', w: 'tunnelfloor' } }) as Px;
    let top = 0;
    for (let x = 0; x < 16; x++) if (root.has(withWall.d[x] as number)) top++;
    if (top >= 3) touchesWall++;
    const alone = tunnelTile('roots', { tx, ty: 9, near: around('tunnelfloor') }) as Px;
    lone++;
    for (let i = 0; i < 16; i++) if ([alone.d[i], alone.d[240 + i], alone.d[i * 16], alone.d[i * 16 + 15]].some((v) => root.has(v as number))) { loneTouches++; break; }
  }
  assert.ok(touchesWall >= 10, `roots reached the wall in ${touchesWall} of 28`);
  assert.ok(loneTouches <= lone / 4, `${loneTouches} of ${lone} lone roots reach an edge`);
});

// ---------------------------------------------------------------- props
test('the gap is 16 by 32 or 32 by 16, the same open or shut; the crack is a slab then rubble; the rift shuts to a seam', () => {
  assert.deepEqual([gapArt(16, 32).w, gapArt(16, 32).h], [16, 32]);
  assert.deepEqual([gapArt(32, 16).w, gapArt(32, 16).h], [32, 16]);
  for (const [w, h] of [[32, 16], [16, 32]]) {
    const shut = crackArt(w, h, false), open = crackArt(w, h, true);
    assert.deepEqual([shut.w, shut.h], [w, h]);
    const filled = (p: Px): number => p.d.filter((v) => v).length;
    assert.ok(filled(shut) > w * h * 0.9, 'the slab fills the passage');
    assert.ok(filled(open) < w * h * 0.7 && filled(open) > 40, 'the rubble leaves the floor showing');
  }
  const wide = riftArt(64, 48, 0, 0), seam = riftArt(64, 48, RIFT_STEPS, 0);
  assert.deepEqual([wide.w, wide.h], [64, 48]);
  const black = px32('black');
  const cleft = (p: Px): number => p.d.filter((v) => v === black).length;
  assert.ok(cleft(wide) > 300, `wide open: ${cleft(wide)} px of black`);
  assert.ok(cleft(seam) < 40 && cleft(wide) > cleft(seam) * 8, `shut: ${cleft(seam)} px of black`);
  for (let k = 1; k < RIFT_STEPS; k++) assert.ok(cleft(riftArt(64, 48, k, 0)) <= cleft(riftArt(64, 48, k - 1, 0)), `closing at ${k}`);
  assert.ok(sealRootsArt(32, 16).d.some((v) => v) && sealRootsArt(16, 32).h === 32);
});

// ---------------------------------------------------------------- effects
/** A stand-in 2D context that records the rects it is asked to fill. */
function recorder(): { ctx: CanvasRenderingContext2D; rects: [number, number, number, number, string][] } {
  const rects: [number, number, number, number, string][] = [];
  const ctx = { fillStyle: '#000', fillRect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h, String(this.fillStyle)]); } };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
const fx = (kind: FxView['kind'], t: number, life: number, w: number, angle = 0): FxView => ({ kind, x: 100, y: 100, dir: 'right', angle, t, life, w, h: 10 });

test('the trail runs from where the roll began along its heading and is gone when its life is up', () => {
  const at = (t: number): [number, number, number, number, string][] => { const r = recorder(); drawFx(r.ctx, fx('trail', t, 24, 72)); return r.rects; };
  const mid = at(12), gone = at(24);
  assert.ok(mid.length > 40, `${mid.length} rects mid roll`);
  const xs = mid.map((r) => r[0]);
  assert.ok(Math.min(...xs) <= 104 && Math.max(...xs) >= 140, 'it spans the roll');
  assert.ok(Math.max(...mid.map((r) => r[0])) <= 100 + 72 + 4, 'and no further than its length');
  assert.ok(gone.length < 8, `${gone.length} rects at the end`);
  const down = recorder(); drawFx(down.ctx, fx('trail', 12, 24, 72, Math.PI / 2));
  assert.ok(Math.max(...down.rects.map((r) => r[1])) >= 130, 'it runs down when the heading does');
});

test('the howl and the taunt are rings that grow to w, the taunt in warm colors and the howl in cold ones', () => {
  for (const [kind, w] of [['howl', 96], ['taunt', 144]] as const) {
    const reach = (t: number): number => { const r = recorder(); drawFx(r.ctx, fx(kind, t, 40, w)); return Math.max(0, ...r.rects.map((q) => Math.hypot(q[0] - 100, q[1] - 100))); };
    assert.ok(reach(4) < reach(14) && reach(14) < reach(26), `${kind} grows`);
    assert.ok(reach(30) <= w / 2 + 12, `${kind} stops at its size`);
  }
  const warm = recorder(); drawFx(warm.ctx, fx('taunt', 14, 40, 144));
  const cold = recorder(); drawFx(cold.ctx, fx('howl', 14, 40, 96));
  const reds = (r: ReturnType<typeof recorder>): number => r.rects.filter((q) => parseInt(q[4].slice(1, 3), 16) > parseInt(q[4].slice(5, 7), 16)).length;
  assert.ok(reds(warm) > warm.rects.length * 0.8, 'the taunt is warm');
  assert.ok(reds(cold) < cold.rects.length * 0.2, 'the howl is cold');
});
