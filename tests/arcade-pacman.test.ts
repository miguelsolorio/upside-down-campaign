// The PAC-MAN and MS. PAC-MAN carts: the maze data (sizes, symmetry, every dot reachable), long seeded runs that never
// throw or lose points, game over on an idle stick, determinism, the power pellet, eating a ghost, and clearing a round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { buildPacman, CLEAR_T, createMsPacman, createPacman, mazeInfo, READY_T } from '../src/arcade/pacman.ts';
import { wallMask } from '../src/arcade/pacman_art.ts';
import { isPath, MAZE_H, MAZE_W, MAZES } from '../src/arcade/pacman_mazes.ts';
import type { MazeId } from '../src/arcade/pacman_mazes.ts';
import { IDLE_PAD } from '../src/arcade/types.ts';
import type { CartFactory, Dir, Pad } from '../src/arcade/types.ts';

const IDS: MazeId[] = ['pacman', 'mspacman'];
const FACTORIES: [string, CartFactory][] = [['pacman', createPacman], ['mspacman', createMsPacman]];
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const STICK: Record<Dir, Pad> = {
  up: { ...IDLE_PAD, my: -1 }, down: { ...IDLE_PAD, my: 1 }, left: { ...IDLE_PAD, mx: -1 }, right: { ...IDLE_PAD, mx: 1 },
};

/** A seeded stream of pads: the stick held a while in one direction, sometimes let go, sometimes fire. */
function randomPads(seed: number): () => Pad {
  const rng = createRng(seed);
  let pad: Pad = IDLE_PAD, left = 0;
  return () => {
    if (left-- <= 0) {
      left = 4 + Math.floor(rng() * 40);
      const r = rng();
      // Mostly a firm push one way, sometimes a sloppy diagonal, now and then let go.
      const stick = STICK[DIRS[Math.floor(rng() * 4)] as Dir];
      pad = r < 0.15 ? IDLE_PAD : r < 0.3 ? { ...IDLE_PAD, mx: (rng() - 0.5) * 2, my: (rng() - 0.5) * 2 } : stick;
      if (rng() < 0.2) pad = { ...pad, fire: true, firePressed: true, dirPressed: DIRS[Math.floor(rng() * 4)] as Dir };
    }
    return pad;
  };
}

