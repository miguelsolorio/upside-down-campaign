// The page code of chapter5-lockdown.html: the mock scene, then sections of 3x cells for every tile, prop and pose. Runs in the browser only.
import type { TileName } from '../../core/tiles.ts';
import { nightTile } from '../night.ts';
import type { Px } from '../px.ts';
import { rim } from '../props_lab2.ts';
import type { TileCtx } from '../tile_ground.ts';
import { commanderPx, COMMANDER_POSES } from './commander.ts';
import type { CommanderPose } from './commander.ts';
import { LOCKDOWN_LAB, LOCKDOWN_TOWN, duskTile } from './lockdown_tiles.ts';
import type { LockdownTile } from './lockdown_tiles.ts';
import { barricadeArt, barrierArt, boomArt, boothArt, curfewSignArt, floodlightArt, floodlightConeArt, sandbagArt, tentArt, truckArt } from './lockdown_props.ts';
import { CORE, lockdownScene, paintLockdownTile } from './lockdown_scene.ts';
import { DIRS } from './troop_kit.ts';
import { TROOPER_POSES, trooperPx } from './trooper.ts';
import type { TrooperPose } from './trooper.ts';

const GROUNDS = ['#26283a', '#d8dce8', '#05060c'];

/** A zoomed cell: the Px at k times its size on a ground, with a caption. */
function cell(p: Px, label: string, k: number, ground = 0): HTMLElement {
  const box = document.createElement('div');
  box.className = 'cell';
  const c = document.createElement('canvas');
  c.width = p.w * k; c.height = p.h * k;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  g.fillStyle = GROUNDS[ground] as string; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(p.toCanvas(), 0, 0, c.width, c.height);
  box.append(c);
  if (label) { const cap = document.createElement('span'); cap.textContent = label; box.append(cap); }
  return box;
}

function section(root: HTMLElement, title: string, note: string): HTMLElement {
  const h = document.createElement('h2'); h.textContent = title;
  const p = document.createElement('p'); p.className = 'muted'; p.textContent = note;
  const row = document.createElement('div'); row.className = 'row panel';
  root.append(h, p, row);
  return row;
}

/** What a tile's neighbors are, so the base painters it builds on see the same street or room it will have. */
const NEAR: Partial<Record<LockdownTile, TileName>> = {
  lockwalk: 'sidewalk', locklawn: 'grass', lockroof: 'houseroof', lockhouse: 'housewall', lockvine: 'housewall', lockdoor: 'housedoor',
  armyfloor: 'labfloor', armycable: 'labfloor', armycable2: 'labfloor', armycrate: 'labfloor', armycrate2: 'labfloor', armywall: 'labfloor',
};
function ctxFor(name: LockdownTile, tx: number, ty: number): TileCtx {
  const n = NEAR[name] ?? 'road';
  const road = name === 'lockline' || name === 'lockstop';
  return { tx, ty, near: road ? { n: 'grass', s: 'grass', e: 'road', w: 'road' } : { n, e: n, s: n, w: n } };
}

function tiles(root: HTMLElement): void {
  const town = section(root, 'Town tiles, dusk going to night', 'Each tile three times: painted by day (the town tiles it is built on), at dusk (the filter in lockdown_tiles.ts), and after dark (the game\'s night pass). The lit windows, the rift and the amber studs stay bright.');
  for (const name of LOCKDOWN_TOWN) {
    for (const [tx, ty] of [[3, 2]] as [number, number][]) {
      const c = ctxFor(name, tx, ty), day = paintLockdownTile(name, tx, ty, c.near);
      const col = document.createElement('div'); col.className = 'cell';
      const trio = document.createElement('div'); trio.className = 'trio';
      trio.append(cell(day, '', 3), cell(duskTile(day, 1), '', 3), cell(nightTile(day, CORE[name], c), '', 3));
      const cap = document.createElement('span'); cap.textContent = name;
      col.append(trio, cap);
      town.append(col);
    }
  }
  const rift = section(root, 'The rift', 'Three tiles that join, at dusk and then with the glow breathing out.');
  for (const pulse of [false, true]) {
    const strip = document.createElement('div'); strip.className = 'trio';
    for (const n of ['rift0', 'rift1', 'rift2'] as LockdownTile[]) {
      const c = ctxFor(n, 4, 6);
      strip.append(cell(duskTile(paintLockdownTile(n, 4, 6, c.near, pulse), 1), '', 4));
    }
    rift.append(strip);
  }
  const lab = section(root, 'Lab tiles, army dressed', 'Floors and wall on the Lab\'s own tiles: tracks, a stencilled arrow, tape, cable runs that join across a tile, crate stacks, a tarp, a map and a field radio. Lab light first, then the Lab at midnight.');
  for (const name of LOCKDOWN_LAB) {
    for (const [tx, ty] of [[2, 3], [3, 3], [4, 5]] as [number, number][]) {
      const c = ctxFor(name, tx, ty), day = paintLockdownTile(name, tx, ty, c.near);
      lab.append(cell(day, tx === 2 ? name : '', 3), cell(nightTile(day, CORE[name], c), '', 3));
    }
  }
}

