// The level-up overlay: the d20 tumbles for 1.2 seconds, lands, then the gains, the hero's line and any new talent show.
import type { Scene } from '../core/scene.ts';
import type { LevelUpInfo } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import { wrapText } from '../core/text.ts';
import { settings } from '../core/settings.ts';
import { audio } from '../audio/index.ts';
import { bark } from '../story/index.ts';
import { drawIcon, drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import { dieFace, gainRows, otherDie, tumbleTicks } from './format.ts';
import { DIE_BONE, DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';
import { bigText, blinkOn, box, clipped, dither, drawGt } from './kit.ts';
import type { Ctx } from './kit.ts';

/** The tumble lasts 72 frames, 1.2 seconds. */
const LAND = 72;
/** Confirm waits this long after the landing, so a button mash cannot close the panel unseen. */
const READY = LAND + 14;
const PX = 14;
const PW = 228;
const WRAP = 34;

interface Pose { angle: number; squash: number; dy: number }

/** Spin, flip and bounce, all easing to rest at the landing. k = 1 gives the second die its own rhythm. */
function pose(frame: number, k: number, bounce: number): Pose {
  if (frame >= LAND) return { angle: 0, squash: 1, dy: 0 };
  const p = frame / LAND, q = 1 - p;
  return {
    angle: (k ? -1 : 1) * q * q * 9.4,
    squash: 0.4 + 0.6 * Math.abs(Math.cos(q * q * 15 + k * 0.9)),
    dy: -Math.abs(Math.sin(p * Math.PI * (3 - k))) * bounce * q,
  };
}

function dieWithNumber(ctx: Ctx, cx: number, cy: number, r: number, n: number, scheme: DieScheme, p: Pose): void {
  drawDie(ctx, cx, cy + p.dy, r, { scheme, angle: p.angle, squash: p.squash });
  if (p.squash < 0.55) return;
  const ink = scheme === DIE_GOLD ? 'blood1' : 'ink';
  bigText(ctx, String(n), cx, cy + p.dy - 5, ink, 2, 'center', false);
}

/** Rays around a Nat 20. Steady when Reduce flashing is on. */
function rays(ctx: Ctx, cx: number, cy: number, r: number, f: number): void {
  const calm = settings.reduceFlashing;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + (calm ? 0 : f * 0.02);
    const len = calm ? 8 : 5 + (((f >> 2) + k * 3) % 8);
    for (let d = r + 5; d < r + 5 + len; d += 3) box(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, k & 1 ? 'yellow' : 'white');
  }
}

/** A ring that opens from the die for a few frames after it lands. */
function ring(ctx: Ctx, cx: number, cy: number, r: number, age: number, gold: boolean): void {
  if (age < 0 || age > 9) return;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    box(ctx, cx + Math.cos(a) * (r + 3 + age * 2), cy + Math.sin(a) * (r + 3 + age * 2), 2, 2, gold ? (k & 1 ? 'yellow' : 'white') : 'bone');
  }
}

