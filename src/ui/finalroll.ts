// The Final Roll (docs/level-16.md, "The Final Roll"): play stops and every hero still standing rolls a d20 with advantage, one
// after another. Two dice tumble on the tumbling d20 of die.ts, the higher stays and the lower dims, the kept numbers add up to a
// total, and the total names the finish: plain under 30, bigger from 30, gold with natTwenty for any 20. It cannot fail.
// The rules and the clock are in finalroll_logic.ts, the finish card in finalroll_finish.ts; this file lays them out and plays the
// sounds. A scene to push over the frozen fight (it dims what is under it), or `opaque` on a screen of its own. Confirm or a click
// skips ahead one beat at a time. When it is over, onDone gets the whole roll, so the caller can hand Joyce the axe.
import type { Scene } from '../core/scene.ts';
import type { HeroId } from '../core/types.ts';
import { BASE_W, CHAR_NAMES, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { labelOf } from '../core/bindings.ts';
import { audio } from '../audio/index.ts';
import { drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { Rng } from '../progression/xp.ts';
import { createRng } from '../core/rng.ts';
import { DIE_BONE, DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import { drawFinish } from './finalroll_finish.ts';
import {
  GRACE, NAT, TUMBLE, beatAt, faceAt, isDone, rollFinal, skipClock, soundsBetween, spinAt, totalAt,
} from './finalroll_logic.ts';
import type { Beat, FinalRoll } from './finalroll_logic.ts';
import { bigText, blinkOn, box, brackets, dither, inFrame } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface FinalRollOpts {
  /** The heroes still standing, in the order they roll. */
  heroes: readonly HeroId[];
  /** The roll to play, as the sim's `finalRoll` event carries it: the scene shows it as it is and rolls nothing. */
  roll?: FinalRoll;
  /** The random source for a roll of the scene's own: the same seed gives the same roll. Used when no `roll` is given. */
  rng?: Rng;
  /** Called once, when the roll is over, with every die and the finish. */
  onDone(result: FinalRoll): void;
  /** True on a screen of its own, with nothing under it to dim. */
  opaque?: boolean;
}

/** The seed of a roll asked for with neither a roll nor a random source: the same as ?seed's default. */
const DEFAULT_SEED = 1983;
/** The dice stage. */
const DIE_R = 17;
const DIE_CY = 136;
const DIE_X: readonly [number, number] = [96, 160];

/** One hero's cell in the row across the top: the cell width shrinks only if more than four heroes roll. */
const cellW = (n: number): number => Math.min(56, Math.floor(224 / Math.max(1, n)));

function drawStrip(ctx: Ctx, roll: FinalRoll, b: Beat): void {
  const n = roll.rolls.length;
  const cell = cellW(n), x0 = Math.round((BASE_W - n * cell) / 2);
  roll.rolls.forEach((r, i) => {
    const x = x0 + i * cell, mid = x + cell / 2;
    const rolled = b.stage === 'finish' || i < b.hero || (i === b.hero && b.stage === 'settled');
    const rolling = i === b.hero && b.stage === 'tumble';
    drawPortrait(ctx, r.hero, rolling ? 'determined' : rolled ? (r.keep >= NAT ? 'shocked' : 'happy') : 'neutral', mid - 12, 44);
    drawText(ctx, CHAR_NAMES[r.hero], mid, 71, rolling ? 'yellow' : 'white', { align: 'center' });
    if (rolled) bigText(ctx, String(r.keep), mid, 81, r.keep >= NAT ? 'yellow' : 'white', 2);
    else drawText(ctx, '--', mid, 84, 'slate', { align: 'center' });
    if (rolling) brackets(ctx, x + 2, 42, cell - 4, 53);
  });
}

/** The pair of dice for the hero rolling now, tumbling or landed with the higher lit. */
function drawDice(ctx: Ctx, roll: FinalRoll, b: Beat): void {
  const r = roll.rolls[b.hero];
  if (!r) return;
  const t = b.stage === 'tumble' ? b.t : TUMBLE;
  const kept = r.dice[0] >= r.dice[1] ? 0 : 1;
  ([0, 1] as const).forEach((k) => {
    const cx = DIE_X[k], spin = spinAt(t, k);
    const landed = b.stage !== 'tumble';
    const isKept = k === kept;
    const scheme = !landed ? DIE_BONE : isKept ? (r.keep >= NAT ? DIE_GOLD : DIE_BONE) : DIE_DIM;
    box(ctx, cx - 10 + (spin.lift >> 2), DIE_CY + DIE_R + 3, 20 - (spin.lift >> 1), 2, 'night');
    drawDie(ctx, cx, DIE_CY - spin.lift, DIE_R, { scheme, angle: spin.angle, squash: spin.squash });
    const face = String(faceAt(t, k, r.dice[k], b.hero * 2));
    const color: ColorName = !landed ? 'mist' : isKept ? (r.keep >= NAT ? 'yellow' : 'white') : 'slate';
    bigText(ctx, face, cx, DIE_CY + DIE_R + 8, color, 2);
    if (landed && isKept) drawText(ctx, 'KEEP', cx, DIE_CY + DIE_R + 25, 'leaf', { align: 'center' });
  });
  if (b.stage === 'settled' && r.keep >= NAT && blinkOn(b.t, 16, 11)) bigText(ctx, 'NAT 20!', 128, 106, 'yellow', 2);
}

export function createFinalRollScene(opts: FinalRollOpts): Scene {
  const roll = opts.roll ?? rollFinal(opts.heroes, opts.rng ?? createRng(DEFAULT_SEED));
  const n = roll.rolls.length;
  let clock = 0;
  /** The clock the sounds have been played up to. */
  let heard = -1;
  let finished = false;

  return {
    opaque: !!opts.opaque,
    update(g) {
      if (finished) return;
      clock++;
      // Confirm lands the tumbling dice, then moves on to the next hero, then ends the finish once it has shown.
      if (clock > GRACE && (g.input.pressed('confirm') || g.input.clicked())) clock = Math.max(clock, skipClock(clock, n));
      for (const id of soundsBetween(heard, clock, roll)) audio.sfx(id);
      heard = clock;
      if (isDone(clock, n)) {
        finished = true;
        opts.onDone(roll);
      }
    },
    draw(ctx) {
      if (opts.opaque) box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      else dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
      const b = beatAt(clock, n);
      inFrame(ctx, () => {
        drawPanel(ctx, 8, 6, 240, 214, 'menu');
        bigText(ctx, 'THE FINAL ROLL', 128, 14, 'yellow', 2, 'center', true);
        drawText(ctx, 'TWO DICE EACH. THE HIGHER STAYS.', 128, 32, 'mist', { align: 'center' });
        drawStrip(ctx, roll, b);
        if (b.stage === 'finish') drawFinish(ctx, roll.finish, b.t);
        else drawDice(ctx, roll, b);
        box(ctx, 20, 188, 216, 1, 'dusk');
        drawText(ctx, 'TOTAL', 24, 197, 'mist');
        const tone: ColorName = b.stage === 'finish' && roll.finish !== 'plain' ? 'yellow' : 'white';
        bigText(ctx, String(totalAt(roll, clock)), 232, 193, tone, 2, 'right');
        if (b.stage !== 'finish') drawText(ctx, `${labelOf('attack')} TO SKIP`, 128, 210, 'slate', { align: 'center' });
      });
    },
  };
}
