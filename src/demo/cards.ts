// The title cards the recorder shows between shots: the title screen's own sky, skyline, woods and spores behind a logo and some lines of
// the game's font, laid out in game pixels as a scene, so the compositor takes it up through the same camera as everything else. A card
// can move: the logo can drop in, the title's party can walk up the path, and a line can slam in with a sound.
import type { Scene } from '../core/scene.ts';
import type { HeroId, SfxId, TrackId } from '../core/types.ts';
import { audio } from '../audio/index.ts';
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { drawLogo } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { bigText, box } from '../ui/kit.ts';
import { bigActor, sky, spores, woods } from '../ui/title_art.ts';
import { sideGround, sideProps, skyline } from '../ui/title_wide.ts';
import type { CardSpec } from './types.ts';

/** Where the title screen stands its four (title.ts), in the 256 wide frame. */
const PARTY: { id: HeroId; x: number; y: number }[] = [
  { id: 'dustin', x: 70, y: 190 },
  { id: 'mike', x: 108, y: 188 },
  { id: 'eleven', x: 148, y: 192 },
  { id: 'lucas', x: 186, y: 188 },
];
/** How far below their places the party starts, and how far above its place the logo does, in px, unless the card says. */
const WALK_FROM = 80;
const DROP_FROM = 70;
const easeOut = (p: number): number => 1 - (1 - p) ** 3;

export function createCardScene(spec: CardSpec): Scene {
  let t = 0;
  const sfx = (id: string | undefined): void => { if (id) audio.sfx(id as SfxId); };
  return {
    opaque: true,
    enter() { if (spec.music !== undefined) audio.music(spec.music as TrackId | null); },
    update() {
      t++;
      if (spec.logo?.drop) sfx(t === (spec.logo.at ?? 0) + spec.logo.drop ? spec.logo.sfx : undefined);
      for (const l of spec.lines) if (t === (l.at ?? 0)) sfx(l.sfx);
    },
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
      if (spec.party) {
        const from = spec.party.from ?? 0;
        const p = Math.max(0, Math.min(1, (t - from) / spec.party.len));
        const walking = p < 1;
        // Heroes in the back row first, so the front one overlaps them.
        for (const h of [...PARTY].sort((a, b) => a.y - b.y)) {
          const off = Math.round((1 - easeOut(p)) * (spec.party.rise ?? WALK_FROM));
          bigActor(ctx, h.id, FRAME_X + h.x, h.y + off, 2, t, { dir: walking ? 'up' : 'down', anim: walking ? 'walk' : 'idle' });
        }
      }
      // Centered on the whole screen, which is 384 wide in a capture.
      const mid = SCREEN_W / 2;
      if (spec.logo && t >= (spec.logo.at ?? 0)) {
        const drop = spec.logo.drop ?? 0;
        const k = drop ? Math.min(1, (t - (spec.logo.at ?? 0)) / drop) : 1;
        drawLogo(ctx, t, mid, spec.logo.y - Math.round((1 - easeOut(k)) * (spec.logo.rise ?? DROP_FROM)));
      }
      for (const l of spec.lines) {
        if (t < (l.at ?? 0)) continue;
        const age = t - (l.at ?? 0);
        const boost = l.pop && age < 4 ? 1 : 0;
        bigText(ctx, l.text, mid, l.y - boost * 3, (l.color ?? 'white') as ColorName, (l.scale ?? 1) + boost);
      }
    },
  };
}
