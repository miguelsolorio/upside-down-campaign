// Which look a character wears, by the stage that is up. Hopper is in the Uniform through chapter 3 and in the Telogreika, the
// Kamchatka prison look, from chapter 4 (docs/level-10.md): his sprite and his portrait. The play scene and the map call
// setLookStage whenever the stage changes. Pure state, no DOM.
let chapter = 1;

/** Tells gfx which stage is up, so a character's look follows the chapter. */
export function setLookStage(stageId: string): void {
  const n = Number.parseInt(stageId, 10);
  chapter = Number.isFinite(n) && n > 0 ? n : 1;
}

/** True once Hopper wears the Telogreika: from chapter 4 on. Art reads it to pick his sprite and portrait. */
export function hopperInPrison(): boolean {
  return chapter >= 4;
}
