// Builds a 24 by 24 portrait from a PortraitSpec the way gfx/ui.ts does (shoulders, trim, back hair, head, nose, face, front
// hair), so a chosen design's spec goes into data/portraits.ts as it is. ui.ts keeps its builder private and reads the
// game's own table, which is why the sheet has its own copy. Pure pixel work: no DOM until toCanvas().
import type { Expr } from '../../core/types.ts';
import type { ColorName } from '../palette.ts';
import { EXPR, HEAD, NOSE, SHOULDERS } from '../data/portraits.ts';
import type { PortraitSpec, Shirt } from '../data/portraits.ts';
import type { Part } from '../data/types.ts';
import { Px } from '../px.ts';

const SHARED: Record<string, ColorName> = { e: 'ink', w: 'white', m: 'blood1', r: 'rose', z: 'cyan' };

function shirtRole(kind: Shirt, x: number, y: number): string {
  switch (kind) {
    case 'stripes': return ((y - 18) >> 1) & 1 ? 'b' : 'a';
    case 'plaid': return x % 6 < 2 ? 'b' : (y - 18) % 5 < 2 ? 'c' : 'a';
    case 'jacket': return (x === 11 || x === 12) && y >= 20 ? 'b' : 'a';
    case 'cardigan': return y >= 20 && x >= 9 && x <= 14 ? 'b' : 'a';
    default: return 'a';
  }
}

export function portrait(spec: PortraitSpec, expr: Expr): Px {
  const px = new Px(24, 24).fill(spec.bg);
  const color = (ch: string): ColorName | null => (ch === 'S' ? spec.pal.s ?? null : spec.pal[ch] ?? SHARED[ch] ?? null);
  const draw = (part: Part, fill?: (ch: string, x: number, y: number) => string): void => {
    part.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        let ch = row[i] as string;
        if (ch === '.') continue;
        if (fill) ch = fill(ch, i, part.y + j);
        const c = color(ch);
        if (c) px.set(i, part.y + j, c);
      }
    });
  };
  draw(SHOULDERS, (ch, x, y) => (ch === 'A' ? shirtRole(spec.shirt, x, y) : ch));
  for (const p of spec.trim) draw(p);
  for (const p of spec.back) draw(p);
  draw(HEAD);
  draw(NOSE);
  const late: Part[] = [];
  for (const p of EXPR[expr]) {
    if (expr === 'happy' && spec.grin && p.y === 13) { for (const g of spec.grin) draw(g); continue; }
    if (p.rows.some((r) => r.includes('z'))) late.push(p); else draw(p);
  }
  for (const p of spec.front) draw(p);
  for (const p of late) draw(p);
  px.frame(0, 0, 24, 24, 'ink');
  return px;
}
