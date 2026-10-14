// The game flow for this pass: title, prologue, chapter card, Level 1, results.
import type { Game } from './core/scene.ts';
import type { PartySeed } from './core/types.ts';
import { flags } from './core/flags.ts';
import { clearSave, loadSave } from './core/save.ts';
import type { SaveData } from './core/save.ts';
import { skipsDialogue } from './core/settings.ts';
import { createChapterCard, createResultsScene, createTitleScene } from './ui/index.ts';
import { createPrologueScene } from './story/index.ts';
import { createPlayScene } from './world/index.ts';
import { createTitleVariant } from './ui/title/index.ts';

const START_PARTY: PartySeed[] = [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }];

export function startGame(g: Game): void {
  // Continue picks up at the saved lights. A new game wipes the save; with "skip story" on, it goes straight into the level.
  const onStart = (mode: 'new' | 'continue'): void => {
    const save = mode === 'continue' ? loadSave() : null;
    if (save) { toPlay(save); return; }
    clearSave();
    if (skipsDialogue()) toPlay(); else toPrologue();
  };
  // ?title=1 to 5 shows one of the title variants instead of the original.
  const toTitle = (): void => g.scenes.go(createTitleVariant(flags.title, { onStart }) ?? createTitleScene({ onStart }));
  const toPrologue = (): void => g.scenes.go(createPrologueScene({ onDone: toCard }));
  const toCard = (): void =>
    g.scenes.go(createChapterCard({ title: 'Chapter one', subtitle: 'The vanishing', onDone: toPlay }));
  const toPlay = (resume?: SaveData): void =>
    g.scenes.go(createPlayScene({
      stageId: resume?.stage ?? flags.stage,
      time: flags.time ?? undefined,
      party: START_PARTY,
      resume,
      // The run is over, so there is nothing left to continue.
      onClear: ({ stats, party }) => {
        clearSave();
        g.scenes.go(createResultsScene({ stats, party, final: true, onContinue: toTitle }));
      },
      onQuit: toTitle,
      onStartOver: () => { clearSave(); toPlay(); },
    }));
  if (flags.skip || flags.bot) toPlay(); else toTitle();
}
