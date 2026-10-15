// Dig Dug's art and draw(): the night sky with a flower per round, four strata of dirt with the tunnels cut out of them,
// rocks, Pookas, Fygars and their fire, ghost eyes, the harpoon, the digger, the points that float up, and the banners.
// Every sprite is 8 by 8 and drawn for this cabinet: one bold shape each.
import { discPx, rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawTinyText, tinyWidth } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { DigState, Mob, Rock } from './digdug.ts';
import { BLOCKS, DIRT_TOP, fireBox, harpoonTip } from './digdug.ts';
import { drawBanner, drawLives, drawScoreLine, sprite } from './sprite.ts';
import type { Sprite, Turn } from './sprite.ts';
import { CELL, FIELD } from './types.ts';

// ---------------------------------------------------------------- sprites
const DIGGER_PAL: Record<string, ColorName> = { w: 'white', b: 'blue', c: 'cyan', s: 'sky' };
const DIGGER = [
  sprite(['..www...', '.wwbbc..', '.wwbbbw.', '..wwww..', '.wswwsw.', '..wwww..', '..w..w..', '.ww..ww.'], DIGGER_PAL),
  sprite(['..www...', '.wwbbc..', '.wwbbbw.', '..wwww..', '.wswwsw.', '..wwww..', '...ww...', '..w..w..'], DIGGER_PAL),
];
const POOKA_PAL: Record<string, ColorName> = { r: 'red', y: 'yellow', w: 'white', k: 'black', h: 'hot' };
const POOKA = [
  sprite(['..rrrr..', '.rrrrrr.', 'rywwywwr', 'rywkywkr', 'rryyyyrr', '.rrrrrr.', '..rrrr..', '.hh..hh.'], POOKA_PAL),
  sprite(['..rrrr..', '.rrrrrr.', 'rywwywwr', 'rywkywkr', 'rryyyyrr', '.rrrrrr.', '..rrrr..', '..hhhh..'], POOKA_PAL),
];
const FYGAR_ROWS = [
  ['...gg...', '..gggg..', '.ggwkgg.', 'gggggggg', 'gggggggs', '.gwwwgg.', '..gg.gg.', '.ll...ll'],
  ['...gg...', '..gggg..', '.ggwkgg.', 'gggggggg', 'gggggggs', '.gwwwgg.', '..gg.gg.', '..ll.ll.'],
];
const FYGAR = FYGAR_ROWS.map((r) => sprite(r, { g: 'leaf', w: 'white', k: 'black', s: 'pine1', l: 'pine2' }));
/** The same Fygar flushed red, for the flash while it winds up its fire. */
const FYGAR_HOT = FYGAR_ROWS.map((r) => sprite(r, { g: 'hot', w: 'cream', k: 'black', s: 'blood1', l: 'red' }));
const EYES = sprite(['........', '........', '.ww..ww.', '.wk..wk.', '.ww..ww.', '........', '........', '........'], { w: 'white', k: 'black' });
const ROCK = sprite(['..aaaa..', '.abbbba.', 'abbcbbba', 'abbbbbbd', 'abbbbbdd', 'aabbbddd', '.dddddd.', '........'],
  { a: 'grey3', b: 'grey2', c: 'white', d: 'grey1' });
const LIFE = sprite(['.www.', 'wbbcw', 'wbbbw', '.www.', '.w.w.'], DIGGER_PAL);
const FLOWER = sprite(['.p.', 'pyp', '.p.', '.g.', 'gg.'], { p: 'pink', y: 'yellow', g: 'leaf' });

/** Dirt colors per layer, top to bottom, and the speckle in each. */
const STRATA: [ColorName, ColorName][] = [['sand', 'soil3'], ['soil3', 'soil2'], ['soil2', 'soil1'], ['soil1', 'soil0']];
/** Fixed speckle positions in the dirt, so it doesn't shimmer. Built on first draw: digdug.ts and this file import each
 * other, so nothing here reads its values at load. */
let specks: [number, number][] | null = null;
function speckles(): [number, number][] {
  if (specks) return specks;
  specks = [];
  for (let y = DIRT_TOP * CELL + 2; y < 20 * CELL; y += 5) {
    for (let x = 1 + ((y * 7) % 6); x < FIELD; x += 6 + ((x * 13 + y) % 5)) specks.push([x, y]);
  }
  return specks;
}

