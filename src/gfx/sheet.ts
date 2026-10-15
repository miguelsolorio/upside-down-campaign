// ?sheet=1 review page. Owner: Art agent. Left and right flip pages, up and down change what a page shows
// (which way the actors face, day or night, which way the effects point). ?page=3&sub=1 opens a page directly.
import type { Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { drawText } from './font.ts';
import { PAGES_A } from './sheet_a.ts';
import { PAGES_B } from './sheet_b.ts';
import { PAGES_C } from './sheet_foes.ts';
import { PAGES_D } from './sheet_school.ts';
import { PAGES_E } from './sheet_patch.ts';
import { L56_PAGES } from './sheet_l56.ts';
import { L56B_PAGES } from './sheet_l56b.ts';
import { L78_FOE_PAGES, L78_HERO_PAGES } from './sheet_l78.ts';
import { L78B_PAGES } from './sheet_l78b.ts';
import { L9_PAGES } from './sheet_l9.ts';
import { L9B_PAGES } from './sheet_l9b.ts';

const PAGES = [...PAGES_A, ...PAGES_B, ...PAGES_C, ...PAGES_D, ...PAGES_E, ...L56_PAGES, ...L56B_PAGES, ...L78_HERO_PAGES, ...L78_FOE_PAGES, ...L78B_PAGES, ...L9_PAGES, ...L9B_PAGES];

function startPage(): { page: number; sub: number } {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const page = Math.max(0, Math.min(PAGES.length - 1, (Number(q.get('page')) || 1) - 1));
  return { page, sub: Math.max(0, Number(q.get('sub')) || 0) };
}

export function createSheetScene(): Scene {
  const start = startPage();
  let page = start.page;
  let sub = start.sub;
  let t = 0;
  return {
    opaque: true,
    update(g) {
      t++;
      const n = PAGES.length;
      if (g.input.pressed('right')) { page = (page + 1) % n; sub = 0; }
      if (g.input.pressed('left')) { page = (page + n - 1) % n; sub = 0; }
      const subs = (PAGES[page] as { subs: number }).subs;
      if (g.input.pressed('down')) sub = (sub + 1) % subs;
      if (g.input.pressed('up')) sub = (sub + subs - 1) % subs;
      if (sub >= subs) sub = 0;
    },
    draw(ctx) {
      const p = PAGES[page] as (typeof PAGES)[number];
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      p.draw(ctx, t, sub);
      const tag = `${page + 1}/${PAGES.length} ${p.title}`;
      drawText(ctx, tag, SCREEN_W - 2, SCREEN_H - 8, 'slate', { align: 'right', shadow: true });
    },
  };
}