function props(root: HTMLElement): void {
  const row = section(root, 'Props', 'At 3x, with the dark rim drawProp adds. The floodlight comes lit and dark, and its cone is a layer of its own: three turns of the lamp, shown on a night street.');
  const list: [string, Px][] = [
    ['truck', truckArt()], ['tent', tentArt()], ['sandbags 32', sandbagArt(32, 16)], ['sandbags 16 tall x2', sandbagArt(32, 24)], ['barricade', barricadeArt(32)],
    ['barrier', barrierArt(32)], ['booth', boothArt()], ['boom closed', boomArt(false)], ['boom open', boomArt(true)], ['curfew sign', curfewSignArt()],
    ['floodlight', floodlightArt(true)], ['floodlight off', floodlightArt(false)],
  ];
  for (const [name, art] of list) row.append(cell(rim(art), name, 3));
  const cones = section(root, 'The floodlight cone', 'The glow layer on its own over a dark ground, then lifted into the street.');
  for (const lean of [-1, 0, 1]) cones.append(cell(floodlightConeArt(lean), `lean ${lean}`, 3, 2));
}

function actors(root: HTMLElement): void {
  const tp = section(root, 'The trooper', 'Four facings of every pose at 3x. Walk has two frames, burst two flashes, flank turns the torso as the legs step.');
  for (const pose of Object.keys(TROOPER_POSES) as TrooperPose[]) {
    for (let f = 0; f < TROOPER_POSES[pose].length; f++) {
      const col = document.createElement('div'); col.className = 'cell';
      const strip = document.createElement('div'); strip.className = 'trio';
      for (const d of DIRS) strip.append(cell(trooperPx(d, pose, f), '', 3));
      const cap = document.createElement('span'); cap.textContent = `${pose} ${f}`;
      col.append(strip, cap); tp.append(col);
    }
  }
  const real = section(root, 'Trooper at 1x', 'The size the game draws him: every pose and facing on dusk ground and on a pale floor.');
  real.classList.add('real');
  for (const pose of Object.keys(TROOPER_POSES) as TrooperPose[]) for (let f = 0; f < TROOPER_POSES[pose].length; f++) for (const d of DIRS) real.append(cell(trooperPx(d, pose, f), '', 1, f & 1 ? 1 : 0));
  for (const cracked of [false, true]) {
    const cp = section(root, cracked ? 'The Commander, shield cracked' : 'The Commander', cracked ? 'From half HP on: the frame is dull and a break runs across the shield, in every pose.' : 'Walk, plant (whistling, two frames of sound), charge, stun against a wall (two frames of stars), hurt and ko. 3x.');
    for (const pose of Object.keys(COMMANDER_POSES) as CommanderPose[]) {
      for (let f = 0; f < COMMANDER_POSES[pose].length; f++) {
        const col = document.createElement('div'); col.className = 'cell';
        const strip = document.createElement('div'); strip.className = 'trio';
        for (const d of DIRS) strip.append(cell(commanderPx(d, pose, f, cracked), '', 3));
        const cap = document.createElement('span'); cap.textContent = `${pose} ${f}`;
        col.append(strip, cap); cp.append(col);
      }
    }
  }
  const big = section(root, 'Commander at 1x, beside a trooper', 'Both at the size the game draws them.');
  big.classList.add('real');
  for (const pose of ['walk', 'plant', 'charge', 'stun'] as CommanderPose[]) for (const d of ['down', 'left'] as const) big.append(cell(commanderPx(d, pose, 0, pose === 'charge' || pose === 'stun'), '', 1, 0));
  big.append(cell(trooperPx('down', 'idle', 0), '', 1, 0), cell(trooperPx('left', 'aim', 0), '', 1, 0));
}

function scene(root: HTMLElement): void {
  const row = section(root, 'A street checkpoint', 'A 256 by 224 frame of 16 px tiles: the checkpoint on a town street, a floodlight lifting the ground under its cone, a booth behind sandbags, barricades, a truck, tents, a curfew sign and a rift in the lane, with two troopers at the line. Shown at 3x, then at 1x.');
  for (const night of [false, true]) {
    const px = lockdownScene(night);
    row.append(cell(px, night ? 'after dark' : 'dusk', 3));
  }
  const real = section(root, 'The same frames at 1x', 'The size the game draws them, before it is scaled to the screen.');
  real.classList.add('real');
  for (const night of [false, true]) real.append(cell(lockdownScene(night), '', 1));
}

export function buildPage(root: HTMLElement): void {
  scene(root);
  actors(root);
  props(root);
  tiles(root);
}
