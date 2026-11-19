import { wordAt, segOf } from './lib';

/* Sound-effect cue sheet: one cue per on-screen movement, timed from the same word timestamps the animation uses.
   vol is linear gain on files peak-normalised to -6 dBFS (0.12 ≈ -18 dB). dur trims a clip (seconds). */
export type Cue = { at: number; file: string; vol: number; dur?: number; what: string };
const fr = (n: number) => n / 30;

const cues: Cue[] = [];
const c = (at: number, file: string, vol: number, what: string, dur?: number) => cues.push({ at, file, vol, what, dur });

// B01 opening: the Guest walks in pulling the suitcase; tag drops in
c(0.0, 'suitcase_roll', 0.11, 'suitcase wheels (walk-in)', 0.7);
c(0.05, 'footsteps', 0.10, 'Guest footsteps (walk-in)');
c(fr(5), 'tag_swing', 0.10, 'PYONGYANG tag drops and swings');
// black cards: pen writes for exactly as long as the text types on
const card = (seg: string, what: string) => { const s = segOf(seg); c(s.start, 'pen_scribble', 0.09, what, Math.min(2.2, s.end - s.start)); };
card('n02', 'card 1 writes on');
// B03 elevator dial counts, ding at 105, pan to the key rack
c(wordAt('n03', 'one'), 'counter_ticks', 0.10, 'floor dial counts 1→105', wordAt('n03', 'floors') - wordAt('n03', 'one'));
c(wordAt('n03', 'floors'), 'elevator_ding', 0.11, 'dial lands on 105 (ring)');
c(wordAt('n03', 'zero') - fr(16), 'pan_whoosh', 0.08, 'camera pans to key rack');
// B04-B07 skit 1
c(7.45, 'footsteps', 0.10, 'Guest steps up to the desk');
c(7.50, 'desk_bell', 0.11, 'desk bell');
c(9.05, 'arm_swish', 0.10, 'Clerk points');
c(11.55 + fr(10), 'sparkle', 0.10, 'hopeful sparkle mark');
// B08 the twist: lights switch on, camera punch
c(wordAt('n04', 'lights') - 0.1, 'led_switch_on', 0.12, 'LED switch-on sweep');
c(wordAt('n04', 'lights'), 'punch_whoosh', 0.08, 'camera punch-in');
card('n05', 'card 2 writes on');
// B10 blueprint
c(wordAt('n06', 'so'), 'paper_unroll', 0.10, 'blueprint unrolls');
c(wordAt('n06', 'build'), 'pencil_circle', 0.10, 'red pencil circle');
// B11 pull-out
c(20.45, 'pan_whoosh', 0.06, 'camera pull-out');
// B12 title: whoosh + one thump per line
c(22.05, 'title_whoosh', 0.11, 'title arrives');
[0, 9, 18].forEach((d, i) => c(22.10 + fr(d), 'title_thump', 0.10, `title line ${i + 1} lands`));
// B14 Singapore
c(25.70 + fr(3), 'tag_swing', 0.10, 'SINGAPORE 1986 tag');
c(25.70 + fr(4), 'banner_flutter', 0.10, 'banner drops in');
c(25.70 + fr(8), 'small_cheer', 0.08, 'doorman cheers');
c(wordAt('n07', 'tallest') - fr(20), 'pan_whoosh', 0.09, 'tilt up the tower');
// B15 map
c(28.15 + fr(2), 'map_pin', 0.11, 'pin drops in Seoul');
c(wordAt('n07', 'south'), 'route_swish', 0.10, 'route draws to Singapore');
c(wordAt('n07', 'built'), 'map_pin', 0.11, 'pin drops in Singapore');
// B16 height chart
c(wordAt('n08', 'taller') - fr(4), 'grow_rumble', 0.11, 'pyramid model grows');
c(wordAt('n08', 'taller') + fr(8), 'tag_swing', 0.09, 'PYONGYANG tag drops');
// B17 1987 stack: one slab per landed floor
c(32.75 + fr(3), 'tag_swing', 0.10, '1987 tag');
[0, 10, 15, 18, 21, 24, 26, 28, 30, 32].forEach((g, i) => c(wordAt('n08', 'work') + fr(g), 'slab_thud', i === 0 ? 0.11 : 0.07, `floor ${i + 1} lands`, 0.35));
card('n09', 'card 3 writes on');
// B19 USSR banner falls
c(wordAt('n10', 'collapsed') - fr(6), 'banner_flutter', 0.10, 'banner snaps and falls');
c(wordAt('n10', 'collapsed') + fr(4), 'soft_thud', 0.12, 'banner hits the floor');
c(wordAt('n10', 'collapsed') + fr(4), 'dust_puff', 0.09, 'dust puff');
// B20 sixteen years
c(40.6, 'wind_concrete', 0.10, 'wind through the shell');
c(wordAt('n10', 'sixteen'), 'counter_ticks', 0.09, 'year counter 1992→2008', 1.0);
// B21 glass rows (accelerating: rows = floor(p^0.7 * 10))
c(43.65 + fr(3), 'tag_swing', 0.10, '2011 tag');
{ const g0 = wordAt('n11', 'egyptian'), g1 = wordAt('n11', 'glass');
  for (let k = 1; k <= 10; k++) c(g0 + Math.pow(k / 10, 1 / 0.7) * (g1 - g0), 'glass_clink', k === 10 ? 0.11 : 0.07, `glass row ${k} clicks in`); }
