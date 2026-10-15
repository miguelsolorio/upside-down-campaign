// Every game's cart factory by id. The scene starts runs from here.
import type { ArcadeGameId, CartFactory } from './types.ts';
import { createDigDug } from './digdug.ts';
import { createCentipede } from './centipede.ts';
import { createDragonsLair } from './dragonslair.ts';
import { createGalaga } from './galaga.ts';
import { createMsPacman, createPacman } from './pacman.ts';

export const CARTS: Record<ArcadeGameId, CartFactory> = {
  digdug: createDigDug, centipede: createCentipede, dragonslair: createDragonsLair,
  galaga: createGalaga, pacman: createPacman, mspacman: createMsPacman,
};
