// Vecna's attic looks 1 and 2 (stage 4.4, see look_kit.ts and attic.ts), both in the Upside Down skin of the Creel House (creel_b.ts):
// teal grey boards, dark red vines, red veins, a window lit by lightning. "Vine nest" has the vines hang from the rafters into a
// knot over the middle where Vecna floats, with the floor open round him and roots running from the four orbs to his feet.
// "Torn roof" has the left half of the roof gone to the red storm, black rafters against it, rain and puddles on the boards.
// The kits, the orb layout and the props the looks share are exported for attic_b.ts. Painted in daytime values for the night
// pass to darken, which leaves the reds alone; the orbs, Vecna, the sky and the rain are actors and keep the colors painted.
import { clock } from './creel_a.ts';
import type { ClockKit, Kit } from './creel_a.ts';
import { RUG4, UD, vine } from './creel_b.ts';
import type { Light, Prop, StageLook } from './look_kit.ts';
import { knot, puddles, rain, roots, sky } from './attic_fx.ts';
import { tiler } from './attic_paint.ts';
import type { RoofKit } from './attic_paint.ts';
import { dressForm, hero, orb, roundWindow, sheetChair, trunk, vecna } from './attic_props.ts';
import type { TrunkKit } from './attic_props.ts';
import type { Px } from '../px.ts';
import type { Pt } from './tunnel_paint.ts';

export const ROOF_UD: RoofKit = {
  ridge: 'ink', ridgeHi: 'slate', deck: 'shadow', deckHi: 'dusk', deckLo: 'night', raf: 'dusk', rafHi: 'slate', rafLo: 'night',
  plate: 'dusk', plateHi: 'slate', plateLo: 'ink', wd: 'shadow', wdHi: 'dusk', wdLo: 'night', gap: 'blood1', gapHi: 'red', moss: 'teal0', mossHi: 'teal1',
};
export const TRUNK_UD: TrunkKit = { lid: 'soil3', lidHi: 'sand', body: 'soil2', low: 'soil1', strap: 'mist', lock: 'amber' };
const CLOCK_UD: ClockKit = { body: 'slate', hi: 'mist', lo: 'dusk', brass: 'blood1', brassHi: 'red', face: 'grey3', hand: 'blood0', well: 'night' };
export const GLOW_TINT = [700, 50, 70] as const;

/** The old clock of the Upside Down Creel House (16 by 32), with a vine up its trunk. */
export function oldClock(phase: number): Px {
  const px = clock(CLOCK_UD, phase);
  vine(px, [[3, 31], [3, 26], [5, 22], [3, 17], [4, 14]]);
  return px;
}

/** The four orbs for the places in `at`, the one at index `marked` ringed in bone, then the pools of light they make. */
export const orbs = (phase: number, at: readonly Pt[], marked: number): Prop[] => at.map(([x, y], i) => ({ px: orb(phase, i === marked), x, y, actor: true }));
export const orbLights = (at: readonly Pt[], r = 34, s = 0.85): Light[] => at.map(([x, y]) => [x + 8, y + 12, r, s] as Light);

const ORBS_1: Pt[] = [[58, 56], [182, 56], [58, 112], [182, 112]];
const ORBS_2: Pt[] = [[40, 60], [200, 58], [46, 116], [198, 114]];

const WET: Kit = { ...UD, fl: 'shadow', flHi: 'dusk', flLo: 'night' };
const GLINT: [number, number, number][][] = [[[2, 5, 4]], [], [[7, 3, 3]], [[3, 10, 3]]]; // [x, y, w] where the red sky shines on a wet board, by variant

export const ATTIC_A: StageLook[] = [
  {
    slug: 'vine-nest', name: 'Vine nest', night: true, glow: GLOW_TINT,
    note: 'Vines hang from the rafters into a knot over the middle where Vecna floats, the floor open round him, with roots running from the four orbs to his feet.',
    tile: tiler({ roof: ROOF_UD, floor: UD, rug: RUG4 }),
    props: (phase): Prop[] => {
      const o = orbs(phase, ORBS_1, 1);
      return [
        { px: oldClock(phase), x: 32, y: 6 },
        { px: roundWindow(32, phase), x: 184, y: 0 },
        o[0] as Prop,
        { px: vecna('float', phase), x: 110, y: 40, actor: true },
        { px: hero(), x: 100, y: 130, actor: true },
        { px: trunk(TRUNK_UD), x: 12, y: 58 },
        { px: sheetChair(), x: 224, y: 74 },
        { px: dressForm(), x: 16, y: 104 },
        ...o.slice(1),
        { px: roots(phase, ORBS_1.map(([x, y]) => [x + 8, y + 24] as Pt), [128, 100]), x: 0, y: 0 },
        { px: knot(phase, 128, 40), x: 0, y: 0 },
      ];
    },
    lights: [[128, 42, 56, 0.55], ...orbLights(ORBS_1), [200, 16, 36, 0.7], [128, 104, 46, 0.45]],
  },
  {
    slug: 'torn-roof', name: 'Torn roof', night: true, glow: GLOW_TINT,
    note: 'Half the roof is gone to the red storm sky, the rafters black bars against it, rain falling on the boards and puddles, the lightning flashing.',
    tile: tiler({
      roof: ROOF_UD, floor: WET, rug: RUG4,
      extra: (px, c) => { if ('.<>'.includes(c.ch)) for (const [x, y, w] of GLINT[c.v] as [number, number, number][]) px.rect(x, y, w, 1, 'slate'); },
    }),
    props: (phase): Prop[] => {
      const o = orbs(phase, ORBS_2, 1);
      return [
        { px: oldClock(phase), x: 148, y: 6 },
        { px: roundWindow(32, phase), x: 188, y: 0 },
        o[0] as Prop,
        { px: vecna('stand', phase), x: 110, y: 48, actor: true },
        { px: hero(), x: 100, y: 132, actor: true },
        { px: trunk(TRUNK_UD), x: 226, y: 52 },
        { px: sheetChair(), x: 14, y: 96 },
        { px: dressForm(), x: 222, y: 106 },
        ...o.slice(1),
        { px: puddles(phase), x: 0, y: 0 },
        { px: sky(phase), x: 0, y: 0, actor: true },
        { px: rain(phase), x: 0, y: 22, actor: true },
      ];
    },
    lights: [[66, 18, 90, 1], [66, 76, 64, 0.55], ...orbLights(ORBS_2, 30, 0.8), [204, 16, 36, 0.6]],
  },
];
