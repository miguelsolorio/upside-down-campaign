// The hard Lab art: thirteen tiles, four props, the hazard and camera cone overlays, the riot guard and the warden.
// Pure pixel work runs as it is; the draw functions run on a small software canvas (FakeCanvas below), so the tests
// can look at the pixels they put down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActorView, AnimId, Dir, HazardState, HazardView, PropKind, PropState, PropView } from '../src/core/types.ts';
import type { TileName } from '../src/core/tiles.ts';
import { PAL } from '../src/gfx/palette.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { Px } from '../src/gfx/px.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { nightTile } from '../src/gfx/night.ts';
import { composeGuard, composeWarden } from '../src/gfx/actor_foes.ts';
import { GUARD_ART, PALS, TRIM, WARDEN_ART } from '../src/gfx/data/guard.ts';

// ---------------------------------------------------------------- a software canvas
const packed = (s: string): number => {
  const n = parseInt(s.slice(1), 16);
  return ((255 << 24) | (((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255))) >>> 0;
};
class FakeCanvas {
  w = 0; h = 0; px = new Uint32Array(0); g: FakeCtx | null = null;
  get width(): number { return this.w; }
  set width(v: number) { this.w = v; this.px = new Uint32Array(this.w * this.h); }
  get height(): number { return this.h; }
  set height(v: number) { this.h = v; this.px = new Uint32Array(this.w * this.h); }
  getContext(): FakeCtx { return (this.g ??= new FakeCtx(this)); }
}
class FakeCtx {
  fillStyle = '#000000'; imageSmoothingEnabled = false; globalAlpha = 1;
  canvas: FakeCanvas;
  m = { a: 1, d: 1, e: 0, f: 0 };
  clipRect: number[] | null = null;
  path: number[] | null = null;
  stack: { m: { a: number; d: number; e: number; f: number }; clip: number[] | null }[] = [];
  calls = 0;
  constructor(canvas: FakeCanvas) { this.canvas = canvas; }
  save(): void { this.stack.push({ m: { ...this.m }, clip: this.clipRect ? [...this.clipRect] : null }); }
  restore(): void { const s = this.stack.pop(); if (s) { this.m = s.m; this.clipRect = s.clip; } }
  translate(x: number, y: number): void { this.m.e += this.m.a * x; this.m.f += this.m.d * y; }
  scale(x: number, y: number): void { this.m.a *= x; this.m.d *= y; }
  getTransform(): { e: number; f: number } { return { e: this.m.e, f: this.m.f }; }
  beginPath(): void { this.path = null; }
  rect(x: number, y: number, w: number, h: number): void { this.path = [x * this.m.a + this.m.e, y * this.m.d + this.m.f, (x + w) * this.m.a + this.m.e, (y + h) * this.m.d + this.m.f]; }
  clip(): void {
    const p = this.path;
    if (!p) return;
    const k = this.clipRect;
    this.clipRect = k ? [Math.max(p[0] as number, k[0] as number), Math.max(p[1] as number, k[1] as number), Math.min(p[2] as number, k[2] as number), Math.min(p[3] as number, k[3] as number)] : p;
  }
  put(x: number, y: number, v: number): void {
    const c = this.canvas, k = this.clipRect;
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    if (k && (x < (k[0] as number) || y < (k[1] as number) || x >= (k[2] as number) || y >= (k[3] as number))) return;
    c.px[y * c.w + x] = v;
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls++;
    const v = packed(this.fillStyle);
    const x0 = Math.round(x * this.m.a + this.m.e), y0 = Math.round(y * this.m.d + this.m.f);
    const x1 = Math.round((x + w) * this.m.a + this.m.e), y1 = Math.round((y + h) * this.m.d + this.m.f);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this.put(i, j, v);
  }
  drawImage(img: FakeCanvas, ...a: number[]): void {
    this.calls++;
    let sx = 0, sy = 0, sw = img.w, sh = img.h, dx = a[0] as number, dy = a[1] as number, dw = sw, dh = sh;
    if (a.length === 4) { dw = a[2] as number; dh = a[3] as number; }
    if (a.length === 8) { [sx, sy, sw, sh, dx, dy, dw, dh] = a as [number, number, number, number, number, number, number, number]; }
    const X0 = Math.round(dx * this.m.a + this.m.e), Y0 = Math.round(dy * this.m.d + this.m.f);
    const X1 = Math.round((dx + dw) * this.m.a + this.m.e), Y1 = Math.round((dy + dh) * this.m.d + this.m.f);
    for (let j = Y0; j < Y1; j++) {
      for (let i = X0; i < X1; i++) {
        const u = sx + Math.floor(((i - X0) / (X1 - X0)) * sw), v = sy + Math.floor(((j - Y0) / (Y1 - Y0)) * sh);
        const p = img.px[v * img.w + u] as number;
        if (u >= 0 && v >= 0 && u < img.w && v < img.h && p >>> 24 !== 0) this.put(i, j, p);
      }
    }
  }
  createImageData(w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  putImageData(img: { width: number; data: Uint8ClampedArray }, dx: number, dy: number, sx = 0, sy = 0, sw = img.width, sh = 1e9): void {
    this.calls++;
    const u = new Uint32Array(img.data.buffer), rows = Math.min(sh, u.length / img.width - sy);
    for (let j = sy; j < sy + rows; j++) for (let i = sx; i < sx + sw; i++) {
      const x = dx + i, y = dy + j;
      if (x >= 0 && y >= 0 && x < this.canvas.w && y < this.canvas.h) this.canvas.px[y * this.canvas.w + x] = u[j * img.width + i] as number;
    }
  }
}
Object.assign(globalThis, { document: { createElement: (): FakeCanvas => new FakeCanvas() } });

function screen(w = 256, h = 224): { c: FakeCanvas; g: FakeCtx } {
  const c = new FakeCanvas();
  c.width = w; c.height = h;
  return { c, g: c.getContext() };
}
const colorsIn = (c: FakeCanvas): Set<number> => new Set(Array.from(c.px).filter((v) => v !== 0));
const painted = (c: FakeCanvas): number => c.px.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
const has = (c: FakeCanvas, ...names: ColorName[]): boolean => names.some((n) => colorsIn(c).has(px32(n)));
const same = (a: FakeCanvas, b: FakeCanvas): boolean => a.px.length === b.px.length && a.px.every((v, i) => v === b.px[i]);

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawProp } = await import('../src/gfx/props.ts');
const { drawActor, drawActorFrame, drawHeroBar } = await import('../src/gfx/actors.ts');
const { drawCamCone, drawHazard } = await import('../src/gfx/overlays.ts');
const { createSheetScene } = await import('../src/gfx/sheet.ts');

// ---------------------------------------------------------------- tiles
const NEW_TILES: TileName[] = ['locker', 'bench', 'cabinet', 'shelf', 'cable', 'drain', 'stain', 'vines', 'mass', 'tilegreen', 'carpet', 'wallsign', 'plate'];
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const paint = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const NEARS: Near[] = [
  { n: 'labcap', e: 'labfloor', s: 'labwall', w: 'labfloor' },
  { n: 'labwall', e: 'cable', s: 'tilegreen', w: 'carpet' },
  { n: 'plate', e: 'plate', s: 'gravel', w: 'vines' },
  { n: 'mass', e: 'locker', s: 'labfloor2', w: 'cabinet' },
];

test('every new tile is painted, 16 by 16, with no see-through pixels, in any company, by day and at night', () => {
  for (const name of NEW_TILES) {
    for (let i = 0; i < 12; i++) {
      const c = ctxAt(2 + i * 5, 3 + i * 3, i % 5 === 4 ? around(name) : (NEARS[i % 4] as Near));
      const day = paint(name, c);
      assert.ok(day, `${name} has a painter`);
      assert.equal(day.w, 16, name);
      assert.equal(day.h, 16, name);
      assert.ok(day.d.every((v) => v >>> 24 === 255), `${name} is fully painted`);
      assert.ok(nightTile(day, name, c).d.every((v) => v >>> 24 === 255), `${name} is fully painted at night`);
    }
  }
});

test('a tile is the same every time: same position and neighbours, same pixels', () => {
  for (const name of NEW_TILES) {
    for (const near of NEARS) {
      const a = paint(name, ctxAt(9, 7, near)), b = paint(name, ctxAt(9, 7, near));
      assert.deepEqual(a.d, b.d, name);
    }
  }
});

test('floors and mess vary from tile to tile, so a room is not stamped', () => {
  for (const name of ['tilegreen', 'carpet', 'plate', 'stain', 'vines', 'drain'] as TileName[]) {
    const seen = new Set<string>();
    for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(name, ctxAt(tx, ty, around('labfloor'))).d.join());
    assert.ok(seen.size >= 40, `${name}: ${seen.size} different tiles out of 64`);
  }
  for (const name of ['locker', 'bench', 'cabinet', 'shelf', 'wallsign', 'mass'] as TileName[]) {
    const seen = new Set<string>();
    for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(name, ctxAt(tx, ty, around(name))).d.join());
    assert.ok(seen.size >= 16, `${name}: ${seen.size} different tiles out of 64`);
  }
});

