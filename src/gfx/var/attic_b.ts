// Vecna's attic looks 3 and 4 (stage 4.4, see look_kit.ts and attic.ts), in the Upside Down skin of the Creel House like looks 1
// and 2 and sharing their kits (attic_a.ts). "Clock attic" puts the grandfather clock in the middle of the north wall with its
// chime spreading as rings, the four orbs on stalks round the floor and the cover (trunks, chairs and a sofa) under sheets.
// "Low attic" slopes the roof in over both eaves, dark and ribbed, with a tie beam low across the wall, so the floor is a narrow
// cramped arena and the cover is tucked in under the slopes.
import type { Prop, StageLook } from './look_kit.ts';
import { RUG4, UD } from './creel_b.ts';
import { chime } from './attic_fx.ts';
import { GLOW_TINT, ROOF_UD, TRUNK_UD, oldClock, orbLights, orbs } from './attic_a.ts';
import { tiler } from './attic_paint.ts';
import type { RoofKit, SlopeKit } from './attic_paint.ts';
import { dressForm, hero, roundWindow, sheetChair, sheetSofa, trunk, vecna } from './attic_props.ts';
import type { Pt } from './tunnel_paint.ts';

const ORBS_3: Pt[] = [[60, 54], [180, 54], [60, 114], [180, 114]];
const ORBS_4: Pt[] = [[54, 52], [186, 52], [54, 116], [186, 116]];

const ROOF_LOW: RoofKit = { ...ROOF_UD, deck: 'night', deckHi: 'shadow', deckLo: 'ink', raf: 'shadow', rafHi: 'dusk', rafLo: 'ink', wd: 'night', wdHi: 'shadow', wdLo: 'ink', beam: true };
const SLOPE: SlopeKit = { deck: ['night', 'night', 'shadow'], rib: ['shadow', 'dusk', 'slate'], ribHi: ['dusk', 'slate', 'mist'], low: 'ink', sill: 'slate', sillHi: 'mist', seam: 'ink' };

export const ATTIC_B: StageLook[] = [
  {
    slug: 'clock-attic', name: 'Clock attic', night: true, glow: GLOW_TINT,
    note: 'The grandfather clock stands in the middle of the north wall and its chime spreads in rings, the four orbs stand round the floor, and the cover is furniture under sheets.',
    tile: tiler({ roof: ROOF_UD, floor: UD, rug: RUG4 }),
    props: (phase): Prop[] => {
      const o = orbs(phase, ORBS_3, 1);
      return [
        { px: oldClock(phase), x: 120, y: 6 },
        { px: roundWindow(32, phase), x: 36, y: 0 },
        o[0] as Prop,
        { px: vecna('stand', phase), x: 110, y: 48, actor: true },
        { px: hero(), x: 100, y: 132, actor: true },
        { px: trunk(TRUNK_UD), x: 12, y: 66 },
        { px: sheetChair(), x: 224, y: 72 },
        { px: dressForm(), x: 16, y: 106 },
        ...o.slice(1),
        { px: sheetSofa(), x: 208, y: 112 },
        { px: sheetChair(), x: 14, y: 36 },
        { px: trunk(TRUNK_UD), x: 226, y: 38 },
        { px: chime(phase, 128, 16), x: 0, y: 0, actor: true },
      ];
    },
    lights: [[128, 22, 44, 0.4], ...orbLights(ORBS_3), [52, 16, 36, 0.6], [128, 100, 50, 0.35]],
  },
  {
    slug: 'low-attic', name: 'Low attic', night: true, glow: GLOW_TINT,
    note: 'The roof slopes in over both sides, dark and ribbed, so the floor is a narrow cramped arena with the cover tucked in under the slopes.',
    tile: tiler({ roof: ROOF_LOW, floor: UD, rug: RUG4, slope: SLOPE }),
    props: (phase): Prop[] => {
      const o = orbs(phase, ORBS_4, 1);
      return [
        { px: oldClock(phase), x: 58, y: 6 },
        { px: roundWindow(24, phase), x: 172, y: 2 },
        o[0] as Prop,
        { px: vecna('stand', phase), x: 110, y: 48, actor: true },
        { px: hero(), x: 120, y: 132, actor: true },
        { px: trunk(TRUNK_UD), x: 30, y: 62 },
        { px: sheetChair(), x: 212, y: 70 },
        { px: dressForm(), x: 32, y: 92 },
        ...o.slice(1),
        { px: trunk(TRUNK_UD), x: 28, y: 126 },
        { px: sheetChair(), x: 210, y: 118 },
      ];
    },
    lights: [...orbLights(ORBS_4, 30, 0.85), [184, 14, 30, 0.5], [128, 90, 54, 0.35]],
  },
];
