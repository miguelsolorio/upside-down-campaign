// The cabinet overlay: what the player sees after pressing Space at a cabinet in the Palace. It stands over the frozen
// level, which goes black behind it, a cabinet face filling the middle of the screen: the marquee with the game's title, the
// screen, and the controls under it. Three states. Attract shows the board and FREE PLAY. Play runs the cart; cancel or
// pause holds it, and a second press leaves without posting. Done posts the score under the hero's name, shows the board
// with the new row lit, and offers another go.
import type { Game, Scene } from '../core/scene.ts';
import type { SfxId } from '../core/types.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { audio } from '../audio/index.ts';
import { rect } from '../gfx/canvas.ts';
import { drawText, textWidth } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import { bigText, blinkOn, dither, inFrame } from '../ui/kit.ts';
import { TITLES } from './cabinets.ts';
import { CARTS } from './carts.ts';
import { postScore } from './scores.ts';
import type { Board } from './scores.ts';
import { FIELD } from './types.ts';
import type { ArcadeGameId, ArcadeResult, Cart, Dir, Pad } from './types.ts';

/** Where the field sits in the 256 wide frame. */
const FX = (256 - FIELD) >> 1, FY = 26;
/** Each game's trim color on the cabinet and the marquee. */
const ACCENT: Record<ArcadeGameId, ColorName> = {
  digdug: 'hot', centipede: 'leaf', dragonslair: 'amber', galaga: 'cyan', pacman: 'yellow', mspacman: 'pink',
};
/** What the fire button does in each game, for the hint under the screen. Pac-Man doesn't use it, and Dragon's Lair
 * names both the arrows and fire, since a cue can be either. */
const FIRE_VERB: Record<ArcadeGameId, string> = {
  digdug: 'PUMP', centipede: 'FIRE', dragonslair: '', galaga: 'FIRE', pacman: '', mspacman: '',
};

export interface ArcadeVisit {
  game: ArcadeGameId;
  /** Every run finished at this cabinet, in order. */
  runs: ArcadeResult[];
  /** Any of those runs beat MADMAX at Dig Dug. */
  beatMadmax: boolean;
}

export interface ArcadeSceneOpts {
  game: ArcadeGameId;
  /** The name a score goes under: the active hero. */
  player: string;
  board: Board;
  onExit(visit: ArcadeVisit): void;
}

type State = 'attract' | 'play' | 'held' | 'done';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/** The controls as a cart reads them. Fire is attack or interact (Space, Enter, Z, J; A on a controller). */
function padOf(g: Game): Pad {
  const a = g.input.axis();
  const fire = g.input.held('attack') || g.input.held('interact');
  const firePressed = g.input.pressed('attack') || g.input.pressed('interact');
  return { mx: a.x, my: a.y, fire, firePressed, dirPressed: DIRS.find((d) => g.input.pressed(d)) ?? null };
}

const go = (g: Game): boolean => g.input.pressed('attack') || g.input.pressed('interact') || g.input.pressed('confirm');
const back = (g: Game): boolean => g.input.pressed('cancel') || g.input.pressed('pause');
/** The way out on this device: Esc on keys, B on a controller or the touch screen. */
const backLabel = (): string => (getPromptDevice() === 'keyboard' ? 'ESC' : 'B');