c(wordAt('n11', 'egyptian'), 'pan_whoosh', 0.06, 'tilt up with the glass');
// B22 gift box
c(wordAt('n11', 'shiny'), 'glint_chime', 0.10, 'glint sweeps the paper');
c(wordAt('n11', 'empty'), 'box_lid', 0.12, 'lid lifts');
c(wordAt('n11', 'empty') + fr(4), 'dust_puff', 0.08, 'dust puff from the box');
c(wordAt('n11', 'empty') + fr(8), 'moth_flutter', 0.10, 'moth flies out');
// B23 2012
c(51.85 + fr(3), 'tag_swing', 0.10, '2012 tag');
c(wordAt('n12', 'hotel'), 'banner_flutter', 0.09, 'OPENING 2013 banner slides in');
c(wordAt('n12', 'signs'), 'pen_sign', 0.11, 'contract signed');
c(wordAt('n12', 'signs') + fr(2), 'sparkle', 0.09, 'Clerk sparkle');
// B24 pulls out
c(wordAt('n12', 'months'), 'paper_rip', 0.11, 'calendar page rips');
c(wordAt('n12', 'later'), 'footsteps', 0.10, 'Exec walks out (1)');
c(wordAt('n12', 'later') + 0.45, 'footsteps', 0.08, 'Exec walks out (2)');
c(wordAt('n12', 'out') - fr(4), 'banner_flutter', 0.09, 'banner falls');
c(wordAt('n12', 'out') + fr(6), 'soft_thud', 0.10, 'banner lands');
// B25-B28 skit 2
c(56.05, 'desk_bell', 0.09, 'desk bell again');
c(58.65 + fr(2), 'sweat_bloop', 0.10, 'sweat drop');
// B29 finale
c(wordAt('n13', 'hundred'), 'counter_ticks', 0.09, 'LIGHTS counter 0→100,000', 1.1);
c(wordAt('n13', 'switch') - 0.08, 'led_switch_on', 0.12, 'LEDs switch on');
c(wordAt('n13', 'switch') + fr(6), 'pan_whoosh', 0.08, 'tilt up to the crown');
c(wordAt('n13', 'flag'), 'glint_chime', 0.09, 'flag glows');
card('n14', 'final card writes on');

// ---- extra movement cues (round 2)
// every skit gesture: Guest gestures once per line; Clerk turns his head
(['s01', 's03', 's05', 's07'] as const).forEach((id) => c(segOf(id).start, 'arm_swish', 0.08, `Guest gesture (${id})`));
c(segOf('s02').start, 'head_turn', 0.08, 'Clerk turns to the keys');
(['s04', 's06', 's08'] as const).forEach((id) => c(segOf(id).start - 0.05, 'head_turn', 0.07, `Clerk head tilt (${id})`));
c(segOf('s04').end + 0.05, 'crickets', 0.07, 'awkward silence after "No."', 0.9);
c(segOf('s08').end + 0.02, 'crickets', 0.07, 'awkward silence after "...Soon."', 0.55);
c(wordAt('n04', 'lights') + fr(4), 'surprise_boing', 0.08, 'passer-by startled');
c(20.55, 'suitcase_set', 0.09, 'suitcase set down');
c(23.62, 'card_swell', 0.07, 'chapter card');
c(32.9, 'crane_hum', 0.08, 'crane winches the floors');
c(40.7, 'paper_rustle', 0.08, 'debris blows across');
{ const g0 = wordAt('n11', 'egyptian'), g1 = wordAt('n11', 'glass'); c(g1 + 0.05, 'ring_ping', 0.08, 'glass complete, crane gone'); void g0; }
c(wordAt('n11', 'empty'), 'punch_whoosh', 0.07, 'camera punch on "Empty"');
c(wordAt('n12', 'signs') + 0.1, 'clipboard_flip', 0.09, 'contract flips to SIGNED');
c(wordAt('n13', 'switch') + 0.3, 'twinkle_rise', 0.08, 'green particles rise');
c(wordAt('n03', 'zero'), 'ring_ping', 0.06, 'camera lands on the key rack');

export const CUES = cues.sort((a, b) => a.at - b.at);

/* Ambience beds: one per location, cut hard with the picture (cards stay silent apart from the music). */
export type Bed = { from: number; to: number; file: string; vol: number };
export const BEDS: Bed[] = [
  { from: 0.00, to: 2.45, file: 'amb_night_street', vol: 0.15 },
  { from: 0.00, to: 2.45, file: 'led_buzz', vol: 0.075 },
  { from: 4.60, to: 14.80, file: 'amb_lobby', vol: 0.165 },
  { from: 14.80, to: 17.20, file: 'amb_night_street', vol: 0.15 },
  { from: wordAt('n04', 'lights'), to: 17.20, file: 'led_buzz', vol: 0.09 },
  { from: 19.25, to: 20.45, file: 'amb_room', vol: 0.135 },
  { from: 20.45, to: 22.10, file: 'amb_lobby', vol: 0.165 },
  { from: 22.10, to: 23.62, file: 'amb_night_street', vol: 0.12 },
  { from: 25.70, to: 28.15, file: 'amb_singapore', vol: 0.15 },
  { from: 28.15, to: 32.75, file: 'amb_room', vol: 0.12 },
  { from: 32.75, to: 35.20, file: 'amb_construction', vol: 0.15 },
  { from: 38.70, to: 43.65, file: 'amb_wind_city', vol: 0.15 },
  { from: 43.65, to: 47.50, file: 'amb_day_city', vol: 0.15 },
  { from: 47.50, to: 51.85, file: 'amb_room', vol: 0.135 },
  { from: 51.85, to: 56.10, file: 'amb_lobby_day', vol: 0.15 },
  { from: 56.10, to: 61.40, file: 'amb_lobby', vol: 0.165 },
  { from: 61.40, to: 66.44, file: 'amb_night_street', vol: 0.15 },
  { from: wordAt('n13', 'switch'), to: 66.44, file: 'led_buzz', vol: 0.09 },
];
