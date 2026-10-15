// The high-score boards, one per game, five rows each. They start with names from the show: MADMAX on top of Dig Dug
// with Dustin's old score under hers, Dustin still first at Centipede, Keith the one to beat at Dragon's Lair. Boards
// are saved in localStorage through core/storage.ts, which is safe when storage is blocked and empty in Node.
import { storage } from '../core/storage.ts';
import { ARCADE_GAMES } from './types.ts';
import type { ArcadeGameId, ArcadeResult } from './types.ts';

export interface ScoreRow { name: string; score: number }
export interface ScoreStore { get(key: string): string | null; set(key: string, value: string): void }

export const BOARD_ROWS = 5;
export const NAME_MAX = 6;
/** The Dig Dug score to beat. About three cleared rounds. */
export const MADMAX_SCORE = 6150;
const STORE_KEY = 'upside-down:arcade:v1';

const rows = (...pairs: [string, number][]): ScoreRow[] => pairs.map(([name, score]) => ({ name, score }));
export const DEFAULT_BOARDS: Readonly<Record<ArcadeGameId, readonly ScoreRow[]>> = {
  digdug: rows(['MADMAX', MADMAX_SCORE], ['DUSTIN', 5870], ['KEITH', 4410], ['LUCAS', 3020], ['MIKE', 1990]),
  centipede: rows(['DUSTIN', 16420], ['MADMAX', 15880], ['KEITH', 11200], ['WILL', 7350], ['LUCAS', 4810]),
  dragonslair: rows(['KEITH', 9540], ['LUCAS', 4210], ['MIKE', 3380], ['WILL', 2160], ['DUSTIN', 1950]),
  galaga: rows(['LUCAS', 18300], ['KEITH', 14550], ['MIKE', 11020], ['WILL', 6230], ['DUSTIN', 5010]),
  pacman: rows(['MIKE', 12480], ['KEITH', 10970], ['WILL', 8320], ['LUCAS', 6110], ['DUSTIN', 4400]),
  mspacman: rows(['WILL', 11360], ['KEITH', 9890], ['MIKE', 7240], ['DUSTIN', 5530], ['LUCAS', 3970]),
};

export interface Board {
  /** The best `n` rows, highest first. */
  top(game: ArcadeGameId, n?: number): ScoreRow[];
  /** The name on the first row. */
  topName(game: ArcadeGameId): string;
  /** Puts a score on the board if it makes the top five and saves. Returns its row (0 is first), or -1. */
  submit(game: ArcadeGameId, name: string, score: number): number;
}

function cleanName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').trim().slice(0, NAME_MAX) || '???';
}

/** Saved rows for one game, or null when they don't look like a board. */
function parseRows(raw: unknown): ScoreRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ScoreRow[] = [];
  for (const r of raw) {
    const row = r as Partial<ScoreRow> | null;
    if (!row || typeof row.name !== 'string' || typeof row.score !== 'number' || !Number.isFinite(row.score)) return null;
    out.push({ name: cleanName(row.name), score: Math.max(0, Math.floor(row.score)) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, BOARD_ROWS);
}

function load(store: ScoreStore): Record<ArcadeGameId, ScoreRow[]> {
  const out = {} as Record<ArcadeGameId, ScoreRow[]>;
  let saved: Record<string, unknown> = {};
  try {
    const raw = store.get(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>;
  } catch { /* a broken save starts from the defaults */ }
  for (const g of ARCADE_GAMES) out[g] = parseRows(saved[g]) ?? DEFAULT_BOARDS[g].map((r) => ({ ...r }));
  return out;
}

export function createBoard(store: ScoreStore = storage): Board {
  const tables = load(store);
  return {
    top: (game, n = BOARD_ROWS) => tables[game].slice(0, n).map((r) => ({ ...r })),
    topName: (game) => tables[game][0]?.name ?? '',
    submit(game, name, score) {
      const s = Math.max(0, Math.floor(score));
      const table = tables[game];
      // A tie goes under the older score, as on a real board.
      let at = table.findIndex((r) => s > r.score);
      if (at < 0) at = table.length;
      if (at >= BOARD_ROWS) return -1;
      table.splice(at, 0, { name: cleanName(name), score: s });
      table.length = Math.min(table.length, BOARD_ROWS);
      store.set(STORE_KEY, JSON.stringify(tables));
      return at;
    },
  };
}

/** Posts a finished run under the player's name and says what it earned. */
export function postScore(board: Board, game: ArcadeGameId, name: string, score: number): ArcadeResult {
  const rank = board.submit(game, name, score);
  return { game, score, rank, beatMadmax: game === 'digdug' && score > MADMAX_SCORE };
}

let shared: Board | null = null;
/** The boards the game shows and saves to. Loaded on first use. */
export function arcadeBoard(): Board {
  shared ??= createBoard();
  return shared;
}
