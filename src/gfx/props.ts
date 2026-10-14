// Props (log, gate, target, lights, bike, sign, van, floodlight, crate, door, console, camera, tank, rack, generator, firebox,
// vines) and pickup items.
// Static art is cached per kind, size and state; blinking bulbs, glare and sparkles are drawn live.
//
// State meaning: log closed = in the way, open = cleared. gate open = swung wide. target closed or off = unhit,
// open or lit = hit. lights lit or open = glowing, anything else dark. floodlight is on unless state is off.
// van open = tipped on its side (shoved clear). firebox lit or open = released, vines open = burned away. crate open = smashed. door open = slid back. console lit (or open) = on. camera alert = dark and
// red-lit, lit or off = shot and dead, any other state = calm. tank, rack and generator ignore their state.
import type { ItemView, PropView } from '../core/types.ts';
import { settings } from '../core/settings.ts';
import { createRng } from '../core/rng.ts';
import { Px } from './px.ts';
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { BULB_ROWS, CHIPS, COKE, EGGO, SIGN_TEXT } from './data/props.ts';
import { nightSprite } from './night.ts';
import { consoleArt, consoleLive, doorArt } from './props_lab.ts';
import { drawLab2Prop } from './props_lab2.ts';
import { drawSchoolProp, vanTippedArt } from './props_school.ts';

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) { c = build(); cache.set(key, c); }
  return c;
}

/** Draws the art with a 1 px dark rim; the canvas is 2 px bigger each way, so offset by 1. */
function rimmed(art: Px): Px {
  const out = new Px(art.w + 2, art.h + 2);
  out.blit(art, 1, 1);
  return out.outline('ink');
}

function transpose(px: Px): Px {
  const out = new Px(px.h, px.w);
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) out.d[x * out.w + y] = px.d[y * px.w + x] as number;
  return out;
}

const calm = (): boolean => settings.reduceFlashing;

// ---------------------------------------------------------------- log, gate, crate
function logArt(w: number, h: number, cleared: boolean): Px {
  const horiz = w >= h;
  const L = horiz ? w : h;
  const T = Math.max(6, Math.min(horiz ? h : w, 11));
  const r = createRng(L * 31 + T);
  const b = new Px(L, T);
  if (cleared) {
    for (let i = 0; i < 9; i++) b.set(2 + Math.floor(r() * (L - 4)), 1 + Math.floor(r() * (T - 2)), i % 3 ? 'soil1' : 'soil3');
    return horiz ? b : transpose(b);
  }
  b.rect(2, 0, L - 4, T, 'soil2').rect(2, 0, L - 4, 2, 'soil3').rect(2, T - 2, L - 4, 2, 'soil1');
  for (let i = 0; i < Math.max(3, L >> 2); i++) {
    const x = 3 + Math.floor(r() * (L - 8)), y = 2 + Math.floor(r() * (T - 4));
    b.rect(x, y, 3, 1, 'soil1');
  }
  b.ellipse(2.4, T / 2, 2.6, T / 2, 'soil3').ellipse(2.4, T / 2, 1.8, T / 2 - 1, 'sand').ellipse(2.4, T / 2, 0.9, T / 4, 'soil3');
  b.ellipse(L - 2.2, T / 2, 2.2, T / 2, 'soil1');
  b.scatter(r, 'pine2', 4, 5, 0, Math.max(2, L - 10), 2).scatter(r, 'pine3', 2, 5, 0, Math.max(2, L - 10), 2);
  return rimmed(horiz ? b : transpose(b));
}

