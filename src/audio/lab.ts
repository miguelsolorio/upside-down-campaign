// ?audio=1 audio lab. Owner: Audio agent. A small menu to play every track, toggle the combat layer, fire every
// effect and render a track to a WAV file in music/.
//   Up, Down: select    Enter: play    Space: combat layer    R: render 30 s and save    Left, Right: music volume
import type { Game, Scene } from '../core/scene.ts';
import type { AudioMetrics, ColorName, JingleId, SfxId, Speaker, StingerId, TrackId } from '../core/types.ts';
import { drawText } from '../gfx/index.ts';
import { PAL } from '../gfx/palette.ts';
import { audio } from './index.ts';
import { position } from './live.ts';
import { SFX } from './sfx.ts';
import { JINGLES, STINGERS } from './tracks/jingles.ts';
import { TRACKS, TRACK_IDS } from './tracks/index.ts';
import { BLIPS } from './cues.ts';

type Kind = 'music' | 'stop' | 'jingle' | 'sting' | 'blip' | 'sfx';
interface Item { kind: Kind; id: string }

const TAG: Record<Kind, string> = { music: 'MUSIC ', stop: 'STOP  ', jingle: 'JINGLE', sting: 'STING ', blip: 'BLIP  ', sfx: 'SFX   ' };
const TAG_COLOR: Record<Kind, ColorName> = {
  music: 'cyan', stop: 'red', jingle: 'amber', sting: 'pink', blip: 'leaf', sfx: 'bone',
};

const ITEMS: Item[] = [
  ...TRACK_IDS.map((id): Item => ({ kind: 'music', id })),
  { kind: 'stop', id: 'music' },
  ...(Object.keys(JINGLES) as JingleId[]).map((id): Item => ({ kind: 'jingle', id })),
  ...(Object.keys(STINGERS) as StingerId[]).map((id): Item => ({ kind: 'sting', id })),
  ...(Object.keys(BLIPS) as Speaker[]).map((id): Item => ({ kind: 'blip', id })),
  ...(Object.keys(SFX) as SfxId[]).map((id): Item => ({ kind: 'sfx', id })),
];

const ROWS = 14;
const ROW_H = 9;
const LIST_Y = 31;

function toDataUrl(wav: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(new Blob([wav], { type: 'audio/wav' }));
  });
}

/** Small pointers drawn from pixels, because the 5x7 font has no arrow glyphs. */
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'right' | 'up' | 'down'): void {
  ctx.fillStyle = dir === 'right' ? PAL.yellow : PAL.mist;
  if (dir === 'right') {
    ctx.fillRect(x, y, 1, 7);
    ctx.fillRect(x + 1, y + 1, 1, 5);
    ctx.fillRect(x + 2, y + 2, 1, 3);
    ctx.fillRect(x + 3, y + 3, 1, 1);
  } else if (dir === 'up') {
    ctx.fillRect(x + 2, y, 1, 1);
    ctx.fillRect(x + 1, y + 1, 3, 1);
    ctx.fillRect(x, y + 2, 5, 1);
  } else {
    ctx.fillRect(x, y + 3, 5, 1);
    ctx.fillRect(x + 1, y + 4, 3, 1);
    ctx.fillRect(x + 2, y + 5, 1, 1);
  }
}

