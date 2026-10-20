// The screen fills the window: always 224 tall, as wide as the window's shape, and the world only ever shown in a
// clear band up to 28 tiles wide. Pure, so no canvas is needed.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_W, CLEAR_MAX, FRAME_X, HUD_PAD_X, HUD_PAD_Y, MAX_W, SCREEN_H, SCREEN_W, STRIP_H, VIEW_TOP, VIEW_W, VIEW_X, setScreenWidth } from '../src/core/config.ts';
import { cameraSnap, createCamera } from '../src/core/camera.ts';
import { clientToGame } from '../src/core/pointer.ts';
import { fitScreen } from '../src/core/viewport.ts';
import { CONTENT_DY, hudBand } from '../src/ui/hudlayout.ts';

afterEach(() => setScreenWidth(BASE_W));

test('common windows: the width follows the shape and the canvas fills the window', () => {
  const cases: [number, number, number, number, number][] = [
    // window w, h, dpr, then screen width and scale k
    [1280, 800, 1, 360, 4],
    [1920, 1080, 1, 400, 5],
    [1920, 1080, 2, 400, 10],
    [1512, 860, 2, 392, 8],
    [3440, 1440, 1, 536, 7],
    [5120, 1440, 1, 800, 7],
    [1024, 896, 1, 256, 4],
  ];
  for (const [ww, wh, dpr, w, k] of cases) {
    const f = fitScreen(ww, wh, dpr);
    assert.equal(f.w, w, `${ww}x${wh} width`);
    assert.equal(f.k, k, `${ww}x${wh}@${dpr} scale`);
    assert.equal(f.cssW, ww, `${ww}x${wh} fills the width`);
    assert.equal(f.cssH, wh, `${ww}x${wh} fills the height`);
  }
});

test('a window narrower than 256 by 224 gets bars top and bottom, one wider than 1024 gets them at the sides', () => {
  const tall = fitScreen(600, 900, 1);
  assert.equal(tall.w, BASE_W);
  assert.equal(tall.cssW, 600);
  assert.equal(tall.cssH, 525);
  const wide = fitScreen(7000, 1000, 1);
  assert.equal(wide.w, MAX_W);
  assert.equal(wide.cssH, 1000);
  assert.equal(wide.cssW, 4571);
});

test('the dev scenes keep 256 and fit inside the window', () => {
  const f = fitScreen(1920, 1080, 1, BASE_W);
  assert.equal(f.w, BASE_W);
  assert.equal(f.cssH, 1080);
  assert.ok(f.cssW < 1920);
});

test('every window size: a width in steps of 8, pixels the same shape, and a canvas the browser will make', () => {
  for (const dpr of [1, 1.25, 1.5, 2, 3]) {
    for (let ww = 200; ww <= 7680; ww += 173) {
      for (let wh = 150; wh <= 2400; wh += 131) {
        const f = fitScreen(ww, wh, dpr);
        const at = `${ww}x${wh}@${dpr}`;
        assert.equal(f.w % 8, 0, at);
        assert.ok(f.w >= BASE_W && f.w <= MAX_W, at);
        assert.ok(f.cssW <= ww + 0.5 / dpr && f.cssH <= wh + 0.5 / dpr, `${at} fits the window`);
        assert.ok(Math.abs(f.cssW - ww) <= 1 / dpr || Math.abs(f.cssH - wh) <= 1 / dpr, `${at} fills one side`);
        const stretch = f.cssW / f.w / (f.cssH / SCREEN_H);
        assert.ok(Math.abs(stretch - 1) < 0.02, `${at} stretches ${stretch}`);
        assert.ok(f.k >= 1, at);
        assert.ok(f.w * f.k * SCREEN_H * f.k <= 16_777_216, `${at} canvas too big`);
      }
    }
  }
});

test('a window with no size gets a harmless fit', () => {
  const f = fitScreen(0, 0, 1);
  assert.equal(f.w, BASE_W);
  assert.equal(f.k, 1);
});

test('the clear band stops at 448 and sits centered, and everything lands on multiples of 4', () => {
  setScreenWidth(536);
  assert.equal(SCREEN_W, 536);
  assert.equal(VIEW_W, CLEAR_MAX);
  assert.equal(VIEW_X, 44);
  assert.equal(FRAME_X, 140);
  setScreenWidth(360);
  assert.equal(VIEW_W, 360);
  assert.equal(VIEW_X, 0);
  assert.equal(FRAME_X, 52);
  assert.equal(VIEW_TOP, STRIP_H + HUD_PAD_Y * 2, 'a wider screen gives the HUD strip room above and below');
  for (let w = BASE_W; w <= MAX_W; w += 8) {
    setScreenWidth(w);
    assert.equal(VIEW_X % 4, 0, `${w}`);
    assert.equal(FRAME_X % 4, 0, `${w}`);
  }
  setScreenWidth(100);
  assert.equal(SCREEN_W, BASE_W);
  assert.equal(VIEW_TOP, STRIP_H, 'at 256 the strip is as it always was');
  setScreenWidth(5000);
  assert.equal(SCREEN_W, MAX_W);
});

test('the camera centers the hero in the band, and the band meets the map at its edges', () => {
  setScreenWidth(536);
  const cam = createCamera();
  cameraSnap(cam, 384, 320, 768, 640);
  assert.equal(cam.x + SCREEN_W / 2, 384, 'the hero is in the middle of the screen');
  cameraSnap(cam, 10, 320, 768, 640);
  assert.equal(cam.x + VIEW_X, 0, 'the band starts at the map\'s left edge');
  cameraSnap(cam, 760, 320, 768, 640);
  assert.equal(cam.x + VIEW_X + VIEW_W, 768, 'the band ends at the map\'s right edge');
  cameraSnap(cam, 100, 100, 300, 640);
  assert.equal(cam.x + SCREEN_W / 2, 150, 'a map narrower than the band is centered');
  cameraSnap(cam, 384, 636, 768, 640);
  assert.equal(cam.y + SCREEN_H - VIEW_TOP, 640, 'under the taller strip, the view still ends at the map\'s bottom edge');
});

test('at 256 the camera frames the world as it always has', () => {
  const cam = createCamera();
  for (const fx of [0, 100, 384, 700, 768]) {
    cameraSnap(cam, fx, 300, 768, 640);
    assert.equal(cam.x, Math.round(Math.max(0, Math.min(768 - 256, fx - 128))), `fx ${fx}`);
  }
});

test('clicks and the HUD follow the live width', () => {
  setScreenWidth(536);
  const box = { left: 0, top: 0, width: 536 * 3, height: SCREEN_H * 3 };
  const mid = clientToGame(box.width / 2, box.height / 2, box);
  assert.ok(mid && mid.x === 268 && mid.y === SCREEN_H / 2);
  assert.deepEqual(hudBand(), { x: 44 + HUD_PAD_X, w: 448 - HUD_PAD_X * 2, top: HUD_PAD_Y + CONTENT_DY, h: STRIP_H + HUD_PAD_Y * 2 });
  setScreenWidth(264);
  assert.deepEqual(hudBand(), { x: 4, w: 256, top: HUD_PAD_Y + CONTENT_DY, h: STRIP_H + HUD_PAD_Y * 2 }, 'a band just wider than the strip gets a smaller inset');
});
