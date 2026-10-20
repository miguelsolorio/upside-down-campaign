// The shot list for the video ad (record.mjs). Each shot is a page load of the game in capture mode, a trigger that says when the shot
// starts, and what to draw while it runs. docs/demo.md explains every field. A shot's length is in frames at 60 fps: sec() turns seconds into them.
//
// The triggers are functions of window.__ud that run in the page, once a tick, until one is true. They look at the game's own state (the boss bar,
// the log of sounds the game played, the solo's streak), so a stage that is retuned moves a shot with it. Keep them to that one argument: the
// recorder sends their source text to the page.
export const FPS = 60;
export const sec = (s) => Math.round(s * FPS);

/** A trigger from source text with its numbers filled in, so it stands alone in the page (the recorder sends its source there). */
const fn = (body) => new Function('ud', body);
/** `n` foes within `radius` px of the lead hero, once the stage has run `frames` frames: the fight is on and on screen. */
const nearFoes = (n, radius, frames = 0) => fn(`const p = ud.play; if (!p || p.sim.stats().frames < ${frames}) return false;
  const v = p.sim.view(); let k = 0;
  for (const a of v.actors) if (a.kind === 'enemy' && Math.hypot(a.x - v.focus.x, a.y - v.focus.y) < ${radius}) k++;
  return k >= ${n};`);
/** The boss bar has this name. */
const bossIs = (name) => fn(`const b = ud.play && ud.play.sim.view().hud.boss; return !!b && b.name === ${JSON.stringify(name)};`);
/** The game has played this effect `n` times. */
const sfxSeen = (id, n = 1) => fn(`return ud.cap.count('sfx', ${JSON.stringify(id)}) >= ${n};`);

/** Soft cuts for the sound: a quarter sine over a few hundredths of a second. */
const CUT = { fadeIn: 0.015, fadeOut: 0.03 };

/** The flags of a stage the bot plays by itself with nobody falling: no dialogue, the same dice every time. */
const play = (stage, extra = {}) => ({ stage, bot: 1, rush: 1, god: 1, ...extra });

/** A camera that opens wide, then punches in on the action once the scene has been read. */
const wideThenIn = (at, follow, zoom = 2) => [{ at: 0 }, { at, zoom, follow, lerp: 0.3 }];

/** The stage montage: a bed of music runs across the cuts and each stage's own sounds sit on it. */
const BED = { id: 'clock', level: 1, group: 'montage' };

const montage = (id, stage, name, trigger, follow) => ({
  id,
  url: play(stage),
  trigger,
  timeout: 60 * 240,
  len: sec(1.5),
  cam: wideThenIn(30, follow),
  captions: [{ text: name, at: 6, where: 'bl' }],
  audio: { fadeIn: 0.004, fadeOut: 0.004, bed: { ...BED } },
});

/** A hero's moment: the game plays to it, the camera goes in on the hero, and a caption names the move. */
const hero = (id, url, trigger, follow, caption, extra = {}) => ({
  id,
  url,
  trigger,
  timeout: 60 * 300,
  len: sec(1.5),
  lead: extra.lead,
  cam: [{ at: 0, zoom: 2, follow, lerp: 0.3 }],
  captions: [{ text: caption, at: 6, where: 'bl' }],
  flashOn: extra.flashOn,
  audio: { ...CUT },
});

/** The save of someone who has played all the way through: every hero met, the road open to the last stage. */
const FINISHED = {
  v: 1,
  cleared: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3', '4.4', '5.1', '5.2'],
  heroes: [['mike', 10], ['dustin', 9], ['lucas', 9], ['eleven', 9], ['will', 8], ['max', 8], ['steve', 8], ['robin', 7], ['nancy', 7], ['hopper', 7], ['eddie', 6]]
    .map(([id, level]) => ({ id, level, xp: 10 })),
  purse: 40,
};

