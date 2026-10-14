# Agent notes

## Previewing the game

Always open the game muted. Put `?mute=1` on every game URL you open in a preview or browser tab, and keep it there when you add other flags:

- http://127.0.0.1:5173/?mute=1
- http://127.0.0.1:5173/?mute=1&rush=1&stage=1.2
- http://127.0.0.1:5173/?mute=1&dev=1

The preview pane sits next to the chat, and the game plays music and effects as soon as the pane has focus, so an unmuted preview is loud for whoever is at the keyboard.

- `.claude/launch.json` can't carry the flag, since a preview URL has to be just the origin. After `preview_start` opens the tab, navigate it to the `?mute=1` URL before you click or press anything.
- A reload keeps the flag. A new URL doesn't, so add it again each time you navigate.
- Don't press `M` in the preview. It toggles the mute off.
- Leave the flag off only when the user asks to hear the sound.

The other pages (`social.html`, `touch-controls.html`, the `*-variations.html` pages) don't play sound and don't need it.
