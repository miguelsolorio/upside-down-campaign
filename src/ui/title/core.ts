// What every title variant shares: the menu (START or CONTINUE and NEW GAME, then OPTIONS), the options panel,
// skip story, the short launch animation and the credit line. A design only draws; it never reads input.
// No key letters are shown anywhere. P still opens the options and Tab still flips skip story, silently.
import type { Game, Scene } from '../../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { audio } from '../../audio/index.ts';
import { hasSave } from '../../core/save.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { drawIcon, drawPanel, drawText } from '../../gfx/index.ts';
import { blinkOn, box, dither, outline } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { drawMenu, settingItems, toggleSkipStory, updateMenu } from '../menu.ts';
import type { Menu } from '../menu.ts';
import { LAUNCH_FRAMES } from './timeline.ts';

export const CREDIT = 'Fan tribute. Not affiliated with Netflix.';
/** Frames the "SKIP STORY ON" note stays up after Tab. */
const SKIP_NOTE = 100;

export type StartMode = 'new' | 'continue';

export interface TitleRow {
  label: string;
  /** Right-hand text, only NEW GAME uses it ("PRESS AGAIN"). */
  value: string;
  selected: boolean;
}

/** Everything a design needs to draw one frame. */
export interface TitleView {
  /** Frames since the screen opened. */
  t: number;
  /** 0 until START is chosen, then counts up to LAUNCH_FRAMES. */
  launch: number;
  saved: boolean;
  rows: TitleRow[];
  sel: number;
  skip: boolean;
}

export interface TitleDesign {
  id: number;
  name: string;
  /** One line for the gallery, and what it costs. */
  blurb: string;
  tradeoff: string;
  draw(ctx: Ctx, v: TitleView, g: Game): void;
  /** Where the credit line goes and how bright it is. */
  credit?: { y?: number; color?: ColorName };
  /** Where the quiet SKIP STORY tag sits. Right-aligned. */
  tag?: { x: number; y: number };
}

export interface VariantOpts {
  onStart(mode: StartMode): void;
  /** The gallery runs five of these at once and keeps the music off. */
  silent?: boolean;
  /** The gallery can pretend a save exists, to show CONTINUE and NEW GAME. */
  saved?(): boolean;
}

export function createVariantScene(design: TitleDesign, opts: VariantOpts): Scene {
  let t = 0;
  let open = false;
  let saved = false;
  let armed = false;
  let launch = 0;
  let mode: StartMode = 'new';
  let skipAt = -9999;
  let settingsMenu: Menu | null = null;

  const begin = (m: StartMode): void => { mode = m; launch = 1; };
  const main: Menu = { sel: 0, items: [] };
  const buildMain = (): void => {
    main.items = saved
      ? [
        { label: 'CONTINUE', activate: () => begin('continue') },
        {
          label: 'NEW GAME',
          value: () => (armed ? 'PRESS AGAIN' : ''),
          activate: () => { if (armed) begin('new'); else armed = true; },
        },
        { label: 'OPTIONS', activate: () => { open = true; if (settingsMenu) settingsMenu.sel = 0; } },
      ]
      : [
        { label: 'PRESS START', activate: () => begin('new') },
        { label: 'OPTIONS', activate: () => { open = true; if (settingsMenu) settingsMenu.sel = 0; } },
      ];
  };
  const buildSettings = (g: Game): Menu => {
    settingsMenu = { sel: 0, items: [...settingItems(g), { label: 'BACK', activate: () => { open = false; } }] };
    return settingsMenu;
  };
  const view = (g: Game): TitleView => ({
    t,
    launch,
    saved,
    sel: main.sel,
    skip: g.settings.skipDialogue,
    rows: main.items.map((it, i) => ({ label: it.label, value: it.value?.() ?? '', selected: i === main.sel })),
  });

  return {
    opaque: true,
    enter(g) {
      t = 0;
      open = false;
      launch = 0;
      armed = false;
      saved = opts.saved ? opts.saved() : hasSave();
      skipAt = -9999;
      buildMain();
      main.sel = 0;
      buildSettings(g);
      if (!opts.silent) audio.music('static');
    },
    update(g) {
      t++;
      const i = g.input;
      if (launch > 0) {
        launch++;
        if (launch >= LAUNCH_FRAMES) { const m = mode; launch = 0; opts.onStart(m); }
        return;
      }
      const sm = settingsMenu ?? buildSettings(g);
      if (open) {
        updateMenu(sm, g);
        if (i.pressed('cancel') || i.pressed('pause')) { open = false; audio.sfx('cancel'); }
        return;
      }
      if (i.pressed('skip')) { toggleSkipStory(g); skipAt = t; return; }
      const before = main.sel;
      updateMenu(main, g);
      if (main.sel !== before) armed = false;
      if (launch > 0 || open) return;
      if (i.pressed('pause') || i.pressed('special')) { open = true; sm.sel = 0; audio.sfx('select'); }
    },
    draw(ctx, g) {
      const v = view(g);
      design.draw(ctx, v, g);
      // The credit and the skip tag step aside for the end of the launch, so the fade or flash is clean.
      const quiet = launch > LAUNCH_FRAMES * 0.45;
      const cy = design.credit?.y ?? 212;
      if (!quiet) drawText(ctx, CREDIT, SCREEN_W / 2, cy, design.credit?.color ?? 'mist', { align: 'center', shadow: true });
      if (g.settings.skipDialogue && !quiet) {
        const at = design.tag ?? { x: SCREEN_W - 5, y: 5 };
        drawText(ctx, 'SKIP STORY', at.x, at.y, 'yellow', { align: 'right', shadow: true });
      }
      if (t - skipAt < SKIP_NOTE) skipNote(ctx, g.settings.skipDialogue, t - skipAt);
      if (open) optionsPanel(ctx, settingsMenu ?? buildSettings(g), t);
    },
  };
}

