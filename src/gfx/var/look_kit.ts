// The sample room the chapter 4 stage sheets share (kamchatka, creel, hawkinsud), generalized from tunnel_kit.ts: a sheet
// gives a room map of 16 by 10 one-letter tiles and the names for its legend; a look paints each letter as a 16 by 16 Px and
// adds props (bigger things laid over the tiles, in room pixels) and light pools. A night look runs every tile and prop
// through the game's own night art (night.ts), then lifts the pools in four dithered steps as glow.ts does. A day look is
// drawn as painted. Pure pixel work: no DOM.
import type { ColorName } from '../palette.ts';
import { BAYER4, hash2 } from '../canvas.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';

export const TILE = 16, COLS = 16, ROWS = 10;
export const ROOM_W = COLS * TILE, ROOM_H = ROWS * TILE;

/** What a tile painter knows about its place: its letter, the variant (0 to 3) and the letters around it ('#' past the edge). */
export interface TC { ch: string; tx: number; ty: number; v: number; n: string; s: string; e: string; w: string }

/** A thing laid over the tiles, at room pixels x, y. An actor sets `actor`, so the night pass leaves it as the game draws it. */
export interface Prop { px: Px; x: number; y: number; actor?: boolean }

/** A light pool: center in room px, radius, strength 0 to 1. */
export type Light = readonly [number, number, number, number];

export interface StageLook {
  slug: string;
  name: string;
  note: string;
  night: boolean;
  /** One 16 by 16 tile for a letter of the room. phase counts 0 to 3 for anything that flickers or pulses. */
  tile(c: TC, phase: number): Px;
  /** Props over the tiles, in the order they're drawn. */
  props(phase: number): Prop[];
  lights: readonly Light[];
  /** The color the pools add, as r, g, b. */
  glow: readonly [number, number, number];
}

export interface Room {
  map: readonly string[];
  /** The legend: a name for each tile letter shown, and the props by index into props(). */
  tiles: readonly { ch: string; name: string }[];
  props: readonly string[];
}

const at = (room: Room, x: number, y: number): string => room.map[y]?.[x] ?? '#';

export function ctxAt(room: Room, tx: number, ty: number): TC {
  return { ch: at(room, tx, ty), tx, ty, v: hash2(tx, ty, 11) & 3, n: at(room, tx, ty - 1), s: at(room, tx, ty + 1), e: at(room, tx + 1, ty), w: at(room, tx - 1, ty) };
}

const cache = new Map<string, Px>();
function lit(look: StageLook, key: string, make: () => Px): Px {
  const k = `${look.slug}|${key}`;
  let p = cache.get(k);
  if (!p) { p = look.night ? nightSprite(make()) : make(); cache.set(k, p); }
  return p;
}

/** Dithered light pools in four steps, lifting every pixel by a whole step. */
export function pools(px: Px, lights: readonly Light[], tint: readonly [number, number, number]): void {
  const step = new Uint8Array(px.w * px.h);
  const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
  for (const [lx, ly, R, str] of lights) {
    for (let y = Math.max(0, ly - R); y < Math.min(px.h, ly + R); y++) {
      for (let x = Math.max(0, lx - R); x < Math.min(px.w, lx + R); x++) {
        const d = Math.hypot(x - lx, y - ly);
        if (d >= R) continue;
        const f = 1 - d / R, q = f * f * (3 - 2 * f) * str * 4, lo = Math.floor(q);
        const s = Math.min(4, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        if (s > (step[y * px.w + x] as number)) step[y * px.w + x] = s;
      }
    }
  }
  for (let i = 0; i < px.d.length; i++) {
    const s = step[i] as number, v = px.d[i] as number;
    if (!s || !v) continue;
    const lift = LIFT[s] as number;
    const r = Math.min(255, (v & 255) * (1 + lift) + tint[0] * lift * 0.2), g = Math.min(255, ((v >> 8) & 255) * (1 + lift) + tint[1] * lift * 0.2), b = Math.min(255, ((v >> 16) & 255) * (1 + lift) + tint[2] * lift * 0.2);
    px.d[i] = ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
  }
}

const tileKey = (c: TC, phase: number): string => `t${c.ch}${c.v}${c.n}${c.s}${c.e}${c.w}${c.tx & 1}${c.ty & 1}|${phase}`;

/** The whole room, tiles then props then light pools (at night). */
export function roomPx(room: Room, look: StageLook, phase: number): Px {
  const out = new Px(ROOM_W, ROOM_H);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = ctxAt(room, tx, ty);
      out.blit(lit(look, tileKey(c, phase), () => look.tile(c, phase)), tx * TILE, ty * TILE);
    }
  }
  const props = look.props(phase);
  props.forEach((p, i) => { if (!p.actor) out.blit(lit(look, `p${i}|${phase}`, () => p.px), p.x, p.y); });
  if (look.night && look.lights.length) pools(out, look.lights, look.glow);
  for (const p of props) if (p.actor) out.blit(p.px, p.x, p.y);
  return out;
}

/** The legend: each named tile alone (with plain neighbors), then each prop, in the look's art. */
export function legend(room: Room, look: StageLook, phase: number): { name: string; px: Px }[] {
  const out: { name: string; px: Px }[] = [];
  for (const t of room.tiles) {
    let c: TC | null = null;
    room.map.forEach((row, ty) => { const tx = row.indexOf(t.ch); if (!c && tx >= 0) c = ctxAt(room, tx, ty); });
    const cc: TC = c ?? { ch: t.ch, tx: 0, ty: 0, v: 1, n: t.ch, s: t.ch, e: t.ch, w: t.ch };
    out.push({ name: t.name, px: lit(look, tileKey(cc, phase), () => look.tile(cc, phase)) });
  }
  const props = look.props(phase);
  room.props.forEach((name, i) => { const p = props[i]; if (p) out.push({ name, px: p.actor ? p.px : lit(look, `p${i}|${phase}`, () => p.px) }); });
  return out;
}

/** A color by palette name, for painters that pick from a table. */
export type Ramp = readonly ColorName[];
