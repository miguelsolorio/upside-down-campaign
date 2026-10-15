// The two mazes the Pac-Man engine runs, as rows of characters 21 cells wide and 19 tall (field rows 1 to 19, under the
// score strip and over the lives). Pac-Man's maze has one wrap tunnel through the middle and blue lines on black, and
// Ms. Pac-Man's has two tunnels, a different run of walls and pink lines on a dark red fill. Both are mirror images
// left to right, every dot can be reached, there are no dead ends and no open 2 by 2 squares.
//
// Legend: '#' wall, '.' dot, 'o' power pellet, ' ' open with no dot, 'T' tunnel (open, no dot, ghosts slow down, and
// the row wraps at the edges), '-' the ghost house door, 'G' inside the ghost house, 'P' where the player starts, 'F'
// where the fruit shows up (open, no dot).
import type { ColorName } from '../gfx/palette.ts';

export type MazeId = 'pacman' | 'mspacman';

export interface MazeDef {
  readonly rows: readonly string[];
  /** The thin line along the wall edges, the fill inside the walls (black is none), the door bar and the dots. */
  readonly line: ColorName;
  readonly fill: ColorName;
  readonly door: ColorName;
  readonly dot: ColorName;
}

/** Maze width and height in cells. */
export const MAZE_W = 21;
export const MAZE_H = 19;

export const MAZES: Readonly<Record<MazeId, MazeDef>> = {
  pacman: {
    line: 'blue', fill: 'black', door: 'pink', dot: 'skin0',
    rows: [
      '#####################',
      '#.........#.........#',
      '#o###.###.#.###.###o#',
      '#...................#',
      '#.###.#.#####.#.###.#',
      '#.....#...#...#.....#',
      '#####.###.#.###.#####',
      '#####.#       #.#####',
      '#####.# ##-## #.#####',
      'TTTTT.  #GGG#  .TTTTT',
      '#####.# ##### #.#####',
      '#####.#   F   #.#####',
      '#####.#.#####.#.#####',
      '#.........#.........#',
      '#o###.###.#.###.###o#',
      '#...#.....P.....#...#',
      '#.#.#####.#.#####.#.#',
      '#...................#',
      '#####################',
    ],
  },
  mspacman: {
    line: 'pink', fill: 'blood1', door: 'cream', dot: 'white',
    rows: [
      '#####################',
      '#o...#.........#...o#',
      '#.##.#.###.###.#.##.#',
      '#...................#',
      '#.##.#.##.#.##.#.##.#',
      '#......##...##......#',
      '###.#.#########.#.###',
      'TTT....       ....TTT',
      '###.### ##-## ###.###',
      '###.#.. #GGG# ..#.###',
      '###.#.# ##### #.#.###',
      'TTT....   F   ....TTT',
      '###.#.#########.#.###',
      '#...#...........#...#',
      '#o#.#.###.#.###.#.#o#',
      '#.....#...P...#.....#',
      '#.###.#.#####.#.###.#',
      '#...................#',
      '#####################',
    ],
  },
};

/** The ghosts can't pass these, and neither can the player. The door opens only for ghosts going in or out. */
export const isWall = (ch: string | undefined): boolean => ch === undefined || ch === '#';
/** Open for the player and for ghosts out in the maze. */
export const isPath = (ch: string | undefined): boolean => ch !== undefined && ch !== '#' && ch !== '-' && ch !== 'G';
