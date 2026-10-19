// Chapter 5's two landmarks on the map screen (docs/map-screen.md, "Chapter five on the map"), both small pictures that hang in the Upside Down half,
// painted like the tunnels' mouth and the gate: a dark ground, a few lights, a one pixel black outline. The lockdown (5.1) is a floodlight on
// its mast over a wall of sandbags, its cold cone dithered across them. The Abyss (5.2) is a floating island over the void: a lawn with a house on
// it, one window lit, rock tapering to a point under it with a red vein in it, vines hanging off the rim and two small rocks drifting below.
// Pure pixel work; map_land.ts places them and greys them while their stage is locked.
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import { sandbagArt } from './ch5/lockdown_props.ts';
import { framed, remap } from './map_art.ts';

/** The sandbags as the dark side sees them: a shade darker and warmer than the daylight ones. */
const BAGS: Partial<Record<ColorName, ColorName>> = { cream: 'sand', bone: 'sand', sand: 'soil3', soil3: 'soil2', soil2: 'soil1' };

/** The checkpoint seen from the dark side, 32 by 28 with its outline: a sandbag wall, a floodlight on a mast at its right end, and the cone it throws left across the bags. */
export function lockdownMark(): Px {
  const p = new Px(30, 26);
  const lampX = 22, top = 5, floor = 21;
  // The cone first, under everything: a checker of cold light between two edges that open from the lamp down onto the bags.
  for (let y = top; y <= floor; y++) {
    const u = (y - top) / (floor - top), xl = Math.round(lampX - 1 - u * 17), xr = Math.round(lampX + 1 - u * 4);
    for (let x = xl; x <= xr; x++) {
      const edge = x === xl || x === xr;
      if (edge) p.set(x, y, u < 0.25 ? 'white' : 'mist');
      else if (((x + y) & 1) === 0) p.set(x, y, u < 0.3 ? 'bone' : 'slate');
    }
  }
  // The wall: two courses of bags along the bottom, the lit ones where the cone falls.
  const bags = remap(sandbagArt(30, 9), (c) => BAGS[c] ?? c);
  p.blit(bags, 0, 17);
  for (let x = 3; x < 20; x++) if ((x & 1) === 0) p.set(x, 18, 'cream');
  p.rect(0, 25, 30, 1, 'soil0');
  // The mast: a lattice, with its foot in the wall.
  for (let y = top + 1; y <= 19; y++) { p.set(lampX - 1, y, 'grey2').set(lampX + 1, y, 'grey2'); if (y % 3 === 0) p.set(lampX, y, 'grey3'); }
  // The lamp bank over it: a dark case with four lamps burning.
  p.rect(lampX - 6, 1, 13, 4, 'grey1').rect(lampX - 6, 1, 13, 1, 'grey3').rect(lampX - 6, 4, 13, 1, 'ink');
  for (let k = 0; k < 4; k++) p.rect(lampX - 5 + k * 3, 2, 2, 2, 'white');
  p.set(lampX - 5, 2, 'cream').set(lampX - 2, 2, 'cream');
  return framed(p);
}

/** The Abyss seen from far off, 38 by 30 with its outline: a floating island with a house, rock hanging under it, vines off its rim, and two rocks adrift. */
export function abyssMark(): Px {
  const p = new Px(36, 28);
  const cx = 17;
  // The rock under the island: it narrows to a point, darker toward the tip, with a red vein down it.
  for (let y = 9; y < 25; y++) {
    const u = (y - 9) / 16, hw = Math.max(0.5, 15 * (1 - u) ** 0.8);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const lit = x < cx - hw * 0.35;
      p.set(x, y, u > 0.7 ? 'night' : lit ? 'purple0' : 'shadow');
      if (!lit && ((x * 3 + y * 5) % 7) === 0 && u < 0.7) p.set(x, y, 'dusk');
    }
    if (u > 0.1 && u < 0.85) p.set(Math.round(cx + 2 + Math.sin(y * 0.9) * 1.6), y, y % 4 === 0 ? 'hot' : 'red');
  }
  // The top: a lawn slab with a lit edge, its rim ragged.
  p.ellipse(cx, 9, 16, 3.4, 'purple0');
  p.ellipse(cx, 8, 15.5, 2.6, 'pine1');
  for (let x = 3; x < 32; x++) if (((x * 7) % 5) < 3) p.set(x, 6, 'pine2');
  // The house: a pitched roof, a wall, a lit window and a door, with a chimney.
  p.rect(11, 3, 11, 5, 'soil1').rect(10, 8, 13, 1, 'soil0');
  for (let i = 0; i < 4; i++) p.rect(15 - i, i, 3 + i * 2, 1, i < 2 ? 'blood1' : 'blood0');
  p.rect(18, 0, 2, 2, 'blood0');
  p.rect(13, 4, 3, 3, 'ink').rect(14, 4, 2, 2, 'amber').set(14, 4, 'yellow');
  p.rect(18, 5, 2, 3, 'ink');
  // Vines off the rim, and two rocks drifting under it.
  for (const [x, len] of [[5, 5], [8, 8], [27, 6], [30, 4]] as [number, number][]) for (let k = 0; k < len; k++) p.set(x + (k % 3 === 2 ? 1 : 0), 10 + k, k === len - 1 ? 'blood1' : 'purple');
  p.rect(2, 21, 3, 2, 'night').rect(2, 21, 3, 1, 'purple0').rect(30, 18, 2, 2, 'night').set(30, 18, 'purple0');
  return framed(p);
}
