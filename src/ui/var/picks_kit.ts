// The shared pieces of the party picks layouts under review (picks-variations.html): the one state every layout draws, and
// the small marks they all use, so the five differ in layout and not in vocabulary. Frames, text and colors are the HUD's:
// ink panels with a one pixel slate edge, the 5 by 7 font for names, the 3 by 5 font for the tight spots, yellow for levels
// and for the lead, white corners for the cursor as on the map. Nothing here is the game's own UI yet.
import type { HeroId } from '../../core/types.ts';
import { CHAR_NAMES } from '../../core/config.ts';
import { PARTY_SIZE, pickParty, requiredFor, rosterFor } from '../../core/campaign.ts';
import { getPromptDevice, labelOf } from '../../core/bindings.ts';
import { drawPortrait, drawText, drawTinyText, tinyWidth } from '../../gfx/index.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { box, clipped, outline } from '../kit.ts';
import type { Ctx } from '../kit.ts';

export const STAGE = '2.2';

/** What the party has reached, and the word for the gate each hero opens. Mike opens none. */
const LEVELS: Partial<Record<HeroId, number>> = { mike: 6, dustin: 5, lucas: 5, will: 4, max: 4, steve: 4 };
const GATES: Partial<Record<HeroId, string>> = { dustin: 'BURN', lucas: 'SHOOT', will: 'SENSE', max: 'DASH', steve: 'SMASH' };

export interface PickRow {
  id: HeroId;
  name: string;
  level: number;
  /** DASH, SMASH, BURN, SHOOT or SENSE, or empty. */
  gate: string;
  /** 1 to 4 in party order, 0 when on the bench. Slot 1 is the lead. */
  slot: number;
  locked: boolean;
}

export interface PicksState {
  /** Everyone in the stage's pool, in roster order. */
  rows: PickRow[];
  /** The cursor, as an index into rows. */
  cursor: number;
  /** How many are picked, and whether START is live (four picked). */
  count: number;
  ready: boolean;
  /** The legend, one key to a line, as the map's party band prints it. */
  hints: string[];
}

/** The legend for the device, in the shape of the map's own: a key and what it does. */
export function hintLines(device = getPromptDevice(), attack = labelOf('attack'), special = labelOf('special')): string[] {
  return device === 'gamepad'
    ? ['STICK MOVE', 'A PICK', 'X LEAD', 'B BACK']
    : ['ARROWS MOVE', `${attack} PICK`, `${special} LEAD`, 'ESC BACK'];
}

/** Stage 2.2, six heroes. Mike leads Dustin, Lucas and Max, and Max is locked in. The cursor is on Dustin. */
export function sampleState(): PicksState {
  const locked = requiredFor(STAGE);
  const picks = pickParty(STAGE, ['mike', 'dustin', 'lucas', 'max']);
  const rows = rosterFor(STAGE).map((id): PickRow => ({
    id, name: CHAR_NAMES[id], level: LEVELS[id] ?? 1, gate: GATES[id] ?? '',
    slot: picks.indexOf(id) + 1, locked: locked.includes(id),
  }));
  return { rows, cursor: rows.findIndex((r) => r.id === 'dustin'), count: picks.length, ready: picks.length === PARTY_SIZE, hints: hintLines() };
}

export interface PicksOption {
  /** One word, lowercase: the card's data-snap is picks-<slug>. */
  slug: string;
  name: string;
  note: string;
  /** Draws the panel inside a 256 by 224 frame, over the map. */
  draw(ctx: Ctx, s: PicksState, t: number): void;
}

// ---------------------------------------------------------------- how a hero reads
export interface Look { frame: ColorName; name: ColorName; level: ColorName }
/** The lead has an amber frame, as the active hero does in the HUD. The rest of the party is bone, the bench is slate. */
export function look(r: PickRow): Look {
  if (r.slot === 1) return { frame: 'amber', name: 'white', level: 'yellow' };
  if (r.slot > 0) return { frame: 'bone', name: 'white', level: 'yellow' };
  return { frame: 'slate', name: 'mist', level: 'mist' };
}

type Align = 'left' | 'center' | 'right';
const place = (x: number, w: number, a: Align): number => Math.round(a === 'center' ? x - w / 2 : a === 'right' ? x - w : x);

export function drawName(ctx: Ctx, r: PickRow, x: number, y: number, a: Align = 'left'): void {
  drawText(ctx, r.name.toUpperCase(), x, y, look(r).name, { align: a });
}
/** LV5 in the 5 by 7 font, yellow like the HUD's level. */
export function drawLevel(ctx: Ctx, r: PickRow, x: number, y: number, a: Align = 'left'): void {
  drawText(ctx, `LV${r.level}`, x, y, look(r).level, { align: a });
}
/** The gate word in the 3 by 5 font. Mike has none, so nothing is drawn. */
export function drawGate(ctx: Ctx, r: PickRow, x: number, y: number, a: Align = 'left'): void {
  if (r.gate) drawTinyText(ctx, r.gate, place(x, tinyWidth(r.gate), a), y, 'mist');
}

