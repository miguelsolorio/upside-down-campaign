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

/** The music bed: one track runs from the intro across the stage cuts, and each stage's own sounds sit on it. */
const BED = { id: 'clock', level: 1, group: 'montage' };

/** A stage cut. Every shot is the whole frame at 5x: no punch-ins. */
const montage = (id, stage, name, trigger) => ({
  id,
  url: play(stage),
  trigger,
  timeout: 60 * 240,
  len: sec(1.6),
  cam: [{ at: 0 }],
  captions: [{ text: name, at: 6, where: 'bl' }],
  audio: { fadeIn: 0.004, fadeOut: 0.004, bed: { ...BED } },
});

/** A hero's moment: the game plays to it and a caption names the move. */
const hero = (id, url, trigger, caption, extra = {}) => ({
  id,
  url,
  trigger,
  timeout: 60 * 300,
  len: sec(2),
  lead: extra.lead,
  cam: [{ at: 0 }],
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
  // ---------------------------------------------------------------- the intro, 0:00 to 0:02
  {
    id: 'intro',
    url: {},
    trigger: () => true,
    timeout: 10,
    len: sec(2),
    // The title's own sky, woods and logo, there from the first frame so a paused video shows them. The logo drops a short way into place with a thud, the
    // party walks up the path and turns round, and the two lines slam in, all before the first second is out.
    card: {
      bg: 'sky',
      music: null,
      logo: { y: 22, drop: 12, rise: 14, sfx: 'rollLand' },
      party: { len: 28, rise: 30 },
      lines: [
        { text: '5 CHAPTERS.', y: 76, scale: 3, color: 'white', at: sec(0.35), pop: true, sfx: 'roll' },
        { text: '11 HEROES.', y: 108, scale: 3, color: 'yellow', at: sec(0.7), pop: true, sfx: 'natTwenty' },
      ],
    },
    cam: [{ at: 0 }],
    // Soft flashes, so a frame paused on one still reads.
    flashes: [{ at: 12, len: 8, alpha: 0.25 }, { at: sec(0.35), len: 6, alpha: 0.18 }, { at: sec(0.7), len: 10, alpha: 0.3 }],
    audio: { ...CUT, bed: { ...BED } },
  },

  // ---------------------------------------------------------------- the stages, 0:02 to 0:18
  montage('m11', '1.1', 'MIRKWOOD', nearFoes(3, 90, 300)),
  montage('m12', '1.2', 'HAWKINS LAB', nearFoes(3, 90, 600)),
  montage('m13', '1.3', 'HAWKINS MIDDLE SCHOOL', bossIs('DEMOGORGON')),
  montage('m21', '2.1', 'THE PALACE ARCADE', nearFoes(3, 90, 600)),
  montage('m23', '2.3', 'THE GATE', sfxSeen('howl')),
  montage('m31', '3.1', 'STARCOURT MALL', nearFoes(3, 90, 600)),
  // The Mind Flayer's flash is its legs coming down.
  { ...montage('m33', '3.3', 'THE MIND FLAYER', bossIs('MIND FLAYER')), flashOn: { sfx: ['legslam'], len: 8, alpha: 0.5 } },
  montage('m41', '4.1', 'KAMCHATKA', nearFoes(2, 80, 900)),
  montage('m51', '5.1', 'HAWKINS LOCKDOWN', nearFoes(3, 90, 600)),
  montage('m52', '5.2', 'THE ABYSS', bossIs('THE TWINS')),

  // ---------------------------------------------------------------- the heroes, 0:18 to 0:28
  hero('h-eleven', play('4.4'), sfxSeen('beam'), 'ELEVEN: MIND BLAST', { flashOn: { sfx: ['beam'], len: 8, alpha: 0.5 }, lead: 12 }),
  hero('h-max', play('2.2'), sfxSeen('swap'), 'MAX: SKATE DASH'),
  hero('h-steve', play('2.3'), sfxSeen('taunt'), 'STEVE: BABYSIT'),
  hero('h-dustin', play('5.2', { party: 'dustin,mike,robin,nancy' }), sfxSeen('flame'), 'DUSTIN: FARRAH SPRAY'),
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

  // ---------------------------------------------------------------- the key moments, 0:28 to 0:40
  {
    id: 'k-solo',
    url: play('4.3'),
    trigger: fn(`const v = ud.play && ud.play.sim.view(); return ud.cap.count('section') >= 3 && !!v && !!v.hud.solo && v.hud.solo.t >= 600;`),
    timeout: 60 * 300,
    len: sec(3.5),
    cam: [{ at: 0 }],
    captions: [{ text: "EDDIE'S ROOFTOP SOLO", at: 8, where: 'tl' }],
    audio: { ...CUT },
  },
  {
    id: 'k-vecna',
    url: play('4.4'),
    trigger: sfxSeen('orb'),
    timeout: 60 * 300,
    len: sec(3),
    cam: [{ at: 0 }],
    captions: [{ text: 'VECNA', at: 8, where: 'bl' }],
    audio: { ...CUT },
  },
  {
    id: 'k-channel',
    url: play('5.3'),
    trigger: fn(`const v = ud.play && ud.play.sim.view(); return !!v && !!v.hud.channel && v.hud.channel.on;`),
    timeout: 60 * 400,
    len: sec(2.5),
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
    len: sec(3),
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
      logo: { y: 62 },
      lines: [{ text: 'PLAY FREE IN YOUR BROWSER', y: 140, scale: 2, color: 'white', at: sec(0.6) }],
    },
    cam: [{ at: 0 }],
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
