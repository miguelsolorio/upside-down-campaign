// The mock street scene of chapter5-lockdown.html: a 256 by 224 frame of 16 px tiles, a checkpoint on a town street at dusk (or after dark),
// with the floodlight's cone lifting the ground, a booth behind sandbags, barricades, a truck, a tent, a curfew sign, a rift in the lane,
// and two troopers facing a hero's side of the street. Built only from the painters in this folder and the town's own tile code, so it
// shows how they sit together. Pure pixel work.
import type { TileName } from '../../core/tiles.ts';
import { createRng } from '../../core/rng.ts';
import { hash2 } from '../canvas.ts';
import { nightSprite, nightTile } from '../night.ts';
import { Px } from '../px.ts';
import { rim } from '../props_lab2.ts';
import type { TileCtx } from '../tile_ground.ts';
import { CORE, duskTile, lockdownGround, lockdownObject } from './lockdown_tiles.ts';
import type { LockdownTile } from './lockdown_tiles.ts';
import { barricadeArt, barrierArt, boothArt, coneLift, curfewSignArt, floodlightArt, floodlightConeArt, sandbagArt, tentArt, truckArt } from './lockdown_props.ts';
import { trooperPx } from './trooper.ts';

export const SCENE_W = 256, SCENE_H = 224;
const COLS = 16, ROWS = 14;

/** The map: roofs, house walls and doors, lawn, sidewalk, two lanes round a double line with a stop line and a rift, sidewalk, lawn. */
const MAP = [
  'rrrrrrrrrrrrrrrr',
  'hhhhhhhhhvvhhhhh',
  'hhhdhhhhhvvhhdhh',
  'LLLLLLLLLLLLLLLL',
  'wwwwwwwwwwwwwwww',
  'RRRRRsRRRRRRRRRR',
  'RRRRRsRRRRRRRRRR',
  'DDDDDDDDDDDDDDDD',
  'RRRRRRRRRRRRRRRR',
  'RABCRRRRRRRRRRRR',
  'wwwwwwwwwwwwwwww',
  'LLLLLLLLLLLLLLLL',
  'LLLLLLLLLLLLLLLL',
  'LLLLLLLLLLLLLLLL',
];
const NAME: Record<string, LockdownTile> = {
  r: 'lockroof', h: 'lockhouse', v: 'lockvine', d: 'lockdoor', L: 'locklawn', w: 'lockwalk', R: 'lockroad', D: 'lockline', s: 'lockstop', A: 'rift0', B: 'rift1', C: 'rift2',
};
export { CORE };

/** One painted tile of the map, in the town's day colors. */
export function paintLockdownTile(name: LockdownTile, tx: number, ty: number, near: TileCtx['near'], pulse = false): Px {
  const c: TileCtx = { tx, ty, near };
  const r = createRng(hash2(tx, ty, 5000 + name.length));
  return (lockdownGround(name, c, r, pulse) ?? lockdownObject(name, c, r)) as Px;
}

/** The tile at a map cell, painted at dusk or at night. */
function tileAt(tx: number, ty: number, night: boolean): Px {
  const name = NAME[MAP[ty]?.[tx] ?? 'L'] ?? 'locklawn';
  const at = (x: number, y: number): TileName => { const n = NAME[MAP[y]?.[x] ?? ''] ; return n ? CORE[n] : 'grass'; };
  const near = { n: at(tx, ty - 1), e: at(tx + 1, ty), s: at(tx, ty + 1), w: at(tx - 1, ty) };
  const day = paintLockdownTile(name, tx, ty, near);
  return night ? nightTile(day, CORE[name], { tx, ty, near }) : duskTile(day, 1);
}

const dim = (p: Px, night: boolean, k: number): Px => (night ? nightSprite(p) : duskTile(p, k));

/** A flat dark oval under a sprite, so it stands on the ground. */
function shadow(g: Px, cx: number, y: number, w: number): void { g.ellipse(cx, y + 1.5, w / 2, 1.8, 'black'); }

/** The whole frame. `night` runs the tiles and props through night.ts instead of the dusk filter. */
export function lockdownScene(night = false): Px {
  const g = new Px(SCENE_W, SCENE_H);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) g.blit(tileAt(tx, ty, night), tx * 16, ty * 16);
  // the cone lifts the ground it falls on, and goes under the sprites
  const tower = { x: 152, y: 24 };
  coneLift(g, floodlightConeArt(-1), tower.x + 8 - 40, tower.y + 4);
  const prop = (art: Px, x: number, y: number, flip = false, k = 0.8): void => { g.blit(rim(dim(art, night, k)), x - 1, y - 1, flip); };
  prop(curfewSignArt(), 36, 48);
  prop(floodlightArt(true), tower.x, tower.y, false, 0.5);
  prop(sandbagArt(32, 16), 84, 64);
  prop(boothArt(), 116, 46);
  prop(sandbagArt(32, 16), 148, 64);
  prop(barricadeArt(32), 104, 84);
  prop(barricadeArt(32), 104, 100);
  prop(barrierArt(32), 60, 130);
  prop(truckArt(), 176, 127, true);
  prop(tentArt(), 20, 176);
  prop(tentArt(), 84, 184, true);
  prop(sandbagArt(32, 16), 156, 196);
  // the actors are drawn as the game draws them: two troopers at the line, facing the side the hero comes from
  const stand = (p: Px, x: number, y: number): void => { shadow(g, x + (p.w >> 1), y + p.h - 3, 13); g.blit(p, x, y); };
  stand(trooperPx('left', 'shield', 0), 142, 82);
  stand(trooperPx('left', 'aim', 0), 160, 98);
  return g;
}
