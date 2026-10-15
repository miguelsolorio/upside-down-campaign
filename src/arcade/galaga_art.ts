// Galaga's art and draw(): the scrolling stars, the bugs with their wings beating, the ship and both kinds of shots, the
// bursts, the points a diving boss leaves behind, and the banners. The bugs are drawn nose down, toward the ship, and
// turned a quarter at a time to the way they fly. Every sprite is 9 px across and drawn for this cabinet.
import { rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawTinyText } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { Foe, GalagaState } from './galaga.ts';
import { DEATH_T, SHIP_Y } from './galaga.ts';
import { drawBanner, drawLives, drawScoreLine, sprite } from './sprite.ts';
import type { Sprite, Turn } from './sprite.ts';
import { FIELD } from './types.ts';

// ---------------------------------------------------------------- sprites
/** A striped bee with round wings that beat up and down. */
const BEE_PAL: Record<string, ColorName> = { y: 'yellow', b: 'blue', w: 'sky', r: 'hot' };
const BEE = [
  sprite(['ww.yyy.ww', 'wwbbbbbww', '.wyyyyyw.', '..bbbbb..', '..yyyyy..', '..rbbbr..', '...y.y...'], BEE_PAL),
  sprite(['...yyy...', '..bbbbb..', 'wwyyyyyww', 'wwbbbbbww', '.wyyyyyw.', '..rbbbr..', '...y.y...'], BEE_PAL),
];
/** A butterfly: two big red wings around a white body, spread then half closed. */
const FLY_PAL: Record<string, ColorName> = { r: 'red', w: 'hot', b: 'white', c: 'yellow' };
const FLY = [
  sprite(['r.......r', 'rr.....rr', 'rww.b.wwr', 'rwwwbwwwr', '.rwwbwwr.', '..rrbrr..', '...cbc...', '...c.c...'], FLY_PAL),
  sprite(['.........', '.r..b..r.', 'rwwwbwwwr', 'rwwwbwwwr', '.rwwbwwr.', '..rrbrr..', '...cbc...', '...c.c...'], FLY_PAL),
];
/** The boss: a horned beetle with a wide shell and yellow eyes. Green, then purple once it has been hit. */
const BOSS_ROWS = [
  ['g.......g', '.g.....g.', '..ggggg..', '.gdddddg.', 'gdydddydg', 'gdddddddg', '.gdddddg.', '..gd.dg..', '..g...g..'],
  ['.g.....g.', '..g...g..', '..ggggg..', '.gdddddg.', 'gdydddydg', 'gdddddddg', '.gdddddg.', '...g.g...', '...g.g...'],
];
const BOSS = BOSS_ROWS.map((r) => sprite(r, { g: 'leaf', d: 'pine3', y: 'yellow' }));
const BOSS_HURT = BOSS_ROWS.map((r) => sprite(r, { g: 'magenta', d: 'purple', y: 'cream' }));
/** The ship, nose up: a white fighter with red wingtips and a blue canopy. */
const SHIP_PAL: Record<string, ColorName> = { w: 'white', r: 'hot', b: 'sky', g: 'grey3' };
const SHIP = sprite(
  ['....w....', '....w....', '...wbw...', '...wbw...', 'r..www..r', 'w.wwwww.w', 'wwwwgwwww', 'ww.rwr.ww', 'w...w...w'], SHIP_PAL);
const LIFE = sprite(['...w...', '..wbw..', '.wwwww.', 'wwwwwww', 'w.r.r.w'], SHIP_PAL);
const STAR_COLORS: ColorName[] = ['slate', 'sky', 'cream'];
const BURST: ColorName[] = ['white', 'yellow', 'hot', 'red'];

function spriteFor(s: GalagaState, f: Foe): Sprite {
  const still = f.mode === 'form';
  const frame = (still ? s.tick >> 4 : s.tick >> 2) & 1;
  if (f.kind === 'boss') return (f.hp > 1 ? BOSS : BOSS_HURT)[frame];
  return (f.kind === 'fly' ? FLY : BEE)[frame];
}

/** The quarter turn nearest the heading, for sprites drawn nose down. */
function turnFor(a: number): Turn {
  return ((((Math.round((a - Math.PI / 2) / (Math.PI / 2))) % 4) + 4) % 4) as Turn;
}

/** A small burst: a flash, then eight sparks flying out. */
function drawPop(ctx: Ctx, x: number, y: number, t: number, big: boolean): void {
  if (t < 6) rect(ctx, x - 2, y - 2, 5, 5, t & 2 ? 'white' : 'yellow');
  const r = big ? Math.min(3 + t / 4, 16) : 2 + t / 2;
  const n = big && t > 50 ? 4 : 8;
  for (let k = 0; k < n; k++) {
    const a = (k * Math.PI * 2) / n + (big ? t * 0.06 : 0);
    const c = BURST[(k + (t >> 2)) % BURST.length];
    rect(ctx, x + Math.round(Math.cos(a) * r) - 1, y + Math.round(Math.sin(a) * r) - 1, 2, 2, c);
  }
}

export function drawGalaga(ctx: Ctx, ox: number, oy: number, s: GalagaState, best: number): void {
  rect(ctx, ox, oy, FIELD, FIELD, 'black');
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, FIELD, FIELD);
  ctx.clip();
  s.stars.forEach((st, i) => {
    if (((s.tick + i * 23) >> 4) % 6) rect(ctx, ox + st.x, oy + Math.floor(st.y), 1, 1, STAR_COLORS[st.c]);
  });
  for (const f of s.foes) {
    if (f.mode === 'wait') continue;
    const sp = spriteFor(s, f), turn = turnFor(f.a);
    const w = turn & 1 ? sp.h : sp.w, h = turn & 1 ? sp.w : sp.h;
    sp.draw(ctx, ox + Math.round(f.x - w / 2), oy + Math.round(f.y - h / 2), turn);
  }
  for (const b of s.bullets) {
    const bx = ox + Math.round(b.x), by = oy + Math.round(b.y);
    rect(ctx, bx, by, 1, 3, 'hot');
    rect(ctx, bx, by + 2, 1, 1, 'yellow');
  }
  for (const shot of s.shots) rect(ctx, ox + shot.x, oy + shot.y, 1, 4, 'cyan');
  const shipX = ox + Math.round(s.sx);
  if (s.phase === 'dying') drawPop(ctx, shipX, oy + SHIP_Y, DEATH_T - s.timer, true);
  else if (s.phase !== 'gameover' && s.phase !== 'done') SHIP.draw(ctx, shipX - 4, oy + SHIP_Y - 4);
  for (const b of s.booms) drawPop(ctx, ox + b.x, oy + b.y, b.t, false);
  for (const p of s.popups) drawTinyText(ctx, p.text, ox + p.x, oy + p.y, 'cyan');
  ctx.restore();
  drawScoreLine(ctx, ox, oy, s.score, best);
  drawLives(ctx, ox, oy, s.lives - 1, LIFE);
  if (s.phase === 'ready') drawBanner(ctx, ox, oy, 90, 'READY', 'cyan');
  if (s.phase === 'stage') drawBanner(ctx, ox, oy, 90, `STAGE ${s.stage}`, 'cyan');
  if (s.phase === 'gameover' || s.phase === 'done') drawBanner(ctx, ox, oy, 90, 'GAME OVER', 'hot');
}
