// The map's Kamchatka inset (docs/map-screen.md, "Chapter four on the map"): Hopper's prison camp is half a world from Hawkins, so it is not
// drawn in the town but in a framed picture in the corner of it, the camp at night in the Blizzard look the owner picked (tile_camp.ts): a
// dark blue sky with a few stars, snow with wind ridges that goes blue-grey under the block, the concrete block with barred windows (one lit)
// and its door, the floodlight's lamp in amber with its cone and its pool dithered over the snow, the wire fence in front on its posts, and
// snow in the air. The frame is an ink edge round a pale line, like the plates. A locked stage shows it in greys, like every
// landmark (map_art.ts). Pure pixel work, so Node can run it.
import { BAYER4 } from './canvas.ts';
import { Px } from './px.ts';
import type { Paint } from './px.ts';

/** The inset's place on the map screen, frame included: the top left corner of Hawkins, over the sky above the woods. */
export const INSET = { x: 3, y: 10, w: 62, h: 20 };
const W = INSET.w - 4, H = INSET.h - 4;

const bayer = (x: number, y: number): number => (BAYER4[(y & 3) * 4 + (x & 3)] as number) / 16;
/** A dither: `b` where the ordered pattern says k of the pixels are, `a` elsewhere. */
const mix = (x: number, y: number, k: number, a: Paint, b: Paint): Paint => (bayer(x, y) < k ? b : a);

/** The floodlight's pole, a lamp head with a lens and the cone and the pool it throws, in amber. */
function floodlight(p: Px, x: number, base: number): void {
  p.rect(x, 4, 1, base - 3, 'grey3').rect(x - 1, base, 3, 1, 'grey2');
  p.rect(x - 3, 1, 7, 3, 'grey2').rect(x - 3, 1, 7, 1, 'grey3').rect(x - 2, 3, 5, 1, 'yellow').rect(x - 1, 3, 3, 1, 'cream');
  // The cone: a triangle of amber dither widening from the lens to the snow, then the pool on the ground.
  for (let y = 4; y <= base; y++) {
    const half = 1 + Math.round(((y - 4) / (base - 4)) * 9);
    for (let dx = -half; dx <= half; dx++) if (bayer(x + dx, y) < 0.34 - (y - 4) * 0.014) p.set(x + dx, y, 'amber');
  }
  for (let y = base - 3; y <= base + 2; y++) {
    for (let dx = -12; dx <= 12; dx++) {
      const d = Math.hypot(dx / 12, (y - base + 0.5) / 3.2);
      if (d < 1 && bayer(x + dx, y) < (1 - d) * 0.85) p.set(x + dx, y, d < 0.45 ? 'yellow' : 'amber');
    }
  }
}

/** The wire fence across the foreground: posts with a snow cap every twelve pixels and two strands that sag between them. */
function wire(p: Px): void {
  for (let x = 0; x < W; x++) {
    const sag = Math.round(Math.sin((Math.PI * (((x + 8) % 12) + 0.5)) / 12) * 1.2);
    p.set(x, 12 + sag, 'ink').set(x, 14 + sag, 'ink');
  }
  for (let x = 4; x < W; x += 12) p.rect(x, 10, 1, 6, 'bone').rect(x, 9, 1, 1, 'white').rect(x - 1, 9, 3, 1, 'mist');
}

/** The camp at night in a 58 by 16 picture. */
function scene(): Px {
  const p = new Px(W, H);
  for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) p.set(x, y, y < 3 ? 'night' : y < 6 ? mix(x, y, (y - 2) / 3, 'night', 'shadow') : mix(x, y, (y - 5) / 3, 'shadow', 'dusk'));
  for (const [x, y] of [[5, 1], [17, 0], [29, 1], [41, 0], [51, 2], [55, 1], [10, 3]] as const) p.set(x, y, y < 1 ? 'bone' : 'mist');
  for (let y = 8; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, y === 8 ? 'dusk' : 'slate');
  for (let x = 0; x < W; x++) if (bayer(x, 9) < 0.5) p.set(x, 9, 'dusk');
  for (const [x, y, n] of [[2, 10, 5], [14, 12, 4], [24, 13, 5], [38, 12, 5], [47, 10, 4], [52, 14, 4]] as const) p.rect(x, y, n, 1, 'mist').rect(x + 1, y + 1, n - 1, 1, 'dusk');
  // The block: a flat roof with snow along its edge, a concrete face, barred windows (the middle one lit) and a door.
  p.rect(22, 2, 26, 2, 'grey1').rect(22, 2, 26, 1, 'mist').rect(22, 4, 26, 7, 'grey2').rect(22, 4, 26, 1, 'grey3').rect(22, 10, 26, 1, 'grey1');
  for (const x of [25, 31, 37]) p.rect(x, 6, 4, 3, 'black').set(x + 1, 6, 'mist').set(x + 2, 7, 'mist').set(x + 1, 8, 'mist');
  p.rect(31, 6, 4, 3, 'amber').rect(31, 6, 4, 1, 'yellow').set(32, 7, 'black').set(33, 8, 'black');
  p.rect(42, 6, 3, 5, 'ink');
  // The path to the door, a strip of trodden snow.
  for (let y = 11; y < H; y++) p.rect(41 - Math.round((y - 11) * 2.2), y, 3, 1, 'dusk');
  floodlight(p, 12, 11);
  wire(p);
  for (let i = 0; i < 18; i++) {
    const x = (i * 17 + 5) % W, y = (i * 7 + 3) % H;
    if (p.get(x, y) !== 0) p.set(x, y, i % 3 ? 'white' : 'bone');
  }
  return p;
}

/** The inset, 62 by 20: the scene in its frame. */
export function kamchatka(): Px {
  const out = new Px(INSET.w, INSET.h).fill('ink');
  out.frame(1, 1, INSET.w - 2, INSET.h - 2, 'mist');
  return out.blit(scene(), 2, 2);
}
