// Sheet pages 1 to 4: actors, actor flags, the tile index and a small baked stage, by day and at night.
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import { TILE_NAMES } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawActor, drawActorFrame } from './actors.ts';
import { bakeStage, drawStage, tileSample } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { paintGlow } from './glow.ts';
import { drawProp, drawItem } from './props.ts';
import { drawFx } from './fx.ts';
import { drawPanel } from './ui.ts';
import { PAL } from './palette.ts';
import { drawLabContext, drawLabStage } from './sheet_lab.ts';
import { drawLab2Context, drawLab2Stage } from './sheet_lab2.ts';
import { SCHOOL_TILES } from './tile_school.ts';
import { PATCH_TILES } from './tile_town.ts';

export interface Page { title: string; subs: number; draw(ctx: Ctx, t: number, sub: number): void }

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const CHARS = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce', 'agent', 'rat'] as const;
const SHORT = ['MIKE', 'DUST', 'LUCA', 'ELEV', 'WILL', 'JOYC', 'AGNT', 'RAT'];
const FRAMES: [AnimId, number][] = [
  ['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1],
  ['cast', 0], ['cast', 1], ['dash', 0], ['hurt', 0], ['ko', 0],
];

const ENEMIES = new Set(['agent', 'rat', 'guard', 'warden', 'soldier', 'flayed', 'melter', 'grigori']);

export function view(id: string, x: number, y: number, over: Partial<ActorView> = {}): ActorView {
  const kind = ENEMIES.has(id) ? 'enemy' : id === 'erica' || id === 'hopper' ? 'npc' : 'hero';
  return {
    kind, id: id as ActorView['id'], x, y, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false,
    tint: null, alert: false, z: 0, bar: null, ...over,
  };
}

function bg(ctx: Ctx, color: keyof typeof PAL): void {
  ctx.fillStyle = PAL[color];
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

const actors: Page = {
  title: 'ACTORS',
  subs: 4,
  draw(ctx, t, sub) {
    bg(ctx, 'pine1');
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `ACTORS FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    CHARS.forEach((id, r) => {
      const y = 14 + r * 18;
      drawText(ctx, SHORT[r] as string, 2, y + 5, 'bone');
      FRAMES.forEach(([a, f], i) => drawActorFrame(ctx, id, dir, a, f, 30 + i * 16, y));
    });
    drawText(ctx, 'IDLE2 WALK4 ATK2 CAST2 DASH HURT KO', 4, 160, 'mist');
    CHARS.forEach((id, i) => {
      const x = 18 + i * 30;
      drawActor(ctx, view(id, x, 196, { dir, anim: 'walk', t }));
    });
    drawText(ctx, 'LEFT RIGHT PAGE  UP DOWN FACING', 4, 212, 'slate');
  },
};

const flags: Page = {
  title: 'ACTOR FLAGS',
  subs: 4,
  draw(ctx, t, sub) {
    bg(ctx, 'pine2');
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `ACTOR FLAGS FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    const names = ['PLAIN', 'FLASH', 'TINT', 'ALERT', 'BAR', 'LIFT', 'BLEED', 'BLINK'];
    names.forEach((n, i) => drawText(ctx, n, 22 + i * 31, 15 + (i & 1) * 9, 'cream', { shadow: true, align: 'center' }));
    const rows = ['mike', 'eleven', 'agent', 'rat'];
    rows.forEach((id, r) => {
      const y = 70 + r * 46;
      for (let c = 0; c < 8; c++) {
        const x = 22 + c * 31;
        const over: Partial<ActorView> = { dir, anim: c === 3 ? 'attack' : 'idle', t: c === 3 ? 0 : t };
        if (c === 1) over.flash = (t >> 4) & 1 ? 1 : 0.4;
        if (c === 2) over.tint = 'cyan';
        if (c === 3) over.alert = true;
        if (c === 4) over.bar = { hp: 3, hpMax: 5 };
        if (c === 5) over.z = 6 + Math.round(4 * Math.sin(t / 9));
        if (c === 6) over.strained = true;
        if (c === 7) over.blink = ((t >> 3) & 1) === 1;
        drawActor(ctx, view(id, x, y, over));
      }
    });
  },
};

const LAB_TILES = ['labfloor', 'labfloor2', 'hazard', 'vent', 'labwall', 'labcap', 'pipe', 'glass', 'cage'];
const LAB2_TILES = ['locker', 'bench', 'cabinet', 'shelf', 'cable', 'drain', 'stain', 'vines', 'mass', 'tilegreen', 'carpet', 'wallsign', 'plate'];
const OUTDOOR_TILES = TILE_NAMES.filter((n) => !LAB_TILES.includes(n) && !LAB2_TILES.includes(n) && !SCHOOL_TILES.includes(n) && !PATCH_TILES.includes(n));

// Three pages: the outdoor tiles (sub 0), the lab tiles with a strip showing them beside their neighbours (sub 1),
// then the second pass of lab tiles, three variants each, with their own strip (sub 2).
const tiles: Page = {
  title: 'TILES',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.night;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const names = sub === 0 ? OUTDOOR_TILES : TILE_NAMES.filter((n) => (sub === 1 ? LAB_TILES : LAB2_TILES).includes(n));
    names.forEach((n, i) => {
      const cx = (i % 4) * 64, cy = 2 + ((i / 4) | 0) * 31;
      for (let v = 0; v < 3; v++) ctx.drawImage(tileSample(n, v, t), cx + v * 16, cy);
      drawText(ctx, n.toUpperCase().slice(0, 10), cx + 1, cy + 18, 'bone');
    });
    if (sub === 1) {
      drawText(ctx, 'LAB TILES AND THEIR NEIGHBOURS', 4, 92, 'mist');
      drawLabContext(ctx, 104, t);
      drawText(ctx, 'UP DOWN', 4, 204, 'slate');
    }
    if (sub === 2) {
      drawText(ctx, 'HARD LAB TILES BESIDE NEIGHBOURS', 4, 124, 'mist');
      drawLab2Context(ctx, 136, t);
      drawText(ctx, 'UP DOWN', 200, 124, 'slate');
    }
  },
};

// ---------------------------------------------------------------- stage
const STAGE = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTtTTTTTTTTTTTTTTTT~~~TTTTTTTT',
  'TT..,.,TTT..,.,..TTTT~~~TTT.,.TT',
  'T.,.f.,.b.,.:::.,.TT.www.TT..,TT',
  'T.,.,.,..,.:-----:.....wwwppppTT',
  'T..F,.HHHhhh.,.,.-:..T.www.,.,XX',
  'T.,F..HdHSSs..,.,-.,.T.~~~.,.gXX',
  'TTFFF.-.HHs.k..b.-,..TT~~~..ggXX',
  'T..m.,--l..,.,.,.---:TT~~~.==_==',
  'T,.r.,.,.,,..t.,.,.-----..===_=',
  'TT,..,T.,.,TT,.,.,.,.TT.,.===_=',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
let baked: BakedStage | null = null;
let bakedNight: BakedStage | null = null;

const stage: Page = {
  title: 'STAGE',
  subs: 4,
  draw(ctx, t, sub) {
    if (sub === 2) {
      drawLabStage(ctx, t, view);
      drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
      drawText(ctx, 'LAB IN DAYLIGHT', 6, 6, 'white');
      drawText(ctx, 'UP DOWN', 200, 6, 'slate');
      return;
    }
    if (sub === 3) {
      drawLab2Stage(ctx, t, view);
      drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
      drawText(ctx, 'HARD LAB: ANIMAL, POWER, RECORDS', 6, 6, 'white');
      drawText(ctx, 'UP DOWN', 200, 6, 'slate');
      return;
    }
    const night = sub === 1;
    baked ??= bakeStage(STAGE);
    bakedNight ??= bakeStage(STAGE, true);
    const stage = night ? bakedNight : baked;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const hx = 40 + ((t / 2) % 290);
    const camX = Math.max(0, Math.min(stage.w - SCREEN_W, Math.round(hx - 128)));
    ctx.save();
    ctx.translate(-camX, VIEW_TOP);
    drawStage(ctx, stage, camX, 0, t);
    // The same pools the game paints at night, under the sprites.
    if (night) {
      paintGlow(ctx, [
        { x: 56 - camX, y: VIEW_TOP + 48, r: 30, flicker: 1 },
        { x: 408 - camX, y: VIEW_TOP + 72, r: 44, flicker: 0.4 },
        { x: 120 - camX, y: VIEW_TOP + 80, r: 22 },
        ...stage.windows.map((w) => ({ x: w.x - camX, y: w.y + VIEW_TOP, r: 30, k: 1.1 })),
      ], t);
    }
    for (const [kind, x, y, w, h, state] of [
      ['lights', 24, 40, 32, 16, 'lit'], ['crate', 200, 98, 16, 16, 'closed'], ['log', 240, 56, 16, 16, 'closed'],
      ['gate', 224, 40, 16, 16, 'closed'], ['target', 344, 56, 16, 16, 'closed'], ['sign', 56, 100, 16, 16, 'closed'],
      ['bike', 24, 108, 16, 16, 'closed'], ['van', 424, 98, 48, 28, 'closed'], ['floodlight', 400, 70, 16, 32, 'lit'],
    ] as [string, number, number, number, number, string][]) {
      drawProp(ctx, { id: kind, kind: kind as 'log', x, y, w, h, state: state as 'lit', t }, night);
    }
    drawItem(ctx, { kind: 'eggo', x: 120, y: 56, t });
    drawItem(ctx, { kind: 'coke', x: 200, y: 130, t });
    drawItem(ctx, { kind: 'quarter', x: 150, y: 60, t });
    drawActor(ctx, view('mike', hx, 78, { dir: 'right', anim: 'walk', t }));
    drawActor(ctx, view('eleven', hx - 18, 80, { dir: 'right', anim: 'walk', t }));
    drawActor(ctx, view('agent', 300, 90, { dir: 'left', anim: 'idle', t, alert: (t >> 5) & 1 ? true : false }));
    drawActor(ctx, view('rat', 280, 112, { dir: 'left', anim: 'walk', t, bar: { hp: 2, hpMax: 4 } }));
    drawFx(ctx, { kind: 'slash', x: hx + 8, y: 70, dir: 'right', angle: 0, t: t % 40, life: 16, w: 26, h: 0 });
    ctx.restore();
    drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
    drawText(ctx, night ? 'STAGE AT NIGHT' : 'STAGE IN DAYLIGHT', 6, 6, 'white');
    drawText(ctx, 'UP DOWN', 200, 6, 'slate');
  },
};

export const PAGES_A: Page[] = [actors, flags, tiles, stage];
