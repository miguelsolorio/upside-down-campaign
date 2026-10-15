// The Russian base under the mall (stage 3.2), the owner's pick: Brass's base, the riveted iron of var/base_rust.ts. Old iron on a
// boiler's power: riveted plates streaked with rust, lattice grating over a furnace glow, a steam pipe run along every wall with red valve
// wheels, wooden crates, iron lattice cells, and for the Key a brass steam machine with a firebox that burns. The lamps and the fire are
// the light: the night art (night.ts) repaints the iron and leaves the rust, the brass and the fire alone, the way it does on the sheet.
// The chamber's floor is new here: dark plates with a ring of rust round a brass rivet. The painters share their helpers with the sheet
// (paint_kit.ts). Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { Px } from './px.ts';
import { box, dots, shade } from './paint_kit.ts';
import type { MC } from './paint_kit.ts';
import type { TileCtx } from './tile_ground.ts';
import { mcOf } from './tile_mall.ts';

export const BASE_TILES: TileName[] = ['basefloor', 'basegrate', 'basecap', 'basewall', 'ammo', 'bunk', 'cell', 'machine', 'keyfloor'];

/** Riveted iron plates, rust streaks and a spark of orange in some. */
function floor(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 1, 'grey1').rect(0, 0, 1, 16, 'grey1').rect(0, 8, 16, 1, 'grey1').rect(8, 0, 1, 16, 'grey1');
  dots(px, [[2, 2], [6, 2], [10, 2], [14, 2], [2, 10], [6, 10], [10, 10], [14, 10]], 'grey3');
  px.rect(3 + c.v * 2, 4, 4, 2, 'blood0').set(4 + c.v * 2, 6, 'blood0');
  if (c.v === 2) px.set(5, 5, 'orange');
  px.rect(9 - c.v, 12, 3, 2, 'blood0');
  shade(px, c, 'grey1', 'grey1');
  return px;
}

/** Lattice grating over the furnace: a grid of iron with a glow in every cell, hotter in some. */
function grate(c: MC): Px {
  const px = new Px(16).fill('ink');
  for (let i = 0; i < 16; i += 4) px.rect(i, 0, 1, 16, 'grey3').rect(0, i, 16, 1, 'grey3');
  for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) px.rect(i, j, 3, 3, (i * 3 + j + c.v) % 7 < 3 ? 'blood1' : 'blood0').set(i + 1, j + 1, (i * 3 + j + c.v) % 7 < 3 ? 'orange' : 'blood1');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(0, 0, 16, 1, 'grey2').rect(0, 6, 16, 2, 'grey2');
  dots(px, [[2, 3], [7, 3], [12, 3], [2, 11], [7, 11], [12, 11]], 'grey3');
  px.rect(10 + (c.v & 1), 8, 1, 3, 'blood1');
  if (c.lipS) px.rect(0, 13, 16, 2, 'grey3').rect(0, 15, 16, 1, 'ink');
  return px;
}

/** The wall face: a steam pipe along it with brass couplings, and a valve wheel, red or with a dial. */
function wall(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 2, 'grey1').rect(0, 14, 16, 2, 'grey1').rect(0, 2, 1, 12, 'grey1').rect(15, 2, 1, 12, 'grey1');
  px.rect(0, 6, 16, 4, 'grey3').rect(0, 6, 16, 1, 'mist').rect(0, 9, 16, 1, 'grey1');
  for (const x of [3, 12]) px.rect(x - 1, 5, 3, 6, 'sand').rect(x - 1, 5, 3, 1, 'amber');
  if (c.v & 1) { px.disc(8, 8, 2.5, 'cream').set(8, 7, 'red').set(8, 6, 'red').set(9, 8, 'ink'); } else { px.disc(8, 8, 2.5, 'blood1').rect(5, 8, 7, 1, 'red').rect(8, 5, 1, 7, 'red'); }
  dots(px, [[3, 3], [12, 3], [3, 12], [12, 12]], 'sand');
  return px;
}

/** A wooden ammo crate with iron straps and a brass plate: cover from rifle fire. */
function ammo(): Px {
  const px = new Px(16);
  px.rect(1, 1, 14, 5, 'blood1').rect(1, 6, 14, 8, 'blood0').frame(1, 1, 14, 13, 'ink');
  px.rect(1, 6, 14, 1, 'ink').rect(3, 6, 1, 8, 'ink').rect(12, 6, 1, 8, 'ink');
  for (const y of [8, 10, 12]) px.rect(4, y, 8, 1, 'blood1');
  px.rect(5, 9, 6, 1, 'amber');
  dots(px, [[3, 3], [12, 3]], 'sand');
  return px;
}

/** A bunk: an iron frame, a grey blanket with a tan edge, a pale pillow. */
function bunk(): Px {
  const px = new Px(16);
  box(px, 1, 1, 14, 14, 'grey3', 'ink');
  px.rect(2, 5, 12, 9, 'sand').rect(2, 5, 12, 1, 'soil3').rect(3, 2, 10, 3, 'bone').rect(3, 2, 10, 1, 'white');
  px.rect(2, 8, 12, 5, 'grey2').rect(2, 8, 12, 1, 'grey3');
  return px;
}