const count = (px: Px, names: ColorName[]): number => {
  const set = new Set(names.map((n) => px32(n)));
  return px.d.reduce((n, v) => n + (set.has(v) ? 1 : 0), 0);
};

test('each room floor looks like itself: green tile is green, carpet is dark, plate is steel', () => {
  const lum = (px: Px): number => px.d.reduce((s, v) => s + 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255), 0) / 256;
  assert.ok(count(paint('tilegreen', ctxAt(4, 4, around('tilegreen'))), ['pine2', 'pine3', 'leaf']) >= 100, 'green tile');
  assert.ok(lum(paint('carpet', ctxAt(4, 4, around('carpet')))) < 60, 'carpet is dark');
  assert.ok(count(paint('plate', ctxAt(4, 4, around('plate'))), ['grey2', 'grey3', 'bone', 'mist']) >= 150, 'plate is steel');
  assert.ok(count(paint('mass', ctxAt(4, 4, around('labwall'))), ['red', 'blood0', 'blood1']) >= 100, 'mass is red flesh');
  assert.ok(count(paint('vines', ctxAt(4, 4, around('carpet'))), ['red', 'blood1']) >= 8, 'vines are red veins');
});

test('cables, drains, stains and vines lie on the floor their neighbours show', () => {
  const green = around('tilegreen'), dark = around('carpet'), steel = around('plate');
  assert.ok(count(paint('drain', ctxAt(5, 5, green)), ['pine1', 'pine2', 'pine3', 'leaf']) >= 80, 'a drain on green tile');
  assert.ok(count(paint('stain', ctxAt(5, 5, dark)), ['shadow', 'dusk', 'night']) >= 60, 'a stain on carpet');
  assert.ok(count(paint('cable', ctxAt(5, 5, { ...steel, e: 'cable', w: 'cable' })), ['grey2', 'grey3']) >= 60, 'a cable on plate');
  assert.ok(count(paint('vines', ctxAt(5, 5, dark)), ['shadow', 'dusk', 'night']) >= 60, 'vines on carpet');
  const gravel = paint('stain', ctxAt(5, 5, around('gravel')));
  assert.ok(count(gravel, ['grey2']) >= 40, 'a stain on gravel');
});