function gateArt(w: number, h: number, open: boolean): Px {
  const horiz = w >= h;
  const L = horiz ? w : h, T = horiz ? h : w;
  const g = new Px(L, T);
  const post = (x: number): void => { g.rect(x, 0, 3, T, 'soil2').rect(x, 0, 1, T, 'soil3').rect(x, 0, 3, 1, 'sand').rect(x + 2, 1, 1, T - 1, 'soil1'); };
  const mid = T >> 1;
  if (!open) {
    for (const y of [Math.max(2, mid - 4), mid + 1]) g.rect(3, y, L - 6, 2, 'soil3').rect(3, y + 1, L - 6, 1, 'soil2');
    g.line(4, mid + 2, L - 5, Math.max(2, mid - 4), 'soil1');
    g.rect((L >> 1) - 1, mid - 1, 3, 3, 'grey3').set(L >> 1, mid, 'grey1');
  } else {
    const leaf = Math.min(4, (L - 6) >> 1);
    for (let i = 0; i < 2; i++) { const x = i ? L - 3 - leaf : 3; g.rect(x, 1, leaf, 2, 'soil3').rect(x, 2, leaf, 1, 'soil2'); }
  }
  post(0); post(L - 3);
  return horiz ? g : transpose(g);
}

function crateArt(w: number, h: number, broken: boolean): Px {
  const cw = Math.min(w, 16), ch = Math.min(h, 16);
  const c = new Px(cw, ch);
  const r = createRng(cw * 7 + ch);
  if (broken) {
    c.rect(0, ch - 3, cw, 3, 'soil1');
    for (let i = 0; i < 6; i++) { const x = Math.floor(r() * (cw - 4)), y = ch - 6 + Math.floor(r() * 4); c.rect(x, y, 4, 1, i & 1 ? 'soil3' : 'soil2'); }
    c.art(CHIPS.rows, CHIPS.map, 3, ch - 8);
    return rimmed(c);
  }
  c.rect(0, 0, cw, ch, 'soil2').rect(0, 0, cw, 2, 'sand').frame(0, 0, cw, ch, 'soil1').rect(1, 1, cw - 2, 1, 'soil3');
  c.line(1, 2, cw - 2, ch - 2, 'soil1').line(cw - 2, 2, 1, ch - 2, 'soil1');
  for (const [x, y] of [[2, 3], [cw - 3, 3], [2, ch - 3], [cw - 3, ch - 3]] as [number, number][]) c.set(x, y, 'grey3');
  c.rect(0, ch - 2, cw, 2, 'soil1');
  return rimmed(c);
}

// ---------------------------------------------------------------- target, bike, sign, floodlight, van
function targetArt(hit: boolean): Px {
  const p = new Px(16, 16);
  p.rect(6, 0, 4, 2, 'grey2').rect(7, 2, 2, 2, 'grey3');
  p.rect(4, 4, 8, 2, 'grey1').rect(4, 4, 8, 1, 'grey2');
  p.rect(4, 6, 8, 6, hit ? 'amber' : 'teal0').rect(5, 7, 6, 4, hit ? 'yellow' : 'night');
  p.rect(4, 6, 1, 6, 'grey1').rect(11, 6, 1, 6, 'grey1').rect(4, 12, 8, 2, 'grey1').rect(5, 12, 6, 1, 'grey2');
  if (hit) p.rect(7, 8, 2, 2, 'cream');
  else p.art(['.rr.', 'rwwr', 'rwwr', '.rr.'], { r: 'hot', w: 'white' }, 6, 7).set(4, 14, 'grey1');
  return rimmed(p);
}

function bikeArt(): Px {
  const p = new Px(16, 12);
  for (const cx of [3.5, 12.5]) p.disc(cx, 8, 3.6, 'ink').disc(cx, 8, 2.6, 'grey3').disc(cx, 8, 1.6, 'grey2').set(Math.floor(cx), 7, 'grey1');
  p.line(3, 8, 6, 3, 'red').line(6, 3, 11, 4, 'red').line(7, 8, 11, 4, 'red').line(3, 8, 7, 8, 'red').line(6, 3, 7, 8, 'red');
  p.line(11, 4, 12, 8, 'grey2').line(11, 4, 12, 1, 'grey2').rect(11, 0, 3, 1, 'ink').rect(4, 2, 4, 1, 'ink');
  return rimmed(p);
}

