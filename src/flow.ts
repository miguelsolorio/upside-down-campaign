// The game flow: title, prologue, chapter card, then the stages. Each stage ends on the results screen, which leads
// to the Hawkins map. The map enters the next stage or replays a cleared one, and campaign progress (core/progress.ts)
// keeps every hero met so far, so the party for any stage comes from it.
import type { Game } from './core/scene.ts';
import type { HeroId, PartySeed } from './core/types.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf, defaultParty, levelNumber, nextStage, opensChapter, partyFor } from './core/campaign.ts';
import { flags } from './core/flags.ts';
import { clearProgress, loadProgress, recordClear, withPicks, writeProgress } from './core/progress.ts';
import type { Progress } from './core/progress.ts';
import { clearSave, loadSave, savingAllowed, writeSave } from './core/save.ts';
import type { SaveData } from './core/save.ts';
import { skipsDialogue } from './core/settings.ts';
import { createChapterCard, createMapScene, createResultsScene, createTitleScene } from './ui/index.ts';
import { createPrologueScene } from './story/index.ts';
import { createPlayScene, stageName, stageStart } from './world/index.ts';

const FIRST = STAGE_ORDER[0] as string;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];

/**
 * The save that waits at the start of a stage: the party that walks in, nothing fired, nothing killed. A hero who is new
 * to the party has no XP in the seed (Will in 2.1, Max and Steve in 2.2), and the loader refuses a hero without a level
 * and XP, so the whole save would read as none. The sim treats a missing level as 1 and a missing XP as 0, so fill them in.
 */
export function entrySave(stage: string, party: PartySeed[]): SaveData {
  const at = stageStart(stage);
  const seeds = party.map((p) => ({ ...p, level: p.level ?? 1, xp: p.xp ?? 0 }));
  return { v: 1, stage, party: seeds, checkpoint: { x: at.x, y: at.y, state: { fired: [], cleared: [] } }, killed: [], openProps: [] };
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
    // From 2.2 on the map asks who goes (docs/map-screen.md, "Party picks"): the band shows the last picks, fixed up for the
    // stage, and a confirmed pick is remembered for next time.
    party: (id) => partyFor(id, known(), progress?.picks),
    name: stageName,
    onPlay: (id, picks?: HeroId[]) => {
      if (picks) { progress = withPicks(progress, picks); writeProgress(progress); }
      toStage(id, partyFor(id, known(), picks ?? progress?.picks));
    },
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
    // A save from the stage's first moment holds the party it was entered with. A mid-stage save does not, so START OVER
    // builds the party the map would give now: the last picks and the best level of each hero, not the stage's default.
    entry = resume ? (resume.checkpoint.state.fired.length === 0 ? resume.party : partyFor(id, known(), progress?.picks)) : party;
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