test('a floor beside a wall gets its shadow, the furniture beside a floor stands on that floor', () => {
  for (const name of ['tilegreen', 'carpet', 'plate'] as TileName[]) {
    const open = paint(name, ctxAt(6, 6, around(name))), walled = paint(name, ctxAt(6, 6, { ...around(name), n: 'labwall' }));
    assert.notDeepEqual(open.d, walled.d, `${name} has a shadow under a wall`);
  }
  const bench = paint('bench', ctxAt(6, 6, { n: 'labwall', e: 'tilegreen', s: 'tilegreen', w: 'tilegreen' }));
  assert.ok(count(bench, ['pine2', 'pine3']) >= 4 || count(bench, ['grey3']) >= 4, 'a bench stands in a room');
  const rows = paint('cabinet', ctxAt(6, 6, { n: 'carpet', e: 'cabinet', s: 'carpet', w: 'cabinet' }));
  assert.equal(rows.get(0, 8), rows.get(0, 9), 'a bank of cabinets runs on through its neighbours');
});

// ---------------------------------------------------------------- props
const KINDS: PropKind[] = ['camera', 'tank', 'rack', 'generator'];
const STATES: PropState[] = ['closed', 'open', 'lit', 'off', 'alert'];
const SIZES: [number, number][] = [[16, 16], [16, 32], [32, 24], [32, 32]];
const view = (kind: PropKind, state: PropState, t: number, w = 16, h = 16, cam = true): PropView => ({
  id: `${kind}1`, kind, x: 40, y: 40, w, h, state, t,
  ...(cam ? { cam: { angle: t / 20, range: 80, half: 0.5, live: state !== 'lit' } } : {}),
});
function drawn(p: PropView, night = false): FakeCanvas {
  const { c, g } = screen(128, 128);
  drawProp(g as never, p, night);
  return c;
}

