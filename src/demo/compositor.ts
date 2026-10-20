// The recorder's compositor: draws the game's 1x frame (a 384 by 224 canvas) onto a 1920 by 1080 one through the shot's camera,
// then the captions, flashes and fades. The video is 5x the frame, so the full-frame view shows a 384 by 216 piece of it and every
// game pixel is a 5 by 5 block; a punch-in is 2x or 3x of that, 192 by 108 or 128 by 72, so it is still a whole number of video pixels
// per game pixel and nothing shimmers. A push eases the zoom through fractions, drawn from a 5x copy so it stays soft, not ragged.
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { CapEvent } from '../core/capture.ts';
import type { ActorView } from '../core/types.ts';
import { drawText, textWidth } from '../gfx/index.ts';
import { PAL } from '../gfx/palette.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { CamKey, Caption, Flash, Follow, ShotSpec, Ud } from './types.ts';

export const OUT_W = 1920;
export const OUT_H = 1080;
/** Video pixels per game pixel in the full-frame view. */
export const BASE = 5;
/** The full-frame view is 216 of the frame's 224 rows. This many are cut off the top, the rest off the bottom: the HUD's padding goes first. */
const FULL_Y = 3;
const GLYPH_H = 7;
const EDGE = 60;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const ease = (k: number): number => k * k * (3 - 2 * k);

interface Cam { x: number; y: number; zoom: number; key: number }

export interface Compositor {
  /** The 1920 by 1080 canvas each frame is composed on. */
  readonly out: HTMLCanvasElement;
  /** Starts a shot: the camera and the effects begin again. */
  begin(spec: ShotSpec): void;
  /** Draws frame `i` of the shot. `ticks` is the capture's tick count now, which says what was logged this frame. */
  compose(i: number, ticks: number): void;
}

