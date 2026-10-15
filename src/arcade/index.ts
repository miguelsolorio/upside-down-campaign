// PUBLIC API of arcade: the playable cabinets in the Palace (stage 2.1). World opens the scene when the player uses a
// cabinet; gfx reads the cabinet table and the board for the attract screens in the world.
export { createArcadeScene } from './scene.ts';
export type { ArcadeSceneOpts, ArcadeVisit } from './scene.ts';
export { CABINET_GAMES, TITLES, gameFor } from './cabinets.ts';
export { MADMAX_SCORE, arcadeBoard, createBoard, postScore } from './scores.ts';
export type { Board, ScoreRow } from './scores.ts';
export type { ArcadeGameId, ArcadeResult } from './types.ts';