export function createArcadeScene(opts: ArcadeSceneOpts): Scene {
  const { game, board } = opts;
  const make = CARTS[game];
  const runs: ArcadeResult[] = [];
  let state: State = 'attract';
  let t = 0;
  let seed = 1;
  let cart: Cart = make({ seed, best: board.top(game, 1)[0]?.score ?? 0 });
  let last: ArcadeResult | null = null;

  const leave = (): void => {
    audio.sfx('cancel');
    opts.onExit({ game, runs, beatMadmax: runs.some((r) => r.beatMadmax) });
  };
  const start = (g: Game): void => {
    seed = (Math.imul(g.frame + 1, 2654435761) ^ (runs.length * 40503)) >>> 0;
    cart = make({ seed, best: board.top(game, 1)[0]?.score ?? 0 });
    state = 'play';
    audio.sfx('confirm');
  };
  const play = (sounds: readonly SfxId[]): void => { for (const id of sounds.slice(0, 3)) audio.sfx(id); };

  return {
    // The backdrop is solid black, so nothing under the cabinet needs drawing.
    opaque: true,
    enter() { audio.sfx('pause'); },

    update(g) {
      t++;
      switch (state) {
        case 'attract':
          if (back(g)) { leave(); return; }
          if (go(g)) start(g);
          return;
        case 'play':
          // The window losing focus holds the run too, as Esc does.
          if (back(g) || g.input.interrupted()) { state = 'held'; audio.sfx('pause'); return; }
          play(cart.step(padOf(g)));
          if (cart.over) {
            last = postScore(board, game, opts.player, cart.score);
            runs.push(last);
            state = 'done';
            t = 0;
          }
          return;
        case 'held':
          if (back(g)) { leave(); return; }
          if (go(g)) { state = 'play'; audio.sfx('select'); }
          return;
        case 'done':
          // A short beat first, so the press that ended the run doesn't skip the board.
          if (t < 30) return;
          if (back(g)) { leave(); return; }
          if (go(g)) start(g);
          return;
      }
    },

    draw(ctx) {
      // The level goes black behind the cabinet.
      rect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
      inFrame(ctx, () => {
        drawCabinet(ctx, game);
        if (state === 'attract') drawAttract(ctx, cart, board, game, t);
        else if (state === 'done') drawDone(ctx, cart, board, game, last, t);
        else {
          cart.draw(ctx, FX, FY);
          if (state === 'held') drawHeld(ctx);
        }
        drawHints(ctx, game, state);
      });
    },
  };
}

// ---------------------------------------------------------------- drawing
/** The cabinet face: side panels in the night blue, trim in the game's color, the marquee and the bezel around the screen. */
function drawCabinet(ctx: CanvasRenderingContext2D, game: ArcadeGameId): void {
  const accent = ACCENT[game];
  rect(ctx, 24, 0, 208, SCREEN_H, 'night');
  rect(ctx, 24, 0, 2, SCREEN_H, accent);
  rect(ctx, 230, 0, 2, SCREEN_H, accent);
  for (let y = 4; y < SCREEN_H; y += 6) { rect(ctx, 28, y, 1, 3, 'shadow'); rect(ctx, 227, y, 1, 3, 'shadow'); }
  // The marquee: a lit sign with the title in the game's color.
  rect(ctx, 30, 1, 196, 22, 'black');
  rect(ctx, 30, 1, 196, 1, accent);
  rect(ctx, 30, 22, 196, 1, accent);
  bigText(ctx, TITLES[game], 128, 5, accent, 2, 'center', true);
  // The bezel.
  rect(ctx, FX - 4, FY - 2, FIELD + 8, FIELD + 4, 'grey1');
  rect(ctx, FX - 3, FY - 1, FIELD + 6, FIELD + 2, 'black');
}

/** The board as rows of rank, name and score. The row at `lit` blinks in yellow. */
function drawBoard(ctx: CanvasRenderingContext2D, board: Board, game: ArcadeGameId, y: number, lit: number, t: number): void {
  drawText(ctx, 'HIGH SCORES', 128, y, 'hot', { align: 'center' });
  board.top(game).forEach((r, i) => {
    const on = i === lit && blinkOn(t, 40, 28);
    const c: ColorName = i === lit ? (on ? 'yellow' : 'amber') : i === 0 ? 'white' : 'mist';
    const ry = y + 14 + i * 11;
    drawText(ctx, `${i + 1}`, FX + 18, ry, c);
    drawText(ctx, r.name, FX + 34, ry, c);
    drawText(ctx, String(r.score), FX + FIELD - 18, ry, c, { align: 'right' });
  });
}

