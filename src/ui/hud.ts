// The top strip. 256 by 20 px, opaque. Left: the active hero. Middle: quarters and Inspiration. Right: the bench and the d20.
import type { HeroId, HudView, IconId, PartyHud } from '../core/types.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { slotKeyLabel } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { drawBar, drawIcon, drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import { INSPIRATION_SECONDS } from '../progression/index.ts';
import { bulbCount, bulbDark, bulbFill, clamp01, isLowHp, pipCount } from './format.ts';
import { blinkOn, box, clipped, dither, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';

const BULBS: IconId[] = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'];
/** Text, bulbs and the XP line start here, right of the face. */
const LEFT_X = 21;
const LEFT_W = 104;
const MID_X = 130;
const BENCH_END = 236;
const BENCH_W = 60;
const METER_X = 246;
/** The strip is near black, so the lit die gets an orange outline instead of the usual ink one. */
const METER_LIT: DieScheme = { ...DIE_GOLD, edge: 'orange' };

function drawActive(ctx: Ctx, p: PartyHud, t: number): void {
  const low = isLowHp(p.hp, p.hpMax);
  outline(ctx, 1, 0, 18, 18, 'amber');
  clipped(ctx, 2, 1, 16, 16, () => drawPortrait(ctx, p.id, p.ko ? 'hurt' : low ? 'worried' : 'neutral', -2, -1));
  drawText(ctx, p.name, LEFT_X, 1, 'white');
  drawText(ctx, `LV${p.level}`, LEFT_X + p.name.length * 6 + 6, 1, 'yellow');

  drawIcon(ctx, 'mpGem', 90, 0, t);
  outline(ctx, 99, 1, 26, 7, 'slate');
  drawBar(ctx, 100, 2, 24, 5, p.mpMax > 0 ? p.mp / p.mpMax : 0, 'blue', 'night');

  // One bulb per 10 HP. A damaged bulb is lit from the bottom up. Low HP makes the lit ones flicker.
  const n = bulbCount(p.hpMax);
  const pitch = Math.max(6, Math.min(8, Math.floor(LEFT_W / n)));
  for (let i = 0; i < n; i++) {
    const x = LEFT_X + i * pitch;
    const fill = bulbFill(p.hp, p.hpMax, i, n);
    const lit = BULBS[i % BULBS.length] as IconId;
    const dark = bulbDark(t, i, low, settings.reduceFlashing);
    if (fill >= 1 && !dark) { drawIcon(ctx, lit, x, 9, t); continue; }
    drawIcon(ctx, 'bulbOff', x, 9, t);
    if (fill > 0 && fill < 1 && !dark) {
      const rows = Math.max(1, Math.ceil(fill * 6));
      clipped(ctx, x, 17 - rows, 8, rows, () => drawIcon(ctx, lit, x, 9, t));
    }
  }

  const xp = p.xpNext > 0 ? clamp01(p.xp / p.xpNext) : 0;
  box(ctx, LEFT_X, 17, LEFT_W, 1, 'dusk');
  if (xp > 0) box(ctx, LEFT_X, 17, Math.max(1, Math.round(LEFT_W * xp)), 1, 'cyan');
}

function drawMiddle(ctx: Ctx, hud: HudView, t: number): void {
  drawIcon(ctx, 'quarter', MID_X, 1, t);
  drawText(ctx, `x${hud.quarters}`, MID_X + 10, 2, 'white');
  if (hud.inspiration <= 0) return;
  drawIcon(ctx, 'd20Glow', MID_X, 9, t);
  drawText(ctx, `${Math.ceil(hud.inspiration)}S`, MID_X + 10, 10, 'yellow');
  box(ctx, MID_X, 17, 36, 1, 'dusk');
  box(ctx, MID_X, 17, Math.max(1, Math.round(36 * clamp01(hud.inspiration / INSPIRATION_SECONDS))), 1, 'yellow');
}

function drawSlot(ctx: Ctx, p: PartyHud, n: number, x: number, t: number, focus?: HeroId): void {
  const dead = p.ko;
  outline(ctx, x - 1, 0, 14, 14, dead ? 'dusk' : 'slate');
  // A puzzle hint is up and this is the hero who can solve it.
  if (p.id === focus && blinkOn(t, 40, 28)) outline(ctx, x - 2, 0, 16, 16, 'yellow');
  clipped(ctx, x, 1, 12, 12, () => drawPortrait(ctx, p.id, dead ? 'hurt' : 'neutral', x - 6, -3));
  if (dead) dither(ctx, x, 1, 12, 12, 'ink', 2);
  drawText(ctx, slotKeyLabel(n as 1 | 2 | 3 | 4), x + 14, 1, dead ? 'slate' : 'cream');
  const ratio = p.hpMax > 0 ? p.hp / p.hpMax : 0;
  const lit = pipCount(p.hp, p.hpMax);
  const color = ratio > 0.5 ? 'leaf' : ratio > 0.25 ? 'yellow' : 'hot';
  for (let i = 0; i < 4; i++) box(ctx, x + i * 3, 15, 2, 2, i < lit ? color : dead ? 'blood0' : 'grey1');
}

function drawBench(ctx: Ctx, hud: HudView, t: number, focus?: HeroId): void {
  const bench = hud.party.map((p, i) => ({ p, n: i + 1 })).filter((b) => !b.p.active);
  const pitch = Math.min(20, Math.floor(BENCH_W / Math.max(1, bench.length)));
  bench.forEach((b, k) => drawSlot(ctx, b.p, b.n, BENCH_END - (bench.length - k) * pitch, t, focus));
}

/** The party meter: a d20 that fills with light from the bottom and glows gold, with sparks, once the burst is ready. */
function drawMeter(ctx: Ctx, hud: HudView, t: number): void {
  if (!hud.burstReady) {
    drawDie(ctx, METER_X, 9, 8, { scheme: DIE_DIM, lit: hud.burst, litScheme: METER_LIT });
    return;
  }
  drawDie(ctx, METER_X, 9, 8, { scheme: METER_LIT });
  if (settings.reduceFlashing) return;
  const s = (t >> 3) & 3;
  const hot = s === 1 ? 'white' : 'yellow';
  for (const [dx, dy] of [[-9, -6], [9, -6], [-9, 6], [9, 6]] as [number, number][]) {
    if (((dx + dy + s) & 1) === 0) box(ctx, METER_X + dx, 9 + dy, 1, 1, hot);
  }
}

function drawBoss(ctx: Ctx, boss: NonNullable<HudView['boss']>): void {
  const w = 176, x = (SCREEN_W - w) / 2, y = VIEW_TOP + 2;
  outline(ctx, x - 1, y - 1, w + 2, 11, 'ink');
  drawBar(ctx, x, y, w, 9, boss.hpMax > 0 ? boss.hp / boss.hpMax : 0, 'red', 'blood0');
  drawText(ctx, boss.name, SCREEN_W / 2, y + 1, 'white', { align: 'center', shadow: true });
}

/** Top strip (VIEW_TOP px tall): active hero bulbs, MP, XP, bench faces, d20 burst meter, quarters, boss bar.
 * `focus` names a benched hero whose slot should pulse, for the puzzle hint. */
export function drawHud(ctx: CanvasRenderingContext2D, hud: HudView, t: number, focus?: HeroId): void {
  drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
  const active = hud.party.find((p) => p.active) ?? hud.party[0];
  if (active) drawActive(ctx, active, t);
  drawMiddle(ctx, hud, t);
  drawBench(ctx, hud, t, focus);
  drawMeter(ctx, hud, t);
  if (hud.boss) drawBoss(ctx, hud.boss);
}