// ---------------------------------------------------------------- the field
function drawDirt(ctx: Ctx, s: DigState, ox: number, oy: number): void {
  rect(ctx, ox, oy + 7, FIELD, DIRT_TOP * CELL - 7, 'night');
  for (let i = 0; i < Math.min(s.round, 8); i++) FLOWER.draw(ctx, ox + FIELD - 6 - i * 5, oy + DIRT_TOP * CELL - 5);
  STRATA.forEach(([c], i) => {
    const top = (DIRT_TOP + i * 4) * CELL, h = i === 3 ? 5 * CELL : 4 * CELL;
    rect(ctx, ox, oy + top, FIELD, h, c);
  });
  for (const [x, y] of speckles()) {
    const layer = Math.min(3, Math.floor((y / CELL - DIRT_TOP) / 4));
    rect(ctx, ox + x, oy + y, 1, 1, (STRATA[layer] as [ColorName, ColorName])[1]);
  }
  rect(ctx, ox, oy + DIRT_TOP * CELL, FIELD, 1, 'pine3');
  // The tunnels: runs of dug blocks in each row, cut out in black.
  for (let by = DIRT_TOP * 2; by < 40; by++) {
    let run = -1;
    for (let bx = 0; bx <= BLOCKS; bx++) {
      const dug = bx < BLOCKS && s.dug[by * BLOCKS + bx] === 1;
      if (dug && run < 0) run = bx;
      if (!dug && run >= 0) { rect(ctx, ox + run * 4, oy + by * 4, (bx - run) * 4, 4, 'black'); run = -1; }
    }
  }
}

function drawRock(ctx: Ctx, k: Rock, ox: number, oy: number): void {
  if (k.state === 'crumble') {
    // Three chunks that drift apart and sink.
    const d = Math.min(4, k.t >> 2);
    rect(ctx, ox + k.x + 1 - d, oy + k.y + 4 + (d >> 1), 3, 3, 'grey2');
    rect(ctx, ox + k.x + 5 + d, oy + k.y + 4 + (d >> 1), 3, 3, 'grey1');
    rect(ctx, ox + k.x + 3, oy + k.y + 5 + d, 2, 2, 'grey3');
    return;
  }
  const wob = k.state === 'wobble' ? ((k.t >> 2) & 1 ? 1 : -1) : 0;
  ROCK.draw(ctx, ox + k.x + wob, oy + k.y);
}

function drawMob(ctx: Ctx, s: DigState, m: Mob, ox: number, oy: number): void {
  const x = ox + m.x, y = oy + m.y;
  if (m.gone) return;
  if (m.popT >= 0) {
    // A pop: a ring of sparks that spreads and fades.
    const r = 3 + (m.popT >> 2);
    const c: ColorName = m.kind === 'pooka' ? 'hot' : 'leaf';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rect(ctx, x + 4 + Math.round(Math.cos(a) * r), y + 4 + Math.round(Math.sin(a) * r), 1, 1, m.popT < 12 ? 'white' : c);
    }
    return;
  }
  if (m.ghost) { if ((s.t >> 3) & 1 || m.escaping) EYES.draw(ctx, x, y); else EYES.draw(ctx, x, y - 1); return; }
  if (m.inflate > 0) {
    // Pumped up: a round body that grows with each pump, the eyes stretched across it.
    const r = 4 + m.inflate;
    const body: ColorName = m.kind === 'pooka' ? 'red' : 'leaf';
    discPx(ctx, x + 4, y + 4, r, body);
    rect(ctx, x + 4 - r + 2, y + 2, r * 2 - 4, 2, m.kind === 'pooka' ? 'yellow' : 'pine2');
    rect(ctx, x + 2, y + 2, 1, 1, 'black'); rect(ctx, x + 5, y + 2, 1, 1, 'black');
    return;
  }
  const frame = (s.t >> 3) & 1;
  const flip = m.face === 'left';
  if (m.kind === 'pooka') (POOKA[frame] as Sprite).draw(ctx, x, y, 0, flip);
  else {
    const hot = m.windT > 0 && (m.windT >> 2) & 1;
    ((hot ? FYGAR_HOT : FYGAR)[frame] as Sprite).draw(ctx, x, y, 0, flip);
    const box = fireBox(m);
    if (box) {
      rect(ctx, ox + box.x, oy + box.y, box.w, box.h, 'orange');
      rect(ctx, ox + box.x, oy + box.y + 1, box.w, box.h - 2, (s.t >> 1) & 1 ? 'amber' : 'yellow');
      rect(ctx, ox + box.x, oy + box.y + 2, box.w, box.h - 4, 'cream');
    }
  }
}

