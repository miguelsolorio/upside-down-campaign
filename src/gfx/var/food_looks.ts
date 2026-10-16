// The four looks for the food court in card order (stage 3.3, at night under the Confetti mall). Each is a set of tile painters
// (food_*.ts) and the pools of light that go with it. See food.ts.
import type { FoodLook } from './food.ts';
import { BRICK } from './food_brick.ts';
import { CHECKER } from './food_checker.ts';
import { MINT } from './food_mint.ts';
import { NEON } from './food_neon.ts';

const CHECKER_LOOK: FoodLook = {
  slug: 'checker', name: 'Checker Diner', set: CHECKER,
  note: 'A roadside diner after closing: a red and black checkerboard floor, a chrome band with a red stripe, striped awnings, light box menu boards over red counters, a red quarry kitchen with orange glowing fryers. The boards are the warm light, and the skylight washes the middle of the floor blue.',
  lights: {
    board: { r: 30, k: 1, tint: [255, 190, 90] }, sky: { r: 46, k: 0.55, tint: [150, 190, 255] }, fryer: { r: 26, k: 0.9, tint: [255, 140, 50] },
    goo: { r: 18, k: 0.45, tint: [255, 80, 220] }, escalator: { r: 32, k: 0.7, tint: [255, 220, 120] },
  },
};

const NEON_LOOK: FoodLook = {
  slug: 'neon', name: 'Neon Strip', set: NEON,
  note: 'The Confetti mall\'s cooler cousin: a glossy black floor with dark purple diamonds and a cyan stud in each, a band of two neon tubes, black counters outlined in tube light with a lit pictogram for a menu board, blue glass under the skylight, a dark teal kitchen. The neon is every light there is.',
  lights: {
    board: { r: 30, k: 1, tint: [90, 240, 255] }, sky: { r: 44, k: 0.6, tint: [140, 170, 255] }, fryer: { r: 24, k: 0.9, tint: [255, 90, 70] },
    goo: { r: 18, k: 0.5, tint: [255, 80, 220] }, escalator: { r: 32, k: 0.8, tint: [255, 80, 220] },
  },
};

const BRICK_LOOK: FoodLook = {
  slug: 'brick', name: 'Brick Plaza', set: BRICK,
  note: 'The town\'s own arcade: red brick pavers in running bond, a band of brass inlay, deep green awnings with a bulb in each hem, brick fronted counters under chalkboard menus lit by a lamp, pale tile in the kitchens, copper hooded fryers. The brass and the bulbs shine, and the court is warm and dim.',
  lights: {
    board: { r: 28, k: 0.95, tint: [255, 200, 110] }, sky: { r: 44, k: 0.55, tint: [160, 170, 255] }, fryer: { r: 24, k: 0.85, tint: [255, 150, 60] },
    goo: { r: 18, k: 0.45, tint: [255, 80, 220] }, escalator: { r: 30, k: 0.7, tint: [255, 200, 110] },
  },
};

const MINT_LOOK: FoodLook = {
  slug: 'mint', name: 'Mint Parlor', set: MINT,
  note: 'A 1985 ice cream parlor grown into a food court, all pastels, so cheerful it is wrong in the dark: a sea green terrazzo flecked with pink, a band of pink scallops, pink and cream menu boards over sea green counters, aqua tile in the kitchens, pink fryers. The pinks stay lit when the greens sink.',
  lights: {
    board: { r: 28, k: 0.95, tint: [255, 170, 210] }, sky: { r: 44, k: 0.55, tint: [170, 210, 255] }, fryer: { r: 24, k: 0.85, tint: [255, 190, 150] },
    goo: { r: 18, k: 0.45, tint: [255, 80, 220] }, escalator: { r: 30, k: 0.7, tint: [255, 190, 230] },
  },
};

export const FOOD_LOOKS: FoodLook[] = [CHECKER_LOOK, NEON_LOOK, BRICK_LOOK, MINT_LOOK];
