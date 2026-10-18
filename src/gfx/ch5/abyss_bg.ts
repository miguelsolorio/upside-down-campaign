// The Abyss's backdrop (stage 5.2), drawn behind the tiles so it shows through the gaps (abyss_tiles.ts leaves them clear): a dark red void
// that goes from black at the top to a far glow at the bottom, in dithered bands with long streaks of haze, a black sun with a thin red
// rim and a corona, specks of far rock that bob as they drift, and spores rising. The still part (the void, the haze, the sun) is painted
// once into a canvas a little bigger than the screen and slid a few px against the camera, so the void has depth; what moves is a dozen
// small rock sprites and forty specks, all plain functions of the frame counter, so a frame costs one blit and about sixty fills.
// Called like title_art's sky and spores, in screen px, before the tiles: drawAbyssBg(ctx, t, camX, camY).
import { FRAME_X, SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import { BAYER4, hash2, rect } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

/** How far the still layer may slide against the camera, in px each way. */
const PAD = 12;
const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;
const VOID: ColorName[] = ['black', 'ink', 'blood0', 'blood1'];

/** The sun's center on the 256 wide frame and its radius. */
const SUN = { x: 176, y: 60, r: 30 };

/** The void's tone at a frame pixel, 0 (black) to 3 (the far glow): dark above, redder toward the bottom, lifted round the sun. */
function tone(fx: number, y: number): number {
  const down = Math.pow(Math.max(0, Math.min(1, y / SCREEN_H)), 1.5);
  const d = Math.hypot(fx - SUN.x, y - SUN.y);
  const halo = Math.max(0, 1 - Math.max(0, d - SUN.r) / 46);
  const side = Math.min(1.4, Math.abs(fx - 128) / 128);
  return 0.5 + down * 2.35 + halo * halo * 1.1 - side * side * 0.3;
}

/** Long dark streaks of haze, [x, y, half width, half height, dark or light]. */
const HAZE: [number, number, number, number, boolean][] = [
  [40, 30, 70, 3, false], [200, 100, 80, 3, false], [90, 150, 90, 4, true], [30, 185, 60, 3, true], [210, 176, 70, 4, true], [130, 80, 50, 2, false], [60, 118, 64, 3, false],
];

let still: { c: HTMLCanvasElement; w: number } | null = null;

/** The void, the haze and the sun, painted once for a screen this wide. */
function stillLayer(): HTMLCanvasElement {
  if (still && still.w === SCREEN_W) return still.c;
  const W = SCREEN_W + PAD * 2, H = SCREEN_H + PAD * 2, px = new Px(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = tone(x - PAD - FRAME_X, y - PAD), lo = Math.floor(t), i = Math.max(0, Math.min(3, lo + (t - lo > bayer(x, y) ? 1 : 0)));
      px.set(x, y, VOID[i] as ColorName);
    }
  }
  // The haze repeats every 256 px, so a wider screen is not bare at the sides.
  for (const [hx, hy, rx, ry, dark] of HAZE) {
    for (const off of [-256, 0, 256]) {
      for (let y = Math.floor(hy - ry); y <= Math.ceil(hy + ry); y++) {
        for (let x = Math.floor(hx - rx); x <= Math.ceil(hx + rx); x++) {
          const a = (x - hx) / rx, b = (y - hy) / ry;
          if (a * a + b * b <= 1 && bayer(x, y) < (1 - a * a - b * b) * 0.55) px.set(x + off + PAD + FRAME_X, y + PAD, dark ? 'black' : 'blood0');
        }
      }
    }
  }
  sun(px, SUN.x + FRAME_X + PAD, SUN.y + PAD);
  const c = px.toCanvas();
  still = { c, w: SCREEN_W };
  return c;
}

/** The black sun: a corona of red dither that thins out, a thin rim, and a black disc, its upper left edge lit hotter. */
function sun(px: Px, cx: number, cy: number): void {
  const R = SUN.r;
  for (let y = cy - R - 14; y <= cy + R + 14; y++) {
    for (let x = cx - R - 14; x <= cx + R + 14; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= R) {
        px.set(x, y, 'black');
        if (d > R - 1.2) {
          const lit = (x + 0.5 - cx) + (y + 0.5 - cy) < 0;
          px.set(x, y, lit ? 'hot' : 'red');
        }
      } else if (d < R + 3) px.set(x, y, bayer(x, y) < 0.7 ? 'blood1' : 'blood0');
      else if (d < R + 8) { if (bayer(x, y) < 0.35) px.set(x, y, 'blood1'); }
      else if (d < R + 14) { if (bayer(x, y) < 0.18) px.set(x, y, 'blood1'); }
    }
  }
  // A second, fainter rim a few px in, so the disc reads as a sphere and not a hole.
  for (let a = 0; a < 360; a += 3) {
    const r = (a * Math.PI) / 180;
    if (Math.cos(r - 2.4) < 0.1) continue;
    px.set(cx + Math.cos(r) * (R - 3), cy + Math.sin(r) * (R - 3), 'blood0');
  }
}