test('every new prop draws in every state, at every size, by day and at night, and puts something down', () => {
  for (const kind of KINDS) {
    for (const state of STATES) {
      for (const [w, h] of SIZES) {
        for (const t of [0, 1, 59, 1000]) {
          for (const night of [false, true]) {
            const c = drawn(view(kind, state, t, w, h), night);
            assert.ok(painted(c) > 40, `${kind} ${state} ${w}x${h} t${t}`);
          }
        }
      }
    }
  }
  assert.ok(painted(drawn(view('camera', 'closed', 5, 16, 16, false))) > 40, 'a camera with no cone still draws');
});

test('the props stay inside their spawn size, give or take the 1 px rim', () => {
  for (const kind of ['tank', 'rack', 'generator'] as PropKind[]) {
    for (const [w, h] of SIZES) {
      for (const t of [0, 31, 77, 150]) {
        const c = drawn(view(kind, 'closed', t, w, h));
        for (let y = 0; y < 128; y++) {
          for (let x = 0; x < 128; x++) {
            if (!c.px[y * 128 + x]) continue;
            assert.ok(x >= 39 && x <= 40 + w + 1 && y >= 40 - 12 && y <= 40 + h, `${kind} ${w}x${h} t${t} pixel ${x},${y}`);
          }
        }
      }
    }
  }
});

test('a prop is a pure function of its view: the same view draws the same pixels', () => {
  for (const kind of KINDS) for (const t of [0, 33, 211]) assert.ok(same(drawn(view(kind, 'closed', t)), drawn(view(kind, 'closed', t))), `${kind} t${t}`);
});

test('the animated props move: bubbles rise, LEDs blink, the generator hums, the head turns', () => {
  const far = (kind: PropKind, w: number, h: number): boolean => [7, 19, 31, 43].some((d) => !same(drawn(view(kind, 'closed', 0, w, h)), drawn(view(kind, 'closed', d, w, h))));
  assert.ok(far('tank', 16, 32), 'tank');
  assert.ok(far('rack', 16, 32), 'rack');
  assert.ok(far('generator', 32, 24), 'generator');
  const left = { ...view('camera', 'closed', 0), cam: { angle: Math.PI, range: 80, half: 0.5, live: true } };
  const right = { ...left, cam: { angle: 0, range: 80, half: 0.5, live: true } };
  assert.ok(!same(drawn(left), drawn(right)), 'the camera turns its head');
});

test('a camera reads three ways: calm, alert (dark and red) and dead (dark, no light)', () => {
  const calm = drawn(view('camera', 'closed', 3)), alert = drawn(view('camera', 'alert', 3)), dead = drawn(view('camera', 'lit', 3));
  assert.ok(has(calm, 'bone', 'white'), 'a calm camera is pale');
  assert.ok(!has(alert, 'bone', 'white'), 'an alert camera is dark');
  assert.ok(has(alert, 'red', 'hot'), 'an alert camera is red-lit');
  assert.ok(!has(dead, 'red', 'hot', 'cyan', 'bone', 'white'), 'a dead camera shows no light');
  assert.ok(!same(calm, alert) && !same(alert, dead) && !same(calm, dead));
});