// ---------------------------------------------------------------- faces
/** A portrait with a one pixel frame. x, y is the portrait's top left, so the frame sits one px outside it. */
export function face(ctx: Ctx, id: HeroId, x: number, y: number, frame: ColorName): void {
  outline(ctx, x - 1, y - 1, 26, 26, frame);
  drawPortrait(ctx, id, 'neutral', x, y);
}

/** The head, 16 by 16, cut from the portrait the way the HUD cuts its faces. Framed one px outside x, y. */
export function head(ctx: Ctx, id: HeroId, x: number, y: number, frame: ColorName): void {
  outline(ctx, x - 1, y - 1, 18, 18, frame);
  clipped(ctx, x, y, 16, 16, () => drawPortrait(ctx, id, 'neutral', x - 4, y - 2));
}

// ---------------------------------------------------------------- the mark: lead, place and padlock
/** A padlock, 5 by 6, drawn for this size. It sits on the baseline of the 3 by 5 font, one px taller. */
const LOCK = ['.###.', '#...#', '#####', '##.##', '#####', '#####'];
export function lock(ctx: Ctx, x: number, y: number, color: ColorName): void {
  LOCK.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') box(ctx, x + i, y + j, 1, 1, color); });
}

const markText = (r: PickRow): string => (r.slot === 1 ? 'LEAD' : String(r.slot));
export function markWidth(r: PickRow): number {
  return r.slot > 0 ? tinyWidth(markText(r)) + (r.locked ? 8 : 0) : 0;
}
/** LEAD for the first slot, the number for the others, and a padlock after it for a hero the stage needs. Nothing on the bench. */
export function drawMark(ctx: Ctx, r: PickRow, x: number, y: number, a: Align = 'left'): void {
  if (r.slot <= 0) return;
  const x0 = place(x, markWidth(r), a), text = markText(r);
  drawTinyText(ctx, text, x0, y, r.slot === 1 ? 'yellow' : 'bone');
  if (r.locked) lock(ctx, x0 + tinyWidth(text) + 3, y - 1, 'bone');
}

// ---------------------------------------------------------------- chrome
/** A panel: ink with a one pixel slate edge and the four corner pixels left out, like the game's own panels. */
export function plate(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  box(ctx, x + 1, y, w - 2, h, 'ink');
  box(ctx, x, y + 1, w, h - 2, 'ink');
  box(ctx, x + 1, y, w - 2, 1, 'slate');
  box(ctx, x + 1, y + h - 1, w - 2, 1, 'slate');
  box(ctx, x, y + 1, 1, h - 2, 'slate');
  box(ctx, x + w - 1, y + 1, 1, h - 2, 'slate');
}

/** The map's selection corners, in white: the arms run along the edges of the box given. */
export function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, color: ColorName = 'white'): void {
  const a = 3;
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const cx = sx ? x + w - 1 : x, cy = sy ? y + h - 1 : y;
    box(ctx, sx ? cx - a + 1 : cx, cy, a, 1, color);
    box(ctx, cx, sy ? cy - a + 1 : cy, 1, a, color);
  }
}

/** PARTY on the left and how many are picked on the right, 4 OF 4 in yellow once START is live. */
export function title(ctx: Ctx, s: PicksState, xl: number, y: number, xr: number): void {
  drawText(ctx, 'PARTY', xl, y, 'white');
  drawText(ctx, `${s.count} OF ${PARTY_SIZE}`, xr, y, s.ready ? 'yellow' : 'hot', { align: 'right' });
}

/** The START row, 11 px tall: live (yellow on a slate edge) only with four picked. */
export function startRow(ctx: Ctx, s: PicksState, x: number, y: number, w: number): void {
  const on = s.ready;
  box(ctx, x, y, w, 11, 'night');
  outline(ctx, x, y, w, 11, on ? 'slate' : 'dusk');
  drawText(ctx, 'START', x + w / 2, y + 2, on ? 'yellow' : 'slate', { align: 'center' });
}

/** The legend as the map's party band draws it: 3 by 5 mist letters, one key to a line, right aligned. */
export function legendLines(ctx: Ctx, s: PicksState, xRight: number, y: number): void {
  s.hints.forEach((l, i) => drawTinyText(ctx, l, xRight - tinyWidth(l), y + i * 7, 'mist'));
}
/** The same legend on one line, for a panel with no room for four. */
export function legendLine(ctx: Ctx, s: PicksState, x: number, y: number, a: Align = 'right'): void {
  const line = s.hints.join('  ');
  drawTinyText(ctx, line, place(x, tinyWidth(line), a), y, 'mist');
}
