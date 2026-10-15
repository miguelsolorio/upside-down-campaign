// The touch screen Game Boy's colours, as data, so the shell can come in grey plastic or a dark one. No DOM at import.
// LIGHT is the original grey Game Boy, its colours taken off a photo. The dark designs on review are in var/shells.ts.
import type { TouchLayout } from '../core/touchlayout.ts';
import { PAL } from '../gfx/palette.ts';

/** The d20 on its key, from its brightest facet to the lines between them. */
export interface DieColors { center: string; top: string; side: string; low: string; line: string }

export interface ShellTheme {
  name: string;
  /** The plastic, its lit and shaded edges, the deepest cuts, and where the body's gradient ends at the bottom. */
  body: string; bodyHi: string; bodyLo: string; bodyDeep: string; bodyEnd: string;
  bezel: string; bezelHi: string; bezelLo: string;
  /** The thin edge of the well the game sits in. */
  well: string;
  /** The two stripes over the screen and the small words between and under them. */
  stripeA: string; stripeB: string; stripeText: string;
  /** Printed words: A, B, SWAP, CRIT, SELECT, START. */
  print: string;
  /** The game's name on the body, and a glow behind it if any. */
  logo: string; logoGlow: string | null;
  led: string; ledHi: string; ledLo: string; ledGlow: string;
  dpad: string; dpadHi: string; dpadLo: string;
  ab: string; abHi: string; abLo: string; abDown: string;
  rubber: string; rubberHi: string; rubberLo: string; rubberDown: string;
  /** The SWAP arrow, up and pressed. */
  icon: string; iconDown: string;
  /** The shadow under the keys and the D-pad. */
  shade: string;
  die: DieColors;
  /** No stripes, logo, groove or grill: the body is a plain field and only the controls show. */
  bare: boolean;
  /** Plastic keys with domes and shadows, or thin outlines that fill and glow while pressed. */
  keys: 'plastic' | 'outline';
  /** Painted once over the body, under everything else, into the cached shell. */
  decor: ((ctx: CanvasRenderingContext2D, l: TouchLayout) => void) | null;
}

/** The die once the Crit is ready: gold like the HUD die, on every shell. */
export const DIE_READY: DieColors = { center: PAL.cream, top: PAL.yellow, side: PAL.amber, low: PAL.amber, line: PAL.orange };

/** The original grey Game Boy. */
export const LIGHT: ShellTheme = {
  name: 'light',
  body: '#cdcac6', bodyHi: '#dbd8d4', bodyLo: '#b3b0ab', bodyDeep: '#9e9b97', bodyEnd: '#c4c1bd',
  bezel: '#7d7b87', bezelHi: '#8b8995', bezelLo: '#66646f',
  well: '#2a2930',
  stripeA: '#8f2458', stripeB: '#2d307e', stripeText: '#d6d5dd',
  print: '#2e3288',
  logo: '#2e3288', logoGlow: null,
  led: '#ff3b30', ledHi: '#ffb3a8', ledLo: '#a01810', ledGlow: 'rgba(255, 70, 60, 0.55)',
  dpad: '#26262b', dpadHi: '#45454c', dpadLo: '#111114',
  ab: '#ad1a5e', abHi: '#d24e8b', abLo: '#6e0d39', abDown: '#8d1450',
  rubber: '#8e8c96', rubberHi: '#a3a1ab', rubberLo: '#6b6974', rubberDown: '#787680',
  icon: '#45434f', iconDown: '#3a3844',
  shade: 'rgba(30, 20, 25, 0.3)',
  die: { center: '#b3b1bb', top: '#97959f', side: '#7c7a85', low: '#6b6974', line: '#45434f' },
  bare: false,
  keys: 'plastic',
  decor: null,
};

/** `hex` (#rrggbb) at the given opacity, for gradients that fade a colour out. */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