export function createAudioLabScene(): Scene {
  let game: Game | null = null;
  let sel = 0;
  let top = 0;
  let combat = false;
  let busy = false;
  let status = 'PRESS ENTER TO PLAY';
  let metrics: AudioMetrics | null = null;

  const play = (it: Item): void => {
    switch (it.kind) {
      case 'music': audio.music(it.id as TrackId); audio.intensity(combat ? 1 : 0); break;
      case 'stop': audio.music(null); break;
      case 'jingle': audio.jingle(it.id as JingleId); break;
      case 'sting': audio.stinger(it.id as StingerId); break;
      case 'blip': audio.blip(it.id as Speaker); break;
      case 'sfx': audio.sfx(it.id as SfxId); break;
    }
    status = `PLAYED ${it.id.toUpperCase()}`;
  };

  const render = async (): Promise<void> => {
    if (busy) return;
    const it = ITEMS[sel];
    const id = it.kind === 'music' ? (it.id as TrackId) : (position()?.id ?? TRACK_IDS[0]);
    const withCombat = combat && TRACKS[id].layers.includes('combat');
    const name = withCombat ? `${id}-combat` : id;
    busy = true;
    status = `RENDERING ${name.toUpperCase()}...`;
    try {
      const m = await audio.renderOffline(id, 30, { combat: withCombat });
      metrics = m;
      if (!m.wav) throw new Error('no wav');
      const body = await toDataUrl(m.wav);
      const res = await fetch(`/__snap?dir=music&name=${name}.wav`, { method: 'POST', body });
      status = res.ok ? `SAVED MUSIC/${name.toUpperCase()}.WAV` : `SAVE FAILED (${res.status})`;
    } catch {
      status = 'RENDER FAILED';
    } finally {
      busy = false;
    }
  };

  const move = (d: number): void => {
    sel = (sel + d + ITEMS.length) % ITEMS.length;
    if (sel < top) top = sel;
    if (sel >= top + ROWS) top = sel - ROWS + 1;
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': move(-1); break;
      case 'ArrowDown': case 'KeyS': move(1); break;
      case 'PageUp': move(-ROWS); break;
      case 'PageDown': move(ROWS); break;
      case 'Enter': play(ITEMS[sel]); break;
      case 'Space':
        combat = !combat;
        audio.intensity(combat ? 1 : 0);
        status = combat ? 'COMBAT LAYER ON' : 'COMBAT LAYER OFF';
        break;
      case 'KeyR': void render(); break;
      case 'ArrowLeft': case 'ArrowRight': {
        if (!game) break;
        const s = game.settings;
        s.musicVol = Math.max(0, Math.min(1, Math.round((s.musicVol + (e.code === 'ArrowRight' ? 0.1 : -0.1)) * 10) / 10));
        audio.setVolumes(s.musicVol, s.sfxVol);
        status = `MUSIC VOLUME ${Math.round(s.musicVol * 100)}%`;
        break;
      }
    }
  };

  return {
    opaque: true,
    enter(g) {
      game = g;
      addEventListener('keydown', onKey);
    },
    exit() {
      removeEventListener('keydown', onKey);
    },
    update() { /* all input is handled in onKey */ },
    draw(ctx) {
      ctx.fillStyle = '#10142a';
      ctx.fillRect(0, 0, 256, 224);
      drawText(ctx, 'AUDIO LAB', 6, 4, 'yellow');
      drawText(ctx, audio.isMuted() ? 'MUTED (M)' : 'M: MUTE', 250, 4, audio.isMuted() ? 'red' : 'slate', { align: 'right' });
      const pos = position();
      drawText(ctx, pos ? `NOW ${pos.id.toUpperCase()}  BAR ${pos.bar + 1}/${pos.bars}` : 'NOW SILENT', 6, 14, 'cyan');
      drawText(ctx, `COMBAT ${combat ? 'ON ' : 'OFF'}`, 250, 14, combat ? 'hot' : 'mist', { align: 'right' });
      ctx.fillStyle = '#2c3a63';
      ctx.fillRect(4, 25, 248, 1);

      for (let i = 0; i < ROWS; i++) {
        const idx = top + i;
        if (idx >= ITEMS.length) break;
        const it = ITEMS[idx];
        const y = LIST_Y + i * ROW_H;
        if (idx === sel) {
          ctx.fillStyle = '#2c3a63';
          ctx.fillRect(9, y - 1, 243, ROW_H);
          arrow(ctx, 2, y, 'right');
        }
        drawText(ctx, TAG[it.kind], 12, y, TAG_COLOR[it.kind]);
        drawText(ctx, it.id.toUpperCase(), 56, y, idx === sel ? 'white' : 'bone');
      }
      if (top > 0) arrow(ctx, 244, LIST_Y, 'up');
      if (top + ROWS < ITEMS.length) arrow(ctx, 244, LIST_Y + (ROWS - 1) * ROW_H, 'down');

      ctx.fillStyle = '#2c3a63';
      ctx.fillRect(4, 159, 248, 1);
      if (metrics) {
        drawText(ctx, `PEAK ${metrics.peak.toFixed(2)}  RMS ${metrics.rmsDb.toFixed(1)} DB`, 6, 163, 'bone');
        drawText(ctx, `LIMITER ${metrics.limiterDb.toFixed(1)} DB  CLIPPED ${metrics.clipped}`, 6, 172, 'bone');
      } else {
        drawText(ctx, 'NO RENDER YET', 6, 163, 'slate');
      }
      drawText(ctx, status, 6, 182, busy ? 'amber' : 'leaf');
      drawText(ctx, 'UP DOWN SELECT   ENTER PLAY', 6, 196, 'mist');
      drawText(ctx, 'SPACE COMBAT LAYER   R RENDER WAV', 6, 205, 'mist');
      drawText(ctx, `LEFT RIGHT MUSIC VOLUME ${game ? Math.round(game.settings.musicVol * 100) : 0}%`, 6, 214, 'mist');
    },
  };
}
