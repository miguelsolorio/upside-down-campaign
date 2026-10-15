// Map variant 4, "Two Hawkins": the design the owner picked, now the game's own map screen (gfx/map.ts). This card draws it
// exactly as the game does. See map-variations.html.
import type { MapVariant } from './types.ts';
import { drawMapScreen } from '../map.ts';

export const V4: MapVariant = {
  id: 4,
  name: 'Two Hawkins',
  blurb: 'The town above a wavy horizon, the same town hanging below it in the Upside Down. The route drops through the pumpkin patch\'s hole and the map descends with the campaign. This is the version in the game.',
  draw: drawMapScreen,
};
