// Centipede's art and draw(): the mushroom field, the centipede, the spider, the gnome and his shot, the points that
// float where a spider died, and the banners. Each wave has its own colors for the mushrooms and the centipede, the
// classic touch, cycling through six. Every sprite is 7 px across (the spider 9) and drawn for this cabinet.
import { rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawTinyText } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { CentipedeState } from './centipede.ts';
import { DEATH_T, segPos } from './centipede.ts';
import { drawBanner, drawLives, drawScoreLine, sprite } from './sprite.ts';
import type { Sprite } from './sprite.ts';
import { CELL, CELLS, FIELD } from './types.ts';

// ---------------------------------------------------------------- per wave
interface WavePal {
  cap: ColorName; spot: ColorName; stem: ColorName;
  body: ColorName; shine: ColorName; head: ColorName; legs: ColorName;
}
const WAVE_PALS: WavePal[] = [
  { cap: 'red', spot: 'pink', stem: 'cream', body: 'leaf', shine: 'cream', head: 'yellow', legs: 'amber' },
  { cap: 'blue', spot: 'sky', stem: 'amber', body: 'magenta', shine: 'pink', head: 'hot', legs: 'yellow' },
  { cap: 'purple', spot: 'magenta', stem: 'leaf', body: 'amber', shine: 'cream', head: 'cyan', legs: 'sky' },
  { cap: 'teal1', spot: 'cyan', stem: 'pink', body: 'sky', shine: 'white', head: 'orange', legs: 'amber' },
  { cap: 'orange', spot: 'yellow', stem: 'sky', body: 'cyan', shine: 'white', head: 'magenta', legs: 'pink' },
  { cap: 'pine3', spot: 'leaf', stem: 'hot', body: 'hot', shine: 'pink', head: 'white', legs: 'cream' },
];

/** A dome cap with two spots on a short stem. Each hit takes rows off the bottom: 7, 6, 4, then 2 left. */
const MUSH_ROWS = ['..ccc..', '.csccc.', 'ccccscc', 'ccccccc', '..ttt..', '..ttt..', '.ttttt.'];
const MUSH_LEFT = [2, 4, 6, 7];
/** A round body with legs that swap each step, and the head: the same round shape with two eyes and feelers in front.
 * Drawn walking right. */
const BODY_ROWS = [
  ['.l...l.', '.bbbbb.', 'bsbbbbb', 'bbbbbbb', 'bbbbbbb', '.bbbbb.', '..l...l'],
  ['..l...l', '.bbbbb.', 'bsbbbbb', 'bbbbbbb', 'bbbbbbb', '.bbbbb.', '.l...l.'],
];
const HEAD_ROWS = [
  ['.l...a.', '.hhhh.a', 'hhhhwkh', 'hhhhhhh', 'hhhhwkh', '.hhhh.a', '..l..a.'],
  ['..l..a.', '.hhhha.', 'hhhhwkh', 'hhhhhhh', 'hhhhwkh', '.hhhha.', '.l...a.'],
];

interface WaveArt { mush: Sprite[]; body: Sprite[]; head: Sprite[] }
const WAVE_ART: WaveArt[] = WAVE_PALS.map((p) => ({
  mush: MUSH_LEFT.map((n) => sprite(MUSH_ROWS.slice(0, n), { c: p.cap, s: p.spot, t: p.stem })),
  body: BODY_ROWS.map((r) => sprite(r, { b: p.body, s: p.shine, l: p.legs })),
  head: HEAD_ROWS.map((r) => sprite(r, { h: p.head, w: 'white', k: 'black', a: p.legs, l: p.legs })),
}));