/** Overlay (not opaque): the d20 tumbles, stat gains list, the hero's line, any new talent. */
export function createLevelUpOverlay(opts: { info: LevelUpInfo; onDone(): void }): Scene {
  const info = opts.info;
  const name = CHAR_NAMES[info.hero];
  const gains = gainRows(info.gains);
  const line = bark(info.hero, 'levelUp', info.to);
  const barkLines = line ? wrapText(`"${line}"`, WRAP).slice(0, 3) : [];
  const talentLines = info.talent ? wrapText(info.talent.text, WRAP).slice(0, 3) : [];
  const nat = info.roll === 20;
  const ticks = tumbleTicks(LAND);
  const other = otherDie(info.roll, info.to);

  // Layout, as offsets from the panel top. The panel is only as tall as what it shows.
  let cur = 74;
  const sepY = cur; cur += 4;
  const gainsY = cur; cur += Math.ceil(gains.length / 3) * 10; if (gains.length) cur += 4;
  const barkY = cur; cur += barkLines.length * 9; if (barkLines.length) cur += 6;
  const talentY = cur; if (info.talent) cur += 10 + talentLines.length * 9;
  const H = cur + 14;
  const PY = Math.max(2, Math.floor((224 - H) / 2));
  const barkAt = LAND + 10 + gains.length * 6;
  const talentAt = barkAt + 10;

  let f = 0;
  let done = false;
  const close = (): void => {
    if (done) return;
    done = true;
    opts.onDone();
  };

  function dice(ctx: Ctx): void {
    const landed = f >= LAND;
    const gold = nat && landed;
    const mine = gold ? DIE_GOLD : DIE_BONE;
    if (!info.advantage) {
      const cx = PX + PW - 27, cy = PY + 32;
      dieWithNumber(ctx, cx, cy, 22, dieFace(f, info.roll, info.to, LAND), mine, pose(f, 0, 8));
      if (gold) inPanel(ctx, () => rays(ctx, cx, cy, 22, f));
      if (landed) inPanel(ctx, () => ring(ctx, cx, cy, 22, f - LAND, gold));
      return;
    }
    // Two dice. The left one is kept and always shows the higher number. The other goes dark once they land.
    const cy = PY + 34, ax = PX + PW - 57, bx = PX + PW - 23;
    dieWithNumber(ctx, ax, cy, 17, dieFace(f, info.roll, info.to, LAND), mine, pose(f, 0, 12));
    dieWithNumber(ctx, bx, cy, 17, dieFace(f, other, info.to + 5, LAND), landed ? DIE_DIM : DIE_BONE, pose(f, 1, 12));
    if (gold) inPanel(ctx, () => rays(ctx, ax, cy, 17, f));
    if (landed) inPanel(ctx, () => ring(ctx, ax, cy, 17, f - LAND, gold));
  }

  /** Rays and rings stay inside the panel border. */
  const inPanel = (ctx: Ctx, fn: () => void): void => clipped(ctx, PX + 3, PY + 3, PW - 6, H - 6, fn);

  function header(ctx: Ctx): void {
    const landed = f >= LAND;
    drawPortrait(ctx, info.hero, landed ? 'happy' : 'determined', PX + 8, PY + 8);
    bigText(ctx, 'LEVEL UP', PX + 38, PY + 8, 'yellow', 2, 'left', true);
    let x = PX + 38;
    drawText(ctx, name, x, PY + 27, 'white');
    x += name.length * 6 + 8;
    const from = `LV ${info.from}`;
    drawText(ctx, from, x, PY + 27, 'mist');
    x += from.length * 6 + 3;
    drawGt(ctx, x, PY + 27, 'bone');
    drawText(ctx, String(info.to), x + 9, PY + 27, 'yellow');
    if (!landed) {
      drawText(ctx, 'ROLLING'.padEnd(7 + ((f >> 3) % 4), '.'), PX + 38, PY + 42, 'mist');
      return;
    }
    if (nat) {
      const flash = !settings.reduceFlashing && ((f >> 2) & 1) === 1;
      bigText(ctx, 'NAT 20!', PX + 38, PY + 40, flash ? 'white' : 'yellow', 2, 'left', true);
    } else {
      drawText(ctx, `ROLL ${info.roll}`, PX + 38, PY + 42, 'bone');
    }
    if (info.advantage) drawText(ctx, 'ADVANTAGE', PX + 38, PY + (nat ? 58 : 52), 'cyan');
  }

  return {
    update(g) {
      if (g.input.pressed('confirm')) {
        if (f < LAND) f = LAND - 1;
        else if (f >= READY) { close(); return; }
      }
      f++;
      if (ticks.includes(f)) audio.sfx('roll', { rate: 1.25 - 0.45 * (f / LAND) });
      if (f === LAND) audio.sfx('rollLand');
      if (f === LAND + 6 && nat) audio.sfx('natTwenty');
    },
    draw(ctx) {
      dither(ctx, 0, 0, 256, 224, 'ink', 4);
      drawPanel(ctx, PX, PY, PW, H, 'dialog');
      header(ctx);
      dice(ctx);
      if (nat && !settings.reduceFlashing && f >= LAND && f < LAND + 4) dither(ctx, 0, 0, 256, 224, 'white', 4);
      if (f < LAND) return;
      box(ctx, PX + 8, PY + sepY, PW - 16, 1, 'dusk');
      const shown = Math.min(gains.length, Math.max(0, Math.floor((f - LAND - 4) / 6) + 1));
      gains.slice(0, shown).forEach((row, i) => {
        const x = PX + 12 + (i % 3) * 70, y = PY + gainsY + Math.floor(i / 3) * 10;
        drawText(ctx, row.label, x, y, 'mist');
        drawText(ctx, `+${row.amount}`, x + row.label.length * 6 + 6, y, 'leaf');
      });
      if (f >= barkAt) barkLines.forEach((text, i) => drawText(ctx, text, PX + 12, PY + barkY + i * 9, 'cream'));
      if (info.talent && f >= talentAt) {
        drawText(ctx, `NEW TALENT: ${info.talent.name}`, PX + 12, PY + talentY, 'yellow');
        talentLines.forEach((text, i) => drawText(ctx, text, PX + 12, PY + talentY + 10 + i * 9, 'bone'));
      }
      if (f >= READY && blinkOn(f, 48, 34)) drawIcon(ctx, 'arrow', PX + PW - 16, PY + H - 14, f);
    },
  };
}
