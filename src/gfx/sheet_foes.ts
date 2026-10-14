// Sheet page 9: the riot guard and the warden, every frame with the shield up and down and as an elite (up and down
// change the way they face), then a live sub page with the flags the game sets: elite, shield, bar, alert, flash.
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import { SCREEN_W } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawActor, drawActorFrame } from './actors.ts';
import { PAL } from './palette.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const FRAMES: [AnimId, number][] = [['idle', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1], ['hurt', 0], ['ko', 0]];
const ROWS: [string, boolean, boolean][] = [['SHLD', true, false], ['DOWN', false, false], ['ELIT', true, true], ['ELDN', false, true]];

const foes: Page = {
  title: 'LAB FOES',
  subs: 5,
  draw(ctx: Ctx, t: number, sub: number) {
    ctx.fillStyle = PAL.bone;
    ctx.fillRect(0, 0, SCREEN_W, 224);
    if (sub === 4) { live(ctx, t); return; }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `RIOT GUARD AND WARDEN FACING ${dir.toUpperCase()}`, 4, 3, 'teal0');
    ROWS.forEach(([name, guarding, elite], r) => {
      const y = 14 + r * 18;
      drawText(ctx, name, 2, y + 5, 'grey2');
      FRAMES.forEach(([a, f], i) => drawActorFrame(ctx, 'guard', dir, a, f, 34 + i * 24 + 4, y, { guarding, elite }));
    });
    ROWS.forEach(([name, guarding, elite], r) => {
      const y = 90 + r * 26;
      drawText(ctx, name, 2, y + 9, 'grey2');
      FRAMES.forEach(([a, f], i) => drawActorFrame(ctx, 'warden', dir, a, f, 34 + i * 24, y, { guarding, elite }));
    });
    drawText(ctx, 'IDLE WALK4 ATK2 HURT KO', 34, 196, 'grey2');
    drawText(ctx, 'SHLD SHIELD UP  DOWN SHIELD DOWN  EL ELITE', 4, 206, 'grey2');
    drawText(ctx, 'UP DOWN FACING AND LIVE', 4, 216, 'slate');
  },
};

/** The same sprites as the game draws them: flags, an elite's wider bar, the alert, a flash, a tint. */
function live(ctx: Ctx, t: number): void {
  drawText(ctx, 'LIVE: THE FLAGS THE GAME SETS', 4, 3, 'teal0');
  const names = ['PLAIN', 'ELITE', 'LOW', 'ELITE LOW', 'BAR', 'ELITE BAR', 'ALERT', 'FLASH'];
  names.forEach((n, i) => drawText(ctx, n, 22 + i * 31, 14 + (i & 1) * 8, 'teal0', { align: 'center' }));
  const dirs: Dir[] = ['down', 'left', 'up', 'right'];
  ['guard', 'warden', 'agent', 'rat'].forEach((id, r) => {
    const y = [64, 118, 158, 196][r] as number;
    for (let c = 0; c < 8; c++) {
      const dir = dirs[(Math.floor(t / 90) + r) % 4] as Dir;
      const anim: AnimId = c === 6 ? 'attack' : ((t >> 6) & 1) ? 'walk' : 'idle';
      const over: Partial<ActorView> = { dir, anim, t: c === 6 ? 0 : t, guarding: c !== 2 && c !== 3, elite: c === 1 || c === 3 || c === 5 };
      if (c === 4 || c === 5) over.bar = { hp: 3, hpMax: 5 };
      if (c === 6) over.alert = true;
      if (c === 7) over.flash = (t >> 4) & 1 ? 1 : 0.4;
      drawActor(ctx, view(id, 22 + c * 31, y, over));
    }
  });
}

export const PAGES_C: Page[] = [foes];