function signArt(): Px {
  const p = new Px(16, 16);
  p.rect(7, 7, 2, 9, 'soil2').rect(7, 7, 1, 9, 'soil3').rect(5, 15, 6, 1, 'soil1');
  p.rect(1, 1, 14, 7, 'soil3').frame(1, 1, 14, 7, 'soil1').rect(2, 2, 12, 1, 'sand');
  p.art(SIGN_TEXT, { x: 'soil1' }, 4, 3);
  return p;
}

/** The floodlight is a tall pole over a small base: the art is 34 px high whatever its footprint. */
const FLOOD_W = 14, FLOOD_H = 34;
function floodArt(on: boolean): Px {
  const p = new Px(FLOOD_W, FLOOD_H);
  const cx = FLOOD_W >> 1;
  p.rect(cx - 1, 6, 2, FLOOD_H - 6, 'grey2').rect(cx - 1, 6, 1, FLOOD_H - 6, 'grey3').rect(cx - 3, FLOOD_H - 2, 6, 2, 'grey1').rect(cx - 2, FLOOD_H - 3, 4, 1, 'grey2');
  p.rect(cx - 5, 1, 10, 5, 'grey1').rect(cx - 5, 1, 10, 1, 'grey2');
  for (let i = 0; i < 3; i++) p.rect(cx - 4 + i * 3, 2, 2, 3, on ? 'cream' : 'grey2');
  if (on) p.rect(cx - 4, 2, 8, 1, 'white');
  return rimmed(p);
}

function vanArt(w: number, h: number, open: boolean): Px {
  if (open) return rimmed(vanTippedArt(w, h));
  const p = new Px(w, h);
  const bodyH = h - 5;
  p.rect(1, 1, w - 2, bodyH, 'bone').rect(2, 0, w - 4, 1, 'bone').rect(1, 1, w - 2, 1, 'white');
  p.rect(1, bodyH - 5, w - 2, 3, 'slate').rect(1, bodyH - 5, w - 2, 1, 'blue');
  const cab = Math.floor(w * 0.27);
  p.rect(w - 1 - cab, 3, cab - 2, Math.max(4, (bodyH >> 1) - 1), 'teal0').rect(w - cab, 4, 2, 2, 'sky');
  p.rect(5, 3, Math.floor(w * 0.34), Math.max(4, (bodyH >> 1) - 1), 'teal0').rect(6, 4, 3, 1, 'sky');
  p.rect(Math.floor(w * 0.6), 2, 1, bodyH - 3, 'grey3');
  p.disc(Math.floor(w * 0.5), bodyH - 8, 2.2, 'blue').set(Math.floor(w * 0.5), bodyH - 8, 'white');
  p.rect(w - 2, bodyH - 8, 2, 2, 'yellow').rect(0, bodyH - 8, 2, 2, 'red');
  p.rect(0, bodyH - 1, w, 2, 'grey2').rect(0, bodyH - 1, w, 1, 'grey3');
  for (const cx of [Math.floor(w * 0.22), Math.floor(w * 0.78)]) p.disc(cx, h - 4, 4, 'ink').disc(cx, h - 4, 2.4, 'grey3').set(cx, h - 4, 'grey1');
  return rimmed(p);
}

// ---------------------------------------------------------------- lights
const BULB_COLORS: { glass: ColorName; hi: ColorName }[] = [
  { glass: 'hot', hi: 'pink' }, { glass: 'yellow', hi: 'cream' }, { glass: 'leaf', hi: 'cream' }, { glass: 'sky', hi: 'white' },
];

function lightsArt(w: number, h: number): Px {
  const p = new Px(w, h);
  p.rect(0, 1, 3, h - 1, 'soil2').rect(0, 1, 1, h - 1, 'soil3').rect(0, 0, 3, 1, 'sand');
  p.rect(w - 3, 1, 3, h - 1, 'soil2').rect(w - 3, 1, 1, h - 1, 'soil3').rect(w - 3, 0, 3, 1, 'sand');
  const sag = Math.max(2, Math.min(5, h >> 2));
  for (let x = 3; x < w - 3; x++) {
    const u = ((x - 3) / Math.max(1, w - 7)) * 2 - 1;
    p.set(x, 2 + Math.round(sag * (1 - u * u)), 'ink');
  }
  return p;
}