/** A cell: iron lattice over the dark, a lit bulb behind it. */
function cell(): Px {
  const px = new Px(16).fill('night');
  px.rect(0, 0, 16, 2, 'grey3').rect(0, 14, 16, 2, 'grey3');
  for (let k = 0; k < 14; k++) px.set(1 + k, 2 + (k % 6) * 2, 'grey3').set(14 - k, 2 + (k % 6) * 2, 'grey3').set(1 + k, 3 + (k % 6) * 2, 'grey3').set(14 - k, 3 + (k % 6) * 2, 'grey3');
  px.rect(7, 7, 2, 3, 'amber');
  return px;
}

/**
 * The Key's machine, 64 by 32: a brass boiler on a firebox that burns. Its drum turns, a gauge needle ticks and the flame flickers with
 * the phase (0 to 3).
 */
export function machineArt(phase: number): Px {
  const px = new Px(64, 32);
  px.rect(10, 6, 38, 16, 'ink').ellipse(10, 14, 6, 8.5, 'ink').ellipse(48, 14, 6, 8.5, 'ink');
  px.rect(10, 7, 38, 14, 'sand').ellipse(10, 14, 5, 7.5, 'sand').ellipse(48, 14, 5, 7.5, 'sand');
  px.rect(10, 7, 38, 2, 'amber').rect(10, 19, 38, 2, 'soil3');
  for (const x of [16, 28, 40]) px.rect(x, 6, 3, 16, 'soil3').rect(x, 6, 1, 16, 'amber');
  px.rect(20, 1, 10, 6, 'soil3').rect(20, 1, 10, 1, 'sand').frame(20, 1, 10, 6, 'ink');
  px.rect(38, 0, 4, 7, 'grey3').rect(38, 0, 1, 7, 'mist').frame(38, 0, 4, 7, 'ink');
  px.disc(25, 14, 3.5, 'cream').frame(21, 10, 9, 9, 'sand'); px.set(25, 14, 'red').set(25 + (phase & 1) * 2, 12, 'red');
  px.disc(56, 14, 7.5, 'ink').disc(56, 14, 6.5, 'grey3').disc(56, 14, 4.5, 'ink').disc(56, 14, 1.5, 'amber');
  const sp: [number, number][][] = [[[0, -4], [4, 0]], [[3, -3], [3, 3]], [[0, -4], [4, 0]], [[3, -3], [3, 3]]];
  for (const [dx, dy] of sp[phase & 3] as [number, number][]) px.line(56 - dx, 14 - dy, 56 + dx, 14 + dy, 'grey3');
  px.rect(10, 22, 30, 10, 'ink').frame(10, 22, 30, 10, 'sand');
  px.rect(12, 24, 12, 7, 'blood1').rect(13, 25, 10, 6, 'orange').rect(14, 26, 8, 5, 'yellow').rect(16 + (phase & 1), 27, 3, 3, 'white');
  dots(px, [[28, 25], [32, 25], [36, 25], [28, 28], [32, 28], [36, 28]], 'amber');
  return px;
}

/** The chamber's floor: dark plates, each with a ring of rust round a brass rivet and a bolt at every corner. Some rings are burnt through. */
function keyfloor(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(0, 0, 16, 1, 'ink').rect(0, 0, 1, 16, 'ink');
  px.disc(8, 8, 6, 'blood0').disc(8, 8, 4.6, 'grey1');
  px.ellipse(8, 8, 5.5, 5.5, 'grey1');
  for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; if ((a + c.v) % 5 !== 0) px.set(Math.round(8 + Math.cos(t) * 5.4 - 0.5), Math.round(8 + Math.sin(t) * 5.4 - 0.5), a % 4 === c.v ? 'blood1' : 'blood0'); }
  px.rect(7, 7, 2, 2, 'amber').set(7, 7, 'sand');
  dots(px, [[2, 2], [13, 2], [2, 13], [13, 13]], 'grey3');
  if (c.v === 2) px.set(11, 5, 'orange');
  shade(px, c, 'ink', 'ink');
  return px;
}

const cache = new Map<string, Px>();
function machineTile(phase: number, ox: number, oy: number): Px {
  const key = `m${phase & 3}`;
  let m = cache.get(key);
  if (!m) { m = machineArt(phase); cache.set(key, m); }
  const out = new Px(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.d[y * 16 + x] = m.get(ox * 16 + x, oy * 16 + y);
  return out;
}

/** Floors you walk on: the iron plates, the grating and the chamber's rings. */
export function baseGround(name: TileName, c: TileCtx): Px | null {
  const m = mcOf(c, name);
  switch (name) {
    case 'basefloor': return floor(m);
    case 'basegrate': return grate(m);
    case 'keyfloor': return keyfloor(m);
    default: return null;
  }
}

/** The solid tiles: the walls, the crates, the bunks, the cells and the machine, with a floor under what stands on one. */
export function baseObject(name: TileName, c: TileCtx, under: (c: TileCtx, prefer: TileName) => Px, phase = 0): Px | null {
  const m = mcOf(c, name);
  const on = (art: Px): Px => under(c, 'basefloor').blit(art, 0, 0);
  switch (name) {
    case 'basecap': return cap(m);
    case 'basewall': return wall(m);
    case 'ammo': return on(ammo());
    case 'bunk': return on(bunk());
    case 'cell': return on(cell());
    case 'machine': {
      const b = c.blk ?? { ox: m.kW ? 1 : 0, oy: m.kN ? 1 : 0, w: 4, h: 2 };
      const cx = b.ox === 0 ? 0 : b.ox >= b.w - 1 ? 3 : 1 + ((b.ox - 1) % 2), cy = b.oy === 0 ? 0 : 1;
      return on(machineTile(phase, cx, cy));
    }
    default: return null;
  }
}
