import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BEATS } from './scenes/Beats';
import { f, T, FPS } from './lib';
import { FONT_CSS } from './ui/fonts';

import { CUES } from './sfx';

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
    {audio && <Audio src={staticFile('score.wav')} volume={(fr) => MUSIC_VOL[Math.min(MUSIC_VOL.length - 1, fr)]} />}
    {audio && CUES.map((c, i) => <Sequence key={i} from={Math.max(0, f(c.at))} durationInFrames={c.dur ? Math.max(2, f(c.dur)) : undefined} name={`sfx ${c.what}`}><Audio src={staticFile(`sfx/${c.file}.wav`)} volume={c.vol} /></Sequence>)}
  </AbsoluteFill>
);