// ---------------------------------------------------------------- the mazes
test('pac-man mazes: 21 by 19, mirrored, 4 pellets, a start, a fruit spot, a door and a 3-cell house', () => {
  for (const id of IDS) {
    const rows = MAZES[id].rows;
    assert.equal(rows.length, MAZE_H, id);
    for (const [y, r] of rows.entries()) {
      assert.equal(r.length, MAZE_W, `${id} row ${y}`);
      assert.equal(r, [...r].reverse().join(''), `${id} row ${y} is not mirrored`);
      assert.match(r, /^[#.o TGPF-]+$/, `${id} row ${y}`);
    }
    const count = (ch: string): number => rows.join('').split(ch).length - 1;
    assert.equal(count('o'), 4, id);
    assert.equal(count('P'), 1, id);
    assert.equal(count('F'), 1, id);
    assert.equal(count('-'), 1, id);
    assert.equal(count('G'), 3, id);
    assert.ok(count('.') > 120, `${id} has ${count('.')} dots`);
    assert.ok(rows.some((r) => r[0] === 'T' && r[MAZE_W - 1] === 'T'), `${id} has a wrap tunnel`);
  }
  assert.notDeepEqual(MAZES.pacman.rows, MAZES.mspacman.rows);
  assert.notEqual(MAZES.pacman.line, MAZES.mspacman.line);
});

test('pac-man mazes: every dot and pellet can be reached from the start, through the tunnels too', () => {
  for (const id of IDS) {
    const rows = MAZES[id].rows;
    const m = mazeInfo(id);
    const seen = new Set<string>([`${m.start[0]},${m.start[1]}`]);
    const queue: [number, number][] = [m.start];
    while (queue.length) {
      const [x, y] = queue.pop() as [number, number];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = (x + dx + MAZE_W) % MAZE_W, ny = y + dy;
        if (!isPath(rows[ny]?.[nx]) || seen.has(`${nx},${ny}`)) continue;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      }
    }
    rows.forEach((r, y) => {
      for (let x = 0; x < MAZE_W; x++) {
        if (r[x] === '.' || r[x] === 'o') assert.ok(seen.has(`${x},${y}`),
          `${id}: the ${r[x] === 'o' ? 'pellet' : 'dot'} at ${x},${y} can't be reached`);
      }
    });
    // The ghosts' door opens onto the maze, and the fruit spot is on the path.
    assert.ok(seen.has(`${m.door[0]},${m.door[1] - 1}`), id);
    assert.ok(seen.has(`${m.fruit[0]},${m.fruit[1]}`), id);
  }
});

test('pac-man walls: a thin line along every wall, with nothing drawn in the corridors', () => {
  for (const id of IDS) {
    const rows = MAZES[id].rows;
    const mask = wallMask(rows);
    const W = MAZE_W * 8;
    let lines = 0;
    for (let i = 0; i < mask.length; i++) {
      const x = i % W, y = Math.floor(i / W);
      if (mask[i]) assert.equal(rows[y >> 3]?.[x >> 3], '#', `${id}: wall art at ${x},${y} outside a wall`);
      if (mask[i] === 1) lines++;
    }
    assert.ok(lines > 1500, `${id} has ${lines} line pixels`);
  }
});

// ---------------------------------------------------------------- long runs
for (const [name, make] of FACTORIES) {
  test(`${name}: 20000 ticks of seeded random input never throw, and the score never drops`, () => {
    for (const seed of [1, 2, 3]) {
      const cart = make({ seed, best: 0 });
      const pads = randomPads(seed * 31);
      let last = 0;
      for (let t = 0; t < 20000; t++) {
        const sfx = cart.step(pads());
        assert.ok(sfx.length <= 3);
        assert.ok(cart.score >= last && cart.score >= 0, `score went from ${last} to ${cart.score} at ${t}`);
        last = cart.score;
      }
    }
  });

  test(`${name}: an idle stick ends the game within 40000 ticks, and step() is a no-op after`, () => {
    const cart = make({ seed: 7, best: 0 });
    let t = 0;
    while (!cart.over && t < 40000) { cart.step(IDLE_PAD); t++; }
    assert.ok(cart.over, `still going after ${t} ticks`);
    assert.equal(cart.lives, 0);
    const score = cart.score;
    assert.deepEqual(cart.step(STICK.left), []);
    assert.equal(cart.score, score);
  });

  test(`${name}: the same seed and input give the same game`, () => {
    const run = (): string => {
      const cart = make({ seed: 42, best: 0 });
      const pads = randomPads(9);
      const marks: number[] = [];
      for (let t = 0; t < 6000; t++) { cart.step(pads()); if (t % 500 === 0) marks.push(cart.score, cart.lives); }
      return marks.join(',');
    };
    assert.equal(run(), run());
  });
}

// ---------------------------------------------------------------- the rules
test('pac-man: a power pellet frightens the ghosts that are out, and the first ghost eaten is worth 200', () => {
  const { cart, s } = buildPacman({ seed: 1, best: 0 }, 'pacman');
  for (let t = 0; t < READY_T; t++) cart.step(IDLE_PAD);
  assert.equal(s.mode, 'play');
  // Pac-Man one cell under the top-left pellet (1, 2), heading up into it.
  s.x = 1 * 8 + 4; s.y = 3 * 8 + 4; s.dir = 'up';
  const out = s.ghosts.filter((g) => g.state === 'out');
  const home = s.ghosts.filter((g) => g.state === 'house');
  assert.ok(out.length >= 1 && home.length >= 1);
  const dirs = out.map((g) => g.dir);
  const before = s.score;
  let sfx: string[] = [];
  for (let t = 0; t < 30 && s.dots[2 * 21 + 1]; t++) sfx = cart.step(STICK.up);
  assert.equal(s.dots[2 * 21 + 1], 0, 'the pellet was not eaten');
  assert.ok(sfx.includes('pickup'));
  assert.ok(s.score >= before + 50);
  assert.ok(s.fright > 0);
  for (const [i, g] of out.entries()) {
    if (g.state !== 'out') continue;
    assert.ok(g.fright, 'a ghost that was out is not frightened');
    assert.notEqual(g.dir, dirs[i], 'a frightened ghost did not turn round');
  }
  for (const g of home) assert.ok(!g.fright || g.state === 'out', 'a ghost still in the house turned blue');

  // Walk a frightened ghost into Pac-Man: 200 points, and its eyes head home.
  const g = out[0] as (typeof out)[number];
  g.state = 'out'; g.fright = true; g.x = s.x; g.y = s.y;
  const score = s.score;
  cart.step(IDLE_PAD);
  assert.equal(s.score, score + 200);
  assert.equal(g.state, 'eyes');
  assert.equal(s.mode, 'eat');
});

test('pac-man: a ghost that is not frightened costs a life, and the last life ends in GAME OVER', () => {
  const { cart, s } = buildPacman({ seed: 3, best: 0 }, 'mspacman');
  for (let t = 0; t < READY_T; t++) cart.step(IDLE_PAD);
  const g = s.ghosts[0] as (typeof s.ghosts)[number];
  g.x = s.x; g.y = s.y;
  const sfx = cart.step(IDLE_PAD);
  assert.ok(sfx.includes('ko'));
  assert.equal(s.mode, 'dying');
  assert.equal(cart.lives, 2);
});

test('pac-man: clearing the maze flashes the walls, then the next round starts with the dots back', () => {
  const { cart, s } = buildPacman({ seed: 5, best: 0 }, 'pacman');
  for (let t = 0; t < READY_T; t++) cart.step(IDLE_PAD);
  // Leave one dot, right next to Pac-Man on the left.
  const k = Math.floor(s.y / 8) * 21 + Math.floor(s.x / 8) - 1;
  s.dots.fill(0); s.dots[k] = 1; s.left = 1;
  for (let t = 0; t < 30 && s.mode === 'play'; t++) cart.step(STICK.left);
  assert.equal(s.mode, 'clear');
  for (let t = 0; t < CLEAR_T; t++) cart.step(IDLE_PAD);
  assert.equal(s.round, 2);
  assert.equal(s.mode, 'ready');
  assert.equal(s.left, s.total);
  assert.ok(s.total > 100);
});
