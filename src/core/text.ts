// Pure text helpers shared by the UI, the story scripts and the tests.

export const DIALOGUE_COLS = 32;
export const DIALOGUE_ROWS = 3;

/** Greedy word wrap. Honors "\n". Words longer than a line are hard-split. */
export function wrapText(text: string, cols: number = DIALOGUE_COLS): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      let w = word;
      while (w.length > cols) {
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, cols));
        w = w.slice(cols);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= cols) line += ' ' + w;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export function fitsBox(text: string, cols: number = DIALOGUE_COLS, rows: number = DIALOGUE_ROWS): boolean {
  return wrapText(text, cols).length <= rows;
}

/** The em dash is banned in every string, comment and doc. Built from a code point so this file stays clean. */
export const EM_DASH = String.fromCharCode(0x2014);
export function hasEmDash(text: string): boolean {
  return text.includes(EM_DASH);
}