/** The game's frame dimmed behind a black card, so only its edges show around the text. */
function dimmed(ctx: CanvasRenderingContext2D, cart: Cart): void {
  cart.draw(ctx, FX, FY);
  dither(ctx, FX, FY, FIELD, FIELD, 'black', 2);
  rect(ctx, FX + 10, FY + 12, FIELD - 20, FIELD - 26, 'black');
}

/** The cart's first frame dimmed, the board on top, FREE PLAY and the start prompt. */
function drawAttract(ctx: CanvasRenderingContext2D, cart: Cart, board: Board, game: ArcadeGameId, t: number): void {
  dimmed(ctx, cart);
  drawBoard(ctx, board, game, FY + 22, -1, t);
  drawText(ctx, 'FREE PLAY', 128, FY + 112, 'cyan', { align: 'center' });
  if (blinkOn(t, 60, 40)) drawText(ctx, `PRESS ${labelOf('interact')}`, 128, FY + 132, 'white', { align: 'center' });
  if (game === 'digdug') drawText(ctx, 'BEAT MADMAX', 128, FY + 150, 'pink', { align: 'center' });
}

/** The last frame dimmed, then the run's score, the board with its row lit, and the MADMAX line if it beat her. */
function drawDone(ctx: CanvasRenderingContext2D, cart: Cart, board: Board, game: ArcadeGameId, r: ArcadeResult | null, t: number): void {
  dimmed(ctx, cart);
  drawText(ctx, `SCORE ${r?.score ?? cart.score}`, 128, FY + 8, 'white', { align: 'center' });
  drawBoard(ctx, board, game, FY + 26, r?.rank ?? -1, t);
  if (r?.beatMadmax) {
    rect(ctx, FX + 14, FY + 128, FIELD - 28, 13, 'black');
    drawText(ctx, 'YOU BEAT MADMAX!', 128, FY + 131, blinkOn(t, 30, 20) ? 'yellow' : 'hot', { align: 'center' });
  } else if (r && r.rank < 0) {
    drawText(ctx, 'NOT THIS TIME', 128, FY + 131, 'mist', { align: 'center' });
  }
}

/** The held screen: the run stops under a strip that says how to go on or leave. */
function drawHeld(ctx: CanvasRenderingContext2D): void {
  dither(ctx, FX, FY, FIELD, FIELD, 'black', 2);
  rect(ctx, FX + 20, FY + 70, FIELD - 40, 28, 'black');
  drawText(ctx, 'PAUSED', 128, FY + 74, 'yellow', { align: 'center' });
  drawText(ctx, `${backLabel()} AGAIN TO LEAVE`, 128, FY + 86, 'mist', { align: 'center' });
}

/** One line under the screen naming the keys for this state, on this device. */
function drawHints(ctx: CanvasRenderingContext2D, game: ArcadeGameId, state: State): void {
  const fire = labelOf('interact'), out = backLabel();
  const verb = FIRE_VERB[game], stick = getPromptDevice() === 'keyboard' ? 'ARROWS' : 'STICK';
  const line = state === 'attract' ? `${fire} START   ${out} LEAVE`
    : state === 'held' ? `${fire} RESUME   ${out} LEAVE`
      : state === 'done' ? `${fire} PLAY AGAIN   ${out} LEAVE`
        : game === 'dragonslair' ? `${stick} + ${fire}   ${out} PAUSE`
          : verb ? `${fire} ${verb}   ${out} PAUSE` : `${stick} MOVE   ${out} PAUSE`;
  const y = FY + FIELD + 8;
  rect(ctx, 128 - (textWidth(line) >> 1) - 4, y - 3, textWidth(line) + 6, 13, 'black');
  drawText(ctx, line, 128, y, 'bone', { align: 'center' });
}

