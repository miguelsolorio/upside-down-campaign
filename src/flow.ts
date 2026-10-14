// The game flow: title, prologue, chapter card, then the stages in order. Each stage ends on the results screen,
// which leads to the next stage with the party carried over, or back to the title after the last one.
import type { Game } from './core/scene.ts';
import type { PartySeed } from './core/types.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf, defaultParty, levelNumber, nextStage, opensChapter, partyFor } from './core/campaign.ts';
import { flags } from './core/flags.ts';
import { clearProgress, loadProgress, recordClear, writeProgress } from './core/progress.ts';
import { clearSave, loadSave, writeSave } from './core/save.ts';
import type { SaveData } from './core/save.ts';
import { skipsDialogue } from './core/settings.ts';
import { createChapterCard, createResultsScene, createTitleScene } from './ui/index.ts';
import { createPrologueScene } from './story/index.ts';
import { createPlayScene, stageName, stageStart } from './world/index.ts';

const FIRST = STAGE_ORDER[0] as string;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];

/** The save that waits at the start of a stage: the party that walks in, nothing fired, nothing killed. */
function entrySave(stage: string, party: PartySeed[]): SaveData {
  const at = stageStart(stage);
  return { v: 1, stage, party, checkpoint: { x: at.x, y: at.y, state: { fired: [], cleared: [] } }, killed: [], openProps: [] };
}

export function startGame(g: Game): void {
  // ?stage= jumps to any stage with the party a normal run would bring. Unknown ids mean the first stage.
  const jump = STAGE_ORDER.includes(flags.stage) ? flags.stage : FIRST;
  /** What the stage on screen was entered with, so START OVER can put the party back as it walked in. */
  let entry: PartySeed[] = defaultParty(jump);

  // Continue picks up at the saved lights. A new game wipes the save; with "skip story" on, it goes straight into the level.
  const toTitle = (): void => g.scenes.go(createTitleScene({
    onStart: (mode) => {
      const save = mode === 'continue' ? loadSave() : null;
      if (save) { toPlay(save.stage, save.party, save); return; }
      clearSave();
      clearProgress();
      if (skipsDialogue()) toPlay(jump, defaultParty(jump)); else toPrologue();
    },
  }));
  const toPrologue = (): void => g.scenes.go(createPrologueScene({ onDone: toCard }));
  const toCard = (): void =>
    g.scenes.go(createChapterCard({ title: 'Chapter one', subtitle: 'The vanishing', onDone: () => toPlay(jump, defaultParty(jump)) }));
  /** A later stage opens on its own card, unless the story is skipped. The first stage of a chapter always shows the chapter. */
  const toStage = (id: string, party: PartySeed[]): void => {
    const chapter = CHAPTERS[chapterOf(id)];
    if (opensChapter(id) && chapter) { g.scenes.go(createChapterCard({ ...chapter, onDone: () => toPlay(id, party) })); return; }
    if (skipsDialogue()) { toPlay(id, party); return; }
    g.scenes.go(createChapterCard({ title: `Level ${WORDS[levelNumber(id)] ?? levelNumber(id)}`, subtitle: stageName(id), onDone: () => toPlay(id, party) }));
  };
  const toPlay = (id: string, party: PartySeed[], resume?: SaveData): void => {
    // A save from the stage's first moment holds the party it was entered with. A mid-stage save does not, so
    // START OVER falls back to the party a stage normally opens with.
    entry = resume ? (resume.checkpoint.state.fired.length === 0 ? resume.party : defaultParty(id)) : party;
    g.scenes.go(createPlayScene({
      stageId: id,
      time: flags.time ?? undefined,
      party,
      resume,
      onClear: ({ stats, party: after }) => {
        // Progress keeps every hero met so far. The next stage's party comes from it: in chapter 2 Eleven is gone and
        // Will joins at the others' average level minus one.
        const progress = recordClear(loadProgress(), id, after);
        writeProgress(progress);
        const next = nextStage(id);
        const carried = next ? partyFor(next, progress.heroes) : [];
        // The next stage's door is the new save point. After the last stage there is nothing left to continue.
        if (next) writeSave(entrySave(next, carried)); else clearSave();
        g.scenes.go(createResultsScene({
          stats, party: after, level: levelNumber(id), final: next === null,
          onContinue: () => (next ? toStage(next, carried) : toTitle()),
        }));
      },
      onQuit: toTitle,
      onStartOver: () => {
        const again = entry;
        if (id === FIRST) clearSave(); else writeSave(entrySave(id, again));
        toPlay(id, again);
      },
    }));
  };

  if (flags.skip || flags.bot) toPlay(jump, defaultParty(jump)); else toTitle();
}
