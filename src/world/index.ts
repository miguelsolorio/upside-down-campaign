// PUBLIC API of world. Owner: World agent.
// createPlayScene is the gameplay scene: stage, sim, camera, gfx, ui overlays, audio, story triggers.
// getStage and the stage data live in stage.ts and stages/; the beat director is in triggers.ts.
export type { PlayOptions } from './types.ts';
export { createPlayScene } from './play.ts';
export { getStage, stageName, stageStart } from './stage.ts';
export type { Stage } from './stage.ts';
