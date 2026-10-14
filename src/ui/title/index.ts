// The title screen variants. ?title=1 to ?title=5 picks one in the game; title-variations.html shows them side by side.
import type { Scene } from '../../core/scene.ts';
import { createVariantScene } from './core.ts';
import type { TitleDesign, VariantOpts } from './core.ts';
import { wallDesign } from './v1_wall.ts';
import { partyDesign } from './v2_party.ts';
import { riftDesign } from './v3_rift.ts';
import { d20Design } from './v4_d20.ts';
import { vhsDesign } from './v5_vhs.ts';

export type { StartMode, TitleDesign } from './core.ts';

export const TITLE_DESIGNS: TitleDesign[] = [wallDesign, partyDesign, riftDesign, d20Design, vhsDesign];

export function createTitleVariant(n: number, opts: VariantOpts): Scene | null {
  const design = TITLE_DESIGNS.find((d) => d.id === n);
  return design ? createVariantScene(design, opts) : null;
}
