// One fixed NES-style palette. Everything in the game addresses colors by name.
// Pure data: no DOM, safe to import from Node tests.

export const PAL = {
  // neutrals and night blues
  black: '#000000', ink: '#0a0a14', night: '#10142a', shadow: '#1c2340', dusk: '#2c3a63',
  slate: '#4a5a85', mist: '#8190b8', bone: '#d8dce8', white: '#ffffff',
  grey1: '#34343f', grey2: '#6a6a7a', grey3: '#a0a0b0',
  // woods
  pine0: '#0a2218', pine1: '#124a2c', pine2: '#1f7038', pine3: '#38a048', leaf: '#6cc35a',
  // earth
  soil0: '#2a1a14', soil1: '#4a2e1e', soil2: '#7a4d2c', soil3: '#a8743f', sand: '#d4a86a',
  // reds and pinks (the Upside Down, Eleven's dress)
  blood0: '#3a0a14', blood1: '#7a1020', red: '#c8202e', hot: '#ff4a4a', pink: '#ff8fb0', rose: '#d8567a',
  // warm lights (Christmas bulbs, flashlights)
  orange: '#e8801c', amber: '#ffb830', yellow: '#ffe14a', cream: '#fff0b0',
  // cool lights
  teal0: '#0e3a4a', teal1: '#1a7a8a', cyan: '#4ae0ff', blue: '#3a6ae0', sky: '#78a8ff',
  purple0: '#3a1a5a', purple: '#7a3aaa', magenta: '#ff4fd8',
  // skin
  skin0: '#f8d0a8', skin1: '#e0a070', skin2: '#a86a40', skin3: '#6a3c24',
} as const;

export type ColorName = keyof typeof PAL;
export const COLOR_NAMES = Object.keys(PAL) as ColorName[];
