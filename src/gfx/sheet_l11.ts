// Sheet pages for level 11 (docs/level-11.md), stage 4.2: Eddie in the Hellfire Club look in every frame and facing and the six faces of his
// portrait; the Creel ghoul, the Glass wraith, in its poses, an elite and the shatter, and stepping out of a mirror; the Hellfire Club in
// Storm, its tiles painted and at night, then the room baked and lit with its candles and the rain and lightning on its windows; the Creel
// House in Abandoned and in Blood red, its tiles painted and at night, then a hall with the parlor re-baked in Blood red as the curse turns it,
// the mirrors (whole with a ghoul in the glass, one stepping out, shattered), the clock whole and smashed, the curse on a hero, Eddie's riff and
// a marked foe; and the new effects at every step of their life. Everything is baked and drawn the way the stage is, so it shows what it will.
import type { ActorView, AnimId, Dir, Expr } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawProp } from './props.ts';
import { paintGlow } from './glow.ts';
import type { Glow } from './glow.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import type { Px } from './px.ts';
import { drawPortrait } from './ui.ts';
import { bakeStage, drawStage, samplePx } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head, prop } from './sheet_l56b.ts';
import { CLUB_TILES } from './tile_club.ts';
import { CREEL_TILES, creelNear, creelTile } from './tile_creel.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];
const label = (ctx: Ctx, text: string, x: number, y: number): void => { drawTinyText(ctx, text, x, y, 'mist'); };
const wipe = (ctx: Ctx, color: keyof typeof PAL): void => { ctx.fillStyle = PAL[color]; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); };

/** A room drawn in plain letters, turned into the stage's tile characters (core/tiles.ts). */
const rooms = (legend: Record<string, string>, rows: string[]): string[] => rows.map((r) => [...r].map((c) => legend[c] ?? c).join(''));

/** # cap, W wall, c chalkboard, p poster (two in a row are the banner), w window, D door, S bookcase, . floor, d desk, T the D&D table. */
export const CLUB = rooms({ '#': 'Ø', W: 'Ù', c: 'Ú', p: 'Û', w: 'Ü', D: 'Ý', S: 'ß', '.': 'à', d: 'á', T: 'â' }, [
  '################', 'WcccppWwwWWDDSSW', '................', '.d.d............', '......TTTTT.....', '.d.d..TTTTT.....',
  '......TTTTT.....', '.d.d............', '................', '................', '................', '################',
]);
/** # cap, W wall, w window, . floor, r rug, x hole, s stairs, f furniture under sheets. The doorway at x 11 and 12 is the foyer's mirror's. */
export const HOUSE = rooms({ '#': 'ã', W: 'ä', w: 'å', '.': 'æ', r: 'ç', x: 'è', s: 'é', f: 'ê' }, [
  '################', 'wwWWWWWWwwW..WWW', '................', '.sss....rrrrr..f', '.sss....rrrrr..f', '.sss....rrrrr...',
  '................', '...ff.......xx..', '.............xx.', '................', '................', '################',
]);
/** The parlor, the right six tiles of the house: the room the curse turns Blood red, baked in that skin once. */
const PARLOR = HOUSE.map((r) => r.slice(10));
let parlor: BakedStage | null = null;
const bloodParlor = (): BakedStage => (parlor ??= bakeStage(PARLOR, true, 'memory'));

type Frame = [AnimId, number];
/** Eddie's frames: idle twice, the walk, the swing's wind-up and blow, the two solo frames, hurt and down. */
const EDDIE_FRAMES: Frame[] = [['idle', 0], ['idle', 30], ['walk', 0], ['walk', 7], ['walk', 14], ['walk', 21], ['attack', 0], ['attack', 8], ['cast', 0], ['cast', 8], ['hurt', 0], ['ko', 0]];
const EDDIE_NAMES = ['IDLE', 'BREATHE', 'WALK 1', 'WALK 2', 'WALK 3', 'WALK 4', 'WIND UP', 'THE BLOW', 'SOLO', 'ROCK OUT', 'HURT', 'DOWN'];

