// The bond callout: when a stage starts with a bond in the party, or a hero who joins completes one, a strip under the HUD names
// it for a few seconds: BOND and the name, then what it gives. The rules (which bonds, what they say) are heroes/bonds.ts; this
// keeps the little state, which bonds it has already shown and for how long, and draws it. A retry rebuilds the sim and keeps the
// banner, so a bond is announced once a visit and never again after a wipe.
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { activeBonds } from '../heroes/bonds.ts';
import type { BondDef, BondHero } from '../heroes/bonds.ts';
import { drawText, textWidth } from '../gfx/index.ts';
import { box } from '../ui/kit.ts';
import type { Ctx } from '../ui/kit.ts';

/** How long a callout shows, in frames of free play: a stage's talk and its pauses do not count. */
export const BANNER_FRAMES = 240;
/** The most bonds one callout names. A party of four with more than three is not a thing the roster can make today. */
export const BANNER_MAX = 3;
/** Where the strip starts, under the HUD, and the height of one bond's two lines. */
const TOP_DY = 4;
const ROW_H = 18;
const LABEL = 'BOND';

export interface BondBanner {
  /** Looks at the party: a bond not yet announced starts or extends the callout. Cheap to call every tick. */
  sync(party: readonly BondHero[]): void;
  /** One tick of free play. */
  tick(): void;
  /** The bonds the callout is naming now, empty when it is not showing. */
  showing(): readonly BondDef[];
  draw(ctx: Ctx): void;
}

export function createBondBanner(): BondBanner {
  const told = new Set<string>();
  let list: BondDef[] = [];
  let t = 0;
  return {
    sync(party) {
      const fresh = activeBonds(party).filter((b) => !told.has(b.id));
      if (fresh.length === 0) return;
      for (const b of fresh) told.add(b.id);
      // A bond that lands while the strip is up joins it and the clock starts over.
      list = [...(t < BANNER_FRAMES ? list : []), ...fresh].slice(-BANNER_MAX);
      t = 0;
    },
    tick() { if (t < BANNER_FRAMES) t++; },
    showing: () => (t < BANNER_FRAMES ? list : []),
    draw(ctx) {
      if (t >= BANNER_FRAMES || list.length === 0) return;
      // The strip fades in over the first 12 frames and out over the last 24, in whole steps so it stays pixel art.
      const fade = Math.min(1, t / 12, (BANNER_FRAMES - t) / 24);
      const head = (b: BondDef): number => textWidth(`${LABEL} ${b.name}`);
      const w = Math.max(...list.map((b) => Math.max(head(b), textWidth(b.perk)))) + 12;
      const x = Math.round((SCREEN_W - w) / 2), y = VIEW_TOP + TOP_DY;
      ctx.globalAlpha = fade >= 1 ? 1 : fade >= 0.5 ? 0.7 : 0.35;
      box(ctx, x, y, w, list.length * ROW_H + 4, 'ink');
      list.forEach((b, i) => {
        const ry = y + 3 + i * ROW_H, lx = Math.round((SCREEN_W - head(b)) / 2);
        drawText(ctx, LABEL, lx, ry, 'leaf');
        drawText(ctx, b.name, lx + textWidth(`${LABEL} `), ry, 'yellow');
        drawText(ctx, b.perk, SCREEN_W / 2, ry + 9, 'white', { align: 'center' });
      });
      ctx.globalAlpha = 1;
    },
  };
}