function drawPlayer(ctx: Ctx, s: DigState, ox: number, oy: number): void {
  const p = s.player;
  const x = ox + p.x, y = oy + p.y;
  if (s.phase === 'dead' || s.phase === 'gameover') {
    if (s.phase === 'gameover') return;
    if (s.deathBy === 'rock') { rect(ctx, x, y + 5, 8, 3, 'white'); rect(ctx, x + 2, y + 5, 3, 1, 'blue'); return; }
    if (s.deathBy === 'fire' && s.phaseT > 20) {
      rect(ctx, x + 1, y + 1, 6, 7, 'soil0'); rect(ctx, x + 2, y + 2, 1, 1, 'white'); rect(ctx, x + 5, y + 2, 1, 1, 'white');
      return;
    }
    // Caught: he spins, then lies flat.
    if (s.phaseT < 56) (DIGGER[0] as Sprite).draw(ctx, x, y, ((s.phaseT >> 3) & 3) as Turn);
    else { rect(ctx, x, y + 5, 8, 3, 'white'); rect(ctx, x + 5, y + 5, 2, 1, 'blue'); }
    return;
  }
  const frame = p.moving ? (p.step >> 2) & 1 : 0;
  const spr = DIGGER[frame] as Sprite;
  if (p.dir === 'up') spr.draw(ctx, x, y, 3, p.face === 'left');
  else if (p.dir === 'down') spr.draw(ctx, x, y, 1, p.face === 'left');
  else spr.draw(ctx, x, y, 0, p.face === 'left');
}

function drawHarpoon(ctx: Ctx, s: DigState, ox: number, oy: number): void {
  const h = s.harpoon;
  if (!h || h.len <= 0) return;
  const p = s.player;
  const tip = harpoonTip(s, h);
  const sx = p.x + 4 + (h.dir === 'right' ? 4 : h.dir === 'left' ? -4 : 0), sy = p.y + 4 + (h.dir === 'down' ? 4 : h.dir === 'up' ? -4 : 0);
  const x0 = Math.min(sx, tip.x), y0 = Math.min(sy, tip.y);
  rect(ctx, ox + x0, oy + y0, Math.abs(tip.x - sx) + 1, Math.abs(tip.y - sy) + 1, 'white');
  rect(ctx, ox + tip.x - 1, oy + tip.y - 1, 3, 3, h.state === 'hooked' ? 'yellow' : 'cyan');
}

export function drawDigDug(ctx: Ctx, s: DigState, ox: number, oy: number): void {
  rect(ctx, ox, oy, FIELD, FIELD, 'black');
  drawDirt(ctx, s, ox, oy);
  for (const k of s.rocks) drawRock(ctx, k, ox, oy);
  for (const m of s.mobs) if (!m.crushed) drawMob(ctx, s, m, ox, oy);
  // A crushed mob rides the rock down, squashed flat under it.
  for (const m of s.mobs) if (m.crushed && !m.gone) rect(ctx, ox + m.x, oy + m.y + 4, 8, 3, m.kind === 'pooka' ? 'red' : 'leaf');
  drawHarpoon(ctx, s, ox, oy);
  drawPlayer(ctx, s, ox, oy);
  for (const u of s.popups) {
    const w = tinyWidth(u.text);
    drawTinyText(ctx, u.text, ox + u.x - (w >> 1), oy + u.y - 6 - (u.t >> 3), u.t < 40 || (u.t >> 2) & 1 ? 'white' : 'mist');
  }
  rect(ctx, ox, oy + 20 * CELL, FIELD, CELL, 'black');
  drawScoreLine(ctx, ox, oy, s.score, s.best);
  drawLives(ctx, ox, oy, Math.max(0, s.lives - 1), LIFE);
  if (s.phase === 'ready') {
    drawBanner(ctx, ox, oy, 64, `ROUND ${s.round}`, 'white');
    drawBanner(ctx, ox, oy, 80, 'READY!', 'yellow');
  } else if (s.phase === 'clear') {
    drawBanner(ctx, ox, oy, 72, 'ROUND CLEAR', 'yellow');
  } else if (s.phase === 'gameover' || s.phase === 'over') {
    drawBanner(ctx, ox, oy, 76, 'GAME OVER', 'hot');
  }
}