function skipNote(ctx: Ctx, on: boolean, age: number): void {
  const text = `SKIP STORY: ${on ? 'ON' : 'OFF'}`;
  const w = text.length * 6 + 14;
  const y = age < 6 ? 194 + (6 - age) : 194;
  box(ctx, SCREEN_W / 2 - w / 2, y, w, 15, 'ink');
  outline(ctx, SCREEN_W / 2 - w / 2, y, w, 15, on ? 'amber' : 'slate');
  drawText(ctx, text, SCREEN_W / 2, y + 4, on ? 'yellow' : 'mist', { align: 'center' });
}

function optionsPanel(ctx: Ctx, m: Menu, t: number): void {
  dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
  drawPanel(ctx, 36, 58, 184, 92, 'menu');
  drawMenu(ctx, m, 48, 65, 160, t, 10);
}

// ---------------------------------------------------------------- helpers the designs share
export interface BlockOpts {
  /** Draws the big first row when there is no save. Returns the height it used. */
  prompt?(ctx: Ctx, v: TitleView, cx: number, y: number): number;
  rowH?: number;
  /** Colors for the small rows. */
  on?: ColorName;
  off?: ColorName;
}

/**
 * The menu, centered on cx. With no save the first row is the big prompt (the design draws it) and OPTIONS sits
 * under it. With a save it is a plain list: CONTINUE, NEW GAME, OPTIONS. Returns the bottom y.
 */
export function drawMenuBlock(ctx: Ctx, v: TitleView, cx: number, y: number, o: BlockOpts = {}): number {
  const rowH = o.rowH ?? 12;
  let at = y;
  let first = 0;
  if (!v.saved && o.prompt) {
    at += o.prompt(ctx, v, cx, at);
    first = 1;
  }
  for (let i = first; i < v.rows.length; i++) {
    const r = v.rows[i] as TitleRow;
    const text = r.value ? `${r.label} ${r.value}` : r.label;
    const w = text.length * 6;
    const x = Math.round(cx - w / 2);
    if (r.selected) drawIcon(ctx, 'cursor', x - 11, at - 1, v.t);
    drawText(ctx, text, x, at, r.selected ? (o.on ?? 'yellow') : (o.off ?? 'bone'), { shadow: true });
    at += rowH;
  }
  return at;
}

/** True while the big prompt should be drawn: steady once it is selected and being pressed, blinking otherwise. */
export function promptOn(v: TitleView): boolean {
  if (v.launch > 0) return ((v.launch >> 1) & 1) === 0 || v.launch > 24;
  return blinkOn(v.t, 64, 44);
}

/** Dark to light fade of a flat color over the whole screen, in dither steps, for the end of the launch. */
export function fadeOut(ctx: Ctx, level: number, color: ColorName = 'ink'): void {
  if (level <= 0) return;
  if (level >= 0.95) { box(ctx, 0, 0, SCREEN_W, SCREEN_H, color); return; }
  if (level < 0.34) { dither(ctx, 0, 0, SCREEN_W, SCREEN_H, color, 4); return; }
  dither(ctx, 0, 0, SCREEN_W, SCREEN_H, color, 2);
  if (level >= 0.67) {
    // A second, shifted pass fills in a quarter more of the pixels.
    ctx.save();
    ctx.translate(1, 0);
    dither(ctx, -1, 0, SCREEN_W + 1, SCREEN_H, color, 4);
    ctx.restore();
  }
}
