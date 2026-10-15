// The party picks panel over the map (docs/map-screen.md, "Party picks"), in the Grid layout the owner picked from
// picks-variations.html: a PARTY panel with the pool as three cards by two (face, name, level and gate word, the place or
// LEAD under the face), the frame carrying the state (amber lead, bone party, slate bench), a padlock on the locked, then START
// and a one-line legend. ui/picks_logic.ts holds the rules; this file turns input into those calls and draws the result inside
// inFrame, with the HUD's own colors and fonts. ui/map.ts opens it and hands the picks on.
import type { Game } from '../core/scene.ts';
import type { HeroId, PartySeed } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { hitIndex, inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { PARTY_SIZE } from '../core/campaign.ts';
import { audio } from '../audio/index.ts';
import { drawPortrait, drawText, drawTinyText, tinyWidth } from '../gfx/index.ts';
import { box, outline, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';
import { COLS, createPicks, heroAt, legend, makeLead, moveTo, onStart, ready, result, rowOf, step, toggle } from './picks_logic.ts';
import type { PickRow, PicksState } from './picks_logic.ts';

// The layout, in frame px: the panel, a card, the pitch between cards, the START row.
const PX = 4, PW = 248, PY = 35, PH = 136;
const CW = 74, CH = 44, GX = 80, GY = 50;
const CX = PX + 7, CY = PY + 17;
const START: Rect = { x: PX + 7, y: PY + 119, w: 56, h: 11 };

const cardX = (i: number): number => CX + (i % COLS) * GX;
const cardY = (i: number): number => CY + Math.floor(i / COLS) * GY;
/** The click cell of a card: the card and the gap round it, so the cells meet and the mouse is always over one. */
const cell = (i: number): Rect => ({ x: cardX(i) - 3, y: cardY(i) - 3, w: GX, h: GY });
/** The mark under the face (LEAD, or the place and the padlock): a click on a picked hero's makes them lead. */
const markCell = (i: number): Rect => ({ x: cardX(i) + 2, y: cardY(i) + 31, w: 32, h: 11 });

export interface PicksOpts {
  /** Every hero in the stage's pool, in order, at the level they would play at. */
  pool: readonly PartySeed[];
  /** The heroes the stage can't be cleared without. */
  locked: readonly HeroId[];
  /** Who is picked when it opens, lead first (pickParty). */
  seed: readonly HeroId[];
  /** START, with four picked, lead first. */
  onStart(picks: HeroId[]): void;
  /** Esc, Backspace or B: back to the map with nothing changed. */
  onBack(): void;
}

/** The panel, driven by whoever owns it: map.ts calls update while it is open and draws it after the map. */
export interface PicksPanel {
  update(g: Game): void;
  draw(ctx: Ctx): void;
  /** The state, for tests. */
  state(): PicksState;
}

export function createPicksPanel(opts: PicksOpts): PicksPanel {
  let s = createPicks(opts.pool, opts.locked, opts.seed);
  let done = false;

  /** Applies a change. The same object back means the rules refused it. */
  const apply = (next: PicksState, okSound: boolean): boolean => {
    if (next === s) return false;
    s = next;
    if (okSound) audio.sfx('select');
    return true;
  };
  const go = (): void => {
    const picks = result(s);
    if (!picks) { audio.sfx('cancel'); return; }
    done = true;
    audio.sfx('confirm');
    opts.onStart(picks);
  };
  const back = (): void => {
    done = true;
    audio.sfx('cancel');
    opts.onBack();
  };
  /** Takes a hero in or out. A locked hero staying put, or a fifth, gets the refusal sound. */
  const flip = (i: number): void => {
    if (!apply(toggle(s, i), true)) audio.sfx('cancel');
  };

  /** The mouse: moving onto a card or START takes the cursor, a click on a card flips it, on a mark leads, on START starts. */
  function mouse(g: Game): void {
    const i = g.input;
    const hover = toFrame(i.hover());
    const cells = s.pool.map((_, k) => cell(k));
    const over = hitIndex(cells, hover);
    const onGo = !!hover && inRect(hover, START);
    if (hover && (over >= 0 || onGo)) {
      i.point();
      if (i.moved()) apply(moveTo(s, onGo ? s.pool.length : over), true);
    }
    const c = toFrame(i.clicked());
    if (!c) return;
    if (inRect(c, START)) { apply(moveTo(s, s.pool.length), false); go(); return; }
    const at = hitIndex(cells, c);
    if (at < 0) return;
    apply(moveTo(s, at), false);
    if (s.picked.includes(heroAt(s, at) as HeroId) && inRect(c, markCell(at))) apply(makeLead(s, at), true);
    else flip(at);
  }

  return {
    state: () => s,
    update(g) {
      if (done) return;
      const i = g.input;
      // X is special and cancel together, so Esc and Backspace are cancel without special. A touch screen's B is that
      // pair too, so its way back is the pause button.
      if ((i.pressed('cancel') && !i.pressed('special')) || i.pressed('pause')) { back(); return; }
      if (i.pressed('attack')) {
        if (onStart(s)) go(); else flip(s.cursor);
        return;
      }
      // Enter and Space confirm without being attack: they start from anywhere on the panel.
      if (i.pressed('confirm')) { go(); return; }
      if (i.pressed('special')) { apply(makeLead(s), true); return; }
      const dir = i.pressed('left') ? 'left' : i.pressed('right') ? 'right' : i.pressed('up') ? 'up' : i.pressed('down') ? 'down' : null;
      if (dir) { apply(step(s, dir), true); return; }
      mouse(g);
    },
    draw(ctx) {
      plate(ctx, PX, PY, PW, PH);
      drawText(ctx, 'PARTY', PX + 8, PY + 6, 'white');
      drawText(ctx, `${s.picked.length} OF ${PARTY_SIZE}`, PX + PW - 8, PY + 6, ready(s) ? 'yellow' : 'hot', { align: 'right' });
      s.pool.forEach((_, k) => drawCard(ctx, rowOf(s, k), cardX(k), cardY(k)));
      if (!onStart(s)) brackets(ctx, cardX(s.cursor) - 3, cardY(s.cursor) - 3, CW + 6, CH + 6);
      drawStart(ctx, ready(s), onStart(s));
      const line = legend(getPromptDevice(), labelOf('attack'), labelOf('special')).join('  ');
      drawTinyText(ctx, line, PX + PW - 8 - tinyWidth(line), PY + 122, 'mist');
    },
  };
}

// ---------------------------------------------------------------- how a hero reads
/** The lead has an amber frame, as the active hero does in the HUD. The rest of the party is bone, the bench is slate. */
function look(r: PickRow): { frame: ColorName; name: ColorName; level: ColorName } {
  if (r.slot === 1) return { frame: 'amber', name: 'white', level: 'yellow' };
  if (r.slot > 0) return { frame: 'bone', name: 'white', level: 'yellow' };
  return { frame: 'slate', name: 'mist', level: 'mist' };
}

function drawCard(ctx: Ctx, r: PickRow, x: number, y: number): void {
  const l = look(r);
  outline(ctx, x, y, CW, CH, l.frame);
  drawPortrait(ctx, r.id, 'neutral', x + 5, y + 5);
  drawText(ctx, r.name.toUpperCase(), x + 34, y + 6, l.name);
  drawText(ctx, `LV${r.level}`, x + 34, y + 16, l.level);
  if (r.gate) drawTinyText(ctx, r.gate, x + 34, y + 26, 'mist');
  drawMark(ctx, r, x + 5, y + 34);
}

/** A padlock, 5 by 6, drawn for this size. It sits on the baseline of the 3 by 5 font, one px taller. */
const LOCK = ['.###.', '#...#', '#####', '##.##', '#####', '#####'];
function lock(ctx: Ctx, x: number, y: number, color: ColorName): void {
  LOCK.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') box(ctx, x + i, y + j, 1, 1, color); });
}

/** LEAD for the first slot, the number for the others, and a padlock after it for a hero the stage needs. Nothing on the bench. */
function drawMark(ctx: Ctx, r: PickRow, x: number, y: number): void {
  if (r.slot <= 0) return;
  const text = r.slot === 1 ? 'LEAD' : String(r.slot);
  drawTinyText(ctx, text, x, y, r.slot === 1 ? 'yellow' : 'bone');
  if (r.locked) lock(ctx, x + tinyWidth(text) + 3, y - 1, 'bone');
}

// ---------------------------------------------------------------- chrome
/** A panel: ink with a one pixel slate edge and the four corner pixels left out, like the game's own panels. */
function plate(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  box(ctx, x + 1, y, w - 2, h, 'ink');
  box(ctx, x, y + 1, w, h - 2, 'ink');
  box(ctx, x + 1, y, w - 2, 1, 'slate');
  box(ctx, x + 1, y + h - 1, w - 2, 1, 'slate');
  box(ctx, x, y + 1, 1, h - 2, 'slate');
  box(ctx, x + w - 1, y + 1, 1, h - 2, 'slate');
}

/** The map's selection corners, in white: the arms run along the edges of the box given. */
function brackets(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const a = 3;
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const cx = sx ? x + w - 1 : x, cy = sy ? y + h - 1 : y;
    box(ctx, sx ? cx - a + 1 : cx, cy, a, 1, 'white');
    box(ctx, cx, sy ? cy - a + 1 : cy, 1, a, 'white');
  }
}

/** The START row, 11 px tall: live (yellow on a slate edge) only with four picked. White corners when the cursor is on it. */
function drawStart(ctx: Ctx, live: boolean, cursor: boolean): void {
  const { x, y, w } = START;
  box(ctx, x, y, w, 11, 'night');
  outline(ctx, x, y, w, 11, live ? 'slate' : 'dusk');
  drawText(ctx, 'START', x + w / 2, y + 2, live ? 'yellow' : 'slate', { align: 'center' });
  if (cursor) brackets(ctx, x - 3, y - 3, w + 6, 11 + 6);
}
