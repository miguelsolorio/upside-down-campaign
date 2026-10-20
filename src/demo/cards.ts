// The title cards the recorder shows between shots: the title screen's own sky, skyline, woods and spores behind a logo and some lines of
// the game's font, laid out in game pixels as a scene, so the compositor takes it up through the same camera as everything else.
import type { Scene } from '../core/scene.ts';
import type { TrackId } from '../core/types.ts';
import { audio } from '../audio/index.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { drawLogo } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { bigText, box } from '../ui/kit.ts';
import { sky, spores, woods } from '../ui/title_art.ts';
import { sideGround, sideProps, skyline } from '../ui/title_wide.ts';
import type { CardSpec } from './types.ts';

export function createCardScene(spec: CardSpec): Scene {
  let t = 0;
  return {
    opaque: true,
    enter() { if (spec.music !== undefined) audio.music(spec.music as TrackId | null); },
    update() { t++; },
    draw(ctx) {
      if (spec.bg === 'sky') {
        sky(ctx, t);
        skyline(ctx, t);
        woods(ctx);
        sideProps(ctx, t);
        sideGround(ctx, t);
        spores(ctx, t);
      } else {
        box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      }
      // Centered on the whole screen, which is 384 wide in a capture.
      const mid = SCREEN_W / 2;
      if (spec.logo && t >= (spec.logo.at ?? 0)) drawLogo(ctx, t, mid, spec.logo.y);
      for (const l of spec.lines) {
        if (t >= (l.at ?? 0)) bigText(ctx, l.text, mid, l.y, (l.color ?? 'white') as ColorName, l.scale ?? 1);
      }
    },
  };
}