test('nothing in a prop flashes faster than 3 Hz: no pixel changes more than six times in a second', () => {
  for (const kind of KINDS) {
    for (const [w, h] of [[16, 16], [16, 32], [32, 24]] as [number, number][]) {
      for (const state of ['closed', 'alert', 'lit'] as PropState[]) {
        const frames: FakeCanvas[] = [];
        for (let t = 300; t < 360; t++) frames.push(drawn(view(kind, state, t, w, h, state !== 'alert' ? true : false)));
        let worst = 0;
        for (let i = 0; i < 128 * 128; i++) {
          let changes = 0;
          for (let f = 1; f < frames.length; f++) if ((frames[f] as FakeCanvas).px[i] !== (frames[f - 1] as FakeCanvas).px[i]) changes++;
          worst = Math.max(worst, changes);
        }
        assert.ok(worst <= 6, `${kind} ${state} ${w}x${h}: a pixel changes ${worst} times in 60 frames`);
      }
    }
  }
});

// ---------------------------------------------------------------- overlays
const hz = (kind: 'electric' | 'steam', state: HazardState, t = 12): HazardView => ({ id: kind, kind, x: 96, y: 96, w: 48, h: 32, state, t });

test('the hazards draw in every state, off or warning or on, and an on hazard shows more than an off one', () => {
  for (const kind of ['electric', 'steam'] as const) {
    const out = (state: HazardState): number => {
      const { c, g } = screen();
      for (const frame of [0, 5, 40, 333]) drawHazard(g as never, hz(kind, state), 0, 0, frame);
      return painted(c);
    };
    assert.ok(out('on') > out('warn'), `${kind}: on shows more than warn`);
    assert.ok(out('warn') > out('off'), `${kind}: warn shows more than off`);
    assert.ok(out('on') > 200, `${kind}: on is a real thing`);
  }
  const { c, g } = screen();
  drawHazard(g as never, hz('steam', 'off'), 0, 0, 10);
  assert.equal(painted(c), 0, 'a steam vent that is off draws nothing');
});

test('electric arcs are white and blue, steam is white, bone and grey', () => {
  const e = screen(), s = screen();
  drawHazard(e.g as never, hz('electric', 'on'), 0, 0, 20);
  drawHazard(s.g as never, hz('steam', 'on'), 0, 0, 20);
  assert.ok(has(e.c, 'white') && has(e.c, 'cyan', 'sky'), 'arcs');
  assert.ok(has(s.c, 'white', 'bone', 'mist'), 'plume');
  assert.ok(!has(s.c, 'cyan', 'sky', 'hot', 'yellow'), 'steam has no color');
});

test('a hazard places itself under the camera, and draws the same inside a world translate', () => {
  for (const kind of ['electric', 'steam'] as const) {
    const a = screen(), b = screen();
    drawHazard(a.g as never, hz(kind, 'on'), 40, 24, 17);
    b.g.translate(-40, 20 - 24);
    drawHazard(b.g as never, hz(kind, 'on'), 40, 24, 17);
    assert.ok(same(a.c, b.c), `${kind}: the same pixels either way`);
    assert.ok(painted(a.c) > 100);
  }
  const { c, g } = screen();
  drawHazard(g as never, { ...hz('steam', 'on'), x: 100, y: 10, h: 8 }, 0, 0, 3);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 256; x++) assert.equal(c.px[y * 256 + x], 0, 'nothing in the HUD strip');
});

const cone = (over: Partial<PropView['cam'] & object> = {}, state: PropState = 'closed'): PropView => ({
  id: 'cam1', kind: 'camera', x: 120, y: 60, w: 16, h: 16, state, t: 0,
  cam: { angle: Math.PI / 2, range: 90, half: 0.5, live: true, ...over },
});
const open = (): boolean => false;

