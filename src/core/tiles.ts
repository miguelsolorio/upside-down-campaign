// Tile legend for ASCII stage maps. One character per 16x16 tile.
// gfx draws every TileName. World builds the collision Grid from `solid`.
import type { Grid } from './types.ts';

export type TileName =
  | 'grass' | 'grass2' | 'flowers' | 'dirt' | 'trail' | 'road' | 'roadline' | 'planks' | 'gravel'
  | 'shallows' | 'creek'
  | 'pine' | 'deadtree' | 'bush' | 'rock' | 'stump'
  | 'fence' | 'labfence'
  | 'housewall' | 'houseroof' | 'housedoor' | 'shedwall' | 'shedroof'
  | 'lamp' | 'mailbox'
  | 'labfloor' | 'labfloor2' | 'hazard' | 'labwall' | 'labcap' | 'vent' | 'pipe' | 'glass' | 'cage'
  // Lab dressing, so each room has its own look. Floors, cables, drains, stains and creeping vines are walkable.
  | 'locker' | 'bench' | 'cabinet' | 'shelf' | 'cable' | 'drain' | 'stain' | 'vines' | 'mass'
  | 'tilegreen' | 'carpet' | 'wallsign' | 'plate'
  // Hawkins Middle School (stage 1.3, night).
  | 'schoolfloor' | 'checker' | 'gymfloor' | 'schoolwall' | 'schoolcap' | 'lockerwall' | 'desk' | 'chalkboard'
  | 'trophy' | 'table' | 'counter' | 'bleachers' | 'brick'
  // The Palace Arcade, Main Street and Merrill's pumpkin patch (stage 2.1, day).
  | 'arcadecarpet' | 'arcadewall' | 'sidewalk' | 'storefront' | 'furrow' | 'pumpkin' | 'rotpumpkin' | 'haybale'
  | 'barnwall' | 'barnroof' | 'corn' | 'rot' | 'hole'
  // The tunnels under Hawkins (stage 2.2, night).
  | 'tunnelfloor' | 'tunnelcap' | 'tunnelwall' | 'roots' | 'veins' | 'nest' | 'ladder'
  // The Lab's overrun sublevel and the Gate (stage 2.3, night). The rest of 2.3 is lab tiles.
  | 'fleshfloor' | 'fleshwall' | 'tear'
  // Starcourt Mall (stage 3.1).
  | 'mallfloor' | 'mallband' | 'mallcap' | 'mallwall' | 'mallglass' | 'shopfront' | 'shopshut' | 'planter' | 'fountain'
  | 'railing' | 'scoops' | 'goo' | 'servicefloor' | 'lift'
  // The Russian base under the mall (stage 3.2).
  | 'basefloor' | 'basegrate' | 'basecap' | 'basewall' | 'ammo' | 'bunk' | 'cell' | 'machine' | 'keyfloor'
  // Starcourt's food court and its back of house (stage 3.3).
  | 'foodfloor' | 'foodband' | 'skyfloor' | 'stallcap' | 'stall' | 'kitchenfloor' | 'fryer' | 'escalator'
  // The Kamchatka camp and the Demogorgon pit under it (stage 4.1).
  | 'snow' | 'drift' | 'snowpath' | 'wire' | 'campcap' | 'campwall' | 'celldoor' | 'campfloor' | 'grate' | 'campcrate' | 'barrel'
  | 'pitcap' | 'pitwall' | 'pitfloor' | 'pitbar'
  // The Hellfire Club's classroom and the Creel House (stage 4.2).
  | 'clubcap' | 'clubwall' | 'clubboard' | 'clubposter' | 'clubwindow' | 'clubdoor' | 'clubshelf' | 'clubfloor' | 'clubdesk' | 'dndtable'
  | 'creelcap' | 'creelwall' | 'creelwin' | 'creelfloor' | 'creelrug' | 'creelhole' | 'creelstairs' | 'creelfurn'
  // Upside Down Hawkins and the roof of Eddie's trailer (stage 4.3), and Vecna's attic (stage 4.4).
  | 'udroad' | 'udline' | 'udwalk' | 'udlawn' | 'udveins' | 'udhouse' | 'udwindow' | 'uddoor' | 'udroof' | 'udtrailer' | 'udfence'
  | 'udtree' | 'roofdeck' | 'roofedge'
  | 'atticroof' | 'atticwall' | 'atticfloor' | 'atticrug' | 'atticeave'
  // Hawkins under lockdown (stage 5.1): the town at dusk with the army laid over it, and the Lab's halls dressed by the army.
  | 'lockroad' | 'lockline' | 'lockstop' | 'lockwalk' | 'locklawn' | 'lockroof' | 'lockhouse' | 'lockvine' | 'lockdoor' | 'rift0' | 'rift1' | 'rift2'
  | 'armyfloor' | 'armycable' | 'armycable2' | 'armycrate' | 'armycrate2' | 'armywall'
  // The Abyss (stage 5.2) and the heart of it (stage 5.3).
  | 'abysslawn' | 'abyssroad' | 'abyssline' | 'abyssporch' | 'abyssclass' | 'abysscliff' | 'abyssunder' | 'abyssgap' | 'abyssbridgeh' | 'abyssbridgev'
  | 'heartfloor' | 'heartwall' | 'heartrim';