/** A row of Eddie's frames at k times their size, `pitch` px apart on the screen, the first one's feet at (x + 14k, y). */
function eddieRow(ctx: Ctx, dir: Dir, frames: Frame[], x: number, y: number, k: number, pitch = 34): void {
  ctx.save();
  ctx.scale(k, k);
  frames.forEach(([anim, t], i) => drawActor(ctx, view('eddie', (x + 14 * k + i * pitch) / k, y / k, { kind: 'hero', dir, anim, t })));
  ctx.restore();
}

// ---------------------------------------------------------------- Eddie
const eddie: Page = {
  title: 'EDDIE: HELLFIRE CLUB',
  subs: 5,
  draw(ctx, _t, sub) {
    wipe(ctx, 'grey1');
    if (sub === 4) {
      drawText(ctx, 'EDDIE: THE SIX FACES', 4, 3, 'white', { shadow: true });
      EXPRS.forEach((e, i) => {
        const x = 12 + (i % 3) * 80, y = 24 + ((i / 3) | 0) * 80;
        drawPortrait(ctx, 'eddie', e, x, y);
        label(ctx, e.toUpperCase(), x, y + 28);
      });
      drawText(ctx, 'DARK RED GROUND, TONGUE OUT WHEN HAPPY', 4, 212, 'slate');
      return;
    }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `EDDIE FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    eddieRow(ctx, dir, EDDIE_FRAMES.slice(0, 6), 8, 40, 1);
    eddieRow(ctx, dir, EDDIE_FRAMES.slice(6), 8, 80, 1);
    EDDIE_NAMES.forEach((n, i) => label(ctx, n, 8 + (i % 6) * 34, i < 6 ? 46 : 86));
    eddieRow(ctx, dir, [['attack', 0], ['attack', 8], ['cast', 0], ['cast', 8]], 8, 148, 2, 60);
    eddieRow(ctx, dir, [['idle', 0], ['walk', 0], ['hurt', 0], ['ko', 0]], 8, 198, 2, 60);
    drawText(ctx, 'UP DOWN FACING', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- the ghoul
const GHOUL_POSES: [string, Partial<ActorView>][] = [
  ['GLASS', { pose: 'rise', t: 2 }], ['STEP', { pose: 'rise', t: 24 }], ['STAND', { anim: 'idle', t: 0 }], ['DRIFT', { anim: 'walk', t: 8 }], ['DRIFT 2', { anim: 'walk', t: 24 }],
  ['LUNGE', { anim: 'attack', alert: true }], ['HURT', { anim: 'hurt' }], ['BREAK', { anim: 'ko', t: 0 }], ['FADE', { anim: 'ko', t: 16 }], ['GONE', { anim: 'ko', t: 30 }],
];

const ghoul: Page = {
  title: 'CREEL GHOUL: GLASS WRAITH',
  subs: 2,
  draw(ctx, t, sub) {
    const actor = (x: number, y: number, over: Partial<ActorView>): void => drawActor(ctx, view('ghoul', x, y, { kind: 'enemy', ...over }));
    if (sub === 0) {
      wipe(ctx, 'grey1');
      drawText(ctx, 'THE GHOUL: THE POSES AND THE SHATTER', 4, 3, 'white', { shadow: true });
      [false, true].forEach((elite, r) => {
        label(ctx, elite ? 'ELITE: THE CRACKS RUN RED' : 'GLASS WRAITH', 4, 16 + r * 40);
        GHOUL_POSES.forEach(([name, over], i) => {
          actor(14 + i * 25, 52 + r * 40, { ...over, elite });
          if (!r) label(ctx, name, 2 + i * 25, 56);
        });
      });
      ctx.save();
      ctx.scale(3, 3);
      for (let i = 0; i < 3; i++) drawActor(ctx, view('ghoul', 22 + i * 28, 70, { kind: 'enemy', anim: i === 2 ? 'attack' : 'walk', t: i * 8, z: 2 + (i & 1) }));
      ctx.restore();
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    // Stepping out of the glass: a mirror with its ghoul in it, one coming out, one drifting, an elite marked by Eddie and winding up.
    wipe(ctx, 'black');
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake('l11house', HOUSE);
    drawStage(ctx, stage, 0, 0, t);
    drawProp(ctx, prop('mirror', 'm1', 48, 16, 16, 16, 'closed', t, 1), true);
    drawProp(ctx, prop('mirror', 'm2', 112, 16, 16, 16, 'closed', t, 0.5), true);
    actor(120, 40, { pose: 'rise', t: t % 60 });
    actor(180, 90, { dir: 'left', anim: 'walk', t, z: 2 + ((t >> 4) & 1), bar: { hp: 70, hpMax: 110 } });
    actor(70, 110, { anim: 'attack', alert: true, t, elite: true, marked: true, bar: { hp: 90, hpMax: 150 } });
    drawActor(ctx, view('mike', 200, 140, { dir: 'left', anim: 'idle', t }));
    ctx.restore();
    paintGlow(ctx, lights(stage), t);
    head(ctx, 'THE GHOUL STEPS OUT OF THE MIRROR');
  },
};

// ---------------------------------------------------------------- tiles
const nightCache = new Map<string, HTMLCanvasElement>();
const dayCache = new Map<string, HTMLCanvasElement>();
const spot = (v: number): { tx: number; ty: number } => ({ tx: 5 + v * 3, ty: 4 + v * 7 });
const around = (n: TileName): { n: TileName; e: TileName; s: TileName; w: TileName } => ({ n, e: n, s: n, w: n });

/** A tile painted (day) or at night, three variants by place; `memory` paints the house in Blood red. */
function sample(name: TileName, v: number, night: boolean, memory: boolean): HTMLCanvasElement {
  const key = `${name}${v}${memory ? 'm' : ''}`, cache = night ? nightCache : dayCache;
  let c = cache.get(key);
  if (!c) {
    const day: Px = memory ? (creelTile(name, { ...spot(v), near: creelNear(name, v, around(name)) }, true) as Px) : samplePx(name, v);
    c = (night ? nightTile(day, name, { ...spot(v), near: around(name) }) : day).toCanvas();
    cache.set(key, c);
  }
  return c;
}

/** Three variants painted and the same three at night, five names to a row. */
function index(ctx: Ctx, names: TileName[], text: string, memory = false): void {
  wipe(ctx, 'night');
  drawText(ctx, text, 4, 3, 'bone');
  names.forEach((n, i) => {
    const col = i % 5, cx = 2 + col * 51, cy = 16 + ((i / 5) | 0) * 50;
    for (let v = 0; v < 3; v++) { ctx.drawImage(sample(n, v, false, memory), cx + v * 17, cy); ctx.drawImage(sample(n, v, true, memory), cx + v * 17, cy + 17); }
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
  });
  drawText(ctx, 'UP DOWN', 200, 3, 'slate');
}

/** The pools of light a baked stage's own windows make: the club's candles. */
const lights = (stage: BakedStage, extra: Glow[] = []): Glow[] => [...stage.windows.map((w) => ({ x: w.x, y: w.y + VIEW_TOP, r: 30, k: 1.1, flicker: 0.3 })), ...extra];

const club: Page = {
  title: 'THE HELLFIRE CLUB',
  subs: 2,
  draw(ctx, t, sub) {
    wipe(ctx, 'black');
    if (sub === 0) { index(ctx, CLUB_TILES, 'STORM, PAINTED, THEN AT NIGHT'); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake('l11club', CLUB);
    drawStage(ctx, stage, 0, 0, t);
    drawActor(ctx, view('eddie', 128, 52, { dir: 'down', anim: 'idle', t }));
    drawActor(ctx, view('mike', 96, 130, { dir: 'right', anim: 'walk', t }));
    drawActor(ctx, view('eddie', 190, 140, { dir: 'left', anim: (t >> 6) & 1 ? 'cast' : 'idle', t }));
    ctx.restore();
    paintGlow(ctx, lights(stage), t);
    head(ctx, 'THE CLUB: CANDLES, RAIN AND LIGHTNING');
  },
};

// ---------------------------------------------------------------- the house
const house: Page = {
  title: 'THE CREEL HOUSE',
  subs: 4,
  draw(ctx, t, sub) {
    wipe(ctx, 'black');
    if (sub < 2) { index(ctx, CREEL_TILES, sub ? 'BLOOD RED, THEN AT NIGHT' : 'ABANDONED, THEN AT NIGHT', sub === 1); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake('l11house', HOUSE);
    drawStage(ctx, stage, 0, 0, t);
    // The curse: the parlor, the right six tiles, baked again in Blood red over the hall.
    if (sub === 3) { ctx.save(); ctx.translate(160, 0); drawStage(ctx, bloodParlor(), 0, 0, t); ctx.restore(); }
    drawProp(ctx, prop('mirror', 'a', 48, 16, 16, 16, 'closed', t, 1), true);
    drawProp(ctx, prop('mirror', 'b', 80, 16, 16, 16, 'closed', t, 0), true);
    drawProp(ctx, prop('mirror', 'c', 112, 16, 16, 16, sub === 2 ? 'closed' : 'open', t, 0.5), true);
    drawProp(ctx, prop('mirror', 'd', 176, 16, 32, 16, sub === 2 ? 'closed' : 'open', t, 1), true);
    drawProp(ctx, prop('clock', 'k', 224, 0, 16, 32, sub === 2 ? 'closed' : 'open', t), true);
    drawActor(ctx, view('ghoul', 56, 40, { kind: 'enemy', pose: 'rise', t: t % 60 }));
    const swing = t % 40;
    drawActor(ctx, view('eddie', 110, 100, { dir: 'up', anim: 'attack', t: swing }));
    if (swing >= 9 && swing < 23) drawFx(ctx, { kind: 'riff', x: 110, y: 78, dir: 'up', angle: -Math.PI / 2, t: swing - 9, life: 14, w: 28, h: 28 });
    drawActor(ctx, view('max', 214, 100, { dir: 'down', anim: 'hurt', z: 5, curse: 1 + ((t >> 5) % 3) }));
    if (sub === 3 && (t % 90) < 30) drawFx(ctx, { kind: 'chime', x: 232, y: 20, dir: 'down', angle: 0, t: t % 90, life: 30, w: 40, h: 0 });
    drawActor(ctx, view('mike', 150, 130, { dir: 'left', anim: 'idle', t }));
    ctx.restore();
    paintGlow(ctx, lights(stage), t);
    head(ctx, sub === 2 ? 'THE HALL: MIRRORS, A GHOUL, THE CLOCK' : 'THE CURSE: THE PARLOR TURNS BLOOD RED');
  },
};

// ---------------------------------------------------------------- the new effects
/** The effects, how wide each is and how long it lives, and how many steps of its life the page shows, `pitch` px apart. */
const EFFECTS: [string, 'riff' | 'chime' | 'walkman' | 'glass', number, number, number, number][] = [
  ['RIFF 28 PX: THE SWING', 'riff', 28, 14, 6, 40], ['RIFF 80 PX: A PULSE OF THE SOLO', 'riff', 80, 18, 3, 84],
  ['CHIME: A RING OFF THE CLOCK', 'chime', 40, 30, 6, 40], ['WALKMAN: NOTES ROUND MAX', 'walkman', 48, 60, 6, 40],
  ['GLASS 16: A GHOUL', 'glass', 16, 20, 6, 40], ['GLASS 32: A DOORWAY MIRROR', 'glass', 32, 24, 6, 40],
];

const effects: Page = {
  title: 'CHAPTER 4 EFFECTS',
  subs: 2,
  draw(ctx, _t, sub) {
    wipe(ctx, 'night');
    drawText(ctx, sub ? 'CHIME, WALKMAN, GLASS' : 'RIFF', 4, 3, 'white', { shadow: true });
    const rows = sub ? EFFECTS.slice(2) : EFFECTS.slice(0, 2), ys = sub ? [50, 100, 140, 190] : [50, 140];
    rows.forEach(([name, kind, w, life, n, pitch], r) => {
      const y = ys[r] as number;
      label(ctx, name, 4, y - (sub ? 22 : 38));
      for (let i = 0; i < n; i++) drawFx(ctx, { kind, x: 40 + i * pitch, y: y + (kind === 'riff' && w > 40 ? 20 : 0), dir: 'down', angle: 0, t: Math.round((i / (n - 1)) * life * 0.95), life, w, h: w });
    });
    drawText(ctx, 'EACH STEP OF ITS LIFE, LEFT TO RIGHT', 4, SCREEN_H - 12, 'slate');
  },
};

export const L11_PAGES: Page[] = [eddie, ghoul, club, house, effects];