test('a camera cone is a yellow wedge while calm and a red one while alert, and nothing once the camera is shot', () => {
  const calm = screen(), alert = screen(), dead = screen();
  drawCamCone(calm.g as never, cone(), open, 0, 0, 10);
  drawCamCone(alert.g as never, cone({}, 'alert'), open, 0, 0, 10);
  drawCamCone(dead.g as never, cone({ live: false }, 'lit'), open, 0, 0, 10);
  assert.ok(painted(calm.c) > 300, 'a wedge');
  assert.ok(has(calm.c, 'yellow') && !has(calm.c, 'hot', 'red'), 'yellow while calm');
  assert.ok(has(alert.c, 'hot', 'red') && !has(alert.c, 'yellow', 'amber'), 'red while alert');
  assert.equal(painted(dead.c), 0, 'a dead camera shows no cone');
});

test('the cone is cast in rays and stops at solid tiles: nothing shows through a wall', () => {
  // The camera sits at world (128, 76). A wall of solid tiles runs along tile row 7, which is y 112 to 127.
  const wall = (_tx: number, ty: number): boolean => ty === 7;
  const free = screen(), blocked = screen();
  drawCamCone(free.g as never, cone(), open, 0, 0, 10);
  drawCamCone(blocked.g as never, cone(), wall, 0, 0, 10);
  const rowY = (y: number): number => y + 20;
  let behind = 0, before = 0, behindFree = 0;
  for (let y = 0; y < 224; y++) for (let x = 0; x < 256; x++) {
    const wy = y - 20;
    if (blocked.c.px[y * 256 + x] && wy >= 112) behind++;
    if (free.c.px[y * 256 + x] && wy >= 112) behindFree++;
    if (blocked.c.px[y * 256 + x] && wy < 112) before++;
  }
  assert.ok(behindFree > 50, `the open cone reaches past the wall line: ${behindFree}`);
  assert.equal(behind, 0, 'nothing is drawn at or past the wall');
  assert.ok(before > 200, 'the cone still shows in front of the wall');
  assert.ok(rowY(0) === 20);
  const side = screen();
  drawCamCone(side.g as never, cone({ angle: 0 }), (tx) => tx >= 10, 0, 0, 10);
  for (let y = 0; y < 224; y++) for (let x = 160; x < 256; x++) assert.equal(side.c.px[y * 256 + x], 0, 'stopped at a wall on its right');
});

test('the cone takes its half width in radians or degrees, and draws the same in both', () => {
  const rad = screen(), deg = screen();
  drawCamCone(rad.g as never, cone({ half: 0.5 }), open, 0, 0, 10);
  drawCamCone(deg.g as never, cone({ half: (0.5 * 180) / Math.PI }), open, 0, 0, 10);
  assert.ok(same(rad.c, deg.c));
});

test('the cone follows the heading, and the camera it hangs from, in world px', () => {
  const left = screen(), right = screen(), moved = screen(), shifted = screen();
  drawCamCone(left.g as never, cone({ angle: Math.PI }), open, 0, 0, 10);
  drawCamCone(right.g as never, cone({ angle: 0 }), open, 0, 0, 10);
  let leftSide = 0, rightSide = 0;
  for (let y = 0; y < 224; y++) for (let x = 0; x < 256; x++) {
    if (left.c.px[y * 256 + x]) leftSide += x < 128 ? 1 : -1;
    if (right.c.px[y * 256 + x]) rightSide += x > 128 ? 1 : -1;
  }
  assert.ok(leftSide > 100 && rightSide > 100, 'it points where the camera points');
  drawCamCone(moved.g as never, cone(), open, 0, 0, 10);
  drawCamCone(shifted.g as never, { ...cone(), x: 120 + 16, y: 60 + 16 }, open, 16, 16, 10);
  assert.ok(same(moved.c, shifted.c), 'camera and view move together');
});

