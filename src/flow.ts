// The game flow: title, prologue, chapter card, then the stages. Each stage ends on the results screen, which leads
// to the Hawkins map. The map enters the next stage or replays a cleared one, and campaign progress (core/progress.ts)
// keeps every hero met so far, so the party for any stage comes from it.
import type { Game } from './core/scene.ts';
import type { PartySeed } from './core/types.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf, defaultParty, levelNumber, nextStage, opensChapter, partyFor } from './core/campaign.ts';
import { flags } from './core/flags.ts';
import { clearProgress, loadProgress, recordClear, writeProgress } from './core/progress.ts';
import type { Progress } from './core/progress.ts';
import { clearSave, loadSave, savingAllowed, writeSave } from './core/save.ts';
import type { SaveData } from './core/save.ts';
import { skipsDialogue } from './core/settings.ts';
import { createChapterCard, createMapScene, createResultsScene, createTitleScene } from './ui/index.ts';
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
  /** Campaign progress. A debug run (?bot, a forced ?level, ...) keeps its own in memory and never reads the real one, and
   *  counts the stages before a ?stage jump as cleared, so the map after it looks like a real run's. */
  const before = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(jump));
  let progress: Progress | null = savingAllowed() ? loadProgress() : before.length ? { v: 1, cleared: before, heroes: [] } : null;
  const known = (): PartySeed[] => progress?.heroes ?? [];

  // CONTINUE picks up at the saved lights, or opens the map when there is no stage in progress. A new game wipes both;
  // with "skip story" on, it goes straight into the level.
  const toTitle = (): void => g.scenes.go(createTitleScene({
    onStart: (mode) => {
      if (mode === 'continue') {
        const save = loadSave();
        if (save) { toPlay(save.stage, save.party, save); return; }
        progress = loadProgress();
        if (progress) { toMap(); return; }
      }
      clearSave();
      clearProgress();
      progress = null;
      if (skipsDialogue()) toPlay(jump, defaultParty(jump)); else toPrologue();
    },
  }));
  const toPrologue = (): void => g.scenes.go(createPrologueScene({ onDone: toCard }));
  const toCard = (): void =>
    g.scenes.go(createChapterCard({ title: 'Chapter one', subtitle: 'The vanishing', onDone: () => toPlay(jump, defaultParty(jump)) }));
  const toMap = (): void => g.scenes.go(createMapScene({
    progress,
    party: (id) => partyFor(id, known()),
    name: stageName,
    onPlay: (id) => toStage(id, partyFor(id, known())),
    onQuit: toTitle,
  }));
  /** A stage opens on its own card, unless the story is skipped. A chapter's first stage shows the chapter the first time. */
  const toStage = (id: string, party: PartySeed[]): void => {
    const chapter = CHAPTERS[chapterOf(id)];
    const firstVisit = !(progress?.cleared ?? []).includes(id);
    if (opensChapter(id) && firstVisit && chapter) { g.scenes.go(createChapterCard({ ...chapter, onDone: () => toPlay(id, party) })); return; }
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
        // Progress marks the stage and keeps every hero at their best. The map is the way on, so the stage save goes.
        progress = recordClear(progress, id, after);
        writeProgress(progress);
        clearSave();
        g.scenes.go(createResultsScene({
          stats, party: after, level: levelNumber(id), final: nextStage(id) === null,
          onContinue: toMap,
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
