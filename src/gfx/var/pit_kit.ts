// The Demogorgon pit sheet's room and shared pieces (pit-variations.html), the end of stage 4.1: Hopper alone against a Demogorgon in a pit under the
// Kamchatka prison. The sample room is the pit seen from above: the rim round it, the north wall two tiles deep with the
// beast's gate in it, the floor with stains, bones, a drain and a chain, and the way Hopper came in through the south rim.
// The Demogorgon and Hopper stand in it as the game draws them, at their real sizes. A look gives the painters for the rim,
// the wall, the gate and the floor (pit_a.ts, pit_b.ts, gathered in pit.ts); the bones, stains, drain, chain and the shadow under the wall are
// laid on here so the four looks match.
import type { ColorName } from '../palette.ts';
import { composeDemo } from '../actor_demo.ts';
import { composeFrame } from '../actor_pose.ts';
import { HOPPER } from '../data/hopper.ts';
import { Px } from '../px.ts';
import type { Prop, Room, TC } from './look_kit.ts';
import { paintRoles } from './kit.ts';

export const PIT_ROOM: Room = {
  map: [
    '################',
    '##WWWWWGGWWWWW##',
    '##WWWWWGGWWWWW##',
    '##.....,,.....##',
    '##..b.........##',
    '##.......o..,.##',
    '##.d..........##',
    '##.........b..##',
    '##..,.........##',
    '#######..#######',
  ],
  tiles: [
    { ch: '#', name: 'RIM' }, { ch: 'W', name: 'WALL' }, { ch: 'G', name: 'GATE' }, { ch: '.', name: 'FLOOR' },
    { ch: ',', name: 'STAIN' }, { ch: 'b', name: 'BONES' }, { ch: 'o', name: 'DRAIN' }, { ch: 'd', name: 'CHAIN' },
  ],
  props: ['TORCH', 'DEMOGORGON', 'HOPPER'],
};

export interface PitPaint {
  cap(c: TC): Px;
  /** upper: the wall's top course, under the rim. */
  face(c: TC, upper: boolean): Px;
  gate(c: TC, upper: boolean): Px;
  floor(c: TC): Px;
  stain: ColorName; bone: ColorName; boneShade: ColorName; metal: ColorName; metalHi: ColorName; shade: ColorName;
}

const isWall = (ch: string): boolean => ch === 'W' || ch === 'G';

/** The pit tiles of a look: its painters, with the floor details and the wall's shadow laid on. */
export function pitTile(p: PitPaint, c: TC): Px {
  if (c.ch === '#') return p.cap(c);
  if (c.ch === 'W') return p.face(c, !isWall(c.n));
  if (c.ch === 'G') return p.gate(c, !isWall(c.n));
  const px = p.floor(c);
  if (isWall(c.n)) px.rect(0, 0, 16, 2, p.shade).rect(0, 2, 16, 1, 'ink');
  if (c.w === '#') px.rect(0, 0, 2, 16, p.shade);
  if (c.e === '#') px.rect(14, 0, 2, 16, p.shade);
  if (c.ch === ',') px.ellipse(8, 9, 5, 3, p.stain).ellipse(11, 6, 2, 1.5, p.stain).set(4, 12, p.stain);
  if (c.ch === 'b') {
    px.ellipse(5.5, 6.5, 2.6, 2.4, p.bone).rect(4, 8, 3, 2, p.bone).set(4, 6, 'ink').set(6, 6, 'ink').set(5, 9, p.boneShade);
    for (let i = 0; i < 4; i++) px.rect(9 + (i & 1), 7 + i * 2, 5, 1, p.bone);
    px.rect(9, 7, 1, 7, p.boneShade);
  }
  if (c.ch === 'o') {
    px.ellipse(8, 8, 6, 4.5, 'ink').ellipse(8, 8, 5, 3.6, p.metal);
    for (const x of [5, 7, 9, 11]) px.rect(x, 6, 1, 5, 'ink');
    px.rect(4, 5, 8, 1, p.metalHi);
  }
  if (c.ch === 'd') {
    for (let i = 0; i < 5; i++) {
      const x = 2 + i * 3, y = 3 + i * 2;
      px.rect(x, y, 3, 2, i & 1 ? p.metal : p.metalHi).set(x + 1, y + (i & 1), 'ink');
    }
    px.rect(1, 1, 3, 3, p.metal).set(2, 2, 'ink');
  }
  return px;
}

/** The two actors, as the game draws them: the 1.3 Demogorgon standing at the gate, Hopper from behind facing it. */
export function actors(): Prop[] {
  return [
    { px: composeDemo('down', 'stand', 0, true), x: 112, y: 30, actor: true },
    { px: paintRoles(composeFrame(HOPPER, 'up', 'idle', 0), 16, HOPPER.pal), x: 120, y: 118, actor: true },
  ];
}

/** A wall torch, 8 by 16: a bracket and a flame that changes with the phase. */
export function torch(phase: number, bracket: ColorName, flame: readonly [ColorName, ColorName, ColorName]): Px {
  const p = new Px(8, 16);
  p.rect(3, 8, 2, 7, bracket).rect(2, 8, 4, 1, bracket).rect(2, 14, 4, 1, bracket);
  const lean = [0, 1, 0, -1][phase & 3] as number, h = [6, 7, 6, 5][phase & 3] as number;
  p.ellipse(4, 7, 2.4, 2, flame[0]).line(4, 6, 4 + lean, 8 - h, flame[0]).line(3, 6, 3 + lean, 9 - h, flame[0]);
  p.ellipse(4, 6.5, 1.2, 1.2, flame[1]).set(4 + lean, 8 - h, flame[2]);
  return p.outline('ink');
}

/** The props in the room's order: a torch (and its twin), the Demogorgon, Hopper. */
export function pitProps(t: Px): Prop[] {
  const [demo, hop] = actors();
  return [{ px: t, x: 44, y: 18 }, demo!, hop!, { px: t, x: 204, y: 18 }];
}