// ---------------------------------------------------------------- the guard and the warden
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const ANIMS: AnimId[] = ['idle', 'walk', 'attack', 'cast', 'dash', 'hurt', 'ko'];
const actor = (id: 'guard' | 'warden' | 'agent' | 'rat', over: Partial<ActorView> = {}): ActorView => ({
  kind: 'enemy', id, x: 64, y: 90, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
function seen(a: ActorView): FakeCanvas {
  const { c, g } = screen(128, 128);
  drawActor(g as never, a);
  return c;
}
const bounds = (c: FakeCanvas): { x0: number; y0: number; x1: number; y1: number } => {
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.px[y * c.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};

test('the guard and the warden draw for every direction and animation, shield up or down, normal or elite', () => {
  for (const id of ['guard', 'warden'] as const) {
    for (const dir of DIRS) {
      for (const anim of ANIMS) {
        for (const t of [0, 5, 40]) {
          for (const guarding of [true, false]) {
            for (const elite of [false, true]) {
              const c = seen(actor(id, { dir, anim, t, guarding, elite, bar: { hp: 5, hpMax: 10 }, alert: t === 5, flash: t === 40 ? 0.7 : 0, tint: t === 0 ? 'cyan' : null }));
              assert.ok(painted(c) > 60, `${id} ${dir} ${anim} t${t} ${guarding} ${elite}`);
            }
          }
        }
      }
    }
  }
});

test('a hero\'s HP bar is the HUD color over the head, drawn by drawHeroBar and not by drawActor', () => {
  const hero = (over: Partial<ActorView> = {}): ActorView => actor('guard', { kind: 'hero', id: 'mike', bar: { hp: 12, hpMax: 12 }, ...over });
  const bare = painted(seen(hero({ bar: null })));
  assert.equal(painted(seen(hero())), bare, 'drawActor leaves a hero\'s bar to the last pass');
  const bar = (v: ActorView, color: ColorName): FakeCanvas => { const { c, g } = screen(128, 128); drawHeroBar(g as never, v, color); return c; };
  const full = bar(hero(), 'leaf'), half = bar(hero({ bar: { hp: 6, hpMax: 12 } }), 'yellow');
  assert.deepEqual(bounds(full), { x0: 60, y0: bounds(full).y0, x1: 67, y1: bounds(full).y0 + 3 }, 'a 6 px bar in an 8 by 4 frame, centered on the feet');
  assert.ok(has(full, 'leaf', 'pine3') && !has(full, 'hot', 'yellow'));
  assert.ok(has(half, 'yellow', 'amber') && has(half, 'shadow'), 'half full leaves the rest dark');
  const fill = (c: FakeCanvas, name: ColorName): number => Array.from(c.px).filter((v) => v === px32(name)).length;
  assert.equal(fill(full, 'leaf'), 6);
  assert.equal(fill(half, 'yellow'), 3);
  assert.equal(fill(bar(hero({ bar: { hp: 1, hpMax: 400 } }), 'hot'), 'hot'), 1, 'any HP at all shows a pixel');
  assert.equal(painted(bar(hero({ bar: { hp: 0, hpMax: 12 } }), 'hot')), 8 * 4, 'no HP is an empty frame');
  assert.equal(painted(bar(hero({ bar: null }), 'leaf')), 0);
  const jump = bounds(bar(hero({ z: 6 }), 'leaf'));
  assert.equal(jump.y0, bounds(full).y0 - 6, 'it rides along with a jump');
  assert.equal(painted(bar(hero({ blink: true }), 'leaf')), painted(full), 'an invulnerability flicker does not hide it');
  assert.ok(painted(seen(actor('guard', { bar: { hp: 5, hpMax: 10 } }))) > painted(seen(actor('guard'))), 'an enemy still draws its own bar');
});

test('every pixel of a guard or warden frame is a role the palette knows', () => {
  for (const id of ['guard', 'warden'] as const) {
    const known = new Set([...Object.keys(PALS[id]), ...Object.keys(TRIM[id].normal), 'k'].map((c) => c.charCodeAt(0)));
    const art = id === 'guard' ? GUARD_ART : WARDEN_ART;
    for (const view of ['down', 'up', 'side'] as const) {
      for (const part of [art.head[view], art.torso[view], ...Object.values(art.legs[view])]) {
        for (const row of part.rows) assert.equal(row.length, art.cell, `${id} ${view} row ${row}`);
      }
      for (const anim of ANIMS) {
        for (let f = 0; f < 4; f++) {
          for (const low of [false, true]) {
            const buf = id === 'guard' ? composeGuard(view, anim, f, low) : composeWarden(view, anim, f, low);
            assert.equal(buf.length, art.cell * art.cell);
            for (const v of buf) assert.ok(v === 0 || known.has(v), `${id} ${view} ${anim} ${f} role ${String.fromCharCode(v)}`);
          }
        }
      }
    }
  }
});

test('the warden is bigger than the guard, and stands on the same feet', () => {
  const g = bounds(seen(actor('guard'))), w = bounds(seen(actor('warden')));
  assert.ok(w.y1 - w.y0 >= g.y1 - g.y0 + 5, `warden ${w.y1 - w.y0} tall against guard ${g.y1 - g.y0}`);
  assert.ok(w.x1 - w.x0 >= g.x1 - g.x0 + 5, 'and wider');
  assert.ok(Math.abs(w.y1 - g.y1) <= 2, 'feet at the same line');
  assert.ok(Math.abs((w.x0 + w.x1) / 2 - (g.x0 + g.x1) / 2) <= 2, 'centered on the same spot');
});

test('a lowered shield looks different from a raised one, in every direction', () => {
  for (const id of ['guard', 'warden'] as const) {
    for (const dir of DIRS) {
      const up = seen(actor(id, { dir, guarding: true })), down = seen(actor(id, { dir, guarding: false }));
      assert.ok(!same(up, down), `${id} ${dir}`);
    }
    assert.ok(same(seen(actor(id, { dir: 'down' })), seen(actor(id, { dir: 'down', guarding: true }))), `${id}: a shield is up unless the sim says otherwise`);
  }
});

test('an elite has red trim, a normal one does not, and the bar is 2 px wider', () => {
  for (const id of ['guard', 'warden', 'agent', 'rat'] as const) {
    const normal = seen(actor(id, { dir: 'right' })), elite = seen(actor(id, { dir: 'right', elite: true }));
    const red = (c: FakeCanvas): number => c.px.reduce((n, v) => n + (v === px32('red') || v === px32('hot') ? 1 : 0), 0);
    assert.ok(red(elite) >= red(normal) + 4, `${id}: ${red(elite)} red pixels against ${red(normal)}`);
  }
  const barWidth = (elite: boolean): number => {
    const c = seen(actor('guard', { dir: 'down', elite, bar: { hp: 10, hpMax: 10 } }));
    let best = 0;
    for (let y = 0; y < c.h; y++) {
      let run = 0;
      for (let x = 0; x < c.w; x++) { run = c.px[y * c.w + x] === px32('ink') ? run + 1 : 0; best = Math.max(best, run); }
    }
    return best;
  };
  assert.equal(barWidth(true), barWidth(false) + 2);
});

test('facing left is facing right turned over', () => {
  for (const id of ['guard', 'warden'] as const) {
    for (const anim of ['idle', 'walk', 'attack', 'hurt', 'ko'] as AnimId[]) {
      const cell = id === 'guard' ? 16 : 24;
      const l = screen(cell, cell), r = screen(cell, cell);
      drawActorFrame(l.g as never, id, 'left', anim, 0, 0, 0);
      drawActorFrame(r.g as never, id, 'right', anim, 0, 0, 0);
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) assert.equal(l.c.px[y * cell + x], r.c.px[y * cell + (cell - 1 - x)], `${id} ${anim} ${x},${y}`);
    }
  }
});

// ---------------------------------------------------------------- the sheet
test('the sheet pages for the hard Lab draw without trouble', () => {
  const pages: [number, number][] = [[3, 0], [3, 1], [3, 2], [4, 0], [4, 2], [4, 3], [5, 0], [5, 2], [5, 3], [9, 0], [9, 1], [9, 2], [9, 3], [9, 4]];
  for (const [page, sub] of pages) {
    Object.assign(globalThis, { location: { search: `?page=${page}&sub=${sub}` } });
    const scene = createSheetScene();
    for (const t of [0, 90]) {
      for (let i = t === 0 ? 0 : 90; i > 0; i--) (scene as unknown as { update(g: unknown): void }).update({ input: { pressed: () => false } });
      const { c, g } = screen();
      (scene as unknown as { draw(ctx: unknown): void }).draw(g);
      assert.ok(painted(c) > 20000, `page ${page} sub ${sub} t${t}`);
    }
  }
  assert.ok(PAL.red.length > 0);
});
