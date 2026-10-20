// The page's half of the recorder: gets the game to a shot's first moment, then makes one frame at a time for the script to collect.
// The script (scripts/demo/record.mjs) calls these through CDP; nothing here runs unless ?capture=1 is on the page.
import { createCardScene } from './cards.ts';
import { OUT_H, OUT_W, createCompositor } from './compositor.ts';
import { mixShot } from './audio.ts';
import type { Bed, MixInfo } from './audio.ts';
import { pcmBase64 } from './mixmath.ts';
import type { AutoPress, ShotSpec, Ud } from './types.ts';

const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
};

export interface SeekResult { found: boolean; ticks: number; error: string | null }

export function createDriver(ud: Ud) {
  const comp = createCompositor(ud);
  let spec: ShotSpec | null = null;
  let start = 0;
  /** Keys down, and the frame to let go on. */
  const held = new Map<string, number>();
  let half: HTMLCanvasElement | null = null;

  return {
    /**
     * Steps the game, with no pictures, until `trigger` (the source of a function of window.__ud) is true or `timeout` ticks have gone.
     * `auto` presses keys on a schedule meanwhile, to get through a title or a line of talk. Leaves the game on its last tick, drawn.
     * With `stopAt` it stops at that tick instead, but still asks the trigger every tick, so the run is the same one that found the trigger.
     */
    seek(trigger: string, timeout: number, auto: AutoPress[], stopAt?: number): SeekResult {
      const test = new Function(`return (${trigger});`)() as (u: Ud) => unknown;
      const down = new Map<string, number>();
      let error: string | null = null;
      const ok = (): boolean => {
        try { return !!test(ud); } catch (e) { error = String((e as Error).message ?? e); return false; }
      };
      const check = (): boolean => { const hit = ok(); return stopAt === undefined ? hit : ud.cap.ticks() >= stopAt; };
      let found = check();
      for (let k = 0; k < timeout && !found; k++) {
        const t = ud.cap.ticks();
        for (const a of auto) {
          if (t >= a.from && (t - a.from) % a.every === 0) { key('keydown', a.code); down.set(a.code, t + (a.hold ?? 4)); }
        }
        for (const [code, until] of down) if (t >= until) { key('keyup', code); down.delete(code); }
        ud.cap.advance(1);
        found = check();
      }
      for (const code of down.keys()) key('keyup', code);
      ud.cap.step(0);
      return { found, ticks: ud.cap.ticks(), error: found ? null : error };
    },

    /** Starts a shot on the tick the game is on: its camera, its keys and, for a card, the card. */
    begin(s: ShotSpec): number {
      spec = s;
      start = ud.cap.ticks();
      held.clear();
      comp.begin(s);
      if (s.card) { ud.g.scenes.go(createCardScene(s.card)); ud.cap.step(0); }
      return start;
    },

    /** Frame `i` of the shot as a PNG data URL: the game ticks once (not before the first frame), the compositor draws, the canvas is read. */
    frame(i: number, draft: boolean): string {
      const s = spec as ShotSpec;
      if (i === 0) ud.cap.step(0);
      else {
        for (const [code, until] of held) if (i >= until) { key('keyup', code); held.delete(code); }
        for (const k of s.keys ?? []) {
          if (Math.max(1, k.at) === i) { key('keydown', k.code); held.set(k.code, i + (k.hold ?? 3)); }
        }
        ud.cap.step(1);
      }
      comp.compose(i, ud.cap.ticks());
      if (!draft) return comp.out.toDataURL('image/png');
      if (!half) { half = document.createElement('canvas'); half.width = OUT_W / 2; half.height = OUT_H / 2; }
      const c = half.getContext('2d') as CanvasRenderingContext2D;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(comp.out, 0, 0, half.width, half.height);
      return half.toDataURL('image/png');
    },

    /** The shot's sound as 16-bit PCM in base64, mono at 44.1 kHz, exactly as long as its frames. */
    async mix(fadeIn: number, fadeOut: number, bed?: Bed): Promise<{ pcm: string; info: MixInfo }> {
      const s = spec as ShotSpec;
      const r = await mixShot(ud.cap.events, start, s.len, { in: fadeIn, out: fadeOut }, bed);
      return { pcm: pcmBase64(r.samples), info: r.info };
    },
  };
}
