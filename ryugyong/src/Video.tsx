import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BEATS } from './scenes/Beats';
import { f, T, FPS } from './lib';
import { FONT_CSS } from './ui/fonts';

/* SFX: placed on their words, mixed ≥18 dB under the voice (0.12 ≈ -18 dB) */
const SFX: { file: string; at: number; vol: number }[] = [
  { file: 'desk_bell.mp3', at: 7.45, vol: 0.12 },
  { file: 'led_switch_on.mp3', at: 15.95, vol: 0.12 },
  { file: 'title_whoosh.mp3', at: 22.05, vol: 0.12 },
  { file: 'stamp_thud.mp3', at: 25.85, vol: 0.1 },
  { file: 'stamp_thud.mp3', at: 32.9, vol: 0.1 },
  { file: 'wind_concrete.mp3', at: 40.6, vol: 0.1 },
  { file: 'glass_panels.mp3', at: 45.1, vol: 0.1 },
  { file: 'stamp_thud.mp3', at: 43.8, vol: 0.1 },
  { file: 'stamp_thud.mp3', at: 52.0, vol: 0.1 },
  { file: 'desk_bell.mp3', at: 56.05, vol: 0.1 },
  { file: 'led_switch_on.mp3', at: 63.05, vol: 0.12 },
];

/* Music bed volume: ducked to ~-19 dB under speech, up in long silences (title + chapter card), smoothed. */
const speaking = (fr: number) => T.segments.some((sg) => fr / FPS >= sg.start - 0.15 && fr / FPS <= sg.end + 0.25);
const MUSIC_VOL = (() => {
  const raw = Array.from({ length: T.frames }, (_, i) => (speaking(i) ? 0.11 : 0.24));
  const out: number[] = []; let v = raw[0];
  for (let i = 0; i < raw.length; i++) { v += (raw[i] - v) * 0.12; out.push(v); }
  return out;
})();

export const Video: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <style>{FONT_CSS}</style>
    {BEATS.map((b, i) => {
      const from = f(b.start);
      const to = i === BEATS.length - 1 ? T.frames : f(BEATS[i + 1].start);
      const C = b.C;
      return <Sequence key={b.id} from={from} durationInFrames={to - from} name={b.id}><C from={from} dur={to - from} /></Sequence>;
    })}
    {audio && <Audio src={staticFile('voiceover.wav')} />}
    {audio && <Audio src={staticFile('music_bed.wav')} volume={(fr) => MUSIC_VOL[Math.min(MUSIC_VOL.length - 1, fr)]} />}
    {audio && SFX.map((s, i) => <Sequence key={i} from={f(s.at)}><Audio src={staticFile(s.file)} volume={s.vol} /></Sequence>)}
  </AbsoluteFill>
);
