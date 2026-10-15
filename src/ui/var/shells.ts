// Five dark Game Boys for the touch screen, on review in shell-variations.html. Each is a ShellTheme (touchtheme.ts);
// three paint a pattern into the body once, when the shell is cached. No DOM at import. The first, Play It Loud, was
// picked and is touchtheme.ts's DARK; the other four are kept for the record.
import type { TouchLayout } from '../../core/touchlayout.ts';
import { PAL } from '../../gfx/palette.ts';
import { seeded } from '../touchshapes.ts';
import type { C2D } from '../touchshapes.ts';
import { DARK, LIGHT } from '../touchtheme.ts';
import type { ShellTheme } from '../touchtheme.ts';

export interface ShellVariant { id: number; name: string; blurb: string; theme: ShellTheme }

// ---------------------------------------------------------------- patterns
/** Dark red veins crawling in from the edges, a few drifting spores, and a low red glow from the bottom corner. */
function veins(ctx: C2D, l: TouchLayout): void {
  const { w, h } = l.viewport;
  const rnd = seeded(1983);
  const glow = ctx.createRadialGradient(w * 0.15, h, 0, w * 0.15, h, Math.max(w, h) * 0.8);
  glow.addColorStop(0, 'rgba(200, 32, 46, 0.16)');
  glow.addColorStop(1, 'rgba(200, 32, 46, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  const vein = (x: number, y: number, a: number, width: number, steps: number, depth: number): void => {
    for (let s = 0; s < steps && width > 0.5; s++) {
      const len = 10 + rnd() * 16;
      a += (rnd() - 0.5) * 0.9;
      const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
      for (const [color, k] of [['rgba(122, 16, 32, 0.42)', 1], ['rgba(200, 32, 46, 0.18)', 0.35]] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width * k;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      if (depth < 2 && rnd() < 0.2) vein(nx, ny, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), width * 0.6, Math.floor(steps * 0.5), depth + 1);
      x = nx;
      y = ny;
      width *= 0.9;
    }
  };
  const n = Math.round((w + h) / 75);
  for (let i = 0; i < n; i++) {
    const side = i % 4;
    const x = side === 0 ? 0 : side === 1 ? w : rnd() * w;
    const y = side === 2 ? 0 : side === 3 ? h : rnd() * h;
    const a = Math.atan2(h / 2 - y, w / 2 - x) + (rnd() - 0.5) * 1.4;
    vein(x, y, a, 2.5 + rnd() * 2, 8 + Math.floor(rnd() * 10), 0);
  }
  const spores = Math.round((w * h) / 2600);
  for (let i = 0; i < spores; i++) {
    ctx.fillStyle = `rgba(220, 205, 210, ${0.08 + rnd() * 0.22})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The board through smoky see-through plastic: a few chips, traces with 45 degree jogs, round pads, and a sheen. */
function circuits(ctx: C2D, l: TouchLayout): void {
  const { w, h } = l.viewport;
  const rnd = seeded(1998);
  const trace = 'rgba(185, 165, 240, 0.16)';
  for (let i = 0; i < 4; i++) {
    const cw = 44 + rnd() * 40, ch = 22 + rnd() * 20;
    const x = rnd() * (w - cw), y = rnd() * (h - ch);
    ctx.fillStyle = 'rgba(8, 4, 16, 0.4)';
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = trace;
    for (let k = 4; k < cw - 4; k += 6) {
      ctx.fillRect(x + k, y - 4, 2.5, 4);
      ctx.fillRect(x + k, y + ch, 2.5, 4);
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  const n = Math.round((w + h) / 20);
  for (let i = 0; i < n; i++) {
    let x = rnd() * w, y = rnd() * h;
    let d = Math.floor(rnd() * 4);
    const pads: [number, number][] = [[x, y]];
    ctx.beginPath();
    ctx.moveTo(x, y);
    const legs = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < legs; k++) {
      const [dx, dy] = DIRS[d] as readonly [number, number];
      const len = 18 + rnd() * 70;
      x += dx * len;
      y += dy * len;
      ctx.lineTo(x, y);
      // A short diagonal into the next turn.
      const turn = rnd() < 0.5 ? 1 : 3;
      const [ex, ey] = DIRS[(d + turn) % 4] as readonly [number, number];
      const j = 6 + rnd() * 10;
      x += (dx + ex) * j;
      y += (dy + ey) * j;
      ctx.lineTo(x, y);
      d = (d + turn) % 4;
    }
    pads.push([x, y]);
    ctx.strokeStyle = trace;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (const [px, py] of pads) {
      ctx.fillStyle = 'rgba(185, 165, 240, 0.24)';
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(10, 6, 20, 0.5)';
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.07)');
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
}

/** A Hawkins night sky: square pixel stars, a few of them bright. */
function stars(ctx: C2D, l: TouchLayout): void {
  const { w, h } = l.viewport;
  const rnd = seeded(1984);
  const n = Math.round((w * h) / 1500);
  for (let i = 0; i < n; i++) {
    const x = Math.round(rnd() * w), y = Math.round(rnd() * h);
    const big = rnd() < 0.08;
    ctx.fillStyle = big ? `rgba(255, 240, 176, ${0.35 + rnd() * 0.3})` : `rgba(216, 220, 232, ${0.08 + rnd() * 0.22})`;
    ctx.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
    if (big) {
      ctx.fillStyle = 'rgba(255, 240, 176, 0.15)';
      ctx.fillRect(x - 2, y, 6, 2);
      ctx.fillRect(x, y - 2, 2, 6);
    }
  }
}

// ---------------------------------------------------------------- the five
const UPSIDE_DOWN: ShellTheme = {
  ...LIGHT,
  name: 'upside-down',
  body: '#1c0c11', bodyHi: '#26111a', bodyLo: '#12070b', bodyDeep: '#080305', bodyEnd: '#14080c',
  bezel: '#0f0709', bezelHi: '#170a0e', bezelLo: PAL.blood0,
  well: '#050203',
  stripeA: PAL.red, stripeB: PAL.blood1, stripeText: '#b07a82',
  print: '#c8505a', logo: '#ee3340', logoGlow: 'rgba(255, 60, 60, 0.65)',
  dpad: '#0b0507', dpadHi: '#241218', dpadLo: '#030102',
  ab: '#9a1424', abHi: '#d8404c', abLo: '#4a0610', abDown: '#7a0e1a',
  rubber: '#3a1c23', rubberHi: '#4e2830', rubberLo: '#241014', rubberDown: '#2e161b',
  icon: '#12070a', iconDown: '#0a0405',
  shade: 'rgba(0, 0, 0, 0.6)',
  die: { center: '#7a4650', top: '#62363f', side: '#4e2a31', low: '#422228', line: '#12070a' },
  decor: veins,
};

const ATOMIC_PURPLE: ShellTheme = {
  ...LIGHT,
  name: 'atomic-purple',
  body: '#2b2140', bodyHi: '#382b52', bodyLo: '#201832', bodyDeep: '#150f22', bodyEnd: '#241b37',
  bezel: '#141019', bezelHi: '#1d1724', bezelLo: '#0a080d',
  well: '#050407',
  stripeA: '#9b7be0', stripeB: '#4fc4b8', stripeText: '#8e82a8',
  print: '#b6a6e6', logo: '#cbbff4',
  dpad: '#17141d', dpadHi: '#2e2939', dpadLo: '#08070b',
  ab: '#3a3742', abHi: '#5e5b68', abLo: '#1c1a21', abDown: '#2b2931',
  rubber: '#3f3552', rubberHi: '#524569', rubberLo: '#2a2338', rubberDown: '#352c45',
  icon: '#17121f', iconDown: '#0f0c15',
  shade: 'rgba(0, 0, 0, 0.5)',
  die: { center: '#8a7cab', top: '#72658f', side: '#5d5276', low: '#4f4566', line: '#1d1728' },
  decor: circuits,
};

const HAWKINS_NIGHT: ShellTheme = {
  ...LIGHT,
  name: 'hawkins-night',
  body: '#161b36', bodyHi: PAL.shadow, bodyLo: '#0e1226', bodyDeep: PAL.ink, bodyEnd: '#121730',
  bezel: PAL.ink, bezelHi: PAL.night, bezelLo: PAL.dusk,
  well: '#000000',
  stripeA: PAL.amber, stripeB: PAL.hot, stripeText: PAL.mist,
  print: PAL.cream, logo: PAL.amber, logoGlow: 'rgba(255, 184, 48, 0.35)',
  dpad: PAL.ink, dpadHi: PAL.dusk, dpadLo: '#000000',
  ab: PAL.amber, abHi: PAL.cream, abLo: '#9a5a12', abDown: PAL.orange,
  rubber: PAL.dusk, rubberHi: PAL.slate, rubberLo: PAL.shadow, rubberDown: '#25315a',
  icon: PAL.ink, iconDown: PAL.night,
  shade: 'rgba(0, 0, 0, 0.6)',
  die: { center: PAL.mist, top: PAL.slate, side: '#3a4874', low: '#34416a', line: PAL.ink },
  decor: stars,
};

const BLACKOUT: ShellTheme = {
  ...LIGHT,
  name: 'blackout',
  body: '#000000', bodyHi: '#000000', bodyLo: '#0c0c0f', bodyDeep: '#000000', bodyEnd: '#000000',
  bezel: '#000000', bezelHi: '#000000', bezelLo: '#1e1e25',
  well: '#111114',
  print: '#4c4c58', logo: '#4c4c58',
  dpad: '#000000', dpadHi: '#222228', dpadLo: '#000000',
  ab: '#c21f6a', abHi: '#ff5ca8', abLo: '#6a1a44', abDown: '#8d1450',
  rubber: '#3a3a44', rubberHi: '#d0d0dc', rubberLo: '#34343e', rubberDown: '#2a2a30',
  icon: '#5a5a66', iconDown: '#000000',
  shade: 'rgba(0, 0, 0, 0)',
  die: { center: '#26262d', top: '#202026', side: '#1a1a20', low: '#16161b', line: '#5a5a66' },
  bare: true,
  keys: 'outline',
};

export const SHELLS: ShellVariant[] = [
  { id: 1, name: 'Play It Loud', theme: DARK, blurb: 'The 1995 black Game Boy: charcoal plastic, a slate bezel, the same magenta A and B, labels in soft grey. The closest to the real thing.' },
  { id: 2, name: 'Upside Down', theme: UPSIDE_DOWN, blurb: 'The other world: maroon black plastic with dark red veins and spores, crimson stripes, the name glowing red, blood red A and B.' },
  { id: 3, name: 'Atomic Purple', theme: ATOMIC_PURPLE, blurb: 'The smoky see-through Game Boy Color: the board shows through, with chips and traces. Dark grey A and B, lavender print.' },
  { id: 4, name: 'Hawkins Night', theme: HAWKINS_NIGHT, blurb: 'The game\'s own menu colours: ink and navy plastic under pixel stars, amber trim and keys, cream print. Matches the pause menu.' },
  { id: 5, name: 'Blackout', theme: BLACKOUT, blurb: 'Pure black that melts into an OLED phone. No stripes, logo or grill: thin dim outlines that fill and glow while pressed.' },
];
