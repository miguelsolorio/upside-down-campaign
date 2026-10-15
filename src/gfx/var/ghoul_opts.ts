// The four Creel ghouls of ghoul-variations.html, in page order. Each is { slug, name, note, draw(pose) }, and draw gives one
// 22 by 26 frame (ghoul_kit.ts): in the glass, stepping out, stand, drift A and B, lunge, hurt, shatter.
import type { GhoulOpt } from './ghoul_kit.ts';
import { GHOULS_A } from './ghoul_a.ts';
import { GHOULS_B } from './ghoul_b.ts';

export const GHOUL_OPTS: GhoulOpt[] = [...GHOULS_A, ...GHOULS_B];
