// Which look a character wears, by the stage that is up. Hopper is in the Uniform through chapter 3 and in the Telogreika, the
// Kamchatka prison look, from chapter 4 (docs/level-10.md): his sprite and his portrait. The play scene and the map call
// setLookStage whenever the stage changes. The Abyss (stage 5.2) dresses two props in a look of its own (props_abyss.ts). Pure state, no DOM.
let chapter = 1;
let abyss = false;

/** Tells gfx which stage is up, so a character's look follows the chapter. */
export function setLookStage(stageId: string): void {
  const n = Number.parseInt(stageId, 10);
  chapter = Number.isFinite(n) && n > 0 ? n : 1;
  abyss = stageId === '5.2';
}

/** True while stage 5.2, the Abyss, is up: its hidden bridge and its rock fall are drawn in its look. */
export function inAbyss(): boolean {
  return abyss;
}

/** True once Hopper wears the Telogreika: from chapter 4 on. Art reads it to pick his sprite and portrait. */
export function hopperInPrison(): boolean {
  return chapter >= 4;
}