/** drop: a solid tile that is a drop into the void (the Abyss's gaps, cliffs and rock). buildGrid lists them in Grid.drop. */
export interface TileDef { name: TileName; solid: boolean; animated?: boolean; drop?: boolean }

export const TILES: Record<string, TileDef> = {
  '.': { name: 'grass', solid: false },
  ',': { name: 'grass2', solid: false },
  'f': { name: 'flowers', solid: false },
  ':': { name: 'dirt', solid: false },
  '-': { name: 'trail', solid: false },
  '=': { name: 'road', solid: false },
  '_': { name: 'roadline', solid: false },
  'p': { name: 'planks', solid: false },
  'g': { name: 'gravel', solid: false },
  'w': { name: 'shallows', solid: false, animated: true },
  '~': { name: 'creek', solid: true, animated: true },
  'T': { name: 'pine', solid: true },
  't': { name: 'deadtree', solid: true },
  'b': { name: 'bush', solid: true },
  'r': { name: 'rock', solid: true },
  'k': { name: 'stump', solid: true },
  'F': { name: 'fence', solid: true },
  'X': { name: 'labfence', solid: true },
  'H': { name: 'housewall', solid: true },
  'h': { name: 'houseroof', solid: true },
  'd': { name: 'housedoor', solid: true },
  'S': { name: 'shedwall', solid: true },
  's': { name: 'shedroof', solid: true },
  'l': { name: 'lamp', solid: true },
  'm': { name: 'mailbox', solid: true },
  // Hawkins Lab (stage 1.2). Floors and the vent grate are walkable. Walls, pipes, cages and glass are not.
  // Glass is solid but see-through: hero shots fly over terrain, so a relay behind it can still be hit.
  'o': { name: 'labfloor', solid: false },
  'O': { name: 'labfloor2', solid: false },
  'z': { name: 'hazard', solid: false },
  'W': { name: 'labwall', solid: true },
  'V': { name: 'labcap', solid: true },
  'v': { name: 'vent', solid: false },
  'i': { name: 'pipe', solid: true },
  'G': { name: 'glass', solid: true },
  'c': { name: 'cage', solid: true },
  // Lab dressing. A locker, bench, cabinet or shelf is furniture you walk around. A mass is Upside Down growth
  // that has swollen out of the wall. Vines creep across the floor and can be walked through.
  'L': { name: 'locker', solid: true },
  'B': { name: 'bench', solid: true },
  'C': { name: 'cabinet', solid: true },
  'N': { name: 'shelf', solid: true },
  'q': { name: 'cable', solid: false },
  'D': { name: 'drain', solid: false },
  'x': { name: 'stain', solid: false },
  'U': { name: 'vines', solid: false },
  'M': { name: 'mass', solid: true },
  // Room floors: green tile for the animal lab, dark carpet for the records wing, a metal plate under a hazard.
  'a': { name: 'tilegreen', solid: false },
  'e': { name: 'carpet', solid: false },
  'E': { name: 'plate', solid: false },
  // A wall face with a painted sign or number on it. Solid like any wall.
  'Y': { name: 'wallsign', solid: true },
  // Hawkins Middle School (stage 1.3). Walls are a schoolcap row over a schoolwall row, like the Lab. Lockers,
  // chalkboards and the trophy case are wall faces. Desks, tables, the counter and the bleachers are furniture.
  'n': { name: 'schoolfloor', solid: false },
  'j': { name: 'checker', solid: false },
  'u': { name: 'gymfloor', solid: false },
  'J': { name: 'schoolwall', solid: true },
  'K': { name: 'schoolcap', solid: true },
  'A': { name: 'lockerwall', solid: true },
  'P': { name: 'desk', solid: true },
  'Q': { name: 'chalkboard', solid: true },
  'R': { name: 'trophy', solid: true },
  'I': { name: 'table', solid: true },
  'Z': { name: 'counter', solid: true },
  '#': { name: 'bleachers', solid: true },
  '%': { name: 'brick', solid: true },
  // Stage 2.1: the arcade, Main Street, the pumpkin patch. Furrows, rot and the hole are walkable.
  '+': { name: 'arcadecarpet', solid: false },
  '&': { name: 'arcadewall', solid: true },
  '/': { name: 'sidewalk', solid: false },
  '@': { name: 'storefront', solid: true },
  '^': { name: 'furrow', solid: false },
  '*': { name: 'pumpkin', solid: true },
  '$': { name: 'rotpumpkin', solid: true },
  '0': { name: 'haybale', solid: true },
  '[': { name: 'barnwall', solid: true },
  ']': { name: 'barnroof', solid: true },
  '|': { name: 'corn', solid: true },
  ';': { name: 'rot', solid: false },
  '<': { name: 'hole', solid: false },
  // Stage 2.2: the tunnels. Root walls are a tunnelcap row over a tunnelwall row facing the floor below, like the Lab.
  // Roots and glowing veins grow over the floor and are walked over. A nest is a clump of pods and membrane you walk
  // around. The ladder at the end is walkable.
  '1': { name: 'tunnelfloor', solid: false },
  '2': { name: 'tunnelcap', solid: true },
  '3': { name: 'tunnelwall', solid: true },
  '4': { name: 'roots', solid: false },
  '5': { name: 'veins', solid: false, animated: true },
  '6': { name: 'nest', solid: true },
  '7': { name: 'ladder', solid: false },
  // Stage 2.3: the Lab swallowed by the Upside Down. Flesh grows over the lab floor and walls; a tear is a glowing
  // crack in the floor near the Gate, walked over. The Gate itself is a rift prop.
  '8': { name: 'fleshfloor', solid: false },
  '9': { name: 'fleshwall', solid: true },
  '!': { name: 'tear', solid: false, animated: true },
  // Chapter 3. The printable ASCII is nearly used up, so these take the last free punctuation and then Latin-1 signs. Each is
  // one UTF-16 unit, so row[x] still reads one tile.
  // Stage 3.1: Starcourt Mall. Walls are a mallcap row over a mallwall row facing the floor below, like the Lab, with shop
  // fronts (lit windows), shut shops (a rolled-down grille) and glass doors set in the wall row. The band is the floor's
  // inlaid stripe. The fountain, planters, the upper balcony's railing and the Scoops Ahoy counter are walked around.
  // Goo is the Flayed's mess, walked over. The service floor is bare concrete behind the shops. The lift is the freight lift
  // down to the base, walked onto.
  '¢': { name: 'mallfloor', solid: false },
  '"': { name: 'mallband', solid: false },
  '(': { name: 'mallcap', solid: true },
  ')': { name: 'mallwall', solid: true },
  '?': { name: 'mallglass', solid: true },
  '{': { name: 'shopfront', solid: true },
  '}': { name: 'shopshut', solid: true },
  'y': { name: 'planter', solid: true },
  '>': { name: 'fountain', solid: true, animated: true },
  '`': { name: 'railing', solid: true },
  '£': { name: 'scoops', solid: true },
  '¨': { name: 'goo', solid: false, animated: true },
  '÷': { name: 'servicefloor', solid: false },
  'Þ': { name: 'lift', solid: false },
  // Stage 3.2: the Russian base. Walls are a basecap row over a basewall row. Grating is walked over. Ammo crates, bunks,
  // cells and the Key's machine are solid; the crates are cover from rifle fire. The key floor is the chamber's ringed floor.
  '·': { name: 'basefloor', solid: false },
  '°': { name: 'basegrate', solid: false },
  '¯': { name: 'basecap', solid: true },
  '¦': { name: 'basewall', solid: true },
  '±': { name: 'ammo', solid: true },
  '§': { name: 'bunk', solid: true },
  '×': { name: 'cell', solid: true },
  '¤': { name: 'machine', solid: true, animated: true },
  'º': { name: 'keyfloor', solid: false },
  // Stage 3.3: the food court. Walls are a stallcap row over a stall row: the food stalls' counters and menu boards facing the
  // floor below. The food floor is the court's tile, the band the colored ring round it, and the sky floor the patch of floor
  // under the skylight, lit by the moon through the glass. Kitchens have a red quarry floor and solid fryer lines. The
  // escalator is walked over, up from the lower concourse to the balcony.
  'À': { name: 'foodfloor', solid: false },
  'Á': { name: 'foodband', solid: false },
  'Æ': { name: 'skyfloor', solid: false },
  'Â': { name: 'stallcap', solid: true },
  'Ã': { name: 'stall', solid: true },
  'Ä': { name: 'kitchenfloor', solid: false },
  'Ç': { name: 'fryer', solid: true },
  'Å': { name: 'escalator', solid: false },
  // Stage 4.1: the Kamchatka camp at night (docs/level-10.md). Snow, a drift (a snowbank, walked round), the trampled path, the wire
  // fence. The block's walls are a campcap row over a campwall row facing the floor below, with barred cell doors set in the face;
  // its floor is bare concrete with a grate here and there. Crates and burning barrels stand in the yard as cover. The pit under the
  // camp is rock and timber: a pitcap row over a pitwall row, a dirt floor, and the plank barricade over the beast's tunnel.
  'È': { name: 'snow', solid: false },
  'É': { name: 'drift', solid: true },
  'Ê': { name: 'snowpath', solid: false },
  'Ë': { name: 'wire', solid: true },
  'Ì': { name: 'campcap', solid: true },
  'Í': { name: 'campwall', solid: true },
  'Î': { name: 'celldoor', solid: true },
  'Ï': { name: 'campfloor', solid: false },
  'Ð': { name: 'grate', solid: false },
  'Ñ': { name: 'campcrate', solid: true },
  'Ò': { name: 'barrel', solid: true, animated: true },
  'Ó': { name: 'pitcap', solid: true },
  'Ô': { name: 'pitwall', solid: true },
  'Õ': { name: 'pitfloor', solid: false },
  'Ö': { name: 'pitbar', solid: true },
  // Stage 4.2: the Hellfire Club and the Creel House (docs/level-11.md). The club is a Hawkins High classroom: a clubcap row over a
  // clubwall row, with the chalkboard, posters, windows (rain and lightning on the glass), the door and the bookcase set in the face,
  // linoleum, desks in rows and the D&D table in the middle. The Creel House is a creelcap row over a creelwall row with boarded
  // windows in the face, floorboards, a moth-eaten rug, holes in the floor, the stairs and furniture under sheets. The house also has a
  // memory skin, Blood red, that the bake paints the same letters in (bakeStage(rows, night, 'memory')).
  'Ø': { name: 'clubcap', solid: true },
  'Ù': { name: 'clubwall', solid: true },
  'Ú': { name: 'clubboard', solid: true },
  'Û': { name: 'clubposter', solid: true },
  'Ü': { name: 'clubwindow', solid: true, animated: true },
  'Ý': { name: 'clubdoor', solid: true },
  'ß': { name: 'clubshelf', solid: true },
  'à': { name: 'clubfloor', solid: false },
  'á': { name: 'clubdesk', solid: true },
  'â': { name: 'dndtable', solid: true },
  'ã': { name: 'creelcap', solid: true },
  'ä': { name: 'creelwall', solid: true },
  'å': { name: 'creelwin', solid: true },
  'æ': { name: 'creelfloor', solid: false },
  'ç': { name: 'creelrug', solid: false },
  'è': { name: 'creelhole', solid: true },
  'é': { name: 'creelstairs', solid: true },
  'ê': { name: 'creelfurn', solid: true },
  // Stage 4.3: Hawkins in the Upside Down under the Blue storm (docs/level-12.md). The road, its center line, the sidewalk, dead lawns
  // and veins over them are walked on. House fronts with their windows and doors face the street under the roofs seen from above;
  // trailers, fences and dead trees are walked round. Eddie's trailer has a flat roof deck, the song's arena, edged by its lip. Latin-1
  // runs out here (chapter 5 holds the rest, ó to ÿ), so the stage takes Latin Extended-A from Ā on, still one UTF-16 unit each.
  'ë': { name: 'udroad', solid: false },
  'ì': { name: 'udline', solid: false },
  'í': { name: 'udwalk', solid: false },
  'î': { name: 'udlawn', solid: false },
  'ï': { name: 'udveins', solid: false, animated: true },
  'ð': { name: 'udhouse', solid: true },
  'ñ': { name: 'udwindow', solid: true },
  'ò': { name: 'uddoor', solid: true },
  'Ā': { name: 'udroof', solid: true },
  'ā': { name: 'udtrailer', solid: true },
  'Ă': { name: 'udfence', solid: true },
  'ă': { name: 'udtree', solid: true },
  'Ą': { name: 'roofdeck', solid: false },
  'ą': { name: 'roofedge', solid: true },
  // Stage 4.4: Vecna's attic in the Creel House (docs/level-13.md). The underside of the roof over a knee wall, floorboards with a rug
  // where he stands, and the eaves along the side walls, low floor where the cover sits. The house below is the creel letters baked in
  // their Upside Down skin (StageData.skin).
  'Ć': { name: 'atticroof', solid: true },
  'ć': { name: 'atticwall', solid: true },
  'Ĉ': { name: 'atticfloor', solid: false },
  'ĉ': { name: 'atticrug', solid: false },
  'Ċ': { name: 'atticeave', solid: false },
  // Chapter 5 (docs/level-14.md, docs/level-15.md). These took the Latin-1 signs that were left, and the top of the lowercase run,
  // while chapter 4's last two stages took ë to ò and the Latin Extended-A run from Ā.
  // Stage 5.1: the town at dusk. Road, the double yellow line, the white stop line, sidewalk and trampled lawn are walked; the house
  // front (roof, a wall, a wall under vines, a taped door) is not. A rift is three tiles that join, a red tear in the asphalt, walked
  // over. Inside, the Lab's floor, two cable runs, two stacks of crates and an army-dressed wall.
  '¡': { name: 'lockroad', solid: false },
  '¥': { name: 'lockline', solid: false },
  '©': { name: 'lockstop', solid: false },
  '¬': { name: 'lockwalk', solid: false },
  '®': { name: 'locklawn', solid: false },
  '²': { name: 'lockroof', solid: true },
  '³': { name: 'lockhouse', solid: true },
  'µ': { name: 'lockvine', solid: true },
  '¶': { name: 'lockdoor', solid: true },
  '¹': { name: 'rift0', solid: false, animated: true },
  '»': { name: 'rift1', solid: false, animated: true },
  '¼': { name: 'rift2', solid: false, animated: true },
  '½': { name: 'armyfloor', solid: false },
  '¾': { name: 'armycable', solid: false },
  '¿': { name: 'armycable2', solid: false },
  'ª': { name: 'armycrate', solid: true },
  '«': { name: 'armycrate2', solid: true },
  '´': { name: 'armywall', solid: true },
  // Stage 5.2: the Abyss. Island tops (lawn, road, its line, a porch, a classroom floor) and vine bridges are walked. An island's south
  // edge is a cliff face over the rock that tapers under it; the gap is the void itself, clear so the backdrop shows through. Cliff,
  // under and gap are solid and are drops (Grid.drop): a twin Demogorgon that charges into one falls.
  '¸': { name: 'abysslawn', solid: false, animated: true },
  'ÿ': { name: 'abyssroad', solid: false, animated: true },
  'þ': { name: 'abyssline', solid: false, animated: true },
  'ý': { name: 'abyssporch', solid: false, animated: true },
  'ü': { name: 'abyssclass', solid: false, animated: true },
  'û': { name: 'abysscliff', solid: true, animated: true, drop: true },
  'ú': { name: 'abyssunder', solid: true, animated: true, drop: true },
  'ù': { name: 'abyssgap', solid: true, drop: true },
  'ø': { name: 'abyssbridgeh', solid: false },
  'ö': { name: 'abyssbridgev', solid: false },
  // Stage 5.3: the heart of the Abyss. Red-black flesh underfoot, the wall of ribs and veins, and the arena's rim, which is a wall.
  'õ': { name: 'heartfloor', solid: false, animated: true },
  'ô': { name: 'heartwall', solid: true, animated: true },
  'ó': { name: 'heartrim', solid: true, animated: true },
};

export const TILE_NAMES = Object.values(TILES).map((d) => d.name);

/** Builds the collision grid. Throws on unknown characters or ragged rows. */
export function buildGrid(rows: string[]): Grid {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const solid = new Uint8Array(w * h);
  let drop: Uint8Array | undefined;
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    if (row.length !== w) throw new Error(`ragged map row ${y}: ${row.length} vs ${w}`);
    for (let x = 0; x < w; x++) {
      const def = TILES[row[x] ?? ''];
      if (!def) throw new Error(`unknown tile '${row[x]}' at ${x},${y}`);
      solid[y * w + x] = def.solid ? 1 : 0;
      if (def.drop) (drop ??= new Uint8Array(w * h))[y * w + x] = 1;
    }
  }
  return drop ? { w, h, solid, drop } : { w, h, solid };
}

export function isSolidTile(g: Grid, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return true;
  return g.solid[ty * g.w + tx] === 1;
}