const LIST = [
  // ---------------------------------------------------------------- the title, 0:00 to 0:06
  {
    id: 'intro',
    url: {},
    trigger: () => true,
    timeout: 10,
    len: sec(6),
    // The title screen breathes, the camera creeps in, then PRESS START and the party walks into the woods.
    keys: [{ at: sec(5.3), code: 'Enter' }],
    // The status line under the party is left out of frame: the view opens a little in, so it never shows.
    cam: [{ at: 0, zoom: 1.06, follow: { x: 192, y: 108 }, push: { to: 1.14, over: sec(6) } }],
    fadeIn: sec(0.4),
    audio: { ...CUT, fadeIn: 0.3 },
  },

  // ---------------------------------------------------------------- the basement, 0:06 to 0:08
  {
    id: 'prologue',
    url: {},
    // START, then a press now and then to move the talk along, until Will's die lands.
    auto: [{ code: 'Enter', from: 40, every: 1_000_000 }, { code: 'Enter', from: 150, every: 18 }],
    trigger: sfxSeen('rollLand'),
    // The shot opens as the die is still bouncing.
    lead: 62,
    timeout: 60 * 90,
    len: sec(1.8),
    cam: [
      { at: 0 },
      { at: 30, zoom: 2, follow: { x: 196, y: 110 } },
      // The die lands on frame 62. The view goes in on it as it stops.
      { at: 56, zoom: 3, follow: { x: 206, y: 108 }, lerp: 1 },
    ],
    flashOn: { sfx: ['rollLand'], len: 10, alpha: 0.55 },
    audio: { ...CUT },
  },

  // ---------------------------------------------------------------- the card, 0:08 to 0:10
  {
    id: 'card',
    url: {},
    trigger: () => true,
    timeout: 10,
    len: sec(2.2),
    card: {
      bg: 'sky',
      music: null,
      lines: [
        { text: '5 CHAPTERS.', y: 82, scale: 3, color: 'white' },
        { text: '11 HEROES.', y: 112, scale: 3, color: 'yellow', at: sec(0.55) },
      ],
    },
    cam: [{ at: 0 }],
    audio: { ...CUT, bed: { ...BED } },
  },

  // ---------------------------------------------------------------- the stages, 0:10 to 0:22
  montage('m11', '1.1', 'MIRKWOOD', nearFoes(3, 90, 300), { fight: 90 }),
  montage('m13', '1.3', 'HAWKINS MIDDLE SCHOOL', bossIs('DEMOGORGON'), { fight: 160 }),
  montage('m21', '2.1', 'THE PALACE ARCADE', nearFoes(3, 90, 600), { fight: 90 }),
  montage('m23', '2.3', 'THE GATE', sfxSeen('howl'), { fight: 160 }),
  montage('m31', '3.1', 'STARCOURT MALL', nearFoes(3, 90, 600), { fight: 90 }),
  // The Mind Flayer fills the top of the screen, so this one stays wide.
  { ...montage('m33', '3.3', 'THE MIND FLAYER', bossIs('MIND FLAYER'), 'hero'), cam: [{ at: 0 }], flashOn: { sfx: ['legslam'], len: 8, alpha: 0.5 } },
  montage('m41', '4.1', 'KAMCHATKA', nearFoes(2, 80, 900), { fight: 90 }),
  montage('m52', '5.2', 'THE ABYSS', bossIs('THE TWINS'), { fight: 160 }),

  // ---------------------------------------------------------------- the heroes, 0:22 to 0:30
  hero('h-eleven', play('4.4'), sfxSeen('beam'), { between: ['eleven', 'vecna'] }, 'ELEVEN: MIND BLAST',
    { flashOn: { sfx: ['beam'], len: 8, alpha: 0.5 }, lead: 12 }),
  hero('h-max', play('2.2'), sfxSeen('swap'), { hero: 'max' }, 'MAX: SKATE DASH'),
  hero('h-steve', play('2.3'), sfxSeen('taunt'), { hero: 'steve' }, 'STEVE: BABYSIT'),
  hero('h-dustin', play('5.2', { party: 'dustin,mike,robin,nancy' }), sfxSeen('flame'), { hero: 'dustin' }, 'DUSTIN: FARRAH SPRAY'),
  {
    id: 'h-picks',
    url: {},
    storage: { 'upside-down:progress:v1': FINISHED },
    // CONTINUE on the title, then the map, then the stage's party picks, which open once the map has settled.
    auto: [{ code: 'Enter', from: 60, every: 1_000_000 }, { code: 'Enter', from: 330, every: 1_000_000 }],
    trigger: (ud) => ud.cap.ticks() >= 380,
    timeout: 1000,
    len: sec(2),
    cam: [{ at: 0, top: 0 }],
    // Take Dustin off the party and put Lucas on.
    keys: [
      { at: 14, code: 'ArrowRight' }, { at: 34, code: 'KeyZ' }, { at: 54, code: 'ArrowRight' }, { at: 74, code: 'KeyZ' },
    ],
    audio: { ...CUT },
  },

  // ---------------------------------------------------------------- the key moments, 0:30 to 0:40
  {
    id: 'k-solo',
    url: play('4.3'),
    trigger: fn(`const v = ud.play && ud.play.sim.view(); return ud.cap.count('section') >= 3 && !!v && !!v.hud.solo && v.hud.solo.t >= 600;`),
    timeout: 60 * 300,
    len: sec(3),
    // The whole roof, then the highway close, then the whole roof again.
    cam: [{ at: 0 }, { at: 70, zoom: 2, follow: { x: 118, y: 168 } }, { at: 140, zoom: 1 }],
    captions: [{ text: "EDDIE'S ROOFTOP SOLO", at: 8, where: 'tl' }],
    audio: { ...CUT },
  },
  {
    id: 'k-vecna',
    url: play('4.4'),
    trigger: sfxSeen('orb'),
    timeout: 60 * 300,
    len: sec(2.5),
    cam: [{ at: 0, zoom: 2, follow: { fight: 120 }, lerp: 0.2 }],
    captions: [{ text: 'VECNA', at: 8, where: 'bl' }],
    audio: { ...CUT },
  },
  {
    id: 'k-channel',
    url: play('5.3'),
    trigger: fn(`const v = ud.play && ud.play.sim.view(); return !!v && !!v.hud.channel && v.hud.channel.on;`),
    timeout: 60 * 400,
    len: sec(2),
    cam: [{ at: 0 }],
    captions: [{ text: 'THE CHANNEL', at: 8, where: 'bl' }],
    audio: { ...CUT },
  },
  {
    id: 'k-roll',
    url: { finale: 'gold' },
    // The fourth die: it starts rolling a moment after the third lands.
    trigger: sfxSeen('rollLand', 3),
    timeout: 60 * 30,
    len: sec(2.5),
    cam: [{ at: 0 }],
    flashOn: { sfx: ['natTwenty'], len: 14, alpha: 0.7 },
    audio: { ...CUT },
  },

  // ---------------------------------------------------------------- the end card, 0:40 to 0:45
  {
    id: 'end',
    url: {},
    trigger: () => true,
    timeout: 10,
    len: sec(5),
    card: {
      bg: 'sky',
      music: 'static',
      logo: { y: 56 },
      lines: [
        { text: 'PLAY FREE IN YOUR BROWSER', y: 132, scale: 2, color: 'white', at: sec(0.6) },
        { text: 'MIGUELSOLORIO.GITHUB.IO/UPSIDE-DOWN-CAMPAIGN', y: 162, scale: 1, color: 'yellow', at: sec(1.2) },
      ],
    },
    cam: [{ at: 0, zoom: 1, push: { to: 1.1, over: sec(5) } }],
    fadeOut: sec(1.5),
    audio: { fadeIn: 0.05, fadeOut: 1.5 },
  },
];

/** Shots that share a bed play one track straight through: each starts the track as far in as the shots before it have run. */
function withBeds(shots) {
  const first = new Map();
  let at = 0;
  const out = shots.map((s) => {
    const bed = s.audio.bed;
    let audio = s.audio;
    if (bed) {
      if (!first.has(bed.group)) first.set(bed.group, at);
      audio = { ...audio, bed: { ...bed, from: (at - first.get(bed.group)) / FPS + (bed.base ?? 0) } };
    }
    at += s.len;
    return { ...s, audio };
  });
  return out;
}

export const SHOTS = withBeds(LIST);
export const TOTAL_FRAMES = SHOTS.reduce((n, s) => n + s.len, 0);