// ---------------------------------------------------------------- the rest
/** A gnome in a tall pointed hat with a white beard: the hat is the shape you track. */
const GNOME_PAL: Record<string, ColorName> = { h: 'cyan', t: 'white', s: 'skin0', k: 'black', b: 'white' };
const GNOME = sprite(['...t...', '..hhh..', '..hhh..', '.hhhhh.', 'hhhhhhh', '.sksks.', '.bbbbb.', '..bbb..'], GNOME_PAL);
const LIFE = sprite(['..h..', '.hhh.', 'hhhhh', '.sss.', '..b..'], GNOME_PAL);
/** A fat red spider, legs out then legs in. */
const SPIDER_PAL: Record<string, ColorName> = { b: 'red', e: 'yellow', l: 'hot' };
const SPIDER = [
  sprite(['l.......l', '.l.bbb.l.', '..bbbbb..', 'lbbebebbl', '..bbbbb..', '.l.bbb.l.', 'l.......l'], SPIDER_PAL),
  sprite(['.l.....l.', 'l..bbb..l', '.lbbbbbl.', '..bebeb..', '.lbbbbbl.', 'l..bbb..l', '.l.....l.'], SPIDER_PAL),
];
const BURST: ColorName[] = ['white', 'yellow', 'hot', 'red', 'magenta'];

/** The gnome coming apart: a flash, then a ring of sparks that spins out and thins. */
function drawBurst(ctx: Ctx, cx: number, cy: number, t: number): void {
  if (t < 12) rect(ctx, cx - 2, cy - 2, 5, 5, (t >> 1) & 1 ? 'white' : 'yellow');
  const r = Math.min(3 + t / 4, 16);
  const n = t < 50 ? 8 : 4;
  for (let k = 0; k < n; k++) {
    const a = (k * Math.PI * 2) / n + t * 0.06;
    const c = BURST[(k + (t >> 2)) % BURST.length];
    rect(ctx, cx + Math.round(Math.cos(a) * r) - 1, cy + Math.round(Math.sin(a) * r) - 1, 2, 2, c);
  }
}

export function drawCentipede(ctx: Ctx, ox: number, oy: number, s: CentipedeState, best: number): void {
  rect(ctx, ox, oy, FIELD, FIELD, 'black');
  const art = WAVE_ART[(s.wave - 1) % WAVE_ART.length];
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, FIELD, FIELD);
  ctx.clip();
  for (let cy = 1; cy < CELLS; cy++) {
    for (let cx = 0; cx < CELLS; cx++) {
      const hp = s.mush[cy * CELLS + cx];
      if (hp) art.mush[hp - 1].draw(ctx, ox + cx * CELL, oy + cy * CELL);
    }
  }
  const frame = (s.tick >> 3) & 1;
  for (const chain of s.chains) {
    chain.forEach((g, i) => {
      const [x, y] = segPos(s, g);
      (i ? art.body : art.head)[frame].draw(ctx, ox + x, oy + y, 0, g.dx < 0);
    });
  }
  if (s.spider) SPIDER[(s.tick >> 2) & 1].draw(ctx, ox + Math.round(s.spider.x), oy + Math.round(s.spider.y));
  if (s.shot) rect(ctx, ox + s.shot.x, oy + s.shot.y, 1, 4, 'cream');
  const gx = ox + Math.round(s.px), gy = oy + Math.round(s.py);
  if (s.phase === 'dying') drawBurst(ctx, gx + 3, gy + 4, DEATH_T - s.timer);
  else if (s.phase === 'ready' || s.phase === 'play') GNOME.draw(ctx, gx, gy);
  for (const p of s.popups) drawTinyText(ctx, p.text, ox + p.x, oy + p.y - ((60 - p.t) >> 3), 'white');
  ctx.restore();
  drawScoreLine(ctx, ox, oy, s.score, best);
  drawLives(ctx, ox, oy, s.lives - 1, LIFE);
  if (s.phase === 'ready') drawBanner(ctx, ox, oy, 76, 'READY', 'yellow');
  if (s.phase === 'gameover' || s.phase === 'done') drawBanner(ctx, ox, oy, 76, 'GAME OVER', 'hot');
}
