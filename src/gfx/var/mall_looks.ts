// The five looks for Starcourt in card order. Each pairs a mall with the base under it, because the look decides the time of day of
// both stages: Atrium and Chrome are by day, Neon, Brass and Confetti after closing. See mall_kit.ts.
import type { Look } from './mall_kit.ts';
import { ATRIUM_MALL } from './mall_atrium.ts';
import { OLIVE_BASE } from './base_olive.ts';
import { NEON_MALL } from './mall_neon.ts';
import { ALERT_BASE } from './base_alert.ts';
import { CHROME_MALL } from './mall_chrome.ts';
import { STEEL_BASE } from './base_steel.ts';
import { BRASS_MALL } from './mall_brass.ts';
import { RUST_BASE } from './base_rust.ts';
import { CONFETTI_MALL } from './mall_confetti.ts';
import { MINT_BASE } from './base_mint.ts';

const ATRIUM: Look = {
  slug: 'atrium', name: 'Atrium', night: false,
  note: 'By day. A sunlit mall in cream, pink and teal: terrazzo floors, skylights along the walls, striped awnings, a round tiered fountain, palms in clay pots. The base is army green under it.',
  mall: ATRIUM_MALL, base: OLIVE_BASE, mallLights: {}, baseLights: {}, tint: [255, 200, 120], baseTint: [255, 200, 120],
};

const NEON: Look = {
  slug: 'neon', name: 'Neon', night: true,
  note: 'After closing. A black polished mall lit only by its signs: two neon tubes in the floor, violet walls trimmed in pink and aqua, shop signs of bent tubes, a basin lit from under the water. The base is black steel on emergency power.',
  mall: NEON_MALL, base: ALERT_BASE,
  mallLights: { shop: [34, 1], door: [24, 0.8], fountain: [34, 1], scoops: [28, 0.9], band: [20, 0.6] },
  baseLights: { machine: [46, 1], breaker: [16, 0.6], cipher: [20, 0.8], cell: [18, 0.7], wall: [22, 0.6] },
  tint: [255, 110, 200], baseTint: [255, 80, 60],
};

const CHROME: Look = {
  slug: 'chrome', name: 'Chrome', night: false,
  note: 'By day. The mall as an ad would draw it, cool and bright: big white plates with a blue band of chevrons, steel walls under light strips, arched windows lit magenta, sliding doors, a square basin with a chrome column. The base is a clean blue steel lab.',
  mall: CHROME_MALL, base: STEEL_BASE, mallLights: {}, baseLights: {}, tint: [255, 255, 255], baseTint: [255, 255, 255],
};

const BRASS: Look = {
  slug: 'brass', name: 'Brass', night: true,
  note: 'After closing. An old arcade of dark mahogany and brass: parquet with a brass inlay, paneled walls, shop windows that stay warm under an amber script sign, scissor gates over the shut shops. The base is old riveted iron with a steam machine and a firebox.',
  mall: BRASS_MALL, base: RUST_BASE,
  mallLights: { shop: [30, 1], door: [24, 0.9], fountain: [30, 0.9], scoops: [26, 0.9], band: [18, 0.5] },
  baseLights: { machine: [44, 1], breaker: [14, 0.5], cipher: [18, 0.7], cell: [14, 0.5], wall: [20, 0.5] },
  tint: [255, 170, 70], baseTint: [255, 140, 50],
};

const CONFETTI: Look = {
  slug: 'confetti', name: 'Confetti', night: true,
  note: 'After closing. 1985 at its loudest with the lights off: black terrazzo with neon chips in it, a zigzag of two tubes for the band, a different bold pattern in every bay of wall, rainbow arc signs, a diamond basin. The base is a sea green hospital, clean and calm.',
  mall: CONFETTI_MALL, base: MINT_BASE,
  mallLights: { shop: [32, 1], door: [24, 0.8], fountain: [32, 1], scoops: [26, 0.9], band: [18, 0.6] },
  baseLights: { machine: [40, 0.9], breaker: [14, 0.5], cipher: [18, 0.6], cell: [14, 0.4], wall: [24, 0.9] },
  tint: [255, 230, 120], baseTint: [200, 255, 220],
};

export const LOOKS: Look[] = [ATRIUM, CHROME, NEON, BRASS, CONFETTI];
