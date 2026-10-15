// The page glue the chapter 4 sheets share: one card per option (number, name, Pick button, the idea, the canvas), the picks
// bar, an optional animation tick, and window.__sheet(), which stacks the cards into one image (sheet_png.ts) and writes it to
// docs/screenshots/<file>.png through the dev server. The pages play no sound.
import { saveSheet, sheetImage } from './sheet_png.ts';

export interface PageOpt { name: string; note: string }
export interface Made { canvas: HTMLCanvasElement; draw?: (phase: number) => void; meta?: string }
export interface PageSpec<T extends PageOpt> {
  opts: T[];
  make: (o: T) => Made;
  width: number;
  /** The image's title and file name: docs/screenshots/<file>.png. */
  title: string;
  file: string;
  /** Repaint every this many ms with a phase that counts up, while the box with id "anim" is ticked. */
  tick?: number;
}

export function mountSheet<T extends PageOpt>(spec: PageSpec<T>): void {
  const list = document.getElementById('cards') as HTMLElement, out = document.getElementById('pick') as HTMLElement;
  let picked: T | null = null;
  const cards: { o: T; card: HTMLElement; btn: HTMLButtonElement; made: Made }[] = [];
  spec.opts.forEach((o, i) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<div class="head"><span class="badge">${i + 1}</span><h3></h3><button class="pick" type="button" aria-pressed="false">Pick</button></div><p class="note"></p>`;
    (card.querySelector('h3') as HTMLElement).textContent = o.name;
    (card.querySelector('.note') as HTMLElement).textContent = o.note;
    const made = spec.make(o);
    made.canvas.style.maxWidth = spec.width + 'px';
    card.append(made.canvas);
    if (made.meta) {
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = made.meta;
      card.append(meta);
    }
    const btn = card.querySelector('.pick') as HTMLButtonElement;
    btn.setAttribute('aria-label', `Pick ${o.name}`);
    btn.onclick = () => {
      picked = picked === o ? null : o;
      for (const c of cards) { const on = picked === c.o; c.card.classList.toggle('picked', on); c.btn.setAttribute('aria-pressed', String(on)); }
      out.textContent = '';
      if (picked) { const b = document.createElement('b'); b.textContent = picked.name; out.append(b); } else out.textContent = 'none yet';
    };
    cards.push({ o, card, btn, made });
    list.append(card);
  });

  const anim = document.getElementById('anim') as HTMLInputElement | null;
  if (anim && spec.tick) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) anim.checked = false;
    let phase = 0;
    setInterval(() => {
      if (!anim.checked || document.hidden) return;
      phase++;
      for (const c of cards) c.made.draw?.(phase);
    }, spec.tick);
  }

  (window as unknown as { __sheet: () => Promise<string> }).__sheet = () => {
    for (const c of cards) c.made.draw?.(0);
    const img = sheetImage(spec.title, cards.map((c, i) => ({ num: i + 1, name: c.o.name, canvas: c.made.canvas })));
    return saveSheet(spec.file, img);
  };
}