function drawLights(ctx: Ctx, v: PropView, x: number, y: number): void {
  const on = v.state === 'lit' || v.state === 'open';
  const n = Math.max(3, Math.floor(v.w / 7));
  const sag = Math.max(2, Math.min(5, v.h >> 2));
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) / n) * 2 - 1;
    const bx = x + 3 + Math.round(((i + 0.5) / n) * (v.w - 7)) - 1;
    const by = y + 3 + Math.round(sag * (1 - u * u));
    const col = BULB_COLORS[i & 3] as { glass: ColorName; hi: ColorName };
    const dip = on && !calm() && (((v.t >> 3) + i * 5) % 13 === 0 || ((v.t + i * 11) % 90) < 3);
    const lit = on && !dip;
    rect(ctx, bx + 1, by, 1, 1, 'grey2');
    BULB_ROWS.forEach((row, j) => {
      for (let k = 0; k < 3; k++) {
        const ch = row[k] as string;
        if (ch === '.' || ch === 'g') continue;
        rect(ctx, bx + k, by + j, 1, 1, lit ? (ch === 'h' ? col.hi : col.glass) : (ch === 'h' ? 'grey2' : 'grey1'));
      }
    });
    if (lit) {
      for (const [dx, dy] of [[-1, 0], [3, 0], [-1, 3], [3, 3], [1, 4]] as [number, number][]) if (((bx + by + dx + dy) & 1) === 0) rect(ctx, bx + dx, by + dy, 1, 1, 'cream');
    }
  }
}

// ---------------------------------------------------------------- public: props
/** Draws a prop. At night the static art is repainted in the night palette; the live bulbs and sparkles stay bright. */
export function drawProp(ctx: Ctx, v: PropView, night = false): void {
  const x = Math.round(v.x), y = Math.round(v.y);
  const w = Math.round(v.w), h = Math.round(v.h);
  const art = (key: string, build: () => Px): HTMLCanvasElement => cached(night ? `${key}:night` : key, () => (night ? nightSprite(build()) : build()).toCanvas());
  switch (v.kind) {
    case 'log': ctx.drawImage(art(`log${w}x${h}${v.state === 'open'}`, () => logArt(w, h, v.state === 'open')), x - 1, y - 1); return;
    case 'gate': ctx.drawImage(art(`gate${w}x${h}${v.state === 'open'}`, () => gateArt(w, h, v.state === 'open')), x, y); return;
    case 'crate': ctx.drawImage(art(`crate${w}x${h}${v.state === 'open'}`, () => crateArt(w, h, v.state === 'open')), x - 1 + ((w - Math.min(w, 16)) >> 1), y - 1 + (h - Math.min(h, 16))); return;
    case 'target': {
      const hit = v.state === 'open' || v.state === 'lit';
      const sway = hit && v.t < 120 ? Math.round(Math.sin(v.t / 6) * 2 * (1 - v.t / 120)) : 0;
      ctx.drawImage(art(`target${hit}`, () => targetArt(hit)), x + ((w - 16) >> 1) - 1 + sway, y + (h - 16) - 1);
      if (hit && !calm() && ((v.t >> 2) & 3) === 0) rect(ctx, x + ((w - 16) >> 1) + 12, y + (h - 16) + 4, 1, 1, 'white');
      return;
    }
    case 'bike': ctx.drawImage(art('bike', bikeArt), x + ((w - 16) >> 1) - 1, y + (h - 12) - 1); return;
    case 'sign': ctx.drawImage(art('sign', signArt), x + ((w - 16) >> 1), y + (h - 16)); return;
    case 'floodlight': {
      const on = v.state !== 'off';
      const left = x + ((w - FLOOD_W) >> 1), top = y + h - FLOOD_H;
      ctx.drawImage(art(`flood${on}`, () => floodArt(on)), left - 1, top - 1);
      if (on && !calm() && ((v.t >> 2) & 3) !== 3) {
        const cx = left + (FLOOD_W >> 1);
        for (const [dx, dy] of [[-6, -1], [5, -1], [-7, 2], [6, 2], [0, -2]] as [number, number][]) rect(ctx, cx + dx, top + dy, 1, 1, ((v.t >> 3) + dx) & 1 ? 'cream' : 'white');
      }
      return;
    }
    case 'van': ctx.drawImage(art(`van${w}x${h}${v.state === 'open'}`, () => vanArt(w, h, v.state === 'open')), x - 1, y - 1); return;
    case 'door': ctx.drawImage(art(`door${w}x${h}${v.state === 'open'}`, () => rimmed(doorArt(w, h, v.state === 'open'))), x - 1, y - 1); return;
    case 'console': {
      const lit = v.state === 'lit' || v.state === 'open';
      const cx = x + ((w - 16) >> 1), cy = y + (h - 16);
      ctx.drawImage(art(`console${lit}`, () => rimmed(consoleArt(lit))), cx - 1, cy - 1);
      consoleLive(ctx, lit, cx, cy, v.t, calm());
      return;
    }
    case 'camera': case 'tank': case 'rack': case 'generator': drawLab2Prop(ctx, v, art); return;
    case 'firebox': case 'vines': drawSchoolProp(ctx, v, art, calm()); return;
    case 'lights':
      ctx.drawImage(art(`lights${w}x${h}`, () => lightsArt(w, h)), x, y);
      drawLights(ctx, v, x, y);
      return;
    default:
      return;
  }
}