// ---------------------------------------------------------------- far rock
/** A chunk of rock, pointing down, w px wide: a flat top, sides that close to a point, a flat dark body with its top edge lit toward the sun and a shade along the lower right. */
function chunk(w: number, rimColor: ColorName, body: ColorName): HTMLCanvasElement {
  const h = Math.max(5, Math.round(w * 0.75)), px = new Px(w, h);
  const c = (w - 1) / 2;
  for (let x = 0; x < w; x++) {
    const taper = 1 - Math.abs(x - c) / (w / 2 + 0.5), len = Math.max(2, Math.round((h - 1) * taper ** 0.85));
    px.rect(x, 1, 1, len, body);
    px.set(x, 1, rimColor);
    if (x > c && len > 3) px.set(x, len, rimColor);
  }
  return px.toCanvas();
}

interface Rock { x: number; y: number; depth: number; sprite: HTMLCanvasElement; phase: number }
let rocks: Rock[] | null = null;

function rockList(): Rock[] {
  if (rocks) return rocks;
  rocks = [];
  for (let i = 0; i < 11; i++) {
    const far = i % 2 === 0, w = far ? 7 + (hash2(i, 1, 21) % 6) : 14 + (hash2(i, 1, 21) % 9);
    const y = 14 + (hash2(i, 3, 21) % 170);
    rocks.push({
      x: hash2(i, 2, 21) % 256, y, depth: far ? 0.18 : 0.4, phase: hash2(i, 4, 21) % 400,
      sprite: chunk(w, ...(y < 100 ? (far ? ['blood0', 'night'] : ['blood1', 'shadow']) : (far ? ['blood1', 'black'] : ['red', 'black'])) as [ColorName, ColorName]),
    });
  }
  return rocks;
}

// ---------------------------------------------------------------- spores
const SPORE: ColorName[] = ['blood1', 'rose', 'hot', 'pink'];
const SPORES = 40;

/** Specks rising through the void, slowly, swaying a little; the near ones are bigger and brighter. */
function spores(ctx: Ctx, t: number, camX: number): void {
  for (let i = 0; i < SPORES; i++) {
    const s = hash2(i, 5, 31), near = i % 4 === 0;
    const speed = (near ? 0.16 : 0.07) + ((s >> 8) % 8) / 120;
    const y = SCREEN_H - ((t * speed + ((s >> 12) % SCREEN_H)) % SCREEN_H);
    const x = FRAME_X + ((s % 256) + Math.round(Math.sin(t / 70 + i) * 3) - Math.round(camX * (near ? 0.12 : 0.05)) + 512) % 256;
    const col = SPORE[(near ? 2 : 0) + (i & 1)] as ColorName;
    rect(ctx, x, y, near && i % 8 === 0 ? 2 : 1, near && i % 8 === 0 ? 2 : 1, col);
  }
}

/** Draws the backdrop over the whole screen. t is the frame counter, camX and camY the camera in world px. */
export function drawAbyssBg(ctx: Ctx, t: number, camX = 0, camY = 0): void {
  const dx = Math.max(-PAD, Math.min(PAD, Math.round(-camX * 0.06))), dy = Math.max(-PAD, Math.min(PAD, Math.round(-camY * 0.06)));
  ctx.drawImage(stillLayer(), dx - PAD, dy - PAD);
  for (const r of rockList()) {
    const bob = settings.reduceFlashing ? 0 : Math.round(Math.sin((t + r.phase) / 55) * 2);
    const x = FRAME_X + ((r.x - Math.round(camX * r.depth * 0.3) - Math.floor(t * 0.01 * (1 + r.depth)) + 1024) % 288) - 16;
    ctx.drawImage(r.sprite, x, r.y + bob - Math.round(camY * r.depth * 0.2));
  }
  // The sun's rim catches a glint that creeps round it, unless flashing is reduced.
  if (!settings.reduceFlashing) {
    const a = (t / 90) % (Math.PI * 2);
    rect(ctx, Math.round(SUN.x + FRAME_X + dx + Math.cos(a) * (SUN.r - 0.5)), Math.round(SUN.y + dy + Math.sin(a) * (SUN.r - 0.5)), 2, 1, 'pink');
  }
  spores(ctx, t, camX);
}
