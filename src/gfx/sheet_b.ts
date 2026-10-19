// Sheet pages 5 to 8: props and items, portraits, UI pieces, and every effect on a loop.
import type { CharId, Expr, FxKind, IconId, PropKind, PropState } from '../core/types.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawItem, drawProp } from './props.ts';
import { drawBar, drawIcon, drawPanel, drawPortrait } from './ui.ts';
import { drawAlphabetWall, drawLogo } from './logo.ts';
import { drawFx } from './fx.ts';
import { PAL } from './palette.ts';
import { drawLabProps } from './sheet_lab.ts';
import { drawLab2Overlays, drawLab2Props } from './sheet_lab2.ts';
import type { Page } from './sheet_a.ts';

function bg(ctx: Ctx, color: keyof typeof PAL): void {
  ctx.fillStyle = PAL[color];
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

const props: Page = {
  title: 'PROPS ITEMS ICONS',
  subs: 4,
  draw(ctx, t, sub) {
    if (sub === 1) { drawLabProps(ctx, t); return; }
    if (sub === 2) { drawLab2Props(ctx, t); return; }
    if (sub === 3) { drawLab2Overlays(ctx, t); return; }
    bg(ctx, 'pine2');
    drawText(ctx, 'PROPS, ITEMS AND ICONS', 4, 3, 'white', { shadow: true });
    const row = (kind: PropKind, states: PropState[], x: number, y: number, w: number, h: number, gap: number): void => {
      states.forEach((s, i) => drawProp(ctx, { id: kind, kind, x: x + i * (w + gap), y, w, h, state: s, t }));
    };
    row('log', ['closed', 'open'], 6, 16, 32, 16, 8);
    row('gate', ['closed', 'open'], 100, 16, 32, 16, 8);
    row('crate', ['closed', 'open'], 196, 16, 16, 16, 8);
    row('target', ['closed', 'lit'], 6, 44, 16, 16, 10);
    row('bike', ['closed'], 60, 48, 16, 12, 0);
    row('sign', ['closed'], 90, 44, 16, 16, 0);
    row('lights', ['off', 'lit'], 116, 40, 64, 20, 8);
    row('floodlight', ['lit', 'off'], 6, 76, 16, 32, 10);
    row('van', ['closed', 'open'], 70, 84, 48, 28, 8);
    drawText(ctx, 'LOG GATE CRATE', 6, 34, 'cream', { shadow: true });
    drawText(ctx, 'TARGET BIKE SIGN LIGHTS', 6, 62, 'cream', { shadow: true });
    drawText(ctx, 'FLOODLIGHT VAN', 6, 114, 'cream', { shadow: true });
    (['eggo', 'coke', 'quarter'] as const).forEach((k, i) => drawItem(ctx, { kind: k, x: 200 + i * 18, y: 100, t: t + i * 7 }));
    drawText(ctx, 'ITEMS', 200, 108, 'cream', { shadow: true });
    ctx.fillStyle = PAL.night;
    ctx.fillRect(0, 128, SCREEN_W, 96);
    const ids: IconId[] = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue', 'bulbOff', 'd20', 'd20Glow', 'eggo', 'coke', 'quarter', 'arrow', 'cursor', 'heart'];
    const short = ['RED', 'YEL', 'GRN', 'BLU', 'OFF', 'D20', 'GLOW', 'EGGO', 'COKE', 'QUAR', 'ARROW', 'CURS', 'HEART'];
    ids.forEach((id, i) => {
      const x = 8 + (i % 7) * 34, y = 134 + ((i / 7) | 0) * 26;
      drawIcon(ctx, id, x + 8, y, t);
      drawText(ctx, short[i] as string, x + 12, y + 11, 'mist', { align: 'center' });
    });
    drawText(ctx, 'ICONS 8X8', 6, 186, 'slate');
    drawText(ctx, 'UP DOWN FOR THE LAB DOOR AND CONSOLE', 6, 200, 'slate');
  },
};

const CHAR_ROWS: CharId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce'];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];

const portraits: Page = {
  title: 'PORTRAITS',
  subs: 1,
  draw(ctx) {
    bg(ctx, 'night');
    drawText(ctx, 'PORTRAITS 24X24, SIX EXPRESSIONS', 4, 3, 'white');
    EXPRS.forEach((e, j) => drawText(ctx, e.slice(0, 4).toUpperCase(), 40 + j * 30 - 1, 14, 'mist'));
    CHAR_ROWS.forEach((c, i) => {
      drawText(ctx, c.slice(0, 5).toUpperCase(), 2, 28 + i * 31, 'bone');
      EXPRS.forEach((e, j) => drawPortrait(ctx, c, e, 36 + j * 30, 22 + i * 31));
    });
  },
};

const ui: Page = {
  title: 'UI',
  subs: 1,
  draw(ctx, t) {
    bg(ctx, 'ink');
    drawPanel(ctx, 0, 0, SCREEN_W, 20, 'hud');
    for (let i = 0; i < 6; i++) drawIcon(ctx, i < 4 ? (['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'] as const)[i] as IconId : 'bulbOff', 6 + i * 9, 3, t);
    drawBar(ctx, 6, 13, 56, 3, 0.7, 'blue');
    drawBar(ctx, 6, 17, 56, 1, 0.4, 'leaf');
    drawIcon(ctx, 'd20Glow', 70, 6, t);
    drawIcon(ctx, 'quarter', 190, 6);
    drawText(ctx, 'x12', 200, 7, 'amber');
    drawLogo(ctx, t, 128, 26);
    drawAlphabetWall(ctx, 50, 68, 'RUN', t);
    drawText(ctx, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4, 112, 'white');
    drawText(ctx, '0123456789 .,!?\':;-+%/()"#&=x12', 4, 122, 'bone');
    drawPanel(ctx, 4, 136, 168, 48, 'dialog');
    drawPortrait(ctx, 'eleven', 'determined', 10, 142);
    drawText(ctx, 'ELEVEN', 40, 142, 'yellow');
    drawText(ctx, 'Bad. Mine.', 40, 154, 'white');
    drawText(ctx, 'Friends do not lie.', 40, 164, 'white');
    drawIcon(ctx, 'arrow', 158, 172, t);
    drawPanel(ctx, 180, 136, 72, 48, 'menu');
    drawText(ctx, 'RESUME', 198, 144, 'white');
    drawText(ctx, 'ITEMS', 198, 156, 'mist');
    drawText(ctx, 'QUIT', 198, 168, 'mist');
    drawIcon(ctx, 'cursor', 187, 143, t);
    const cols: [string, number][] = [['red', 0.8], ['leaf', 0.5], ['blue', 0.3], ['amber', 1], ['hot', 0.05]];
    cols.forEach(([c, f], i) => drawBar(ctx, 6 + i * 50, 192, 44, 5, f, c as 'red'));
    cols.forEach(([c, f], i) => drawBar(ctx, 6 + i * 50, 202, 44, 2, f, c as 'red'));
    drawText(ctx, 'HUD LOGO WALL FONT PANELS', 4, 212, 'slate');
  },
};

// The numbers the sim really sends: life in frames, w and h as combat/index.ts describes them.
const FX_LIFE: Record<FxKind, number> = {
  slash: 12, push: 10, beam: 24, flame: 36, shield: 120, nova: 20, spark: 12, dust: 16, rock: 30, candy: 90, dart: 30, blast: 14, heal: 24, ring: 16, spore: 160,
  acid: 40, mark: 50, bolt: 40, reveal: 30, trail: 16, howl: 40, taunt: 24,
  scoop: 22, babble: 24, bullet: 36, goo: 18, trap: 600, arcs: 30, pet: 720, bottle: 22, fire: 240,
  slam: 20, glass: 40, sweep: 52, riff: 16, chime: 30, walkman: 40, fall: 48, orb: 220,
};
const FX_SIZE: Record<FxKind, [number, number]> = {
  slash: [28, 51], push: [30, 49], beam: [70, 8], flame: [54, 57], shield: [30, 30], nova: [60, 60], spark: [0, 0], dust: [0, 0], rock: [10, 10],
  candy: [6, 14], dart: [6, 6], blast: [40, 40], heal: [14, 14], ring: [40, 20], spore: [32, 32],
  acid: [8, 8], mark: [32, 16], bolt: [8, 8], reveal: [32, 32], trail: [64, 10], howl: [96, 96], taunt: [64, 64],
  scoop: [32, 32], babble: [56, 48], bullet: [6, 2], goo: [44, 44], trap: [12, 8], arcs: [32, 32], pet: [0, 9], bottle: [6, 20], fire: [48, 24],
  slam: [32, 16], glass: [96, 48], sweep: [352, 24], riff: [80, 80], chime: [24, 24], walkman: [32, 32], fall: [24, 24], orb: [8, 8],
};
const FX_KINDS = Object.keys(FX_LIFE) as FxKind[];
const ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

const fx: Page = {
  title: 'FX',
  subs: 4,
  draw(ctx, t, sub) {
    bg(ctx, 'pine1');
    drawText(ctx, 'EFFECTS ON A LOOP, UP DOWN TURNS THEM', 4, 3, 'white');
    const angle = ANGLES[sub] as number;
    const dirs = ['right', 'down', 'left', 'up'] as const;
    FX_KINDS.forEach((kind, i) => {
      const cx = (i % 5) * 51, cy = 14 + ((i / 5) | 0) * 66;
      ctx.fillStyle = PAL.pine0;
      ctx.fillRect(cx + 1, cy + 1, 49, 55);
      const life = FX_LIFE[kind];
      const lt = (t + i * 5) % (life + 12);
      const directional = kind === 'slash' || kind === 'push' || kind === 'beam' || kind === 'flame' || kind === 'dart' || kind === 'rock';
      const ox = cx + (directional ? (sub === 2 ? 40 : sub === 0 ? 8 : 25) : 25);
      const oy = cy + (directional ? (sub === 3 ? 46 : sub === 1 ? 8 : 28) : 34);
      const [w, h] = FX_SIZE[kind];
      const base = { kind, x: ox, y: oy, dir: dirs[sub] as 'right', angle, t: Math.min(lt, life), life, w, h };
      if (kind === 'rock' || kind === 'dart') {
        base.x += Math.cos(angle) * ((lt * 1.2) % 30);
        base.y += Math.sin(angle) * ((lt * 1.2) % 30);
      }
      if (kind === 'spark' || kind === 'dust') {
        for (let k = 0; k < 3; k++) drawFx(ctx, { ...base, x: ox + Math.cos(k * 2.1) * 3, y: oy + Math.sin(k * 2.1) * 3, angle: k * 2.1 + 0.5 });
      } else if (kind === 'candy') {
        drawFx(ctx, { ...base, x: cx + 14, y: oy - 8 - Math.round(8 * Math.sin((lt / life) * Math.PI)), t: lt, h: 6 });
        drawFx(ctx, { ...base, x: cx + 36, y: oy, t: t, h: 0, w: 8 });
      } else if (kind === 'pet') {
        // w is 1 while he bites: show it for 16 frames in every 96.
        drawFx(ctx, { ...base, w: lt % 96 < 16 ? 1 : 0 });
      } else drawFx(ctx, base);
      drawText(ctx, kind.toUpperCase(), cx + 2, cy + 58, 'cream');
    });
  },
};

export const PAGES_B: Page[] = [props, portraits, ui, fx];
