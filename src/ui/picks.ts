// The party picks panel over the map (docs/map-screen.md, "Party picks"), in the Grid layout the owner picked from
// picks-variations.html: a PARTY panel with the pool as cards, three across (two rows for six, three for nine: face, name, level
// and gate word, the place or LEAD under the face), the frame carrying the state (amber lead, bone party, slate bench), a padlock
// on the locked, then START and a one-line legend. ui/picks_logic.ts holds the rules; this file turns input into those calls and draws the result inside
// inFrame, with the HUD's own colors and fonts. ui/map.ts opens it and hands the picks on.
import type { Game } from '../core/scene.ts';
import type { HeroId, PartySeed } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { hitIndex, inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { PARTY_SIZE } from '../core/campaign.ts';
import { settings } from '../core/settings.ts';
import { audio } from '../audio/index.ts';
import { drawPortrait, drawText, drawTinyText, tinyWidth } from '../gfx/index.ts';
import { box, brackets, outline, plate, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';
import { blockedBy, bondLine, cardRect, cellRect, createPicks, heroAt, legend, makeLead, markRect, moveTo, onStart, picksLayout, ready, result, rowOf, step, toggle } from './picks_logic.ts';
import type { PickRow, PicksLayout, PicksState } from './picks_logic.ts';

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

/** How long the cards that refuse a pick flash, in frames: three blinks, or one steady stretch with REDUCE FLASH on. */
const FLASH = 24;

export function createPicksPanel(opts: PicksOpts): PicksPanel {
  let s = createPicks(opts.pool, opts.locked, opts.seed);
  /** Laid out once for the pool: three rows of shorter cards for nine, the roomy two rows for six. */
  const L = picksLayout(opts.pool.length);
  const START: Rect = L.start;
  let done = false;
  /** The cards a refused pick flashes (the party, for a fifth hero) and the frames since. */
  let flash: { cards: readonly number[]; t: number } | null = null;

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
  /** Takes a hero in or out. A locked hero staying put, or a fifth, gets a buzz and a flash on the cards in the way. */
  const flip = (i: number): void => {
    if (apply(toggle(s, i), true)) return;
    audio.sfx('noMp');
    const cards = blockedBy(s, i);
    if (cards.length) flash = { cards, t: 0 };
  };

  /** The mouse: moving onto a card or START takes the cursor, a click on a card flips it, on a mark leads, on START starts. */
  function mouse(g: Game): void {
    const i = g.input;
    const hover = toFrame(i.hover());
    const cells = s.pool.map((_, k) => cellRect(L, k));
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
    if (s.picked.includes(heroAt(s, at) as HeroId) && inRect(c, markRect(L, at))) apply(makeLead(s, at), true);
    else flip(at);
  }

  return {
    state: () => s,
    update(g) {
      if (done) return;
      if (flash && ++flash.t >= FLASH) flash = null;
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
      const { x: px, y: py, w: pw, h: ph } = L.panel;
      plate(ctx, px, py, pw, ph);
      drawText(ctx, 'PARTY', px + 8, py + 6, 'white');
      const lit = flash !== null && (settings.reduceFlashing || ((flash.t >> 2) & 1) === 0);
      drawText(ctx, `${s.picked.length} OF ${PARTY_SIZE}`, px + pw - 8, py + 6, lit || !ready(s) ? 'hot' : 'yellow', { align: 'right' });
      s.pool.forEach((_, k) => { const c = cardRect(L, k); drawCard(ctx, L, rowOf(s, k), c.x, c.y, lit && !!flash?.cards.includes(k)); });
      if (!onStart(s)) { const c = cardRect(L, s.cursor); brackets(ctx, c.x - 3, c.y - 3, c.w + 6, c.h + 6); }
      drawStart(ctx, START, ready(s), onStart(s));
      const line = legend(getPromptDevice(), labelOf('attack'), labelOf('special')).join('  ');
      drawTinyText(ctx, line, px + pw - 8 - tinyWidth(line), L.legendY, 'mist');
      const bond = bondLine(s);
      if (bond) drawTinyText(ctx, bond.text, px + pw - 8 - tinyWidth(bond.text), L.bondY, bond.preview ? 'yellow' : 'leaf');
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

function drawCard(ctx: Ctx, L: PicksLayout, r: PickRow, x: number, y: number, refused = false): void {
  const l = look(r);
  outline(ctx, x, y, L.cw, L.ch, refused ? 'hot' : l.frame);
  drawPortrait(ctx, r.id, 'neutral', x + 5, y + L.top);
  drawText(ctx, r.name.toUpperCase(), x + 34, y + L.top + 1, l.name);
  drawText(ctx, `LV${r.level}`, x + 34, y + L.top + 11, l.level);
  if (r.gate) drawTinyText(ctx, r.gate, x + 34, y + L.gateY, 'mist');
  drawMark(ctx, r, x + 5, y + L.markY);
  if (r.bond) drawTinyText(ctx, r.bond, x + L.cw - 3 - tinyWidth(r.bond), y + L.markY, 'leaf');
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
/** The START row, 11 px tall: live (yellow on a slate edge) only with four picked. White corners when the cursor is on it. */
function drawStart(ctx: Ctx, at: Rect, live: boolean, cursor: boolean): void {
  const { x, y, w } = at;
  box(ctx, x, y, w, 11, 'night');
  outline(ctx, x, y, w, 11, live ? 'slate' : 'dusk');
  drawText(ctx, 'START', x + w / 2, y + 2, live ? 'yellow' : 'slate', { align: 'center' });
  if (cursor) brackets(ctx, x - 3, y - 3, w + 6, 11 + 6);
}