// ---------------------------------------------------------------- public: items
let eggo: HTMLCanvasElement | null = null;
let coke: HTMLCanvasElement | null = null;
const coins: HTMLCanvasElement[] = [];
const SPIN = [8, 7, 5, 3, 2, 3, 5, 7];

function coinFrame(i: number): HTMLCanvasElement {
  let c = coins[i];
  if (c) return c;
  const w = SPIN[i] as number;
  const p = new Px(8, 8);
  p.ellipse(4, 4, w / 2, 4, 'grey2');
  if (w > 2) p.ellipse(4, 4, Math.max(0.6, w / 2 - 0.9), 3.1, 'bone');
  if (w > 4) p.set(3, 2, 'white').set(3, 3, 'white').rect(3, 4, 2, 2, 'grey3');
  c = rimmed(p).toCanvas();
  coins[i] = c;
  return c;
}

export function drawItem(ctx: Ctx, v: ItemView): void {
  const x = Math.round(v.x), y = Math.round(v.y);
  const lift = 3 + Math.round(1.5 + 1.5 * Math.sin(v.t / 11));
  for (let i = -2; i <= 2; i++) if (((x + i + y) & 1) === 0) rect(ctx, x + i, y - 1, 1, 1, 'black');
  for (let i = -1; i <= 1; i++) if (((x + i + y) & 1) === 1) rect(ctx, x + i, y, 1, 1, 'black');
  let img: HTMLCanvasElement;
  let w = 9, h = 9;
  if (v.kind === 'eggo') { img = eggo ?? (eggo = rimmed(new Px(7, 7).art(EGGO.rows, EGGO.map)).toCanvas()); }
  else if (v.kind === 'coke') { img = coke ?? (coke = rimmed(new Px(5, 8).art(COKE.rows, COKE.map)).toCanvas()); w = 7; h = 10; }
  else { img = coinFrame(((v.t / 6) | 0) & 7); w = 10; h = 10; }
  const top = y - h - lift;
  ctx.drawImage(img, x - (w >> 1), top);
  if (!calm() && (v.t % 60) < 6) { rect(ctx, x + (w >> 1) - 1, top + 1, 1, 3, 'white'); rect(ctx, x + (w >> 1) - 2, top + 2, 3, 1, 'white'); }
}