export function createCompositor(ud: Ud): Compositor {
  const out = document.createElement('canvas');
  out.width = OUT_W;
  out.height = OUT_H;
  const ctx = out.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  // The frame at 5x, for the pushes. Made when one is needed.
  let up: HTMLCanvasElement | null = null;
  let spec: ShotSpec | null = null;
  let cam: Cam = { x: SCREEN_W / 2, y: SCREEN_H / 2, zoom: 1, key: -1 };
  let auto: Flash[] = [];
  let lastAuto = -1e9;

  /** A followed point in frame px, or null when there is nothing to follow (a card, a menu). */
  function targetOf(f: Follow | undefined): { x: number; y: number } | null {
    if (f === undefined) return null;
    if (f === 'center') return { x: SCREEN_W / 2, y: SCREEN_H / 2 };
    if (typeof f === 'object' && 'x' in f) return { x: f.x, y: f.y };
    const play = ud.play;
    if (!play) return null;
    const view = play.sim.view();
    const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
      x: wx - play.camera.x + view.shake.x,
      y: VIEW_TOP + wy - play.camera.y + view.shake.y,
    });
    if (f === 'hero') return toScreen(view.focus.x, view.focus.y - 8);
    if ('fight' in f) {
      let x = view.focus.x, y = view.focus.y - 8, n = 1;
      for (const a of view.actors) {
        if (a.kind !== 'enemy' || Math.hypot(a.x - view.focus.x, a.y - view.focus.y) > f.fight) continue;
        x += a.x; y += a.y - 8; n++;
      }
      return toScreen(x / n, y / n);
    }
    const find = (id: string): ActorView | undefined => view.actors.find((h) => h.id === id);
    if ('between' in f) {
      const [a, b] = f.between.map(find);
      if (a && b) return toScreen((a.x + b.x) / 2, (a.y + b.y) / 2 - 8);
      const one = a ?? b;
      return one ? toScreen(one.x, one.y - 8) : null;
    }
    const dy = f.dy ?? -8;
    const a = 'hero' in f ? find(f.hero) : find(f.actor);
    return a ? toScreen(a.x, a.y + dy) : null;
  }

  function keyOf(i: number): number {
    const keys = (spec as ShotSpec).cam;
    let k = 0;
    for (let n = 0; n < keys.length; n++) if ((keys[n] as CamKey).at <= i) k = n;
    return k;
  }

  /** The source rectangle in frame px and the zoom for frame i, moving the camera on. */
  function view(i: number): { sx: number; sy: number; vw: number; vh: number; zoom: number } {
    const keys = (spec as ShotSpec).cam;
    const ki = keyOf(i);
    const key = keys[ki] as CamKey;
    const cut = ki !== cam.key;
    let zoom = key.zoom ?? (cut ? 1 : cam.zoom);
    if (key.push) {
      const k = clamp((i - key.at) / key.push.over, 0, 1);
      zoom = (key.zoom ?? 1) + (key.push.to - (key.zoom ?? 1)) * (key.push.smooth ? ease(k) : k);
    }
    const t = targetOf(key.follow);
    const full = key.follow === undefined && zoom === 1;
    const goal = t ?? (full ? { x: SCREEN_W / 2, y: (key.top ?? FULL_Y) + OUT_H / BASE / 2 } : { x: cam.x, y: cam.y });
    if (cut || zoom !== cam.zoom) { cam.x = goal.x; cam.y = goal.y; } else {
      const k = key.lerp ?? 0.18;
      cam.x += (goal.x - cam.x) * k;
      cam.y += (goal.y - cam.y) * k;
    }
    cam = { x: cam.x, y: cam.y, zoom, key: ki };
    const vw = OUT_W / BASE / zoom;
    const vh = OUT_H / BASE / zoom;
    const whole = Number.isInteger(zoom);
    const snap = (v: number): number => (whole ? Math.round(v) : v);
    // A punch-in on the play field stays under the HUD strip: half a strip with its bars cut would only be noise.
    const floor = ud.play && zoom > 1 ? VIEW_TOP : 0;
    return {
      sx: clamp(snap(cam.x - vw / 2), 0, SCREEN_W - vw),
      sy: clamp(snap(cam.y - vh / 2), floor, SCREEN_H - vh),
      vw, vh, zoom,
    };
  }

  function drawView(v: ReturnType<typeof view>): void {
    ctx.imageSmoothingEnabled = false;
    if (Number.isInteger(v.zoom)) {
      ctx.drawImage(ud.frame, v.sx, v.sy, v.vw, v.vh, 0, 0, OUT_W, OUT_H);
      return;
    }
    if (!up) { up = document.createElement('canvas'); up.width = SCREEN_W * BASE; up.height = SCREEN_H * BASE; }
    const u = up.getContext('2d') as CanvasRenderingContext2D;
    u.imageSmoothingEnabled = false;
    u.drawImage(ud.frame, 0, 0, up.width, up.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(up, v.sx * BASE, v.sy * BASE, v.vw * BASE, v.vh * BASE, 0, 0, OUT_W, OUT_H);
    ctx.imageSmoothingEnabled = false;
  }

  function drawCaption(c: Caption, i: number): void {
    const sc = c.scale ?? BASE;
    const shown = Math.min(c.text.length, Math.floor((i - c.at) / 2) + 1);
    const text = c.text.slice(0, shown);
    const full = textWidth(c.text) * sc;
    const h = GLYPH_H * sc;
    const where = c.where ?? 'bl';
    const x = where === 'bc' || where === 'tc' ? Math.round((OUT_W - full) / 2) : EDGE;
    const y = where === 'tl' || where === 'tc' ? EDGE : OUT_H - EDGE - h;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.78)';
    ctx.fillRect(x - 4 * sc, y - 3 * sc, full + 8 * sc, h + 6 * sc);
    ctx.fillStyle = PAL[(c.color ?? 'yellow') as ColorName];
    ctx.fillRect(x - 4 * sc, y - 3 * sc, sc, h + 6 * sc);
    ctx.save();
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    drawText(ctx, text, x / sc, y / sc, (c.color ?? 'white') === 'yellow' ? 'white' : ((c.color ?? 'white') as ColorName), { shadow: true });
    ctx.restore();
  }

  function flashAt(f: Flash, i: number): number {
    const len = f.len ?? 8;
    return i < f.at || i >= f.at + len ? 0 : (f.alpha ?? 0.8) * (1 - (i - f.at) / len);
  }

  return {
    out,
    begin(s) {
      spec = s;
      cam = { x: SCREEN_W / 2, y: SCREEN_H / 2, zoom: 1, key: -1 };
      auto = [];
      lastAuto = -1e9;
    },
    compose(i, ticks) {
      const s = spec as ShotSpec;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUT_W, OUT_H);
      drawView(view(i));
      for (const c of s.captions ?? []) if (i >= c.at && (c.until === undefined || i < c.until)) drawCaption(c, i);
      // A hit on the beat: a flash on the frame an effect from the list plays.
      const on = s.flashOn;
      if (on) {
        const log = ud.cap.events;
        for (let n = log.length - 1; n >= 0; n--) {
          const e = log[n] as CapEvent;
          if (e.tick + 1 < ticks) break;
          if (e.tick + 1 === ticks && e.kind === 'sfx' && on.sfx.includes(e.id as string) && i - lastAuto >= (on.gap ?? 24)) {
            auto.push({ at: i, len: on.len, alpha: on.alpha });
            lastAuto = i;
          }
        }
      }
      let flash = 0;
      for (const f of [...(s.flashes ?? []), ...auto]) flash = Math.max(flash, flashAt(f, i));
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.toFixed(3)})`;
        ctx.fillRect(0, 0, OUT_W, OUT_H);
      }
      let black = 0;
      if (s.fadeIn && i < s.fadeIn) black = 1 - i / s.fadeIn;
      if (s.fadeOut && i >= s.len - s.fadeOut) black = Math.max(black, (i - (s.len - s.fadeOut) + 1) / s.fadeOut);
      if (black > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${clamp(black, 0, 1).toFixed(3)})`;
        ctx.fillRect(0, 0, OUT_W, OUT_H);
      }
    },
  };
}
